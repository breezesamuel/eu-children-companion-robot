const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ROUTES_DIR = path.join(__dirname, '..', 'routes');

function w(p, d) { fs.writeFileSync(p, JSON.stringify(d, null, 2), 'utf8'); console.log('Wrote ' + d.length + ' items to ' + path.basename(p)); }

// ─── HIGH-SCHOOL GRAMMAR ──────────────────────────────────────────
function generateGrammar() {
  const rules = [];
  const topics = [
    { topic: 'Advanced Tenses', level: 'grade10', items: [
      { rule: 'Past Perfect Continuous', en: 'Had been + verb-ing for an action that continued before another past action', example: 'She had been studying for three hours before dinner.' },
      { rule: 'Future Perfect Continuous', en: 'Will have been + verb-ing for duration before a future point', example: 'By June, I will have been teaching for ten years.' },
      { rule: 'Present Perfect vs Past Simple Nuances', en: 'Present perfect for unfinished time periods vs past simple for completed', example: 'I have visited Paris (in my life) vs I visited Paris last year (specific finished time).' },
      { rule: 'Future in the Past', en: 'Was/were going to, would for past plans', example: 'I was going to call you, but I forgot.' }
    ]},
    { topic: 'Conditionals Advanced', level: 'grade10', items: [
      { rule: 'Mixed Conditional (Past→Present)', en: 'If + past perfect + would + base verb for past condition affecting present', example: 'If I had studied medicine, I would be a doctor now.' },
      { rule: 'Mixed Conditional (Present→Past)', en: 'If + past simple + would have + past participle for present condition affecting past', example: 'If I were more careful, I would not have made that mistake.' },
      { rule: 'Inverted Conditionals', en: 'Had I / Were I / Should I instead of if', example: 'Had I known earlier, I would have helped.' },
      { rule: 'Unless and Other Conditional Conjunctions', en: 'Unless, provided that, as long as, on condition that', example: 'You can borrow my car provided that you return it by 6 PM.' },
      { rule: 'Wish/If Only Regrets', en: 'Wish + past perfect for past regrets; wish + would for annoyance', example: 'I wish I had listened to your advice.' }
    ]},
    { topic: 'Passive Voice Advanced', level: 'grade10', items: [
      { rule: 'Passive with Modals', en: 'Modal + be + past participle or modal + have been + past participle', example: 'The project must be completed by Friday. / The letter should have been sent yesterday.' },
      { rule: 'Impersonal Passive', en: 'It + passive + that clause / subject + passive + to-infinitive', example: 'It is believed that the CEO will resign. / The CEO is believed to be resigning.' },
      { rule: 'Causative Have/Get', en: 'Have/get something done for arranging services', example: 'I had my hair cut. / I got the car repaired.' },
      { rule: 'Need + Gerund Passive', en: 'Need + verb-ing with passive meaning', example: 'The house needs cleaning. (= needs to be cleaned)' }
    ]},
    { topic: 'Reported Speech Advanced', level: 'grade10', items: [
      { rule: 'Reported Speech with Backshift', en: 'Tense backshift in reported statements; optional with universal truths', example: 'She said she was tired ("I am tired"). / He said the Earth revolves around the Sun (no backshift for facts).' },
      { rule: 'Reporting Verbs Patterns', en: 'Verb + that clause / verb + to-infinitive / verb + object + to-infinitive', example: 'He admitted stealing the money. / She advised me to see a doctor.' },
      { rule: 'Reported Questions', en: 'Wh-word or if/whether + statement word order, no question mark', example: 'She asked where I lived. / He asked if I had finished.' },
      { rule: 'Reported Commands and Requests', en: 'Tell/ask/order + object + to-infinitive', example: 'The teacher told us to be quiet. / She asked me to open the window.' }
    ]},
    { topic: 'Relative Clauses Advanced', level: 'grade10', items: [
      { rule: 'Defining vs Non-Defining Relative Clauses', en: 'Non-defining adds extra info with commas; defining is essential', example: 'My sister, who lives in London, is a doctor. (non-defining) vs The woman who lives next door is a doctor. (defining)' },
      { rule: 'Whose, Where, When, Why, Preposition + Which', en: 'Relative adverbs and prepositional relatives', example: 'The house where I grew up. / The reason why I left. / The person to whom I spoke.' },
      { rule: 'Quantifier + Of + Whom/Which', en: 'All/most/some/none + of + whom/which in formal English', example: 'The students, most of whom had passed, celebrated.' },
      { rule: 'Participle Clauses as Reduced Relatives', en: 'Replacing relative clause with -ing, -ed, or to-infinitive', example: 'The girl sitting there is my sister. (= who is sitting)' }
    ]},
    { topic: 'Modals Advanced', level: 'grade11', items: [
      { rule: 'Modal Perfect for Deduction', en: 'Must/might/may/could/can\'t + have + past participle', example: 'He must have left early. / She can\'t have seen us.' },
      { rule: 'Modals of Obligation and Prohibition', en: 'Must, have to, should, ought to, need to, needn\'t, don\'t have to, mustn\'t', example: 'You must wear a seatbelt. / You needn\'t have come early.' },
      { rule: 'Would Rather / Had Better', en: 'Would rather + base verb (preference); had better + base verb (strong advice)', example: 'I would rather stay home. / You had better see a doctor.' },
      { rule: 'Dare and Need as Modals', en: 'Dare/need + base verb (usually negative or interrogative)', example: 'I dare not tell him. / Need I say more?' }
    ]},
    { topic: 'Inversion', level: 'grade11', items: [
      { rule: 'Inversion after Negative Adverbials', en: 'Never, rarely, seldom, hardly, scarcely, no sooner, not only, not until, nowhere', example: 'Never have I seen such beauty. / Not only did he finish first, but he also broke the record.' },
      { rule: 'Inversion in Conditional Sentences', en: 'Should, were, had at start of conditional sentences', example: 'Were I you, I would apologize. / Should you need help, call me.' },
      { rule: 'Inversion after So/Such', en: 'So + adjective + auxiliary + subject; such + be + noun', example: 'So beautiful was the sunset that everyone stopped to watch.' }
    ]},
    { topic: 'Subjunctive & Unreal Past', level: 'grade11', items: [
      { rule: 'Subjunctive in That-Clauses', en: 'Suggest, recommend, insist, demand, propose + that + base verb', example: 'I suggest that he see a doctor. / They insisted that she be present.' },
      { rule: 'It\'s Time / Would Rather + Past Subjunctive', en: 'It\'s time + past subjunctive; would rather + past subjunctive', example: 'It\'s time we left. / I would rather you didn\'t smoke.' },
      { rule: 'As If/As Though + Past/ Past Perfect', en: 'Unreal comparison using past or past perfect', example: 'He acts as if he owned the place. / She looked as though she had seen a ghost.' }
    ]},
    { topic: 'Clauses & Sentence Structure', level: 'grade11', items: [
      { rule: 'Purpose Clauses', en: 'To, in order to, so as to, so that, in case, for + noun/gerund', example: 'I left early so that I wouldn\'t miss the train. / Take an umbrella in case it rains.' },
      { rule: 'Result Clauses', en: 'So + adjective + that; such + noun + that', example: 'The movie was so boring that I fell asleep. / It was such a hot day that we stayed inside.' },
      { rule: 'Concessive Clauses', en: 'Although, even though, despite, in spite of, while, whereas', example: 'Despite being tired, she continued working. / While I agree with you, I cannot support your plan.' },
      { rule: 'Participle Clauses', en: '-ing, -ed, and having + past participle clauses for adverbial meaning', example: 'Having finished his homework, he went out to play. / Exhausted by the journey, she went straight to bed.' }
    ]},
    { topic: 'Advanced Vocabulary & Usage', level: 'grade12', items: [
      { rule: 'Cleft Sentences for Emphasis', en: 'It + be + emphasized element + that/who; What-clause + be', example: 'It was John who broke the window. / What I need is a relaxing holiday.' },
      { rule: 'Fronting for Emphasis', en: 'Moving an element to the front of the sentence', example: 'A very strange experience it was. / Into the room walked the principal.' },
      { rule: 'Ellipsis and Substitution', en: 'Omitting repeated words; using do/so/not to replace', example: 'She can speak French, and he can too. / "Will it rain?" "I think so." / "Is she coming?" "I hope not."' },
      { rule: 'Hedging and Vague Language', en: 'Sort of, kind of, apparently, presumably, roughly, about, around', example: 'It is arguably the most important invention. / There were about fifty people.' }
    ]},
    { topic: 'Cohesion & Linking', level: 'grade12', items: [
      { rule: 'Discourse Markers for Formal Writing', en: 'Furthermore, moreover, nevertheless, consequently, accordingly, in contrast', example: 'The experiment failed. Consequently, we must revise our hypothesis.' },
      { rule: 'Reference and Substitution', en: 'This/that/these/those referring back; one/ones substitution', example: 'The new policy has flaws. This is why we oppose it. / I need a pen. I don\'t have one.' },
      { rule: 'Lexical Cohesion', en: 'Synonyms, antonyms, hyponyms, collocations for text cohesion', example: 'The car broke down. The vehicle was towed away. (lexical chain)' }
    ]},
    { topic: 'Literary & Rhetorical Devices', level: 'grade12', items: [
      { rule: 'Literary Present Tense', en: 'Present tense used when discussing literature, even for past events in a story', example: 'In the novel, Hamlet struggles with his conscience and ultimately decides to avenge his father.' },
      { rule: 'Rhetorical Questions', en: 'Questions asked for effect, not requiring an answer', example: 'Who can deny the importance of education? / Is that really the best you can do?' },
      { rule: 'Parallelism in Writing', en: 'Using the same grammatical structure for balance and rhythm', example: 'She came, she saw, she conquered. / It is better to be late than to be unprepared.' }
    ]}
  ];
  for (const t of topics) {
    for (const item of t.items) {
      rules.push({ id: 'grammar-hs-' + rules.length, topic: t.topic, level: t.level, rule: item.rule, explanation: item.en, example: item.example, type: 'grammar', source: 'high-school-english' });
    }
  }
  return rules;
}

