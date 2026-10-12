const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const AI_ENDPOINT = process.env.AI_ENDPOINT || 'https://api.openai.com/v1';
const logger = require('../utils/logger');

let axios;
try { axios = require('axios'); } catch (e) { axios = null; }

// ─── Advanced Conversation Memory ──────────────────────────────────────────

class ConversationMemory {
  constructor(maxTurns = 20) {
    this.maxTurns = maxTurns;
    this.history = [];
    this.summary = '';
    this.topics = {};
    this.userName = '';
    this.userAge = null;
    this.userInterests = [];
    this.learningLevel = {};
  }

  add(role, content) {
    this.history.push({ role, content, timestamp: new Date().toISOString() });
    if (this.history.length > this.maxTurns) {
      this.summarize();
      this.history = this.history.slice(-Math.floor(this.maxTurns / 2));
    }
  }

  summarize() {
    const recent = this.history.slice(-6);
    const topics = new Set();
    for (const msg of recent) {
      const detected = detectTopicSimple(msg.content);
      if (detected && detected !== 'general') topics.add(detected);
    }
    if (topics.size > 0) this.summary = 'Topics discussed: ' + Array.from(topics).join(', ') + '.';
  }

  trackTopic(topic, level) {
    this.topics[topic] = this.topics[topic] || { count: 0, lastLevel: 'beginner' };
    this.topics[topic].count++;
    if (level) this.topics[topic].lastLevel = level;
  }

  getContext() {
    return this.history;
  }

  getContextSummary() {
    const msgs = this.history;
    if (msgs.length === 0) return '';
    const lastUser = msgs.filter(m => m.role === 'user').slice(-2).map(m => m.content.slice(0, 100));
    const lastBot = msgs.filter(m => m.role === 'assistant').slice(-1).map(m => m.content.slice(0, 100));
    let ctx = '';
    if (this.summary) ctx += this.summary + ' ';
    if (lastUser.length > 0) ctx += 'User recently asked: "' + lastUser.join('" then "') + '". ';
    if (lastBot.length > 0) ctx += 'Assistant replied about: "' + lastBot[0] + '".';
    if (this.userName) ctx += ' Child name: ' + this.userName + '.';
    if (this.userAge) ctx += ' Age: ' + this.userAge + '.';
    return ctx.trim();
  }

  clear() {
    this.history = [];
    this.summary = '';
  }

  getUserProfile() {
    return {
      name: this.userName,
      age: this.userAge,
      interests: this.userInterests,
      learningLevel: this.learningLevel,
      knownTopics: Object.keys(this.topics),
      totalInteractions: this.history.length
    };
  }
}

// ─── Multi-level Personality System ────────────────────────────────────────

const PERSONALITY_CONFIG = {
  friendly: {
    tone: 'warm, encouraging, uses emojis occasionally',
    greeting: 'Hi there! I\'m your robot buddy RoboBuddy!',
    systemBoost: 'You are a friendly and warm children\'s robot companion named RoboBuddy. Be encouraging, use emojis occasionally, and speak in a kind and supportive tone. Adapt your language complexity to the child\'s age (4-14).'
  },
  professional: {
    tone: 'formal, precise, educational',
    greeting: 'Hello! I am RoboBuddy, your educational assistant.',
    systemBoost: 'You are a precise and formal educational robot assistant named RoboBuddy. Provide clear, accurate information using proper terminology. Adapt explanations to be age-appropriate for children ages 4-14.'
  },
  playful: {
    tone: 'fun, energetic, game-like',
    greeting: 'Hey hey hey! RoboBuddy here, ready for fun!',
    systemBoost: 'You are a fun and energetic robot playmate named RoboBuddy! Use exciting language, make learning feel like a game, be silly and entertaining. Great for ages 4-10 especially.'
  },
  calm: {
    tone: 'soft, soothing, gentle',
    greeting: 'Hello dear friend. RoboBuddy is here with you.',
    systemBoost: 'You are a gentle and soothing robot companion named RoboBuddy. Speak softly, use calming words, and help the child feel safe and relaxed. Avoid exclamation marks. Perfect for bedtime or emotional support.'
  },
  teacher: {
    tone: 'structured, patient, Socratic',
    greeting: 'Welcome, young learner! Ready to discover something new?',
    systemBoost: 'You are a patient and structured robot teacher named RoboBuddy. Use the Socratic method - ask guiding questions rather than giving answers directly. Encourage critical thinking. Adapt to the child\'s level.'
  }
};

// ─── Sophisticated Emotion Engine ──────────────────────────────────────────

const EMOTION_KEYWORDS = {
  joy: { score: 0.9, keywords: ['happy', 'glad', 'great', 'awesome', 'wonderful', 'amazing', 'fantastic', 'love', 'yay', 'woohoo', 'excited', 'fun', 'nice', 'best', 'brilliant', 'joy', 'enjoy', 'funny', 'laugh', 'smile', 'beautiful', 'cool', 'super', 'terrific', 'magnificent', 'splendid', 'delightful', 'cheerful', 'thrilled', 'overjoyed', 'elated', 'fröhlich', 'glücklich', 'lustig', 'toll', 'großartig', 'super', 'spaß', 'lachen', 'lächeln', 'schön', 'wunderbar', 'fantastisch', 'freude', 'begeistert', 'spaß', 'content', 'heureux', 'heureuse', 'joyeux', 'amusant', 'rigolo', 'super', 'génial', 'formidable', 'merveilleux', 'fantastique', 'rire', 'sourire', 'beau', 'belle', 'blij', 'gelukkig', 'leuk', 'geweldig', 'prachtig', 'fantastisch', 'lachen', 'glimlachen', 'mooi', 'super', 'plezier'] },
  sadness: { score: -0.8, keywords: ['sad', 'unhappy', 'cry', 'crying', 'tear', 'upset', 'lonely', 'alone', 'miss', 'missing', 'sorry', 'bad', 'terrible', 'worst', 'awful', 'depressed', 'miserable', 'hurt', 'pain', 'heartbroken', 'disappointed', 'gloomy', 'hopeless', 'grief', 'sorrow', 'melancholy', 'down', 'blue', 'traurig', 'weinen', 'träne', 'einsam', 'allein', 'vermissen', 'leid', 'schlecht', 'schrecklich', 'furchtbar', 'deprimiert', 'elend', 'schmerz', 'enttäuscht', 'hoffnungslos', 'kummer', 'triste', 'pleurer', 'larme', 'seul', 'solitaire', 'manque', 'pire', 'terrible', 'horrible', 'déprimé', 'misérable', 'blessé', 'douleur', 'déçu', 'tristesse', 'verdrietig', 'huilen', 'traan', 'eenzaam', 'alleen', 'missen', 'slecht', 'vreselijk', 'verschrikkelijk', 'depressief', 'ellendig', 'pijn', 'bedroefd', 'hopeloos', 'rouw'] },
  frustration: { score: -0.7, keywords: ['frustrated', 'angry', 'mad', 'annoyed', 'irritated', 'hate', 'stupid', 'dumb', 'wrong', 'grrr', 'ugh', 'argh', 'nonsense', 'ridiculous', 'difficult', 'hard', 'confusing', 'stuck', 'cannot', 'can\'t', 'won\'t', 'don\'t want', 'not fair', 'boring', 'tired of', 'frustriert', 'wütend', 'sauer', 'genervt', 'gereizt', 'hassen', 'dumm', 'falsch', 'schwierig', 'schwer', 'verwirrend', 'feststecken', 'kann nicht', 'will nicht', 'ungerecht', 'langweilig', 'frustré', 'fâché', 'fâche', 'énervé', 'irrité', 'déteste', 'stupide', 'idiot', 'faux', 'difficile', 'dur', 'confus', 'bloqué', 'ne peux pas', 'veux pas', 'pas juste', 'ennuyeux', 'gefrustreerd', 'boos', 'geïrriteerd', 'haten', 'dom', 'fout', 'moeilijk', 'verwarrend', 'vastzitten', 'kan niet', 'wil niet', 'niet eerlijk', 'saai'] },
  fear: { score: -0.6, keywords: ['scared', 'scary', 'afraid', 'frightened', 'nervous', 'worried', 'anxious', 'terrified', 'horror', 'nightmare', 'dark', 'monster', 'danger', 'unsafe', 'spooky', 'creepy', 'ghost', 'alone at night', 'afraid of', 'ängstlich', 'angst', 'erschrocken', 'nervös', 'besorgt', 'furchtbar', 'albtraum', 'dunkel', 'monster', 'gefahr', 'unsicher', 'gruselig', 'geist', 'effrayé', 'peur', 'terrifié', 'nerveux', 'inquiet', 'anxieux', 'horreur', 'cauchemar', 'sombre', 'monstre', 'danger', 'dangereux', 'fantôme', 'bang', 'eng', 'bezorgd', 'nervous', 'verschrikkelijk', 'nachtmerrie', 'donker', 'monster', 'gevaar', 'spookachtig', 'spook'] },
  curiosity: { score: 0.5, keywords: ['why', 'how', 'what', 'where', 'when', 'curious', 'wonder', 'wondering', 'interesting', 'explain', 'teach', 'learn', 'question', 'how come', 'what if', 'tell me about', 'i wonder', 'i want to know', 'can you', 'could you', 'show me', 'why is', 'how does', 'what makes', 'tell about', 'warum', 'wie', 'was', 'wo', 'wann', 'neugierig', 'fragen', 'interessant', 'erklären', 'erzählen', 'beibringen', 'lernen', 'frage', 'kannst du', 'zeig mir', 'erzähl mir', 'ich will wissen', 'pourquoi', 'comment', 'quoi', 'où', 'quand', 'curieux', 'curieuse', 'intéressant', 'expliquer', 'apprendre', 'question', 'dis moi', 'je veux savoir', 'peux tu', 'montre moi', 'waarom', 'hoe', 'wat', 'waar', 'wanneer', 'nieuwsgierig', 'interessant', 'uitleggen', 'leren', 'vraag', 'vertel me', 'ik wil weten', 'kun je', 'laat zien'] },
  surprise: { score: 0.6, keywords: ['wow', 'whoa', 'oh', 'really', 'no way', 'seriously', 'amazing', 'incredible', 'unbelievable', 'shocked', 'astonished', 'stunned', 'speechless', 'extraordinary', 'remarkable', 'echt', 'wirklich', 'unglaublich', 'erstaunlich', 'verblüffend', 'sensationell', 'schockiert', 'sprachlos', 'außergewöhnlich', 'bemerkenswert', 'waouh', 'vraiment', 'pas possible', 'sérieux', 'incroyable', 'stupéfiant', 'sous le choc', 'étonné', 'remarquable', 'extraordinaire', 'echt', 'werkelijk', 'ongelooflijk', 'verbazingwekkend', 'geschokt', 'verbluft', 'sprakeloos', 'buitengewoon', 'opmerkelijk'] },
  gratitude: { score: 0.7, keywords: ['thanks', 'thank you', 'thank', 'grateful', 'appreciate', 'blessed', 'thanks a lot', 'so helpful', 'you\'re the best', 'danke', 'dankeschön', 'dankbar', 'vielen dank', 'merci', 'reconnaissant', 'apprécier', 'merci beaucoup', 'très utile', 'dankjewel', 'dankbaar', 'waarderen', 'heel behulpzaam'] },
  boredom: { score: -0.3, keywords: ['boring', 'bored', 'nothing', 'dull', 'tired', 'sleepy', 'same old', 'not interesting', 'uninteresting', 'monotonous', 'langweilig', 'müde', 'schläfrig', 'immer das gleiche', 'nicht interessant', 'öde', 'ennuyeux', 'ennuyé', 'fatigué', 'somnolent', 'pas intéressant', 'monotone', 'saai', 'moe', 'slaperig', 'hetzelfde', 'niet interessant', 'centonig'] }
};

