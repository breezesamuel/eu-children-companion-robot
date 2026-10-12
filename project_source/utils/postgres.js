const { Pool } = require('pg');
const crypto = require('crypto');

let pool = null;
let replicaPool = null;
let isConnected = false;
let queryLogging = false;
let slowQueryThreshold = 1000;
const preparedStatements = new Map();
const queryCounters = { total: 0, slow: 0, byQuery: new Map() };

const poolConfig = {
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    query_timeout: parseInt(process.env.PG_QUERY_TIMEOUT || '30000')
};

let sslConfig = null;
if (process.env.PG_SSL === 'true' || process.env.PG_SSL === '1') {
    sslConfig = { rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED !== 'false' };
    poolConfig.ssl = sslConfig;
}

function getPool() {
    if (!pool) {
        pool = new Pool(poolConfig);
        pool.on('error', (err) => {
            console.error('PostgreSQL pool error:', err.message);
        });
        pool.on('connect', () => {
            isConnected = true;
        });
    }
    return pool;
}

function getReplicaPool() {
    if (!process.env.DATABASE_URL_REPLICA) return getPool();
    if (!replicaPool) {
        replicaPool = new Pool({
            connectionString: process.env.DATABASE_URL_REPLICA,
            max: parseInt(process.env.PG_REPLICA_MAX || '50'),
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
            query_timeout: poolConfig.query_timeout,
            ssl: sslConfig
        });
    }
    return replicaPool;
}

function isWriteQuery(sql) {
    const trimmed = sql.trim().toUpperCase();
    return trimmed.startsWith('INSERT') || trimmed.startsWith('UPDATE') || trimmed.startsWith('DELETE') ||
           trimmed.startsWith('CREATE') || trimmed.startsWith('DROP') || trimmed.startsWith('ALTER') ||
           trimmed.startsWith('TRUNCATE') || trimmed.startsWith('REPLACE');
}

async function connect() {
    if (isConnected) return true;
    try {
        const client = await getPool().connect();
        client.release();
        isConnected = true;
        return true;
    } catch (err) {
        isConnected = false;
        return false;
    }
}

async function healthCheck() {
    try {
        const client = await getPool().connect();
        const result = await client.query('SELECT 1 AS ok');
        client.release();
        return { ok: true, latency: 0 };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

function getQueryPool(sql) {
    if (isWriteQuery(sql)) return getPool();
    return getReplicaPool();
}

async function loggedQuery(sql, params = [], poolOverride) {
    const targetPool = poolOverride || getQueryPool(sql);
    const start = Date.now();
    queryCounters.total++;
    const shortSql = sql.length > 200 ? sql.slice(0, 200) + '...' : sql;
    try {
        const result = await targetPool.query(sql, params);
        const duration = Date.now() - start;
        if (queryLogging) {
            const msg = `QUERY [${duration}ms] ${shortSql}`;
            if (duration >= slowQueryThreshold) {
                console.warn(`SLOW ` + msg);
                queryCounters.slow++;
            } else {
                console.log(msg);
            }
        }
        const key = shortSql;
        const existing = queryCounters.byQuery.get(key) || { count: 0, totalDuration: 0 };
        existing.count++;
        existing.totalDuration += duration;
        queryCounters.byQuery.set(key, existing);
        return result;
    } catch (err) {
        const duration = Date.now() - start;
        if (queryLogging) console.error(`QUERY ERROR [${duration}ms] ${shortSql}: ${err.message}`);
        throw err;
    }
}

async function get(query, params = []) {
    const result = await loggedQuery(query, params);
    return result.rows[0] || null;
}

async function all(query, params = []) {
    const result = await loggedQuery(query, params);
    return result.rows;
}

async function run(query, params = []) {
    const result = await loggedQuery(query, params);
    return { lastID: result.rows[0]?.id || null, changes: result.rowCount };
}

async function exec(query) {
    await loggedQuery(query);
}

async function query(sql, params = []) {
    const result = await loggedQuery(sql, params);
    return result.rows;
}

async function queryOne(sql, params = []) {
    const result = await loggedQuery(sql, params);
    return result.rows[0] || null;
}

async function insert(tableName, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.map(k => `"${k}"`).join(', ');
    const sql = `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders}) RETURNING *`;
    const result = await loggedQuery(sql, values, getPool());
    return { insertId: result.rows[0].id, lastID: result.rows[0].id, changes: 1 };
}

async function batchInsert(tableName, rows) {
    if (rows.length === 0) return { changes: 0 };
    const chunkSize = parseInt(process.env.PG_BATCH_SIZE || '500');
    const results = [];
    for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const keys = Object.keys(chunk[0]);
        const valuePlaceholders = chunk.map((row, rowIdx) =>
            keys.map((_, colIdx) => `$${rowIdx * keys.length + colIdx + 1}`).join(', ')
        );
        const values = chunk.flatMap(row => keys.map(k => row[k]));
        const columns = keys.map(k => `"${k}"`).join(', ');
        const sql = `INSERT INTO "${tableName}" (${columns}) VALUES ${valuePlaceholders.map(v => `(${v})`).join(', ')} RETURNING id`;
        const result = await loggedQuery(sql, values, getPool());
        results.push(...result.rows);
    }
    return { changes: results.length, ids: results.map(r => r.id) };
}

async function upsert(tableName, data, conflictColumns, updateColumns) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.map(k => `"${k}"`).join(', ');
    const conflictCols = conflictColumns.map(c => `"${c}"`).join(', ');
    const updates = (updateColumns || keys).map(k => `"${k}" = EXCLUDED."${k}"`).join(', ');
    const sql = `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders})
                 ON CONFLICT (${conflictCols}) DO UPDATE SET ${updates} RETURNING *`;
    const result = await loggedQuery(sql, values, getPool());
    return { lastID: result.rows[0]?.id || null, row: result.rows[0] };
}

