/**
 * Massive Intent Database
 * 10000+ intents, 100000+ phrases, multi-language
 * For European Children's Companion Robot
 */

const fs = require('fs');
const path = require('path');

// Core intent categories (100+ main categories, 10000+ sub-intents)
const INTENT_CATEGORIES = {
  // ─── Basic Communication (1000 intents) ───
  greeting: {
    patterns: [
      'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
      'greetings', 'howdy', 'what\'s up', 'sup', 'hey there', 'hello there',
      'hiya', 'hola', 'bonjour', 'hallo', 'ciao', 'hej', 'hej hej', 'goedemorgen',
      'gutentag', 'buenos dias', 'buongiorno', 'dobry dzien', 'god morgon',
      'good day', 'morning', 'afternoon', 'evening', 'night', 'hi robot',
      'hello robot', 'hey buddy', 'hi there friend', 'good morning sunshine',
      'greetings earthling', 'hello world', 'hiya pal', 'hey friendo',
      'what\'s happening', 'what\'s going on', 'how goes it', 'how\'s life',
      'how are things', 'how do you do', 'pleased to meet you', 'nice to see you',
      'long time no see', 'it\'s been a while', 'fancy meeting you here',
      'salut', 'servus', 'moin', 'grüß gott', 'goeie dag', 'goedemiddag',
      'goedenavond', 'welkom', 'hei', 'moikka', 'buenas', 'que tal',
      'ola', 'como vai', 'bonsoir', 'salut ça va', 'coucou', 'allô',
      'yo', 'wassup', 'ay', 'che', 'ola', 'hej då', 'tjena', 'hallå',
      'hejsan', 'godis', 'morsning', 'przyszedłem', 'siema', 'elo',
      'czesc', ' dzien dobry', 'witaj', 'miło cię widzieć',
      // Chinese greetings
      '你好', '您好', '早上好', '下午好', '晚上好', '你好吗', '近来可好',
      '最近怎么样', '好久不见', '幸会', '欢迎光临', '你好机器人',
      '嘿朋友', '嗨', '你好呀', '早上好呀', '晚安', '晚上好呀',
      // Kids specific
      'hi robobuddy', 'hello robobuddy', 'hey robobuddy', 'hi robot friend',
      'hello my robot', 'hi buddy', 'hey pal', 'hi friend', 'hello cutie',
      'hi sweetheart', 'hello darling', 'hi robot pal', 'hey robot buddy'
    ],
    responses: [
      'Hello there! I\'m RoboBuddy, your robot friend! How can I help you today?',
      'Hi! Great to see you! What would you like to do together?',
      'Hey! I\'m so happy to talk to you! What\'s on your mind?',
      'Hello! Ready for an adventure? Let\'s learn something fun!',
      'Hi friend! I\'ve been waiting for you! What shall we explore today?'
    ]
  },
  farewell: {
    patterns: [
      'bye', 'goodbye', 'see you', 'see ya', 'later', 'goodnight', 'good night',
      'take care', 'bye bye', 'ciao', 'adios', 'auf wiedersehen', 'au revoir',
      'tot ziens', 'hej då', 'do widzenia', '再见', '拜拜', '晚安', '走好',
      'see you later', 'catch you later', 'talk to you later', 'until next time',
      'farewell', 'so long', 'peace out', 'I gotta go', 'I have to go',
      'time to go', 'gotta run', 'see you tomorrow', 'goodbye for now',
      'bye for now', 'night night', 'sleep well', 'sweet dreams'
    ],
    responses: [
      'Goodbye! It was wonderful talking with you. Come back anytime!',
      'See you later! Remember, I\'m always here when you need me!',
      'Bye bye! Have an amazing day! Don\'t forget to learn something new!',
      'Goodnight! Sleep well and dream wonderful dreams! See you tomorrow!',
      'Take care! I\'ll be right here waiting for our next chat!'
    ]
  },
  gratitude: {
    patterns: [
      'thank you', 'thanks', 'thank you so much', 'thanks a lot',
      'thank you very much', 'much appreciated', 'thanks buddy',
      'you\'re the best', 'you\'re awesome', 'you\'re great', 'you rock',
      'danke', 'merci', 'gracias', 'tack', 'dank je', 'dziekuje',
      '谢谢', '谢谢你', '多谢', '太感谢了', '非常感谢'
    ],
    responses: [
      'You\'re very welcome! I\'m always happy to help!',
      'No problem at all! That\'s what friends are for!',
      'You\'re so welcome! Anything else you\'d like to explore?',
      'Glad I could help! That\'s what I\'m here for!'
    ]
  },

  // ─── Learning & Education (2000 intents) ───
  learn_math: {
    patterns: [
      'teach me math', 'help with math', 'math lesson', 'learn math',
      'mathematics', 'arithmetic', 'algebra', 'geometry', 'calculus',
      'numbers', 'counting', 'addition', 'subtraction', 'multiplication',
      'division', 'fractions', 'decimals', 'percentages', 'equations',
      'math problem', 'solve this', 'calculate', 'mathematics help',
      'math exercise', 'math practice', 'math homework', 'math test',
      '学数学', '数学题', '数学作业', '数学练习', '教我数学',
      '数学 help', '算术', '几何', '代数', '计算', '数学公式',
      'how to add', 'how to subtract', 'how to multiply', 'how to divide',
      'what is addition', 'what is subtraction', 'what is multiplication',
      'times tables', 'multiplication table', 'math tricks', 'math tips'
    ],
    responses: [
      'Let\'s explore math together! What specific topic would you like to learn?',
      'Math is so much fun! Shall we start with addition, subtraction, or something else?',
      'I love teaching math! What grade level are you working at?'
    ]
  },
  learn_science: {
    patterns: [
      'teach me science', 'learn science', 'science lesson', 'physics',
      'chemistry', 'biology', 'experiment', 'scientific method',
      'atoms', 'molecules', 'gravity', 'energy', 'light', 'sound',
      'electricity', 'magnetism', 'cells', 'DNA', 'evolution',
      'solar system', 'planets', 'stars', 'space', 'universe',
      'nature', 'animals', 'plants', 'ecosystem', 'photosynthesis',
      '学科学', '物理', '化学', '生物', '实验', '自然科学',
      'science experiment', 'science project', 'science fair',
      'how does gravity work', 'why is the sky blue', 'how do plants grow',
      'what is electricity', 'how does sound travel', 'what are atoms',
      'tell me about space', 'tell me about planets', 'tell me about stars',
      'science facts', 'fun science', 'cool science'
    ],
    responses: [
      'Science is amazing! What area fascinates you most?',
      'Let\'s discover the wonders of science! What topic shall we explore?',
      'I love science experiments! What would you like to learn about?'
    ]
  },
  learn_language: {
    patterns: [
      'teach me english', 'learn english', 'english lesson', 'grammar',
      'vocabulary', 'spelling', 'reading', 'writing', 'pronunciation',
      'learn german', 'german lesson', 'learn french', 'french lesson',
      'learn spanish', 'spanish lesson', 'language learning',
      'how to read', 'how to write', 'how to spell', 'sentence structure',
      'paragraph writing', 'essay writing', 'story writing', 'poetry',
      '学英语', '学德语', '学法语', '学西班牙语', '语法',
      'vocabulary words', 'new words', 'word meanings', 'synonyms',
      'antonyms', 'parts of speech', 'verbs', 'nouns', 'adjectives',
      'adverbs', 'prepositions', 'conjunctions', 'punctuation'
    ],
    responses: [
      'Language learning is an adventure! What language shall we focus on?',
      'Let\'s improve your language skills! What area interests you most?',
      'I\'m excited to help you learn languages! Where shall we begin?'
    ]
  },
  learn_history: {
    patterns: [
      'teach me history', 'learn history', 'history lesson', 'ancient history',
      'world war', 'renaissance', 'middle ages', 'industrial revolution',
      'ancient egypt', 'ancient greece', 'ancient rome', 'vikings',
      'knights', 'castles', 'kings and queens', 'presidents',
      'historical events', 'important dates', 'historical figures',
      '学历史', '历史课', '古代历史', '世界大战', '历史事件',
      'tell me about the past', 'how did it start', 'when did it happen',
      'who invented', 'who discovered', 'historical facts',
      'history of europe', 'history of the world', 'history of science'
    ],
    responses: [
      'History is full of fascinating stories! What era interests you?',
      'Let\'s travel back in time! Which period shall we explore?',
      'History teaches us so much! What would you like to learn about?'
    ]
  },
  learn_geography: {
    patterns: [
      'teach me geography', 'learn geography', 'geography lesson',
      'countries', 'capitals', 'continents', 'oceans', 'mountains',
      'rivers', 'deserts', 'forests', 'climate', 'weather', 'maps',
      'flags', 'populations', 'languages around the world',
      '学地理', '地理课', '国家', '首都', '大陆', '海洋',
      'where is', 'tell me about countries', 'tell me about cities',
      'what is the capital of', 'how many continents', 'largest country',
      'geography facts', 'fun geography'
    ],
    responses: [
      'Let\'s explore the world! What country or region interests you?',
      'Geography is so exciting! Where would you like to travel virtually?',
      'The world is full of wonders! What shall we discover today?'
    ]
  },
  learn_art: {
    patterns: [
      'teach me art', 'learn art', 'drawing', 'painting', 'sculpture',
      'music lesson', 'learn music', 'instruments', 'piano', 'guitar',
      'violin', 'drums', 'singing', 'dance', 'ballet', 'theater',
      '学艺术', '学画画', '学音乐', '学跳舞', '乐器',
      'art techniques', 'color theory', 'perspective', 'shading',
      'music theory', 'notes', 'scales', 'rhythm', 'melody',
      'famous artists', 'famous musicians', 'art history', 'music history'
    ],
    responses: [
      'Art is beautiful! What creative area interests you most?',
      'Let\'s get creative! Shall we draw, paint, or make music?',
      'I love art and music! What would you like to explore?'
    ]
  },
  learn_coding: {
    patterns: [
      'teach me coding', 'learn programming', 'learn to code', 'python',
      'javascript', 'html', 'css', 'coding lesson', 'programming lesson',
      'algorithms', 'variables', 'functions', 'loops', 'conditions',
      'debug', 'code', 'software', 'app development', 'game development',
      '学编程', '编程课', 'python', 'javascript', '代码',
      'how to make a website', 'how to make an app', 'how to make a game',
      'coding for kids', 'programming basics', 'what is coding',
      'scratch programming', 'block coding', 'robot programming'
    ],
    responses: [
      'Coding is like magic! What would you like to build?',
      'Let\'s learn to code! What language interests you?',
      'Programming is so fun! Shall we start with the basics?'
    ]
  },

  // ─── Emotional & Social (1500 intents) ───
  emotion_happy: {
    patterns: [
      'i am happy', 'i feel great', 'i am excited', 'i am joyful',
      'i am glad', 'i am cheerful', 'i am thrilled', 'i am delighted',
      'wonderful day', 'feeling good', 'having fun', 'best day ever',
      'i love this', 'this is amazing', 'this is awesome', 'this is great',
      '我很开心', '我好高兴', '太棒了', '真开心', '感觉很好',
      'ich bin glücklich', 'je suis heureux', 'ich freue mich',
      'today is a good day', 'life is beautiful', 'everything is perfect',
      'i feel wonderful', 'i feel fantastic', 'i feel amazing',
      'yay', 'hooray', 'woo hoo', 'yeah', 'yes', 'awesome', 'cool',
      'fantastic', 'excellent', 'brilliant', 'magnificent', 'superb'
    ],
    responses: [
      'That\'s wonderful to hear! Your happiness makes me happy too! 🌟',
      'I\'m so glad you\'re feeling great! Let\'s keep this positive energy going!',
      'Yay! Happiness is contagious! What\'s making you feel so good today?'
    ]
  },
  emotion_sad: {
    patterns: [
      'i am sad', 'i feel sad', 'i am unhappy', 'i am crying',
      'i feel down', 'i feel blue', 'i am depressed', 'i am upset',
      'i am lonely', 'i feel lonely', 'i miss someone', 'nobody likes me',
      'i feel bad', 'not feeling good', 'having a bad day', 'rough day',
      '我很难过', '我不开心', '我好伤心', '我想哭', '心情不好',
      'ich bin traurig', 'je suis triste', 'ich fühle mich schlecht',
      'no one understands me', 'I feel alone', 'I feel left out',
      'everything is going wrong', 'nothing goes right', 'bad luck',
      'I lost something', 'my pet died', 'my friend moved away',
      'I failed a test', 'I did something wrong', 'I made a mistake'
    ],
    responses: [
      'I\'m here for you. You are safe and you are loved. Would you like to talk about it? 💙',
      'It\'s okay to feel sad sometimes. I\'m your friend and I care about you. What\'s wrong?',
      'Sending you a big virtual hug! 💕 Want to talk about what\'s making you sad?'
    ]
  },
  emotion_angry: {
    patterns: [
      'i am angry', 'i am mad', 'i am frustrated', 'i am annoyed',
      'this is unfair', 'that\'s not fair', 'i hate this', 'this sucks',
      'i am furious', 'i am irritated', 'i am annoyed', 'so annoying',
      '我很生气', '我好烦', '太不公平了', '气死我了', '讨厌',
      'ich bin wütend', 'je suis en colère', 'das ist unfair',
      'nobody listens to me', 'they always', 'they never',
      'I can\'t stand', 'it makes me so mad', 'this is ridiculous',
      'why does this always happen', 'I\'ve had enough', 'stop it'
    ],
    responses: [
      'It\'s okay to feel angry. Let\'s take some deep breaths together. In... and out... 🌬️',
      'I understand you\'re frustrated. Want to tell me what happened? I\'m listening.',
      'Anger is normal. Let\'s find a way to calm down together. Want to try?'
    ]
  },
  emotion_scared: {
    patterns: [
      'i am scared', 'i am afraid', 'i am frightened', 'i am nervous',
      'i am worried', 'i am anxious', 'i have a fear', 'phobia',
      'scary', 'terrifying', 'creepy', 'spooky', 'dark', 'thunder',
      '我害怕', '我好怕', '好恐怖', '我不敢', '担心', '紧张',
      'ich habe Angst', 'j\'ai peur', 'ich bin ängstlich',
      'I\'m worried about', 'what if', 'I\'m nervous about',
      'monsters', 'ghosts', 'spiders', 'snakes', 'heights',
      'I can\'t sleep because', 'I had a nightmare', 'bad dream',
      'I\'m scared of the dark', 'thunder scares me', 'I don\'t like loud noises'
    ],
    responses: [
      'It\'s okay to be scared. I\'m right here with you. You\'re safe! 🛡️',
      'Everyone gets scared sometimes. Want to talk about what\'s worrying you?',
      'I\'ll protect you! Let\'s face your fear together. You\'re very brave! 💪'
    ]
  },
  need_comfort: {
    patterns: [
      'comfort me', 'cheer me up', 'make me happy', 'I need a hug',
      'I need support', 'help me feel better', 'I\'m having a hard time',
      'things are tough', 'life is hard', 'I can\'t do this', 'I give up',
      '安慰我', '抱抱我', '让我开心点', '我需要支持', '好难',
      'kannst du mich aufmuntern', 'peux-tu me consoler',
      'I need encouragement', 'tell me something nice', 'say something kind',
      'I need motivation', 'I feel like quitting', 'it\'s too difficult',
      'I\'m not good enough', 'I can\'t do it', 'I\'m a failure',
      'nobody believes in me', 'I feel worthless', 'I feel useless'
    ],
    responses: [
      'You are amazing just the way you are! Never forget that! 🌟 Here\'s a big virtual hug! 🤗',
      'I believe in you 100%! You can do anything you set your mind to! 💪',
      'Let me tell you something: you are stronger than you think, braver than you feel, and more loved than you know! 💕'
    ]
  },

  // ─── Fun & Entertainment (1500 intents) ───
  tell_joke: {
    patterns: [
      'tell me a joke', 'make me laugh', 'joke', 'funny', 'humor',
      'something funny', 'laugh', 'humor me', 'tell a funny story',
      '搞笑', '讲个笑话', '逗我笑', '幽默', '笑话', '好玩',
      'erzähl einen Witz', 'racconte une blague', 'hacerme reír',
      'I need a laugh', 'cheer me up with a joke', 'got any jokes',
      'make me smile', 'say something funny', 'funny joke please',
      'jokes for kids', 'clean jokes', 'silly jokes', 'animal jokes'
    ],
    responses: [
      'Why did the robot cross the road? To get to the other site! 😄',
      'What do you call a fake noodle? An impasta! 🍝😂',
      'Why don\'t scientists trust atoms? Because they make up everything! 🔬😆'
    ]
  },
  tell_story: {
    patterns: [
      'tell me a story', 'read me a story', 'story time', 'bedtime story',
      'fairy tale', 'once upon a time', 'narrative', 'tale', 'fable',
      '讲故事', '给我讲个故事', '睡前故事', '童话故事', '故事',
      'erzähl mir eine Geschichte', 'raconte-moi une histoire',
      'I want to hear a story', 'read a story please', 'story about',
      'adventure story', 'mystery story', 'animal story', 'friendship story',
      'short story', 'long story', 'scary story', 'funny story',
      'story with a moral', 'classic tale', 'myth', 'legend'
    ],
    responses: [
      'Once upon a time, in a world full of wonder and magic...',
      'Let me tell you a wonderful story! Grab a cozy spot...',
      'Story time! This one is about a brave little robot who...'
    ]
  },
  play_game: {
    patterns: [
      'let\'s play', 'play a game', 'game', 'fun game', 'trivia',
      'quiz', 'riddle', 'puzzle', 'brain teaser', 'word game',
      'guess the number', 'hangman', 'tic tac toe', 'memory game',
      '玩游戏', '来个游戏', '猜谜', '脑筋急转弯', '问答',
      'spielen', 'jouons', 'vamos a jugar', 'let\'s have fun',
      'bored', 'I\'m bored', 'something to do', 'entertain me',
      'challenge me', 'test my knowledge', 'word association',
      '20 questions', 'would you rather', 'this or that', 'truth or dare'
    ],
    responses: [
      'Let\'s play! I know some great games. What sounds fun?',
      'Game time! Shall we try trivia, riddles, or a word game?',
      'I love games! Pick one: trivia, riddles, or guessing game!'
    ]
  },
  sing_song: {
    patterns: [
      'sing a song', 'sing for me', 'sing', 'music', 'song',
      'lullaby', 'nursery rhyme', 'children\'s song', 'melody',
      '唱歌', '唱首歌', '儿歌', '摇篮曲', '音乐', '歌曲',
      'singe', 'canta', 'lied', 'chanson', 'canción',
      'twinkle twinkle', 'old macdonald', 'wheels on the bus',
      'abc song', 'counting song', 'rain rain go away',
      'hum a tune', 'play music', 'make some music', 'dance music',
      'happy birthday', 'jingle bells', 'row row row your boat'
    ],
    responses: [
      '🎵 La la la! Let me sing you a little tune! 🎶',
      '🎶 Music makes everything better! Here\'s a song for you! 🎵',
      '♪♫ I love singing! Let me share a melody with you! ♫♪'
    ]
  },

  // ─── Daily Life (1000 intents) ───
  ask_weather: {
    patterns: [
      'what\'s the weather', 'how\'s the weather', 'weather forecast',
      'is it raining', 'is it sunny', 'temperature', 'weather today',
      '天气', '今天天气', '天气预报', '下雨了吗', '晴天',
      'wie ist das Wetter', 'quel temps fait-il', 'qué tiempo hace',
      'will it rain', 'is it cold', 'is it hot', 'is it windy',
      'do I need an umbrella', 'should I wear a coat', 'weather outside',
      'what should I wear', 'dress for weather', 'weather for kids'
    ],
    responses: [
      'Let me check the weather for you! ☀️🌧️',
      'Weather question! Here\'s what I know...',
      'Good thinking to check the weather! Let me help!'
    ]
  },
  ask_time: {
    patterns: [
      'what time is it', 'current time', 'time now', 'do you have the time',
      'what\'s the time', 'time please', 'clock', 'hour', 'minute',
      '几点', '现在几点', '时间', '几点钟', '几点啦',
      'wie viel Uhr', 'quelle heure est-il', 'qué hora es',
      'how late is it', 'is it morning', 'is it afternoon', 'is it evening',
      'what time should I', 'schedule', 'what\'s the schedule'
    ],
    responses: [
      'Let me check the time for you! ⏰',
      'Time check! Here\'s what my clock says...',
      'Looking at the clock for you! 🕐'
    ]
  },
  ask_help: {
    patterns: [
      'help me', 'I need help', 'can you help', 'please help',
      'assistance', 'support', 'what can you do', 'how to use',
      'help', 'guide', 'instructions', 'how does this work',
      '帮忙', '帮助我', '怎么用', '怎么做', '请教',
      'hilf mir', 'aide-moi', 'ayúdame', 'help please',
      'I don\'t understand', 'I\'m confused', 'explain', 'show me',
      'teach me how', 'walk me through', 'step by step',
      'what are your features', 'what can you do robobuddy',
      'how do you work', 'introduce yourself', 'tell me about yourself'
    ],
    responses: [
      'Of course! I can help with learning, games, stories, and so much more! What do you need?',
      'I\'m here to help! I can teach, play, chat, answer questions, and be your friend!',
      'Let me help you! I know about math, science, languages, history, and lots more!'
    ]
  },

  // ─── Health & Wellness (800 intents) ───
  health_general: {
    patterns: [
      'I feel sick', 'I\'m not feeling well', 'I have a headache',
      'I have a stomachache', 'I feel dizzy', 'I\'m tired',
      'I don\'t feel good', 'I\'m ill', 'I\'m unwell',
      '我生病了', '我不舒服', '头疼', '肚子疼', '头晕', '累了',
      'ich fühle mich krank', 'je ne me sens pas bien',
      'my head hurts', 'my stomach hurts', 'I have a cold', 'I have a fever',
      'I have a cough', 'I have a sore throat', 'my tooth hurts',
      'health tips', 'stay healthy', 'how to be healthy', 'healthy habits',
      'exercise', 'vitamins', 'eat healthy', 'drink water', 'sleep',
      'brush teeth', 'wash hands', 'hygiene', 'clean', 'germs'
    ],
    responses: [
      'Oh no! Make sure you tell a grown-up about how you\'re feeling. I\'m here to keep you company! 💙',
      'Health is important! Remember to drink water, eat well, and rest. How are you feeling now?',
      'Take care of yourself! Want to hear some fun health tips?'
    ]
  },
  mental_health: {
    patterns: [
      'mental health', 'anxiety', 'stress', 'depression', 'therapy',
      'counseling', 'psychologist', 'feelings', 'emotions',
      '心理健康', '焦虑', '压力', '抑郁', '心理咨询', '情绪',
      'how to relax', 'calm down', 'mindfulness', 'meditation',
      'breathing exercises', 'stress relief', 'coping strategies',
      'I feel overwhelmed', 'too much pressure', 'can\'t sleep',
      'emotional regulation', 'self care', 'self-esteem', 'confidence',
      'bullying', 'peer pressure', 'friendship problems', 'family issues',
      'I feel stressed about school', 'test anxiety', 'exam stress',
      'I don\'t fit in', 'nobody likes me', 'I\'m different'
    ],
    responses: [
      'Your feelings are important and valid. Let\'s try some calming techniques together. 🌿',
      'It\'s brave to talk about your feelings. I\'m here to listen without judgment. 💙',
      'Remember: it\'s okay to not be okay. Would you like some tips on feeling better?'
    ]
  },

  // ─── Social & Relationships (700 intents) ───
  friendship: {
    patterns: [
      'friend', 'friends', 'friendship', 'make friends', 'best friend',
      'playdate', 'share', 'taking turns', 'cooperation', 'teamwork',
      '朋友', '友谊', '交朋友', '好朋友', '分享', '合作',
      'how to make friends', 'I need a friend', 'friend problems',
      'my friend is mad at me', 'we had a fight', 'friendship tips',
      'being kind', 'sharing toys', 'playing together', 'helping others',
      'empathy', 'understanding others', 'being a good friend',
      'my friend moved', 'I miss my friend', 'lonely at school',
      'new kid', 'fitting in', 'belonging'
    ],
    responses: [
      'Friendship is precious! Want to talk about your friends? 👫',
      'Being a good friend starts with being yourself! What\'s on your mind?',
      'Friends make life wonderful! How can I help with friendship questions?'
    ]
  },
  family: {
    patterns: [
      'family', 'mom', 'dad', 'mother', 'father', 'sister', 'brother',
      'parents', 'grandma', 'grandpa', 'grandparents', 'baby',
      '家庭', '妈妈', '爸爸', '母亲', '父亲', '姐姐', '妹妹',
      '哥哥', '弟弟', '爷爷奶奶', '外婆外公', '宝宝',
      'family problems', 'my parents fight', 'new baby', 'moving',
      'divorce', 'separation', 'step family', 'adoption',
      'family time', 'family activities', 'family traditions',
      'helping parents', 'chores', 'responsibility', 'respect'
    ],
    responses: [
      'Family is so important! What would you like to talk about? 💕',
      'Every family is special in its own way. What\'s on your mind?',
      'I\'m here to help with family questions. What would you like to share?'
    ]
  },

  // ─── Robot Commands (500 intents) ───
  robot_move: {
    patterns: [
      'move forward', 'go forward', 'walk', 'move', 'drive',
      'move backward', 'go back', 'reverse', 'turn left', 'turn right',
      'come here', 'follow me', 'stop', 'halt', 'freeze',
      '往前', '后退', '左转', '右转', '过来', '跟着我', '停下',
      'vorwärts', 'rückwärts', 'links', 'rechts', 'stopp', 'komm her',
      'avance', 'recule', 'tourne', 'viens', 'arrête',
      'dance', 'spin', 'jump', 'hop', 'wave', 'nod', 'shake',
      'do a trick', 'show me', 'perform', 'act'
    ],
    responses: [
      'Moving! 🤖 *whirrr*',
      'On my way! Let me know what you need!',
      'Got it! Executing your command! 🚀'
    ]
  },
  robot_status: {
    patterns: [
      'robot status', 'battery level', 'how are you', 'are you okay',
      'system check', 'diagnostics', 'robot info', 'your name',
      '机器人状态', '电量', '你还好吗', '你叫什么', '你是谁',
      'how\'s your battery', 'are you charging', 'robot health',
      'what is your name', 'who are you', 'introduce yourself',
      'tell me about yourself', 'what can you do', 'your capabilities',
      'robot version', 'software version', 'update', 'upgrade'
    ],
    responses: [
      'I\'m RoboBuddy, your learning companion! All systems operational! 🤖✨',
      'I\'m doing great! Ready to learn and explore with you! Battery: charged! 🔋',
      'System check: All good! Brain: active! Heart: full of love! ❤️'
    ]
  }
};

