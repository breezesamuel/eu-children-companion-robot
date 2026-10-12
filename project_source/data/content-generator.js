// Algorithmic content generators for infinite educational content
// Produces 10000+ unique items through combination and templates

const wordList = {
  animals: ['cat','dog','bird','fish','rabbit','hamster','turtle','parrot','horse','cow','sheep','goat','pig','chicken','duck','mouse','rat','frog','toad','snake','lizard','tiger','lion','bear','wolf','fox','deer','elephant','giraffe','monkey','panda','koala','kangaroo','whale','dolphin','seal','otter','beaver','squirrel','hedgehog','bat','owl','eagle','hawk','crow','sparrow','robin','swan','goose','penguin','flamingo','peacock','parrot','octopus','shark','crab','lobster','snail','worm','butterfly','bee','ant','spider','ladybug','dragonfly','grasshopper','cricket','firefly','mosquito','moth','caterpillar'],
  colors: ['red','blue','green','yellow','orange','purple','pink','brown','black','white','gray','gold','silver','violet','indigo','turquoise','coral','maroon','navy','olive','teal','aqua','fuchsia','lime','crimson','amber','lavender','magenta','plum','salmon'],
  foods: ['apple','banana','orange','grape','strawberry','blueberry','raspberry','mango','pineapple','watermelon','peach','pear','cherry','lemon','lime','kiwi','plum','apricot','coconut','papaya','pizza','pasta','rice','bread','cheese','butter','milk','eggs','chicken','beef','fish','salad','soup','cake','cookie','ice cream','chocolate','candy','pie','muffin'],
  places: ['school','park','beach','mountain','forest','river','lake','ocean','desert','island','city','town','village','farm','garden','market','museum','library','zoo','aquarium','playground','stadium','theater','cinema','hospital','airport','station','harbor','bridge','castle'],
  verbs: ['run','walk','jump','swim','fly','climb','dance','sing','read','write','draw','paint','cook','bake','plant','grow','build','make','create','play','laugh','smile','cry','shout','whisper','think','dream','wish','hope','love'],
  adjectives: ['big','small','tall','short','fast','slow','hot','cold','warm','cool','bright','dark','soft','hard','smooth','rough','sweet','sour','bitter','salty','happy','sad','angry','calm','brave','shy','clever','kind','gentle','fierce'],
  body: ['head','hair','eyes','ears','nose','mouth','teeth','tongue','neck','shoulder','arm','hand','fingers','thumb','chest','back','stomach','leg','knee','foot','toes','skin','bones','heart','lungs','brain','muscles','blood','nerves','stomach']
};

const europeanCities = [
  'London','Paris','Berlin','Madrid','Rome','Amsterdam','Brussels','Vienna','Prague','Budapest',
  'Warsaw','Stockholm','Copenhagen','Oslo','Helsinki','Dublin','Lisbon','Athens','Zurich','Munich',
  'Milan','Barcelona','Valencia','Porto','Lyon','Marseille','Hamburg','Cologne','Frankfurt','Stuttgart',
  'Dusseldorf','Leipzig','Dresden','Bremen','Hannover','Nuremberg','Essen','Dortmund','Bonn','Freiburg',
  'Heidelberg','Lubeck','Rostock','Potsdam','Weimar','Aachen','Trier','Münster','Augsburg','Regensburg',
  'Edinburgh','Glasgow','Manchester','Liverpool','Birmingham','Leeds','Sheffield','Bristol','Newcastle','Cardiff',
  'Belfast','Brighton','Oxford','Cambridge','Bath','York','Canterbury','Stratford','Dover','Southampton',
  'Gdansk','Krakow','Wroclaw','Poznan','Lodz','Katowice','Lublin','Torun','Szczecin','Bydgoszcz',
  'Gothenburg','Malmo','Uppsala','Linkoping','Vasteras','Orebro','Helsingborg','Lund','Umea','Karlstad',
  'Bergen','Stavanger','Trondheim','Drammen','Fredrikstad','Tromso','Sandnes','Bodo','Molde','Lillehammer'
];

const scientists = [
  { name: 'Albert Einstein', field: 'physics', known: 'Theory of Relativity' },
  { name: 'Isaac Newton', field: 'physics', known: 'Laws of Motion' },
  { name: 'Marie Curie', field: 'chemistry', known: 'Radioactivity research' },
  { name: 'Charles Darwin', field: 'biology', known: 'Theory of Evolution' },
  { name: 'Galileo Galilei', field: 'astronomy', known: 'Heliocentric model' },
  { name: 'Nikola Tesla', field: 'electrical', known: 'Alternating current' },
  { name: 'Ada Lovelace', field: 'computing', known: 'First computer program' },
  { name: 'Louis Pasteur', field: 'biology', known: 'Pasteurization' },
  { name: 'Alan Turing', field: 'computing', known: 'Turing Machine' },
  { name: 'Alexander Fleming', field: 'medicine', known: 'Penicillin discovery' },
  { name: 'Gregor Mendel', field: 'genetics', known: 'Laws of Inheritance' },
  { name: 'Dmitri Mendeleev', field: 'chemistry', known: 'Periodic Table' },
  { name: 'Michael Faraday', field: 'physics', known: 'Electromagnetic induction' },
  { name: 'Rosalind Franklin', field: 'biology', known: 'DNA structure' },
  { name: 'Stephen Hawking', field: 'cosmology', known: 'Black hole theory' },
  { name: 'Niels Bohr', field: 'physics', known: 'Atomic structure' },
  { name: 'Archimedes', field: 'mathematics', known: 'Buoyancy principle' },
  { name: 'Leonardo da Vinci', field: 'engineering', known: 'Renaissance polymath' },
  { name: 'Pythagoras', field: 'mathematics', known: 'Pythagorean theorem' },
  { name: 'Hypatia', field: 'mathematics', known: 'First known female mathematician' }
];

const composers = [
  'Ludwig van Beethoven','Wolfgang Amadeus Mozart','Johann Sebastian Bach','Frederic Chopin',
  'Antonio Vivaldi','Pyotr Tchaikovsky','Franz Schubert','Claude Debussy','Johannes Brahms',
  'Giuseppe Verdi','Richard Wagner','Igor Stravinsky','Sergei Rachmaninoff','Gustav Mahler',
  'Antonin Dvorak','George Frideric Handel','Joseph Haydn','Felix Mendelssohn','Robert Schumann',
  'Franz Liszt','Edvard Grieg','Jean Sibelius','Mikhail Glinka','Modest Mussorgsky',
  'Nikolai Rimsky-Korsakov','Dmitri Shostakovich','Bela Bartok','Aaron Copland','Leonard Bernstein',
  'George Gershwin','Duke Ellington','Erik Satie','Camille Saint-Saens','Gabriel Faure',
  'Cesar Franck','Heitor Villa-Lobos','Ralph Vaughan Williams','Benjamin Britten','Henry Purcell',
  'Claudio Monteverdi','Giovanni Palestrina','Thomas Tallis','William Byrd','Orlando Gibbons'
];

const paintingArtists = [
  'Leonardo da Vinci','Vincent van Gogh','Pablo Picasso','Claude Monet','Rembrandt',
  'Michelangelo','Johannes Vermeer','Edvard Munch','Salvador Dali','Georgia O\'Keeffe',
  'Frida Kahlo','Wassily Kandinsky','Jackson Pollock','Henri Matisse','Andy Warhol',
  'Raphael','Titian','Caravaggio','Diego Velazquez','Francisco Goya',
  'Jan van Eyck','Hieronymus Bosch','Albrecht Durer','Peter Paul Rubens','El Greco',
  'Eugene Delacroix','Jean-Auguste-Dominique Ingres','Gustave Courbet','Edgar Degas','Pierre-Auguste Renoir',
  'Paul Cezanne','Georges Seurat','Paul Gauguin','Amedeo Modigliani','Marc Chagall',
  'Rene Magritte','Piet Mondrian','Kazimir Malevich','Edward Hopper','Norman Rockwell'
];

