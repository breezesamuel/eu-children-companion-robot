/**
 * 全局状态管理器 - 500+全局变量和看门狗机制
 * 包含25个分类的状态变量、观察者模式、看门狗健康监控、熔断器
 */

class GlobalState {
    constructor() {
        // 状态存储
        this.state = {};
        // 观察者 { key: [callback, ...] }
        this.watchers = {};
        // 看门狗配置
        this.watchdog = {
            enabled: true,
            cpuThreshold: 90,          // CPU占用告警阈值（百分比）
            memThreshold: 512,         // 内存告警阈值（MB）
            responseTimeThreshold: 5000, // 响应时间阈值（ms）
            checkInterval: 10000,      // 检查间隔（ms）
            triggerCount: 0,           // 触发次数
            maxTriggers: 3,            // 最大触发次数后执行自动恢复
            lastCheckTime: 0,
            alertHistory: []
        };
        // 熔断器
        this.circuitBreaker = {
            state: 'closed',           // closed=正常, open=熔断, half-open=半开
            failures: 0,
            threshold: 5,
            timeout: 60000,
            lastFailure: 0,
            openTime: 0
        };
        // 心跳
        this.heartbeat = {
            lastBeat: Date.now(),
            interval: 5000,
            missedBeats: 0,
            maxMissedBeats: 3
        };
        // 性能指标
        this.metrics = {
            operationCount: 0,
            errorCount: 0,
            avgResponseTime: 0,
            responseTimes: [],
            startTime: Date.now()
        };
        // 告警回调
        this.onAlert = null;
        // 看门狗定时器
        this.watchdogTimer = null;
        // 心跳定时器
        this.heartbeatTimer = null;

        // 初始化500+变量
        this.initDefaults();
        // 启动看门狗
        this.startWatchdog();
        // 启动心跳
        this.startHeartbeat();
    }

