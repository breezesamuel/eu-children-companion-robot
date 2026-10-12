const fs = require('fs');
const path = require('path');

// ========== GRAMMAR: 85 rules ==========
const GRAMMAR = [
  { rule: 'Present Simple - be动词', en: 'I am / You are / He/She/It is / We are / They are', zh: '表示现在状态或特征', example: 'I am happy. / She is a teacher. / They are students.' },
  { rule: 'Present Simple - 一般现在时', en: 'I/You/We/They + verb. He/She/It + verb+s/es', zh: '表示经常发生的动作或事实', example: 'I eat breakfast every day. / She reads books.' },
  { rule: 'Present Continuous', en: 'am/is/are + verb-ing', zh: '表示正在进行的动作', example: 'I am reading now. / They are playing football.' },
  { rule: 'Past Simple - be动词', en: 'I/He/She/It was. You/We/They were.', zh: '表示过去的状态', example: 'I was tired yesterday. / They were at school.' },
  { rule: 'Past Simple - 一般过去时', en: 'Subject + verb-ed / irregular verb', zh: '表示过去发生的动作', example: 'I walked to school. / She went home.' },
  { rule: 'Future Simple - will', en: 'Subject + will + verb', zh: '表示将来的动作或预测', example: 'I will call you tomorrow. / It will rain.' },
  { rule: 'Future Simple - going to', en: 'Subject + am/is/are going to + verb', zh: '表示有计划或将发生的事', example: 'I am going to visit my grandma.' },
  { rule: 'Present Perfect', en: 'have/has + past participle', zh: '表示过去发生且与现在相关的动作', example: 'I have finished my homework. / She has been to London.' },
  { rule: 'Comparatives', en: 'adjective+er / more + adjective + than', zh: '比较两者', example: 'Tom is taller than Jerry. / This book is more interesting.' },
  { rule: 'Superlatives', en: 'the + adjective+est / the most + adjective', zh: '表示最高程度', example: 'She is the fastest runner. / This is the most beautiful flower.' },
  { rule: 'Articles - a/an/the', en: 'a (consonant), an (vowel), the (specific)', zh: '冠词用法', example: 'a book, an apple, the sun' },
  { rule: 'Prepositions of Place', en: 'in, on, under, behind, next to, between', zh: '表示位置关系的介词', example: 'The cat is on the table. / The ball is under the chair.' },
  { rule: 'Prepositions of Time', en: 'at (time), on (day), in (month/year)', zh: '表示时间的介词', example: 'at 5 o\'clock, on Monday, in June' },
  { rule: 'Modal Verbs - can', en: 'can + verb (ability/possibility)', zh: '表示能力或可能性', example: 'I can swim. / Can you help me?' },
  { rule: 'Modal Verbs - must/should', en: 'must (obligation), should (advice)', zh: '必须/应该', example: 'You must stop. / You should study.' },
  { rule: 'Possessive - my/your/his/her', en: 'my, your, his, her, its, our, their', zh: '形容词性物主代词', example: 'This is my book. / Where is your bag?' },
  { rule: 'Possessive Pronouns', en: 'mine, yours, his, hers, its, ours, theirs', zh: '名词性物主代词', example: 'This book is mine. / The bag is yours.' },
  { rule: 'Question Words', en: 'what, where, when, why, who, how', zh: '疑问词', example: 'What is your name? / Where do you live?' },
  { rule: 'There is / There are', en: 'There is + singular. There are + plural.', zh: '表示存在', example: 'There is a cat. / There are three cats.' },
  { rule: 'Countable vs Uncountable', en: 'Countable: a/an, many, few. Uncountable: much, little.', zh: '可数/不可数名词', example: 'many apples, much water, few books, little time' },
  { rule: 'Adverbs of Frequency', en: 'always, usually, often, sometimes, rarely, never', zh: '频率副词', example: 'I always brush my teeth. / She sometimes walks to school.' },
  { rule: 'Imperatives', en: 'Base verb (commands/instructions)', zh: '祈使句（命令/指示）', example: 'Open the door. / Please sit down. / Don\'t run.' },
  { rule: 'Conjunctions - and/but/or', en: 'and (add), but (contrast), or (choice)', zh: '连词', example: 'I like apples and bananas. / I\'m tired but happy.' },
  { rule: 'First Conditional', en: 'If + present, will + verb', zh: '如果…就会…', example: 'If it rains, I will stay home.' },
  { rule: 'Gerunds (-ing as noun)', en: 'Verb-ing as subject/object', zh: '动名词作主语/宾语', example: 'Swimming is fun. / I like reading.' },
  // +60 more
  { rule: 'Second Conditional', en: 'If + past, would + verb', zh: '与现在事实相反的假设', example: 'If I had money, I would travel.' },
  { rule: 'Third Conditional', en: 'If + had + p.p., would have + p.p.', zh: '与过去事实相反的假设', example: 'If I had studied, I would have passed.' },
  { rule: 'Passive Voice - Present', en: 'am/is/are + past participle', zh: '现在时被动语态', example: 'The book is read by many people.' },
  { rule: 'Passive Voice - Past', en: 'was/were + past participle', zh: '过去时被动语态', example: 'The letter was written yesterday.' },
  { rule: 'Passive Voice - Future', en: 'will be + past participle', zh: '将来时被动语态', example: 'The work will be finished soon.' },
  { rule: 'Present Perfect Continuous', en: 'have/has been + verb-ing', zh: '从过去持续到现在的动作', example: 'I have been waiting for an hour.' },
  { rule: 'Past Perfect', en: 'had + past participle', zh: '过去的过去', example: 'She had already left when I arrived.' },
  { rule: 'Past Continuous', en: 'was/were + verb-ing', zh: '过去某个时间正在进行的动作', example: 'I was watching TV at 8 PM.' },
  { rule: 'Future Continuous', en: 'will be + verb-ing', zh: '将来某个时间正在进行的动作', example: 'I will be flying to Paris at this time tomorrow.' },
  { rule: 'Future Perfect', en: 'will have + past participle', zh: '将来某个时间之前完成的动作', example: 'I will have finished the report by Friday.' },
  { rule: 'Relative Clauses - who/which/that', en: 'who (people), which (things), that (both)', zh: '定语从句', example: 'The girl who is singing is my sister.' },
  { rule: 'Relative Clauses - whose/whom', en: 'whose (possession), whom (object)', zh: 'whom/whose引导的定语从句', example: 'The man whose car was stolen called the police.' },
  { rule: 'Defining vs Non-defining Clauses', en: 'Defining (essential) vs Non-defining (extra info with commas)', zh: '限定性/非限定性定语从句', example: 'My brother, who lives in London, is a doctor.' },
  { rule: 'Reported Speech - Statements', en: 'say/tell + that + clause (tense shifts back)', zh: '陈述句的间接引语', example: 'She said (that) she was tired.' },
  { rule: 'Reported Speech - Questions', en: 'ask + if/whether + statement word order', zh: '疑问句的间接引语', example: 'He asked if I liked coffee.' },
  { rule: 'Reported Speech - Commands', en: 'tell/ask + someone + to + verb', zh: '祈使句的间接引语', example: 'She told me to be quiet.' },
  { rule: 'Causative - have/get something done', en: 'have/get + object + past participle', zh: '让别人做某事', example: 'I had my hair cut yesterday.' },
  { rule: 'Causative - make/let someone do', en: 'make/let + someone + verb', zh: '使/让某人做某事', example: 'My mom made me clean my room.' },
  { rule: 'Wish + Past Simple', en: 'I wish + past simple (unreal present)', zh: '希望现在不同', example: 'I wish I knew the answer.' },
  { rule: 'Wish + Past Perfect', en: 'I wish + past perfect (regret about past)', zh: '希望过去不同（后悔）', example: 'I wish I had studied harder.' },
  { rule: 'Used to / Would', en: 'used to/would + verb (past habits)', zh: '过去常常', example: 'I used to play the piano when I was young.' },
  { rule: 'Be used to / Get used to', en: 'be/get used to + noun/gerund', zh: '习惯做某事', example: 'I am used to getting up early.' },
  { rule: 'So / Such ... that', en: 'so + adj + that / such + noun + that', zh: '如此…以至于', example: 'It was so hot that we stayed inside.' },
  { rule: 'Too / Enough', en: 'too + adj + to + verb / adj + enough + to + verb', zh: '太…而不能/足够…去做', example: 'The box is too heavy to carry. / She is old enough to drive.' },
  { rule: 'Either / Neither / Nor', en: 'either...or / neither...nor / nor', zh: '要么…要么/既不…也不', example: 'Neither Jim nor Tom was there.' },
  { rule: 'Both / All / None', en: 'both (2), all (3+), none (0)', zh: '两者都/全部/没有一个', example: 'Both of my parents are teachers.' },
  { rule: 'Each / Every', en: 'each (individual), every (group)', zh: '每个', example: 'Each student has a book. / Every student likes the teacher.' },
  { rule: 'Some / Any / No', en: 'some (positive), any (question/negative), no (zero)', zh: '一些/任何/没有', example: 'There is some milk. / Is there any sugar? / There is no water.' },
  { rule: 'Compound Words with some/any/no/every', en: 'somebody, anyone, nothing, everywhere', zh: '复合不定代词', example: 'Someone is at the door. / I have nothing to say.' },
  { rule: 'Reflexive Pronouns', en: 'myself, yourself, himself, herself, itself, ourselves, yourselves, themselves', zh: '反身代词', example: 'I hurt myself. / She taught herself English.' },
  { rule: 'Reciprocal Pronouns', en: 'each other, one another', zh: '相互代词', example: 'They love each other.' },
  { rule: 'Demonstrative Pronouns', en: 'this, that, these, those', zh: '指示代词', example: 'This is my book. / Those are yours.' },
  { rule: 'Interrogative Pronouns', en: 'who, whom, whose, which, what', zh: '疑问代词', example: 'Whose jacket is this? / Which one do you want?' },
  { rule: 'Indefinite Pronouns', en: 'someone, anything, nobody, etc.', zh: '不定代词', example: 'Everybody likes ice cream.' },
  { rule: 'Quantifiers - many/much/a lot of', en: 'many + plural, much + uncountable, a lot of + both', zh: '数量词', example: 'many books, much water, a lot of people' },
  { rule: 'Quantifiers - few/little/a few/a little', en: 'few (neg), a few (pos) + plural; little (neg), a little (pos) + uncountable', zh: '少数/少量', example: 'few friends, a little time' },
  { rule: 'Order of Adjectives', en: 'opinion-size-age-shape-color-origin-material-purpose + noun', zh: '形容词顺序', example: 'a beautiful big old round red Chinese wooden table' },
  { rule: 'Participial Adjectives -ed/-ing', en: '-ed (feeling), -ing (causing feeling)', zh: '分词形容词', example: 'I am bored. / The movie is boring.' },
  { rule: 'Linking Verbs', en: 'be, seem, appear, look, feel, taste, smell, sound, become', zh: '系动词', example: 'The food smells good. / She looks happy.' },
  { rule: 'Phrasal Verbs - Separable', en: 'verb + particle, object can go between', zh: '可分动词短语', example: 'Turn off the light. / Turn the light off.' },
  { rule: 'Phrasal Verbs - Inseparable', en: 'verb + particle, object must follow', zh: '不可分动词短语', example: 'I ran into an old friend.' },
  { rule: 'Infinitives as Subject/Object', en: 'to + verb as noun', zh: '不定式作主语/宾语', example: 'To travel is my dream. / I want to learn.' },
  { rule: 'Infinitives after Adjectives', en: 'It is + adj + to + verb', zh: '形容词后的不定式', example: 'It is important to study.' },
  { rule: 'Verbs + Gerund vs Infinitive', en: 'enjoy/like + gerund; want/decide + infinitive', zh: '接动名词/不定式动词', example: 'I enjoy reading. / I want to go.' },
  { rule: 'Verbs that change meaning with gerund/infinitive', en: 'stop/remember/forget/try + gerund vs infinitive', zh: '意义不同的动词', example: 'I stopped smoking. / I stopped to smoke.' },
  { rule: 'Prepositions + Gerund', en: 'preposition + verb-ing', zh: '介词后的动名词', example: 'Thank you for helping me.' },
  { rule: 'By + Gerund (method)', en: 'by + verb-ing (how something is done)', zh: '通过…的方式', example: 'You can improve by practicing daily.' },
  { rule: 'While / When / As (simultaneous actions)', en: 'while/when/as + clause (two actions at same time)', zh: '同时发生的动作', example: 'While I was cooking, he was watching TV.' },
  { rule: 'Although / Despite / In spite of', en: 'although + clause; despite/in spite of + noun/gerund', zh: '虽然/尽管', example: 'Although it rained, we went out. / Despite the rain, we went out.' },
  { rule: 'Because / Because of / Due to', en: 'because + clause; because of/due to + noun', zh: '因为', example: 'We stayed because it was raining. / Due to the rain, we stayed.' },
  { rule: 'So that / In order to', en: 'so that + clause (purpose); in order to + verb', zh: '为了', example: 'I studied hard so that I could pass. / I studied hard to pass.' },
  { rule: 'Unless / As long as / Provided', en: 'unless = if not; as long as/provided that = only if', zh: '除非/只要', example: 'You won\'t pass unless you study. / I will go as long as you come.' },
  { rule: 'Tag Questions', en: 'Positive statement, negative tag? / Negative statement, positive tag?', zh: '反义疑问句', example: 'You are a student, aren\'t you? / She isn\'t here, is she?' },
  { rule: 'Embedded Questions', en: 'Can you tell me + question word + statement', zh: '嵌入式问句', example: 'Can you tell me where the station is?' },
  { rule: 'Inversion after Negative Adverbs', en: 'Never/Rarely/Seldom + auxiliary + subject + verb', zh: '否定副词倒装', example: 'Never have I seen such a beautiful view.' },
  { rule: 'Inversion in Conditionals', en: 'Had I known / Were I you / Should you need', zh: '条件句倒装', example: 'Had I known, I would have come earlier.' },
  { rule: 'Cleft Sentences (It is ... that)', en: 'It is/was + emphasized part + that + rest', zh: '强调句', example: 'It was yesterday that I met her.' },
  { rule: 'What clauses (What I need is ...)', en: 'What + subject + verb + is/was + noun', zh: 'what引导的主语从句', example: 'What I need is a good rest.' },
  { rule: 'Whether / If (noun clauses)', en: 'whether/if + clause as subject/object', zh: 'whether/if引导的名词从句', example: 'I don\'t know whether he will come.' },
  { rule: 'Ellipsis (省略)', en: 'Omitting words when meaning is clear', zh: '省略', example: 'She can swim better than I (can).' },
  { rule: 'Subjunctive Mood (虚拟语气)', en: 'It is essential/vital/important that + subject + (should) + verb', zh: '虚拟语气', example: 'It is essential that you be on time.' },
  { rule: 'Numbers - Cardinal', en: 'one, two, three, hundred, thousand, million', zh: '基数词', example: 'I have three apples. / There are one hundred students.' },
  { rule: 'Numbers - Ordinal', en: 'first, second, third, fourth, fifth...', zh: '序数词', example: 'She is the first in class. / It is my tenth birthday.' },
  { rule: 'Fractions / Decimals / Percentages', en: '1/2 = a half, 0.5 = zero point five, 50% = fifty percent', zh: '分数/小数/百分数', example: 'Half of the students are girls. / 25% of the work is done.' },
  { rule: 'Dates and Time Expressions', en: 'on + date, in + month/year, at + time', zh: '日期和时间表达', example: 'on March 5th, in 2024, at 3 o\'clock' },
  { rule: 'Capitalization Rules', en: 'Capitalize: first word, proper nouns, I, days, months', zh: '大写规则', example: 'I went to Paris on Monday.' },
  { rule: 'Punctuation - Period/Comma/Question Mark', en: '. for end, , for pause, ? for question', zh: '句号/逗号/问号', example: 'Hello. How are you? I am fine, thanks.' },
  { rule: 'Punctuation - Quotation Marks / Apostrophe', en: '" " for speech, \' for possession/contraction', zh: '引号/撇号', example: 'She said, "Hello." / It\'s John\'s book.' },
  { rule: 'Common Mistakes - Your vs You\'re', en: 'Your (possessive) vs You\'re (you are)', zh: 'your和you\'re的区别', example: 'Your book is on the table. / You\'re so kind.' },
  { rule: 'Common Mistakes - Its vs It\'s', en: 'Its (possessive) vs It\'s (it is)', zh: 'its和it\'s的区别', example: 'The cat licked its paw. / It\'s raining outside.' },
  { rule: 'Common Mistakes - There/Their/They\'re', en: 'There (place), Their (possessive), They\'re (they are)', zh: 'there/their/they\'re的区别', example: 'There is a book. / Their house is big. / They\'re happy.' },
];