// ─── HIGH-SCHOOL READING ──────────────────────────────────────────
function generateReading() {
  const readings = [];
  const R = [
    { title: 'The Future of Renewable Energy', level: 'grade10', difficulty: 'intermediate', wordCount: 320, questions: 5 },
    { title: 'How Social Media Affects Teenage Brains', level: 'grade10', difficulty: 'intermediate', wordCount: 350, questions: 5 },
    { title: 'Exploring the Deep Ocean', level: 'grade10', difficulty: 'intermediate', wordCount: 300, questions: 5 },
    { title: 'The History of Artificial Intelligence', level: 'grade10', difficulty: 'intermediate', wordCount: 340, questions: 5 },
    { title: 'Climate Change and Our Future', level: 'grade11', difficulty: 'intermediate', wordCount: 380, questions: 6 },
    { title: 'What Is the Internet of Things?', level: 'grade10', difficulty: 'intermediate', wordCount: 310, questions: 5 },
    { title: 'The Science Behind Vaccines', level: 'grade11', difficulty: 'intermediate', wordCount: 360, questions: 5 },
    { title: 'Why We Dream: The Neuroscience of Sleep', level: 'grade11', difficulty: 'advanced', wordCount: 400, questions: 6 },
    { title: 'Genetic Engineering: Promise and Peril', level: 'grade12', difficulty: 'advanced', wordCount: 420, questions: 6 },
    { title: 'The Economics of Globalization', level: 'grade12', difficulty: 'advanced', wordCount: 450, questions: 6 },
    { title: 'Shakespeare and the Elizabethan Era', level: 'grade11', difficulty: 'advanced', wordCount: 380, questions: 5 },
    { title: 'The Philosophy of Existentialism', level: 'grade12', difficulty: 'advanced', wordCount: 430, questions: 6 },
    { title: 'Space Exploration: The Next Frontier', level: 'grade10', difficulty: 'intermediate', wordCount: 330, questions: 5 },
    { title: 'Understanding Cryptocurrency and Blockchain', level: 'grade11', difficulty: 'advanced', wordCount: 390, questions: 6 },
    { title: 'Mental Health Awareness in Schools', level: 'grade10', difficulty: 'intermediate', wordCount: 340, questions: 5 },
    { title: 'The Rise of Renewable Cities', level: 'grade11', difficulty: 'intermediate', wordCount: 360, questions: 5 },
    { title: 'Evolution and Natural Selection', level: 'grade11', difficulty: 'advanced', wordCount: 400, questions: 6 },
    { title: 'The Psychology of Decision Making', level: 'grade12', difficulty: 'advanced', wordCount: 420, questions: 6 },
    { title: 'World War II: Causes and Consequences', level: 'grade10', difficulty: 'intermediate', wordCount: 350, questions: 5 },
    { title: 'The Power of Critical Thinking', level: 'grade11', difficulty: 'intermediate', wordCount: 340, questions: 5 },
    { title: 'Nanotechnology: The Small Science', level: 'grade12', difficulty: 'advanced', wordCount: 410, questions: 6 },
    { title: 'Cultural Identity in a Globalized World', level: 'grade12', difficulty: 'advanced', wordCount: 440, questions: 6 },
    { title: 'The Mathematics of Nature', level: 'grade10', difficulty: 'intermediate', wordCount: 320, questions: 5 },
    { title: 'Robotics and the Future of Work', level: 'grade11', difficulty: 'advanced', wordCount: 370, questions: 6 },
    { title: 'Ancient Civilizations: The Mayans', level: 'grade10', difficulty: 'intermediate', wordCount: 330, questions: 5 },
    { title: 'The Human Genome Project', level: 'grade12', difficulty: 'advanced', wordCount: 430, questions: 6 },
    { title: 'Climate Migration: A Growing Crisis', level: 'grade12', difficulty: 'advanced', wordCount: 450, questions: 6 },
    { title: 'How Languages Evolve Over Time', level: 'grade11', difficulty: 'intermediate', wordCount: 360, questions: 5 },
    { title: 'The Ethics of Artificial Intelligence', level: 'grade12', difficulty: 'advanced', wordCount: 440, questions: 6 },
    { title: 'Dark Matter and the Universe', level: 'grade11', difficulty: 'advanced', wordCount: 390, questions: 6 }
  ];
  for (const r of R) {
    readings.push({ id: 'reading-hs-' + readings.length, title: r.title, level: r.level, difficulty: r.difficulty, wordCount: r.wordCount, type: 'reading', source: 'high-school-english', questionsCount: r.questions });
  }
  return readings;
}

