const EventEmitter = require('events');
const logger = require('../utils/logger');

class EntertainmentService extends EventEmitter {
  constructor() {
    super();
    this.activeSessions = new Map();
    this.mediaQueue = [];
    this.gamesInProgress = new Map();
  }

  getAvailableMedia(type, filters = {}) {
    return MEDIA_LIBRARY.filter(m => {
      if (type && m.type !== type) return false;
      if (filters.genre && m.genre !== filters.genre) return false;
      if (filters.minAge && m.minAge > filters.minAge) return false;
      if (filters.maxAge && m.maxAge < filters.maxAge) return false;
      if (filters.mood && m.mood !== filters.mood) return false;
      if (filters.language && m.language !== filters.language) return false;
      return true;
    });
  }

  getMediaById(id) {
    return MEDIA_LIBRARY.find(m => m.id === id) || null;
  }

  createPlaylist(name, mediaIds, userId) {
    const playlist = {
      id: 'pl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      name,
      items: mediaIds.map(id => this.getMediaById(id)).filter(Boolean),
      userId,
      createdAt: new Date().toISOString()
    };
    this.emit('playlist:created', playlist);
    return playlist;
  }

  enqueueMedia(mediaId, userId) {
    const media = this.getMediaById(mediaId);
    if (!media) return { success: false, error: 'Media not found' };
    const entry = { id: 'mq_' + Date.now(), media, userId, addedAt: new Date().toISOString(), status: 'queued' };
    this.mediaQueue.push(entry);
    return { success: true, data: entry };
  }

  getQueue(userId) {
    return this.mediaQueue.filter(q => q.userId === userId);
  }

  startInteractiveGame(gameId, userId, options = {}) {
    const templates = INTERACTIVE_GAMES;
    const game = templates.find(g => g.id === gameId) || templates.find(g => g.id === 'trivia' || g.id === 'quiz-genius');
    if (!game) return { success: false, error: 'Game not found' };
    const sessionId = 'game_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const session = {
      id: sessionId,
      gameId: game.id,
      gameName: game.name,
      userId,
      status: 'playing',
      score: 0,
      level: 1,
      lives: game.lives || 3,
      currentQuestion: 0,
      questions: this._generateQuestions(game, options),
      startTime: Date.now(),
      options
    };
    this.gamesInProgress.set(sessionId, session);
    return { success: true, data: { sessionId, gameName: game.name, totalQuestions: session.questions.length, currentQuestion: session.questions[0] } };
  }

  playGameTurn(sessionId, answer) {
    const session = this.gamesInProgress.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };
    if (session.status !== 'playing') return { success: false, error: 'Game already finished' };
    const q = session.questions[session.currentQuestion];
    if (!q) return { success: false, error: 'No more questions' };
    const correct = q.answers.includes(answer.toLowerCase().trim());
    if (correct) {
      session.score += q.points || 10;
    } else {
      session.lives--;
      if (session.lives <= 0) {
        session.status = 'lost';
        this.emit('game:ended', { sessionId, result: 'lost', score: session.score });
        return { success: true, data: { correct: false, gameOver: true, result: 'lost', finalScore: session.score, correctAnswer: q.answers[0] } };
      }
    }
    session.currentQuestion++;
    if (session.currentQuestion >= session.questions.length) {
      session.status = 'won';
      this.emit('game:ended', { sessionId, result: 'won', score: session.score });
      return { success: true, data: { correct, gameOver: true, result: 'won', finalScore: session.score } };
    }
    return {
      success: true,
      data: {
        correct,
        lives: session.lives,
        score: session.score,
        level: session.level,
        currentQuestion: session.questions[session.currentQuestion]
      }
    };
  }

  getGameState(sessionId) {
    const session = this.gamesInProgress.get(sessionId);
    if (!session) return null;
    return {
      gameName: session.gameName,
      status: session.status,
      score: session.score,
      lives: session.lives,
      level: session.level,
      progress: session.currentQuestion + '/' + session.questions.length
    };
  }

  suggestContent(age, mood, interests) {
    const suggestions = [];
    const ageNum = parseInt(age) || 8;
    const moodLower = (mood || 'happy').toLowerCase();
    const mediaByMood = { happy: ['energetic', 'fun', 'upbeat'], sad: ['calm', 'soothing', 'happy'], scared: ['calm', 'soothing', 'brave'], curious: ['educational', 'fun', 'interactive'], frustrated: ['calm', 'fun', 'humorous'], neutral: ['educational', 'calm', 'fun'] };
    const targetMoods = mediaByMood[moodLower] || ['fun'];
    const pool = MEDIA_LIBRARY.filter(m => m.minAge <= ageNum && m.maxAge >= ageNum);
    for (const mood of targetMoods) {
      const matches = pool.filter(m => m.mood === mood);
      if (matches.length > 0) suggestions.push(matches[Math.floor(Math.random() * matches.length)]);
    }
    return suggestions.slice(0, 5);
  }

  getStats() {
    return {
      totalMedia: MEDIA_LIBRARY.length,
      mediaByType: MEDIA_LIBRARY.reduce((acc, m) => { acc[m.type] = (acc[m.type] || 0) + 1; return acc; }, {}),
      activeGames: this.gamesInProgress.size,
      queueLength: this.mediaQueue.length
    };
  }

  _generateQuestions(game, options) {
    const count = options.questionCount || 5;
    const questions = [];
    const categories = options.categories || ['general'];
    for (let i = 0; i < count; i++) {
      const cat = categories[Math.floor(Math.random() * categories.length)];
      questions.push(this._generateQuestion(cat, i));
    }
    return questions;
  }

  _generateQuestion(category, index) {
    const questionBank = TRIVIA_QUESTIONS[category] || TRIVIA_QUESTIONS.general;
    const q = questionBank[Math.floor(Math.random() * questionBank.length)] || questionBank[0];
    return {
      id: 'q_' + index + '_' + Date.now().toString(36),
      question: q.question,
      answers: q.answers,
      options: q.options,
      points: 10,
      category: q.category || category
    };
  }
}

