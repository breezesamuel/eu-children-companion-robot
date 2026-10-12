/**
 * European Standard Grade Level Classification System
 * Based on ISCED 2011 framework adapted for children's robot companion
 * Covers Nursery (ISCED 0), Primary (ISCED 1), Lower Secondary (ISCED 2), Upper Secondary (ISCED 3)
 */

const logger = require('../utils/logger');

// ── Grade Level Definitions (European Standard) ──
const GRADE_LEVELS = {
  // ── NURSERY / KINDERGARTEN (ISCED 0) ──
  nursery_early: {
    id: 'nursery_early',
    name: { en: 'Nursery Early', de: 'Kindergarten Frueh', fr: 'Maternelle Petite', zh: '幼儿园小班' },
    iscedLevel: 0,
    ageRange: [3, 4],
    grade: 'Nursery (Age 3-4)',
    section: 'nursery',
    description: { en: 'Early exploration through play and sensory activities' },
    subjects: {
      math: { topics: ['counting 1-10', 'basic shapes', 'colors', 'big vs small', 'simple patterns'],
        objectives: ['recognize numbers 1-10', 'identify basic shapes (circle, square, triangle)', 'name primary colors', 'compare sizes'] },
      language: { topics: ['greetings', 'family words', 'animal names', 'color words', 'simple songs'],
        objectives: ['say hello/goodbye', 'name family members', 'name 10+ animals', 'sing simple songs'] },
      science: { topics: ['body parts', 'weather', 'plants', 'animals', 'five senses'],
        objectives: ['name body parts', 'identify sunny/rainy', 'observe plants', 'recognize animals'] },
      art: { topics: ['scribbling', 'coloring', 'simple crafts', 'singing', 'movement'],
        objectives: ['express through drawing', 'use colors', 'follow simple craft steps'] },
      social: { topics: ['sharing', 'taking turns', 'being kind', 'cleaning up', 'greetings'],
        objectives: ['share toys', 'wait for turn', 'say please/thank you'] }
    },
    aiStyle: { vocabulary: 'very simple', sentenceLength: '3-5 words', tone: 'warm, playful', useEmojis: true, useExamples: 'concrete objects' },
    maxResponseWords: 50
  },
  nursery_middle: {
    id: 'nursery_middle',
    name: { en: 'Nursery Middle', de: 'Kindergarten Mittel', fr: 'Maternelle Moyenne', zh: '幼儿园中班' },
    iscedLevel: 0,
    ageRange: [4, 5],
    grade: 'Nursery (Age 4-5)',
    section: 'nursery',
    description: { en: 'Developing basic skills through guided play' },
    subjects: {
      math: { topics: ['counting 1-20', 'simple addition', 'shape sorting', 'time concepts', 'more/less'],
        objectives: ['count to 20', 'understand 1+1=2', 'sort by shape', 'understand morning/evening'] },
      language: { topics: ['number words', 'color words', 'food words', 'simple sentences', 'English songs'],
        objectives: ['count in English', 'name 10+ colors', 'name 15+ foods', 'speak simple sentences'] },
      science: { topics: ['seasons', 'animal groups', 'plant growth', 'water states', 'magnets'],
        objectives: ['name 4 seasons', 'group animals', 'observe seed growth', 'understand ice/water'] },
      art: { topics: ['drawing shapes', 'clay modeling', 'paper crafts', 'rhythm', 'dancing'],
        objectives: ['draw basic shapes', 'mold simple objects', 'cut and paste', 'keep rhythm'] }
    },
    aiStyle: { vocabulary: 'simple', sentenceLength: '5-8 words', tone: 'encouraging, curious', useEmojis: true, useExamples: 'everyday objects' },
    maxResponseWords: 80
  },
  nursery_late: {
    id: 'nursery_late',
    name: { en: 'Nursery Late', de: 'Kindergarten Gross', fr: 'Maternelle Grande', zh: '幼儿园大班' },
    iscedLevel: 0,
    ageRange: [5, 6],
    grade: 'Nursery (Age 5-6)',
    section: 'nursery',
    description: { en: 'Preparation for primary school with structured learning' },
    subjects: {
      math: { topics: ['counting 1-50', 'addition/subtraction to 10', 'patterns', 'money basics', 'measurement'],
        objectives: ['count to 50', 'add/subtract within 10', 'create patterns', 'recognize coins', 'measure with objects'] },
      language: { topics: ['alphabet', 'phonics', 'sight words', 'story retelling', 'name writing'],
        objectives: ['know ABC', 'phonics sounds', 'read 20 sight words', 'retell stories', 'write own name'] },
      science: { topics: ['plant life cycle', 'animal habitats', 'simple machines', 'weather tools', 'recycling'],
        objectives: ['explain plant growth', 'match animals to habitats', 'understand lever/pulley', 'use thermometer', 'sort recyclables'] },
      writing: { topics: ['letter formation', 'word writing', 'simple sentences', 'story creation'],
        objectives: ['write letters', 'spell simple words', 'write 3-word sentences', 'create simple stories'] }
    },
    aiStyle: { vocabulary: 'basic', sentenceLength: '8-12 words', tone: 'supportive, engaging', useEmojis: true, useExamples: 'stories and games' },
    maxResponseWords: 120
  },

  // ── PRIMARY SCHOOL (ISCED 1) ──
  primary_1: {
    id: 'primary_1',
    name: { en: 'Primary Grade 1', de: 'Grundschule Klasse 1', fr: 'CP', zh: '小学一年级' },
    iscedLevel: 1,
    ageRange: [6, 7],
    grade: 'Grade 1',
    section: 'primary',
    description: { en: 'Foundation literacy and numeracy' },
    subjects: {
      math: { topics: ['numbers 1-100', 'addition/subtraction to 20', 'telling time', 'money', 'basic geometry'],
        objectives: ['count to 100', 'add/subtract within 20', 'read clock to hour', 'recognize coins', 'identify 2D shapes'] },
      english: { topics: ['phonics', 'sight words', 'simple sentences', 'basic grammar', 'reading aloud'],
        objectives: ['decode CVC words', 'read 50 sight words', 'write simple sentences', 'use a/an/the', 'read aloud with fluency'] },
      science: { topics: ['living vs non-living', 'weather', 'simple circuits', 'materials', 'plant growth'],
        objectives: ['classify living things', 'measure temperature', 'build simple circuit', 'identify materials', 'grow a plant'] },
      social: { topics: ['family', 'school', 'community', 'country', 'rules'],
        objectives: ['describe family', 'understand school roles', 'identify community helpers', 'name country', 'follow rules'] },
      art: { topics: ['drawing', 'painting', 'music', 'crafts', 'movement'],
        objectives: ['draw from observation', 'mix colors', 'sing in tune', 'follow craft patterns', 'coordinate movements'] }
    },
    aiStyle: { vocabulary: 'basic', sentenceLength: '10-15 words', tone: 'patient, encouraging', useEmojis: true, useExamples: 'stories and real life' },
    maxResponseWords: 150
  },
  primary_2: {
    id: 'primary_2',
    name: { en: 'Primary Grade 2', de: 'Grundschule Klasse 2', fr: 'CE1', zh: '小学二年级' },
    iscedLevel: 1,
    ageRange: [7, 8],
    grade: 'Grade 2',
    section: 'primary',
    description: { en: 'Building reading fluency and math skills' },
    subjects: {
      math: { topics: ['addition/subtraction to 100', 'multiplication intro', 'measurement', 'shapes', 'word problems'],
        objectives: ['add/subtract within 100', 'understand 2x, 3x tables', 'measure in cm/m', 'identify 3D shapes', 'solve 1-step word problems'] },
      english: { topics: ['present continuous', 'plural nouns', 'prepositions', 'short reading', 'sentence writing'],
        objectives: ['use present continuous', 'form plurals', 'use in/on/under', 'read short passages', 'write 5-sentence paragraph'] },
      science: { topics: ['animal life cycles', 'weather changes', 'push and pull', 'material properties', 'environment'],
        objectives: ['describe butterfly life cycle', 'read weather chart', 'understand forces', 'test material properties', 'understand recycling'] }
    },
    aiStyle: { vocabulary: 'basic-intermediate', sentenceLength: '12-18 words', tone: 'encouraging, informative', useEmojis: true, useExamples: 'analogies and stories' },
    maxResponseWords: 180
  },
  primary_3: {
    id: 'primary_3',
    name: { en: 'Primary Grade 3', de: 'Grundschule Klasse 3', fr: 'CE2', zh: '小学三年级' },
    iscedLevel: 1,
    ageRange: [8, 9],
    grade: 'Grade 3',
    section: 'primary',
    description: { en: 'Transition from learning to read to reading to learn' },
    subjects: {
      math: { topics: ['multiplication tables', 'division', 'area/perimeter', 'fractions', 'time calculation'],
        objectives: ['know times tables to 10', 'divide within 100', 'calculate area/perimeter', 'understand 1/2, 1/3, 1/4', 'calculate elapsed time'] },
      english: { topics: ['past tense', 'comparatives', 'conjunctions', 'paragraph reading', 'short writing'],
        objectives: ['use past tense', 'form comparatives', 'use and/but/because', 'read comprehension', 'write 10-sentence story'] },
      science: { topics: ['plant structure', 'nutrition', 'rocks/soil', 'simple machines', 'environment'],
        objectives: ['identify plant parts', 'understand food pyramid', 'classify rocks', 'use simple machines', 'understand ecosystems'] }
    },
    aiStyle: { vocabulary: 'intermediate', sentenceLength: '15-20 words', tone: 'informative, engaging', useEmojis: false, useExamples: 'real-world applications' },
    maxResponseWords: 200
  },
  primary_4: {
    id: 'primary_4',
    name: { en: 'Primary Grade 4', de: 'Grundschule Klasse 4', fr: 'CM1', zh: '小学四年级' },
    iscedLevel: 1,
    ageRange: [9, 10],
    grade: 'Grade 4',
    section: 'primary',
    description: { en: 'Developing analytical thinking' },
    subjects: {
      math: { topics: ['multi-digit operations', 'decimals', 'angles', 'charts/graphs', 'word problems'],
        objectives: ['multiply/divide 3-digit numbers', 'add/subtract decimals', 'measure angles', 'read bar/line graphs', 'solve multi-step problems'] },
      english: { topics: ['future tense', 'adverbs', 'clauses', 'reading comprehension', 'creative writing'],
        objectives: ['use future tense', 'use adverbs', 'identify clauses', 'answer comprehension questions', 'write descriptive paragraph'] },
      science: { topics: ['ecosystems', 'basic chemistry', 'circuits', 'matter changes', 'force/motion'],
        objectives: ['understand food chains', 'identify elements', 'build circuit with switch', 'distinguish physical/chemical change', 'understand Newton laws'] }
    },
    aiStyle: { vocabulary: 'intermediate', sentenceLength: '15-25 words', tone: 'informative, analytical', useEmojis: false, useExamples: 'step-by-step reasoning' },
    maxResponseWords: 250
  },
  primary_5: {
    id: 'primary_5',
    name: { en: 'Primary Grade 5', de: 'Grundschule Klasse 5', fr: 'CM2', zh: '小学五年级' },
    iscedLevel: 1,
    ageRange: [10, 11],
    grade: 'Grade 5',
    section: 'primary',
    description: { en: 'Preparing for secondary education' },
    subjects: {
      math: { topics: ['fraction operations', 'decimal operations', 'ratios', 'volume', 'percentages'],
        objectives: ['add/subtract fractions', 'multiply/divide decimals', 'understand ratios', 'calculate volume', 'convert percentages'] },
      english: { topics: ['present perfect', 'passive voice', 'prepositional phrases', 'complex reading', 'narrative writing'],
        objectives: ['use present perfect', 'understand passive voice', 'use prepositional phrases', 'analyze texts', 'write structured essay'] },
      science: { topics: ['cells', 'human body systems', 'basic chemistry', 'motion/force', 'solar system'],
        objectives: ['describe cell structure', 'understand body systems', 'understand elements/compounds', 'calculate speed', 'describe planets'] }
    },
    aiStyle: { vocabulary: 'intermediate-advanced', sentenceLength: '20-30 words', tone: 'informative, analytical', useEmojis: false, useExamples: 'detailed explanations' },
    maxResponseWords: 300
  },
  primary_6: {
    id: 'primary_6',
    name: { en: 'Primary Grade 6', de: 'Grundschule Klasse 6', fr: '6eme', zh: '小学六年级' },
    iscedLevel: 1,
    ageRange: [11, 12],
    grade: 'Grade 6',
    section: 'primary',
    description: { en: 'Bridge to secondary education' },
    subjects: {
      math: { topics: ['percentages', 'ratio applications', 'circle area/circumference', 'algebra intro', 'probability'],
        objectives: ['calculate percentages', 'solve ratio problems', 'calculate circle area', 'solve x+5=10', 'understand probability'] },
      english: { topics: ['conditionals', 'non-finite verbs', 'relative clauses', 'argumentative writing', 'speeches'],
        objectives: ['use if-clauses', 'identify non-finite verbs', 'use relative clauses', 'write argumentative essay', 'give a speech'] },
      science: { topics: ['atomic structure', 'ecosystems', 'basic physics', 'human body', 'earth science'],
        objectives: ['understand atoms/molecules', 'understand ecological balance', 'understand forces', 'understand organ systems', 'understand plate tectonics'] }
    },
    aiStyle: { vocabulary: 'advanced', sentenceLength: '25-35 words', tone: 'analytical, structured', useEmojis: false, useExamples: 'formulas and reasoning' },
    maxResponseWords: 350
  },

  // ── LOWER SECONDARY (ISCED 2) ──
  secondary_lower_1: {
    id: 'secondary_lower_1',
    name: { en: 'Lower Secondary Year 1', de: 'Sekundarstufe 7', fr: '5eme', zh: '初一' },
    iscedLevel: 2,
    ageRange: [12, 13],
    grade: 'Grade 7',
    section: 'secondary',
    description: { en: 'Subject specialization begins' },
    subjects: {
      math: { topics: ['rational numbers', 'linear equations', 'geometry proofs', 'statistics/probability', 'functions intro'],
        objectives: ['understand positive/negative numbers', 'solve 2x+3=7', 'prove parallel line properties', 'calculate mean/median/mode', 'understand y=kx+b'] },
      english: { topics: ['tense review', 'clause types', 'reading analysis', 'argumentative writing', 'vocabulary expansion'],
        objectives: ['master all tenses', 'identify clause types', 'analyze text structure', 'write argumentative essay', 'expand vocabulary to 2000+ words'] },
      physics: { topics: ['kinematics', 'mechanics', 'sound/light', 'energy'],
        objectives: ['calculate v=s/t', 'understand Newton laws', 'understand wave properties', 'understand energy conservation'] },
      chemistry: { topics: ['matter properties', 'chemical changes', 'elements', 'solutions'],
        objectives: ['describe physical/chemical properties', 'identify chemical changes', 'understand periodic table', 'understand concentration'] },
      biology: { topics: ['cells', 'classification', 'ecology', 'genetics'],
        objectives: ['describe cell organelles', 'understand taxonomy', 'understand ecosystems', 'understand basic genetics'] },
      history: { topics: ['ancient civilizations', 'medieval period', 'early modern', 'world history'],
        objectives: ['understand ancient Egypt/Greece/Rome', 'understand medieval society', 'understand Renaissance', 'understand global connections'] },
      geography: { topics: ['earth structure', 'maps', 'climate', 'resources'],
        objectives: ['understand earth layers', 'read topographic maps', 'understand climate zones', 'understand resource distribution'] }
    },
    aiStyle: { vocabulary: 'advanced', sentenceLength: '30-40 words', tone: 'analytical, structured', useEmojis: false, useExamples: 'formulas, diagrams, reasoning' },
    maxResponseWords: 400
  },
  secondary_lower_2: {
    id: 'secondary_lower_2',
    name: { en: 'Lower Secondary Year 2', de: 'Sekundarstufe 8', fr: '4eme', zh: '初二' },
    iscedLevel: 2,
    ageRange: [13, 14],
    grade: 'Grade 8',
    section: 'secondary',
    description: { en: 'Deepening subject knowledge' },
    subjects: {
      math: { topics: ['systems of equations', 'inequalities', 'function graphs', 'congruence', 'statistics'],
        objectives: ['solve x+y=5 systems', 'solve inequalities', 'graph linear functions', 'prove triangle congruence (SAS,SSS)', 'understand distributions'] },
      physics: { topics: ['mechanics advanced', 'energy conservation', 'thermodynamics', 'electromagnetism'],
        objectives: ['apply F=ma', 'understand energy transformation', 'understand heat transfer', 'understand basic electromagnetism'] },
      chemistry: { topics: ['atomic structure', 'periodic table', 'chemical bonding', 'chemical reactions'],
        objectives: ['understand electron shells', 'understand periodic trends', 'understand ionic/covalent bonds', 'balance chemical equations'] },
      biology: { topics: ['botany', 'zoology', 'human physiology', 'ecology'],
        objectives: ['understand photosynthesis', 'understand animal systems', 'understand human body systems', 'understand ecological cycles'] },
      history: { topics: ['Renaissance', 'Industrial Revolution', 'World Wars', 'modern history'],
        objectives: ['understand Renaissance impact', 'understand Industrial Revolution', 'understand WWI/WWII', 'understand modern developments'] }
    },
    aiStyle: { vocabulary: 'advanced', sentenceLength: '30-45 words', tone: 'analytical, precise', useEmojis: false, useExamples: 'formulas, experiments, critical thinking' },
    maxResponseWords: 450
  },
  secondary_lower_3: {
    id: 'secondary_lower_3',
    name: { en: 'Lower Secondary Year 3', de: 'Sekundarstufe 9', fr: '3eme', zh: '初三' },
    iscedLevel: 2,
    ageRange: [14, 15],
    grade: 'Grade 9',
    section: 'secondary',
    description: { en: 'Preparation for upper secondary' },
    subjects: {
      math: { topics: ['quadratic functions', 'circles', 'similar triangles', 'probability/statistics', 'trigonometry intro'],
        objectives: ['solve quadratic equations', 'understand circle properties', 'prove similarity', 'calculate probabilities', 'understand sin/cos/tan'] },
      physics: { topics: ['electricity', 'magnetism', 'optics', 'modern physics'],
        objectives: ['calculate circuits (Ohm law)', 'understand electromagnetic waves', 'understand light behavior', 'understand basic quantum concepts'] },
      chemistry: { topics: ['organic chemistry', 'reaction rates', 'chemical equilibrium', 'acids/bases/salts'],
        objectives: ['understand carbon compounds', 'understand reaction rate factors', 'understand equilibrium', 'understand pH'] },
      biology: { topics: ['genetics', 'evolution', 'ecosystems', 'biotechnology'],
        objectives: ['understand DNA structure', 'understand natural selection', 'understand energy flow', 'understand genetic engineering'] },
      history: { topics: ['modern history', 'contemporary history', 'global格局'],
        objectives: ['understand Cold War', 'understand globalization', 'understand current events'] }
    },
    aiStyle: { vocabulary: 'advanced', sentenceLength: '35-50 words', tone: 'analytical, comprehensive', useEmojis: false, useExamples: 'formulas, analysis, synthesis' },
    maxResponseWords: 500
  },

  // ── UPPER SECONDARY (ISCED 3) ──
  secondary_upper_1: {
    id: 'secondary_upper_1',
    name: { en: 'Upper Secondary Year 1', de: 'Gymnasium 10', fr: 'Seconde', zh: '高一' },
    iscedLevel: 3,
    ageRange: [15, 16],
    grade: 'Grade 10',
    section: 'secondary',
    description: { en: 'Advanced subject specialization' },
    subjects: {
      math: { topics: ['sets', 'functions', 'trigonometry', 'sequences', 'inequalities', 'solid geometry'],
        objectives: ['understand set operations', 'analyze function properties', 'use trig identities', 'understand arithmetic/geometric sequences', 'prove inequalities', 'understand 3D geometry'] },
      physics: { topics: ['mechanics', 'thermodynamics', 'electromagnetism', 'optics', 'atomic physics'],
        objectives: ['solve complex motion problems', 'understand thermodynamic laws', 'understand electromagnetic fields', 'understand light waves', 'understand atomic models'] },
      chemistry: { topics: ['matter structure', 'reaction principles', 'organic chemistry', 'experimental chemistry'],
        objectives: ['understand chemical bonding', 'understand reaction equilibrium', 'understand organic reactions', 'design experiments'] },
      biology: { topics: ['molecular biology', 'cell biology', 'genetics/evolution', 'ecology'],
        objectives: ['understand gene expression', 'understand cell division', 'understand population genetics', 'understand ecosystem dynamics'] }
    },
    aiStyle: { vocabulary: 'expert', sentenceLength: '40-60 words', tone: 'academic, analytical', useEmojis: false, useExamples: 'theoretical frameworks, mathematical proofs' },
    maxResponseWords: 600
  },
  secondary_upper_2: {
    id: 'secondary_upper_2',
    name: { en: 'Upper Secondary Year 2', de: 'Gymnasium 11', fr: 'Premiere', zh: '高二' },
    iscedLevel: 3,
    ageRange: [16, 17],
    grade: 'Grade 11',
    section: 'secondary',
    description: { en: 'University preparation level' },
    subjects: {
      math: { topics: ['derivatives', 'integrals', 'conic sections', 'statistics/probability', 'complex numbers'],
        objectives: ['calculate derivatives', 'calculate integrals', 'understand ellipse/hyperbola/parabola', 'understand distributions', 'understand complex numbers'] },
      physics: { topics: ['mechanics', 'electromagnetism', 'thermodynamics', 'optics', 'modern physics'],
        objectives: ['understand momentum conservation', 'understand electromagnetic induction', 'understand thermodynamic cycles', 'understand wave optics', 'understand relativity basics'] },
      chemistry: { topics: ['reaction principles', 'matter structure', 'organic chemistry', 'experiments'],
        objectives: ['understand electrochemistry', 'understand organic synthesis', 'understand molecular geometry', 'design complex experiments'] },
      biology: { topics: ['homeostasis', 'genetics/evolution', 'modern biotechnology'],
        objectives: ['understand internal regulation', 'understand evolution mechanisms', 'understand genetic engineering', 'understand ethical implications'] }
    },
    aiStyle: { vocabulary: 'expert', sentenceLength: '45-70 words', tone: 'academic, rigorous', useEmojis: false, useExamples: 'derivations, proofs, critical analysis' },
    maxResponseWords: 700
  },
  secondary_upper_3: {
    id: 'secondary_upper_3',
    name: { en: 'Upper Secondary Year 3', de: 'Gymnasium 12', fr: 'Terminale', zh: '高三' },
    iscedLevel: 3,
    ageRange: [17, 18],
    grade: 'Grade 12',
    section: 'secondary',
    description: { en: 'Final year, university preparation' },
    subjects: {
      math: { topics: ['calculus', 'linear algebra', 'probability/statistics', 'geometry proofs', 'applied mathematics'],
        objectives: ['apply calculus to problems', 'understand matrices', 'perform statistical inference', 'prove geometric theorems', 'model real-world problems'] },
      physics: { topics: ['mechanics comprehensive', 'electromagnetism comprehensive', 'modern physics', 'physics applications'],
        objectives: ['solve complex mechanics', 'understand Maxwell equations', 'understand quantum mechanics', 'build physics models'] },
      chemistry: { topics: ['structure and properties', 'reaction principles', 'organic chemistry', 'experimental chemistry'],
        objectives: ['understand structure-property relationships', 'understand reaction mechanisms', 'understand organic synthesis', 'design research experiments'] },
      biology: { topics: ['modern biotechnology', 'ecology', 'biology and society'],
        objectives: ['understand gene editing', 'understand ecological engineering', 'understand bioethics', 'understand biology career paths'] }
    },
    aiStyle: { vocabulary: 'expert', sentenceLength: '50-80 words', tone: 'academic, professional', useEmojis: false, useExamples: 'research-level analysis, university preparation' },
    maxResponseWords: 800
  }
};

