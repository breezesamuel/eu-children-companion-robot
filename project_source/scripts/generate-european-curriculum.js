// European (UK National Curriculum) comprehensive curriculum data generator
// Covers: EYFS (Preschool) → KS1 → KS2 → KS3 → KS4 (ages 3-16)
// Generates 1000+ structured curriculum units with real UK curriculum content

const fs = require('fs');
const path = require('path');

// ==================== LEVEL DEFINITIONS ====================
const LEVELS = {
  kindergarten: { name: 'Preschool (3-5)', keyStage: 'EYFS', ages: '3-5', isced: 1, order: 0 },
  primary_1:    { name: 'Year 1 (5-6)',   keyStage: 'KS1', ages: '5-6', isced: 1, order: 1 },
  primary_2:    { name: 'Year 2 (6-7)',   keyStage: 'KS1', ages: '6-7', isced: 1, order: 2 },
  primary_3:    { name: 'Year 3 (7-8)',   keyStage: 'KS2', ages: '7-8', isced: 2, order: 3 },
  primary_4:    { name: 'Year 4 (8-9)',   keyStage: 'KS2', ages: '8-9', isced: 2, order: 4 },
  primary_5:    { name: 'Year 5 (9-10)',  keyStage: 'KS2', ages: '9-10', isced: 2, order: 5 },
  primary_6:    { name: 'Year 6 (10-11)', keyStage: 'KS2', ages: '10-11', isced: 2, order: 6 },
  secondary_lower_1: { name: 'Year 7 (11-12)', keyStage: 'KS3', ages: '11-12', isced: 2, order: 7 },
  secondary_lower_2: { name: 'Year 8 (12-13)', keyStage: 'KS3', ages: '12-13', isced: 2, order: 8 },
  secondary_lower_3: { name: 'Year 9 (13-14)', keyStage: 'KS3', ages: '13-14', isced: 2, order: 9 },
  secondary_upper_1: { name: 'Year 10 (14-15)', keyStage: 'KS4', ages: '14-15', isced: 3, order: 10 },
  secondary_upper_2: { name: 'Year 11 (15-16)', keyStage: 'KS4', ages: '15-16', isced: 3, order: 11 }
};

const SUBJECTS = ['english', 'maths', 'science', 'geography', 'history', 'art', 'music', 'pe', 'computing', 'social', 'biology', 'physics', 'chemistry'];
const SUBJECT_NAMES = {
  english: 'English', maths: 'Mathematics', science: 'Science',
  geography: 'Geography', history: 'History', art: 'Art & Design',
  music: 'Music', pe: 'Physical Education', computing: 'Computing',
  social: 'Social Studies', biology: 'Biology', physics: 'Physics', chemistry: 'Chemistry'
};

const SEMESTERS = ['autumn', 'spring', 'summer'];

// ==================== UK CURRICULUM CONTENT DATABASE ====================
// Real UK National Curriculum topics, skills, and objectives