// ========== SPEAKING: 120 topics ==========
const TOPICS = [
  'Introduce Yourself', 'Family', 'Daily Routine', 'My Pet', 'Favorite Food', 'Weather', 'School Life',
  'Hobbies', 'Shopping', 'Directions', 'At the Restaurant', 'My Best Friend', 'Seasons', 'Dream Job',
  'Weekend Plans', 'Colors', 'Animals', 'My Room', 'Helping at Home', 'Feelings',
  // +100 more
  'My Favorite Book', 'A Trip to the Zoo', 'My Grandparents', 'Transportation', 'My Birthday Party',
  'The Beach', 'My Favorite Movie', 'A Sports Game', 'My Teacher', 'Breakfast Time',
  'Doctors and Health', 'My Neighborhood', 'A Rainy Day', 'Fruits I Like', 'My School Bag',
  'The Park', 'My Cousin', 'Cooking Dinner', 'A Sunny Day', 'Bedtime Routine',
  'My Favorite Toy', 'The Library', 'My Aunt and Uncle', 'Playing Games', 'Lunch Time',
  'The Supermarket', 'My Baby Sister', 'Drawing and Art', 'A Snowy Day', 'Brushing Teeth',
  'My Computer', 'The Playground', 'My Dad', 'Singing Songs', 'Dinner Time',
  'The Museum', 'My Neighbor', 'Dancing', 'A Windy Day', 'Getting Dressed',
  'My Bicycle', 'The Farm', 'My Mom', 'Building Blocks', 'Snack Time',
  'The Hospital', 'My Friend\'s House', 'Gardening', 'A Spring Day', 'Washing Hands',
  'My Watch', 'The Airport', 'My Uncle', 'Playing Football', 'Homework Time',
  'The Post Office', 'My Classmate', 'Fishing', 'A Summer Day', 'Cleaning My Room',
  'My Phone', 'The Train Station', 'My Sister', 'Playing Chess', 'Bath Time',
  'The Bank', 'My Teacher\'s House', 'Photography', 'An Autumn Day', 'Setting the Table',
  'My Camera', 'The Cinema', 'My Brother', 'Collecting Stamps', 'Waking Up',
  'The Dentist', 'My Cousin\'s House', 'Cycling', 'A Hot Day', 'Going to Sleep',
  'My Shoes', 'The Gym', 'My Friend\'s Pet', 'Painting Pictures', 'After School',
  'The Bakery', 'My Classmate\'s Birthday', 'Camping', 'A Cold Day', 'Weekend Trip',
  'My Backpack', 'The Swimming Pool', 'My Team', 'Reading Comics', 'Evening Walk',
  'The Bookstore', 'My Pen Pal', 'Skipping Rope', 'A Foggy Day', 'Playing with Friends',
  'My Glasses', 'The Amusement Park', 'My Club', 'Kite Flying', 'Family Dinner',
];

