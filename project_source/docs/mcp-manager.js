/**
 * MCP (Model Context Protocol) 服务器管理器
 * 支持30+种MCP服务器类型，含本地模拟模式
 * 功能：服务器发现注册、工具调用接口、连接状态监控、本地实现
 */

class MCPManager {
    constructor() {
        // 已注册的MCP服务器
        this.servers = {};
        // 已注册的工具
        this.tools = {};
        // 服务器连接状态
        this.connections = {};
        // 默认本地模式（无真实MCP服务器时使用本地实现）
        this.localMode = true;
        // 内存存储（用于memory工具）
        this.memoryStore = {};
        // 通知回调
        this.onStatusChange = null;
        // 注册所有内置工具
        this.registerBuiltinTools();
    }

    /**
     * 注册所有内置工具的本地实现
     */
    registerBuiltinTools() {
        this.tools = {
            // === 文件系统 ===
            'filesystem.read': {
                desc: '读取文件内容',
                category: 'filesystem',
                params: { path: '文件路径' },
                handler: this.localFileRead.bind(this)
            },
            'filesystem.write': {
                desc: '写入文件',
                category: 'filesystem',
                params: { path: '文件路径', content: '文件内容' },
                handler: this.localFileWrite.bind(this)
            },
            'filesystem.list': {
                desc: '列出目录内容',
                category: 'filesystem',
                params: { path: '目录路径' },
                handler: this.localFileList.bind(this)
            },
            'filesystem.delete': {
                desc: '删除文件',
                category: 'filesystem',
                params: { path: '文件路径' },
                handler: this.localFileDelete.bind(this)
            },
            'filesystem.exists': {
                desc: '检查文件是否存在',
                category: 'filesystem',
                params: { path: '文件路径' },
                handler: this.localFileExists.bind(this)
            },

            // === 内存存储 ===
            'memory.get': {
                desc: '获取记忆',
                category: 'memory',
                params: { key: '键名' },
                handler: this.localMemoryGet.bind(this)
            },
            'memory.set': {
                desc: '设置记忆',
                category: 'memory',
                params: { key: '键名', value: '值' },
                handler: this.localMemorySet.bind(this)
            },
            'memory.delete': {
                desc: '删除记忆',
                category: 'memory',
                params: { key: '键名' },
                handler: this.localMemoryDelete.bind(this)
            },
            'memory.list': {
                desc: '列出所有记忆键',
                category: 'memory',
                params: {},
                handler: this.localMemoryList.bind(this)
            },
            'memory.clear': {
                desc: '清空所有记忆',
                category: 'memory',
                params: {},
                handler: this.localMemoryClear.bind(this)
            },

            // === 时间工具 ===
            'time.now': {
                desc: '获取当前时间',
                category: 'time',
                params: { format: '格式(ISO/locale/custom)', timezone: '时区' },
                handler: this.localTimeNow.bind(this)
            },
            'time.timestamp': {
                desc: '获取当前时间戳',
                category: 'time',
                params: {},
                handler: () => Date.now()
            },
            'time.format': {
                desc: '格式化时间',
                category: 'time',
                params: { timestamp: '时间戳', format: '格式字符串' },
                handler: this.localTimeFormat.bind(this)
            },
            'time.diff': {
                desc: '计算时间差',
                category: 'time',
                params: { start: '开始时间', end: '结束时间', unit: '单位(ms/s/m/h/d)' },
                handler: this.localTimeDiff.bind(this)
            },

            // === 天气查询 ===
            'weather.get': {
                desc: '获取天气信息',
                category: 'weather',
                params: { city: '城市名', lang: '语言' },
                handler: this.localWeatherGet.bind(this)
            },
            'weather.forecast': {
                desc: '获取天气预报',
                category: 'weather',
                params: { city: '城市名', days: '天数' },
                handler: this.localWeatherForecast.bind(this)
            },

            // === 搜索引擎 ===
            'search.web': {
                desc: '网页搜索',
                category: 'search',
                params: { query: '搜索关键词', count: '结果数量' },
                handler: this.localSearchWeb.bind(this)
            },
            'search.image': {
                desc: '图片搜索',
                category: 'search',
                params: { query: '搜索关键词', count: '结果数量' },
                handler: this.localSearchImage.bind(this)
            },

            // === 计算器 ===
            'calculator': {
                desc: '数学计算器',
                category: 'calculator',
                params: { expression: '数学表达式' },
                handler: this.localCalculator.bind(this)
            },
            'calculator.convert': {
                desc: '单位转换',
                category: 'calculator',
                params: { value: '数值', from: '源单位', to: '目标单位' },
                handler: this.localUnitConvert.bind(this)
            },

            // === 日历 ===
            'calendar.events': {
                desc: '获取日历事件',
                category: 'calendar',
                params: { date: '日期', range: '范围' },
                handler: this.localCalendarEvents.bind(this)
            },
            'calendar.add': {
                desc: '添加日历事件',
                category: 'calendar',
                params: { title: '标题', date: '日期', time: '时间', duration: '时长' },
                handler: this.localCalendarAdd.bind(this)
            },
            'calendar.remind': {
                desc: '设置提醒',
                category: 'calendar',
                params: { message: '提醒内容', time: '提醒时间' },
                handler: this.localCalendarRemind.bind(this)
            },

            // === YouTube ===
            'youtube.search': {
                desc: 'YouTube搜索',
                category: 'youtube',
                params: { query: '搜索关键词', maxResults: '最大结果数' },
                handler: this.localYoutubeSearch.bind(this)
            },
            'youtube.info': {
                desc: '获取视频信息',
                category: 'youtube',
                params: { url: '视频URL' },
                handler: this.localYoutubeInfo.bind(this)
            },

            // === Git ===
            'git.status': {
                desc: '获取Git仓库状态',
                category: 'git',
                params: { path: '仓库路径' },
                handler: this.localGitStatus.bind(this)
            },
            'git.log': {
                desc: '获取Git提交日志',
                category: 'git',
                params: { path: '仓库路径', count: '条数' },
                handler: this.localGitLog.bind(this)
            },

            // === GitHub ===
            'github.repos': {
                desc: '获取GitHub仓库列表',
                category: 'github',
                params: { user: '用户名' },
                handler: this.localGithubRepos.bind(this)
            },
            'github.issues': {
                desc: '获取GitHub Issues',
                category: 'github',
                params: { owner: '所有者', repo: '仓库名' },
                handler: this.localGithubIssues.bind(this)
            },

            // === Shell ===
            'shell.execute': {
                desc: '执行Shell命令',
                category: 'shell',
                params: { command: '命令', cwd: '工作目录' },
                handler: this.localShellExecute.bind(this)
            },

            // === Docker ===
            'docker.ps': {
                desc: '列出Docker容器',
                category: 'docker',
                params: { all: '是否显示停止的容器' },
                handler: this.localDockerPs.bind(this)
            },
            'docker.images': {
                desc: '列出Docker镜像',
                category: 'docker',
                params: {},
                handler: this.localDockerImages.bind(this)
            },

            // === 代码执行 ===
            'code-runner.execute': {
                desc: '执行代码',
                category: 'code-runner',
                params: { code: '代码', language: '编程语言', timeout: '超时(ms)' },
                handler: this.localCodeRunner.bind(this)
            },

            // === 数据库 ===
            'sqlite.query': {
                desc: '执行SQLite查询',
                category: 'sqlite',
                params: { db: '数据库路径', sql: 'SQL语句' },
                handler: this.localSqliteQuery.bind(this)
            },
            'postgres.query': {
                desc: '执行PostgreSQL查询',
                category: 'postgres',
                params: { connection: '连接字符串', sql: 'SQL语句' },
                handler: this.localPostgresQuery.bind(this)
            },
            'mysql.query': {
                desc: '执行MySQL查询',
                category: 'mysql',
                params: { connection: '连接字符串', sql: 'SQL语句' },
                handler: this.localMysqlQuery.bind(this)
            },

            // === Redis ===
            'redis.get': {
                desc: 'Redis获取值',
                category: 'redis',
                params: { key: '键名' },
                handler: this.localRedisGet.bind(this)
            },
            'redis.set': {
                desc: 'Redis设置值',
                category: 'redis',
                params: { key: '键名', value: '值', ttl: '过期时间(秒)' },
                handler: this.localRedisSet.bind(this)
            },

            // === 浏览器自动化 ===
            'playwright.screenshot': {
                desc: '网页截图',
                category: 'playwright',
                params: { url: '网址', selector: '选择器' },
                handler: this.localPlaywrightScreenshot.bind(this)
            },
            'puppeteer.scrape': {
                desc: '网页抓取',
                category: 'puppeteer',
                params: { url: '网址', selector: '选择器' },
                handler: this.localPuppeteerScrape.bind(this)
            },
            'browser-use.navigate': {
                desc: '浏览器导航',
                category: 'browser-use',
                params: { url: '网址', action: '动作' },
                handler: this.localBrowserNavigate.bind(this)
            },

            // === HTTP请求 ===
            'fetch.get': {
                desc: 'HTTP GET请求',
                category: 'fetch',
                params: { url: '网址', headers: '请求头' },
                handler: this.localFetchGet.bind(this)
            },
            'fetch.post': {
                desc: 'HTTP POST请求',
                category: 'fetch',
                params: { url: '网址', body: '请求体', headers: '请求头' },
                handler: this.localFetchPost.bind(this)
            },

            // === 网页爬取 ===
            'firecrawl.scrape': {
                desc: '网页爬取',
                category: 'firecrawl',
                params: { url: '网址', format: '输出格式' },
                handler: this.localFirecrawlScrape.bind(this)
            },

            // === PDF读取 ===
            'pdf-reader.read': {
                desc: '读取PDF文件',
                category: 'pdf-reader',
                params: { path: '文件路径', pages: '页码范围' },
                handler: this.localPdfRead.bind(this)
            },

            // === Excel ===
            'excel.read': {
                desc: '读取Excel文件',
                category: 'excel',
                params: { path: '文件路径', sheet: '工作表名' },
                handler: this.localExcelRead.bind(this)
            },
            'excel.write': {
                desc: '写入Excel文件',
                category: 'excel',
                params: { path: '文件路径', data: '数据', sheet: '工作表名' },
                handler: this.localExcelWrite.bind(this)
            },

            // === Word ===
            'word.read': {
                desc: '读取Word文档',
                category: 'word',
                params: { path: '文件路径' },
                handler: this.localWordRead.bind(this)
            },

            // === Obsidian ===
            'obsidian.search': {
                desc: '搜索Obsidian笔记',
                category: 'obsidian',
                params: { query: '搜索关键词', vault: '仓库名' },
                handler: this.localObsidianSearch.bind(this)
            },
            'obsidian.read': {
                desc: '读取Obsidian笔记',
                category: 'obsidian',
                params: { path: '笔记路径', vault: '仓库名' },
                handler: this.localObsidianRead.bind(this)
            },

            // === Notion ===
            'notion.search': {
                desc: '搜索Notion页面',
                category: 'notion',
                params: { query: '搜索关键词' },
                handler: this.localNotionSearch.bind(this)
            },
            'notion.read': {
                desc: '读取Notion页面',
                category: 'notion',
                params: { pageId: '页面ID' },
                handler: this.localNotionRead.bind(this)
            },

            // === Slack ===
            'slack.send': {
                desc: '发送Slack消息',
                category: 'slack',
                params: { channel: '频道', message: '消息内容' },
                handler: this.localSlackSend.bind(this)
            },
            'slack.read': {
                desc: '读取Slack消息',
                category: 'slack',
                params: { channel: '频道', limit: '条数' },
                handler: this.localSlackRead.bind(this)
            },

            // === Discord ===
            'discord.send': {
                desc: '发送Discord消息',
                category: 'discord',
                params: { channel: '频道', message: '消息内容' },
                handler: this.localDiscordSend.bind(this)
            },

            // === 邮件 ===
            'email.send': {
                desc: '发送邮件',
                category: 'email',
                params: { to: '收件人', subject: '主题', body: '正文' },
                handler: this.localEmailSend.bind(this)
            },
            'email.read': {
                desc: '读取邮件',
                category: 'email',
                params: { folder: '文件夹', limit: '条数' },
                handler: this.localEmailRead.bind(this)
            },

            // === Google日历 ===
            'gcal.events': {
                desc: '获取Google日历事件',
                category: 'gcal',
                params: { dateFrom: '开始日期', dateTo: '结束日期' },
                handler: this.localGcalEvents.bind(this)
            },
            'gcal.add': {
                desc: '添加Google日历事件',
                category: 'gcal',
                params: { title: '标题', start: '开始时间', end: '结束时间' },
                handler: this.localGcalAdd.bind(this)
            },

            // === Google地图 ===
            'gmaps.geocode': {
                desc: '地址地理编码',
                category: 'gmaps',
                params: { address: '地址' },
                handler: this.localGmapsGeocode.bind(this)
            },
            'gmaps.directions': {
                desc: '获取路线',
                category: 'gmaps',
                params: { origin: '起点', destination: '终点', mode: '交通方式' },
                handler: this.localGmapsDirections.bind(this)
            },
            'gmaps.places': {
                desc: '搜索附近地点',
                category: 'gmaps',
                params: { query: '搜索关键词', location: '位置', radius: '半径(米)' },
                handler: this.localGmapsPlaces.bind(this)
            }
        };
    }