    /**
     * 初始化500+变量默认值
     */
    initDefaults() {
        this.state = {
            // ==================== 1. LLM相关 (50个) ====================
            'llm.currentProvider': 'deepseek',
            'llm.currentModel': 'deepseek-chat',
            'llm.temperature': 0.7,
            'llm.maxTokens': 2048,
            'llm.topP': 1.0,
            'llm.frequencyPenalty': 0,
            'llm.presencePenalty': 0,
            'llm.streamEnabled': true,
            'llm.cacheEnabled': true,
            'llm.cacheMaxSize': 200,
            'llm.requestTimeout': 30000,
            'llm.retryCount': 3,
            'llm.retryDelay': 1000,
            'llm.deepseek.apiKey': '',
            'llm.deepseek.baseUrl': 'https://api.deepseek.com',
            'llm.deepseek.model': 'deepseek-chat',
            'llm.deepseek.enabled': true,
            'llm.deepseek.priority': 1,
            'llm.deepseek.status': 'available',
            'llm.zhipu.apiKey': '',
            'llm.zhipu.baseUrl': 'https://open.bigmodel.cn/api/paas',
            'llm.zhipu.model': 'glm-4',
            'llm.zhipu.enabled': true,
            'llm.zhipu.priority': 2,
            'llm.zhipu.status': 'available',
            'llm.nvidia.apiKey': '',
            'llm.nvidia.baseUrl': 'https://integrate.api.nvidia.com',
            'llm.nvidia.model': 'meta/llama-3.1-8b-instruct',
            'llm.nvidia.enabled': true,
            'llm.nvidia.priority': 3,
            'llm.nvidia.status': 'available',
            'llm.alibaba.apiKey': '',
            'llm.alibaba.baseUrl': 'https://dashscope.aliyuncs.com/compatible-mode',
            'llm.alibaba.model': 'qwen-turbo',
            'llm.alibaba.enabled': true,
            'llm.alibaba.priority': 4,
            'llm.alibaba.status': 'available',
            'llm.ollama.baseUrl': 'http://localhost:11434',
            'llm.ollama.model': 'llama3.2',
            'llm.ollama.enabled': true,
            'llm.ollama.priority': 5,
            'llm.ollama.status': 'available',
            'llm.localai.baseUrl': 'http://localhost:8080',
            'llm.localai.model': 'gpt-3.5-turbo',
            'llm.localai.enabled': true,
            'llm.localai.priority': 6,
            'llm.localai.status': 'available',
            'llm.vllm.baseUrl': 'http://localhost:8000',
            'llm.vllm.model': 'default',
            'llm.vllm.enabled': true,
            'llm.vllm.priority': 7,
            'llm.vllm.status': 'available',
            'llm.lastRequestTime': 0,
            'llm.lastResponseTime': 0,
            'llm.totalRequests': 0,
            'llm.totalTokens': 0,

            // ==================== 2. 语音相关 (40个) ====================
            'voice.ttsEngine': 'browser',
            'voice.ttsRate': 1.0,
            'voice.ttsPitch': 1.0,
            'voice.ttsVolume': 0.8,
            'voice.ttsVoice': '',
            'voice.ttsLanguage': 'zh-CN',
            'voice.ttsEnabled': true,
            'voice.ttsAutoRead': false,
            'voice.sttEngine': 'browser',
            'voice.sttLanguage': 'zh-CN',
            'voice.sttContinuous': false,
            'voice.sttInterimResults': true,
            'voice.sttEnabled': true,
            'voice.sttListening': false,
            'voice.sttConfidence': 0,
            'voice.sttLastResult': '',
            'voice.noiseSuppression': true,
            'voice.echoCancellation': true,
            'voice.autoGainControl': true,
            'voice.sampleRate': 44100,
            'voice.channelCount': 1,
            'voice.bitDepth': 16,
            'voice.bufferSize': 4096,
            'voice.inputDevice': 'default',
            'voice.outputDevice': 'default',
            'voice.inputVolume': 1.0,
            'voice.outputVolume': 0.8,
            'voice.muted': false,
            'voice.deafened': false,
            'voice.wakeWord': '小助手',
            'voice.wakeWordEnabled': false,
            'voice.wakeWordSensitivity': 0.5,
            'voice.vadEnabled': true,
            'voice.vadThreshold': 0.01,
            'voice.vadSilenceDuration': 1000,
            'voice.vadSpeechDuration': 300,
            'voice.recording': false,
            'voice.recordingDuration': 0,
            'voice.lastSpokenText': '',
            'voice.speechRate': 0,

            // ==================== 3. 视频相关 (30个) ====================
            'video.cameraActive': false,
            'video.cameraDevice': 'default',
            'video.resolution': '1280x720',
            'video.frameRate': 30,
            'video.recording': false,
            'video.recordingFormat': 'webm',
            'video.recordingQuality': 0.8,
            'video.recordingDuration': 0,
            'video.recordingSize': 0,
            'video.mirrorMode': true,
            'video.brightness': 50,
            'video.contrast': 50,
            'video.saturation': 50,
            'video.faceDetection': false,
            'video.faceCount': 0,
            'video.faceLandmarks': false,
            'video.objectDetection': false,
            'video.objectCount': 0,
            'video.motionDetection': false,
            'video.motionSensitivity': 0.5,
            'video.backgroundBlur': false,
            'video.backgroundBlurLevel': 5,
            'video.virtualBackground': '',
            'video.snapshotFormat': 'png',
            'video.snapshotQuality': 0.9,
            'video.streaming': false,
            'video.streamBitrate': 2500,
            'video.codec': 'vp8',
            'video.pipEnabled': false,
            'video.screenSharing': false,

            // ==================== 4. MCP相关 (40个) ====================
            'mcp.localMode': true,
            'mcp.serverCount': 0,
            'mcp.toolCount': 0,
            'mcp.lastToolCall': '',
            'mcp.lastToolResult': '',
            'mcp.toolCallCount': 0,
            'mcp.toolErrorCount': 0,
            'mcp.filesystem.connected': false,
            'mcp.filesystem.status': 'disconnected',
            'mcp.git.connected': false,
            'mcp.git.status': 'disconnected',
            'mcp.github.connected': false,
            'mcp.github.status': 'disconnected',
            'mcp.shell.connected': false,
            'mcp.shell.status': 'disconnected',
            'mcp.docker.connected': false,
            'mcp.docker.status': 'disconnected',
            'mcp.codeRunner.connected': false,
            'mcp.codeRunner.status': 'disconnected',
            'mcp.sqlite.connected': false,
            'mcp.sqlite.status': 'disconnected',
            'mcp.postgres.connected': false,
            'mcp.postgres.status': 'disconnected',
            'mcp.mysql.connected': false,
            'mcp.mysql.status': 'disconnected',
            'mcp.redis.connected': false,
            'mcp.redis.status': 'disconnected',
            'mcp.memory.keyCount': 0,
            'mcp.memory.totalSize': 0,
            'mcp.playwright.connected': false,
            'mcp.playwright.status': 'disconnected',
            'mcp.puppeteer.connected': false,
            'mcp.puppeteer.status': 'disconnected',
            'mcp.browserUse.connected': false,
            'mcp.browserUse.status': 'disconnected',
            'mcp.fetch.connected': true,
            'mcp.fetch.status': 'available',
            'mcp.firecrawl.connected': false,
            'mcp.firecrawl.status': 'disconnected',
            'mcp.pdfReader.connected': false,
            'mcp.pdfReader.status': 'disconnected',
            'mcp.excel.connected': false,
            'mcp.excel.status': 'disconnected',

            // ==================== 5. CLI相关 (20个) ====================
            'cli.enabled': true,
            'cli.commandHistory': [],
            'cli.historyIndex': -1,
            'cli.maxHistory': 100,
            'cli.currentDirectory': '/',
            'cli.prompt': '$',
            'cli.shellType': 'bash',
            'cli.autoComplete': true,
            'cli.syntaxHighlight': true,
            'cli.fontSize': 14,
            'cli.fontFamily': 'monospace',
            'cli.theme': 'dark',
            'cli.scrollback': 1000,
            'cli.cursorBlink': true,
            'cli.cursorStyle': 'block',
            'cli.tabSize': 4,
            'cli.wordSeparators': ' ()[]{}\'"',
            'cli.lastCommand': '',
            'cli.lastExitCode': 0,
            'cli.running': false,

            // ==================== 6. SCADA相关 (40个) ====================
            'scada.enabled': false,
            'scada.pollingInterval': 1000,
            'scada.deviceCount': 0,
            'scada.sensorCount': 0,
            'scada.alertCount': 0,
            'scada.temperature.indoor': 22.5,
            'scada.temperature.outdoor': 18.0,
            'scada.temperature.target': 23.0,
            'scada.humidity.indoor': 45,
            'scada.humidity.outdoor': 60,
            'scada.humidity.target': 50,
            'scada.pressure': 1013.25,
            'scada.co2': 400,
            'scada.pm25': 35,
            'scada.pm10': 50,
            'scada.noise': 40,
            'scada.light': 500,
            'scada.light.target': 600,
            'scada.voltage': 220,
            'scada.current': 5.2,
            'scada.power': 1144,
            'scada.powerFactor': 0.95,
            'scada.frequency': 50,
            'scada.waterLevel': 75,
            'scada.waterFlow': 12.5,
            'scada.waterPressure': 3.2,
            'scada.gasLevel': 0,
            'scada.gasAlarm': false,
            'scada.smokeLevel': 0,
            'scada.smokeAlarm': false,
            'scada.doorOpen': false,
            'scada.windowOpen': false,
            'scada.motionDetected': false,
            'scada.batteryLevel': 100,
            'scada.batteryCharging': true,
            'scada.solarPower': 0,
            'scada.upsStatus': 'online',
            'scada.lastPollTime': 0,
            'scada.connectionStatus': 'connected',
            'scada.dataLogging': true,

            // ==================== 7. 导航相关 (30个) ====================
            'nav.enabled': false,
            'nav.currentLat': 0,
            'nav.currentLng': 0,
            'nav.currentAlt': 0,
            'nav.currentSpeed': 0,
            'nav.currentHeading': 0,
            'nav.destinationLat': 0,
            'nav.destinationLng': 0,
            'nav.destinationName': '',
            'nav.routeDistance': 0,
            'nav.routeDuration': 0,
            'nav.routeSteps': [],
            'nav.routeMode': 'driving',
            'nav.avoidTolls': false,
            'nav.avoidHighways': false,
            'nav.avoidFerries': false,
            'nav.gpsAccuracy': 0,
            'nav.gpsStatus': 'unavailable',
            'nav.compassHeading': 0,
            'nav.mapZoom': 15,
            'nav.mapCenterLat': 39.9042,
            'nav.mapCenterLng': 116.4074,
            'nav.mapStyle': 'standard',
            'nav.trackingEnabled': false,
            'nav.trackPoints': [],
            'nav.geofenceEnabled': false,
            'nav.geofenceRadius': 100,
            'nav.geofenceCenterLat': 0,
            'nav.geofenceCenterLng': 0,
            'nav.eta': '',
            'nav.lastUpdate': 0,

            // ==================== 8. 家居控制 (40个) ====================
            'home.livingLight': false,
            'home.livingLightBrightness': 80,
            'home.livingLightColor': '#ffffff',
            'home.livingLightTemp': 4000,
            'home.bedroomLight': false,
            'home.bedroomLightBrightness': 60,
            'home.bedroomLightColor': '#ffcc80',
            'home.kitchenLight': false,
            'home.kitchenLightBrightness': 100,
            'home.bathroomLight': false,
            'home.bathroomLightBrightness': 70,
            'home.hallwayLight': false,
            'home.hallwayLightBrightness': 50,
            'home.acPower': false,
            'home.acMode': 'auto',
            'home.acTemperature': 24,
            'home.acFanSpeed': 'auto',
            'home.acSwing': true,
            'home.heaterPower': false,
            'home.heaterTemperature': 20,
            'home.humidifierPower': false,
            'home.humidifierTarget': 50,
            'home.purifierPower': false,
            'home.purifierMode': 'auto',
            'home.purifierSpeed': 'medium',
            'home.frontDoorLocked': true,
            'home.backDoorLocked': true,
            'home.garageDoorOpen': false,
            'home.livingCurtain': 100,
            'home.bedroomCurtain': 100,
            'home.blindPosition': 50,
            'home.tvPower': false,
            'home.tvChannel': 1,
            'home.tvVolume': 30,
            'home.speakerPower': false,
            'home.speakerVolume': 50,
            'home.speakerSource': 'bluetooth',
            'home.robotVacuum': 'docked',
            'home.washingMachine': 'idle',
            'home.scene': 'normal',

            // ==================== 9. 日历相关 (20个) ====================
            'calendar.enabled': true,
            'calendar.todayEventCount': 0,
            'calendar.tomorrowEventCount': 0,
            'calendar.weekEventCount': 0,
            'calendar.nextEvent': null,
            'calendar.nextEventTime': '',
            'calendar.defaultDuration': 60,
            'calendar.defaultReminder': 15,
            'calendar.timezone': 'Asia/Shanghai',
            'calendar.firstDayOfWeek': 1,
            'calendar.dateFormat': 'YYYY-MM-DD',
            'calendar.timeFormat': 'HH:mm',
            'calendar.showWeekNumbers': false,
            'calendar.workStart': '09:00',
            'calendar.workEnd': '18:00',
            'calendar.workDays': [1, 2, 3, 4, 5],
            'calendar.reminderSound': true,
            'calendar.reminderPopup': true,
            'calendar.reminderEmail': false,
            'calendar.syncEnabled': false,
            'calendar.lastSync': 0,

            // ==================== 10. 健身相关 (20个) ====================
            'fitness.enabled': true,
            'fitness.steps': 0,
            'fitness.stepsGoal': 10000,
            'fitness.distance': 0,
            'fitness.distanceGoal': 5,
            'fitness.calories': 0,
            'fitness.caloriesGoal': 2000,
            'fitness.heartRate': 72,
            'fitness.heartRateMin': 60,
            'fitness.heartRateMax': 100,
            'fitness.activeMinutes': 0,
            'fitness.activeMinutesGoal': 30,
            'fitness.sleepHours': 7,
            'fitness.sleepGoal': 8,
            'fitness.waterIntake': 0,
            'fitness.waterGoal': 8,
            'fitness.weight': 70,
            'fitness.weightGoal': 65,
            'fitness.exerciseType': '',
            'fitness.exerciseDuration': 0,
            'fitness.lastWorkout': '',

            // ==================== 11. 天气相关 (20个) ====================
            'weather.enabled': true,
            'weather.city': '北京',
            'weather.temperature': 22,
            'weather.feelsLike': 21,
            'weather.humidity': 45,
            'weather.pressure': 1013,
            'weather.windSpeed': 3.5,
            'weather.windDirection': '东北',
            'weather.condition': '晴',
            'weather.conditionCode': 1000,
            'weather.uvIndex': 5,
            'weather.visibility': 10,
            'weather.cloudCover': 20,
            'weather.precipitation': 0,
            'weather.aqi': 55,
            'weather.aqiLevel': '良',
            'weather.sunrise': '06:00',
            'weather.sunset': '18:30',
            'weather.forecastDays': 7,
            'weather.lastUpdate': 0,

            // ==================== 12. 饮食相关 (20个) ====================
            'diet.enabled': true,
            'diet.mealPlan.breakfast': '',
            'diet.mealPlan.lunch': '',
            'diet.mealPlan.dinner': '',
            'diet.mealPlan.snack': '',
            'diet.caloriesConsumed': 0,
            'diet.caloriesTarget': 2000,
            'diet.proteinConsumed': 0,
            'diet.proteinTarget': 60,
            'diet.carbsConsumed': 0,
            'diet.carbsTarget': 250,
            'diet.fatConsumed': 0,
            'diet.fatTarget': 65,
            'diet.fiberConsumed': 0,
            'diet.fiberTarget': 25,
            'diet.waterReminder': true,
            'diet.waterInterval': 60,
            'diet.allergens': [],
            'diet.preferences': [],
            'diet.lastMealTime': '',
            'diet.fastingActive': false,

            // ==================== 13. 通知相关 (20个) ====================
            'notify.enabled': true,
            'notify.soundEnabled': true,
            'notify.popupEnabled': true,
            'notify.badgeCount': 0,
            'notify.unreadCount': 0,
            'notify.messageList': [],
            'notify.lastMessage': '',
            'notify.lastMessageTime': 0,
            'notify.doNotDisturb': false,
            'notify.dndStart': '22:00',
            'notify.dndEnd': '08:00',
            'notify.priority': 'normal',
            'notify.groupByApp': true,
            'notify.showPreview': true,
            'notify.autoDismiss': 5,
            'notify.maxVisible': 5,
            'notify.emailNotifications': true,
            'notify.pushNotifications': true,
            'notify.desktopNotifications': true,
            'notify.vibrationEnabled': true,

            // ==================== 14. 自动化相关 (30个) ====================
            'automation.enabled': true,
            'automation.ruleCount': 0,
            'automation.rules': [],
            'automation.activeRules': 0,
            'automation.triggerCount': 0,
            'automation.actionCount': 0,
            'automation.lastTrigger': '',
            'automation.lastTriggerTime': 0,
            'automation.lastAction': '',
            'automation.lastActionTime': 0,
            'automation.scheduleEnabled': true,
            'automation.scheduleCount': 0,
            'automation.eventEnabled': true,
            'automation.eventCount': 0,
            'automation.conditionEnabled': true,
            'automation.conditionCount': 0,
            'automation.sceneEnabled': true,
            'automation.sceneCount': 0,
            'automation.currentScene': '',
            'automation.macroEnabled': true,
            'automation.macroCount': 0,
            'automation.webhookEnabled': false,
            'automation.webhookCount': 0,
            'automation.cronEnabled': true,
            'automation.cronCount': 0,
            'automation.errorCount': 0,
            'automation.executionLog': [],
            'automation.maxLogEntries': 100,
            'automation.dryRun': false,
            'automation.parallelExecution': true,

            // ==================== 15. 网络相关 (20个) ====================
            'network.online': navigator.onLine,
            'network.type': 'unknown',
            'network.effectiveType': '4g',
            'network.downlink': 10,
            'network.rtt': 50,
            'network.saveData': false,
            'network.wifiConnected': false,
            'network.wifiSSID': '',
            'network.wifiSignal': 0,
            'network.ipAddress': '',
            'network.ipv6Address': '',
            'network.macAddress': '',
            'network.dns': '',
            'network.gateway': '',
            'network.proxyEnabled': false,
            'network.proxyUrl': '',
            'network.vpnConnected': false,
            'network.vpnProvider': '',
            'network.bandwidthUsage': 0,
            'network.connectionCount': 0,

            // ==================== 16. 显示相关 (20个) ====================
            'display.brightness': 80,
            'display.contrast': 50,
            'display.theme': 'dark',
            'display.fontSize': 16,
            'display.fontFamily': 'system-ui',
            'display.language': 'zh-CN',
            'display.colorScheme': 'dark',
            'display.reducedMotion': false,
            'display.highContrast': false,
            'display.screenReader': false,
            'display.screenWidth': window.screen.width,
            'display.screenHeight': window.screen.height,
            'display.pixelRatio': window.devicePixelRatio || 1,
            'display.orientation': 'landscape',
            'display.fullscreen': false,
            'display.pictureInPicture': false,
            'display.nightMode': false,
            'display.blueLightFilter': false,
            'display.autoBrightness': true,
            'display.screenTimeout': 300,

            // ==================== 17. 区域相关 (20个) ====================
            'locale.language': 'zh-CN',
            'locale.region': 'CN',
            'locale.timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
            'locale.timezoneOffset': new Date().getTimezoneOffset(),
            'locale.currency': 'CNY',
            'locale.currencySymbol': '¥',
            'locale.dateFormat': 'YYYY-MM-DD',
            'locale.timeFormat': 'HH:mm:ss',
            'locale.numberFormat': '1,234.56',
            'locale.firstDayOfWeek': 1,
            'locale.measurementSystem': 'metric',
            'locale.temperatureUnit': 'celsius',
            'locale.distanceUnit': 'kilometer',
            'locale.weightUnit': 'kilogram',
            'locale.volumeUnit': 'liter',
            'locale.paperSize': 'A4',
            'locale.decimalSeparator': '.',
            'locale.thousandSeparator': ',',
            'locale.listSeparator': ';',
            'locale.quotationStart': '"',

            // ==================== 18. 调试相关 (20个) ====================
            'debug.enabled': false,
            'debug.logLevel': 'info',
            'debug.logToConsole': true,
            'debug.logToStorage': false,
            'debug.logToRemote': false,
            'debug.remoteUrl': '',
            'debug.maxLogSize': 1000,
            'debug.logEntries': 0,
            'debug.errorCount': 0,
            'debug.warningCount': 0,
            'debug.performanceMonitoring': true,
            'debug.memoryMonitoring': true,
            'debug.networkMonitoring': false,
            'debug.renderTracing': false,
            'debug.slowRenderThreshold': 16,
            'debug.profiling': false,
            'debug.breakpointCount': 0,
            'debug.stepThrough': false,
            'debug.verboseMode': false,
            'debug.crashReporting': true,
            'debug.lastCrashTime': 0,

            // ==================== 19. 配置相关 (20个) ====================
            'config.version': '1.0.0',
            'config.autoSave': true,
            'config.autoSaveInterval': 30000,
            'config.lastSaveTime': 0,
            'config.lastLoadTime': 0,
            'config.backupEnabled': true,
            'config.backupInterval': 3600000,
            'config.backupCount': 5,
            'config.syncEnabled': false,
            'config.syncUrl': '',
            'config.syncInterval': 300000,
            'config.lastSyncTime': 0,
            'config.resetConfirm': true,
            'config.exportFormat': 'json',
            'config.importPending': false,
            'config.migrationVersion': 0,
            'config.experimental': false,
            'config.developerMode': false,
            'config.setupComplete': false,
            'config.firstRun': true,

            // ==================== 20. 远程医疗 (20个) ====================
            'telemed.enabled': false,
            'telemed.doctorList': [],
            'telemed.selectedDoctor': '',
            'telemed.appointmentList': [],
            'telemed.nextAppointment': null,
            'telemed.healthRecords': [],
            'telemed.bloodPressure.systolic': 120,
            'telemed.bloodPressure.diastolic': 80,
            'telemed.bloodPressure.lastReading': '',
            'telemed.bloodSugar': 5.5,
            'telemed.bloodSugar.lastReading': '',
            'telemed.bodyTemp': 36.5,
            'telemed.bodyTemp.lastReading': '',
            'telemed.oxygenSaturation': 98,
            'telemed.oxygenSaturation.lastReading': '',
            'telemed.medicationList': [],
            'telemed.medicationReminders': [],
            'telemed.emergencyContact': '',
            'telemed.emergencyNumber': '120',
            'telemed.videoCallActive': false,
            'telemed.consultationNotes': '',

            // ==================== 21. 相机相关 (20个) ====================
            'camera.activeId': '',
            'camera.deviceList': [],
            'camera.recordingMode': 'manual',
            'camera.recordingQuality': 'high',
            'camera.recordingSchedule': [],
            'camera.motionDetection': false,
            'camera.motionSensitivity': 0.5,
            'camera.nightVision': false,
            'camera.panTiltZoom': false,
            'camera.panAngle': 0,
            'camera.tiltAngle': 0,
            'camera.zoomLevel': 1,
            'camera.overlayEnabled': false,
            'camera.overlayText': '',
            'camera.overlayTimestamp': true,
            'camera.snapshotInterval': 0,
            'camera.storagePath': '',
            'camera.storageUsed': 0,
            'camera.storageTotal': 0,
            'camera.streamUrl': '',

            // ==================== 22. 计时器 (20个) ====================
            'timer.countdownActive': false,
            'timer.countdownRemaining': 0,
            'timer.countdownTotal': 0,
            'timer.countdownLabel': '',
            'timer.stopwatchActive': false,
            'timer.stopwatchElapsed': 0,
            'timer.stopwatchLaps': [],
            'timer.alarmList': [],
            'timer.alarmEnabled': true,
            'timer.alarmSound': 'default',
            'timer.alarmVolume': 80,
            'timer.alarmSnooze': 5,
            'timer.alarmVibrate': true,
            'timer.pomodoroActive': false,
            'timer.pomodoroWorkDuration': 25,
            'timer.pomodoroBreakDuration': 5,
            'timer.pomodoroLongBreakDuration': 15,
            'timer.pomodoroSessions': 0,
            'timer.pomodoroSessionsBeforeLongBreak': 4,
            'timer.worldClocks': [],

            // ==================== 23. 备忘录 (20个) ====================
            'memo.noteList': [],
            'memo.noteCount': 0,
            'memo.tagList': [],
            'memo.tagCount': 0,
            'memo.selectedNote': '',
            'memo.selectedTag': '',
            'memo.sortBy': 'modified',
            'memo.sortOrder': 'desc',
            'memo.viewMode': 'list',
            'memo.autoSave': true,
            'memo.autoSaveInterval': 5000,
            'memo.markdownEnabled': true,
            'memo.richTextEnabled': false,
            'memo.fontSize': 14,
            'memo.lineHeight': 1.6,
            'memo.showLineNumbers': false,
            'memo.wordWrap': true,
            'memo.spellCheck': true,
            'memo.templateList': [],
            'memo.trashList': [],

            // ==================== 24. 固件相关 (20个) ====================
            'firmware.currentVersion': '1.0.0',
            'firmware.latestVersion': '1.0.0',
            'firmware.updateAvailable': false,
            'firmware.updateDownloading': false,
            'firmware.updateProgress': 0,
            'firmware.updateSize': 0,
            'firmware.updateChangelog': '',
            'firmware.autoUpdate': false,
            'firmware.updateChannel': 'stable',
            'firmware.lastCheckTime': 0,
            'firmware.lastUpdateTime': 0,
            'firmware.bootloaderVersion': '1.0.0',
            'firmware.hardwareRevision': '1.0',
            'firmware.serialNumber': '',
            'firmware.buildDate': '',
            'firmware.buildNumber': 0,
            'firmware.otaEnabled': true,
            'firmware.rollbackEnabled': true,
            'firmware.verifyChecksum': true,
            'firmware.updateUrl': '',

            // ==================== 25. 传感器校准 (20个) ====================
            'calib.temperature.offset': 0,
            'calib.temperature.scale': 1.0,
            'calib.temperature.lastCalib': '',
            'calib.humidity.offset': 0,
            'calib.humidity.scale': 1.0,
            'calib.humidity.lastCalib': '',
            'calib.pressure.offset': 0,
            'calib.pressure.scale': 1.0,
            'calib.pressure.lastCalib': '',
            'calib.co2.offset': 0,
            'calib.co2.scale': 1.0,
            'calib.co2.lastCalib': '',
            'calib.pm25.offset': 0,
            'calib.pm25.scale': 1.0,
            'calib.pm25.lastCalib': '',
            'calib.light.offset': 0,
            'calib.light.scale': 1.0,
            'calib.light.lastCalib': '',
            'calib.accelerometer.offsetX': 0,
            'calib.accelerometer.offsetY': 0,
            'calib.accelerometer.offsetZ': 0,
            'calib.gyroscope.offsetX': 0,
            'calib.gyroscope.offsetY': 0,
            'calib.gyroscope.offsetZ': 0
        };
    }