const CURRICULUM_CONTENT = {
  english: {
    eyfs: [
      { topics: 'Phase 1 Phonics: Environmental Sounds, Instrument Sounds, Body Percussion', skills: 'Listening, auditory discrimination, rhythm awareness' },
      { topics: 'Phase 2 Phonics: s,a,t,p,i,n,m,d,g,o,c,k,ck,e,u,r,h,b,f,ff,l,ll,ss', skills: 'Grapheme-phoneme correspondence, blending CVC words' },
      { topics: 'Mark Making & Emergent Writing: Shapes, lines, patterns, name writing', skills: 'Fine motor control, pencil grip, letter formation' },
      { topics: 'Rhymes & Stories: Traditional tales, nursery rhymes, repetitive texts', skills: 'Story comprehension, prediction, sequencing' },
      { topics: 'Speaking & Listening: Show and tell, role play, following instructions', skills: 'Oral communication, turn-taking, vocabulary building' },
      { topics: 'Print Awareness: Environmental print, book handling, directionality', skills: 'Concepts of print, left-to-right, top-to-bottom' }
    ],
    ks1: [
      { year: 1, topics: 'Phase 3-5 Phonics: vowel digraphs, consonant digraphs, alternative spellings', skills: 'Decoding, encoding, reading fluency 90 WPM' },
      { year: 1, topics: 'Fiction: Traditional tales, stories with repeating patterns', skills: 'Plot sequencing, character identification, retelling' },
      { year: 1, topics: 'Non-fiction: Labels, captions, lists, information texts', skills: 'Text features, fact retrieval, simple note-taking' },
      { year: 1, topics: 'Poetry: Rhyming poems, pattern poems, action rhymes', skills: 'Rhyme recognition, rhythm, memorisation' },
      { year: 1, topics: 'Sentence Construction: Capital letters, full stops, finger spaces', skills: 'Simple sentences, conjunctions (and, because)' },
      { year: 1, topics: 'Handwriting: Lowercase and capital letter formation, number formation', skills: 'Tripod grip, correct letter orientation, sizing' },
      { year: 2, topics: 'Phase 6 Phonics: suffixes (-s,-es,-ing,-ed,-er,-est), prefix un-', skills: 'Morphological awareness, spelling rules, fluency 110 WPM' },
      { year: 2, topics: 'Fiction: Extended stories, fairy tales from different cultures', skills: 'Inference, prediction, character motivation' },
      { year: 2, topics: 'Non-fiction: Instructions, recounts, non-chronological reports', skills: 'Text organisation, headings, bullet points' },
      { year: 2, topics: 'Poetry: List poems, kennings, calligrams', skills: 'Word choice, imagery, alliteration' },
      { year: 2, topics: 'Grammar: Nouns, verbs, adjectives, adverbs, past/present tense', skills: 'Word classes, tense consistency, expanded noun phrases' },
      { year: 2, topics: 'Punctuation: Question marks, exclamation marks, commas in lists, apostrophes', skills: 'Sentence types, contraction, possession' }
    ],
    ks2: [
      { year: 3, topics: 'Fiction: Myths, legends, fables, adventure stories', skills: 'Plot structure, setting description, character development' },
      { year: 3, topics: 'Non-fiction: Explanation texts, persuasive writing, newspaper reports', skills: 'Text structure, formal language, evidence' },
      { year: 3, topics: 'Poetry: Haiku, tanka, narrative poems', skills: 'Syllable counting, imagery, figurative language' },
      { year: 3, topics: 'Grammar: Prepositions, conjunctions, adverbs for time/place/cause', skills: 'Complex sentences, paragraph organisation' },
      { year: 3, topics: 'Punctuation: Inverted commas, apostrophes for possession', skills: 'Direct speech, singular/plural possession' },
      { year: 3, topics: 'Spelling: Prefixes, suffixes, homophones, word families', skills: 'Etymology, patterns, dictionary skills' },
      { year: 4, topics: 'Fiction: Historical fiction, fantasy, mystery stories', skills: 'Atmosphere, suspense, dialogue punctuation' },
      { year: 4, topics: 'Non-fiction: Discussion texts, biographies, journalistic writing', skills: 'Balanced argument, passive voice, formal tone' },
      { year: 4, topics: 'Poetry: Free verse, structured poems, choral speaking', skills: 'Metaphor, simile, personification' },
      { year: 4, topics: 'Grammar: Standard English, pronouns, possessive determiners', skills: 'Formal vs informal, cohesion, fronted adverbials' },
      { year: 4, topics: 'Reading Comprehension: Literal, inferential, evaluative questions', skills: 'Skimming, scanning, close reading, summarising' },
      { year: 4, topics: 'Spelling: Pluralisation, prefixes (il-, im-, ir-, re-, sub-, inter-)', skills: 'Morphology, word origins, proofreading' },
      { year: 5, topics: 'Fiction: Classic literature excerpts, science fiction, flashbacks', skills: 'Authorial intent, theme analysis, literary devices' },
      { year: 5, topics: 'Non-fiction: Formal reports, arguments, journalistic writing', skills: 'Cohesion, layout devices, citation' },
      { year: 5, topics: 'Poetry: Ballads, sonnets, performance poetry', skills: 'Iambic pentameter, rhyme scheme, tone' },
      { year: 5, topics: 'Grammar: Modal verbs, relative clauses, parenthesis', skills: 'Subordination, ambiguity, precision' },
      { year: 5, topics: 'Punctuation: Brackets, dashes, commas for parenthesis, colons', skills: 'Sentence variation, pacing, clarity' },
      { year: 5, topics: 'Spelling: Silent letters, unstressed vowels, etymological roots', skills: 'Greek/Latin roots, morphological families' },
      { year: 6, topics: 'Fiction: Whole novel study, Shakespeare retellings, graphic novels', skills: 'Critical analysis, comparison, personal response' },
      { year: 6, topics: 'Non-fiction: Essays, speeches, formal letters, debate writing', skills: 'Rhetoric, counterargument, register' },
      { year: 6, topics: 'Poetry: Classic poetry anthology, slam poetry', skills: 'Symbolism, allegory, voice' },
      { year: 6, topics: 'Grammar: Active/passive voice, subjunctive mood, cohesive devices', skills: 'Register manipulation, abstract concepts' },
      { year: 6, topics: 'SATs Preparation: Reading comprehension, spelling, grammar, punctuation', skills: 'Test technique, time management, revision strategies' },
      { year: 6, topics: 'Transition Unit: Secondary-ready writing, extended projects', skills: 'Independence, research skills, presentation' }
    ],
    ks3: [
      { year: 7, topics: 'Novel Study: "The Giver" or "Holes" — dystopian themes, character arcs', skills: 'Literary analysis, thematic exploration, text evidence' },
      { year: 7, topics: 'Shakespeare: "A Midsummer Night\'s Dream" — comedy, love, magic', skills: 'Plot analysis, character motivation, Elizabethan context' },
      { year: 7, topics: 'Poetry: Romantic poetry — Wordsworth, Blake, Keats', skills: 'Imagery analysis, rhyme scheme, meter' },
      { year: 7, topics: 'Non-fiction: Autobiography and biography writing', skills: 'Personal voice, reflective writing, chronology' },
      { year: 7, topics: 'Grammar & Vocabulary: Complex sentences, colons, semicolons', skills: 'Sentence variety, academic vocabulary' },
      { year: 7, topics: 'Media: Advertising analysis, film review, digital texts', skills: 'Persuasion techniques, audience awareness' },
      { year: 8, topics: 'Novel Study: "Of Mice and Men" — American Dream, friendship, tragedy', skills: 'Contextual analysis, symbolism, character study' },
      { year: 8, topics: 'Shakespeare: "Romeo and Juliet" — love, conflict, fate', skills: 'Dramatic structure, soliloquy, tragic conventions' },
      { year: 8, topics: 'Poetry: War poetry — Owen, Sassoon, Brooke', skills: 'Patriotic vs realistic, poetic devices, tone' },
      { year: 8, topics: 'Non-fiction: Travel writing, journalism, speech analysis', skills: 'Descriptive language, bias detection, rhetorical devices' },
      { year: 8, topics: 'Drama: Playscripts, performance, stagecraft', skills: 'Dialogue, stage directions, subtext' },
      { year: 8, topics: 'Creative Writing: Narrative hooks, setting, dialogue', skills: 'Show don\'t tell, pacing, voice' },
      { year: 9, topics: 'Novel Study: "Animal Farm" — allegory, power, corruption', skills: 'Political context, allegorical interpretation, satire' },
      { year: 9, topics: 'Shakespeare: "Macbeth" — ambition, guilt, supernatural', skills: 'Tragic hero, dramatic irony, theme of kingship' },
      { year: 9, topics: 'Poetry: Identity and culture poetry anthology', skills: 'Comparative analysis, voice, cultural context' },
      { year: 9, topics: 'Non-fiction: Opinion writing, essays, critical reviews', skills: 'Argument structure, rhetorical devices, formal register' },
      { year: 9, topics: 'Spoken Language: Presentations, debates, discussions', skills: 'Oracy, argumentation, active listening' },
      { year: 9, topics: 'GCSE Preparation: Analytical writing, comparative essays', skills: 'PEEL paragraphs, thesis statements, textual references' }
    ],
    ks4: [
      { year: 10, topics: 'GCSE English Literature: "Macbeth" / "A Christmas Carol"', skills: 'Character analysis, theme exploration, context integration' },
      { year: 10, topics: 'GCSE English Language: Descriptive and narrative writing', skills: 'Imaginative composition, structural devices, vocabulary' },
      { year: 10, topics: 'GCSE Poetry Anthology: Power and Conflict cluster', skills: 'Comparative poetry, poetic techniques, personal response' },
      { year: 10, topics: 'GCSE English Language: Non-fiction reading comprehension', skills: 'Retrieval, inference, language analysis, evaluation' },
      { year: 10, topics: 'Spoken Language Endorsement: Individual presentation', skills: 'Structure, delivery, Q&A handling' },
      { year: 10, topics: 'Modern Text: "An Inspector Calls" or "Blood Brothers"', skills: 'Social context, dramatic devices, theme analysis' },
      { year: 11, topics: 'GCSE Literature: Unseen poetry practice', skills: 'Immediate analysis, comparison skills, timed writing' },
      { year: 11, topics: 'GCSE Language: Persuasive and argumentative writing', skills: 'Register, rhetorical devices, structural features' },
      { year: 11, topics: 'GCSE Exam Preparation: Mock papers, revision techniques', skills: 'Time management, question analysis, mark scheme' },
      { year: 11, topics: 'Revision: Literature text consolidation', skills: 'Quotation recall, thematic links, essay structure' },
      { year: 11, topics: 'Revision: Language paper 1 & 2 techniques', skills: 'Section A reading, Section B writing strategies' },
      { year: 11, topics: 'Post-16 Preparation: Critical thinking, academic writing', skills: 'Analysis, evaluation, synthesis' }
    ]
  },

  maths: {
    eyfs: [
      { topics: 'Number Recognition: Counting 1-20, number names, one-to-one correspondence', skills: 'Rote counting, rational counting, cardinality' },
      { topics: 'Shape & Space: 2D shapes, 3D objects, position language', skills: 'Shape naming, spatial awareness, pattern making' },
      { topics: 'Measures: Size comparison, capacity, weight, length', skills: 'Comparative language, non-standard units, ordering' },
      { topics: 'Pattern: Repeating patterns, symmetry, sequences', skills: 'Pattern recognition, AB/ABC patterns, symmetry identification' },
      { topics: 'Time: Daily routines, seasons, sequencing events', skills: 'Temporal language, clock awareness, before/after' },
      { topics: 'Money: Coin recognition, role-play shop, value comparison', skills: 'Currency awareness, exchange, simple transactions' }
    ],
    ks1: [
      { year: 1, topics: 'Number & Place Value: Count to 100, read/write numbers, one more/less', skills: 'Number sense, tens/ones, estimation' },
      { year: 1, topics: 'Addition & Subtraction: Number bonds to 10, add/subtract 1-digit numbers', skills: 'Mental maths, part-whole model, fact families' },
      { year: 1, topics: 'Multiplication & Division: Counting in 2s, 5s, 10s; equal groups', skills: 'Skip counting, arrays, sharing' },
      { year: 1, topics: 'Fractions: Halves and quarters of shapes and quantities', skills: 'Equal parts, fraction notation, key vocabulary' },
      { year: 1, topics: 'Geometry: 2D/3D shapes, position, direction, patterns', skills: 'Shape properties, sorting, whole/half turns' },
      { year: 1, topics: 'Measurement: Length/height, weight, capacity, time to hour/half-hour', skills: 'Non-standard measures, comparative language, clock reading' },
      { year: 2, topics: 'Number & Place Value: Numbers to 1000, odd/even, greater than/less than', skills: 'Place value hundreds/tens/ones, number lines' },
      { year: 2, topics: 'Addition & Subtraction: 2-digit +/- 1 and 2-digit numbers, number bonds to 20', skills: 'Column method, inverse operations, problem solving' },
      { year: 2, topics: 'Multiplication & Division: 2x, 5x, 10x tables, commutativity', skills: 'Times table recall, division as grouping, fact families' },
      { year: 2, topics: 'Fractions: Thirds, unit fractions, equivalence of 1/2 and 2/4', skills: 'Fraction of amounts, equivalence, ordering' },
      { year: 2, topics: 'Statistics: Tally charts, pictograms, block diagrams', skills: 'Data collection, interpretation, comparison' },
      { year: 2, topics: 'Measurement: Money, time to 5 mins, temperature, length in cm/m', skills: 'Currency calculation, analogue/digital time, reading scales' }
    ],
    ks2: [
      { year: 3, topics: 'Number & Place Value: Numbers to 10000, rounding to 10/100', skills: 'Place value thousands, negative numbers, Roman numerals' },
      { year: 3, topics: 'Addition & Subtraction: Column method 3-digit, inverse checking', skills: 'Formal written methods, estimation, word problems' },
      { year: 3, topics: 'Multiplication & Division: 3x, 4x, 8x tables, formal written multiplication', skills: 'Times table recall, short multiplication, scaling' },
      { year: 3, topics: 'Fractions: Unit/non-unit fractions, equivalents, fractions of sets', skills: 'Fraction wall, adding/subtracting same denominator' },
      { year: 3, topics: 'Measurement: Perimeter, money problems, time 24-hour clock', skills: 'Measure in mm/cm/m, convert units, duration' },
      { year: 3, topics: 'Geometry: Angles, perpendicular/parallel lines, 3D shape properties', skills: 'Right angles, polygon classification, nets' },
      { year: 4, topics: 'Number & Place Value: Numbers to 100000, rounding to 1000', skills: 'Place value ten thousands, negative numbers in context' },
      { year: 4, topics: 'Addition & Subtraction: Column method 4-digit, multi-step problems', skills: 'Efficient strategies, estimation, checking' },
      { year: 4, topics: 'Multiplication & Division: 6x, 7x, 9x, 11x, 12x tables, short division', skills: 'All tables to 12x12, factor pairs, remainders' },
      { year: 4, topics: 'Fractions & Decimals: Equivalent fractions, decimal tenths/hundredths', skills: 'Fraction/decimal equivalence, ordering, rounding' },
      { year: 4, topics: 'Measurement: Area, converting between units, money word problems', skills: 'Area as squares, km/m/cm/mm, pounds/pence' },
      { year: 4, topics: 'Geometry: Symmetry, coordinates in first quadrant, triangles', skills: 'Reflective symmetry, grid references, classifying triangles' },
      { year: 5, topics: 'Number & Place Value: Numbers to 1000000, powers of 10', skills: 'Place value hundred thousands, rounding, Roman numerals to 1000' },
      { year: 5, topics: 'Addition & Subtraction: Column method with decimals, problem solving', skills: 'Decimal alignment, multi-step, inverse operations' },
      { year: 5, topics: 'Multiplication & Division: Long multiplication, short division with remainders', skills: 'Formal methods, factors/multiples, prime/square numbers' },
      { year: 5, topics: 'Fractions, Decimals & Percentages: Equivalence, ordering, % of amounts', skills: 'Mixed numbers, improper fractions, decimal fractions' },
      { year: 5, topics: 'Measurement: Volume, imperial units, metric conversion', skills: 'Cubic cm, capacity, converting between systems' },
      { year: 5, topics: 'Geometry: Angles on a line/point, regular/irregular polygons, reflection', skills: 'Angle measurement, polygon properties, translation' },
      { year: 6, topics: 'Number & Place Value: Numbers to 10000000, negative numbers', skills: 'Contextual use, rounding, order of operations BIDMAS' },
      { year: 6, topics: 'Four Operations: Long division, multi-digit multiplication, complex problems', skills: 'Efficient written methods, common factors, order of ops' },
      { year: 6, topics: 'Fractions, Decimals & Percentages: Complex equivalence, ratio, proportion', skills: 'Ratio notation, scale factor, percentage change' },
      { year: 6, topics: 'Algebra: Simple equations, formulae, sequences', skills: 'Using letters, function machines, nth term introduction' },
      { year: 6, topics: 'Measurement: Perimeter/area/volume of compound shapes, conversion', skills: 'Formulae application, irregular shapes, metric/imperial' },
      { year: 6, topics: 'Statistics: Line graphs, pie charts, mean average, probability', skills: 'Data interpretation, distribution, likelihood vocabulary' }
    ],
    ks3: [
      { year: 7, topics: 'Number: Place value, rounding, indices, negative numbers, BIDMAS', skills: 'Estimation, standard form introduction, calculator use' },
      { year: 7, topics: 'Algebra: Simplifying expressions, solving equations, sequences', skills: 'Like terms, one/two-step equations, nth term' },
      { year: 7, topics: 'Ratio & Proportion: Simplifying ratios, direct proportion, scaling', skills: 'Ratio notation, unitary method, map scales' },
      { year: 7, topics: 'Geometry: Area of 2D shapes, volume of prisms, angle rules', skills: 'Triangle area, parallelogram, cuboid volume, angle sum' },
      { year: 7, topics: 'Fractions, Decimals & Percentages: Operations, equivalence, interest', skills: 'FDP conversions, percentage increase/decrease, VAT' },
      { year: 7, topics: 'Statistics: Data collection, bar charts, frequency tables, mean/median/mode', skills: 'Sampling, grouped data, measures of central tendency' },
      { year: 8, topics: 'Number: Standard form, HCF/LCM, fraction/percentage operations', skills: 'Prime factorisation, index laws, recurring decimals' },
      { year: 8, topics: 'Algebra: Expanding brackets, factorising, formulae, linear graphs', skills: 'Distributive law, gradient, y=mx+c, rearranging' },
      { year: 8, topics: 'Ratio: Sharing in ratio, currency conversion, best buys', skills: 'Compound measures, speed/density, unit pricing' },
      { year: 8, topics: 'Geometry: Pythagoras theorem, transformations, constructions', skills: 'Right triangles, rotation/reflection/translation, loci' },
      { year: 8, topics: 'Probability: Sample space, theoretical probability, relative frequency', skills: 'Tree diagrams, Venn diagrams, expected outcomes' },
      { year: 8, topics: 'Data: Scatter graphs, correlation, two-way tables, stem and leaf', skills: 'Trends, outliers, bivariate data, quartiles' },
      { year: 9, topics: 'Number: Surds, rational vs irrational, compound interest', skills: 'Simplifying surds, exponential growth/decay' },
      { year: 9, topics: 'Algebra: Quadratic equations, simultaneous equations, inequalities', skills: 'Factorising quadratics, substitution method, number lines' },
      { year: 9, topics: 'Geometry: Trigonometry (SOHCAHTOA), circle theorems, vectors', skills: 'Right triangle trig, angle in semicircle, vector geometry' },
      { year: 9, topics: 'Ratio: Direct and inverse proportion graphically', skills: 'Proportional reasoning, currency graphs, unit conversion' },
      { year: 9, topics: 'Probability: Conditional probability, tree diagrams, Venn notation', skills: 'Set notation, independent vs dependent events' },
      { year: 9, topics: 'Statistics: Cumulative frequency, box plots, histograms', skills: 'Median/IQR, distribution shapes, unequal class intervals' }
    ],
    ks4: [
      { year: 10, topics: 'Number: Standard form, surds, bounds, iterative methods', skills: 'Upper/lower bounds, approximation, compound measures' },
      { year: 10, topics: 'Algebra: Simultaneous equations (quadratic/linear), sequences (quadratic)', skills: 'nth term quadratic, algebraic proof, functions' },
      { year: 10, topics: 'Graphs: Quadratic, cubic, reciprocal, exponential graphs', skills: 'Turning points, asymptotes, transformations of functions' },
      { year: 10, topics: 'Geometry: Circle theorems, similarity, congruence, vectors', skills: 'Geometric proof, scale factors, vector geometry' },
      { year: 10, topics: 'Trigonometry: Sine and cosine rules, 3D trig, bearings', skills: 'Non-right triangles, angle of elevation/depression' },
      { year: 10, topics: 'Statistics & Probability: Histograms, cumulative frequency, conditional probability', skills: 'Class intervals, frequency density, Venn notation' },
      { year: 11, topics: 'Algebra: Completing the square, iteration, algebraic fractions', skills: 'Turning points, numerical methods, simplifying complex fractions' },
      { year: 11, topics: 'Geometry: Area and volume of similar shapes, circle sectors', skills: 'Length/area/volume scale factors, arc length, sector area' },
      { year: 11, topics: 'Ratio: Growth and decay, compound measures, density/pressure', skills: 'Exponential change, compound units, speed-time graphs' },
      { year: 11, topics: 'Problem Solving: Functional maths, multi-step contextual problems', skills: 'Modelling, reasoning, mathematical communication' },
      { year: 11, topics: 'Revision: Number & algebra — key topics consolidation', skills: 'Exam technique, time management, mark scheme awareness' },
      { year: 11, topics: 'Revision: Geometry, statistics & probability — exam preparation', skills: 'Past paper practice, targeted revision, weak area focus' }
    ]
  },

  science: {
    eyfs: [
      { topics: 'Living Things: Plants, animals, humans, basic needs', skills: 'Observation, classification, questioning' },
      { topics: 'Seasonal Changes: Weather, seasons, day length', skills: 'Pattern observation, weather vocabulary, recording' },
      { topics: 'Materials: Properties, sorting, simple changes', skills: 'Sensory exploration, grouping, cause-effect' },
      { topics: 'Forces: Pushes, pulls, magnets, floating/sinking', skills: 'Prediction, testing, comparative language' },
      { topics: 'Our Senses: Sight, hearing, touch, taste, smell', skills: 'Sensory vocabulary, discrimination, description' },
      { topics: 'Nature Exploration: Minibeasts, habitats, growing plants', skills: 'Care for living things, life cycles, recording changes' }
    ],
    ks1: [
      { year: 1, topics: 'Plants: Common wild/garden plants, trees, basic structure', skills: 'Identification, labelling, observing growth' },
      { year: 1, topics: 'Animals: Fish, amphibians, reptiles, birds, mammals; carnivore/herbivore/omnivore', skills: 'Classification, basic needs, labelling body parts' },
      { year: 1, topics: 'Everyday Materials: Wood, plastic, metal, glass, rock, paper', skills: 'Properties, sorting, simple testing' },
      { year: 1, topics: 'Seasonal Changes: Weather patterns, day length across seasons', skills: 'Observation, recording data, comparative questions' },
      { year: 1, topics: 'Humans: Senses, body parts, staying healthy', skills: 'Sensory investigation, hygiene, exercise and diet' },
      { year: 1, topics: 'Working Scientifically: Asking questions, observing closely, performing tests', skills: 'Scientific enquiry, data collection, drawing conclusions' },
      { year: 2, topics: 'Plants: Seeds and bulbs, growth requirements, life cycles', skills: 'Comparative experiments, measuring, recording growth' },
      { year: 2, topics: 'Animals: Life cycles, basic needs for survival, exercise and hygiene', skills: 'Stages of development, food chains, offspring' },
      { year: 2, topics: 'Living Things & Habitats: Microhabitats, food chains, adaptation', skills: 'Habitat exploration, simple food chains, basic needs' },
      { year: 2, topics: 'Materials: Suitability, changing shape, recycling', skills: 'Properties investigation, bending/twisting/stretching' },
      { year: 2, topics: 'Human Body: Growth, nutrition, exercise, hygiene', skills: 'Balanced diet, effects of exercise, dental health' },
      { year: 2, topics: 'Working Scientifically: Pattern seeking, comparative tests, using equipment', skills: 'Fair testing, data logging, conclusion writing' }
    ],
    ks2: [
      { year: 3, topics: 'Plants: Functions of parts, growth requirements, water transport, flowers', skills: 'Investigating conditions, life cycles, pollination' },
      { year: 3, topics: 'Animals: Nutrition, skeletons, muscles', skills: 'Diet types, vertebrate/invertebrate skeletons, movement' },
      { year: 3, topics: 'Rocks: Types, fossils, soils', skills: 'Classification, permeability, fossil formation' },
      { year: 3, topics: 'Light: Sources, shadows, reflective surfaces, sun safety', skills: 'Shadow investigation, light travel, opaque/translucent/transparent' },
      { year: 3, topics: 'Forces & Magnets: Contact/non-contact forces, magnetic attraction/repulsion', skills: 'Force measurement, magnetic materials, poles investigation' },
      { year: 3, topics: 'Working Scientifically: Systematic enquiry, accurate measurement, prediction', skills: 'Variables, tables and graphs, scientific explanations' },
      { year: 4, topics: 'Living Things: Classification keys, environments, human impact', skills: 'Classification, habitat change, conservation' },
      { year: 4, topics: 'Animals: Digestive system, food chains, teeth types', skills: 'Digestion stages, predator-prey, dental care' },
      { year: 4, topics: 'States of Matter: Solids, liquids, gases, heating/cooling, water cycle', skills: 'Particle theory, evaporation, condensation, freezing' },
      { year: 4, topics: 'Sound: Vibration, pitch, volume, ear structure', skills: 'Sound source investigation, pattern seeking, insulation' },
      { year: 4, topics: 'Electricity: Simple circuits, conductors, insulators, switches', skills: 'Circuit building, fault finding, electrical safety' },
      { year: 4, topics: 'Working Scientifically: Asking relevant questions, setting up fair tests', skills: 'Precision measurements, data analysis, evidence-based conclusions' },
      { year: 5, topics: 'Living Things: Life cycles of plants and animals, reproduction', skills: 'Comparative life cycles, pollination, seed dispersal' },
      { year: 5, topics: 'Animals: Human development, puberty, gestation periods', skills: 'Growth stages, animal/human comparison, health' },
      { year: 5, topics: 'Properties & Changes: Dissolving, separation, reversible/irreversible changes', skills: 'Filtration, evaporation, sieving, chemical reactions' },
      { year: 5, topics: 'Earth & Space: Solar system, day/night, planetary motion', skills: 'Model building, scale, orbital periods' },
      { year: 5, topics: 'Forces: Gravity, air resistance, water resistance, friction, levers/pulleys', skills: 'Force investigation, mechanisms, streamlining' },
      { year: 5, topics: 'Working Scientifically: Planning investigations, taking precise measurements', skills: 'Independent variable identification, repeatability, conclusions' },
      { year: 6, topics: 'Living Things: Classification of organisms, broad kingdoms, microorganisms', skills: 'Taxonomic classification, helpful/harmful microbes' },
      { year: 6, topics: 'Animals: Circulatory system, heart, blood vessels, transport of nutrients', skills: 'Heart dissection (model), blood composition, lifestyle effects' },
      { year: 6, topics: 'Evolution & Inheritance: Fossils, adaptation, natural selection', skills: 'Evidence for evolution, Charles Darwin, selective breeding' },
      { year: 6, topics: 'Light: How we see, shadows, reflection, refraction', skills: 'Light travel, periscopes, colour spectrum' },
      { year: 6, topics: 'Electricity: Voltage, circuit components, symbols, resistance', skills: 'Series/parallel circuits, variable resistors, circuit diagrams' },
      { year: 6, topics: 'Working Scientifically: Designing own experiments, systematic recording', skills: 'Scientific enquiry types, data presentation, drawing conclusions' }
    ],
    ks3: [
      { year: 7, topics: 'Cells: Structure, microscope use, specialised cells, unicellular organisms', skills: 'Cell observation, drawing, cell model building' },
      { year: 7, topics: 'Particle Model: States, diffusion, gas pressure, changes of state', skills: 'Particle diagrams, modelling, energy transfer' },
      { year: 7, topics: 'Forces: Contact/non-contact forces, balanced/unbalanced, speed', skills: 'Force diagrams, speed=d/t, motion graphs' },
      { year: 7, topics: 'Reproduction: Human reproduction, plant reproduction, menstrual cycle', skills: 'Pollination, fertilisation, foetal development' },
      { year: 7, topics: 'Atoms & Elements: Periodic table, elements/compounds, chemical reactions', skills: 'Symbols, formulae, word equations, combustion' },
      { year: 7, topics: 'Energy: Energy stores, transfers, conservation, efficiency', skills: 'Sankey diagrams, renewable resources, power' },
      { year: 8, topics: 'Digestion & Nutrition: Food groups, digestive system, enzymes', skills: 'Balanced diet, digestion stages, enzyme action' },
      { year: 8, topics: 'Chemical Reactions: Reactivity series, acids/bases, neutralisation', skills: 'pH scale, indicators, salt formation, exothermic/endothermic' },
      { year: 8, topics: 'Wave Properties: Sound waves, light waves, reflection, refraction', skills: 'Wave diagram, frequency/wavelength, colour filters' },
      { year: 8, topics: 'Electricity & Magnetism: Circuits, current, voltage, magnetic fields', skills: 'Circuit measurements, Ohm\'s law intro, electromagnets' },
      { year: 8, topics: 'Breathing & Respiration: Gas exchange, aerobic/anaerobic respiration', skills: 'Lung structure, breathing mechanism, exercise effects' },
      { year: 8, topics: 'Earth Systems: Rock cycle, atmosphere, carbon cycle', skills: 'Geological processes, composition, climate change' },
      { year: 9, topics: 'Inheritance: DNA, genes, chromosomes, variation, natural selection', skills: 'Punnett squares, genetic diagrams, selective breeding' },
      { year: 9, topics: 'Chemical Bonding: Ionic, covalent, metallic bonding', skills: 'Bonding diagrams, properties, structure-property links' },
      { year: 9, topics: 'Motion & Forces: Acceleration, Newton\'s Laws, stopping distances', skills: 'v=u+at, F=ma, thinking distance, braking' },
      { year: 9, topics: 'Ecosystems: Interdependence, feeding relationships, carbon/nitrogen cycles', skills: 'Quadrats, transects, food web analysis, recycling' },
      { year: 9, topics: 'Reactants & Products: Moles, conservation of mass, energy changes', skills: 'Balanced equations, reaction types, bond energies' },
      { year: 9, topics: 'Electromagnetism: Magnetic fields of currents, motors, generators', skills: 'Fleming\'s left hand rule, motor effect, induction' }
    ],
    ks4: [
      { year: 10, topics: 'Biology: Cell biology — prokaryotes/eukaryotes, cell division, stem cells', skills: 'Microscopy, mitosis, therapeutic cloning debate' },
      { year: 10, topics: 'Chemistry: Atomic structure — isotopes, electron shells, periodic table trends', skills: 'Electronic configuration, group properties, Mendeleev' },
      { year: 10, topics: 'Physics: Energy — kinetic, potential, specific heat capacity, power', skills: 'Energy equations, efficiency, energy sources' },
      { year: 10, topics: 'Biology: Organisation — digestive, circulatory, respiratory systems', skills: 'Enzyme practical, heart dissection, gas exchange' },
      { year: 10, topics: 'Chemistry: Quantitative chemistry — moles, concentration, limiting reactants', skills: 'Reacting masses, titration calculations, yields' },
      { year: 10, topics: 'Physics: Electricity — circuits, Ohm\'s law, series/parallel, mains electricity', skills: 'IV characteristics, resistance, power, AC/DC' },
      { year: 11, topics: 'Biology: Inheritance, variation, evolution — DNA, genes, natural selection', skills: 'Genetic crosses, classification, evidence for evolution' },
      { year: 11, topics: 'Chemistry: Chemical changes — reactivity, electrolysis, energy changes', skills: 'Extraction methods, electroplating, bond energy calculations' },
      { year: 11, topics: 'Physics: Forces & motion — Newton\'s Laws, momentum, pressure', skills: 'Calculations, terminal velocity, moments' },
      { year: 11, topics: 'Biology: Ecology — adaptations, food chains, biodiversity, carbon cycle', skills: 'Sampling techniques, human impact, conservation' },
      { year: 11, topics: 'Chemistry: Organic chemistry — hydrocarbons, polymers, functional groups', skills: 'Fractional distillation, cracking, addition polymerisation' },
      { year: 11, topics: 'Physics: Waves & EM spectrum — wave properties, electromagnetic spectrum', skills: 'Reflection/refraction, wave speed, EM wave uses' }
    ]
  },

  geography: {
    eyfs: [
      { topics: 'Our Local Area: Home, school, community, routes', skills: 'Spatial awareness, direction, map making' },
      { topics: 'Weather & Seasons: Daily weather, seasonal patterns, clothing', skills: 'Observation, recording, weather vocabulary' },
      { topics: 'Maps & Plans: Simple maps, symbols, journey sticks', skills: 'Map reading, aerial views, drawing plans' },
      { topics: 'People & Places: Where we live, journeys, cultural celebrations', skills: 'Place knowledge, diversity, similarities/differences' },
      { topics: 'Natural World: Forests, beaches, parks, gardens', skills: 'Environmental awareness, care for nature, exploration' },
      { topics: 'Habitats: Minibeast homes, bird nests, pond life', skills: 'Habitat exploration, simple food chains, life cycles' }
    ],
    ks1: [
      { year: 1, topics: 'Our School Grounds: Mapping, human/physical features, fieldwork', skills: 'Simple map creation, observation, questioning' },
      { year: 1, topics: 'The UK: Countries, capitals, seas surrounding UK', skills: 'Map skills, atlas use, locational knowledge' },
      { year: 1, topics: 'Weather Patterns: UK weather, seasonal changes, weather recording', skills: 'Chart making, data collection, comparison' },
      { year: 1, topics: 'Continents & Oceans: 7 continents, 5 oceans, globe skills', skills: 'World map knowledge, directional language' },
      { year: 1, topics: 'Hot & Cold Places: Equator, poles, contrasting environments', skills: 'Temperature comparison, clothing, adaptation' },
      { year: 1, topics: 'Local Area Study: Shops, houses, transport, fieldwork', skills: 'Field sketching, tally charts, local knowledge' },
      { year: 2, topics: 'Our Local Area: Comparison with non-European location', skills: 'Physical/human features, aerial photos, map contrast' },
      { year: 2, topics: 'Small Area in Kenya: Contrasting locality, African savannah', skills: 'Cultural awareness, physical geography comparison' },
      { year: 2, topics: 'Seas & Coasts: UK coastline, beach environments, tourism', skills: 'Coastal features, environmental impact, map skills' },
      { year: 2, topics: 'Food & Farming: Where food comes from, farm types, seasonality', skills: 'Food origin knowledge, farming types, fair trade' },
      { year: 2, topics: 'Journeys: Transport types, route planning, compass directions', skills: 'N/S/E/W, simple routes, journey mapping' },
      { year: 2, topics: 'Map Skills: Compass, symbols, keys, aerial photography', skills: 'Bing maps, OS symbols, grid references' }
    ],
    ks2: [
      { year: 3, topics: 'UK Geography: Regions, counties, cities, physical features', skills: 'OS maps, grid references, digital mapping' },
      { year: 3, topics: 'Mountains: Formation, UK ranges, mountain environments', skills: 'Contour lines, altitude, tourism impacts' },
      { year: 3, topics: 'Rivers: Water cycle, river features, course, flooding', skills: 'Fieldwork, measuring, erosion/deposition' },
      { year: 3, topics: 'Settlements: Types, land use, settlement patterns', skills: 'Site factors, land use mapping, change over time' },
      { year: 3, topics: 'Europe: Countries, capitals, physical features, culture', skills: 'Map knowledge, comparison, cultural diversity' },
      { year: 3, topics: 'Volcanoes & Earthquakes: Structure, plate tectonics, effects', skills: 'Physical processes, hazard understanding, Pompeii' },
      { year: 4, topics: 'World Climates: Climate zones, biomes, vegetation belts', skills: 'Climate graphs, biome comparison, adaptation' },
      { year: 4, topics: 'Rainforests: Location, layers, biodiversity, deforestation', skills: 'Environmental issues, sustainability, ecosystem study' },
      { year: 4, topics: 'Water Cycle: Processes, rivers, flooding, water scarcity', skills: 'River fieldwork, flood defence, water conservation' },
      { year: 4, topics: 'Map Skills: 4/6 figure grid references, scale, contour lines', skills: 'OS map appreciation, route planning, distance calculation' },
      { year: 4, topics: 'South America: Countries, Amazon, Andes, human geography', skills: 'Contrasting region, indigenous cultures, urbanisation' },
      { year: 4, topics: 'Sustainability: Recycling, renewable energy, carbon footprint', skills: 'Environmental impact, personal action, debate' },
      { year: 5, topics: 'North America: USA/Canada, physical and human features', skills: 'Comparative study, migration, economic activity' },
      { year: 5, topics: 'Trade & Economics: Global supply chains, fair trade, imports/exports', skills: 'Economic geography, ethical consumption, interdependence' },
      { year: 5, topics: 'Biomes: Tundra, desert, grassland, forest, aquatic', skills: 'Climate adaptation, plant/animal adaptations, biodiversity' },
      { year: 5, topics: 'Population: Distribution, density, migration, urbanisation', skills: 'Population pyramids, push/pull factors, megacities' },
      { year: 5, topics: 'Coastal Processes: Erosion, deposition, management, landforms', skills: 'Coastal fieldwork, longshore drift, defence strategies' },
      { year: 5, topics: 'Fieldwork: Data collection, sketch maps, GIS, conclusions', skills: 'Geographical enquiry, presentation, evaluation' },
      { year: 6, topics: 'Globalisation: Interconnected world, economic systems, cultural exchange', skills: 'Global citizenship, TNCs, spread of culture' },
      { year: 6, topics: 'Climate Change: Causes, effects, mitigation, adaptation', skills: 'Carbon cycle, greenhouse effect, COP, personal action' },
      { year: 6, topics: 'Energy: Sources, renewable vs non-renewable, sustainability', skills: 'Energy mix, wind/solar/hydro, national grid' },
      { year: 6, topics: 'Development: HDI, inequality, aid, sustainable development goals', skills: 'Development indicators, quality of life, SDG awareness' },
      { year: 6, topics: 'Geographical Skills: OS maps, GIS, field sketches, data presentation', skills: 'Kite diagrams, line graphs, scatter graphs, choropleth' },
      { year: 6, topics: 'Local Environmental Issue: Investigation, data collection, presentation', skills: 'Independent enquiry, fieldwork, action planning' }
    ],
    ks3: [
      { year: 7, topics: 'Map Skills: OS maps, grid references, scale, relief', skills: 'Map reading, GIS introduction, navigation' },
      { year: 7, topics: 'Settlement: Site, situation, land use, urbanisation', skills: 'CBD characteristics, Burgess model, urban issues' },
      { year: 7, topics: 'Weather & Climate: UK weather, climate graphs, extreme weather', skills: 'Synoptic charts, microclimate investigation, storm events' },
      { year: 7, topics: 'Population: Distribution, density, migration, DTM', skills: 'Demographic Transition Model, push/pull factors' },
      { year: 7, topics: 'Rivers: Processes, landforms, flooding, management', skills: 'Fieldwork, hydrographs, flood risk mapping' },
      { year: 7, topics: 'Africa: Physical geography, development, diverse cultures', skills: 'Contrasting perceptions, development indicators, case studies' },
      { year: 8, topics: 'Tectonics: Plate boundaries, volcanoes, earthquakes, tsunamis', skills: 'Hazard mapping, prediction, preparedness, case studies' },
      { year: 8, topics: 'Coasts: Processes, landforms, management, erosion', skills: 'Coastal defence evaluation, GIS, conflict resolution' },
      { year: 8, topics: 'Asia: China, India, physical and human geography', skills: 'Comparative study, economic growth, environmental challenges' },
      { year: 8, topics: 'Development Gap: Causes, consequences, solutions, aid', skills: 'Fair trade analysis, NGO case study, SDGs' },
      { year: 8, topics: 'Ecosystems: Tropical rainforests, deserts, cold environments', skills: 'Biodiversity, adaptation, sustainable management' },
      { year: 8, topics: 'Resources: Food, water, energy security, sustainability', skills: 'Resource management, global inequalities, solutions' },
      { year: 9, topics: 'Climate Change: Natural/human causes, impacts, responses', skills: 'Evidence analysis, mitigation strategies, international agreements' },
      { year: 9, topics: 'Globalisation: TNCs, trade, cultural diffusion, inequality', skills: 'Global supply chains, ethical consumerism' },
      { year: 9, topics: 'Middle East: Physical, human, conflict, resources', skills: 'Oil economy, water scarcity, geopolitical analysis' },
      { year: 9, topics: 'Ice Environments: Glaciers, ice sheets, glacial processes, change', skills: 'Glacial landforms, climate change impacts, tourism' },
      { year: 9, topics: 'Geographical Skills: Statistical analysis, GIS, fieldwork techniques', skills: 'Data manipulation, dispersion graphs, decision-making' },
      { year: 9, topics: 'Sustainability: Sustainable cities, transport, energy, living', skills: 'Carbon footprint, urban planning, individual action' }
    ],
    ks4: [
      { year: 10, topics: 'Natural Hazards: Tectonic, weather, climate change', skills: 'Hazard management, risk assessment, case study analysis' },
      { year: 10, topics: 'Living World: Ecosystems, tropical rainforests, cold environments', skills: 'Nutrient cycle, food webs, sustainable management' },
      { year: 10, topics: 'Physical Landscapes: Rivers, coasts, glacial landscapes', skills: 'Processes, landforms, management strategies, fieldwork' },
      { year: 10, topics: 'Urban Issues: Urbanisation, megacities, urban sustainability', skills: 'Comparative urban study, regeneration, sustainable cities' },
      { year: 10, topics: 'Changing Economic World: Development, NEEs, UK economy', skills: 'DTM, aid vs trade, economic sectors, regional inequality' },
      { year: 10, topics: 'Resource Management: Food, water, energy, sustainable solutions', skills: 'Resource security, management strategies, sustainable living' },
      { year: 11, topics: 'Issue Evaluation: Pre-release resource analysis, decision making', skills: 'Critical thinking, synoptic linkages, evidence evaluation' },
      { year: 11, topics: 'Fieldwork: Physical and human geography fieldwork skills', skills: 'Methodology, data presentation, conclusions, evaluation' },
      { year: 11, topics: 'Geographical Applications: Geographical skills, cartographic, graphical', skills: 'OS maps, cross sections, photo interpretation' },
      { year: 11, topics: 'Revision: Physical geography — hazards, landscapes, ecosystems', skills: 'Case study recall, processes, exam technique' },
      { year: 11, topics: 'Revision: Human geography — urban, economic, resources', skills: 'Synoptic thinking, evaluation skills, timed responses' },
      { year: 11, topics: 'Decision Making Exercise: Geographical reasoning, justification', skills: 'Balanced argument, justification, communication' }
    ]
  },

  history: {
    eyfs: [
      { topics: 'My Personal History: Family, baby photos, growth timeline', skills: 'Chronology, memory, change over time' },
      { topics: 'Past Events: Festivals, celebrations, birthdays', skills: 'Sequence, recall, difference between past/present' },
      { topics: 'Famous People: Historical figures, significant individuals', skills: 'Stories from past, contribution, impact' },
      { topics: 'Old & New: Toys, transport, homes then and now', skills: 'Comparison, change, artefacts' },
      { topics: 'Stories from Past: Traditional tales, historical stories', skills: 'Listening, imagination, moral understanding' },
      { topics: 'Time Vocabulary: Yesterday/today/tomorrow, days, months', skills: 'Temporal language, calendar awareness, seasons' }
    ],
    ks1: [
      { year: 1, topics: 'Changes Within Living Memory: Toys, homes, technology', skills: 'Primary sources, comparison, chronological order' },
      { year: 1, topics: 'The Gunpowder Plot: Guy Fawkes, 1605, Bonfire Night', skills: 'Cause/consequence, historical narrative' },
      { year: 1, topics: 'Kings & Queens: Monarchs, significant rulers, castles', skills: 'Monarchy concept, timeline, significant people' },
      { year: 1, topics: 'Remembrance: WWI, poppies, why we remember', skills: 'Significance, respect, commemoration' },
      { year: 1, topics: 'Great Fire of London: 1666, Samuel Pepys, rebuilding', skills: 'Diary evidence, cause/effect, change' },
      { year: 1, topics: 'Explorers: Columbus, Armstrong, Gagarin, Hillary', skills: 'Significance, comparison, impact of exploration' },
      { year: 2, topics: 'Florence Nightingale: Crimean War, nursing, legacy', skills: 'Significant individual, sources, change over time' },
      { year: 2, topics: 'The Great Fire of London: Deeper study, evidence', skills: 'Historical sources, interpretation, consequence' },
      { year: 2, topics: 'Neil Armstrong: Space race, Moon landing 1969', skills: 'Chronology, significance, technological change' },
      { year: 2, topics: 'Local History: Our school, town, significant local event', skills: 'Local sources, enquiry, change' },
      { year: 2, topics: 'Mary Seacole: Jamaican nurse, Crimean War, equality', skills: 'Diverse history, significance, comparison with Nightingale' },
      { year: 2, topics: 'Transport Through Time: From horse to space travel', skills: 'Chronological development, impact on life' }
    ],
    ks2: [
      { year: 3, topics: 'Stone Age: Hunter-gatherers, Skara Brae, stone circles', skills: 'Prehistory, evidence from artefacts, change' },
      { year: 3, topics: 'Bronze & Iron Ages: Metalworking, hill forts, Iron Age life', skills: 'Technological progress, settlement, continuity' },
      { year: 3, topics: 'Ancient Egypt: Pharaohs, pyramids, hieroglyphs, mummification', skills: 'Civilisation, sources, beliefs' },
      { year: 3, topics: 'Ancient Egypt Daily Life: Society, farming, religion', skills: 'Social structure, primary sources, comparison' },
      { year: 3, topics: 'Local History Study: Roman or Anglo-Saxon local settlement', skills: 'Local evidence, maps, museum enquiry' },
      { year: 3, topics: 'Archaeology: How we know about the past, excavation, dating', skills: 'Historical methods, evidence types, interpretation' },
      { year: 4, topics: 'Roman Britain: Invasion, Boudicca, Hadrian\'s Wall, Romanisation', skills: 'Cause/consequence, resistance, legacy' },
      { year: 4, topics: 'Roman Empire: Expansion, army, daily life, Pompeii', skills: 'Empire concept, sources, civilisation comparison' },
      { year: 4, topics: 'Anglo-Saxons: Settlement, kingdoms, art, Sutton Hoo', skills: 'Migration, identity, archaeological evidence' },
      { year: 4, topics: 'Vikings: Raids, settlement, Danelaw, King Alfred', skills: 'Conflict, integration, historical interpretation' },
      { year: 4, topics: 'Ancient Greece: Democracy, Olympics, theatre, philosophy', skills: 'Legacy of civilisation, comparison, influence on UK' },
      { year: 4, topics: 'Ancient Greece: Athens vs Sparta, Alexander the Great', skills: 'Contrasting societies, military strategy, cultural spread' },
      { year: 5, topics: 'Anglo-Saxons & Vikings: Struggle for England, 1066', skills: 'Chronological narrative, cause, consequence' },
      { year: 5, topics: 'Norman Conquest: Battle of Hastings, Domesday Book, castles', skills: 'Interpretation of sources, Norman impact, feudalism' },
      { year: 5, topics: 'Medieval Life: Castles, knights, peasants, black death', skills: 'Feudal system, change, significance of plague' },
      { year: 5, topics: 'Islamic Civilisation: Baghdad 900CE, House of Wisdom, scholars', skills: 'Non-European civilisation, cultural diffusion, legacy' },
      { year: 5, topics: 'Maya Civilisation: Number system, calendar, cities, decline', skills: 'Advanced civilisation, comparison, source interpretation' },
      { year: 5, topics: 'Benin Kingdom: West African civilisation, art, trade, Oba', skills: 'African civilisation, oral tradition, European contact' },
      { year: 6, topics: 'Tudors: Henry VIII, Reformation, Elizabeth I, Spanish Armada', skills: 'Monarch power, religious change, interpretations' },
      { year: 6, topics: 'Stuarts: Civil War, Cromwell, Restoration, Great Plague 1665', skills: 'Conflict, revolution, change in government' },
      { year: 6, topics: 'Transatlantic Slave Trade: Triangular trade, abolition, legacy', skills: 'Cause/consequence, moral issues, resistance' },
      { year: 6, topics: 'Victorian Britain: Industry, empire, social reform, children', skills: 'Industrialisation, social change, primary sources' },
      { year: 6, topics: 'WWI: Causes, trench warfare, home front, Armistice', skills: 'Causes, experience, remembrance, significance' },
      { year: 6, topics: 'WWII & Post-war: Blitz, evacuation, Holocaust, NHS creation', skills: 'Global conflict, human cost, social change' }
    ],
    ks3: [
      { year: 7, topics: 'Norman Conquest: 1066, battles, feudal system, castles', skills: 'Source analysis, interpretation, significance' },
      { year: 7, topics: 'Medieval Life: Church, monarchy, peasants, crusades', skills: 'Medieval society, power structures, cause/consequence' },
      { year: 7, topics: 'Magna Carta: 1215, King John, origins of parliament', skills: 'Government origins, rights, significance' },
      { year: 7, topics: 'Black Death: 1348, causes, spread, social/economic impact', skills: 'Consequence, source analysis, change' },
      { year: 7, topics: 'Peasants\' Revolt: 1381, Wat Tyler, causes, failure', skills: 'Rebellion, cause/consequence, historical interpretation' },
      { year: 7, topics: 'Medieval African Kingdoms: Mali, Ghana, Songhai, Mansa Musa', skills: 'Diverse history, wealth, cultural achievement' },
      { year: 8, topics: 'Tudors: Reformation, dissolution, Elizabethan England', skills: 'Religious change, government, interpretations' },
      { year: 8, topics: 'English Civil War: Causes, battles, Cromwell, republic', skills: 'Conflict, revolution, trial of Charles I' },
      { year: 8, topics: 'Empire: British Empire, colonisation, India, impact', skills: 'Empire debate, positive/negative, post-colonial perspective' },
      { year: 8, topics: 'Transatlantic Slave Trade: Middle Passage, resistance, abolition', skills: 'Enquiry, moral debate, campaigners, legacy' },
      { year: 8, topics: 'Industrial Revolution: Factories, towns, railways, working conditions', skills: 'Change, social impact, reform movements' },
      { year: 8, topics: 'French Revolution: Causes, events, Napoleon, legacy', skills: 'Revolution, political change, historiography' },
      { year: 9, topics: 'WWI: Causes, trench warfare, technology, post-war', skills: 'Interpretations, sources, significance, remembrance' },
      { year: 9, topics: 'Inter-war: Treaty of Versailles, Great Depression, rise of dictators', skills: 'Consequences, cause of WWII, appeasement' },
      { year: 9, topics: 'WWII: Key events, Holocaust, home front, bombing, D-Day', skills: 'Global conflict, genocide, morality, interpretation' },
      { year: 9, topics: 'Post-war: Cold War, Berlin Wall, Korean/Vietnam wars, civil rights', skills: 'Superpower conflict, protest, social change' },
      { year: 9, topics: 'Civil Rights: MLK, Mandela, suffragettes, equality movements', skills: 'Protest, change, significance, contemporary relevance' },
      { year: 9, topics: 'The Holocaust: Causes, experience, responses, lessons', skills: 'Genocide study, ethical understanding, remembrance' }
    ],
    ks4: [
      { year: 10, topics: 'Germany 1890-1945: Kaiser, Weimar, Nazi rise, WWII', skills: 'Source analysis, causation, interpretation' },
      { year: 10, topics: 'Conflict & Tension 1918-1939: Treaty, League, causes of WWII', skills: 'Peacemaking, collective security, appeasement' },
      { year: 10, topics: 'Britain: Health & People — medieval to modern medicine', skills: 'Continuity/change, significance, factors' },
      { year: 10, topics: 'America 1920-1973: Boom, Depression, New Deal, civil rights', skills: 'Economic cycles, social change, inequality' },
      { year: 10, topics: 'Elizabethan England: 1568-1603, society, exploration', skills: 'Daily life, court, voyages, interpretation' },
      { year: 10, topics: 'Historic Environment: Specific site study each year', skills: 'Site analysis, utility of sources, context' },
      { year: 11, topics: 'Revision: Germany — key themes, exam technique', skills: 'Essay structure, source utility, judgement' },
      { year: 11, topics: 'Revision: Conflict & Tension — causation essays', skills: 'Narrative, analysis, evaluation, conclusions' },
      { year: 11, topics: 'Revision: Britain Health — thematic study, factors', skills: 'Cross-period connections, factor evaluation' },
      { year: 11, topics: 'Revision: America — comparison over time', skills: 'Period comparison, change, turning points' },
      { year: 11, topics: 'Revision: Elizabeth — in-depth depth study', skills: 'Detailed knowledge, sources, judgement' },
      { year: 11, topics: 'Exam Skills: Past papers, timed answers, feedback', skills: 'Technique, time management, target setting' }
    ]
  },

  // Art, Music, PE, Computing, Social (shorter, same pattern)
  art: {
    eyfs: [
      { topics: 'Exploring Colour: Primary colours, mixing, colour recognition', skills: 'Colour identification, experimentation, vocabulary' },
      { topics: 'Drawing & Mark Making: Lines, circles, patterns, self-portraits', skills: 'Fine motor, observation, representation' },
      { topics: 'Painting: Brush control, printing, sponge painting', skills: 'Technique exploration, colour mixing, texture' },
      { topics: 'Cutting & Collage: Scissors, glue, paper shapes, textures', skills: 'Fine motor, composition, design' },
      { topics: 'Modelling: Play dough, clay, junk modelling', skills: '3D thinking, manipulation, creativity' },
      { topics: 'Famous Art: Looking at artists, talking about art', skills: 'Appreciation, vocabulary, personal response' }
    ],
    ks1: [
      { year: 1, topics: 'Colour: Primary/secondary, warm/cool, colour wheel', skills: 'Mixing, naming, application' },
      { year: 1, topics: 'Drawing: Pencil, charcoal, pastels — lines, shapes, texture', skills: 'Observation, mark making, shading' },
      { year: 1, topics: 'Painting: Brush skills, washes, colour mixing', skills: 'Technique, control, expression' },
      { year: 1, topics: 'Printing: Found objects, stamps, repeating patterns', skills: 'Pattern, repetition, registration' },
      { year: 1, topics: 'Textiles: Weaving, fabrics, threads, collage', skills: 'Texture, colour, construction' },
      { year: 1, topics: '3D: Clay, plasticine, construction — pinch pots, coils', skills: 'Form, manipulation, finishing' },
      { year: 2, topics: 'Colour: Mixing tints/shades, complementary, harmonious', skills: 'Colour theory, mixing precision, expression' },
      { year: 2, topics: 'Drawing: Still life, observation, proportion', skills: 'Scale, composition, tonal range' },
      { year: 2, topics: 'Painting: Landscapes, seascapes, mixed media', skills: 'Composition, texture, atmosphere' },
      { year: 2, topics: 'Printing: Mono-printing, string printing, block printing', skills: 'Design, layering, edition' },
      { year: 2, topics: 'Textiles: Batik, tie-dye, stitching, fabric collage', skills: 'Resist techniques, pattern, decoration' },
      { year: 2, topics: 'Artists: Study of major artists, styles, periods', skills: 'Art appreciation, comparison, vocabulary' }
    ],
    ks2: [
      { year: 3, topics: 'Colour: Tertiary colours, colour harmonies, mood', skills: 'Expressive colour, colour planning' },
      { year: 3, topics: 'Drawing: Perspective, shading techniques, hatching/cross-hatching', skills: 'Depth, tone, texture' },
      { year: 3, topics: 'Painting: Watercolour techniques, washes, wet-on-wet', skills: 'Transparency, layering, control' },
      { year: 3, topics: 'Sculpture: Clay modelling, armatures, papier-mache', skills: 'Form, construction, finishing' },
      { year: 3, topics: 'Printing: Reduction printing, lino printing, layering', skills: 'Multi-colour printing, registration' },
      { year: 3, topics: 'Art History: Prehistoric art, cave paintings, Stone Age', skills: 'Historical context, materials, purpose' },
      { year: 4, topics: 'Drawing: Figure drawing, proportion, movement', skills: 'Gesture, anatomy, dynamic composition' },
      { year: 4, topics: 'Painting: Acrylic techniques, impasto, glazing', skills: 'Texture, opacity, layering' },
      { year: 4, topics: 'Printing: Screen printing, stencils, photographic', skills: 'Multi-layer, registration, design' },
      { year: 4, topics: 'Textiles: Embroidery, applique, fabric painting', skills: 'Decoration, pattern, colour' },
      { year: 4, topics: 'Digital Art: Photo editing, digital painting, animation', skills: 'Software skills, composition, creativity' },
      { year: 4, topics: 'Art History: Roman art, mosaics, frescoes, sculpture', skills: 'Ancient techniques, preservation, legacy' },
      { year: 5, topics: 'Drawing: Charcoal, chalk, ink — expressive techniques', skills: 'Contrast, atmosphere, emotion' },
      { year: 5, topics: 'Painting: Oil pastels, chalk pastels, mixed media', skills: 'Blending, layering, texture creation' },
      { year: 5, topics: 'Sculpture: Wire, recycled materials, plaster, carving', skills: '3D design, sustainability, technique' },
      { year: 5, topics: 'Collage: Mixed media, photomontage, layering', skills: 'Composition, texture, meaning' },
      { year: 5, topics: 'Architecture: Famous buildings, design, scale models', skills: 'Spatial design, structure, aesthetics' },
      { year: 5, topics: 'Art History: Renaissance art — da Vinci, Michelangelo, Raphael', skills: 'Techniques, perspective, patronage' },
      { year: 6, topics: 'Drawing: Advanced techniques, composition, narrative', skills: 'Storytelling, symbolism, personal style' },
      { year: 6, topics: 'Painting: Abstract, impressionism, expressionism styles', skills: 'Movement study, interpretation, personal response' },
      { year: 6, topics: 'Printing: Combining techniques, artists\' books', skills: 'Edition, presentation, narrative' },
      { year: 6, topics: 'Digital Art: 3D modelling, animation, graphic design', skills: 'Digital creation, design process, outcomes' },
      { year: 6, topics: 'Installation: Site-specific, environmental, community art', skills: 'Spatial awareness, audience, message' },
      { year: 6, topics: 'Art History: Modern/contemporary art — movements, critique', skills: 'Critical analysis, personal interpretation' }
    ],
    ks3: [
      { year: 7, topics: 'Elements of Art: Line, tone, colour, shape, form, texture, pattern', skills: 'Formal elements, observation, technique exploration' },
      { year: 7, topics: 'Drawing Skills: Tone, perspective, proportion, composition', skills: 'Observational drawing, mark making, spatial awareness' },
      { year: 7, topics: 'Colour Theory: Wheel, harmonies, contrast, mood', skills: 'Mixing, application, expression' },
      { year: 7, topics: 'Painting: Techniques, colour mixing, brushwork, styles', skills: 'Watercolour, acrylic, gouache techniques' },
      { year: 7, topics: '3D Design: Clay, wire, found objects, construction', skills: 'Form, space, texture, construction methods' },
      { year: 7, topics: 'Art History: Critical analysis, movements, context', skills: 'Formal analysis, terminology, evaluation' },
      { year: 8, topics: 'Portraiture: Proportion, expression, style, self-portraits', skills: 'Anatomy, likeness, expression, media exploration' },
      { year: 8, topics: 'Landscape: Perspective, atmosphere, composition, artists', skills: 'Depth, mood, observation, environmental response' },
      { year: 8, topics: 'Pattern & Texture: Surface design, repeat patterns, textiles', skills: 'Design, rhythm, cultural patterns' },
      { year: 8, topics: 'Printmaking: Lino, screen, monoprint, collagraph', skills: 'Registration, layering, editioning' },
      { year: 8, topics: 'Digital Media: Photography, digital manipulation, animation', skills: 'Composition, editing, narrative' },
      { year: 8, topics: 'Art Movements: Impressionism, Post-Impressionism, Cubism', skills: 'Style analysis, artist research, practical response' },
      { year: 9, topics: 'Figurative Art: Anatomy, movement, expression, narrative', skills: 'Proportion, gesture, storytelling' },
      { year: 9, topics: 'Abstract Art: Composition, colour field, geometric, expression', skills: 'Non-representational, formal elements, meaning' },
      { year: 9, topics: 'Mixed Media: Combining materials, techniques, found objects', skills: 'Experimentation, layering, personal response' },
      { year: 9, topics: 'Sculpture: Relief, in-the-round, installation, environmental', skills: 'Spatial awareness, materials, concept' },
      { year: 9, topics: 'Graphic Design: Typography, layout, branding, illustration', skills: 'Design process, brief, target audience' },
      { year: 9, topics: 'Art Movements: Pop Art, Surrealism, Contemporary Art', skills: 'Cultural context, critical analysis, personal response' }
    ],
    ks4: [
      { year: 10, topics: 'GCSE Portfolio: Observational drawing, recording ideas', skills: 'Primary sources, sketchbook practice, annotation' },
      { year: 10, topics: 'GCSE Portfolio: Media experimentation, technique development', skills: 'Painting, printmaking, sculpture, digital exploration' },
      { year: 10, topics: 'GCSE Portfolio: Artist research, critical analysis', skills: 'Contextual understanding, written analysis, connections' },
      { year: 10, topics: 'GCSE Portfolio: Idea development, refinement, outcomes', skills: 'Creative process, problem solving, evaluation' },
      { year: 10, topics: 'GCSE Portfolio: Personal project planning, themes', skills: 'Independent direction, research, intention' },
      { year: 10, topics: 'GCSE Portfolio: Mock exam, timed outcomes', skills: 'Time management, completion, presentation' },
      { year: 11, topics: 'GCSE Externally Set Assignment: Preparatory work', skills: 'Theme exploration, idea development, experimentation' },
      { year: 11, topics: 'GCSE ESA: Final outcome planning and creation', skills: 'Sustained focus, technique, realisation' },
      { year: 11, topics: 'GCSE Portfolio: Completion and refinement', skills: 'Review, edit, present' },
      { year: 11, topics: 'Portfolio Presentation: Curation, layout, annotation', skills: 'Display, mount, statement writing' },
      { year: 11, topics: 'Revision & Evaluation: Portfolio review, target setting', skills: 'Self-assessment, improvement, examination preparation' },
      { year: 11, topics: 'Post-16 Pathways: Art foundation, A-level, career routes', skills: 'Portfolio building, progression, professional practice' }
    ]
  },

  music: {
    eyfs: [
      { topics: 'Exploring Sounds: Body percussion, everyday sounds, instruments', skills: 'Listening, sound discrimination, imitation' },
      { topics: 'Singing: Nursery rhymes, action songs, call and response', skills: 'Pitch matching, rhythm, memory' },
      { topics: 'Rhythm: Steady beat, clapping patterns, simple percussion', skills: 'Beat keeping, pattern recognition, coordination' },
      { topics: 'Dynamics & Tempo: Loud/quiet, fast/slow, changes', skills: 'Musical vocabulary, expression, response' },
      { topics: 'Movement: Dance, free movement, musical statues', skills: 'Gross motor, creative movement, listening' },
      { topics: 'Listening: Different genres, moods, instruments', skills: 'Active listening, preference, discussion' }
    ],
    ks1: [
      { year: 1, topics: 'Pulse & Rhythm: Steady beat, rhythm patterns, notation', skills: 'Beat keeping, rhythm reading, performance' },
      { year: 1, topics: 'Pitch: High/low, melody shape, tuned percussion', skills: 'Pitch discrimination, singing accuracy, glockenspiel' },
      { year: 1, topics: 'Instruments: Percussion, classroom instruments, correct technique', skills: 'Instrument names, playing technique, care' },
      { year: 1, topics: 'Composition: Improvisation, graphic scores, sound stories', skills: 'Creativity, notation, structure' },
      { year: 1, topics: 'Listening: Classical, folk, world music, musical elements', skills: 'Active listening, vocabulary, opinion' },
      { year: 1, topics: 'Performance: Class ensemble, simple songs, audience skills', skills: 'Confidence, ensemble, stage presence' },
      { year: 2, topics: 'Rhythm: Note values (crotchet, quaver, minim), time signatures', skills: 'Note reading, rhythm composition, ensemble' },
      { year: 2, topics: 'Melody: Pentatonic scale, simple melodies, notation', skills: 'Staff notation, melodic shape, composition' },
      { year: 2, topics: 'Timbre & Texture: Instrument families, layers, accompaniment', skills: 'Instrument recognition, texture description' },
      { year: 2, topics: 'Structure: Call and response, verse/chorus, rondo', skills: 'Form recognition, composition, analysis' },
      { year: 2, topics: 'Genres: Different musical styles, cultural music', skills: 'Genre recognition, style features, appreciation' },
      { year: 2, topics: 'Performance: Concert preparation, part singing, evaluation', skills: 'Ensemble skills, expression, self-assessment' }
    ],
    ks2: [
      { year: 3, topics: 'Recorder/Ukulele: Basic technique, simple tunes, ensemble', skills: 'Instrument hold, fingering, breath control' },
      { year: 3, topics: 'Rhythm: Dotted rhythms, syncopation, time signatures 2/4, 3/4, 4/4', skills: 'Complex rhythm reading, ensemble coordination' },
      { year: 3, topics: 'Pitch: Intervals, scales, major/minor tonality', skills: 'Aural discrimination, singing in parts, notation' },
      { year: 3, topics: 'Composition: Ostinato, drone, simple chord progressions', skills: 'Structure, layering, harmonic awareness' },
      { year: 3, topics: 'Music Technology: Sequencing, recording, editing', skills: 'Software use, multitrack, effects' },
      { year: 3, topics: 'Listening: Program music, composers, periods', skills: 'Musical analysis, context, vocabulary' },
      { year: 4, topics: 'Instrument: Continued development, ensemble playing', skills: 'Technical proficiency, musicality, sight-reading' },
      { year: 4, topics: 'Harmony: Chords I, IV, V, chord sequences, accompaniment', skills: 'Chord theory, keyboard harmony, song accompaniment' },
      { year: 4, topics: 'Structure: Binary, ternary, rondo, theme & variation', skills: 'Form analysis, composition, arrangement' },
      { year: 4, topics: 'Composition: Songwriting, lyrics, melody writing', skills: 'Creative process, structure, expression' },
      { year: 4, topics: 'World Music: African drumming, Gamelan, Samba', skills: 'Cultural context, rhythm patterns, ensemble skills' },
      { year: 4, topics: 'Performance: Class concert, solo/ensemble, evaluation', skills: 'Performance skills, peer assessment, target setting' },
      { year: 5, topics: 'Instrument: Advanced techniques, scales, ensemble repertoire', skills: 'Technical fluency, expression, ensemble awareness' },
      { year: 5, topics: 'Harmony & Theory: Extended chords, cadences, keys up to 2 sharps/flats', skills: 'Theoretical knowledge, analysis, composition' },
      { year: 5, topics: 'Composition: Film music, leitmotif, mood creation', skills: 'Brief response, timing, mood creation' },
      { year: 5, topics: 'Music History: Baroque, Classical, Romantic periods', skills: 'Stylistic features, composer study, period context' },
      { year: 5, topics: 'Improvisation: Blues scale, jazz, call and response', skills: 'Spontaneity, creativity, style awareness' },
      { year: 5, topics: 'Music Technology: DAW, MIDI sequencing, mixing', skills: 'Digital production, arrangement, editing' },
      { year: 6, topics: 'Instrument: Performance repertoire, technique refinement', skills: 'Artistic expression, technical mastery, musicality' },
      { year: 6, topics: 'Composition: Extended project, songwriting, production', skills: 'Independent project, creative process, outcome' },
      { year: 6, topics: 'Ensemble: Band, choir, orchestra — rehearsal skills', skills: 'Leadership, section work, blend' },
      { year: 6, topics: 'Music History: 20th Century, popular music, contemporary', skills: 'Genre evolution, cultural context, analysis' },
      { year: 6, topics: 'Performance: Leavers\' concert, solo performance, recording', skills: 'Performance maturity, presentation, recording' },
      { year: 6, topics: 'Transition: KS3 music readiness, composing portfolio', skills: 'Skills consolidation, self-directed practice' }
    ],
    ks3: [
      { year: 7, topics: 'Elements of Music: Rhythm, pitch, dynamics, tempo, texture, timbre, structure', skills: 'Musical vocabulary, aural analysis, notation' },
      { year: 7, topics: 'Keyboard Skills: Basic technique, pentatonic, chords, melody', skills: 'Hand position, coordination, sight reading' },
      { year: 7, topics: 'Rhythm & Percussion: African drumming, Samba, body percussion', skills: 'Polyrhythm, ensemble, cultural context' },
      { year: 7, topics: 'Form & Structure: Binary, ternary, rondo, theme & variation', skills: 'Form analysis, composition, arrangement' },
      { year: 7, topics: 'Programme Music: Descriptive composition, graphic scores', skills: 'Narrative, mood, musical devices' },
      { year: 7, topics: 'Voice: Singing technique, part songs, harmony', skills: 'Breath control, diction, ensemble' },
      { year: 8, topics: 'Blues & Jazz: 12-bar blues, improvisation, swing rhythm', skills: 'Chord progression, scales, style' },
      { year: 8, topics: 'Songwriting: Lyrics, chords, melody, structure', skills: 'Creative collaboration, harmonic progressions' },
      { year: 8, topics: 'Film Music: Underscore, leitmotif, Mickey Mousing', skills: 'Brief response, mood creation, timing' },
      { year: 8, topics: 'World Music: Gamelan, Bhangra, Calypso, Salsa', skills: 'Cultural context, scales, rhythm patterns' },
      { year: 8, topics: 'Music Technology: DAW, sequencing, samples, effects', skills: 'Production, arrangement, mixing' },
      { year: 8, topics: 'Ensemble: Band skills, rehearsal techniques, performance', skills: 'Leadership, teamwork, musical communication' },
      { year: 9, topics: 'Pop Music: History, genres, analysis, performance', skills: 'Style analysis, performance, technology' },
      { year: 9, topics: 'Minimalism: Terry Riley, Steve Reich, loop-based composition', skills: 'Phasing, looping, pattern-based composition' },
      { year: 9, topics: 'Electronic Music: Synthesis, drum machines, EDM production', skills: 'Sound design, sequencing, genre awareness' },
      { year: 9, topics: 'Musical Theatre: West End, Broadway, repertoire, performance', skills: 'Character, voice, staging' },
      { year: 9, topics: 'Composition: Brief-based, stylistic, extended project', skills: 'Creative independence, structure, evaluation' },
      { year: 9, topics: 'GCSE Preparation: Listening, appraising, composition skills', skills: 'Aural dictation, analysis, portfolio' }
    ]
  },

  pe: {
    eyfs: [
      { topics: 'Fundamental Movement: Running, jumping, hopping, skipping', skills: 'Gross motor, coordination, spatial awareness' },
      { topics: 'Ball Skills: Throwing, catching, rolling, kicking', skills: 'Hand-eye coordination, aiming, control' },
      { topics: 'Gymnastics: Balances, rolls, travelling, shapes', skills: 'Body control, strength, flexibility' },
      { topics: 'Dance: Creative movement, rhythm, following patterns', skills: 'Expression, coordination, sequence memory' },
      { topics: 'Games: Simple rules, turn-taking, team games', skills: 'Social skills, cooperation, competition' },
      { topics: 'Outdoor: Climbing, balancing, obstacle courses', skills: 'Risk assessment, confidence, gross motor' }
    ],
    ks1: [
      { year: 1, topics: 'Multi-skills: Running, throwing, jumping, coordination', skills: 'ABC (Agility, Balance, Coordination)' },
      { year: 1, topics: 'Gymnastics: Jumps, rolls, weight on hands, sequences', skills: 'Body control, apparatus use, sequence creation' },
      { year: 1, topics: 'Dance: Movement, rhythm, space, patterns', skills: 'Creative expression, timing, spatial awareness' },
      { year: 1, topics: 'Games: Throwing/catching, striking, simple tactics', skills: 'Cooperation, rules, attacking/defending' },
      { year: 1, topics: 'Fitness: Stamina, strength, flexibility awareness', skills: 'Body awareness, effort, health benefits' },
      { year: 1, topics: 'Swimming: Water confidence, floating, basic strokes', skills: 'Water safety, buoyancy, arm/leg action' },
      { year: 2, topics: 'Multi-skills: Speed, agility, balance, reaction time', skills: 'Athletic development, personal bests' },
      { year: 2, topics: 'Gymnastics: Sequences, partner work, apparatus', skills: 'Cooperation, composition, control' },
      { year: 2, topics: 'Dance: Creative, narrative, cultural dances', skills: 'Storytelling, style, expression' },
      { year: 2, topics: 'Invasion Games: Tag rugby, football basics, scoring', skills: 'Teamwork, space, simple tactics' },
      { year: 2, topics: 'Striking & Fielding: Rounders, cricket basics', skills: 'Hand-eye coordination, teamwork, rules' },
      { year: 2, topics: 'Swimming: Stroke development, water safety, distance', skills: 'Breathing technique, stroke efficiency' }
    ],
    ks2: [
      { year: 3, topics: 'Athletics: Sprinting, jumping, throwing techniques', skills: 'Technique, measurement, personal targets' },
      { year: 3, topics: 'Gymnastics: Flight, rotation, balance, partner work', skills: 'Control, creativity, composition' },
      { year: 3, topics: 'Dance: Styles, formation, performance', skills: 'Choreography, expression, group work' },
      { year: 3, topics: 'Invasion Games: Football, netball, hockey, basketball', skills: 'Passing, dribbling, shooting, defending' },
      { year: 3, topics: 'Net & Wall: Tennis, badminton, volleyball basics', skills: 'Racket control, rallying, serving' },
      { year: 3, topics: 'Swimming: Stroke improvement, personal survival', skills: 'Front/back crawl, breaststroke, treading water' },
      { year: 4, topics: 'Athletics: Relays, hurdles, javelin, shot put', skills: 'Technique, teamwork, measurement' },
      { year: 4, topics: 'Gymnastics: Symmetrical/asymmetrical, canon/ unison', skills: 'Partner sequences, apparatus, evaluation' },
      { year: 4, topics: 'Dance: Street dance, historical dance, composition', skills: 'Style, dynamics, performance quality' },
      { year: 4, topics: 'Invasion Games: Advanced tactics, positions, formations', skills: 'Strategy, passing patterns, game sense' },
      { year: 4, topics: 'OAA: Problem solving, orienteering, teamwork', skills: 'Communication, navigation, collaboration' },
      { year: 4, topics: 'Swimming: Distance, efficiency, water polo basics', skills: 'Endurance, technique refinement, teamwork' },
      { year: 5, topics: 'Athletics: Long jump, triple jump, discus, shot put', skills: 'Technique refinement, competition, measurement' },
      { year: 5, topics: 'Gymnastics: Counter-balance, counter-tension, flight', skills: 'Partner work, trust, creativity' },
      { year: 5, topics: 'Dance: Contemporary, jazz, performance pieces', skills: 'Expression, dynamics, spatial awareness' },
      { year: 5, topics: 'Invasion Games: Small-sided games, leadership', skills: 'Captaining, refereeing, tournament play' },
      { year: 5, topics: 'Striking & Fielding: Cricket, rounders advanced', skills: 'Bowling, batting technique, fielding positions' },
      { year: 5, topics: 'Fitness: Circuit training, heart rate, health benefits', skills: 'Exercise physiology, goal setting, perseverance' },
      { year: 6, topics: 'Athletics: Pentathlon, competition, personal bests', skills: 'Combined events, pacing, mental preparation' },
      { year: 6, topics: 'Gymnastics: Group sequences, performance, evaluation', skills: 'Choreography, feedback, improvement' },
      { year: 6, topics: 'Dance: Show piece, choreography, performance', skills: 'Creativity, staging, audience awareness' },
      { year: 6, topics: 'Invasion Games: Intra-school competition, leagues', skills: 'Sportsmanship, strategy, resilience' },
      { year: 6, topics: 'OAA: Orienteering, team challenges, leadership', skills: 'Map reading, decision making, team roles' },
      { year: 6, topics: 'Swimming: Advanced strokes, life saving, distance', skills: 'Competency, water safety, survival skills' }
    ],
    ks3: [
      { year: 7, topics: 'Athletics: Technique development, measurement, competition', skills: 'Sprint, jump, throw event specialisation' },
      { year: 7, topics: 'Gymnastics: Sequences, apparatus, evaluation', skills: 'Control, flexibility, composition' },
      { year: 7, topics: 'Dance: Styles, choreography, performance', skills: 'Rhythm, expression, technique' },
      { year: 7, topics: 'Invasion Games: Football, netball, rugby, basketball', skills: 'Core skills, game understanding, positions' },
      { year: 7, topics: 'Net/Wall: Tennis, badminton, volleyball', skills: 'Shot selection, serving, court coverage' },
      { year: 7, topics: 'Health & Fitness: Components of fitness, training methods', skills: 'Fitness testing, exercise principles, goal setting' },
      { year: 8, topics: 'Athletics: Event specialisation, competition experience', skills: 'Pacing, technique refinement, performance analysis' },
      { year: 8, topics: 'Gymnastics: Paired/group sequences, composition, evaluation', skills: 'Creative composition, synchronisation, feedback' },
      { year: 8, topics: 'Dance: Cultural, contemporary, street dance', skills: 'Style, technique, performance quality' },
      { year: 8, topics: 'Invasion Games: Tactical awareness, set plays, officiating', skills: 'Strategy, refereeing, leadership' },
      { year: 8, topics: 'Net/Wall: Doubles play, tactical awareness', skills: 'Positioning, communication, shot variation' },
      { year: 8, topics: 'OAA: Orienteering, problem solving, team challenges', skills: 'Navigation, decision making, resilience' },
      { year: 9, topics: 'Athletics: Personal training programmes, competition preparation', skills: 'Periodisation, target setting, event specialisation' },
      { year: 9, topics: 'Gymnastics: Advanced sequences, performance quality', skills: 'Fluency, difficulty, artistic impression' },
      { year: 9, topics: 'Leadership: Coaching, officiating, event organisation', skills: 'Communication, demonstration, organisation' },
      { year: 9, topics: 'Invasion Games: Advanced tactics, game analysis', skills: 'Performance analysis, strategy, decision making' },
      { year: 9, topics: 'Health & Fitness: Training programmes, fitness testing', skills: 'Programme design, data analysis, evaluation' },
      { year: 9, topics: 'GCSE Options: Taster sessions, pathways, theory introduction', skills: 'Subject knowledge, practical application' }
    ]
  },

  computing: {
    eyfs: [
      { topics: 'Technology Awareness: Tablets, computers, devices around us', skills: 'Basic operation, screen navigation, purpose' },
      { topics: 'Mouse & Touch: Clicking, dragging, tapping, swiping', skills: 'Fine motor, coordination, accuracy' },
      { topics: 'Digital Media: Taking photos, recording sound, drawing apps', skills: 'Creativity, capture, playback' },
      { topics: 'Online Safety: Stranger danger, personal information, kindness', skills: 'Safe use, privacy awareness, digital citizenship' },
      { topics: 'Algorithms: Instructions, sequencing, everyday routines', skills: 'Logical thinking, ordering, following steps' },
      { topics: 'Coding Toys: Bee-Bot, programmable toys, directional language', skills: 'Sequencing, prediction, debugging' }
    ],
    ks1: [
      { year: 1, topics: 'Technology Around Us: Computers, devices, parts, purpose', skills: 'Identification, basic use, responsible use' },
      { year: 1, topics: 'Digital Painting: Drawing software, tools, colours', skills: 'Mouse control, tool selection, creativity' },
      { year: 1, topics: 'Grouping Data: Sorting, classifying, pictograms', skills: 'Data organisation, comparison, interpretation' },
      { year: 1, topics: 'Moving a Robot: Bee-Bot, directions, sequences', skills: 'Algorithmic thinking, prediction, debugging' },
      { year: 1, topics: 'Digital Writing: Keyboard, word processor, typing', skills: 'Text entry, editing, formatting' },
      { year: 1, topics: 'Online Safety: Personal info, passwords, reporting', skills: 'Safe searching, privacy, digital footprint' },
      { year: 2, topics: 'IT Around Us: Technology in school, benefits, uses', skills: 'Recognition, purpose, comparison' },
      { year: 2, topics: 'Digital Photography: Taking, editing, organising photos', skills: 'Composition, editing tools, file management' },
      { year: 2, topics: 'Robot Algorithms: Sequences, prediction, programs', skills: 'Algorithm design, logical reasoning, debugging' },
      { year: 2, topics: 'Pictograms: Data collection, tally charts, computer graphs', skills: 'Data handling, representation, questioning' },
      { year: 2, topics: 'Making Music: Digital music, sequencing, patterns', skills: 'Pattern creation, tempo, digital tools' },
      { year: 2, topics: 'Online Safety: Email, communication, cyberbullying awareness', skills: 'Digital communication, respect, reporting' }
    ],
    ks2: [
      { year: 3, topics: 'Connecting Computers: Networks, internet, World Wide Web', skills: 'Network components, data transfer, web browsing' },
      { year: 3, topics: 'Animation: Stop-frame, onion skinning, editing', skills: 'Frame-by-frame, timing, software tools' },
      { year: 3, topics: 'Desktop Publishing: Layout, text/images, publications', skills: 'Design, audience, document creation' },
      { year: 3, topics: 'Sequencing Sounds: Scratch, blocks, sequence, events', skills: 'Programming constructs, debugging, creativity' },
      { year: 3, topics: 'Branching Databases: Yes/no questions, classification', skills: 'Logical thinking, questioning, data organisation' },
      { year: 3, topics: 'Online Safety: Age ratings, devices, screen time', skills: 'Responsible use, balance, critical thinking' },
      { year: 4, topics: 'Internet: Networks, World Wide Web, searching, reliability', skills: 'Search techniques, source evaluation, communication' },
      { year: 4, topics: 'Audio Production: Recording, editing, podcasting', skills: 'Microphone technique, multi-track, publishing' },
      { year: 4, topics: 'Photo Editing: Manipulation, effects, ethical use', skills: 'Image editing, layers, copyright awareness' },
      { year: 4, topics: 'Repetition in Shapes: Logo/Scratch, loops, patterns', skills: 'Iteration, geometric reasoning, programming' },
      { year: 4, topics: 'Data Logging: Sensors, data collection, analysis', skills: 'Scientific enquiry, graphs, interpretation' },
      { year: 4, topics: 'Online Safety: Fake news, privacy, secure passwords', skills: 'Critical evaluation, digital footprint, security' },
      { year: 5, topics: 'Systems & Searching: Search engines, ranking, algorithms', skills: 'Search strategies, page ranking, bias' },
      { year: 5, topics: 'Video Production: Filming, editing, storytelling', skills: 'Camera techniques, editing software, narrative' },
      { year: 5, topics: 'Vector Drawing: Shapes, paths, layers, tools', skills: 'Graphic design, precision, file formats' },
      { year: 5, topics: 'Selection in Quizzes: Conditions, if/else, variables', skills: 'Conditional logic, program flow, user input' },
      { year: 5, topics: 'Flat-file Databases: Records, fields, sorting, filtering', skills: 'Database concepts, querying, data analysis' },
      { year: 5, topics: 'Online Safety: Online reputation, copyright, plagiarism', skills: 'Digital ethics, intellectual property, citation' },
      { year: 6, topics: 'Communication & Collaboration: Email, forums, web', skills: 'Digital collaboration, netiquette, synchronous/asynchronous' },
      { year: 6, topics: 'Webpage Creation: HTML, CSS, site structure', skills: 'Web design, hyperlinks, media embedding' },
      { year: 6, topics: 'Spreadsheets: Cells, formulae, charts, modelling', skills: 'Data entry, calculation, what-if analysis' },
      { year: 6, topics: 'Variables in Games: Score, timer, game mechanics', skills: 'Variable use, game design, user experience' },
      { year: 6, topics: '3D Modelling: Tinkercad, shapes, grouping, space', skills: 'Spatial reasoning, design, export' },
      { year: 6, topics: 'Online Safety: Digital footprint, future implications', skills: 'Online identity, safety strategy, responsible behaviour' }
    ],
    ks3: [
      { year: 7, topics: 'Digital Literacy: File management, keyboard skills, office tools', skills: 'Efficient computing, organisation, productivity' },
      { year: 7, topics: 'Scratch Programming: Sequences, selection, variables, events', skills: 'Computational thinking, problem solving, creativity' },
      { year: 7, topics: 'E-Safety: Digital footprint, cyberbullying, sexting, reporting', skills: 'Risk awareness, responsible behaviour, support' },
      { year: 7, topics: 'Binary & Data: Binary numbers, ASCII, image representation', skills: 'Data representation, conversion, compression' },
      { year: 7, topics: 'Computer Networks: LAN, WAN, protocols, topologies', skills: 'Network structure, data transfer, security' },
      { year: 7, topics: 'Spreadsheet Modelling: Formulae, functions, charts, analysis', skills: 'Data modelling, what-if analysis, presentation' },
      { year: 8, topics: 'Python Programming: Input/output, variables, selection, loops', skills: 'Text-based coding, debugging, algorithm design' },
      { year: 8, topics: 'Media: Graphics editing, audio production, digital video', skills: 'Creative software, editing techniques, project management' },
      { year: 8, topics: 'Data Science: Data collection, cleaning, visualisation', skills: 'Data handling, ethical data use, pattern recognition' },
      { year: 8, topics: 'Cybersecurity: Threats, encryption, safe practice', skills: 'Security awareness, cryptography, risk assessment' },
      { year: 8, topics: 'Physical Computing: Micro:bit, sensors, actuators', skills: 'Hardware programming, input/output, real-world systems' },
      { year: 8, topics: 'Web Development: HTML, CSS, responsive design', skills: 'Markup, styling, accessibility, user experience' },
      { year: 9, topics: 'Python Advanced: Lists, functions, files, dictionaries', skills: 'Data structures, modular programming, file I/O' },
      { year: 9, topics: 'AI & Machine Learning: Concepts, ethics, applications', skills: 'AI awareness, bias, future implications' },
      { year: 9, topics: 'Databases: SQL, relational databases, queries', skills: 'Database design, query writing, normalisation' },
      { year: 9, topics: 'Boolean Logic: Logic gates, truth tables, circuit design', skills: 'Logical reasoning, simplification, application' },
      { year: 9, topics: 'App Development: Design, programming, testing, deployment', skills: 'Project lifecycle, user interface, functionality' },
      { year: 9, topics: 'GCSE Options: Computer science pathways, programming projects', skills: 'Project portfolio, computational thinking' }
    ],
    ks4: [
      { year: 10, topics: 'Systems Architecture: CPU, Von Neumann, performance', skills: 'Processor components, fetch-execute cycle' },
      { year: 10, topics: 'Memory & Storage: RAM, ROM, secondary, virtual', skills: 'Storage types, capacity, performance factors' },
      { year: 10, topics: 'Networks: Protocols, TCP/IP, OSI, network security', skills: 'Layered models, addressing, network threats' },
      { year: 10, topics: 'Python Programming: Data types, strings, arrays, subroutines', skills: 'Algorithm implementation, testing, debugging' },
      { year: 10, topics: 'Algorithms: Searching, sorting, computational thinking', skills: 'Bubble/merge sort, binary/linear search, efficiency' },
      { year: 10, topics: 'Data Representation: Number bases, images, sound, compression', skills: 'Binary/hex, sampling, lossy/lossless' },
      { year: 11, topics: 'Ethical/Legal: Cyber Security Act, Data Protection, AI ethics', skills: 'CTF challenges, legal frameworks, ethical debate' },
      { year: 11, topics: 'Programming Project: Analysis, design, development, testing', skills: 'Project management, documentation, evaluation' },
      { year: 11, topics: 'Computational Thinking: Decomposition, abstraction, pattern recognition', skills: 'Problem solving, algorithmic thinking' },
      { year: 11, topics: 'Revision: Paper 1 — computer systems', skills: 'Exam technique, knowledge recall, application' },
      { year: 11, topics: 'Revision: Paper 2 — computational thinking', skills: 'Algorithm design, code tracing, problem solving' },
      { year: 11, topics: 'Programming Languages: Translators, IDE tools, language paradigms', skills: 'Compiler/interpreter, debugging tools, high/low level' }
    ]
  },

  social: {
    eyfs: [
      { topics: 'Myself & Others: Identity, family, friendships, feelings', skills: 'Self-awareness, empathy, social skills' },
      { topics: 'Routines: Daily routines, independence, responsibility', skills: 'Self-care, organisation, time awareness' },
      { topics: 'Sharing & Turn-taking: Cooperation, negotiation, fairness', skills: 'Social interaction, conflict resolution, patience' },
      { topics: 'Community: People who help us, local community, roles', skills: 'Community awareness, respect, gratitude' },
      { topics: 'Feelings & Emotions: Naming emotions, self-regulation', skills: 'Emotional literacy, coping strategies, expression' },
      { topics: 'Cultural Celebrations: Festivals, traditions, diversity', skills: 'Cultural awareness, respect, belonging' }
    ],
    ks1: [
      { year: 1, topics: 'Ourselves: Feelings, strengths, goals, growth mindset', skills: 'Self-awareness, resilience, positive thinking' },
      { year: 1, topics: 'My Family: Roles, responsibilities, relationships', skills: 'Family diversity, respect, care' },
      { year: 1, topics: 'Friendships: Making friends, resolving conflict, kindness', skills: 'Social skills, empathy, inclusion' },
      { year: 1, topics: 'Keeping Safe: Stranger danger, road safety, medicine safety', skills: 'Risk assessment, help-seeking, rules' },
      { year: 1, topics: 'Communities: School community, local helpers', skills: 'Community roles, contribution, responsibility' },
      { year: 1, topics: 'Money: Value, saving, spending, needs vs wants', skills: 'Financial awareness, decision making, prioritising' },
      { year: 2, topics: 'Health: Exercise, nutrition, hygiene, sleep', skills: 'Healthy habits, body awareness, routine' },
      { year: 2, topics: 'Growth & Change: Baby to child, abilities, development', skills: 'Personal development, change, achievement' },
      { year: 2, topics: 'Rules & Responsibilities: Classroom rules, rights', skills: 'Responsibility, fairness, consequences' },
      { year: 2, topics: 'Our World: Environment, recycling, caring for nature', skills: 'Environmental responsibility, action, awareness' },
      { year: 2, topics: 'Diversity: Different families, cultures, abilities', skills: 'Respect, inclusion, anti-bullying' },
      { year: 2, topics: 'Online Safety: Digital citizenship, screen time awareness', skills: 'Safe technology use, balance, communication' }
    ],
    ks2: [
      { year: 3, topics: 'Relationships: Friendships, family, trust, conflict resolution', skills: 'Emotional intelligence, communication, negotiation' },
      { year: 3, topics: 'Healthy Lifestyle: Diet, exercise, mental wellbeing', skills: 'Health choices, balance, self-care' },
      { year: 3, topics: 'Safety: First aid, emergency services, risk assessment', skills: 'Emergency response, help-seeking, prevention' },
      { year: 3, topics: 'Citizenship: Rights, responsibilities, democracy, voting', skills: 'Civic awareness, participation, justice' },
      { year: 3, topics: 'Money Management: Budgeting, saving, value of money', skills: 'Financial literacy, planning, decision making' },
      { year: 3, topics: 'Our Community: Local services, volunteering, contribution', skills: 'Community engagement, empathy, active citizenship' },
      { year: 4, topics: 'Emotional Wellbeing: Growth mindset, dealing with failure', skills: 'Resilience, positive self-talk, perseverance' },
      { year: 4, topics: 'Puberty: Body changes, hygiene, emotional changes', skills: 'Body awareness, self-care, confidence' },
      { year: 4, topics: 'British Values: Democracy, rule of law, liberty, respect, tolerance', skills: 'Values understanding, debate, application' },
      { year: 4, topics: 'Environmental Issues: Climate change, conservation, activism', skills: 'Environmental ethics, sustainability, action' },
      { year: 4, topics: 'Diversity: Race, religion, disability, equality', skills: 'Inclusive attitudes, anti-discrimination, allyship' },
      { year: 4, topics: 'Peer Pressure: Assertiveness, saying no, consent', skills: 'Personal boundaries, decision making, confidence' },
      { year: 5, topics: 'Mental Health: Stress, anxiety, coping strategies, mindfulness', skills: 'Emotional regulation, support seeking, wellbeing' },
      { year: 5, topics: 'Relationships & Sex Education: Puberty, reproduction, emotions', skills: 'Body knowledge, respect, consent' },
      { year: 5, topics: 'Media Literacy: Advertising, fake news, critical thinking', skills: 'Source evaluation, bias detection, responsible sharing' },
      { year: 5, topics: 'Global Citizenship: SDGs, poverty, inequality, action', skills: 'Global awareness, empathy, advocacy' },
      { year: 5, topics: 'Careers: Interests, skills, aspirations, job roles', skills: 'Self-awareness, ambition, pathways' },
      { year: 5, topics: 'Risk Management: Online, social, physical, substance awareness', skills: 'Risk assessment, decision making, resilience' },
      { year: 6, topics: 'Transition: Preparing for secondary school, change management', skills: 'Adaptability, organisation, independence' },
      { year: 6, topics: 'RSE: Relationships, consent, online safety, body image', skills: 'Healthy relationships, safety, self-esteem' },
      { year: 6, topics: 'Financial Literacy: Tax, interest, loans, investments', skills: 'Financial planning, risk, enterprise' },
      { year: 6, topics: 'Democracy: Government, parliament, voting, active citizenship', skills: 'Political literacy, participation, debate' },
      { year: 6, topics: 'Human Rights: UNCRC, equality, social justice, protest', skills: 'Rights awareness, advocacy, peaceful protest' },
      { year: 6, topics: 'Wellbeing: Mindfulness, resilience, positive psychology', skills: 'Self-care, gratitude, growth mindset' }
    ],
    ks3: [
      { year: 7, topics: 'Identity: Self-concept, values, strengths, goals', skills: 'Self-awareness, reflection, goal setting' },
      { year: 7, topics: 'Relationships: Healthy/unhealthy, boundaries, respect, consent', skills: 'Interpersonal skills, assertiveness, safety' },
      { year: 7, topics: 'Health: Physical, mental, social health, wellbeing', skills: 'Holistic health, self-care, support' },
      { year: 7, topics: 'Democracy: UK government, voting, political parties', skills: 'Political literacy, participation, debate' },
      { year: 7, topics: 'Diversity: Prejudice, discrimination, equality, inclusion', skills: 'Critical thinking, empathy, allyship' },
      { year: 7, topics: 'Safety: Online safety, first aid, emergency response', skills: 'Risk management, practical skills, help-seeking' },
      { year: 8, topics: 'Mental Health: Anxiety, depression, coping, support', skills: 'Emotional literacy, resilience, mindfulness' },
      { year: 8, topics: 'RSE: Sexual health, consent, contraception, STIs', skills: 'Informed decision making, respect, safety' },
      { year: 8, topics: 'Law & Justice: Legal system, rights, responsibilities', skills: 'Legal awareness, justice, civic duty' },
      { year: 8, topics: 'Media: Influence, echo chambers, manipulation, literacy', skills: 'Critical consumption, verification, digital citizenship' },
      { year: 8, topics: 'Careers: Employability, skills, CV writing, interviews', skills: 'Career planning, self-presentation, communication' },
      { year: 8, topics: 'Finance: Budgeting, debt, savings, pensions', skills: 'Financial capability, planning, risk management' },
      { year: 9, topics: 'RSE: Consent, healthy relationships, exploitation awareness', skills: 'Ethical decision making, safety, communication' },
      { year: 9, topics: 'Global Issues: Migration, poverty, climate justice', skills: 'Global perspective, critical analysis, advocacy' },
      { year: 9, topics: 'Extremism: Radicalisation, propaganda, resilience', skills: 'Critical thinking, British values, community cohesion' },
      { year: 9, topics: 'Human Rights: UK/International, campaigns, activism', skills: 'Rights advocacy, campaign skills, empowerment' },
      { year: 9, topics: 'Substance Use: Alcohol, drugs, tobacco, risk, peer influence', skills: 'Informed decision making, risk assessment, support' },
      { year: 9, topics: 'Study Skills: Revision techniques, time management, exam resilience', skills: 'Metacognition, organisation, stress management' }
    ]
  }
};

