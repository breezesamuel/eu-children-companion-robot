// In-memory database implementation for Learning Companion Robot
// This provides a lightweight database alternative that doesn't require native compilation

// --- Minimal SQL WHERE helpers -------------------------------------------------
// The in-memory backend parses a small, well-defined subset of SQL. These helpers
// keep get()/all()/run() consistent: placeholders ('?' and '$n') consume params in
// textual order, while literals (numbers, quoted strings, true/false,
// CURRENT_TIMESTAMP) do NOT consume a param. Previously literals were mis-bound to
// positional params, which silently broke queries such as
// "WHERE challenge = $1 AND used = false AND expires_at > CURRENT_TIMESTAMP".

function extractWhere(query) {
    const m = query.match(/WHERE ([\s\S]+)/i);
    if (!m) return null;
    return m[1]
        .split(/\s+ORDER BY\s+/i)[0]
        .split(/\s+LIMIT\s+/i)[0]
        .split(/\s+OFFSET\s+/i)[0]
        .trim();
}

function parseWhere(whereClause, params) {
    const parts = whereClause.split(/\s+AND\s+/i);
    let idx = 0;
    const conditions = [];
    for (const part of parts) {
        const m = part.match(/^(\w+)\s*(=|!=|<>|>=|<=|>|<|LIKE)\s*([\s\S]+)$/i);
        if (!m) continue;
        const raw = m[3].trim();
        let value;
        if (raw === '?' || /^\$\d+$/.test(raw)) {
            value = /^\$(\d+)$/.test(raw) ? params[parseInt(raw.slice(1), 10) - 1] : params[idx++];
        } else if (/^CURRENT_TIMESTAMP$/i.test(raw) || /^NOW\(\)$/i.test(raw)) {
            value = new Date().toISOString();
        } else if (/^'.*'$/.test(raw) || /^".*"$/.test(raw)) {
            value = raw.slice(1, -1);
        } else if (/^(true|false)$/i.test(raw)) {
            value = raw.toLowerCase();
        } else {
            value = raw;
        }
        conditions.push({ field: m[1], operator: m[2].toUpperCase(), value });
    }
    return conditions;
}

function comparable(v) {
    if (v === null || v === undefined) return NaN;
    const s = String(v);
    const n = Number(s);
    if (!Number.isNaN(n) && s.trim() !== '') return n;
    const t = Date.parse(s);
    return Number.isNaN(t) ? NaN : t;
}

function matchesWhere(row, conditions) {
    return conditions.every(c => {
        const left = row[c.field];
        switch (c.operator) {
            case '=': return String(left) === String(c.value);
            case '!=':
            case '<>': return String(left) !== String(c.value);
            case '>': return comparable(left) > comparable(c.value);
            case '<': return comparable(left) < comparable(c.value);
            case '>=': return comparable(left) >= comparable(c.value);
            case '<=': return comparable(left) <= comparable(c.value);
            case 'LIKE': return String(left).includes(String(c.value).replace(/%/g, ''));
            default: return false;
        }
    });
}

class MemoryDatabase {
    constructor() {
        this.tables = {
            users: [],
            children: [],
            robots: [],
            learning_records: [],
            achievements: [],
            courses: [],
            schools: [],
            classes: [],
            school_students: [],
            notifications: [],
            system_logs: []
        };
        this.ids = {
            users: 1,
            children: 1,
            robots: 1,
            learning_records: 1,
            achievements: 1,
            courses: 1,
            schools: 1,
            classes: 1,
            school_students: 1,
            notifications: 1,
            system_logs: 1
        };
        this.initialize();
    }

