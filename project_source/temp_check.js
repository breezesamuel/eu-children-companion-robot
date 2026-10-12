
        let currentLanguage = 'zh';
        let storyDataLoaded = false;

        function initializeContent() {
            if (window.fullStories && window.fullStories.length > 0) {
                storyDataLoaded = true;
            } else {
                setTimeout(initializeContent, 100);
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            initializeContent();
            initLanguage('zh');
        });

        const translations = {
            zh: {
                header: '学习伙伴机器人',
                subtitle: '您的友好AI教育机器人',
                talk: '🎙️ 语音对话',
                back: '← 返回',
                chat: '💬 智能聊天',
                chatPlaceholder: '请输入您的消息...',
                send: '发送',
                chatHello: '你好！我是你的AI学习伙伴。今天想学习什么呢？',
                categories: {
                    math: { name: '数学', desc: '数字、形状和计算', count: '25000+ 活动' },
                    english: { name: '英语', desc: '词汇和语法', count: '350000+ 课程' },
                    science: { name: '科学', desc: '探索世界', count: '200000+ 主题' },
                    technology: { name: '技术', desc: '编程和机器人', count: '200000+ 活动' },
                    engineering: { name: '工程', desc: '设计和构建', count: '200000+ 项目' },
                    arts: { name: '艺术', desc: '创意和设计', count: '150000+ 项目' },
                    story: { name: '故事', desc: '有趣的故事', count: '50000+ 故事' },
                    music: { name: '音乐', desc: '歌曲和节奏', count: '30000+ 歌曲' }
                },
                activities: {
                    math: [
                        { icon: '➕', name: '加法', desc: '基础加法练习', type: 'math', mathType: 'addition' },
                        { icon: '➖', name: '减法', desc: '基础减法练习', type: 'math', mathType: 'subtraction' },
                        { icon: '✖️', name: '乘法', desc: '乘法口诀练习', type: 'math', mathType: 'multiplication' },
                        { icon: '➗', name: '除法', desc: '除法练习', type: 'math', mathType: 'division' },
                        { icon: '🔺', name: '几何图形', desc: '认识各种形状', type: 'shapes' },
                        { icon: '📐', name: '测量', desc: '长度、重量、时间', type: 'measurement' },
                        { icon: '📊', name: '数据与图表', desc: '统计知识学习', type: 'data' },
                        { icon: '🧮', name: '代数基础', desc: '简单代数入门', type: 'algebra' }
                    ],
                    english: [
                        { icon: '📚', name: '词汇', desc: '英语单词学习', type: 'vocabulary' },
                        { icon: '📝', name: '语法', desc: '语法规则学习', type: 'grammar' },
                        { icon: '🔊', name: '口语', desc: '日常对话练习', type: 'speaking' },
                        { icon: '✍️', name: '写作', desc: '简单写作练习', type: 'writing' },
                        { icon: '📖', name: '阅读', desc: '阅读理解练习', type: 'reading' },
                        { icon: '🎯', name: '拼写', desc: '单词拼写练习', type: 'spelling' }
                    ],
                    science: [
                        { icon: '🌱', name: '生物', desc: '植物和动物知识', type: 'biology' },
                        { icon: '⚗️', name: '化学', desc: '有趣的化学实验', type: 'chemistry' },
                        { icon: '🔭', name: '物理', desc: '力和运动知识', type: 'physics' },
                        { icon: '🌍', name: '地质', desc: '地球科学知识', type: 'geology' },
                        { icon: '🪐', name: '天文', desc: '宇宙探索知识', type: 'astronomy' }
                    ],
                    technology: [
                        { icon: '💻', name: '编程', desc: '编程基础入门', type: 'coding' },
                        { icon: '🤖', name: '机器人', desc: '机器人技术', type: 'robotics' },
                        { icon: '🧠', name: 'AI基础', desc: '人工智能入门', type: 'ai' },
                        { icon: '🌐', name: '互联网', desc: '网络知识', type: 'internet' },
                        { icon: '🔌', name: '电子', desc: '电子电路基础', type: 'electronics' }
                    ],
                    engineering: [
                        { icon: '🏗️', name: '结构', desc: '建筑结构知识', type: 'structure' },
                        { icon: '✈️', name: '航空', desc: '航空航天知识', type: 'aerospace' },
                        { icon: '🚗', name: '汽车', desc: '汽车工程', type: 'automotive' },
                        { icon: '🏭', name: '工业', desc: '工业工程', type: 'industrial' },
                        { icon: '⚡', name: '电气', desc: '电气工程', type: 'electrical' }
                    ],
                    arts: [
                        { icon: '🖌️', name: '绘画', desc: '创意绘画', type: 'drawing' },
                        { icon: '🎨', name: '油画', desc: '油画技巧', type: 'painting' },
                        { icon: '✂️', name: '手工', desc: '手工制作', type: 'crafts' },
                        { icon: '🎭', name: '戏剧', desc: '戏剧表演', type: 'drama' },
                        { icon: '🗿', name: '雕塑', desc: '雕塑艺术', type: 'sculpture' }
                    ],
                    story: [
                        { icon: '🌙', name: '睡前故事', desc: '温馨的睡前故事', type: 'bedtime' },
                        { icon: '🏰', name: '城堡故事', desc: '魔法城堡故事', type: 'castle' },
                        { icon: '🐉', name: '龙的故事', desc: '勇敢的龙传说', type: 'dragon' },
                        { icon: '🚀', name: '冒险故事', desc: '激动人心的冒险', type: 'adventure' }
                    ],
                    music: [
                        { icon: '🎶', name: '儿歌', desc: '经典儿歌', type: 'rhymes' },
                        { icon: '🎸', name: '乐器', desc: '认识乐器', type: 'instruments' },
                        { icon: '🎤', name: '唱歌', desc: '跟着唱', type: 'singing' },
                        { icon: '🎹', name: '钢琴', desc: '钢琴基础', type: 'piano' },
                        { icon: '🎻', name: '小提琴', desc: '小提琴入门', type: 'violin' },
                        { icon: '🥁', name: '节奏', desc: '节奏练习', type: 'rhythm' },
                        { icon: '🎵', name: '古典音乐', desc: '古典音乐欣赏', type: 'classical' }
                    ]
                },
                content: {
                    check: '检查',
                    correct: '正确！',
                    wrong: '答案是:',
                    more: '更多题目',
                    speak: '朗读',
                    play: '播放',
                    close: '关闭',
                    loading: '正在加载...'
                }
            },
            en: {
                header: 'Learning Companion Robot',
                subtitle: 'Your Friendly AI Educational Robot',
                talk: '🎙️ Voice Chat',
                back: '← Back',
                chat: '💬 Smart Chat',
                chatPlaceholder: 'Type your message...',
                send: 'Send',
                chatHello: "Hi there! I'm your AI learning companion. What would you like to learn today?",
                categories: {
                    math: { name: 'Math', desc: 'Numbers, shapes & calculations', count: '25000+ Activities' },
                    english: { name: 'English', desc: 'Vocabulary & grammar', count: '350000+ Lessons' },
                    science: { name: 'Science', desc: 'Explore the world', count: '200000+ Topics' },
                    technology: { name: 'Technology', desc: 'Coding & robotics', count: '200000+ Activities' },
                    engineering: { name: 'Engineering', desc: 'Design & build', count: '200000+ Projects' },
                    arts: { name: 'Arts', desc: 'Creativity & design', count: '150000+ Projects' },
                    story: { name: 'Stories', desc: 'Fun stories & tales', count: '50000+ Stories' },
                    music: { name: 'Music', desc: 'Songs & rhythms', count: '30000+ Songs' }
                },
                activities: {
                    math: [
                        { icon: '➕', name: 'Addition', desc: 'Basic addition practice', type: 'math', mathType: 'addition' },
                        { icon: '➖', name: 'Subtraction', desc: 'Basic subtraction practice', type: 'math', mathType: 'subtraction' },
                        { icon: '✖️', name: 'Multiplication', desc: 'Multiplication tables', type: 'math', mathType: 'multiplication' },
                        { icon: '➗', name: 'Division', desc: 'Division practice', type: 'math', mathType: 'division' },
                        { icon: '🔺', name: 'Shapes', desc: 'Learn about shapes', type: 'shapes' },
                        { icon: '📐', name: 'Measurement', desc: 'Length, weight, time', type: 'measurement' },
                        { icon: '📊', name: 'Data & Graphs', desc: 'Statistics learning', type: 'data' },
                        { icon: '🧮', name: 'Algebra', desc: 'Introduction to algebra', type: 'algebra' }
                    ],
                    english: [
                        { icon: '📚', name: 'Vocabulary', desc: 'English word learning', type: 'vocabulary' },
                        { icon: '📝', name: 'Grammar', desc: 'Grammar rules learning', type: 'grammar' },
                        { icon: '🔊', name: 'Speaking', desc: 'Daily conversation', type: 'speaking' },
                        { icon: '✍️', name: 'Writing', desc: 'Simple writing practice', type: 'writing' },
                        { icon: '📖', name: 'Reading', desc: 'Reading comprehension', type: 'reading' },
                        { icon: '🎯', name: 'Spelling', desc: 'Word spelling practice', type: 'spelling' }
                    ],
                    science: [
                        { icon: '🌱', name: 'Biology', desc: 'Plants and animals', type: 'biology' },
                        { icon: '⚗️', name: 'Chemistry', desc: 'Fun chemistry experiments', type: 'chemistry' },
                        { icon: '🔭', name: 'Physics', desc: 'Force and motion', type: 'physics' },
                        { icon: '🌍', name: 'Geology', desc: 'Earth science', type: 'geology' },
                        { icon: '🪐', name: 'Astronomy', desc: 'Space exploration', type: 'astronomy' }
                    ],
                    technology: [
                        { icon: '💻', name: 'Coding', desc: 'Introduction to coding', type: 'coding' },
                        { icon: '🤖', name: 'Robotics', desc: 'Robot technology', type: 'robotics' },
                        { icon: '🧠', name: 'AI Basics', desc: 'Introduction to AI', type: 'ai' },
                        { icon: '🌐', name: 'Internet', desc: 'Network knowledge', type: 'internet' },
                        { icon: '🔌', name: 'Electronics', desc: 'Electronic circuits', type: 'electronics' }
                    ],
                    engineering: [
                        { icon: '🏗️', name: 'Structure', desc: 'Building structures', type: 'structure' },
                        { icon: '✈️', name: 'Aerospace', desc: 'Aviation and space', type: 'aerospace' },
                        { icon: '🚗', name: 'Automotive', desc: 'Car engineering', type: 'automotive' },
                        { icon: '🏭', name: 'Industrial', desc: 'Industrial engineering', type: 'industrial' },
                        { icon: '⚡', name: 'Electrical', desc: 'Electrical engineering', type: 'electrical' }
                    ],
                    arts: [
                        { icon: '🖌️', name: 'Drawing', desc: 'Creative drawing', type: 'drawing' },
                        { icon: '🎨', name: 'Painting', desc: 'Painting techniques', type: 'painting' },
                        { icon: '✂️', name: 'Crafts', desc: 'Handicrafts', type: 'crafts' },
                        { icon: '🎭', name: 'Drama', desc: 'Theater performance', type: 'drama' },
                        { icon: '🗿', name: 'Sculpture', desc: 'Sculpture art', type: 'sculpture' }
                    ],
                    story: [
                        { icon: '🌙', name: 'Bedtime Stories', desc: 'Warm bedtime stories', type: 'bedtime' },
                        { icon: '🏰', name: 'Castle Stories', desc: 'Magic castle stories', type: 'castle' },
                        { icon: '🐉', name: 'Dragon Tales', desc: 'Brave dragon legends', type: 'dragon' },
                        { icon: '🚀', name: 'Adventure Stories', desc: 'Exciting adventures', type: 'adventure' }
                    ],
                    music: [
                        { icon: '🎶', name: 'Nursery Rhymes', desc: 'Classic children songs', type: 'rhymes' },
                        { icon: '🎸', name: 'Instruments', desc: 'Learn about instruments', type: 'instruments' },
                        { icon: '🎤', name: 'Singing', desc: 'Sing along', type: 'singing' },
                        { icon: '🎹', name: 'Piano', desc: 'Piano basics', type: 'piano' },
                        { icon: '🎻', name: 'Violin', desc: 'Violin basics', type: 'violin' },
                        { icon: '🥁', name: 'Rhythm', desc: 'Rhythm practice', type: 'rhythm' },
                        { icon: '🎵', name: 'Classical', desc: 'Classical music', type: 'classical' }
                    ]
                },
                content: {
                    check: 'Check',
                    correct: 'Correct!',
                    wrong: 'Answer:',
                    more: 'More Questions',
                    speak: 'Speak',
                    play: 'Play',
                    close: 'Close',
                    loading: 'Loading...'
                }
            }
        };

        function initLanguage(lang) {
            currentLanguage = lang;
            const t = translations[lang];
            
            document.getElementById('headerTitle').textContent = t.header;
            document.getElementById('headerSubtitle').textContent = t.subtitle;
            document.getElementById('voiceBtn').textContent = t.talk;
            document.getElementById('backBtn').textContent = t.back;
            document.getElementById('chatTitle').textContent = t.chat;
            document.getElementById('chatInput').placeholder = t.chatPlaceholder;
            document.getElementById('sendBtn').textContent = t.send;
            
            updateCategoryCards();
            updateChatHello();
            document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
        }

        function updateCategoryCards() {
            const t = translations[currentLanguage];
            const cards = document.querySelectorAll('.category-card');
            
            cards.forEach(card => {
                const category = card.dataset.category;
                if (t.categories[category]) {
                    card.querySelector('.name').textContent = t.categories[category].name;
                    card.querySelector('.description').textContent = t.categories[category].desc;
                    card.querySelector('.count').textContent = t.categories[category].count;
                }
            });
        }

        function updateChatHello() {
            const t = translations[currentLanguage];
            const chatMessages = document.getElementById('chatMessages');
            chatMessages.innerHTML = `<div class="chat-message bot">🤖 ${t.chatHello}</div>`;
        }

        function showCategoryDetail(category) {
            currentCategory = category;
            const t = translations[currentLanguage];
            
            document.getElementById('detailIcon').textContent = getCategoryIcon(category);
            document.getElementById('detailTitle').textContent = t.categories[category].name;
            
            const activityList = document.getElementById('activityList');
            activityList.innerHTML = '';
            
            const activities = t.activities[category] || [];
            activities.forEach(activity => {
                const item = document.createElement('div');
                item.className = 'activity-item';
                item.innerHTML = `
                    <div class="activity-icon">${activity.icon}</div>
                    <div class="activity-name">${activity.name}</div>
                    <div class="activity-desc">${activity.desc}</div>
                `;
                item.onclick = () => openActivity(activity);
                activityList.appendChild(item);
            });
            
            document.getElementById('detailPanel').style.display = 'block';
            document.getElementById('categoryGrid').style.display = 'none';
            document.getElementById('contentArea').innerHTML = '';
        }

        function getCategoryIcon(category) {
            const icons = {
                math: '🧮', english: '🔤', science: '🔬', technology: '💻',
                engineering: '⚙️', arts: '🎨', story: '📖', music: '🎵'
            };
            return icons[category] || '📚';
        }

        function hideDetailPanel() {
            document.getElementById('detailPanel').style.display = 'none';
            document.getElementById('categoryGrid').style.display = 'grid';
            document.getElementById('contentArea').innerHTML = '';
        }

        function openActivity(activity) {
            const t = translations[currentLanguage];
            const contentArea = document.getElementById('contentArea');
            
            switch(activity.type) {
                case 'math':
                case 'addition':
                case 'subtraction':
                case 'multiplication':
                case 'division':
                    showMathActivity(activity);
                    break;
                case 'vocabulary':
                    showVocabularyActivity();
                    break;
                case 'grammar':
                    showGrammarActivity();
                    break;
                case 'speaking':
                    showSpeakingActivity();
                    break;
                case 'writing':
                    showWritingActivity();
                    break;
                case 'reading':
                    showReadingActivity();
                    break;
                case 'spelling':
                    showSpellingActivity();
                    break;
                case 'biology':
                case 'chemistry':
                case 'physics':
                case 'geology':
                case 'astronomy':
                    showScienceActivity(activity.type);
                    break;
                case 'bedtime':
                case 'castle':
                case 'dragon':
                case 'adventure':
                    showStoriesActivity(activity.type);
                    break;
                case 'rhymes':
                case 'instruments':
                case 'singing':
                case 'classical':
                    showMusicActivity(activity.type);
                    break;
                case 'shapes':
                    showShapesActivity();
                    break;
                case 'measurement':
                    showMeasurementActivity();
                    break;
                case 'drawing':
                case 'painting':
                case 'crafts':
                case 'drama':
                case 'sculpture':
                    showArtsActivity(activity.type);
                    break;
                case 'data':
                    showDataActivity();
                    break;
                case 'algebra':
                    showAlgebraActivity();
                    break;
                case 'coding':
                case 'robotics':
                case 'ai':
                case 'internet':
                case 'electronics':
                    showTechActivity(activity.type);
                    break;
                case 'structure':
                case 'aerospace':
                case 'automotive':
                case 'industrial':
                case 'electrical':
                    showEngineeringActivity(activity.type);
                    break;
                case 'piano':
                case 'violin':
                case 'rhythm':
                    showMusicDetailActivity(activity.type);
                    break;
                default:
                    contentArea.innerHTML = `<div style="padding: 40px; text-align: center; color: #8B4513;">
                        <h3>${activity.icon} ${activity.name}</h3>
                        <p style="margin-top: 20px;">${t.content.loading}</p>
                    </div>`;
            }
        }

        function showMathActivity(activity) {
            const t = translations[currentLanguage];
            const mathType = activity.mathType || (['addition', 'subtraction', 'multiplication', 'division'][Math.floor(Math.random() * 4)]);
            const questions = generateMathQuestions(5, mathType);
            let html = `<h3 style="color: #8B4513; margin-bottom: 20px;">${activity.icon} ${activity.name}</h3>`;
            
            questions.forEach((q, index) => {
                html += `
                    <div class="content-item" style="background: #FFF8DC; border-radius: 15px; padding: 15px; margin: 10px 0; display: flex; align-items: center; gap: 15px;">
                        <div style="font-weight: bold; font-size: 18px;">${index + 1}.</div>
                        <div style="flex: 1; font-size: 18px;">${q.question}</div>
                        <input type="number" id="answer-${q.id}" placeholder="?" style="width: 80px; padding: 8px; border: 2px solid #A0522D; border-radius: 8px; text-align: center; font-size: 16px;">
                        <button onclick="checkMathAnswer(${q.id}, ${q.answer})" style="padding: 8px 20px; background: #8B4513; color: white; border: none; border-radius: 10px; cursor: pointer;">${t.content.check}</button>
                        <span id="feedback-${q.id}"></span>
                    </div>
                `;
            });
            
            html += `<button onclick="openActivity(${JSON.stringify(activity).replace(/"/g, '&quot;')})" style="margin-top: 20px; padding: 12px 30px; background: #FF8C00; color: white; border: none; border-radius: 20px; cursor: pointer; font-weight: bold;">🔄 ${t.content.more}</button>`;
            
            document.getElementById('contentArea').innerHTML = html;
        }

        function checkMathAnswer(id, correct) {
            const t = translations[currentLanguage];
            const input = document.getElementById('answer-' + id);
            const feedback = document.getElementById('feedback-' + id);
            const userAnswer = parseInt(input.value);
            
            if (userAnswer === correct) {
                feedback.textContent = ' ✅ ' + t.content.correct;
                feedback.style.color = 'green';
                input.style.borderColor = 'green';
            } else {
                feedback.textContent = ' ❌ ' + t.content.wrong + ' ' + correct;
                feedback.style.color = 'red';
                input.style.borderColor = 'red';
            }
        }

        async function showVocabularyActivity() {
            const t = translations[currentLanguage];
            document.getElementById('contentArea').innerHTML = `<div style="text-align:center;padding:40px;color:#666;"><div class="spinner"></div><p>加载词汇中...</p></div>`;
            try {
                const resp = await fetch('/api/learn/english/vocabulary?count=50');
                const json = await resp.json();
                const words = json.data || [];
                let html = `<h3 style="color: #8B4513; margin-bottom: 20px;">📚 ${t.activities.english[0].name} <span style="font-size:14px;color:#666;">(${json.total} 个单词)</span></h3>
                <div style="margin-bottom:15px;display:flex;gap:8px;flex-wrap:wrap;" id="vocabFilters">
                    <button onclick="filterVocab('all')" class="filter-btn active" style="padding:6px 14px;border-radius:16px;border:1px solid #A0522D;background:#FFF;cursor:pointer;">全部</button>
                    <button onclick="filterVocab('pre-a1')" class="filter-btn" style="padding:6px 14px;border-radius:16px;border:1px solid #A0522D;background:#FFF;cursor:pointer;">Pre-A1</button>
                    <button onclick="filterVocab('a1')" class="filter-btn" style="padding:6px 14px;border-radius:16px;border:1px solid #A0522D;background:#FFF;cursor:pointer;">A1</button>
                    <button onclick="filterVocab('a2')" class="filter-btn" style="padding:6px 14px;border-radius:16px;border:1px solid #A0522D;background:#FFF;cursor:pointer;">A2</button>
                    <button onclick="filterVocab('b1')" class="filter-btn" style="padding:6px 14px;border-radius:16px;border:1px solid #A0522D;background:#FFF;cursor:pointer;">B1</button>
                </div>`;
                words.forEach(word => {
                    html += `
                    <div class="content-item" style="background: #F5F5DC; border-radius: 12px; padding: 15px; margin: 10px 0; display: flex; align-items: center; gap: 15px;">
                        <div style="font-size: 24px;">📚</div>
                        <div style="flex: 1;">
                            <div style="font-weight: bold; font-size: 18px;">${word.word} <span style="font-size:13px;color:#8B4513;font-weight:normal;">${word.phonetic || ''}</span></div>
                            <div style="color: #4B0082;">${word.meaning}</div>
                            <div style="font-size: 14px; color: #666; font-style: italic; margin-top: 5px;">${word.example || ''}</div>
                            <div style="font-size:11px;color:#999;margin-top:2px;">${word.level || ''}</div>
                        </div>
                        <button onclick="speakText('${word.word}')" style="padding: 10px 20px; background: #4B0082; color: white; border: none; border-radius: 15px; cursor: pointer;">🔊 ${t.content.speak}</button>
                    </div>`;
                });
                if (json.total > words.length) {
                    html += `<div style="text-align:center;padding:15px;color:#8B4513;">还有 ${json.total - words.length} 个单词，<a href="/voice-chat.html" target="_blank" style="color:#4B0082;">去语音助手学习更多</a></div>`;
                }
                document.getElementById('contentArea').innerHTML = html;
            } catch(e) {
                document.getElementById('contentArea').innerHTML = `<div style="text-align:center;padding:40px;color:red;">加载失败: ${e.message}</div>`;
            }
        }
        window.filterVocab = async function(level) {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            event.target.classList.add('active');
            document.getElementById('contentArea').innerHTML = `<div style="text-align:center;padding:40px;color:#666;"><div class="spinner"></div><p>加载中...</p></div>`;
            const resp = await fetch('/api/learn/english/vocabulary?count=50&level=' + level);
            const json = await resp.json();
            const words = json.data || [];
            let html = `<h3 style="color: #8B4513; margin-bottom: 20px;">📚 词汇 - ${level.toUpperCase()} <span style="font-size:14px;color:#666;">(${json.total} 个单词)</span></h3>`;
            words.forEach(word => {
                html += `<div class="content-item" style="background:#F5F5DC;border-radius:12px;padding:15px;margin:10px 0;display:flex;align-items:center;gap:15px;">
                    <div style="font-size:24px;">📚</div>
                    <div style="flex:1;"><div style="font-weight:bold;font-size:18px;">${word.word} <span style="font-size:13px;color:#8B4513;font-weight:normal;">${word.phonetic||''}</span></div>
                    <div style="color:#4B0082;">${word.meaning}</div>
                    <div style="font-size:14px;color:#666;font-style:italic;margin-top:5px;">${word.example||''}</div></div>
                    <button onclick="speakText('${word.word}')" style="padding:10px 20px;background:#4B0082;color:white;border:none;border-radius:15px;cursor:pointer;">🔊 朗读</button></div>`;
            });
            document.getElementById('contentArea').innerHTML = html;
        };

        async function showGrammarActivity() {
            const t = translations[currentLanguage];
            document.getElementById('contentArea').innerHTML = `<div style="text-align:center;padding:40px;color:#666;"><div class="spinner"></div><p>加载语法中...</p></div>`;
            try {
                const resp = await fetch('/api/learn/english/grammar?count=25');
                const json = await resp.json();
                const rules = json.data || [];
                let html = `<h3 style="color: #8B4513; margin-bottom: 20px;">📝 ${t.activities.english[1].name} <span style="font-size:14px;color:#666;">(${json.total} 条规则)</span></h3>`;
                rules.forEach((rule, index) => {
                    html += `
                    <div class="content-item" style="background: #E6E6FA; border-radius: 12px; padding: 15px; margin: 10px 0;">
                        <div style="font-weight: bold; color: #4B0082; font-size: 18px;">${index + 1}. ${rule.rule}</div>
                        <div style="margin-top: 5px; color: #333;">${rule.zh}</div>
                        <div style="font-style: italic; margin-top: 8px; color: #555;">${rule.en}</div>
                        <div style="margin-top: 5px; padding: 8px; background: #FFF; border-radius: 8px;">💡 ${rule.example}</div>
                    </div>`;
                });
                document.getElementById('contentArea').innerHTML = html;
            } catch(e) {
                document.getElementById('contentArea').innerHTML = `<div style="text-align:center;padding:40px;color:red;">加载失败: ${e.message}</div>`;
            }
        }

        async function showSpeakingActivity() {
            const t = translations[currentLanguage];
            document.getElementById('contentArea').innerHTML = `<div style="text-align:center;padding:40px;color:#666;"><div class="spinner"></div><p>加载口语中...</p></div>`;
            try {
                const resp = await fetch('/api/learn/english/speaking?count=20');
                const json = await resp.json();
                const phrases = json.data || [];
                let html = `<h3 style="color: #8B4513; margin-bottom: 20px;">🔊 ${t.activities.english[2].name} <span style="font-size:14px;color:#666;">(${json.total} 个话题)</span></h3>`;
                phrases.forEach((item, index) => {
                    const label = currentLanguage === 'zh' ? item.zh : item.topic;
                    const text = item.en;
                    html += `
                    <div class="content-item" style="background: #E6E6FA; border-radius: 12px; padding: 15px; margin: 10px 0;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <div><span style="font-weight:bold;font-size:16px;">${index+1}. ${label}</span>
                            <div style="font-size:14px;color:#555;margin-top:4px;">${text}</div>
                            <div style="font-size:12px;color:#8B4513;margin-top:4px;">💡 ${item.zhPrompt || item.topic}</div></div>
                            <button onclick="speakText('${text}')" style="padding:8px 20px;background:#4B0082;color:white;border:none;border-radius:15px;cursor:pointer;">🔊 朗读</button>
                        </div>
                    </div>`;
                });
                document.getElementById('contentArea').innerHTML = html;
            } catch(e) {
                document.getElementById('contentArea').innerHTML = `<div style="text-align:center;padding:40px;color:red;">加载失败: ${e.message}</div>`;
            }
        }

        async function showWritingActivity() {
            const t = translations[currentLanguage];
            document.getElementById('contentArea').innerHTML = `<div style="text-align:center;padding:40px;color:#666;"><div class="spinner"></div><p>加载写作中...</p></div>`;
            try {
                const resp = await fetch('/api/learn/english/writing?count=12');
                const json = await resp.json();
                const prompts = json.data || [];
                let html = `<h3 style="color: #8B4513; margin-bottom: 20px;">✍️ ${t.activities.english[3].name} <span style="font-size:14px;color:#666;">(${json.total} 个题目)</span></h3>
                <div style="display:grid;gap:12px;">`;
                prompts.forEach((item, index) => {
                    const title = currentLanguage === 'zh' ? item.zh : item.title;
                    const prompt = currentLanguage === 'zh' ? item.prompt_zh : item.prompt_en;
                    html += `
                    <div class="content-item" style="background:#FAF0E6;border-radius:12px;padding:15px;margin:0;">
                        <div style="font-weight:bold;font-size:16px;color:#8B4513;">${index+1}. ${title}</div>
                        <div style="font-size:14px;color:#555;margin-top:6px;line-height:1.5;">${prompt}</div>
                        <div style="font-size:12px;color:#999;margin-top:4px;">建议字数: ${item.words}词</div>
                        <button onclick="startWriting('${item.title}', '${prompt.replace(/'/g, "\\'")}')" style="margin-top:8px;padding:8px 20px;background:#8B4513;color:white;border:none;border-radius:15px;cursor:pointer;">✍️ 开始写作</button>
                    </div>`;
                });
                html += '</div>';
                document.getElementById('contentArea').innerHTML = html;
            } catch(e) {
                document.getElementById('contentArea').innerHTML = `<div style="text-align:center;padding:40px;color:red;">加载失败: ${e.message}</div>`;
            }
        }
        window.startWriting = function(title, prompt) {
            const contentArea = document.getElementById('contentArea');
            contentArea.innerHTML = `
            <h3 style="color:#8B4513;margin-bottom:20px;">✍️ ${title}</h3>
            <div style="background:#FAF0E6;padding:20px;border-radius:15px;">
                <div style="font-weight:bold;margin-bottom:15px;line-height:1.5;">${prompt}</div>
                <textarea id="writingText" style="width:100%;height:200px;padding:15px;border:2px solid #A0522D;border-radius:10px;font-size:16px;font-family:inherit;" placeholder="${currentLanguage === 'zh' ? '在这里写下你的答案...' : 'Write your answer here...'}"></textarea>
                <button onclick="submitWriting()" style="margin-top:15px;padding:12px 30px;background:#8B4513;color:white;border:none;border-radius:20px;cursor:pointer;font-weight:bold;">${currentLanguage === 'zh' ? '提交作业' : 'Submit'}</button>
                <button onclick="showWritingActivity()" style="margin-top:15px;padding:12px 30px;background:#666;color:white;border:none;border-radius:20px;cursor:pointer;margin-left:10px;">← 返回列表</button>
            </div>`;
        };

        async function showReadingActivity() {
            const t = translations[currentLanguage];
            document.getElementById('contentArea').innerHTML = `<div style="text-align:center;padding:40px;color:#666;"><div class="spinner"></div><p>加载阅读中...</p></div>`;
            try {
                const resp = await fetch('/api/learn/english/reading?count=10');
                const json = await resp.json();
                const stories = json.data || [];
                let html = `<h3 style="color: #8B4513; margin-bottom: 20px;">📖 ${t.activities.english[4].name} <span style="font-size:14px;color:#666;">(${json.total} 篇文章)</span></h3>`;
                stories.forEach(story => {
                    const displayText = currentLanguage === 'zh' ? (story.zhText || story.en).substring(0, 120) : story.en.substring(0, 120);
                    html += `
                    <div class="content-item" style="background:#FFFACD;border-radius:15px;padding:20px;margin:15px 0;cursor:pointer;" onclick="showReadingDetail('${story.title.replace(/'/g, "\\'")}')">
                        <div style="font-weight:bold;font-size:18px;margin-bottom:10px;">📚 ${story.title} / ${story.zh}</div>
                        <div style="line-height:1.6;color:#4A3728;">${displayText}...</div>
                        <div style="margin-top:10px;color:#8B4513;font-size:14px;">${story.questions ? story.questions.length + ' 个问题' : ''}</div>
                    </div>`;
                });
                document.getElementById('contentArea').innerHTML = html;
            } catch(e) {
                document.getElementById('contentArea').innerHTML = `<div style="text-align:center;padding:40px;color:red;">加载失败: ${e.message}</div>`;
            }
        }
        window.showReadingDetail = function(title) {
            const contentArea = document.getElementById('contentArea');
            fetch('/api/learn/english/reading?count=10').then(r=>r.json()).then(json => {
                const story = json.data.find(s => s.title === title);
                if (!story) return;
                const text = currentLanguage === 'zh' ? (story.zhText || story.en) : story.en;
                let html = `<h3 style="color:#8B4513;margin-bottom:15px;">📖 ${story.title}</h3>
                <div style="background:#FFFACD;border-radius:15px;padding:20px;margin:15px 0;line-height:1.8;font-size:16px;">${text}</div>
                <h4 style="color:#8B4513;margin:15px 0 10px;">📝 阅读理解问题：</h4>`;
                (story.questions || []).forEach((q, i) => {
                    html += `<div style="background:#FAF0E6;border-radius:10px;padding:12px;margin:8px 0;">
                        <div style="font-weight:bold;">Q${i+1}: ${q}</div>
                        <input type="text" id="reading-answer-${i}" placeholder="输入你的答案..." style="width:100%;padding:8px;border:1px solid #A0522D;border-radius:8px;margin-top:6px;font-size:14px;">
                        <button onclick="checkReadingAnswer(${i}, ${JSON.stringify(story.answers[i] || [])})" style="margin-top:6px;padding:6px 16px;background:#8B4513;color:white;border:none;border-radius:10px;cursor:pointer;">检查</button>
                        <span id="reading-feedback-${i}" style="margin-left:10px;font-weight:bold;"></span>
                    </div>`;
                });
                html += `<button onclick="showReadingActivity()" style="margin-top:15px;padding:10px 25px;background:#666;color:white;border:none;border-radius:15px;cursor:pointer;">← 返回阅读列表</button>`;
                contentArea.innerHTML = html;
            });
        };
        window.checkReadingAnswer = function(index, correctAnswers) {
            const input = document.getElementById('reading-answer-' + index);
            const feedback = document.getElementById('reading-feedback-' + index);
            const userInput = input.value.toLowerCase().trim();
            const isCorrect = correctAnswers.some(a => userInput.includes(a.toLowerCase()));
            if (isCorrect) { feedback.textContent = '✅ 正确！'; feedback.style.color = 'green'; input.style.borderColor = 'green'; }
            else { feedback.textContent = '❌ 再想想，提示: ' + correctAnswers[0]; feedback.style.color = 'red'; input.style.borderColor = 'red'; }
        };

        async function showSpellingActivity() {
            const t = translations[currentLanguage];
            document.getElementById('contentArea').innerHTML = `<div style="text-align:center;padding:40px;color:#666;"><div class="spinner"></div><p>加载拼写中...</p></div>`;
            try {
                const resp = await fetch('/api/learn/english/spelling?count=30');
                const json = await resp.json();
                const words = json.data || [];
                let html = `<h3 style="color: #8B4513; margin-bottom: 20px;">🎯 ${t.activities.english[5].name} <span style="font-size:14px;color:#666;">(${json.level || ''})</span></h3>
                <div style="margin-bottom:15px;display:flex;gap:8px;flex-wrap:wrap;" id="spellingLevels">
                    <button onclick="filterSpelling('初级')" class="spell-btn active" style="padding:6px 14px;border-radius:16px;border:1px solid #A0522D;background:#FFF;cursor:pointer;">初级</button>
                    <button onclick="filterSpelling('中级')" class="spell-btn" style="padding:6px 14px;border-radius:16px;border:1px solid #A0522D;background:#FFF;cursor:pointer;">中级</button>
                    <button onclick="filterSpelling('高级')" class="spell-btn" style="padding:6px 14px;border-radius:16px;border:1px solid #A0522D;background:#FFF;cursor:pointer;">高级</button>
                    <button onclick="filterSpelling('C1')" class="spell-btn" style="padding:6px 14px;border-radius:16px;border:1px solid #A0522D;background:#FFF;cursor:pointer;">专家</button>
                </div>`;
                words.forEach((word, index) => {
                    const meaning = getWordMeaning(word);
                    html += `
                    <div class="content-item" style="background:#F5DEB3;border-radius:12px;padding:20px;margin:12px 0;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                            <div><span style="font-weight:bold;font-size:20px;color:#8B4513;">${index+1}.</span> <span style="color:#666;">${meaning}</span></div>
                            <button onclick="speakText('${word}')" style="padding:6px 16px;background:#4B0082;color:white;border:none;border-radius:12px;cursor:pointer;">🔊 听发音</button>
                        </div>
                        <input type="text" id="spelling-${index}" placeholder="${currentLanguage === 'zh' ? '输入单词拼写...' : 'Type the word...'}" style="width:100%;padding:12px;border:2px solid #A0522D;border-radius:10px;font-size:16px;text-align:center;">
                        <button onclick="checkSpelling('${word.toLowerCase()}', ${index})" style="margin-top:12px;padding:10px 25px;background:#8B4513;color:white;border:none;border-radius:15px;cursor:pointer;">${t.content.check}</button>
                        <span id="spelling-feedback-${index}" style="margin-left:15px;font-weight:bold;"></span>
                    </div>`;
                });
                document.getElementById('contentArea').innerHTML = html;
            } catch(e) {
                document.getElementById('contentArea').innerHTML = `<div style="text-align:center;padding:40px;color:red;">加载失败: ${e.message}</div>`;
            }
        }
        window.filterSpelling = async function(level) {
            document.querySelectorAll('.spell-btn').forEach(b => b.classList.remove('active'));
            event.target.classList.add('active');
            document.getElementById('contentArea').innerHTML = `<div style="text-align:center;padding:40px;color:#666;"><div class="spinner"></div><p>加载中...</p></div>`;
            const resp = await fetch('/api/learn/english/spelling?count=30&level=' + encodeURIComponent(level));
            const json = await resp.json();
            const words = json.data || [];
            let html = `<h3 style="color:#8B4513;margin-bottom:20px;">🎯 拼写 - ${json.level}</h3>`;
            words.forEach((word, index) => {
                const meaning = getWordMeaning(word);
                html += `<div class="content-item" style="background:#F5DEB3;border-radius:12px;padding:20px;margin:12px 0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <div><span style="font-weight:bold;font-size:20px;color:#8B4513;">${index+1}.</span> <span style="color:#666;">${meaning}</span></div>
                        <button onclick="speakText('${word}')" style="padding:6px 16px;background:#4B0082;color:white;border:none;border-radius:12px;cursor:pointer;">🔊 听发音</button></div>
                    <input type="text" id="spelling-${index}" placeholder="输入单词拼写..." style="width:100%;padding:12px;border:2px solid #A0522D;border-radius:10px;font-size:16px;text-align:center;">
                    <button onclick="checkSpelling('${word.toLowerCase()}', ${index})" style="margin-top:12px;padding:10px 25px;background:#8B4513;color:white;border:none;border-radius:15px;cursor:pointer;">检查</button>
                    <span id="spelling-feedback-${index}" style="margin-left:15px;font-weight:bold;"></span>
                </div>`;
            });
            document.getElementById('contentArea').innerHTML = html;
        };
        window.getWordMeaning = function(word) {
            const meanings = { cat:'猫', dog:'狗', sun:'太阳', big:'大的', red:'红色', run:'跑', hat:'帽子', bed:'床', cup:'杯子', egg:'鸡蛋', fish:'鱼', book:'书', tree:'树', star:'星星', milk:'牛奶', bird:'鸟', door:'门', bell:'铃铛', frog:'青蛙', hand:'手', kite:'风筝', lamp:'灯', nest:'鸟巢', rain:'雨', soap:'肥皂', tent:'帐篷', vest:'背心', apple:'苹果', happy:'快乐', water:'水', green:'绿色', music:'音乐', dance:'跳舞', plant:'植物', river:'河流', cloud:'云', dream:'梦', bread:'面包', chair:'椅子', earth:'地球', flame:'火焰', grape:'葡萄', horse:'马', juice:'果汁', knife:'刀', lemon:'柠檬', mango:'芒果', night:'夜晚', ocean:'海洋', piano:'钢琴', sheep:'羊', table:'桌子', window:'窗户', yellow:'黄色', beautiful:'美丽的', dangerous:'危险的', elephant:'大象', hospital:'医院', important:'重要的', library:'图书馆', mountain:'山', restaurant:'餐厅', scientist:'科学家', temperature:'温度', volcano:'火山', weather:'天气', exercise:'运动', yesterday:'昨天', wonderful:'美妙的', adventure:'冒险', calendar:'日历', different:'不同的' };
            return meanings[word.toLowerCase()] || '';
        };

        function typeToCategory(type) {
            const map = {
                biology: 'science_biology', chemistry: 'science_chemistry', physics: 'science_physics',
                geology: 'science_earth', astronomy: 'science_astronomy',
                bedtime: 'stories_bedtime', castle: 'stories_fairy_tales', dragon: 'stories_fairy_tales',
                adventure: 'stories_fairy_tales',
                rhymes: 'music_rhymes', instruments: 'music_instruments', singing: 'music_singing',
                piano: 'music_instruments', violin: 'music_instruments', rhythm: 'music_rhymes', classical: 'music_classical',
                drawing: 'arts_drawing', painting: 'arts_painting', crafts: 'arts_crafts',
                drama: 'arts_drama', sculpture: 'arts_sculpture',
                coding: 'tech_coding', robotics: 'tech_robotics', ai: 'tech_ai',
                internet: 'tech_internet', electronics: 'tech_electronics',
                structure: 'eng_structure', aerospace: 'eng_aerospace', automotive: 'eng_automotive',
                industrial: 'eng_industrial', electrical: 'eng_electrical'
            };
            return map[type] || type;
        }

        async function fetchContent(category, limit) {
            try {
                const resp = await fetch(`/api/learn/content/${category}?limit=${limit || 50}`);
                const json = await resp.json();
                return json.data || [];
            } catch(e) { return []; }
        }

        async function showScienceActivity(type) {
            const t = translations[currentLanguage];
            document.getElementById('contentArea').innerHTML = `<div style="text-align:center;padding:40px;color:#666;"><div class="spinner"></div><p>${t.content.loading}</p></div>`;
            const items = await fetchContent(typeToCategory(type));
            if (!items.length) { document.getElementById('contentArea').innerHTML = `<div style="padding:40px;text-align:center;color:#8B4513;"><h3>${type}</h3><p>${t.content.loading}</p></div>`; return; }
            let html = `<h3 style="color:#8B4513;margin-bottom:20px;">🔬 ${items[0].title}</h3>`;
            items.forEach(item => {
                const c = item.content_zh && currentLanguage === 'zh' ? item.content_zh : item.content;
                html += `<div class="content-item" style="background:#F0FFF0;border-radius:12px;padding:15px;margin:10px 0;">
                    <div style="font-weight:bold;color:#2E8B57;font-size:16px;">🧪 ${item.title}</div>
                    <div style="margin-top:5px;line-height:1.5;">${c}</div></div>`;
            });
            document.getElementById('contentArea').innerHTML = html;
        }

        async function showStoriesActivity(type) {
            const t = translations[currentLanguage];
            document.getElementById('contentArea').innerHTML = `<div style="text-align:center;padding:40px;color:#666;"><div class="spinner"></div><p>${t.content.loading}</p></div>`;
            const items = await fetchContent(typeToCategory(type));
            if (!items.length) { document.getElementById('contentArea').innerHTML = `<div style="padding:40px;text-align:center;color:#8B4513;"><h3>${type}</h3><p>${t.content.loading}</p></div>`; return; }
            let html = `<h3 style="color:#8B4513;margin-bottom:20px;">📖 ${currentLanguage === 'zh' ? '故事' : 'Stories'}</h3>`;
            items.forEach(item => {
                const c = item.content_zh && currentLanguage === 'zh' ? item.content_zh : item.content;
                html += `<div class="content-item" style="background:#FFFACD;border-radius:12px;padding:15px;margin:10px 0;cursor:pointer;" onclick="alert('${(c || '').substring(0,200).replace(/'/g, "\\'").replace(/"/g, '&quot;')}')">
                    <div style="font-weight:bold;font-size:16px;">📚 ${item.title}</div>
                    <div style="margin-top:5px;font-size:14px;line-height:1.5;">${(c || '').substring(0,100)}...</div>
                </div>`;
            });
            document.getElementById('contentArea').innerHTML = html;
        }

        function showStoryDetail(story) {
            const t = translations[currentLanguage];
            const modal = document.createElement('div');
            modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 20px;';
            modal.innerHTML = `
                <div style="background: white; padding: 30px; border-radius: 20px; max-width: 700px; max-height: 85vh; overflow-y: auto;">
                    <h2 style="color: #8B4513; margin-bottom: 10px;">${story.title}</h2>
                    <p style="color: #666; margin-bottom: 20px;">${story.level} | ${story.duration}</p>
                    <div style="white-space: pre-wrap; line-height: 1.8; font-size: 16px; margin-bottom: 25px;">${story.content}</div>
                    <div style="display: flex; gap: 15px;">
                        <button onclick="this.closest('div').parentElement.remove()" style="flex: 1; padding: 12px 25px; background: #8B4513; color: white; border: none; border-radius: 20px; cursor: pointer; font-weight: bold;">${t.content.close}</button>
                        <button onclick="speakText('${story.content.replace(/'/g, "\\'").replace(/\n/g, ' ')}')" style="flex: 1; padding: 12px 25px; background: #FF8C00; color: white; border: none; border-radius: 20px; cursor: pointer; font-weight: bold;">🔊 ${t.content.speak}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        async function showMusicActivity(type) {
            const t = translations[currentLanguage];
            document.getElementById('contentArea').innerHTML = `<div style="text-align:center;padding:40px;color:#666;"><div class="spinner"></div><p>${t.content.loading}</p></div>`;
            const items = await fetchContent(typeToCategory(type));
            if (!items.length) { document.getElementById('contentArea').innerHTML = `<div style="padding:40px;text-align:center;color:#8B4513;"><h3>🎵 ${type}</h3><p>${t.content.loading}</p></div>`; return; }
            let html = `<h3 style="color:#8B4513;margin-bottom:20px;">🎵 ${type}</h3>`;
            items.forEach(item => {
                const c = item.content_zh && currentLanguage === 'zh' ? item.content_zh : item.content;
                html += `<div class="content-item" style="background:#E6E6FA;border-radius:12px;padding:15px;margin:10px 0;display:flex;align-items:center;gap:15px;">
                    <div style="font-size:32px;">🎵</div>
                    <div style="flex:1;"><div style="font-weight:bold;font-size:18px;">${item.title}</div>
                    <div style="margin-top:8px;font-size:14px;">${(c || '').substring(0,100)}...</div></div>
                    <button onclick="speakText('${item.title}')" style="padding:10px 25px;background:#9370DB;color:white;border:none;border-radius:15px;cursor:pointer;">▶️ ${t.content.play}</button>
                </div>`;
            });
            document.getElementById('contentArea').innerHTML = html;
        }

        async function showShapesActivity() {
            const t = translations[currentLanguage];
            document.getElementById('contentArea').innerHTML = `<div style="text-align:center;padding:40px;color:#666;"><div class="spinner"></div><p>${t.content.loading}</p></div>`;
            const items = await fetchContent('math_geometry');
            if (!items.length) { document.getElementById('contentArea').innerHTML = `<div style="padding:40px;text-align:center;color:#8B4513;"><h3>🔺 ${t.activities.math[4].name}</h3><p>${t.content.loading}</p></div>`; return; }
            let html = `<h3 style="color:#8B4513;margin-bottom:20px;">🔺 ${t.activities.math[4].name}</h3>`;
            items.slice(0,12).forEach(item => {
                const c = item.content_zh && currentLanguage === 'zh' ? item.content_zh : item.content;
                html += `<div style="background:#FFFAF0;border-radius:12px;padding:15px;margin:10px 0;">
                    <div style="font-weight:bold;color:#2E86C1;">⬜ ${item.title}</div>
                    <div style="margin-top:5px;font-size:14px;line-height:1.5;">${(c || '').substring(0,200)}</div></div>`;
            });
            document.getElementById('contentArea').innerHTML = html;
        }

        async function showMeasurementActivity() {
            const t = translations[currentLanguage];
            document.getElementById('contentArea').innerHTML = `<div style="text-align:center;padding:40px;color:#666;"><div class="spinner"></div><p>${t.content.loading}</p></div>`;
            const items = await fetchContent('math_measurement');
            if (!items.length) { document.getElementById('contentArea').innerHTML = `<div style="padding:40px;text-align:center;color:#8B4513;"><h3>📐 ${t.activities.math[5].name}</h3><p>${t.content.loading}</p></div>`; return; }
            let html = `<h3 style="color:#8B4513;margin-bottom:20px;">📐 ${t.activities.math[5].name}</h3>`;
            items.slice(0,10).forEach(item => {
                const c = item.content_zh && currentLanguage === 'zh' ? item.content_zh : item.content;
                html += `<div style="background:#F5DEB3;border-radius:12px;padding:15px;margin:10px 0;">
                    <div style="font-weight:bold;">📐 ${item.title}</div>
                    <div style="margin-top:5px;font-size:14px;line-height:1.5;">${(c || '').substring(0,200)}</div></div>`;
            });
            document.getElementById('contentArea').innerHTML = html;
        }

        async function showArtsActivity(type) {
            const t = translations[currentLanguage];
            document.getElementById('contentArea').innerHTML = `<div style="text-align:center;padding:40px;color:#666;"><div class="spinner"></div><p>${t.content.loading}</p></div>`;
            const items = await fetchContent(typeToCategory(type));
            if (!items.length) { document.getElementById('contentArea').innerHTML = `<div style="padding:40px;text-align:center;color:#8B4513;"><h3>🎨 ${type}</h3><p>${t.content.loading}</p></div>`; return; }
            let html = `<h3 style="color:#8B4513;margin-bottom:20px;">🎨 ${currentLanguage === 'zh' ? type : items[0].title}</h3>`;
            items.forEach(item => {
                const c = item.content_zh && currentLanguage === 'zh' ? item.content_zh : item.content;
                html += `<div style="background:#FFF0F5;border-radius:12px;padding:15px;margin:10px 0;">
                    <div style="font-weight:bold;font-size:16px;">🎨 ${item.title}</div>
                    <div style="margin-top:5px;line-height:1.6;">${c}</div></div>`;
            });
            document.getElementById('contentArea').innerHTML = html;
        }

        function showAlgebraActivity() {
            const t = translations[currentLanguage];
            const problems = [
                { q: currentLanguage === 'zh' ? 'x + 5 = 12, x = ?' : 'x + 5 = 12, x = ?', a: '7' },
                { q: currentLanguage === 'zh' ? '2x = 14, x = ?' : '2x = 14, x = ?', a: '7' },
                { q: currentLanguage === 'zh' ? 'x - 8 = 3, x = ?' : 'x - 8 = 3, x = ?', a: '11' },
                { q: currentLanguage === 'zh' ? 'x ÷ 3 = 5, x = ?' : 'x ÷ 3 = 5, x = ?', a: '15' },
                { q: currentLanguage === 'zh' ? 'x + 12 = 25, x = ?' : 'x + 12 = 25, x = ?', a: '13' },
                { q: currentLanguage === 'zh' ? '3x = 27, x = ?' : '3x = 27, x = ?', a: '9' },
                { q: currentLanguage === 'zh' ? 'x - 15 = 10, x = ?' : 'x - 15 = 10, x = ?', a: '25' },
                { q: currentLanguage === 'zh' ? 'x ÷ 4 = 8, x = ?' : 'x ÷ 4 = 8, x = ?', a: '32' },
                { q: currentLanguage === 'zh' ? '2x + 3 = 11, x = ?' : '2x + 3 = 11, x = ?', a: '4' },
                { q: currentLanguage === 'zh' ? '5x - 5 = 20, x = ?' : '5x - 5 = 20, x = ?', a: '5' }
            ];
            const instructions = currentLanguage === 'zh' ? '求出 x 的值（心算）：' : 'Find the value of x (mental math):';
            const showAnswer = currentLanguage === 'zh' ? '显示答案' : 'Show Answer';
            let html = `<h3 style="color:#8B4513;margin-bottom:20px;">🧮 ${t.activities.math[7].name}</h3>
                <p style="color:#666;margin-bottom:20px;">${instructions}</p>`;
            problems.forEach((p, i) => {
                html += `<div style="background:#F5F5DC;border-radius:12px;padding:15px;margin:10px 0;display:flex;align-items:center;justify-content:space-between;">
                    <div style="font-size:18px;font-weight:bold;color:#8B4513;">${p.q}</div>
                    <div><input id="alg-${i}" style="width:60px;padding:8px;border:2px solid #DEB887;border-radius:8px;text-align:center;font-size:16px;" placeholder="?">
                    <button onclick="checkAlgebra(${i},'${p.a}')" style="margin-left:8px;padding:8px 16px;background:#8B4513;color:white;border:none;border-radius:8px;cursor:pointer;">✓</button>
                    <span id="alg-fb-${i}" style="margin-left:8px;font-size:18px;"></span></div>
                </div>`;
            });
            html += `<button onclick="showAlgebraActivity()" style="margin-top:20px;padding:12px 30px;background:#FF8C00;color:white;border:none;border-radius:20px;cursor:pointer;font-weight:bold;">🔄 ${t.content.more}</button>`;
            document.getElementById('contentArea').innerHTML = html;
        }
        window.checkAlgebra = function(i, answer) {
            const input = document.getElementById('alg-' + i);
            const fb = document.getElementById('alg-fb-' + i);
            if (input.value.trim() === answer) { fb.textContent = '✅'; input.style.borderColor = '#2E8B57'; }
            else { fb.textContent = '❌'; input.style.borderColor = '#FF4500'; }
        }

        function showDataActivity() {
            const t = translations[currentLanguage];
            const labels = currentLanguage === 'zh' ? ['周一','周二','周三','周四','周五','周六','周日'] : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
            const values = [12, 19, 8, 15, 22, 30, 18];
            const max = Math.max(...values);
            const colors = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#98D8C8'];
            let bars = values.map((v,i) => `<div style="display:flex;align-items:center;margin:8px 0;">
                <div style="width:50px;font-size:14px;color:#8B4513;font-weight:bold;">${labels[i]}</div>
                <div style="flex:1;height:32px;background:#F5DEB3;border-radius:16px;overflow:hidden;"><div style="height:100%;width:${(v/max*100)}%;background:${colors[i]};border-radius:16px;"></div></div>
                <div style="width:40px;text-align:right;font-weight:bold;color:#4B0082;">${v}</div>
            </div>`).join('');
            const concepts = currentLanguage === 'zh'
                ? [{n:'平均数',d:'将一组数据加起来除以个数得到平均值'},{n:'最大值',d:'一组数据中最大的数'},{n:'最小值',d:'一组数据中最小的数'},{n:'范围',d:'最大值减最小值'},{n:'柱状图',d:'用柱子的高度来表示数据大小'}]
                : [{n:'Mean',d:'Sum of values divided by count'},{n:'Maximum',d:'The largest value'},{n:'Minimum',d:'The smallest value'},{n:'Range',d:'Maximum minus minimum'},{n:'Bar Chart',d:'Heights represent values'}];
            let html = `<h3 style="color:#8B4513;margin-bottom:20px;">📊 ${t.activities.math[6].name}</h3>
                <div style="background:#FFF8DC;border-radius:15px;padding:25px;margin-bottom:20px;">
                    <h4 style="color:#D2691E;margin-bottom:15px;">${currentLanguage === 'zh' ? '📊 本周温度统计（°C）' : '📊 Weekly Temperature (°C)'}</h4>
                    ${bars}
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:20px;">
                    <div style="background:#FFFAF0;border-radius:12px;padding:20px;text-align:center;">
                        <div style="font-size:14px;color:#8B4513;">${currentLanguage === 'zh' ? '平均温度' : 'Average'}</div>
                        <div style="font-size:28px;font-weight:bold;color:#4B0082;margin-top:8px;">${Math.round(values.reduce((a,b)=>a+b,0)/values.length)}°C</div></div>
                    <div style="background:#FFFAF0;border-radius:12px;padding:20px;text-align:center;">
                        <div style="font-size:14px;color:#8B4513;">${currentLanguage === 'zh' ? '最高温度' : 'Maximum'}</div>
                        <div style="font-size:28px;font-weight:bold;color:#FF4500;margin-top:8px;">${max}°C</div></div>
                </div>
                <h4 style="color:#D2691E;margin-bottom:10px;">${currentLanguage === 'zh' ? '📚 数据分析概念' : '📚 Data Concepts'}</h4>`;
            concepts.forEach(c => {
                html += `<div style="background:#FFFAF0;border-radius:10px;padding:12px;margin:8px 0;">
                    <div style="font-weight:bold;">${c.n}</div>
                    <div style="font-size:14px;line-height:1.5;">${c.d}</div></div>`;
            });
            html += `<button onclick="showDataActivity()" style="margin-top:20px;padding:12px 30px;background:#FF8C00;color:white;border:none;border-radius:20px;cursor:pointer;font-weight:bold;">🔄 ${t.content.more}</button>`;
            document.getElementById('contentArea').innerHTML = html;
        }

        async function showTechActivity(type) {
            const t = translations[currentLanguage];
            document.getElementById('contentArea').innerHTML = `<div style="text-align:center;padding:40px;color:#666;"><div class="spinner"></div><p>${t.content.loading}</p></div>`;
            const items = await fetchContent(typeToCategory(type));
            if (!items.length) { document.getElementById('contentArea').innerHTML = `<div style="padding:40px;text-align:center;color:#8B4513;"><h3>${type}</h3><p>${t.content.loading}</p></div>`; return; }
            let html = `<h3 style="color:#8B4513;margin-bottom:20px;">💻 ${items[0].title}</h3><div style="background:#FAF0E6;border-radius:15px;padding:25px;line-height:1.8;">`;
            items.forEach((item, i) => {
                const c = item.content_zh && currentLanguage === 'zh' ? item.content_zh : item.content;
                html += `<div style="display:flex;gap:12px;margin:12px 0;padding:12px;background:#FFF8DC;border-radius:10px;">
                    <div style="width:28px;height:28px;background:#8B4513;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${i+1}</div>
                    <div><strong>${item.title}</strong><br>${c}</div>
                </div>`;
            });
            html += `<button onclick="hideDetailPanel();showCategoryDetail('technology')" style="margin-top:20px;padding:10px 25px;background:#666;color:white;border:none;border-radius:15px;cursor:pointer;">← ${t.back}</button></div>`;
            document.getElementById('contentArea').innerHTML = html;
        }

        async function showEngineeringActivity(type) {
            const t = translations[currentLanguage];
            document.getElementById('contentArea').innerHTML = `<div style="text-align:center;padding:40px;color:#666;"><div class="spinner"></div><p>${t.content.loading}</p></div>`;
            const items = await fetchContent(typeToCategory(type));
            if (!items.length) { document.getElementById('contentArea').innerHTML = `<div style="padding:40px;text-align:center;color:#8B4513;"><h3>${type}</h3><p>${t.content.loading}</p></div>`; return; }
            let html = `<h3 style="color:#8B4513;margin-bottom:20px;">⚙️ ${items[0].title}</h3><div style="background:#F0F8FF;border-radius:15px;padding:25px;line-height:1.8;">`;
            items.forEach((item, i) => {
                const c = item.content_zh && currentLanguage === 'zh' ? item.content_zh : item.content;
                html += `<div style="display:flex;gap:12px;margin:10px 0;padding:10px;background:#E6F3FF;border-radius:10px;">
                    <div style="width:28px;height:28px;background:#2E86C1;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${i+1}</div>
                    <div><strong>${item.title}</strong><br>${c}</div>
                </div>`;
            });
            html += `<button onclick="hideDetailPanel();showCategoryDetail('engineering')" style="margin-top:20px;padding:10px 25px;background:#666;color:white;border:none;border-radius:15px;cursor:pointer;">← ${t.back}</button></div>`;
            document.getElementById('contentArea').innerHTML = html;
        }

        async function showMusicDetailActivity(type) {
            const t = translations[currentLanguage];
            document.getElementById('contentArea').innerHTML = `<div style="text-align:center;padding:40px;color:#666;"><div class="spinner"></div><p>${t.content.loading}</p></div>`;
            const items = await fetchContent(typeToCategory(type));
            if (!items.length) { document.getElementById('contentArea').innerHTML = `<div style="padding:40px;text-align:center;color:#8B4513;"><h3>🎵 ${type}</h3><p>${t.content.loading}</p></div>`; return; }
            let html = `<h3 style="color:#8B4513;margin-bottom:20px;">🎵 ${items[0].title}</h3><div style="background:#FFFAF0;border-radius:15px;padding:25px;line-height:1.8;">`;
            items.forEach((item, i) => {
                const c = item.content_zh && currentLanguage === 'zh' ? item.content_zh : item.content;
                html += `<div style="display:flex;gap:12px;margin:10px 0;padding:10px;background:#F0E6FF;border-radius:10px;">
                    <div style="width:28px;height:28px;background:#9370DB;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${i+1}</div>
                    <div><strong>${item.title}</strong><br>${c}</div>
                </div>`;
            });
            html += `<button onclick="hideDetailPanel();showCategoryDetail('music')" style="margin-top:20px;padding:10px 25px;background:#666;color:white;border:none;border-radius:15px;cursor:pointer;">← ${t.back}</button></div>`;
            document.getElementById('contentArea').innerHTML = html;
        }

        window.checkSpelling = function(word, index) {
            const input = document.getElementById('spelling-' + index);
            const feedback = document.getElementById('spelling-feedback-' + index);
            const userAnswer = input.value.toLowerCase().trim();
            if (userAnswer === word) {
                feedback.textContent = '✅ ' + (currentLanguage === 'zh' ? '正确！' : 'Correct!');
                feedback.style.color = 'green';
                input.style.borderColor = 'green';
                input.disabled = true;
            } else {
                feedback.textContent = '❌ ' + (currentLanguage === 'zh' ? '错误，正确答案: ' : 'Wrong, correct: ') + word;
                feedback.style.color = 'red';
                input.style.borderColor = 'red';
            }
        };

        window.submitWriting = function() {
            const text = document.getElementById('writingText');
            if (!text.value.trim()) {
                alert(currentLanguage === 'zh' ? '请先写一些内容！' : 'Please write something first!');
                return;
            }
            const wordCount = text.value.trim().split(/\s+/).length;
            const charCount = text.value.length;
            document.getElementById('contentArea').innerHTML = `
                <h3 style="color:#8B4513;margin-bottom:20px;">✍️ ${currentLanguage === 'zh' ? '作业提交成功！' : 'Assignment Submitted!'}</h3>
                <div style="background:#E6FFE6;border-radius:15px;padding:25px;text-align:center;">
                    <div style="font-size:48px;">🎉</div>
                    <p style="font-size:18px;margin:15px 0;line-height:1.6;">${currentLanguage === 'zh' ? '你的作业已提交！' : 'Your assignment has been submitted!'}</p>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-top:20px;">
                        <div style="background:#FFF;padding:15px;border-radius:10px;">
                            <div style="font-size:14px;color:#8B4513;">${currentLanguage === 'zh' ? '📝 字数' : '📝 Word Count'}</div>
                            <div style="font-size:24px;font-weight:bold;color:#4B0082;">${wordCount}</div>
                        </div>
                        <div style="background:#FFF;padding:15px;border-radius:10px;">
                            <div style="font-size:14px;color:#8B4513;">${currentLanguage === 'zh' ? '📊 字符' : '📊 Characters'}</div>
                            <div style="font-size:24px;font-weight:bold;color:#4B0082;">${charCount}</div>
                        </div>
                    </div>
                    <div style="margin-top:20px;padding:15px;background:#FFF8DC;border-radius:10px;font-style:italic;color:#666;">
                        "${text.value.substring(0, 200)}${text.value.length > 200 ? '...' : ''}"
                    </div>
                    <button onclick="showWritingActivity()" style="margin-top:20px;padding:12px 30px;background:#8B4513;color:white;border:none;border-radius:20px;cursor:pointer;font-weight:bold;">✍️ ${currentLanguage === 'zh' ? '继续写作' : 'Continue Writing'}</button>
                </div>`;
        };

        function generateMathQuestions(count, type) {
            const questions = [];
            for (let i = 0; i < count; i++) {
                let num1, num2, answer, question;
                switch (type) {
                    case 'addition':
                        num1 = Math.floor(Math.random() * 50) + 1;
                        num2 = Math.floor(Math.random() * 50) + 1;
                        answer = num1 + num2;
                        question = `${num1} + ${num2} = ?`;
                        break;
                    case 'subtraction':
                        num1 = Math.floor(Math.random() * 50) + 1;
                        num2 = Math.floor(Math.random() * num1) + 1;
                        answer = num1 - num2;
                        question = `${num1} - ${num2} = ?`;
                        break;
                    case 'multiplication':
                        num1 = Math.floor(Math.random() * 12) + 1;
                        num2 = Math.floor(Math.random() * 12) + 1;
                        answer = num1 * num2;
                        question = `${num1} × ${num2} = ?`;
                        break;
                    case 'division':
                        num2 = Math.floor(Math.random() * 12) + 1;
                        answer = Math.floor(Math.random() * 12) + 1;
                        num1 = num2 * answer;
                        question = `${num1} ÷ ${num2} = ?`;
                        break;
                    default:
                        const ops = ['+', '-', '×', '÷'];
                        const op = ops[Math.floor(Math.random() * ops.length)];
                        num1 = Math.floor(Math.random() * 30) + 1;
                        num2 = Math.floor(Math.random() * 30) + 1;
                        if (op === '+') answer = num1 + num2;
                        else if (op === '-') { num1 = Math.max(num1, num2); num2 = Math.min(num1, num2); answer = num1 - num2; }
                        else if (op === '×') answer = num1 * num2;
                        else { num1 = num1 * num2; answer = num2; }
                        question = `${num1} ${op} ${num2} = ?`;
                }
                questions.push({ id: i + 1, question, answer, type });
            }
            return questions;
        }

        function speakText(text) {
            if ('speechSynthesis' in window) {
                speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = currentLanguage === 'zh' ? 'zh-CN' : 'en-US';
                utterance.rate = 0.85;
                speechSynthesis.speak(utterance);
            }
        }

        function toggleVoice() {
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                const recognition = new SpeechRecognition();
                recognition.lang = currentLanguage === 'zh' ? 'zh-CN' : 'en-US';
                recognition.continuous = false;
                recognition.interimResults = false;
                
                recognition.onresult = function(event) {
                    const transcript = event.results[0][0].transcript;
                    document.getElementById('chatInput').value = transcript;
                    sendMessage();
                };
                
                recognition.start();
            }
        }

        function handleKeyPress(event) {
            if (event.key === 'Enter') sendMessage();
        }

        // AI API integration
        let chatSessionId = null;
        let conversationHistory = [];

        async function initChatSession() {
            try {
                const res = await fetch('/api/v1/chat/sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ child_id: 'test-child', robot_id: 'robomate-001' })
                });
                const data = await res.json();
                if (data.success) {
                    chatSessionId = data.data.session_id;
                }
            } catch (e) {
                console.log('Using local chat mode');
            }
        }

        async function sendToAI(message) {
            // Try API first
            if (chatSessionId) {
                try {
                    const res = await fetch('/api/v1/chat/messages', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            session_id: chatSessionId,
                            content: message,
                            message_type: 'text'
                        })
                    });
                    const data = await res.json();
                    if (data.success) {
                        return data.data.ai_response;
                    }
                } catch (e) {
                    // Fallback to local
                }
            }

            // Local intelligent response
            conversationHistory.push({ role: 'user', content: message });
            const response = generateLocalResponse(message);
            conversationHistory.push({ role: 'bot', content: response });
            return { content: response, intent: 'local' };
        }

        function generateLocalResponse(message) {
            const lower = message.toLowerCase();
            const isChinese = /[\u4e00-\u9fa5]/.test(message);

            // Greeting
            if (/你好|hello|hi|hey|早上好|下午好|晚上好/.test(lower)) {
                const greetings = isChinese ? [
                    '你好呀！很高兴见到你！今天想学什么呢？😊',
                    '嗨！我是你的学习伙伴，让我们开始吧！',
                    '你好！今天心情怎么样？',
                    '早上好！准备好学习新知识了吗？'
                ] : [
                    'Hello! Great to see you! What would you like to learn today?',
                    'Hi there! I\'m your learning buddy, let\'s start!',
                    'Hey! How are you feeling today?',
                    'Good to see you! Ready for some fun learning?'
                ];
                return greetings[Math.floor(Math.random() * greetings.length)];
            }

            // Math
            if (/数学|计算|加法|减法|乘法|除法|math|calculate|\d+\s*[+\-×÷]\s*\d+/.test(lower)) {
                const match = message.match(/(\d+)\s*([+\-×÷*x])\s*(\d+)/);
                if (match) {
                    const a = parseInt(match[1]);
                    const op = match[2];
                    const b = parseInt(match[3]);
                    let result;
                    switch (op) {
                        case '+': case '加': result = a + b; break;
                        case '-': case '减': result = a - b; break;
                        case '*': case 'x': case '×': case '乘': result = a * b; break;
                        case '/': case '÷': case '除': result = (b !== 0 ? a / b : '除数不能为0哦'); break;
                    }
                    return isChinese ? `这道题答案是 ${result} 呢！你算对了吗？再来一题吧！` : `The answer is ${result}! Did you get it right? Let's try another!`;
                }
                return isChinese ? '好的！我们来做数学题吧！你想练习加法、减法、乘法还是除法呢？' : 'Great! Let\'s do some math! Would you like addition, subtraction, multiplication, or division?';
            }

            // Story
            if (/故事|讲个|story|tale/.test(lower)) {
                return isChinese ? '好呀！我给你讲个小故事：从前有一只小兔子，它住在大森林里。每天它都会去探索新的地方，交新的朋友。有一天，它遇到了一只善良的小鹿，它们成了最好的朋友，一起经历了很多有趣的冒险！🐰🦌' : 'Sure! Once upon a time, there was a little rabbit who lived in a big forest. Every day it explored new places and made new friends. One day, it met a kind deer, and they became best friends, going on many exciting adventures together! 🐰🦌';
            }

            // Joke
            if (/笑话|搞笑|joke|funny|laugh/.test(lower)) {
                const jokes = isChinese ? [
                    '为什么数学书总是看起来很伤心？因为它有太多的问题！😄',
                    '小明问妈妈：妈妈，什么是代沟？妈妈说：就是我说的话你不懂，你说的话我也不懂！😂',
                    '老师：请用"果然"造句。学生：我先吃苹果，然后吃香蕉。老师：……😅'
                ] : [
                    'Why was the math book sad? Because it had too many problems! 😄',
                    'What do you call a fake noodle? An impasta! 😂',
                    'Why don\'t scientists trust atoms? Because they make up everything! 😅'
                ];
                return jokes[Math.floor(Math.random() * jokes.length)];
            }

            // Emotions
            if (/开心|高兴|快乐|happy|joy|excited/.test(lower)) {
                return isChinese ? '太棒了！看到你开心我也很开心！继续保持好心情哦！😊' : 'That\'s wonderful! Seeing you happy makes me happy too! Keep up the good mood! 😊';
            }
            if (/难过|伤心|sad|lonely|哭|cry/.test(lower)) {
                return isChinese ? '别难过，我在这里陪着你。要不要听个故事或者讲个笑话让你开心起来？💙' : 'Don\'t be sad, I\'m here with you. Would you like to hear a story or a joke to cheer you up? 💙';
            }
            if (/害怕|恐惧|scared|afraid|怕/.test(lower)) {
                return isChinese ? '别怕，有我在呢！深呼吸，一切都会好起来的。你很棒！💪' : 'Don\'t be afraid, I\'m here! Take a deep breath, everything will be okay. You\'re amazing! 💪';
            }

            // Science
            if (/科学|太空|星球|动物|植物|science|space|planet|animal/.test(lower)) {
                return isChinese ? '科学真有趣！你知道吗？地球是太阳系中第三颗行星，也是唯一已知有生命存在的星球。你想了解更多关于宇宙、动物还是植物的知识呢？🔬🌍' : 'Science is so interesting! Did you know Earth is the third planet from the Sun and the only known planet with life? Want to learn more about space, animals, or plants? 🔬🌍';
            }

            // Help
            if (/帮助|帮忙|help|what can you do/.test(lower)) {
                return isChinese ? '我可以帮你做很多事情哦！📚 数学题练习、📖 讲故事、😄 讲笑话、🔬 科学知识、🎵 音乐欣赏，还可以陪你聊天！你想做什么呢？' : 'I can help you with many things! 📚 Math practice, 📖 Storytelling, 😄 Jokes, 🔬 Science knowledge, 🎵 Music, and chatting! What would you like to do?';
            }

            // Thanks
            if (/谢谢|感谢|thanks|thank you/.test(lower)) {
                return isChinese ? '不客气！能帮到你我很开心！还有什么需要我帮忙的吗？😊' : 'You\'re welcome! I\'m happy to help! Is there anything else you need? 😊';
            }

            // Goodbye
            if (/再见|拜拜|bye|goodbye|see you/.test(lower)) {
                return isChinese ? '再见！今天和你聊天很开心！明天再见哦！👋😊' : 'Goodbye! It was fun chatting with you today! See you tomorrow! 👋😊';
            }

            // Default
            const defaults = isChinese ? [
                '这是个很好的问题！让我们一起探索吧！🌟',
                '你说的真有趣！继续和我分享吧！',
                '好主意！让我为你详细讲解。',
                '太棒了！你学得很快！',
                '嗯，我明白了！还有什么想聊的吗？',
                '你的想法很有创意！你是怎么想到的呢？',
                '学习是一件快乐的事情，让我们一起进步吧！💪'
            ] : [
                'That\'s a great question! Let\'s explore together! 🌟',
                'That\'s interesting! Keep sharing with me!',
                'Excellent idea! Let me explain in detail.',
                'Wonderful! You learn quickly!',
                'I see! Is there anything else you\'d like to chat about?',
                'Your idea is very creative! How did you think of that?',
                'Learning is fun, let\'s improve together! 💪'
            ];
            return defaults[Math.floor(Math.random() * defaults.length)];
        }

        async function sendMessage() {
            const input = document.getElementById('chatInput');
            const message = input.value.trim();
            if (!message) return;

            const chatMessages = document.getElementById('chatMessages');
            chatMessages.innerHTML += `<div class="chat-message user" style="margin-bottom: 10px; padding: 10px 15px; border-radius: 15px; max-width: 75%; margin-left: auto; background: #800080; color: white;">${escapeHtml(message)}</div>`;

            input.value = '';
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // Show typing indicator
            const typingId = 'typing-' + Date.now();
            chatMessages.innerHTML += `<div id="${typingId}" class="chat-message bot" style="margin-bottom: 10px; padding: 10px 15px; border-radius: 15px; max-width: 75%; background: #FFF8DC; border: 1px solid #A0522D;">🤖 正在思考...</div>`;
            chatMessages.scrollTop = chatMessages.scrollHeight;

            try {
                const response = await sendToAI(message);
                const typingEl = document.getElementById(typingId);
                if (typingEl) {
                    typingEl.innerHTML = `🤖 ${escapeHtml(response.content)}`;
                }
            } catch (e) {
                const typingEl = document.getElementById(typingId);
                if (typingEl) {
                    typingEl.innerHTML = `🤖 抱歉，我暂时无法回复，请稍后再试。`;
                }
            }

            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Initialize chat session on load
        document.addEventListener('DOMContentLoaded', () => {
            initChatSession();
        });
    