// ─── HIGH-SCHOOL SPEAKING ─────────────────────────────────────────
function generateSpeaking() {
  const scenarios = [];
  const S = [
    { topic: 'Debate: Should School Uniforms Be Abolished?', level: 'grade10', type: 'debate', duration: '3-5 min', keywords: ['uniforms', 'education', 'policy'] },
    { topic: 'Presentation: My Career Aspirations', level: 'grade10', type: 'presentation', duration: '2-3 min', keywords: ['career', 'future', 'goals'] },
    { topic: 'Discussion: The Role of Technology in Education', level: 'grade10', type: 'discussion', duration: '4-6 min', keywords: ['technology', 'education', 'learning'] },
    { topic: 'Role Play: Job Interview', level: 'grade10', type: 'roleplay', duration: '3-4 min', keywords: ['interview', 'job', 'professional'] },
    { topic: 'Debate: Social Media Does More Harm Than Good', level: 'grade10', type: 'debate', duration: '4-5 min', keywords: ['social media', 'internet', 'society'] },
    { topic: 'Presentation: An Important Historical Event', level: 'grade10', type: 'presentation', duration: '3-4 min', keywords: ['history', 'event', 'impact'] },
    { topic: 'Discussion: Should the Voting Age Be Lowered?', level: 'grade11', type: 'discussion', duration: '5-7 min', keywords: ['voting', 'democracy', 'rights'] },
    { topic: 'Debate: Animal Testing Should Be Banned', level: 'grade11', type: 'debate', duration: '4-6 min', keywords: ['animals', 'testing', 'ethics'] },
    { topic: 'Presentation: A Book That Changed My Perspective', level: 'grade11', type: 'presentation', duration: '3-4 min', keywords: ['book', 'reading', 'perspective'] },
    { topic: 'Role Play: Negotiating a Business Deal', level: 'grade11', type: 'roleplay', duration: '4-5 min', keywords: ['negotiation', 'business', 'deal'] },
    { topic: 'Discussion: Climate Change Responsibility', level: 'grade11', type: 'discussion', duration: '5-7 min', keywords: ['climate', 'environment', 'responsibility'] },
    { topic: 'Debate: Genetically Modified Food Is Safe', level: 'grade11', type: 'debate', duration: '4-5 min', keywords: ['GMO', 'food', 'science'] },
    { topic: 'Presentation: My Understanding of Freedom', level: 'grade11', type: 'presentation', duration: '3-4 min', keywords: ['freedom', 'philosophy', 'values'] },
    { topic: 'Discussion: Universal Basic Income', level: 'grade12', type: 'discussion', duration: '6-8 min', keywords: ['income', 'economy', 'welfare'] },
    { topic: 'Debate: Privacy vs National Security', level: 'grade12', type: 'debate', duration: '5-7 min', keywords: ['privacy', 'security', 'government'] },
    { topic: 'Presentation: An Analysis of a Poem', level: 'grade12', type: 'presentation', duration: '4-5 min', keywords: ['poem', 'literature', 'analysis'] },
    { topic: 'Role Play: United Nations Debate on Climate', level: 'grade12', type: 'roleplay', duration: '6-8 min', keywords: ['UN', 'climate', 'diplomacy'] },
    { topic: 'Discussion: The Ethics of Artificial Intelligence', level: 'grade12', type: 'discussion', duration: '6-8 min', keywords: ['AI', 'ethics', 'technology'] },
    { topic: 'Debate: Free University Education for All', level: 'grade12', type: 'debate', duration: '5-7 min', keywords: ['education', 'university', 'cost'] },
    { topic: 'Presentation: The Impact of Colonization', level: 'grade12', type: 'presentation', duration: '4-6 min', keywords: ['colonization', 'history', 'impact'] },
    { topic: 'Discussion: Should Homework Be Abolished?', level: 'grade10', type: 'discussion', duration: '3-5 min', keywords: ['homework', 'education', 'stress'] },
    { topic: 'Presentation: My Role Model', level: 'grade10', type: 'presentation', duration: '2-3 min', keywords: ['role model', 'inspiration', 'person'] },
    { topic: 'Role Play: Ordering in a Restaurant', level: 'grade10', type: 'roleplay', duration: '2-3 min', keywords: ['restaurant', 'ordering', 'polite'] },
    { topic: 'Debate: Space Exploration Is Worth the Cost', level: 'grade11', type: 'debate', duration: '4-6 min', keywords: ['space', 'exploration', 'cost'] },
    { topic: 'Discussion: The Generation Gap', level: 'grade11', type: 'discussion', duration: '4-6 min', keywords: ['generation', 'family', 'values'] },
    { topic: 'Presentation: A Scientific Discovery', level: 'grade11', type: 'presentation', duration: '3-4 min', keywords: ['discovery', 'science', 'innovation'] },
    { topic: 'Debate: Celebrities as Role Models', level: 'grade10', type: 'debate', duration: '3-5 min', keywords: ['celebrity', 'role model', 'influence'] },
    { topic: 'Discussion: Is College Still Worth It?', level: 'grade12', type: 'discussion', duration: '5-7 min', keywords: ['college', 'worth', 'career'] },
    { topic: 'Presentation: Analyzing a Film', level: 'grade11', type: 'presentation', duration: '3-5 min', keywords: ['film', 'analysis', 'criticism'] },
    { topic: 'Role Play: Medical Consultation', level: 'grade10', type: 'roleplay', duration: '3-4 min', keywords: ['medical', 'health', 'consultation'] }
  ];
  for (const s of S) {
    scenarios.push({ id: 'speaking-hs-' + scenarios.length, topic: s.topic, level: s.level, type: s.type, duration: s.duration, keywords: s.keywords, source: 'high-school-english' });
  }
  return scenarios;
}