    initialize() {
        // Seed users with REAL bcrypt hashes:
        //   admin@robot.com  -> admin123
        //   parent@example.com -> parent123
        // Regression note: these used to be a 58-char placeholder hash that bcrypt could
        // never match, which is why routes/auth.js carried a hardcoded password backdoor.
        // Both the hash and the backdoor are now fixed.
        this.tables.users = [
            { id: 1, username: 'admin', email: 'admin@robot.com', password_hash: '$2a$10$.ObkKxFgL0dTuKp/6j8hX.7NOG8JZn3jIlElc/XK6W7Eequc.fbyO', role: 'admin', first_name: 'System', last_name: 'Admin', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 2, username: 'parent1', email: 'parent@example.com', password_hash: '$2a$10$rwzNC2USEeE.rRkc2uYYkuJkkYJ3Vh3qlzdwHQu1ykdV3ub.NMsk6', role: 'parent', first_name: 'Sarah', last_name: 'Johnson', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        ];
        this.ids.users = 3;

        this.tables.children = [
            { id: 1, parent_id: 2, name: 'Emily', age: 8, grade: 'Grade 3', avatar: '👧', learning_goals: 'Math and English improvement', created_at: new Date().toISOString() },
            { id: 2, parent_id: 2, name: 'Michael', age: 10, grade: 'Grade 5', avatar: '👦', learning_goals: 'Science exploration', created_at: new Date().toISOString() }
        ];
        this.ids.children = 3;

        this.tables.courses = [
            { id: 1, title: 'Introduction to Mathematics', category: 'math', description: 'Basic math concepts for young learners', difficulty: 'beginner', duration: 30, created_at: new Date().toISOString() },
            { id: 2, title: 'English Vocabulary', category: 'language', description: 'Learn essential English words', difficulty: 'beginner', duration: 20, created_at: new Date().toISOString() },
            { id: 3, title: 'Science Experiments', category: 'science', description: 'Fun science activities', difficulty: 'intermediate', duration: 45, created_at: new Date().toISOString() },
            { id: 4, title: 'Art & Creativity', category: 'arts', description: 'Drawing and painting basics', difficulty: 'beginner', duration: 30, created_at: new Date().toISOString() },
            { id: 5, title: 'Programming Basics', category: 'technology', description: 'Introduction to coding with Scratch', difficulty: 'beginner', duration: 40, created_at: new Date().toISOString() }
        ];
        this.ids.courses = 6;

        this.tables.achievements = [
            { id: 1, child_id: null, title: 'First Lesson', description: 'Completed your first learning session', icon: '🎯', unlocked: false, unlocked_at: null, created_at: new Date().toISOString() },
            { id: 2, child_id: null, title: 'Math Master', description: 'Completed 100 math problems', icon: '🧮', unlocked: false, unlocked_at: null, created_at: new Date().toISOString() },
            { id: 3, child_id: null, title: 'Reading Star', description: 'Read 10 stories', icon: '📚', unlocked: false, unlocked_at: null, created_at: new Date().toISOString() },
            { id: 4, child_id: null, title: 'Science Explorer', description: 'Completed 5 science experiments', icon: '🔬', unlocked: false, unlocked_at: null, created_at: new Date().toISOString() },
            { id: 5, child_id: null, title: 'Artistic Genius', description: 'Created 20 artworks', icon: '🎨', unlocked: false, unlocked_at: null, created_at: new Date().toISOString() }
        ];
        this.ids.achievements = 6;

        this.tables.robots = [
            { id: 1, device_id: 'RB-8921', name: 'RoboBuddy Alpha', status: 'online', battery_level: 85, location: 'London, UK', last_active: new Date().toISOString(), firmware_version: '2.0.0', child_id: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 2, device_id: 'RB-4567', name: 'RoboBuddy Beta', status: 'online', battery_level: 62, location: 'Paris, France', last_active: new Date().toISOString(), firmware_version: '2.0.0', child_id: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
            { id: 3, device_id: 'RB-1234', name: 'RoboBuddy Gamma', status: 'offline', battery_level: 12, location: 'Berlin, Germany', last_active: null, firmware_version: '1.9.0', child_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        ];
        this.ids.robots = 4;

        console.log('✅ Memory database initialized with sample data');
    }

    async get(query, params = []) {
        const match = query.match(/FROM (\w+)/i);
        if (!match) return null;
        
        const tableName = match[1];
        const table = this.tables[tableName];
        
        if (!table) return null;

        const whereClause = extractWhere(query);
        if (whereClause) {
            const conditions = parseWhere(whereClause, params);
            return table.find(row => matchesWhere(row, conditions)) || null;
        }

        return table[0] || null;
    }

    async all(query, params = []) {
        const match = query.match(/FROM (\w+)/i);
        if (!match) return [];
        
        const tableName = match[1];
        const table = this.tables[tableName];
        
        if (!table) return [];

        let results = [...table];

        const whereClause = extractWhere(query);
        if (whereClause) {
            const conditions = parseWhere(whereClause, params);
            if (conditions.length) {
                results = results.filter(row => matchesWhere(row, conditions));
            }
        }

        const orderMatch = query.match(/ORDER BY (\w+)(\s+DESC)?/i);
        if (orderMatch) {
            const field = orderMatch[1];
            const desc = orderMatch[2] ? -1 : 1;
            results.sort((a, b) => {
                if (a[field] < b[field]) return -desc;
                if (a[field] > b[field]) return desc;
                return 0;
            });
        }

        const limitMatch = query.match(/LIMIT (\d+)(\s+OFFSET (\d+))?/i);
        if (limitMatch) {
            const limit = parseInt(limitMatch[1]);
            const offset = limitMatch[3] ? parseInt(limitMatch[3]) : 0;
            results = results.slice(offset, offset + limit);
        }

        return results;
    }

    async run(query, params = []) {
        const insertMatch = query.match(/INSERT INTO (\w+) \((.+)\) VALUES \((.+)\)/i);
        if (insertMatch) {
            const tableName = insertMatch[1];
            const fields = insertMatch[2].split(',').map(f => f.trim());
            const values = insertMatch[3].split(',').map(() => params.shift());
            
            const row = { id: this.ids[tableName]++ };
            fields.forEach((field, index) => {
                row[field] = values[index];
            });
            
            if (!this.tables[tableName]) {
                this.tables[tableName] = [];
            }
            this.tables[tableName].push(row);
            
            return { lastID: row.id, changes: 1 };
        }

        const updateMatch = query.match(/UPDATE (\w+) SET ([\s\S]+?) WHERE ([\s\S]+)$/i);
        if (updateMatch) {
            const tableName = updateMatch[1];
            const setParts = updateMatch[2].split(/\s*,\s*/).map(p => p.trim()).filter(Boolean);
            const whereParts = updateMatch[3].split(/\s+AND\s+/i).map(p => p.trim()).filter(Boolean);

            const splitAssign = (part) => {
                const eq = part.indexOf('=');
                if (eq === -1) return { field: part.trim(), value: '' };
                return { field: part.slice(0, eq).trim(), value: part.slice(eq + 1).trim() };
            };
            const assignments = setParts.map(splitAssign);
            const conditions = whereParts.map(part => {
                const m = part.match(/^(\w+)\s*(=|!=|<>|>=|<=|>|<)\s*([\s\S]+)$/);
                return m ? { field: m[1], operator: m[2], value: m[3].trim() } : null;
            }).filter(Boolean);

            // Bind positional params to placeholders in textual order so both '?'
            // and numbered '$n' placeholders work. The previous implementation only
            // understood '?', which made every "SET x = $1 ... WHERE y = $2" update
            // silently match nothing (the SET value was used as the WHERE value).
            const isPlaceholder = (v) => v === '?' || /^\$\d+$/.test(v);
            const ordered = [...assignments, ...conditions];
            let pIdx = 0;
            ordered.forEach(item => { if (isPlaceholder(item.value)) item.param = params[pIdx++]; });
            ordered.forEach(item => {
                const m = item.value && item.value.match(/^\$(\d+)$/);
                if (m) item.param = params[parseInt(m[1], 10) - 1];
            });

            const evalValue = (item) => {
                const v = item.value;
                if (isPlaceholder(v)) return item.param;
                if (/^NULL$/i.test(v)) return null;
                if (/^(true|false)$/i.test(v)) return v.toLowerCase() === 'true';
                if (/^CURRENT_TIMESTAMP$/i.test(v) || /^NOW\(\)$/i.test(v)) return new Date().toISOString();
                if (/^'[\s\S]*'$/.test(v) || /^"[\s\S]*"$/.test(v)) return v.slice(1, -1);
                if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
                // Unsupported SQL expression (e.g. COALESCE(...)+1): leave the column
                // untouched rather than storing the literal expression text.
                return undefined;
            };

            const testCondition = (row, cond) => {
                const left = row[cond.field];
                const right = evalValue(cond);
                switch (cond.operator) {
                    case '=': return String(left) === String(right);
                    case '!=':
                    case '<>': return String(left) !== String(right);
                    case '>': return Number(left) > Number(right);
                    case '<': return Number(left) < Number(right);
                    case '>=': return Number(left) >= Number(right);
                    case '<=': return Number(left) <= Number(right);
                    default: return false;
                }
            };

            let changes = 0;
            (this.tables[tableName] || []).forEach(row => {
                if (!conditions.every(cond => testCondition(row, cond))) return;
                assignments.forEach(item => {
                    const val = evalValue(item);
                    if (val !== undefined) row[item.field] = val;
                });
                changes++;
            });

            return { lastID: null, changes };
        }

        const deleteMatch = query.match(/DELETE FROM (\w+) WHERE (.+)/i);
        if (deleteMatch) {
            const tableName = deleteMatch[1];
            const whereClause = deleteMatch[2];
            const [field, , value] = whereClause.split(/\s+/);
            const paramValue = params[0];
            
            const initialLength = this.tables[tableName].length;
            this.tables[tableName] = this.tables[tableName].filter(row => {
                return String(row[field]) !== String(paramValue);
            });
            
            return { lastID: null, changes: initialLength - this.tables[tableName].length };
        }

        return { lastID: null, changes: 0 };
    }

    async exec(query) {
        return;
    }

    getTable(tableName) {
        return this.tables[tableName] || [];
    }

    // Convenience methods matching backend API route expectations
    async query(sql, params = []) {
        return this.all(sql, params);
    }

    async queryOne(sql, params = []) {
        return this.get(sql, params);
    }

    async insert(tableName, data) {
        if (!this.tables[tableName]) {
            this.tables[tableName] = [];
            this.ids[tableName] = 1;
        }
        const row = { id: this.ids[tableName]++, ...data };
        this.tables[tableName].push(row);
        return { insertId: row.id, lastID: row.id, changes: 1 };
    }

    async update(tableName, data, where) {
        const whereField = Object.keys(where)[0];
        const whereValue = Object.values(where)[0];
        let changes = 0;
        this.tables[tableName].forEach((row, index) => {
            if (String(row[whereField]) === String(whereValue)) {
                this.tables[tableName][index] = { ...row, ...data };
                changes++;
            }
        });
        return { lastID: null, changes };
    }

    async delete(tableName, where) {
        const whereField = Object.keys(where)[0];
        const whereValue = Object.values(where)[0];
        const initialLength = this.tables[tableName].length;
        this.tables[tableName] = this.tables[tableName].filter(row =>
            String(row[whereField]) !== String(whereValue)
        );
        return { lastID: null, changes: initialLength - this.tables[tableName].length };
    }
}

const memoryDb = new MemoryDatabase();

const pg = require('./postgres');
let usePostgres = false;

if (process.env.DATABASE_URL) {
    pg.connect().then(ok => {
        if (ok) {
            usePostgres = true;
            console.log('✅ PostgreSQL connected');
            require('./migrations').runMigrations();
        }
    }).catch(() => {
        console.warn('⚠️ PostgreSQL unavailable, using MemoryDatabase');
    });
}

function backend() {
    return (usePostgres && pg.isConnected()) ? pg : memoryDb;
}

module.exports = {
    db: memoryDb,
    get: (...args) => backend().get(...args),
    all: (...args) => backend().all(...args),
    run: (...args) => backend().run(...args),
    exec: (...args) => backend().exec(...args),
    query: (...args) => backend().query(...args),
    queryOne: (...args) => backend().queryOne(...args),
    insert: (...args) => backend().insert(...args),
    update: (...args) => backend().update(...args),
    delete: (...args) => backend().delete(...args),
    getTable: (...args) => backend().getTable(...args)
};