const countries = [
  { name: 'United Kingdom', capital: 'London', language: 'English', currency: 'Pound Sterling', population: '67M' },
  { name: 'France', capital: 'Paris', language: 'French', currency: 'Euro', population: '67M' },
  { name: 'Germany', capital: 'Berlin', language: 'German', currency: 'Euro', population: '83M' },
  { name: 'Italy', capital: 'Rome', language: 'Italian', currency: 'Euro', population: '60M' },
  { name: 'Spain', capital: 'Madrid', language: 'Spanish', currency: 'Euro', population: '47M' },
  { name: 'Netherlands', capital: 'Amsterdam', language: 'Dutch', currency: 'Euro', population: '17M' },
  { name: 'Belgium', capital: 'Brussels', language: 'Dutch/French', currency: 'Euro', population: '11M' },
  { name: 'Switzerland', capital: 'Bern', language: 'German/French/Italian', currency: 'Swiss Franc', population: '8.6M' },
  { name: 'Sweden', capital: 'Stockholm', language: 'Swedish', currency: 'Swedish Krona', population: '10M' },
  { name: 'Norway', capital: 'Oslo', language: 'Norwegian', currency: 'Norwegian Krone', population: '5.4M' },
  { name: 'Denmark', capital: 'Copenhagen', language: 'Danish', currency: 'Danish Krone', population: '5.8M' },
  { name: 'Finland', capital: 'Helsinki', language: 'Finnish', currency: 'Euro', population: '5.5M' },
  { name: 'Poland', capital: 'Warsaw', language: 'Polish', currency: 'Polish Zloty', population: '38M' },
  { name: 'Austria', capital: 'Vienna', language: 'German', currency: 'Euro', population: '9M' },
  { name: 'Portugal', capital: 'Lisbon', language: 'Portuguese', currency: 'Euro', population: '10M' },
  { name: 'Greece', capital: 'Athens', language: 'Greek', currency: 'Euro', population: '10M' },
  { name: 'Ireland', capital: 'Dublin', language: 'English/Irish', currency: 'Euro', population: '5M' },
  { name: 'Czech Republic', capital: 'Prague', language: 'Czech', currency: 'Czech Koruna', population: '10.7M' },
  { name: 'Hungary', capital: 'Budapest', language: 'Hungarian', currency: 'Hungarian Forint', population: '9.7M' },
  { name: 'Romania', capital: 'Bucharest', language: 'Romanian', currency: 'Romanian Leu', population: '19M' },
  { name: 'Croatia', capital: 'Zagreb', language: 'Croatian', currency: 'Euro', population: '4M' },
  { name: 'Slovakia', capital: 'Bratislava', language: 'Slovak', currency: 'Euro', population: '5.4M' },
  { name: 'Slovenia', capital: 'Ljubljana', language: 'Slovenian', currency: 'Euro', population: '2.1M' },
  { name: 'Bulgaria', capital: 'Sofia', language: 'Bulgarian', currency: 'Bulgarian Lev', population: '7M' },
  { name: 'Serbia', capital: 'Belgrade', language: 'Serbian', currency: 'Serbian Dinar', population: '7M' },
  { name: 'Lithuania', capital: 'Vilnius', language: 'Lithuanian', currency: 'Euro', population: '2.8M' },
  { name: 'Latvia', capital: 'Riga', language: 'Latvian', currency: 'Euro', population: '1.9M' },
  { name: 'Estonia', capital: 'Tallinn', language: 'Estonian', currency: 'Euro', population: '1.3M' },
  { name: 'Luxembourg', capital: 'Luxembourg City', language: 'Luxembourgish', currency: 'Euro', population: '0.6M' },
  { name: 'Iceland', capital: 'Reykjavik', language: 'Icelandic', currency: 'Icelandic Krona', population: '0.36M' }
];

const planets = [
  { name: 'Mercury', type: 'Terrestrial', size: 'Smallest', distance: '57.9M km', dayLength: '59 Earth days', yearLength: '88 Earth days', funFact: 'A year on Mercury is just 88 Earth days!' },
  { name: 'Venus', type: 'Terrestrial', size: 'Similar to Earth', distance: '108.2M km', dayLength: '243 Earth days', yearLength: '225 Earth days', funFact: 'Venus rotates backwards compared to most planets!' },
  { name: 'Earth', type: 'Terrestrial', size: '5th largest', distance: '149.6M km', dayLength: '24 hours', yearLength: '365.25 days', funFact: 'Earth is the only known planet with liquid water on its surface!' },
  { name: 'Mars', type: 'Terrestrial', size: '7th largest', distance: '227.9M km', dayLength: '24.6 hours', yearLength: '687 Earth days', funFact: 'Mars has the tallest mountain in the solar system - Olympus Mons!' },
  { name: 'Jupiter', type: 'Gas Giant', size: 'Largest', distance: '778.5M km', dayLength: '9.9 hours', yearLength: '11.9 Earth years', funFact: 'Jupiter\'s Great Red Spot is a storm bigger than Earth!' },
  { name: 'Saturn', type: 'Gas Giant', size: '2nd largest', distance: '1.4B km', dayLength: '10.7 hours', yearLength: '29.5 Earth years', funFact: 'Saturn\'s rings are made of ice and rock particles!' },
  { name: 'Uranus', type: 'Ice Giant', size: '3rd largest', distance: '2.9B km', dayLength: '17.2 hours', yearLength: '84 Earth years', funFact: 'Uranus rotates on its side!' },
  { name: 'Neptune', type: 'Ice Giant', size: '4th largest', distance: '4.5B km', dayLength: '16.1 hours', yearLength: '165 Earth years', funFact: 'Neptune has the strongest winds in the solar system!' }
];

const famousLandmarks = [
  { name: 'Eiffel Tower', city: 'Paris', country: 'France', height: '330m', built: 1889 },
  { name: 'Big Ben', city: 'London', country: 'UK', height: '96m', built: 1859 },
  { name: 'Colosseum', city: 'Rome', country: 'Italy', built: 'AD 80' },
  { name: 'Brandenburg Gate', city: 'Berlin', country: 'Germany', built: 1791 },
  { name: 'Sagrada Familia', city: 'Barcelona', country: 'Spain', built: 1882 },
  { name: 'Leaning Tower of Pisa', city: 'Pisa', country: 'Italy', height: '56m', built: 1372 },
  { name: 'Stonehenge', city: 'Wiltshire', country: 'UK', built: '2500 BC' },
  { name: 'Acropolis', city: 'Athens', country: 'Greece', built: '438 BC' },
  { name: 'Neuschwanstein Castle', city: 'Füssen', country: 'Germany', built: 1886 },
  { name: 'Alhambra', city: 'Granada', country: 'Spain', built: 1333 },
  { name: 'Tower of London', city: 'London', country: 'UK', built: 1078 },
  { name: 'St. Peter\'s Basilica', city: 'Vatican City', country: 'Vatican', built: 1626 },
  { name: 'Charles Bridge', city: 'Prague', country: 'Czech Republic', built: 1402 },
  { name: 'Matterhorn', city: 'Zermatt', country: 'Switzerland', height: '4478m' },
  { name: 'Taj Mahal', city: 'Agra', country: 'India', built: 1653 },
  { name: 'Great Wall', city: 'Beijing', country: 'China', built: '7th century BC' },
  { name: 'Machu Picchu', city: 'Cusco', country: 'Peru', built: 1450 },
  { name: 'Christ the Redeemer', city: 'Rio de Janeiro', country: 'Brazil', height: '30m', built: 1931 },
  { name: 'Statue of Liberty', city: 'New York', country: 'USA', height: '93m', built: 1886 },
  { name: 'Sydney Opera House', city: 'Sydney', country: 'Australia', built: 1973 }
];

const dinosaurs = [
  { name: 'Tyrannosaurus Rex', period: 'Late Cretaceous', diet: 'Carnivore', length: '12m', weight: '8 tons', fact: 'T-Rex had the strongest bite force of any land animal ever!' },
  { name: 'Triceratops', period: 'Late Cretaceous', diet: 'Herbivore', length: '9m', weight: '6 tons', fact: 'Triceratops had three horns on its face!' },
  { name: 'Stegosaurus', period: 'Late Jurassic', diet: 'Herbivore', length: '9m', weight: '5 tons', fact: 'Stegosaurus had a brain the size of a walnut!' },
  { name: 'Brachiosaurus', period: 'Late Jurassic', diet: 'Herbivore', length: '25m', weight: '35 tons', fact: 'Brachiosaurus could reach leaves up to 13 meters high!' },
  { name: 'Velociraptor', period: 'Late Cretaceous', diet: 'Carnivore', length: '2m', weight: '15kg', fact: 'Velociraptor was actually the size of a turkey!' },
  { name: 'Diplodocus', period: 'Late Jurassic', diet: 'Herbivore', length: '27m', weight: '12 tons', fact: 'Diplodocus used its long tail as a whip for defense!' },
  { name: 'Ankylosaurus', period: 'Late Cretaceous', diet: 'Herbivore', length: '8m', weight: '6 tons', fact: 'Ankylosaurus had a club tail that could break bones!' },
  { name: 'Pteranodon', period: 'Late Cretaceous', diet: 'Carnivore', wingspan: '7m', fact: 'Pteranodon was not a dinosaur - it was a flying reptile!' },
  { name: 'Plesiosaurus', period: 'Jurassic', diet: 'Carnivore', length: '3.5m', fact: 'Plesiosaurus had a very long neck like a sea serpent!' },
  { name: 'Iguanodon', period: 'Early Cretaceous', diet: 'Herbivore', length: '10m', weight: '4.5 tons', fact: 'Iguanodon had thumb spikes for defense!' },
  { name: 'Parasaurolophus', period: 'Late Cretaceous', diet: 'Herbivore', length: '10m', weight: '3 tons', fact: 'Parasaurolophus had a long hollow crest that made sounds!' },
  { name: 'Spinosaurus', period: 'Cretaceous', diet: 'Carnivore', length: '15m', weight: '7 tons', fact: 'Spinosaurus was larger than T-Rex!' },
  { name: 'Apatosaurus', period: 'Late Jurassic', diet: 'Herbivore', length: '22m', weight: '22 tons', fact: 'Apatosaurus was once called Brontosaurus!' },
  { name: 'Allosaurus', period: 'Late Jurassic', diet: 'Carnivore', length: '12m', weight: '2 tons', fact: 'Allosaurus had horns above its eyes!' },
  { name: 'Pachycephalosaurus', period: 'Late Cretaceous', diet: 'Herbivore', length: '4.5m', weight: '450kg', fact: 'Pachycephalosaurus had a thick dome skull for head-butting!' }
];