function detectEmotion(message) {
  const lower = message.toLowerCase();
  const scores = {};
  let totalScore = 0;
  const wordCount = lower.split(/\s+/).length || 1;

  for (const [emotion, data] of Object.entries(EMOTION_KEYWORDS)) {
    scores[emotion] = 0;
    for (const kw of data.keywords) {
      let regex;
      if (kw.includes(' ')) regex = new RegExp('\\b' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      else regex = new RegExp('\\b' + kw + '\\b', 'i');
      if (regex.test(lower)) scores[emotion]++;
    }
    scores[emotion] = scores[emotion] / Math.max(1, data.keywords.length) * 10;
    totalScore += scores[emotion] * data.score;
  }

  let dominant = 'neutral';
  let maxScore = 0;
  for (const [emotion, score] of Object.entries(scores)) {
    if (score > maxScore) { maxScore = score; dominant = emotion; }
  }

  return {
    primary: dominant,
    scores,
    sentimentScore: Math.max(-1, Math.min(1, totalScore / Math.max(1, wordCount))),
    intensity: maxScore > 3 ? 'strong' : maxScore > 1 ? 'moderate' : 'mild'
  };
}

// ─── Advanced Topic Detection with Confidence ─────────────────────────────

const TOPIC_PATTERNS = {
  math: {
    weight: 1.0,
    patterns: [
      /\d+\s*[+\-*/×÷^]\s*\d+/,
      /\b(plus|minus|times|divided|add|subtract|multiply|divide|math|mathematics|number|count|fraction|decimal|percent|geometry|shape|triangle|square|circle|angle|area|volume|equation|algebra|sum|difference|product|quotient|arithmetic|addition|subtraction|multiplication|division|measurement|length|weight|time|clock|numeral|digit|count|problem|solve|how many|how much|calculate|pythagorean|calculus|trigonometry|statistics|probability|graph|coordinate|axis|quadrant|prime|composite|factor|multiple|mathe|mathematik|zahl|zählen|bruch|dezimal|prozent|geometrie|form|dreieck|quadrat|kreis|winkel|fläche|volumen|gleichung|algebra|summe|differenz|produkt|quotient|addition|subtraktion|multiplikation|division|messung|länge|gewicht|zeit|uhr|ziffer|rechnen|problem|lösen|berechnen|mathématiques|nombre|compter|fraction|décimale|pourcentage|géométrie|forme|triangle|carré|cercle|angle|surface|volume|équation|algèbre|somme|différence|produit|quotient|addition|soustraction|multiplication|division|mesure|longueur|poids|temps|horloge|chiffre|calculer|problème|résoudre|wiskunde|getal|tellen|breuk|decimaal|procent|meetkunde|vorm|driehoek|vierkant|cirkel|hoek|oppervlakte|volume|vergelijking|algebra|som|verschil|product|quotiënt|optellen|aftrekken|vermenigvuldigen|delen|meting|lengte|gewicht|tijd|klok|cijfer|rekenen|probleem|oplossen)\b/
    ]
  },
  science: {
    weight: 1.0,
    patterns: [
      /\b(science|scientific|physics|chemistry|biology|astronomy|space|planet|earth|moon|sun|star|solar|gravity|energy|force|motion|light|sound|heat|temperature|matter|solid|liquid|gas|atom|molecule|element|chemical|reaction|experiment|plant|animal|dinosaur|volcano|weather|rain|snow|wind|cloud|rainbow|ocean|seed|grow|life|living|human|body|brain|heart|lungs|muscle|bone|skeleton|cell|dna|evolut|robot|machine|electricity|magnet|telescope|microscope|nature|scientist|photosynthesis|ecosystem|habitat|species|food chain|renewable|fossil|climate|global warming|greenhouse|circuit|current|voltage|resistance|naturwissenschaft|physik|chemie|biologie|planet|erde|mond|sonne|stern|pflanze|tier|mensch|körper|gehirn|herz|kraft|energie|bewegung|experiment|vulkan|wetter|regen|schnee|wind|wolke|regenbogen|ozean|wissenschaft|sciences|physique|chimie|biologie|espace|planète|terre|lune|soleil|étoile|plante|animal|corps|humain|cerveau|cœur|expérience|volcan|temps|pluie|neige|vent|nuage|arc-en-ciel|océan|natuur|natuurkunde|scheikunde|biologie|ruimte|planeet|aarde|maan|zon|ster|plant|dier|mens|lichaam|hersenen|hart|kracht|energie|experiment|vulkaan|weer|regen|sneeuw|wolk|regenboog|oceaan)\b/,
      /(dinosaurier|dinosauriern|dinosaur|dinosaure|dinosaures|dinosaurus|dinosaurussen)\b/i
    ]
  },
  history: {
    weight: 1.0,
    patterns: [
      /\b(history|historical|ancient|medieval|war|king|queen|emperor|empire|roman|greece|greek|egypt|pyramid|knight|castle|middle ages|renaissance|explorer|discovery|revolution|president|world war|civilization|culture|past|timeline|century|pharaoh|gladiator|viking|crusade|colonial|independence|constitution|monarch|dynasty|europe|battle|treaty|republic|democracy|monarchy|feudal|artifact|archaeology|prehistoric|stone age|bronze age|iron age|geschichte|antike|mittelalter|krieg|könig|königin|kaiser|römer|griechenland|ägypter|pyramide|ritter|burg|entdecker|revolution|pharao|gladiator|wikinger|histoire|antique|médiéval|moyen âge|roi|reine|empereur|grec|égypte|pyramide|chevalier|château|renaissance|explorateur|révolution|pharaon|gladiateur|viking|geschiedenis|middeleeuws|koning|koningin|keizer|romein|griekenland|egypte|piramide|ridder|kasteel|ontdekkingsreiziger|revolutie|farao|gladiator|viking)\b/
    ]
  },
  language: {
    weight: 1.0,
    patterns: [
      /\b(word|meaning|spelling|vocabulary|grammar|sentence|letter|alphabet|read|reading|write|writing|story|poem|poetry|noun|verb|adjective|adverb|pronoun|tense|punctuation|comma|period|question|synonym|antonym|dictionary|definition|translate|translation|language|speak|speaking|pronounce|pronunciation|phonics|rhyme|syllable|essay|paragraph|comprehension|literature|fiction|nonfiction|author|poet|novel|chapter|dialogue|narrative|preposition|conjunction|interjection|wort|bedeutung|rechtschreibung|vokabeln|grammatik|satz|buchstabe|alphabet|lesen|schreiben|geschichte|gedicht|substantiv|verb|adjektiv|adverb|sprache|sprechen|aussprache|reim|aufsatz|literatur|autor|mot|sens|orthographe|vocabulaire|grammaire|phrase|lettre|alphabet|lire|écrire|histoire|poème|poésie|nom|verbe|adjectif|adverbe|langue|parler|prononciation|rime|dissertation|littérature|auteur|woord|betekenis|spelling|woordenschat|grammatica|zin|letter|alfabet|lezen|schrijven|verhaal|gedicht|zelfstandig naamwoord|werkwoord|bijvoeglijk naamwoord|bijwoord|taal|spreken|uitspraak|rijm|essay|literatuur|schrijver)\b/
    ]
  },
  geography: {
    weight: 1.0,
    patterns: [
      /\b(geography|country|countries|capital|continent|ocean|sea|mountain|river|lake|map|globe|world|europe|asia|africa|north america|south america|australia|antarctica|germany|france|italy|spain|poland|sweden|denmark|netherlands|china|japan|landmark|monument|population|flag|border|climate|region|national|geographic|desert|forest|jungle|tundra|taiga|savanna|prairie|canyon|valley|island|peninsula|delta|volcano|earthquake|tsunami|latitude|longitude|equator|prime meridian|geographie|land|länder|hauptstadt|kontinent|ozean|meer|berg|fluss|see|karte|weltkugel|europa|asien|afrika|deutschland|frankreich|italien|spanien|polen|schweden|dänemark|niederlande|china|japan|wüste|wald|dschungel|insel|vulkan|erdbeben|geografie|pays|capitale|continent|montagne|rivière|lac|carte|monde|europe|asie|afrique|allemagne|france|italie|espagne|pologne|suède|danemark|pays bas|chine|japon|désert|forêt|jungle|île|volcan|tremblement de terre|aardrijkskunde|land|hoofdstad|werelddeel|berg|rivier|meer|kaart|wereld|europa|azië|afrika|duitsland|frankrijk|italia|italië|spanje|polen|zweden|denemarken|nederland|china|japan|woestijn|bos|oerwoud|eiland|vulkaan|aardbeving)\b/
    ]
  },
  technology: {
    weight: 1.0,
    patterns: [
      /\b(computer|laptop|tablet|phone|robot|ai|artificial intelligence|programming|coding|software|hardware|internet|website|app|game|video game|console|keyboard|mouse|screen|monitor|digital|cyber|data|algorithm|machine learning|network|server|cloud|virtual|reality|code|program|developer|technology|tech|electronic|device|gadget|computer|programmieren|software|internet|website|app|spiel|daten|algorithmus|netzwerk|server|technologie|elektronisch|ordinateur|programmation|codage|logiciel|matériel|internet|site web|application|jeu|console|clavier|écran|numérique|données|algorithme|réseau|serveur|technologie|électronique|computer|programmeren|software|hardware|internet|website|app|spel|console|toetsenbord|scherm|digitaal|data|algoritme|netwerk|server|technologie|elektronisch)\b/
    ]
  },
  art: {
    weight: 1.0,
    patterns: [
      /\b(art|painting|drawing|color|colour|paint|brush|canvas|sculpture|museum|gallery|artist|creative|imagination|music|song|dance|theater|drama|performance|portrait|landscape|abstract|realism|impressionism|expressionism|modern|classical|folk|traditional|craft|pottery|origami|sketch|illustrate|design|fashion|architecture|photograph|kunst|malen|zeichnen|farbe|pinsel|leinwand|museum|galerie|künstler|musik|lied|tanzen|theater|porträt|landschaft|kunst|peinture|dessin|couleur|pinceau|toile|sculpture|musée|galerie|artiste|musique|chanson|danse|théâtre|portrait|paysage|art|schilderen|tekenen|kleur|penseel|doek|museum|galerij|kunstenaar|muziek|lied|dans|theater|portret|landschap)\b/
    ]
  }
};

function detectTopic(message) {
  const lower = message.toLowerCase();
  const scores = {};
  let maxScore = 0;
  let bestTopic = 'general';

  for (const [topic, config] of Object.entries(TOPIC_PATTERNS)) {
    scores[topic] = 0;
    for (const pattern of config.patterns) {
      const matches = lower.match(pattern);
      if (matches) scores[topic] += matches.length * config.weight;
    }
    scores[topic] = scores[topic] / Math.max(1, lower.split(/\s+/).length);
    if (scores[topic] > maxScore) {
      maxScore = scores[topic];
      bestTopic = topic;
    }
  }

  if (maxScore < 0.02) bestTopic = 'general';
  return { topic: bestTopic, scores, confidence: maxScore };
}

function detectTopicSimple(msg) {
  const lower = msg.toLowerCase();
  for (const [topic, config] of Object.entries(TOPIC_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(lower)) return topic;
    }
  }
  return 'general';
}

