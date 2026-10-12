const fs = require('fs');
const path = require('path');

// ==========================================================
// Content expansion generator for smaller content files
// Usage: node scripts/expand-content.js
// ==========================================================

const CONTENT_DIR = path.join(__dirname, '..', 'data');

// --- Arts expansion (from 50 -> 150) ---
const artsAdditions = [
  { category:'arts_drawing', items:[
    { id:'drawing-11', title:'Shading Techniques', content:'Shading adds depth to drawings. Hatching uses parallel lines. Cross-hatching uses intersecting lines. Stippling uses dots. Blending smooths pencil marks with a blending stump or finger.', tags:['shading','hatching','technique'] },
    { id:'drawing-12', title:'Perspective Drawing', content:'Perspective creates the illusion of depth. One-point perspective uses a single vanishing point. Two-point perspective uses two vanishing points. Atmospheric perspective uses color and clarity changes.', tags:['perspective','depth','vanishing point'] },
    { id:'drawing-13', title:'Figure Drawing Basics', content:'Figure drawing captures the human form. Start with gesture sketches to capture movement. Use the head length as a measurement unit. The average adult is 7-8 heads tall.', tags:['figure','gesture','proportion'] },
    { id:'drawing-14', title:'Color Theory for Artists', content:'The color wheel shows relationships between colors. Primary colors are red, yellow, blue. Secondary colors are orange, green, purple. Complementary colors are opposite on the wheel and create contrast.', tags:['color theory','color wheel','primary'] },
    { id:'drawing-15', title:'Still Life Composition', content:'Still life arranges objects for drawing. Use the rule of thirds to place focal points. Create depth by overlapping objects. Vary object sizes and shapes for interest.', tags:['still life','composition','arrangement'] },
    { id:'drawing-16', title:'Portrait Drawing Proportions', content:'The eyes are halfway down the head. The nose bottom is halfway between eyes and chin. The mouth is halfway between nose and chin. The ears align with the eyes and nose.', tags:['portrait','proportions','face'] },
    { id:'drawing-17', title:'Charcoal Drawing', content:'Charcoal creates rich, dark marks. Willow charcoal is soft and blendable. Compressed charcoal is darker and harder. Use kneaded erasers to lift charcoal for highlights.', tags:['charcoal','willow','compressed'] },
    { id:'drawing-18', title:'Ink Drawing Techniques', content:'Pen and ink creates bold illustrations. Hatching and cross-hatching create tone. Stippling builds texture through dots. Brush pens create varied line widths.', tags:['ink','pen','hatching'] },
    { id:'drawing-19', title:'Pastel Art', content:'Soft pastels are chalk-like sticks. Oil pastels are creamy and blendable. Pastel pencils offer fine control. Use fixative spray to prevent smudging.', tags:['pastel','soft pastel','oil pastel'] },
    { id:'drawing-20', title:'Watercolor Painting', content:'Watercolor uses pigment suspended in water. Wet-on-wet creates soft blends. Wet-on-dry creates sharp edges. Layering washes builds depth and intensity.', tags:['watercolor','wash','layering'] },
  ]},
  { category:'arts_painting', items:[
    { id:'painting-1', title:'Acrylic Painting for Beginners', content:'Acrylic paint is water-soluble and dries quickly. It can be used thinly like watercolor or thickly like oil. Clean brushes with water before paint dries.', tags:['acrylic','beginner','water-soluble'] },
    { id:'painting-2', title:'Oil Painting Techniques', content:'Oil paint dries slowly, allowing blending. Use fat-over-lean: each layer should have more oil. Turpentine thins paint. Linseed oil increases gloss.', tags:['oil paint','fat over lean','blending'] },
    { id:'painting-3', title:'Color Mixing', content:'Mixing colors is essential for painters. Red + yellow = orange. Yellow + blue = green. Blue + red = purple. Add white to create tints. Add black to create shades.', tags:['color mixing','tint','shade'] },
    { id:'painting-4', title:'Landscape Painting', content:'Landscape painting captures outdoor scenes. Paint background first, then midground, then foreground. Use cooler colors for distant elements. Warmer colors advance.', tags:['landscape','background','atmospheric'] },
    { id:'painting-5', title:'Impressionist Style', content:'Impressionism focuses on light and color. Use visible brushstrokes. Paint scenes of everyday life. Capture the momentary effect of light. Monet and Renoir were masters.', tags:['impressionism','light','brushstroke','Monet'] },
    { id:'painting-6', title:'Abstract Painting', content:'Abstract art uses shape, color, and form. Expressionist abstraction conveys emotion. Geometric abstraction uses precise shapes. Action painting emphasizes the creative process.', tags:['abstract','expressionist','geometric'] },
  ]},
  { category:'arts_sculpture', items:[
    { id:'sculpture-11', title:'Modeling in Clay', content:'Clay modeling builds forms by adding and removing material. Start with armature for support. Use coil-building for hollow forms. Slip scoring joins clay pieces.', tags:['clay','modeling','armature'] },
    { id:'sculpture-12', title:'Stone Carving', content:'Stone carving removes material to reveal form. Soapstone is soft and beginner-friendly. Alabaster is slightly harder. Marble is challenging but beautiful. Use rasps and chisels.', tags:['stone','carving','soapstone','marble'] },
    { id:'sculpture-13', title:'Wood Carving', content:'Wood carving creates three-dimensional forms from timber. Basswood is ideal for beginners. Use gouges for concave cuts. Use chisels for flat surfaces. Always carve away from your body.', tags:['wood','carving','basswood','gouge'] },
    { id:'sculpture-14', title:'Wire Sculpture', content:'Wire sculpture bends metal into forms. Aluminum wire is soft and easy to shape. Copper wire is stronger and can be soldered. Use pliers for precise bends.', tags:['wire','sculpture','aluminum','copper'] },
  ]},
  { category:'arts_crafts', items:[
    { id:'craft-1', title:'Origami Basics', content:'Origami folds paper into decorative shapes. Start with square paper. Valley folds fold towards you. Mountain folds fold away. Follow diagrams step by step.', tags:['origami','paper folding','valley fold'] },
    { id:'craft-2', title:'Paper Mache', content:'Paper mache uses paper strips and paste. Tear paper into strips. Mix flour and water for paste. Layer strips over a mold. Let dry completely before painting.', tags:['paper mache','paste','mold'] },
    { id:'craft-3', title:'Collage Art', content:'Collage combines different materials on a surface. Use magazines, paper, fabric, and found objects. Arrange before gluing. Mod Podge seals and protects.', tags:['collage','mixed media','assemblage'] },
    { id:'craft-4', title:'Printmaking', content:'Printmaking transfers images from a matrix to paper. Linocut carves into linoleum. Screen printing pushes ink through mesh. Monoprinting creates unique prints.', tags:['printmaking','linocut','screen printing'] },
    { id:'craft-5', title:'Jewelry Making', content:'Jewelry making creates wearable art. Beading threads beads on wire or string. Wire wrapping secures stones. Metal stamping imprints designs on metal.', tags:['jewelry','beading','wire wrapping'] },
    { id:'craft-6', title:'Ceramics and Pottery', content:'Ceramics shapes clay into functional or decorative objects. Hand-building uses coils and slabs. Wheel-throwing shapes clay on a spinning wheel. Firing hardens clay in a kiln.', tags:['ceramics','pottery','wheel throwing','kiln'] },
    { id:'craft-7', title:'Fabric Arts', content:'Fabric arts include sewing, weaving, and dyeing. Embroidery decorates fabric with thread. Weaving interlaces threads on a loom. Batik uses wax resist dyeing.', tags:['fabric','embroidery','weaving','batik'] },
    { id:'craft-8', title:'Mosaic Art', content:'Mosaics arrange small pieces to create patterns. Tesserae are the small pieces of glass, stone, or tile. Grout fills the gaps. Start with a simple geometric pattern.', tags:['mosaic','tesserae','grout'] },
  ]},
  { category:'arts_art_history', items:[
    { id:'arthist-1', title:'Renaissance Art', content:'The Renaissance (1400-1600) revived classical ideals. Leonardo da Vinci painted the Mona Lisa. Michelangelo sculpted David. Raphael created beautiful Madonnas. Art emphasized realism and perspective.', tags:['renaissance','da Vinci','Michelangelo','Raphael'] },
    { id:'arthist-2', title:'Baroque Art', content:'Baroque art (1600-1750) featured drama and motion. Caravaggio used dramatic chiaroscuro. Bernini created dynamic sculptures. Rembrandt mastered light and shadow.', tags:['baroque','Caravaggio','Bernini','Rembrandt'] },
    { id:'arthist-3', title:'Impressionism Movement', content:'Impressionism (1870s-1880s) broke from tradition. Monet painted water lilies and haystacks. Degas painted dancers. Renoir captured happy scenes. They painted outdoors with bright colors.', tags:['impressionism','Monet','Degas','Renoir'] },
    { id:'arthist-4', title:'Post-Impressionism', content:'Post-Impressionism extended Impressionism. Van Gogh used bold colors and thick paint. Gauguin painted Tahitian scenes. Seurat developed pointillism with tiny dots.', tags:['post-impressionism','Van Gogh','Gauguin','Seurat'] },
    { id:'arthist-5', title:'Modern Art (1900-1950)', content:'Modern art rejected traditional realism. Picasso pioneered Cubism. Kandinsky created abstract art. Dali explored surrealism. Art became about ideas, not just representation.', tags:['modern art','Picasso','Cubism','Kandinsky'] },
    { id:'arthist-6', title:'Contemporary Art', content:'Contemporary art refers to art made today. Installation art transforms entire spaces. Performance art uses the artists body. Digital art uses technology. Street art brings art to public spaces.', tags:['contemporary','installation','performance','digital'] },
    { id:'arthist-7', title:'Chinese Art History', content:'Chinese art spans thousands of years. Calligraphy is highly respected. Ink wash painting captures landscapes. Porcelain, jade carving, and silk weaving are traditional crafts.', tags:['Chinese','calligraphy','ink wash','porcelain'] },
    { id:'arthist-8', title:'African Art Traditions', content:'African art includes masks, sculptures, and textiles. Masks are used in ceremonies and rituals. Bronze casting flourished in Benin. Kente cloth from Ghana uses colorful woven patterns.', tags:['African','mask','bronze','kente'] },
  ]},
];

