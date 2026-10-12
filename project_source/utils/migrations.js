const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const MIGRATIONS_TABLE = '_migrations';
const DEFAULT_DIR = path.join(__dirname, '..', 'migrations');
const LOCK_TIMEOUT = 300000;
const LOCK_KEY = 'migration_lock';

let migrationHooks = { pre: [], post: [] };
let dryRunMode = false;
let migrationLogger = console;

function setLogger(logger) { migrationLogger = logger; }

function setDryRun(enabled) { dryRunMode = enabled; }

function addHook(type, fn) {
    if (type === 'pre' || type === 'post') migrationHooks[type].push(fn);
}

function parseMigrationName(filename) {
    const match = filename.match(/^(V?\d+[._-]?\d*)?[-_]?(.+?)(\.down)?\.sql$/i);
    if (!match) return { version: null, name: filename.replace(/\.sql$/, ''), isDown: false };
    return {
        version: match[1] || null,
        name: match[2] || filename.replace(/\.sql$/, ''),
        isDown: !!match[3]
    };
}

function validateMigration(sql) {
    const trimmed = sql.trim();
    if (!trimmed) return { valid: false, error: 'Empty SQL' };
    const dangerousPatterns = [
        /DROP\s+(DATABASE|TABLE\s+_\w+)/i,
        /DROP\s+TABLE\s+IF\s+EXISTS\s+_migrations/i,
    ];
    for (const pattern of dangerousPatterns) {
        if (pattern.test(trimmed)) {
            return { valid: false, error: `Potentially dangerous SQL pattern: ${pattern}` };
        }
    }
    return { valid: true, error: null };
}

async function getPool(connectionString) {
    return new Pool({
        connectionString: connectionString || process.env.DATABASE_URL,
        max: 2,
        connectionTimeoutMillis: 10000
    });
}

