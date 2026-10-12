const fs = require('fs');
const path = require('path');
const CONTENT_DIR = path.join(__dirname, '..', 'data');

function merge(filename, newItems) {
  const fp = path.join(CONTENT_DIR, filename);
  let existing = [];
  try { existing = JSON.parse(fs.readFileSync(fp, 'utf8')); } catch(e) { existing = []; }
  const ids = new Set(existing.map(e => e.id));
  let added = 0;
  newItems.forEach(item => {
    if (!ids.has(item.id)) { existing.push(item); ids.add(item.id); added++; }
  });
  fs.writeFileSync(fp, JSON.stringify(existing, null, 2), 'utf8');
  console.log(`${filename}: +${added} items (now ${existing.length})`);
}

// --- Science expansion ---
const scienceItems = [
  { id:'sci-101', category:'physics', title:'Newton\'s Laws of Motion', content:'Newton\'s First Law: objects keep moving unless a force stops them. Second Law: Force = mass × acceleration. Third Law: every action has an equal reaction.', level:'primary3', tags:['physics','Newton','force'] },
  { id:'sci-102', category:'physics', title:'States of Matter', content:'Matter has three main states. Solid has fixed shape. Liquid flows but has fixed volume. Gas expands to fill space. Water can be ice, liquid water, or steam.', level:'primary2', tags:['physics','matter','solid','liquid','gas'] },
  { id:'sci-103', category:'biology', title:'Plant Life Cycle', content:'Plants start as seeds. Seeds germinate in soil with water and sunlight. Seedlings grow roots and leaves. Mature plants produce flowers. Flowers become fruits with new seeds.', level:'primary1', tags:['biology','plant','seed','growth'] },
  { id:'sci-104', category:'biology', title:'Animal Classification', content:'Animals are grouped into classes. Mammals have fur and feed milk. Birds have feathers and lay eggs. Reptiles have scales and are cold-blooded. Fish live in water. Amphibians live on land and water.', level:'primary2', tags:['biology','mammal','bird','reptile'] },
  { id:'sci-105', category:'biology', title:'The Human Skeleton', content:'The human skeleton has 206 bones. The skull protects the brain. The ribcage protects the heart and lungs. The spine supports the body. Bones store minerals and make blood cells.', level:'primary2', tags:['biology','skeleton','bone','skull'] },
  { id:'sci-106', category:'chemistry', title:'Elements and Compounds', content:'Elements are pure substances like oxygen and iron. Compounds are elements bonded together like water (H2O) and salt (NaCl). The periodic table lists all 118 known elements.', level:'primary3', tags:['chemistry','element','compound','periodic table'] },
  { id:'sci-107', category:'biology', title:'Food Chains', content:'Food chains show who eats what. Plants are producers. Herbivores eat plants. Carnivores eat other animals. Omnivores eat both. Decomposers break down dead matter.', level:'primary2', tags:['biology','food chain','producer','herbivore'] },
  { id:'sci-108', category:'physics', title:'Simple Circuits', content:'A circuit needs a power source, wires, and a load. Current flows in a loop. Batteries provide DC power. Switches control the flow. Resistors limit current. LEDs light up.', level:'primary3', tags:['physics','circuit','battery','switch'] },
  { id:'sci-109', category:'earth_science', title:'The Rock Cycle', content:'Rocks change over millions of years. Igneous rock forms from cooling magma. Sedimentary rock forms from compressed layers. Metamorphic rock changes with heat and pressure. The cycle continues forever.', level:'primary3', tags:['earth','rock','igneous','sedimentary'] },
  { id:'sci-110', category:'earth_science', title:'Weather and Climate', content:'Weather is what happens each day. Climate is the average weather over years. Temperature, wind, rain, and clouds make weather. The sun drives weather patterns. Climate change is long-term shifts.', level:'primary2', tags:['earth','weather','climate','temperature'] },
  { id:'sci-111', category:'biology', title:'The Five Senses', content:'Humans have five senses. Eyes see light and color. Ears hear sound waves. Nose smells particles in air. Tongue tastes sweet, sour, salty, bitter, umami. Skin feels touch, pressure, pain, and temperature.', level:'primary1', tags:['biology','senses','sight','hearing'] },
  { id:'sci-112', category:'physics', title:'Energy Types', content:'Energy comes in many forms. Kinetic energy is movement. Potential energy is stored. Thermal energy is heat. Chemical energy is in food and fuel. Electrical energy powers devices. Energy cannot be created or destroyed.', level:'primary2', tags:['physics','energy','kinetic','potential'] },
  { id:'sci-113', category:'biology', title:'The Digestive System', content:'Digestion breaks down food. The mouth chews and adds saliva. The stomach churns and adds acid. The small intestine absorbs nutrients. The large intestine absorbs water. Waste leaves the body.', level:'primary2', tags:['biology','digestion','stomach','intestine'] },
  { id:'sci-114', category:'earth_science', title:'Day and Night', content:'Earth spins on its axis once every 24 hours. The side facing the sun has daytime. The side away from the sun has nighttime. Earths rotation causes sunrises and sunsets.', level:'primary1', tags:['earth','day','night','rotation'] },
  { id:'sci-115', category:'physics', title:'Light and Shadows', content:'Light travels in straight lines. Objects block light creating shadows. Shadow size changes with light position. Morning and evening shadows are long. Noon shadows are short.', level:'primary1', tags:['physics','light','shadow','sun'] },
];

