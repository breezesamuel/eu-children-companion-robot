const EventEmitter = require('events');
const logger = require('../utils/logger');

function inAgeRange(age, range) {
  if (!range) return true;
  var parts = range.split('-');
  return age >= parseInt(parts[0]) && age <= parseInt(parts[1]);
}

// ═════════════════════════════════════════════════════════════════════
// 1. MUSIC & AUDIO SERVICE
// ═════════════════════════════════════════════════════════════════════

var MUSIC_LIBRARY = [
  { id:'music-lull-01', title:'Twinkle Twinkle Little Star', composer:'Traditional', category:'lullabies', mood:'sleepy', ageRange:'4-6', duration:'2:30', desc:'A gentle lullaby about a twinkling star.', url:'audio/lullabies/twinkle-star.mp3' },
  { id:'music-lull-02', title:'Brahms Lullaby', composer:'Johannes Brahms', category:'lullabies', mood:'sleepy', ageRange:'4-6', duration:'3:15', desc:'The classic cradle song by Brahms.', url:'audio/lullabies/brahms-lullaby.mp3' },
  { id:'music-lull-03', title:'Rock-a-Bye Baby', composer:'Traditional', category:'lullabies', mood:'sleepy', ageRange:'4-6', duration:'2:10', desc:'A traditional lullaby rocking baby gently.', url:'audio/lullabies/rockabye-baby.mp3' },
  { id:'music-lull-04', title:'Hush Little Baby', composer:'Traditional', category:'lullabies', mood:'sleepy', ageRange:'4-6', duration:'2:45', desc:'A comforting lullaby promising gifts.', url:'audio/lullabies/hush-little-baby.mp3' },
  { id:'music-lull-05', title:'Au Clair de la Lune', composer:'Traditional French', category:'lullabies', mood:'calm', ageRange:'4-6', duration:'2:20', desc:'A gentle French lullaby about moonlight.', url:'audio/lullabies/au-clair-lune.mp3' },
  { id:'music-lull-06', title:'Guten Abend gut Nacht', composer:'Johannes Brahms', category:'lullabies', mood:'sleepy', ageRange:'4-6', duration:'3:00', desc:'Brahms famous German lullaby.', url:'audio/lullabies/guten-abend.mp3' },
  { id:'music-lull-07', title:'Schlaf Kindlein schlaf', composer:'Traditional German', category:'lullabies', mood:'sleepy', ageRange:'4-6', duration:'2:35', desc:'A German lullaby wishing peaceful sleep.', url:'audio/lullabies/schlaf-kindlein.mp3' },
  { id:'music-lull-08', title:'Doina de Leagan', composer:'Romanian Traditional', category:'lullabies', mood:'calm', ageRange:'4-6', duration:'3:10', desc:'A Romanian lullaby with flowing melody.', url:'audio/lullabies/doina-leagan.mp3' },
  { id:'music-lull-09', title:'All Through the Night', composer:'Traditional Welsh', category:'lullabies', mood:'sleepy', ageRange:'4-6', duration:'2:50', desc:'A Welsh lullaby promising love all night.', url:'audio/lullabies/all-through-night.mp3' },
  { id:'music-lull-10', title:'Faure Berceuse', composer:'Gabriel Faure', category:'lullabies', mood:'calm', ageRange:'4-8', duration:'3:25', desc:'A delicate lullaby from Dolly Suite.', url:'audio/lullabies/faure-berceuse.mp3' },
  { id:'music-nurs-01', title:'London Bridge Is Falling Down', composer:'Traditional English', category:'nurseryRhymes', mood:'happy', ageRange:'4-7', duration:'1:45', desc:'A classic English nursery rhyme.', url:'audio/nursery/london-bridge.mp3' },
  { id:'music-nurs-02', title:'Row Row Row Your Boat', composer:'Traditional', category:'nurseryRhymes', mood:'happy', ageRange:'4-7', duration:'1:30', desc:'A cheerful round about rowing.', url:'audio/nursery/row-your-boat.mp3' },
  { id:'music-nurs-03', title:'Head Shoulders Knees and Toes', composer:'Traditional', category:'nurseryRhymes', mood:'energetic', ageRange:'4-7', duration:'1:50', desc:'A movement song teaching body parts.', url:'audio/nursery/head-shoulders.mp3' },
  { id:'music-nurs-04', title:'Old MacDonald Had a Farm', composer:'Traditional', category:'nurseryRhymes', mood:'happy', ageRange:'4-7', duration:'2:15', desc:'A farmyard song with animal sounds.', url:'audio/nursery/old-macdonald.mp3' },
  { id:'music-nurs-05', title:'The Wheels on the Bus', composer:'Traditional English', category:'nurseryRhymes', mood:'happy', ageRange:'4-7', duration:'2:00', desc:'An action song about a busy bus.', url:'audio/nursery/wheels-on-bus.mp3' },
  { id:'music-nurs-06', title:'Itsy Bitsy Spider', composer:'Traditional', category:'nurseryRhymes', mood:'calm', ageRange:'4-7', duration:'1:35', desc:'A rhyme about a determined spider.', url:'audio/nursery/itsy-bitsy.mp3' },
  { id:'music-nurs-07', title:'Frere Jacques', composer:'Traditional French', category:'nurseryRhymes', mood:'calm', ageRange:'4-7', duration:'1:40', desc:'A French round about Brother John.', url:'audio/nursery/frere-jacques.mp3' },
  { id:'music-nurs-08', title:'Alle meine Entchen', composer:'Traditional German', category:'nurseryRhymes', mood:'happy', ageRange:'4-7', duration:'1:25', desc:'A German song about ducklings.', url:'audio/nursery/alle-meine-entchen.mp3' },
  { id:'music-clas-01', title:'Eine Kleine Nachtmusik', composer:'W.A. Mozart', category:'classical', mood:'happy', ageRange:'7-14', duration:'4:00', desc:'A lively serenade by Mozart.', url:'audio/classical/nachtmusik.mp3' },
  { id:'music-clas-02', title:'The Four Seasons - Spring', composer:'A. Vivaldi', category:'classical', mood:'happy', ageRange:'6-14', duration:'3:30', desc:'Vivaldi celebrating springtime.', url:'audio/classical/four-seasons-spring.mp3' },
  { id:'music-clas-03', title:'Clair de Lune', composer:'C. Debussy', category:'classical', mood:'calm', ageRange:'7-14', duration:'4:20', desc:'Moonlight-inspired piano piece.', url:'audio/classical/clair-de-lune.mp3' },
  { id:'music-clas-04', title:'The Carnival of the Animals - Aquarium', composer:'C. Saint-Saens', category:'classical', mood:'calm', ageRange:'5-14', duration:'2:15', desc:'Glassy aquarium music.', url:'audio/classical/aquarium.mp3' },
  { id:'music-clas-05', title:'The Nutcracker - Dance of the Sugar Plum Fairy', composer:'P. Tchaikovsky', category:'classical', mood:'happy', ageRange:'5-14', duration:'1:45', desc:'A magical dance from The Nutcracker.', url:'audio/classical/sugar-plum.mp3' },
  { id:'music-clas-06', title:'Gymnopedie No.1', composer:'E. Satie', category:'classical', mood:'calm', ageRange:'7-14', duration:'3:00', desc:'A calm and minimalist piano piece.', url:'audio/classical/gymnopedie-1.mp3' },
  { id:'music-clas-07', title:'Peer Gynt - Morning Mood', composer:'E. Grieg', category:'classical', mood:'happy', ageRange:'5-14', duration:'3:45', desc:'A sunrise depiction by Grieg.', url:'audio/classical/morning-mood.mp3' },
  { id:'music-clas-08', title:'Ode to Joy', composer:'L.v. Beethoven', category:'classical', mood:'happy', ageRange:'6-14', duration:'3:15', desc:'Beethoven celebrating universal brotherhood.', url:'audio/classical/ode-to-joy.mp3' },
  { id:'music-clas-09', title:'The Blue Danube', composer:'J. Strauss II', category:'classical', mood:'happy', ageRange:'7-14', duration:'4:10', desc:'The famous Viennese waltz.', url:'audio/classical/blue-danube.mp3' },
  { id:'music-clas-10', title:'Nocturne Op.9 No.2', composer:'F. Chopin', category:'classical', mood:'calm', ageRange:'8-14', duration:'3:40', desc:'Chopin romantic nocturne.', url:'audio/classical/nocturne-9-2.mp3' },
  { id:'music-folk-01', title:'Greensleeves', composer:'Traditional English', category:'folk', mood:'calm', ageRange:'6-14', duration:'3:20', desc:'A beautiful English folk song.', url:'audio/folk/greensleeves.mp3' },
  { id:'music-folk-02', title:'Scarborough Fair', composer:'Traditional English', category:'folk', mood:'calm', ageRange:'7-14', duration:'3:00', desc:'A traditional English ballad.', url:'audio/folk/scarborough-fair.mp3' },
  { id:'music-folk-03', title:'Kalinka', composer:'Ivan Larionov', category:'folk', mood:'energetic', ageRange:'6-14', duration:'2:45', desc:'A lively Russian folk song.', url:'audio/folk/kalinka.mp3' },
  { id:'music-folk-04', title:'La Cucaracha', composer:'Traditional Mexican', category:'folk', mood:'happy', ageRange:'6-14', duration:'2:00', desc:'A popular Spanish folk tune.', url:'audio/folk/la-cucaracha.mp3' },
  { id:'music-folk-05', title:'Sur le Pont d\'Avignon', composer:'Traditional French', category:'folk', mood:'happy', ageRange:'5-12', duration:'1:50', desc:'A French folk song about dancing.', url:'audio/folk/sur-le-pont.mp3' },
  { id:'music-folk-06', title:'O Tannenbaum', composer:'Traditional German', category:'folk', mood:'calm', ageRange:'5-14', duration:'2:30', desc:'A German Christmas folk song.', url:'audio/folk/o-tannenbaum.mp3' },
  { id:'music-folk-07', title:'Bella Ciao', composer:'Italian Traditional', category:'folk', mood:'energetic', ageRange:'8-14', duration:'2:45', desc:'A well-known Italian resistance song.', url:'audio/folk/bella-ciao.mp3' },
  { id:'music-folk-08', title:'Molly Malone', composer:'Traditional Irish', category:'folk', mood:'calm', ageRange:'7-14', duration:'3:10', desc:'An Irish ballad about a fishmonger.', url:'audio/folk/molly-malone.mp3' },
  { id:'music-folk-09', title:'Sakura Sakura', composer:'Traditional Japanese', category:'folk', mood:'calm', ageRange:'5-14', duration:'2:15', desc:'A Japanese folk song about cherry blossoms.', url:'audio/folk/sakura.mp3' },
  { id:'music-nat-01', title:'Morning Has Broken', composer:'Cat Stevens', category:'nature', mood:'happy', ageRange:'5-14', duration:'2:20', desc:'A song celebrating morning.', url:'audio/nature/morning-broken.mp3' },
  { id:'music-nat-02', title:'The Moldau', composer:'B. Smetana', category:'classical', mood:'calm', ageRange:'7-14', duration:'4:30', desc:'A river journey in music.', url:'audio/nature/moldau.mp3' },
  { id:'music-nat-03', title:'Over the Rainbow', composer:'Harold Arlen', category:'pop', mood:'calm', ageRange:'5-14', duration:'2:45', desc:'A hopeful song about dreaming.', url:'audio/nature/over-rainbow.mp3' },
  { id:'music-nat-04', title:'Waltz of the Flowers', composer:'P. Tchaikovsky', category:'classical', mood:'happy', ageRange:'6-14', duration:'3:15', desc:'Flower-themed ballet music.', url:'audio/nature/waltz-flowers.mp3' },
  { id:'music-instr-01', title:'Canon in D', composer:'J. Pachelbel', category:'classical', mood:'calm', ageRange:'7-14', duration:'4:20', desc:'A soothing and well-known canon.', url:'audio/instrumental/canon-d.mp3' },
  { id:'music-instr-02', title:'Moonlight Sonata', composer:'L.v. Beethoven', category:'classical', mood:'calm', ageRange:'8-14', duration:'5:00', desc:'Beethoven beautiful sonata.', url:'audio/instrumental/moonlight-sonata.mp3' },
  { id:'music-instr-03', title:'The Swan', composer:'C. Saint-Saens', category:'classical', mood:'calm', ageRange:'6-14', duration:'2:40', desc:'A graceful cello piece.', url:'audio/instrumental/the-swan.mp3' },
  { id:'music-instr-04', title:'Pavane for a Dead Princess', composer:'M. Ravel', category:'classical', mood:'calm', ageRange:'8-14', duration:'3:30', desc:'A slow pavane by Ravel.', url:'audio/instrumental/pavane.mp3' },
  { id:'music-instr-05', title:'Vocalise', composer:'S. Rachmaninoff', category:'classical', mood:'calm', ageRange:'8-14', duration:'3:20', desc:'A wordless vocal melody.', url:'audio/instrumental/vocalise.mp3' },
  { id:'music-instr-06', title:'Arabesque No.1', composer:'C. Debussy', category:'classical', mood:'calm', ageRange:'8-14', duration:'3:45', desc:'A flowing piano arabesque.', url:'audio/instrumental/arabesque-1.mp3' },
  { id:'music-cont-01', title:'Edelweiss', composer:'Rodgers & Hammerstein', category:'pop', mood:'calm', ageRange:'5-14', duration:'2:30', desc:'A song from The Sound of Music.', url:'audio/contemporary/edelweiss.mp3' },
  { id:'music-cont-02', title:'Somewhere Over the Rainbow', composer:'Harold Arlen', category:'pop', mood:'happy', ageRange:'5-14', duration:'2:45', desc:'A dreamy classic.', url:'audio/contemporary/rainbow.mp3' },
  { id:'music-cont-03', title:'Do-Re-Mi', composer:'Rodgers & Hammerstein', category:'pop', mood:'happy', ageRange:'4-10', duration:'2:15', desc:'A song teaching the musical scale.', url:'audio/contemporary/do-re-mi.mp3' },
  { id:'music-cont-04', title:'My Favorite Things', composer:'Rodgers & Hammerstein', category:'pop', mood:'happy', ageRange:'4-12', duration:'2:50', desc:'A song listing favorite simple things.', url:'audio/contemporary/favorite-things.mp3' },
];