    // ==================== 状态操作 ====================

    /**
     * 获取状态值
     */
    get(key) {
        return this.state[key];
    }

    /**
     * 设置状态值并通知观察者
     */
    set(key, value) {
        const old = this.state[key];
        this.state[key] = value;
        this.metrics.operationCount++;
        this.notifyWatchers(key, old, value);
    }

    /**
     * 批量设置状态
     */
    setMultiple(updates) {
        for (const [key, value] of Object.entries(updates)) {
            this.set(key, value);
        }
    }

    /**
     * 获取状态值，支持默认值
     */
    getOrDefault(key, defaultValue) {
        return this.state[key] !== undefined ? this.state[key] : defaultValue;
    }

    /**
     * 检查键是否存在
     */
    has(key) {
        return key in this.state;
    }

    /**
     * 删除状态键
     */
    delete(key) {
        const old = this.state[key];
        delete this.state[key];
        this.notifyWatchers(key, old, undefined);
    }

    /**
     * 获取所有键
     */
    keys() {
        return Object.keys(this.state);
    }

    /**
     * 获取所有状态
     */
    getAll() {
        return { ...this.state };
    }

    /**
     * 获取变量总数
     */
    size() {
        return Object.keys(this.state).length;
    }

    /**
     * 按前缀获取状态
     */
    getByPrefix(prefix) {
        const result = {};
        for (const [key, value] of Object.entries(this.state)) {
            if (key.startsWith(prefix)) {
                result[key] = value;
            }
        }
        return result;
    }