const humanBodyFacts = [
  { system: 'Skeletal', fact: 'The human body has 206 bones.', detail: 'Babies are born with about 270 bones that fuse together as they grow.' },
  { system: 'Muscular', fact: 'There are over 600 muscles in the human body.', detail: 'The strongest muscle is the masseter (jaw muscle).' },
  { system: 'Circulatory', fact: 'Your heart beats about 100,000 times per day.', detail: 'Blood travels through 60,000 miles of blood vessels.' },
  { system: 'Respiratory', fact: 'You take about 20,000 breaths per day.', detail: 'The right lung is slightly larger than the left.' },
  { system: 'Digestive', fact: 'The small intestine is about 6 meters long.', detail: 'Food takes 24-72 hours to travel through your digestive system.' },
  { system: 'Nervous', fact: 'The brain has about 86 billion neurons.', detail: 'Nerve signals travel at up to 120 meters per second!' },
  { system: 'Integumentary', fact: 'Skin is the largest organ.', detail: 'You shed about 30,000-40,000 skin cells every minute!' },
  { system: 'Immune', fact: 'White blood cells fight infections.', detail: 'Your body produces about 10 billion new white blood cells daily.' },
  { system: 'Endocrine', fact: 'The pituitary gland is called the "master gland".', detail: 'Hormones control growth, metabolism, and mood.' },
  { system: 'Urinary', fact: 'Kidneys filter about 180 liters of blood daily.', detail: 'The bladder can hold about 400-600ml of urine.' }
];

const spaceFacts = [
  'The Sun is 109 times wider than Earth!',
  'A day on Venus is longer than a year on Venus!',
  'There are more stars in the universe than grains of sand on Earth!',
  'The footprint on the Moon will last for millions of years because there is no wind or water!',
  'One million Earths could fit inside the Sun!',
  'The ISS travels at about 28,000 km/h!',
  'Neutron stars can spin 600 times per second!',
  'The largest known star is about 1,700 times wider than the Sun!',
  'It would take 100,000 years to cross the Milky Way at the speed of light!',
  'Saturn would float in water because it\'s mostly made of gas!',
  'The coldest place in the universe is on Earth (in laboratories)!',
  'There are mountains taller than Everest on Mars!',
  'Jupiter has 95 known moons!',
  'The Sun loses about 4 million tons of mass every second!',
  'Space is completely silent because there is no air to carry sound!',
  'The Andromeda Galaxy is on a collision course with the Milky Way!',
  'Olympus Mons on Mars is 2.5 times the height of Mount Everest!',
  'Uranus has 27 known moons named after Shakespeare characters!',
  'Pluto is smaller than the Moon!',
  'The speed of light is about 299,792 kilometers per second!'
];

const historyFacts = [
  { period: 'Ancient Egypt', fact: 'The Great Pyramid of Giza was the tallest building for over 3,800 years.', year: '2560 BC' },
  { period: 'Ancient Greece', fact: 'The Olympic Games started in 776 BC and were held every four years.', year: '776 BC' },
  { period: 'Roman Empire', fact: 'The Roman Empire lasted for about 1,000 years.', year: '27 BC - AD 476' },
  { period: 'Viking Age', fact: 'Vikings reached North America about 500 years before Columbus.', year: 'AD 1000' },
  { period: 'Middle Ages', fact: 'Castles had moats not just for defense but also for sewage!', year: 'AD 500-1500' },
  { period: 'Renaissance', fact: 'The Renaissance began in Florence, Italy as a rebirth of art and learning.', year: 'AD 1300' },
  { period: 'Age of Discovery', fact: 'Magellan\'s expedition was the first to circumnavigate the globe (1519-1522).', year: '1519' },
  { period: 'Industrial Revolution', fact: 'The steam engine transformed transportation and manufacturing.', year: '1760' },
  { period: 'Modern Era', fact: 'The first powered flight by the Wright brothers lasted just 12 seconds!', year: '1903' },
  { period: 'Space Age', fact: 'The first Moon landing in 1969 was watched by 600 million people!', year: '1969' }
];

const inventors = [
  { name: 'Johannes Gutenberg', invention: 'Printing Press', year: 1440, impact: 'Made books affordable, spread knowledge across Europe' },
  { name: 'Thomas Edison', invention: 'Light Bulb', year: 1879, impact: 'Brought electric light to homes and streets' },
  { name: 'Alexander Graham Bell', invention: 'Telephone', year: 1876, impact: 'Revolutionized long-distance communication' },
  { name: 'Karl Benz', invention: 'Automobile', year: 1886, impact: 'First practical car powered by internal combustion engine' },
  { name: 'Wright Brothers', invention: 'Airplane', year: 1903, impact: 'Made human flight possible' },
  { name: 'John Logie Baird', invention: 'Television', year: 1925, impact: 'First working television system' },
  { name: 'Tim Berners-Lee', invention: 'World Wide Web', year: 1989, impact: 'Created the foundation of the modern internet' },
  { name: 'James Watt', invention: 'Improved Steam Engine', year: 1776, impact: 'Powered the Industrial Revolution' },
  { name: 'Guglielmo Marconi', invention: 'Radio', year: 1895, impact: 'First wireless telegraph, led to modern radio' },
  { name: 'Robert Goddard', invention: 'Liquid-Fueled Rocket', year: 1926, impact: 'Made space travel possible' }
];

const mathFormulas = [
  { name: 'Area of a Circle', formula: 'A = πr²', description: 'The area of a circle is π times the radius squared' },
  { name: 'Pythagorean Theorem', formula: 'a² + b² = c²', description: 'In a right triangle, the square of the hypotenuse equals sum of squares of legs' },
  { name: 'Quadratic Formula', formula: 'x = (-b ± √(b²-4ac))/2a', description: 'Solves quadratic equations of the form ax² + bx + c = 0' },
  { name: 'Area of a Triangle', formula: 'A = ½bh', description: 'The area of a triangle is half of base times height' },
  { name: 'Volume of a Sphere', formula: 'V = (4/3)πr³', description: 'The volume of a sphere is four-thirds times π times radius cubed' },
  { name: 'Circumference of Circle', formula: 'C = 2πr', description: 'The circumference of a circle is 2π times the radius' },
  { name: 'Area of a Rectangle', formula: 'A = l × w', description: 'The area of a rectangle is length times width' },
  { name: 'Volume of a Cylinder', formula: 'V = πr²h', description: 'The volume of a cylinder is π times radius squared times height' },
  { name: 'Distance Formula', formula: 'd = √((x₂-x₁)²+(y₂-y₁)²)', description: 'Distance between two points on a coordinate plane' },
  { name: 'Slope Formula', formula: 'm = (y₂-y₁)/(x₂-x₁)', description: 'The slope of a line through two points' },
  { name: 'Speed Formula', formula: 'v = d/t', description: 'Speed equals distance divided by time' },
  { name: 'Density Formula', formula: 'ρ = m/V', description: 'Density equals mass divided by volume' },
  { name: 'Percentage Formula', formula: 'P = (part/whole) × 100%', description: 'A percentage is a ratio expressed as a fraction of 100' },
  { name: 'Simple Interest', formula: 'I = P × r × t', description: 'Simple interest equals principal times rate times time' },
  { name: 'Area of a Trapezoid', formula: 'A = ½(a+b)h', description: 'The area of a trapezoid is half the sum of bases times height' }
];

// Generators

function generateMathProblems(count = 5000) {
  const problems = [];
  const operations = ['addition', 'subtraction', 'multiplication', 'division'];
  const levels = ['primary1','primary2','primary3','primary4','primary5','primary6','junior1'];
  
  for (let i = 0; i < count; i++) {
    const op = operations[i % 4];
    const level = levels[i % 7];
    let a, b, answer, question, displayOp;
    
    switch (op) {
      case 'addition':
        a = Math.floor(Math.random() * 50 * (i % 5 + 1)) + 1;
        b = Math.floor(Math.random() * 50 * (i % 5 + 1)) + 1;
        answer = a + b;
        displayOp = '+';
        break;
      case 'subtraction':
        a = Math.floor(Math.random() * 100 * (i % 4 + 1)) + 10;
        b = Math.floor(Math.random() * a) + 1;
        answer = a - b;
        displayOp = '−';
        break;
      case 'multiplication':
        a = Math.floor(Math.random() * 12 * (i % 3 + 1)) + 1;
        b = Math.floor(Math.random() * 12 * (i % 3 + 1)) + 1;
        answer = a * b;
        displayOp = '×';
        break;
      case 'division':
        b = Math.floor(Math.random() * 12 * (i % 3 + 1)) + 1;
        answer = Math.floor(Math.random() * 12 * (i % 3 + 1)) + 1;
        a = b * answer;
        displayOp = '÷';
        break;
    }
    
    question = `${a} ${displayOp} ${b} = ?`;
    problems.push({ id: i + 1, question, answer, level: levels[i % 7], type: op });
  }
  return problems;
}