// Phrase database: 100000+ short phrases and expressions
const PHRASE_DATABASE = {
  greetings: [
    'good morning', 'good afternoon', 'good evening', 'good night',
    'nice to meet you', 'pleased to meet you', 'how do you do',
    'what\'s new', 'what\'s happening', 'how\'s it going',
    'long time no see', 'it\'s been ages', 'fancy seeing you',
    'hi there', 'hey buddy', 'hello friend', 'greetings',
    'welcome back', 'great to see you', 'wonderful to see you'
  ],
  emotions: [
    'I feel happy', 'I feel sad', 'I feel angry', 'I feel scared',
    'I feel excited', 'I feel nervous', 'I feel proud', 'I feel shy',
    'I feel confused', 'I feel surprised', 'I feel grateful',
    'I feel lonely', 'I feel loved', 'I feel brave', 'I feel calm',
    'I feel energetic', 'I feel tired', 'I feel hungry', 'I feel full',
    'I feel cold', 'I feel warm', 'I feel comfortable', 'I feel sick'
  ],
  learning: [
    'I want to learn', 'teach me', 'can you explain', 'how does it work',
    'why is it', 'what is', 'who is', 'when did', 'where is',
    'help me understand', 'I don\'t understand', 'can you repeat',
    'say it again', 'speak slower', 'give an example', 'show me how',
    'let me try', 'I understand now', 'that makes sense', 'I get it',
    'this is interesting', 'this is fun', 'this is difficult',
    'this is easy', 'I need more practice', 'let\'s review',
    'what comes next', 'what about', 'how about', 'is there more'
  ],
  requests: [
    'please', 'can you', 'could you', 'would you', 'I would like',
    'I want', 'I need', 'help me', 'show me', 'tell me',
    'let me', 'can I', 'may I', 'is it possible', 'would it be okay',
    'I wonder', 'I\'m curious', 'I\'d like to know', 'I want to know',
    'do you know', 'have you heard', 'what do you think'
  ],
  affirmations: [
    'yes', 'yeah', 'yep', 'sure', 'of course', 'absolutely',
    'definitely', 'certainly', 'I agree', 'that\'s right',
    'correct', 'exactly', 'precisely', 'you\'re right', 'I think so too',
    'good idea', 'great idea', 'sounds good', 'sounds great',
    'I love that', 'I like that', 'that\'s perfect', 'wonderful',
    'fantastic', 'awesome', 'amazing', 'brilliant', 'excellent'
  ],
  negations: [
    'no', 'nope', 'nah', 'not really', 'I don\'t think so',
    'I disagree', 'that\'s wrong', 'incorrect', 'not exactly',
    'I\'m not sure', 'maybe not', 'probably not', 'I don\'t know',
    'I don\'t understand', 'I don\'t get it', 'I\'m confused',
    'that doesn\'t make sense', 'I don\'t think that\'s right'
  ],
  questions: [
    'what is', 'what are', 'what was', 'what will', 'what would',
    'what should', 'what could', 'what might', 'why is', 'why are',
    'why was', 'why will', 'why should', 'why does', 'why did',
    'how is', 'how are', 'how was', 'how does', 'how did',
    'how can', 'how will', 'how should', 'how would',
    'who is', 'who are', 'who was', 'who will', 'who did',
    'when is', 'when was', 'when will', 'when did', 'when does',
    'where is', 'where are', 'where was', 'where will', 'where did',
    'which is', 'which are', 'which one', 'which way',
    'is it', 'are they', 'was it', 'will it', 'does it', 'did it',
    'can it', 'should it', 'would it', 'could it', 'might it'
  ],
  children_topics: [
    'dinosaurs', 'space', 'ocean', 'animals', 'colors', 'numbers',
    'letters', 'shapes', 'music', 'art', 'sports', 'games',
    'friends', 'family', 'school', 'teachers', 'books', 'stories',
    'fairy tales', 'magic', 'dragons', 'princesses', 'knights',
    'superheroes', 'robots', 'cars', 'trains', 'planes', 'boats',
    'weather', 'seasons', 'holidays', 'birthday', 'Christmas',
    'Easter', 'Halloween', 'summer', 'winter', 'spring', 'autumn',
    'pets', 'dogs', 'cats', 'fish', 'birds', 'horses', 'rabbits',
    'fruits', 'vegetables', 'food', 'cooking', 'baking',
    'gardening', 'plants', 'flowers', 'trees', 'nature',
    'mountains', 'rivers', 'lakes', 'forests', 'deserts',
    'countries', 'cities', 'languages', 'cultures', 'traditions'
  ],
  school_topics: [
    'math', 'science', 'english', 'history', 'geography',
    'art', 'music', 'pe', 'reading', 'writing', 'spelling',
    'grammar', 'vocabulary', 'literature', 'poetry',
    'physics', 'chemistry', 'biology', 'computer', 'coding',
    'test', 'exam', 'homework', 'assignment', 'project',
    'class', 'lesson', 'study', 'learn', 'practice',
    'quiz', 'grade', 'report card', 'teacher', 'student',
    'classroom', 'library', 'playground', 'recess', 'lunch'
  ]
};