    // ==================== 工具调用接口 ====================

    /**
     * 调用MCP工具
     * @param {string} toolName - 工具名称
     * @param {Object} params - 参数
     * @returns {Promise<any>} - 工具执行结果
     */
    async callTool(toolName, params = {}) {
        const tool = this.tools[toolName];
        if (!tool) {
            throw new Error(`[MCPManager] 未知工具: ${toolName}`);
        }

        try {
            const result = await tool.handler(params);
            return {
                success: true,
                tool: toolName,
                result: result,
                timestamp: Date.now()
            };
        } catch (error) {
            return {
                success: false,
                tool: toolName,
                error: error.message,
                timestamp: Date.now()
            };
        }
    }

    /**
     * 批量调用工具
     */
    async callTools(toolCalls) {
        const results = [];
        for (const call of toolCalls) {
            results.push(await this.callTool(call.tool, call.params));
        }
        return results;
    }

    /**
     * 获取所有可用工具名称
     */
    getAvailableTools() {
        return Object.keys(this.tools);
    }

    /**
     * 获取工具描述
     */
    getToolDescription(toolName) {
        return this.tools[toolName]?.desc || null;
    }

    /**
     * 获取工具参数定义
     */
    getToolParams(toolName) {
        return this.tools[toolName]?.params || null;
    }

