// ==================== 欧洲儿童陪护机器人 - 完整年级课程体系 ====================
// 从幼儿园到高中的完整学习内容体系
const gradeLevels = [
    'Kindergarten (Age 3-4)', 'Kindergarten (Age 4-5)',
    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
    'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'
];
// ==================== 完整课程内容数据库 ====================
const fullCurriculum = {
    'Kindergarten (Age 3-4)': {
        math: {
            topics: ['认识数字1-10', '形状认识', '基本颜色', '大小比较', '简单计数'],
            content: [
                { lesson: '认识数字1-5', activity: '数手指游戏', explanation: '一只手有5个手指' },
                { lesson: '认识圆形和方形', activity: '找出家里的圆形物品', explanation: '盘子是圆形的，书是方形的' },
                { lesson: '红色、蓝色、黄色', activity: '颜色配对游戏', explanation: '苹果是红色的，天空是蓝色的' }
            ],
            examples: ['数数家里有几张桌子？', '哪个是圆形的？'],
            worksheets: ['画出3个苹果', '圈出红色的物品']
        },
        english: {
            topics: ['日常问候', '家人称呼', '动物名称', '基本颜色单词', '简单指令'],
            content: [
                { lesson: 'Hello! Goodbye!', activity: '问候游戏', explanation: '见面说Hello，再见说Goodbye' },
                { lesson: 'Mom, Dad, Baby', activity: '家庭树', explanation: 'Mom是妈妈，Dad是爸爸' },
                { lesson: 'Dog, Cat, Bird', activity: '动物模仿', explanation: 'Dog汪汪叫，Cat喵喵叫' }
            ],
            songs: ['Twinkle Twinkle Little Star', 'Head Shoulders Knees and Toes'],
            vocabulary: ['hello', 'goodbye', 'mom', 'dad', 'dog', 'cat', 'red', 'blue']
        },
        science: {
            topics: ['认识身体部位', '天气认知', '植物观察', '动物认识', '基本感官'],
            content: [
                { lesson: '眼睛、鼻子、嘴巴', activity: '指一指游戏', explanation: '眼睛用来看，鼻子用来闻' },
                { lesson: '晴天、雨天', activity: '天气观察', explanation: '太阳出来是晴天' },
                { lesson: '认识花和树', activity: '观察树叶', explanation: '树有树干和树叶' }
            ]
        },
        art: {
            topics: ['涂鸦', '涂色', '手工', '唱歌', '跳舞'],
            activities: ['自由涂鸦', '给画涂色', '用纸做手工']
        }
    },
    'Kindergarten (Age 4-5)': {
        math: {
            topics: ['数字1-20', '简单加法', '形状分类', '时间概念', '比较多少'],
            content: [
                { lesson: '数字1-20', activity: '数字连线', explanation: '从1数到20' },
                { lesson: '1+1=2', activity: '实物加法', explanation: '一个苹果加一个苹果等于两个苹果' },
                { lesson: '圆形、方形、三角形', activity: '形状分类', explanation: '按形状放好玩具' }
            ]
        },
        english: {
            topics: ['数字单词', '颜色单词', '食物单词', '简单句子', '英文歌曲'],
            content: [
                { lesson: 'One, Two, Three', activity: '数数游戏', explanation: 'One是1，Two是2' },
                { lesson: 'Apple, Banana, Orange', activity: '食物单词', explanation: 'Apple是苹果' }
            ]
        },
        science: {
            topics: ['季节变化', '动物分类', '植物生长', '水的三态', '简单磁铁'],
            content: [
                { lesson: '春夏秋冬', activity: '季节拼图', explanation: '春天花开，夏天热' },
                { lesson: '动物分类', activity: '动物分类卡片', explanation: '鸟类会飞，鱼会游泳' }
            ]
        }
    },
    'Grade 1': {
        math: {
            topics: ['数字1-100', '20以内加减法', '认识钟表', '人民币认识', '简单几何'],
            content: [
                { lesson: '数字到100', activity: '百数表', explanation: '十个十个地数' },
                { lesson: '5+3=8', activity: '口算练习', explanation: '加法是合起来' },
                { lesson: '认识时钟', activity: '时钟模型', explanation: '短针是时针，长针是分针' }
            ],
            problems: ['小明有5个苹果，妈妈又给了3个，现在有几个？', '8-2=?', '现在是3点，再过2小时是几点？']
        },
        english: {
            topics: ['简单句子', '日常用语', '动词学习', '英文阅读入门', '简单写作'],
            content: [
                { lesson: 'I am happy.', activity: '表情卡片', explanation: '表达情绪' },
                { lesson: 'This is a cat.', activity: '看图说话', explanation: '描述事物' }
            ],
            stories: ['The Little Cat', 'My Day'],
            grammar: ['am, is, are', 'a, an, the']
        },
        science: {
            topics: ['生物与非生物', '天气测量', '简单电路', '物质变化', '植物生长'],
            content: [
                { lesson: '什么是生物？', activity: '分类活动', explanation: '动物和植物是生物' },
                { lesson: '天气温度计', activity: '温度测量', explanation: '温度计告诉我们冷热' }
            ],
            experiments: ['种子发芽实验', '水结冰实验']
        },
        chinese: {
            topics: ['拼音学习', '简单汉字', '简单句子', '古诗背诵', '看图说话'],
            content: [
                { lesson: '声母韵母', activity: '拼音卡片', explanation: 'a、o、e' },
                { lesson: '一、二、三', activity: '写汉字', explanation: '汉字书写笔顺' }
            ]
        },
        history: {
            topics: ['我是谁', '我的家庭', '我的学校', '我的祖国'],
            content: [
                { lesson: '我的名字', activity: '自我介绍', explanation: '每个人都有名字' },
                { lesson: '家庭成员', activity: '家庭照片', explanation: '我爱我的家人' }
            ]
        },
        art: {
            topics: ['简笔画', '色彩', '手工', '唱歌', '音乐欣赏'],
            activities: ['画太阳', '折纸船', '唱国歌']
        }
    },
    'Grade 2': {
        math: {
            topics: ['100以内加减法', '乘法入门', '长度测量', '认识图形', '简单应用题'],
            content: [
                { lesson: '35+27', activity: '竖式加法', explanation: '个位对齐' },
                { lesson: '2×3=6', activity: '乘法口诀', explanation: '2个3相加' },
                { lesson: '厘米和米', activity: '测量桌子', explanation: '1米=100厘米' }
            ],
            problems: ['一本书25元，一支笔8元，一共多少元？', '3×4=?', '桌子长80厘米，椅子长40厘米，一共长多少厘米？']
        },
        english: {
            topics: ['现在进行时', '名词复数', '介词', '短文阅读', '句子写作'],
            content: [
                { lesson: 'I am eating.', activity: '动作表演', explanation: '正在做的事' },
                { lesson: 'Cats and dogs', activity: '复数变化', explanation: '一般加s' }
            ],
            stories: ['The Happy Farm', 'Our School']
        },
        science: {
            topics: ['动物生命周期', '天气变化', '简单力学', '物质分类', '环境'],
            content: [
                { lesson: '蝴蝶变态', activity: '观察毛毛虫', explanation: '卵→毛毛虫→蛹→蝴蝶' },
                { lesson: '推和拉', activity: '推箱子', explanation: '力能让物体动' }
            ]
        }
    },
    'Grade 3': {
        math: {
            topics: ['乘法表', '除法入门', '面积周长', '分数入门', '时间计算'],
            content: [
                { lesson: '乘法表', activity: '乘法练习', explanation: '1×1=1 到9×9=81' },
                { lesson: '12÷3=4', activity: '分糖果', explanation: '平均分配' },
                { lesson: '长方形面积', activity: '铺地砖', explanation: '长×宽' }
            ],
            problems: ['有15个苹果分给5个小朋友，每人几个？', '长8宽5的长方形面积是多少？']
        },
        english: {
            topics: ['一般过去时', '形容词比较级', '连词', '段落阅读', '短文写作'],
            content: [
                { lesson: 'I played yesterday.', activity: '昨天的事', explanation: '过去发生的' },
                { lesson: 'Bigger, smaller', activity: '比较物品', explanation: '比较大小' }
            ]
        },
        science: {
            topics: ['植物结构', '食物营养', '岩石土壤', '简单机械', '环境'],
            content: [
                { lesson: '植物根茎叶', activity: '种豆子', explanation: '植物各部分作用' },
                { lesson: '营养金字塔', activity: '饮食记录', explanation: '健康饮食' }
            ]
        }
    },
    'Grade 4': {
        math: {
            topics: ['多位数乘除法', '小数入门', '几何角度', '统计图表', '应用题'],
            content: [
                { lesson: '123×45', activity: '竖式乘法', explanation: '分步计算' },
                { lesson: '0.5 + 0.3', activity: '小数理解', explanation: '0.5是一半' },
                { lesson: '直角、锐角、钝角', activity: '量角器', explanation: '90度是直角' }
            ]
        },
        english: {
            topics: ['一般将来时', '副词', '从句', '阅读理解', '故事写作'],
            content: [
                { lesson: 'I will go tomorrow.', activity: '计划明天', explanation: '将要做的事' },
                { lesson: 'Quickly, slowly', activity: '动作描述', explanation: '副词修饰动词' }
            ]
        },
        science: {
            topics: ['生态系统', '简单化学', '电路', '物质变化', '力与运动'],
            content: [
                { lesson: '食物链', activity: '食物链拼图', explanation: '吃与被吃' },
                { lesson: '简单电路', activity: '连接灯泡', explanation: '电流循环' }
            ]
        }
    },
    'Grade 5': {
        math: {
            topics: ['分数运算', '小数运算', '比例', '体积', '百分数入门'],
            content: [
                { lesson: '1/2 + 1/3', activity: '分数块', explanation: '通分计算' },
                { lesson: '比例', activity: '比例尺', explanation: '按比例缩放' },
                { lesson: '正方体体积', activity: '搭积木', explanation: '边长×边长×边长' }
            ]
        },
        english: {
            topics: ['现在完成时', '被动语态', '介词短语', '复杂阅读', '记叙文写作'],
            content: [
                { lesson: 'I have finished.', activity: '完成任务', explanation: '已经完成的事' },
                { lesson: 'The book was written', activity: '被动句', explanation: '被动语态' }
            ]
        },
        science: {
            topics: ['细胞', '人体系统', '简单化学', '运动与力', '太阳系'],
            content: [
                { lesson: '细胞结构', activity: '细胞模型', explanation: '细胞是生命基本单位' },
                { lesson: '太阳系', activity: '行星模型', explanation: '八大行星' }
            ]
        }
    },
    'Grade 6': {
        math: {
            topics: ['百分数', '比例应用', '圆周长面积', '代数入门', '统计概率'],
            content: [
                { lesson: '25% = 1/4', activity: '百分数理解', explanation: '百分比' },
                { lesson: '圆面积=πr²', activity: '圆测量', explanation: '圆周率' },
                { lesson: '用x+5=10', activity: '解方程', explanation: '求未知数' }
            ]
        },
        english: {
            topics: ['虚拟语气', '非谓语动词', '定语从句', '议论文', '演讲稿'],
            content: [
                { lesson: 'If I were', activity: '假设句子', explanation: '虚拟情况' },
                { lesson: 'The book that', activity: '复杂句', explanation: '定语从句' }
            ]
        },
        science: {
            topics: ['物质结构', '生态系统', '简单物理', '人体', '地球科学'],
            content: [
                { lesson: '原子分子', activity: '分子模型', explanation: '物质构成' },
                { lesson: '生态平衡', activity: '生态瓶', explanation: '生态系统' }
            ]
        }
    },
    'Grade 7': {
        math: {
            topics: ['有理数', '一元一次方程', '几何证明', '统计概率', '函数入门'],
            content: [
                { lesson: '正负数', activity: '数轴', explanation: '有理数' },
                { lesson: '2x+3=7', activity: '解方程', explanation: '求x' },
                { lesson: '平行线', activity: '几何证明', explanation: '同位角相等' }
            ]
        },
        english: {
            topics: ['时态综合', '从句综合', '阅读理解', '议论文写作', '词汇拓展'],
            content: [
                { lesson: '时态复习', activity: '时态对比', explanation: '各种时态' },
                { lesson: '各类从句', activity: '复杂句子', explanation: '复合句' }
            ]
        },
        science: {
            topics: ['物质变化', '细胞分裂', '力与运动', '地球结构', '生态系统'],
            content: [
                { lesson: '物理化学变化', activity: '实验', explanation: '是否新物质' },
                { lesson: '细胞分裂', activity: '模型', explanation: '有丝分裂' }
            ]
        },
        physics: {
            topics: ['运动学', '力学', '声光学', '能量'],
            content: [
                { lesson: '速度计算', activity: '测量', explanation: 'v=s/t' },
                { lesson: '牛顿定律', activity: '实验', explanation: '惯性' }
            ]
        },
        chemistry: {
            topics: ['物质性质', '化学变化', '元素', '溶液'],
            content: [
                { lesson: '物理化学性质', activity: '观察', explanation: '性质描述' },
                { lesson: '化学方程式', activity: '写方程', explanation: '反应式' }
            ]
        },
        biology: {
            topics: ['细胞', '生物分类', '生态', '遗传'],
            content: [
                { lesson: '细胞结构', activity: '显微镜', explanation: '细胞器' },
                { lesson: '生物分类', activity: '分类表', explanation: '界门纲目科属种' }
            ]
        },
        history: {
            topics: ['古代文明', '中世纪', '近代史', '世界史'],
            content: [
                { lesson: '古埃及', activity: '金字塔', explanation: '法老文明' },
                { lesson: '希腊罗马', activity: '城邦', explanation: '民主起源' }
            ]
        },
        geography: {
            topics: ['地球', '地图', '气候', '资源'],
            content: [
                { lesson: '地球结构', activity: '地球仪', explanation: '七大洲四大洋' },
                { lesson: '气候类型', activity: '气候图', explanation: '不同气候' }
            ]
        }
    },
    'Grade 8': {
        math: {
            topics: ['二元一次方程', '不等式', '函数图像', '几何全等', '统计'],
            content: [
                { lesson: 'x+y=5', activity: '联立方程', explanation: '消元法' },
                { lesson: '一次函数图像', activity: '画图', explanation: 'y=kx+b' },
                { lesson: '三角形全等', activity: '证明', explanation: 'SAS,SSS' }
            ]
        },
        physics: {
            topics: ['力学深入', '能量守恒', '热学', '电磁学'],
            content: [
                { lesson: '牛顿定律', activity: '斜面实验', explanation: 'f=ma' },
                { lesson: '能量守恒', activity: '单摆', explanation: '能量转换' }
            ]
        },
        chemistry: {
            topics: ['原子结构', '周期表', '化学键', '化学反应'],
            content: [
                { lesson: '原子结构', activity: '模型', explanation: '质子中子电子' },
                { lesson: '周期表', activity: '背诵', explanation: '元素周期律' }
            ]
        },
        biology: {
            topics: ['植物学', '动物学', '人体生理', '生态'],
            content: [
                { lesson: '光合作用', activity: '实验', explanation: '光合公式' },
                { lesson: '人体系统', activity: '模型', explanation: '各系统' }
            ]
        },
        history: {
            topics: ['文艺复兴', '工业革命', '世界大战', '现代史'],
            content: [
                { lesson: '文艺复兴', activity: '艺术作品', explanation: '思想解放' },
                { lesson: '工业革命', activity: '蒸汽机', explanation: '机器时代' }
            ]
        }
    },
    'Grade 9': {
        math: {
            topics: ['二次函数', '圆', '相似三角形', '概率统计', '三角函数入门'],
            content: [
                { lesson: 'y=ax²+bx+c', activity: '抛物线', explanation: '二次函数图像' },
                { lesson: '圆的性质', activity: '证明', explanation: '切线' },
                { lesson: '三角函数', activity: '测量', explanation: 'sin,cos,tan' }
            ]
        },
        physics: {
            topics: ['电学', '磁学', '光学', '近代物理'],
            content: [
                { lesson: '电路计算', activity: '实验', explanation: '欧姆定律' },
                { lesson: '电磁波', activity: '应用', explanation: '电磁感应' }
            ]
        },
        chemistry: {
            topics: ['有机化学', '化学反应速率', '化学平衡', '酸碱盐'],
            content: [
                { lesson: '有机物', activity: '模型', explanation: '碳链' },
                { lesson: '反应速率', activity: '实验', explanation: '影响因素' }
            ]
        },
        biology: {
            topics: ['遗传学', '进化论', '生态系统', '生物工程'],
            content: [
                { lesson: 'DNA', activity: '模型', explanation: '双螺旋' },
                { lesson: '进化论', activity: '自然选择', explanation: '适者生存' }
            ]
        },
        history: {
            topics: ['现代史', '当代史', '世界格局'],
            content: [
                { lesson: '冷战', activity: '时间线', explanation: '两极格局' },
                { lesson: '全球化', activity: '讨论', explanation: '世界一体' }
            ]
        }
    },
    'Grade 10': {
        math: {
            topics: ['集合', '函数', '三角函数', '数列', '不等式', '立体几何'],
            content: [
                { lesson: '集合概念', activity: '韦恩图', explanation: '集合运算' },
                { lesson: '函数性质', activity: '分析', explanation: '单调性奇偶性' },
                { lesson: '三角函数恒等', activity: '公式', explanation: '三角恒等式' }
            ]
        },
        physics: {
            topics: ['力学', '热学', '电磁学', '光学', '原子物理'],
            content: [
                { lesson: '运动定律', activity: '解题', explanation: '综合应用' },
                { lesson: '热力学', activity: '定律', explanation: '热力学定律' }
            ]
        },
        chemistry: {
            topics: ['物质结构', '化学反应原理', '有机化学', '实验化学'],
            content: [
                { lesson: '化学键', activity: '理论', explanation: '离子键共价键' },
                { lesson: '化学反应', activity: '平衡', explanation: '化学平衡' }
            ]
        },
        biology: {
            topics: ['分子生物学', '细胞生物学', '遗传进化', '生态学'],
            content: [
                { lesson: '基因表达', activity: '过程', explanation: '转录翻译' },
                { lesson: '免疫', activity: '系统', explanation: '免疫反应' }
            ]
        }
    },
    'Grade 11': {
        math: {
            topics: ['导数', '积分', '圆锥曲线', '统计概率', '复数'],
            content: [
                { lesson: '导数概念', activity: '求导', explanation: '变化率' },
                { lesson: '积分计算', activity: '面积', explanation: '不定积分定积分' },
                { lesson: '圆锥曲线', activity: '方程', explanation: '椭圆双曲线抛物线' }
            ]
        },
        physics: {
            topics: ['力学', '电磁学', '热学', '光学', '近代物理'],
            content: [
                { lesson: '动量守恒', activity: '碰撞', explanation: '动量定理' },
                { lesson: '电磁感应', activity: '应用', explanation: '法拉第定律' }
            ]
        },
        chemistry: {
            topics: ['化学反应原理', '物质结构', '有机化学', '实验'],
            content: [
                { lesson: '电化学', activity: '电池', explanation: '原电池电解池' },
                { lesson: '有机合成', activity: '路线', explanation: '合成路线' }
            ]
        },
        biology: {
            topics: ['稳态与环境', '遗传与进化', '现代生物技术'],
            content: [
                { lesson: '内环境', activity: '稳态', explanation: '调节机制' },
                { lesson: '基因工程', activity: '技术', explanation: '重组DNA' }
            ]
        }
    },
    'Grade 12': {
        math: {
            topics: ['微积分', '线性代数', '概率统计', '几何证明', '数学应用'],
            content: [
                { lesson: '微积分应用', activity: '实际问题', explanation: '优化问题' },
                { lesson: '矩阵', activity: '运算', explanation: '线性变换' },
                { lesson: '统计推断', activity: '假设检验', explanation: '统计应用' }
            ]
        },
        physics: {
            topics: ['力学综合', '电磁学综合', '近代物理', '物理应用'],
            content: [
                { lesson: '综合应用', activity: '解题', explanation: '物理建模' },
                { lesson: '相对论', activity: '理解', explanation: '狭义相对论' }
            ]
        },
        chemistry: {
            topics: ['物质结构与性质', '化学反应原理', '有机化学基础', '实验化学'],
            content: [
                { lesson: '物质结构', activity: '综合', explanation: '结构决定性质' },
                { lesson: '实验设计', activity: '实验', explanation: '探究实验' }
            ]
        },
        biology: {
            topics: ['现代生物技术', '生态学', '生物科学与社会'],
            content: [
                { lesson: '生物技术', activity: '进展', explanation: '基因编辑' },
                { lesson: '生态工程', activity: '设计', explanation: '生态修复' }
            ]
        }
    }
};
// ==================== AI 对话内容数据库 ====================
const aiKnowledge = {
    math: {
        topics: ['加法', '减法', '乘法', '除法', '分数', '小数', '几何', '代数', '统计', '概率', '微积分', '三角函数'],
        explain: (topic, level) => {
            const explanations = {
                '加法': '加法是把两个或多个数合起来的运算。比如 2+3=5，表示2个加上3个等于5个。',
                '减法': '减法是从一个数里减去另一个数。比如 5-3=2，表示从5个里拿走3个剩下2个。',
                '乘法': '乘法是相同数的加法的简便运算。比如 3×4=12，表示3个4相加或4个3相加。',
                '除法': '除法是平均分配的运算。比如 12÷3=4，表示把12平均分成3份，每份是4。',
                '分数': '分数表示一个整体被分成若干份。比如1/2表示一半，3/4表示四分之三。',
                '小数': '小数是分数的另一种写法。0.5就是1/2，0.25就是1/4。',
                '三角形面积': '三角形的面积等于底乘以高除以2。公式是：面积 = (底×高)/2。',
                '圆面积': '圆的面积是π乘以半径的平方。公式是：面积 = πr²。'
            };
            return explanations[topic] || '让我们一起来学习这个知识点吧！';
        },
        problems: (grade) => {
            const problems = {
                'Grade 1': ['3+5=?', '10-4=?', '有5个苹果，吃了2个，还剩几个？'],
                'Grade 2': ['12×3=?', '48÷4=?', '一个本子5元，买3个要多少钱？'],
                'Grade 3': ['1/2 + 1/3=?', '长方形长8宽5，面积是多少？'],
                'Grade 4': ['0.5 + 0.75=?', '一个圆的半径是3，面积是多少？'],
                'Grade 5': ['2x + 3 = 7，求x=?'],
                'Grade 6': ['25% of 80=?'],
                'Grade 7': ['x + y = 5, 2x - y = 4，求x和y'],
                'Grade 8': ['x² - 5x + 6 = 0，求x']
            };
            return problems[grade] || ['来做一道练习题吧！'];
        }
    },
    english: {
        translate: (word => {
            const dict = {
                'hello': '你好', 'goodbye': '再见', 'apple': '苹果', 'book': '书',
                'cat': '猫', 'dog': '狗', 'happy': '快乐', 'school': '学校',
                'teacher': '老师', 'student': '学生', 'friend': '朋友', 'love': '爱',
                'water': '水', 'sun': '太阳', 'moon': '月亮', 'star': '星星',
                'one': '一', 'two': '二', 'three': '三', 'four': '四', 'five': '五'
            };
            return dict[word.toLowerCase()] || '抱歉，我需要学习更多词汇！';
        }),
        grammar: (topic) => {
            const rules = {
                '现在进行时': '现在进行时表示正在做的事，结构是：主语 + be动词 + 动词ing。例如：I am eating. 我正在吃东西。',
                '一般过去时': '一般过去时表示过去发生的事，动词要用过去式。例如：I played football yesterday. 我昨天踢了足球。',
                '一般将来时': '一般将来时表示将要做的事，用will。例如：I will go to school tomorrow. 我明天要去上学。',
                '比较级': '比较级用于比较两个事物，一般加er。例如：bigger（更大），smaller（更小）。',
                '最高级': '最高级用于三个或以上事物，一般加est。例如：biggest（最大），smallest（最小）。'
            };
            return rules[topic] || '让我们一起学习语法吧！';
        }
    },
    science: {
        explain: (topic) => {
            const facts = {
                '为什么天是蓝的': '天空看起来是蓝色的，是因为太阳光中的蓝光更容易被空气分子散射。',
                '为什么会下雨': '当云中的水滴太重了，就会掉下来变成雨。',
                '植物怎么生长': '植物通过光合作用，利用阳光、水和二氧化碳制造食物。',
                '什么是光合作用': '光合作用是植物利用阳光把水和二氧化碳变成葡萄糖和氧气的过程。',
                '为什么会有四季': '因为地球绕太阳转，地轴是倾斜的，所以不同季节太阳照射角度不同。',
                '彩虹怎么形成': '彩虹是阳光穿过雨滴，折射和反射形成的。',
                '为什么磁铁能吸铁': '磁铁有磁场，能吸引铁磁性物质。',
                '人为什么要呼吸': '我们需要氧气，呼吸把氧气吸进血液，排出二氧化碳。',
                '什么是DNA': 'DNA是遗传物质，像一本指令书，告诉身体怎么生长和工作。',
                '什么是细胞': '细胞是生命的基本单位，所有生物都是由细胞组成的。',
                '什么是原子': '原子是物质的基本粒子，由质子、中子和电子组成。',
                '牛顿定律': '牛顿第一定律：物体会保持静止或匀速运动，除非有力改变它。',
                '什么是重力': '重力是物体之间的吸引力，地球的重力让我们站在地上。'
            };
            return facts[topic] || '这是个很好的问题！让我们一起探索吧！';
        }
    },
    history: {
        events: {
            '古埃及': '古埃及文明在尼罗河流域，法老们建造了金字塔。',
            '古希腊': '古希腊是民主制度的发源地，有很多哲学家和科学家。',
            '罗马帝国': '罗马帝国曾统治大片土地，建造了很多工程。',
            '文艺复兴': '文艺复兴是艺术和科学的复兴时期。',
            '工业革命': '工业革命用机器代替手工，改变了世界。',
            '第一次世界大战': '1914-1918年的第一次世界大战。',
            '第二次世界大战': '1939-1945年的第二次世界大战。'
        }
    },
    stories: {
        '龟兔赛跑': '兔子跑得很快，乌龟跑得很慢。比赛时兔子睡觉了，乌龟一直爬，最后赢了。这个故事告诉我们不要骄傲，坚持就是胜利。',
        '狼来了': '放羊的孩子多次谎报狼来了，最后狼真的来了，没人相信他。这个故事告诉我们要诚实。',
        '乌鸦喝水': '乌鸦想喝瓶子里的水，它把小石子放进瓶子，水位上升，喝到了水。这个故事告诉我们要动脑筋。',
        '小猫钓鱼': '小猫钓鱼时三心二意，捉蝴蝶、追蜻蜓，最后没钓到鱼。这个故事告诉我们做事要专心。',
        '三只小猪': '三只小猪盖房子，老大老二偷懒盖草房木房，老三盖砖房，最后砖房保护了它们。这个故事告诉我们做事要认真。'
    },
    jokes: [
        '为什么数学书总是看起来很伤心？因为它有太多问题！',
        '为什么6怕7？因为7 8 9！（7 ate 9）',
        '什么东西有头有脚却不能走？桌子！',
        '为什么鱼为什么不说话？因为它们怕把水喝进去！',
        '什么东西越洗越脏？水！'
    ],
    encouragements: [
        '太棒了！你真聪明！',
        '做得好！继续加油！',
        '你越来越棒了！',
        '真为你骄傲！',
        '你是最棒的！',
        '继续努力，你能做到的！'
    ]
};
// ==================== STEM 活动数据库（按年级） ====================
const stemActivities = {
    'Kindergarten (Age 3-4)': [
        { name: '数数积木塔', category: 'Engineering', description: '用积木搭高塔', materials: '积木', steps: ['把积木一块一块往上搭'], learning: '平衡和空间感' },
        { name: '颜色分类', category: 'Science', description: '把玩具按颜色分类', materials: '彩色玩具', steps: ['找出红色的', '找出蓝色的'], learning: '颜色识别' }
    ],
    'Kindergarten (Age 4-5)': [
        { name: '简单分类', category: 'Science', description: '把物品分类', materials: '各种小物品', steps: ['按形状分', '按颜色分'], learning: '分类思维' },
        { name: '种豆子', category: 'Science', description: '观察豆子发芽', materials: '豆子、杯子、水', steps: ['放豆子', '加水', '观察'], learning: '植物生长' }
    ],
    'Grade 1': [
        { name: '影子游戏', category: 'Science', description: '观察影子变化', materials: '手电筒、纸', steps: ['在阳光下站', '看影子', '不同时间看'], learning: '光影关系' },
        { name: '简单测量', category: 'Math', description: '用手量桌子', materials: '手', steps: ['量长', '量宽'], learning: '测量概念' }
    ],
    'Grade 2': [
        { name: '电路初探', category: 'Technology', description: '连接简单电路', materials: '电池、灯泡、导线', steps: ['连接导线', '装电池', '看灯泡亮'], learning: '电路知识' },
        { name: '磁铁探索', category: 'Science', description: '测试什么能吸', materials: '磁铁、各种物品', steps: ['试吸铁', '试吸塑料'], learning: '磁性' }
    ],
    'Grade 3': [
        { name: '水的净化', category: 'Science', description: '简单过滤', materials: '瓶子、沙子、布', steps: ['做过滤器', '过滤脏水'], learning: '水净化' },
        { name: '桥梁设计', category: 'Engineering', description: '用纸搭桥', materials: '纸、胶带', steps: ['设计', '测试'], learning: '结构' }
    ],
    'Grade 4': [
        { name: '自制指南针', category: 'Science', description: '做指南针', materials: '针、磁铁、水', steps: ['磁化针', '水上浮'], learning: '磁场' },
        { name: '天气记录', category: 'Science', description: '记录一周天气', materials: '本子', steps: ['每天记', '画图表'], learning: '数据收集' }
    ],
    'Grade 5': [
        { name: 'DNA模型', category: 'Biology', description: '做DNA模型', materials: '彩纸、牙签', steps: ['扭成双螺旋', '配对'], learning: 'DNA结构' },
        { name: '简单机械', category: 'Physics', description: '杠杆、滑轮', materials: '简单材料', steps: ['做杠杆', '做滑轮'], learning: '简单机械' }
    ],
    'Grade 6': [
        { name: '太阳能小车', category: 'Engineering', description: '做太阳能小车', materials: '太阳能板、马达', steps: ['组装', '测试'], learning: '可再生能源' },
        { name: '水质检测', category: 'Science', description: '测试水质', materials: 'pH试纸', steps: ['测试', '记录'], learning: '水质' }
    ]
};
// ==================== 导出内容 ====================
if (typeof module !== 'undefined') {
    module.exports = {
        gradeLevels,
        fullCurriculum,
        aiKnowledge,
        stemActivities
    };
}