var MOOD_PLAYLISTS = {
  sleepy: ['music-lull-01','music-lull-02','music-lull-03','music-lull-04','music-lull-06','music-lull-07','music-lull-09','music-lull-10'],
  calm: ['music-lull-05','music-lull-08','music-clas-03','music-clas-06','music-clas-10','music-folk-01','music-folk-02','music-instr-01','music-instr-02','music-instr-03','music-instr-05','music-instr-06','music-nat-01','music-clas-04'],
  happy: ['music-nurs-01','music-nurs-02','music-nurs-04','music-nurs-05','music-nurs-08','music-clas-01','music-clas-02','music-clas-05','music-clas-07','music-clas-08','music-clas-09','music-folk-06','music-folk-04','music-cont-02','music-cont-03','music-cont-04'],
  energetic: ['music-nurs-03','music-folk-03','music-folk-07','music-nat-03']
};

var WHITE_NOISE = [
  { id:'noise-01', name:'Gentle Rain', category:'natureSounds', duration:'60:00', desc:'Soft rain falling on leaves.' },
  { id:'noise-02', name:'Ocean Waves', category:'natureSounds', duration:'60:00', desc:'Calm waves on a sandy beach.' },
  { id:'noise-03', name:'Forest Stream', category:'natureSounds', duration:'45:00', desc:'A bubbling stream in the forest.' },
  { id:'noise-04', name:'Wind Chimes', category:'natureSounds', duration:'30:00', desc:'Soft wind chimes in a breeze.' },
  { id:'noise-05', name:'Birdsong', category:'natureSounds', duration:'45:00', desc:'Gentle birds singing in the morning.' },
  { id:'noise-06', name:'Campfire', category:'natureSounds', duration:'60:00', desc:'Crackling logs in a warm fire.' },
  { id:'noise-07', name:'Fan Hum', category:'ambient', duration:'60:00', desc:'A steady consistent fan hum.' },
  { id:'noise-08', name:'Vacuum Cleaner', category:'ambient', duration:'60:00', desc:'A rhythmic vacuum sound (soothing for some babies).' }
];

function getMusicByMood(mood, age) {
  try {
    var playlist = MOOD_PLAYLISTS[mood] || [];
    var result = [];
    for (var i = 0; i < playlist.length; i++) {
      for (var j = 0; j < MUSIC_LIBRARY.length; j++) {
        if (MUSIC_LIBRARY[j].id === playlist[i]) {
          if (!age || inAgeRange(age, MUSIC_LIBRARY[j].ageRange)) {
            result.push(MUSIC_LIBRARY[j]);
          }
        }
      }
    }
    return { success: true, data: result };
  } catch (err) {
    logger.error('getMusicByMood error: ' + err.message);
    return { success: false, data: [], error: err.message };
  }
}

function getMusicByCategory(category, age) {
  try {
    var result = [];
    for (var i = 0; i < MUSIC_LIBRARY.length; i++) {
      if (MUSIC_LIBRARY[i].category === category) {
        if (!age || inAgeRange(age, MUSIC_LIBRARY[i].ageRange)) {
          result.push(MUSIC_LIBRARY[i]);
        }
      }
    }
    return { success: true, data: result };
  } catch (err) {
    logger.error('getMusicByCategory error: ' + err.message);
    return { success: false, data: [], error: err.message };
  }
}

function getWhiteNoise(category, age) {
  try {
    if (category) {
      var result = [];
      for (var i = 0; i < WHITE_NOISE.length; i++) {
        if (WHITE_NOISE[i].category === category) result.push(WHITE_NOISE[i]);
      }
      return { success: true, data: result };
    }
    return { success: true, data: WHITE_NOISE };
  } catch (err) {
    logger.error('getWhiteNoise error: ' + err.message);
    return { success: false, data: [], error: err.message };
  }
}

function searchMusic(query, age) {
  try {
    var q = query.toLowerCase();
    var result = [];
    for (var i = 0; i < MUSIC_LIBRARY.length; i++) {
      var item = MUSIC_LIBRARY[i];
      if (item.title.toLowerCase().indexOf(q) !== -1 || item.composer.toLowerCase().indexOf(q) !== -1 || item.desc.toLowerCase().indexOf(q) !== -1) {
        if (!age || inAgeRange(age, item.ageRange)) {
          result.push(item);
        }
      }
    }
    return { success: true, data: result };
  } catch (err) {
    logger.error('searchMusic error: ' + err.message);
    return { success: false, data: [], error: err.message };
  }
}
// ═════════════════════════════════════════════════════════════════════
// 2. GAME SERVICE
// ═════════════════════════════════════════════════════════════════════

var GAME_TEMPLATES = [
  { id:'game-word-01', name:'Word Detective', type:'word', minAge:6, maxAge:10, minPlayers:1, maxPlayers:4, duration:'10min', desc:'Find the hidden word using letter clues.', materials:'None', educational:'vocabulary,spelling' },
  { id:'game-word-02', name:'Story Chain', type:'word', minAge:7, maxAge:14, minPlayers:2, maxPlayers:6, duration:'15min', desc:'Each player adds a sentence to a story.', materials:'None', educational:'creativity,language' },
  { id:'game-word-03', name:'Rhyme Time', type:'word', minAge:4, maxAge:8, minPlayers:1, maxPlayers:4, duration:'5min', desc:'Find words that rhyme with the given word.', materials:'None', educational:'phonetics' },
  { id:'game-word-04', name:'Alphabet Race', type:'word', minAge:5, maxAge:10, minPlayers:1, maxPlayers:4, duration:'5min', desc:'Name things starting with each letter.', materials:'None', educational:'alphabet,memory' },
  { id:'game-word-05', name:'Opposite Match', type:'word', minAge:6, maxAge:12, minPlayers:1, maxPlayers:2, duration:'5min', desc:'Match words with their opposites.', materials:'None', educational:'vocabulary' },
  { id:'game-math-01', name:'Number Ninja', type:'math', minAge:7, maxAge:12, minPlayers:1, maxPlayers:2, duration:'10min', desc:'Solve math problems quickly.', materials:'None', educational:'arithmetic' },
  { id:'game-math-02', name:'Shape Explorer', type:'math', minAge:4, maxAge:8, minPlayers:1, maxPlayers:4, duration:'8min', desc:'Identify shapes in everyday objects.', materials:'None', educational:'geometry' },
  { id:'game-math-03', name:'Counting Challenge', type:'math', minAge:4, maxAge:7, minPlayers:1, maxPlayers:3, duration:'5min', desc:'Count objects and find the correct number.', materials:'None', educational:'counting' },
  { id:'game-math-04', name:'Pattern Detective', type:'math', minAge:6, maxAge:10, minPlayers:1, maxPlayers:2, duration:'8min', desc:'Find and continue the pattern.', materials:'None', educational:'logic,patterning' },
  { id:'game-math-05', name:'Money Master', type:'math', minAge:8, maxAge:14, minPlayers:1, maxPlayers:2, duration:'10min', desc:'Count coins and make change.', materials:'None', educational:'finance' },
  { id:'game-math-06', name:'Time Traveler', type:'math', minAge:6, maxAge:10, minPlayers:1, maxPlayers:2, duration:'8min', desc:'Learn to read clocks and tell time.', materials:'None', educational:'time' },
  { id:'game-mem-01', name:'Card Match', type:'memory', minAge:4, maxAge:10, minPlayers:1, maxPlayers:4, duration:'10min', desc:'Match pairs of cards from memory.', materials:'Cards or pictures', educational:'memory,concentration' },
  { id:'game-mem-02', name:'What Changed', type:'memory', minAge:5, maxAge:12, minPlayers:1, maxPlayers:4, duration:'5min', desc:'Look at a scene and spot what changed.', materials:'None', educational:'observation,attention' },
  { id:'game-mem-03', name:'Sequence Recall', type:'memory', minAge:6, maxAge:14, minPlayers:1, maxPlayers:2, duration:'5min', desc:'Remember and repeat an increasing sequence.', materials:'None', educational:'working memory' },
  { id:'game-mem-04', name:'Sound Memory', type:'memory', minAge:4, maxAge:10, minPlayers:1, maxPlayers:4, duration:'8min', desc:'Match sounds to their sources.', materials:'Audio player', educational:'auditory processing' },
  { id:'game-mem-05', name:'Shopping List', type:'memory', minAge:6, maxAge:12, minPlayers:1, maxPlayers:4, duration:'10min', desc:'Remember all items on the shopping list.', materials:'None', educational:'memory,categorization' },
  { id:'game-triv-01', name:'Animal Kingdom', type:'trivia', minAge:5, maxAge:12, minPlayers:1, maxPlayers:4, duration:'10min', desc:'Answer questions about animals.', materials:'None', educational:'biology' },
  { id:'game-triv-02', name:'Space Explorer', type:'trivia', minAge:7, maxAge:14, minPlayers:1, maxPlayers:4, duration:'10min', desc:'Trivia about space and astronomy.', materials:'None', educational:'astronomy' },
  { id:'game-triv-03', name:'Euro Explorer', type:'trivia', minAge:7, maxAge:14, minPlayers:1, maxPlayers:4, duration:'12min', desc:'Learn about European countries.', materials:'None', educational:'geography,culture' },
  { id:'game-triv-04', name:'Science Whiz', type:'trivia', minAge:8, maxAge:14, minPlayers:1, maxPlayers:4, duration:'10min', desc:'Fun science facts and questions.', materials:'None', educational:'science' },
  { id:'game-triv-05', name:'Music Maestro', type:'trivia', minAge:7, maxAge:14, minPlayers:1, maxPlayers:4, duration:'8min', desc:'Identify instruments and composers.', materials:'Audio examples', educational:'music' },
  { id:'game-triv-06', name:'History Hunt', type:'trivia', minAge:8, maxAge:14, minPlayers:1, maxPlayers:4, duration:'10min', desc:'European history trivia.', materials:'None', educational:'history' },
  { id:'game-draw-01', name:'Follow the Line', type:'drawing', minAge:4, maxAge:8, minPlayers:1, maxPlayers:2, duration:'8min', desc:'Copy the line pattern shown.', materials:'Paper, crayons or tablet', educational:'fine motor skills' },
  { id:'game-draw-02', name:'Finish the Picture', type:'drawing', minAge:4, maxAge:10, minPlayers:1, maxPlayers:4, duration:'10min', desc:'Complete the half-drawn picture.', materials:'Paper, crayons or tablet', educational:'creativity,imagination' },
  { id:'game-draw-03', name:'Color Creator', type:'drawing', minAge:4, maxAge:8, minPlayers:1, maxPlayers:2, duration:'8min', desc:'Match colors to the right shapes.', materials:'Tablet or coloring page', educational:'color recognition' },
  { id:'game-draw-04', name:'Emotion Draw', type:'drawing', minAge:5, maxAge:10, minPlayers:1, maxPlayers:4, duration:'10min', desc:'Draw a face showing the given emotion.', materials:'Paper, crayons or tablet', educational:'emotional intelligence' },
  { id:'game-draw-05', name:'Shape Animals', type:'drawing', minAge:4, maxAge:8, minPlayers:1, maxPlayers:4, duration:'10min', desc:'Create animals from basic shapes.', materials:'Paper, crayons or tablet', educational:'creativity,shapes' },
];