// --- Music expansion (from 60 -> 140) ---
const musicAdditions = [
  { category:'music_rhymes', items:[
    { id:'rhymes-11', title:'Humpty Dumpty', content:'Humpty Dumpty sat on a wall. Humpty Dumpty had a great fall. All the kings horses and all the kings men could not put Humpty together again.', tags:['nursery','rhyme','egg'] },
    { id:'rhymes-12', title:'Jack and Jill', content:'Jack and Jill went up the hill to fetch a pail of water. Jack fell down and broke his crown, and Jill came tumbling after.', tags:['nursery','rhyme','hill'] },
    { id:'rhymes-13', title:'Baa Baa Black Sheep', content:'Baa baa black sheep, have you any wool? Yes sir, yes sir, three bags full. One for the master, one for the dame, and one for the little boy who lives down the lane.', tags:['nursery','rhyme','sheep'] },
    { id:'rhymes-14', title:'Mary Had a Little Lamb', content:'Mary had a little lamb, its fleece was white as snow. And everywhere that Mary went, the lamb was sure to go. It followed her to school one day, which was against the rules.', tags:['nursery','rhyme','lamb'] },
    { id:'rhymes-15', title:'Row Row Row Your Boat', content:'Row row row your boat, gently down the stream. Merrily merrily merrily merrily, life is but a dream.', tags:['nursery','rhyme','boat'] },
    { id:'rhymes-16', title:'Itsy Bitsy Spider', content:'The itsy bitsy spider climbed up the water spout. Down came the rain and washed the spider out. Out came the sun and dried up all the rain, and the itsy bitsy spider climbed up the spout again.', tags:['nursery','rhyme','spider'] },
    { id:'rhymes-17', title:'London Bridge', content:'London Bridge is falling down, falling down, falling down. London Bridge is falling down, my fair lady. Build it up with iron bars, iron bars, iron bars.', tags:['nursery','rhyme','bridge'] },
    { id:'rhymes-18', title:'Old MacDonald', content:'Old MacDonald had a farm, E-I-E-I-O. And on his farm he had a cow, E-I-E-I-O. With a moo moo here and a moo moo there, here a moo, there a moo, everywhere a moo moo.', tags:['nursery','rhyme','farm'] },
    { id:'rhymes-19', title:'Wheels on the Bus', content:'The wheels on the bus go round and round, round and round, round and round. The wheels on the bus go round and round, all through the town.', tags:['nursery','rhyme','bus'] },
    { id:'rhymes-20', title:'Five Little Ducks', content:'Five little ducks went out to play, over the hill and far away. Mother duck said quack quack quack, but only four little ducks came back.', tags:['nursery','rhyme','ducks','counting'] },
  ]},
  { category:'music_instruments', items:[
    { id:'instr-11', title:'The Flute', content:'The flute is a woodwind instrument. You blow across a hole to make sound. It has a bright, clear tone. The modern flute is made of metal. It is used in orchestras and bands.', tags:['flute','woodwind','orchestra'] },
    { id:'instr-12', title:'The Saxophone', content:'The saxophone is a woodwind instrument with a single reed mouthpiece. Adolphe Sax invented it in the 1840s. It is popular in jazz, classical, and marching bands.', tags:['saxophone','jazz','reed'] },
    { id:'instr-13', title:'The Trumpet', content:'The trumpet is a brass instrument. You buzz your lips into a mouthpiece. It has three valves that change pitch. Trumpets play bright, powerful sounds in orchestras and jazz.', tags:['trumpet','brass','valve'] },
    { id:'instr-14', title:'The Violin', content:'The violin is a string instrument played with a bow. It has four strings tuned in fifths. It is the smallest and highest-pitched of the string family. Violins lead the orchestra.', tags:['violin','string','bow','orchestra'] },
    { id:'instr-15', title:'The Cello', content:'The cello is a large string instrument. You play it sitting down with the cello between your knees. It has a deep, warm sound. It plays bass lines and melodies in orchestras.', tags:['cello','string','bass'] },
    { id:'instr-16', title:'The Harp', content:'The harp has strings stretched across a frame. You pluck the strings with your fingers. The pedal harp has 47 strings and 7 pedals. It creates a gentle, ethereal sound.', tags:['harp','string','plucked'] },
    { id:'instr-17', title:'The Drum Set', content:'A drum set has drums and cymbals played by one person. It includes a bass drum, snare drum, tom-toms, hi-hat, and crash cymbals. Drummers use sticks and foot pedals. It is the rhythm section of bands.', tags:['drum','percussion','rhythm'] },
    { id:'instr-18', title:'The Electric Guitar', content:'The electric guitar uses pickups to convert string vibrations into electrical signals. It needs an amplifier to produce sound. It is essential in rock, blues, and pop music.', tags:['electric guitar','amplifier','pickup','rock'] },
    { id:'instr-19', title:'The Organ', content:'The pipe organ produces sound by forcing air through pipes. It is played with hands on keyboards and feet on pedals. Church organs have thousands of pipes. It creates grand, powerful sounds.', tags:['organ','pipe','keyboard'] },
    { id:'instr-20', title:'The Accordion', content:'The accordion has a bellows and buttons or keys. You push and pull the bellows to force air through reeds. It is popular in folk music across Europe and South America.', tags:['accordion','bellows','folk'] },
  ]},
  { category:'music_theory', items:[
    { id:'theory-6', title:'Major Scales', content:'Major scales have a happy sound. The pattern is: whole-whole-half-whole-whole-whole-half. C major has no sharps or flats. G major has one sharp (F#).', tags:['scale','major','pattern'] },
    { id:'theory-7', title:'Minor Scales', content:'Minor scales sound sad or serious. Natural minor has a flat 3rd, 6th, and 7th. Harmonic minor raises the 7th. Melodic minor raises the 6th and 7th going up.', tags:['minor','scale','harmonic'] },
    { id:'theory-8', title:'Chords and Harmony', content:'A chord is three or more notes played together. Major chords sound happy. Minor chords sound sad. Seventh chords add tension. Triads are three-note chords built on the root, third, and fifth.', tags:['chord','harmony','triad'] },
    { id:'theory-9', title:'Time Signatures', content:'Time signatures tell you how many beats are in each measure. 4/4 time has four quarter-note beats. 3/4 time has three quarter-note beats. 6/8 time has six eighth-note beats in two groups of three.', tags:['time signature','beat','measure'] },
    { id:'theory-10', title:'Dynamics and Expression', content:'Dynamics describe how loud or soft music is. Pianissimo (pp) is very soft. Piano (p) is soft. Forte (f) is loud. Fortissimo (ff) is very loud. Crescendo gradually gets louder.', tags:['dynamics','piano','forte','crescendo'] },
  ]},
  { category:'music_genres', items:[
    { id:'genre-6', title:'Jazz Music', content:'Jazz began in New Orleans in the early 1900s. It features improvisation, syncopation, and swing. Louis Armstrong was a famous jazz trumpeter. Jazz has many styles: bebop, cool jazz, fusion.', tags:['jazz','improvisation','Armstrong','bebop'] },
    { id:'genre-7', title:'Rock Music', content:'Rock music emerged in the 1950s. It uses electric guitars, bass, drums, and vocals. Elvis Presley and Chuck Berry started it. The Beatles and Rolling Stones made it global.', tags:['rock','electric guitar','Elvis','Beatles'] },
    { id:'genre-8', title:'Hip Hop Music', content:'Hip hop began in the Bronx in the 1970s. It features rapping over beats. DJs create beats from turntables and drum machines. Grandmaster Flash and Run-DMC were pioneers.', tags:['hip hop','rap','DJ','beat'] },
    { id:'genre-9', title:'Electronic Music', content:'Electronic music uses synthesizers and computers. Kraftwerk pioneered it in the 1970s. Genres include techno, house, trance, and dubstep. DJs mix tracks for dance clubs.', tags:['electronic','synthesizer','techno','house'] },
    { id:'genre-10', title:'Folk Music', content:'Folk music is traditional music passed down through generations. It uses acoustic instruments like guitar and fiddle. Bob Dylan modernized folk in the 1960s. Folk songs tell stories.', tags:['folk','traditional','acoustic','Dylan'] },
    { id:'genre-11', title:'Classical Music Periods', content:'Classical music spans several periods. Baroque (1600-1750): Bach, Handel. Classical (1750-1820): Mozart, Haydn. Romantic (1820-1900): Beethoven, Chopin. Modern (1900-present): Stravinsky.', tags:['classical','baroque','romantic','period'] },
    { id:'genre-12', title:'Blues Music', content:'Blues originated from African-American spirituals and work songs. It uses a 12-bar chord progression and blue notes. BB King and Muddy Waters were blues legends. It influenced rock and jazz.', tags:['blues','12-bar','BB King','spiritual'] },
  ]},
  { category:'music_composers', items:[
    { id:'composer-1', title:'Ludwig van Beethoven', content:'Beethoven (1770-1827) was a German composer. He wrote 9 symphonies, 32 piano sonatas, and 5 piano concertos. He began losing his hearing in his 20s but continued composing. His 5th Symphony is world-famous.', tags:['Beethoven','symphony','deaf'] },
    { id:'composer-2', title:'Wolfgang Amadeus Mozart', content:'Mozart (1756-1791) was an Austrian child prodigy. He wrote over 600 works including operas, symphonies, and concertos. His operas include The Magic Flute and The Marriage of Figaro.', tags:['Mozart','prodigy','opera','Austrian'] },
    { id:'composer-3', title:'Johann Sebastian Bach', content:'Bach (1685-1750) was a German Baroque composer. He wrote for organ, choir, and orchestra. His works include Brandenburg Concertos and The Well-Tempered Clavier. He is considered a master of counterpoint.', tags:['Bach','baroque','counterpoint','organ'] },
    { id:'composer-4', title:'Pyotr Ilyich Tchaikovsky', content:'Tchaikovsky (1840-1893) was a Russian composer. He wrote Swan Lake, The Nutcracker, and 1812 Overture. His music has memorable melodies and rich orchestration. He was the first Russian composer to gain international fame.', tags:['Tchaikovsky','ballet','Nutcracker','Russian'] },
    { id:'composer-5', title:'Frédéric Chopin', content:'Chopin (1810-1849) was a Polish composer and piano virtuoso. He wrote almost exclusively for solo piano. His works include nocturnes, études, waltzes, and polonaises. His music is poetic and technically demanding.', tags:['Chopin','piano','nocturne','Polish'] },
    { id:'composer-6', title:'Duke Ellington', content:'Duke Ellington (1899-1974) was a American jazz composer and pianist. He led his orchestra for over 50 years. He wrote over 1000 compositions including Mood Indigo and It Dont Mean a Thing.', tags:['Ellington','jazz','composer','orchestra'] },
    { id:'composer-7', title:'John Williams', content:'John Williams (born 1932) is an American film composer. He wrote music for Star Wars, Jurassic Park, Harry Potter, and Indiana Jones. His themes are memorable and majestic. He has won 5 Academy Awards.', tags:['Williams','film','score','Star Wars'] },
  ]},
];