const ZH_TOPICS = [
  '自我介绍', '我的家庭', '日常生活', '我的宠物', '最喜欢的食物', '天气', '学校生活',
  '兴趣爱好', '购物', '问路', '在餐厅', '最好的朋友', '季节', '梦想职业',
  '周末计划', '颜色', '动物', '我的房间', '在家帮忙', '感受',
  '我最喜欢的书', '去动物园', '我的祖父母', '交通工具', '我的生日派对',
  '海滩', '我最喜欢的电影', '一场体育比赛', '我的老师', '早餐时间',
  '医生和健康', '我的社区', '下雨天', '我喜欢的水果', '我的书包',
  '公园', '我的表弟/表妹', '做晚餐', '晴天', '睡前习惯',
  '我最喜欢的玩具', '图书馆', '我的阿姨和叔叔', '玩游戏', '午餐时间',
  '超市', '我的小妹妹', '绘画和艺术', '下雪天', '刷牙',
  '我的电脑', '游乐场', '我的爸爸', '唱歌', '晚餐时间',
  '博物馆', '我的邻居', '跳舞', '刮风天', '穿衣服',
  '我的自行车', '农场', '我的妈妈', '搭积木', '零食时间',
  '医院', '我朋友的家', '园艺', '春天', '洗手',
  '我的手表', '机场', '我的叔叔', '踢足球', '做作业时间',
  '邮局', '我的同学', '钓鱼', '夏天', '打扫房间',
  '我的手机', '火车站', '我的姐姐/妹妹', '下棋', '洗澡时间',
  '银行', '我老师的家', '摄影', '秋天', '摆桌子',
  '我的相机', '电影院', '我的哥哥/弟弟', '集邮', '起床',
  '牙医', '我表弟的家', '骑自行车', '热天', '睡觉',
  '我的鞋子', '健身房', '我朋友的宠物', '画画', '放学后',
  '面包店', '我同学的生日', '露营', '冷天', '周末旅行',
  '我的背包', '游泳池', '我的团队', '看漫画', '傍晚散步',
  '书店', '我的笔友', '跳绳', '雾天', '和朋友玩',
  '我的眼镜', '游乐园', '我的俱乐部', '放风筝', '家庭晚餐',
];