const MEDIA_LIBRARY = [
  { id: 'song-hello', type: 'song', title: 'Hello Song', genre: 'children', mood: 'fun', minAge: 2, maxAge: 8, duration: 120, language: 'en', url: '/audio/hello-song.mp3' },
  { id: 'song-abc', type: 'song', title: 'ABC Song', genre: 'educational', mood: 'educational', minAge: 2, maxAge: 6, duration: 90, language: 'en', url: '/audio/abc-song.mp3' },
  { id: 'song-numbers', type: 'song', title: 'Counting Numbers', genre: 'educational', mood: 'educational', minAge: 3, maxAge: 7, duration: 110, language: 'en', url: '/audio/counting.mp3' },
  { id: 'song-twinkle', type: 'song', title: 'Twinkle Twinkle', genre: 'lullaby', mood: 'calm', minAge: 0, maxAge: 8, duration: 95, language: 'en', url: '/audio/twinkle.mp3' },
  { id: 'song-brahms', type: 'song', title: 'Brahms Lullaby', genre: 'lullaby', mood: 'calm', minAge: 0, maxAge: 6, duration: 180, language: 'en', url: '/audio/brahms.mp3' },
  { id: 'story-rabbit', type: 'story', title: 'Peter Rabbit', genre: 'animal', mood: 'fun', minAge: 3, maxAge: 10, duration: 420, language: 'en', url: '/stories/peter-rabbit' },
  { id: 'story-prince', type: 'story', title: 'Little Prince', genre: 'fantasy', mood: 'calm', minAge: 6, maxAge: 14, duration: 600, language: 'en', url: '/stories/little-prince' },
  { id: 'video-animals', type: 'video', title: 'Animals of Europe', genre: 'educational', mood: 'educational', minAge: 4, maxAge: 14, duration: 300, language: 'en', url: '/video/europe-animals' },
  { id: 'video-space', type: 'video', title: 'Space for Kids', genre: 'educational', mood: 'educational', minAge: 5, maxAge: 14, duration: 480, language: 'en', url: '/video/space-kids' },
  { id: 'song-fr-frere', type: 'song', title: 'Frère Jacques', genre: 'traditional', mood: 'fun', minAge: 2, maxAge: 10, duration: 60, language: 'fr', url: '/audio/frere-jacques.mp3' },
  { id: 'song-de-bruder', type: 'song', title: 'Bruder Jakob', genre: 'traditional', mood: 'fun', minAge: 2, maxAge: 10, duration: 60, language: 'de', url: '/audio/bruder-jakob.mp3' },
  { id: 'song-es-estrella', type: 'song', title: 'Estrellita', genre: 'lullaby', mood: 'calm', minAge: 0, maxAge: 8, duration: 100, language: 'es', url: '/audio/estrellita.mp3' },
  { id: 'podcast-nature', type: 'podcast', title: 'Nature Explorers', genre: 'educational', mood: 'educational', minAge: 5, maxAge: 14, duration: 600, language: 'en', url: '/podcast/nature-explorers' },
  { id: 'podcast-history', type: 'podcast', title: 'History for Kids', genre: 'educational', mood: 'educational', minAge: 6, maxAge: 14, duration: 480, language: 'en', url: '/podcast/history-kids' },
  { id: 'song-it-buongiorno', type: 'song', title: 'Canzone del Buongiorno', genre: 'children', mood: 'fun', minAge: 2, maxAge: 10, duration: 90, language: 'it', url: '/audio/buongiorno.mp3' },
  { id: 'song-pl-witaj', type: 'song', title: 'Witaj Piosenko', genre: 'children', mood: 'fun', minAge: 2, maxAge: 8, duration: 85, language: 'pl', url: '/audio/witaj.mp3' },
  { id: 'meditation-calm', type: 'meditation', title: 'Calm Down', genre: 'mindfulness', mood: 'calm', minAge: 3, maxAge: 14, duration: 300, language: 'en', url: '/meditation/calm-down' },
  { id: 'meditation-sleep', type: 'meditation', title: 'Sleep Tight', genre: 'mindfulness', mood: 'calm', minAge: 2, maxAge: 10, duration: 600, language: 'en', url: '/meditation/sleep-tight' },
  { id: 'sound-rain', type: 'sound', title: 'Rain Sounds', genre: 'ambient', mood: 'calm', minAge: 0, maxAge: 14, duration: 1800, language: 'en', url: '/audio/rain.mp3' },
  { id: 'sound-ocean', type: 'sound', title: 'Ocean Waves', genre: 'ambient', mood: 'calm', minAge: 0, maxAge: 14, duration: 1800, language: 'en', url: '/audio/ocean.mp3' },
  { id: 'sound-forest', type: 'sound', title: 'Forest Birds', genre: 'ambient', mood: 'calm', minAge: 0, maxAge: 14, duration: 1200, language: 'en', url: '/audio/forest.mp3' },
  { id: 'song-en-bingo', type: 'song', title: 'Bingo', genre: 'children', mood: 'fun', minAge: 2, maxAge: 7, duration: 100, language: 'en', url: '/audio/bingo.mp3' },
  { id: 'song-en-wheels', type: 'song', title: 'Wheels on the Bus', genre: 'children', mood: 'fun', minAge: 2, maxAge: 6, duration: 110, language: 'en', url: '/audio/wheels-bus.mp3' },
  { id: 'song-en-old-mac', type: 'song', title: 'Old MacDonald', genre: 'children', mood: 'fun', minAge: 2, maxAge: 6, duration: 120, language: 'en', url: '/audio/old-macdonald.mp3' },
  { id: 'song-en-row', type: 'song', title: 'Row Row Row Your Boat', genre: 'children', mood: 'fun', minAge: 2, maxAge: 7, duration: 60, language: 'en', url: '/audio/row-boat.mp3' },
  { id: 'song-en-head', type: 'song', title: 'Head Shoulders Knees Toes', genre: 'educational', mood: 'energetic', minAge: 2, maxAge: 7, duration: 90, language: 'en', url: '/audio/head-shoulders.mp3' },
  { id: 'song-de-kopf', type: 'song', title: 'Kopf Schulter Knie und Fuß', genre: 'educational', mood: 'energetic', minAge: 2, maxAge: 7, duration: 95, language: 'de', url: '/audio/kopf-schulter.mp3' },
  { id: 'song-fr-tete', type: 'song', title: 'Tête Épaules Genoux Pieds', genre: 'educational', mood: 'energetic', minAge: 2, maxAge: 7, duration: 95, language: 'fr', url: '/audio/tete-epaules.mp3' },
  { id: 'classic-beethoven', type: 'classical', title: 'Für Elise', genre: 'classical', mood: 'calm', minAge: 4, maxAge: 14, duration: 180, language: 'en', composer: 'Beethoven', url: '/audio/fur-elise.mp3' },
  { id: 'classic-mozart', type: 'classical', title: 'Eine Kleine Nachtmusik', genre: 'classical', mood: 'fun', minAge: 4, maxAge: 14, duration: 360, language: 'en', composer: 'Mozart', url: '/audio/nachtmusik.mp3' },
  { id: 'classic-vivaldi', type: 'classical', title: 'Four Seasons - Spring', genre: 'classical', mood: 'energetic', minAge: 4, maxAge: 14, duration: 210, language: 'en', composer: 'Vivaldi', url: '/audio/spring.mp3' },
  { id: 'classic-tchaikovsky', type: 'classical', title: 'Nutcracker Suite', genre: 'classical', mood: 'fun', minAge: 3, maxAge: 14, duration: 480, language: 'en', composer: 'Tchaikovsky', url: '/audio/nutcracker.mp3' },
  { id: 'song-nl-hoofd', type: 'song', title: 'Hoofd Schouders Knie en Teen', genre: 'educational', mood: 'energetic', minAge: 2, maxAge: 7, duration: 95, language: 'nl', url: '/audio/hoofd-schouders.mp3' },
  { id: 'song-sv-huvud', type: 'song', title: 'Huvud Axlar Knä och Tå', genre: 'educational', mood: 'energetic', minAge: 2, maxAge: 7, duration: 90, language: 'sv', url: '/audio/huvud-axlar.mp3' },
  { id: 'song-da-hoved', type: 'song', title: 'Hoved Skuldre Knæ og Tå', genre: 'educational', mood: 'energetic', minAge: 2, maxAge: 7, duration: 90, language: 'da', url: '/audio/hoved-skuldre.mp3' },
  { id: 'story-fairy-bremen', type: 'story', title: 'The Bremen Town Musicians', genre: 'fairy_tale', mood: 'fun', minAge: 4, maxAge: 10, duration: 480, language: 'en', url: '/stories/bremen' },
  { id: 'story-fairy-snow', type: 'story', title: 'Snow White', genre: 'fairy_tale', mood: 'calm', minAge: 4, maxAge: 10, duration: 600, language: 'en', url: '/stories/snow-white' },
  { id: 'story-fairy-hansel', type: 'story', title: 'Hansel and Gretel', genre: 'fairy_tale', mood: 'fun', minAge: 5, maxAge: 10, duration: 540, language: 'en', url: '/stories/hansel-gretel' },
  { id: 'story-fairy-rapunzel', type: 'story', title: 'Rapunzel', genre: 'fairy_tale', mood: 'calm', minAge: 4, maxAge: 10, duration: 500, language: 'en', url: '/stories/rapunzel' },
  { id: 'story-adventure-nemo', type: 'story', title: '20,000 Leagues Under the Sea', genre: 'adventure', mood: 'fun', minAge: 7, maxAge: 14, duration: 720, language: 'en', url: '/stories/nemo' }
];

const INTERACTIVE_GAMES = [
  { id: 'trivia', name: 'Quiz Genius', desc: 'Answer questions from many topics!', minAge: 5, maxAge: 14, lives: 3, category: 'educational' },
  { id: 'word-wizard', name: 'Word Wizard', desc: 'Spell words and build vocabulary!', minAge: 5, maxAge: 12, lives: 3, category: 'language' },
  { id: 'math-master', name: 'Math Master', desc: 'Solve math problems quickly!', minAge: 6, maxAge: 14, lives: 5, category: 'math' },
  { id: 'geo-explorer', name: 'Geo Explorer', desc: 'Discover countries and capitals!', minAge: 7, maxAge: 14, lives: 3, category: 'geography' },
  { id: 'science-wiz', name: 'Science Wiz', desc: 'Explore science facts and experiments!', minAge: 6, maxAge: 14, lives: 3, category: 'science' },
  { id: 'memory-match', name: 'Memory Match', desc: 'Find matching pairs!', minAge: 4, maxAge: 10, lives: 5, category: 'memory' },
  { id: 'brain-teaser', name: 'Brain Teaser', desc: 'Riddles and logic puzzles!', minAge: 8, maxAge: 14, lives: 3, category: 'logic' }
];