var GAME_SESSIONS = {};

function startGame(gameId, age) {
  try {
    var template = null;
    for (var i = 0; i < GAME_TEMPLATES.length; i++) {
      if (GAME_TEMPLATES[i].id === gameId) { template = GAME_TEMPLATES[i]; break; }
    }
    if (!template) return { success: false, data: null, error: 'Game template not found: ' + gameId };
    if (age && (age < template.minAge || age > template.maxAge)) return { success: false, data: null, error: 'Age not suitable' };
    var sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    GAME_SESSIONS[sessionId] = { gameId: gameId, startedAt: Date.now(), state: 'playing', score: 0, turn: 1 };
    return { success: true, data: { sessionId: sessionId, gameName: template.name, desc: template.desc, turn: 1 } };
  } catch (err) {
    logger.error('startGame error: ' + err.message);
    return { success: false, data: null, error: err.message };
  }
}

function playTurn(sessionId, answer) {
  try {
    var session = GAME_SESSIONS[sessionId];
    if (!session) return { success: false, data: null, error: 'Session not found' };
    if (session.state !== 'playing') return { success: false, data: null, error: 'Game already finished' };
    var correct = answer && typeof answer === 'string' && answer.trim().length > 0;
    var earnedScore = correct ? Math.floor(Math.random() * 10 + 5) : 0;
    session.score = (session.score || 0) + earnedScore;
    session.turn++;
    return { success: true, data: { turn: session.turn, correct: correct, earnedScore: earnedScore, totalScore: session.score } };
  } catch (err) {
    logger.error('playTurn error: ' + err.message);
    return { success: false, data: null, error: err.message };
  }
}

function getGameResult(sessionId) {
  try {
    var session = GAME_SESSIONS[sessionId];
    if (!session) return { success: false, data: null, error: 'Session not found' };
    session.state = 'finished';
    return { success: true, data: { totalTurns: session.turn, finalScore: session.score, finishedAt: Date.now() } };
  } catch (err) {
    logger.error('getGameResult error: ' + err.message);
    return { success: false, data: null, error: err.message };
  }
}

function getAvailableGames(type, age) {
  try {
    var result = [];
    for (var i = 0; i < GAME_TEMPLATES.length; i++) {
      var g = GAME_TEMPLATES[i];
      if (type && g.type !== type) continue;
      if (age && (age < g.minAge || age > g.maxAge)) continue;
      result.push(g);
    }
    return { success: true, data: result };
  } catch (err) {
    logger.error('getAvailableGames error: ' + err.message);
    return { success: false, data: [], error: err.message };
  }
}
// ═════════════════════════════════════════════════════════════════════
// 3. STORY SERVICE
// ═════════════════════════════════════════════════════════════════════