function makeSpeakingTopic(topic, zh, template, prompt) {
  return { topic, zh, en: template, zhPrompt: prompt };
}

function makeSpeaking(i, topic, zh) {
  const templates = [
    `Hello! My name is ___. I am ___ years old. I like ___.`,
    `I have ___ people in my family. They are ___.`,
    `Every day, I ___. Then I ___. After that, I ___.`,
    `I have a ___. Its name is ___. It can ___.`,
    `My favorite food is ___. It tastes ___. I eat it ___.`,
    `Today is ___. The temperature is ___. I feel ___.`,
    `I study at ___. My favorite subject is ___.`,
    `I enjoy ___. I usually ___. It makes me feel ___.`,
    `Excuse me. How much is this? I'd like to buy ___.`,
    `Excuse me. Where is the ___? Go straight and turn ___.`,
    `Can I have ___, please? I'd like ___.`,
    `My best friend is ___. ___ is ___ and ___. We like to ___.`,
    `My favorite season is ___. The weather is ___. I can ___.`,
    `When I grow up, I want to be a ___. I want to ___ because ___.`,
    `This weekend, I am going to ___. First, I will ___. Then, I will ___.`,
    `My favorite color is ___. I have a ___. It is ___.`,
    `I like ___. They are ___. They can ___. They live in ___.`,
    `My room is ___. There is a ___. There are ___.`,
    `I help my ___ by ___. I also ___. It makes me feel ___.`,
    `Today I feel ___. I feel ___ because ___.`,
  ];
  const prompts = [
    '用英语介绍自己：姓名、年龄、爱好',
    '介绍你的家庭成员',
    '描述你的一天',
    '描述你的宠物或你想要的宠物',
    '介绍你最喜欢的食物',
    '描述今天的天气',
    '介绍你的学校生活',
    '介绍你的兴趣爱好',
    '模拟购物对话',
    '问路和指路对话',
    '在餐厅点餐对话',
    '介绍你最好的朋友',
    '描述你最喜欢的季节',
    '谈谈你长大后想做什么',
    '描述你的周末计划',
    '描述你喜欢的颜色和物品',
    '介绍你喜欢的动物',
    '描述你的房间',
    '描述你如何在家帮忙',
    '描述你今天的感觉',
  ];
  if (i < 20) return makeSpeakingTopic(topic, zh, templates[i], prompts[i]);
  const genPrompt = `描述这个主题：${zh}（至少说3句话）`;
  const genTemplate = `I want to talk about ${topic}. ___. ___. ___ .`;
  return makeSpeakingTopic(topic, zh, genTemplate, genPrompt);
}

const SPEAKING = TOPICS.map((t, i) => makeSpeaking(i, t, ZH_TOPICS[i] || t));