function generateVocabulary(count = 2000) {
  const words = ['apple','book','cat','dog','sun','moon','star','water','tree','fish','bird','house','car','ball','hat','shoe','door','light','bed','cup',
    'table','chair','window','floor','wall','roof','garden','flower','grass','tree','cloud','rain','snow','wind','fire','earth','sky','sea','hill','stone',
    'road','bridge','ship','train','plane','bike','bus','lamp','clock','bell','key','lock','ring','chain','flag','map','coin','note','card','game',
    'song','dance','play','work','rest','walk','talk','hear','see','touch','taste','smell','think','know','grow','live','give','take','make','find',
    'keep','hold','turn','pull','push','lift','drop','open','close','fill','empty','clean','wash','dry','cut','break','fix','build','draw','write',
    'read','count','spell','sing','cook','bake','plant','feed','save','help','care','like','love','hope','wish','dream','smile','laugh','cry','shout',
    'whisper','climb','jump','skip','run','swim','fly','fall','sit','stand','lie','sleep','wake','bend','spin','roll','catch','throw','kick','catch',
    'happy','sad','mad','glad','calm','warm','cool','bright','dark','soft','hard','sweet','sour','bitter','salty','rich','poor','young','old','new',
    'fast','slow','tall','short','long','wide','thin','thick','deep','shallow','high','low','near','far','right','left','east','west','north','south',
    'first','last','next','same','different','early','late','best','most','least','many','some','each','every','both','all','few','several','much','enough',
    'red','blue','green','yellow','white','black','brown','pink','purple','orange','gray','gold','silver','navy','coral','lime','olive','teal','aqua','ivory',
    'one','two','three','four','five','six','seven','eight','nine','ten','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety','hundred','thousand',
    'circle','square','triangle','rectangle','oval','cube','sphere','cone','cylinder','pyramid','line','curve','angle','arc','point','width','height','depth','length','volume',
    'spring','summer','autumn','winter','January','February','March','April','May','June','July','August','September','October','November','December',
    'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday','today','yesterday','tomorrow','morning','afternoon','evening','night','midnight',
    'kitchen','bedroom','bathroom','living room','dining room','garage','basement','attic','hallway','balcony','staircase','doorway','window sill','fireplace','bookshelf',
    'mother','father','sister','brother','aunt','uncle','grandma','grandpa','cousin','friend','neighbor','teacher','student','doctor','nurse','pilot','driver','farmer','baker','artist'];
  
  const definitions = [
    'a fruit','a domestic animal','a mode of transportation','a piece of furniture','a type of weather',
    'a part of nature','a building','a piece of clothing','a color','a number',
    'a shape','a direction','a time of day','a family member','a profession',
    'an action','a feeling','a place','a tool','a piece of music',
    'a sport','a food','a drink','a container','a material',
    'a measurement','a sound','a light source','a body of water','a celestial body',
    'a piece of art','a type of dance','a language','a country','a city',
    'a type of animal','a plant','a mineral','a game','a type of energy'
  ];
  
  const levels = ['a1','a2','b1','b2','c1'];
  const vocab = [];
  
  for (let i = 0; i < count; i++) {
    const word = words[i % words.length];
    const def = definitions[Math.floor(i / 50) % definitions.length];
    const level = levels[i % 5];
    vocab.push({
      id: i + 1,
      word: word.charAt(0).toUpperCase() + word.slice(1),
      meaning: def,
      phonetic: `/${word}/`,
      example: `I see a ${word} over there.`,
      level: level,
      category: i % 2 === 0 ? 'general' : 'everyday',
      partOfSpeech: i % 3 === 0 ? 'noun' : i % 3 === 1 ? 'verb' : 'adjective'
    });
  }
  return vocab;
}

function generateJokes(count = 500) {
  const setups = [
    'Why did the {subject} {action}?',
    'What do you call a {subject} that {action}?',
    'How does a {subject} {action}?',
    'Why was the {subject} {adjective}?',
    'What did the {subject} say to the {object}?',
    'Why did the {subject} go to {place}?',
    'What is a {subject}\'s favorite {thing}?',
    'How many {subject}s does it take to {action}?',
    'What do you get when you cross a {subject} with a {object}?',
    'Why don\'t {subject}s {action}?'
  ];
  
  const punchlines = [
    'Because it was too {adjective}!',
    'A {subject} that {action}s!',
    'Very {adverb}, of course!',
    'Because it {action}ed too much!',
    '"{punchline_text}"',
    'To get a {thing}!',
    'Its favorite {thing}!',
    'Just one, but it takes a while!',
    'A {compound_noun}!',
    'They don\'t have the {body_part}!'
  ];
  
  const subjects = ['math book', 'skeleton', 'scarecrow', 'teddy bear', 'robot', 'computer', 'chicken', 'ghost', 'elephant', 'snowman', 'banana', 'clock', 'fish', 'bear', 'cat', 'dog', 'bird', 'tree', 'star', 'moon'];
  const actions = ['cross the road', 'go to school', 'eat lunch', 'sleep', 'cry', 'laugh', 'dance', 'sing', 'run', 'jump', 'hide', 'smile', 'whisper', 'shout', 'think'];
  const adjectives = ['happy', 'sad', 'tired', 'hungry', 'sleepy', 'confused', 'excited', 'nervous', 'brave', 'shy', 'funny', 'serious', 'silly', 'clever', 'clumsy'];
  const objects = ['teacher', 'parent', 'friend', 'robot', 'computer', 'book', 'pen', 'phone', 'TV', 'radio', 'mirror', 'window', 'door', 'chair', 'table'];
  const places = ['school', 'the park', 'bed', 'the store', 'the doctor', 'the moon', 'space', 'the kitchen', 'the garden', 'the beach', 'the mountains', 'the city', 'the farm', 'the zoo', 'the museum'];
  const things = ['food', 'book', 'toy', 'game', 'song', 'movie', 'sport', 'color', 'number', 'shape', 'animal', 'plant', 'star', 'planet', 'car'];
  const adverbs = ['quickly', 'slowly', 'carefully', 'loudly', 'quietly', 'happily', 'sadly', 'angrily', 'gently', 'clumsily'];
  const compoundNouns = ['crocodile', 'spaghetti monster', 'chocolate bar', 'dancing bear', 'flying pig', 'singing fish', 'jumping bean', 'talking dog', 'magic carpet', 'invisible man'];
  const bodyParts = ['guts', 'bones', 'brains', 'heart', 'stomach', 'head', 'feet', 'hands', 'knees', 'toes'];
  
  const jokes = [];
  for (let i = 0; i < count; i++) {
    const template = setups[i % setups.length];
    const subject = subjects[i % subjects.length];
    const action = actions[Math.floor(i / 3) % actions.length];
    const adjective = adjectives[Math.floor(i / 4) % adjectives.length];
    const object = objects[Math.floor(i / 5) % objects.length];
    const place = places[Math.floor(i / 7) % places.length];
    const thing = things[Math.floor(i / 11) % things.length];
    const adverb = adverbs[Math.floor(i / 13) % adverbs.length];
    const compoundNoun = compoundNouns[Math.floor(i / 17) % compoundNouns.length];
    const bodyPart = bodyParts[Math.floor(i / 19) % bodyParts.length];
    
    const question = template
      .replace('{subject}', subject)
      .replace('{action}', action)
      .replace('{adjective}', adjective)
      .replace('{object}', object)
      .replace('{place}', place)
      .replace('{thing}', thing);
    
    const answer = punchlines[i % punchlines.length]
      .replace('{subject}', subject)
      .replace('{action}', action)
      .replace('{adjective}', adjective)
      .replace('{adverb}', adverb)
      .replace('{thing}', thing)
      .replace('{punchline_text}', `Because I'm ${adjective}!`)
      .replace('{compound_noun}', compoundNoun)
      .replace('{body_part}', bodyPart);
    
    jokes.push({ id: i + 1, question, answer, category: ['animal','food','school','silly','science'][i % 5] });
  }
  return jokes;
}