// ─── HIGH-SCHOOL WRITING ──────────────────────────────────────────
function generateWriting() {
  const prompts = [];
  const W = [
    { title: 'Argumentative Essay: School Uniforms', level: 'grade10', type: 'argumentative', wordTarget: 300, instruction: 'Argue for or against mandatory school uniforms in public schools. Provide at least three reasons with supporting evidence.' },
    { title: 'Descriptive Essay: A Place That Inspires Me', level: 'grade10', type: 'descriptive', wordTarget: 250, instruction: 'Describe a place that makes you feel inspired. Use sensory details to bring the location to life.' },
    { title: 'Narrative: A Challenge I Overcame', level: 'grade10', type: 'narrative', wordTarget: 300, instruction: 'Write about a difficult challenge you faced and how you overcame it. Reflect on what you learned.' },
    { title: 'Formal Letter: Letter to the Editor', level: 'grade10', type: 'formal-letter', wordTarget: 250, instruction: 'Write a letter to the editor of your local newspaper expressing your opinion on a community issue.' },
    { title: 'Book Review: My Favorite Novel', level: 'grade10', type: 'review', wordTarget: 280, instruction: 'Write a review of a novel you have read recently. Include a brief summary, analysis of themes, and your recommendation.' },
    { title: 'Argumentative: Is Technology Making Us Lonelier?', level: 'grade10', type: 'argumentative', wordTarget: 350, instruction: 'Argue whether technology brings people closer together or drives them apart.' },
    { title: 'Report: Analyzing a Historical Event', level: 'grade11', type: 'report', wordTarget: 400, instruction: 'Write a report analyzing the causes and effects of a significant historical event.' },
    { title: 'Persuasive: Should Animal Testing Be Banned?', level: 'grade11', type: 'persuasive', wordTarget: 400, instruction: 'Write a persuasive essay arguing for or against animal testing in scientific research.' },
    { title: 'Comparative Essay: Two Political Systems', level: 'grade11', type: 'comparative', wordTarget: 450, instruction: 'Compare and contrast two different political systems, discussing their strengths and weaknesses.' },
    { title: 'Analytical: Theme Analysis in Literature', level: 'grade11', type: 'analytical', wordTarget: 400, instruction: 'Analyze the central theme of a literary work you have studied. Use textual evidence to support your analysis.' },
    { title: 'Formal Email: Job Application', level: 'grade11', type: 'formal-letter', wordTarget: 300, instruction: 'Write a formal job application email for a position you would like to have. Include your qualifications and motivation.' },
    { title: 'Argumentative: Climate Action Responsibility', level: 'grade11', type: 'argumentative', wordTarget: 450, instruction: 'Argue who bears the primary responsibility for combating climate change: governments, corporations, or individuals.' },
    { title: 'Research Proposal: A Scientific Question', level: 'grade12', type: 'proposal', wordTarget: 500, instruction: 'Write a research proposal for a scientific investigation. Include research question, hypothesis, methodology, and expected outcomes.' },
    { title: 'Critical Essay: Evaluating a Theory', level: 'grade12', type: 'analytical', wordTarget: 500, instruction: 'Critically evaluate a scientific or philosophical theory, discussing its strengths, limitations, and implications.' },
    { title: 'Synthesis Essay: Multiple Sources', level: 'grade12', type: 'synthesis', wordTarget: 600, instruction: 'Synthesize information from at least three sources on a topic of your choice. Present a coherent argument integrating multiple perspectives.' },
    { title: 'Discursive: The Pros and Cons of Globalization', level: 'grade12', type: 'discursive', wordTarget: 500, instruction: 'Discuss both the advantages and disadvantages of globalization in the modern world.' },
    { title: 'Reflective: My Educational Journey', level: 'grade12', type: 'reflective', wordTarget: 400, instruction: 'Reflect on your educational journey so far. Discuss key experiences that have shaped your learning and personal growth.' },
    { title: 'Summary: Condensing a Complex Text', level: 'grade12', type: 'summary', wordTarget: 200, instruction: 'Write a concise summary of a complex text, capturing the main arguments and key evidence without personal commentary.' },
    { title: 'Creative: Short Story with a Twist', level: 'grade11', type: 'creative', wordTarget: 500, instruction: 'Write a short story that ends with an unexpected twist. Focus on character development and atmosphere.' },
    { title: 'Persuasive Speech: Text', level: 'grade12', type: 'speech', wordTarget: 400, instruction: 'Write the text of a persuasive speech on a topic you care deeply about. Use rhetorical devices to strengthen your argument.' },
    { title: 'Compare and Contrast: Two Poems', level: 'grade11', type: 'comparative', wordTarget: 400, instruction: 'Compare and contrast two poems on a similar theme, analyzing their use of language, imagery, and poetic devices.' },
    { title: 'Explain: A Scientific Process', level: 'grade10', type: 'expository', wordTarget: 300, instruction: 'Explain a scientific process or natural phenomenon in a way that is accessible to a general audience.' },
    { title: 'Autobiographical: A Defining Moment', level: 'grade10', type: 'narrative', wordTarget: 350, instruction: 'Write about a defining moment in your life that changed your perspective or direction.' },
    { title: 'Critical Review: A Film or Documentary', level: 'grade11', type: 'review', wordTarget: 350, instruction: 'Write a critical review of a film or documentary, discussing its strengths, weaknesses, and overall impact.' }
  ];
  for (const w of W) {
    prompts.push({ id: 'writing-hs-' + prompts.length, title: w.title, level: w.level, type: w.type, wordTarget: w.wordTarget, instruction: w.instruction, source: 'high-school-english' });
  }
  return prompts;
}