async function update(tableName, data, where) {
    const setKeys = Object.keys(data);
    const whereKey = Object.keys(where)[0];
    const whereValue = Object.values(where)[0];
    const setClauses = setKeys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const values = [...Object.values(data), whereValue];
    const sql = `UPDATE "${tableName}" SET ${setClauses} WHERE "${whereKey}" = $${setKeys.length + 1}`;
    const result = await loggedQuery(sql, values, getPool());
    return { lastID: null, changes: result.rowCount };
}

async function delete_(tableName, where) {
    const whereKey = Object.keys(where)[0];
    const whereValue = Object.values(where)[0];
    const sql = `DELETE FROM "${tableName}" WHERE "${whereKey}" = $1`;
    const result = await loggedQuery(sql, [whereValue], getPool());
    return { lastID: null, changes: result.rowCount };
}

async function getTable(tableName) {
    const result = await loggedQuery(`SELECT * FROM "${tableName}"`, [], getReplicaPool());
    return result.rows;
}

class QueryBuilder {
    constructor(table) {
        this._table = table;
        this._select = '*';
        this._where = [];
        this._params = [];
        this._joins = [];
        this._orderBy = [];
        this._groupBy = [];
        this._limit = null;
        this._offset = null;
        this._having = null;
    }
    select(fields) {
        if (Array.isArray(fields)) this._select = fields.map(f => `"${f}"`).join(', ');
        else this._select = fields;
        return this;
    }
    where(condition, value) {
        const idx = this._params.length + 1;
        if (typeof condition === 'string' && value !== undefined) {
            this._where.push(`${condition} = $${idx}`);
            this._params.push(value);
        } else if (typeof condition === 'string') {
            this._where.push(condition);
        } else if (typeof condition === 'object') {
            for (const [key, val] of Object.entries(condition)) {
                const k = this._params.length + 1;
                this._where.push(`"${key}" = $${k}`);
                this._params.push(val);
            }
        }
        return this;
    }
    whereRaw(sql, params = []) {
        this._where.push(sql);
        this._params.push(...params);
        return this;
    }
    whereIn(column, values) {
        if (values.length === 0) { this._where.push('1=0'); return this; }
        const placeholders = values.map((_, i) => `$${this._params.length + i + 1}`).join(', ');
        this._where.push(`"${column}" IN (${placeholders})`);
        this._params.push(...values);
        return this;
    }
    join(table, onCondition, type = 'INNER') {
        this._joins.push(`${type} JOIN "${table}" ON ${onCondition}`);
        return this;
    }
    leftJoin(table, onCondition) { return this.join(table, onCondition, 'LEFT'); }
    orderBy(column, direction = 'ASC') {
        this._orderBy.push(`"${column}" ${direction}`);
        return this;
    }
    orderByRaw(sql) {
        this._orderBy.push(sql);
        return this;
    }
    groupBy(columns) {
        if (Array.isArray(columns)) this._groupBy.push(...columns.map(c => `"${c}"`));
        else this._groupBy.push(`"${columns}"`);
        return this;
    }
    having(condition) {
        this._having = condition;
        return this;
    }
    limit(n) { this._limit = n; return this; }
    offset(n) { this._offset = n; return this; }
    build() {
        let sql = `SELECT ${this._select} FROM "${this._table}"`;
        if (this._joins.length > 0) sql += ' ' + this._joins.join(' ');
        if (this._where.length > 0) sql += ' WHERE ' + this._where.join(' AND ');
        if (this._groupBy.length > 0) sql += ' GROUP BY ' + this._groupBy.join(', ');
        if (this._having) sql += ' HAVING ' + this._having;
        if (this._orderBy.length > 0) sql += ' ORDER BY ' + this._orderBy.join(', ');
        if (this._limit !== null) sql += ` LIMIT ${this._limit}`;
        if (this._offset !== null) sql += ` OFFSET ${this._offset}`;
        return { sql, params: this._params };
    }
    async execute() {
        const { sql, params } = this.build();
        const result = await loggedQuery(sql, params, getReplicaPool());
        return result.rows;
    }
    async first() {
        this._limit = 1;
        const rows = await this.execute();
        return rows[0] || null;
    }
}