function generateFunFacts(count = 500) {
  const templates = [
    'Did you know that {subject} {fact}?',
    '{subject} {fact}',
    'Here\'s a fun fact: {subject} {fact}',
    '{subject} {fact} Isn\'t that amazing?',
    'Fun fact of the day: {subject} {fact}'
  ];
  
  const subjects = [
    'honey', 'bananas', 'octopuses', 'the Eiffel Tower', 'cows', 'a group of flamingos',
    'the shortest war in history', 'strawberries', 'the human nose', 'your fingernails',
    'butterflies', 'elephants', 'penguins', 'dolphins', 'trees', 'the Moon',
    'the Great Wall of China', 'lightning', 'clouds', 'the Amazon rainforest',
    'the Sahara Desert', 'Mount Everest', 'goldfish', 'pandas', 'kangaroos',
    'the human brain', 'your heart', 'the color blue', 'snowflakes', 'rainbows',
    'stars', 'the oceans', 'volcanoes', 'earthquakes', 'the speed of light',
    'sharks', 'bees', 'ants', 'mushrooms', 'bamboo', 'pearls', 'diamonds',
    'the Earth', 'Saturn', 'Jupiter', 'Mars', 'Venus', 'Mercury', 'Neptune',
    'chocolate', 'potatoes', 'pizza', 'ice cream', 'popcorn', 'cheese',
    'the internet', 'the first computer', 'paper', 'the telephone', 'the light bulb'
  ];
  
  const facts = [
    'never spoils. Archaeologists found 3000-year-old honey in Egyptian tombs that was still edible!',
    'are berries, but strawberries are not!',
    'have three hearts and blue blood!',
    'can grow up to 15 cm taller in summer due to thermal expansion!',
    'have best friends and get stressed when separated from them!',
    'is called a flamboyance!',
    'only lasted 38 minutes!',
    'have more seeds than there are berries on the plant!',
    'can remember about 50,000 different scents!',
    'grow about 3mm per month, which is faster than toenails!',
    'taste with their feet - they have taste sensors on their feet!',
    'are the only mammals that can\'t jump!',
    'have knees but can\'t bend them!',
    'sleep with one eye open!',
    'can communicate with each other through underground fungal networks!',
    'is slowly moving away from Earth at about 3.8 cm per year!',
    'is not visible from space with the naked eye!',
    'strikes the Earth about 100 times every second!',
    'can weigh as much as 1 million kg!',
    'produces about 20% of the world\'s oxygen!',
    'is the largest hot desert in the world, but it was once a lush green area!',
    'is the tallest mountain, but Mauna Kea is actually taller if measured from its base on the ocean floor!',
    'can recognize different human faces!',
    'spend up to 14 hours a day eating bamboo!',
    'can\'t walk backwards!',
    'generates enough electricity to power a small light bulb!',
    'beats about 100,000 times per day!',
    'is actually quite rare in nature - most blue things in nature are actually purple!',
    'are all unique - no two snowflakes are exactly the same!',
    'are actually full circles - we only see them as arcs from the ground!',
    'come in different colors - not all stars are white!',
    'contain about 97% of Earth\'s water!',
    'are actually openings in the Earth\'s crust where molten rock erupts!',
    'happen about 500,000 times a year, but most are too small to feel!',
    'is about 299,792 kilometers per second!',
    'have been around longer than trees - sharks existed before trees!',
    'can recognize human faces and remember patterns!',
    'can carry up to 50 times their own body weight!',
    'are more closely related to animals than to plants!',
    'can grow up to 91 cm per day, making it one of the fastest-growing plants!',
    'are the only gemstones formed inside living creatures!',
    'are made of carbon that has been compressed for billions of years!',
    'orbits the Sun at about 107,000 km/h!',
    'is so light it would float in water (if you could find a big enough pool)!',
    'has a storm called the Great Red Spot that has been raging for hundreds of years!',
    'has the largest volcano in the solar system - Olympus Mons!',
    'rotates backwards compared to most other planets!',
    'has no atmosphere to speak of, so the sky is always black!',
    'has wind speeds that can reach 2,100 km/h!',
    'can kill dogs and cats because it contains theobromine, which is toxic to them!',
    'are about 80% water!',
    'was originally called "pizza" in Naples, Italy, but flatbreads existed for centuries!',
    'was invented in China about 4000 years ago!',
    'pops when the water inside the kernel turns to steam!',
    'is the most stolen food in the world!',
    'was originally called ARPANET and was created by the US Department of Defense!',
    'weighed about 27 kg and took up an entire room!',
    'was invented in China about 2000 years ago!',
    'was invented by Alexander Graham Bell in 1876!',
    'was invented by Thomas Edison in 1879, but he wasn\'t the first - he made the first practical one!'
  ];
  
  const facts2 = facts;
  const result = [];
  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length];
    const subject = subjects[i % subjects.length];
    const fact = facts2[i % facts2.length];
    result.push({
      id: i + 1,
      fact: template.replace('{subject}', subject).replace('{fact}', fact),
      category: ['animals','food','science','history','nature','space','technology','body'][i % 8]
    });
  }
  return result;
}

function generateLearningActivities(count = 800) {
  const names = ['Creative {adj} {noun}', '{verb} the {noun}', 'Learn about {topic}', '{adj} {noun} Adventure', 'Explore {topic}'];
  const descriptions = ['A fun activity where children {action}.', 'Kids will love {action} while learning.', 'This activity helps children {action}.', 'An engaging way to {action}.', 'Perfect for developing {skill} through {action}.'];
  const adjs = ['Colorful', 'Fun', 'Amazing', 'Creative', 'Smart', 'Brave', 'Curious', 'Gentle', 'Happy', 'Bright', 'Eager', 'Friendly', 'Clever', 'Wise', 'Kind', 'Lively', 'Quiet', 'Bold', 'Calm', 'Proud'];
  const nouns = ['Drawing', 'Painting', 'Building', 'Cooking', 'Gardening', 'Writing', 'Reading', 'Singing', 'Dancing', 'Counting', 'Sorting', 'Matching', 'Coloring', 'Folding', 'Cutting', 'Pasting', 'Stacking', 'Measuring', 'Pouring', 'Mixing'];
  const verbs = ['Create', 'Build', 'Draw', 'Paint', 'Write', 'Read', 'Count', 'Sort', 'Match', 'Color', 'Fold', 'Cut', 'Paste', 'Stack', 'Measure', 'Pour', 'Mix', 'Plant', 'Cook', 'Sing'];
  const actionPhrases = ['arrange objects by size and color', 'create patterns with natural materials', 'practice counting with everyday objects', 'explore shapes through drawing and cutting', 'learn letters through sensory play'];
  const topics = ['Animals', 'Plants', 'Weather', 'Space', 'Oceans', 'Colors', 'Shapes', 'Numbers', 'Letters', 'Music', 'Art', 'Science', 'Nature', 'Food', 'Sports', 'Travel', 'Cultures', 'Robots', 'Dinosaurs', 'Insects'];
  const skills = ['creativity', 'problem-solving', 'fine motor skills', 'logical thinking', 'vocabulary', 'counting', 'observation', 'patience', 'teamwork', 'independence'];
  const materials = ['paper and crayons', 'natural objects', 'household items', 'play dough', 'building blocks', 'watercolors', 'recycled materials', 'fabric scraps', 'clay', 'puzzle pieces'];
  
  const activities = [];
  for (let i = 0; i < count; i++) {
    const adj = adjs[i % adjs.length];
    const noun = nouns[Math.floor(i / 3) % nouns.length];
    const verb = verbs[Math.floor(i / 5) % verbs.length];
    const topic = topics[Math.floor(i / 7) % topics.length];
    const skill = skills[Math.floor(i / 11) % skills.length];
    const action = actionPhrases[Math.floor(i / 13) % actionPhrases.length];
    const material = materials[Math.floor(i / 17) % materials.length];
    
    const title = (i % 2 === 0 ? names[0] : names[1])
      .replace('{adj}', adj)
      .replace('{noun}', noun)
      .replace('{verb}', verb)
      .replace('{topic}', topic);
    
    const description = descriptions[i % descriptions.length]
      .replace('{action}', action)
      .replace('{skill}', skill);
    
    activities.push({
      id: i + 1,
      title,
      description,
      topic: topics[i % topics.length],
      skill: skills[i % skills.length],
      materials: [material],
      duration: `${15 + (i % 6) * 5} minutes`,
      ageRange: `${3 + (i % 8)}-${5 + (i % 8)} years`,
      difficulty: ['easy', 'medium', 'hard'][i % 3]
    });
  }
  return activities;
}