    /**
     * 按前缀设置状态
     */
    setByPrefix(prefix, updates) {
        for (const [key, value] of Object.entries(updates)) {
            const fullKey = key.startsWith(prefix) ? key : prefix + key;
            this.set(fullKey, value);
        }
    }

    // ==================== 观察者模式 ====================

    /**
     * 监听状态变化
     */
    watch(key, callback) {
        if (!this.watchers[key]) {
            this.watchers[key] = [];
        }
        this.watchers[key].push(callback);
        // 返回取消监听函数
        return () => {
            this.watchers[key] = this.watchers[key].filter(cb => cb !== callback);
        };
    }

    /**
     * 监听某个前缀下所有键的变化
     */
    watchPrefix(prefix, callback) {
        return this.watch(`__prefix_${prefix}`, callback);
    }

    /**
     * 通知观察者
     */
    notifyWatchers(key, oldVal, newVal) {
        // 精确匹配的观察者
        if (this.watchers[key]) {
            for (const callback of this.watchers[key]) {
                try {
                    callback(key, oldVal, newVal);
                } catch (e) {
                    console.error(`[GlobalState] 观察者回调错误 (${key}):`, e);
                }
            }
        }

        // 前缀匹配的观察者
        for (const [watchKey, callbacks] of Object.entries(this.watchers)) {
            if (watchKey.startsWith('__prefix_')) {
                const prefix = watchKey.replace('__prefix_', '');
                if (key.startsWith(prefix)) {
                    for (const callback of callbacks) {
                        try {
                            callback(key, oldVal, newVal);
                        } catch (e) {
                            console.error(`[GlobalState] 前缀观察者回调错误 (${key}):`, e);
                        }
                    }
                }
            }
        }
    }