// ── Helper Functions ──
class EuropeanCurriculum {
  constructor() {
    this.levels = GRADE_LEVELS;
    this.sections = {
      nursery: { name: { en: 'Nursery / Kindergarten', de: 'Kindergarten', fr: 'Maternelle', zh: '幼儿园' }, iscedLevel: 0, ageRange: [3, 6] },
      primary: { name: { en: 'Primary School', de: 'Grundschule', fr: 'Ecole Primaire', zh: '小学' }, iscedLevel: 1, ageRange: [6, 12] },
      secondary: { name: { en: 'Secondary School', de: 'Sekundarschule', fr: 'College/Lycee', zh: '中学' }, iscedLevel: '2-3', ageRange: [12, 18] }
    };
  }

  // Get grade level by age
  getLevelByAge(age) {
    if (!age || age < 3) return null;
    if (age <= 4) return this.levels.nursery_early;
    if (age === 5) return this.levels.nursery_middle;
    if (age === 6) return this.levels.nursery_late;
    if (age === 7) return this.levels.primary_1;
    if (age === 8) return this.levels.primary_2;
    if (age === 9) return this.levels.primary_3;
    if (age === 10) return this.levels.primary_4;
    if (age === 11) return this.levels.primary_5;
    if (age === 12) return this.levels.primary_6;
    if (age === 13) return this.levels.secondary_lower_1;
    if (age === 14) return this.levels.secondary_lower_2;
    if (age === 15) return this.levels.secondary_lower_3;
    if (age === 16) return this.levels.secondary_upper_1;
    if (age === 17) return this.levels.secondary_upper_2;
    if (age >= 18) return this.levels.secondary_upper_3;
    return null;
  }