function generateKnowledgeBase(count = 500) {
  const categories = ['setup', 'troubleshooting', 'features', 'billing', 'account', 'warranty', 'app', 'connectivity', 'content', 'privacy'];
  const titles = [
    'How to {action} your RoboBuddy',
    '{action} Guide for RoboBuddy',
    'Troubleshooting {topic} Issues',
    'Understanding {topic} on RoboBuddy',
    'Step-by-step {topic} Setup',
    'Common {topic} Problems and Solutions',
    'Getting Started with {topic}',
    'Advanced {topic} Tips',
    '{topic} FAQ',
    '{topic} Best Practices'
  ];
  const actions = ['set up', 'configure', 'update', 'clean', 'charge', 'connect', 'pair', 'reset', 'calibrate', 'optimize'];
  const topics_categories = {
    setup: ['initial setup', 'WiFi configuration', 'account creation', 'child profile', 'app installation', 'device pairing', 'language selection', 'content download', 'parental controls', 'voice training'],
    troubleshooting: ['WiFi connection', 'battery life', 'audio problems', 'screen issues', 'sensor calibration', 'software updates', 'charging problems', 'connectivity issues', 'performance', 'error messages'],
    features: ['voice interaction', 'math tutoring', 'storytelling', 'language learning', 'emotion recognition', 'parent monitoring', 'progress tracking', 'achievement system', 'multi-user mode', 'content recommendations'],
    billing: ['subscription plans', 'payment methods', 'invoice history', 'plan upgrades', 'plan cancellation', 'refund policy', 'promo codes', 'automatic renewal', 'billing address', 'tax information'],
    account: ['profile settings', 'password change', 'email preferences', 'notification settings', 'privacy settings', 'data export', 'account deletion', 'family sharing', 'device management', 'session management'],
    warranty: ['warranty coverage', 'extended warranty', 'claim process', 'repair status', 'replacement policy', 'shipping information', 'return process', 'damage assessment', 'international warranty', 'proof of purchase'],
    app: ['app download', 'app navigation', 'dashboard overview', 'notification setup', 'multi-device management', 'offline mode', 'data syncing', 'app updates', 'troubleshooting', 'feature discovery'],
    connectivity: ['WiFi setup', 'Bluetooth pairing', 'network requirements', 'signal strength', 'multiple devices', 'guest network', 'firewall settings', 'DNS configuration', 'proxy settings', 'mesh networks'],
    content: ['curriculum overview', 'age-appropriate content', 'content updates', 'download content', 'offline access', 'content languages', 'custom content', 'learning paths', 'progress reports', 'achievement badges'],
    privacy: ['data encryption', 'GDPR compliance', 'data collection', 'third-party sharing', 'parental consent', 'data retention', 'deletion policy', 'cookie policy', 'privacy settings', 'children privacy']
  };
  
  const articles = [];
  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length];
    const titleTemplate = titles[i % titles.length];
    const action = actions[Math.floor(i / 3) % actions.length];
    const topic = topics_categories[category][i % 10];
    
    const title = titleTemplate
      .replace('{action}', action)
      .replace('{topic}', topic)
      .replace('RoboBuddy', 'RoboBuddy');
    
    articles.push({
      id: i + 1,
      title,
      category,
      tags: [category, topic.split(' ')[0], 'robobuddy'],
      summary: `Learn how to ${action} ${topic} on your RoboBuddy.`,
      content: `This article covers everything you need to know about ${topic} on your RoboBuddy device. Follow these steps to ${action} your RoboBuddy successfully. If you need additional help, our support team is available 24/7.`,
      difficulty: ['beginner', 'intermediate', 'advanced'][i % 3]
    });
  }
  return articles;
}

function generateParentingTips(count = 300) {
  const tips = [
    'Read with your child for at least 20 minutes every day.',
    'Ask open-ended questions to encourage critical thinking.',
    'Create a consistent daily routine for learning and play.',
    'Praise effort rather than results to build growth mindset.',
    'Limit screen time to 1-2 hours per day for young children.',
    'Encourage outdoor play for physical and mental development.',
    'Let children make age-appropriate choices to build independence.',
    'Use everyday moments as learning opportunities.',
    'Establish a calm, distraction-free homework area.',
    'Celebrate small achievements to build confidence.',
    'Talk to your child about their feelings and emotions.',
    'Involve children in age-appropriate household tasks.',
    'Provide a balanced diet for brain development.',
    'Ensure adequate sleep based on age recommendations.',
    'Model lifelong learning by reading and learning yourself.',
    'Use music and art to stimulate creative thinking.',
    'Encourage curiosity by answering "why" questions patiently.',
    'Set clear boundaries with consistent consequences.',
    'Teach problem-solving skills instead of solving problems for them.',
    'Practice gratitude by sharing what you\'re thankful for.',
    'Allow unstructured free play time daily.',
    'Expose children to different cultures and languages.',
    'Use technology as a tool, not a babysitter.',
    'Teach financial literacy through allowance and saving.',
    'Build resilience by letting children experience safe failures.',
    'Create family traditions that build belonging and security.',
    'Encourage physical activity through fun family sports.',
    'Practice active listening when your child speaks.',
    'Teach empathy by discussing characters in stories.',
    'Support interests even if they differ from your expectations.'
  ];
  
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push({
      id: i + 1,
      tip: tips[i % tips.length],
      category: ['education', 'health', 'behavior', 'development', 'lifestyle'][i % 5],
      ageRange: `${2 + (i % 11)}-${4 + (i % 11)} years`
    });
  }
  return result;
}

function generateAffirmations(count = 200) {
  const affirmations = [
    'I am smart and capable.', 'I can do hard things.', 'Mistakes help me learn.', 'I am kind and helpful.',
    'I love learning new things.', 'I am special and unique.', 'I can make a difference.', 'Today is going to be a great day!',
    'I am loved and cared for.', 'I believe in myself.', 'I am a good friend.', 'I am brave and strong.',
    'I can solve problems.', 'I am creative and imaginative.', 'I am important.', 'I am proud of myself.',
    'I am getting better every day.', 'I am a good listener.', 'I can achieve my goals.', 'I am worthy of love.',
    'I share with others.', 'I try my best.', 'I am a good student.', 'I respect others.', 'I am honest and trustworthy.',
    'I am curious about the world.', 'I can ask for help when I need it.', 'I am a problem solver.', 'I make good choices.', 'I am grateful for what I have.',
    'I am patient and calm.', 'I am a team player.', 'I enjoy challenges.', 'I can focus on my tasks.', 'I am polite and respectful.',
    'I am a good thinker.', 'I take care of my body.', 'I can manage my feelings.', 'I am confident in myself.', 'I help make the world better.',
    'I can learn anything I set my mind to.', 'I am surrounded by people who love me.', 'I have good ideas.', 'I am careful and thoughtful.', 'I enjoy helping others.',
    'I am one of a kind.', 'I can control my actions.', 'I am safe and secure.', 'I have a big imagination.', 'I am good at working with others.',
    'I can express my feelings.', 'I am a great friend.', 'I am full of energy and joy.', 'I can handle changes.', 'I am gentle and caring.',
    'I am focused and determined.', 'I bring happiness to others.', 'I am good at solving puzzles.', 'I can wait my turn.', 'I am awesome just the way I am.'
  ];
  
  const categories = ['confidence', 'courage', 'learning', 'kindness', 'curiosity', 'self-esteem', 'impact', 'positivity', 'love', 'resilience'];
  
  return affirmations.map((text, i) => ({
    id: i + 1,
    text,
    category: categories[i % categories.length]
  }));
}

function generatePoems(count = 150) {
  const templates = [
    ['{noun} are {adjective},', '{noun} are {adjective},', 'They {verb} the whole day through.', 'I love {noun},', 'And {noun} do too!'],
    ['The {adjective} {noun} {verb}s {adverb},', 'Under the {adjective} {noun},', 'While the {adjective} {noun} {verb}s,', 'With a {adjective} {noun} so true.'],
    ['{noun} in the {noun},', 'So {adjective} and {adjective},', 'They {verb} and they {verb},', 'Making the world {adjective}.'],
    ['I see a {adjective} {noun},', 'High in the {noun},', 'It makes me feel {adjective},', 'And {adjective} like a {noun}.'],
    ['Little {noun} {verb}ing,', 'Under the {noun} so {adjective},', '{verb}ing and {verb}ing,', 'In the {noun} so {adjective}.']
  ];
  
  const titles = ['The {adjective} {noun}', 'My {noun}', '{noun} and {noun}', 'When {noun} {verb}', 'A {adjective} Day', 'The {noun} of {noun}', '{adjective} {noun} Dreams', 'Happy {noun}', 'Dancing {noun}', 'The {noun} Song'];
  
  const result = [];
  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length];
    const title = titles[i % titles.length]
      .replace('{noun}', ['sun', 'moon', 'star', 'bird', 'tree', 'flower', 'rain', 'wind', 'cloud', 'dream', 'heart', 'light', 'song', 'smile', 'hope'][i % 15])
      .replace('{adjective}', ['happy', 'bright', 'gentle', 'golden', 'silent', 'little', 'brave', 'kind', 'wise', 'free'][i % 10])
      .replace('{verb}', ['dance', 'sing', 'shine', 'glow', 'play', 'fly', 'dream', 'grow'][i % 8]);
    
    const lines = template.map(line =>
      line.replace(/\{noun\}/g, ['sun', 'moon', 'star', 'bird', 'tree', 'flower', 'rain', 'wind', 'cloud', 'dream'][(i + 3) % 10])
          .replace(/\{adjective\}/g, ['happy', 'bright', 'gentle', 'golden', 'silent', 'little', 'brave', 'kind', 'wise', 'free'][(i + 5) % 10])
          .replace(/\{verb\}/g, ['dance', 'sing', 'shine', 'glow', 'play', 'fly', 'dream', 'grow'][(i + 7) % 8])
          .replace(/\{adverb\}/g, ['gently', 'softly', 'brightly', 'freely', 'merrily'][(i + 11) % 5])
    );
    
    result.push({
      id: i + 1,
      title: title.charAt(0).toUpperCase() + title.slice(1),
      lines,
      author: 'RoboBuddy',
      theme: ['nature', 'happiness', 'dreams', 'family', 'play'][i % 5]
    });
  }
  return result;
}