var STORY_LIBRARY = [
  { id:'story-fairy-01', title:'The Brave Little Tailor', category:'fairyTales', ageRange:'5-10', readTime:'8min', summary:'A clever tailor defeats giants with wit.', moral:'Brains are stronger than brawn.', text:'Once upon a time, a little tailor killed seven flies with one blow. Proud of his deed, he made a belt that read \'Seven with One Blow\' and went out into the world. He met a giant who thought the tailor had killed seven men. Impressed but doubtful, the giant challenged him. The tailor squeezed water from a stone (actually cheese) and threw a bird that would not fly back (it flew away). Believing in his strength, the giant and his fellow giants fled. The tailor returned home a hero, proving that wit can overcome any obstacle.' },
  { id:'story-fairy-02', title:'The Six Swans', category:'fairyTales', ageRange:'6-12', readTime:'12min', summary:'A sister breaks a curse to save her swan brothers.', moral:'Love and persistence can break any spell.', text:'A king had six sons and one daughter. His new wife, a witch, turned the six brothers into swans. To break the spell, their sister had to sew six shirts from starflowers and remain silent for six years. Despite being falsely accused and sentenced to death, she continued sewing. As she was led to the stake, she threw the shirts over the swans, and her brothers became human again. She could finally speak and reveal the truth, and they lived happily ever after.' },
  { id:'story-fairy-03', title:'The Frog Prince', category:'fairyTales', ageRange:'4-8', readTime:'6min', summary:'A princess befriends a frog who becomes a prince.', moral:'Keep your promises, even when they are hard.', text:'A princess dropped her golden ball into a well. A frog offered to retrieve it if she would let him eat from her plate and sleep on her pillow. She agreed, but when the frog returned the ball, she ran away. That night, the frog appeared at the castle door. Her father insisted she keep her promise. Reluctantly, she let the frog eat and sleep beside her. In the morning, the frog had transformed into a handsome prince. He had been cursed by a witch, and her promise-breaking would have kept him a frog forever.' },
  { id:'story-fairy-04', title:'The Elves and the Shoemaker', category:'fairyTales', ageRange:'4-8', readTime:'5min', summary:'Elves help a poor shoemaker become rich.', moral:'Kindness is always rewarded.', text:'A poor shoemaker had only enough leather for one pair of shoes. He cut them out and left them on his bench. In the morning, the shoes were beautifully finished. A customer paid twice the price. This continued night after night. The shoemaker and his wife stayed awake to see who was helping. They saw two tiny elves working quickly. To thank them, the wife made tiny clothes and shoes. The elves found the gifts, dressed happily, and danced away. The shoemaker prospered for the rest of his days.' },
  { id:'story-fairy-05', title:'The Golden Goose', category:'fairyTales', ageRange:'5-10', readTime:'7min', summary:'A simple boy finds a goose with golden feathers.', moral:'Share what you have with others.', text:'A simple-minded boy shared his food with a hungry old man. In thanks, the old man gave him a goose with golden feathers. The goose drew a crowd wherever he went. People who touched the goose got stuck. A priest, a sexton, and two farmers all got stuck in a chain behind the boy and the goose. They paraded through town, making everyone laugh. A sad princess who had not smiled in years saw them and burst out laughing. The king was so happy he gave the boy the princess hand in marriage.' },
  { id:'story-adv-01', title:'The Map to Cloud Kingdom', category:'adventure', ageRange:'6-12', readTime:'10min', summary:'Three friends fly to a kingdom in the clouds.', moral:'Teamwork makes impossible dreams come true.', text:'Lena, Max, and Tom found an old map in their grandmother attic pointing to a Cloud Kingdom. Using balloons they built a flying machine. They floated up through the clouds and found a shimmering city with rainbow bridges. The Cloud King was sad because the Sun Crystal that powered their rainbow bridge had dimmed. The friends discovered the crystal needed happy memories to shine. Each shared their happiest memory, and the crystal blazed with light. The Cloud Kingdom was saved and the friends flew home as heroes.' },
  { id:'story-adv-02', title:'The Secret of the Old Lighthouse', category:'adventure', ageRange:'6-12', readTime:'9min', summary:'Children discover a hidden treasure in a lighthouse.', moral:'History holds treasures waiting to be found.', text:'Sofia and her brother Erik spent summer by the sea. An old lighthouse had always fascinated them. One stormy day, they found a loose stone in the wall. Behind it was a journal from a 19th-century lighthouse keeper. The journal spoke of a hidden chest. Following clues through the lighthouse, they discovered a chest filled with old maps and sea charts. The maps showed shipwrecks and underwater caves. The local museum was thrilled. The children became junior historians and spent the summer exploring coastal history.' },
  { id:'story-adv-03', title:'Journey to the Center of the Garden', category:'adventure', ageRange:'5-10', readTime:'8min', summary:'Tiny explorers discover a miniature world in the garden.', moral:'Look closely and you will find magic everywhere.', text:'When Emma shrunk herself with her scientist grandpa shrinking ray, her garden became a jungle. A ladybug became a flying bus. Ants were giant monsters. A dewdrop was a swimming pool. She met a caterpillar who was about to become a butterfly and watched her transformation. She helped a beetle move a pebble blocking its nest. When she returned to normal size, she saw her garden with new eyes. Every leaf and insect was part of a busy, wonderful world she had never noticed before.' },
  { id:'story-adv-04', title:'The River Adventure', category:'adventure', ageRange:'5-10', readTime:'7min', summary:'Children build a raft and travel down a river.', moral:'Prepare well and you can handle any challenge.', text:'Four cousins built a raft from old wood and barrels. They packed food, water, and a compass. Their journey down the river took them through forests and small villages. They saw deer drinking from the riverbank and eagles circling above. When their raft hit a rock, they repaired it using rope they had packed. They camped on an island, cooked fish over a fire, and navigated by the stars. After three days, they reached the lake where their parents waited. It was the best adventure of their summer.' },
  { id:'story-adv-05', title:'The Cave of Echoes', category:'adventure', ageRange:'7-12', readTime:'10min', summary:'Exploring a cave system and finding ancient paintings.', moral:'Courage helps us discover wonderful things.', text:'Leo and Clara joined a caving expedition with their uncle. Deep underground, they found a chamber covered in ancient handprints and animal drawings. The paintings showed mammoths, bison, and deer. Using a flashlight, Leo spotted a narrow passage. They crawled through and found another chamber with a painting of a star map. An archaeologist later said the paintings were over 20,000 years old. The children had discovered a major archaeological site. Their names were included in the scientific paper.' },
  { id:'story-anim-01', title:'The Lonely Hedgehog', category:'animalFriends', ageRange:'4-7', readTime:'5min', summary:'A hedgehog learns that friendship is worth the risk.', moral:'Real friends accept you just as you are.', text:'Pip the hedgehog had no friends because he was prickly. The rabbits said he was too spiky. The squirrels said he poked them. Pip felt very lonely. One day, he saw a mouse trapped under a log. Using his spines, Pip pushed the log off the mouse. The mouse, named Squeak, became his best friend. Squeak did not mind the spines because Pip was gentle and kind. Soon other animals saw that Pip was helpful, not scary. Pip learned that being different was not bad. It just meant he had special ways to help.' },
  { id:'story-anim-02', title:'The Crow and the Rainbow', category:'animalFriends', ageRange:'4-8', readTime:'6min', summary:'A crow tries to collect all the colors of the rainbow.', moral:'True beauty comes from sharing, not keeping.', text:'Casper the crow was bored with his black feathers. When a rainbow appeared, he decided to collect its colors. He flew up and dipped his wing in red, then orange, then yellow. Each color made his feathers beautiful. But as he collected colors, the rainbow faded. The other animals were sad. Without the rainbow, the world seemed dull. Casper realized his selfishness. He flew up and shook his feathers, releasing the colors back into the sky. The rainbow returned, brighter than before. Casper stayed black but felt beautiful inside.' },
  { id:'story-anim-03', title:'The Busy Bee and the Lazy Cricket', category:'animalFriends', ageRange:'4-8', readTime:'5min', summary:'A bee works hard while a cricket plays all day.', moral:'Balance work and play for a happy life.', text:'Bella the bee worked all day collecting nectar. Cricket Carl played his violin and laughed at her. Why work so hard? he asked. When winter came, Bella had plenty of honey. Carl had nothing to eat. Bella shared her honey with him. Carl learned that working when it is time to work means you can play when it is time to play. The next summer, Carl collected food in the morning and played music in the afternoon. He and Bella became the best of friends, singing together at sunset.' },
  { id:'story-anim-04', title:'The Little Fox Who Lost His Tail', category:'animalFriends', ageRange:'4-7', readTime:'5min', summary:'A fox learns to be patient while his tail grows back.', moral:'Patience helps us through hard times.', text:'Finn the fox caught his tail in a fence. He could not free himself. A farmer had to cut the tail to save him. Finn was embarrassed. All the other foxes had beautiful bushy tails. He hid in the forest, not wanting to be seen. An old owl told him that tails grow back, but only with time. Finn waited day after day. His friends visited and played games with him even without his tail. After two months, a tiny new tail appeared. It grew and grew. By spring, Finn had the fluffiest tail in the forest.' },
  { id:'story-anim-05', title:'The Squirrel and the Lost Acorn', category:'animalFriends', ageRange:'4-7', readTime:'4min', summary:'A squirrel searches for her favorite acorn.', moral:'Sometimes what we lose was never really ours.', text:'Sally the squirrel found the perfect acorn. It was large and shiny. She hid it in a special place. But when she returned, it was gone. She searched everywhere. She asked the birds, the rabbits, and the deer. Nobody had seen it. Sad, she sat on a branch. The oak tree spoke: The acorn was never meant to be hidden. It was meant to grow. Sally looked down and saw a small sprout. Her acorn was becoming a new tree. She was not sad anymore. She had helped the forest grow.' },
  { id:'story-bed-01', title:'The Moon Is a Silver Boat', category:'bedtime', ageRange:'4-6', readTime:'4min', summary:'A child sails the night sky in the moon boat.', moral:'Dreams can take you anywhere.', text:'When Lily looked out her window, the moon was a silver boat. It floated down and whispered, Come sail with me. Lily stepped into the moon boat. They sailed past stars that sparkled like diamonds. They saw the sleeping sun behind the mountains. The moon boat rocked gently, and Lily felt warm and safe. The stars sang a soft lullaby. As the sky began to lighten, the moon boat returned Lily to her bed. She snuggled under her blanket. The moon winked. See you tomorrow night.' },
  { id:'story-bed-02', title:'The Star Collector', category:'bedtime', ageRange:'4-6', readTime:'5min', summary:'A little bear collects fallen stars.', moral:'The most precious things are those we share.', text:'Little Bear woke up to find tiny lights in the grass. Stars had fallen from the sky. He collected them in a jar. They twinkled and glowed. He showed his mother, who smiled. But as dawn approached, the stars grew dim. They need to go home, said Mother Bear. Little Bear climbed the tallest hill. He opened the jar, and the stars floated up to the sky. They twinkled extra brightly, saying thank you. That night, Little Bear fell asleep watching his stars shine above him.' },
  { id:'story-bed-03', title:'The Dream Tree', category:'bedtime', ageRange:'4-6', readTime:'5min', summary:'Children climb a tree that grows dreams instead of fruit.', moral:'Imagination has no limits.', text:'In the garden grew a special tree. Its branches sparkled with tiny lights. Leo climbed it and found a door in the trunk. Inside was a room full of bubbles. Each bubble contained a dream. Leo touched a bubble and suddenly he was flying over mountains. He touched another and was swimming with dolphins. His sister Anna joined him. Together they visited a chocolate river and a cloud castle. When they climbed down, the sun was rising. The tree rustled and a single bubble floated down: Come back soon.' },
  { id:'story-bed-04', title:'Goodnight Little Robot', category:'bedtime', ageRange:'4-6', readTime:'4min', summary:'A little robot powers down for the night.', moral:'Rest makes us stronger for tomorrow.', text:'Beeper the robot had been playing all day. His lights were dim. His wheels were slow. Time to recharge, said his maker. Beeper did not want to sleep. There was still so much to explore. His maker showed him the charging station. It glowed softly and hummed a gentle tune. Beeper connected himself. As he charged, he dreamed of circuits and code. He dreamed of solving puzzles and helping friends. When morning came, Beeper was fully charged. His lights shone bright. He was ready for a new day.' },
  { id:'story-bed-05', title:'The Sandman Journey', category:'bedtime', ageRange:'4-6', readTime:'4min', summary:'The Sandman visits to sprinkle sleepy dust.', moral:'Sleep brings wonderful adventures in dreams.', text:'The Sandman tiptoed through the window. He carried a small bag of golden sand. He sprinkled a pinch over Felix eyes. Felix yawned. His room began to change. The walls turned into a soft forest. The ceiling became a starry sky. The Sandman led him along a path of silver dust. They passed the Land of Nod where sheep counted children jumping over fences. They reached the Dream Castle, where every room held a new adventure. Felix chose a room full of friendly dinosaurs. The Sandman smiled and closed the door gently.' },
  { id:'story-moral-01', title:'The Boy Who Cried Sheep (Wolf Edition)', category:'moralStories', ageRange:'5-10', readTime:'6min', summary:'A boy plays too many pranks and is not believed.', moral:'Honesty is the best policy. If you lie, people will not trust you.', text:'A shepherd boy was bored watching his flock. For fun, he shouted Wolf! Wolf! even though there was no wolf. The villagers ran to help. When they found no wolf, they were annoyed. The boy laughed at his joke. The next week, he did it again. Again the villagers came running. Again there was no wolf. But one day, a real wolf appeared. The boy screamed Wolf! Wolf! at the top of his lungs. The villagers heard him but thought it was another prank. Nobody came. The wolf scattered the flock. The boy learned a hard lesson that day.' },
  { id:'story-moral-02', title:'The Little Red Hen', category:'moralStories', ageRange:'4-8', readTime:'5min', summary:'A hen does all the work because nobody helps her.', moral:'Those who do not help do not deserve the reward.', text:'A little red hen found some wheat seeds. Who will help me plant these? she asked. Not I, said the cat. Not I, said the dog. Not I, said the duck. So the hen planted them herself. She watered and weeded. When it was time to harvest, nobody helped. When it was time to grind the wheat into flour, nobody helped. When she baked the bread, nobody helped. But when the bread was ready and smelled delicious, everyone wanted to eat it. No, said the hen. I will eat it with my chicks. And they did.' },
  { id:'story-moral-03', title:'The Tortoise and the Hare', category:'moralStories', ageRange:'4-10', readTime:'5min', summary:'A slow tortoise beats a fast hare in a race.', moral:'Slow and steady wins the race.', text:'A hare laughed at a tortoise for being slow. The tortoise challenged the hare to a race. The hare ran ahead quickly and soon was far in the lead. He was so confident that he decided to take a nap under a tree. Meanwhile, the tortoise kept moving. Step by step, he passed the sleeping hare. When the hare woke up, he saw the tortoise near the finish line. He ran as fast as he could, but it was too late. The tortoise had won. The hare learned that overconfidence leads to failure.' },
  { id:'story-moral-04', title:'The Ant and the Grasshopper', category:'moralStories', ageRange:'4-8', readTime:'4min', summary:'An ant works hard while a grasshopper plays.', moral:'Prepare today for what you will need tomorrow.', text:'In a sunny meadow, an ant worked hard carrying grain to her nest. Nearby, a grasshopper played his fiddle and danced. Why work so hard? he laughed. Come play with me. The ant shook her head. I am storing food for winter. When winter came, the snow covered the meadow. The grasshopper had no food. He was cold and hungry. The ant invited him into her warm nest and shared her food. The grasshopper thanked her and promised to prepare next time. From then on, he worked in summer and played in autumn.' },
  { id:'story-moral-05', title:'The Fox and the Stork', category:'moralStories', ageRange:'5-10', readTime:'5min', summary:'A fox learns that treating others badly backfires.', moral:'Treat others the way you want to be treated.', text:'A fox invited a stork for dinner but served soup in a shallow bowl. The stork could not drink with her long beak. The fox laughed as the stork went home hungry. The stork invited the fox for dinner next week. She served fish in a tall narrow jar. The stork ate easily with her beak. The fox could not reach the food. He went home hungry and ashamed. The stork said, Now you know how it feels. The fox never played tricks again. They became friends who respected each other differences.' },
  { id:'story-euro-01', title:'The Pied Piper of Hamelin', category:'europeanFolkTales', ageRange:'6-12', readTime:'9min', summary:'A piper lures rats and then children from a town.', moral:'Always keep your promises and pay your debts.', text:'The German town of Hamelin was overrun with rats. A mysterious piper in colorful clothes offered to rid the town of rats for a payment. He played his pipe and all the rats followed him into the river. But the mayor refused to pay. The piper left, angry. On St. John Day, while all adults were in church, the piper returned. He played a different tune, and all the children followed him. They followed him to a cave in a mountain and disappeared forever. Only one child who could not keep up was left to tell the tale.' },
  { id:'story-euro-02', title:'The Legend of the Wili (Slavic)', category:'europeanFolkTales', ageRange:'7-14', readTime:'10min', summary:'A Slavic tale about forest spirits who protect nature.', moral:'Nature must be respected and protected.', text:'In an ancient Slavic forest lived the Wilis, spirits of young women who protected nature. A woodcutter named Ivan came to chop down an old oak. The Wilis appeared, dressed in white, and warned him. Ivan ignored them. That night, he dreamed the forest wept. Birds lost their homes. Animals fled. In the morning, Ivan went back to the oak. Instead of cutting it, he sat beneath it. He heard the wind in the leaves speaking. From that day, Ivan became the forest guardian. He taught others to take only what they needed.' },
  { id:'story-euro-03', title:'Saint George and the Dragon', category:'europeanFolkTales', ageRange:'6-12', readTime:'8min', summary:'A knight defeats a dragon and saves a kingdom.', moral:'Courage and faith can overcome great evil.', text:'A dragon terrorized a kingdom in Eastern Europe. Each day it demanded sacrifices. The king drew lots, and his own daughter was chosen. As the princess waited by the lake, a knight named George rode by. He made the sign of the cross and charged at the dragon. His lance pierced the dragon scales. The wounded dragon fell at his feet. George told the princess to tie her belt around the dragon neck. The dragon followed like a dog. George explained that good always defeats evil when you believe.' },
  { id:'story-euro-04', title:'The Lorelei (German)', category:'europeanFolkTales', ageRange:'7-14', readTime:'7min', summary:'A maiden on the Rhine lures sailors with her song.', moral:'Beauty can be deceiving; stay true to your course.', text:'High on a rock above the Rhine River sat Lorelei, a maiden with golden hair. She combed her hair and sang a song so beautiful that sailors forgot to watch where they were going. Many ships crashed on the rocks. A young knight was sent to capture her. But as he climbed the rock, her song enchanted him too. He lost his footing and fell into the river. Lorelei, seeing what her beauty had done, threw herself into the Rhine. It is said that on quiet nights you can still hear her singing.' },
  { id:'story-euro-05', title:'The Tomten (Swedish)', category:'europeanFolkTales', ageRange:'4-8', readTime:'5min', summary:'A little gnome watches over a farm at night.', moral:'Even small creatures can do great things.', text:'In the cold Swedish winter, a tomten (a small gnome in a red cap) cared for the farm animals. While the family slept, he checked on the cows, the horses, the sheep, and the chickens. He whispered kind words to each. To the cow: Soon it will be spring. To the horse: You worked hard today, rest now. To the children asleep in their beds: Dream of summer. The tomten asked for nothing except a bowl of porridge left out at Christmas. And the family always remembered because the tomten kept their farm safe and happy.' },
  { id:'story-scifi-01', title:'The Robot Who Wanted to Paint', category:'scienceFiction', ageRange:'6-12', readTime:'8min', summary:'A robot discovers creativity is more than logic.', moral:'Creativity is what makes us special.', text:'Zeta was a cleaning robot in a museum. Every day she polished floors and dusted statues. But one day, she saw a painter creating a sunset scene. Zeta wanted to paint too. She tried to calculate the perfect painting. She measured brush strokes in millimeters. But her paintings felt stiff and lifeless. A young girl noticed Zeta sadness. You have to feel the painting, not calculate it, she said. Zeta tried again. This time she painted how the sunset made her sensors feel warm. She painted from her processor heart. The girl smiled. It is beautiful.' },
  { id:'story-scifi-02', title:'The Intergalactic Postcard', category:'scienceFiction', ageRange:'6-12', readTime:'9min', summary:'A message in a bottle travels through space.', moral:'We are not alone in the universe.', text:'Mia built a small spaceship and put a message inside: Hello from Earth. She launched it into space. Years passed. Mia grew up. One night, a tiny light landed in her garden. It was a return ship with a postcard. On it was a drawing of three friendly purple creatures holding hands under two moons. The message said: Hello from Kepler-442b. We love your planet. Would you like to be friends? Mia laughed with joy. She sent another message with pictures of Earth: oceans, mountains, and forests. The universe felt much smaller and friendlier.' },
  { id:'story-scifi-03', title:'The Time-Traveling Backpack', category:'scienceFiction', ageRange:'7-12', readTime:'10min', summary:'A backpack can travel to any time in history.', moral:'Learn from the past to build a better future.', text:'Oliver found a backpack at a flea market. When he put it on and thought of a date, a swirling portal appeared. He visited 1920s Paris and met artists in cafes. He visited ancient Rome and saw gladiators. He visited the first moon landing in 1969. But the backpack was running out of power. An old note inside said: Every visit uses one year of your life. Oliver had used ten visits. He was now ten years older. He thought about what he had learned. History was full of amazing people and terrible mistakes. He returned home, wiser.' },
  { id:'story-scifi-04', title:'The Underwater City', category:'scienceFiction', ageRange:'7-14', readTime:'11min', summary:'Humans build a city under the ocean.', moral:'Human ingenuity can overcome any challenge.', text:'In 2075, the surface of Earth became too hot. Humans built a city called Oceana three kilometers under the sea. Niko was born there. He had never seen the sun. The city was beautiful: domes lit by bioluminescent algae, schools of fish swimming above the streets. But Niko wanted to see the surface. His grandmother remembered it. One day, they took a submersible up. Breaking the surface, Niko saw the sun for the first time. It was huge and orange. The sky was pink. The world above was healing from climate change. Niko felt hope.' },
  { id:'story-scifi-05', title:'The Friendly Alien Next Door', category:'scienceFiction', ageRange:'5-10', readTime:'7min', summary:'A family discovers their new neighbor is an alien.', moral:'Do not judge people by how they look.', text:'When the Greens moved in next door, they seemed normal. Mr. Green wore a hat. Mrs. Green wore sunglasses. But one night, Tommy saw Mr. Green in his backyard. His skin glowed blue. Tommy was scared. But the next day, Mr. Green brought cookies. Tommy noticed the cookies were perfect. Not a single crumb. He asked directly: Are you an alien? Mr. Green sighed and nodded. His family was from Mars. Their planet had no cookies. Tommy thought that was the saddest thing ever. They became best friends. Tommy learned that whether you are from Earth or Mars, a friend is a friend.' },
  { id:'story-fant-01', title:'The Whispering Library', category:'fantasy', ageRange:'6-12', readTime:'9min', summary:'Books in a magical library come alive at night.', moral:'Stories are alive and waiting to be discovered.', text:'Clara found a hidden door in her school library. Behind it, the books glowed. When she opened one, characters leaped out and acted out the story. A dragon flew past. A princess waved. A knight bowed. The librarian was a wizard who explained: Every story is alive. They just need someone to read them. Clara visited every night. She sailed with pirates, solved mysteries, and visited magical lands. One night, she found a blank book. Write your own story, the wizard said. Clara wrote about a girl who discovered a magical library.' },
  { id:'story-fant-02', title:'The Mirror of Wishes', category:'fantasy', ageRange:'6-12', readTime:'8min', summary:'A mirror shows your deepest wish.', moral:'The thing you wish for most is already within you.', text:'In an old castle hung a dusty mirror. Legend said it showed your deepest wish. Leo looked into it. He saw himself as a famous knight. Anna looked. She saw herself as a great artist. But Max saw only himself. The mirror showed nothing special. Why? he asked. Because you are already who you need to be, said the castle keeper. Max did not understand. But over the years, he became a kind doctor who helped many people. The mirror had seen what he could not: that his wish was already true. He was enough.' },
  { id:'story-fant-03', title:'The Dragon Who Could Not Breathe Fire', category:'fantasy', ageRange:'4-8', readTime:'6min', summary:'A dragon without fire discovers hidden talents.', moral:'Everyone has unique gifts. Find yours.', text:'Spark was a young dragon who could not breathe fire. His siblings blew smoke rings and roasted marshmallows. Spark only coughed. He felt useless. He tried everything: spicy peppers, hot springs, even volcano air. Nothing worked. One day, a baby bird fell from a nest. Spark caught it gently. He realized his breath was not hot, but it was soft and warm like a gentle breeze. He could dry wet flowers and warm cold eggs. When winter came, Spark warm breath kept the whole cave cozy. He was not a fire dragon. He was a warmth dragon. And that was wonderful.' },
  { id:'story-fant-04', title:'The Unicorn Garden', category:'fantasy', ageRange:'4-8', readTime:'5min', summary:'A girl discovers a garden where unicorns play.', moral:'Believe in magic and you will find it.', text:'Mia planted seeds in her backyard. But instead of flowers, rainbow-colored sprouts grew. She watered them. The sprouts grew into sparkling vines. At midnight, the vines bloomed. From the flowers stepped tiny unicorns, no bigger than cats. They danced in the moonlight, leaving trails of stardust. One unicorn, named Luma, became Mia friend. Luma showed Mia how to grow moonflowers and sing to plants. The garden became the most beautiful in the neighborhood. Adults saw only flowers. But children could see the unicorns if they believed.' },
  { id:'story-fant-05', title:'The Clockwork Forest', category:'fantasy', ageRange:'6-12', readTime:'8min', summary:'A forest where all animals are made of gears and springs.', moral:'Everything needs care and maintenance to thrive.', text:'Deep in the mountains lay a forest where animals were made of brass and clockwork. The deer wound their own springs. The birds needed key-winding to sing. A clockmaker girl named Greta discovered this forest. She found a fox whose gears were jammed. She cleaned and oiled them. The fox leaped with joy. The forest keeper, an old mechanical owl, showed Greta how the forest worked. Every animal needed regular winding and care. Greta visited every month to help. She learned that just like clockwork animals, friendships need regular care too.' },
];