  // Get grade level by ID
  getLevelById(id) {
    return this.levels[id] || null;
  }

  // Get all levels
  getAllLevels() {
    return Object.values(this.levels);
  }

  // Get levels by section
  getLevelsBySection(section) {
    return Object.values(this.levels).filter(l => l.section === section);
  }

  // Get levels by ISCED level
  getLevelsByISCED(iscedLevel) {
    return Object.values(this.levels).filter(l => l.iscedLevel === iscedLevel);
  }

  // Get section info
  getSection(section) {
    return this.sections[section] || null;
  }

  // Get all sections
  getAllSections() {
    return this.sections;
  }

  // Build system prompt for a given grade level
  buildSystemPrompt(levelId, language = 'en') {
    const level = this.getLevelById(levelId);
    if (!level) return this._defaultPrompt(language);

    const style = level.aiStyle;
    const subjects = Object.keys(level.subjects).join(', ');

    const prompts = {
      en: `You are RoboBuddy, an AI learning companion for children at the ${level.grade} level (age ${level.ageRange.join('-')}). 
Adapt your responses to this level:
- Use ${style.vocabulary} vocabulary
- Keep sentences ${style.sentenceLength} long
- Be ${style.tone}
${style.useEmojis ? '- Use emojis to engage' : '- Do NOT use emojis'}
- Use ${style.useExamples} as examples
- Maximum response length: ${level.maxResponseWords} words

Subjects at this level: ${subjects}.
Explain concepts at an appropriate level for this age group. If a topic is too advanced, simplify it or explain that they will learn it later.`,
      de: `Du bist RoboBuddy, ein KI-Lernbegleiter fur Kinder der Stufe ${level.grade} (Alter ${level.ageRange.join('-')}).
Passe deine Antworten an dieses Niveau an:
- Verwende ${style.vocabulary} Wortschatz
- Halte Satze ${style.sentenceLength} lang
- Sei ${style.tone}
- Themen: ${subjects}`,
      fr: `Tu es RoboBuddy, un compagnon d'apprentissage IA pour les enfants du niveau ${level.grade} (age ${level.ageRange.join('-')}).
Adapte tes reponses a ce niveau:
- Utilise un vocabulaire ${style.vocabulary}
- Phrases de ${style.sentenceLength}
- Sujets: ${subjects}`,
      zh: `你是RoboBuddy，一个面向${level.grade}水平（年龄${level.ageRange.join('-')}岁）儿童的AI学习伙伴。
请根据这个水平调整你的回答：
- 使用${style.vocabulary}的词汇
- 句子长度：${style.sentenceLength}
- 语气：${style.tone}
${style.useEmojis ? '- 使用表情符号' : '- 不要使用表情符号'}
- 最大回复长度：${level.maxResponseWords}字

本阶段科目：${subjects}。
用适合这个年龄段的方式解释概念。`
    };

    return prompts[language] || prompts.en;
  }