// ─── HIGH-SCHOOL SPELLING ─────────────────────────────────────────
function generateSpelling() {
  const lists = [];
  const wordGroups = {
    grade10: [
      { words: ['accommodate', 'achieve', 'aggressive', 'apparent', 'appearance', 'argument', 'athlete', 'attendance', 'believe', 'bureaucracy', 'calendar', 'category', 'cemetery', 'changeable', 'colleague', 'committee', 'completely', 'conscience', 'conscious', 'controversy'], type: 'commonly-misspelled' },
      { words: ['definitely', 'disappear', 'disappoint', 'discipline', 'dissatisfied', 'embarrass', 'environment', 'exaggerate', 'excellent', 'existence', 'experience', 'familiar', 'fascinate', 'foreign', 'government', 'guarantee', 'harass', 'height', 'immediately', 'independent'], type: 'commonly-misspelled' },
      { words: ['indispensable', 'irresistible', 'knowledge', 'laboratory', 'leisure', 'liaison', 'library', 'license', 'liquid', 'maintenance', 'manageable', 'millennium', 'miniature', 'minimum', 'mischievous', 'misspell', 'necessary', 'neighbour', 'noticeable', 'occasion'], type: 'commonly-misspelled' }
    ],
    grade11: [
      { words: ['occurrence', 'parallel', 'parliament', 'particular', 'perseverance', 'personnel', 'phenomenon', 'physically', 'possess', 'precede', 'preference', 'prejudice', 'privilege', 'professor', 'pronunciation', 'publicly', 'questionnaire', 'receive', 'recommend', 'reference'], type: 'academic' },
      { words: ['relevant', 'religious', 'repetition', 'restaurant', 'rhythm', 'ridiculous', 'schedule', 'secretary', 'separate', 'significant', 'sincerely', 'sophomore', 'specifically', 'sponsor', 'stereotype', 'subtle', 'succeed', 'successful', 'sufficient', 'symmetry'], type: 'academic' },
      { words: ['temperature', 'tendency', 'threshold', 'tomorrow', 'transferred', 'truly', 'unforeseen', 'unfortunately', 'unique', 'unnecessary', 'until', 'vacuum', 'vehicle', 'Wednesday', 'weird', 'widespread', 'withhold', 'writing', 'yield', 'ambiguous'], type: 'academic' }
    ],
    grade12: [
      { words: ['aerial', 'algorithm', 'allotment', 'amalgamate', 'amphibious', 'anaesthetic', 'anecdote', 'anonymous', 'apostrophe', 'auditory', 'autonomous', 'beneficiary', 'benevolent', 'camouflage', 'capillary', 'carnivorous', 'chronological', 'coincidence', 'collaborate', 'conscientious'], type: 'advanced' },
      { words: ['consecutive', 'convalescence', 'corroborate', 'crystallize', 'deleterious', 'deteriorate', 'diaphragm', 'differentiate', 'dilettante', 'diphtheria', 'disillusioned', 'eccentricity', 'ecclesiastical', 'effervescent', 'eighth', 'entrepreneur', 'epitome', 'exacerbate', 'exhilarate', 'extraterrestrial'], type: 'advanced' },
      { words: ['fluorescent', 'gauge', 'gerrymander', 'gist', 'government', 'guerrilla', 'haemorrhage', 'hierarchy', 'homogeneous', 'hypothesis', 'idiosyncrasy', 'illumination', 'immunization', 'inaugurate', 'inoculate', 'intercede', 'iridescent', 'jurisdiction', 'legitimate', 'lieutenant'], type: 'advanced' }
    ]
  };
  for (const [level, groups] of Object.entries(wordGroups)) {
    for (const group of groups) {
      for (const word of group.words) {
        lists.push({ id: 'spelling-hs-' + lists.length, word, level, type: group.type, source: 'high-school-english' });
      }
    }
  }
  return lists;
}