// ==================== GENERATOR ====================

function generateCurriculum() {
  const byLevel = {};
  let totalUnits = 0;

  function addUnit(level, subject, title, description, curriculumArea) {
    if (!byLevel[level]) byLevel[level] = {};
    if (!byLevel[level][subject]) byLevel[level][subject] = [];
    const levelInfo = LEVELS[level];
    const existing = byLevel[level][subject].length;
    const id = `${level}_${subject}_${existing + 1}`;
    
    byLevel[level][subject].push({
      id,
      title,
      semester: 'annual',
      topics: description.topics,
      skills: description.skills,
      level,
      subject,
      subjectName: SUBJECT_NAMES[subject] || subject,
      age: levelInfo.ages,
      isced: levelInfo.isced,
      framework: 'European (UK/CIE) National Curriculum',
      language: 'English',
      curriculumArea
    });
    totalUnits++;
  }

  function getYearRange(keyStage) {
    const ranges = { 'EYFS': [0,0], 'KS1': [1,2], 'KS2': [3,6], 'KS3': [7,9], 'KS4': [10,11] };
    return ranges[keyStage] || [0, 11];
  }

  // Subjects that appear at each key stage
  const subjectAvailability = {
    kindergarten: ['english', 'maths', 'science', 'art', 'music', 'pe', 'social'],
    primary: ['english', 'maths', 'science', 'geography', 'history', 'art', 'music', 'pe', 'computing', 'social'],
    secondary_lower: ['english', 'maths', 'science', 'geography', 'history', 'art', 'music', 'pe', 'computing', 'social', 'biology', 'physics', 'chemistry'],
    secondary_upper: ['english', 'maths', 'science', 'geography', 'history', 'art', 'music', 'pe', 'computing', 'social', 'biology', 'physics', 'chemistry']
  };

  const levelToCategory = {
    kindergarten: 'kindergarten',
    primary_1: 'primary', primary_2: 'primary', primary_3: 'primary',
    primary_4: 'primary', primary_5: 'primary', primary_6: 'primary',
    secondary_lower_1: 'secondary_lower', secondary_lower_2: 'secondary_lower', secondary_lower_3: 'secondary_lower',
    secondary_upper_1: 'secondary_upper', secondary_upper_2: 'secondary_upper'
  };

  const yearMap = {
    kindergarten: 0,
    primary_1: 1, primary_2: 2, primary_3: 3,
    primary_4: 4, primary_5: 5, primary_6: 6,
    secondary_lower_1: 7, secondary_lower_2: 8, secondary_lower_3: 9,
    secondary_upper_1: 10, secondary_upper_2: 11
  };

  for (const [level, levelInfo] of Object.entries(LEVELS)) {
    const cat = levelToCategory[level];
    const subjects = subjectAvailability[cat] || ['english', 'maths', 'science'];
    
    const currentYear = yearMap[level];

    for (const subject of subjects) {
      const content = CURRICULUM_CONTENT[subject];
      if (!content) continue;

      let entries;
      if (currentYear === 0) {
        entries = content.eyfs || [];
      } else if (currentYear >= 1 && currentYear <= 2) {
        entries = (content.ks1 || []).filter(e => e.year === currentYear);
      } else if (currentYear >= 3 && currentYear <= 6) {
        entries = (content.ks2 || []).filter(e => e.year === currentYear);
      } else if (currentYear >= 7 && currentYear <= 9) {
        entries = (content.ks3 || []).filter(e => e.year === currentYear);
      } else if (currentYear >= 10 && currentYear <= 11) {
        entries = (content.ks4 || []).filter(e => e.year === currentYear);
      } else {
        entries = [];
      }

      // Fallback: use any entry for this key stage
      if (entries.length === 0) {
        const ks = levelInfo.keyStage;
        const ksKey = ks === 'EYFS' ? 'eyfs' : ks.toLowerCase();
        if (content[ksKey]) {
          entries = content[ksKey].filter(e => e.year === undefined || e.year === currentYear);
        }
      }

      if (entries.length === 0) continue;

      for (const entry of entries) {
        addUnit(level, subject, entry, `${SUBJECT_NAMES[subject]} — ${levelInfo.name}`, `European Key Stage ${levelInfo.keyStage}`);
      }
    }
  }

  // Add science split for KS3-KS4
  const scienceSubjects = { biology: 'Science (Biology)', physics: 'Science (Physics)', chemistry: 'Science (Chemistry)' };
  for (const [ss, ssName] of Object.entries(scienceSubjects)) {
    const ssContent = CURRICULUM_CONTENT.science;
    for (const [level, levelInfo] of Object.entries(LEVELS)) {
      const currentYear = yearMap[level];
      if (currentYear < 7) continue; // Only KS3+
      
      let entries;
      if (currentYear >= 7 && currentYear <= 9) {
        entries = (ssContent.ks3 || []).filter(e => e.year === currentYear);
      } else if (currentYear >= 10 && currentYear <= 11) {
        entries = (ssContent.ks4 || []).filter(e => e.year === currentYear);
      }
      
      if (!entries || entries.length === 0) continue;
      
      // Only add ~4 entries per level for split sciences
      const filtered = entries.filter((_, i) => i % 2 === 0); // Take half the entries
      for (const entry of filtered) {
        const adaptedEntry = {
          ...entry,
          topics: `[${ssName}] ${entry.topics}`,
          skills: `[${ssName}] ${entry.skills}`
        };
        addUnit(level, ss, adaptedEntry, `${ssName} — ${levelInfo.name}`, `European Key Stage ${levelInfo.keyStage}`);
      }
    }
  }

  return { byLevel, total: totalUnits };
}

