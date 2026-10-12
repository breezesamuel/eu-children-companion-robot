// Generator: builds k-large + grades 1-9 curriculum data
const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'full-curriculum.js');

function t(zh, en, fr, de) { return { zh, en, fr, de }; }
function L(id, title, objectives, content, classwork, homework) {
  return { id, title, objectives, content, classwork, homework };
}

// ===================== ALL GRADE DEFS (including k-large) =====================
const gradeDefs = [
  { key:"k-large", name:t("幼儿园大班","Reception/Pre-K","Grande section","Vorschule"), age:"5-6",
    subjects:["math","language","science"] },
  { key:"grade-1", name:t("一年级","Grade 1","CP","1. Klasse"), age:"6-7",
    subjects:["math","english","science","music"] },
  { key:"grade-2", name:t("二年级","Grade 2","CE1","2. Klasse"), age:"7-8",
    subjects:["math","english","science","history"] },
  { key:"grade-3", name:t("三年级","Grade 3","CE2","3. Klasse"), age:"8-9",
    subjects:["math","english","science","history","geography"] },
  { key:"grade-4", name:t("四年级","Grade 4","CM1","4. Klasse"), age:"9-10",
    subjects:["math","english","science","history","geography"] },
  { key:"grade-5", name:t("五年级","Grade 5","CM2","5. Klasse"), age:"10-11",
    subjects:["math","english","science","history","geography"] },
  { key:"grade-6", name:t("六年级","Grade 6","6\u00e8me","6. Klasse"), age:"11-12",
    subjects:["math","english","science","history","geography","foreign-language"] },
  { key:"grade-7", name:t("七年级","Grade 7","5\u00e8me","7. Klasse"), age:"12-13",
    subjects:["math","english","science","history","geography","foreign-language"] },
  { key:"grade-8", name:t("八年级","Grade 8","4\u00e8me","8. Klasse"), age:"13-14",
    subjects:["math","english","science","history","geography","foreign-language"] },
  { key:"grade-9", name:t("九年级","Grade 9","3\u00e8me","9. Klasse"), age:"14-15",
    subjects:["math","english","science","history","geography","foreign-language"] }
];

const subjectNames = {
  math: t("数学","Mathematics","Math\u00e9matiques","Mathematik"),
  english: t("英语","English","Anglais","Englisch"),
  language: t("语言","Language","Langage","Sprache"),
  science: t("科学","Science","Sciences","Naturwissenschaft"),
  history: t("历史","History","Histoire","Geschichte"),
  geography: t("地理","Geography","G\u00e9ographie","Geografie"),
  music: t("音乐","Music","Musique","Musik"),
  "foreign-language": t("外语","Foreign Language","Langue \u00e9trang\u00e8re","Fremdsprache")
};

// Lesson topics: [title_zh, title_en, title_fr, title_de]
const topics = JSON.parse(fs.readFileSync(path.join(__dirname, 'lesson-topics.json'), 'utf8'));