function getStoriesByCategory(category, age) {
  try {
    var result = [];
    for (var i = 0; i < STORY_LIBRARY.length; i++) {
      var story = STORY_LIBRARY[i];
      if (story.category === category) {
        if (!age || inAgeRange(age, story.ageRange)) result.push(story);
      }
    }
    return { success: true, data: result };
  } catch (err) {
    logger.error("getStoriesByCategory error: " + err.message);
    return { success: false, data: [], error: err.message };
  }
}

function getStoryById(storyId) {
  try {
    for (var i = 0; i < STORY_LIBRARY.length; i++) {
      if (STORY_LIBRARY[i].id === storyId) return { success: true, data: STORY_LIBRARY[i] };
    }
    return { success: false, data: null, error: "Story not found: " + storyId };
  } catch (err) {
    logger.error("getStoryById error: " + err.message);
    return { success: false, data: null, error: err.message };
  }
}

function getTodaysStory(age) {
  try {
    var dayIndex = new Date().getDay();
    var categories = ['fairyTales','adventure','animalFriends','bedtime','moralStories','europeanFolkTales','scienceFiction'];
    var cat = categories[dayIndex] || 'fairyTales';
    var stories = getStoriesByCategory(cat, age);
    if (stories.data.length > 0) return { success: true, data: stories.data[0] };
    return { success: false, data: null, error: "No story for today" };
  } catch (err) {
    logger.error("getTodaysStory error: " + err.message);
    return { success: false, data: null, error: err.message };
  }
}

var DAILY_ROUTINES = {
  '4-6': [
    { time:'07:00', activity:'Wake up, stretch, and say good morning', icon:'sunrise' },
    { time:'07:30', activity:'Brush teeth and wash face', icon:'hygiene' },
    { time:'08:00', activity:'Breakfast with family', icon:'food' },
    { time:'09:00', activity:'Play and learn time', icon:'play' },
    { time:'10:30', activity:'Snack and story time', icon:'book' },
    { time:'12:00', activity:'Lunch', icon:'food' },
    { time:'13:00', activity:'Quiet time or nap', icon:'sleep' },
    { time:'15:00', activity:'Outdoor play', icon:'outside' },
    { time:'17:00', activity:'Wash hands and help set table', icon:'help' },
    { time:'18:00', activity:'Dinner with family', icon:'food' },
    { time:'19:00', activity:'Bath time', icon:'bath' },
    { time:'19:30', activity:'Pajamas and teeth brushing', icon:'hygiene' },
    { time:'20:00', activity:'Story and lullaby', icon:'book' },
    { time:'20:30', activity:'Lights out, sweet dreams', icon:'sleep' }
  ],
  '7-10': [
    { time:'07:00', activity:'Wake up and make your bed', icon:'sunrise' },
    { time:'07:30', activity:'Morning hygiene routine', icon:'hygiene' },
    { time:'08:00', activity:'Breakfast', icon:'food' },
    { time:'08:30', activity:'School or learning activities', icon:'school' },
    { time:'10:00', activity:'Movement break', icon:'play' },
    { time:'12:00', activity:'Lunch', icon:'food' },
    { time:'13:00', activity:'Reading or quiet play', icon:'book' },
    { time:'15:00', activity:'Homework review', icon:'school' },
    { time:'16:00', activity:'Free play or hobby time', icon:'play' },
    { time:'18:00', activity:'Help with dinner tasks', icon:'help' },
    { time:'19:00', activity:'Dinner', icon:'food' },
    { time:'20:00', activity:'Prepare for tomorrow', icon:'plan' },
    { time:'20:30', activity:'Wind down and read', icon:'book' },
    { time:'21:00', activity:'Lights out', icon:'sleep' }
  ],
  '11-14': [
    { time:'07:00', activity:'Wake up and morning routine', icon:'sunrise' },
    { time:'08:00', activity:'Breakfast and plan the day', icon:'food' },
    { time:'08:30', activity:'School or study time', icon:'school' },
    { time:'10:30', activity:'Study break and snack', icon:'food' },
    { time:'12:00', activity:'Lunch', icon:'food' },
    { time:'13:00', activity:'Independent study or reading', icon:'book' },
    { time:'15:00', activity:'Extracurricular or hobby', icon:'play' },
    { time:'16:30', activity:'Social time or sports', icon:'friends' },
    { time:'18:00', activity:'Help with household tasks', icon:'help' },
    { time:'19:00', activity:'Dinner and family time', icon:'food' },
    { time:'20:00', activity:'Homework review', icon:'school' },
    { time:'21:00', activity:'Personal time', icon:'plan' },
    { time:'22:00', activity:'Wind down', icon:'sleep' },
    { time:'22:30', activity:'Lights out', icon:'sleep' }
  ]
};

var HEALTH_TIPS = [
  { id:'health-01', category:'nutrition', ageRange:'4-14', title:'Eat a Rainbow', tip:'Eat fruits and vegetables of different colors every day for vitamins.' },
  { id:'health-02', category:'nutrition', ageRange:'4-14', title:'Drink Water', tip:'Drink 6-8 glasses of water daily to stay hydrated.' },
  { id:'health-03', category:'nutrition', ageRange:'4-14', title:'Healthy Snacks', tip:'Choose fruits, nuts, and yogurt over sugary snacks.' },
  { id:'health-04', category:'hygiene', ageRange:'4-14', title:'Wash Your Hands', tip:'Wash hands before eating and after using the toilet for 20 seconds.' },
  { id:'health-05', category:'hygiene', ageRange:'4-14', title:'Brush Twice', tip:'Brush teeth for two minutes, morning and evening.' },
  { id:'health-06', category:'hygiene', ageRange:'4-14', title:'Bath Time', tip:'Take a bath or shower daily to keep skin clean.' },
  { id:'health-07', category:'exercise', ageRange:'4-14', title:'Move Every Day', tip:'At least 60 minutes of physical activity daily.' },
  { id:'health-08', category:'exercise', ageRange:'4-14', title:'Outdoor Time', tip:'Play outside for fresh air and vitamin D from sunlight.' },
  { id:'health-09', category:'exercise', ageRange:'4-14', title:'Stretch Breaks', tip:'Stretch every hour when sitting for long periods.' },
  { id:'health-10', category:'sleep', ageRange:'4-6', title:'Early Bedtime', tip:'Children 4-6 need 10-12 hours of sleep nightly.' },
  { id:'health-11', category:'sleep', ageRange:'7-10', title:'Rest Well', tip:'Children 7-10 need 9-11 hours of sleep.' },
  { id:'health-12', category:'sleep', ageRange:'11-14', title:'Sleep Schedule', tip:'Teens need 8-10 hours. Keep a consistent bedtime.' },
  { id:'health-13', category:'mental', ageRange:'4-14', title:'Talk About Feelings', tip:'Share your feelings with family. It is okay to cry.' },
  { id:'health-14', category:'mental', ageRange:'4-14', title:'Take Breaks', tip:'If you feel overwhelmed, take deep breaths and rest.' },
  { id:'health-15', category:'mental', ageRange:'4-14', title:'Gratitude', tip:'Each evening, think of three things you are grateful for.' },
  { id:'health-16', category:'safety', ageRange:'4-14', title:'Know Your Address', tip:'Memorize your home address and a parent phone number.' },
  { id:'health-17', category:'safety', ageRange:'4-14', title:'Stranger Safety', tip:'Never go anywhere with strangers. Always tell a trusted adult.' },
  { id:'health-18', category:'safety', ageRange:'4-14', title:'Online Safety', tip:'Never share personal information online without parent permission.' },
  { id:'health-19', category:'nutrition', ageRange:'4-14', title:'Eat Breakfast', tip:'Start the day with a healthy breakfast for energy.' },
  { id:'health-20', category:'exercise', ageRange:'4-14', title:'Limit Screens', tip:'Take screen breaks every 30 minutes. Look at something far away.' }
];