// --- Engineering expansion (currently unknown items) ---
const engineeringAdditions = [
  { category:'engineering_civil', items:[
    { id:'civil-1', title:'Bridges Types', content:'Bridges span gaps and carry loads. Beam bridges are simple and straight. Arch bridges curve for strength. Suspension bridges use cables and towers. Cable-stayed bridges have direct cable connections.', tags:['bridge','beam','arch','suspension'] },
    { id:'civil-2', title:'Building Foundations', content:'Foundations transfer building weight to the ground. Shallow foundations spread loads near the surface. Deep foundations reach stable soil layers. Pile foundations drive columns into the ground.', tags:['foundation','shallow','deep','pile'] },
    { id:'civil-3', title:'Structural Loads', content:'Structures must support various loads. Dead load is the weight of the structure itself. Live load includes people and furniture. Wind load pushes against buildings. Seismic load comes from earthquakes.', tags:['load','dead','live','seismic'] },
    { id:'civil-4', title:'Road Construction', content:'Roads are built in layers for strength. The subgrade is prepared soil. The base course provides support. The surface layer is asphalt or concrete. Drainage prevents water damage.', tags:['road','asphalt','concrete','drainage'] },
  ]},
  { category:'engineering_mechanical', items:[
    { id:'mech-1', title:'Simple Machines', content:'Simple machines make work easier. Levers pivot on a fulcrum. Pulleys lift heavy loads with ropes. Inclined planes reduce the force needed. Wedges split materials. Screws convert rotation to linear motion.', tags:['simple machine','lever','pulley','wedge'] },
    { id:'mech-2', title:'Gears and Gearboxes', content:'Gears transfer motion and change speed or torque. Spur gears are straight-toothed. Bevel gears change direction. Worm gears provide high reduction. Gearboxes enclose gear systems.', tags:['gear','spur','bevel','gearbox'] },
    { id:'mech-3', title:'Engines and Motors', content:'Engines convert fuel into motion. Internal combustion engines burn fuel inside cylinders. Electric motors use magnets and coils. Steam engines use expanding steam to push pistons.', tags:['engine','motor','combustion','electric'] },
    { id:'mech-4', title:'Robotics Mechanics', content:'Robot mechanics include joints, links, and actuators. Revolute joints rotate like elbows. Prismatic joints slide like pistons. Degrees of freedom describe movement capabilities.', tags:['robot','joint','actuator','DOF'] },
  ]},
  { category:'engineering_electrical', items:[
    { id:'elec-1', title:'Ohms Law', content:'Ohms Law relates voltage, current, and resistance. V = I × R where V is voltage, I is current, and R is resistance. Voltage pushes current. Resistance limits current flow.', tags:['ohm','voltage','current','resistance'] },
    { id:'elec-2', title:'Series and Parallel Circuits', content:'In series circuits, current flows through each component in sequence. Total resistance increases. In parallel circuits, current splits between branches. Total resistance decreases.', tags:['circuit','series','parallel','resistance'] },
    { id:'elec-3', title:'Digital Logic Gates', content:'Logic gates process binary signals. AND gate outputs 1 when both inputs are 1. OR gate outputs 1 when any input is 1. NOT gate inverts the input. NAND and NOR are universal gates.', tags:['logic gate','AND','OR','binary'] },
    { id:'elec-4', title:'Microcontrollers', content:'Microcontrollers are small computers on a chip. They have CPU, memory, and input/output pins. Arduinos and ESP32 are popular. They control sensors, motors, and displays.', tags:['microcontroller','Arduino','ESP32','GPIO'] },
    { id:'elec-5', title:'Sensors and Transducers', content:'Sensors convert physical quantities to electrical signals. Temperature sensors use thermocouples. Pressure sensors use strain gauges. Light sensors use photodiodes. Actuators do the opposite.', tags:['sensor','transducer','thermocouple','photodiode'] },
  ]},
  { category:'engineering_software', items:[
    { id:'sw-1', title:'Software Development Life Cycle', content:'SDLC has phases: planning, analysis, design, implementation, testing, deployment, maintenance. Waterfall follows phases sequentially. Agile uses iterative sprints. DevOps integrates development and operations.', tags:['SDLC','agile','DevOps','waterfall'] },
    { id:'sw-2', title:'Version Control with Git', content:'Git tracks changes to files. Repositories store project history. Commits save snapshots. Branches allow parallel development. Merging combines branches. GitHub hosts remote repositories.', tags:['git','version control','commit','branch'] },
    { id:'sw-3', title:'Testing and Quality Assurance', content:'Testing ensures software works correctly. Unit tests check individual functions. Integration tests check component interaction. End-to-end tests simulate user scenarios. Automated tests run continuously.', tags:['testing','unit test','integration','QA'] },
    { id:'sw-4', title:'Databases and SQL', content:'Databases store and organize data. SQL queries retrieve and modify data. SELECT reads data. INSERT adds data. UPDATE modifies data. DELETE removes data. Relational databases use tables with rows and columns.', tags:['database','SQL','query','table'] },
    { id:'sw-5', title:'Web Development Basics', content:'Websites use HTML for structure, CSS for styling, and JavaScript for interactivity. Frontend runs in the browser. Backend runs on the server. APIs connect frontend and backend.', tags:['HTML','CSS','JavaScript','API'] },
  ]},
  { category:'engineering_aerospace', items:[
    { id:'aero-1', title:'How Airplanes Fly', content:'Airplanes fly using four forces. Lift pushes upward from wings. Weight pulls downward. Thrust pushes forward from engines. Drag pulls backward from air resistance. Lift must exceed weight for takeoff.', tags:['airplane','lift','thrust','drag'] },
    { id:'aero-2', title:'Rocket Science Basics', content:'Rockets work by Newtons Third Law: every action has an equal and opposite reaction. Exhaust gases push down, rocket goes up. Multistage rockets drop empty fuel tanks. Escape velocity is 11.2 km/s.', tags:['rocket','Newton','thrust','escape velocity'] },
    { id:'aero-3', title:'Satellites and Orbits', content:'Satellites orbit Earth for communication and observation. Geostationary orbits stay over one spot. Low Earth orbit is 200-2000 km up. Polar orbits pass over the poles. Satellites use solar panels for power.', tags:['satellite','orbit','geostationary','LEO'] },
  ]},
];