// Generate content text based on grade/subject/topic
function genContent(gradeKey, sem, subj, idx, topic) {
  const id = `${gradeKey}-${sem}-${subj}-${String(idx+1).padStart(2,"0")}`;

  // Generate objectives
  const objMap = {
    math: t(
      `1.理解${topic[0]}的基本概念\n2.掌握${topic[0]}的计算方法\n3.能运用${topic[0]}解决实际问题`,
      `1.Understand the basic concepts of ${topic[1]}\n2.Master the calculation methods of ${topic[1]}\n3.Apply ${topic[1]} to solve practical problems`,
      `1.Comprendre les concepts de base de ${topic[2]}\n2.Ma\u00eetriser les m\u00e9thodes de calcul de ${topic[2]}\n3.Appliquer ${topic[2]} pour r\u00e9soudre des probl\u00e8mes pratiques`,
      `1.Die Grundkonzepte von ${topic[3]} verstehen\n2.Die Berechnungsmethoden von ${topic[3]} beherrschen\n3.${topic[3]} zur L\u00f6sung praktischer Probleme anwenden`
    ),
    english: t(
      `1.掌握${topic[0]}相关的词汇和表达\n2.能理解并运用${topic[0]}的核心内容\n3.提高英语综合运用能力`,
      `1.Master vocabulary and expressions related to ${topic[1]}\n2.Understand and apply the core content of ${topic[1]}\n3.Improve comprehensive English skills`,
      `1.Ma\u00eetriser le vocabulaire et les expressions li\u00e9s \u00e0 ${topic[2]}\n2.Comprendre et appliquer le contenu essentiel de ${topic[2]}\n3.Am\u00e9liorer les comp\u00e9tences globales en anglais`,
      `1.Wortschatz und Ausdr\u00fccke zu ${topic[3]} beherrschen\n2.Den Kerninhalt von ${topic[3]} verstehen und anwenden\n3.Die umfassenden Englischkenntnisse verbessern`
    ),
    language: t(
      `1.掌握${topic[0]}相关的词汇和表达\n2.能理解并运用${topic[0]}的核心内容\n3.提高语言综合运用能力`,
      `1.Master vocabulary and expressions related to ${topic[1]}\n2.Understand and apply the core content of ${topic[1]}\n3.Improve comprehensive language skills`,
      `1.Ma\u00eetriser le vocabulaire et les expressions li\u00e9s \u00e0 ${topic[2]}\n2.Comprendre et appliquer le contenu essentiel de ${topic[2]}\n3.Am\u00e9liorer les comp\u00e9tences globales en langage`,
      `1.Wortschatz und Ausdr\u00fccke zu ${topic[3]} beherrschen\n2.Den Kerninhalt von ${topic[3]} verstehen und anwenden\n3.Die umfassenden Sprachkenntnisse verbessern`
    ),
    science: t(
      `1.了解${topic[0]}的基本原理\n2.能观察和解释${topic[0]}相关的现象\n3.培养科学探究精神`,
      `1.Understand the basic principles of ${topic[1]}\n2.Observe and explain phenomena related to ${topic[1]}\n3.Develop a spirit of scientific inquiry`,
      `1.Comprendre les principes de base de ${topic[2]}\n2.Observer et expliquer les ph\u00e9nom\u00e8nes li\u00e9s \u00e0 ${topic[2]}\n3.D\u00e9velopper l'esprit de recherche scientifique`,
      `1.Die Grundprinzipien von ${topic[3]} verstehen\n2.Ph\u00e4nomene im Zusammenhang mit ${topic[3]} beobachten und erkl\u00e4ren\n3.Den Geist der wissenschaftlichen Untersuchung entwickeln`
    ),
    history: t(
      `1.了解${topic[0]}的历史背景和重要事件\n2.分析${topic[0]}对世界的影响\n3.培养历史思维能力`,
      `1.Understand the historical background and key events of ${topic[1]}\n2.Analyze the impact of ${topic[1]} on the world\n3.Develop historical thinking skills`,
      `1.Comprendre le contexte historique et les \u00e9v\u00e9nements cl\u00e9s de ${topic[2]}\n2.Analyser l'impact de ${topic[2]} sur le monde\n3.D\u00e9velopper les comp\u00e9tences de pens\u00e9e historique`,
      `1.Den historischen Hintergrund und die Schl\u00fcsselereignisse von ${topic[3]} verstehen\n2.Die Auswirkungen von ${topic[3]} auf die Welt analysieren\n3.Historisches Denken entwickeln`
    ),
    geography: t(
      `1.了解${topic[0]}的地理特征和分布\n2.分析${topic[0]}与人类活动的关系\n3.培养地理空间思维`,
      `1.Understand the geographical features and distribution of ${topic[1]}\n2.Analyze the relationship between ${topic[1]} and human activities\n3.Develop spatial thinking`,
      `1.Comprendre les caract\u00e9ristiques g\u00e9ographiques et la distribution de ${topic[2]}\n2.Analyser la relation entre ${topic[2]} et les activit\u00e9s humaines\n3.D\u00e9velopper la pens\u00e9e spatiale`,
      `1.Die geografischen Merkmale und Verteilung von ${topic[3]} verstehen\n2.Die Beziehung zwischen ${topic[3]} und menschlichen Aktivit\u00e4ten analysieren\n3.R\u00e4umliches Denken entwickeln`
    ),
    music: t(
      `1.了解${topic[0]}的基本知识\n2.能欣赏和表现${topic[0]}的特点\n3.培养音乐审美能力`,
      `1.Understand the basics of ${topic[1]}\n2.Appreciate and express the characteristics of ${topic[1]}\n3.Develop musical aesthetic ability`,
      `1.Comprendre les bases de ${topic[2]}\n2.Appr\u00e9cier et exprimer les caract\u00e9ristiques de ${topic[2]}\n3.D\u00e9velopper l'esth\u00e9tique musicale`,
      `1.Die Grundlagen von ${topic[3]} verstehen\n2.Die Merkmale von ${topic[3]} w\u00fcrdigen und ausdr\u00fccken\n3.Die musikalische \u00c4sthetik entwickeln`
    ),
    "foreign-language": t(
      `1.掌握${topic[0]}相关的语言知识\n2.能在实际情境中运用${topic[0]}\n3.增强跨文化交际能力`,
      `1.Master the language knowledge related to ${topic[1]}\n2.Apply ${topic[1]} in real situations\n3.Enhance cross-cultural communication skills`,
      `1.Ma\u00eetriser les connaissances linguistiques li\u00e9es \u00e0 ${topic[2]}\n2.Appliquer ${topic[2]} dans des situations r\u00e9elles\n3.Renforcer les comp\u00e9tences de communication interculturelle`,
      `1.Die Sprachkenntnisse zu ${topic[3]} beherrschen\n2.${topic[3]} in realen Situationen anwenden\n3.Die interkulturelle Kommunikationsf\u00e4higkeit st\u00e4rken`
    )
  };

  // Generate content
  const contMap = {
    math: t(
      `本课学习${topic[0]}。\n\n${topic[0]}是数学中的重要内容。通过本课的学习，我们将掌握其基本概念、计算规则和应用方法。\n\n首先，我们来看基本概念。${topic[0]}的核心思想在于理解其运算规则和内在逻辑。通过具体的例子，我们可以更直观地理解这些概念。\n\n其次，我们学习计算方法。掌握正确的计算步骤是解决问题的关键。我们需要注意运算的顺序、符号的处理以及特殊情况的处理。\n\n然后，我们来看实际应用。${topic[0]}在日常生活中有广泛的应用，比如购物计算、时间安排、距离测量等。通过实际问题的解决，我们可以加深对知识的理解。\n\n最后，我们要注意易错点。在学习${topic[0]}时，常见的错误包括：计算顺序错误、符号混淆、特殊情况遗漏等。通过反复练习，我们可以避免这些错误。`,
      `This lesson covers ${topic[1]}.\n\n${topic[1]} is an important topic in mathematics. Through this lesson, we will master its basic concepts, calculation rules, and application methods.\n\nFirst, let's look at the basic concepts. The core idea of ${topic[1]} lies in understanding its operational rules and internal logic. Through specific examples, we can understand these concepts more intuitively.\n\nSecond, we learn calculation methods. Mastering the correct calculation steps is the key to solving problems. We need to pay attention to the order of operations, handling of symbols, and treatment of special cases.\n\nThen, let's look at practical applications. ${topic[1]} has wide applications in daily life, such as shopping calculations, time scheduling, and distance measurement.\n\nFinally, we should note common mistakes. When learning ${topic[1]}, common errors include: wrong calculation order, symbol confusion, and missing special cases.`,
      `Cette le\u00e7on couvre ${topic[2]}.\n\n${topic[2]} est un sujet important en math\u00e9matiques. \u00c0 travers cette le\u00e7on, nous ma\u00eetriserons ses concepts de base, ses r\u00e8gles de calcul et ses m\u00e9thodes d'application.\n\nTout d'abord, examinons les concepts de base. L'id\u00e9e centrale de ${topic[2]} r\u00e9side dans la compr\u00e9hension de ses r\u00e8gles op\u00e9rationnelles et de sa logique interne.\n\nEnsuite, nous apprenons les m\u00e9thodes de calcul. Ma\u00eetriser les \u00e9tapes de calcul correctes est la cl\u00e9 pour r\u00e9soudre les probl\u00e8mes.\n\nPuis, regardons les applications pratiques. ${topic[2]} a de larges applications dans la vie quotidienne.\n\nEnfin, nous devons noter les erreurs courantes. Lors de l'apprentissage de ${topic[2]}, les erreurs fr\u00e9quentes incluent : l'ordre de calcul incorrect, la confusion des symboles et les cas sp\u00e9ciaux oubli\u00e9s.`,
      `Diese Lektion behandelt ${topic[3]}.\n\n${topic[3]} ist ein wichtiges Thema in der Mathematik. Durch diese Lektion werden wir die Grundkonzepte, Berechnungsregeln und Anwendungsmethoden beherrschen.\n\nZuerst schauen wir uns die Grundkonzepte an. Die Kernidee von ${topic[3]} liegt im Verst\u00e4ndnis der Rechenregeln und der inneren Logik.\n\nDann lernen wir die Berechnungsmethoden. Die Beherrschung der richtigen Berechnungsschritte ist der Schl\u00fcssel zur Probleml\u00f6sung.\n\nSchauen wir uns die praktischen Anwendungen an. ${topic[3]} hat breite Anwendungen im Alltag.\n\nSchlie\u00dflich sollten wir auf h\u00e4ufige Fehler achten. Beim Lernen von ${topic[3]} geh\u00f6ren dazu: falsche Reihenfolge, Symbolverwechslung und vergessene Sonderf\u00e4lle.`
    ),
    english: t(
      `本课学习${topic[0]}。\n\n${topic[0]}是英语学习中的重要主题。通过本课，我们将学习相关的词汇、语法结构和表达方式。\n\n核心词汇：我们将学习与${topic[0]}相关的关键词汇，包括名词、动词、形容词等。这些词汇是理解和表达的基础。\n\n语法要点：本课涉及的语法结构将帮助我们更准确地表达思想。我们需要掌握句型结构、时态用法和语态变化。\n\n阅读理解：通过阅读与${topic[0]}相关的文章，我们可以提高阅读理解能力，学习如何在上下文中理解词汇和句子的含义。\n\n写作练习：我们将练习写与${topic[0]}相关的短文，学习如何组织段落、使用连接词和表达观点。\n\n口语表达：通过讨论和角色扮演，我们将练习用英语表达关于${topic[0]}的观点和想法。`,
      `This lesson covers ${topic[1]}.\n\n${topic[1]} is an important theme in English learning. Through this lesson, we will learn related vocabulary, grammatical structures, and expressions.\n\nCore Vocabulary: We will learn key vocabulary related to ${topic[1]}, including nouns, verbs, and adjectives. These words are the foundation for understanding and expression.\n\nGrammar Points: The grammatical structures in this lesson will help us express our thoughts more accurately. We need to master sentence patterns, tense usage, and voice changes.\n\nReading Comprehension: By reading articles related to ${topic[1]}, we can improve our reading comprehension skills and learn to understand vocabulary and sentences in context.\n\nWriting Practice: We will practice writing short essays related to ${topic[1]}, learning how to organize paragraphs, use connectors, and express opinions.\n\nOral Expression: Through discussions and role-plays, we will practice expressing opinions about ${topic[1]} in English.`,
      `Cette le\u00e7on couvre ${topic[2]}.\n\n${topic[2]} est un th\u00e8me important dans l'apprentissage de l'anglais. \u00c0 travers cette le\u00e7on, nous apprendrons le vocabulaire, les structures grammaticales et les expressions associ\u00e9es.\n\nVocabulaire essentiel : Nous apprendrons les mots cl\u00e9s li\u00e9s \u00e0 ${topic[2]}, y compris les noms, les verbes et les adjectifs.\n\nPoints de grammaire : Les structures grammaticales de cette le\u00e7on nous aideront \u00e0 exprimer nos pens\u00e9es plus pr\u00e9cis\u00e9ment.\n\nCompr\u00e9hension \u00e9crite : En lisant des articles li\u00e9s \u00e0 ${topic[2]}, nous am\u00e9liorerons nos comp\u00e9tences de compr\u00e9hension.\n\nPratique d'\u00e9criture : Nous pratiquerons la r\u00e9daction de courts essais li\u00e9s \u00e0 ${topic[2]}.\n\nExpression orale : \u00c0 travers des discussions et des jeux de r\u00f4le, nous pratiquerons l'expression d'opinions sur ${topic[2]} en anglais.`,
      `Diese Lektion behandelt ${topic[3]}.\n\n${topic[3]} ist ein wichtiges Thema im Englischlernen. Durch diese Lektion lernen wir den entsprechenden Wortschatz, Grammatikstrukturen und Ausdr\u00fccke.\n\nKernwortschatz: Wir lernen Schl\u00fcsselvokabeln zu ${topic[3]}, einschlie\u00dflich Nomen, Verben und Adjektive.\n\nGrammatikpunkte: Die Grammatikstrukturen dieser Lektion helfen uns, unsere Gedanken genauer auszudr\u00fccken.\n\nLeseverst\u00e4ndnis: Durch das Lesen von Artikeln zu ${topic[3]} verbessern wir unsere Lesef\u00e4higkeiten.\n\nSchreib\u00fcbung: Wir \u00fcben das Schreiben kurzer Aufs\u00e4tze zu ${topic[3]}.\n\nM\u00fcndlicher Ausdruck: Durch Diskussionen und Rollenspiele \u00fcben wir, Meinungen zu ${topic[3]} auf Englisch auszudr\u00fccken.`
    ),
    language: t(
      `本课学习${topic[0]}。\n\n${topic[0]}是语言学习中的重要主题。通过本课，我们将学习相关的词汇、表达方式和语言技能。\n\n核心内容：我们将学习与${topic[0]}相关的关键词汇和表达。这些内容是语言理解和表达的基础。\n\n语言技能：本课将通过听、说、读、写等多种方式来提高语言综合运用能力。我们需要认真练习每一个环节。\n\n阅读理解：通过阅读与${topic[0]}相关的材料，我们可以提高理解能力，学习如何在上下文中理解词汇和句子的含义。\n\n表达练习：我们将练习用语言表达关于${topic[0]}的想法和感受，学习如何组织语言、表达观点。\n\n实践活动：通过游戏、讨论和表演，我们将在有趣的活动中巩固所学内容。`,
      `This lesson covers ${topic[1]}.\n\n${topic[1]} is an important theme in language learning. Through this lesson, we will learn related vocabulary, expressions, and language skills.\n\nCore Content: We will learn key vocabulary and expressions related to ${topic[1]}. These are the foundation for language understanding and expression.\n\nLanguage Skills: This lesson will improve comprehensive language skills through listening, speaking, reading, and writing activities.\n\nReading Comprehension: By reading materials related to ${topic[1]}, we can improve our understanding and learn to comprehend vocabulary and sentences in context.\n\nExpression Practice: We will practice expressing thoughts and feelings about ${topic[1]}, learning how to organize language and express opinions.\n\nPractical Activities: Through games, discussions, and performances, we will consolidate what we have learned in fun activities.`,
      `Cette le\u00e7on couvre ${topic[2]}.\n\n${topic[2]} est un th\u00e8me important dans l'apprentissage des langues. \u00c0 travers cette le\u00e7on, nous apprendrons le vocabulaire, les expressions et les comp\u00e9tences linguistiques associ\u00e9es.\n\nContenu essentiel : Nous apprendrons les mots cl\u00e9s et les expressions li\u00e9s \u00e0 ${topic[2]}. Ce sont les fondements de la compr\u00e9hension et de l'expression linguistiques.\n\nComp\u00e9tences linguistiques : Cette le\u00e7on am\u00e9liorera les comp\u00e9tences globales en langage par des activit\u00e9s d'\u00e9coute, d'expression, de lecture et d'\u00e9criture.\n\nCompr\u00e9hension : En lisant des documents li\u00e9s \u00e0 ${topic[2]}, nous am\u00e9liorerons notre compr\u00e9hension.\n\nPratique d'expression : Nous pratiquerons l'expression de pens\u00e9es et de sentiments sur ${topic[2]}.\n\nActivit\u00e9s pratiques : \u00c0 travers des jeux, des discussions et des repr\u00e9sentations, nous consoliderons ce que nous avons appris.`,
      `Diese Lektion behandelt ${topic[3]}.\n\n${topic[3]} ist ein wichtiges Thema im Sprachenlernen. Durch diese Lektion lernen wir den entsprechenden Wortschatz, Ausdr\u00fccke und Sprachfertigkeiten.\n\nKerninhalt: Wir lernen Schl\u00fcsselvokabeln und Ausdr\u00fccke zu ${topic[3]}. Diese sind die Grundlage f\u00fcr Sprachverst\u00e4ndnis und Ausdruck.\n\nSprachfertigkeiten: Diese Lektion verbessert die umfassenden Sprachf\u00e4higkeiten durch H\u00f6ren, Sprechen, Lesen und Schreiben.\n\nLeseverst\u00e4ndnis: Durch das Lesen von Materialien zu ${topic[3]} verbessern wir unser Verst\u00e4ndnis.\n\nAusdrucks\u00fcbung: Wir \u00fcben, Gedanken und Gef\u00fchle \u00fcber ${topic[3]} auszudr\u00fccken.\n\nPraktische Aktivit\u00e4ten: Durch Spiele, Diskussionen und Auff\u00fchrungen festigen wir das Gelernte.`
    ),
    science: t(
      `本课学习${topic[0]}。\n\n${topic[0]}是科学领域的重要内容。通过本课的学习，我们将了解其基本原理、观察相关现象并进行实验探究。\n\n基本原理：${topic[0]}的核心原理是理解这一领域的基础。我们将通过简单易懂的方式介绍这些原理，帮助大家建立科学概念。\n\n现象观察：在日常生活中，我们可以观察到许多与${topic[0]}相关的现象。通过仔细观察和记录，我们可以发现其中的规律。\n\n实验探究：动手实验是学习科学的重要方法。我们将设计简单的实验来验证${topic[0]}的相关原理，培养实验操作能力和科学思维。\n\n生活应用：${topic[0]}在日常生活中有广泛的应用。了解这些应用可以帮助我们更好地理解科学知识的重要性。\n\n科学精神：学习${topic[0]}不仅是掌握知识，更重要的是培养好奇心、质疑精神和探究意识。`,
      `This lesson covers ${topic[1]}.\n\n${topic[1]} is an important topic in science. Through this lesson, we will understand its basic principles, observe related phenomena, and conduct experimental investigations.\n\nBasic Principles: The core principles of ${topic[1]} are the foundation for understanding this field. We will introduce these principles in a simple and understandable way.\n\nPhenomenon Observation: In daily life, we can observe many phenomena related to ${topic[1]}. Through careful observation and recording, we can discover patterns.\n\nExperimental Investigation: Hands-on experiments are an important method for learning science. We will design simple experiments to verify the principles of ${topic[1]}.\n\nLife Applications: ${topic[1]} has wide applications in daily life. Understanding these applications helps us appreciate the importance of scientific knowledge.\n\nScientific Spirit: Learning ${topic[1]} is not just about acquiring knowledge, but more importantly about developing curiosity, critical thinking, and inquiry.`,
      `Cette le\u00e7on couvre ${topic[2]}.\n\n${topic[2]} est un sujet important en sciences. \u00c0 travers cette le\u00e7on, nous comprendrons ses principes de base, observerons les ph\u00e9nom\u00e8nes associ\u00e9s et m\u00e8nerons des enqu\u00eates exp\u00e9rimentales.\n\nPrincipes de base : Les principes fondamentaux de ${topic[2]} sont la base de la compr\u00e9hension de ce domaine.\n\nObservation des ph\u00e9nom\u00e8nes : Dans la vie quotidienne, nous pouvons observer de nombreux ph\u00e9nom\u00e8nes li\u00e9s \u00e0 ${topic[2]}.\n\nEnqu\u00eate exp\u00e9rimentale : Les exp\u00e9riences pratiques sont une m\u00e9thode importante pour apprendre les sciences.\n\nApplications dans la vie : ${topic[2]} a de larges applications dans la vie quotidienne.\n\nEsprit scientifique : Apprendre ${topic[2]} ne consiste pas seulement \u00e0 acqu\u00e9rir des connaissances, mais surtout \u00e0 d\u00e9velopper la curiosit\u00e9 et l'esprit d'enqu\u00eate.`,
      `Diese Lektion behandelt ${topic[3]}.\n\n${topic[3]} ist ein wichtiges Thema in den Naturwissenschaften. Durch diese Lektion verstehen wir die Grundprinzipien, beobachten verwandte Ph\u00e4nomene und f\u00fchren experimentelle Untersuchungen durch.\n\nGrundprinzipien: Die Kernprinzipien von ${topic[3]} sind die Grundlage f\u00fcr das Verst\u00e4ndnis dieses Bereichs.\n\nPh\u00e4nomenbeobachtung: Im Alltag k\u00f6nnen wir viele Ph\u00e4nomene beobachten, die mit ${topic[3]} zusammenh\u00e4ngen.\n\nExperimentelle Untersuchung: Praktische Experimente sind eine wichtige Methode zum Lernen von Naturwissenschaften.\n\nLebensanwendungen: ${topic[3]} hat breite Anwendungen im Alltag.\n\nWissenschaftlicher Geist: ${topic[3]} zu lernen bedeutet nicht nur Wissen zu erwerben, sondern vor allem Neugier und Forschungsgeist zu entwickeln.`
    ),
    history: t(
      `本课学习${topic[0]}。\n\n${topic[0]}是人类历史发展中的重要篇章。通过本课的学习，我们将了解其历史背景、重要事件和深远影响。\n\n历史背景：${topic[0]}发生在特定的历史条件下。了解当时的社会、经济和文化背景，有助于我们理解这一历史时期的特点。\n\n重要事件：${topic[0]}中有许多关键事件值得深入了解。这些事件改变了历史的走向，影响了无数人的命运。\n\n重要人物：在${topic[0]}中，一些杰出人物发挥了重要作用。他们的思想、决策和行动对历史产生了深远影响。\n\n历史影响：${topic[0]}对后世产生了深远的影响。这些影响不仅体现在政治和经济方面，还体现在文化和社会方面。\n\n历史启示：通过学习${topic[0]}，我们可以从中汲取智慧，思考历史对现实的启示。`,
      `This lesson covers ${topic[1]}.\n\n${topic[1]} is an important chapter in human history. Through this lesson, we will understand its historical background, key events, and far-reaching impacts.\n\nHistorical Background: ${topic[1]} occurred under specific historical conditions. Understanding the social, economic, and cultural context helps us understand the characteristics of this historical period.\n\nKey Events: There are many important events in ${topic[1]} worth studying in depth. These events changed the course of history and affected countless lives.\n\nImportant Figures: In ${topic[1]}, some outstanding individuals played important roles. Their thoughts, decisions, and actions had profound impacts on history.\n\nHistorical Impact: ${topic[1]} had far-reaching effects on later generations. These impacts are reflected not only in politics and economics, but also in culture and society.\n\nHistorical Lessons: By studying ${topic[1]}, we can draw wisdom and reflect on the lessons history offers for the present.`,
      `Cette le\u00e7on couvre ${topic[2]}.\n\n${topic[2]} est un chapitre important de l'histoire humaine. \u00c0 travers cette le\u00e7on, nous comprendrons son contexte historique, ses \u00e9v\u00e9nements cl\u00e9s et ses impacts profonds.\n\nContexte historique : ${topic[2]} s'est produit dans des conditions historiques sp\u00e9cifiques. Comprendre le contexte social, \u00e9conomique et culturel aide \u00e0 comprendre cette p\u00e9riode.\n\n\u00c9v\u00e9nements cl\u00e9s : Il y a de nombreux \u00e9v\u00e9nements importants dans ${topic[2]} qui m\u00e9ritent d'\u00eatre \u00e9tudi\u00e9s en profondeur.\n\nPersonnages importants : Dans ${topic[2]}, certaines personnalit\u00e9s exceptionnelles ont jou\u00e9 des r\u00f4les importants.\n\nImpact historique : ${topic[2]} a eu des effets profonds sur les g\u00e9n\u00e9rations suivantes.\n\nLe\u00e7ons de l'histoire : En \u00e9tudiant ${topic[2]}, nous pouvons tirer des le\u00e7ons et r\u00e9fl\u00e9chir aux enseignements de l'histoire.`,
      `Diese Lektion behandelt ${topic[3]}.\n\n${topic[3]} ist ein wichtiges Kapitel der menschlichen Geschichte. Durch diese Lektion verstehen wir den historischen Hintergrund, die Schl\u00fcsselereignisse und die weitreichenden Auswirkungen.\n\nHistorischer Hintergrund: ${topic[3]} fand unter spezifischen historischen Bedingungen statt. Das Verst\u00e4ndnis des sozialen, wirtschaftlichen und kulturellen Kontexts hilft uns.\n\nSchl\u00fcsselereignisse: Es gibt viele wichtige Ereignisse in ${topic[3]}, die es wert sind, vertieft zu werden.\n\nWichtige Pers\u00f6nlichkeiten: In ${topic[3]} spielten einige herausragende Pers\u00f6nlichkeiten wichtige Rollen.\n\nHistorische Auswirkungen: ${topic[3]} hatte weitreichende Effekte auf nachfolgende Generationen.\n\nGeschichtliche Lehren: Durch das Studium von ${topic[3]} k\u00f6nnen wir Weisheit sch\u00f6pfen und \u00fcber die Lehren der Geschichte nachdenken.`
    ),
    geography: t(
      `本课学习${topic[0]}。\n\n${topic[0]}是地理学中的重要内容。通过本课的学习，我们将了解其地理特征、分布规律和与人类活动的关系。\n\n地理特征：${topic[0]}具有独特的地理特征。了解这些特征有助于我们认识自然环境的多样性和复杂性。\n\n分布规律：${topic[0]}在地球上的分布有一定的规律性。通过地图和数据分析，我们可以发现这些分布规律。\n\n与人类活动的关系：${topic[0]}与人类的生产生活密切相关。了解这种关系有助于我们认识人与自然和谐发展的重要性。\n\n环境问题：${topic[0]}相关的环境问题日益受到关注。我们需要了解这些问题的成因和可能的解决方案。\n\n可持续发展：学习${topic[0]}的最终目的是促进可持续发展，实现人与自然的和谐共处。`,
      `This lesson covers ${topic[1]}.\n\n${topic[1]} is an important topic in geography. Through this lesson, we will understand its geographical features, distribution patterns, and relationship with human activities.\n\nGeographical Features: ${topic[1]} has unique geographical characteristics. Understanding these features helps us recognize the diversity and complexity of the natural environment.\n\nDistribution Patterns: ${topic[1]} follows certain distribution patterns on Earth. Through maps and data analysis, we can discover these patterns.\n\nRelationship with Human Activities: ${topic[1]} is closely related to human production and life. Understanding this relationship helps us recognize the importance of harmonious development between humans and nature.\n\nEnvironmental Issues: Environmental issues related to ${topic[1]} are receiving increasing attention. We need to understand the causes and possible solutions.\n\nSustainable Development: The ultimate goal of studying ${topic[1]} is to promote sustainable development and achieve harmony between humans and nature.`,
      `Cette le\u00e7on couvre ${topic[2]}.\n\n${topic[2]} est un sujet important en g\u00e9ographie. \u00c0 travers cette le\u00e7on, nous comprendrons ses caract\u00e9ristiques g\u00e9ographiques, ses modes de distribution et sa relation avec les activit\u00e9s humaines.\n\nCaract\u00e9ristiques g\u00e9ographiques : ${topic[2]} poss\u00e8de des caract\u00e9ristiques g\u00e9ographiques uniques.\n\nModes de distribution : ${topic[2]} suit certains modes de distribution sur Terre.\n\nRelation avec les activit\u00e9s humaines : ${topic[2]} est \u00e9troitement li\u00e9 \u00e0 la production et \u00e0 la vie humaines.\n\nProbl\u00e8mes environnementaux : Les probl\u00e8mes environnementaux li\u00e9s \u00e0 ${topic[2]} re\u00e7oivent une attention croissante.\n\nD\u00e9veloppement durable : Le but ultime de l'\u00e9tude de ${topic[2]} est de promouvoir le d\u00e9veloppement durable.`,
      `Diese Lektion behandelt ${topic[3]}.\n\n${topic[3]} ist ein wichtiges Thema in der Geografie. Durch diese Lektion verstehen wir die geografischen Merkmale, Verteilungsmuster und die Beziehung zu menschlichen Aktivit\u00e4ten.\n\nGeografische Merkmale: ${topic[3]} hat einzigartige geografische Eigenschaften.\n\nVerteilungsmuster: ${topic[3]} folgt bestimmten Verteilungsmustern auf der Erde.\n\nBeziehung zu menschlichen Aktivit\u00e4ten: ${topic[3]} steht in engem Zusammenhang mit menschlicher Produktion und Leben.\n\nUmweltprobleme: Umweltprobleme im Zusammenhang mit ${topic[3]} erhalten zunehmend Aufmerksamkeit.\n\nNachhaltige Entwicklung: Das ultimative Ziel des Studiums von ${topic[3]} ist die F\u00f6rderung der nachhaltigen Entwicklung.`
    ),
    music: t(
      `本课学习${topic[0]}。\n\n${topic[0]}是音乐学习中的重要内容。通过本课的学习，我们将了解其基本知识、欣赏其艺术特点并进行实践体验。\n\n基本知识：了解${topic[0]}的基本概念和历史背景是学习的基础。我们将从简单的概念入手，逐步深入。\n\n艺术特点：${topic[0]}有其独特的艺术特点。通过欣赏和分析，我们可以感受其美学价值。\n\n实践体验：音乐学习需要动手实践。我们将通过演唱、演奏或创作来体验${topic[0]}的魅力。\n\n文化理解：${topic[0]}与特定的文化背景密切相关。了解这些文化背景有助于我们更深入地理解音乐。\n\n审美培养：学习${topic[0]}的最终目的是培养音乐审美能力，提升艺术素养。`,
      `This lesson covers ${topic[1]}.\n\n${topic[1]} is an important topic in music learning. Through this lesson, we will understand its basics, appreciate its artistic features, and engage in practical experiences.\n\nBasics: Understanding the basic concepts and historical background of ${topic[1]} is the foundation of learning.\n\nArtistic Features: ${topic[1]} has its unique artistic characteristics. Through appreciation and analysis, we can experience its aesthetic value.\n\nPractical Experience: Music learning requires hands-on practice. We will experience the charm of ${topic[1]} through singing, playing, or composing.\n\nCultural Understanding: ${topic[1]} is closely related to specific cultural backgrounds. Understanding these contexts helps us understand the music more deeply.\n\nAesthetic Development: The ultimate goal of studying ${topic[1]} is to develop musical aesthetic ability and enhance artistic literacy.`,
      `Cette le\u00e7on couvre ${topic[2]}.\n\n${topic[2]} est un sujet important dans l'apprentissage de la musique. \u00c0 travers cette le\u00e7on, nous comprendrons ses bases, appr\u00e9cierons ses caract\u00e9ristiques artistiques et nous engagerons dans des exp\u00e9riences pratiques.\n\nBases : Comprendre les concepts de base et le contexte historique de ${topic[2]} est le fondement de l'apprentissage.\n\nCaract\u00e9ristiques artistiques : ${topic[2]} a ses caract\u00e9ristiques artistiques uniques.\n\nExp\u00e9rience pratique : L'apprentissage de la musique n\u00e9cessite une pratique pratique.\n\nCompr\u00e9hension culturelle : ${topic[2]} est \u00e9troitement li\u00e9 \u00e0 des contextes culturels sp\u00e9cifiques.\n\nD\u00e9veloppement esth\u00e9tique : Le but ultime de l'\u00e9tude de ${topic[2]} est de d\u00e9velopper l'esth\u00e9tique musicale.`,
      `Diese Lektion behandelt ${topic[3]}.\n\n${topic[3]} ist ein wichtiges Thema im Musiklernen. Durch diese Lektion verstehen wir die Grundlagen, w\u00fcrdigen die k\u00fcnstlerischen Merkmale und machen praktische Erfahrungen.\n\nGrundlagen: Die Grundkonzepte und den historischen Hintergrund von ${topic[3]} zu verstehen, ist die Grundlage des Lernens.\n\nK\u00fcnstlerische Merkmale: ${topic[3]} hat seine einzigartigen k\u00fcnstlerischen Eigenschaften.\n\nPraktische Erfahrung: Musiklernen erfordert praktische \u00dcbungen.\n\nKulturelles Verst\u00e4ndnis: ${topic[3]} steht in engem Zusammenhang mit spezifischen kulturellen Hintergr\u00fcnden.\n\n\u00c4sthetische Entwicklung: Das ultimative Ziel des Studiums von ${topic[3]} ist die Entwicklung der musikalischen \u00c4sthetik.`
    ),
    "foreign-language": t(
      `本课学习${topic[0]}。\n\n${topic[0]}是外语学习中的重要内容。通过本课的学习，我们将掌握相关语言知识、提高语言运用能力并增强跨文化意识。\n\n语言知识：我们将学习与${topic[0]}相关的词汇、语法和表达方式。这些知识是语言运用的基础。\n\n语言技能：通过听、说、读、写的综合训练，我们将提高在${topic[0]}相关情境中的语言运用能力。\n\n文化意识：语言与文化密不可分。了解${topic[0]}相关的文化背景，有助于我们更准确地理解和运用语言。\n\n交际能力：学习${topic[0]}的最终目的是能够在真实的交际场景中有效地使用语言。\n\n学习策略：我们将学习有效的语言学习策略，培养自主学习的能力。`,
      `This lesson covers ${topic[1]}.\n\n${topic[1]} is an important topic in foreign language learning. Through this lesson, we will master related language knowledge, improve language skills, and enhance cross-cultural awareness.\n\nLanguage Knowledge: We will learn vocabulary, grammar, and expressions related to ${topic[1]}. This knowledge is the foundation for language use.\n\nLanguage Skills: Through comprehensive training in listening, speaking, reading, and writing, we will improve our ability to use language in contexts related to ${topic[1]}.\n\nCultural Awareness: Language and culture are inseparable. Understanding the cultural background related to ${topic[1]} helps us understand and use the language more accurately.\n\nCommunication Skills: The ultimate goal of studying ${topic[1]} is to be able to use the language effectively in real communication scenarios.\n\nLearning Strategies: We will learn effective language learning strategies and develop autonomous learning abilities.`,
      `Cette le\u00e7on couvre ${topic[2]}.\n\n${topic[2]} est un sujet important dans l'apprentissage des langues \u00e9trang\u00e8res. \u00c0 travers cette le\u00e7on, nous ma\u00eetriserons les connaissances linguistiques, am\u00e9liorerons nos comp\u00e9tences linguistiques et renforcerons la conscience interculturelle.\n\nConnaissances linguistiques : Nous apprendrons le vocabulaire, la grammaire et les expressions li\u00e9s \u00e0 ${topic[2]}.\n\nComp\u00e9tences linguistiques : \u00c0 travers une formation compl\u00e8te en compr\u00e9hension et expression, nous am\u00e9liorerons notre capacit\u00e9 \u00e0 utiliser la langue.\n\nConscience culturelle : La langue et la culture sont ins\u00e9parables. Comprendre le contexte culturel li\u00e9 \u00e0 ${topic[2]} nous aide \u00e0 utiliser la langue plus pr\u00e9cis\u00e9ment.\n\nComp\u00e9tences de communication : Le but ultime de l'\u00e9tude de ${topic[2]} est de pouvoir utiliser la langue efficacement dans des sc\u00e9narios de communication r\u00e9els.\n\nStrat\u00e9gies d'apprentissage : Nous apprendrons des strat\u00e9gies d'apprentissage efficaces et d\u00e9velopperons des capacit\u00e9s d'apprentissage autonome.`,
      `Diese Lektion behandelt ${topic[3]}.\n\n${topic[3]} ist ein wichtiges Thema im Fremdsprachenlernen. Durch diese Lektion beherrschen wir die entsprechenden Sprachkenntnisse, verbessern unsere Sprachf\u00e4higkeiten und st\u00e4rken das interkulturelle Bewusstsein.\n\nSprachkenntnisse: Wir lernen Wortschatz, Grammatik und Ausdr\u00fccke zu ${topic[3]}.\n\nSprachfertigkeiten: Durch umfassendes Training in H\u00f6ren, Sprechen, Lesen und Schreiben verbessern wir unsere F\u00e4higkeit, die Sprache zu verwenden.\n\nKulturelles Bewusstsein: Sprache und Kultur sind untrennbar. Das Verst\u00e4ndnis des kulturellen Hintergrunds von ${topic[3]} hilft uns.\n\nKommunikationsf\u00e4higkeiten: Das ultimative Ziel des Studiums von ${topic[3]} ist die effektive Verwendung der Sprache in realen Kommunikationssituationen.\n\nLernstrategien: Wir lernen effektive Sprachlernstrategien und entwickeln autonome Lernf\u00e4higkeiten.`
    )
  };

  // Generate classwork and homework
  const cwMap = {
    math: t(`1.完成${topic[0]}相关练习题\n2.课堂讨论解题方法\n3.小组合作解决问题`,`1.Complete exercises on ${topic[1]}\n2.Discuss problem-solving methods\n3.Group collaboration to solve problems`,`1.Compl\u00e9ter les exercices sur ${topic[2]}\n2.Discuter des m\u00e9thodes de r\u00e9solution\n3.Collaboration en groupe pour r\u00e9soudre des probl\u00e8mes`,`1.Aufgaben zu ${topic[3]} l\u00f6sen\n2.L\u00f6sungsmethoden diskutieren\n3.Gruppenarbeit zur Probleml\u00f6sung`),
    english: t(`1.阅读${topic[0]}相关文章\n2.完成词汇和语法练习\n3.小组讨论和角色扮演`,`1.Read articles on ${topic[1]}\n2.Complete vocabulary and grammar exercises\n3.Group discussion and role-play`,`1.Lire des articles sur ${topic[2]}\n2.Compl\u00e9ter les exercices de vocabulaire et grammaire\n3.Discussion en groupe et jeu de r\u00f4le`,`1.Artikel \u00fcber ${topic[3]} lesen\n2.Wortschatz- und Grammatik\u00fcbungen absolvieren\n3.Gruppendiskussion und Rollenspiel`),
    language: t(`1.阅读${topic[0]}相关材料\n2.完成词汇和表达练习\n3.小组讨论和表演`,`1.Read materials on ${topic[1]}\n2.Complete vocabulary and expression exercises\n3.Group discussion and performance`,`1.Lire des documents sur ${topic[2]}\n2.Compl\u00e9ter les exercices de vocabulaire et expression\n3.Discussion en groupe et repr\u00e9sentation`,`1.Materialien zu ${topic[3]} lesen\n2.Wortschatz- und Ausdrucks\u00fcbungen absolvieren\n3.Gruppendiskussion und Auff\u00fchrung`),
    science: t(`1.观察${topic[0]}相关现象\n2.完成实验报告\n3.讨论科学原理`,`1.Observe phenomena related to ${topic[1]}\n2.Complete lab report\n3.Discuss scientific principles`,`1.Observer les ph\u00e9nom\u00e8nes li\u00e9s \u00e0 ${topic[2]}\n2.R\u00e9diger un rapport de laboratoire\n3.Discuter des principes scientifiques`,`1.Ph\u00e4nomene zu ${topic[3]} beobachten\n2.Laborbericht erstellen\n3.Wissenschaftliche Prinzipien diskutieren`),
    history: t(`1.阅读${topic[0]}相关史料\n2.分析历史事件因果关系\n3.课堂讨论和展示`,`1.Read historical materials on ${topic[1]}\n2.Analyze cause-and-effect of historical events\n3.Class discussion and presentation`,`1.Lire des documents historiques sur ${topic[2]}\n2.Analyser les causes et cons\u00e9quences des \u00e9v\u00e9nements\n3.Discussion et pr\u00e9sentation en classe`,`1.Historisches Material zu ${topic[3]} lesen\n2.Ursache-Wirkung historischer Ereignisse analysieren\n3.Klassendiskussion und Pr\u00e4sentation`),
    geography: t(`1.阅读${topic[0]}相关地图\n2.分析地理数据和图表\n3.课堂讨论和展示`,`1.Read maps related to ${topic[1]}\n2.Analyze geographical data and charts\n3.Class discussion and presentation`,`1.Lire des cartes li\u00e9es \u00e0 ${topic[2]}\n2.Analyser les donn\u00e9es et graphiques g\u00e9ographiques\n3.Discussion et pr\u00e9sentation en classe`,`1.Karten zu ${topic[3]} lesen\n2.Geografische Daten und Diagramme analysieren\n3.Klassendiskussion und Pr\u00e4sentation`),
    music: t(`1.欣赏${topic[0]}相关音乐作品\n2.练习演唱或演奏\n3.创作简单音乐片段`,`1.Appreciate music related to ${topic[1]}\n2.Practice singing or playing\n3.Compose simple music pieces`,`1.Appr\u00e9cier la musique li\u00e9e \u00e0 ${topic[2]}\n2.Pratiquer le chant ou l'instrument\n3.Composer de simples morceaux de musique`,`1.Musik zu ${topic[3]} w\u00fcrdigen\n2.Singen oder Spielen \u00fcben\n3.Einfache Musikst\u00fccke komponieren`),
    "foreign-language": t(`1.练习${topic[0]}相关对话\n2.完成语法和词汇练习\n3.小组活动和展示`,`1.Practice dialogues related to ${topic[1]}\n2.Complete grammar and vocabulary exercises\n3.Group activities and presentation`,`1.Pratiquer les dialogues li\u00e9s \u00e0 ${topic[2]}\n2.Compl\u00e9ter les exercices de grammaire et vocabulaire\n3.Activit\u00e9s en groupe et pr\u00e9sentation`,`1.Dialoge zu ${topic[3]} \u00fcben\n2.Grammatik- und Wortschatz\u00fcbungen absolvieren\n3.Gruppenaktivit\u00e4ten und Pr\u00e4sentation`)
  };

  const hwMap = {
    math: t(`1.完成练习册${topic[0]}部分\n2.整理课堂笔记\n3.预习下一课内容`,`1.Complete the ${topic[1]} section in workbook\n2.Organize class notes\n3.Preview the next lesson`,`1.Compl\u00e9ter la section ${topic[2]} dans le cahier\n2.Organiser les notes de cours\n3.Pr\u00e9parer la prochaine le\u00e7on`,`1.Den Abschnitt ${topic[3]} im Heft l\u00f6sen\n2.Notizen ordnen\n3.Die n\u00e4chste Lektion vorbereiten`),
    english: t(`1.完成${topic[0]}相关阅读作业\n2.写一篇短文\n3.背诵核心词汇`,`1.Complete reading homework on ${topic[1]}\n2.Write a short essay\n3.Memorize core vocabulary`,`1.Compl\u00e9ter les devoirs de lecture sur ${topic[2]}\n2.\u00c9crire un court essai\n3.M\u00e9moriser le vocabulaire essentiel`,`1.Lesehausaufgaben zu ${topic[3]} erledigen\n2.Einen kurzen Aufsatz schreiben\n3.Kernwortschatz auswendig lernen`),
    language: t(`1.完成${topic[0]}相关练习\n2.写一段话\n3.复习核心词汇`,`1.Complete exercises on ${topic[1]}\n2.Write a short paragraph\n3.Review core vocabulary`,`1.Compl\u00e9ter les exercices sur ${topic[2]}\n2.\u00c9crire un court paragraphe\n3.R\u00e9viser le vocabulaire essentiel`,`1.Aufgaben zu ${topic[3]} l\u00f6sen\n2.Einen kurzen Absatz schreiben\n3.Kernwortschatz wiederholen`),
    science: t(`1.完成${topic[0]}相关练习\n2.观察记录生活中的现象\n3.准备下次实验材料`,`1.Complete exercises on ${topic[1]}\n2.Observe and record phenomena in daily life\n3.Prepare materials for next experiment`,`1.Compl\u00e9ter les exercices sur ${topic[2]}\n2.Observer et noter les ph\u00e9nom\u00e8nes quotidiens\n3.Pr\u00e9parer le mat\u00e9riel pour la prochaine exp\u00e9rience`,`1.Aufgaben zu ${topic[3]} l\u00f6sen\n2.Ph\u00e4nomene im Alltag beobachten und aufzeichnen\n3.Material f\u00fcr das n\u00e4chste Experiment vorbereiten`),
    history: t(`1.完成${topic[0]}相关阅读\n2.写一篇历史小论文\n3.查找补充资料`,`1.Complete reading on ${topic[1]}\n2.Write a short historical essay\n3.Find supplementary materials`,`1.Compl\u00e9ter la lecture sur ${topic[2]}\n2.\u00c9crire un court essai historique\n3.Trouver des documents suppl\u00e9mentaires`,`1.Lekt\u00fcre zu ${topic[3]} abschlie\u00dfen\n2.Einen kurzen historischen Aufsatz schreiben\n3.Erg\u00e4nzendes Material suchen`),
    geography: t(`1.完成${topic[0]}相关练习\n2.绘制相关地图或图表\n3.查找补充资料`,`1.Complete exercises on ${topic[1]}\n2.Draw related maps or charts\n3.Find supplementary materials`,`1.Compl\u00e9ter les exercices sur ${topic[2]}\n2.Dessiner des cartes ou graphiques\n3.Trouver des documents suppl\u00e9mentaires`,`1.Aufgaben zu ${topic[3]} l\u00f6sen\n2.Zugeh\u00f6rige Karten oder Diagramme zeichnen\n3.Erg\u00e4nzendes Material suchen`),
    music: t(`1.练习${topic[0]}相关曲目\n2.聆听推荐音乐作品\n3.写音乐欣赏笔记`,`1.Practice pieces related to ${topic[1]}\n2.Listen to recommended musical works\n3.Write music appreciation notes`,`1.Pratiquer les morceaux li\u00e9s \u00e0 ${topic[2]}\n2.\u00c9couter les \u0153uvres musicales recommand\u00e9es\n3.\u00c9crire des notes d'appr\u00e9ciation musicale`,`1.St\u00fccke zu ${topic[3]} \u00fcben\n2.Empfohlene Musikwerke anh\u00f6ren\n3.Musikw\u00fcrdigungsnotizen schreiben`),
    "foreign-language": t(`1.完成${topic[0]}相关练习\n2.听力和口语练习\n3.预习下一课内容`,`1.Complete exercises on ${topic[1]}\n2.Listening and speaking practice\n3.Preview the next lesson`,`1.Compl\u00e9ter les exercices sur ${topic[2]}\n2.Pratiquer l'\u00e9coute et l'expression orale\n3.Pr\u00e9parer la prochaine le\u00e7on`,`1.Aufgaben zu ${topic[3]} l\u00f6sen\n2.H\u00f6r- und Sprech\u00fcbung\n3.Die n\u00e4chste Lektion vorbereiten`)
  };

  return L(id, t(topic[0], topic[1], topic[2], topic[3]),
    objMap[subj], contMap[subj], cwMap[subj], hwMap[subj]);
}