var WEATHER_ACTIVITIES = {
  sunny: [
    { name:'Park Picnic', desc:'Have lunch at a local park.', ageRange:'4-14' },
    { name:'Nature Walk', desc:'Explore a nearby trail or forest.', ageRange:'4-14' },
    { name:'Water Play', desc:'Splash in a paddling pool or sprinklers.', ageRange:'4-10' },
    { name:'Bike Ride', desc:'Go cycling in a safe area.', ageRange:'6-14' },
    { name:'Gardening', desc:'Plant flowers or vegetables.', ageRange:'4-14' }
  ],
  rainy: [
    { name:'Indoor Fort', desc:'Build a fort with blankets and pillows.', ageRange:'4-10' },
    { name:'Board Games', desc:'Play board games with family.', ageRange:'5-14' },
    { name:'Baking Day', desc:'Bake cookies or a cake.', ageRange:'6-14' },
    { name:'Rainy Art', desc:'Paint or draw while listening to rain.', ageRange:'4-12' },
    { name:'Puddle Jumping', desc:'Put on boots and jump in puddles.', ageRange:'4-8' }
  ],
  snowy: [
    { name:'Snowman Building', desc:'Build a snowman with carrot nose.', ageRange:'4-12' },
    { name:'Sledding', desc:'Find a hill and go sledding.', ageRange:'5-14' },
    { name:'Snow Painting', desc:'Color the snow with food coloring.', ageRange:'4-10' },
    { name:'Hot Chocolate', desc:'Make hot chocolate with marshmallows.', ageRange:'4-14' },
    { name:'Animal Tracks', desc:'Identify animal footprints in snow.', ageRange:'6-14' }
  ],
  cloudy: [
    { name:'Cloud Watching', desc:'Lie down and find shapes in clouds.', ageRange:'4-12' },
    { name:'Kite Flying', desc:'Fly a kite in the breezy weather.', ageRange:'5-14' },
    { name:'Photography Walk', desc:'Take photos of nature and scenery.', ageRange:'7-14' },
    { name:'Scavenger Hunt', desc:'Create a list of things to find outside.', ageRange:'5-12' },
    { name:'Storytelling', desc:'Sit outside and tell imaginative stories.', ageRange:'4-12' }
  ],
  windy: [
    { name:'Wind Sock Craft', desc:'Make a windsock from paper and ribbons.', ageRange:'4-10' },
    { name:'Leaf Rubbings', desc:'Collect leaves and make crayon rubbings.', ageRange:'4-8' },
    { name:'Kite Flying', desc:'Perfect weather for kite flying.', ageRange:'5-14' },
    { name:'Pinwheel Fun', desc:'Make and play with paper pinwheels.', ageRange:'4-10' },
    { name:'Wind Poetry', desc:'Write poems about the wind.', ageRange:'7-14' }
  ]
};

var SEASONAL_ACTIVITIES = {
  spring: [
    { name:'Plant a Garden', desc:'Grow vegetables or flowers from seeds.', ageRange:'4-14' },
    { name:'Butterfly Watch', desc:'Visit a garden and observe butterflies.', ageRange:'4-10' },
    { name:'Spring Cleaning', desc:'Help clean and organize your room.', ageRange:'5-14' },
    { name:'Easter Crafts', desc:'Decorate eggs or make spring cards.', ageRange:'4-12' }
  ],
  summer: [
    { name:'Swimming', desc:'Go to a pool, lake, or beach.', ageRange:'5-14' },
    { name:'Camping', desc:'Camp in the backyard or a campsite.', ageRange:'5-14' },
    { name:'Berry Picking', desc:'Visit a farm to pick fresh berries.', ageRange:'4-12' },
    { name:'Outdoor Sports', desc:'Play soccer, tennis, or frisbee.', ageRange:'6-14' }
  ],
  autumn: [
    { name:'Leaf Collection', desc:'Collect colorful autumn leaves.', ageRange:'4-10' },
    { name:'Apple Picking', desc:'Visit an orchard and pick apples.', ageRange:'4-12' },
    { name:'Harvest Festival', desc:'Attend a local harvest celebration.', ageRange:'4-14' },
    { name:'Halloween Crafts', desc:'Carve pumpkins or make costumes.', ageRange:'5-14' }
  ],
  winter: [
    { name:'Christmas Baking', desc:'Bake seasonal cookies and treats.', ageRange:'5-14' },
    { name:'Ice Skating', desc:'Skate at an indoor or outdoor rink.', ageRange:'6-14' },
    { name:'Winter Crafts', desc:'Make snowflakes and winter decorations.', ageRange:'4-12' },
    { name:'Cozy Reading', desc:'Read winter stories by the fireplace.', ageRange:'4-14' }
  ]
};

var HOLIDAYS = [
  { country:'France', holidays:[
    { name:'Jour de l\'An', date:'January 1', desc:'New Year celebrations with family feasts.', type:'national' },
    { name:'Paques', date:'March/April', desc:'Easter with chocolate eggs and bunny traditions.', type:'religious' },
    { name:'Fete Nationale', date:'July 14', desc:'Bastille Day with fireworks and parades.', type:'national' },
    { name:'Toussaint', date:'November 1', desc:'All Saints Day honoring departed loved ones.', type:'religious' },
    { name:'Noel', date:'December 25', desc:'Christmas with le Reveillon feast and gifts.', type:'religious' }
  ]},
  { country:'Germany', holidays:[
    { name:'Neujahrstag', date:'January 1', desc:'New Year with fireworks and good luck charms.', type:'national' },
    { name:'Ostern', date:'March/April', desc:'Easter with egg hunts and Osterhase tradition.', type:'religious' },
    { name:'Tag der Arbeit', date:'May 1', desc:'Labour Day with parades and demonstrations.', type:'national' },
    { name:'Tag der Deutschen Einheit', date:'October 3', desc:'German Unity Day celebrating reunification.', type:'national' },
    { name:'Weihnachten', date:'December 25-26', desc:'Christmas with markets, tree, and gifts.', type:'religious' }
  ]},
  { country:'UK', holidays:[
    { name:'New Year Day', date:'January 1', desc:'New Year celebrations with fireworks.', type:'national' },
    { name:'Easter Monday', date:'March/April', desc:'Easter weekend with egg hunts and hot cross buns.', type:'religious' },
    { name:'Spring Bank Holiday', date:'Late May', desc:'Spring holiday with outdoor activities.', type:'national' },
    { name:'Summer Bank Holiday', date:'Late August', desc:'Summer holiday with barbecues and trips.', type:'national' },
    { name:'Christmas Day', date:'December 25', desc:'Christmas with turkey, crackers, and presents.', type:'religious' }
  ]},
  { country:'Italy', holidays:[
    { name:'Capodanno', date:'January 1', desc:'New Year with lentils for good luck.', type:'national' },
    { name:'Pasqua', date:'March/April', desc:'Easter with colomba cake and egg traditions.', type:'religious' },
    { name:'Festa della Repubblica', date:'June 2', desc:'Republic Day with military parades.', type:'national' },
    { name:'Ferragosto', date:'August 15', desc:'Assumption Day with beach trips and festivals.', type:'religious' },
    { name:'Natale', date:'December 25', desc:'Christmas with nativity scenes and feasts.', type:'religious' }
  ]},
  { country:'Spain', holidays:[
    { name:'Ano Nuevo', date:'January 1', desc:'New Year eating 12 grapes at midnight.', type:'national' },
    { name:'Reyes Magos', date:'January 6', desc:'Three Kings Day with parades and gifts.', type:'religious' },
    { name:'Semana Santa', date:'March/April', desc:'Holy Week with processions and traditions.', type:'religious' },
    { name:'Fiesta Nacional', date:'October 12', desc:'National Day celebrating Spanish heritage.', type:'national' },
    { name:'Navidad', date:'December 25', desc:'Christmas with family dinners and lottery.', type:'religious' }
  ]},
  { country:'Netherlands', holidays:[
    { name:'Nieuwjaarsdag', date:'January 1', desc:'New Year with duik in the sea tradition.', type:'national' },
    { name:'Koningsdag', date:'April 27', desc:'King Day with orange parties and markets.', type:'national' },
    { name:'Bevrijdingsdag', date:'May 5', desc:'Liberation Day celebrating freedom.', type:'national' },
    { name:'Sinterklaas', date:'December 5', desc:'Saint Nicholas Eve with gifts and poems.', type:'religious' },
    { name:'Kerstmis', date:'December 25-26', desc:'Christmas with family and gourmet dinners.', type:'religious' }
  ]},
  { country:'Sweden', holidays:[
    { name:'Nyarsdagen', date:'January 1', desc:'New Year celebrations.', type:'national' },
    { name:'Pask', date:'March/April', desc:'Easter with painted eggs and witches.', type:'religious' },
    { name:'Midsommar', date:'June 21-22', desc:'Midsummer with maypole dancing and flowers.', type:'national' },
    { name:'Lucia', date:'December 13', desc:'Saint Lucia Day with candle crowns and songs.', type:'religious' },
    { name:'Jul', date:'December 24-25', desc:'Christmas with Julbord feast and presents.', type:'religious' }
  ]},
  { country:'Poland', holidays:[
    { name:'Nowy Rok', date:'January 1', desc:'New Year celebrations.', type:'national' },
    { name:'Wielkanoc', date:'March/April', desc:'Easter with pisanki eggs and swieconka.', type:'religious' },
    { name:'Swieto Konstytucji', date:'May 3', desc:'Constitution Day celebrating democracy.', type:'national' },
    { name:'Wszystkich Swietych', date:'November 1', desc:'All Saints Day visiting family graves.', type:'religious' },
    { name:'Boze Narodzenie', date:'December 25-26', desc:'Christmas with wigilia feast and carols.', type:'religious' }
  ]}
];

function getDailyRoutine(age) {
  try {
    var key = '4-6';
    if (age >= 7 && age <= 10) key = '7-10';
    else if (age >= 11) key = '11-14';
    return { success: true, data: DAILY_ROUTINES[key] || DAILY_ROUTINES['4-6'] };
  } catch (err) {
    logger.error("getDailyRoutine error: " + err.message);
    return { success: false, data: [], error: err.message };
  }
}

function getHealthTips(category, age) {
  try {
    var result = [];
    for (var i = 0; i < HEALTH_TIPS.length; i++) {
      var tip = HEALTH_TIPS[i];
      if (category && tip.category !== category) continue;
      if (age && !inAgeRange(age, tip.ageRange)) continue;
      result.push(tip);
    }
    return { success: true, data: result };
  } catch (err) {
    logger.error("getHealthTips error: " + err.message);
    return { success: false, data: [], error: err.message };
  }
}

function getWeatherActivities(weather, age) {
  try {
    weather = weather.toLowerCase();
    var activities = WEATHER_ACTIVITIES[weather] || [];
    if (!age) return { success: true, data: activities };
    var filtered = [];
    for (var i = 0; i < activities.length; i++) {
      var rangeParts = activities[i].ageRange.split('-');
      if (age >= parseInt(rangeParts[0]) && age <= parseInt(rangeParts[1])) {
        filtered.push(activities[i]);
      }
    }
    return { success: true, data: filtered };
  } catch (err) {
    logger.error("getWeatherActivities error: " + err.message);
    return { success: false, data: [], error: err.message };
  }
}

function getSeasonalActivities(season, age) {
  try {
    season = season.toLowerCase();
    var activities = SEASONAL_ACTIVITIES[season] || [];
    if (!age) return { success: true, data: activities };
    var filtered = [];
    for (var i = 0; i < activities.length; i++) {
      var rangeParts = activities[i].ageRange.split('-');
      if (age >= parseInt(rangeParts[0]) && age <= parseInt(rangeParts[1])) {
        filtered.push(activities[i]);
      }
    }
    return { success: true, data: filtered };
  } catch (err) {
    logger.error("getSeasonalActivities error: " + err.message);
    return { success: false, data: [], error: err.message };
  }
}

var COUNTRY_MAP = { uk:'United Kingdom', 'united kingdom':'United Kingdom', 'great britain':'United Kingdom', de:'Germany', germany:'Germany', fr:'France', france:'France', it:'Italy', italy:'Italy', es:'Spain', spain:'Spain', nl:'Netherlands', netherlands:'Netherlands', ch:'Switzerland', switzerland:'Switzerland', at:'Austria', austria:'Austria', pl:'Poland', poland:'Poland', se:'Sweden', sweden:'Sweden', no:'Norway', norway:'Norway', dk:'Denmark', denmark:'Denmark', fi:'Finland', finland:'Finland', be:'Belgium', belgium:'Belgium', pt:'Portugal', portugal:'Portugal', ie:'Ireland', ireland:'Ireland', gr:'Greece', greece:'Greece', cz:'Czech Republic', 'czech republic':'Czech Republic', hu:'Hungary', hungary:'Hungary', ro:'Romania', romania:'Romania' };

function getHolidays(country) {
  try {
    if (!country) return { success: true, data: HOLIDAYS };
    var normalized = COUNTRY_MAP[country.toLowerCase()] || country;
    for (var i = 0; i < HOLIDAYS.length; i++) {
      if (HOLIDAYS[i].country.toLowerCase() === normalized.toLowerCase()) {
        return { success: true, data: HOLIDAYS[i].holidays };
      }
    }
    return { success: false, data: [], error: "Country not found: " + country };
  } catch (err) {
    logger.error("getHolidays error: " + err.message);
    return { success: false, data: [], error: err.message };
  }
}
// ═════════════════════════════════════════════════════════════════════
// 5. EMOTION SUPPORT SERVICE
// ═════════════════════════════════════════════════════════════════════