// --- Chemistry expansion (from unknown items) ---
const chemistryAdditions = [
  { category:'chemistry_basics', items:[
    { id:'chem-13', title:'Chemical Formulas', content:'Chemical formulas show elements in a compound. H,O is water with 2 hydrogen and 1 oxygen. CO, is carbon dioxide. NaCl is table salt. Subscripts indicate atom counts.', tags:['formula','compound','subscript'] },
    { id:'chem-14', title:'Moles and Molar Mass', content:'A mole is 6.022 × 10^23 particles. Molar mass is the mass of one mole. Carbon-12 has molar mass 12 g/mol. Moles = mass ÷ molar mass. This is Avogadros number.', tags:['mole','Avogadro','molar mass'] },
    { id:'chem-15', title:'Valence Electrons and Bonding', content:'Valence electrons are the outermost electrons. Atoms bond to fill their outer shell. Covalent bonds share electrons. Ionic bonds transfer electrons. Metallic bonds share electrons in a sea.', tags:['valence','covalent','ionic','metallic'] },
    { id:'chem-16', title:'Oxidation and Reduction', content:'Oxidation is loss of electrons. Reduction is gain of electrons. OIL RIG: Oxidation Is Loss, Reduction Is Gain. Redox reactions transfer electrons. Rust is iron oxidation.', tags:['oxidation','reduction','redox','electron'] },
    { id:'chem-17', title:'Catalysts and Enzymes', content:'Catalysts speed up reactions without being consumed. Enzymes are biological catalysts. They lower activation energy. Catalytic converters clean car exhaust.', tags:['catalyst','enzyme','activation energy'] },
    { id:'chem-18', title:'pH and Indicators', content:'pH measures acidity. pH 7 is neutral. Below 7 is acidic. Above 7 is basic. Litmus turns red in acid, blue in base. Universal indicator shows the exact pH.', tags:['pH','acid','base','indicator'] },
    { id:'chem-19', title:'Concentration and Molarity', content:'Concentration measures how much solute is in solution. Molarity (M) = moles of solute / liters of solution. Dilution reduces concentration. Concentrated solutions have high molarity.', tags:['concentration','molarity','dilution','solute'] },
  ]},
  { category:'chemistry_reactions', items:[
    { id:'rxn-6', title:'Combustion Reactions', content:'Combustion burns fuel with oxygen. Complete combustion produces CO, and H,O. Incomplete combustion produces CO and soot. Fire needs fuel, oxygen, and heat. Methane combustion: CH4 + 2O, → CO, + 2H,O.', tags:['combustion','fire','oxygen','fuel'] },
    { id:'rxn-7', title:'Acid-Base Reactions', content:'Acids donate protons. Bases accept protons. Neutralization makes salt and water. HCl + NaOH → NaCl + H,O. Strong acids fully dissociate. Weak acids partially dissociate.', tags:['acid','base','neutralization','proton'] },
    { id:'rxn-8', title:'Precipitation Reactions', content:'Precipitation forms solid from two solutions. The solid is called precipitate. Solubility rules predict precipitation. AgNO, + NaCl → AgCl↓ + NaNO,. Silver chloride is a white precipitate.', tags:['precipitation','precipitate','solubility'] },
    { id:'rxn-9', title:'Electrolysis', content:'Electrolysis uses electricity to split compounds. Water electrolysis: 2H,O → 2H, + O,. Electrodes conduct current. Cathode is negative. Anode is positive. Used to extract metals.', tags:['electrolysis','electrode','cathode','anode'] },
    { id:'rxn-10', title:'Polymerization', content:'Polymers are long molecules made of repeating units. Monomers are the building blocks. Addition polymers like polyethylene form from alkenes. Condensation polymers release small molecules.', tags:['polymer','monomer','polyethylene','plastic'] },
  ]},
  { category:'chemistry_inorganic', items:[
    { id:'inorg-1', title:'Alkali Metals', content:'Alkali metals are Group 1 elements: Li, Na, K, Rb, Cs, Fr. They have one valence electron. They are very reactive. They react vigorously with water. Sodium fizzes and floats on water.', tags:['alkali','metal','sodium','reactive'] },
    { id:'inorg-2', title:'Halogens', content:'Halogens are Group 17 elements: F, Cl, Br, I, At. They have 7 valence electrons. Fluorine is the most reactive. Chlorine is used for disinfection. Bromine is liquid at room temperature.', tags:['halogen','fluorine','chlorine','disinfection'] },
    { id:'inorg-3', title:'Transition Metals', content:'Transition metals are Groups 3-12. Examples: Fe, Cu, Zn, Au. They form colored compounds. Iron makes hemoglobin red. Copper makes solutions blue. They are good conductors.', tags:['transition metal','iron','copper','gold'] },
    { id:'inorg-4', title:'Noble Gases', content:'Noble gases are Group 18: He, Ne, Ar, Kr, Xe, Rn. They have full outer shells. They are very unreactive. Helium fills balloons. Neon makes signs glow. Argon protects welding.', tags:['noble gas','helium','neon','unreactive'] },
  ]},
  { category:'chemistry_organic', items:[
    { id:'org-1', title:'Alkanes', content:'Alkanes are saturated hydrocarbons with single bonds. General formula: C_nH_2n+2. Methane (CH4) is the simplest. Ethane (C2H6), propane (C3H8), butane (C4H10) follow. They burn as fuels.', tags:['alkane','hydrocarbon','methane','saturated'] },
    { id:'org-2', title:'Alkenes', content:'Alkenes have carbon-carbon double bonds. General formula: C_nH2n. Ethene (C2H4) is the simplest. They are unsaturated. They undergo addition reactions. Used to make plastics.', tags:['alkene','double bond','ethene','unsaturated'] },
    { id:'org-3', title:'Alcohols', content:'Alcohols contain an OH group. Methanol (CH3OH), ethanol (C2H5OH), propanol follow. Ethanol is in alcoholic drinks. Methanol is toxic. Alcohols can be oxidized to acids.', tags:['alcohol','ethanol','methanol','OH'] },
    { id:'org-4', title:'Carboxylic Acids', content:'Carboxylic acids contain COOH group. Methanoic acid (HCOOH), ethanoic acid (CH3COOH). Vinegar is 5% ethanoic acid. They are weak acids. They react with alcohols to make esters.', tags:['carboxylic acid','vinegar','ester','COOH'] },
  ]},
  { category:'chemistry_industrial', items:[
    { id:'ind-1', title:'Haber Process', content:'The Haber process makes ammonia from nitrogen and hydrogen. N, + 3H, → 2NH,. High pressure (200 atm) and iron catalyst. Temperature around 450°C. Ammonia is used for fertilizer.', tags:['Haber','ammonia','fertilizer','catalyst'] },
    { id:'ind-2', title:'Contact Process', content:'The Contact process makes sulfuric acid. Sulfur burns to SO,. SO, oxidizes to SO,. SO, dissolves in H,SO,. Sulfuric acid is used in batteries and industry.', tags:['sulfuric acid','Contact','SO3','catalyst'] },
    { id:'ind-3', title:'Fractional Distillation', content:'Fractional distillation separates crude oil by boiling point. Hot at bottom, cool at top. Gases come off first, then petrol, kerosene, diesel, fuel oil, bitumen. Each fraction has different uses.', tags:['distillation','crude oil','petrol','fraction'] },
    { id:'ind-4', title:'Electroplating', content:'Electroplating coats objects with thin metal layers. Silver plating uses silver nitrate. Chrome plating protects steel. The object is the cathode. The coating metal is the anode.', tags:['electroplating','coating','cathode','anode'] },
  ]},
];