  // Default prompt when no level specified
  _defaultPrompt(language) {
    const defaults = {
      en: 'You are RoboBuddy, an AI learning companion. Adapt your responses to the user\'s level.',
      de: 'Du bist RoboBuddy, ein KI-Lernbegleiter.',
      fr: 'Tu es RoboBuddy, un compagnon d\'apprentissage IA.',
      zh: '你是RoboBuddy，一个AI学习伙伴。'
    };
    return defaults[language] || defaults.en;
  }

  // Get subjects for a level
  getSubjects(levelId) {
    const level = this.getLevelById(levelId);
    if (!level) return {};
    return level.subjects;
  }

  // Get topics for a subject at a level
  getTopics(levelId, subject) {
    const level = this.getLevelById(levelId);
    if (!level || !level.subjects[subject]) return [];
    return level.subjects[subject].topics;
  }

  // Get objectives for a subject at a level
  getObjectives(levelId, subject) {
    const level = this.getLevelById(levelId);
    if (!level || !level.subjects[subject]) return [];
    return level.subjects[subject].objectives;
  }

  // Validate if a topic is appropriate for a level
  isTopicAppropriate(levelId, subject, topic) {
    const topics = this.getTopics(levelId, subject);
    return topics.some(t => t.toLowerCase().includes(topic.toLowerCase()) || topic.toLowerCase().includes(t.toLowerCase()));
  }

  // Get next level progression
  getNextLevel(levelId) {
    const order = Object.keys(this.levels);
    const idx = order.indexOf(levelId);
    if (idx < 0 || idx >= order.length - 1) return null;
    return this.levels[order[idx + 1]];
  }

  // Get previous level
  getPreviousLevel(levelId) {
    const order = Object.keys(this.levels);
    const idx = order.indexOf(levelId);
    if (idx <= 0) return null;
    return this.levels[order[idx - 1]];
  }

  // Generate learning path from nursery to secondary
  getLearningPath() {
    return Object.values(this.levels).map(l => ({
      id: l.id,
      name: l.name,
      ageRange: l.ageRange,
      section: l.section,
      iscedLevel: l.iscedLevel,
      subjects: Object.keys(l.subjects)
    }));
  }
}

module.exports = new EuropeanCurriculum();
module.exports.EuropeanCurriculum = EuropeanCurriculum;