    // ==================== 看门狗机制 ====================

    /**
     * 启动看门狗
     */
    startWatchdog() {
        if (this.watchdogTimer) clearInterval(this.watchdogTimer);
        this.watchdogTimer = setInterval(() => this.checkHealth(), this.watchdog.checkInterval);
        console.log(`[GlobalState] 看门狗已启动，检查间隔: ${this.watchdog.checkInterval}ms`);
    }

    /**
     * 停止看门狗
     */
    stopWatchdog() {
        if (this.watchdogTimer) {
            clearInterval(this.watchdogTimer);
            this.watchdogTimer = null;
        }
    }

    /**
     * 健康检查
     */
    checkHealth() {
        if (!this.watchdog.enabled) return;

        this.watchdog.lastCheckTime = Date.now();
        const alerts = [];

        // 1. 内存检查（Chrome浏览器支持 performance.memory）
        if (performance.memory) {
            const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
            const totalMB = performance.memory.totalJSHeapSize / 1024 / 1024;
            const limitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
            const usagePercent = (usedMB / limitMB) * 100;

            // 更新状态
            this.state['debug.memoryUsedMB'] = Math.round(usedMB * 100) / 100;
            this.state['debug.memoryTotalMB'] = Math.round(totalMB * 100) / 100;
            this.state['debug.memoryLimitMB'] = Math.round(limitMB * 100) / 100;
            this.state['debug.memoryUsagePercent'] = Math.round(usagePercent * 100) / 100;

            if (usedMB > this.watchdog.memThreshold) {
                alerts.push({
                    type: 'memory',
                    level: 'warning',
                    message: `内存使用 ${usedMB.toFixed(1)}MB 超过阈值 ${this.watchdog.memThreshold}MB`,
                    value: usedMB,
                    threshold: this.watchdog.memThreshold
                });
            }

            // 内存使用超过80%告警
            if (usagePercent > 80) {
                alerts.push({
                    type: 'memory',
                    level: 'critical',
                    message: `内存使用率 ${usagePercent.toFixed(1)}% 超过80%`,
                    value: usagePercent,
                    threshold: 80
                });
            }
        }

        // 2. 响应时间检查
        const checkStart = performance.now();
        // 使用setTimeout(0)检测事件循环延迟
        setTimeout(() => {
            const delay = performance.now() - checkStart;
            this.state['debug.eventLoopDelay'] = Math.round(delay * 100) / 100;

            if (delay > this.watchdog.responseTimeThreshold) {
                alerts.push({
                    type: 'responsiveness',
                    level: 'warning',
                    message: `事件循环延迟 ${delay.toFixed(0)}ms 超过阈值 ${this.watchdog.responseTimeThreshold}ms`,
                    value: delay,
                    threshold: this.watchdog.responseTimeThreshold
                });
            }
        }, 0);

        // 3. 心跳检查
        const heartbeatAge = Date.now() - this.heartbeat.lastBeat;
        if (heartbeatAge > this.heartbeat.interval * this.heartbeat.maxMissedBeats) {
            this.heartbeat.missedBeats++;
            alerts.push({
                type: 'heartbeat',
                level: 'critical',
                message: `心跳丢失 ${this.heartbeat.missedBeats} 次`,
                value: heartbeatAge,
                threshold: this.heartbeat.interval * this.heartbeat.maxMissedBeats
            });
        }

        // 4. 错误率检查
        if (this.metrics.operationCount > 0) {
            const errorRate = this.metrics.errorCount / this.metrics.operationCount;
            if (errorRate > 0.1) {
                alerts.push({
                    type: 'errorRate',
                    level: 'warning',
                    message: `错误率 ${(errorRate * 100).toFixed(1)}% 超过10%`,
                    value: errorRate,
                    threshold: 0.1
                });
            }
        }

        // 5. 状态变量数量检查（检测异常增长）
        const stateSize = Object.keys(this.state).length;
        if (stateSize > 1000) {
            alerts.push({
                type: 'stateGrowth',
                level: 'warning',
                message: `状态变量数量 ${stateSize} 超过1000`,
                value: stateSize,
                threshold: 1000
            });
        }

        // 处理告警
        if (alerts.length > 0) {
            this.watchdog.triggerCount++;
            for (const alert of alerts) {
                this.triggerAlert(alert.type, alert);
            }

            // 超过最大触发次数，执行自动恢复
            if (this.watchdog.triggerCount >= this.watchdog.maxTriggers) {
                this.autoRecover();
            }
        } else {
            // 正常时重置触发计数
            this.watchdog.triggerCount = Math.max(0, this.watchdog.triggerCount - 1);
        }

        // 更新运行时间
        this.state['debug.uptime'] = Date.now() - this.metrics.startTime;
    }