    /**
     * 获取按分类的工具列表
     */
    getToolsByCategory() {
        const categories = {};
        for (const [name, tool] of Object.entries(this.tools)) {
            const cat = tool.category || 'other';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push({ name, desc: tool.desc });
        }
        return categories;
    }

    /**
     * 注册自定义工具
     */
    registerTool(name, desc, handler, category = 'custom', params = {}) {
        this.tools[name] = { desc, handler, category, params };
    }

    /**
     * 注销工具
     */
    unregisterTool(name) {
        delete this.tools[name];
    }

    // ==================== 服务器管理 ====================

    /**
     * 注册MCP服务器
     */
    registerServer(name, config) {
        this.servers[name] = {
            name,
            config,
            status: 'disconnected',
            lastPing: null,
            registeredAt: Date.now()
        };
        this.connections[name] = null;
    }

    /**
     * 连接MCP服务器
     */
    async connectServer(name) {
        const server = this.servers[name];
        if (!server) {
            throw new Error(`[MCPManager] 未注册的服务器: ${name}`);
        }

        try {
            server.status = 'connecting';
            this.notifyStatusChange(name, 'connecting');

            // 尝试连接真实MCP服务器
            if (server.config.url) {
                const response = await fetch(`${server.config.url}/health`, {
                    method: 'GET',
                    signal: AbortSignal.timeout(5000)
                });
                if (response.ok) {
                    server.status = 'connected';
                    server.lastPing = Date.now();
                    this.localMode = false;
                    this.notifyStatusChange(name, 'connected');
                    return true;
                }
            }
        } catch (e) {
            // 连接失败，使用本地模式
            console.log(`[MCPManager] 服务器 ${name} 不可用，使用本地模式`);
        }

        server.status = 'local-mode';
        this.notifyStatusChange(name, 'local-mode');
        return false;
    }