var CALMING_ACTIVITIES = [
  { id:'calm-01', name:'Deep Breathing', desc:'Breathe in for 4 counts, hold for 4, out for 4. Repeat 5 times.', ageRange:'4-14' },
  { id:'calm-02', name:'Count to Ten', desc:'Close your eyes and slowly count to ten.', ageRange:'4-10' },
  { id:'calm-03', name:'Hug a Toy', desc:'Hold your favorite stuffed animal tight.', ageRange:'4-8' },
  { id:'calm-04', name:'Listen to Music', desc:'Put on your favorite calm song.', ageRange:'4-14' },
  { id:'calm-05', name:'Draw Your Feelings', desc:'Draw how you feel right now.', ageRange:'5-14' },
  { id:'calm-06', name:'Go for a Walk', desc:'Walk outside and notice three beautiful things.', ageRange:'5-14' },
  { id:'calm-07', name:'Drink Water', desc:'Get a glass of cold water and drink slowly.', ageRange:'4-14' },
  { id:'calm-08', name:'Talk to Someone', desc:'Tell a trusted adult how you feel.', ageRange:'4-14' },
  { id:'calm-09', name:'Stretch Your Body', desc:'Reach up high, touch your toes, shake your hands.', ageRange:'4-14' },
  { id:'calm-10', name:'Think of a Happy Memory', desc:'Close your eyes and remember something wonderful.', ageRange:'4-14' }
];

var ENCOURAGEMENTS = [
  { id:'enc-01', text:'You are doing a great job, keep going!', ageRange:'4-14' },
  { id:'enc-02', text:'It is okay to make mistakes. That is how we learn.', ageRange:'4-14' },
  { id:'enc-03', text:'Believe in yourself. You can do hard things.', ageRange:'5-14' },
  { id:'enc-04', text:'Every expert was once a beginner.', ageRange:'6-14' },
  { id:'enc-05', text:'Your effort matters more than the result.', ageRange:'5-14' },
  { id:'enc-06', text:'Be proud of yourself for trying.', ageRange:'4-14' },
  { id:'enc-07', text:'Today is a fresh start. You have got this!', ageRange:'5-14' },
  { id:'enc-08', text:'You are braver than you believe and stronger than you seem.', ageRange:'5-14' },
  { id:'enc-09', text:'Small steps lead to big achievements.', ageRange:'5-14' },
  { id:'enc-10', text:'The world is better because you are in it.', ageRange:'4-14' },
  { id:'enc-11', text:'Your smile can brighten someone day.', ageRange:'4-14' },
  { id:'enc-12', text:'You are unique and that is your superpower.', ageRange:'5-14' }
];

var ANGER_MANAGEMENT_TIPS = [
  { id:'anger-01', tip:'Take 5 slow deep breaths before reacting.', ageRange:'4-14' },
  { id:'anger-02', tip:'Count backward from 20 to 0.', ageRange:'5-14' },
  { id:'anger-03', tip:'Squeeze a pillow or soft toy hard.', ageRange:'4-10' },
  { id:'anger-04', tip:'Step away and get some space.', ageRange:'5-14' },
  { id:'anger-05', tip:'Draw or scribble on paper to release anger.', ageRange:'4-12' },
  { id:'anger-06', tip:'Use your words to say I feel angry because...', ageRange:'5-14' },
  { id:'anger-07', tip:'Go outside and run or jump.', ageRange:'4-14' },
  { id:'anger-08', tip:'Ask for a hug from someone you trust.', ageRange:'4-10' }
];

var SOCIAL_SKILL_TIPS = [
  { id:'social-01', tip:'Say please and thank you when asking for things.', ageRange:'4-10' },
  { id:'social-02', tip:'Look at people when they are talking to you.', ageRange:'4-12' },
  { id:'social-03', tip:'Wait your turn before speaking.', ageRange:'4-10' },
  { id:'social-04', tip:'Share your toys and take turns.', ageRange:'4-8' },
  { id:'social-05', tip:'If someone looks sad, ask if they are okay.', ageRange:'5-14' },
  { id:'social-06', tip:'Say sorry when you make a mistake.', ageRange:'4-14' },
  { id:'social-07', tip:'Compliment your friends when they do something well.', ageRange:'5-14' },
  { id:'social-08', tip:'Ask questions to show you are listening.', ageRange:'5-14' },
  { id:'social-09', tip:'Respect other people space and belongings.', ageRange:'4-14' },
  { id:'social-10', tip:'Be yourself, you do not need to pretend.', ageRange:'5-14' }
];

var MOOD_KEYWORDS = {
  sad: ['sad','cry','lonely','miss','alone','down','blue','unhappy'],
  angry: ['angry','mad','furious','annoyed','frustrated','upset','yell'],
  scared: ['scared','afraid','fear','nightmare','spooky','dark','monster'],
  happy: ['happy','joy','excited','fun','great','wonderful','amazing'],
  anxious: ['anxious','nervous','worried','stress','panic','tension'],
  tired: ['tired','sleepy','exhausted','drained','lazy']
};

function getCalmingActivity(age) {
  try {
    var available = [];
    for (var i = 0; i < CALMING_ACTIVITIES.length; i++) {
      var act = CALMING_ACTIVITIES[i];
      if (!age || inAgeRange(age, act.ageRange)) available.push(act);
    }
    var pick = available[Math.floor(Math.random() * available.length)];
    return { success: true, data: pick || CALMING_ACTIVITIES[0] };
  } catch (err) {
    logger.error("getCalmingActivity error: " + err.message);
    return { success: false, data: null, error: err.message };
  }
}

function getEncouragement(age) {
  try {
    var available = [];
    for (var i = 0; i < ENCOURAGEMENTS.length; i++) {
      var enc = ENCOURAGEMENTS[i];
      if (!age || inAgeRange(age, enc.ageRange)) available.push(enc);
    }
    var pick = available[Math.floor(Math.random() * available.length)];
    return { success: true, data: pick || ENCOURAGEMENTS[0] };
  } catch (err) {
    logger.error("getEncouragement error: " + err.message);
    return { success: false, data: null, error: err.message };
  }
}

function getAngerTip(age) {
  try {
    var available = [];
    for (var i = 0; i < ANGER_MANAGEMENT_TIPS.length; i++) {
      var t = ANGER_MANAGEMENT_TIPS[i];
      if (!age || inAgeRange(age, t.ageRange)) available.push(t);
    }
    var pick = available[Math.floor(Math.random() * available.length)];
    return { success: true, data: pick || ANGER_MANAGEMENT_TIPS[0] };
  } catch (err) {
    logger.error("getAngerTip error: " + err.message);
    return { success: false, data: null, error: err.message };
  }
}

function getSocialSkillTip(age) {
  try {
    var available = [];
    for (var i = 0; i < SOCIAL_SKILL_TIPS.length; i++) {
      var t = SOCIAL_SKILL_TIPS[i];
      if (!age || inAgeRange(age, t.ageRange)) available.push(t);
    }
    var pick = available[Math.floor(Math.random() * available.length)];
    return { success: true, data: pick || SOCIAL_SKILL_TIPS[0] };
  } catch (err) {
    logger.error("getSocialSkillTip error: " + err.message);
    return { success: false, data: null, error: err.message };
  }
}

function detectMood(text) {
  try {
    if (!text) return { success: true, data: { mood: 'neutral', confidence: 0 } };
    var lower = text.toLowerCase();
    var scores = {};
    for (var mood in MOOD_KEYWORDS) {
      scores[mood] = 0;
      var words = MOOD_KEYWORDS[mood];
      for (var w = 0; w < words.length; w++) {
        if (lower.indexOf(words[w]) !== -1) scores[mood]++;
      }
    }
    var bestMood = 'neutral';
    var bestScore = 0;
    for (var m in scores) {
      if (scores[m] > bestScore) { bestScore = scores[m]; bestMood = m; }
    }
    return { success: true, data: { mood: bestMood, confidence: bestScore > 0 ? Math.min(bestScore / 3, 1) : 0 } };
  } catch (err) {
    logger.error("detectMood error: " + err.message);
    return { success: false, data: { mood: 'neutral', confidence: 0 }, error: err.message };
  }
}
// ═════════════════════════════════════════════════════════════════════
// 6. JOKE & FUN SERVICE
// ═════════════════════════════════════════════════════════════════════

var JOKES = [
  { id:'joke-anim-01', category:'animals', ageRange:'4-10', joke:'What do you call a bear with no teeth?', punchline:'A gummy bear!' },
  { id:'joke-anim-02', category:'animals', ageRange:'4-10', joke:'Why did the chicken cross the road?', punchline:'To get to the other side!' },
  { id:'joke-anim-03', category:'animals', ageRange:'4-10', joke:'What do you call a sleeping bull?', punchline:'A bulldozer!' },
  { id:'joke-anim-04', category:'animals', ageRange:'5-10', joke:'What do you get when you cross a sheep and a kangaroo?', punchline:'A woolly jumper!' },
  { id:'joke-anim-05', category:'animals', ageRange:'4-10', joke:'What does a cat like to eat on a hot day?', punchline:'A mice-cream cone!' },
  { id:'joke-anim-06', category:'animals', ageRange:'4-10', joke:'What do you call a pig that does karate?', punchline:'A pork chop!' },
  { id:'joke-anim-07', category:'animals', ageRange:'5-10', joke:'Why do fish live in salt water?', punchline:'Because pepper makes them sneeze!' },
  { id:'joke-anim-08', category:'animals', ageRange:'4-10', joke:'What do you call a cow with no legs?', punchline:'Ground beef!' },
  { id:'joke-food-01', category:'food', ageRange:'4-10', joke:'What did the banana say to the toast?', punchline:'You are my butter half!' },
  { id:'joke-food-02', category:'food', ageRange:'5-10', joke:'Why did the orange stop rolling?', punchline:'It ran out of juice!' },
  { id:'joke-food-03', category:'food', ageRange:'4-10', joke:'What is a vampires favorite fruit?', punchline:'A blood orange!' },
  { id:'joke-food-04', category:'food', ageRange:'5-12', joke:'Why did the cookie go to the doctor?', punchline:'It felt crummy!' },
  { id:'joke-food-05', category:'food', ageRange:'5-12', joke:'What do you call a sad strawberry?', punchline:'A blueberry!' },
  { id:'joke-food-06', category:'food', ageRange:'6-12', joke:'What did the grape do when the elephant stepped on it?', punchline:'Let out a little wine!' },
  { id:'joke-food-07', category:'food', ageRange:'4-10', joke:'Why did the banana go to the hospital?', punchline:'It was not peeling well!' },
  { id:'joke-food-08', category:'food', ageRange:'5-12', joke:'What is a potatoes favorite music?', punchline:'Rock and roll!' },
  { id:'joke-school-01', category:'school', ageRange:'5-12', joke:'Why did the student eat his homework?', punchline:'The teacher said it was a piece of cake!' },
  { id:'joke-school-02', category:'school', ageRange:'6-12', joke:'What do you call a teacher with a ruler?', punchline:'A ruler-shaper!' },
  { id:'joke-school-03', category:'school', ageRange:'5-12', joke:'Why was the math book sad?', punchline:'It had too many problems!' },
  { id:'joke-school-04', category:'school', ageRange:'5-10', joke:'What do you get if you add an apple and a computer?', punchline:'A macintosh!' },
  { id:'joke-school-05', category:'school', ageRange:'6-12', joke:'Why did the pencil go to school?', punchline:'To get sharper!' },
  { id:'joke-school-06', category:'school', ageRange:'5-10', joke:'What did the pen say to the paper?', punchline:'I have got you covered!' },
  { id:'joke-school-07', category:'school', ageRange:'6-12', joke:'Why did the kid bring a ladder to school?', punchline:'For high school!' },
  { id:'joke-school-08', category:'school', ageRange:'5-10', joke:'What is a students favorite planet?', punchline:'Pluto because it is not a planet anymore!' },
  { id:'joke-sci-01', category:'science', ageRange:'6-14', joke:'What did the atom say to the scientist?', punchline:'I think I have lost an electron! Are you sure? I am positive!' },
  { id:'joke-sci-02', category:'science', ageRange:'6-14', joke:'Why can you not trust atoms?', punchline:'They make up everything!' },
  { id:'joke-sci-03', category:'science', ageRange:'7-14', joke:'What do you call a quantum dog?', punchline:'A wave-particle-doodle!' },
  { id:'joke-sci-04', category:'science', ageRange:'6-14', joke:'Why did the biologist break up with the physicist?', punchline:'There was no chemistry!' },
  { id:'joke-sci-05', category:'science', ageRange:'7-14', joke:'How do you organize a space party?', punchline:'You planet!' },
  { id:'joke-sci-06', category:'science', ageRange:'6-14', joke:'What does a DNA say when it gets mad?', punchline:'You are replicating me off!' },
  { id:'joke-sci-07', category:'science', ageRange:'6-14', joke:'Why did the sun go to school?', punchline:'To get brighter!' },
  { id:'joke-sci-08', category:'science', ageRange:'7-14', joke:'What is a physicists favorite food?', punchline:'Fast food!' },
  { id:'joke-kid-01', category:'kids', ageRange:'4-8', joke:'Why did the scarecrow win an award?', punchline:'Because he was outstanding in his field!' },
  { id:'joke-kid-02', category:'kids', ageRange:'4-8', joke:'How does a dinosaur say goodbye?', punchline:'Stick around, I am leaving!' },
  { id:'joke-kid-03', category:'kids', ageRange:'4-8', joke:'What has a face and two hands but no arms?', punchline:'A clock!' },
  { id:'joke-kid-04', category:'kids', ageRange:'4-8', joke:'What do you call a boomerang that does not come back?', punchline:'A stick!' },
  { id:'joke-kid-05', category:'kids', ageRange:'4-8', joke:'What do you call a snowman with a six-pack?', punchline:'An abdominal snowman!' },
  { id:'joke-kid-06', category:'kids', ageRange:'4-8', joke:'What is black and white and red all over?', punchline:'A newspaper!' },
  { id:'joke-kid-07', category:'kids', ageRange:'4-8', joke:'How do you make a tissue dance?', punchline:'Put a little boogie in it!' },
  { id:'joke-kid-08', category:'kids', ageRange:'4-8', joke:'What do you call a fish wearing a crown?', punchline:'A kingfish!' },
  { id:'joke-kid-09', category:'kids', ageRange:'4-8', joke:'Why did the golfer wear two pairs of pants?', punchline:'In case he got a hole in one!' },
  { id:'joke-kid-10', category:'kids', ageRange:'4-8', joke:'What gets wetter the more it dries?', punchline:'A towel!' },
  { id:'joke-kid-11', category:'kids', ageRange:'4-8', joke:'Why did the picture go to jail?', punchline:'It was framed!' },
  { id:'joke-kid-12', category:'kids', ageRange:'4-8', joke:'What do you call a bear with no ears?', punchline:'B!' },
  { id:'joke-pun-01', category:'puns', ageRange:'6-14', joke:'How does a penguin build its house?', punchline:'Igloos it together!' },
  { id:'joke-pun-02', category:'puns', ageRange:'6-14', joke:'What do you call a fake noodle?', punchline:'An impasta!' },
  { id:'joke-pun-03', category:'puns', ageRange:'6-14', joke:'Why did the bicycle fall over?', punchline:'It was two tired!' },
  { id:'joke-pun-04', category:'puns', ageRange:'6-14', joke:'What do you call a can opener that does not work?', punchline:'A can not opener!' },
  { id:'joke-pun-05', category:'puns', ageRange:'6-14', joke:'How does a train eat?', punchline:'It goes chew-chew!' },
  { id:'joke-pun-06', category:'puns', ageRange:'6-14', joke:'What do you call an alligator in a vest?', punchline:'An investigator!' },
  { id:'joke-pun-07', category:'puns', ageRange:'6-14', joke:'Why did the coffee file a police report?', punchline:'It got mugged!' },
];