    /**
     * 触发告警
     */
    triggerAlert(type, alert) {
        // 记录告警历史
        this.watchdog.alertHistory.push({
            ...alert,
            timestamp: Date.now()
        });

        // 保留最近100条告警
        if (this.watchdog.alertHistory.length > 100) {
            this.watchdog.alertHistory = this.watchdog.alertHistory.slice(-100);
        }

        // 更新熔断器
        this.circuitBreaker.failures++;
        this.circuitBreaker.lastFailure = Date.now();

        if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
            this.circuitBreaker.state = 'open';
            this.circuitBreaker.openTime = Date.now();
            console.error(`[GlobalState] 熔断器开启，连续 ${this.circuitBreaker.failures} 次告警`);

            // 熔断超时后转为半开
            setTimeout(() => {
                if (this.circuitBreaker.state === 'open') {
                    this.circuitBreaker.state = 'half-open';
                    console.log('[GlobalState] 熔断器进入半开状态');
                }
            }, this.circuitBreaker.timeout);
        }

        // 调用告警回调
        if (this.onAlert) {
            try {
                this.onAlert(type, alert);
            } catch (e) {
                console.error('[GlobalState] 告警回调错误:', e);
            }
        }

        // 控制台输出
        if (alert.level === 'critical') {
            console.error(`[GlobalState] 🚨 ${alert.message}`);
        } else {
            console.warn(`[GlobalState] ⚠️ ${alert.message}`);
        }
    }

    /**
     * 自动恢复逻辑
     */
    autoRecover() {
        console.warn('[GlobalState] 执行自动恢复...');

        // 1. 清理缓存
        if (window.llmProvider) {
            window.llmProvider.clearCache();
        }

        // 2. 清理内存存储
        if (window.mcpManager) {
            window.mcpManager.memoryStore = {};
        }

        // 3. 清理观察者中的无效引用
        for (const key of Object.keys(this.watchers)) {
            if (this.watchers[key].length === 0) {
                delete this.watchers[key];
            }
        }

        // 4. 重置看门狗触发计数
        this.watchdog.triggerCount = 0;

        // 5. 重置熔断器
        this.resetCircuitBreaker();

        // 6. 强制垃圾回收提示（如果可用）
        if (window.gc) {
            try { window.gc(); } catch (e) { /* 忽略 */ }
        }

        console.log('[GlobalState] 自动恢复完成');
    }

    /**
     * 重置熔断器
     */
    resetCircuitBreaker() {
        this.circuitBreaker.state = 'closed';
        this.circuitBreaker.failures = 0;
        this.circuitBreaker.lastFailure = 0;
        this.circuitBreaker.openTime = 0;
    }

    /**
     * 获取熔断器状态
     */
    getCircuitBreakerStatus() {
        return { ...this.circuitBreaker };
    }

    /**
     * 获取看门狗状态
     */
    getWatchdogStatus() {
        return {
            enabled: this.watchdog.enabled,
            triggerCount: this.watchdog.triggerCount,
            lastCheckTime: this.watchdog.lastCheckTime,
            alertHistoryLength: this.watchdog.alertHistory.length,
            recentAlerts: this.watchdog.alertHistory.slice(-10),
            memoryInfo: performance.memory ? {
                usedMB: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100,
                totalMB: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024 * 100) / 100,
                limitMB: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024 * 100) / 100
            } : null
        };
    }

    // ==================== 心跳机制 ====================

    /**
     * 启动心跳
     */
    startHeartbeat() {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = setInterval(() => {
            this.heartbeat.lastBeat = Date.now();
            this.heartbeat.missedBeats = 0;
        }, this.heartbeat.interval);
    }

    /**
     * 停止心跳
     */
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    // ==================== 性能指标 ====================

    /**
     * 记录操作
     */
    recordOperation(durationMs, success = true) {
        this.metrics.operationCount++;
        if (!success) this.metrics.errorCount++;

        // 记录响应时间
        this.metrics.responseTimes.push(durationMs);
        if (this.metrics.responseTimes.length > 100) {
            this.metrics.responseTimes = this.metrics.responseTimes.slice(-100);
        }

        // 计算平均响应时间
        const sum = this.metrics.responseTimes.reduce((a, b) => a + b, 0);
        this.metrics.avgResponseTime = sum / this.metrics.responseTimes.length;
    }

    /**
     * 获取性能指标
     */
    getMetrics() {
        return {
            ...this.metrics,
            uptime: Date.now() - this.metrics.startTime,
            stateCount: Object.keys(this.state).length,
            watcherCount: Object.keys(this.watchers).length,
            errorRate: this.metrics.operationCount > 0
                ? this.metrics.errorCount / this.metrics.operationCount
                : 0
        };
    }

    // ==================== 持久化 ====================

    /**
     * 保存状态到localStorage
     */
    save() {
        try {
            const data = {
                state: this.state,
                savedAt: Date.now(),
                version: '1.0.0'
            };
            localStorage.setItem('global_state', JSON.stringify(data));
            this.state['config.lastSaveTime'] = Date.now();
        } catch (e) {
            console.error('[GlobalState] 保存状态失败:', e);
        }
    }

    /**
     * 从localStorage加载状态
     */
    load() {
        try {
            const saved = localStorage.getItem('global_state');
            if (saved) {
                const data = JSON.parse(saved);
                // 合并保存的状态（不覆盖新增的默认值）
                for (const [key, value] of Object.entries(data.state || {})) {
                    if (key in this.state) {
                        this.state[key] = value;
                    }
                }
                this.state['config.lastLoadTime'] = Date.now();
            }
        } catch (e) {
            console.error('[GlobalState] 加载状态失败:', e);
        }
    }

    /**
     * 导出状态为JSON
     */
    exportJSON() {
        return JSON.stringify(this.state, null, 2);
    }

    /**
     * 导入状态从JSON
     */
    importJSON(json) {
        try {
            const data = JSON.parse(json);
            for (const [key, value] of Object.entries(data)) {
                this.set(key, value);
            }
            return true;
        } catch (e) {
            console.error('[GlobalState] 导入状态失败:', e);
            return false;
        }
    }

    /**
     * 重置所有状态为默认值
     */
    reset() {
        this.state = {};
        this.initDefaults();
        this.watchdog.triggerCount = 0;
        this.resetCircuitBreaker();
        console.log('[GlobalState] 状态已重置');
    }

    /**
     * 销毁实例
     */
    destroy() {
        this.stopWatchdog();
        this.stopHeartbeat();
        this.watchers = {};
        this.state = {};
    }
}

// 创建全局实例
window.globalState = new GlobalState();

// 启动时加载保存的状态
window.globalState.load();

// 页面卸载前保存状态
window.addEventListener('beforeunload', () => {
    window.globalState.save();
});

// 监听在线/离线状态
window.addEventListener('online', () => window.globalState.set('network.online', true));
window.addEventListener('offline', () => window.globalState.set('network.online', false));

console.log(`[GlobalState] 初始化完成，共 ${window.globalState.size()} 个状态变量`);