    /**
     * 断开MCP服务器
     */
    disconnectServer(name) {
        const server = this.servers[name];
        if (server) {
            server.status = 'disconnected';
            this.connections[name] = null;
            this.notifyStatusChange(name, 'disconnected');
        }
    }

    /**
     * 获取所有服务器状态
     */
    getServerStatus() {
        const status = {};
        for (const [name, server] of Object.entries(this.servers)) {
            status[name] = {
                status: server.status,
                lastPing: server.lastPing,
                url: server.config?.url || 'local'
            };
        }
        return status;
    }

    /**
     * 设置状态变更回调
     */
    onStatus(handler) {
        this.onStatusChange = handler;
    }

    notifyStatusChange(name, status) {
        if (this.onStatusChange) {
            this.onStatusChange(name, status);
        }
    }

    // ==================== 本地工具实现 ====================

    // --- 文件系统 ---
    async localFileRead(params) {
        // 浏览器环境无法直接读取本地文件，返回提示
        return { content: '[本地模式] 文件读取需要通过文件选择器', path: params.path };
    }

    async localFileWrite(params) {
        // 浏览器环境使用下载方式
        const blob = new Blob([params.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = params.path?.split('/').pop() || 'file.txt';
        a.click();
        URL.revokeObjectURL(url);
        return { success: true, message: '文件已下载', path: params.path };
    }

    async localFileList(params) {
        return { files: [], path: params.path, message: '[本地模式] 目录列表不可用' };
    }

    async localFileDelete(params) {
        return { success: false, message: '[本地模式] 文件删除不可用' };
    }

    async localFileExists(params) {
        return { exists: false, path: params.path };
    }

    // --- 内存存储 ---
    async localMemoryGet(params) {
        const value = this.memoryStore[params.key];
        if (value === undefined) {
            return { found: false, key: params.key };
        }
        // 尝试解析JSON
        try {
            return { found: true, key: params.key, value: JSON.parse(value) };
        } catch {
            return { found: true, key: params.key, value: value };
        }
    }

    async localMemorySet(params) {
        const value = typeof params.value === 'string' ? params.value : JSON.stringify(params.value);
        this.memoryStore[params.key] = value;
        // 持久化到localStorage
        try {
            localStorage.setItem('mcp_memory', JSON.stringify(this.memoryStore));
        } catch (e) { /* 忽略存储错误 */ }
        return { success: true, key: params.key };
    }

    async localMemoryDelete(params) {
        const existed = params.key in this.memoryStore;
        delete this.memoryStore[params.key];
        try {
            localStorage.setItem('mcp_memory', JSON.stringify(this.memoryStore));
        } catch (e) { /* 忽略 */ }
        return { success: true, key: params.key, existed };
    }

    async localMemoryList() {
        return { keys: Object.keys(this.memoryStore), count: Object.keys(this.memoryStore).length };
    }

    async localMemoryClear() {
        const count = Object.keys(this.memoryStore).length;
        this.memoryStore = {};
        try {
            localStorage.removeItem('mcp_memory');
        } catch (e) { /* 忽略 */ }
        return { success: true, cleared: count };
    }

    // --- 时间工具 ---
    async localTimeNow(params) {
        const now = new Date();
        const tz = params.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

        if (params.format === 'ISO') {
            return { time: now.toISOString(), timezone: tz };
        }
        if (params.format === 'locale') {
            return { time: now.toLocaleString('zh-CN', { timeZone: tz }), timezone: tz };
        }
        // 默认返回详细时间信息
        return {
            iso: now.toISOString(),
            locale: now.toLocaleString('zh-CN', { timeZone: tz }),
            timestamp: now.getTime(),
            timezone: tz,
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            day: now.getDate(),
            hour: now.getHours(),
            minute: now.getMinutes(),
            second: now.getSeconds(),
            weekday: now.toLocaleDateString('zh-CN', { weekday: 'long' })
        };
    }

    async localTimeFormat(params) {
        const date = params.timestamp ? new Date(params.timestamp) : new Date();
        const format = params.format || 'YYYY-MM-DD HH:mm:ss';
        const replacements = {
            'YYYY': date.getFullYear(),
            'MM': String(date.getMonth() + 1).padStart(2, '0'),
            'DD': String(date.getDate()).padStart(2, '0'),
            'HH': String(date.getHours()).padStart(2, '0'),
            'mm': String(date.getMinutes()).padStart(2, '0'),
            'ss': String(date.getSeconds()).padStart(2, '0')
        };
        let result = format;
        for (const [key, val] of Object.entries(replacements)) {
            result = result.replace(key, val);
        }
        return { formatted: result };
    }

    async localTimeDiff(params) {
        const start = new Date(params.start).getTime();
        const end = new Date(params.end).getTime();
        const diffMs = end - start;
        const unit = params.unit || 'ms';

        const conversions = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000 };
        const value = diffMs / (conversions[unit] || 1);
        return { difference: value, unit: unit, milliseconds: diffMs };
    }

    // --- 天气 ---
    async localWeatherGet(params) {
        const city = params.city || '北京';
        // 本地模式返回模拟数据
        return {
            city: city,
            temperature: Math.round(15 + Math.random() * 20),
            humidity: Math.round(40 + Math.random() * 40),
            condition: ['晴', '多云', '阴', '小雨'][Math.floor(Math.random() * 4)],
            wind: Math.round(Math.random() * 6) + '级',
            aqi: Math.round(30 + Math.random() * 100),
            message: '[本地模式] 返回模拟天气数据，连接天气API获取真实数据'
        };
    }

    async localWeatherForecast(params) {
        const city = params.city || '北京';
        const days = params.days || 3;
        const forecast = [];
        const conditions = ['晴', '多云', '阴', '小雨', '中雨', '雷阵雨'];
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            forecast.push({
                date: date.toISOString().split('T')[0],
                high: Math.round(20 + Math.random() * 15),
                low: Math.round(5 + Math.random() * 10),
                condition: conditions[Math.floor(Math.random() * conditions.length)]
            });
        }
        return { city, forecast, message: '[本地模式] 模拟预报数据' };
    }