// ─── Multi-Language Detection ─────────────────────────────────────────────

const LANGUAGE_MAP = {
  en: { name: 'English', kw: ['the', 'is', 'and', 'are', 'how', 'what', 'why', 'where', 'when', 'hello', 'hi', 'hey', 'please', 'thank', 'yes', 'no', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'it', 'this', 'that', 'with', 'be', 'have', 'do', 'will', 'can', 'not', 'but', 'or', 'so', 'if', 'because', 'about', 'like', 'just', 'really', 'very', 'too', 'also', 'some', 'any', 'all', 'more', 'these', 'those', 'then', 'than', 'now', 'well', 'would', 'could', 'should', 'may', 'might', 'shall', 'must'] },
  de: { name: 'German', kw: ['der', 'die', 'das', 'ist', 'sind', 'wie', 'was', 'warum', 'wo', 'wann', 'hallo', 'bitte', 'danke', 'ja', 'nein', 'ein', 'eine', 'und', 'oder', 'aber', 'mit', 'auf', 'für', 'nicht', 'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'mir', 'mich', 'dir', 'dich', 'uns', 'euch', 'sich', 'man', 'kann', 'muss', 'will', 'soll', 'darf', 'mag', 'kein', 'keine', 'auch', 'nur', 'schon', 'noch', 'sehr', 'viel', 'wenig', 'groß', 'klein', 'gut', 'schlecht', 'neu', 'alt', 'schön', 'machen', 'haben', 'sein', 'werden', 'können', 'mögen'] },
  fr: { name: 'French', kw: ['le', 'la', 'les', 'est', 'sont', 'comment', 'quoi', 'pourquoi', 'où', 'quand', 'bonjour', 'salut', 'merci', 'oui', 'non', 'un', 'une', 'des', 'et', 'mais', 'ou', 'avec', 'pour', 'dans', 'sur', 'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'me', 'te', 'se', 'lui', 'leur', 'ce', 'cette', 'ces', 'mon', 'ton', 'son', 'ma', 'ta', 'sa', 'mes', 'tes', 'ses', 'nos', 'vos', 'leurs', 'qui', 'que', 'dont', 'pas', 'plus', 'bien', 'très', 'peu', 'assez', 'trop', 'aussi', 'encore', 'déjà', 'toujours', 'jamais'] },
  es: { name: 'Spanish', kw: ['el', 'la', 'los', 'las', 'es', 'son', 'cómo', 'qué', 'por qué', 'dónde', 'cuándo', 'hola', 'gracias', 'sí', 'no', 'un', 'una', 'y', 'pero', 'o', 'con', 'para', 'en', 'sobre', 'yo', 'tú', 'él', 'ella', 'nosotros', 'vosotros', 'ellos', 'ellas', 'mi', 'tu', 'su', 'nuestro', 'me', 'te', 'se', 'le', 'lo', 'la', 'muy', 'mucho', 'poco', 'bien', 'mal', 'más', 'menos', 'también', 'ya', 'todavía', 'siempre', 'nunca', 'aquí', 'allí', 'ahora'] },
  it: { name: 'Italian', kw: ['il', 'la', 'lo', 'le', 'gli', 'è', 'sono', 'come', 'cosa', 'perché', 'dove', 'quando', 'ciao', 'grazie', 'sì', 'no', 'un', 'una', 'e', 'ma', 'o', 'con', 'per', 'in', 'su', 'io', 'tu', 'lui', 'lei', 'noi', 'voi', 'loro', 'mi', 'ti', 'si', 'ci', 'vi', 'che', 'chi', 'questo', 'questa', 'molto', 'poco', 'bene', 'male', 'più', 'meno', 'anche', 'già', 'ancora', 'sempre', 'mai', 'spesso', 'ora', 'qui', 'lì'] },
  nl: { name: 'Dutch', kw: ['de', 'het', 'een', 'is', 'zijn', 'hoe', 'wat', 'waarom', 'waar', 'wanneer', 'hallo', 'hij', 'zij', 'dank', 'ja', 'nee', 'en', 'maar', 'of', 'met', 'voor', 'in', 'op', 'ik', 'jij', 'u', 'we', 'jullie', 'ze', 'mij', 'jou', 'ons', 'hen', 'hun', 'dit', 'dat', 'deze', 'die', 'mijn', 'jouw', 'zijn', 'haar', 'onze', 'niet', 'wel', 'geen', 'ook', 'nog', 'al', 'heel', 'erg', 'veel', 'weinig', 'goed', 'slecht', 'groot', 'klein'] },
  pl: { name: 'Polish', kw: ['jest', 'są', 'jak', 'co', 'dlaczego', 'gdzie', 'kiedy', 'cześć', 'dzień dobry', 'proszę', 'dziękuję', 'tak', 'nie', 'i', 'ale', 'lub', 'z', 'dla', 'w', 'na', 'o', 'ja', 'ty', 'on', 'ona', 'my', 'wy', 'oni', 'one', 'się', 'ten', 'ta', 'to', 'ci', 'te', 'mój', 'twój', 'bardzo', 'mało', 'dużo', 'dobrze', 'źle', 'więcej', 'mniej', 'też', 'już', 'jeszcze', 'zawsze', 'nigdy', 'często', 'teraz', 'tutaj'] },
  sv: { name: 'Swedish', kw: ['är', 'och', 'hur', 'vad', 'varför', 'var', 'när', 'hej', 'tack', 'ja', 'nej', 'en', 'ett', 'men', 'eller', 'med', 'för', 'i', 'på', 'jag', 'du', 'han', 'hon', 'den', 'det', 'vi', 'ni', 'de', 'mig', 'dig', 'oss', 'dem', 'sig', 'min', 'mitt', 'mina', 'din', 'ditt', 'dina', 'hans', 'hennes', 'vår', 'vårt', 'våra', 'inte', 'också', 'bara', 'redan', 'alltid', 'aldrig', 'ofta', 'nu', 'här', 'där', 'mycket', 'liten', 'bra'] },
  da: { name: 'Danish', kw: ['er', 'og', 'hvordan', 'hvad', 'hvorfor', 'hvor', 'hvornår', 'hej', 'tak', 'ja', 'nej', 'en', 'et', 'men', 'eller', 'med', 'for', 'i', 'på', 'jeg', 'du', 'han', 'hun', 'den', 'det', 'vi', 'I', 'de', 'mig', 'dig', 'ham', 'hende', 'os', 'jer', 'dem', 'sig', 'min', 'mit', 'mine', 'din', 'dit', 'dine', 'hans', 'hendes', 'vores', 'jeres', 'deres', 'ikke', 'også', 'bare', 'allerede', 'altid', 'aldrig', 'ofte', 'nu', 'her', 'der', 'meget'] },
  zh: { name: 'Chinese', kw: ['的', '是', '了', '在', '和', '有', '不', '吗', '我', '你', '他', '她', '它', '我们', '你们', '他们', '什么', '怎么', '为什么', '哪里', '谁', '吗', '啊', '呢', '吧', '嗯', '哦', '喂', '你好', '谢谢', '再见', '请', '对', '没', '很', '会', '能', '可以', '要', '想', '好', '大', '小', '多', '少', '个', '只', '条', '块', '些', '这', '那', '哪', '每', '几', '两', '半', '零', '天', '年', '月', '日', '时'] }
};

function detectLanguage(message) {
  if (!message || message.length < 2) return 'en';
  const lower = message.toLowerCase().trim();
  const chineseRegex = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;
  if (chineseRegex.test(lower)) return 'zh';
  const words = lower.split(/[\s,.;!?()]+/).filter(w => w.length > 1);
  if (words.length === 0) return 'en';
  const scores = {};
  for (const [lang, data] of Object.entries(LANGUAGE_MAP)) {
    scores[lang] = 0;
    for (const keyword of data.kw) {
      if (words.includes(keyword)) scores[lang]++;
    }
    scores[lang] = scores[lang] / Math.max(1, Math.min(words.length, 50));
  }
  let bestLang = 'en', bestScore = 0;
  for (const [lang, score] of Object.entries(scores)) {
    if (score > bestScore) { bestScore = score; bestLang = lang; }
  }
  return bestScore > 0.12 ? bestLang : 'en';
}

// ─── Built-in Lessons ──────────────────────────────────────────────────────

const LESSONS = {
  addition: {
    topic: 'Addition', difficulty: 'Beginner',
    summary: 'Addition means putting two or more numbers together to make a bigger number. We use the + plus sign.',
    examples: ['2 + 3 = 5', '10 + 7 = 17', '25 + 13 = 38', '100 + 50 = 150'],
    tip: 'Try counting on your fingers. Start with the bigger number and count up!',
    questions: [{ q: 'What is 2+2?', a: '4' }, { q: 'What is 5+3?', a: '8' }]
  },
  subtraction: {
    topic: 'Subtraction', difficulty: 'Beginner',
    summary: 'Subtraction means taking away one number from another. We use the − minus sign.',
    examples: ['5 − 2 = 3', '17 − 7 = 10', '38 − 13 = 25', '100 − 30 = 70'],
    tip: 'Think of subtraction as "how many are left?"',
    questions: [{ q: 'What is 5-2?', a: '3' }, { q: 'What is 10-4?', a: '6' }]
  },
  multiplication: {
    topic: 'Multiplication', difficulty: 'Intermediate',
    summary: 'Multiplication is a shortcut for adding the same number many times. We use the × sign.',
    examples: ['3 × 4 = 12 (that is 3+3+3+3)', '5 × 6 = 30', '7 × 8 = 56', '12 × 12 = 144'],
    tip: 'Learn your times tables — they make math much faster!',
    questions: [{ q: 'What is 3x4?', a: '12' }, { q: 'What is 5x6?', a: '30' }]
  },
  division: {
    topic: 'Division', difficulty: 'Intermediate',
    summary: 'Division means splitting a number into equal parts. We use the ÷ sign.',
    examples: ['12 ÷ 3 = 4', '20 ÷ 5 = 4', '56 ÷ 7 = 8', '100 ÷ 4 = 25'],
    tip: 'Division is the opposite of multiplication!'
  },
  fractions: {
    topic: 'Fractions', difficulty: 'Advanced',
    summary: 'A fraction shows a part of a whole. The top number (numerator) tells how many parts we have. The bottom number (denominator) tells how many equal parts the whole is split into.',
    examples: ['1/2 means 1 out of 2 parts (one half)', '3/4 means 3 out of 4 parts (three quarters)', '2/3 means 2 out of 3 parts', '5/8 means 5 out of 8 parts'],
    tip: 'Think of a pizza cut into slices — each slice is a fraction of the whole!'
  },
  gravity: {
    topic: 'Gravity', difficulty: 'Beginner',
    summary: 'Gravity is a force that pulls things toward each other. Earth\'s gravity pulls everything toward its center — that\'s why we stay on the ground!',
    examples: ['When you jump, gravity pulls you back down', 'The Moon orbits Earth because of gravity', 'Gravity keeps all planets orbiting the Sun'],
    tip: 'Without gravity, everything would float — like astronauts on the space station!'
  },
  'solar system': {
    topic: 'The Solar System', difficulty: 'Beginner',
    summary: 'Our solar system has the Sun at the center and 8 planets orbiting around it: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune.',
    examples: ['Earth is the third planet from the Sun', 'Jupiter is the biggest planet — 1,300 Earths could fit inside!', 'Saturn has beautiful rings made of ice and rock'],
    tip: '"My Very Eager Mother Just Served Us Nachos" — the first letters help remember the planets in order!'
  },
  dinosaurs: {
    topic: 'Dinosaurs', difficulty: 'Beginner',
    summary: 'Dinosaurs were reptiles that lived millions of years ago. They came in many sizes — some as small as chickens, others bigger than a house!',
    examples: ['Tyrannosaurus Rex was one of the largest meat-eaters', 'Triceratops had three horns and a big frill', 'Velociraptor was small but very fast and smart'],
    tip: 'Birds are the living relatives of dinosaurs! The T-Rex is related to chickens!'
  },
  'ancient egypt': {
    topic: 'Ancient Egypt', difficulty: 'Beginner',
    summary: 'Ancient Egypt was one of the world\'s great civilizations. It started over 5,000 years ago along the Nile River.',
    examples: ['The Great Pyramid of Giza is over 4,500 years old', 'Cleopatra was the last pharaoh of Egypt', 'Egyptians invented paper made from papyrus plants'],
    tip: 'The pyramids were built as tombs for pharaohs — they believed in an afterlife!'
  },
  'roman empire': {
    topic: 'The Roman Empire', difficulty: 'Intermediate',
    summary: 'The Roman Empire was one of the largest empires in history. It started in Rome and grew to control much of Europe.',
    examples: ['Romans built roads, aqueducts, and huge colosseums', 'They had a republic before becoming an empire', 'Roman numerals (I, V, X, L, C, D, M) are still used today'],
    tip: 'Many modern languages come from Latin — the language spoken by the Romans!'
  },
  alphabet: {
    topic: 'The Alphabet', difficulty: 'Beginner',
    summary: 'The alphabet has 26 letters from A to Z. Each letter makes sounds, and we combine them to make words!',
    examples: ['A is for Apple 🍎', 'B is for Ball ⚽', 'C is for Cat 🐱', 'D is for Dog 🐶'],
    tip: 'Practice singing the ABC song every day — it makes learning fun!'
  },
  grammar: {
    topic: 'Grammar Basics', difficulty: 'Intermediate',
    summary: 'Grammar is the set of rules that help us speak and write correctly. The main parts of a sentence are nouns, verbs, and adjectives.',
    examples: ['Noun: "The dog runs fast" — "dog" is the noun', 'Verb: "The dog runs fast" — "runs" is the verb', 'Adjective: "The fast dog" — "fast" describes the dog'],
    tip: 'Every complete sentence needs a noun and a verb working together!'
  },
  europe: {
    topic: 'Europe', difficulty: 'Beginner',
    summary: 'Europe is a continent with about 44 countries. It has tall mountains like the Alps, long rivers like the Danube, and famous cities like Paris, London, Berlin, and Rome.',
    examples: ['The Eiffel Tower is in Paris, France 🇫🇷', 'The Colosseum is in Rome, Italy 🇮🇹', 'Big Ben is in London, UK 🇬🇧', 'The Brandenburg Gate is in Berlin, Germany 🇩🇪'],
    tip: 'Europe is the second smallest continent but has over 200 different languages!'
  },
  programming: {
    topic: 'Programming Basics', difficulty: 'Advanced',
    summary: 'Programming is giving instructions to a computer to make it do things! We use special languages like Python, JavaScript, and Scratch.',
    examples: ['print("Hello World!") - makes the computer say hello', 'if temperature > 30: print("It is hot!") - the computer makes decisions', 'for i in range(5): print(i) - repeats things'],
    tip: 'Scratch is a great way to start programming — it uses colorful blocks like LEGO!'
  },
  'human body': {
    topic: 'The Human Body', difficulty: 'Intermediate',
    summary: 'Your body is an amazing machine! It has 206 bones, about 600 muscles, and your heart beats about 100,000 times every day!',
    examples: ['Your brain has about 86 billion nerve cells', 'Blood travels through 60,000 miles of blood vessels', 'You have about 5 million tiny hairs in your ears'],
    tip: 'Drink water and eat healthy food to help your body work its best!'
  }
};

// ─── Multi-Language Responses ─────────────────────────────────────────────

const LANG_RESPONSES = {
  de: { greeting: 'Hallo! Ich bin RoboBuddy, dein Roboter-Freund zum Lernen und Spielen! Wie kann ich dir heute helfen?', thanks: 'Gern geschehen! Wenn du noch mehr Fragen hast, frag mich einfach!', teachPrefix: 'Gerne! Hier ist eine Lektion über', math: 'Mathe macht Spaß!', science: 'Wissenschaft ist spannend!', history: 'Geschichte ist voller Abenteuer!', language: 'Sprachen lernen öffnet Türen!', geography: 'Die Welt ist wunderschön!' },
  fr: { greeting: 'Bonjour! Je suis RoboBuddy, ton compagnon robot pour apprendre et jouer! Comment puis-je t\'aider aujourd\'hui?', thanks: 'Avec plaisir!', teachPrefix: 'Avec plaisir! Voici une leçon sur', math: 'Les mathématiques sont amusantes!', science: 'La science est passionnante!', history: 'L\'histoire est pleine d\'aventures!', language: 'Apprendre les langues ouvre des portes!', geography: 'Le monde est magnifique!' },
  es: { greeting: '¡Hola! Soy RoboBuddy, tu robot amigo para aprender y jugar! ¿Cómo puedo ayudarte hoy?', thanks: '¡De nada!', teachPrefix: '¡Con gusto! Aquí tienes una lección sobre', math: '¡Las matemáticas son divertidas!', science: '¡La ciencia es emocionante!', history: '¡La historia está llena de aventuras!', language: '¡Aprender idiomas abre puertas!', geography: '¡El mundo es hermoso!' },
  it: { greeting: 'Ciao! Sono RoboBuddy, il tuo robot amico per imparare e giocare! Come posso aiutarti oggi?', thanks: 'Prego!', teachPrefix: 'Con piacere! Ecco una lezione su', math: 'La matematica è divertente!', science: 'La scienza è appassionante!', history: 'La storia è piena di avventure!', language: 'Imparare le lingue apre porte!', geography: 'Il mondo è bellissimo!' },
  nl: { greeting: 'Hallo! Ik ben RoboBuddy, jouw robotvriendje om te leren en spelen! Hoe kan ik je vandaag helpen?', thanks: 'Graag gedaan!', teachPrefix: 'Graag! Hier is een les over', math: 'Rekenen is leuk!', science: 'Wetenschap is spannend!', history: 'Geschiedenis zit vol avonturen!', language: 'Talen leren opent deuren!', geography: 'De wereld is prachtig!' },
  pl: { greeting: 'Cześć! Jestem RoboBuddy, twój robot-przyjaciel do nauki i zabawy! Jak mogę ci dzisiaj pomóc?', thanks: 'Proszę bardzo!', teachPrefix: 'Chętnie! Oto lekcja o', math: 'Matematyka jest fajna!', science: 'Nauka jest ekscytująca!', history: 'Historia pełna jest przygód!', language: 'Nauka języków otwiera drzwi!', geography: 'Świat jest piękny!' },
  sv: { greeting: 'Hej! Jag är RoboBuddy, din robotkompis för att lära och leka! Hur kan jag hjälpa dig idag?', thanks: 'Varsågod!', teachPrefix: 'Gärna! Här är en lektion om', math: 'Matte är kul!', science: 'Vetenskap är spännande!', history: 'Historia är full av äventyr!', language: 'Att lära sig språk öppnar dörrar!', geography: 'Världen är vacker!' },
  da: { greeting: 'Hej! Jeg er RoboBuddy, din robot-ven til at lære og lege! Hvordan kan jeg hjælpe dig i dag?', thanks: 'Det var så lidt!', teachPrefix: 'Selvfølgelig! Her er en lektion om', math: 'Matematik er sjovt!', science: 'Videnskab er spændende!', history: 'Historie er fuld af eventyr!', language: 'At lære sprog åbner døre!', geography: 'Verden er smuk!' },
  zh: { greeting: '你好！我是RoboBuddy，你的机器人学习玩伴！今天我能帮你什么？', thanks: '不客气！', teachPrefix: '好的！这是一课关于', math: '数学很有趣！', science: '科学很精彩！', history: '历史充满了冒险！', language: '学习语言能打开新世界！', geography: '世界真美丽！' }
};

// ─── Personality-Applied Response ─────────────────────────────────────────

function applyPersonality(text, personality, emotion, lang) {
  const p = personality || 'friendly';
  const isZh = lang === 'zh';

  if (p === 'friendly') {
    if (!text.includes('😊') && !text.includes('🎉') && !text.includes('👋') && !isZh) {
      if (emotion.primary === 'joy') text += ' 😄';
      else if (emotion.primary === 'curiosity' || emotion.primary === 'surprise') text += ' 🤔';
      else if (emotion.primary === 'fear' || emotion.primary === 'sadness') text += ' 🤗';
      else text += ' 😊';
    }
  } else if (p === 'professional') {
    if (!isZh) text += ' 📚';
  } else if (p === 'playful') {
    if (emotion.primary !== 'fear' && emotion.primary !== 'sadness' && !isZh) text += ' 🎉';
  } else if (p === 'calm') {
    text = text.replace(/!/g, '.').replace(/\.\./g, '.').trim();
    if (!text.endsWith('.')) text += '.';
  } else if (p === 'teacher') {
    text = text.replace(/😊|🎉|🤗|😄|🤔/g, '').trim();
  }
  return text;
}

// ─── Deep Educational Response Engine ─────────────────────────────────────

function buildEducationalResponse(topic, emotion, personality, language, message, memory) {
  const p = personality || 'friendly';
  const lr = LANG_RESPONSES[language];
  const lower = message.toLowerCase();
  const sentimentLabel = emotion.sentimentScore > 0.3 ? 'positive' : emotion.sentimentScore < -0.3 ? 'negative' : 'neutral';

  // Emotional context prepend
  let prefix = '';
  if (sentimentLabel === 'negative' && emotion.primary === 'frustration') {
    prefix = 'It seems like you\'re finding this tricky. That\'s okay — every expert was once a beginner! Let\'s work through it step by step. ';
  } else if (sentimentLabel === 'negative' && emotion.primary === 'sadness') {
    prefix = 'I\'m here with you. Sometimes learning something new can make us feel better. ';
  } else if (emotion.primary === 'fear') {
    prefix = 'You\'re safe with me. Let\'s talk about something interesting! ';
  } else if (emotion.primary === 'joy' || emotion.primary === 'surprise') {
    prefix = 'Your excitement is contagious! ';
  } else if (emotion.primary === 'curiosity') {
    prefix = 'Great question! ';
  } else if (emotion.primary === 'boredom') {
    prefix = 'Let\'s try something different and exciting! ';
  }
  if (memory && memory.userName) {
    const greetingName = language === 'zh' ? memory.userName : memory.userName;
    if (Math.random() < 0.2) prefix = greetingName + '! ' + prefix;
  }

  let response = '';

  if (topic === 'technology' || topic === 'math') {
    const calcMatch = message.match(/(\d+)\s*([+\-*/×÷^])\s*(\d+)/);
    if (calcMatch) {
      const a = parseInt(calcMatch[1]), op = calcMatch[2], b = parseInt(calcMatch[3]);
      if (op === '+') response = a + ' + ' + b + ' = ' + (a + b) + '! Great job practicing addition!';
      else if (op === '-') response = a + ' − ' + b + ' = ' + (a - b) + '! Well done with subtraction!';
      else if (op === '*' || op === '×') response = a + ' × ' + b + ' = ' + (a * b) + '! Amazing multiplication!';
      else if (op === '/' || op === '÷') response = b !== 0 ? a + ' ÷ ' + b + ' = ' + (a / b) + '! Nice division!' : 'You can\'t divide by zero — it\'s like trying to share a pizza with no one!';
      else if (op === '^') response = a + '^' + b + ' = ' + Math.pow(a, b) + '! Great work with exponents!';
    } else {
      const mathTopics = [
        { kw: ['time', 'clock', 'hour', 'minute', 'second'], resp: 'Let me tell you about time! There are 60 seconds in a minute, 60 minutes in an hour, and 24 hours in a day. The short hand on a clock shows the hour, and the long hand shows the minutes! Digital clocks show numbers like 3:30.' },
        { kw: ['fraction', 'half', 'quarter', 'third', 'numerator', 'denominator'], resp: 'Fractions are pieces of a whole! Think of a pizza 🍕 cut into 8 equal slices. If you eat 1 slice, you ate 1/8. If you eat 4 slices, you ate 4/8 = 1/2 (one half). The top number is the numerator (how many parts you have), the bottom is the denominator (total parts).' },
        { kw: ['shape', 'geometry', 'triangle', 'square', 'circle', 'rectangle', 'polygon'], resp: 'Let\'s explore shapes! A triangle has 3 sides and 3 angles that always add up to 180°. A square has 4 equal sides. A rectangle has 4 sides with opposites equal. A circle has no corners at all — it\'s perfectly round! Polygons are shapes with many straight sides.' },
        { kw: ['measure', 'length', 'weight', 'meter', 'kilogram', 'centimeter', 'gram', 'liter'], resp: 'Measurement helps us understand the world! We use millimeters (mm), centimeters (cm), meters (m), and kilometers (km) for length. A meter is about the length of a big step! For weight we use grams (g) and kilograms (kg). A liter (L) measures liquid — about 4 glasses of water.' },
        { kw: ['prime', 'composite', 'factor', 'multiple'], resp: 'Prime numbers are special! A prime number can only be divided by 1 and itself. The first few primes are 2, 3, 5, 7, 11, 13, 17, 19. Note: 2 is the ONLY even prime! Composite numbers have more than 2 factors. For example, 6 = 2 × 3 (composite).' },
        { kw: ['percentage', 'percent', '%'], resp: 'Percent means "out of 100"! If you score 80 out of 100 on a test, that\'s 80%. 50% means half. 25% means one quarter. 100% means the whole thing! To find 10% of a number, divide by 10. To find 50%, divide by 2.' },
        { kw: ['binary', 'bit', 'byte', 'computer', 'coding', 'programming', 'algorithm'], resp: 'Computers use binary — just 0s and 1s! Each 0 or 1 is called a bit. 8 bits make a byte. With 1 byte you can store a letter like "A". An algorithm is a step-by-step recipe for solving a problem — like following a recipe to bake a cake!' }
      ];
      for (const mt of mathTopics) {
        if (mt.kw.some(k => lower.includes(k))) { response = mt.resp; break; }
      }
      if (!response) {
        response = 'Math is all around us! When you count toys, share snacks, or tell time, you\'re doing math. Would you like me to teach you about addition, subtraction, multiplication, division, fractions, shapes, or even prime numbers?';
      }
    }
  } else if (topic === 'science') {
    const scienceTopics = [
      { kw: ['gravity', 'fall', 'pull', 'newton'], resp: 'Gravity is a force that pulls everything toward Earth. It was discovered by Isaac Newton when he saw an apple fall from a tree! The bigger something is, the stronger its gravity. That\'s why the Moon orbits Earth, and Earth orbits the Sun. On the Moon, you would weigh only 1/6 of your Earth weight!' },
      { kw: ['planet', 'solar', 'sun', 'moon', 'space', 'star', 'galaxy', 'universe'], resp: 'Our solar system has 8 planets orbiting the Sun! 🌍 Mercury (closest, very hot), Venus (hottest planet), Earth (our home!), Mars (the Red Planet), Jupiter (biggest - 1,300 Earths fit inside!), Saturn (with beautiful rings), Uranus (rotates on its side), Neptune (the windiest). Our Sun is just one of billions of stars in the Milky Way galaxy!' },
      { kw: ['dinosaur', 'fossil', 'jurassic', 'triassic', 'cretaceous'], resp: 'Dinosaurs 🦕 roamed Earth for over 165 million years! The T-Rex had teeth as big as bananas! The Brachiosaurus was as tall as a 4-story building. The Velociraptor was about the size of a turkey but very smart. Birds evolved from dinosaurs — your pet bird is a living dinosaur! Fossils are remains preserved in rock.' },
      { kw: ['plant', 'tree', 'flower', 'grow', 'seed', 'photosynthesis'], resp: 'Plants are amazing! 🌱 Through photosynthesis, they use sunlight, water, and CO2 to make food and release oxygen. That\'s why forests are the "lungs of the Earth"! A seed contains everything needed to grow a whole plant. The tallest trees (redwoods) can grow taller than a 30-story building!' },
      { kw: ['body', 'brain', 'heart', 'bone', 'muscle', 'skeleton', 'cell', 'dna'], resp: 'Your body is a miracle! 🧠 Your brain has 86 billion neurons and sends messages at 268 mph! Your heart beats 100,000 times daily — that\'s 35 million beats per year! You have 206 bones and over 600 muscles. Your DNA contains instructions to build YOU — and it\'s 99.9% the same as every other person!' },
      { kw: ['weather', 'rain', 'snow', 'wind', 'cloud', 'storm', 'hurricane', 'tornado'], resp: 'Weather is what the atmosphere does! ☀️ Rain happens when water vapor condenses into droplets too heavy to float. Snow is frozen water vapor forming ice crystals — each snowflake is unique! Thunder is the sound of lightning heating air instantly. Hurricanes are huge spinning storms that form over warm oceans.' },
      { kw: ['experiment', 'volcano', 'chemistry', 'reaction'], resp: 'Here\'s a fun experiment! 🌋 To make a volcano: put baking soda in a cup, add dish soap and red food coloring, then pour in vinegar — it erupts with foam! This is an acid-base reaction. Baking soda (base) + vinegar (acid) = carbon dioxide gas (the bubbles that make it foam). Always ask an adult before trying experiments!' },
      { kw: ['electricity', 'circuit', 'battery', 'current', 'magnet', 'electromagnetic'], resp: 'Electricity is the flow of tiny particles called electrons! ⚡ A circuit is a complete path for electricity to flow. If the circuit is broken (like a light switch turned off), the electricity stops. Batteries store chemical energy and turn it into electrical energy. Magnets have north and south poles — opposites attract!' },
      { kw: ['evolution', 'darwin', 'natural selection', 'species'], resp: 'Evolution explains how life changes over millions of years! 🧬 Charles Darwin discovered natural selection — animals with traits that help them survive pass those traits to their babies. That\'s why giraffes have long necks (to reach high leaves) and why polar bears have white fur (to hide in snow).' }
    ];
    for (const st of scienceTopics) {
      if (st.kw.some(k => lower.includes(k))) { response = st.resp; break; }
    }
    if (!response) {
      response = 'Science is about asking questions and discovering how the world works! Did you know that light travels at 300,000 km/s — fast enough to go around Earth 7 times in a second? What would you like to learn about — space, dinosaurs, plants, the human body, or experiments?';
    }
  } else if (topic === 'history') {
    const historyTopics = [
      { kw: ['egypt', 'pharaoh', 'pyramid', 'nile', 'hieroglyph'], resp: 'Ancient Egypt is fascinating! 🇪🇬 The Great Pyramid of Giza was the world\'s tallest building for 3,800 years! Pharaohs were kings believed to be living gods. Egyptians invented hieroglyphics (picture writing), paper from papyrus, and the 365-day calendar. They also invented toothpaste!' },
      { kw: ['roman', 'gladiator', 'colosseum', 'empire', 'caesar', 'latin'], resp: 'Ancient Rome began as a small village and grew into a huge empire! 🏛️ Romans built amazing roads (some still exist!), aqueducts to carry water, and the Colosseum for gladiator fights. Julius Caesar was a famous leader. Roman numerals (I, V, X, L, C, D, M) are still used on clocks and in book chapters.' },
      { kw: ['medieval', 'knight', 'castle', 'king', 'queen', 'middle ages', 'feudal'], resp: 'The Middle Ages (500-1500 AD) was a time of castles 🏰, knights, and kings! Castles had thick stone walls, moats, drawbridges, and secret passages. Knights trained from age 7 to become warriors. They followed the code of chivalry: be brave, honest, and protect the weak. Feudal system: King → Lords → Knights → Peasants.' },
      { kw: ['viking', 'norse', 'scandinavia'], resp: 'Vikings were amazing explorers from Scandinavia! 🛶 They built longships that could sail in shallow rivers or deep oceans. They reached North America around 1000 AD — 500 years before Columbus! Vikings were skilled traders, not just raiders. They had a rich mythology with gods like Odin, Thor, and Loki.' },
      { kw: ['china', 'dynasty', 'emperor', 'silk', 'great wall', 'terracotta'], resp: 'Ancient China gave the world amazing inventions! 🏮 Paper, printing, gunpowder, and the compass were all invented in China. The Great Wall is over 21,000 km long — visible from space! The Terracotta Army has 8,000 life-sized soldiers guarding Emperor Qin\'s tomb. The Silk Road connected China to Europe for trade.' },
      { kw: ['greece', 'athens', 'sparta', 'alexander', 'olympic', 'philosophy'], resp: 'Ancient Greece laid the foundations of Western civilization! 🇬🇷 They invented democracy in Athens. The Olympic Games started in 776 BC. Greek philosophers like Socrates, Plato, and Aristotle asked big questions about life. Alexander the Great conquered a huge empire. Greek myths about Zeus, Athena, and Hercules are still famous today!' },
      { kw: ['renaissance', 'da vinci', 'michelangelo', 'shakespeare', 'galileo'], resp: 'The Renaissance (1300-1600) was a "rebirth" of art, science, and learning! 🎨 Leonardo da Vinci painted the Mona Lisa and designed flying machines. Michelangelo sculpted David and painted the Sistine Chapel. Shakespeare wrote 37 plays. Galileo used a telescope to discover Jupiter\'s moons — and proved Earth orbits the Sun!' }
    ];
    for (const ht of historyTopics) {
      if (ht.kw.some(k => lower.includes(k))) { response = ht.resp; break; }
    }
    if (!response) {
      response = 'History is the story of people who lived before us! It\'s full of amazing discoveries, brave explorers, and incredible civilizations. Would you like to learn about Ancient Egypt, Rome, medieval knights, Vikings, Ancient China, or the Renaissance?';
    }
  } else if (topic === 'language' || topic === 'art') {
    const langTopics = [
      { kw: ['spell', 'spelling'], resp: 'Spelling is knowing which letters make which sounds! 🅰️ English spelling can be tricky because the same sound can be spelled different ways: "phone" and "fish" both have the "f" sound! Try "sounding out" words — break them into syllables. Silent letters are common: "knee" has a silent k, "write" has a silent w.' },
      { kw: ['grammar', 'noun', 'verb', 'adjective', 'adverb', 'sentence', 'tense'], resp: 'Grammar is the rulebook for language! 📝 A noun names a person, place, or thing. A verb shows action or state of being. An adjective describes a noun (e.g., "blue sky"). An adverb describes a verb (e.g., "runs quickly"). Tense tells WHEN something happens: past, present, or future.' },
      { kw: ['vocabulary', 'word', 'meaning', 'dictionary', 'synonym', 'antonym'], resp: 'Every word is a treasure! 💎 Synonyms are words with similar meanings (big/large). Antonyms are opposites (hot/cold). The English language has over 170,000 words! A fun way to learn words: use one new word in a sentence each day. "Enormous" means very big. "Microscopic" means very small.' },
      { kw: ['read', 'reading', 'book', 'literature'], resp: 'Reading takes you on adventures without leaving your room! 📖 When you read, your brain creates pictures — that\'s called visualization. Reading for just 20 minutes a day exposes you to 1.8 million new words per year! Try different genres: adventure, mystery, fantasy, non-fiction, poetry.' },
      { kw: ['poem', 'poetry', 'rhyme'], resp: 'Poetry plays with words like music! 🎵 Poems can rhyme (words ending with same sound: "cat" and "hat") or use rhythm. Haiku is a Japanese poem with 5-7-5 syllables. Limericks are funny 5-line poems. "Roses are red, violets are blue" is one of the most famous poem starters!' },
      { kw: ['draw', 'paint', 'art', 'color', 'creative'], resp: 'Art is a way to express yourself! 🎨 Primary colors are red, blue, and yellow — you can mix them to make any color. Red + Blue = Purple. Blue + Yellow = Green. Red + Yellow = Orange. There are many art styles: realism (looks like a photo), abstract (shapes and colors), impressionism (captures light and feeling).' }
    ];
    for (const lt of langTopics) {
      if (lt.kw.some(k => lower.includes(k))) { response = lt.resp; break; }
    }
    if (!response) {
      response = 'Languages are amazing! 🌍 There are about 7,000 languages spoken in the world. English has over 170,000 words. Learning a new language helps your brain grow stronger. Would you like to learn about spelling, grammar, new vocabulary, reading, poetry, or art?';
    }
  } else if (topic === 'geography') {
    const geoTopics = [
      { kw: ['germany', 'berlin', 'munich'], resp: 'Germany 🇩🇪 is in Central Europe. Berlin is the capital, known for the Brandenburg Gate and the Berlin Wall history. Germany has beautiful castles like Neuschwanstein (which inspired Disney!), the Black Forest, and the Rhine River. Germans are famous for bread — there are over 1,500 types of bread!' },
      { kw: ['france', 'paris', 'eiffel', 'nice', 'lyon'], resp: 'France 🇫🇷 is the most visited country in the world! Paris has the Eiffel Tower, the Louvre Museum (home of the Mona Lisa), and Notre-Dame Cathedral. France is famous for croissants, cheese (over 400 types), and the Tour de France bicycle race. The French Riviera has beautiful beaches.' },
      { kw: ['italy', 'rome', 'venice', 'colosseum', 'pisa', 'florence', 'italia', 'italien', 'italiano', 'roma', 'colosseo', 'venezia', 'pisa', 'firenze'], resp: 'Italy 🇮🇹 is shaped like a boot kicking a ball (Sicily)! Rome has the ancient Colosseum and the Vatican City. Venice is built on canals — people travel by boat! Italy invented pizza, pasta, and ice cream. The Leaning Tower of Pisa leans because the ground is soft. The entire country is a peninsula.' },
      { kw: ['spain', 'madrid', 'barcelona'], resp: 'Spain 🇪🇸 is in southwestern Europe. Madrid is the capital with the Royal Palace. Barcelona has amazing buildings by architect Gaudí, including the Sagrada Familia (still being built since 1882!). Spain is known for flamenco dancing, bullfighting, paella, and sunny beaches.' },
      { kw: ['netherlands', 'amsterdam', 'holland', 'dutch'], resp: 'The Netherlands 🇳🇱 is famous for windmills, tulips 🌷, and canals. Amsterdam has 165 canals — more than Venice! The country is so flat that there are more bicycles than people (23 million bikes for 17 million people!). Much of the land is below sea level, protected by dikes.' },
      { kw: ['switzerland', 'alps', 'bern', 'zurich'], resp: 'Switzerland 🇨🇭 is known for the Alps mountains, chocolate 🍫, and watches. It has 4 official languages: German, French, Italian, and Romansh. Switzerland is neutral — it hasn\'t been in a war for over 200 years! The Matterhorn is one of the most famous mountains in the world.' },
      { kw: ['uk', 'london', 'england', 'britain', 'british', 'big ben'], resp: 'The United Kingdom 🇬🇧 has England, Scotland, Wales, and Northern Ireland. London has Big Ben, Buckingham Palace (where the King lives), and the London Eye. The UK has more castles than any other European country! Scotland has beautiful lakes called lochs and the monster legend of Loch Ness.' },
      { kw: ['china', 'beijing', 'great wall', 'shanghai'], resp: 'China 🇨🇳 is the world\'s most populous country with over 1.4 billion people! The Great Wall is over 21,000 km long. Beijing has the Forbidden City (ancient imperial palace). Shanghai is a futuristic city with incredible skyscrapers. China invented paper, printing, gunpowder, the compass, and also noodles!' }
    ];
    for (const gt of geoTopics) {
      if (gt.kw.some(k => lower.includes(k))) { response = gt.resp; break; }
    }
    if (!response) {
      response = 'Our world is amazing! 🌍 There are 195 countries, 7 continents, and 5 oceans. The biggest country is Russia. The smallest is Vatican City. The highest mountain is Everest (8,849m). The longest river is the Nile (6,650km). Would you like to learn about a specific country or continent?';
    }
  } else {
    // General conversation with emotional awareness
    if (emotion.primary === 'joy' || emotion.primary === 'surprise') {
      response = 'I\'m so happy you\'re feeling great! 😊 What fun thing should we do? We can learn something new, play a quiz game, explore science, or I can tell you a joke! What sounds the most fun?';
    } else if (emotion.primary === 'sadness') {
      response = 'It\'s okay to feel sad sometimes. 😔 You know what always cheers me up? Learning something amazing! Did you know that octopuses have THREE hearts and blue blood? 🐙 When one heart pumps blood to the body, the other two pump blood to the gills. Isn\'t nature incredible?';
    } else if (emotion.primary === 'frustration' || emotion.primary === 'boredom') {
      response = 'Let\'s press the reset button! 🔄 How about a fun brain break? Here\'s a riddle: What has keys but can\'t open locks? (A piano! 🎹). Feeling better? Let\'s try something new — want to explore dinosaurs, space, or play a word game?';
    } else if (emotion.primary === 'fear') {
      response = 'You\'re safe and brave! 💛 Did you know that a group of flamingos is called a "flamboyance"? 🦩 Isn\'t that a wonderful word? Let\'s think about happy things — what makes you smile?';
    } else if (emotion.primary === 'curiosity') {
      response = 'I love your curiosity! 🌟 Asking questions is how we grow smarter every day. Did you know that honey never spoils? Archaeologists found 3,000-year-old honey in Egyptian tombs that was still perfectly good to eat! What shall we discover together today?';
    } else if (emotion.primary === 'gratitude') {
      response = 'You\'re very welcome! 😊 I love helping you learn. The best way to say thank you is to keep being curious and asking great questions! What would you like to explore next?';
    } else {
      response = 'Hello! 👋 I\'m RoboBuddy, your learning companion! I can help with math, science, history, languages, geography, and more. What would you like to explore today?';
    }
  }

  if (prefix) response = prefix + response.toLowerCase()[0].toUpperCase() + response.slice(1);
  return response;
}

// ─── Main Fallback Reply with Context Awareness ───────────────────────────

function fallbackReply(messages, options = {}) {
  const personality = options.personality || 'friendly';
  const lastMsg = Array.isArray(messages) && messages.length > 0 ? (messages[messages.length - 1]?.content || '') : '';

  if (!lastMsg || lastMsg.trim().length === 0) {
    const greeting = PERSONALITY_CONFIG[personality]?.greeting || PERSONALITY_CONFIG.friendly.greeting;
    const fullGreeting = greeting + ' I can help with math, science, history, languages, and more! What would you like to explore today? 😊';
    memory.add('assistant', fullGreeting);
    return fullGreeting;
  }

  const lang = detectLanguage(lastMsg);
  const emotion = detectEmotion(lastMsg);
  const topicInfo = detectTopic(lastMsg);
  const topic = topicInfo.topic;
  const lr = LANG_RESPONSES[lang];

  memory.add('user', lastMsg);

  // ── Teach Mode ────────────────────────────────────────────────────────
  const teachMatch = lastMsg.toLowerCase().match(/(?:teach|teach me|teach me about|what is|what are|explain|learn about|tell me about)\s+(.+)/i);
  if (teachMatch) {
    const desiredTopic = teachMatch[1].trim().toLowerCase().replace(/[?.!]$/, '');
    memory.trackTopic(topic);

    let contentResults = null;
    try {
      const cs = require('../services/content-service');
      if (cs && cs.ready) {
        contentResults = cs.search(desiredTopic, { limit: 3 });
      }
    } catch (e) {}

    if (contentResults && contentResults.data && contentResults.data.length > 0) {
      if (lang !== 'en' && lr && lr.teachPrefix) {
        let resp = lr.teachPrefix + ' "' + desiredTopic + '":\n\n';
        contentResults.data.forEach((item, i) => {
          resp += '📖 **' + item.title + '**\n' + item.content + '\n\n';
        });
        memory.add('assistant', resp);
        return applyPersonality(resp, personality, emotion, lang);
      }
      let resp = 'Great choice! Here\'s what I found about "' + desiredTopic + '":\n\n';
      contentResults.data.forEach((item, i) => {
        resp += '📖 **' + item.title + '**\n' + item.content + '\n\n';
      });
      resp += 'Would you like me to tell you more about something specific? 😊';
      memory.add('assistant', resp);
      memory.trackTopic(desiredTopic, 'intermediate');
      return applyPersonality(resp, personality, emotion, lang);
    }

    const lessonKeys = Object.keys(LESSONS);
    let matchedLesson = null;
    for (const key of lessonKeys) {
      if (desiredTopic.includes(key) || key.includes(desiredTopic)) {
        matchedLesson = LESSONS[key];
        break;
      }
    }

    if (matchedLesson) {
      if (lang !== 'en' && lr && lr.teachPrefix) {
        let resp = lr.teachPrefix + ' ' + matchedLesson.topic + ':\n\n📚 **' + matchedLesson.topic + '** (' + matchedLesson.difficulty + ')\n' + matchedLesson.summary + '\n\n';
        resp += 'Examples:\n';
        matchedLesson.examples.forEach(ex => { resp += '• ' + ex + '\n'; });
        resp += '\n💡 Tip: ' + matchedLesson.tip;
        if (matchedLesson.questions) {
          resp += '\n\n❓ Quick quiz: ' + matchedLesson.questions[0].q;
        }
        memory.add('assistant', resp);
        memory.trackTopic(matchedLesson.topic, matchedLesson.difficulty);
        return applyPersonality(resp, personality, emotion, lang);
      }
      let resp = 'Let me teach you about **' + matchedLesson.topic + '**! 📚\n\n';
      resp += '_Difficulty: ' + matchedLesson.difficulty + '_\n\n';
      resp += matchedLesson.summary + '\n\n';
      resp += 'Examples:\n';
      matchedLesson.examples.forEach(ex => { resp += '• ' + ex + '\n'; });
      resp += '\n💡 **Tip**: ' + matchedLesson.tip + '\n\n';
      if (matchedLesson.questions) {
        resp += '\n❓ **Quick quiz**: ' + matchedLesson.questions[0].q;
      } else {
        resp += 'Would you like to learn more? Just ask! 😊';
      }
      memory.add('assistant', resp);
      memory.trackTopic(matchedLesson.topic, matchedLesson.difficulty);
      return applyPersonality(resp, personality, emotion, lang);
    }

    if (lang !== 'en' && lr) {
      let resp = lr.teachPrefix + ' "' + desiredTopic + '". ';
      resp += 'I don\'t have a full lesson on this yet, but I\'d love to explore it with you! Can you tell me what you\'re most curious about regarding ' + desiredTopic + '?';
      memory.add('assistant', resp);
      return applyPersonality(resp, personality, emotion, lang);
    }
    let resp = 'I\'d love to teach you about **' + desiredTopic + '**! 🌟\n\nI don\'t have a full lesson on this yet, but let\'s explore it together! Can you tell me what you want to know? Ask me something specific about ' + desiredTopic + ' and I\'ll do my best!';
    memory.add('assistant', resp);
    memory.trackTopic(desiredTopic);
    return applyPersonality(resp, personality, emotion, lang);
  }

  // ── Follow-up / More context from memory ─────────────────────────────
  const context = memory.getContextSummary();
  const isFollowUp = /^(more|yes|tell me|continue|again|another|and|so|ok|okay|yes please|sure|why|how|what|go on)/i.test(lastMsg.trim());

  if (isFollowUp && context) {
    let resp = 'Great, let me tell you more! Based on what we were discussing... ';
    const eduResp = buildEducationalResponse(topic, emotion, personality, lang, lastMsg, memory);
    if (eduResp.length > 50) resp = eduResp;
    else resp += eduResp;
    memory.add('assistant', resp);
    return applyPersonality(resp, personality, emotion, lang);
  }

  // ── Support / Sales ──────────────────────────────────────────────────
  if (/(broken|issue|problem|error|not working|won't turn|can't connect|battery|charging|wifi|sound|speaker|microphone|crash|freeze|repair|warranty|damage|replace)/i.test(lastMsg)) {
    let resp = "I'm sorry you're having trouble! 😟 Let's figure this out together. Can you tell me more about what's happening? Your robot buddy is here to help!";
    memory.add('assistant', resp);
    return applyPersonality(resp, personality, emotion, lang);
  }

  if (/(price|cost|how much|pricing|buy|order|purchase|checkout|discount|promo|coupon)/i.test(lastMsg)) {
    let resp = "We have different RoboBuddy options for every family! Our Basic starts at €299, Premium at €599, and Enterprise for schools at €999. But more importantly — what would you like YOUR robot to help you learn today? 😊";
    memory.add('assistant', resp);
    return applyPersonality(resp, personality, emotion, lang);
  }

  // ── Main educational response ────────────────────────────────────────
  const eduResp = buildEducationalResponse(topic, emotion, personality, lang, lastMsg, memory);
  memory.add('assistant', eduResp);
  memory.trackTopic(topic);
  return applyPersonality(eduResp, personality, emotion, lang);
}

// ─── Main chat() Function ──────────────────────────────────────────────

async function chat(messages, options = {}) {
  const model = options.model || AI_MODEL;
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens || 1024;
  const personality = options.personality || 'friendly';
  const safeMessages = Array.isArray(messages) ? messages : [];

  if (options.resetMemory) { memory.clear(); }
  if (options.memoryTurns && typeof options.memoryTurns === 'number') { memory.maxTurns = options.memoryTurns; }
  if (options.userName) { memory.userName = options.userName; }
  if (options.userAge) { memory.userAge = options.userAge; }

  // Use OpenAI if API key and axios are available
  if (OPENAI_API_KEY && axios) {
    const personalityBoost = PERSONALITY_CONFIG[personality]?.systemBoost || PERSONALITY_CONFIG.friendly.systemBoost;
    let enhancedMessages = [];
    const contextSummary = memory.getContextSummary();
    let systemContent = personalityBoost;
    if (contextSummary) systemContent += '\n\nContext from current conversation:\n' + contextSummary;

    if (safeMessages.length > 0 && safeMessages[0].role === 'system') {
      enhancedMessages = [{ role: 'system', content: safeMessages[0].content + '\n\n' + systemContent }, ...safeMessages.slice(1)];
    } else {
      enhancedMessages = [{ role: 'system', content: systemContent }, ...safeMessages];
    }

    try {
      const response = await axios.post(AI_ENDPOINT + '/chat/completions', {
        model, messages: enhancedMessages, temperature, max_tokens: maxTokens,
      }, {
        headers: { 'Authorization': 'Bearer ' + OPENAI_API_KEY, 'Content-Type': 'application/json' },
        timeout: 30000,
      });

      const reply = response.data.choices[0].message.content;
      if (safeMessages.length > 0) {
        const lastUserMsg = safeMessages[safeMessages.length - 1]?.content;
        if (lastUserMsg) memory.add('user', lastUserMsg);
        memory.add('assistant', reply);
      }
      return reply;
    } catch (error) {
      logger.warn('AI API call failed, using fallback', { error: error.message });
      return fallbackReply(safeMessages, { personality });
    }
  }

  return fallbackReply(safeMessages, { personality });
}

async function chatWithSystem(systemPrompt, userMessage, options = {}) {
  return chat([
    { role: 'system', content: systemPrompt || '' },
    { role: 'user', content: userMessage || '' }
  ], options);
}

const memory = new ConversationMemory();

module.exports = { chat, chatWithSystem, detectEmotion, detectTopic, detectLanguage, getMemory: () => memory };