const TRIVIA_QUESTIONS = {
  general: [
    { question: 'What color is the sky on a clear day?', answers: ['blue'], options: ['Red', 'Blue', 'Green', 'Yellow'], category: 'general' },
    { question: 'How many legs does a dog have?', answers: ['4', 'four'], options: ['2', '4', '6', '8'], category: 'general' },
    { question: 'What do bees make?', answers: ['honey'], options: ['Milk', 'Honey', 'Bread', 'Cheese'], category: 'general' },
    { question: 'Which month comes after June?', answers: ['july'], options: ['May', 'July', 'August', 'September'], category: 'general' },
    { question: 'What is the opposite of hot?', answers: ['cold'], options: ['Warm', 'Cold', 'Cool', 'Ice'], category: 'general' },
    { question: 'Which animal says "moo"?', answers: ['cow'], options: ['Sheep', 'Cow', 'Pig', 'Horse'], category: 'general' },
    { question: 'How many fingers are on one hand?', answers: ['5', 'five'], options: ['3', '4', '5', '6'], category: 'general' },
    { question: 'What color are leaves in summer?', answers: ['green'], options: ['Red', 'Yellow', 'Green', 'Brown'], category: 'general' },
    { question: 'What do you use to write on paper?', answers: ['pen', 'pencil'], options: ['Spoon', 'Pen', 'Shoe', 'Cup'], category: 'general' },
    { question: 'What is the first day of the week?', answers: ['monday', 'sunday'], options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'], category: 'general' },
    { question: 'What do you call a baby cat?', answers: ['kitten'], options: ['Puppy', 'Kitten', 'Cub', 'Foal'], category: 'general' },
    { question: 'Which fruit is known as the "king of fruits"?', answers: ['mango', 'durian'], options: ['Apple', 'Mango', 'Banana', 'Orange'], category: 'general' },
    { question: 'Which direction does the sun rise?', answers: ['east'], options: ['North', 'South', 'East', 'West'], category: 'general' },
    { question: 'What is the largest mammal on Earth?', answers: ['blue whale', 'whale'], options: ['Elephant', 'Blue Whale', 'Giraffe', 'Hippopotamus'], category: 'general' },
    { question: 'How many months have 31 days?', answers: ['7', 'seven'], options: ['5', '6', '7', '8'], category: 'general' },
    { question: 'What color do you get mixing red and blue?', answers: ['purple', 'violet'], options: ['Green', 'Orange', 'Purple', 'Brown'], category: 'general' },
    { question: 'Which sense do you use to smell?', answers: ['nose', 'smell', 'olfactory'], options: ['Ears', 'Nose', 'Eyes', 'Skin'], category: 'general' },
    { question: 'What do you call the person who flies an airplane?', answers: ['pilot'], options: ['Driver', 'Pilot', 'Captain', 'Engineer'], category: 'general' },
    { question: 'What is the opposite of "day"?', answers: ['night'], options: ['Morning', 'Night', 'Evening', 'Sunset'], category: 'general' },
    { question: 'Which instrument has black and white keys?', answers: ['piano'], options: ['Guitar', 'Piano', 'Violin', 'Drums'], category: 'general' },
    { question: 'What do you call the frozen water that falls from the sky?', answers: ['snow', 'hail'], options: ['Rain', 'Snow', 'Fog', 'Dew'], category: 'general' },
    { question: 'How many letters are in the English alphabet?', answers: ['26', 'twenty-six', 'twenty six'], options: ['24', '25', '26', '27'], category: 'general' },
    { question: 'What is the opposite of "full"?', answers: ['empty'], options: ['Half', 'Empty', 'Less', 'None'], category: 'general' },
    { question: 'Which animal is known as "man\'s best friend"?', answers: ['dog'], options: ['Cat', 'Dog', 'Horse', 'Parrot'], category: 'general' },
    { question: 'What do you call food that you eat between meals?', answers: ['snack'], options: ['Dinner', 'Snack', 'Lunch', 'Dessert'], category: 'general' },
    { question: 'Which season comes after winter?', answers: ['spring'], options: ['Summer', 'Fall', 'Spring', 'Autumn'], category: 'general' },
    { question: 'What is the biggest organ of the human body?', answers: ['skin'], options: ['Brain', 'Heart', 'Skin', 'Liver'], category: 'general' },
    { question: 'How many legs does a spider have?', answers: ['8', 'eight'], options: ['6', '8', '10', '12'], category: 'general' },
    { question: 'What do you call water when it is frozen solid?', answers: ['ice'], options: ['Frost', 'Ice', 'Snow', 'Hail'], category: 'general' },
    { question: 'Which tree do acorns come from?', answers: ['oak'], options: ['Maple', 'Oak', 'Pine', 'Birch'], category: 'general' },
    { question: 'What is the hardest natural substance?', answers: ['diamond'], options: ['Gold', 'Iron', 'Diamond', 'Platinum'], category: 'general' },
    { question: 'Which planet is known as the Morning Star?', answers: ['venus'], options: ['Mars', 'Venus', 'Jupiter', 'Mercury'], category: 'general' },
    { question: 'What type of animal is a penguin?', answers: ['bird'], options: ['Fish', 'Mammal', 'Bird', 'Reptile'], category: 'general' },
    { question: 'What is the most common gas in Earth\'s atmosphere?', answers: ['nitrogen'], options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Argon'], category: 'general' },
    { question: 'How many teeth does an adult human have?', answers: ['32', 'thirty-two', 'thirty two'], options: ['28', '30', '32', '34'], category: 'general' },
    { question: 'What instrument measures temperature?', answers: ['thermometer'], options: ['Barometer', 'Thermometer', 'Speedometer', 'Clock'], category: 'general' },
    { question: 'Which ocean is the largest?', answers: ['pacific', 'pacific ocean'], options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'], category: 'general' },
    { question: 'What is the smallest country in the world?', answers: ['vatican city', 'vatican'], options: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'], category: 'general' },
    { question: 'What color are polar bears\' skin?', answers: ['black'], options: ['White', 'Black', 'Pink', 'Gray'], category: 'general' },
    { question: 'How many days are in a leap year?', answers: ['366'], options: ['364', '365', '366', '367'], category: 'general' }
  ],
  science: [
    { question: 'What planet is known as the Red Planet?', answers: ['mars'], options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], category: 'science' },
    { question: 'What gas do plants make that we breathe?', answers: ['oxygen'], options: ['Nitrogen', 'Oxygen', 'Carbon Dioxide', 'Hydrogen'], category: 'science' },
    { question: 'How many planets are in our solar system?', answers: ['8', 'eight'], options: ['7', '8', '9', '10'], category: 'science' },
    { question: 'What force keeps us on the ground?', answers: ['gravity'], options: ['Magnetism', 'Gravity', 'Friction', 'Air pressure'], category: 'science' },
    { question: 'What is the largest ocean on Earth?', answers: ['pacific', 'pacific ocean'], options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'], category: 'science' },
    { question: 'What is the center of an atom called?', answers: ['nucleus'], options: ['Electron', 'Nucleus', 'Proton', 'Orbit'], category: 'science' },
    { question: 'What type of animal is a dolphin?', answers: ['mammal'], options: ['Fish', 'Mammal', 'Reptile', 'Bird'], category: 'science' },
    { question: 'What star is closest to Earth?', answers: ['sun'], options: ['Moon', 'Sun', 'Sirius', 'Venus'], category: 'science' },
    { question: 'How many bones are in the adult human body?', answers: ['206'], options: ['106', '206', '306', '106'], category: 'science' },
    { question: 'What is water made of?', answers: ['hydrogen and oxygen', 'h2o'], options: ['Hydrogen and Oxygen', 'Carbon and Oxygen', 'Hydrogen and Nitrogen', 'Oxygen and Nitrogen'], category: 'science' },
    { question: 'What is the speed of light?', answers: ['300000 km/s', '299792 km/s', '300000 km per second'], options: ['150000 km/s', '300000 km/s', '500000 km/s', '1000000 km/s'], category: 'science' },
    { question: 'What part of the cell contains DNA?', answers: ['nucleus'], options: ['Membrane', 'Nucleus', 'Cytoplasm', 'Ribosome'], category: 'science' },
    { question: 'What is the largest organ in the human body?', answers: ['skin'], options: ['Liver', 'Brain', 'Skin', 'Heart'], category: 'science' },
    { question: 'Which element has the chemical symbol "O"?', answers: ['oxygen'], options: ['Gold', 'Oxygen', 'Osmium', 'Oganesson'], category: 'science' },
    { question: 'What causes a rainbow?', answers: ['refraction', 'light refraction', 'sunlight and water'], options: ['Rain', 'Light refraction', 'Wind', 'Temperature change'], category: 'science' },
    { question: 'What is the powerhouse of the cell?', answers: ['mitochondria'], options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi'], category: 'science' },
    { question: 'How many chromosomes do humans have?', answers: ['46', 'forty-six', 'forty six'], options: ['23', '46', '48', '52'], category: 'science' },
    { question: 'Which planet has the most moons?', answers: ['saturn', 'jupiter'], options: ['Mars', 'Saturn', 'Jupiter', 'Uranus'], category: 'science' },
    { question: 'What is the chemical symbol for gold?', answers: ['au'], options: ['Go', 'Gd', 'Au', 'Ag'], category: 'science' },
    { question: 'What type of rock is formed from cooled magma?', answers: ['igneous'], options: ['Sedimentary', 'Igneous', 'Metamorphic', 'Limestone'], category: 'science' },
    { question: 'What gas do plants absorb from the atmosphere?', answers: ['carbon dioxide', 'co2'], options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'], category: 'science' },
    { question: 'What is the smallest particle of an element?', answers: ['atom'], options: ['Molecule', 'Atom', 'Proton', 'Electron'], category: 'science' },
    { question: 'Which planet spins the fastest?', answers: ['jupiter'], options: ['Earth', 'Mars', 'Jupiter', 'Saturn'], category: 'science' },
    { question: 'How many hearts does an octopus have?', answers: ['3', 'three'], options: ['1', '2', '3', '4'], category: 'science' },
    { question: 'What force pulls objects toward Earth?', answers: ['gravity'], options: ['Magnetism', 'Gravity', 'Friction', 'Inertia'], category: 'science' },
    { question: 'What is the boiling point of water?', answers: ['100 c', '100 degrees', '100 degrees celsius', '212 f'], options: ['90°C', '100°C', '110°C', '120°C'], category: 'science' },
    { question: 'Which scientist developed the theory of relativity?', answers: ['einstein', 'albert einstein'], options: ['Newton', 'Einstein', 'Galileo', 'Hawking'], category: 'science' },
    { question: 'What type of simple machine is a screw?', answers: ['inclined plane'], options: ['Lever', 'Pulley', 'Inclined plane', 'Wedge'], category: 'science' },
    { question: 'What is the study of fossils called?', answers: ['paleontology'], options: ['Archaeology', 'Paleontology', 'Geology', 'Biology'], category: 'science' },
    { question: 'What gas makes up most of the Earth\'s atmosphere?', answers: ['nitrogen'], options: ['Oxygen', 'Nitrogen', 'Argon', 'Carbon Dioxide'], category: 'science' },
    { question: 'What is the largest planet in our solar system?', answers: ['jupiter'], options: ['Saturn', 'Jupiter', 'Uranus', 'Neptune'], category: 'science' },
    { question: 'What is the chemical symbol for iron?', answers: ['fe'], options: ['Ir', 'Fe', 'In', 'Io'], category: 'science' },
    { question: 'Which animal can change its color to blend in?', answers: ['chameleon'], options: ['Lizard', 'Chameleon', 'Snake', 'Frog'], category: 'science' },
    { question: 'What is the main gas in the air we breathe out?', answers: ['carbon dioxide', 'co2'], options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'], category: 'science' },
    { question: 'What is the smallest bone in the human body?', answers: ['stapes', 'stirrup'], options: ['Femur', 'Stapes', 'Patella', 'Radius'], category: 'science' },
    { question: 'How many elements are on the periodic table?', answers: ['118', '118 elements'], options: ['98', '108', '118', '128'], category: 'science' },
    { question: 'What is the study of weather called?', answers: ['meteorology'], options: ['Geology', 'Meteorology', 'Climatology', 'Astronomy'], category: 'science' },
    { question: 'What planet is known as the "Blue Planet"?', answers: ['earth'], options: ['Neptune', 'Earth', 'Uranus', 'Saturn'], category: 'science' },
    { question: 'What is the main function of red blood cells?', answers: ['carry oxygen', 'transport oxygen'], options: ['Fight infection', 'Carry oxygen', 'Clot blood', 'Digest food'], category: 'science' },
    { question: 'What type of energy comes from the sun?', answers: ['solar energy', 'solar'], options: ['Nuclear', 'Solar', 'Wind', 'Geothermal'], category: 'science' }
  ],
  math: [
    { question: 'What is 2+2?', answers: ['4', 'four'], options: ['3', '4', '5', '6'], category: 'math' },
    { question: 'What is 10-3?', answers: ['7', 'seven'], options: ['5', '6', '7', '8'], category: 'math' },
    { question: 'What shape has 3 sides?', answers: ['triangle'], options: ['Square', 'Circle', 'Triangle', 'Rectangle'], category: 'math' },
    { question: 'What is 5x5?', answers: ['25', 'twenty-five', 'twenty five'], options: ['20', '25', '30', '35'], category: 'math' },
    { question: 'How many sides does a square have?', answers: ['4', 'four'], options: ['3', '4', '5', '6'], category: 'math' },
    { question: 'What is 12÷3?', answers: ['4', 'four'], options: ['3', '4', '5', '6'], category: 'math' },
    { question: 'What is half of 10?', answers: ['5', 'five'], options: ['3', '4', '5', '6'], category: 'math' },
    { question: 'What is the next number: 1, 2, 3, 4, __?', answers: ['5', 'five'], options: ['4', '5', '6', '7'], category: 'math' },
    { question: 'How many corners does a cube have?', answers: ['8', 'eight'], options: ['4', '6', '8', '12'], category: 'math' },
    { question: 'What is 9+7?', answers: ['16', 'sixteen'], options: ['14', '15', '16', '17'], category: 'math' },
    { question: 'What is 100 divided by 4?', answers: ['25', 'twenty-five', 'twenty five'], options: ['20', '25', '30', '35'], category: 'math' },
    { question: 'How many degrees are in a circle?', answers: ['360', '360 degrees'], options: ['180', '270', '360', '450'], category: 'math' },
    { question: 'What is 15-8?', answers: ['7', 'seven'], options: ['5', '6', '7', '8'], category: 'math' },
    { question: 'What is 7x8?', answers: ['56', 'fifty-six', 'fifty six'], options: ['48', '54', '56', '64'], category: 'math' },
    { question: 'How many millimeters in a centimeter?', answers: ['10', 'ten'], options: ['5', '10', '100', '1000'], category: 'math' },
    { question: 'What shape has no corners?', answers: ['circle'], options: ['Square', 'Triangle', 'Circle', 'Pentagon'], category: 'math' },
    { question: 'What is 50+50?', answers: ['100', 'one hundred'], options: ['50', '100', '150', '200'], category: 'math' },
    { question: 'How many edges does a cube have?', answers: ['12', 'twelve'], options: ['6', '8', '12', '24'], category: 'math' },
    { question: 'What is 81÷9?', answers: ['9', 'nine'], options: ['7', '8', '9', '10'], category: 'math' },
    { question: 'What is 25% of 100?', answers: ['25', 'twenty-five', 'twenty five'], options: ['10', '20', '25', '50'], category: 'math' },
    { question: 'What is the square root of 64?', answers: ['8', 'eight'], options: ['6', '7', '8', '9'], category: 'math' },
    { question: 'How many sides does a pentagon have?', answers: ['5', 'five'], options: ['4', '5', '6', '7'], category: 'math' },
    { question: 'What is 3 to the power of 3?', answers: ['27', 'twenty-seven', 'twenty seven'], options: ['9', '18', '27', '36'], category: 'math' },
    { question: 'What is 0.5 as a fraction?', answers: ['1/2', 'one half', 'half'], options: ['1/3', '1/2', '3/4', '2/3'], category: 'math' },
    { question: 'How many faces does a pyramid have?', answers: ['5', 'five'], options: ['3', '4', '5', '6'], category: 'math' },
    { question: 'What is the next prime number after 7?', answers: ['11', 'eleven'], options: ['8', '9', '10', '11'], category: 'math' },
    { question: 'What is 144÷12?', answers: ['12', 'twelve'], options: ['10', '11', '12', '14'], category: 'math' },
    { question: 'What is the perimeter of a square with side 5?', answers: ['20', 'twenty'], options: ['10', '15', '20', '25'], category: 'math' },
    { question: 'What is 3+4×2?', answers: ['11', 'eleven'], options: ['14', '11', '10', '12'], category: 'math' },
    { question: 'How many zeros in one million?', answers: ['6', 'six'], options: ['3', '6', '9', '12'], category: 'math' },
    { question: 'What fraction of a pizza is half?', answers: ['1/2', 'one half', 'half'], options: ['1/3', '1/2', '1/4', '2/3'], category: 'math' },
    { question: 'What is 99+1?', answers: ['100', 'one hundred'], options: ['99', '100', '101', '110'], category: 'math' },
    { question: 'How many vertices does a triangle have?', answers: ['3', 'three'], options: ['2', '3', '4', '5'], category: 'math' },
    { question: 'What is the area of a 3x3 square?', answers: ['9', 'nine'], options: ['6', '9', '12', '15'], category: 'math' },
    { question: 'What is 20-12?', answers: ['8', 'eight'], options: ['6', '7', '8', '10'], category: 'math' },
    { question: 'Which is bigger: 0.5 or 0.25?', answers: ['0.5', 'point five'], options: ['0.5', '0.25', 'Equal', 'Neither'], category: 'math' },
    { question: 'What is 7x7?', answers: ['49', 'forty-nine', 'forty nine'], options: ['42', '47', '49', '56'], category: 'math' },
    { question: 'How many minutes in an hour?', answers: ['60', 'sixty'], options: ['30', '45', '60', '100'], category: 'math' },
    { question: 'What is 8+8+8?', answers: ['24', 'twenty-four', 'twenty four'], options: ['16', '24', '32', '36'], category: 'math' },
    { question: 'What is the value of pi to 2 decimal places?', answers: ['3.14', 'three point one four'], options: ['3.12', '3.14', '3.16', '3.18'], category: 'math' }
  ],
  geography: [
    { question: 'What is the capital of France?', answers: ['paris'], options: ['London', 'Paris', 'Berlin', 'Madrid'], category: 'geography' },
    { question: 'Which continent is Germany in?', answers: ['europe'], options: ['Asia', 'Africa', 'Europe', 'South America'], category: 'geography' },
    { question: 'What is the longest river in the world?', answers: ['nile', 'the nile'], options: ['Amazon', 'Nile', 'Mississippi', 'Yangtze'], category: 'geography' },
    { question: 'Which country has the most people?', answers: ['china', 'india', 'china/india'], options: ['USA', 'China', 'India', 'Russia'], category: 'geography' },
    { question: 'What is the capital of the UK?', answers: ['london'], options: ['Paris', 'London', 'Berlin', 'Rome'], category: 'geography' },
    { question: 'How many continents are there?', answers: ['7', 'seven'], options: ['5', '6', '7', '8'], category: 'geography' },
    { question: 'What ocean is to the west of Europe?', answers: ['atlantic', 'atlantic ocean'], options: ['Pacific', 'Atlantic', 'Indian', 'Arctic'], category: 'geography' },
    { question: 'Which country is known for tulips?', answers: ['netherlands', 'holland'], options: ['France', 'Germany', 'Netherlands', 'Italy'], category: 'geography' },
    { question: 'What is the smallest continent?', answers: ['australia', 'oceania'], options: ['Europe', 'Australia', 'Antarctica', 'South America'], category: 'geography' },
    { question: 'What is the capital of Germany?', answers: ['berlin'], options: ['Munich', 'Hamburg', 'Berlin', 'Frankfurt'], category: 'geography' },
    { question: 'Which mountain is the tallest in the world?', answers: ['everest', 'mount everest'], options: ['K2', 'Everest', 'Kilimanjaro', 'Denali'], category: 'geography' },
    { question: 'What is the largest country by area?', answers: ['russia'], options: ['USA', 'China', 'Russia', 'Canada'], category: 'geography' },
    { question: 'What is the capital of Italy?', answers: ['rome'], options: ['Milan', 'Venice', 'Rome', 'Florence'], category: 'geography' },
    { question: 'Which desert is the largest hot desert?', answers: ['sahara'], options: ['Gobi', 'Sahara', 'Kalahari', 'Arabian'], category: 'geography' },
    { question: 'What river flows through London?', answers: ['thames'], options: ['Seine', 'Thames', 'Danube', 'Rhine'], category: 'geography' },
    { question: 'Which country is shaped like a boot?', answers: ['italy'], options: ['France', 'Spain', 'Italy', 'Greece'], category: 'geography' },
    { question: 'What is the capital of Spain?', answers: ['madrid'], options: ['Barcelona', 'Madrid', 'Valencia', 'Seville'], category: 'geography' },
    { question: 'How many countries are in Europe?', answers: ['44', '50', 'about 44', 'approximately 44'], options: ['27', '44', '50', '55'], category: 'geography' },
    { question: 'What is the longest river in Europe?', answers: ['volga'], options: ['Danube', 'Rhine', 'Volga', 'Seine'], category: 'geography' },
    { question: 'What is the capital of Poland?', answers: ['warsaw'], options: ['Krakow', 'Warsaw', 'Gdansk', 'Wroclaw'], category: 'geography' },
    { question: 'Which ocean is the deepest?', answers: ['pacific', 'pacific ocean'], options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'], category: 'geography' },
    { question: 'What is the capital of Sweden?', answers: ['stockholm'], options: ['Oslo', 'Helsinki', 'Stockholm', 'Copenhagen'], category: 'geography' },
    { question: 'Which country has the most lakes?', answers: ['canada', 'finland'], options: ['USA', 'Canada', 'Russia', 'Sweden'], category: 'geography' },
    { question: 'What is the capital of Norway?', answers: ['oslo'], options: ['Bergen', 'Oslo', 'Stavanger', 'Trondheim'], category: 'geography' },
    { question: 'What is the largest lake in Europe?', answers: ['ladoga', 'lake ladoga'], options: ['Geneva', 'Ladoga', 'Como', 'Balaton'], category: 'geography' },
    { question: 'What is the capital of Denmark?', answers: ['copenhagen'], options: ['Aarhus', 'Odense', 'Copenhagen', 'Aalborg'], category: 'geography' },
    { question: 'Which country is known for the Northern Lights?', answers: ['norway', 'sweden', 'finland', 'iceland'], options: ['Italy', 'Norway', 'Spain', 'Greece'], category: 'geography' },
    { question: 'What is the capital of Switzerland?', answers: ['bern'], options: ['Zurich', 'Geneva', 'Bern', 'Basel'], category: 'geography' },
    { question: 'Which strait separates Europe from Africa?', answers: ['gibraltar'], options: ['Bosphorus', 'Gibraltar', 'Malacca', 'Hormuz'], category: 'geography' },
    { question: 'What is the highest mountain in Europe?', answers: ['elbrus', 'mount elbrus'], options: ['Mont Blanc', 'Elbrus', 'Matterhorn', 'Eiger'], category: 'geography' },
    { question: 'What is the capital of the Netherlands?', answers: ['amsterdam'], options: ['Rotterdam', 'Amsterdam', 'The Hague', 'Utrecht'], category: 'geography' },
    { question: 'Which country has the most UNESCO World Heritage sites?', answers: ['italy', 'china'], options: ['France', 'Italy', 'Spain', 'China'], category: 'geography' },
    { question: 'What is the driest continent?', answers: ['antarctica', 'australia'], options: ['Africa', 'Antarctica', 'Australia', 'South America'], category: 'geography' },
    { question: 'What is the capital of Austria?', answers: ['vienna'], options: ['Salzburg', 'Graz', 'Vienna', 'Innsbruck'], category: 'geography' },
    { question: 'Which sea is between Europe and Africa?', answers: ['mediterranean', 'mediterranean sea'], options: ['Black Sea', 'Mediterranean', 'Red Sea', 'North Sea'], category: 'geography' },
    { question: 'What is the capital of Portugal?', answers: ['lisbon'], options: ['Porto', 'Lisbon', 'Faro', 'Coimbra'], category: 'geography' },
    { question: 'Which country has both Atlantic and Mediterranean coasts?', answers: ['france', 'spain'], options: ['Germany', 'France', 'Poland', 'UK'], category: 'geography' },
    { question: 'What is the longest mountain range in the world?', answers: ['andes'], options: ['Himalayas', 'Andes', 'Rockies', 'Alps'], category: 'geography' },
    { question: 'What is the capital of Belgium?', answers: ['brussels'], options: ['Antwerp', 'Ghent', 'Brussels', 'Bruges'], category: 'geography' },
    { question: 'Which country is entirely surrounded by Italy?', answers: ['san marino', 'vatican city'], options: ['Monaco', 'San Marino', 'Austria', 'Slovenia'], category: 'geography' }
  ],
  history: [
    { question: 'Who built the pyramids of Egypt?', answers: ['ancient egyptians', 'egyptians'], options: ['Romans', 'Ancient Egyptians', 'Greeks', 'Vikings'], category: 'history' },
    { question: 'Where did the Olympic Games start?', answers: ['greece', 'ancient greece'], options: ['Rome', 'Greece', 'Egypt', 'China'], category: 'history' },
    { question: 'Who discovered America in 1492?', answers: ['columbus', 'christopher columbus'], options: ['Vikings', 'Columbus', 'Magellan', 'Cook'], category: 'history' },
    { question: 'What language did the Romans speak?', answers: ['latin'], options: ['Greek', 'Latin', 'Italian', 'Roman'], category: 'history' },
    { question: 'Which period did knights live in?', answers: ['middle ages', 'medieval'], options: ['Ancient', 'Middle Ages', 'Modern', 'Renaissance'], category: 'history' },
    { question: 'Who was the first President of the United States?', answers: ['washington', 'george washington'], options: ['Jefferson', 'Washington', 'Lincoln', 'Adams'], category: 'history' },
    { question: 'What ancient civilization built the Colosseum?', answers: ['roman', 'ancient rome', 'romans'], options: ['Greek', 'Roman', 'Egyptian', 'Persian'], category: 'history' },
    { question: 'Who painted the Mona Lisa?', answers: ['da vinci', 'leonardo da vinci'], options: ['Michelangelo', 'Da Vinci', 'Raphael', 'Rembrandt'], category: 'history' },
    { question: 'What year did World War II end?', answers: ['1945'], options: ['1943', '1944', '1945', '1946'], category: 'history' },
    { question: 'Which ancient wonder was located in Egypt?', answers: ['great pyramid', 'pyramids', 'lighthouse'], options: ['Colossus', 'Great Pyramid', 'Hanging Gardens', 'Temple of Artemis'], category: 'history' },
    { question: 'Who was the first woman to fly solo across the Atlantic?', answers: ['earhart', 'amelia earhart'], options: ['Earhart', 'Lindbergh', 'Coleman', 'Quimby'], category: 'history' },
    { question: 'What empire was ruled by Genghis Khan?', answers: ['mongol', 'mongol empire'], options: ['Ottoman', 'Mongol', 'Roman', 'Persian'], category: 'history' },
    { question: 'Which invention is Johannes Gutenberg known for?', answers: ['printing press'], options: ['Steam engine', 'Printing press', 'Light bulb', 'Telephone'], category: 'history' },
    { question: 'What ship brought the Pilgrims to America?', answers: ['mayflower'], options: ['Santa Maria', 'Mayflower', 'Endeavour', 'Victoria'], category: 'history' },
    { question: 'Who was the last pharaoh of Egypt?', answers: ['cleopatra'], options: ['Nefertiti', 'Cleopatra', 'Hatshepsut', 'Ramesses'], category: 'history' },
    { question: 'What wall divided Berlin?', answers: ['berlin wall'], options: ['Great Wall', 'Berlin Wall', 'Hadrian\'s Wall', 'Western Wall'], category: 'history' },
    { question: 'Which civilization invented the wheel?', answers: ['mesopotamian', 'sumerian', 'mesopotamia'], options: ['Egyptian', 'Mesopotamian', 'Chinese', 'Greek'], category: 'history' },
    { question: 'What was the longest war in history?', answers: ['hundred years war', '100 years war'], options: ['World War II', '100 Years War', 'Vietnam War', 'Cold War'], category: 'history' },
    { question: 'Who was the first emperor of China?', answers: ['qin shi huang', 'qin'], options: ['Sun Yat-sen', 'Qin Shi Huang', 'Kublai Khan', 'Mao Zedong'], category: 'history' },
    { question: 'What structure was built in 1889 for the World Fair?', answers: ['eiffel tower'], options: ['Big Ben', 'Eiffel Tower', 'Statue of Liberty', 'Colosseum'], category: 'history' },
    { question: 'Who is known for the theory of evolution?', answers: ['darwin', 'charles darwin'], options: ['Newton', 'Darwin', 'Einstein', 'Galileo'], category: 'history' },
    { question: 'What ancient civilization invented democracy?', answers: ['greek', 'greeks', 'athenian', 'athens'], options: ['Roman', 'Greek', 'Egyptian', 'Persian'], category: 'history' },
    { question: 'Which country was the first to give women the right to vote?', answers: ['new zealand'], options: ['USA', 'UK', 'New Zealand', 'France'], category: 'history' },
    { question: 'Who founded the Mongol Empire?', answers: ['genghis khan'], options: ['Kublai Khan', 'Genghis Khan', 'Attila', 'Tamerlane'], category: 'history' },
    { question: 'What event started World War I?', answers: ['assassination of archduke ferdinand'], options: ['Invasion of Poland', 'Assassination of Archduke Ferdinand', 'Sinking of Lusitania', 'Battle of Somme'], category: 'history' },
    { question: 'Who discovered penicillin?', answers: ['fleming', 'alexander fleming'], options: ['Pasteur', 'Fleming', 'Koch', 'Lister'], category: 'history' },
    { question: 'What castle is the official residence of the British monarch?', answers: ['buckingham palace'], options: ['Windsor Castle', 'Buckingham Palace', 'Tower of London', 'Kensington Palace'], category: 'history' },
    { question: 'Which country gifted the Statue of Liberty to the USA?', answers: ['france'], options: ['UK', 'Spain', 'France', 'Germany'], category: 'history' },
    { question: 'Who was the first human to walk on the Moon?', answers: ['armstrong', 'neil armstrong'], options: ['Aldrin', 'Armstrong', 'Gagarin', 'Shepard'], category: 'history' },
    { question: 'What language was the Rosetta Stone written in?', answers: ['egyptian', 'greek', 'hieroglyphics'], options: ['Latin', 'Egyptian', 'Hebrew', 'Arabic'], category: 'history' },
    { question: 'Which empire was known as the "Empire on which the sun never sets"?', answers: ['british empire'], options: ['Roman', 'British', 'Spanish', 'Ottoman'], category: 'history' },
    { question: 'What year did the Titanic sink?', answers: ['1912'], options: ['1910', '1911', '1912', '1913'], category: 'history' },
    { question: 'Who was the famous queen of ancient Egypt known for her beauty?', answers: ['cleopatra', 'nefertiti'], options: ['Cleopatra', 'Nefertiti', 'Hatshepsut', 'Ankhesenamun'], category: 'history' },
    { question: 'What invention is Thomas Edison known for?', answers: ['light bulb', 'phonograph'], options: ['Telephone', 'Light bulb', 'Radio', 'Telegraph'], category: 'history' },
    { question: 'Which country was the first to use paper money?', answers: ['china'], options: ['India', 'Greece', 'China', 'Persia'], category: 'history' },
    { question: 'Who wrote the "I Have a Dream" speech?', answers: ['martin luther king', 'mlk', 'martin luther king jr'], options: ['Malcolm X', 'MLK', 'Roosevelt', 'Kennedy'], category: 'history' },
    { question: 'What year did the Berlin Wall fall?', answers: ['1989'], options: ['1987', '1988', '1989', '1990'], category: 'history' },
    { question: 'Which ancient wonder was located in Babylon?', answers: ['hanging gardens'], options: ['Colossus', 'Hanging Gardens', 'Great Pyramid', 'Lighthouse'], category: 'history' },
    { question: 'Who was the first European to reach India by sea?', answers: ['da gama', 'vasco da gama'], options: ['Columbus', 'Da Gama', 'Magellan', 'Drake'], category: 'history' },
    { question: 'What pandemic killed millions in Europe in the 1300s?', answers: ['black death', 'plague', 'bubonic plague'], options: ['Spanish Flu', 'Black Death', 'Smallpox', 'Cholera'], category: 'history' }
  ],
  nature: [
    { question: 'What is the largest land animal?', answers: ['african elephant', 'elephant'], options: ['Rhinoceros', 'Hippopotamus', 'African Elephant', 'Giraffe'], category: 'nature' },
    { question: 'Which bird cannot fly?', answers: ['penguin', 'ostrich', 'kiwi'], options: ['Sparrow', 'Penguin', 'Eagle', 'Hawk'], category: 'nature' },
    { question: 'What is the fastest land animal?', answers: ['cheetah'], options: ['Lion', 'Cheetah', 'Gazelle', 'Horse'], category: 'nature' },
    { question: 'Which animal sleeps the most?', answers: ['koala', 'bat'], options: ['Cat', 'Koala', 'Dog', 'Sloth'], category: 'nature' },
    { question: 'What is the tallest animal?', answers: ['giraffe'], options: ['Elephant', 'Giraffe', 'Camel', 'Ostrich'], category: 'nature' },
    { question: 'Which animal is known as the "king of the jungle"?', answers: ['lion'], options: ['Tiger', 'Lion', 'Bear', 'Leopard'], category: 'nature' },
    { question: 'What type of tree does maple syrup come from?', answers: ['maple'], options: ['Oak', 'Maple', 'Pine', 'Birch'], category: 'nature' },
    { question: 'What is the largest species of shark?', answers: ['whale shark'], options: ['Great White', 'Whale Shark', 'Hammerhead', 'Tiger Shark'], category: 'nature' },
    { question: 'Which animal can live both in water and on land?', answers: ['amphibian', 'frog', 'crocodile'], options: ['Fish', 'Frog', 'Snake', 'Bird'], category: 'nature' },
    { question: 'What is the longest-living animal?', answers: ['greenland shark', 'giant tortoise', 'bowhead whale'], options: ['Elephant', 'Greenland Shark', 'Parrot', 'Dog'], category: 'nature' },
    { question: 'Which flower is a symbol of the Netherlands?', answers: ['tulip'], options: ['Rose', 'Tulip', 'Sunflower', 'Daisy'], category: 'nature' },
    { question: 'What type of animal is a Komodo dragon?', answers: ['lizard'], options: ['Snake', 'Lizard', 'Crocodile', 'Turtle'], category: 'nature' },
    { question: 'Which animal has the longest neck?', answers: ['giraffe'], options: ['Camel', 'Giraffe', 'Ostrich', 'Llama'], category: 'nature' },
    { question: 'What is the largest type of bear?', answers: ['polar bear', 'kodiak bear'], options: ['Brown Bear', 'Polar Bear', 'Black Bear', 'Panda'], category: 'nature' },
    { question: 'Which animal is known to use tools?', answers: ['chimpanzee', 'crow', 'dolphin'], options: ['Dog', 'Chimpanzee', 'Cat', 'Horse'], category: 'nature' },
    { question: 'What is the fastest bird?', answers: ['peregrine falcon'], options: ['Eagle', 'Peregrine Falcon', 'Swift', 'Hummingbird'], category: 'nature' },
    { question: 'Which plant can eat insects?', answers: ['venus flytrap', 'pitcher plant'], options: ['Rose', 'Venus Flytrap', 'Sunflower', 'Tulip'], category: 'nature' },
    { question: 'What is the largest reptile?', answers: ['saltwater crocodile'], options: ['Alligator', 'Saltwater Crocodile', 'Komodo Dragon', 'Anaconda'], category: 'nature' },
    { question: 'Which animal is a marsupial?', answers: ['kangaroo', 'koala', 'wombat'], options: ['Bear', 'Kangaroo', 'Deer', 'Fox'], category: 'nature' },
    { question: 'What is the main food of a panda?', answers: ['bamboo'], options: ['Leaves', 'Bamboo', 'Fruit', 'Fish'], category: 'nature' },
    { question: 'Which animal has the largest brain?', answers: ['sperm whale'], options: ['Elephant', 'Sperm Whale', 'Dolphin', 'Human'], category: 'nature' },
    { question: 'What color is a flamingo because of its diet?', answers: ['pink', 'pink/red'], options: ['White', 'Pink', 'Red', 'Orange'], category: 'nature' },
    { question: 'Which animal can change gender?', answers: ['clownfish', 'some fish'], options: ['Frog', 'Clownfish', 'Seahorse', 'Turtle'], category: 'nature' },
    { question: 'What is the national animal of Australia?', answers: ['kangaroo', 'red kangaroo'], options: ['Koala', 'Kangaroo', 'Platypus', 'Wombat'], category: 'nature' },
    { question: 'Which animal has three hearts?', answers: ['octopus'], options: ['Squid', 'Octopus', 'Crab', 'Lobster'], category: 'nature' },
    { question: 'What is the largest snake?', answers: ['green anaconda', 'reticulated python'], options: ['Cobra', 'Green Anaconda', 'Viper', 'Boa'], category: 'nature' },
    { question: 'Which insect is known for building large hives?', answers: ['honeybee', 'bee'], options: ['Ant', 'Honeybee', 'Wasp', 'Termite'], category: 'nature' },
    { question: 'What type of tree can live for thousands of years?', answers: ['bristlecone pine'], options: ['Oak', 'Bristlecone Pine', 'Sequoia', 'Redwood'], category: 'nature' },
    { question: 'Which animal has the longest migration?', answers: ['arctic tern'], options: ['Monarch Butterfly', 'Arctic Tern', 'Wildebeest', 'Salmon'], category: 'nature' },
    { question: 'What is the national flower of England?', answers: ['rose'], options: ['Daisy', 'Rose', 'Lily', 'Tulip'], category: 'nature' }
  ],
  technology: [
    { question: 'Who invented the World Wide Web?', answers: ['berners-lee', 'tim berners-lee'], options: ['Gates', 'Berners-Lee', 'Zuckerberg', 'Jobs'], category: 'technology' },
    { question: 'What does "www" stand for?', answers: ['world wide web'], options: ['World Wide Web', 'Web World Wide', 'World Web Wide', 'Wide Web World'], category: 'technology' },
    { question: 'What is the brain of a computer called?', answers: ['cpu', 'central processing unit', 'processor'], options: ['RAM', 'CPU', 'GPU', 'Hard Drive'], category: 'technology' },
    { question: 'What does "RAM" stand for?', answers: ['random access memory'], options: ['Read Access Memory', 'Random Access Memory', 'Run Access Module', 'Real Application Memory'], category: 'technology' },
    { question: 'Which company created the iPhone?', answers: ['apple'], options: ['Samsung', 'Google', 'Apple', 'Microsoft'], category: 'technology' },
    { question: 'What is the most used search engine?', answers: ['google'], options: ['Bing', 'Yahoo', 'Google', 'DuckDuckGo'], category: 'technology' },
    { question: 'What does "USB" stand for?', answers: ['universal serial bus'], options: ['Universal Serial Bus', 'United Serial Bus', 'Universal System Bus', 'United System Bus'], category: 'technology' },
    { question: 'Which programming language is used for web pages?', answers: ['javascript', 'html', 'css'], options: ['Python', 'JavaScript', 'Java', 'C++'], category: 'technology' },
    { question: 'What is the name of the first computer virus?', answers: ['creeper'], options: ['ILOVEYOU', 'Creeper', 'Melissa', 'Morris'], category: 'technology' },
    { question: 'What does "AI" stand for?', answers: ['artificial intelligence'], options: ['Artificial Intelligence', 'Automated Input', 'Active Interface', 'Artificial Internet'], category: 'technology' },
    { question: 'Who co-founded Microsoft?', answers: ['bill gates', 'paul allen'], options: ['Steve Jobs', 'Bill Gates', 'Mark Zuckerberg', 'Jeff Bezos'], category: 'technology' },
    { question: 'What is the most popular social media platform?', answers: ['facebook', 'youtube', 'tiktok'], options: ['Twitter', 'Facebook', 'Instagram', 'Snapchat'], category: 'technology' },
    { question: 'What does "HTML" stand for?', answers: ['hypertext markup language'], options: ['Hypertext Markup Language', 'High Tech Modern Language', 'Hyper Transfer Markup Language', 'Home Tool Markup Language'], category: 'technology' },
    { question: 'What is the process of converting data into a secret code?', answers: ['encryption'], options: ['Encoding', 'Encryption', 'Decryption', 'Compression'], category: 'technology' },
    { question: 'Which company makes the Android operating system?', answers: ['google'], options: ['Samsung', 'Apple', 'Google', 'Microsoft'], category: 'technology' },
    { question: 'What does "IP" stand for in IP address?', answers: ['internet protocol'], options: ['Internet Protocol', 'Internal Protocol', 'Information Protocol', 'Internet Provider'], category: 'technology' },
    { question: 'Who invented the telephone?', answers: ['bell', 'alexander graham bell'], options: ['Edison', 'Bell', 'Tesla', 'Marconi'], category: 'technology' },
    { question: 'What is the name for a program that damages a computer?', answers: ['virus', 'malware'], options: ['Bug', 'Virus', 'Glitch', 'Error'], category: 'technology' },
    { question: 'What does "WiFi" stand for?', answers: ['wireless fidelity'], options: ['Wireless Fidelity', 'Wireless Finder', 'Wide Frequency', 'Wireless Fiber'], category: 'technology' },
    { question: 'What year was the Internet created?', answers: ['1969', '1983', '1989'], options: ['1975', '1989', '1995', '2000'], category: 'technology' },
    { question: 'Which device uses a stylus?', answers: ['tablet', 'graphics tablet'], options: ['Smartwatch', 'Tablet', 'Laptop', 'Desktop'], category: 'technology' },
    { question: 'What is the cloud in computing?', answers: ['remote servers', 'internet storage'], options: ['Weather data', 'Remote servers', 'Wireless signal', 'A type of software'], category: 'technology' },
    { question: 'What does "email" stand for?', answers: ['electronic mail'], options: ['Electric Mail', 'Electronic Mail', 'Express Mail', 'Emergency Mail'], category: 'technology' },
    { question: 'Who founded Amazon?', answers: ['bezos', 'jeff bezos'], options: ['Gates', 'Bezos', 'Musk', 'Zuckerberg'], category: 'technology' },
    { question: 'What is the main circuit board of a computer called?', answers: ['motherboard', 'mainboard'], options: ['Processor', 'Motherboard', 'Hard Drive', 'RAM'], category: 'technology' },
    { question: 'What does "3D" stand for?', answers: ['three-dimensional', 'three dimensional'], options: ['Three Dimensional', 'Digital Design', 'Dynamic Display', 'Double Density'], category: 'technology' },
    { question: 'Which language is used for iOS apps?', answers: ['swift', 'objective-c'], options: ['Java', 'Swift', 'Python', 'C#'], category: 'technology' },
    { question: 'What is an algorithm?', answers: ['step by step instructions', 'a set of rules'], options: ['A type of math', 'Step by step instructions', 'A programming language', 'A computer part'], category: 'technology' },
    { question: 'What is the most common type of computer?', answers: ['personal computer', 'pc', 'laptop'], options: ['Supercomputer', 'Personal Computer', 'Mainframe', 'Server'], category: 'technology' },
    { question: 'What does "browser" mean?', answers: ['web browser', 'internet browser'], options: ['A person who browses', 'Web browser', 'A type of virus', 'A search engine'], category: 'technology' },
    { question: 'Who is known as the father of computers?', answers: ['babbage', 'charles babbage', 'turing', 'alan turing'], options: ['Babbage', 'Jobs', 'Gates', 'Einstein'], category: 'technology' },
    { question: 'What is a pixel?', answers: ['smallest unit of a digital image', 'picture element'], options: ['A type of phone', 'Smallest unit of an image', 'A computer part', 'A kind of art'], category: 'technology' },
    { question: 'Which company created Windows?', answers: ['microsoft'], options: ['Apple', 'Google', 'Microsoft', 'IBM'], category: 'technology' },
    { question: 'What is the most popular programming language?', answers: ['javascript', 'python', 'java'], options: ['C++', 'JavaScript', 'Ruby', 'PHP'], category: 'technology' },
    { question: 'What is the Internet of Things (IoT)?', answers: ['connected devices', 'smart devices network'], options: ['A type of internet', 'Connected devices', 'A social network', 'A search engine'], category: 'technology' },
    { question: 'What does "4K" mean for a TV?', answers: ['3840x2160 pixels', 'ultra hd', '4000 pixels'], options: ['4000 channels', '3840x2160 resolution', '4 times faster', '4 kilograms'], category: 'technology' },
    { question: 'Which company makes the PlayStation?', answers: ['sony'], options: ['Microsoft', 'Nintendo', 'Sony', 'Sega'], category: 'technology' },
    { question: 'What is an operating system?', answers: ['software that manages hardware', 'os'], options: ['A type of application', 'Software that manages hardware', 'A computer part', 'A programming tool'], category: 'technology' },
    { question: 'What does "2FA" stand for?', answers: ['two factor authentication'], options: ['Two Factor Authentication', 'Fast Access', 'File Authentication', 'Fingerprint Access'], category: 'technology' },
    { question: 'What is the most popular video calling app?', answers: ['zoom', 'skype', 'facetime', 'whatsapp'], options: ['Skype', 'Zoom', 'FaceTime', 'Google Meet'], category: 'technology' }
  ],
  language: [
    { question: 'How many letters are in the English alphabet?', answers: ['26', 'twenty-six', 'twenty six'], options: ['24', '26', '28', '30'], category: 'language' },
    { question: 'What is the most spoken language in the world?', answers: ['mandarin', 'chinese', 'mandarin chinese'], options: ['English', 'Mandarin', 'Spanish', 'Hindi'], category: 'language' },
    { question: 'What is a word that means the same as another?', answers: ['synonym'], options: ['Antonym', 'Synonym', 'Homonym', 'Acronym'], category: 'language' },
    { question: 'What is the opposite of "begin"?', answers: ['end', 'finish', 'stop'], options: ['Start', 'End', 'Continue', 'Open'], category: 'language' },
    { question: 'What is the plural of "child"?', answers: ['children'], options: ['Childs', 'Children', 'Childes', 'Child\'s'], category: 'language' },
    { question: 'Which language has the most native speakers?', answers: ['mandarin', 'chinese', 'spanish'], options: ['English', 'Mandarin', 'Spanish', 'Hindi'], category: 'language' },
    { question: 'What is a verb?', answers: ['action word', 'doing word'], options: ['Naming word', 'Action word', 'Describing word', 'Joining word'], category: 'language' },
    { question: 'What punctuation ends a question?', answers: ['question mark', '?'], options: ['Period', 'Question mark', 'Exclamation mark', 'Comma'], category: 'language' },
    { question: 'What is the longest word in English?', answers: ['pneumonoultramicroscopicsilicovolcanoconiosis'], options: ['Antidisestablishment', 'Pneumonoultramicroscopicsilicovolcanoconiosis', 'Floccinaucinihilipilification', 'Supercalifragilisticexpialidocious'], category: 'language' },
    { question: 'What is a noun?', answers: ['person place or thing', 'naming word'], options: ['Action word', 'Person, place, or thing', 'Describing word', 'Connecting word'], category: 'language' },
    { question: 'What is the most common letter in English?', answers: ['e'], options: ['A', 'E', 'S', 'T'], category: 'language' },
    { question: 'What is it called when a word sounds like its meaning?', answers: ['onomatopoeia'], options: ['Alliteration', 'Onomatopoeia', 'Simile', 'Metaphor'], category: 'language' },
    { question: 'What language do they speak in Brazil?', answers: ['portuguese'], options: ['Spanish', 'Portuguese', 'French', 'English'], category: 'language' },
    { question: 'What is an adjective?', answers: ['describing word'], options: ['Naming word', 'Action word', 'Describing word', 'Connecting word'], category: 'language' },
    { question: 'How do you say "hello" in French?', answers: ['bonjour', 'salut'], options: ['Hola', 'Bonjour', 'Ciao', 'Hallo'], category: 'language' },
    { question: 'What is an antonym?', answers: ['opposite word'], options: ['Same word', 'Opposite word', 'Sound-alike word', 'Compound word'], category: 'language' },
    { question: 'How do you say "thank you" in German?', answers: ['danke'], options: ['Merci', 'Danke', 'Gracias', 'Arigato'], category: 'language' },
    { question: 'What is the study of language called?', answers: ['linguistics'], options: ['Grammar', 'Linguistics', 'Literature', 'Philology'], category: 'language' },
    { question: 'What is the most widely studied second language?', answers: ['english'], options: ['Spanish', 'English', 'French', 'Mandarin'], category: 'language' },
    { question: 'What is a palindrome?', answers: ['spelled same forwards and backwards', 'reverse word'], options: ['Same word', 'Spells same forward/backward', 'Two words merged', 'Reverse spelling'], category: 'language' }
  ],
  sports: [
    { question: 'Which sport is played at Wimbledon?', answers: ['tennis'], options: ['Badminton', 'Tennis', 'Cricket', 'Golf'], category: 'sports' },
    { question: 'How many players are on a soccer team?', answers: ['11', 'eleven'], options: ['9', '10', '11', '12'], category: 'sports' },
    { question: 'Which country invented basketball?', answers: ['usa', 'united states', 'america'], options: ['UK', 'USA', 'Canada', 'Australia'], category: 'sports' },
    { question: 'What sport uses a shuttlecock?', answers: ['badminton'], options: ['Tennis', 'Badminton', 'Squash', 'Volleyball'], category: 'sports' },
    { question: 'How many rings are on the Olympic flag?', answers: ['5', 'five'], options: ['3', '4', '5', '6'], category: 'sports' },
    { question: 'What is the most popular sport in Europe?', answers: ['football', 'soccer'], options: ['Tennis', 'Football', 'Basketball', 'Rugby'], category: 'sports' },
    { question: 'Which sport uses a cue and balls?', answers: ['billiards', 'snooker', 'pool'], options: ['Golf', 'Snooker', 'Bowling', 'Cricket'], category: 'sports' },
    { question: 'How many bases are in baseball?', answers: ['4', 'four'], options: ['3', '4', '5', '6'], category: 'sports' },
    { question: 'What is the fastest sport?', answers: ['badminton', 'table tennis'], options: ['Tennis', 'Badminton', 'Squash', 'Fencing'], category: 'sports' },
    { question: 'Which country has won the most World Cups?', answers: ['brazil'], options: ['Germany', 'Brazil', 'Italy', 'Argentina'], category: 'sports' },
    { question: 'What is the oldest Olympic sport?', answers: ['running', 'athletics', 'sprinting'], options: ['Wrestling', 'Running', 'Javelin', 'Discus'], category: 'sports' },
    { question: 'How many holes are in a standard golf course?', answers: ['18', 'eighteen'], options: ['9', '12', '18', '24'], category: 'sports' },
    { question: 'Which sport is known as "the sport of kings"?', answers: ['horse racing', 'polo'], options: ['Tennis', 'Horse Racing', 'Golf', 'Fencing'], category: 'sports' },
    { question: 'What is the diameter of a basketball hoop in inches?', answers: ['18', 'eighteen'], options: ['16', '18', '20', '22'], category: 'sports' },
    { question: 'Which sport uses a puck?', answers: ['ice hockey', 'hockey'], options: ['Field Hockey', 'Ice Hockey', 'Lacrosse', 'Hurling'], category: 'sports' },
    { question: 'How long is a marathon in miles?', answers: ['26.2', 'twenty-six point two', '42.2 km'], options: ['20', '26.2', '30', '42'], category: 'sports' },
    { question: 'What is the most decorated Olympic sport?', answers: ['swimming', 'gymnastics'], options: ['Track', 'Swimming', 'Gymnastics', 'Fencing'], category: 'sports' },
    { question: 'Which country invented football (soccer)?', answers: ['england', 'uk', 'britain'], options: ['Brazil', 'England', 'Italy', 'Germany'], category: 'sports' },
    { question: 'What sport uses a foil, epee, or sabre?', answers: ['fencing'], options: ['Archery', 'Fencing', 'Javelin', 'Karate'], category: 'sports' },
    { question: 'How many players are on a basketball team?', answers: ['5', 'five'], options: ['4', '5', '6', '7'], category: 'sports' }
  ],
  art: [
    { question: 'Who painted the Sistine Chapel ceiling?', answers: ['michelangelo'], options: ['Da Vinci', 'Michelangelo', 'Raphael', 'Donatello'], category: 'art' },
    { question: 'What primary colors make green?', answers: ['blue and yellow'], options: ['Red and Blue', 'Blue and Yellow', 'Red and Yellow', 'Blue and Green'], category: 'art' },
    { question: 'What is the art of paper folding called?', answers: ['origami'], options: ['Kirigami', 'Origami', 'Papier-mâché', 'Collage'], category: 'art' },
    { question: 'Who is famous for painting sunflowers?', answers: ['van gogh', 'vincent van gogh'], options: ['Monet', 'Van Gogh', 'Picasso', 'Rembrandt'], category: 'art' },
    { question: 'What type of paint uses egg yolk?', answers: ['tempera'], options: ['Oil', 'Tempera', 'Watercolor', 'Acrylic'], category: 'art' },
    { question: 'Which museum is the largest art museum in the world?', answers: ['louvre', 'the louvre'], options: ['British Museum', 'Louvre', 'Metropolitan', 'Hermitage'], category: 'art' },
    { question: 'What is the most expensive painting ever sold?', answers: ['salvator mundi', 'da vinci salvator mundi'], options: ['Mona Lisa', 'Salvator Mundi', 'Starry Night', 'The Scream'], category: 'art' },
    { question: 'Which art movement did Pablo Picasso co-found?', answers: ['cubism'], options: ['Impressionism', 'Cubism', 'Surrealism', 'Expressionism'], category: 'art' },
    { question: 'What are the three primary colors?', answers: ['red blue yellow', 'red, blue, yellow'], options: ['Red Green Blue', 'Red Blue Yellow', 'Green Blue Purple', 'Red Yellow Orange'], category: 'art' },
    { question: 'Who painted "The Persistence of Memory" (melting clocks)?', answers: ['dali', 'salvador dali'], options: ['Magritte', 'Dali', 'Picasso', 'Munch'], category: 'art' },
    { question: 'What is the art of beautiful handwriting called?', answers: ['calligraphy'], options: ['Typography', 'Calligraphy', 'Penmanship', 'Script'], category: 'art' },
    { question: 'Which artist cut off his own ear?', answers: ['van gogh', 'vincent van gogh'], options: ['Gauguin', 'Van Gogh', 'Rembrandt', 'Monet'], category: 'art' },
    { question: 'What is a self-portrait?', answers: ['portrait of oneself', 'self portrait'], options: ['Portrait of a friend', 'Portrait of oneself', 'Portrait of family', 'Portrait of a stranger'], category: 'art' },
    { question: 'What type of sculpture moves?', answers: ['mobile', 'kinetic art'], options: ['Relief', 'Mobile', 'Statue', 'Bust'], category: 'art' },
    { question: 'Who painted the Mona Lisa?', answers: ['da vinci', 'leonardo da vinci'], options: ['Michelangelo', 'Da Vinci', 'Raphael', 'Caravaggio'], category: 'art' },
    { question: 'What is the study of colors called?', answers: ['color theory'], options: ['Chromatics', 'Color Theory', 'Spectrum', 'Hue Study'], category: 'art' },
    { question: 'Which art style is known for dream-like images?', answers: ['surrealism'], options: ['Realism', 'Surrealism', 'Cubism', 'Abstract'], category: 'art' },
    { question: 'What are complementary colors?', answers: ['opposites on color wheel'], options: ['Same colors', 'Opposites on color wheel', 'Primary colors', 'Neutral colors'], category: 'art' },
    { question: 'Who was a famous Dutch painter?', answers: ['rembrandt', 'vermeer', 'van gogh'], options: ['Picasso', 'Rembrandt', 'Monet', 'Da Vinci'], category: 'art' },
    { question: 'What is a fresco?', answers: ['painting on wet plaster'], options: ['Oil painting', 'Painting on wet plaster', 'Watercolor', 'Wall painting'], category: 'art' },
    { question: 'Which museum is in Paris?', answers: ['louvre', 'musee d\'orsay'], options: ['British Museum', 'Louvre', 'Metropolitan', 'Uffizi'], category: 'art' },
    { question: 'What is a tint?', answers: ['color + white'], options: ['Color + black', 'Color + white', 'Color + gray', 'Pure color'], category: 'art' },
    { question: 'What is a shade?', answers: ['color + black'], options: ['Color + white', 'Color + black', 'Color + gray', 'Pure color'], category: 'art' },
    { question: 'Who sculpted David?', answers: ['michelangelo'], options: ['Donatello', 'Michelangelo', 'Bernini', 'Rodin'], category: 'art' },
    { question: 'What is pointillism?', answers: ['painting with dots'], options: ['Painting with dots', 'Painting with lines', 'Painting with shapes', 'Painting with fingers'], category: 'art' },
    { question: 'Which artist is famous for Campbell Soup cans?', answers: ['warhol', 'andy warhol'], options: ['Lichtenstein', 'Warhol', 'Pollock', 'Hockney'], category: 'art' },
    { question: 'What is the most famous sculpture?', answers: ['david', 'venus de milo', 'thinker'], options: ['David', 'Venus de Milo', 'The Thinker', 'Statue of Liberty'], category: 'art' },
    { question: 'What is ceramic made from?', answers: ['clay'], options: ['Stone', 'Clay', 'Glass', 'Wood'], category: 'art' },
    { question: 'Who painted "Starry Night"?', answers: ['van gogh', 'vincent van gogh'], options: ['Monet', 'Van Gogh', 'Gauguin', 'Seurat'], category: 'art' },
    { question: 'What is a landscape painting?', answers: ['painting of natural scenery'], options: ['Portrait of a person', 'Painting of natural scenery', 'Still life', 'Abstract art'], category: 'art' }
  ]
};

module.exports = new EntertainmentService();