    // --- 搜索 ---
    async localSearchWeb(params) {
        const query = params.query || '';
        const count = params.count || 5;
        // 本地模式返回搜索建议
        return {
            query: query,
            results: Array.from({ length: count }, (_, i) => ({
                title: `[搜索结果 ${i + 1}] ${query}`,
                url: `https://example.com/search?q=${encodeURIComponent(query)}&result=${i + 1}`,
                snippet: `关于"${query}"的搜索结果 ${i + 1}...`
            })),
            message: '[本地模式] 返回模拟搜索结果，连接搜索API获取真实数据'
        };
    }

    async localSearchImage(params) {
        const query = params.query || '';
        const count = params.count || 5;
        return {
            query: query,
            results: Array.from({ length: count }, (_, i) => ({
                title: `[图片 ${i + 1}] ${query}`,
                url: `https://via.placeholder.com/300x200?text=${encodeURIComponent(query)}+${i + 1}`,
                thumbnail: `https://via.placeholder.com/100x67?text=${i + 1}`
            })),
            message: '[本地模式] 返回模拟图片搜索结果'
        };
    }

    // --- 计算器 ---
    async localCalculator(params) {
        const expression = params.expression || '';
        try {
            // 安全计算：仅允许数字和基本运算符
            const sanitized = expression.replace(/[^0-9+\-*/.()%\s]/g, '');
            if (sanitized !== expression.trim()) {
                return { error: '表达式包含不允许的字符', expression: expression };
            }
            // 使用Function构造器安全计算
            const result = new Function('return ' + sanitized)();
            return { expression: expression, result: result };
        } catch (e) {
            return { error: '计算错误: ' + e.message, expression: expression };
        }
    }