function queryBuilder(table) { return new QueryBuilder(table); }

async function transaction(callback) {
    const client = await getPool().connect();
    try {
        await client.query('BEGIN');
        const result = await callback({
            query: (sql, params) => loggedQuery(sql, params, { query: client.query.bind(client) }),
            getPool: () => ({ query: client.query.bind(client) })
        });
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function retryOnDeadlock(fn, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            if ((err.code === '40P01' || err.message.includes('deadlock')) && attempt < maxRetries) {
                const delay = Math.min(100 * Math.pow(2, attempt - 1) + Math.random() * 50, 2000);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            throw err;
        }
    }
}

function prepareStatement(name, sql) {
    preparedStatements.set(name, sql);
    return { name, sql, execute: async (params) => loggedQuery(sql, params) };
}

function setQueryLogging(enabled) { queryLogging = enabled; }
function setSlowQueryThreshold(ms) { slowQueryThreshold = ms; }

function getPoolStats() {
    const p = getPool();
    return {
        totalCount: p.totalCount,
        idleCount: p.idleCount,
        waitingCount: p.waitingCount,
        isConnected
    };
}

async function getSchemaInfo() {
    try {
        const tables = await loggedQuery(
            `SELECT table_name, table_schema FROM information_schema.tables
             WHERE table_schema NOT IN ('pg_catalog', 'information_schema') ORDER BY table_name`,
            [], getReplicaPool()
        );
        const result = {};
        for (const t of tables.rows) {
            const cols = await loggedQuery(
                `SELECT column_name, data_type, is_nullable, column_default
                 FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
                [t.table_name], getReplicaPool()
            );
            result[t.table_name] = cols.rows.map(c => ({
                name: c.column_name, type: c.data_type, nullable: c.is_nullable === 'YES', default: c.column_default
            }));
        }
        return result;
    } catch (err) {
        return { error: err.message };
    }
}

async function getDbStats() {
    try {
        const dbSize = await loggedQuery(
            `SELECT pg_database_size(current_database()) AS size_bytes`,
            [], getReplicaPool()
        );
        const indexUsage = await loggedQuery(
            `SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
             FROM pg_stat_user_indexes ORDER BY idx_scan DESC LIMIT 20`,
            [], getReplicaPool()
        );
        return {
            databaseSizeBytes: dbSize.rows[0]?.size_bytes || 0,
            databaseSizeMB: ((dbSize.rows[0]?.size_bytes || 0) / 1024 / 1024).toFixed(1),
            indexUsage: indexUsage.rows,
            pool: getPoolStats(),
            queryCounters: {
                total: queryCounters.total,
                slow: queryCounters.slow,
                slowRate: queryCounters.total > 0 ? ((queryCounters.slow / queryCounters.total) * 100).toFixed(2) + '%' : '0%'
            }
        };
    } catch (err) {
        return { error: err.message };
    }
}

async function drain() {
    if (pool) {
        await pool.end();
        pool = null;
    }
    if (replicaPool) {
        await replicaPool.end();
        replicaPool = null;
    }
    isConnected = false;
}

module.exports = {
    connect, isConnected: () => isConnected, healthCheck,
    get, all, run, exec, query, queryOne,
    insert, batchInsert, upsert,
    update, delete: delete_, getTable,
    transaction, retryOnDeadlock,
    prepareStatement,
    queryBuilder,
    getPool, getReplicaPool,
    getPoolStats, getSchemaInfo, getDbStats,
    setQueryLogging, setSlowQueryThreshold,
    drain
};