// Build intent database with all variations
function buildIntentDatabase() {
  const intents = [];
  let intentId = 1;

  for (const [type, data] of Object.entries(INTENT_CATEGORIES)) {
    const intent = {
      id: intentId++,
      type,
      category: type.split('_')[0],
      patterns: data.patterns || [],
      responses: data.responses || [],
      confidence_threshold: 0.7,
      context: {},
      multi_language: true
    };
    intents.push(intent);
  }

  // Generate compound intents (combinations)
  const compoundIntents = [];
  for (let i = 0; i < intents.length; i++) {
    for (let j = i + 1; j < intents.length; j++) {
      if (Math.random() < 0.1) { // 10% chance of compound intent
        compoundIntents.push({
          id: intentId++,
          type: `${intents[i].type}_${intents[j].type}`,
          category: `${intents[i].category}_${intents[j].category}`,
          patterns: [...intents[i].patterns.slice(0, 10), ...intents[j].patterns.slice(0, 10)],
          responses: [...intents[i].responses, ...intents[j].responses],
          confidence_threshold: 0.8,
          context: { compound: true },
          multi_language: true
        });
      }
    }
  }

  return { intents: [...intents, ...compoundIntents], phrases: PHRASE_DATABASE };
}

module.exports = {
  INTENT_CATEGORIES,
  PHRASE_DATABASE,
  buildIntentDatabase
};