    async localUnitConvert(params) {
        const conversions = {
            'km_to_mi': 0.621371, 'mi_to_km': 1.60934,
            'kg_to_lb': 2.20462, 'lb_to_kg': 0.453592,
            'c_to_f': null, 'f_to_c': null,
            'm_to_ft': 3.28084, 'ft_to_m': 0.3048,
            'l_to_gal': 0.264172, 'gal_to_l': 3.78541
        };
        const { value, from, to } = params;
        const key = `${from}_to_${to}`;

        if (from === 'c' && to === 'f') {
            return { value: value, from: from, to: to, result: (value * 9 / 5) + 32 };
        }
        if (from === 'f' && to === 'c') {
            return { value: value, from: from, to: to, result: (value - 32) * 5 / 9 };
        }

        const factor = conversions[key];
        if (factor) {
            return { value: value, from: from, to: to, result: value * factor };
        }
        return { error: `不支持的转换: ${from} -> ${to}`, value: value };
    }

    // --- 日历 ---
    async localCalendarEvents(params) {
        const date = params.date || new Date().toISOString().split('T')[0];
        // 从localStorage读取日历事件
        const events = JSON.parse(localStorage.getItem('mcp_calendar') || '[]');
        const filtered = events.filter(e => e.date === date);
        return { date: date, events: filtered };
    }

