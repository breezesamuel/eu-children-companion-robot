const logger = require('../utils/logger');

const CATEGORIES = {
  mathProblems: {
    topics: ['Addition', 'Subtraction', 'Multiplication', 'Division', 'Fractions', 'Decimals', 'Percentages', 'Algebra', 'Geometry', 'Measurement', 'Time', 'Money', 'Graphs', 'Probability', 'Word Problems', 'Number Patterns', 'Place Value', 'Rounding', 'Estimation', 'Fact Families', 'Prime Numbers', 'Factors', 'Multiples', 'Area and Perimeter', 'Volume', 'Angles', 'Coordinates', 'Symmetry', 'Data Analysis', 'Roman Numerals', 'Mental Math', 'Speed Calculations', 'Math Facts', 'Multiplication Tables', 'Division Facts', 'Square Numbers', 'Cube Numbers', 'Square Roots', 'Exponents', 'Scientific Notation', 'Ratios', 'Proportions', 'Scale Drawings', 'Pythagorean Theorem', 'Perimeter Problems', 'Circumference', 'Diameter and Radius', 'Surface Area', 'Net of Solids', '3D Shapes', 'Transformations', 'Reflections', 'Rotations', 'Translations', 'Enlargements', 'Bar Charts', 'Pictograms', 'Line Graphs', 'Pie Charts', 'Venn Diagrams'],
    basic: (t) => `${t}: Let's learn the basics! ${t} helps us count, measure, and solve everyday problems. For example, when you share cookies with friends or count your toys, you are using ${t.toLowerCase()}. Practice with small numbers first, then try bigger ones! Try this: find 5 things in your room and count them. Now add 3 more - how many do you have?`,
    intermediate: (t) => `${t}: Going deeper. Now we understand that ${t.toLowerCase()} is used in many real-world situations. When you go shopping, the cashier uses ${t.toLowerCase()} to calculate your change. When you bake a cake, you measure ingredients using ${t.toLowerCase()}. Challenge: if a recipe needs 2 cups of flour for 12 muffins, how much flour do you need for 24 muffins?`,
    advanced: (t) => `${t}: Advanced concepts. ${t} forms the foundation of higher mathematics. Understanding ${t.toLowerCase()} deeply helps with algebra, calculus, and data science. Let's explore multi-step problems that combine different operations. Problem: A train travels 120 km in 2 hours. If it continues at the same speed, how far will it travel in 3.5 hours? Show your work step by step.`,
    expert: (t) => `${t}: Expert level. Master ${t.toLowerCase()} by solving complex multi-step problems that require strategic thinking. Use algebraic reasoning to set up equations, identify patterns, and derive formulas. Challenge: The sum of three consecutive numbers is 72. What are the numbers? Set up an equation and solve it. Explain how this relates to ${t.toLowerCase()} concepts and generalize your approach to find a formula for any three consecutive numbers summing to N.`,
    master: (t) => `${t}: Master level. Achieve mastery in ${t.toLowerCase()} by exploring its deep mathematical structures and elegant proofs. Investigate how ${t.toLowerCase()} connects across different branches of mathematics. Take on this advanced problem: Prove that the sum of the first n odd numbers equals n^2. Then extend this pattern: what is the sum of the first n even numbers? Derive a general formula and explain the geometric interpretation using square grids. Create your own similar pattern discovery problem.`
  },
  vocabulary: {
    topics: ['Animals', 'Food', 'Colors', 'Shapes', 'Family', 'Weather', 'Seasons', 'Body Parts', 'Clothes', 'Transport', 'School', 'Jobs', 'Sports', 'Music', 'Nature', 'Space', 'Ocean', 'Feelings', 'Actions', 'Opposites', 'Furniture', 'Tools', 'Insects', 'Flowers', 'Fruits', 'Vegetables', 'Countries', 'Buildings', 'Toys', 'Festivals', 'Adjectives', 'Adverbs', 'Synonyms', 'Antonyms', 'Compound Words', 'Collective Nouns', 'Abstract Nouns', 'Proper Nouns', 'Action Verbs', 'Linking Verbs', 'Helping Verbs', 'Descriptive Words', 'Question Words', 'Direction Words', 'Time Words', 'Sequence Words', 'Emotion Words', 'Sensory Words', 'Academic Words', 'Formal Words', 'Informal Words', 'Idioms', 'Phrasal Verbs', 'Collocations', 'Word Families', 'Root Words', 'Prefixes', 'Suffixes', 'Base Words', 'Cognates'],
    basic: (t) => `Let's learn words about ${t}! ${t} words help us describe and understand the world. Here are some common ${t.toLowerCase()} words: look for pictures of ${t.toLowerCase()} in your favorite books. Say each word out loud three times. Can you find 5 ${t.toLowerCase()} words in your classroom or home? Practice makes perfect!`,
    intermediate: (t) => `Building vocabulary: ${t}. Now that you know basic ${t.toLowerCase()} words, let's learn how to use them in sentences. Write three sentences using different ${t.toLowerCase()} words. Try to describe your favorite ${t.toLowerCase().slice(0, -1)} in detail using adjectives like big, small, colorful, fast. Challenge: use a thesaurus to find synonyms for ${t.toLowerCase()} words!`,
    advanced: (t) => `Advanced vocabulary: ${t}. Let's explore the origins and nuances of ${t.toLowerCase()}-related words. Many English words come from Latin and Greek roots. For example, the word "astronaut" comes from Greek "astron" (star) and "nautes" (sailor). Create a word map showing how ${t.toLowerCase()} vocabulary connects. Write a short paragraph using at least 8 ${t.toLowerCase()} words correctly.`,
    expert: (t) => `${t}: Expert vocabulary. Analyze the etymology, morphology, and semantic fields of ${t.toLowerCase()} terminology. Trace the historical development of key ${t.toLowerCase()} words through different language origins - Latin, Greek, Germanic, French. Create a detailed word family tree showing prefixes, roots, and suffixes. Write an analytical paragraph examining how the meanings of ${t.toLowerCase()} words have evolved over time, using at least 12 ${t.toLowerCase()} terms with precise usage.`,
    master: (t) => `${t}: Master vocabulary. Conduct a comprehensive linguistic analysis of ${t.toLowerCase()} vocabulary. Examine cognates across Romance and Germanic languages, identify semantic shifts, and analyze register differences (formal vs informal, technical vs everyday). Compose a sophisticated essay using ${t.toLowerCase()} vocabulary at a native-speaker level, incorporating precise terminology, idiomatic expressions, and varied sentence structures. Include a meta-analysis of your word choices explaining why each term was selected for its specific context and connotation.`
  },
  readingComprehension: {
    topics: ['The Lost Kitten', 'A Day at the Beach', 'The Brave Little Star', 'Timmys Garden', 'The Friendly Forest', 'Rainbow Magic', 'The Secret Path', 'Luna the Owl', 'The Big Race', 'The Kind Giant', 'The Magic Paintbrush', 'Benny the Bear', 'Saving the Pond', 'The Starfish Story', 'A Rainbow Birthday', 'The Dancing Leaves', 'Captain Treasure', 'The Whispering Shell', 'Pablo the Painter', 'The Helpful Robot', 'Maya the Explorer', 'The Singing River', 'The Brave Caterpillar', 'The Moonlight Dance', 'Sammy Squirrel', 'The Kindness Badge', 'The Garden Party', 'The Paper Boat', 'The Little Lighthouse', 'The Star Collector', 'The Magic Treehouse', 'The Ocean Explorer', 'The Winter Festival', 'The Curious Cat', 'The Little Astronaut', 'The Dancing Shoes', 'The Mystery Map', 'The Friendly Monster', 'The Rainbow Fish', 'The Talking Parrot', 'The Ancient Key', 'The Crystal Cave', 'The Music Box', 'The Silver Bell', 'The Magic Seeds', 'The Windy Day', 'The Snow Queen', 'The Toy Maker', 'The Starry Night', 'The Garden Maze', 'The Secret Letter', 'The Flying Carpet', 'The Enchanted Mirror', 'The Golden Feather', 'The Moon Rabbit', 'The Ice Palace', 'The Bamboo Grove', 'The Silk Butterfly', 'The Copper Coin', 'The Jade Necklace'],
    basic: (t) => `Reading: ${t}. Once upon a time, there was a wonderful story called "${t}." In this story, the main character learns something important about friendship, courage, or kindness. As you read, think about: Who is the main character? Where does the story happen? What problem does the character face? How is the problem solved? Read the story once for enjoyment, then read it again to answer these questions.`,
    intermediate: (t) => `Reading comprehension: ${t}. Let's analyze "${t}" more carefully. Every story has a beginning, middle, and end. The beginning introduces characters and setting. The middle has a conflict or problem. The end shows how everything works out. After reading: 1) Write a short summary in your own words. 2) Describe your favorite character and explain why. 3) What lesson did the main character learn? 4) How would you have handled the situation differently?`,
    advanced: (t) => `Deep reading: ${t}. Let's do a literary analysis of "${t}." Examine the author's word choices and writing techniques. Consider: 1) Theme: What is the deeper message or lesson? 2) Character development: How does the main character change throughout the story? 3) Setting: How does the time and place affect the story? 4) Plot structure: Identify the exposition, rising action, climax, falling action, and resolution. Write a critical response discussing these elements.`,
    expert: (t) => `${t}: Expert literary analysis. Perform a sophisticated critical examination of "${t}" using multiple literary theories. Analyze narrative voice, unreliable narration if present, intertextuality, and cultural context. Consider: 1) How does the author manipulate reader expectations? 2) What stylistic devices create specific emotional responses? 3) How does the text engage with broader literary traditions or genres? 4) What subtext or implicit meanings can be uncovered? Write a multi-paragraph analytical essay with textual evidence supporting each claim.`,
    master: (t) => `${t}: Master literary criticism. Conduct a comprehensive scholarly analysis of "${t}" suitable for advanced literary study. Apply formalist, structuralist, post-structuralist, or psychoanalytic critical frameworks. Examine: 1) The text's relationship to its historical and cultural moment. 2) How the narrative structure creates meaning through gaps, silences, and ambiguities. 3) The interplay between surface narrative and deeper symbolic or allegorical meanings. 4) Comparative analysis with other texts in the same tradition. Produce a polished critical essay demonstrating sophisticated reading and original interpretation.`
  },
  grammarExercises: {
    topics: ['Nouns', 'Verbs', 'Adjectives', 'Adverbs', 'Pronouns', 'Prepositions', 'Conjunctions', 'Articles', 'Tenses', 'Subject-Verb Agreement', 'Punctuation', 'Capitalization', 'Sentence Structure', 'Direct Speech', 'Passive Voice', 'Conditionals', 'Comparatives', 'Superlatives', 'Homophones', 'Prefixes', 'Suffixes', 'Compound Words', 'Contractions', 'Possessives', 'Apostrophes', 'Commas', 'Question Tags', 'Relative Clauses', 'Gerunds', 'Infinitives', 'Simple Present', 'Simple Past', 'Simple Future', 'Present Continuous', 'Past Continuous', 'Future Continuous', 'Present Perfect', 'Past Perfect', 'Future Perfect', 'Modal Verbs', 'Can/Could', 'May/Might', 'Must/Have to', 'Should/Ought to', 'Would/Used to', 'Countable Nouns', 'Uncountable Nouns', 'Quantifiers', 'Determiners', 'Indefinite Articles', 'Definite Article', 'Zero Article', 'Reflexive Pronouns', 'Possessive Pronouns', 'Demonstrative Pronouns', 'Interrogative Pronouns', 'Relative Pronouns', 'Indefinite Pronouns', 'Reciprocal Pronouns', 'Intensive Pronouns'],
    basic: (t) => `Grammar: ${t}. ${t} are building blocks of sentences. A ${t.toLowerCase()} is a word that names a person, place, thing, or idea (if noun), or shows action (if verb), or describes (if adjective/adverb). Example: "The _cat_ (noun) _quickly_ (adverb) _ran_ (verb) home." Practice: Write 5 sentences and circle the ${t.toLowerCase()} in each one.`,
    intermediate: (t) => `Grammar practice: ${t}. Now let's use ${t.toLowerCase()} in more complex ways. Combine simple sentences using ${t.toLowerCase()} correctly. Notice how changing the ${t.toLowerCase()} changes the meaning of the sentence. Exercise: Rewrite these 3 simple sentences as one well-structured sentence: "The dog ran. The dog was brown. The dog ran to the park." Pay attention to how ${t.toLowerCase()} functions in your new sentence.`,
    advanced: (t) => `Advanced grammar: ${t}. Master the nuances of ${t.toLowerCase()} in sophisticated writing. Consider how skilled authors use ${t.toLowerCase()} for effect. In literature, deliberate choices about ${t.toLowerCase()} can create rhythm, emphasis, and mood. Analyze this sentence: "Never have I seen such a magnificent creature, its wings spanning the entire horizon, soaring with effortless grace." Identify all ${t.toLowerCase()} usage and explain the effect of each choice.`,
    expert: (t) => `${t}: Expert grammar. Analyze complex grammatical structures involving ${t.toLowerCase()} in professional and literary texts. Examine how ${t.toLowerCase()} functions in advanced constructions such as conditional clauses, reported speech, and subjunctive mood. Practice: Identify and correct subtle grammatical errors in a provided passage. Then rewrite the passage using varied grammatical structures while maintaining the original meaning. Explain the grammatical rules that govern each correction and stylistic choice.`,
    master: (t) => `${t}: Master grammar. Conduct a comprehensive grammatical analysis of a complex text, examining every instance of ${t.toLowerCase()} and its contribution to meaning, style, and rhetorical effect. Compare prescriptive vs descriptive approaches to ${t.toLowerCase()} usage. Write an original passage that demonstrates mastery of ${t.toLowerCase()} through purposeful stylistic choices, then provide a detailed grammatical commentary explaining your decisions and their effects on the reader.`
  },
  scienceExperiments: {
    topics: ['Volcano Eruption', 'Growing Crystals', 'Plant Growth', 'Magnet Magic', 'Water Cycle', 'Solar Oven', 'Static Electricity', 'Density Tower', 'Seed Germination', 'Balloon Rocket', 'Rainbow in a Jar', 'Homemade Slime', 'Egg in Vinegar', 'Baking Soda Rocket', 'Color Chromatography', 'Paper Airplane', 'Shadow Tracking', 'Sound Waves', 'Water Filtration', 'Lava Lamp', 'Invisible Ink', 'Electric Lemon', 'Sink or Float', 'Magnetic Slime', 'Cloud in a Bottle', 'Penny Polishing', 'Cabbage Indicator', 'Spinning Pen', 'Dry Erase Float', 'Tornado in a Bottle'],
    basic: (t) => `Experiment: ${t}. You will need: common household items. Steps: 1) Gather your materials. 2) Follow the instructions carefully. 3) Observe what happens. 4) Write down what you see! Safety tip: always ask an adult for help. The ${t.toLowerCase()} experiment teaches us about a fun science concept. What do you predict will happen? Try it and find out!`,
    intermediate: (t) => `${t}: Science exploration. Before starting, write your hypothesis: what do you think will happen and why? Set up your experiment carefully. Run at least 3 trials to make sure your results are consistent. Record your observations with measurements if possible. After the experiment: 1) Did your results match your hypothesis? 2) What surprised you? 3) What would you do differently next time? 4) Can you think of a real-world application of this principle?`,
    advanced: (t) => `${t}: Scientific method. Design an extension experiment based on your findings. Change one variable at a time (this is called a controlled experiment). For each variation, make a prediction, run the experiment, and analyze the results. Create a data table and graph your findings. Write a lab report with: Introduction, Hypothesis, Materials, Procedure, Results, Discussion, and Conclusion. Explain the scientific principles that make this experiment work.`
  },
  scienceArticles: {
    topics: ['Photosynthesis', 'The Solar System', 'Dinosaur Extinction', 'Weather Patterns', 'Ocean Zones', 'The Human Heart', 'States of Matter', 'Food Chains', 'The Water Cycle', 'Gravity', 'Electric Circuits', 'Habitats', 'Butterfly Life Cycle', 'Volcanoes', 'Earthquakes', 'The Moon', 'Stars and Constellations', 'Fossils', 'Simple Machines', 'Ecosystems', 'The Respiratory System', 'Rocks and Minerals', 'The Nitrogen Cycle', 'Renewable Energy', 'Genetics Basics', 'The Nervous System', 'Chemical Reactions', 'Plate Tectonics', 'The Immune System', 'Conservation'],
    basic: (t) => `Science: ${t}. ${t} is a fascinating topic that helps us understand how the world works. Think about what you already know about ${t.toLowerCase()}. Now let's learn more! The basic idea of ${t.toLowerCase()} is easy to understand when we break it down. Here is a simple explanation with examples you can see in everyday life. Draw a picture showing what ${t.toLowerCase()} means to you.`,
    intermediate: (t) => `${t}: Deeper understanding. Let's explore the science behind ${t.toLowerCase()}. Scientists study ${t.toLowerCase()} using careful observation and experimentation. Here are some key facts and concepts: 1) How it works at a basic level. 2) Why it is important in nature or technology. 3) How scientists discovered these principles. 4) Connections to other scientific concepts. Try explaining ${t.toLowerCase()} to a friend using what you've learned.`,
    advanced: (t) => `${t}: Advanced science. A comprehensive look at current scientific understanding of ${t.toLowerCase()}. This topic connects multiple scientific disciplines. Recent research has revealed new insights about ${t.toLowerCase()}. Consider: 1) The historical development of our understanding. 2) Current research questions and debates. 3) Practical applications in medicine, technology, or environmental science. 4) Future directions for research. Write a mini research paper citing specific scientific studies or discoveries.`
  },
  historyEvents: {
    topics: ['Ancient Egypt', 'Ancient Greece', 'Ancient Rome', 'The Middle Ages', 'The Renaissance', 'The Industrial Revolution', 'The American Revolution', 'The Age of Exploration', 'The First Moon Landing', 'The Great Wall of China', 'The Pyramids', 'Viking Explorers', 'The Silk Road', 'Medieval Castles', 'World War I', 'The Wright Brothers', 'Marco Polo', 'The Gold Rush', 'The Steam Engine', 'The Printing Press', 'Ancient China', 'The Aztec Empire', 'The Roman Empire', 'The French Revolution', 'The Bronze Age', 'The Iron Age', 'The Gunpowder Age', 'The Information Age', 'The British Empire', 'The Space Race'],
    basic: (t) => `History: ${t}. ${t} was an important time/event in human history. Imagine what life was like during this period. What did people eat? What kind of homes did they have? What did children do for fun? The story of ${t.toLowerCase()} teaches us about how people lived, worked, and solved problems long ago. History helps us understand the present and make better decisions for the future. Create a timeline of the most important events.`,
    intermediate: (t) => `${t}: Historical analysis. Let's dive deeper into ${t.toLowerCase()}. Key events and figures shaped this period. Understanding the causes and effects helps us see why this matters. Consider: 1) What led to this event or period? 2) Who were the important people? 3) How did daily life change? 4) What were the short-term and long-term impacts? Write a journal entry as if you lived during ${t.toLowerCase()}. What would you have experienced?`,
    advanced: (t) => `${t}: Advanced historical perspective. Historians analyze ${t.toLowerCase()} using primary and secondary sources. Multiple perspectives exist on what happened and why. Critical thinking questions: 1) How do different historians interpret these events? 2) What biases might affect our understanding? 3) How does archaeology contribute new knowledge? 4) What lessons from ${t.toLowerCase()} apply to modern challenges? Write a historiographical essay examining different scholarly interpretations.`
  },
  geographyFacts: {
    topics: ['Continents', 'Oceans', 'Deserts', 'Rainforests', 'Mountains', 'Rivers', 'Volcanoes', 'Islands', 'The Arctic', 'Antarctica', 'The Amazon', 'The Sahara', 'The Nile River', 'The Himalayas', 'The Great Barrier Reef', 'The Pacific Ocean', 'The African Savanna', 'The Grand Canyon', 'The Alps', 'The Amazon Rainforest', 'Lake Victoria', 'Mount Everest', 'Death Valley', 'The Gobi Desert', 'The Yangtze River', 'The Andes', 'The Maldives', 'The Serengeti', 'The Rocky Mountains', 'The Dead Sea'],
    basic: (t) => `Geography: ${t}. ${t} is a amazing place on our planet Earth! Let's explore where it is located, what makes it special, and why it matters. Every place on Earth has unique characteristics - climate, plants, animals, and people. Draw a map showing where ${t.toLowerCase()} is located. Color it and label nearby places. What would you pack if you visited ${t.toLowerCase()}?`,
    intermediate: (t) => `${t}: Exploring in depth. ${t} has fascinating geographical features that scientists study. Consider: 1) How was ${t.toLowerCase()} formed? 2) What is the climate like and how does it affect the environment? 3) What plants and animals live there? 4) How do people use or interact with this place? 5) What environmental challenges does it face? Create a fact file with 10 interesting facts about ${t.toLowerCase()}. Include maps, diagrams, and photos.`,
    advanced: (t) => `${t}: Advanced geography. A comprehensive geographic analysis of ${t.toLowerCase()}. Examine: 1) Geological formation processes and timescales. 2) Climate patterns and their global connections. 3) Biodiversity and ecosystem dynamics. 4) Human geography: settlement patterns, culture, economy. 5) Conservation challenges and sustainability efforts. 6) Geopolitical significance. Prepare a geographic information system (GIS) analysis or create a detailed thematic map showing multiple data layers.`
  },
  animalFacts: {
    topics: ['Lions', 'Elephants', 'Dolphins', 'Penguins', 'Bald Eagles', 'Giraffes', 'Great White Sharks', 'Kangaroos', 'Polar Bears', 'Gorillas', 'Butterflies', 'Humpback Whales', 'Cheetahs', 'Wolves', 'Sea Turtles', 'Owls', 'Red Foxes', 'Horses', 'Chimpanzees', 'Orcas', 'Tigers', 'Otters', 'Parrots', 'Komodo Dragons', 'Octopus', 'Bats', 'Beavers', 'Crocodiles', 'Pandas', 'Hummingbirds'],
    basic: (t) => `Animals: ${t}. ${t} are amazing creatures! They have special features that help them survive in their habitat. Learn about where ${t.toLowerCase()} live, what they eat, and what makes them unique. Fun fact: ${t} have some surprising abilities! Draw a picture of a ${t.toLowerCase()} in its natural habitat and label its special features. What is your favorite thing about ${t.toLowerCase()}?`,
    intermediate: (t) => `${t}: Animal biology and behavior. Let's study ${t.toLowerCase()} in more detail. 1) Classification: what scientific family do ${t.toLowerCase()} belong to? 2) Anatomy: what physical adaptations help them survive? 3) Behavior: how do they hunt, communicate, and raise their young? 4) Habitat: what kind of environment do they need? 5) Conservation status: are they endangered? Why or why not? Create an informational poster about ${t.toLowerCase()} with detailed illustrations and facts.`,
    advanced: (t) => `${t}: Advanced zoology. A scientific study of ${t.toLowerCase()}. Examine: 1) Evolutionary history and phylogenetic relationships. 2) Physiological adaptations at the cellular and molecular level. 3) Social structure and communication systems. 4) Ecological role in their ecosystem (keystone species, predator-prey dynamics). 5) Human impact: historical and current threats, conservation programs, reintroduction efforts. 6) Recent scientific discoveries about ${t.toLowerCase()}. Write a research summary suitable for a junior science journal.`
  },
  poems: {
    topics: ['My Pet Dragon', 'The Rainbow Bridge', 'Autumn Leaves', 'The Ocean Waves', 'Dancing Butterflies', 'The Moon at Night', 'Friendship', 'A Rainy Day', 'The Tallest Tree', 'My Favorite Toy', 'The Morning Sun', 'Snowflakes Falling', 'The Brave Knight', 'Under the Sea', 'The Winds Secret', 'Bedtime', 'The Secret Garden', 'Laughing Raindrops', 'The Happy Bee', 'Starlight Dreams', 'The Magic Forest', 'Puddle Jumping', 'Cloud Shapes', 'The Old Oak Tree', 'Bicycle Bells', 'The Bakery Shop', 'Kite Flying', 'Campfire Tales', 'The Library Mouse', 'Grandmas Kitchen'],
    basic: (t) => `${t}\n\n${t} is a wonderful poem topic for young readers.\n\nLet's imagine together:\nWhat do you see when you think of ${t.toLowerCase()}?\nWhat sounds do you hear?\nHow does it make you feel?\n\nPoems are like paintings made with words.\nThey can make us smile, think, and dream.\nTry writing your own short poem about ${t.toLowerCase()}!\nUse your senses: sight, sound, touch, smell, and feeling.\n\nRemember: poems don't have to rhyme to be beautiful.`,
    intermediate: (t) => `${t}\n\nA poem about ${t.toLowerCase()} for growing minds.\n\nConsider these poetic devices:\n- Imagery: paint a picture with words\n- Metaphor: what is ${t.toLowerCase()} like?\n- Personification: if ${t.toLowerCase()} could speak...\n- Alliteration: use same starting sounds\n- Rhyme scheme: try AABB or ABAB\n\nWrite a poem of at least 8 lines about ${t.toLowerCase()}.\nUse at least two poetic devices from the list above.\nRead your poem aloud - does it have rhythm?\nRevise and polish your words until they sing.`,
    advanced: (t) => `${t}\n\nAn advanced poetic exploration of ${t.toLowerCase()}.\n\nStudy how professional poets approach similar themes.\nConsider:\n- Form: sonnet, free verse, haiku, or villanelle?\n- Tone: joyful, contemplative, mysterious, playful?\n- Structure: stanza length, line breaks, enjambment\n- Sound devices: assonance, consonance, onomatopoeia\n- Symbolism: what does ${t.toLowerCase()} represent?\n\nCompose an original poem of 14+ lines.\nChoose a specific form and use it correctly.\nInclude a brief poet's statement explaining:\n- Your choice of form and why it suits the theme\n- Three specific literary devices you used and their effect\n- How you want the reader to feel after reading`
  },
  logicalPuzzles: {
    topics: ['Sudoku for Kids', 'Pattern Recognition', 'Maze Solving', 'Crossword Puzzles', 'Riddle Me This', 'Number Sequences', 'Word Ladders', 'Logic Grids', 'Memory Games', 'Tic-Tac-Toe Strategy', 'Matching Pairs', 'Spot the Difference', 'Analogies', 'Crack the Code', 'Tower of Hanoi', 'Tangram Shapes', 'Rebus Puzzles', 'What Comes Next', 'Odd One Out', 'Sorting Games', 'Binary Puzzles', 'Magic Squares', 'Connect the Dots', 'Word Searches', 'Cryptograms', 'Jigsaw Strategy', 'Lateral Thinking', 'Grid Drawing', 'Symmetry Puzzles', 'Sequence Memory'],
    basic: (t) => `Puzzle: ${t}. Let's exercise our brain! ${t} is a fun way to practice thinking and problem-solving. Start with easy examples and work your way up. Remember: puzzles are about trying different approaches. If one way doesn't work, try another! The more you practice, the better you get. Here's a simple ${t.toLowerCase()} challenge to get started. Can you solve it? Take your time and think carefully!`,
    intermediate: (t) => `${t}: Sharpen your thinking. Now let's tackle ${t.toLowerCase()} with more complexity. Use these strategies: 1) Break the problem into smaller parts. 2) Look for patterns and clues. 3) Eliminate impossible options. 4) Try working backwards from the goal. 5) Check your work step by step. Here is a medium-difficulty ${t.toLowerCase()} challenge. Write down your reasoning process as you solve it. What strategy worked best?`,
    advanced: (t) => `${t}: Advanced logic and reasoning. These ${t.toLowerCase()} challenges require careful analysis and systematic thinking. Use deductive reasoning, pattern recognition, and creative problem-solving. Advanced strategies include: 1) Creating a systematic approach and testing hypotheses. 2) Using grid or matrix notation to track possibilities. 3) Identifying constraints and using them to narrow options. 4) Recognizing common puzzle structures and applying known solutions. Here is an expert-level ${t.toLowerCase()} challenge. Document your complete solution process.`
  },
  codingChallenges: {
    topics: ['Hello World', 'Variables', 'Conditionals', 'Loops', 'Functions', 'Arrays', 'Objects', 'Events', 'Animation Basics', 'Simple Game Loop', 'Countdown Timer', 'Score Counter', 'Random Numbers', 'Button Clicker', 'Sprite Movement', 'Collision Detection', 'Sound Effects', 'Drawing Shapes', 'Color Changer', 'Story Teller', 'Calculator', 'To-Do List', 'Memory Card Game', 'Quiz App', 'Weather Display', 'Chat Bot', 'Dice Roller', 'Password Generator', 'Maze Game', 'Pong Game'],
    basic: (t) => `Coding: ${t}. Computers follow instructions called code. Let's learn about ${t.toLowerCase()}! In programming, ${t.toLowerCase()} is a building block that helps us create amazing things. Think of it like giving step-by-step instructions to a friend. Every programmer starts with the basics, just like you! Try this simple example and see what happens when you change the numbers or words. Coding is creative problem-solving!`,
    intermediate: (t) => `${t}: Build your skills. Now that you understand ${t.toLowerCase()}, let's use it in a practical project. Write a small program that demonstrates ${t.toLowerCase()} in action. Consider: 1) What input does your program need? 2) How will it process that input? 3) What output should it produce? 4) What edge cases should you handle? Test your program with different inputs. Debug any issues you find. Refactor your code to make it cleaner.`,
    advanced: (t) => `${t}: Advanced programming concepts. Master ${t.toLowerCase()} by understanding best practices and optimization. Consider: 1) Time and space complexity. 2) Error handling and edge cases. 3) Code organization and modularity. 4) Testing strategies (unit tests, integration tests). 5) Performance optimization. Implement a solution using ${t.toLowerCase()} and then refactor it to be more efficient and maintainable. Write unit tests that verify your solution handles all edge cases correctly.`
  },
  knowledgeBase: {
    topics: ['How Rainbows Form', 'Why the Sky is Blue', 'How Plants Grow', 'Why We Have Seasons', 'How Airplanes Fly', 'What Causes Thunder', 'How the Internet Works', 'Why Birds Migrate', 'How Bridges Stand', 'What Makes a Rainbow', 'How Music Works', 'Why the Ocean is Salty', 'How Telescopes Work', 'What Causes Earthquakes', 'How Batteries Work', 'Why Leaves Change Color', 'How Solar Panels Work', 'What Makes Wind', 'How Cameras Work', 'Why We Dream', 'How Refrigerators Work', 'Why Volcanoes Erupt', 'How GPS Works', 'What Causes Tides', 'How X-Rays Work', 'Why We Have Shadows', 'How WiFi Works', 'What Makes Thunderstorms', 'How the Heart Pumps', 'Why Ice Floats'],
    basic: (t) => `Did you know? ${t} is a fascinating question! The simple answer is: it all comes down to how nature and science work together. Think about what you already know about this topic. Now let's explore the basic idea step by step. Here is an easy-to-understand explanation with examples from everyday life. Try explaining ${t.toLowerCase()} to a younger sibling or friend using what you just learned!`,
    intermediate: (t) => `${t}: Understanding the science. Let's explore ${t.toLowerCase()} in more depth. Scientists have studied this question carefully and discovered fascinating answers. Key concepts to understand: 1) The basic principles involved. 2) How different factors work together. 3) Why understanding this matters in daily life. 4) Interesting related phenomena. Create a diagram or infographic explaining ${t.toLowerCase()} step by step. Label each part clearly.`,
    advanced: (t) => `${t}: Comprehensive analysis. A detailed examination of the scientific principles behind ${t.toLowerCase()}. This question touches on multiple scientific disciplines. Let's explore: 1) The underlying physics, chemistry, or biology. 2) Historical discoveries that led to our understanding. 3) Current scientific research and unanswered questions. 4) Practical applications and technologies based on this knowledge. 5) Common misconceptions and why they persist. Write an accessible but scientifically accurate explanation suitable for a science fair presentation.`
  },
  activities: {
    topics: ['Paper Airplane Challenge', 'Build a Birdhouse', 'Nature Scavenger Hunt', 'Make a Volcano', 'Origami for Beginners', 'Grow a Bean Plant', 'Create a Time Capsule', 'Design a Board Game', 'Build a Fort', 'Make a Lava Lamp', 'Finger Painting', 'Paper Mache Bowl', 'Create a Comic Strip', 'Make a Weather Chart', 'Build a Puzzle', 'Start a Garden', 'Friendship Bracelets', 'Create a Collage', 'Build with LEGO', 'Make a Musical Instrument', 'Paint with Nature', 'Bake Cookies', 'Design a Poster', 'Make a Puppet Show', 'Build a Card House', 'Create a Photo Album', 'Write a Play', 'Make a Dream Catcher', 'Design a T-Shirt', 'Build a Sandcastle'],
    basic: (t) => `Activity: ${t}. Let's do something fun and creative! For this activity you will need some common household items. Follow these steps: 1) Gather your materials. 2) Set up your workspace. 3) Follow the instructions. 4) Have fun! Remember: it's OK if things don't turn out perfectly. The most important thing is to enjoy the process and learn something new. Ask an adult for help with scissors or other tools. Take a photo of your creation when you're done!`,
    intermediate: (t) => `${t}: Extended project. Now let's take this activity to the next level! Plan your project carefully: what materials do you need? How much time will it take? What steps will you follow? Consider how you can customize or improve the basic design. Try different variations and compare results. Document your process with photos and notes. What worked well? What would you change next time? Share your creation with family or friends!`,
    advanced: (t) => `${t}: Master project. Design and execute a sophisticated version of this activity. Set specific goals and success criteria. Research different techniques and choose the best approach. Create a detailed project plan with timeline and materials list. Execute your plan, documenting each step with photographs and notes. Evaluate your results against your goals. Write a project report explaining your design choices, challenges encountered, solutions developed, and lessons learned for future projects.`
  },
  riddles: {
    topics: ['Number Riddles', 'Animal Riddles', 'Food Riddles', 'Nature Riddles', 'School Riddles', 'Funny Riddles', 'Tricky Riddles', 'Color Riddles', 'Shape Riddles', 'Weather Riddles', 'Space Riddles', 'Ocean Riddles', 'Science Riddles', 'Travel Riddles', 'Music Riddles', 'Sports Riddles', 'Body Riddles', 'Time Riddles', 'Money Riddles', 'Word Riddles', 'Toy Riddles', 'Fruit Riddles', 'Vehicle Riddles', 'Season Riddles', 'Clothing Riddles', 'Job Riddles', 'Feeling Riddles', 'Action Riddles', 'Place Riddles', 'Opposite Riddles'],
    basic: (t) => `Riddle time: ${t}! Here are some fun ${t.toLowerCase()} to solve. Read each riddle carefully and think about the clues. Riddles use wordplay and clever thinking. The answer might be hiding in plain sight! Hint: say the riddle out loud and think about words with double meanings. If you get stuck, try thinking about the riddle from a different angle. Ready? Let's solve some ${t.toLowerCase()}!`,
    intermediate: (t) => `${t}: Challenge yourself. These ${t.toLowerCase()} require more creative thinking. Each riddle has clues hidden in the words. Strategy tips: 1) Identify key words that might have double meanings. 2) Think about categories the answer might belong to. 3) Consider homophones (words that sound the same). 4) Try visualizing the riddle as a picture. 5) Work backwards from possible answers. Write your own ${t.toLowerCase()} after solving these! Make sure the clues are fair but not too obvious.`,
    advanced: (t) => `${t}: Master riddler. These advanced ${t.toLowerCase()} use sophisticated wordplay, lateral thinking, and cultural references. To solve: 1) Parse the riddle's grammatical structure carefully. 2) Consider multiple interpretations of each phrase. 3) Look for patterns, puns, and clever misdirection. 4) Test hypotheses systematically. After solving, analyze what made each riddle challenging. Create a collection of original ${t.toLowerCase()} with explanations of the wordplay techniques you used. Rate their difficulty and test them on friends!`
  },
  astronomyTopics: {
    topics: ['The Sun', 'The Moon', 'Planet Earth', 'Mars', 'Jupiter', 'Saturn', 'Stars', 'Constellations', 'Asteroids', 'Comets', 'The Milky Way', 'Black Holes', 'Space Exploration', 'The ISS', 'Rockets', 'Astronauts', 'Solar Eclipses', 'Aurora Borealis', 'Telescopes', 'The Big Bang', 'Venus', 'Mercury', 'Neptune', 'Uranus', 'Dwarf Planets', 'Meteors', 'Galaxies', 'Nebulas', 'Exoplanets', 'Space Probes'],
    basic: (t) => `Space: ${t}. ${t} is one of the most amazing things in our universe! Let's learn about what it is, where it is, and why it matters. Space is full of wonders waiting to be discovered. Look up at the night sky - can you find examples of ${t.toLowerCase()}? Draw what you think ${t.toLowerCase()} looks like. Astronauts and scientists study ${t.toLowerCase()} to understand our universe better. What would you like to know about ${t.toLowerCase()}?`,
    intermediate: (t) => `${t}: Exploring the cosmos. Let's dive deeper into ${t.toLowerCase()}. Scientists have learned incredible things through telescopes, space probes, and careful study. Key facts: 1) Physical characteristics (size, composition, temperature). 2) How it was discovered or first observed. 3) Recent scientific findings and missions. 4) Its role in the broader universe. Create a fact sheet about ${t.toLowerCase()} with at least 15 interesting facts. Include diagrams and comparisons to things on Earth.`,
    advanced: (t) => `${t}: Advanced astronomy. A detailed scientific examination of ${t.toLowerCase()}. This topic spans multiple areas of astrophysics and planetary science. Study: 1) Physical properties and composition. 2) Formation and evolution over time. 3) Interaction with other celestial bodies. 4) Current research questions and observational campaigns. 5) Future exploration plans and missions. 6) Significance for understanding the universe. Prepare a presentation suitable for a young astronomers club, including visual aids and key data points.`
  },
  funFacts: {
    topics: ['Amazing Animals', 'Incredible Space', 'Mind-Blowing Science', 'Historys Mysteries', 'Record Breakers', 'Weird Weather', 'Human Body Wonders', 'Ocean Secrets', 'Dinosaur Discoveries', 'Ancient World Secrets', 'Extreme Earth', 'Brain Power', 'Food Science', 'Invention Stories', 'Natures Marvels', 'Sports Records', 'Music Magic', 'Art Mysteries', 'Plant Superpowers', 'Math Miracles', 'Underwater Discoveries', 'Volcano Facts', 'Insect Superpowers', 'Gemstone Facts', 'Flight Records', 'Food Records', 'Building Marvels', 'Speed Records', 'Deep Sea Facts', 'Ancient Technology'],
    basic: (t) => `Fun facts: ${t}! Did you know these amazing facts about ${t.toLowerCase()}? Get ready to say "Wow!" Here are some surprising and fun facts that will make you see the world differently. Share these facts with your friends and family - they won't believe what you've learned! Which fact surprised you the most? Why? Draw a picture of your favorite fact from this collection.`,
    intermediate: (t) => `${t}: Behind the facts. Let's understand the science and stories behind these ${t.toLowerCase()}! Each fun fact has an interesting explanation. For each fact, ask yourself: 1) Is this really true? How do we know? 2) What causes this phenomenon? 3) Who discovered it? 4) Can I observe this myself? Research one fact in depth and create a mini-presentation explaining not just the fact, but why it happens. Include diagrams, photos, or demonstrations.`,
    advanced: (t) => `${t}: Deep dive. A scholarly exploration of the most fascinating ${t.toLowerCase()}. Examine the evidence, methodology, and implications behind these facts. Consider: 1) How scientists verified these claims. 2) The historical context of the discoveries. 3) Connections between seemingly unrelated facts. 4) How these facts challenge common assumptions. 5) Practical applications of this knowledge. Choose the three most interesting facts and write a detailed research brief for each, citing scientific sources and explaining the underlying principles.`
  },
  shortStories: {
    topics: ['The Enchanted Forest', 'Captain Starbeam', 'The Little Robot', 'Mollys Magic Backpack', 'The Dragons Birthday', 'Undersea Adventure', 'The Time-Traveling Pencil', 'The Kindness Tree', 'The Brave Little Raindrop', 'Sam and the Star Map', 'The Friendship Garden', 'The Cloud Kingdom', 'The Secret of Blue Hill', 'Lilys Imagination', 'The Last Firefly', 'The Wishing Bridge', 'The Map to Anywhere', 'The Singing River', 'Ollie the Owl', 'The Color Thief', 'The Midnight Library', 'The Courage Seed', 'The Happy Stone', 'The Forgotten Toys', 'The Listening Wall', 'The Thankful Tree', 'The Night Gardener', 'The Paper Airplane King', 'The Quietest Voice', 'The Promise Box'],
    basic: (t) => `Story: ${t}. Once upon a time, in a land not too far away, there was a wonderful adventure waiting to happen. "${t}" is a heartwarming story about discovery, friendship, and courage. As you read, imagine the sights, sounds, and feelings. Let the story carry you away to a magical place where anything is possible. After reading: what was your favorite part? Who was your favorite character? What would you have done if you were in the story?`,
    intermediate: (t) => `Story: ${t}. Let's explore "${t}" as writers and thinkers. Every good story has elements that make it memorable. Analyze: 1) Character motivations - why do they do what they do? 2) Setting - how does the environment affect the story? 3) Conflict - what problems need solving? 4) Theme - what deeper message is the author sharing? After reading, rewrite the ending from a different character's perspective. How would the story change if told by someone else?`,
    advanced: (t) => `Story: ${t}: Literary workshop. Analyze "${t}" using advanced literary concepts. Consider narrative structure, character arcs, symbolism, and authorial intent. Examine: 1) The hero's journey framework and how this story fits. 2) Use of archetypes in characters and situations. 3) Symbolic elements and their multiple interpretations. 4) The author's voice and stylistic choices. 5) How the story connects to broader literary traditions. Write a critical analysis and then compose an alternative version that changes one key element (point of view, setting, or ending).`
  },
  chinesePoetry: {
    topics: ['静夜思', '春晓', '登鹳雀楼', '咏鹅', '悯农', '江雪', '望庐山瀑布', '绝句', '游子吟', '清明', '相思', '回乡偶书', '凉州词', '出塞', '送元二使安西', '别董大', '枫桥夜泊', '乌衣巷', '泊船瓜洲', '题西林壁', '望月怀远', '黄鹤楼送孟浩然', '早发白帝城', '望天门山', '赠汪伦', '独坐敬亭山', '鹿柴', '竹里馆', '相思子', '登高'],
    basic: (t) => `《${t}》\n\n这首诗是中国经典古诗，代代相传，深受喜爱。让我们一起欣赏这首美丽的诗歌！\n\n读一遍，感受诗的节奏和韵律。\n再读一遍，想象诗中的画面。\n\n你能感受到诗人想要表达的情感吗？\n试着背诵这首诗，然后讲给家人听。\n\n温馨提示：古诗需要用心灵去感受，不仅要理解字面意思，还要体会诗人的情感。`,
    intermediate: (t) => `《${t}》赏析\n\n深入理解这首诗的意境和艺术手法。\n\n1. 创作背景：了解诗人在什么情况下写下这首诗\n2. 词语解释：理解关键词语的深层含义\n3. 诗句分析：逐句品味诗中的意象和情感\n4. 艺术特色：分析诗歌的写作技巧\n\n思考题：\n- 这首诗主要表达了什么情感？\n- 诗人运用了哪些修辞手法？\n- 你能用现代语言改写这首诗吗？`,
    advanced: (t) => `《${t}》学术研究\n\n从文学批评角度深入分析这首经典诗歌。\n\n研究要点：\n1. 版本源流：考察不同版本的文字差异\n2. 历代点评：收集和比较历代学者的评注\n3. 比较研究：与同时代或同题材诗歌比较\n4. 文化影响：这首诗在后世文化中的影响\n5. 现代解读：用当代视角重新诠释\n\n学术写作：写一篇800字以上的赏析文章，\n包括文本分析、背景研究和个人见解。\n引用具体的诗句作为论据支撑。`
  },
  germanVocabulary: {
    topics: ['Greetings', 'Numbers 1-20', 'Colors', 'Family Members', 'Animals', 'Food and Drinks', 'Body Parts', 'Clothes', 'School Supplies', 'Weather Words', 'Days of the Week', 'Months', 'Seasons', 'Toys and Games', 'Furniture', 'Transportation', 'Nature Words', 'Emotions', 'Body Movements', 'House Rooms', 'Kitchen Items', 'Bathroom Items', 'Bedroom Items', 'Garden Words', 'City Places', 'Professions', 'Sports', 'Musical Instruments', 'Holiday Words', 'Direction Words'],
    basic: (t) => `German Vocabulary: ${t}. Let's learn German words about ${t.toLowerCase()}! In German, ${t.toLowerCase()} words are fun to say and learn. Here are common ${t.toLowerCase()} words in German with their English meanings. Practice saying each word out loud three times. Can you find ${t.toLowerCase()} objects around your home and say their German names? German pronunciation tip: 'w' is pronounced like 'v', and 'v' is pronounced like 'f'!`,
    intermediate: (t) => `German Vocabulary: ${t}. Now that you know basic ${t.toLowerCase()} words, let's use them in German sentences. German sentence structure is different from English - the verb often goes to the second position, and in some sentences it goes to the end! Write three German sentences using ${t.toLowerCase()} vocabulary. Practice the correct article (der, die, das) for each noun. Challenge: Can you form a question in German using a ${t.toLowerCase()} word?`,
    advanced: (t) => `German Vocabulary: ${t}. Deepen your German vocabulary skills related to ${t.toLowerCase()}. German compound words can be very long - for example, 'Handschuh' (glove) literally means 'hand shoe'! Explore how German creates descriptive compound nouns from ${t.toLowerCase()}-related root words. Study how case endings (nominative, accusative, dative, genitive) change articles and adjectives. Write a paragraph in German describing ${t.toLowerCase()} using at least 10 vocabulary words with correct grammar.`
  },
  frenchVocabulary: {
    topics: ['Greetings', 'Numbers 1-20', 'Colors', 'Family Members', 'Animals', 'Food and Drinks', 'Body Parts', 'Clothes', 'School Supplies', 'Weather Words', 'Days of the Week', 'Months', 'Seasons', 'Toys and Games', 'Furniture', 'Transportation', 'Nature Words', 'Emotions', 'Body Movements', 'House Rooms', 'Kitchen Items', 'Bathroom Items', 'Bedroom Items', 'Garden Words', 'City Places', 'Professions', 'Sports', 'Musical Instruments', 'Holiday Words', 'Direction Words'],
    basic: (t) => `French Vocabulary: ${t}. Let's learn French words about ${t.toLowerCase()}! French is a beautiful language spoken in France and many other countries. Here are common ${t.toLowerCase()} words in French with their English meanings. Practice saying each word with a French accent - remember to pronounce the last letter softly or not at all! French pronunciation tip: 'oi' sounds like 'wa', and 'eu' sounds like 'uh'. Try saying each word three times!`,
    intermediate: (t) => `French Vocabulary: ${t}. Let's build French sentences using ${t.toLowerCase()} vocabulary. In French, adjectives usually come after the noun, not before like in English. For example, 'a red car' becomes 'une voiture rouge' (a car red). Practice the correct gender (le/la) for each ${t.toLowerCase()} noun. Write three sentences describing ${t.toLowerCase()} in French. Challenge: can you make a sentence negative using 'ne...pas'?`,
    advanced: (t) => `French Vocabulary: ${t}. Deepen your French vocabulary related to ${t.toLowerCase()}. French has many silent letters and liaisons - connections between words where a normally silent consonant is pronounced. Study how ${t.toLowerCase()} vocabulary follows French grammatical rules including verb conjugations, adjective agreement, and article usage. Write a paragraph in French about ${t.toLowerCase()} using proper grammar, at least 12 vocabulary words, and both masculine and feminine forms where applicable.`
  },
  spanishVocabulary: {
    topics: ['Greetings', 'Numbers 1-20', 'Colors', 'Family Members', 'Animals', 'Food and Drinks', 'Body Parts', 'Clothes', 'School Supplies', 'Weather Words', 'Days of the Week', 'Months', 'Seasons', 'Toys and Games', 'Furniture', 'Transportation', 'Nature Words', 'Emotions', 'Body Movements', 'House Rooms', 'Kitchen Items', 'Bathroom Items', 'Bedroom Items', 'Garden Words', 'City Places', 'Professions', 'Sports', 'Musical Instruments', 'Holiday Words', 'Direction Words'],
    basic: (t) => `Spanish Vocabulary: ${t}. Let's learn Spanish words about ${t.toLowerCase()}! Spanish is spoken in Spain and many countries in Latin America. Here are common ${t.toLowerCase()} words in Spanish with their English meanings. Practice saying each word with a Spanish accent - roll your 'r's and pronounce 'll' like 'y'. Spanish pronunciation tip: 'j' is pronounced like a strong 'h', and 'n' is pronounced like 'ny'. Say each word three times!`,
    intermediate: (t) => `Spanish Vocabulary: ${t}. Let's use ${t.toLowerCase()} vocabulary in Spanish sentences. In Spanish, nouns have gender - masculine nouns use 'el' and feminine nouns use 'la'. Write three Spanish sentences using ${t.toLowerCase()} vocabulary. Practice matching adjectives to the gender of the noun they describe. Challenge: Conjugate a regular -ar, -er, and -ir verb related to ${t.toLowerCase()} in the present tense. How do the endings change?`,
    advanced: (t) => `Spanish Vocabulary: ${t}. Deepen your Spanish vocabulary related to ${t.toLowerCase()}. Spanish has two verbs for 'to be' - 'ser' (permanent characteristics) and 'estar' (temporary states). Study how ${t.toLowerCase()} vocabulary interacts with these distinctions as well as the subjunctive mood for expressing doubt, emotion, or hypotheticals. Write a paragraph in Spanish about ${t.toLowerCase()} using at least 12 vocabulary words, correct verb conjugations, and proper use of ser vs estar.`
  },
  italianVocabulary: {
    topics: ['Greetings', 'Numbers 1-20', 'Colors', 'Family Members', 'Animals', 'Food and Drinks', 'Body Parts', 'Clothes', 'School Supplies', 'Weather Words', 'Days of the Week', 'Months', 'Seasons', 'Toys and Games', 'Furniture', 'Transportation', 'Nature Words', 'Emotions', 'Body Movements', 'House Rooms', 'Kitchen Items', 'Bathroom Items', 'Bedroom Items', 'Garden Words', 'City Places', 'Professions', 'Sports', 'Musical Instruments', 'Holiday Words', 'Direction Words'],
    basic: (t) => `Italian Vocabulary: ${t}. Let's learn Italian words about ${t.toLowerCase()}! Italian is a musical language spoken in Italy and parts of Switzerland. Here are common ${t.toLowerCase()} words in Italian with their English meanings. Practice saying each word with an Italian accent - every vowel is pronounced clearly, and double consonants are held longer. Italian pronunciation tip: 'c' before 'e' or 'i' sounds like 'ch', and 'g' before 'e' or 'i' sounds like 'j'. Say each word three times!`,
    intermediate: (t) => `Italian Vocabulary: ${t}. Now let's create Italian sentences with ${t.toLowerCase()} vocabulary. Italian articles change based on gender (masculine/feminine) and number (singular/plural). 'Il' and 'lo' are masculine, 'la' is feminine. Write three Italian sentences using ${t.toLowerCase()} words. Practice making words plural - most masculine words end in -o and change to -i, feminine words end in -a and change to -e. Challenge: Use a preposition like 'in', 'su', or 'con' in your sentence!`,
    advanced: (t) => `Italian Vocabulary: ${t}. Deepen your Italian vocabulary related to ${t.toLowerCase()}. Italian verb conjugations change dramatically based on subject - the ending tells you who is doing the action. Study how ${t.toLowerCase()} vocabulary works with Italian grammar including the passato prossimo (past tense), reflexive verbs, and direct object pronouns. Write a paragraph in Italian about ${t.toLowerCase()} using at least 12 vocabulary words, correct gender agreements, and properly conjugated verbs in at least two different tenses.`
  },
  europeanGeography: {
    topics: ['France', 'Germany', 'Italy', 'Spain', 'United Kingdom', 'Switzerland', 'Austria', 'Netherlands', 'Belgium', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Portugal', 'Greece', 'Poland', 'Czech Republic', 'Hungary', 'Romania', 'Ireland', 'Scotland', 'Wales', 'The Alps', 'The Danube River', 'The Mediterranean Sea', 'The Rhine River', 'The Baltic Sea', 'The Pyrenees', 'The Carpathians', 'The Loire Valley'],
    basic: (t) => `European Geography: ${t}. ${t} is a wonderful place in Europe! Let's discover where it is located, what makes it special, and what people do there. Every European country and region has unique landscapes, food, and traditions. Find ${t.toLowerCase()} on a map of Europe. What color is it? What countries are its neighbors? Draw the flag of ${t.toLowerCase()} and color it correctly. What would you like to see and do if you visited ${t.toLowerCase()}?`,
    intermediate: (t) => `European Geography: ${t}. Let's explore ${t.toLowerCase()} in depth. 1) Location: what is its capital city and what are the major cities? 2) Landscape: what mountains, rivers, or coastlines does it have? 3) Climate: what is the weather like in different seasons? 4) Culture: what famous foods, festivals, or traditions come from here? 5) Landmarks: what famous buildings or natural wonders can you find? Create a travel brochure for ${t.toLowerCase()} with maps, facts, and colorful illustrations.`,
    advanced: (t) => `European Geography: ${t}. A comprehensive geographic analysis of ${t.toLowerCase()}. Examine: 1) Physical geography: geological features, climate zones, and ecosystems. 2) Human geography: population distribution, urban development, and cultural regions. 3) Economic geography: major industries, trade routes, and resources. 4) Political geography: borders, international relationships, and EU membership. 5) Environmental challenges: conservation efforts, climate change impacts, and sustainability initiatives. Prepare a detailed geographic profile with maps, data tables, and analysis.`
  },
  europeanHistory: {
    topics: ['The Roman Empire', 'The Viking Age', 'The Middle Ages', 'The Renaissance', 'The Reformation', 'The Age of Exploration', 'The Enlightenment', 'The French Revolution', 'The Industrial Revolution', 'World War I', 'World War II', 'The Cold War in Europe', 'The Fall of the Berlin Wall', 'The European Union', 'Ancient Greece', 'The Byzantine Empire', 'The Norman Conquest', 'The Hundred Years War', 'The Spanish Inquisition', 'The Glorious Revolution', 'The Napoleonic Wars', 'The Unification of Italy', 'The Unification of Germany', 'The Age of Imperialism', 'The Russian Revolution', 'The Spanish Civil War', 'The Marshall Plan', 'The Berlin Airlift', 'The Yugoslav Wars', 'The Euro Introduction'],
    basic: (t) => `European History: ${t}. ${t} was a very important time in European history! Imagine what it was like to live during this period. What did people eat? What clothes did they wear? What did children do? The story of ${t.toLowerCase()} helps us understand how Europe became what it is today. Create a timeline showing the most important events of ${t.toLowerCase()}. Draw a picture of something that represents this period in history.`,
    intermediate: (t) => `European History: ${t}. Let's go deeper into ${t.toLowerCase()}. 1) Causes: what events or conditions led to this? 2) Key figures: who were the important people? 3) Daily life: how did ordinary people experience this period? 4) Consequences: how did this change Europe and the world? 5) Legacy: how do we still see the effects today? Write a diary entry from the perspective of someone who lived through ${t.toLowerCase()}. What would they have seen, heard, and felt?`,
    advanced: (t) => `European History: ${t}. An advanced historical analysis of ${t.toLowerCase()}. Examine: 1) The geopolitical context and international dynamics. 2) Economic factors and social structures. 3) Cultural and intellectual movements of the period. 4) Multiple historical interpretations and debates among historians. 5) Primary source analysis: what do documents from the time tell us? 6) Connections to broader European and world history. Write a critical essay that presents and evaluates different historical perspectives on ${t.toLowerCase()}.`
  },
  europeanCulture: {
    topics: ['Christmas Markets', 'Carnival in Venice', 'Oktoberfest', 'Easter Traditions', 'Bastille Day', 'La Tomatina', 'St. Patricks Day', 'Dutch Tulip Festival', 'French Wine Harvest', 'Spanish Flamenco', 'Italian Opera', 'Greek Mythology', 'Vienna Ball Season', 'British Afternoon Tea', 'Swiss Chocolate', 'Belgian Waffles', 'French Cheese', 'Italian Pizza', 'German Bread', 'Spanish Tapas', 'Greek Olives', 'Dutch Cheese', 'Portuguese Pastries', 'Swiss Watches', 'Irish Folk Music', 'Scottish Highland Games', 'Polish Pierogi', 'Swedish Midsummer', 'Danish Hygge', 'Finnish Sauna'],
    basic: (t) => `European Culture: ${t}. ${t} is a wonderful European tradition that people love! Let's learn about what makes this tradition special, how it started, and how people celebrate it today. European traditions are passed down from generation to generation. Draw a picture showing ${t.toLowerCase()} in action. What colors, sounds, and smells do you imagine? Would you like to experience ${t.toLowerCase()} someday? Why?`,
    intermediate: (t) => `European Culture: ${t}. Let's explore ${t.toLowerCase()} in more detail. 1) Origins: how did this tradition begin? 2) Celebration: what do people do during ${t.toLowerCase()}? 3) Food: what special foods or drinks are associated with it? 4) Music: what songs or dances are part of the tradition? 5) Meaning: what does this tradition mean to the people who celebrate it? 6) Variations: how is it celebrated in different regions? Create a cultural report about ${t.toLowerCase()} with descriptions, images, and interesting facts.`,
    advanced: (t) => `European Culture: ${t}. A comprehensive cultural analysis of ${t.toLowerCase()}. Examine: 1) Historical development and evolution of the tradition over time. 2) Cultural significance and symbolic meanings. 3) Regional variations and local customs. 4) Economic impact (tourism, local businesses). 5) Contemporary adaptations and modernization. 6) Cross-cultural influences and global spread. Write an analytical essay examining how ${t.toLowerCase()} reflects broader European cultural values and identity.`
  },
  musicTheory: {
    topics: ['Musical Notes', 'The Staff', 'Treble Clef', 'Bass Clef', 'Note Values', 'Rests', 'Time Signatures', 'Rhythm Patterns', 'Scales', 'Major Scales', 'Minor Scales', 'Intervals', 'Chords', 'Major Chords', 'Minor Chords', 'Dynamics', 'Tempo', 'Key Signatures', 'Sharps and Flats', 'Eighth Notes', 'Half Notes', 'Whole Notes', 'Dotted Notes', 'Ties and Slurs', 'Repeats', 'Accidentals', 'Articulation', 'Musical Phrases', 'Cadences', 'Harmony'],
    basic: (t) => `Music Theory: ${t}. Let's learn about ${t.toLowerCase()} in music! Music is like a language, and ${t.toLowerCase()} is one of its important building blocks. When we understand ${t.toLowerCase()}, we can read music, play instruments, and create our own songs more easily. Practice identifying ${t.toLowerCase()} on a sheet of music. Can you find examples in your favorite songs? Try clapping or singing along with the ${t.toLowerCase()} you discover!`,
    intermediate: (t) => `Music Theory: ${t}. Let's go deeper into ${t.toLowerCase()}. 1) Definition: what exactly is ${t.toLowerCase()} and how does it work? 2) Notation: how do we write ${t.toLowerCase()} in sheet music? 3) Practice: clap or play exercises that use ${t.toLowerCase()}. 4) Listening: listen to a piece of music and identify where ${t.toLowerCase()} is used. 5) Creation: write a short musical phrase that demonstrates ${t.toLowerCase()}. Music theory helps us understand why some music sounds happy, sad, or exciting!`,
    advanced: (t) => `Music Theory: ${t}. An advanced study of ${t.toLowerCase()} and its role in musical composition. Examine: 1) The mathematical relationships underlying ${t.toLowerCase()}. 2) How composers from different periods (Baroque, Classical, Romantic, Modern) used ${t.toLowerCase()}. 3) The relationship between ${t.toLowerCase()} and emotional expression in music. 4) Analysis of a famous piece focusing on its use of ${t.toLowerCase()}. Write a musical analysis identifying and explaining the ${t.toLowerCase()} elements in a chosen composition, complete with notated examples.`
  },
  artHistory: {
    topics: ['Leonardo da Vinci', 'Vincent van Gogh', 'Pablo Picasso', 'Michelangelo', 'Claude Monet', 'Rembrandt', 'Johannes Vermeer', 'Sandro Botticelli', 'Raphael', 'Albrecht Durer', 'Gustav Klimt', 'Edvard Munch', 'Wassily Kandinsky', 'Salvador Dali', 'Frida Kahlo', 'The Mona Lisa', 'The Starry Night', 'The Last Supper', 'The Scream', 'Girl with a Pearl Earring', 'The Creation of Adam', 'The Birth of Venus', 'Water Lilies', 'The Persistence of Memory', 'Renaissance Art', 'Impressionism', 'Cubism', 'Surrealism', 'Baroque Art', 'Romanesque Art'],
    basic: (t) => `Art History: ${t}. ${t} is a fascinating part of art history! Let's learn about what makes it special and why people still admire it today. Art helps us see the world through other people's eyes. Look at a picture of ${t.toLowerCase()} - what colors do you see? What shapes and lines? How does it make you feel? Draw your own version of ${t.toLowerCase()} in your style. There is no right or wrong way to make art!`,
    intermediate: (t) => `Art History: ${t}. Let's explore ${t.toLowerCase()} in more depth. 1) Who created it or what artists worked in this style? 2) When and where was it created? 3) What techniques were used? 4) What was happening in the world when it was created? 5) Why is it considered important? 6) How did it influence later artists? Create an art history fact file about ${t.toLowerCase()} with images, dates, and key information. Try recreating the artwork using similar techniques.`,
    advanced: (t) => `Art History: ${t}. A comprehensive art historical analysis of ${t.toLowerCase()}. Examine: 1) Formal analysis: composition, color theory, perspective, and technique. 2) Historical context: the social, political, and cultural environment. 3) Iconography: symbols and their meanings. 4) Artistic influences: who influenced this work/style and who did it influence? 5) Critical reception: how was it received then and now? 6) Conservation: how has the artwork been preserved? Write a detailed art historical analysis using proper terminology and visual evidence.`
  },
  solarSystem: {
    topics: ['The Sun', 'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto Dwarf Planet', 'The Moon', 'Asteroid Belt', 'Comets', 'Meteors', 'Solar Eclipses', 'Lunar Eclipses', 'Seasons on Earth', 'Day and Night', 'Orbits and Rotation', 'Gravity in Space', 'Space Probes', 'Mars Rovers', 'The International Space Station', 'Space Telescopes', 'Rocket Launches', 'Astronauts', 'The Kuiper Belt', 'The Oort Cloud', 'Solar Wind', 'Planet Formation'],
    basic: (t) => `Solar System: ${t}. ${t} is an amazing part of our solar system! Let's learn about what it is and why it is special. Our solar system has the Sun at the center, with planets, moons, and other objects orbiting around it. Draw the solar system and show where ${t.toLowerCase()} belongs. Color your picture and label each part. What is your favorite fact about ${t.toLowerCase()}?`,
    intermediate: (t) => `Solar System: ${t}. Let's explore ${t.toLowerCase()} in detail. 1) Physical characteristics: size, mass, temperature, composition. 2) Location: where is it in the solar system? 3) Movement: how does it orbit or rotate? 4) Exploration: what spacecraft have visited or studied it? 5) Fun facts: what makes ${t.toLowerCase()} unique? Create a fact sheet with at least 15 facts about ${t.toLowerCase()}. Include a diagram with labels, size comparisons to Earth, and a timeline of discoveries.`,
    advanced: (t) => `Solar System: ${t}. An advanced study of ${t.toLowerCase()} in planetary science. Examine: 1) Formation and geological history. 2) Atmospheric composition and dynamics (if applicable). 3) Internal structure and magnetic field. 4) Moons and ring systems. 5) Robotic missions and their discoveries. 6) Current research questions and future exploration plans. 7) Significance for understanding planetary formation and the search for life. Write a scientific report on ${t.toLowerCase()} with data tables, diagrams, and citations.`
  },
  humanBody: {
    topics: ['The Heart', 'The Brain', 'The Lungs', 'The Stomach', 'The Liver', 'The Kidneys', 'The Skeleton', 'Muscles', 'The Skin', 'The Eyes', 'The Ears', 'The Nose', 'The Tongue', 'Teeth', 'The Nervous System', 'The Digestive System', 'The Respiratory System', 'The Circulatory System', 'The Immune System', 'Blood', 'Bones', 'Joints', 'The Spine', 'The Rib Cage', 'The Skull', 'Fingers and Toes', 'Hair and Nails', 'The Five Senses', 'How We Grow', 'Sleep and Dreams'],
    basic: (t) => `Human Body: ${t}. ${t} is an amazing part of your body! Let's learn about what it does and why it is important. Your body has many incredible parts that work together to keep you healthy and strong. Point to where ${t.toLowerCase()} is in your body. What does it help you do? Draw a picture of ${t.toLowerCase()} and label its main parts. How can you take good care of your ${t.toLowerCase()}?`,
    intermediate: (t) => `Human Body: ${t}. Let's explore ${t.toLowerCase()} in more detail. 1) Location: where is it in the body? 2) Structure: what is it made of? 3) Function: what does it do and how does it work? 4) Connections: how does it work with other body systems? 5) Health: how can we keep it healthy? 6) Interesting facts: what is surprising about ${t.toLowerCase()}? Create an informational diagram of ${t.toLowerCase()} with labels, fun facts, and health tips.`,
    advanced: (t) => `Human Body: ${t}. An advanced study of ${t.toLowerCase()} anatomy and physiology. Examine: 1) Detailed anatomy: structures at the organ, tissue, and cellular level. 2) Physiological mechanisms: how does it perform its functions? 3) Homeostasis: how does it maintain balance in the body? 4) Diseases and disorders: what can go wrong? 5) Medical advances: how do doctors treat conditions affecting ${t.toLowerCase()}? 6) Cutting-edge research: what are scientists discovering? Write a detailed biological report on ${t.toLowerCase()} with proper terminology and scientific accuracy.`
  },
  weatherClimate: {
    topics: ['Sunny Days', 'Rain and Rainbows', 'Snow and Ice', 'Thunderstorms', 'Hurricanes', 'Tornadoes', 'Wind', 'Clouds', 'Fog and Mist', 'The Water Cycle', 'Seasons', 'Temperature', 'Humidity', 'Air Pressure', 'Weather Forecasting', 'Climate Zones', 'Tropical Climate', 'Desert Climate', 'Polar Climate', 'Temperate Climate', 'Climate Change', 'Global Warming', 'The Greenhouse Effect', 'Weather Instruments', 'Thermometers', 'Rain Gauges', 'Wind Vanes', 'Barometers', 'Weather Maps', 'Extreme Weather'],
    basic: (t) => `Weather and Climate: ${t}. ${t} is a fascinating weather or climate topic! Let's learn about what it is and how it affects our daily lives. Weather is what happens outside every day - sunshine, rain, snow, and wind. Check the weather outside right now. Is it ${t.toLowerCase()} today? Draw a picture showing ${t.toLowerCase()}. What clothes would you wear in this weather? What activities can you do?`,
    intermediate: (t) => `Weather and Climate: ${t}. Let's explore ${t.toLowerCase()} in depth. 1) What causes it? 2) Where and when does it happen? 3) How does it affect people, plants, and animals? 4) How do scientists measure and predict it? 5) What safety precautions should we take? Create a weather report about ${t.toLowerCase()} as if you were a TV meteorologist. Include a forecast map, temperature information, and safety tips.`,
    advanced: (t) => `Weather and Climate: ${t}. An advanced meteorological study of ${t.toLowerCase()}. Examine: 1) The physical processes and atmospheric conditions that create it. 2) Measurement and data collection methods used by meteorologists. 3) Prediction models and forecasting challenges. 4) Impacts on ecosystems, agriculture, and human settlements. 5) Links to climate patterns (El Nino, jet stream, ocean currents). 6) How climate change may affect frequency and intensity. Write a scientific analysis with data, diagrams, and real-world examples.`
  },
  oceanLife: {
    topics: ['Dolphins', 'Whales', 'Sharks', 'Sea Turtles', 'Octopus', 'Jellyfish', 'Coral Reefs', 'Sea Horses', 'Starfish', 'Crabs', 'Lobsters', 'Seals and Sea Lions', 'Penguins', 'Manta Rays', 'Clownfish', 'Angelfish', 'Pufferfish', 'Swordfish', 'Tuna', 'Salmon', 'Kelp Forests', 'The Deep Sea', 'Tide Pools', 'Ocean Zones', 'The Great Barrier Reef', 'Migration in the Ocean', 'Ocean Food Chains', 'Marine Conservation', 'Plastic in the Ocean', 'Ocean Exploration'],
    basic: (t) => `Ocean Life: ${t}. ${t} are amazing ocean creatures! Let's learn about where they live, what they eat, and what makes them special. The ocean is full of incredible animals and plants, from tiny plankton to giant whales! Draw a picture of ${t.toLowerCase()} swimming in the ocean. What colors did you use? What other sea creatures might live nearby? What is your favorite fact about ${t.toLowerCase()}?`,
    intermediate: (t) => `Ocean Life: ${t}. Let's study ${t.toLowerCase()} in more detail. 1) Classification: what type of animal is it? 2) Habitat: where in the ocean does it live? 3) Adaptations: what special features help it survive? 4) Diet: what does it eat and how does it catch food? 5) Life cycle: how does it grow and reproduce? 6) Conservation: is it endangered and how can we help? Create a marine biology fact file about ${t.toLowerCase()} with detailed illustrations, habitat map, and conservation status.`,
    advanced: (t) => `Ocean Life: ${t}. An advanced marine biology study of ${t.toLowerCase()}. Examine: 1) Evolutionary adaptations to marine environments. 2) Physiological specializations (buoyancy, osmoregulation, pressure adaptation). 3) Ecological role in marine food webs. 4) Behavioral ecology: migration, communication, social structure. 5) Human impacts: overfishing, pollution, climate change effects. 6) Conservation strategies and marine protected areas. Write a comprehensive biological report with scientific terminology, data, and conservation recommendations.`
  },
  dinosaurs: {
    topics: ['Tyrannosaurus Rex', 'Triceratops', 'Stegosaurus', 'Velociraptor', 'Brachiosaurus', 'Pterodactyl', 'Diplodocus', 'Ankylosaurus', 'Parasaurolophus', 'Pteranodon', 'Plesiosaurus', 'Ichthyosaurus', 'Pachycephalosaurus', 'Allosaurus', 'Apatosaurus', 'Spinosaurus', 'Carnotaurus', 'Compsognathus', 'Deinonychus', 'Gallimimus', 'Iguanodon', 'Kentrosaurus', 'Lambeosaurus', 'Maiasaura', 'Nodosaurus', 'Oviraptor', 'Protoceratops', 'Styracosaurus', 'Therizinosaurus', 'Utahraptor'],
    basic: (t) => `Dinosaurs: ${t}. ${t} was an amazing dinosaur that lived long, long ago! Let's learn about what it looked like, what it ate, and where it lived. Dinosaurs roamed the Earth millions of years before people existed. Draw a picture of ${t.toLowerCase()} in its natural habitat. What color did you make it? What plants or other dinosaurs are nearby? If ${t.toLowerCase()} were alive today, what would it need to survive?`,
    intermediate: (t) => `Dinosaurs: ${t}. Let's study ${t.toLowerCase()} in detail. 1) Time period: when did it live (Triassic, Jurassic, or Cretaceous)? 2) Classification: was it a theropod, sauropod, or ornithischian? 3) Size and appearance: how big was it and what did it look like? 4) Diet: was it a carnivore, herbivore, or omnivore? 5) Behavior: did it live in herds? How did it hunt or defend itself? 6) Fossils: where have its fossils been found? Create a dinosaur fact file with measurements, a timeline, and fossil location map.`,
    advanced: (t) => `Dinosaurs: ${t}. An advanced paleontological study of ${t.toLowerCase()}. Examine: 1) Skeletal anatomy and what it reveals about movement and behavior. 2) Phylogenetic relationships within its taxonomic group. 3) Paleoecology: its environment, contemporaries, and ecological niche. 4) Growth and development evidence from bone histology. 5) Debates in paleontology: ongoing questions about appearance, behavior, or classification. 6) Notable fossil specimens and what they taught us. Write a scientific profile with anatomical diagrams, comparison charts, and discussion of current research.`
  },
  famousInventors: {
    topics: ['Thomas Edison', 'Alexander Graham Bell', 'The Wright Brothers', 'Marie Curie', 'Albert Einstein', 'Nikola Tesla', 'Leonardo da Vinci', 'Johannes Gutenberg', 'Galileo Galilei', 'Isaac Newton', 'Benjamin Franklin', 'James Watt', 'Eli Whitney', 'Henry Ford', 'Louis Pasteur', 'Alexander Fleming', 'The Lumiere Brothers', 'Guglielmo Marconi', 'Alfred Nobel', 'Charles Babbage', 'Ada Lovelace', 'George Washington Carver', 'Grace Hopper', 'Tim Berners-Lee', 'Steve Jobs', 'Bill Gates', 'The Light Bulb', 'The Telephone', 'The Printing Press', 'The Steam Engine'],
    basic: (t) => `Famous Inventors: ${t}. ${t} was an amazing inventor who changed the world! Let's learn about their life and their important invention. Inventors see problems and think of creative solutions. They try many times and never give up! Draw a picture of ${t.toLowerCase()} working on their invention. What do you think they are thinking about? If you could invent anything, what would it be and why?`,
    intermediate: (t) => `Famous Inventors: ${t}. Let's learn more about ${t.toLowerCase()}. 1) Biography: when and where did they live? 2) Inspiration: what problem were they trying to solve? 3) The invention process: how did they develop their idea? 4) Challenges: what obstacles did they face? 5) Impact: how did their invention change the world? 6) Legacy: how is their work still important today? Write a biography report about ${t.toLowerCase()} with a timeline, description of their invention, and a diagram of how it works.`,
    advanced: (t) => `Famous Inventors: ${t}. An in-depth study of ${t.toLowerCase()} and their contributions. Examine: 1) Historical context: the scientific and technological landscape of their time. 2) The innovation process: how did they go from idea to working invention? 3) Technical details: how did their invention work? 4) Competition and controversy: were there disputes about credit or priority? 5) Economic and social impact: how did the invention transform society? 6) Lessons for modern innovation. Write a comprehensive report analyzing the invention's technical, historical, and social significance.`
  },
  worldFlags: {
    topics: ['France Flag', 'Germany Flag', 'Italy Flag', 'Spain Flag', 'United Kingdom Flag', 'United States Flag', 'Japan Flag', 'China Flag', 'Brazil Flag', 'Canada Flag', 'Australia Flag', 'India Flag', 'Russia Flag', 'South Africa Flag', 'Mexico Flag', 'Argentina Flag', 'Sweden Flag', 'Norway Flag', 'Switzerland Flag', 'Netherlands Flag', 'Belgium Flag', 'Greece Flag', 'Portugal Flag', 'Ireland Flag', 'Poland Flag', 'Turkey Flag', 'Egypt Flag', 'Kenya Flag', 'South Korea Flag', 'New Zealand Flag'],
    basic: (t) => `World Flags: ${t}. The ${t.toLowerCase()} has beautiful colors and patterns! Every country's flag tells a story about its history, culture, and values. Let's learn about the flag's colors, shapes, and what they mean. Draw the ${t.toLowerCase()} and color it correctly. What colors did you use? Can you find this country on a world map? What do you already know about this country?`,
    intermediate: (t) => `World Flags: ${t}. Let's explore the ${t.toLowerCase()} in depth. 1) Design: what colors, stripes, stars, or symbols appear on the flag? 2) Meaning: what does each color and symbol represent? 3) History: when was this flag adopted and has it changed over time? 4) Protocol: how is the flag used and respected in its country? 5) Similar flags: what other flags look similar? Create a flag study page with the flag drawing, its symbolism explained, a timeline of flag changes, and a map showing the country.`,
    advanced: (t) => `World Flags: ${t}. A comprehensive vexillological study of the ${t.toLowerCase()}. Examine: 1) The flag's design principles: colors, proportions, and symbolism according to vexillography rules. 2) Historical evolution: how has the flag changed and what historical events drove those changes? 3) Cultural significance: what does the flag mean to citizens and how is it used in daily life? 4) Legal framework: laws governing flag use and display. 5) International context: how does the flag represent its nation globally? Write a detailed analysis of the flag's design, history, and significance.`
  },
  sportsAndGames: {
    topics: ['Football (Soccer)', 'Basketball', 'Tennis', 'Swimming', 'Athletics', 'Gymnastics', 'Cycling', 'Volleyball', 'Baseball', 'Ice Hockey', 'Skiing', 'Figure Skating', 'Martial Arts', 'Judo', 'Fencing', 'Rugby', 'Cricket', 'Table Tennis', 'Badminton', 'Handball', 'Field Hockey', 'Boxing', 'Wrestling', 'Archery', 'Shooting', 'Equestrian', 'Sailing', 'Rowing', 'Weightlifting', 'Wheelchair Sports'],
    basic: (t) => `Sports and Games: ${t}. ${t} is an exciting sport that people love to play and watch! Let's learn about the basic rules, equipment, and how to play. Sports are fun ways to stay active, make friends, and learn teamwork. Have you ever played or watched ${t.toLowerCase()}? What do you think would be the most fun part? Draw a picture of someone playing ${t.toLowerCase()} and label the equipment they need.`,
    intermediate: (t) => `Sports and Games: ${t}. Let's explore ${t.toLowerCase()} in more detail. 1) Rules: what are the basic rules and how is the game played? 2) Equipment: what equipment do you need to play? 3) Positions: what are the different roles on a team? 4) Skills: what skills do players need to practice? 5) Famous athletes: who are some famous players or athletes? 6) Competition: what are the major competitions or tournaments? Create a sports guide for ${t.toLowerCase()} with rules, diagrams, player positions, and famous athletes.`,
    advanced: (t) => `Sports and Games: ${t}. An advanced analysis of ${t.toLowerCase()} as a sport. Examine: 1) Technical aspects: biomechanics, training methods, and performance optimization. 2) Tactical analysis: strategies, formations, and game theory. 3) Rules and governance: how is the sport regulated internationally? 4) Sports science: physiology, nutrition, and psychology for athletes. 5) History and evolution: how has the sport changed over time? 6) Social impact: how does the sport influence culture and society? Write a comprehensive sports analysis with technical detail, historical context, and cultural commentary.`
  },
  nutrition: {
    topics: ['Fruits', 'Vegetables', 'Grains', 'Proteins', 'Dairy', 'Vitamins', 'Minerals', 'Water and Hydration', 'Healthy Breakfast', 'Lunch Ideas', 'Dinner Ideas', 'Healthy Snacks', 'Food Groups', 'The Food Pyramid', 'Reading Food Labels', 'Sugar in Food', 'Salt and Sodium', 'Healthy Fats', 'Unhealthy Fats', 'Fiber', 'Calcium', 'Iron', 'Vitamin C', 'Vitamin D', 'Meal Planning', 'Cooking Basics', 'Food Safety', 'Allergies and Intolerances', 'Organic Food', 'Balanced Diet'],
    basic: (t) => `Nutrition: ${t}. ${t} is an important part of eating healthy! Let's learn about what ${t.toLowerCase()} are and why they are good for you. Food gives your body energy and helps you grow strong. Color a picture of your favorite ${t.toLowerCase()}. How many different ${t.toLowerCase()} can you name? Try to eat a rainbow of different colored foods every day for the best nutrition!`,
    intermediate: (t) => `Nutrition: ${t}. Let's explore ${t.toLowerCase()} in more detail. 1) What nutrients does it provide? 2) How much should we eat each day? 3) What are the best sources? 4) How does it help our bodies? 5) What happens if we don't get enough? Create a nutrition fact sheet about ${t.toLowerCase()} with serving sizes, health benefits, and tasty recipe ideas. Try keeping a food diary for a week - are you getting enough of each food group?`,
    advanced: (t) => `Nutrition: ${t}. An advanced study of ${t.toLowerCase()} in human nutrition. Examine: 1) Biochemical role: how the body processes and uses these nutrients. 2) Recommended dietary allowances and factors affecting requirements. 3) Deficiency diseases and their prevention. 4) The role of ${t.toLowerCase()} in chronic disease prevention. 5) Nutritional science research methods and evidence evaluation. 6) Cultural and ethical dimensions of food choices. Write a detailed nutritional analysis with scientific terminology, dietary guidelines, and evidence-based recommendations.`
  },
  emotions: {
    topics: ['Happiness', 'Sadness', 'Anger', 'Fear', 'Surprise', 'Disgust', 'Love', 'Jealousy', 'Embarrassment', 'Pride', 'Shame', 'Guilt', 'Gratitude', 'Empathy', 'Compassion', 'Courage', 'Loneliness', 'Excitement', 'Nervousness', 'Calmness', 'Frustration', 'Hope', 'Disappointment', 'Curiosity', 'Boredom', 'Confidence', 'Insecurity', 'Kindness', 'Patience', 'Resilience'],
    basic: (t) => `Emotions: ${t}. ${t} is a feeling that everyone experiences! It is okay to feel ${t.toLowerCase()} sometimes. Let's learn about what ${t.toLowerCase()} feels like in your body and what situations might make you feel this way. Draw a face showing ${t.toLowerCase()}. What color is ${t.toLowerCase()} to you? Can you think of a time when you felt ${t.toLowerCase()}? What helped you feel better?`,
    intermediate: (t) => `Emotions: ${t}. Let's explore the emotion of ${t.toLowerCase()} more deeply. 1) What triggers this feeling? 2) How does it feel in your body? 3) What thoughts come with this emotion? 4) Healthy ways to express ${t.toLowerCase()}. 5) How to support others who feel this way. Write about a time you felt ${t.toLowerCase()}. What happened? How did you handle it? What would you tell a friend who was feeling ${t.toLowerCase()}?`,
    advanced: (t) => `Emotions: ${t}. An advanced exploration of ${t.toLowerCase()} from psychological and neuroscientific perspectives. Examine: 1) The evolutionary function of ${t.toLowerCase()} as an adaptive response. 2) Brain regions and neurochemistry involved in processing ${t.toLowerCase()}. 3) Cultural differences in the expression and regulation of ${t.toLowerCase()}. 4) The relationship between ${t.toLowerCase()} and mental health. 5) Emotional intelligence: recognizing, understanding, and managing ${t.toLowerCase()} in yourself and others. Write a reflective analysis integrating scientific understanding with personal insight.`
  },
  fairyTales: {
    topics: ['Cinderella', 'Snow White', 'Little Red Riding Hood', 'Hansel and Gretel', 'The Three Little Pigs', 'Goldilocks and the Three Bears', 'Sleeping Beauty', 'Rapunzel', 'The Frog Prince', 'Rumpelstiltskin', 'Beauty and the Beast', 'The Little Mermaid', 'The Ugly Duckling', 'The Emperors New Clothes', 'The Princess and the Pea', 'Jack and the Beanstalk', 'Puss in Boots', 'Tom Thumb', 'The Elves and the Shoemaker', 'The Pied Piper', 'The Snow Queen', 'The Wild Swans', 'The Twelve Dancing Princesses', 'The Little Match Girl', 'The Steadfast Tin Soldier', 'Thumbelina', 'The Boy Who Cried Wolf', 'The Tortoise and the Hare', 'The Lion and the Mouse', 'The Ant and the Grasshopper'],
    basic: (t) => `Fairy Tale: ${t}. "${t}" is a classic story that has been told for many generations! Fairy tales teach us important lessons about kindness, courage, and making good choices. As you read this story, think about: Who is the main character? What problem do they face? How is the problem solved? What lesson does the story teach? Draw your favorite scene from "${t}" and explain why you like it.`,
    intermediate: (t) => `Fairy Tale: ${t}. Let's analyze "${t}" more carefully. 1) Characters: who are the heroes, villains, and helpers? 2) Setting: where and when does the story take place? 3) Conflict: what problem needs to be solved? 4) Magic: what magical elements appear in the story? 5) Moral: what lesson is the story teaching? Compare this version with versions from other cultures. How are they similar? How are they different? Rewrite the ending in your own creative way.`,
    advanced: (t) => `Fairy Tale: ${t}. An advanced literary and cultural analysis of "${t}". Examine: 1) The historical origins and evolution of the tale across different cultures and time periods. 2) Archetypal characters and their psychological significance (Jungian analysis). 3) Social and cultural values embedded in the story. 4) The role of fairy tales in child development and moral education. 5) Modern retellings and adaptations (feminist, postmodern, multicultural). Write a critical analysis examining what "${t}" reveals about the culture that produced it and why it continues to resonate with modern audiences.`
  },
  multiplication: {
    topics: ['Times Tables 1', 'Times Tables 2', 'Times Tables 3', 'Times Tables 4', 'Times Tables 5', 'Times Tables 6', 'Times Tables 7', 'Times Tables 8', 'Times Tables 9', 'Times Tables 10', 'Times Tables 11', 'Times Tables 12', 'Multiplying by 0', 'Multiplying by 1', 'Multiplying by 10', 'Multiplying by 100', 'Double Digit Multiplication', 'Triple Digit Multiplication', 'Multiplication Arrays', 'Repeated Addition', 'Multiplying with Groups', 'Multiplication Word Problems', 'Factors and Products', 'Commutative Property', 'Associative Property', 'Distributive Property', 'Multiplication Facts', 'Speed Multiplication', 'Multiplication Patterns', 'Square Numbers'],
    basic: (t) => `Multiplication: ${t}. Let's learn about ${t.toLowerCase()}! Multiplication is a fast way to add the same number many times. For example, 3 x 4 means 3 groups of 4, which equals 12. Practice: draw groups of objects to show ${t.toLowerCase()} in action. Use your fingers, toys, or snacks to count in groups. The more you practice, the faster you will be at multiplication!`,
    intermediate: (t) => `Multiplication: ${t}. Now let's master ${t.toLowerCase()} with bigger numbers and real-world problems. 1) Review the multiplication table for this set of facts. 2) Practice with a timer - how fast can you solve 10 problems? 3) Write a word problem that uses ${t.toLowerCase()}. 4) Try working backwards - if you know the product, what could the factors be? Challenge: A box has 6 rows with 8 cookies in each row. How many cookies are there in total? Solve using ${t.toLowerCase()} and explain your thinking.`,
    advanced: (t) => `Multiplication: ${t}. Advanced multiplication concepts. Examine: 1) The relationship between multiplication and area (array model). 2) Multiplying by powers of 10 and its effect on place value. 3) The distributive property: breaking apart difficult multiplication into easier parts. 4) Multiplication patterns in nature and number systems. 5) Multiplying multi-digit numbers using standard algorithm and alternative methods (lattice, partial products). Solve this: A school has 24 classrooms, each with 28 desks. Use two different multiplication methods to find the total number of desks. Which method is more efficient and why?`
  },
  fractions: {
    topics: ['What is a Fraction', 'Half and Quarter', 'Third and Sixth', 'Fifth and Tenth', 'Eighth and Twelfth', 'Numerator and Denominator', 'Equivalent Fractions', 'Comparing Fractions', 'Fractions on a Number Line', 'Proper Fractions', 'Improper Fractions', 'Mixed Numbers', 'Adding Fractions', 'Subtracting Fractions', 'Multiplying Fractions', 'Dividing Fractions', 'Fractions of a Set', 'Fractions of a Whole', 'Simplifying Fractions', 'Common Denominators', 'Fractions Greater Than 1', 'Fractions in Daily Life', 'Fraction Word Problems', 'Fractions and Decimals', 'Fractions and Percentages', 'Converting Fractions', 'Fraction Patterns', 'Benchmark Fractions', 'Fraction Kits', 'Fraction Estimation'],
    basic: (t) => `Fractions: ${t}. Let's learn about ${t.toLowerCase()}! A fraction shows a part of a whole. Imagine cutting a pizza into equal slices - each slice is a fraction of the whole pizza. Draw a picture showing ${t.toLowerCase()}. Color the parts that represent the fraction. Practice folding paper into equal parts to see how fractions work. Can you find examples of fractions around your home?`,
    intermediate: (t) => `Fractions: ${t}. Let's go deeper with ${t.toLowerCase()}. 1) Visualize: draw a diagram showing this fraction concept. 2) Compare: how does this fraction compare to 1/2? Is it greater or smaller? 3) Equivalence: what other fractions are equal? 4) Operations: try adding or subtracting with ${t.toLowerCase()}. 5) Real-world: find an example of ${t.toLowerCase()} in a recipe, measurement, or store. Challenge: A cake recipe needs 2/3 cup of sugar. If you want to make half the recipe, how much sugar do you need?`,
    advanced: (t) => `Fractions: ${t}. Advanced fraction concepts. Examine: 1) The mathematical definition of fractions as rational numbers. 2) Fraction equivalence and the concept of the greatest common factor. 3) Operations with fractions: finding common denominators, cross-multiplication, and fraction arithmetic. 4) Converting between fractions, decimals, and percentages. 5) Applications in ratios, proportions, and probability. Problem: A recipe requires 3/4 cup of flour and 1/3 cup of sugar. What is the total amount of dry ingredients? Express your answer as a simplified fraction, a decimal, and a percentage.`
  },
  geometry: {
    topics: ['Points and Lines', 'Line Segments', 'Rays', 'Angles', 'Right Angles', 'Acute Angles', 'Obtuse Angles', 'Straight Lines', 'Curved Lines', '2D Shapes', 'Triangles', 'Quadrilaterals', 'Pentagons', 'Hexagons', 'Circles', 'Ovals', '3D Shapes', 'Cubes', 'Spheres', 'Cylinders', 'Cones', 'Pyramids', 'Prisms', 'Symmetry', 'Line Symmetry', 'Rotational Symmetry', 'Perimeter', 'Area', 'Volume', 'Coordinate Grids'],
    basic: (t) => `Geometry: ${t}. Let's learn about ${t.toLowerCase()}! Geometry is the study of shapes, sizes, and the space around us. ${t} is everywhere - look around your room and see how many ${t.toLowerCase()} you can find! Draw and color different examples of ${t.toLowerCase()}. Go on a shape hunt around your home or neighborhood - what ${t.toLowerCase()} can you spot in buildings, signs, or nature?`,
    intermediate: (t) => `Geometry: ${t}. Let's explore ${t.toLowerCase()} in more detail. 1) Definition: what are the properties of ${t.toLowerCase()}? 2) Examples: find or draw at least 5 examples. 3) Measurement: how can we measure ${t.toLowerCase()}? 4) Relationships: how does ${t.toLowerCase()} relate to other geometric concepts? 5) Construction: try drawing ${t.toLowerCase()} using a ruler, compass, or protractor. Challenge: Create a geometric pattern or design using ${t.toLowerCase()} as a repeating element.`,
    advanced: (t) => `Geometry: ${t}. An advanced study of ${t.toLowerCase()} in geometry. Examine: 1) Formal geometric definitions and theorems related to ${t.toLowerCase()}. 2) Proofs and logical reasoning about properties of ${t.toLowerCase()}. 3) Coordinate geometry: representing ${t.toLowerCase()} on a coordinate plane. 4) Real-world applications in architecture, engineering, art, and design. 5) Connections to trigonometry and calculus for curved and complex forms. Write a geometric analysis with diagrams, formulas, and proofs illustrating the key properties and applications of ${t.toLowerCase()}.`
  },
  timeAndCalendar: {
    topics: ['Telling Time Hours', 'Telling Time Half Hours', 'Telling Time Quarter Hours', 'Telling Time Five Minutes', 'Telling Time Minutes', 'AM and PM', 'The 24-Hour Clock', 'Days of the Week', 'Months of the Year', 'Seasons', 'Reading a Calendar', 'Scheduling', 'Elapsed Time', 'Time Duration', 'Time Words', 'Morning Routine', 'Afternoon Routine', 'Evening Routine', 'Time Management', 'Clocks Around the World', 'Daylight Saving', 'Leap Year', 'Decades and Centuries', 'Timelines', 'Historical Dates', 'Birthdays and Holidays', 'Weekly Planning', 'Monthly Planning', 'Annual Events', 'Time Zones'],
    basic: (t) => `Time and Calendar: ${t}. Let's learn about ${t.toLowerCase()}! Understanding time helps us organize our day and know when things happen. Practice reading a clock - where do the big hand and little hand point? Look at a calendar - what day is it today? What month? What season? Draw a picture showing something you do at a specific time each day. Can you set a clock to show your favorite time of day?`,
    intermediate: (t) => `Time and Calendar: ${t}. Let's explore ${t.toLowerCase()} more deeply. 1) Reading time: practice telling time to the exact minute. 2) Elapsed time: how long does an activity take? 3) Scheduling: plan your day using a schedule. 4) Calendar skills: find dates, count days between events, plan ahead. 5) Time vocabulary: use words like morning, afternoon, evening, midnight, noon correctly. Challenge: If you start reading at 3:15 PM and read for 45 minutes, what time will you finish? Solve this elapsed time problem.`,
    advanced: (t) => `Time and Calendar: ${t}. An advanced study of time measurement and calendar systems. Examine: 1) The history of timekeeping: from sundials to atomic clocks. 2) Different calendar systems: Gregorian, Julian, lunar, and others. 3) The science of time: Earth's rotation, orbit, and the definition of a second. 4) Time zones: how they work and why they were created. 5) Time in mathematics: calculations involving time, rates, and schedules. Write a report exploring how different cultures have measured and understood time throughout history.`
  },
  moneyMath: {
    topics: ['Identifying Coins', 'Coin Values', 'Counting Coins', 'Identifying Bills', 'Bill Values', 'Counting Money', 'Making Change', 'Adding Money', 'Subtracting Money', 'Comparing Prices', 'Shopping Scenarios', 'Budgeting Basics', 'Saving Money', 'Spending Money', 'Earning Money', 'Wants vs Needs', 'Paying at the Store', 'Calculating Total Cost', 'Sales and Discounts', 'Tax', 'Unit Pricing', 'Best Value', 'Allowance Planning', 'Banking Basics', 'Checking Accounts', 'Saving Accounts', 'Charity and Giving', 'Money Word Problems', 'Currency Around the World', 'Digital Money'],
    basic: (t) => `Money Math: ${t}. Let's learn about ${t.toLowerCase()}! Money helps us buy things we need and want. Different coins and bills have different values. Practice identifying coins - what is each one worth? Can you count a group of coins and tell how much money there is? Draw pictures of coins and write their values. If you have 3 quarters, how much money do you have? Practice counting money with real or pretend coins!`,
    intermediate: (t) => `Money Math: ${t}. Let's practice ${t.toLowerCase()} with real-world scenarios. 1) Counting: count a mix of coins and bills. 2) Making change: if something costs $3.75 and you pay with $5.00, what is your change? 3) Comparing: which is the better deal - one toy for $4.99 or two for $9.00? 4) Budgeting: you have $10.00 to spend on snacks. What can you buy? 5) Saving: if you save $2.00 each week, how long until you have $20.00? Create a shopping list with prices and calculate the total cost.`,
    advanced: (t) => `Money Math: ${t}. Advanced financial mathematics. Examine: 1) Percentage calculations for discounts, tax, and tips. 2) Simple and compound interest concepts. 3) Budget creation and financial planning. 4) Exchange rates and international currency conversion. 5) Understanding profit, loss, and break-even points. Problem: You have $50.00 to spend on school supplies. Pencils cost $0.75 each, notebooks cost $2.50 each, and a backpack costs $25.00. If you need at least 10 pencils, 3 notebooks, and 1 backpack, create a budget that covers all items and calculate the total cost and remaining money.`
  },
  codingBasics: {
    topics: ['What is Code', 'Algorithms', 'Sequences', 'Patterns', 'Loops', 'Conditionals', 'Debugging', 'Variables', 'Input and Output', 'Events', 'Functions', 'Parameters', 'Arrays', 'Strings', 'Numbers', 'Boolean Logic', 'Comparison Operators', 'Logical Operators', 'Flowcharts', 'Pseudocode', 'Step by Step', 'Problem Solving', 'Computational Thinking', 'Decomposition', 'Abstraction', 'Pattern Recognition', 'Coding Languages', 'Scratch Basics', 'Block Coding', 'Text Coding'],
    basic: (t) => `Coding Basics: ${t}. Let's learn about ${t.toLowerCase()}! Coding is how we tell computers what to do. It is like giving very detailed instructions to a friend. When you learn to code, you learn to solve problems in a logical way. Try this: write step-by-step instructions for making a sandwich. That's an algorithm! ${t.toLowerCase()} is a building block of coding. Can you think of an example from your daily life?`,
    intermediate: (t) => `Coding Basics: ${t}. Let's apply ${t.toLowerCase()} to create simple programs. 1) Define: what does ${t.toLowerCase()} mean in programming? 2) Examples: write a simple code example using ${t.toLowerCase()}. 3) Practice: solve a coding problem that uses ${t.toLowerCase()}. 4) Debug: what happens if you make a mistake with ${t.toLowerCase()}? 5) Create: write a short program (in Scratch, Python, or pseudocode) that demonstrates ${t.toLowerCase()}. Challenge: Can you explain ${t.toLowerCase()} to someone who has never coded before?`,
    advanced: (t) => `Coding Basics: ${t}. Advanced understanding of ${t.toLowerCase()} in computer science. Examine: 1) The theoretical foundation: how ${t.toLowerCase()} is implemented in programming languages. 2) Best practices and common patterns for using ${t.toLowerCase()}. 3) The relationship between ${t.toLowerCase()} and program efficiency. 4) Common errors and debugging strategies related to ${t.toLowerCase()}. 5) How ${t.toLowerCase()} concepts appear across different programming paradigms (imperative, functional, object-oriented). Write a technical explanation with code examples and complexity analysis demonstrating mastery of ${t.toLowerCase()}.`
  },
  environmentalScience: {
    topics: ['Ecosystems', 'Habitats', 'Food Chains', 'Food Webs', 'Biodiversity', 'Conservation', 'Recycling', 'Composting', 'Renewable Energy', 'Solar Power', 'Wind Power', 'Hydro Power', 'Water Conservation', 'Air Quality', 'Pollution', 'Plastic Pollution', 'Deforestation', 'Climate Change', 'Global Warming', 'Carbon Footprint', 'Endangered Species', 'National Parks', 'Rainforests', 'Wetlands', 'Oceans and Seas', 'Sustainable Living', 'Reduce Reuse Recycle', 'Green Transportation', 'Organic Farming', 'Environmental Activism'],
    basic: (t) => `Environmental Science: ${t}. Let's learn about ${t.toLowerCase()} and why it is important for our planet! Our Earth is a beautiful place with many amazing environments. We can all help take care of it. Draw a picture showing ${t.toLowerCase()} in action. What is one thing you can do today to help protect ${t.toLowerCase()}? Every small action helps make a big difference for our planet!`,
    intermediate: (t) => `Environmental Science: ${t}. Let's explore ${t.toLowerCase()} in more detail. 1) What is it and why is it important? 2) How does it affect plants, animals, and people? 3) What are the biggest challenges facing ${t.toLowerCase()}? 4) What solutions are scientists and communities working on? 5) What can you do to help? Create an environmental action plan about ${t.toLowerCase()} with things you can do at home, at school, and in your community. Track your progress for a week.`,
    advanced: (t) => `Environmental Science: ${t}. An advanced study of ${t.toLowerCase()} and its role in environmental systems. Examine: 1) The scientific principles governing ${t.toLowerCase()}. 2) Human impacts and their environmental consequences. 3) Policy and regulatory approaches to protection and management. 4) Technological innovations for sustainability. 5) The intersection of environmental science with economics, ethics, and social justice. 6) Future scenarios and the role of individual and collective action. Write a comprehensive environmental assessment with scientific data, policy analysis, and actionable recommendations.`
  },
  famousWomen: {
    topics: ['Marie Curie', 'Rosa Parks', 'Florence Nightingale', 'Frida Kahlo', 'Amelia Earhart', 'Malala Yousafzai', 'Harriet Tubman', 'Ada Lovelace', 'Anne Frank', 'Helen Keller', 'Maya Angelou', 'Jane Goodall', 'Eleanor Roosevelt', 'Rosalind Franklin', 'Maria Montessori', 'Catherine the Great', 'Joan of Arc', 'Mothers Teresa', 'Wangari Maathai', 'Indira Gandhi', 'Angela Merkel', 'Queen Elizabeth I', 'Sacagawea', 'Susan B. Anthony', 'Billie Jean King', 'Emily Dickinson', 'Georgia OKeeffe', 'Grace Hopper', 'Katherine Johnson', 'Mae Jemison'],
    basic: (t) => `Famous Women: ${t}. ${t} was an amazing woman who made a difference in the world! Let's learn about her life and what she accomplished. Women throughout history have done incredible things in science, art, politics, and many other fields. Draw a picture of ${t.toLowerCase()} doing something important. What would you like to ask ${t.toLowerCase()} if you could meet her? What made her brave or special?`,
    intermediate: (t) => `Famous Women: ${t}. Let's learn more about ${t.toLowerCase()}. 1) Biography: when and where did she live? 2) Challenges: what obstacles did she face? 3) Achievements: what important things did she do? 4) Impact: how did her work change the world? 5) Legacy: how is she remembered today? 6) Inspiration: what can we learn from her story? Write a biographical report about ${t.toLowerCase()} with a timeline of important events, photographs or illustrations, and a discussion of her lasting impact on the world.`,
    advanced: (t) => `Famous Women: ${t}. An in-depth study of ${t.toLowerCase()} and her contributions within historical context. Examine: 1) The social, political, and cultural barriers she faced and overcame. 2) The significance of her achievements within her field. 3) How her work influenced subsequent generations. 4) Historiographical perspectives: how has her story been told and retold? 5) Contemporary relevance: what lessons does her life offer for today? Write a comprehensive biographical analysis that places ${t.toLowerCase()} within the broader context of women's history and evaluates her lasting significance.`
  },
  worldReligions: {
    topics: ['Christianity', 'Islam', 'Hinduism', 'Buddhism', 'Judaism', 'Sikhism', 'Taoism', 'Confucianism', 'Shinto', 'Baha-i Faith', 'Jainism', 'Zoroastrianism', 'Christmas', 'Easter', 'Ramadan', 'Diwali', 'Hanukkah', 'Vesak', 'Eid al-Fitr', 'Yom Kippur', 'Divali', 'Lent', 'Advent', 'Pilgrimages', 'Places of Worship', 'Prayer', 'Meditation', 'Holy Books', 'Religious Symbols', 'Interfaith Dialogue'],
    basic: (t) => `World Religions: ${t}. ${t} is a religion that many people around the world follow. Let's learn about its beliefs, traditions, and what makes it special. Different religions have different ways of celebrating, praying, and understanding the world. Draw a symbol or picture that represents ${t.toLowerCase()}. What is one interesting thing you learned about this religion? Why is it important to respect all religions?`,
    intermediate: (t) => `World Religions: ${t}. Let's explore ${t.toLowerCase()} in more depth. 1) Origins: when and where did this religion begin? 2) Beliefs: what are the main beliefs? 3) Practices: what holidays, rituals, and traditions do followers observe? 4) Sacred texts: what are the holy books? 5) Places of worship: where do followers gather? 6) Global presence: how many followers are there and where do they live? Create a comparative religion chart showing ${t.toLowerCase()} alongside two other religions, highlighting similarities and differences in beliefs and practices.`,
    advanced: (t) => `World Religions: ${t}. An advanced academic study of ${t.toLowerCase()} from a comparative religion perspective. Examine: 1) Historical development and major historical figures. 2) Core theological concepts and philosophical underpinnings. 3) Sacred texts: their authorship, interpretation, and role in the tradition. 4) Ritual practices and their symbolic meanings. 5) The religion's relationship with society, politics, and culture. 6) Contemporary developments and challenges. 7) Interfaith dialogue and shared values across traditions. Write a scholarly analysis demonstrating understanding of ${t.toLowerCase()} with respect and academic rigor.`
  },
  communicationSkills: {
    topics: ['Active Listening', 'Speaking Clearly', 'Asking Questions', 'Taking Turns', 'Body Language', 'Eye Contact', 'Tone of Voice', 'Polite Words', 'Apologizing', 'Giving Compliments', 'Receiving Compliments', 'Expressing Feelings', 'Disagreeing Respectfully', 'Asking for Help', 'Offering Help', 'Public Speaking', 'Storytelling', 'Giving Instructions', 'Following Instructions', 'Telephone Skills', 'Writing Letters', 'Saying Thank You', 'Introducing Yourself', 'Introducing Others', 'Small Talk', 'Negotiation', 'Conflict Resolution', 'Group Discussion', 'Presentations', 'Persuasion'],
    basic: (t) => `Communication Skills: ${t}. Let's learn about ${t.toLowerCase()}! Good communication helps us share our thoughts and feelings with others. When we communicate well, we make friends, solve problems, and understand each other better. Practice ${t.toLowerCase()} today with a family member or friend. How did it feel? What worked well? What could you do better next time? Remember: good communication takes practice!`,
    intermediate: (t) => `Communication Skills: ${t}. Let's practice ${t.toLowerCase()} more deliberately. 1) What does good ${t.toLowerCase()} look and sound like? 2) Watch someone who communicates well - what do they do? 3) Practice ${t.toLowerCase()} in a safe setting with someone you trust. 4) Ask for feedback: what did you do well? What could improve? 5) Reflect: how did using ${t.toLowerCase()} change the interaction? Create a personal communication goal for ${t.toLowerCase()} and practice it every day for a week. Write about your progress.`,
    advanced: (t) => `Communication Skills: ${t}. An advanced study of ${t.toLowerCase()} in interpersonal and professional communication. Examine: 1) The psychology of effective communication: how message, medium, and receiver interact. 2) Cultural differences in communication styles. 3) Non-verbal communication and its relationship to verbal messages. 4) Communication barriers and strategies to overcome them. 5) The role of empathy and emotional intelligence in communication. 6) Digital communication: email, messaging, video calls, and social media etiquette. Write a reflective analysis of your own communication style and create a personal development plan for improving ${t.toLowerCase()}.`
  },
  criticalThinking: {
    topics: ['Asking Why', 'Fact vs Opinion', 'Reliable Sources', 'Identifying Bias', 'Making Predictions', 'Cause and Effect', 'Comparing and Contrasting', 'Classifying', 'Sequencing', 'Analyzing Arguments', 'Drawing Conclusions', 'Making Inferences', 'Problem Solving Steps', 'Evaluating Evidence', 'Recognizing Patterns', 'Brainstorming', 'Mind Mapping', 'Decision Making', 'Pros and Cons', 'Logical Fallacies', 'Assumptions', 'Hypotheses', 'Testing Ideas', 'Asking Questions', 'Curiosity', 'Open-Mindedness', 'Perspective Taking', 'Ethical Thinking', 'Creative Problem Solving', 'Reflection'],
    basic: (t) => `Critical Thinking: ${t}. Let's learn about ${t.toLowerCase()}! Critical thinking means thinking carefully and asking good questions. It helps us make better decisions and understand the world around us. Practice ${t.toLowerCase()} today: when you learn something new, ask yourself: how do I know this is true? What evidence supports it? Is there another way to look at it? Draw a picture that shows your thinking process when you solve a problem.`,
    intermediate: (t) => `Critical Thinking: ${t}. Let's practice ${t.toLowerCase()} with real examples. 1) Define: what does ${t.toLowerCase()} mean in critical thinking? 2) Example: find a real example and analyze it using ${t.toLowerCase()}. 3) Practice: work through a problem using ${t.toLowerCase()} step by step. 4) Reflect: how did using ${t.toLowerCase()} change your understanding? 5) Apply: find another situation where ${t.toLowerCase()} would be helpful. Create a thinking routine or checklist for ${t.toLowerCase()} that you can use in different situations. Test it and refine it.`,
    advanced: (t) => `Critical Thinking: ${t}. An advanced exploration of ${t.toLowerCase()} in logic, reasoning, and epistemology. Examine: 1) The philosophical foundations of critical thinking: logic, argumentation, and the nature of knowledge. 2) Cognitive biases and how they affect our thinking. 3) Formal and informal logical fallacies: identification and analysis. 4) Scientific reasoning: hypothesis testing, correlation vs causation, and experimental design. 5) Metacognition: thinking about your own thinking processes. 6) Applying critical thinking to real-world issues: media literacy, scientific claims, and ethical dilemmas. Write a critical analysis of a real-world argument using the tools and frameworks of critical thinking.`
  }
};

const ENRICHMENT = {
  mathProblems: {
    text: (t, level) => {
      const facts = [
        `Did you know? The word "${t.toLowerCase()}" comes from Latin and has been used in mathematics for centuries. Understanding ${t.toLowerCase()} helps us solve problems in everyday life, from calculating change at the store to measuring ingredients for a recipe.`,
        `Here is a practice problem: If you have 24 objects and want to share them equally among 6 people, how many does each person get? Try solving this using ${t.toLowerCase()} concepts. Show your work step by step and check your answer by working backwards.`,
        `Real-world connection: Architects, engineers, and scientists use ${t.toLowerCase()} every day. When a building is designed, the architect must calculate loads, angles, and measurements using mathematical principles. When a rocket launches, NASA scientists use ${t.toLowerCase()} to calculate trajectories and fuel requirements.`,
        level === 'Basic'
          ? `Try this: Look around your room and find 5 examples where ${t.toLowerCase()} is being used. Count the number of windows, measure the length of your desk, or calculate how many toys fit on a shelf. Mathematics is everywhere!`
          : level === 'Intermediate'
          ? `Challenge problem: A garden has 48 flowers arranged in 6 rows. Each row has the same number of flowers. If 3 more flowers are added to each row, how many flowers will be in the garden now? Solve this using ${t.toLowerCase()} and explain each step.`
          : `Advanced problem: A train leaves Station A traveling at 80 km/h. Another train leaves Station B traveling at 100 km/h. The stations are 360 km apart. If both trains leave at the same time and travel toward each other, how long will it take for them to meet? Use ${t.toLowerCase()} to set up and solve this equation.`
      ];
      return facts.join('\n\n');
    }
  },
  vocabulary: {
    text: (t, level) => {
      return [
        `Building a strong vocabulary is like adding tools to your toolbox. Every new word gives you a better way to express your thoughts, understand what you read, and communicate with others. The word "${t}" represents an entire category of important terms.`,
        `Practice tip: Create flashcards with ${t.toLowerCase()}-related words on one side and their definitions on the other. Try to use at least three new ${t.toLowerCase()} words in conversation today. The more you use a word, the better you remember it!`,
        `Word origins: Many English words have fascinating histories. Some come from Latin, others from Greek, French, German, or even Arabic. Learning where words come from can help you understand their meanings and remember them more easily. Can you research the origin of a ${t.toLowerCase()} word?`,
        `Challenge: Write a short story that uses at least 10 ${t.toLowerCase()} words. Underline each vocabulary word and see if a friend can identify them all. This exercise builds both vocabulary and creative writing skills at the same time.`
      ].join('\n\n');
    }
  },
  readingComprehension: {
    text: (t, level) => {
      return [
        `Reading comprehension is the ability to understand, analyze, and reflect on what you read. When we read "${t}", we practice skills that help us in every school subject and in daily life - following instructions, understanding news articles, and enjoying stories.`,
        `Active reading strategies: Before reading, look at the title and predict what the story might be about. While reading, pause occasionally to summarize what has happened so far. After reading, think about the main idea and how the story made you feel. These strategies work for any text you read.`,
        `Building connections: Good readers connect what they read to their own experiences, to other books they have read, and to the world around them. As you read "${t}", think about times when you felt similar emotions or faced similar situations. How would you have reacted?`,
        level === 'Basic'
          ? `Discussion questions for "${t}": 1) Who is the main character and what are they like? 2) Where and when does the story take place? 3) What problem does the character face? 4) How is the problem solved? 5) What lesson does the character learn? Draw a picture of your favorite scene.`
          : level === 'Intermediate'
          ? `Critical thinking: In "${t}", consider the author's purpose. Why did they write this story? What message are they trying to share? How does the author's choice of words affect the mood? Identify three specific sentences that create a particular feeling or atmosphere.`
          : `Literary analysis: Examine "${t}" for narrative structure, character development, and thematic elements. How does the author use foreshadowing, symbolism, or irony? What is the central conflict and how does it resolve? Compare the protagonist's journey to the classic hero's journey pattern identified by Joseph Campbell.`
      ].join('\n\n');
    }
  },
  grammarExercises: {
    text: (t, level) => {
      return [
        `Grammar is the system of rules that makes language clear and understandable. Understanding ${t.toLowerCase()} helps you write more effectively and communicate your ideas with precision. Good grammar is like a well-organized toolbox - every tool has its proper place and use.`,
        `Common mistakes to avoid: Many writers struggle with ${t.toLowerCase()}. Here is a tip: read your sentences aloud. If something sounds wrong, trust your ear and revise. Reading your writing backwards (starting from the last sentence) helps you spot grammar errors that your brain would otherwise skip over.`,
        `Practice exercise: Write five sentences that correctly use ${t.toLowerCase()}. Then, exchange your sentences with a study partner and check each other's work. Can you identify and correct any errors? Remember that even professional writers use editors and proofreaders to catch mistakes.`,
        `Real-world application: Strong grammar skills are essential for academic success, professional communication, and clear self-expression. Colleges and employers consistently rank writing ability as one of the most important skills. Every email, report, and presentation you create will benefit from solid grammar knowledge.`
      ].join('\n\n');
    }
  },
  scienceExperiments: {
    text: (t, level) => {
      return [
        `The scientific method is the process scientists use to explore questions and discover answers. It includes asking a question, doing research, forming a hypothesis, testing it through experiments, analyzing data, and drawing conclusions. Every great scientific discovery started with curiosity and careful experimentation.`,
        `Safety first: Before beginning any experiment, review the safety guidelines. Wear protective equipment like goggles and gloves when needed. Work in a well-ventilated area. Have an adult present for experiments involving heat, chemicals, or sharp objects. Science is exciting, but safety always comes first.`,
        `Recording observations: Use a science notebook to record your hypothesis, materials, procedure, observations, and conclusions. Write down everything you see, hear, smell, and feel during the experiment. Take photographs at each step. Detailed notes help you remember what happened and share your findings with others.`,
        level === 'Basic'
          ? `Try this variation: Change one thing about the experiment and see what happens. For example, if the original experiment uses hot water, try cold water instead. If it uses a small amount of an ingredient, try using more. Compare your results to the original. What did you discover?`
          : `Data analysis: Create a table to organize your measurements and observations. Calculate averages if you ran multiple trials. Draw a graph showing your results - bar graphs are good for comparing categories, while line graphs show trends over time. What patterns do you see in your data?`
      ].join('\n\n');
    }
  },
  scienceArticles: {
    text: (t, level) => {
      return [
        `Scientific discovery is an ongoing process. Our understanding of ${t.toLowerCase()} has evolved over time as new evidence has been gathered and new technologies have been developed. Scientists continue to study ${t.toLowerCase()} to deepen our knowledge and find practical applications.`,
        `Key scientists in this field have made groundbreaking contributions through careful observation, experimentation, and collaboration. Their work demonstrates the importance of curiosity, persistence, and critical thinking in the scientific method.`,
        level === 'Basic'
          ? `Connections to daily life: You encounter principles related to ${t.toLowerCase()} every day without even realizing it. Pay attention to the world around you and try to identify how scientific concepts explain everyday phenomena.`
          : `Latest research: Recent studies have revealed new insights about ${t.toLowerCase()}. Scientists are using advanced tools like electron microscopes, space telescopes, and DNA sequencing to explore questions that were previously impossible to answer. What new discoveries might the next decade bring?`
      ].join('\n\n');
    }
  },
  historyEvents: {
    text: (t, level) => {
      return [
        `Historical events shape our present and future. The study of ${t.toLowerCase()} helps us understand how past decisions, innovations, and conflicts have created the world we live in today. History is not just about memorizing dates - it is about understanding causes, effects, and human experiences.`,
        `Primary sources like letters, diaries, official documents, and artifacts give us direct insight into historical periods. Historians analyze these sources carefully, considering the context and perspective of the people who created them. What would a primary source from ${t.toLowerCase()} reveal about daily life?`,
        `Connections to today: Many aspects of modern life - from government systems to technology to cultural traditions - have roots in historical events like ${t.toLowerCase()}. Understanding these connections helps us make better decisions about the future.`
      ].join('\n\n');
    }
  },
  geographyFacts: {
    text: (t, level) => {
      return [
        `Geography helps us understand the physical and human systems that shape our world. ${t} is a fascinating geographical feature that demonstrates how natural processes create diverse landscapes across our planet.`,
        `Climate and environment: The unique characteristics of ${t.toLowerCase()} affect local climate patterns, plant and animal life, and human settlement. Geographers study these interactions to understand how different regions develop distinct identities.`,
        `Human impact: People have adapted to and modified ${t.toLowerCase()} in various ways. From building cities in challenging terrain to developing agriculture suited to local conditions, human geography shows our remarkable ability to adapt and innovate.`
      ].join('\n\n');
    }
  },
  animalFacts: {
    text: (t, level) => {
      const extra = [
        `${t} are truly remarkable creatures that have evolved unique adaptations to survive in their environments. Their features, behaviors, and life cycles offer endless opportunities for learning about biology, ecology, and the natural world.`,
        `Ecological importance: Every animal plays a role in its ecosystem. Some are predators that control prey populations, others are prey that support food chains, and many are pollinators or seed dispersers that help plants reproduce. Understanding these relationships helps us protect biodiversity.`,
        `Conservation note: Many animal species face threats from habitat loss, climate change, and human activities. Learning about ${t.toLowerCase()} helps us understand why conservation matters and what we can do to protect these amazing creatures for future generations.`
      ];
      return extra.join('\n\n');
    }
  },
  poems: {
    text: (t, level) => {
      return [
        `Poetry is one of the oldest forms of human expression. Poems use condensed language, rhythm, and imagery to create emotional experiences and share insights. Reading and writing poetry helps us understand ourselves and others more deeply.`,
        `Famous poets throughout history - from William Shakespeare to Emily Dickinson to Langston Hughes - have used poetry to explore love, nature, justice, and the human condition. Reading their work can inspire your own creative writing and help you discover new ways to express your thoughts and feelings.`,
        `The beauty of poetry is that there are no strict rules - you can write in any style that feels right for your subject and your voice. Whether you choose rhyming couplets, free verse, haiku, or spoken word, the most important thing is to write from the heart and revise until your words capture exactly what you want to express.`,
        `Performance tip: Poetry is meant to be heard as well as read. Practice reading your poem aloud, paying attention to pacing, volume, and emotion. Record yourself and listen back. Does the rhythm flow naturally? Can you hear the emotion in your voice? Share your poem by performing it for family or friends.`
      ].join('\n\n');
    }
  },
  logicalPuzzles: {
    text: (t, level) => {
      return [
        `Logic puzzles train your brain to think systematically and solve problems creatively. Just like muscles grow stronger with exercise, your brain becomes sharper and faster with regular puzzle practice. Each type of puzzle uses different thinking skills.`,
        `Problem-solving strategies: 1) Read the entire problem before starting. 2) Identify what information you already know. 3) Determine what you need to find out. 4) Choose a strategy (draw a diagram, make a table, guess and check, work backwards). 5) Try your strategy and check if it works. 6) If stuck, try a different approach.`,
        `The history of puzzles: People have been creating and solving puzzles for thousands of years. The oldest known puzzle is a mathematical problem from ancient Mesopotamia, dating back nearly 4,000 years. Puzzles appear in every culture and have been used for education, entertainment, and even spiritual practice.`,
        `Brain science: Solving puzzles creates new neural connections and releases dopamine, a neurotransmitter associated with pleasure and motivation. This is why solving a challenging puzzle feels so satisfying! Regular puzzle practice has been linked to better memory, faster thinking, and reduced risk of cognitive decline.`
      ].join('\n\n');
    }
  },
  codingChallenges: {
    text: (t, level) => {
      return [
        `Learning to code is like learning a superpower. Programming teaches you computational thinking - how to break down complex problems into smaller steps, recognize patterns, and create step-by-step solutions. These skills are valuable in any career, not just technology.`,
        `The history of computing: The first computer programmer was Ada Lovelace, who wrote algorithms for Charles Babbage's Analytical Engine in the 1840s. Since then, programming has evolved from punch cards to high-level languages that anyone can learn. Today, coding is used in almost every industry - from medicine to music to space exploration.`,
        `Debugging tip: When your code doesn't work as expected, don't get frustrated. Debugging is a normal and important part of programming. Start by reading your code carefully, checking each line. Add print statements to see what values your variables have. Explain your code to a friend or even to a rubber duck - often, saying it aloud helps you spot the problem!`,
        `Career connections: Computer science is one of the fastest-growing fields. Software developers, data scientists, web designers, and game developers all use coding skills. But even outside tech, understanding code helps you work more effectively with technology and understand the digital world around you.`
      ].join('\n\n');
    }
  },
  knowledgeBase: {
    text: (t, level) => {
      return [
        `Curiosity is the engine of knowledge. Every time you ask "why" or "how," you are following in the footsteps of the world's greatest scientists, inventors, and thinkers. The question "${t}" is exactly the kind of curious question that leads to discovery and understanding.`,
        `The science behind the answer: Understanding ${t.toLowerCase()} involves multiple scientific principles working together. By breaking down the question into smaller parts, we can see how different areas of science - physics, chemistry, biology, and earth science - all contribute to explaining the world around us.`,
        `Think like a scientist: When you encounter a question like "${t}", try to predict the answer before you look it up. What do you already know that might help? What hypothesis can you form? Then research the answer and compare it to your prediction. This process of predicting and checking strengthens your understanding and memory.`,
        `Share your knowledge: The best way to truly understand something is to teach it to someone else. After learning about ${t.toLowerCase()}, try explaining it to a friend or family member. Use simple words, draw diagrams, and ask them if they have questions. Teaching reveals what you understand well and what you need to study more.`
      ].join('\n\n');
    }
  },
  activities: {
    text: (t, level) => {
      return [
        `Hands-on activities are one of the best ways to learn. When you build, create, and make things with your hands, you engage multiple senses and create stronger memories. The activity "${t}" is designed to be fun while teaching valuable skills.`,
        `Planning for success: Before starting, gather all your materials and set up your workspace. Read through the entire set of instructions first so you understand the full process. Set a timer if needed and work at a comfortable pace. Remember that the process is just as important as the final product.`,
        `Customization ideas: Once you have completed the basic version of "${t}", think about how you could make it your own. What colors would you choose? What materials could you substitute? How could you make it bigger, smaller, or more detailed? Personalizing projects makes them more meaningful and develops your creativity.`,
        level === 'Basic'
          ? `Reflection questions: 1) What was the most enjoyable part of this activity? 2) What was the most challenging part? 3) What would you do differently if you tried again? 4) What new skill did you learn? 5) How does this activity connect to things you learn in school? Write or draw your reflections.`
          : `Project documentation: Create a portfolio entry for "${t}". Include photographs at each stage, notes about techniques you used, challenges you overcame, and what you would improve next time. A well-documented project shows your growth as a maker and can inspire others to try similar activities.`
      ].join('\n\n');
    }
  },
  riddles: {
    text: (t, level) => {
      return [
        `Riddles are ancient puzzles that challenge our thinking and make us laugh. They appear in virtually every culture throughout history. The oldest known riddles come from ancient Sumer, over 4,000 years ago. The famous riddle of the Sphinx from Greek mythology asked: "What walks on four legs in the morning, two legs at noon, and three legs in the evening?" (The answer: a human - crawling as a baby, walking as an adult, using a cane in old age.)`,
        `How riddles work: Riddles use clever wordplay, double meanings, and unexpected connections. They make us think creatively rather than literally. When you encounter a riddle, try these approaches: 1) Think about words that have multiple meanings. 2) Consider homophones (words that sound the same but have different meanings). 3) Visualize the riddle as a picture. 4) Think about categories and opposites.`,
        `Creating your own riddles is a great way to understand how they work. Start with a simple object or concept. Think about its characteristics, what it looks like, what it does, and what it reminds you of. Then write clues that describe it without naming it directly. Test your riddle on friends - if they guess too quickly, make it trickier. If they can't guess at all, add more clues.`,
        `Benefits of riddles: Regular riddle practice improves vocabulary, creative thinking, problem-solving skills, and mental flexibility. Riddles also build persistence - learning to stick with a challenging problem and try different approaches until you find the answer. These skills are valuable in school, work, and everyday life.`
      ].join('\n\n');
    }
  },
  astronomyTopics: {
    text: (t, level) => {
      return [
        `The universe is vast and full of wonders. ${t} represents just one of the countless celestial phenomena that astronomers study to understand the cosmos. Each discovery raises new questions and deepens our appreciation of the universe's complexity.`,
        `Space exploration continues to reveal new information about ${t.toLowerCase()}. Telescopes on Earth and in space, along with robotic probes sent to other planets, have transformed our understanding of the solar system and beyond. What mysteries might future missions uncover?`,
        `Humanity's connection to the stars is ancient and profound. Every civilization has looked up at the night sky with wonder. Modern astronomy builds on thousands of years of observation and discovery, from ancient astronomers who tracked celestial movements to today's scientists using cutting-edge technology.`
      ].join('\n\n');
    }
  },
  funFacts: {
    text: (t, level) => {
      return [
        `The world is full of amazing facts that can surprise and delight us. Learning fun facts about ${t.toLowerCase()} not only entertains us but also helps us understand the incredible complexity and wonder of the world around us. Every fact is a doorway to deeper knowledge.`,
        `How do we know these facts are true? Scientists use careful observation, measurement, and peer review to verify claims. When you encounter a surprising fact, ask yourself: What evidence supports this? Can I observe it myself? Has it been tested by multiple researchers? Developing a healthy skepticism helps you evaluate information critically.`,
        `Connecting facts: The most interesting learning happens when we connect different facts together. For example, a fact about animal behavior connects to biology, ecology, and evolution. A fact about space connects to physics, chemistry, and mathematics. Try to find connections between the facts you learn about ${t.toLowerCase()} and other topics you have studied.`,
        level === 'Basic'
          ? `Fact exploration: Pick the most interesting fact from this collection and research it further. Find at least three additional facts about the same topic. Create a colorful poster or digital slideshow sharing what you discovered with your family or class.`
          : `Fact verification challenge: Choose three facts from this collection and try to verify them using reliable sources. Look for scientific studies, encyclopedia entries, or expert articles that support or challenge each fact. Write a brief report on your findings, citing your sources.`
      ].join('\n\n');
    }
  },
  shortStories: {
    text: (t, level) => {
      return [
        `Stories are how humans make sense of the world. From ancient cave paintings to modern novels, storytelling is a fundamental part of being human. "${t}" continues this rich tradition by exploring themes that resonate with readers of all ages.`,
        `Elements of great storytelling: Every memorable story has relatable characters, an engaging setting, a compelling conflict, and a satisfying resolution. The best stories also have a theme - a deeper message about life, friendship, courage, or kindness that stays with readers long after they finish the last page.`,
        `Your turn to write: After reading "${t}", try writing your own short story. Start with a character you find interesting. Give them a problem to solve. Create obstacles that make the problem harder. Show how the character changes through their journey. End with a resolution that feels true to the story. Remember that first drafts don't need to be perfect - just get your ideas down on paper and revise later.`,
        `Reading widely: The more stories you read, the better writer you become. Each author has something unique to teach about plot, character, description, and dialogue. Pay attention to techniques you admire and try them in your own writing. Reading is like gathering ingredients - writing is when you cook your own meal.`
      ].join('\n\n');
    }
  },
  chinesePoetry: {
    text: (t, level) => {
      return [
        `中国古诗是中华文化的瑰宝，承载着千年的智慧和审美。每一首诗都是一个浓缩的世界，用最精炼的语言表达最深刻的情感和思想。学习古诗不仅是学习语言，更是学习如何用美的眼光看待世界。`,
        `诗歌鉴赏方法：读古诗时，可以从以下几个方面入手——1) 理解字面意思，掌握关键词汇的含义；2) 体会意象，诗中的每一个意象都有其独特的象征意义；3) 感受情感，诗人通过景物描写表达内心的喜怒哀乐；4) 分析手法，如比喻、拟人、对仗、用典等修辞技巧的运用。`,
        `文化背景：了解诗人所处的时代背景、个人经历以及当时的文化氛围，对理解诗歌大有帮助。同一首诗，放在不同的历史语境中，可能会有完全不同的解读。这也是古诗研究如此迷人的原因之一。`,
        `创作练习：尝试仿写一首五言或七言绝句。选定一个主题——可以是自然景色、生活感悟或友情亲情。注意平仄和押韵的基本规则。不求工整，重在体验诗歌创作的过程和乐趣。`
      ].join('\n\n');
    }
  },
  germanVocabulary: {
    text: (t, level) => {
      return [
        `German is one of the most widely spoken languages in Europe, with over 100 million native speakers. Learning German vocabulary opens doors to understanding German culture, literature, and science. Many important books and research papers are written in German.`,
        `German and English are both Germanic languages, so many words are similar! For example, "Haus" means "house", "Wasser" means "water", and "Buch" means "book". These similarities make learning German vocabulary easier for English speakers than you might think.`,
        `Practice tip: Label objects around your home with their German names. Every time you see the label, say the word out loud. This constant visual exposure helps your brain remember the vocabulary naturally, just like you learned your first language!`
      ].join('\n\n');
    }
  },
  frenchVocabulary: {
    text: (t, level) => {
      return [
        `French is spoken by over 300 million people across all continents. It is an official language in 29 countries and one of the official languages of the United Nations, UNESCO, NATO, and the International Olympic Committee. Learning French connects you to a global community.`,
        `About 45% of English words have French origins! Words like "restaurant", "ballet", "cafe", "genre", and "rendezvous" come directly from French. When you learn French vocabulary, you're also deepening your understanding of English.`,
        `Practice tip: Change your phone or computer's language to French for a week. The words you see every day will help build your vocabulary naturally. Start with basic categories and gradually add more complex words as you become more confident.`
      ].join('\n\n');
    }
  },
  spanishVocabulary: {
    text: (t, level) => {
      return [
        `Spanish is the second most spoken native language in the world, with over 460 million native speakers. It is the official language of 20 countries, making it incredibly useful for travel, business, and cultural understanding across the Americas and Europe.`,
        `Spanish is considered one of the easiest languages for English speakers to learn because it uses the same alphabet and shares thousands of cognates - words that look and sound similar in both languages. For example, "color" is "color" in Spanish, and "animal" is "animal".`,
        `Practice tip: Listen to Spanish music and try to identify words you've learned. Many popular songs have Spanish lyrics. Following along with the lyrics while listening helps your brain connect the written word with correct pronunciation and natural rhythm.`
      ].join('\n\n');
    }
  },
  italianVocabulary: {
    text: (t, level) => {
      return [
        `Italian is known as the language of music, art, and cuisine. Italy has contributed enormously to Western culture, from the Renaissance masters to opera to delicious food. Learning Italian gives you direct access to this rich cultural heritage in its original language.`,
        `Italian is considered one of the most beautiful and musical languages in the world. Every word ends in a vowel, giving it a flowing, melodic quality. About 60% of English words derived from Latin have Italian equivalents that sound similar, making vocabulary building easier.`,
        `Practice tip: Italian is a phonetic language - words are pronounced exactly as they are written. This makes reading Italian much easier than English or French! Practice by reading Italian children's books aloud, focusing on pronouncing every vowel clearly.`
      ].join('\n\n');
    }
  },
  europeanGeography: {
    text: (t, level) => {
      return [
        `Europe is a continent of remarkable diversity packed into a relatively small area. With over 40 countries and countless languages, cultures, and landscapes, Europe offers endless opportunities for geographical discovery. Understanding European geography helps us appreciate how physical features shape human history and culture.`,
        `Europe's geography has profoundly influenced its history. Mountain ranges like the Alps and Pyrenees created natural borders, rivers like the Danube and Rhine became trade routes, and fertile plains supported growing populations. These geographical factors help explain why Europe developed the way it did.`,
        `The European Union has transformed how European countries interact, creating open borders and a shared currency used by 20 countries. This unique political and economic union makes understanding European geography more important than ever for understanding current events and international relations.`
      ].join('\n\n');
    }
  },
  europeanHistory: {
    text: (t, level) => {
      return [
        `European history has shaped the modern world in countless ways. From ancient Greek democracy to Roman law, from the Renaissance to the Industrial Revolution, the ideas and innovations that emerged from Europe have influenced every corner of the globe.`,
        `Studying European history helps us understand the origins of many modern institutions and ideas. Concepts like human rights, scientific inquiry, democracy, and capitalism all have deep roots in European intellectual and political history. Understanding where these ideas came from helps us evaluate them critically.`,
        `Europe's history also includes conflicts, colonialism, and periods of great suffering. A balanced understanding of European history includes learning from both the achievements and the mistakes, recognizing that history is complex and requires us to consider multiple perspectives.`
      ].join('\n\n');
    }
  },
  europeanCulture: {
    text: (t, level) => {
      return [
        `European culture is incredibly diverse, with each country and region maintaining unique traditions while sharing common cultural threads. From the sunny Mediterranean to the Nordic countries, Europe's cultural richness reflects its long history and the many peoples who have shaped it.`,
        `Food is central to European cultural identity. Each region takes pride in its local specialties, from Italian pasta and French cheese to Spanish tapas and German bread. UNESCO has recognized several European food traditions as Intangible Cultural Heritage, highlighting their importance.`,
        `Festivals and celebrations bring European communities together throughout the year. Many of these traditions date back centuries and have deep historical or religious roots. Participating in or learning about these traditions offers a window into the values and history of different European cultures.`
      ].join('\n\n');
    }
  },
  musicTheory: {
    text: (t, level) => {
      return [
        `Music theory is the study of how music works. It is like the grammar of the musical language - understanding it helps you read, write, and perform music more effectively. Just as knowing grammar helps you write better sentences, knowing music theory helps you create better music.`,
        `The foundations of Western music theory were developed in ancient Greece and expanded during the Middle Ages and Renaissance. The system of musical notation we use today was developed over centuries, evolving from simple markings above church texts to the detailed staff notation we now use.`,
        `Understanding music theory opens up new ways of appreciating music. When you can identify a chord progression, recognize a key change, or understand why a particular rhythm feels exciting, you experience music on a deeper level. Theory enhances enjoyment rather than replacing it.`
      ].join('\n\n');
    }
  },
  artHistory: {
    text: (t, level) => {
      return [
        `Art history is the study of visual art across time and cultures. It helps us understand how artists have expressed ideas, emotions, and beliefs through different media and styles. Every artwork is a window into the time and place where it was created.`,
        `The greatest works of art often reflect the major intellectual and social movements of their time. The Renaissance celebrated human achievement and classical learning. Impressionism captured the fleeting effects of light. Modern art challenged traditional notions of what art could be.`,
        `Learning to look at art critically is a skill that develops with practice. Start by simply describing what you see - colors, shapes, lines, textures. Then consider what the artist might be trying to express. Finally, think about how the artwork makes you feel and why. This three-step process works for any artwork you encounter.`
      ].join('\n\n');
    }
  },
  solarSystem: {
    text: (t, level) => {
      return [
        `Our solar system is a vast and fascinating place, with the Sun at its center and eight planets, numerous dwarf planets, moons, asteroids, and comets orbiting around it. The solar system formed about 4.6 billion years ago from a cloud of gas and dust.`,
        `Space exploration has transformed our understanding of the solar system. Robotic spacecraft have visited every planet, sent back stunning images, and made incredible discoveries. Rovers are currently exploring Mars, and missions are planned to return samples from Mars and explore the moons of Jupiter and Saturn.`,
        `The search for life beyond Earth is one of the most exciting areas of solar system research. Scientists are studying Mars, Europa (a moon of Jupiter), and Enceladus (a moon of Saturn) for evidence of conditions that could support life. Each new discovery brings us closer to answering the ancient question: are we alone in the universe?`
      ].join('\n\n');
    }
  },
  humanBody: {
    text: (t, level) => {
      return [
        `The human body is an incredible biological machine, with trillions of cells working together to keep us alive and healthy. Every system in the body has a specific job, and they all work together in remarkable coordination. Understanding how our bodies work helps us take better care of ourselves.`,
        `Amazing body facts: Your heart beats about 100,000 times per day, your lungs inhale about 11,000 liters of air daily, and your brain has about 86 billion neurons. The human body is capable of extraordinary feats of strength, endurance, and healing.`,
        `Taking care of your body through proper nutrition, exercise, sleep, and hygiene is one of the most important things you can learn. Healthy habits established in childhood often last a lifetime. Listening to your body and understanding its signals helps you stay healthy and know when something might be wrong.`
      ].join('\n\n');
    }
  },
  weatherClimate: {
    text: (t, level) => {
      return [
        `Weather and climate shape our world in profound ways. Weather is the day-to-day state of the atmosphere, while climate describes long-term patterns over decades and centuries. Both affect where we live, what we grow, and how we plan our activities.`,
        `Meteorologists use sophisticated tools to observe, understand, and predict weather. Weather satellites, radar, weather balloons, and computer models all help forecasters predict what the weather will do. Despite all this technology, weather prediction remains challenging, especially beyond a few days.`,
        `Climate change is one of the most important challenges facing our planet. Scientists have clearly documented that Earth's climate is warming due to human activities, primarily the burning of fossil fuels. Understanding weather and climate helps us understand the changes happening around us and what we can do to address them.`
      ].join('\n\n');
    }
  },
  oceanLife: {
    text: (t, level) => {
      return [
        `The ocean covers more than 70% of Earth's surface and contains an incredible diversity of life. From the sunlit surface waters to the dark depths of the deep sea, marine organisms have adapted to every possible ocean environment. Scientists estimate we have discovered only about 10% of ocean species.`,
        `Marine ecosystems are interconnected in complex ways. Coral reefs, often called the rainforests of the sea, support an amazing variety of life. Kelp forests provide food and shelter for many species. The deep sea, once thought to be barren, teems with strange and wonderful creatures adapted to extreme conditions.`,
        `The health of our oceans is threatened by overfishing, pollution, plastic waste, and climate change. Ocean acidification, caused by increased carbon dioxide in the atmosphere, harms shell-forming organisms and coral reefs. Marine conservation efforts work to protect ocean ecosystems for future generations.`
      ].join('\n\n');
    }
  },
  dinosaurs: {
    text: (t, level) => {
      return [
        `Dinosaurs dominated life on Earth for over 165 million years, a period far longer than humans have existed. These amazing creatures came in all shapes and sizes, from the tiny Compsognathus (chicken-sized) to the enormous Brachiosaurus (as long as a basketball court).`,
        `Paleontologists study dinosaur fossils to understand how these animals lived, grew, and interacted. Fossilized bones, footprints, eggs, and even stomach contents provide clues about dinosaur behavior, diet, and environment. New discoveries are constantly changing what we know about dinosaurs.`,
        `The extinction of the dinosaurs about 66 million years ago, likely caused by an asteroid impact, opened the door for mammals to diversify and eventually led to the evolution of humans. Studying dinosaurs helps us understand evolution, extinction, and the fragile balance of life on Earth.`
      ].join('\n\n');
    }
  },
  famousInventors: {
    text: (t, level) => {
      return [
        `Inventions change the world. Throughout history, inventors have solved problems, improved lives, and transformed how we live, work, and communicate. Every invention starts with curiosity and the determination to make something better.`,
        `The process of invention is rarely linear. Most inventors face repeated failures, setbacks, and skepticism before achieving success. Thomas Edison famously said he found 10,000 ways that didn't work before inventing the light bulb. Persistence is perhaps the most important quality of successful inventors.`,
        `Many inventions build on earlier discoveries. The telephone built on telegraph technology, the internet built on computer networking, and modern smartphones combine dozens of earlier inventions. Understanding the history of invention helps us appreciate the cumulative nature of human knowledge and innovation.`
      ].join('\n\n');
    }
  },
  worldFlags: {
    text: (t, level) => {
      return [
        `Flags are powerful symbols that represent nations, their history, values, and aspirations. The study of flags is called vexillology. Every flag tells a story through its colors, patterns, and symbols - understanding that story reveals something important about the country it represents.`,
        `Flag design follows certain principles that make flags effective: they should be simple enough for a child to draw, use meaningful colors and symbols, have good contrast, and be recognizable from a distance. The best flags are both distinctive and meaningful.`,
        `Flags evolve over time as countries change. New nations create flags that reflect their identity and values. Old flags are sometimes modified or replaced when political systems change. Tracking flag changes is like watching political history unfold in visual form.`
      ].join('\n\n');
    }
  },
  sportsAndGames: {
    text: (t, level) => {
      return [
        `Sports and games are a universal part of human culture. They bring people together, teach valuable lessons about teamwork and perseverance, and promote physical and mental health. Every culture has its own traditional sports and games, alongside internationally popular ones.`,
        `The Olympic Games, both ancient and modern, represent the highest ideals of sportsmanship: excellence, friendship, and respect. The modern Olympic movement, revived in 1896, brings athletes from around the world together to compete in the spirit of fair play and international understanding.`,
        `Participating in sports teaches important life skills: discipline, goal-setting, handling success and failure, working as a team, and respecting opponents. These lessons extend far beyond the playing field and benefit young people in all areas of life. The most important thing is to find a sport or game you enjoy!`
      ].join('\n\n');
    }
  },
  nutrition: {
    text: (t, level) => {
      return [
        `Good nutrition is the foundation of health and well-being. The food we eat provides the energy and nutrients our bodies need to grow, repair, and function properly. Understanding nutrition helps us make informed choices about what we eat.`,
        `A balanced diet includes a variety of foods from different food groups. Fruits and vegetables provide vitamins and fiber. Grains give us energy. Proteins help build and repair tissues. Dairy products provide calcium for strong bones. Water is essential for every bodily function.`,
        `Developing healthy eating habits in childhood sets the foundation for a lifetime of good health. Learning to enjoy a variety of nutritious foods, understanding portion sizes, and listening to your body's hunger and fullness signals are skills that will benefit you for your entire life.`
      ].join('\n\n');
    }
  },
  emotions: {
    text: (t, level) => {
      return [
        `Emotions are a natural and important part of being human. They give us information about our experiences, help us connect with others, and motivate us to take action. There are no "good" or "bad" emotions - all emotions are valid and serve a purpose.`,
        `Learning to understand and manage emotions is called emotional intelligence. People with strong emotional intelligence can recognize their own feelings, understand what causes them, and express them in healthy ways. This skill is just as important as academic intelligence for success and well-being.`,
        `Everyone experiences emotions differently. Two people can feel the same emotion in completely different ways. Respecting these differences and learning to support others in their emotional experiences builds stronger relationships and more compassionate communities.`
      ].join('\n\n');
    }
  },
  fairyTales: {
    text: (t, level) => {
      return [
        `Fairy tales are among the oldest and most beloved forms of storytelling. Passed down through generations, these stories explore universal themes of good vs evil, courage, kindness, and the triumph of the underdog. They speak to something deep in the human experience.`,
        `The Brothers Grimm, Hans Christian Andersen, and Charles Perrault are the most famous collectors of European fairy tales. They gathered oral stories from their cultures and wrote them down, preserving them for future generations. Many of these stories are hundreds of years older than the written versions.`,
        `Fairy tales serve important purposes beyond entertainment. They help children process fears and anxieties in a safe way, teach moral lessons, and introduce complex ideas about justice, consequences, and human nature. Modern versions often retell these stories from new perspectives, adding depth and diversity.`
      ].join('\n\n');
    }
  },
  multiplication: {
    text: (t, level) => {
      return [
        `Multiplication is one of the four basic operations in mathematics, along with addition, subtraction, and division. It is essentially repeated addition - adding the same number multiple times. Mastering multiplication makes many other areas of math much easier.`,
        `Knowing multiplication facts fluently (often called times tables) is like having a superpower in mathematics. It allows you to solve problems quickly, recognize patterns, and focus on higher-level thinking rather than basic calculations. Practice a little every day for the best results.`,
        `Multiplication appears everywhere in daily life: calculating the total cost of multiple items, determining area, scaling recipes up or down, and understanding rates and speeds. The more comfortable you are with multiplication, the easier these real-world calculations become.`
      ].join('\n\n');
    }
  },
  fractions: {
    text: (t, level) => {
      return [
        `Fractions represent parts of a whole and are fundamental to understanding mathematics. They appear in everyday situations like sharing food, measuring ingredients, telling time, and understanding money. A solid grasp of fractions is essential for success in higher mathematics.`,
        `The word "fraction" comes from the Latin word "frangere," meaning "to break." Fractions break whole numbers into smaller parts. Understanding fractions helps you understand decimals, percentages, ratios, and proportions - all of which are used in science, finance, and daily life.`,
        `Many people find fractions challenging at first, but with practice and the right visual tools (like fraction bars, pie charts, and number lines), they become much easier. The key is understanding that fractions are just numbers - they can be added, subtracted, multiplied, and divided like any other numbers.`
      ].join('\n\n');
    }
  },
  geometry: {
    text: (t, level) => {
      return [
        `Geometry is the branch of mathematics that deals with shapes, sizes, positions, and properties of space. The word comes from Greek words meaning "earth measurement." Ancient Egyptians and Greeks developed geometry to solve practical problems like surveying land and building structures.`,
        `Geometry is all around us. The buildings we live and work in, the roads we travel, the screens we look at, and the natural world all follow geometric principles. Understanding geometry helps us appreciate the design and structure of our world.`,
        `Geometry develops important thinking skills: spatial reasoning, logical deduction, and the ability to visualize and manipulate shapes mentally. These skills are valuable in many careers, including architecture, engineering, art, computer graphics, and design. Geometry truly is where mathematics meets the visual world.`
      ].join('\n\n');
    }
  },
  timeAndCalendar: {
    text: (t, level) => {
      return [
        `Time is one of the most important concepts in our lives. It helps us organize our days, plan for the future, and understand the past. Learning to tell time and use a calendar are essential life skills that give children independence and structure.`,
        `The way we measure time is based on astronomical cycles: the rotation of Earth (a day), the orbit of the Moon (a month), and the orbit of Earth around the Sun (a year). Different cultures have developed different calendars based on these same cycles, which is why there are multiple calendar systems in use today.`,
        `Managing time effectively is a skill that improves with practice. Using calendars, clocks, schedules, and planning tools helps us make the most of our time. Good time management reduces stress, helps us accomplish more, and leaves time for the activities we enjoy.`
      ].join('\n\n');
    }
  },
  moneyMath: {
    text: (t, level) => {
      return [
        `Understanding money is an essential life skill. Money allows us to buy things we need and want, save for the future, and help others. Learning to count money, make change, and budget are foundational skills for financial independence.`,
        `Financial literacy - understanding how money works - is one of the most valuable things you can learn. Knowing how to earn, save, spend wisely, and give generously sets you up for a lifetime of financial well-being. These skills are never too early to start learning.`,
        `Different countries use different currencies, but the mathematical principles are the same everywhere. Understanding money math in your own currency makes it easier to understand exchange rates and international money concepts when you encounter them. Every shopping trip is a chance to practice money math!`
      ].join('\n\n');
    }
  },
  codingBasics: {
    text: (t, level) => {
      return [
        `Coding is the process of giving instructions to computers. Just like learning a human language opens up communication with people, learning to code opens up communication with technology. In our increasingly digital world, understanding code is a superpower.`,
        `Coding teaches computational thinking - a problem-solving approach that involves breaking problems down, recognizing patterns, and creating step-by-step solutions. These thinking skills are valuable in every field, not just technology. Coding is really about learning how to think, not just how to type.`,
        `The best way to learn coding is by doing. Start with simple projects that interest you - a game, an animation, or a useful tool. Don't worry about making mistakes; debugging is a normal and essential part of programming. Every expert programmer started as a beginner who kept trying.`
      ].join('\n\n');
    }
  },
  environmentalScience: {
    text: (t, level) => {
      return [
        `Environmental science helps us understand the complex relationships between living things and their environment. It combines biology, chemistry, physics, and earth science to address some of the most important challenges facing our planet.`,
        `Every action we take affects the environment in some way. Understanding these impacts helps us make better choices - from the products we buy to the way we travel to how we manage waste. Small changes by many people add up to significant positive impacts.`,
        `Young people around the world are taking action to protect the environment. From school recycling programs to community gardens to climate activism, youth are showing that age is no barrier to making a difference. Environmental science gives us the knowledge to act effectively.`
      ].join('\n\n');
    }
  },
  famousWomen: {
    text: (t, level) => {
      return [
        `Throughout history, women have made extraordinary contributions to every field of human endeavor - science, art, literature, politics, sports, and more. Yet many of these contributions were overlooked or undervalued in their time. Learning about these remarkable women helps correct the historical record and provides inspiring role models.`,
        `The achievements of women in history are even more remarkable considering the obstacles they faced. Limited access to education, legal restrictions, and social prejudices meant that women had to overcome extraordinary barriers to pursue their passions and make their mark on the world.`,
        `Today, we continue to celebrate and learn from the women who paved the way. Their stories of courage, persistence, and excellence inspire new generations to dream big and break down barriers. Every child, regardless of gender, deserves to know the full story of human achievement - including the contributions of women.`
      ].join('\n\n');
    }
  },
  worldReligions: {
    text: (t, level) => {
      return [
        `Religion is an important part of human culture and has shaped history, art, literature, music, and law around the world. There are many different religions, each with its own beliefs, practices, and traditions. Learning about world religions helps us understand our neighbors and our shared history.`,
        `While religions differ in their specific beliefs, many share common values like compassion, honesty, kindness, and treating others as you would like to be treated. Understanding these shared values helps build respect and appreciation across different faith traditions.`,
        `In our interconnected world, encountering people of different faiths is common. Learning about world religions builds respect, prevents misunderstanding, and helps create inclusive communities. The goal of studying religion is understanding, not judgment - learning what people believe and why it matters to them.`
      ].join('\n\n');
    }
  },
  communicationSkills: {
    text: (t, level) => {
      return [
        `Communication is how we share ideas, feelings, and information with others. Good communication skills are essential for building relationships, succeeding in school and work, and navigating the world effectively. Communication involves both speaking and listening.`,
        `The most important communication skill is often listening. Active listening means paying full attention to the speaker, understanding their message, and responding thoughtfully. When people feel truly heard, they feel respected and understood. Good listeners are often the best communicators.`,
        `Communication styles vary across cultures and situations. Learning to adapt your communication style to your audience - whether you're talking to a friend, a teacher, or presenting to a group - is a valuable skill. Practice, feedback, and reflection help you become a more effective communicator over time.`
      ].join('\n\n');
    }
  },
  criticalThinking: {
    text: (t, level) => {
      return [
        `Critical thinking is the ability to think clearly and rationally about what to believe or what to do. It involves asking questions, evaluating evidence, identifying assumptions, and considering alternative perspectives. Critical thinking helps us make better decisions and avoid being misled.`,
        `In a world of information overload, critical thinking is more important than ever. Not everything we read, see, or hear is true. Critical thinkers learn to evaluate sources, distinguish fact from opinion, recognize bias, and look for reliable evidence before forming conclusions.`,
        `Critical thinking is a skill that can be learned and improved with practice. The best critical thinkers are curious, open-minded, and willing to change their minds when presented with good evidence. They ask "why" and "how do we know" - and they're not satisfied with easy answers. These habits of mind serve us well in every area of life.`
      ].join('\n\n');
    }
  }
};

class ContentGenerator {
  generateContent(category, count = 90, startIndex = 0) {
    const config = CATEGORIES[category];
    if (!config) return [];

    const items = [];
    const levelKeys = ['basic', 'intermediate', 'advanced', 'expert', 'master'].filter(k => config[k]);
    const depthLevels = ['Basic', 'Intermediate', 'Advanced', 'Expert', 'Master'].slice(0, levelKeys.length);
    const numLevels = levelKeys.length;

    for (let i = 0; i < count; i++) {
      const idx = (startIndex + i) % config.topics.length;
      const topic = config.topics[idx];
      const levelIdx = i % numLevels;
      const depthLevel = depthLevels[levelIdx];
      const levelKey = levelKeys[levelIdx];

      const contentFn = config[levelKey];
      if (!contentFn) continue;

      const content = contentFn(topic);
      const enriched = this._enrich(topic, category, depthLevel);
      const fullContent = content + '\n\n' + enriched;
      const title = `${topic} (${depthLevel})`;
      items.push({
        id: `gen_${category}_${levelKey[0]}_${idx}_${Date.now()}_${i}`,
        source: `parametric-${category}`,
        category,
        url: '',
        title,
        content: fullContent,
        contentType: 'parametric',
        language: category === 'chinesePoetry' ? 'zh' : 'en',
        scrapedAt: new Date().toISOString(),
        wordCount: fullContent.split(/\s+/).filter(Boolean).length
      });
    }

    return items;
  }

  _enrich(topic, category, level) {
    const enrichment = ENRICHMENT[category];
    if (!enrichment) {
      const genFacts = [
        `Learning about ${topic.toLowerCase()} opens up new ways of understanding the world. Every topic connects to other areas of knowledge, creating a web of understanding that grows stronger with each new fact and idea we explore.`,
        `Practice makes progress! The more you engage with ${topic.toLowerCase()}, the more confident and skilled you will become. Try discussing what you've learned with friends or family members - teaching others is one of the best ways to deepen your own understanding.`,
        `Keep exploring! If ${topic.toLowerCase()} interests you, there are many books, videos, and activities that can help you learn even more. Curiosity is the engine of learning, and every question you ask leads to new discoveries.`
      ];
      return genFacts.join('\n\n');
    }
    return enrichment.text(topic, level);
  }

  getAllCategories() {
    return Object.keys(CATEGORIES);
  }

  getTopics(category) {
    const config = CATEGORIES[category];
    return config ? config.topics : [];
  }

  generateAllCategories(existingPerCat = 300, newPerCat = 90) {
    const all = [];
    const existingCatNames = ['mathProblems', 'vocabulary', 'readingComprehension', 'grammarExercises', 'scienceExperiments', 'scienceArticles', 'historyEvents', 'geographyFacts', 'animalFacts', 'poems', 'logicalPuzzles', 'codingChallenges', 'knowledgeBase', 'activities', 'riddles', 'astronomyTopics', 'funFacts', 'shortStories', 'chinesePoetry'];
    const newCatNames = ['germanVocabulary', 'frenchVocabulary', 'spanishVocabulary', 'italianVocabulary', 'europeanGeography', 'europeanHistory', 'europeanCulture', 'musicTheory', 'artHistory', 'solarSystem', 'humanBody', 'weatherClimate', 'oceanLife', 'dinosaurs', 'famousInventors', 'worldFlags', 'sportsAndGames', 'nutrition', 'emotions', 'fairyTales', 'multiplication', 'fractions', 'geometry', 'timeAndCalendar', 'moneyMath', 'codingBasics', 'environmentalScience', 'famousWomen', 'worldReligions', 'communicationSkills', 'criticalThinking'];
    for (const catName of existingCatNames) {
      const items = this.generateContent(catName, existingPerCat);
      all.push(...items);
    }
    for (const catName of newCatNames) {
      const items = this.generateContent(catName, newPerCat);
      all.push(...items);
    }
    return all;
  }

  getCategoryCount() {
    return Object.keys(CATEGORIES).length;
  }

  getTotalPossibleItems() {
    return Object.keys(CATEGORIES).reduce((sum, cat) => {
      const config = CATEGORIES[cat];
      const numLevels = ['basic', 'intermediate', 'advanced', 'expert', 'master'].filter(k => config[k]).length;
      return sum + config.topics.length * numLevels;
    }, 0);
  }
}

module.exports = new ContentGenerator();