// --- Physics expansion ---
const physicsItems = [
  { id:'phy-26', category:'mechanics', title:'Velocity and Speed', content:'Speed measures how fast something moves. Velocity includes direction. Acceleration is change in velocity. Deceleration is negative acceleration. Terminal velocity is maximum falling speed.', level:'primary3', tags:['speed','velocity','acceleration'] },
  { id:'phy-27', category:'mechanics', title:'Friction', content:'Friction slows moving objects. Rough surfaces create more friction. Smooth surfaces have less friction. Lubricants reduce friction. Friction creates heat. Without friction we could not walk.', level:'primary2', tags:['friction','force','surface'] },
  { id:'phy-28', category:'mechanics', title:'Gravity', content:'Gravity pulls objects toward Earth. It makes things fall. Heavier objects weigh more but fall at the same speed. Gravity keeps planets orbiting the sun. Moon gravity is 1/6 of Earths.', level:'primary2', tags:['gravity','weight','fall','orbit'] },
  { id:'phy-29', category:'waves', title:'Sound Waves', content:'Sound travels as waves through air. Pitch depends on frequency. Louder sounds have bigger waves. Sound travels faster through water than air. Echoes are sound waves bouncing back.', level:'primary2', tags:['sound','wave','pitch','echo'] },
  { id:'phy-30', category:'waves', title:'The Electromagnetic Spectrum', content:'Light is part of the electromagnetic spectrum. Radio waves have longest wavelength. Microwaves cook food. Infrared is felt as heat. Visible light we can see. UV causes sunburn. X-rays see through body. Gamma rays have most energy.', level:'primary3', tags:['light','spectrum','radio','X-ray'] },
  { id:'phy-31', category:'thermodynamics', title:'Heat Transfer', content:'Heat moves in three ways. Conduction transfers through direct contact. Convection moves through fluids. Radiation travels through space. Insulators slow heat transfer. Conductors speed it up.', level:'primary3', tags:['heat','conduction','convection','radiation'] },
  { id:'phy-32', category:'electricity', title:'Magnetism', content:'Magnets have north and south poles. Opposite poles attract. Same poles repel. Earth is a giant magnet. Compass needles point north. Electromagnets use electricity to create magnetism.', level:'primary2', tags:['magnet','pole','compass','electromagnet'] },
];

// --- Tech expansion ---
const techItems = [
  { id:'tech-36', category:'ai', title:'What is Artificial Intelligence?', content:'AI makes computers smart. Machine learning learns from data. Neural networks are like brain cells. AI recognizes faces, understands speech, and plays games. AI helps doctors and drivers.', level:'primary3', tags:['AI','machine learning','neural network'] },
  { id:'tech-37', category:'ai', title:'Robotics in Daily Life', content:'Robots help in many ways. Vacuum robots clean floors. Assembly robots build cars. Surgical robots help doctors. Educational robots teach coding. Drones fly and take photos.', level:'primary2', tags:['robot','vacuum','drone','surgery'] },
  { id:'tech-38', category:'internet', title:'How the Internet Works', content:'The internet connects computers worldwide. Data travels as packets. Routers direct traffic. Servers store websites. Your device is a client. Fiber optic cables carry data as light.', level:'primary3', tags:['internet','packet','server','router'] },
  { id:'tech-39', category:'gadgets', title:'Smartphones', content:'Smartphones are powerful computers. They have cameras, GPS, and sensors. Apps provide endless functions. Touchscreens detect finger touches. Batteries power everything. 5G brings fast internet.', level:'primary2', tags:['smartphone','app','touchscreen','5G'] },
  { id:'tech-40', category:'ai', title:'Virtual and Augmented Reality', content:'VR creates completely virtual worlds. AR adds digital objects to the real world. VR headsets cover your eyes. AR works through phone cameras. Both are used for games, education, and training.', level:'primary3', tags:['VR','AR','virtual','augmented'] },
  { id:'tech-41', category:'emerging', title:'Self-Driving Cars', content:'Self-driving cars use sensors and AI. Cameras see road signs. Radar detects objects. Lidar creates 3D maps. The car computer makes driving decisions. Level 5 means fully autonomous.', level:'primary3', tags:['autonomous','car','sensor','lidar'] },
  { id:'tech-42', category:'emerging', title:'Wearable Technology', content:'Wearables are devices you wear. Smartwatches tell time and track health. Fitness bands count steps. Smart glasses show information. Wearable sensors monitor heart rate and sleep.', level:'primary2', tags:['wearable','smartwatch','fitness','health'] },
];