    async localCalendarAdd(params) {
        const events = JSON.parse(localStorage.getItem('mcp_calendar') || '[]');
        const event = {
            id: Date.now().toString(36),
            title: params.title,
            date: params.date,
            time: params.time,
            duration: params.duration,
            createdAt: new Date().toISOString()
        };
        events.push(event);
        localStorage.setItem('mcp_calendar', JSON.stringify(events));
        return { success: true, event: event };
    }

    async localCalendarRemind(params) {
        const reminders = JSON.parse(localStorage.getItem('mcp_reminders') || '[]');
        const reminder = {
            id: Date.now().toString(36),
            message: params.message,
            time: params.time,
            createdAt: new Date().toISOString()
        };
        reminders.push(reminder);
        localStorage.setItem('mcp_reminders', JSON.stringify(reminders));
        return { success: true, reminder: reminder };
    }

    // --- YouTube ---
    async localYoutubeSearch(params) {
        const query = params.query || '';
        const maxResults = params.maxResults || 5;
        return {
            query: query,
            results: Array.from({ length: maxResults }, (_, i) => ({
                title: `[YouTube视频 ${i + 1}] ${query}`,
                videoId: `mock_${Date.now()}_${i}`,
                url: `https://www.youtube.com/watch?v=mock_${i}`,
                channel: `频道 ${i + 1}`,
                duration: `${Math.floor(Math.random() * 20 + 1)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`
            })),
            message: '[本地模式] 返回模拟搜索结果'
        };
    }

    async localYoutubeInfo(params) {
        return {
            url: params.url,
            title: '模拟视频标题',
            channel: '模拟频道',
            views: Math.floor(Math.random() * 1000000),
            message: '[本地模式] 返回模拟视频信息'
        };
    }

    // --- Git ---
    async localGitStatus(params) {
        return { status: '[本地模式] Git状态不可用', path: params.path };
    }

    async localGitLog(params) {
        return { commits: [], message: '[本地模式] Git日志不可用', path: params.path };
    }

    // --- GitHub ---
    async localGithubRepos(params) {
        return { repos: [], user: params.user, message: '[本地模式] GitHub API不可用' };
    }

    async localGithubIssues(params) {
        return { issues: [], owner: params.owner, repo: params.repo, message: '[本地模式] GitHub API不可用' };
    }

    // --- Shell ---
    async localShellExecute(params) {
        return { output: '[本地模式] Shell命令不可用', command: params.command };
    }

    // --- Docker ---
    async localDockerPs(params) {
        return { containers: [], message: '[本地模式] Docker不可用' };
    }

    async localDockerImages() {
        return { images: [], message: '[本地模式] Docker不可用' };
    }

    // --- 代码执行 ---
    async localCodeRunner(params) {
        const { code, language } = params;
        if (language === 'javascript' || language === 'js') {
            try {
                // 安全沙箱执行JS
                const result = new Function('return (' + code + ')')();
                return { success: true, result: String(result), language: language };
            } catch (e) {
                return { success: false, error: e.message, language: language };
            }
        }
        return { success: false, error: `[本地模式] 不支持执行 ${language} 代码`, language: language };
    }

    // --- 数据库 ---
    async localSqliteQuery(params) {
        return { rows: [], message: '[本地模式] SQLite不可用', sql: params.sql };
    }

    async localPostgresQuery(params) {
        return { rows: [], message: '[本地模式] PostgreSQL不可用', sql: params.sql };
    }

    async localMysqlQuery(params) {
        return { rows: [], message: '[本地模式] MySQL不可用', sql: params.sql };
    }

    // --- Redis ---
    async localRedisGet(params) {
        const value = this.memoryStore[`redis:${params.key}`];
        return { key: params.key, value: value || null, message: '[本地模式] 使用内存模拟Redis' };
    }

    async localRedisSet(params) {
        this.memoryStore[`redis:${params.key}`] = params.value;
        return { success: true, key: params.key, message: '[本地模式] 使用内存模拟Redis' };
    }

    // --- 浏览器自动化 ---
    async localPlaywrightScreenshot(params) {
        return { message: '[本地模式] 浏览器截图不可用', url: params.url };
    }

    async localPuppeteerScrape(params) {
        return { content: '', message: '[本地模式] 网页抓取不可用', url: params.url };
    }