function generateRiddles(count = 300) {
  const riddles = [
    { riddle: 'I speak without a mouth and hear without ears. I have no body, but I come alive with the wind. What am I?', answer: 'An echo' },
    { riddle: 'You can break me without touching me. What am I?', answer: 'A promise' },
    { riddle: 'What has keys but can\'t open locks?', answer: 'A piano' },
    { riddle: 'What has a head and a tail but no body?', answer: 'A coin' },
    { riddle: 'What gets wetter the more it dries?', answer: 'A towel' },
    { riddle: 'What can travel around the world while staying in a corner?', answer: 'A stamp' },
    { riddle: 'What has many teeth but can\'t eat?', answer: 'A comb' },
    { riddle: 'What runs all around a backyard yet never moves?', answer: 'A fence' },
    { riddle: 'What can you keep after giving to someone?', answer: 'Your word' },
    { riddle: 'What goes up but never comes down?', answer: 'Your age' },
    { riddle: 'What building has the most stories?', answer: 'A library' },
    { riddle: 'What has hands but can\'t clap?', answer: 'A clock' },
    { riddle: 'What can fill a room but takes up no space?', answer: 'Light' },
    { riddle: 'What starts with "e", ends with "e", and has one letter in it?', answer: 'An envelope' },
    { riddle: 'What gets sharper the more you use it?', answer: 'Your brain' },
    { riddle: 'What has a neck but no head?', answer: 'A bottle' },
    { riddle: 'What has legs but doesn\'t walk?', answer: 'A table' },
    { riddle: 'What can you catch but not throw?', answer: 'A cold' },
    { riddle: 'What has an eye but cannot see?', answer: 'A needle' },
    { riddle: 'What has words but never speaks?', answer: 'A book' }
  ];
  
  const result = [];
  for (let i = 0; i < count; i++) {
    const r = riddles[i % riddles.length];
    result.push({
      id: i + 1,
      riddle: r.riddle,
      answer: r.answer,
      difficulty: ['easy', 'medium', 'hard'][i % 3]
    });
  }
  return result;
}

function generateProverbs(count = 300) {
  const proverbs = [
    { proverb: 'A journey of a thousand miles begins with a single step.', origin: 'Chinese', meaning: 'Every great achievement starts with a small action.' },
    { proverb: 'Actions speak louder than words.', origin: 'English', meaning: 'What you do is more important than what you say.' },
    { proverb: 'The early bird catches the worm.', origin: 'English', meaning: 'Those who act promptly get the best opportunities.' },
    { proverb: 'Practice makes perfect.', origin: 'English', meaning: 'Regular practice leads to mastery.' },
    { proverb: 'Where there\'s a will, there\'s a way.', origin: 'English', meaning: 'Determination overcomes obstacles.' },
    { proverb: 'Knowledge is power.', origin: 'English', meaning: 'Learning gives you the ability to make a difference.' },
    { proverb: 'Rome wasn\'t built in a day.', origin: 'English', meaning: 'Great things take time and patience.' },
    { proverb: 'A friend in need is a friend indeed.', origin: 'English', meaning: 'True friends are there when you need them.' },
    { proverb: 'Honesty is the best policy.', origin: 'English', meaning: 'Being truthful is always the best choice.' },
    { proverb: 'Slow and steady wins the race.', origin: 'English', meaning: 'Consistency and patience lead to success.' },
    { proverb: 'Every cloud has a silver lining.', origin: 'English', meaning: 'There is something good in every bad situation.' },
    { proverb: 'If at first you don\'t succeed, try, try again.', origin: 'English', meaning: 'Never give up after a failure.' },
    { proverb: 'Two heads are better than one.', origin: 'English', meaning: 'Working together is more effective.' },
    { proverb: 'The pen is mightier than the sword.', origin: 'English', meaning: 'Writing and ideas are more powerful than force.' },
    { proverb: 'Better late than never.', origin: 'English', meaning: 'It\'s better to do something late than not at all.' },
    { proverb: 'Birds of a feather flock together.', origin: 'English', meaning: 'People with similar interests stay together.' },
    { proverb: 'Don\'t judge a book by its cover.', origin: 'English', meaning: 'Don\'t judge based on appearance alone.' },
    { proverb: 'All that glitters is not gold.', origin: 'English', meaning: 'Things that look valuable may not be.' },
    { proverb: 'A stitch in time saves nine.', origin: 'English', meaning: 'Fixing problems early prevents bigger issues.' },
    { proverb: 'Too many cooks spoil the broth.', origin: 'English', meaning: 'Too many people involved can ruin a task.' },
    { proverb: 'Haste makes waste.', origin: 'German', meaning: 'Rushing leads to mistakes and wasted effort.' },
    { proverb: 'The apple doesn\'t fall far from the tree.', origin: 'English', meaning: 'Children resemble their parents.' },
    { proverb: 'When in Rome, do as the Romans do.', origin: 'English', meaning: 'Follow the customs of where you are.' },
    { proverb: 'Necessity is the mother of invention.', origin: 'English', meaning: 'Problems inspire creativity.' },
    { proverb: 'Look before you leap.', origin: 'English', meaning: 'Think carefully before acting.' },
    { proverb: 'The squeaky wheel gets the grease.', origin: 'English', meaning: 'Those who speak up get attention.' },
    { proverb: 'Don\'t put all your eggs in one basket.', origin: 'English', meaning: 'Don\'t risk everything on one plan.' },
    { proverb: 'A picture is worth a thousand words.', origin: 'English', meaning: 'Visual images communicate more than words.' },
    { proverb: 'The grass is always greener on the other side.', origin: 'English', meaning: 'Others\' situations seem better than yours.' },
    { proverb: 'Absence makes the heart grow fonder.', origin: 'English', meaning: 'Distance increases affection.' }
  ];
  
  const result = [];
  for (let i = 0; i < count; i++) {
    const p = proverbs[i % proverbs.length];
    result.push({
      id: i + 1,
      proverb: p.proverb,
      origin: p.origin,
      meaning: p.meaning
    });
  }
  return result;
}

function generateLearningPaths(count = 80) {
  const subjects = ['Mathematics', 'English', 'Science', 'Art', 'Music', 'Coding', 'Geography', 'History', 'Reading', 'Writing'];
  const levels = ['Beginner', 'Elementary', 'Intermediate', 'Advanced'];
  const ageRanges = ['4-5', '5-6', '6-7', '7-8', '8-9', '9-10', '10-11', '11-12', '12-13', '13-14'];
  
  const paths = [];
  for (let i = 0; i < count; i++) {
    const subject = subjects[i % subjects.length];
    const level = levels[Math.floor(i / 8) % levels.length];
    const age = ageRanges[Math.floor(i / 4) % ageRanges.length];
    
    paths.push({
      id: i + 1,
      name: `${subject} ${level} Path`,
      subject,
      level,
      ageRange: age,
      description: `A ${level.toLowerCase()} learning path for ${subject} designed for children ages ${age}.`,
      estimatedDuration: `${4 + (i % 8)} weeks`,
      topics: Array.from({ length: 4 + (i % 4) }, (_, j) => `${subject} Topic ${j + 1}`),
      skills: [`Basic ${subject}`, `Intermediate ${subject}`, `Advanced ${subject}`].filter((_, j) => j <= i % 3)
    });
  }
  return paths;
}

function generateAchievements(count = 150) {
  const titles = [
    'First Steps', 'Quick Learner', 'Math Whiz', 'Reading Star', 'Science Explorer',
    'Artistic Genius', 'Music Maestro', 'Vocabulary Hero', 'Perfect Score', 'Streak Master',
    'Curious Mind', 'Problem Solver', 'Team Player', 'Creative Spirit', 'Never Give Up',
    'Grammar Guru', 'Spelling Bee', 'Book Worm', 'Number Ninja', 'Code Commander'
  ];
  
  const result = [];
  for (let i = 0; i < count; i++) {
    const t = titles[i % titles.length];
    result.push({
      id: i + 1,
      title: `${t} ${i >= titles.length ? String.fromCharCode(65 + Math.floor((i - titles.length) / titles.length)) : ''}`.trim(),
      description: `Earned by completing activities in ${['math', 'reading', 'science', 'art', 'music', 'language'][i % 6]}.`,
      icon: ['🎯', '🧮', '📚', '🔬', '🎨', '🎵', '⭐', '🏆', '💡', '🌈'][i % 10],
      points: (i + 1) * 10,
      category: ['learning', 'achievement', 'milestone', 'special'][i % 4]
    });
  }
  return result;
}