// Build all grades data (k-large + grades 1-9)
const allGradesData = {};
for (const gd of gradeDefs) {
  const gradeTopics = topics[gd.key];
  if (!gradeTopics) { console.log('WARNING: No topics for', gd.key); continue; }
  const semesters = {};
  for (const sem of ["s1", "s2"]) {
    const semTopics = gradeTopics[sem];
    if (!semTopics) continue;
    const subjects = {};
    for (const subj of gd.subjects) {
      const subTopics = semTopics[subj];
      if (!subTopics) continue;
      const lessons = subTopics.map((tp, idx) => genContent(gd.key, sem, subj, idx, tp));
      subjects[subj] = { name: subjectNames[subj], lessons };
    }
    semesters[sem] = {
      name: sem === "s1" ? t("第一学期","Semester 1","Semestre 1","Semester 1") : t("第二学期","Semester 2","Semestre 2","Semester 2"),
      subjects
    };
  }
  allGradesData[gd.key] = { name: gd.name, age: gd.age, semesters };
}

// Build the complete JS output
function objToJS(obj, indent) {
  indent = indent || '';
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj === 'number') return String(obj);
  if (typeof obj === 'string') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    const items = obj.map(v => indent + '  ' + objToJS(v, indent + '  '));
    return '[\n' + items.join(',\n') + '\n' + indent + ']';
  }
  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    const items = keys.map(k => {
      const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : JSON.stringify(k);
      return indent + '  ' + key + ': ' + objToJS(obj[k], indent + '  ');
    });
    return '{\n' + items.join(',\n') + '\n' + indent + '}';
  }
  return String(obj);
}

// Write the replacement content as key-value pairs (no outer braces)
function objKVPairs(obj, indent) {
  indent = indent || '';
  const keys = Object.keys(obj);
  if (keys.length === 0) return '';
  const items = keys.map(k => {
    const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : JSON.stringify(k);
    return indent + key + ': ' + objToJS(obj[k], indent);
  });
  return items.join(',\n');
}

const replacement = objKVPairs(allGradesData, '  ');

// Read existing file and replace placeholders
let content = fs.readFileSync(filePath, 'utf8');

// Replace placeholders in the original file
content = content.replace(
  /  \/\/ PLACEHOLDER_KLARGE\n  \/\/ PLACEHOLDER_GRADES/,
  replacement
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done! File updated successfully.');
console.log('File size:', fs.statSync(filePath).size, 'bytes');