async function ensureMigrationsTable(pool) {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            checksum VARCHAR(64),
            duration_ms INTEGER DEFAULT 0,
            status VARCHAR(20) DEFAULT 'applied',
            group_name VARCHAR(100) DEFAULT 'default'
        )
    `);
}

async function acquireLock(pool) {
    const result = await pool.query(
        `SELECT pg_try_advisory_lock($1) AS locked`,
        [hashString(LOCK_KEY)]
    );
    return result.rows[0]?.locked || false;
}

async function releaseLock(pool) {
    await pool.query(
        `SELECT pg_advisory_unlock($1)`,
        [hashString(LOCK_KEY)]
    );
}

function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

async function getAppliedMigrations(pool, group) {
    let query = `SELECT name, checksum, applied_at, duration_ms, status, group_name FROM ${MIGRATIONS_TABLE}`;
    const params = [];
    if (group) {
        query += ` WHERE group_name = $1`;
        params.push(group);
    }
    query += ` ORDER BY name`;
    const { rows } = await pool.query(query, params);
    return rows;
}

async function runMigrations(options = {}) {
    const {
        dir = DEFAULT_DIR,
        connectionString = process.env.DATABASE_URL,
        group,
        tags,
        tagFilter,
        seedAfter = false,
        seedDir = path.join(__dirname, '..', 'seeds'),
        onProgress,
        parallel = false
    } = options;

    let pool;
    try {
        pool = await getPool(connectionString);
        await ensureMigrationsTable(pool);

        const locked = await acquireLock(pool);
        if (!locked) {
            migrationLogger.warn('Another migration process is running. Skipping.');
            await pool.end();
            return { status: 'skipped', reason: 'lock' };
        }

        migrationLogger.info('Migration lock acquired');

        for (const hook of migrationHooks.pre) {
            await hook({ pool, dir, group, dryRunMode });
        }

        if (!fs.existsSync(dir)) {
            migrationLogger.info('No migrations directory found');
            await releaseLock(pool);
            await pool.end();
            return { status: 'no_migrations' };
        }

        const applied = await getAppliedMigrations(pool, group);
        const appliedMap = new Map(applied.map(r => [r.name, r]));

        let files = fs.readdirSync(dir)
            .filter(f => f.endsWith('.sql') && !f.includes('.down.'))
            .sort();

        if (tags && tags.length > 0) {
            files = files.filter(f => tags.some(t => f.includes(t)));
        }

        const pending = files.filter(f => !appliedMap.has(f));
        const results = { applied: [], skipped: [], failed: [] };

        if (pending.length === 0) {
            migrationLogger.info('No pending migrations');
        } else {
            migrationLogger.info(`Found ${pending.length} pending migration(s)`);
        }

        if (dryRunMode) {
            migrationLogger.info('DRY RUN - no migrations will be executed');
            for (const file of pending) {
                const sql = fs.readFileSync(path.join(dir, file), 'utf8');
                const validation = validateMigration(sql);
                migrationLogger.info(`[DRY RUN] Would apply: ${file}${validation.valid ? '' : ' (INVALID: ' + validation.error + ')'}`);
                if (onProgress) onProgress({ file, action: 'dry-run', valid: validation.valid });
            }
            await releaseLock(pool);
            await pool.end();
            return { status: 'dry_run', pending };
        }

        const runBatch = async (file) => {
            const sql = fs.readFileSync(path.join(dir, file), 'utf8');
            const parsed = parseMigrationName(file);
            const validation = validateMigration(sql);
            if (!validation.valid) {
                migrationLogger.error(`Migration validation failed: ${file} - ${validation.error}`);
                return { file, status: 'failed', error: validation.error };
            }

            const checksum = require('crypto').createHash('sha256').update(sql).digest('hex');
            const startTime = Date.now();

            try {
                await pool.query('BEGIN');
                await pool.query(sql);
                await pool.query(
                    `INSERT INTO ${MIGRATIONS_TABLE} (name, checksum, duration_ms, status, group_name) VALUES ($1, $2, $3, 'applied', $4)
                     ON CONFLICT (name) DO UPDATE SET checksum = $2, duration_ms = $3, status = 'applied'`,
                    [file, checksum, 0, parsed.name]
                );
                await pool.query('COMMIT');
                const duration = Date.now() - startTime;
                await pool.query(
                    `UPDATE ${MIGRATIONS_TABLE} SET duration_ms = $1 WHERE name = $2`,
                    [duration, file]
                );
                migrationLogger.info(`Applied: ${file} (${duration}ms)`);
                if (onProgress) onProgress({ file, action: 'apply', duration });
                return { file, status: 'applied', duration };
            } catch (err) {
                await pool.query('ROLLBACK');
                migrationLogger.error(`Failed: ${file} - ${err.message}`);
                try {
                    await pool.query(
                        `INSERT INTO ${MIGRATIONS_TABLE} (name, checksum, status, group_name) VALUES ($1, $2, 'failed', $3)
                         ON CONFLICT (name) DO UPDATE SET status = 'failed'`,
                        [file, checksum, parsed.name]
                    );
                } catch (e) { }
                if (onProgress) onProgress({ file, action: 'failed', error: err.message });
                return { file, status: 'failed', error: err.message };
            }
        };

        if (parallel && pending.length > 1) {
            const batchResults = await Promise.all(pending.map(f => runBatch(f)));
            for (const r of batchResults) {
                if (r.status === 'applied') results.applied.push(r);
                else if (r.status === 'failed') results.failed.push(r);
            }
        } else {
            for (const file of pending) {
                const r = await runBatch(file);
                if (r.status === 'applied') results.applied.push(r);
                else if (r.status === 'failed') results.failed.push(r);
                if (r.status === 'failed') break;
            }
        }

        for (const hook of migrationHooks.post) {
            await hook({ pool, dir, group, results, dryRunMode });
        }

        if (seedAfter && results.failed.length === 0) {
            await runSeeds(pool, seedDir);
        }

        await releaseLock(pool);
        await pool.end();

        migrationLogger.info(`Migrations complete: ${results.applied.length} applied, ${results.failed.length} failed`);
        return { status: 'complete', ...results };
    } catch (err) {
        if (pool) {
            try { await releaseLock(pool); } catch (e) { }
            try { await pool.end(); } catch (e) { }
        }
        migrationLogger.error('Migration runner error:', err.message);
        return { status: 'error', error: err.message };
    }
}

async function rollbackMigration(options = {}) {
    const { name, dir = DEFAULT_DIR, connectionString = process.env.DATABASE_URL } = options;
    let pool;
    try {
        pool = await getPool(connectionString);
        await ensureMigrationsTable(pool);

        const downFile = name.replace(/\.sql$/, '.down.sql');
        const downPath = path.join(dir, downFile);

        if (!fs.existsSync(downPath)) {
            migrationLogger.error(`No rollback file found: ${downFile}`);
            await pool.end();
            return { status: 'error', error: 'No rollback file' };
        }

        const { rows } = await pool.query(
            `SELECT name FROM ${MIGRATIONS_TABLE} WHERE name = $1 AND status = 'applied'`,
            [name]
        );
        if (rows.length === 0) {
            migrationLogger.warn(`Migration not found or already rolled back: ${name}`);
            await pool.end();
            return { status: 'skipped' };
        }

        const sql = fs.readFileSync(downPath, 'utf8');
        if (dryRunMode) {
            migrationLogger.info(`[DRY RUN] Would rollback: ${name}`);
            await pool.end();
            return { status: 'dry_run' };
        }

        await pool.query('BEGIN');
        try {
            await pool.query(sql);
            await pool.query(`DELETE FROM ${MIGRATIONS_TABLE} WHERE name = $1`, [name]);
            await pool.query('COMMIT');
            migrationLogger.info(`Rolled back: ${name}`);
            await pool.end();
            return { status: 'rolled_back', name };
        } catch (err) {
            await pool.query('ROLLBACK');
            migrationLogger.error(`Rollback failed: ${name} - ${err.message}`);
            await pool.end();
            return { status: 'error', error: err.message };
        }
    } catch (err) {
        if (pool) await pool.end();
        return { status: 'error', error: err.message };
    }
}

async function rollbackAll(options = {}) {
    const { dir = DEFAULT_DIR, connectionString = process.env.DATABASE_URL } = options;
    let pool;
    try {
        pool = await getPool(connectionString);
        await ensureMigrationsTable(pool);
        const applied = await getAppliedMigrations(pool);
        const reversed = applied.filter(r => r.status === 'applied').map(r => r.name).reverse();
        const results = [];
        for (const name of reversed) {
            const r = await rollbackMigration({ name, dir, connectionString });
            results.push(r);
            if (r.status === 'error') break;
        }
        await pool.end();
        return results;
    } catch (err) {
        if (pool) await pool.end();
        return [{ status: 'error', error: err.message }];
    }
}

async function runSeeds(pool, seedDir) {
    if (!fs.existsSync(seedDir)) {
        migrationLogger.info('No seeds directory found');
        return;
    }
    const files = fs.readdirSync(seedDir).filter(f => f.endsWith('.sql')).sort();
    for (const file of files) {
        const sql = fs.readFileSync(path.join(seedDir, file), 'utf8');
        try {
            await pool.query(sql);
            migrationLogger.info(`Seeded: ${file}`);
        } catch (err) {
            migrationLogger.error(`Seed failed: ${file} - ${err.message}`);
        }
    }
}

async function getMigrationStatus(options = {}) {
    const { dir = DEFAULT_DIR, connectionString = process.env.DATABASE_URL, group } = options;
    let pool;
    try {
        pool = await getPool(connectionString);
        await ensureMigrationsTable(pool);

        const applied = await getAppliedMigrations(pool, group);
        const appliedMap = new Map(applied.map(r => [r.name, r]));

        const files = fs.existsSync(dir)
            ? fs.readdirSync(dir).filter(f => f.endsWith('.sql') && !f.includes('.down.')).sort()
            : [];

        const status = files.map(file => {
            const app = appliedMap.get(file);
            return {
                name: file,
                status: app ? app.status : 'pending',
                appliedAt: app ? app.applied_at : null,
                durationMs: app ? app.duration_ms : null,
                checksum: app ? app.checksum : null
            };
        });

        const notInFs = applied.filter(a => !files.includes(a.name)).map(a => ({
            name: a.name, status: 'missing_file', appliedAt: a.applied_at, durationMs: a.duration_ms
        }));

        await pool.end();
        return [...status, ...notInFs];
    } catch (err) {
        if (pool) await pool.end();
        return [{ error: err.message }];
    }
}

function printMigrationTable(statusList) {
    migrationLogger.info('Migration Status:');
    migrationLogger.info('='.repeat(100));
    migrationLogger.info('  Name'.padEnd(50) + 'Status'.padEnd(15) + 'Applied'.padEnd(25) + 'Duration');
    migrationLogger.info('-'.repeat(100));
    for (const s of statusList) {
        const name = (s.name || '?').padEnd(48);
        const st = (s.status || '?').padEnd(13);
        const at = s.appliedAt ? new Date(s.appliedAt).toISOString().slice(0, 19).padEnd(23) : ''.padEnd(23);
        const dur = s.durationMs ? `${s.durationMs}ms` : '-';
        migrationLogger.info(`  ${name} ${st} ${at} ${dur}`);
    }
    migrationLogger.info('='.repeat(100));
}

async function cleanupHistory(options = {}) {
    const { connectionString = process.env.DATABASE_URL, keepLast = 100, status = 'applied' } = options;
    let pool;
    try {
        pool = await getPool(connectionString);
        await ensureMigrationsTable(pool);
        const { rowCount } = await pool.query(
            `DELETE FROM ${MIGRATIONS_TABLE} WHERE status = $1 AND id NOT IN (
                SELECT id FROM ${MIGRATIONS_TABLE} WHERE status = $1 ORDER BY id DESC LIMIT $2
            )`,
            [status, keepLast]
        );
        migrationLogger.info(`Cleaned up ${rowCount} old migration records`);
        await pool.end();
        return { cleaned: rowCount };
    } catch (err) {
        if (pool) await pool.end();
        return { error: err.message };
    }
}

module.exports = {
    runMigrations, rollbackMigration, rollbackAll,
    getMigrationStatus, printMigrationTable,
    cleanupHistory, setDryRun, addHook, setLogger,
    validateMigration, parseMigrationName, runSeeds
};