// --- Grammar fun expansion ---
const grammarItems = [
  { id:'grammar-51', category:'nouns', title:'Plural Nouns Rules', content:'Most nouns add -s for plural: cat → cats. Nouns ending in s, sh, ch, x add -es: bus → buses. Nouns ending in consonant + y change y to ies: baby → babies. Some are irregular: child → children, mouse → mice.', level:'primary2', tags:['noun','plural','irregular'] },
  { id:'grammar-52', category:'verbs', title:'Past Tense Verbs', content:'Regular verbs add -ed: walk → walked. Verbs ending in e add -d: dance → danced. Verbs ending in consonant + y change y to ied: try → tried. Irregular verbs change completely: go → went, eat → ate.', level:'primary2', tags:['verb','past tense','irregular'] },
  { id:'grammar-53', category:'adjectives', title:'Comparative Adjectives', content:'Short adjectives add -er: tall → taller. Words ending in y change to ier: happy → happier. Long adjectives use more: beautiful → more beautiful. Irregular: good → better, bad → worse.', level:'primary2', tags:['adjective','comparative','better'] },
  { id:'grammar-54', category:'adjectives', title:'Superlative Adjectives', content:'Short adjectives add -est: tall → tallest. Words ending in y change to iest: happy → happiest. Long adjectives use most: beautiful → most beautiful. Irregular: good → best, bad → worst.', level:'primary2', tags:['adjective','superlative','best'] },
  { id:'grammar-55', category:'sentence', title:'Compound Sentences', content:'Compound sentences join two ideas. Use conjunctions: and, but, or, so. Example: I like cats and I like dogs. The cat is small but it is brave. Each part can stand alone as a sentence.', level:'primary2', tags:['sentence','conjunction','compound'] },
  { id:'grammar-56', category:'sentence', title:'Complex Sentences', content:'Complex sentences have a main clause and a subordinate clause. Use words like because, although, when, if. Example: I stayed home because it was raining. When the bell rings, we go to class.', level:'primary3', tags:['sentence','clause','subordinate'] },
  { id:'grammar-57', category:'verbs', title:'Modal Verbs', content:'Modal verbs help main verbs. Can shows ability: I can swim. Must shows necessity: You must stop. Should gives advice: You should study. May asks permission: May I go?', level:'primary3', tags:['verb','modal','can','must'] },
  { id:'grammar-58', category:'verbs', title:'Active and Passive Voice', content:'Active voice: subject does the action. The cat ate the fish. Passive voice: subject receives the action. The fish was eaten by the cat. Passive uses be + past participle.', level:'primary3', tags:['voice','active','passive'] },
  { id:'grammar-59', category:'nouns', title:'Countable and Uncountable', content:'Countable nouns have plurals: apple → apples. Uncountable nouns have no plural: water, rice, milk. Use a/an with countable singular. Use some with uncountable. Use many with countable, much with uncountable.', level:'primary2', tags:['noun','countable','uncountable'] },
  { id:'grammar-60', category:'punctuation', title:'Quotation Marks', content:'Quotation marks show spoken words. Double quotes are common in US: "Hello" she said. Single quotes in UK: \'Hello\' she said. Periods go inside quotes in US. Question marks depend on context.', level:'primary3', tags:['punctuation','quote','dialogue'] },
];

merge('content-science.json', scienceItems);
merge('content-physics.json', physicsItems);
merge('content-tech.json', techItems);
merge('content-grammar-fun.json', grammarItems);