// ========== WRITING: 60 prompts ==========
const WRITING_TEMPLATES = [
  { title: 'My Best Day Ever', zh: '最棒的一天', prompt_en: 'Describe the best day you ever had. What happened? Who was there? How did you feel?', prompt_zh: '描述你最棒的一天。发生了什么？谁在那里？你感觉如何？', words: 50 },
  { title: 'A Letter to My Future Self', zh: '给未来的自己写信', prompt_en: 'Write a letter to yourself 10 years from now. What do you want to remember?', prompt_zh: '给十年后的自己写一封信。你想记住什么？', words: 80 },
  { title: 'My Hero', zh: '我的英雄', prompt_en: 'Who is your hero? This could be a family member, a teacher, or someone famous. Why?', prompt_zh: '谁是你的英雄？可以是家人、老师或名人。为什么？', words: 60 },
  { title: 'If I Could Fly', zh: '如果我能飞', prompt_en: 'Imagine you can fly anywhere. Where would you go? What would you see?', prompt_zh: '想象你可以飞到任何地方。你会去哪里？会看到什么？', words: 60 },
  { title: 'My Favorite Animal', zh: '我最喜欢的动物', prompt_en: 'Describe your favorite animal. What does it look like? Where does it live?', prompt_zh: '描述你最喜欢的动物。它长什么样？住在哪里？', words: 50 },
  { title: 'A Trip to Space', zh: '太空之旅', prompt_en: 'You are an astronaut going to space. Describe your journey and what you discover.', prompt_zh: '你是一名宇航员，正在前往太空。描述你的旅程和发现。', words: 80 },
  { title: 'How to Make a Friend', zh: '如何交朋友', prompt_en: 'Write instructions on how to make a new friend. What should you say or do?', prompt_zh: '写一篇关于如何交新朋友的指南。你应该说什么或做什么？', words: 60 },
  { title: 'My Favorite Season', zh: '我最喜欢的季节', prompt_en: 'Describe your favorite season. What is the weather like? What activities do you do?', prompt_zh: '描述你最喜欢的季节。天气如何？你做什么活动？', words: 50 },
  { title: 'The Magic Treehouse', zh: '魔法树屋', prompt_en: 'You found a magic treehouse. When you enter, you travel to another time. Where do you go?', prompt_zh: '你发现了一个魔法树屋。当你进入时，你穿越到了另一个时代。你会去哪里？', words: 80 },
  { title: 'Why Reading is Important', zh: '为什么阅读重要', prompt_en: 'Explain why reading is important. How does it help us learn and grow?', prompt_zh: '解释为什么阅读很重要。它如何帮助我们学习和成长？', words: 70 },
  { title: 'My Dream Invention', zh: '我的梦想发明', prompt_en: 'If you could invent anything, what would it be? Describe how it works and why it helps people.', prompt_zh: '如果你可以发明任何东西，会是什么？描述它的工作原理以及为什么能帮助人们。', words: 70 },
  { title: 'A Day Without Technology', zh: '没有科技的一天', prompt_en: 'Imagine a day with no phones, computers, or TV. What would you do?', prompt_zh: '想象一个没有手机、电脑或电视的日子。你会做什么？', words: 60 },
  // +48 more
  { title: 'My Dream House', zh: '梦想的房子', prompt_en: 'Describe your dream house. Where is it? How many rooms? What special features does it have?', prompt_zh: '描述你梦想中的房子。它在哪？有几个房间？有什么特别之处？', words: 70 },
  { title: 'The Best Gift I Received', zh: '收到的最好的礼物', prompt_en: 'Describe the best gift you ever received. Who gave it to you? Why was it special?', prompt_zh: '描述你收到过的最好的礼物。谁给你的？为什么特别？', words: 60 },
  { title: 'My Favorite Place in Nature', zh: '我最喜欢的自然之地', prompt_en: 'Describe your favorite natural place. It could be a forest, beach, mountain, or garden. What do you see, hear, and smell?', prompt_zh: '描述你最喜欢的自然之地。可以是森林、海滩、山脉或花园。你看到、听到和闻到了什么？', words: 70 },
  { title: 'If I Were an Animal', zh: '如果我是一种动物', prompt_en: 'If you could be any animal, which one would you be and why? Describe a day in your life as that animal.', prompt_zh: '如果你可以成为任何一种动物，你会选什么？描述你作为那种动物的一天。', words: 70 },
  { title: 'My Favorite Holiday', zh: '我最喜欢的节日', prompt_en: 'Describe your favorite holiday or festival. How do you celebrate it? What traditions do you have?', prompt_zh: '描述你最喜欢的节日。你怎么庆祝？有什么传统？', words: 60 },
  { title: 'The Most Important Lesson I Learned', zh: '我学到的最重要的教训', prompt_en: 'Describe an important life lesson you learned. What happened? How did it change you?', prompt_zh: '描述你学到的一个重要人生教训。发生了什么？它如何改变了你？', words: 80 },
  { title: 'My Ideal School', zh: '我理想中的学校', prompt_en: 'Describe your ideal school. What subjects would you study? What would the classrooms be like?', prompt_zh: '描述你理想中的学校。你会学什么科目？教室是什么样的？', words: 70 },
  { title: 'A World Without Rules', zh: '没有规则的世界', prompt_en: 'Imagine a world with no rules. What would happen? Would it be good or bad? Why?', prompt_zh: '想象一个没有规则的世界。会发生什么？是好是坏？为什么？', words: 80 },
  { title: 'How to Protect the Environment', zh: '如何保护环境', prompt_en: 'Write about what we can do to protect the environment. Give specific examples.', prompt_zh: '写写我们可以如何保护环境。给出具体的例子。', words: 70 },
  { title: 'The Person I Admire Most', zh: '我最敬佩的人', prompt_en: 'Describe the person you admire most. What qualities do they have? How have they inspired you?', prompt_zh: '描述你最敬佩的人。他们有什么品质？他们如何激励了你？', words: 80 },
  { title: 'Life in 100 Years', zh: '100年后的生活', prompt_en: 'Imagine what life will be like 100 years from now. How will people live, work, and travel?', prompt_zh: '想象100年后的生活。人们会如何生活、工作和旅行？', words: 80 },
  { title: 'My Favorite Book/Movie Character', zh: '我最喜欢的书中/电影角色', prompt_en: 'Describe your favorite character from a book or movie. What do you like about them?', prompt_zh: '描述你最喜欢的书或电影角色。你喜欢他们什么？', words: 60 },
  { title: 'The Power of Kindness', zh: '善良的力量', prompt_en: 'Write about a time when someone was kind to you or you were kind to someone. How did it make you feel?', prompt_zh: '写一次别人对你善良或你对别人善良的经历。你感觉如何？', words: 70 },
  { title: 'My Favorite Sport', zh: '我最喜欢的运动', prompt_en: 'Describe your favorite sport. How do you play it? Why do you like it?', prompt_zh: '描述你最喜欢的运动。怎么玩？你为什么喜欢它？', words: 50 },
  { title: 'If I Were President', zh: '如果我是总统', prompt_en: 'If you were president for a day, what three things would you do to make the world better?', prompt_zh: '如果你当一天总统，你会做哪三件事让世界更美好？', words: 80 },
  { title: 'The Most Beautiful Place I Have Seen', zh: '我见过的最美的地方', prompt_en: 'Describe the most beautiful place you have visited or seen in pictures. What made it special?', prompt_zh: '描述你参观过或在图片中见过的最美的地方。什么让它特别？', words: 70 },
  { title: 'My Morning Routine', zh: '我的早晨习惯', prompt_en: 'Describe your typical morning routine step by step. What time do you wake up? What do you do first?', prompt_zh: '逐步描述你典型的早晨习惯。你几点起床？先做什么？', words: 60 },
  { title: 'A World Without Music', zh: '没有音乐的世界', prompt_en: 'Imagine a world without music. How would it be different? Why is music important?', prompt_zh: '想象一个没有音乐的世界。会有什么不同？为什么音乐重要？', words: 70 },
  { title: 'Learning a New Language', zh: '学习一门新语言', prompt_en: 'Describe your experience learning English. What is easy? What is difficult? What tips would you give?', prompt_zh: '描述你学习英语的经历。什么容易？什么困难？你会给什么建议？', words: 80 },
  { title: 'My Cultural Tradition', zh: '我的文化传统', prompt_en: 'Describe an important tradition in your family or culture. How is it celebrated? Why is it meaningful?', prompt_zh: '描述你家庭或文化中的一个重要传统。如何庆祝？为什么有意义？', words: 70 },
  { title: 'How I Overcame a Challenge', zh: '我如何克服挑战', prompt_en: 'Describe a challenge you faced and how you overcame it. What did you learn from the experience?', prompt_zh: '描述你面临的一个挑战以及你如何克服它。你从中学到了什么？', words: 80 },
  { title: 'My Perfect Weekend', zh: '完美的周末', prompt_en: 'Plan your perfect weekend. What would you do from Friday evening to Sunday night?', prompt_zh: '计划你的完美周末。从周五晚上到周日晚上你会做什么？', words: 70 },
  { title: 'The Importance of Friendship', zh: '友谊的重要性', prompt_en: 'Write about why friendship is important. What makes a good friend? Share a story about a friend.', prompt_zh: '写写为什么友谊很重要。什么造就了一个好朋友？分享一个关于朋友的故事。', words: 70 },
  { title: 'If I Could Time Travel', zh: '如果我能穿越时空', prompt_en: 'If you could travel to any time period, past or future, where would you go and what would you do?', prompt_zh: '如果你可以去任何时代，过去或未来，你会去哪里？做什么？', words: 80 },
  { title: 'My Favorite Food Recipe', zh: '我最喜欢的食物食谱', prompt_en: 'Describe how to make your favorite dish. List the ingredients and explain the steps.', prompt_zh: '描述如何制作你最喜欢的菜肴。列出食材并解释步骤。', words: 70 },
  { title: 'Technology in My Life', zh: '我生活中的科技', prompt_en: 'Describe how technology affects your daily life. What devices do you use? How do they help you?', prompt_zh: '描述科技如何影响你的日常生活。你使用什么设备？它们如何帮助你？', words: 70 },
  { title: 'A World Without Water', zh: '没有水的世界', prompt_en: 'Imagine a world where water is very scarce. How would life be different? Why should we save water?', prompt_zh: '想象一个水资源稀缺的世界。生活会有什么不同？为什么我们应该节约用水？', words: 70 },
  { title: 'My Favorite Time of Day', zh: '一天中我最喜欢的时光', prompt_en: 'Describe your favorite time of day. What do you usually do? How do you feel?', prompt_zh: '描述你一天中最喜欢的时光。你通常做什么？你感觉如何？', words: 50 },
  { title: 'How to Be a Good Friend', zh: '如何做一个好朋友', prompt_en: 'Write a guide on how to be a good friend. What qualities matter most? Give examples.', prompt_zh: '写一份关于如何做好朋友的指南。什么品质最重要？举例说明。', words: 70 },
  { title: 'The Ocean and Its Mysteries', zh: '海洋及其奥秘', prompt_en: 'Describe what you know about the ocean. What creatures live there? What mysteries does it hold?', prompt_zh: '描述你对海洋的了解。什么生物生活在那里？它有什么奥秘？', words: 80 },
  { title: 'My Life as a Superhero', zh: '我的超级英雄生活', prompt_en: 'If you were a superhero, what would your powers be? How would you use them to help others?', prompt_zh: '如果你是超级英雄，你会有什么能力？你会如何用它们帮助别人？', words: 70 },
  { title: 'The Best Advice I Ever Got', zh: '我得到过的最好的建议', prompt_en: 'Describe the best advice someone has given you. Who gave it? How has it helped you?', prompt_zh: '描述别人给过你的最好的建议。谁给的？它如何帮助了你？', words: 70 },
  { title: 'A Day at the Beach', zh: '在海滩的一天', prompt_en: 'Describe a perfect day at the beach. What do you see, hear, smell, and feel?', prompt_zh: '描述在海滩完美的一天。你看到、听到、闻到和感觉到什么？', words: 60 },
  { title: 'Why I Love Learning', zh: '为什么我爱学习', prompt_en: 'Write about why you enjoy learning new things. What subjects interest you most? Why?', prompt_zh: '写写你为什么喜欢学习新东西。什么科目最让你感兴趣？为什么？', words: 60 },
  { title: 'My City Tour Guide', zh: '我的城市导游词', prompt_en: 'Imagine you are a tour guide. Describe the best places to visit in your city or town.', prompt_zh: '假设你是一名导游。描述你所在城市最值得参观的地方。', words: 80 },
  { title: 'Healthy Habits', zh: '健康习惯', prompt_en: 'Describe three healthy habits everyone should have. Why are they important? How can we practice them?', prompt_zh: '描述每个人都应该有的三个健康习惯。它们为什么重要？我们如何实践？', words: 70 },
  { title: 'If Animals Could Talk', zh: '如果动物会说话', prompt_en: 'Imagine animals could talk. What would they say? What would we learn from them?', prompt_zh: '想象动物会说话。它们会说什么？我们能从它们身上学到什么？', words: 70 },
  { title: 'My Favorite Game', zh: '我最喜欢的游戏', prompt_en: 'Describe your favorite game, indoor or outdoor. How do you play? Why is it fun?', prompt_zh: '描述你最喜欢的游戏，室内或室外。怎么玩？为什么有趣？', words: 50 },
  { title: 'A Letter to My Teacher', zh: '给老师的一封信', prompt_en: 'Write a letter to your teacher. Thank them and tell them what you have learned.', prompt_zh: '给你的老师写一封信。感谢他们并告诉他们你学到了什么。', words: 80 },
  { title: 'The Value of Money', zh: '金钱的价值', prompt_en: 'What does money mean to you? Why is it important to save? How would you spend your first salary?', prompt_zh: '金钱对你意味着什么？为什么储蓄很重要？你会怎么花你的第一份工资？', words: 70 },
  { title: 'My Dream Vacation', zh: '梦想假期', prompt_en: 'Plan your dream vacation. Where would you go? Who would you take? What would you do?', prompt_zh: '计划你的梦想假期。你会去哪里？带谁去？做什么？', words: 70 },
  { title: 'The Story of My Name', zh: '我名字的故事', prompt_en: 'Write about your name. Why were you given this name? What does it mean? Do you like it?', prompt_zh: '写写你的名字。你为什么被取这个名字？它有什么含义？你喜欢它吗？', words: 60 },
  { title: 'How to Be Happy', zh: '如何快乐', prompt_en: 'Describe what makes you happy. What advice would you give to someone who wants to be happier?', prompt_zh: '描述什么让你快乐。你会给想要更快乐的人什么建议？', words: 70 },
  { title: 'My Favorite Subject in School', zh: '我最喜欢的科目', prompt_en: 'Describe your favorite school subject. What do you learn? Why do you enjoy it?', prompt_zh: '描述你最喜欢的学校科目。你学到什么？你为什么喜欢它？', words: 50 },
  { title: 'The Four Seasons in My Country', zh: '我家乡的四季', prompt_en: 'Describe the four seasons where you live. How is each season different? Which one is best?', prompt_zh: '描述你家乡的四季。每个季节有什么不同？哪个最好？', words: 70 },
  { title: 'A Memorable Dream', zh: '一个难忘的梦', prompt_en: 'Describe a dream you remember. What happened? How did it make you feel when you woke up?', prompt_zh: '描述一个你记得的梦。发生了什么？醒来时你感觉如何？', words: 70 },
  { title: 'How to Cook My Favorite Dish', zh: '如何做我最喜欢的菜', prompt_en: 'Write step-by-step instructions for cooking your favorite dish or meal.', prompt_zh: '写出做你最喜欢的菜的步骤指南。', words: 80 },
  { title: 'The Importance of Teamwork', zh: '团队合作的重要性', prompt_en: 'Write about a time you worked in a team. Why is teamwork important? What did you learn?', prompt_zh: '写一次你团队合作的经历。为什么团队合作很重要？你学到了什么？', words: 70 },
  { title: 'My Favorite Holiday Tradition', zh: '我最喜欢的节日传统', prompt_en: 'Describe a special tradition your family has during holidays. Why is it meaningful?', prompt_zh: '描述你家在节日期间的一个特殊传统。为什么有意义？', words: 60 },
  { title: 'What I Want to Be When I Grow Up', zh: '我长大后想做什么', prompt_en: 'Describe what career you want to have when you grow up. Why does it interest you?', prompt_zh: '描述你长大后想从事的职业。你为什么对它感兴趣？', words: 60 },
  { title: 'A World Map in My Mind', zh: '我心中的世界地图', prompt_en: 'Describe the world as you imagine it. What countries or places would you like to visit? Why?', prompt_zh: '描述你想象中的世界。你想参观哪些国家或地方？为什么？', words: 70 },
  { title: 'My Favorite Weather', zh: '我最喜欢的天气', prompt_en: 'Describe your favorite type of weather. What do you like to do in this weather? How does it make you feel?', prompt_zh: '描述你最喜欢的天气。这种天气你喜欢做什么？它让你感觉如何？', words: 50 },
  { title: 'How Smartphones Changed Our Lives', zh: '智能手机如何改变了我们的生活', prompt_en: 'Describe how smartphones have changed the way people live, communicate, and learn.', prompt_zh: '描述智能手机如何改变了人们生活、交流和学习的方式。', words: 80 },
];