// --- Helper: generate content entry ---
function makeEntry(cat, item, level, type, language, content_zh='') {
  return {
    id: item.id,
    category: cat,
    title: item.title,
    content: item.content,
    content_zh,
    level: level || 'primary3',
    language: language || 'en',
    type: type || 'lesson',
    tags: item.tags || []
  };
}

// --- Merge into existing files ---
function mergeIntoFile(filename, newItems, category, defaultLevel, defaultType) {
  const filepath = path.join(CONTENT_DIR, filename);
  let existing = [];
  try { existing = JSON.parse(fs.readFileSync(filepath, 'utf8')); } catch(e) { existing = []; }

  const existingIds = new Set(existing.map(e => e.id));

  let added = 0;
  newItems.forEach(item => {
    const entry = makeEntry(category, item, defaultLevel, defaultType);
    if (!existingIds.has(entry.id)) {
      existing.push(entry);
      existingIds.add(entry.id);
      added++;
    }
  });

  fs.writeFileSync(filepath, JSON.stringify(existing, null, 2), 'utf8');
  console.log(`${filename}: +${added} items (now ${existing.length} total)`);
}

// --- Process arts ---
console.log('=== Expanding Arts ===');
artsAdditions.forEach(group => {
  mergeIntoFile('content-arts.json', group.items, group.category, 'primary3', 'lesson');
});

// --- Process music ---
console.log('\n=== Expanding Music ===');
musicAdditions.forEach(group => {
  mergeIntoFile('content-music.json', group.items, group.category, 'primary1', 'lesson');
});

// --- Process engineering ---
console.log('\n=== Expanding Engineering ===');
engineeringAdditions.forEach(group => {
  mergeIntoFile('content-engineering.json', group.items, group.category, 'primary3', 'lesson');
});

// --- Process chemistry ---
console.log('\n=== Expanding Chemistry ===');
chemistryAdditions.forEach(group => {
  mergeIntoFile('content-chemistry.json', group.items, group.category, 'primary3', 'lesson');
});

console.log('\nContent expansion complete!');