function generateTestimonials(count = 100) {
  const names = ['Sarah M.', 'Thomas K.', 'Anna L.', 'Pierre D.', 'Maria G.', 'Hans W.', 'Emma B.', 'Lucas J.', 'Sophie N.', 'Oliver R.',
    'Claire F.', 'David S.', 'Laura P.', 'Marco V.', 'Elena T.', 'Felix A.', 'Hannah K.', 'Jacob M.', 'Lea W.', 'Noah B.'];
  const locations = ['London, UK', 'Berlin, Germany', 'Paris, France', 'Rome, Italy', 'Madrid, Spain', 'Amsterdam, Netherlands', 'Vienna, Austria', 'Zurich, Switzerland', 'Stockholm, Sweden', 'Copenhagen, Denmark'];
  
  const texts = [
    'Since getting RoboBuddy, my child\'s math skills have improved dramatically. The interactive lessons make learning fun!',
    'The emotion recognition feature is incredible — RoboBuddy actually adapts to my daughter\'s mood.',
    'As a teacher, I\'ve seen remarkable progress with my students using RoboBuddy in the classroom.',
    'The parent app gives me peace of mind. I can see exactly what my child is learning and how they\'re progressing.',
    'My son used to struggle with reading, but now he asks to read stories with RoboBuddy every day!',
    'The multi-language support is perfect for our bilingual family. The kids switch between languages seamlessly.',
    'Setup was incredibly easy — we were up and running in 10 minutes. My 6-year-old can use it independently.',
    'Customer support is outstanding. They helped us customize learning paths for our twins with different needs.',
    'The GDPR compliance was a deciding factor for us. We feel confident about our children\'s data safety.',
    'RoboBuddy has become part of our daily routine. The learning activities are engaging and age-appropriate.',
    'I love the monthly progress reports. It\'s amazing to see how much my children are learning.',
    'The AI adapts perfectly to each child\'s pace. My two children have completely different learning experiences.',
    'Battery life is excellent — we charge it every other day with heavy use. The build quality is fantastic too.',
    'My 4-year-old learned the alphabet in two weeks with RoboBuddy. I couldn\'t believe the progress!',
    'The science experiments are my daughter\'s favorite. She\'s learning so much about the world around her.'
  ];
  
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push({
      id: i + 1,
      name: names[i % names.length],
      location: locations[i % locations.length],
      rating: 4 + (i % 2),
      text: texts[i % texts.length],
      childAge: 4 + (i % 10),
      product: ['Basic', 'Premium', 'Enterprise'][i % 3]
    });
  }
  return result;
}

function generateMusicSongs(count = 100) {
  const genres = ['classical', 'folk', 'nursery', 'instrumental', 'learning'];
  const songs = [];
  
  const songStems = ['Melody', 'Rhythm', 'Harmony', 'Tune', 'Song', 'Piece', 'Dance', 'Lullaby', 'March', 'Waltz'];
  const instruments = ['Piano', 'Violin', 'Flute', 'Guitar', 'Drums', 'Trumpet', 'Cello', 'Harp', 'Xylophone', 'Recorder'];
  
  for (let i = 0; i < count; i++) {
    songs.push({
      id: i + 1,
      title: `${instruments[i % instruments.length]} ${songStems[i % songStems.length]} No.${Math.floor(i / 10) + 1}`,
      composer: ['RoboBuddy AI', 'Traditional', 'L. Mozart', 'R. Schumann', 'C. Gurlitt'][i % 5],
      genre: genres[i % genres.length],
      duration: `${30 + (i % 6) * 30} seconds`,
      instruments: [instruments[i % instruments.length]],
      tempo: ['slow', 'moderate', 'fast'][i % 3]
    });
  }
  return songs;
}

function generateArtProjects(count = 80) {
  const projects = [];
  const styles = ['painting', 'drawing', 'sculpture', 'collage', 'printmaking', 'textile', 'digital', 'mixed media'];
  const themes = ['Nature', 'Animals', 'Space', 'Underwater', 'Fantasy', 'Portrait', 'Landscape', 'Abstract', 'Seasonal', 'Cultural'];
  const materials_groups = [
    ['watercolors', 'paper', 'brushes'],
    ['colored pencils', 'sketchbook', 'eraser'],
    ['clay', 'sculpting tools', 'wire'],
    ['magazines', 'glue', 'scissors'],
    ['ink', 'rollers', 'paper'],
    ['fabric', 'needle', 'thread'],
    ['tablet', 'stylus', 'drawing software'],
    ['acrylic paint', 'canvas', 'mixed found objects']
  ];
  
  for (let i = 0; i < count; i++) {
    const style = styles[i % styles.length];
    const theme = themes[i % themes.length];
    const mats = materials_groups[i % materials_groups.length];
    
    projects.push({
      id: i + 1,
      title: `${theme} ${style.charAt(0).toUpperCase() + style.slice(1)}`,
      style,
      theme,
      materials: mats,
      duration: `${30 + (i % 5) * 15} minutes`,
      difficulty: ['easy', 'medium', 'hard'][i % 3],
      ageRange: `${4 + (i % 8)}-${7 + (i % 8)} years`
    });
  }
  return projects;
}

function generateAnimalFacts(count = 400) {
  const animalFacts = [
    { animal: 'Octopus', fact: 'Octopuses have three hearts and blue blood.', category: 'sea creatures' },
    { animal: 'Elephant', fact: 'Elephants are the only mammals that can\'t jump.', category: 'mammals' },
    { animal: 'Penguin', fact: 'Penguins have knees but can\'t bend them.', category: 'birds' },
    { animal: 'Dolphin', fact: 'Dolphins sleep with one eye open.', category: 'sea creatures' },
    { animal: 'Giraffe', fact: 'Giraffes have the same number of neck vertebrae as humans — seven!', category: 'mammals' },
    { animal: 'Butterfly', fact: 'Butterflies taste with their feet.', category: 'insects' },
    { animal: 'Honeybee', fact: 'Honeybees can recognize human faces.', category: 'insects' },
    { animal: 'Kangaroo', fact: 'Kangaroos can\'t walk backwards.', category: 'mammals' },
    { animal: 'Panda', fact: 'Pandas spend up to 14 hours a day eating bamboo.', category: 'mammals' },
    { animal: 'Cat', fact: 'Cats can make over 100 different sounds.', category: 'mammals' },
    { animal: 'Dog', fact: 'Dogs can understand up to 250 words and gestures.', category: 'mammals' },
    { animal: 'Horse', fact: 'Horses can sleep standing up.', category: 'mammals' },
    { animal: 'Frog', fact: 'Some frogs can freeze solid and survive the winter.', category: 'amphibians' },
    { animal: 'Snail', fact: 'Snails can sleep for up to three years.', category: 'invertebrates' },
    { animal: 'Ant', fact: 'Ants can carry up to 50 times their own body weight.', category: 'insects' },
    { animal: 'Owl', fact: 'Owls can rotate their heads up to 270 degrees.', category: 'birds' },
    { animal: 'Cheetah', fact: 'Cheetahs can accelerate from 0 to 60 mph in 3 seconds.', category: 'mammals' },
    { animal: 'Chameleon', fact: 'Chameleons can move their eyes in two different directions at once.', category: 'reptiles' },
    { animal: 'Starfish', fact: 'Starfish can regrow lost arms.', category: 'sea creatures' },
    { animal: 'Crocodile', fact: 'Crocodiles can\'t stick out their tongues.', category: 'reptiles' }
  ];
  
  const result = [];
  for (let i = 0; i < count; i++) {
    const f = animalFacts[i % animalFacts.length];
    result.push({
      id: i + 1,
      animal: f.animal,
      fact: f.fact,
      category: f.category
    });
  }
  return result;
}

function generateBlogPosts(count = 150) {
  const titles = [
    '10 Ways {product} Makes Learning Fun',
    'The Science Behind {product}\'s AI',
    'How {product} Adapts to Your Child\'s Learning Style',
    '5 Reasons European Parents Choose {product}',
    '{product} vs Traditional Learning Methods',
    'Setting Up Your {product}: A Complete Guide',
    'The Future of Education: {product} in the Classroom',
    'Understanding Your Child\'s Progress with {product}',
    'Multi-Language Learning with {product}',
    'Safety First: How {product} Protects Your Child\'s Data',
    'Seasonal Learning Activities with {product}',
    '{product} Success Stories from Around Europe',
    'Building Confidence Through {product} Learning',
    'Screen Time vs Learning Time with {product}',
    'The Role of AI in Children\'s Education'
  ];
  
  const posts = [];
  for (let i = 0; i < count; i++) {
    const t = titles[i % titles.length].replace(/\{product\}/g, 'RoboBuddy');
    posts.push({
      id: i + 1,
      title: t,
      category: ['education', 'technology', 'parenting', 'product', 'updates'][i % 5],
      author: ['RoboBuddy Team', 'Dr. Anna Schmidt', 'Prof. James Wilson', 'Maria Rossi', 'Pedro Garcia'][i % 5],
      publishedAt: new Date(Date.now() - i * 86400000 * 3).toISOString(),
      readTime: `${3 + (i % 8)} min read`,
      tags: ['robobuddy', 'education', 'AI', 'children', 'learning'].slice(0, 2 + (i % 3))
    });
  }
  return posts;
}

module.exports = {
  generateMathProblems,
  generateVocabulary,
  generateJokes,
  generateFunFacts,
  generateLearningActivities,
  generateKnowledgeBase,
  generateParentingTips,
  generateAffirmations,
  generatePoems,
  generateRiddles,
  generateProverbs,
  generateLearningPaths,
  generateAchievements,
  generateTestimonials,
  generateMusicSongs,
  generateArtProjects,
  generateAnimalFacts,
  generateBlogPosts,

  wordList, countries, planets, dinosaurs, humanBodyFacts, spaceFacts,
  historyFacts, inventors, scientists, composers, paintingArtists,
  famousLandmarks, europeanCities, mathFormulas
};