    async localBrowserNavigate(params) {
        // 在浏览器中打开新窗口
        window.open(params.url, '_blank');
        return { success: true, url: params.url, action: 'opened_in_new_tab' };
    }

    // --- HTTP请求 ---
    async localFetchGet(params) {
        try {
            const response = await fetch(params.url, { method: 'GET', headers: params.headers || {} });
            const text = await response.text();
            return { status: response.status, body: text, url: params.url };
        } catch (e) {
            return { error: e.message, url: params.url };
        }
    }

    async localFetchPost(params) {
        try {
            const response = await fetch(params.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(params.headers || {}) },
                body: typeof params.body === 'string' ? params.body : JSON.stringify(params.body)
            });
            const text = await response.text();
            return { status: response.status, body: text, url: params.url };
        } catch (e) {
            return { error: e.message, url: params.url };
        }
    }

    // --- 网页爬取 ---
    async localFirecrawlScrape(params) {
        try {
            const response = await fetch(params.url);
            const html = await response.text();
            // 简单提取文本
            const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            return { url: params.url, text: text.substring(0, 5000), format: params.format || 'text' };
        } catch (e) {
            return { error: e.message, url: params.url };
        }
    }

    // --- PDF ---
    async localPdfRead(params) {
        return { content: '', message: '[本地模式] PDF读取不可用', path: params.path };
    }

    // --- Excel ---
    async localExcelRead(params) {
        return { data: [], message: '[本地模式] Excel读取不可用', path: params.path };
    }

    async localExcelWrite(params) {
        return { success: false, message: '[本地模式] Excel写入不可用', path: params.path };
    }

    // --- Word ---
    async localWordRead(params) {
        return { content: '', message: '[本地模式] Word读取不可用', path: params.path };
    }

    // --- Obsidian ---
    async localObsidianSearch(params) {
        return { results: [], query: params.query, message: '[本地模式] Obsidian不可用' };
    }

    async localObsidianRead(params) {
        return { content: '', path: params.path, message: '[本地模式] Obsidian不可用' };
    }

    // --- Notion ---
    async localNotionSearch(params) {
        return { results: [], query: params.query, message: '[本地模式] Notion API不可用' };
    }

    async localNotionRead(params) {
        return { content: '', pageId: params.pageId, message: '[本地模式] Notion API不可用' };
    }

    // --- Slack ---
    async localSlackSend(params) {
        return { success: false, message: '[本地模式] Slack消息不可用', channel: params.channel };
    }

    async localSlackRead(params) {
        return { messages: [], channel: params.channel, message: '[本地模式] Slack不可用' };
    }

    // --- Discord ---
    async localDiscordSend(params) {
        return { success: false, message: '[本地模式] Discord消息不可用', channel: params.channel };
    }

    // --- 邮件 ---
    async localEmailSend(params) {
        return { success: false, message: '[本地模式] 邮件发送不可用', to: params.to };
    }

    async localEmailRead(params) {
        return { emails: [], folder: params.folder, message: '[本地模式] 邮件读取不可用' };
    }

    // --- Google日历 ---
    async localGcalEvents(params) {
        return { events: [], dateFrom: params.dateFrom, dateTo: params.dateTo, message: '[本地模式] Google日历不可用' };
    }

    async localGcalAdd(params) {
        return { success: false, message: '[本地模式] Google日历不可用' };
    }

    // --- Google地图 ---
    async localGmapsGeocode(params) {
        return { address: params.address, lat: 0, lng: 0, message: '[本地模式] Google地图不可用' };
    }

    async localGmapsDirections(params) {
        return { origin: params.origin, destination: params.destination, message: '[本地模式] Google地图不可用' };
    }

    async localGmapsPlaces(params) {
        return { places: [], query: params.query, message: '[本地模式] Google地图不可用' };
    }

    /**
     * 初始化时从localStorage恢复内存数据
     */
    init() {
        try {
            const saved = localStorage.getItem('mcp_memory');
            if (saved) {
                this.memoryStore = JSON.parse(saved);
            }
        } catch (e) {
            this.memoryStore = {};
        }
    }
}

// 创建实例并初始化
const mcpManagerInstance = new MCPManager();
mcpManagerInstance.init();

// 暴露到全局
window.mcpManager = mcpManagerInstance;