console.log('=== Generated English Data Summary ===');
console.log(`Grammar: ${GRAMMAR.length} rules`);
console.log(`Speaking: ${SPEAKING.length} topics`);
console.log(`Writing: ${WRITING_TEMPLATES.length} prompts`);
console.log('');

// ========== Spelling: 1000+ words across levels ==========
const SPELLING = [
  { level: '初级 (Easy)', words: ['cat','dog','sun','big','red','run','hat','bed','cup','egg','fish','book','tree','star','milk','bird','door','bell','frog','hand','kite','lamp','nest','king','ring','duck','rain','soap','tent','vest','ant','bat','cow','pen','bag','toy','box','bus','car','fox','gum','hen','ice','jam','key','lip','man','net','owl','pig','pot','ram','rug','sea','tap','van','wig','yak','zoo','ball','cake','doll','flag','girl','hill','jump','lion','moon','nose','pink','rabbit','ship','tiger','umbrella','vase','wolf','xray','yarn','zebra','apple','baby','candy','drum','eagle','flute','grape','house','igloo','jeep','koala','lemon','mango','nurse','orange','panda','queen','river','socks','turtle','uncle','violin','water','yawn','zero'] },
  { level: '中级 (Medium)', words: ['apple','happy','water','green','music','dance','plant','river','cloud','dream','bread','chair','earth','flame','grape','horse','juice','knife','lemon','mango','night','ocean','piano','queen','sheep','table','umbrella','violin','window','yellow','garden','forest','island','monkey','pencil','rocket','silver','tunnel','artist','basket','castle','donkey','engine','feather','guitar','helmet','insect','jacket','kettle','lantern','mirror','necklace','orange','palace','rabbit','saddle','temple','village','winter','anchor','bridge','candle','dragon','elbow','flavor','goblin','hammer','igloo','jigsaw','kitten','ladder','mammal','napkin','ostrich','pepper','quartz','robin','salmon','throne','tulip','velvet','walnut','cherry','dolphin','frozen','grapes','hornet','jelly','kiwi','lobster','muffin','noodle','pumpkin','raisin','spinach','toffee','vanilla','walrus'] },
  { level: '高级 (Hard)', words: ['beautiful','dangerous','elephant','familiar','generous','hospital','important','jealous','kitchen','library','mountain','natural','opinion','patient','quality','restaurant','scientist','temperature','universe','volcano','weather','exercise','yesterday','wonderful','adventure','calendar','different','emergency','furniture','gorgeous','abandon','balcony','champion','decorate','envelope','festival','grammar','handsome','imagine','journey','kingdom','leather','message','network','observe','picture','quarter','rehearse','sandwich','thunder','uniform','vulture','whisper','harvest','million','partner','present','million','billion','trillion','ceiling','foreign','height','strength','breath','climb','design','explain','height','kneel','listen','muscle','rhythm','schedule','tongue','weapon','answer','blood','build','business','doctor','double','early','earth','enough','flight','heart','honest','island','journey','knowledge','language','modern','neighbour','often','people','pharaoh','queue','salmon','subtle','tomb','tongue','wrist','written'] },
  { level: 'C1 专家 (Expert)', words: ['accomplish','brilliant','catastrophe','discipline','enthusiasm','fluorescent','government','hypothesis','independent','jurisdiction','knowledgeable','legitimate','magnificent','negotiation','obstacle','parachute','questionnaire','rhythm','signature','technique','thorough','unprecedented','vegetarian','xylophone','yacht','acquisition','bureaucracy','camouflage','deteriorate','entrepreneur','archaeology','bibliography','circumstance','conscience','controversy','correspond','courteous','criticism','disseminate','exaggerate','guarantee','hierarchy','idiosyncrasy','illuminate','inoculate','irresistible','liaison','manoeuvre','mediocre','miscellaneous','nonchalant','occurrence','parliament','perseverance','phenomenon','plagiarism','pneumonia','privilege','pronunciation','propaganda','psychology','reconnaissance','reminisce','sacrilege','simultaneous','sophisticated','spontaneity','subordinate','surveillance','symmetry','synchronize','taboo','tariff','therapeutic','tomorrow','tournament','triumph','tyranny','ubiquitous','unanimous','undermine','vaccinate','vulnerable','warranty','withhold','yield'] },
  { level: 'C2 大师 (Master)', words: ['aesthetic','ambiguous','anecdote','autonomous','charismatic','connoisseur','conspicuous','deteriorate','disseminate','ephemeral','equanimity','exacerbate','grandiloquent','idiosyncratic','incandescent','juxtaposition','mellifluous','nonchalant','obsequious','panacea','perfunctory','perspicacious','quintessential','recalcitrant','serendipity','surreptitious','ubiquitous','vicarious','vociferous','zeitgeist','assiduous','belligerent','capricious','cognizant','demagogue','dichotomy','efficacious','egregious','ennui','esoteric','fastidious','gregarious','heuristic','iconoclast','impetuous','insipid','intrepid','laconic','magnanimous','obfuscate','ostentatious','parsimonious','pragmatic','precocious','prodigal','prolific','propitious','pugnacious','quixotic','recondite','refractory','sagacious','salient','sanctimonious','sanguine','sardonic','sedulous','sycophant','taciturn','tenacious','terse','trepidation','vindictive','acumen','alacrity','ameliorate','anachronism','antipathy','aphorism','apocryphal','arduous','bellicose','chicanery','colloquial','conundrum','corroborate','deleterious','didactic','draconian','ebullient','euphemism','facetious','garrulous','iconoclastic','impecunious','pernicious','recalcitrant','reprehensible','specious','spurious','surreptitious','tempestuous','truculent','veracious'] },
  { level: 'TOEFL 核心 (TOEFL Core)', words: ['abundant','accumulate','adequate','alternative','analyze','anticipate','apparent','beneficial','capacity','component','consequence','contemporary','contribute','convention','controversy','crucial','demonstrate','distribute','diverse','eliminate','emphasis','encounter','establish','evaluate','evidence','evolution','explicit','extensive','feasible','fluctuate','generation','identical','illustrate','immense','implement','implication','inevitable','initiative','interpret','investigate','justify','maintain','modify','monitor','obtain','occupy','participate','phenomenon','portion','potential','predominant','proportion','prospect','purchase','pursue','recover','relevant','reluctant','rely','reveal','revolution','select','significant','similar','source','specific','structure','substitute','sufficient','survive','symbol','transform','ultimate','underlying','utility','vary','version','volume','widespread','abstract','accessible','accommodate','accordingly','account','accurate','achieve','adapt','adhere','advocate','affect','aggregate','allocate','alter','ambiguous','amend','annual','appreciate','approximate','assign','associate','assume','assure','attach','attain','attribute','automatic','available','aware','bias','bond','brief','bulk','capable','category','cease','challenge','channel','chapter','chart','chemical','circumstance','civil','coherent','coincide','collapse','colleague','commence','commit','commodity','communicate','community','compatible','compensate','compile','complement','complex','complicate','compound','comprehend','comprise','concede','conceive','concentrate','concept','conclude','concrete','conduct','confer','confine','confirm','conflict','conform','conscience','conscious','consent','consequence','consequently','conservation','considerable','consist','consistent','constant','constitute','constrain','construct','consult','consume','contact','contemplate','continuous','contract','contradiction','contrary','contrast','contribute','controversy','convene','convention','converse','convert','convince','cooperate','coordinate','core','corporate','correlate','correspond','counsel','create','credit','criteria','cumulative','cycle','data','debate','decade','decline','deduce','define','definite','demonstrate','denote','deny','depict','deposit','derive','designate','detect','deteriorate','determine','device','devote','differentiate','dimension','diminish','discipline','disclose','discount','discrete','discriminate','displace','display','dispose','distinct','distinguish','distort','distribute','diverse','doctrine','document','domain','domestic','dominant','draft','duration','dynamic','economy','edition','element','eliminate','embrace','emerging','emphasis','empirical','enable','encounter','enforce','enhance','enormous','ensure','entity','environment','equate','equip','equivalent','erode','essential','establish','estate','estimate','evaluate','evident','evolve','exceed','exclude','execute','exhibit','expand','expenditure','expertise','exploit','explore','expose','extension','external','extract','facilitate','factor','feasible','feature','federal','fiber','fiction','figure','finance','finite','flexible','fluctuate','focus','format','formula','forthcoming','foundation','framework','function','fund','fundamental','furthermore','generate','genuine','global','govern','grant','guarantee','guideline','hence','hierarchy','highlight','hypothesis','identical','ideology','ignorance','illegal','illusion','image','immense','immigrant','impact','implement','implication','implicit','impose','impulse','incentive','incidence','incline','income','incorporate','index','indicate','indirect','inevitable','infer','infrastructure','inherent','inhibit','initial','initiate','innovation','input','insert','insight','inspect','instability','install','instance','institute','instruct','instrument','insufficient','intact','integral','integrate','integrity','intellectual','intelligent','intense','intensity','intention','interact','intermediate','internal','interpret','interval','intervene','intrinsic','invest','investigate','invoke','isolate','issue','item','journal','justify','label','labor','launch','layer','lecture','legal','legislate','legitimate','liberal','likewise','limit','link','locate','logical','maintain','manipulate','manual','margin','mature','maximize','mechanism','media','mediate','medical','medium','mental','method','migrate','military','minimal','minimize','minimum','ministry','minor','modify','monitor','monopoly','moral','moreover','motive','multiple','mutual','negotiate','nerve','network','neutral','nevertheless','nonetheless','norm','normalize','notion','notwithstanding','nuclear','objective','obtain','obvious','occupy','offset','ongoing','option','orient','outcome','output','overall','overlap','oversee','panel','paradigm','paragraph','parallel','parameter','participate','partner','passage','passive','perceive','percent','period','persist','perspective','phenomenon','philosophy','physical','portion','pose','position','positive','potential','practitioner','precede','precise','predict','predominant','preliminary','prescribe','present','preserve','presume','previous','primarily','primary','principal','principle','prior','priority','proceed','process','professional','profound','prohibit','project','prominent','promote','prompt','proof','propagate','property','proportion','prospect','protocol','provide','provoke','publication','publish','purchase','pursue','qualitative','quantity','quote','radical','random','range','rapid','rational','react','readily','realistic','rebel','recognize','recommend','recover','refer','reference','reflect','reform','regardless','region','register','regulate','reinforce','reject','release','relevant','reluctant','rely','remain','remarkable','remedy','remote','remove','render','replicate','represent','reproduce','reputation','request','require','research','resemble','reserve','reside','residue','resolve','resort','resource','respond','restore','restrain','restrict','retain','retain','reveal','revenue','reverse','revise','revolution','rigid','role','route','scenario','schedule','scheme','scope','section','sector','secure','seek','select','sequence','series','significant','signify','similar','simulate','simultaneous','sophisticated','species','specific','specify','spectrum','sponsor','stabilize','statistics','status','steadily','stimulate','strategy','stress','structure','style','submit','subordinate','subsequent','subsidy','substitute','successive','sufficient','summarize','supplement','supposed','surplus','survive','suspend','sustain','symbol','sympathy','tackle','target','task','technique','technology','temporary','tendency','terminate','territory','testify','textile','theme','theory','therapy','thereby','thesis','thorough','threaten','threshold','trace','tradition','transform','transition','transmit','transport','trend','trigger','tutorial','ultimate','undergo','underline','underlying','undertake','uniform','unique','universal','unlike','unprecedented','upgrade','utilize','valid','variable','venture','verify','version','viable','violate','virtually','visible','vision','vital','vivid','volume','voluntary','vulnerable','whereas','widespread','willing','withdraw','yield'] },
  { level: 'IELTS 高分 (IELTS Advanced)', words: ['academic','accessible','accompany','achieve','acquisition','adaptation','adequate','administration','aggressive','allocate','alternative','ambitious','appreciate','artificial','assessment','authority','automatic','awareness','boosting','breakthrough','capability','category','circumstance','coincide','collapse','commence','communicate','community','compatible','compensate','component','comprehensive','compromise','concentrate','confront','conscious','consequently','consistency','contradict','contribute','controversy','conventional','correspond','criteria','crucial','cultivate','database','declining','deficiency','demonstrate','depression','determination','deteriorate','developing','discipline','discrimination','disparity','diverse','domestic','dominant','dramatic','duration','dynamic','economical','eliminate','emerging','empathy','empirical','empower','endanger','endeavor','enormous','enterprise','enthusiasm','entrepreneur','environment','epidemic','equality','equivalent','essential','ethnic','evaluate','evolve','excessive','exclude','exclusive','execute','exemplify','existence','exploit','exploration','exposure','extension','external','facilitate','feasible','fluctuate','forecast','formulate','foundation','fragile','friction','frustration','function','fundamental','generate','globalization','guarantee','harmony','hierarchy','highlight','hypothesis','identical','identify','ignorance','illegal','illusion','immigrant','immune','implement','implication','impose','impressive','incentive','incidence','incorporate','indicator','inevitable','influence','initiative','innovation','instance','institute','integrate','integrity','intellectual','intense','interact','interfere','intermediate','internal','interpret','intervene','intrinsic','investigate','involvement','isolate','issue','justify','legislation','legitimate','liberal','maintain','manipulate','mechanism','migration','military','minimize','modification','monitor','monopoly','motivate','multiple','mutual','negotiate','network','neutral','nevertheless','normalize','notion','nuclear','objective','obtain','obvious','occupation','offspring','ongoing','operational','opponent','opportunity','option','orientation','outcome','output','overcome','overlap','oversee','overwhelm','participate','partnership','perceive','phenomenon','philosophy','portion','poverty','preceding','predict','predominant','prejudice','preliminary','prescribe','preserve','prevail','previous','primarily','principle','prior','priority','privilege','proceed','procession','professional','profound','prohibit','projection','promote','proportion','prospect','protocol','provoke','publish','purchase','pursue','qualification','qualitative','quantity','radical','rational','recession','recognition','recommend','recover','recruit','reduce','refer','reference','reflect','reform','regardless','regulate','reinforce','reject','release','relevant','reluctant','rely','remedy','remote','render','replace','represent','reproduce','reputation','request','require','research','resemble','reservation','reside','resistance','resolution','resolve','resource','respond','restore','restrain','restrict','retain','revenue','reverse','revise','revolution','schedule','scheme','sector','security','sequence','significant','simulate','sophisticated','species','specific','sponsor','stability','statistics','status','stimulate','strategy','structure','submit','subordinate','subsequent','subsidy','substitute','sufficient','summarize','supplement','surplus','survive','suspend','sustainable','symbol','temporary','tendency','terminate','territory','testimony','therapy','thereby','thorough','threat','threshold','tradition','transfer','transform','transition','transmit','transparent','trigger','ultimate','undermine','undertake','unequal','unfold','unify','unique','universal','update','upgrade','utilize','valid','variation','venture','verify','version','via','violate','virtue','vision','vital','vivid','vulnerable','welfare','whereas','widespread','withdraw','yield'] },
];