// ==================== OUTPUT ====================
console.log('Generating European (UK National Curriculum) comprehensive dataset...');
const curriculum = generateCurriculum();
console.log(`Generated ${curriculum.total} curriculum units across ${Object.keys(curriculum.byLevel).length} levels`);

const output = `const SMARTEDU_DATA = ${JSON.stringify(curriculum)};`;

const outputPath = path.join(__dirname, '..', 'docs', 'smartedu-data.js');
fs.writeFileSync(outputPath, output, 'utf8');

const stats = fs.statSync(outputPath);
const fileSizeKB = Math.round(stats.size / 1024);
console.log(`Written to: ${outputPath}`);
console.log(`File size: ${fileSizeKB} KB`);

// Print summary by level
console.log('\n=== Summary by Level ===');
for (const [level, subjects] of Object.entries(curriculum.byLevel)) {
  const total = Object.values(subjects).reduce((sum, arr) => sum + arr.length, 0);
  const subjectCount = Object.keys(subjects).length;
  console.log(`  ${LEVELS[level]?.name || level}: ${total} units across ${subjectCount} subjects`);
}

console.log('\n=== Summary by Subject ===');
const subjectTotals = {};
for (const subjects of Object.values(curriculum.byLevel)) {
  for (const [subj, units] of Object.entries(subjects)) {
    subjectTotals[subj] = (subjectTotals[subj] || 0) + units.length;
  }
}
for (const [subj, count] of Object.entries(subjectTotals).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${SUBJECT_NAMES[subj] || subj}: ${count} units`);
}
