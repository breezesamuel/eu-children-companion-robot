CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'parent',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    country VARCHAR(100),
    avatar VARCHAR(255),
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gdpr_consents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL,
    granted BOOLEAN DEFAULT false,
    granted_at TIMESTAMP,
    revoked_at TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS children (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    nickname VARCHAR(100),
    gender VARCHAR(10) DEFAULT 'male',
    birthday DATE,
    age INTEGER,
    grade VARCHAR(50),
    grade_level VARCHAR(50),
    school_name VARCHAR(200),
    avatar VARCHAR(255),
    learning_goals TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS robots (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    status VARCHAR(20) DEFAULT 'offline',
    battery_level INTEGER DEFAULT 100,
    location VARCHAR(255),
    last_active TIMESTAMP,
    firmware_version VARCHAR(50),
    child_id INTEGER REFERENCES children(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(50),
    description TEXT,
    difficulty VARCHAR(20) DEFAULT 'beginner',
    duration INTEGER DEFAULT 30,
    content TEXT,
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS learning_records (
    id SERIAL PRIMARY KEY,
    child_id INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
    activity_type VARCHAR(50),
    score NUMERIC(5,2),
    duration_minutes INTEGER,
    details JSONB DEFAULT '{}',
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    unlocked BOOLEAN DEFAULT false,
    unlocked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schools (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS classes (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    grade_level VARCHAR(50),
    teacher_name VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS school_students (
    id SERIAL PRIMARY KEY,
    school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    child_id INTEGER REFERENCES children(id) ON DELETE CASCADE,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    body TEXT,
    type VARCHAR(50) DEFAULT 'info',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(20) DEFAULT 'info',
    action VARCHAR(100),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deleted_users (
    id SERIAL PRIMARY KEY,
    original_user_id INTEGER,
    username VARCHAR(100),
    email VARCHAR(255),
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deletion_reason VARCHAR(255),
    data_export_path TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_children_parent ON children(parent_id);
CREATE INDEX IF NOT EXISTS idx_children_status ON children(status);
CREATE INDEX IF NOT EXISTS idx_robots_device ON robots(device_id);
CREATE INDEX IF NOT EXISTS idx_robots_child ON robots(child_id);
CREATE INDEX IF NOT EXISTS idx_learning_child ON learning_records(child_id);
CREATE INDEX IF NOT EXISTS idx_learning_completed ON learning_records(completed_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_gdpr_consents_user ON gdpr_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_deleted_users_email ON deleted_users(email);