const SPELLING_TOTAL = SPELLING.reduce((s, l) => s + l.words.length, 0);
console.log(`Spelling: ${SPELLING.length} levels, ${SPELLING_TOTAL} words`);

// Output grammar JS literal
console.log('\n=== GRAMMAR JS ===');
console.log('// ' + GRAMMAR.length + ' rules');

// Output speaking JS literal  
console.log('\n=== SPEAKING JS ===');
console.log('// ' + SPEAKING.length + ' topics');

// Output writing JS literal
console.log('\n=== WRITING JS ===');
console.log('// ' + WRITING_TEMPLATES.length + ' prompts');

// Output spelling JS
console.log('\n=== SPELLING JS ===');
console.log('// ' + SPELLING.length + ' levels, ' + SPELLING_TOTAL + ' words');

// Write the actual data files
fs.writeFileSync(path.join(__dirname, '..', 'routes', 'generated-grammar.json'), JSON.stringify(GRAMMAR, null, 2));
fs.writeFileSync(path.join(__dirname, '..', 'routes', 'generated-speaking.json'), JSON.stringify(SPEAKING, null, 2));
fs.writeFileSync(path.join(__dirname, '..', 'routes', 'generated-writing.json'), JSON.stringify(WRITING_TEMPLATES, null, 2));
fs.writeFileSync(path.join(__dirname, '..', 'routes', 'generated-spelling.json'), JSON.stringify(SPELLING, null, 2));
console.log('\nGenerated files written to routes/');