// ─── HIGH-SCHOOL VOCABULARY (Academic Word List + C1-C2) ──────────
function generateVocab() {
  const words = [];
  const groups = {
    grade10: [
      { word: 'analyze', meaning: 'examine in detail', phonetic: '/ˈæn.əl.aɪz/', example: 'Scientists analyze data to draw conclusions.' },
      { word: 'approach', meaning: 'a way of dealing with something', phonetic: '/əˈproʊtʃ/', example: 'We need a new approach to solve this problem.' },
      { word: 'assess', meaning: 'evaluate or estimate', phonetic: '/əˈses/', example: 'Teachers assess students through exams.' },
      { word: 'concept', meaning: 'an abstract idea', phonetic: '/ˈkɑn.sept/', example: 'The concept of gravity is fundamental in physics.' },
      { word: 'context', meaning: 'the circumstances surrounding an event', phonetic: '/ˈkɑn.tekst/', example: 'Words must be understood in context.' },
      { word: 'derive', meaning: 'obtain from a source', phonetic: '/dɪˈraɪv/', example: 'Many English words derive from Latin.' },
      { word: 'emerge', meaning: 'become apparent or known', phonetic: '/ɪˈmɜrdʒ/', example: 'New evidence has emerged.' },
      { word: 'establish', meaning: 'set up on a firm basis', phonetic: '/ɪˈstæb.lɪʃ/', example: 'They established a new school.' },
      { word: 'factor', meaning: 'a circumstance contributing to a result', phonetic: '/ˈfæk.tər/', example: 'Cost was a major factor in the decision.' },
      { word: 'identify', meaning: 'establish who or what something is', phonetic: '/aɪˈden.tɪ.faɪ/', example: 'Can you identify the problem?' }
    ],
    grade11: [
      { word: 'ambiguous', meaning: 'open to more than one interpretation', phonetic: '/æmˈbɪɡ.ju.əs/', example: 'The instructions were ambiguous.' },
      { word: 'coherent', meaning: 'logical and consistent', phonetic: '/koʊˈhɪr.ənt/', example: 'Her argument was clear and coherent.' },
      { word: 'comprehensive', meaning: 'including all elements', phonetic: '/ˌkɑm.prəˈhen.sɪv/', example: 'We need a comprehensive review.' },
      { word: 'contradict', meaning: 'be in conflict with', phonetic: '/ˌkɑn.trəˈdɪkt/', example: 'His actions contradict his words.' },
      { word: 'demonstrate', meaning: 'show clearly by evidence', phonetic: '/ˈdem.ən.streɪt/', example: 'The experiment demonstrates the principle.' },
      { word: 'distinguish', meaning: 'recognize difference', phonetic: '/dɪˈstɪŋ.ɡwɪʃ/', example: 'Can you distinguish between the two?' },
      { word: 'empirical', meaning: 'based on observation or experience', phonetic: '/ɪmˈpɪr.ɪ.kəl/', example: 'We need empirical evidence.' },
      { word: 'fluctuate', meaning: 'rise and fall irregularly', phonetic: '/ˈflʌk.tʃu.eɪt/', example: 'Prices fluctuate with demand.' },
      { word: 'hypothesis', meaning: 'a proposed explanation', phonetic: '/haɪˈpɑθ.ə.sɪs/', example: 'The scientist tested her hypothesis.' },
      { word: 'inevitable', meaning: 'certain to happen', phonetic: '/ɪˈnev.ɪ.tə.bəl/', example: 'Change is inevitable.' }
    ],
    grade12: [
      { word: 'anomaly', meaning: 'something that deviates from the norm', phonetic: '/əˈnɑm.ə.li/', example: 'The test results showed an anomaly.' },
      { word: 'dichotomy', meaning: 'a division into two contrasting things', phonetic: '/daɪˈkɑt.ə.mi/', example: 'There is a dichotomy between theory and practice.' },
      { word: 'ephemeral', meaning: 'lasting a very short time', phonetic: '/ɪˈfem.ər.əl/', example: 'Fame can be ephemeral.' },
      { word: 'extrapolate', meaning: 'extend conclusions to unknown situations', phonetic: '/ɪkˈstræp.ə.leɪt/', example: 'We can extrapolate future trends.' },
      { word: 'juxtapose', meaning: 'place close together for comparison', phonetic: '/ˈdʒʌk.stə.poʊz/', example: 'The artist juxtaposes light and dark.' },
      { word: 'paradigm', meaning: 'a typical example or pattern', phonetic: '/ˈpær.ə.daɪm/', example: 'This represents a new paradigm.' },
      { word: 'quantify', meaning: 'express as a number', phonetic: '/ˈkwɑn.tɪ.faɪ/', example: 'Can you quantify the results?' },
      { word: 'substantiate', meaning: 'provide evidence to support', phonetic: '/səbˈstæn.ʃi.eɪt/', example: 'They could not substantiate their claims.' },
      { word: 'synthesize', meaning: 'combine into a coherent whole', phonetic: '/ˈsɪn.θə.saɪz/', example: 'The essay synthesizes multiple perspectives.' },
      { word: 'ubiquitous', meaning: 'present everywhere', phonetic: '/juːˈbɪk.wɪ.təs/', example: 'Smartphones are ubiquitous.' }
    ]
  };
  for (const [level, items] of Object.entries(groups)) {
    for (const item of items) {
      words.push({ id: 'vocab-hs-' + words.length, word: item.word, meaning: item.meaning, phonetic: item.phonetic, example: item.example, level, source: 'high-school-english', type: 'academic' });
    }
  }
  return words;
}

// ─── WRITE ALL FILES ──────────────────────────────────────────────
(function main() {
  console.log('Generating high-school English content...\n');
  w(path.join(DATA_DIR, 'english-grammar-hs.json'), generateGrammar());
  w(path.join(DATA_DIR, 'english-reading-hs.json'), generateReading());
  w(path.join(DATA_DIR, 'english-speaking-hs.json'), generateSpeaking());
  w(path.join(DATA_DIR, 'english-writing-hs.json'), generateWriting());
  w(path.join(DATA_DIR, 'english-spelling-hs.json'), generateSpelling());
  w(path.join(DATA_DIR, 'english-vocabulary-hs.json'), generateVocab());
  console.log('\nDone! Generated 6 high-school English content files.');
})();
