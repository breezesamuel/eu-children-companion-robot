-- ============================================================
-- 欧洲儿童陪护机器人 - 完整数据库架构
-- Version: 2.0.0
-- Description: 商业化产品级数据库设计
-- ============================================================

-- ============================================================
-- 用户与认证模块
-- ============================================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    user_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
    username VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
    email VARCHAR(100) UNIQUE NOT NULL COMMENT '邮箱',
    phone VARCHAR(20) COMMENT '手机号',
    password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
    salt VARCHAR(100) COMMENT '加密盐',
    role ENUM('admin', 'parent', 'teacher', 'child') DEFAULT 'parent' COMMENT '用户角色',
    status ENUM('active', 'inactive', 'suspended', 'deleted') DEFAULT 'active' COMMENT '状态',
    avatar_url VARCHAR(255) COMMENT '头像URL',
    first_name VARCHAR(50) COMMENT '名',
    last_name VARCHAR(50) COMMENT '姓',
    gender ENUM('male', 'female', 'other') COMMENT '性别',
    birthday DATE COMMENT '生日',
    timezone VARCHAR(50) DEFAULT 'Asia/Shanghai' COMMENT '时区',
    language VARCHAR(20) DEFAULT 'zh-CN' COMMENT '语言偏好',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    last_login_at TIMESTAMP COMMENT '最后登录时间',
    deleted_at TIMESTAMP COMMENT '删除时间',
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 登录记录表
CREATE TABLE IF NOT EXISTS login_logs (
    log_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '日志ID',
    user_id BIGINT COMMENT '用户ID',
    username VARCHAR(50) COMMENT '用户名',
    ip_address VARCHAR(45) COMMENT 'IP地址',
    user_agent TEXT COMMENT '用户代理',
    device_info JSON COMMENT '设备信息',
    location VARCHAR(255) COMMENT '地理位置',
    login_status ENUM('success', 'failed', 'locked') COMMENT '登录状态',
    failure_reason VARCHAR(255) COMMENT '失败原因',
    login_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '登录时间',
    INDEX idx_user_id (user_id),
    INDEX idx_login_time (login_timestamp),
    INDEX idx_ip (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='登录日志';

-- API密钥表
CREATE TABLE IF NOT EXISTS api_keys (
    key_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '密钥ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    key_name VARCHAR(100) NOT NULL COMMENT '密钥名称',
    api_key VARCHAR(255) UNIQUE NOT NULL COMMENT 'API密钥',
    api_secret VARCHAR(255) NOT NULL COMMENT 'API密钥加密',
    permissions JSON COMMENT '权限配置',
    rate_limit INT DEFAULT 1000 COMMENT '速率限制',
    requests_count BIGINT DEFAULT 0 COMMENT '请求次数',
    last_used_at TIMESTAMP COMMENT '最后使用时间',
    expires_at TIMESTAMP COMMENT '过期时间',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_user_id (user_id),
    INDEX idx_api_key (api_key),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API密钥';

-- ============================================================
-- 儿童与家庭模块
-- ============================================================

-- 儿童信息表
CREATE TABLE IF NOT EXISTS children (
    child_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '儿童ID',
    parent_id BIGINT NOT NULL COMMENT '家长用户ID',
    first_name VARCHAR(50) NOT NULL COMMENT '名',
    last_name VARCHAR(50) COMMENT '姓',
    nickname VARCHAR(50) COMMENT '昵称',
    gender ENUM('male', 'female') COMMENT '性别',
    birthday DATE NOT NULL COMMENT '生日',
    grade_level VARCHAR(20) COMMENT '年级',
    school_name VARCHAR(100) COMMENT '学校名称',
    avatar_url VARCHAR(255) COMMENT '头像URL',
    personality_profile JSON COMMENT '性格画像',
    learning_style VARCHAR(50) COMMENT '学习风格',
    interests JSON COMMENT '兴趣爱好',
    strengths JSON COMMENT '优势',
    areas_to_improve JSON COMMENT '待提高领域',
    bio TEXT COMMENT '简介',
    status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_parent_id (parent_id),
    INDEX idx_grade (grade_level),
    INDEX idx_status (status),
    FOREIGN KEY (parent_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='儿童信息表';

-- 儿童成长记录
CREATE TABLE IF NOT EXISTS growth_records (
    record_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
    child_id BIGINT NOT NULL COMMENT '儿童ID',
    record_date DATE NOT NULL COMMENT '记录日期',
    height_cm DECIMAL(5,2) COMMENT '身高CM',
    weight_kg DECIMAL(5,2) COMMENT '体重KG',
    sleep_hours DECIMAL(3,1) COMMENT '睡眠时长',
    physical_activity TEXT COMMENT '体育活动',
    mood VARCHAR(50) COMMENT '当天心情',
    health_notes TEXT COMMENT '健康笔记',
    milestones JSON COMMENT '成长里程碑',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_child_id (child_id),
    INDEX idx_record_date (record_date),
    FOREIGN KEY (child_id) REFERENCES children(child_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='儿童成长记录';

-- 家庭关系表
CREATE TABLE IF NOT EXISTS family_relationships (
    relationship_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '关系ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    child_id BIGINT NOT NULL COMMENT '儿童ID',
    relationship_type ENUM('father', 'mother', 'guardian', 'other') NOT NULL COMMENT '关系类型',
    permissions JSON COMMENT '权限配置',
    is_primary BOOLEAN DEFAULT FALSE COMMENT '是否主要监护人',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_user_id (user_id),
    INDEX idx_child_id (child_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (child_id) REFERENCES children(child_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='家庭关系';

-- ============================================================
-- 机器人与设备模块
-- ============================================================

-- 机器人表
CREATE TABLE IF NOT EXISTS robots (
    robot_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '机器人ID',
    device_serial VARCHAR(100) UNIQUE NOT NULL COMMENT '设备序列号',
    device_name VARCHAR(100) COMMENT '设备名称',
    model VARCHAR(50) COMMENT '型号',
    firmware_version VARCHAR(50) COMMENT '固件版本',
    hardware_version VARCHAR(50) COMMENT '硬件版本',
    child_id BIGINT COMMENT '绑定的儿童ID',
    owner_id BIGINT COMMENT '拥有者用户ID',
    status ENUM('online', 'offline', 'sleeping', 'updating', 'error') DEFAULT 'offline' COMMENT '状态',
    battery_level INT DEFAULT 100 COMMENT '电量百分比',
    location VARCHAR(255) COMMENT '地理位置',
    last_online_at TIMESTAMP COMMENT '最后在线时间',
    settings JSON COMMENT '机器人设置',
    capabilities JSON COMMENT '功能列表',
    wifi_ssid VARCHAR(100) COMMENT 'WiFi名称',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_serial (device_serial),
    INDEX idx_child_id (child_id),
    INDEX idx_owner_id (owner_id),
    INDEX idx_status (status),
    INDEX idx_last_online (last_online_at),
    FOREIGN KEY (child_id) REFERENCES children(child_id) ON DELETE SET NULL,
    FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='机器人表';

-- 机器人心跳表
CREATE TABLE IF NOT EXISTS robot_heartbeats (
    heartbeat_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '心跳ID',
    robot_id BIGINT NOT NULL COMMENT '机器人ID',
    status ENUM('online', 'offline') NOT NULL COMMENT '状态',
    battery_level INT COMMENT '电量',
    temperature DECIMAL(4,1) COMMENT '温度',
    network_strength INT COMMENT '网络信号',
    location VARCHAR(255) COMMENT '位置',
    sensor_data JSON COMMENT '传感器数据',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '时间戳',
    INDEX idx_robot_id (robot_id),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (robot_id) REFERENCES robots(robot_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='机器人心跳';

-- ============================================================
-- AI对话与理解模块
-- ============================================================

-- 对话会话表
CREATE TABLE IF NOT EXISTS chat_sessions (
    session_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '会话ID',
    child_id BIGINT NOT NULL COMMENT '儿童ID',
    robot_id BIGINT COMMENT '机器人ID',
    user_id BIGINT COMMENT '用户ID(如家长)',
    session_title VARCHAR(255) COMMENT '会话标题',
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '开始时间',
    end_time TIMESTAMP COMMENT '结束时间',
    message_count INT DEFAULT 0 COMMENT '消息数',
    duration_seconds INT COMMENT '持续秒数',
    mood_detected VARCHAR(50) COMMENT '检测到的情绪',
    topics JSON COMMENT '话题标签',
    summary TEXT COMMENT '会话摘要',
    is_ended BOOLEAN DEFAULT FALSE COMMENT '是否结束',
    INDEX idx_child_id (child_id),
    INDEX idx_robot_id (robot_id),
    INDEX idx_start_time (start_time),
    FOREIGN KEY (child_id) REFERENCES children(child_id) ON DELETE CASCADE,
    FOREIGN KEY (robot_id) REFERENCES robots(robot_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='对话会话';

-- 对话消息表
CREATE TABLE IF NOT EXISTS chat_messages (
    message_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '消息ID',
    session_id BIGINT NOT NULL COMMENT '会话ID',
    sender_type ENUM('child', 'parent', 'robot', 'system') NOT NULL COMMENT '发送者类型',
    sender_id BIGINT COMMENT '发送者ID',
    message_type ENUM('text', 'voice', 'image', 'video', 'emoji') DEFAULT 'text' COMMENT '消息类型',
    content TEXT NOT NULL COMMENT '消息内容',
    media_url VARCHAR(255) COMMENT '媒体URL',
    media_duration INT COMMENT '媒体时长(秒)',
    intent_recognized VARCHAR(100) COMMENT '识别到的意图',
    entities JSON COMMENT '提取的实体',
    sentiment_analysis JSON COMMENT '情感分析结果',
    confidence_score DECIMAL(3,2) COMMENT '置信度',
    response_to_id BIGINT COMMENT '回复的消息ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_session_id (session_id),
    INDEX idx_sender (sender_type, sender_id),
    INDEX idx_created_at (created_at),
    INDEX idx_intent (intent_recognized),
    FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='对话消息';

-- 意图表
CREATE TABLE IF NOT EXISTS intents (
    intent_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '意图ID',
    intent_code VARCHAR(100) UNIQUE NOT NULL COMMENT '意图代码',
    intent_name VARCHAR(100) NOT NULL COMMENT '意图名称',
    category VARCHAR(50) COMMENT '类别',
    description TEXT COMMENT '描述',
    utterances JSON COMMENT '示例说法',
    responses JSON COMMENT '回复模板',
    parameters JSON COMMENT '参数定义',
    priority INT DEFAULT 0 COMMENT '优先级',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_code (intent_code),
    INDEX idx_category (category),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='意图表';

-- 情感分析表
CREATE TABLE IF NOT EXISTS emotion_records (
    emotion_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '情感ID',
    child_id BIGINT NOT NULL COMMENT '儿童ID',
    message_id BIGINT COMMENT '关联消息ID',
    emotion_type VARCHAR(50) NOT NULL COMMENT '情感类型',
    intensity DECIMAL(3,2) COMMENT '强度',
    confidence DECIMAL(3,2) COMMENT '置信度',
    context TEXT COMMENT '上下文',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_child_id (child_id),
    INDEX idx_emotion_type (emotion_type),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (child_id) REFERENCES children(child_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='情感分析记录';

-- 用户记忆表（长期记忆）
CREATE TABLE IF NOT EXISTS user_memories (
    memory_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '记忆ID',
    child_id BIGINT NOT NULL COMMENT '儿童ID',
    memory_type VARCHAR(50) NOT NULL COMMENT '记忆类型',
    key_name VARCHAR(100) NOT NULL COMMENT '记忆键',
    value_data TEXT COMMENT '记忆值',
    importance_score INT DEFAULT 5 COMMENT '重要度1-10',
    context TEXT COMMENT '相关上下文',
    occurred_at TIMESTAMP COMMENT '发生时间',
    expires_at TIMESTAMP COMMENT '过期时间',
    access_count INT DEFAULT 0 COMMENT '访问次数',
    last_accessed_at TIMESTAMP COMMENT '最后访问时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_child_id (child_id),
    INDEX idx_memory_type (memory_type),
    INDEX idx_key (child_id, key_name),
    INDEX idx_importance (importance_score),
    FOREIGN KEY (child_id) REFERENCES children(child_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户记忆表';

-- 常识知识库
CREATE TABLE IF NOT EXISTS common_sense_knowledge (
    knowledge_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '知识ID',
    category VARCHAR(50) NOT NULL COMMENT '类别',
    question TEXT COMMENT '问题/场景',
    answer TEXT NOT NULL COMMENT '答案/建议',
    tags JSON COMMENT '标签',
    priority INT DEFAULT 0 COMMENT '优先级',
    usage_count INT DEFAULT 0 COMMENT '使用次数',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_category (category),
    INDEX idx_tags ((CAST(tags AS CHAR(255)))),
    INDEX idx_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='常识知识库';

-- ============================================================
-- 学习与教育模块
-- ============================================================

-- 学习记录
CREATE TABLE IF NOT EXISTS learning_records (
    record_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
    child_id BIGINT NOT NULL COMMENT '儿童ID',
    activity_type VARCHAR(50) NOT NULL COMMENT '活动类型',
    activity_name VARCHAR(100) COMMENT '活动名称',
    subject VARCHAR(50) COMMENT '学科',
    grade_level VARCHAR(20) COMMENT '年级',
    difficulty VARCHAR(20) DEFAULT 'medium' COMMENT '难度',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '开始时间',
    completed_at TIMESTAMP COMMENT '完成时间',
    duration_seconds INT COMMENT '时长(秒)',
    score DECIMAL(5,2) COMMENT '分数',
    correct_count INT COMMENT '正确数',
    total_count INT COMMENT '总题数',
    accuracy DECIMAL(5,2) COMMENT '正确率',
    mastery_level VARCHAR(20) COMMENT '掌握程度',
    skills_practiced JSON COMMENT '练习技能',
    mistakes JSON COMMENT '错误分析',
    feedback TEXT COMMENT '反馈',
    metadata JSON COMMENT '元数据',
    INDEX idx_child_id (child_id),
    INDEX idx_activity_type (activity_type),
    INDEX idx_subject (subject),
    INDEX idx_date (started_at),
    INDEX idx_mastery (mastery_level),
    FOREIGN KEY (child_id) REFERENCES children(child_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学习记录';

-- 学科课程表
CREATE TABLE IF NOT EXISTS courses (
    course_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '课程ID',
    course_code VARCHAR(50) UNIQUE COMMENT '课程代码',
    title VARCHAR(255) NOT NULL COMMENT '标题',
    description TEXT COMMENT '描述',
    subject VARCHAR(50) NOT NULL COMMENT '学科',
    grade_level VARCHAR(50) COMMENT '年级',
    difficulty ENUM('beginner', 'intermediate', 'advanced', 'expert') DEFAULT 'beginner' COMMENT '难度',
    thumbnail_url VARCHAR(255) COMMENT '缩略图',
    estimated_duration INT COMMENT '预计时长(分钟)',
    learning_objectives JSON COMMENT '学习目标',
    prerequisites JSON COMMENT '前置条件',
    content JSON COMMENT '课程内容',
    tags JSON COMMENT '标签',
    is_premium BOOLEAN DEFAULT FALSE COMMENT '是否付费',
    price DECIMAL(10,2) COMMENT '价格',
    currency VARCHAR(10) DEFAULT 'CNY' COMMENT '货币',
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft' COMMENT '状态',
    created_by BIGINT COMMENT '创建者',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_subject (subject),
    INDEX idx_grade (grade_level),
    INDEX idx_status (status),
    INDEX idx_tags ((CAST(tags AS CHAR(255))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程表';

-- 学习进度表
CREATE TABLE IF NOT EXISTS learning_progress (
    progress_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '进度ID',
    child_id BIGINT NOT NULL COMMENT '儿童ID',
    course_id BIGINT COMMENT '课程ID',
    subject VARCHAR(50) COMMENT '学科',
    topic VARCHAR(100) COMMENT '主题',
    current_level VARCHAR(50) COMMENT '当前水平',
    mastery_score DECIMAL(5,2) COMMENT '掌握度分数',
    skills_mastered JSON COMMENT '已掌握技能',
    skills_in_progress JSON COMMENT '学习中技能',
    skills_next JSON COMMENT '下一步技能',
    learning_path JSON COMMENT '学习路径',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新',
    INDEX idx_child_id (child_id),
    INDEX idx_subject (subject),
    INDEX idx_course_id (course_id),
    FOREIGN KEY (child_id) REFERENCES children(child_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学习进度';

-- 练习题表
CREATE TABLE IF NOT EXISTS practice_questions (
    question_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '题目ID',
    subject VARCHAR(50) NOT NULL COMMENT '学科',
    topic VARCHAR(100) COMMENT '主题',
    grade_level VARCHAR(20) COMMENT '年级',
    difficulty ENUM('easy', 'medium', 'hard', 'challenging') DEFAULT 'medium' COMMENT '难度',
    question_type VARCHAR(50) COMMENT '题型',
    question_text TEXT NOT NULL COMMENT '题目内容',
    options JSON COMMENT '选项',
    correct_answer TEXT NOT NULL COMMENT '正确答案',
    explanation TEXT COMMENT '解析',
    hints JSON COMMENT '提示',
    tags JSON COMMENT '标签',
    metadata JSON COMMENT '元数据',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_subject (subject),
    INDEX idx_topic (topic),
    INDEX idx_grade (grade_level),
    INDEX idx_difficulty (difficulty),
    INDEX idx_tags ((CAST(tags AS CHAR(255))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='练习题';

-- 成就系统
CREATE TABLE IF NOT EXISTS achievements (
    achievement_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '成就ID',
    title VARCHAR(100) NOT NULL COMMENT '成就标题',
    description TEXT COMMENT '描述',
    category VARCHAR(50) COMMENT '类别',
    icon VARCHAR(100) COMMENT '图标',
    badge_url VARCHAR(255) COMMENT '徽章URL',
    criteria JSON COMMENT '获得条件',
    points INT DEFAULT 10 COMMENT '积分',
    rarity VARCHAR(20) DEFAULT 'common' COMMENT '稀有度',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='成就表';

-- 获得的成就
CREATE TABLE IF NOT EXISTS earned_achievements (
    earned_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    child_id BIGINT NOT NULL COMMENT '儿童ID',
    achievement_id BIGINT NOT NULL COMMENT '成就ID',
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '获得时间',
    context TEXT COMMENT '获得场景',
    INDEX idx_child_id (child_id),
    INDEX idx_achievement_id (achievement_id),
    INDEX idx_earned_date (earned_at),
    FOREIGN KEY (child_id) REFERENCES children(child_id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(achievement_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='获得的成就';

-- ============================================================
-- 学校与班级模块
-- ============================================================

-- 学校表
CREATE TABLE IF NOT EXISTS schools (
    school_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '学校ID',
    school_name VARCHAR(200) NOT NULL COMMENT '学校名称',
    address VARCHAR(255) COMMENT '地址',
    city VARCHAR(100) COMMENT '城市',
    country VARCHAR(100) COMMENT '国家',
    school_type VARCHAR(50) COMMENT '学校类型',
    principal_name VARCHAR(100) COMMENT '校长姓名',
    contact_email VARCHAR(100) COMMENT '联系邮箱',
    contact_phone VARCHAR(20) COMMENT '联系电话',
    logo_url VARCHAR(255) COMMENT 'logo',
    website VARCHAR(255) COMMENT '网站',
    settings JSON COMMENT '学校设置',
    status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_name (school_name),
    INDEX idx_city (city),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学校表';

-- 班级表
CREATE TABLE IF NOT EXISTS classes (
    class_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '班级ID',
    school_id BIGINT NOT NULL COMMENT '学校ID',
    class_name VARCHAR(100) NOT NULL COMMENT '班级名称',
    grade VARCHAR(20) COMMENT '年级',
    teacher_id BIGINT COMMENT '班主任ID',
    academic_year VARCHAR(20) COMMENT '学年',
    description TEXT COMMENT '描述',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_school_id (school_id),
    INDEX idx_grade (grade),
    INDEX idx_teacher_id (teacher_id),
    FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='班级表';

-- 班级学生关联
CREATE TABLE IF NOT EXISTS class_students (
    enrollment_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '关联ID',
    class_id BIGINT NOT NULL COMMENT '班级ID',
    child_id BIGINT NOT NULL COMMENT '儿童ID',
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '入学时间',
    status ENUM('active', 'inactive', 'graduated') DEFAULT 'active' COMMENT '状态',
    INDEX idx_class_id (class_id),
    INDEX idx_child_id (child_id),
    INDEX idx_status (status),
    FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE,
    FOREIGN KEY (child_id) REFERENCES children(child_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='班级学生关联';

-- ============================================================
-- 通知与消息模块
-- ============================================================

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
    notification_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '通知ID',
    user_id BIGINT NOT NULL COMMENT '接收用户ID',
    title VARCHAR(255) NOT NULL COMMENT '标题',
    body TEXT COMMENT '正文',
    notification_type VARCHAR(50) NOT NULL COMMENT '通知类型',
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal' COMMENT '优先级',
    data JSON COMMENT '附加数据',
    is_read BOOLEAN DEFAULT FALSE COMMENT '是否已读',
    read_at TIMESTAMP COMMENT '阅读时间',
    action_url VARCHAR(255) COMMENT '跳转URL',
    expires_at TIMESTAMP COMMENT '过期时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_user_id (user_id),
    INDEX idx_type (notification_type),
    INDEX idx_read (user_id, is_read),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知表';

-- 推送设备表
CREATE TABLE IF NOT EXISTS push_devices (
    device_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '设备ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    device_name VARCHAR(100) COMMENT '设备名称',
    device_type VARCHAR(20) NOT NULL COMMENT '设备类型',
    push_token VARCHAR(255) NOT NULL COMMENT '推送token',
    push_service VARCHAR(50) COMMENT '推送服务',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
    last_used TIMESTAMP COMMENT '最后使用时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_user_id (user_id),
    INDEX idx_token (push_token),
    INDEX idx_active (is_active),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='推送设备表';

-- ============================================================
-- 内容与资源模块
-- ============================================================

-- 内容表
CREATE TABLE IF NOT EXISTS content_items (
    content_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '内容ID',
    content_type VARCHAR(50) NOT NULL COMMENT '内容类型',
    title VARCHAR(255) NOT NULL COMMENT '标题',
    description TEXT COMMENT '描述',
    content_data TEXT NOT NULL COMMENT '内容数据',
    content_url VARCHAR(255) COMMENT '内容URL',
    thumbnail_url VARCHAR(255) COMMENT '缩略图',
    language VARCHAR(20) DEFAULT 'zh-CN' COMMENT '语言',
    target_ages VARCHAR(50) COMMENT '目标年龄',
    grade_levels JSON COMMENT '适用年级',
    subjects JSON COMMENT '关联学科',
    tags JSON COMMENT '标签',
    metadata JSON COMMENT '元数据',
    author VARCHAR(100) COMMENT '作者',
    source VARCHAR(100) COMMENT '来源',
    license VARCHAR(100) COMMENT '版权',
    status ENUM('draft', 'reviewing', 'published', 'rejected') DEFAULT 'draft' COMMENT '状态',
    is_premium BOOLEAN DEFAULT FALSE COMMENT '是否付费',
    view_count BIGINT DEFAULT 0 COMMENT '浏览数',
    like_count BIGINT DEFAULT 0 COMMENT '点赞数',
    created_by BIGINT COMMENT '创建者',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_type (content_type),
    INDEX idx_language (language),
    INDEX idx_status (status),
    INDEX idx_tags ((CAST(tags AS CHAR(255)))),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='内容表';

-- 内容分类表
CREATE TABLE IF NOT EXISTS content_categories (
    category_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '分类ID',
    parent_id BIGINT COMMENT '父分类ID',
    name VARCHAR(100) NOT NULL COMMENT '分类名称',
    slug VARCHAR(100) UNIQUE COMMENT 'URL别名',
    description TEXT COMMENT '描述',
    icon VARCHAR(100) COMMENT '图标',
    display_order INT DEFAULT 0 COMMENT '排序',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_parent_id (parent_id),
    INDEX idx_slug (slug),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='内容分类表';

-- ============================================================
-- 分析与统计模块
-- ============================================================

-- 使用统计
CREATE TABLE IF NOT EXISTS usage_stats (
    stat_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '统计ID',
    child_id BIGINT NOT NULL COMMENT '儿童ID',
    stat_date DATE NOT NULL COMMENT '统计日期',
    stat_type VARCHAR(50) NOT NULL COMMENT '统计类型',
    stat_value DECIMAL(15,2) NOT NULL COMMENT '统计值',
    metadata JSON COMMENT '元数据',
    INDEX idx_child_id (child_id),
    INDEX idx_date (stat_date),
    INDEX idx_type (stat_type),
    UNIQUE KEY unique_stat (child_id, stat_date, stat_type),
    FOREIGN KEY (child_id) REFERENCES children(child_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='使用统计';

-- 每日统计汇总
CREATE TABLE IF NOT EXISTS daily_summary (
    summary_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '汇总ID',
    child_id BIGINT NOT NULL COMMENT '儿童ID',
    summary_date DATE NOT NULL COMMENT '汇总日期',
    learning_time_minutes INT DEFAULT 0 COMMENT '学习时长(分钟)',
    chat_message_count INT DEFAULT 0 COMMENT '对话数',
    activities_completed INT DEFAULT 0 COMMENT '完成活动数',
    mood_average VARCHAR(50) COMMENT '平均情绪',
    screen_time_minutes INT DEFAULT 0 COMMENT '屏幕使用时间',
    break_count INT DEFAULT 0 COMMENT '休息次数',
    achievements_earned JSON COMMENT '获得成就',
    skills_practiced JSON COMMENT '练习技能',
    summary_text TEXT COMMENT '当日总结',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_child_id (child_id),
    INDEX idx_date (summary_date),
    UNIQUE KEY unique_daily (child_id, summary_date),
    FOREIGN KEY (child_id) REFERENCES children(child_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每日汇总';

-- ============================================================
-- 支付与订单模块
-- ============================================================

-- 订阅套餐表
CREATE TABLE IF NOT EXISTS subscription_plans (
    plan_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '套餐ID',
    plan_name VARCHAR(100) NOT NULL COMMENT '套餐名称',
    plan_code VARCHAR(50) UNIQUE COMMENT '套餐代码',
    description TEXT COMMENT '描述',
    price DECIMAL(10,2) NOT NULL COMMENT '价格',
    currency VARCHAR(10) DEFAULT 'CNY' COMMENT '货币',
    billing_cycle VARCHAR(20) DEFAULT 'monthly' COMMENT '计费周期',
    features JSON COMMENT '包含功能',
    limits JSON COMMENT '限制项',
    is_popular BOOLEAN DEFAULT FALSE COMMENT '是否推荐',
    display_order INT DEFAULT 0 COMMENT '排序',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订阅套餐';

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
    order_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '订单ID',
    order_number VARCHAR(50) UNIQUE NOT NULL COMMENT '订单号',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    plan_id BIGINT COMMENT '套餐ID',
    amount DECIMAL(10,2) NOT NULL COMMENT '金额',
    currency VARCHAR(10) DEFAULT 'CNY' COMMENT '货币',
    status ENUM('pending', 'paid', 'failed', 'refunded', 'cancelled') DEFAULT 'pending' COMMENT '状态',
    payment_method VARCHAR(50) COMMENT '支付方式',
    payment_id VARCHAR(100) COMMENT '支付ID',
    paid_at TIMESTAMP COMMENT '支付时间',
    started_at TIMESTAMP COMMENT '开始时间',
    expires_at TIMESTAMP COMMENT '过期时间',
    metadata JSON COMMENT '元数据',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_user_id (user_id),
    INDEX idx_order_number (order_number),
    INDEX idx_status (status),
    INDEX idx_date (created_at),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(plan_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单表';

-- 用户订阅表
CREATE TABLE IF NOT EXISTS user_subscriptions (
    subscription_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '订阅ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    plan_id BIGINT NOT NULL COMMENT '套餐ID',
    order_id BIGINT COMMENT '订单ID',
    started_at TIMESTAMP NOT NULL COMMENT '开始时间',
    expires_at TIMESTAMP NOT NULL COMMENT '过期时间',
    status ENUM('active', 'expired', 'cancelled', 'paused') DEFAULT 'active' COMMENT '状态',
    auto_renew BOOLEAN DEFAULT FALSE COMMENT '自动续费',
    features JSON COMMENT '当前功能',
    usage JSON COMMENT '使用量',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_expires_at (expires_at),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(plan_id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户订阅';

-- ============================================================
-- 系统配置与日志
-- ============================================================

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
    config_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '配置ID',
    config_key VARCHAR(100) UNIQUE NOT NULL COMMENT '配置键',
    config_value TEXT COMMENT '配置值',
    config_type VARCHAR(20) DEFAULT 'string' COMMENT '配置类型',
    category VARCHAR(50) COMMENT '配置类别',
    description TEXT COMMENT '描述',
    is_public BOOLEAN DEFAULT FALSE COMMENT '是否公开',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_key (config_key),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置';

-- 系统日志表
CREATE TABLE IF NOT EXISTS system_logs (
    log_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '日志ID',
    log_level VARCHAR(20) NOT NULL COMMENT '日志级别',
    log_category VARCHAR(50) NOT NULL COMMENT '日志类别',
    message TEXT NOT NULL COMMENT '日志消息',
    context JSON COMMENT '上下文',
    user_id BIGINT COMMENT '用户ID',
    ip_address VARCHAR(45) COMMENT 'IP地址',
    user_agent TEXT COMMENT 'User Agent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '时间',
    INDEX idx_level (log_level),
    INDEX idx_category (log_category),
    INDEX idx_created_at (created_at),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统日志';

-- ============================================================
-- 审计与安全
-- ============================================================

-- 数据变更审计表
CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '审计ID',
    table_name VARCHAR(100) NOT NULL COMMENT '表名',
    record_id BIGINT NOT NULL COMMENT '记录ID',
    action ENUM('insert', 'update', 'delete') NOT NULL COMMENT '操作类型',
    old_data JSON COMMENT '变更前数据',
    new_data JSON COMMENT '变更后数据',
    changed_by BIGINT COMMENT '变更用户ID',
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '变更时间',
    INDEX idx_table (table_name),
    INDEX idx_record (table_name, record_id),
    INDEX idx_action (action),
    INDEX idx_time (changed_at),
    INDEX idx_user (changed_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审计日志';

-- ============================================================
-- 示例数据
-- ============================================================

-- 插入基础意图数据
INSERT INTO intents (intent_code, intent_name, category, description, priority) VALUES
('greeting', '问候', 'conversation', '打招呼', 10),
('ask_help', '请求帮助', 'conversation', '需要帮助', 9),
('ask_weather', '问天气', 'information', '查询天气', 8),
('ask_time', '问时间', 'information', '查询时间', 8),
('tell_joke', '讲笑话', 'entertainment', '想听笑话', 7),
('tell_story', '讲故事', 'entertainment', '想听故事', 7),
('play_music', '播放音乐', 'media', '想听歌', 7),
('do_math', '做数学', 'learning', '数学学习', 6),
('learn_english', '学英语', 'learning', '英语学习', 6),
('learn_science', '学科学', 'learning', '科学学习', 6),
('feeling_tired', '感到累', 'emotion', '表达疲惫', 5),
('feeling_happy', '感到开心', 'emotion', '表达快乐', 5),
('feeling_sad', '感到难过', 'emotion', '表达悲伤', 5),
('feeling_scared', '感到害怕', 'emotion', '表达恐惧', 5),
('feel_cold', '感觉冷', 'sensory', '冷', 4),
('feel_hot', '感觉热', 'sensory', '热', 4),
('want_eat', '想吃东西', 'needs', '饿了', 4),
('want_drink', '想喝水', 'needs', '渴了', 4),
('want_sleep', '想睡觉', 'needs', '困了', 4),
('want_play', '想玩', 'needs', '想娱乐', 4);

-- 插入常识知识示例
INSERT INTO common_sense_knowledge (category, question, answer, priority) VALUES
('life', '天冷了', '天冷了要多穿衣服，注意保暖哦！', 10),
('life', '下雨了', '下雨了要带伞，小心别淋湿了！', 10),
('life', '饿了', '饿了就吃点东西吧，但是要注意按时吃饭，不要吃太多零食哦！', 9),
('life', '困了', '困了就休息一下，早点睡觉对身体好！', 9),
('health', '生病了', '生病了要告诉爸爸妈妈，需要看医生哦！', 10),
('safety', '陌生人', '不要跟陌生人走，不要吃陌生人的东西！', 10),
('learning', '不想学习', '学习累了就休息一下，但还是要坚持每天学习一点点哦！', 8);

-- 插入成就示例
INSERT INTO achievements (title, description, category, points, rarity) VALUES
('第一次对话', '完成第一次与机器人的对话', 'milestone', 10, 'common'),
('学习小能手', '完成10次学习活动', 'learning', 50, 'common'),
('数学达人', '连续答对10道数学题', 'learning', 100, 'rare'),
('故事收藏家', '听完10个故事', 'entertainment', 50, 'common'),
('开心果', '保持连续7天的好情绪记录', 'social', 150, 'rare'),
('探索者', '解锁全部学习主题', 'exploration', 200, 'epic');