var TONGUE_TWISTERS = [
  { id:'tt-en-01', lang:'EN', text:'She sells seashells by the seashore.' },
  { id:'tt-en-02', lang:'EN', text:'Peter Piper picked a peck of pickled peppers.' },
  { id:'tt-en-03', lang:'EN', text:'How much wood would a woodchuck chuck if a woodchuck could chuck wood?' },
  { id:'tt-de-01', lang:'DE', text:'Fischers Fritz fischt frische Fische.' },
  { id:'tt-de-02', lang:'DE', text:'Blaukraut bleibt Blaukraut und Brautkleid bleibt Brautkleid.' },
  { id:'tt-de-03', lang:'DE', text:'Es grunzt die Unke unterm Unkraut, unterm Unkraut grunzt die Unke.' },
  { id:'tt-fr-01', lang:'FR', text:'Un chasseur sachant chasser doit savoir chasser sans son chien.' },
  { id:'tt-fr-02', lang:'FR', text:'Si six scies scient six cygnes, six cent six scies scient six cent six cygnes.' },
  { id:'tt-fr-03', lang:'FR', text:'Trois tortues trottaient sur un trottoir et trottaient a tres petits pas.' },
  { id:'tt-es-01', lang:'ES', text:'Tres tristes tigres tragaban trigo en un trigal.' },
  { id:'tt-es-02', lang:'ES', text:'El cielo esta enladrillado, quien lo desenladrillara?' },
  { id:'tt-es-03', lang:'ES', text:'Pancha plancha con cuatro planchas. Con cuantas planchas plancha Pancha?' }
];

var FUN_FACTS = [
  { id:'fact-01', category:'science', ageRange:'5-14', fact:'A day on Venus is longer than a year on Venus.' },
  { id:'fact-02', category:'science', ageRange:'5-14', fact:'Honey never spoils. Archaeologists found 3000-year-old honey in Egyptian tombs that is still edible.' },
  { id:'fact-03', category:'science', ageRange:'5-14', fact:'Octopuses have three hearts and blue blood.' },
  { id:'fact-04', category:'science', ageRange:'6-14', fact:'Bananas are berries, but strawberries are not.' },
  { id:'fact-05', category:'science', ageRange:'5-14', fact:'The Eiffel Tower grows 15 cm taller in summer due to metal expansion.' },
  { id:'fact-06', category:'animals', ageRange:'4-14', fact:'A group of flamingos is called a flamboyance.' },
  { id:'fact-07', category:'animals', ageRange:'4-14', fact:'Cows have best friends and get stressed when separated from them.' },
  { id:'fact-08', category:'animals', ageRange:'5-14', fact:'Butterflies taste with their feet.' },
  { id:'fact-09', category:'animals', ageRange:'5-14', fact:'Dolphins have names for each other and use individual whistles.' },
  { id:'fact-10', category:'animals', ageRange:'5-14', fact:'An elephant tooth can weigh up to 3 kilograms.' },
  { id:'fact-11', category:'world', ageRange:'6-14', fact:'There is a town in Norway called Hell that freezes over in winter.' },
  { id:'fact-12', category:'world', ageRange:'6-14', fact:'The shortest war in history was between England and Zanzibar in 1896. It lasted 38 minutes.' },
  { id:'fact-13', category:'world', ageRange:'6-14', fact:'The Netherlands has more bicycles than people.' },
  { id:'fact-14', category:'world', ageRange:'6-14', fact:'The longest place name in Europe is Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch in Wales.' },
  { id:'fact-15', category:'world', ageRange:'5-14', fact:'Germany has over 1500 different types of bread.' },
  { id:'fact-16', category:'world', ageRange:'5-14', fact:'The Alps can be seen from space as a distinct white curve across Europe.' },
  { id:'fact-17', category:'human', ageRange:'5-14', fact:'Your skin renews itself completely about every 28 days.' },
  { id:'fact-18', category:'human', ageRange:'5-14', fact:'Your nose can remember up to 50,000 different scents.' },
  { id:'fact-19', category:'human', ageRange:'6-14', fact:'Laughing for 10 minutes can burn up to 40 calories.' },
  { id:'fact-20', category:'human', ageRange:'5-14', fact:'Your brain uses about 20 percent of your bodys energy.' },
  { id:'fact-21', category:'science', ageRange:'5-14', fact:'Lightning strikes Earth about 100 times every second.' },
  { id:'fact-22', category:'science', ageRange:'5-14', fact:'A cloud can weigh as much as a jumbo jet.' },
  { id:'fact-23', category:'science', ageRange:'5-14', fact:'The Great Wall of China is not visible from space without aid.' },
  { id:'fact-24', category:'animals', ageRange:'4-14', fact:'A cat has 32 muscles in each ear.' },
  { id:'fact-25', category:'world', ageRange:'5-14', fact:'France is the most visited country in the world with over 80 million tourists yearly.' }
];

function getRandomJoke(category, age) {
  try {
    var available = [];
    for (var i = 0; i < JOKES.length; i++) {
      var joke = JOKES[i];
      if (category && joke.category !== category) continue;
      if (age && !inAgeRange(age, joke.ageRange)) continue;
      available.push(joke);
    }
    if (available.length === 0) return { success: true, data: { joke:'Why did the robot cross the road?', punchline:'To recharge!' } };
    var pick = available[Math.floor(Math.random() * available.length)];
    return { success: true, data: pick };
  } catch (err) {
    logger.error("getRandomJoke error: " + err.message);
    return { success: false, data: null, error: err.message };
  }
}

function getJokeByCategory(category, age) {
  try {
    var result = [];
    for (var i = 0; i < JOKES.length; i++) {
      var joke = JOKES[i];
      if (joke.category === category) {
        if (!age || inAgeRange(age, joke.ageRange)) result.push(joke);
      }
    }
    return { success: true, data: result };
  } catch (err) {
    logger.error("getJokeByCategory error: " + err.message);
    return { success: false, data: [], error: err.message };
  }
}

function getTongueTwister(lang) {
  try {
    if (lang) {
      var matching = [];
      for (var i = 0; i < TONGUE_TWISTERS.length; i++) {
        if (TONGUE_TWISTERS[i].lang === lang.toUpperCase()) matching.push(TONGUE_TWISTERS[i]);
      }
      if (matching.length > 0) return { success: true, data: matching[Math.floor(Math.random() * matching.length)] };
    }
    var pick = TONGUE_TWISTERS[Math.floor(Math.random() * TONGUE_TWISTERS.length)];
    return { success: true, data: pick };
  } catch (err) {
    logger.error("getTongueTwister error: " + err.message);
    return { success: false, data: null, error: err.message };
  }
}

function getFunFact(category, age) {
  try {
    var available = [];
    for (var i = 0; i < FUN_FACTS.length; i++) {
      var fact = FUN_FACTS[i];
      if (category && fact.category !== category) continue;
      if (age && !inAgeRange(age, fact.ageRange)) continue;
      available.push(fact);
    }
    if (available.length === 0) available = FUN_FACTS;
    var pick = available[Math.floor(Math.random() * available.length)];
    return { success: true, data: pick };
  } catch (err) {
    logger.error("getFunFact error: " + err.message);
    return { success: false, data: null, error: err.message };
  }
}

// ═════════════════════════════════════════════════════════════════════
// 7. INTEGRATION & UTILITY
// ═════════════════════════════════════════════════════════════════════

function getServiceSummary() {
  return {
    success: true,
    data: {
      musicLibrary: MUSIC_LIBRARY.length,
      whiteNoise: WHITE_NOISE.length,
      moodPlaylists: Object.keys(MOOD_PLAYLISTS).length,
      gameTemplates: GAME_TEMPLATES.length,
      activeSessions: Object.keys(GAME_SESSIONS).length,
      storyLibrary: STORY_LIBRARY.length,
      dailyRoutines: Object.keys(DAILY_ROUTINES).length,
      healthTips: HEALTH_TIPS.length,
      weatherActivities: Object.keys(WEATHER_ACTIVITIES).length,
      seasonalActivities: Object.keys(SEASONAL_ACTIVITIES).length,
      holidays: HOLIDAYS.length + ' countries',
      calmingActivities: CALMING_ACTIVITIES.length,
      encouragements: ENCOURAGEMENTS.length,
      angerTips: ANGER_MANAGEMENT_TIPS.length,
      socialSkillTips: SOCIAL_SKILL_TIPS.length,
      jokes: JOKES.length,
      tongueTwisters: TONGUE_TWISTERS.length,
      funFacts: FUN_FACTS.length
    }
  };
}

module.exports = {
  getMusicByMood: getMusicByMood,
  getMusicByCategory: getMusicByCategory,
  getWhiteNoise: getWhiteNoise,
  searchMusic: searchMusic,
  startGame: startGame,
  playTurn: playTurn,
  getGameResult: getGameResult,
  getAvailableGames: getAvailableGames,
  getStoriesByCategory: getStoriesByCategory,
  getStoryById: getStoryById,
  getTodaysStory: getTodaysStory,
  getDailyRoutine: getDailyRoutine,
  getHealthTips: getHealthTips,
  getWeatherActivities: getWeatherActivities,
  getSeasonalActivities: getSeasonalActivities,
  getHolidays: getHolidays,
  getCalmingActivity: getCalmingActivity,
  getEncouragement: getEncouragement,
  getAngerTip: getAngerTip,
  getSocialSkillTip: getSocialSkillTip,
  detectMood: detectMood,
  getRandomJoke: getRandomJoke,
  getJokeByCategory: getJokeByCategory,
  getTongueTwister: getTongueTwister,
  getFunFact: getFunFact,
  getServiceSummary: getServiceSummary
};
