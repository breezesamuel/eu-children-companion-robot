// ==================== EUROPEAN EDUCATIONAL CONTENT ====================
// European curriculum K-9 (幼儿园到初中) — 欧洲教学资料
// CEFR aligned: Kindergarten=Pre-A1, P1-2=A1, P3-4=A2, P5-6=B1, J1-3=B2
window.EUROPE_DATA = (function() {

  // ======================= VOCABULARY (CEFR-aligned, European themes) =======================
  const vocab = {};
  function V(level, word, meaning, phonetic, example) {
    if (!vocab[level]) vocab[level] = [];
    vocab[level].push({ word, meaning, phonetic, example, level });
  }
  // ---------- Kindergarten / Pre-A1: European animals, food, colors ----------
  V('kindergarten','eiffel','埃菲尔铁塔','/ˈaɪ.fəl/','The Eiffel Tower is in Paris.','kindergarten');
  V('kindergarten','baguette','法棍面包','/bæɡˈet/','I like eating baguette.','kindergarten');
  V('kindergarten','croissant','羊角面包','/ˈkrwʌs.ɒŋ/','Croissant is a French bread.','kindergarten');
  V('kindergarten','tulip','郁金香','/ˈtjuː.lɪp/','Tulips are from Holland.','kindergarten');
  V('kindergarten','alps','阿尔卑斯山','/ælps/','The Alps are high mountains.','kindergarten');
  V('kindergarten','swan','天鹅','/swɒn/','Swans swim on the lake.','kindergarten');
  V('kindergarten','olive','橄榄','/ˈɒl.ɪv/','Olives grow in Italy.','kindergarten');
  V('kindergarten','pizza','披萨','/ˈpiːt.sə/','Pizza comes from Italy.','kindergarten');
  V('kindergarten','frog','青蛙','/frɒɡ/','The frog lives near the pond.','kindergarten');
  V('kindergarten','fox','狐狸','/fɒks/','The fox lives in the forest.','kindergarten');
  V('kindergarten','deer','鹿','/dɪər/','Deer run in the forest.','kindergarten');
  V('kindergarten','bear','熊','/beər/','Brown bears live in Europe.','kindergarten');
  V('kindergarten','lake','湖','/leɪk/','The lake is blue.','kindergarten');
  V('kindergarten','castle','城堡','/ˈkɑː.səl/','The castle is very old.','kindergarten');
  V('kindergarten','king','国王','/kɪŋ/','The king lives in the castle.','kindergarten');
  V('kindergarten','queen','女王','/kwiːn/','The queen wears a crown.','kindergarten');
  V('kindergarten','rainbow','彩虹','/ˈreɪn.bəʊ/','Look at the rainbow!','kindergarten');
  V('kindergarten','butterfly','蝴蝶','/ˈbʌt.ə.flaɪ/','The butterfly is colorful.','kindergarten');
  V('kindergarten','ladybird','瓢虫','/ˈleɪ.di.bɜːd/','A ladybird has red wings.','kindergarten');
  V('kindergarten','cheese','奶酪','/tʃiːz/','Cheese is from France.','kindergarten');
  V('kindergarten','grape','葡萄','/ɡreɪp/','Grapes grow in Greece.','kindergarten');
  V('kindergarten','sheep','羊','/ʃiːp/','Sheep live on the farm.','kindergarten');
  V('kindergarten','horse','马','/hɔːs/','The horse runs fast.','kindergarten');
  V('kindergarten','goat','山羊','/ɡəʊt/','Goats climb mountains.','kindergarten');
  V('kindergarten','flower','花','/ˈflaʊ.ər/','Flowers bloom in spring.','kindergarten');
  V('kindergarten','windmill','风车','/ˈwɪnd.mɪl/','Windmills are in Holland.','kindergarten');
  V('kindergarten','boat','船','/bəʊt/','The boat sails on the river.','kindergarten');
  V('kindergarten','bridge','桥','/brɪdʒ/','We cross the bridge.','kindergarten');
  V('kindergarten','clock','钟','/klɒk/','Big Ben is a famous clock.','kindergarten');
  V('kindergarten','bell','铃铛','/bel/','The church bell rings.','kindergarten');

  // ---------- Primary 1 / A1: School, family, daily life in Europe ----------
  V('primary1','paris','巴黎','/ˈpær.ɪs/','Paris is the capital of France.','primary1');
  V('primary1','london','伦敦','/ˈlʌn.dən/','London is a big city.','primary1');
  V('primary1','berlin','柏林','/bɜːˈlɪn/','Berlin is in Germany.','primary1');
  V('primary1','rome','罗马','/rəʊm/','Rome is an old city.','primary1');
  V('primary1','river','河流','/ˈrɪv.ər/','The River Thames is in London.','primary1');
  V('primary1','museum','博物馆','/mjuˈziː.əm/','We visit a museum.','primary1');
  V('primary1','park','公园','/pɑːk/','We play in the park.','primary1');
  V('primary1','library','图书馆','/ˈlaɪ.brər.i/','The library has many books.','primary1');
  V('primary1','market','市场','/ˈmɑː.kɪt/','We buy food at the market.','primary1');
  V('primary1','bicycle','自行车','/ˈbaɪ.sɪ.kəl/','Children ride bicycles.','primary1');
  V('primary1','train','火车','/treɪn/','The train goes to Paris.','primary1');
  V('primary1','school','学校','/skuːl/','I go to school.','primary1');
  V('primary1','teacher','老师','/ˈtiː.tʃər/','My teacher is kind.','primary1');
  V('primary1','friend','朋友','/frend/','This is my friend.','primary1');
  V('primary1','family','家庭','/ˈfæm.əl.i/','I love my family.','primary1');
  V('primary1','mother','妈妈','/ˈmʌð.ər/','My mother cooks dinner.','primary1');
  V('primary1','father','爸爸','/ˈfɑː.ðər/','My father reads stories.','primary1');
  V('primary1','brother','兄弟','/ˈbrʌð.ər/','I play with my brother.','primary1');
  V('primary1','sister','姐妹','/ˈsɪs.tər/','My sister is nice.','primary1');
  V('primary1','baby','婴儿','/ˈbeɪ.bi/','The baby is cute.','primary1');
  V('primary1','bread','面包','/bred/','We eat bread for breakfast.','primary1');
  V('primary1','butter','黄油','/ˈbʌt.ər/','Butter on bread is yummy.','primary1');
  V('primary1','milk','牛奶','/mɪlk/','I drink milk every day.','primary1');
  V('primary1','water','水','/ˈwɔː.tər/','Water is healthy.','primary1');
  V('primary1','apple','苹果','/ˈæp.əl/','I eat an apple.','primary1');
  V('primary1','banana','香蕉','/bəˈnɑː.nə/','Bananas are yellow.','primary1');
  V('primary1','orange','橙子','/ˈɒr.ɪndʒ/','Oranges are juicy.','primary1');
  V('primary1','tomato','番茄','/təˈmɑː.təʊ/','Tomatoes are red.','primary1');
  V('primary1','potato','土豆','/pəˈteɪ.təʊ/','Potatoes grow underground.','primary1');
  V('primary1','carrot','胡萝卜','/ˈkær.ət/','Rabbits like carrots.','primary1');
  V('primary1','cabbage','卷心菜','/ˈkæb.ɪdʒ/','Cabbage is a green vegetable.','primary1');
  V('primary1','sausage','香肠','/ˈsɒs.ɪdʒ/','German sausages are famous.','primary1');

  // ---------- Primary 2 / A1+: European geography & culture ----------
  V('primary2','europe','欧洲','/ˈjʊə.rəp/','Europe has many countries.','primary2');
  V('primary2','country','国家','/ˈkʌn.tri/','France is a country.','primary2');
  V('primary2','capital','首都','/ˈkæp.ɪ.təl/','Madrid is the capital of Spain.','primary2');
  V('primary2','mountain','山','/ˈmaʊn.tɪn/','The Matterhorn is a mountain.','primary2');
  V('primary2','island','岛屿','/ˈaɪ.lənd/','Sicily is an island in Italy.','primary2');
  V('primary2','sea','海','/siː/','The Mediterranean Sea is warm.','primary2');
  V('primary2','beach','海滩','/biːtʃ/','We play on the beach.','primary2');
  V('primary2','clock','钟','/klɒk/','The cuckoo clock is from Germany.','primary2');
  V('primary2','tower','塔','/ˈtaʊ.ər/','The Leaning Tower is in Pisa.','primary2');
  V('primary2','church','教堂','/tʃɜːtʃ/','The church has a tall tower.','primary2');
  V('primary2','square','广场','/skweər/','Trafalgar Square is in London.','primary2');
  V('primary2','fountain','喷泉','/ˈfaʊn.tɪn/','The Trevi Fountain is in Rome.','primary2');
  V('primary2','garden','花园','/ˈɡɑː.dən/','The Luxembourg Garden is pretty.','primary2');
  V('primary2','forest','森林','/ˈfɒr.ɪst/','The Black Forest is in Germany.','primary2');
  V('primary2','river','河流','/ˈrɪv.ər/','The Danube flows through Europe.','primary2');
  V('primary2','weather','天气','/ˈweð.ər/','The weather in spring is nice.','primary2');
  V('primary2','sunny','晴朗的','/ˈsʌn.i/','Spain is sunny.','primary2');
  V('primary2','rainy','下雨的','/ˈreɪ.ni/','London is often rainy.','primary2');
  V('primary2','snowy','下雪的','/ˈsnəʊ.i/','The Alps are snowy.','primary2');
  V('primary2','windy','有风的','/ˈwɪn.di/','Holland is windy.','primary2');
  V('primary2','spring','春天','/sprɪŋ/','Spring has flowers.','primary2');
  V('primary2','summer','夏天','/ˈsʌm.ər/','Summer holidays are fun.','primary2');
  V('primary2','autumn','秋天','/ˈɔː.təm/','Leaves fall in autumn.','primary2');
  V('primary2','winter','冬天','/ˈwɪn.tər/','Winter is cold and snowy.','primary2');
  V('primary2','festival','节日','/ˈfes.tɪ.vəl/','Oktoberfest is a German festival.','primary2');
  V('primary2','carnival','嘉年华','/ˈkɑː.nɪ.vəl/','Venice Carnival has masks.','primary2');
  V('primary2','market','市场','/ˈmɑː.kɪt/','Christmas markets are lovely.','primary2');
  V('primary2','present','礼物','/ˈprez.ənt/','I give a present.','primary2');
  V('primary2','card','卡片','/kɑːd/','I send a Christmas card.','primary2');
  V('primary2','stamp','邮票','/stæmp/','The stamp has a picture.','primary2');

  // ---------- Primary 3 / A2: European history & food ----------
  V('primary3','ancient','古代的','/ˈeɪn.ʃənt/','Ancient Greece has temples.','primary3');
  V('primary3','temple','神庙','/ˈtem.pəl/','The Parthenon is a temple.','primary3');
  V('primary3','statue','雕像','/ˈstætʃ.uː/','The statue is made of marble.','primary3');
  V('primary3','palace','宫殿','/ˈpæl.ɪs/','The Palace of Versailles is grand.','primary3');
  V('primary3','emperor','皇帝','/ˈem.pər.ər/','Charlemagne was an emperor.','primary3');
  V('primary3','knight','骑士','/naɪt/','Knights wore armor.','primary3');
  V('primary3','castle','城堡','/ˈkɑː.səl/','Neuschwanstein is a famous castle.','primary3');
  V('primary3','cathedral','大教堂','/kəˈθiː.drəl/','Notre Dame is a cathedral.','primary3');
  V('primary3','bridge','桥','/brɪdʒ/','The Ponte Vecchio is a bridge.','primary3');
  V('primary3','canal','运河','/kəˈnæl/','Venice has many canals.','primary3');
  V('primary3','gondola','贡多拉','/ˈɡɒn.də.lə/','We ride a gondola in Venice.','primary3');
  V('primary3','pasta','意面','/ˈpæs.tə/','Pasta is popular in Italy.','primary3');
  V('primary3','cheese','奶酪','/tʃiːz/','Switzerland has good cheese.','primary3');
  V('primary3','chocolate','巧克力','/ˈtʃɒk.lət/','Belgian chocolate is delicious.','primary3');
  V('primary3','waffle','华夫饼','/ˈwɒf.əl/','Belgian waffles are tasty.','primary3');
  V('primary3','sandwich','三明治','/ˈsæn.wɪdʒ/','Sandwich is a British food.','primary3');
  V('primary3','soup','汤','/suːp/','French onion soup is warm.','primary3');
  V('primary3','salad','沙拉','/ˈsæl.əd/','Greek salad has olives.','primary3');
  V('primary3','olive','橄榄','/ˈɒl.ɪv/','Olive oil is healthy.','primary3');
  V('primary3','yogurt','酸奶','/ˈjɒɡ.ət/','Greek yogurt is thick.','primary3');
  V('primary3','museum','博物馆','/mjuˈziː.əm/','The Louvre is a famous museum.','primary3');
  V('primary3','painting','绘画','/ˈpeɪn.tɪŋ/','The Mona Lisa is a painting.','primary3');
  V('primary3','artist','艺术家','/ˈɑː.tɪst/','Leonardo da Vinci was an artist.','primary3');
  V('primary3','composer','作曲家','/kəmˈpəʊ.zər/','Mozart was a composer.','primary3');
  V('primary3','opera','歌剧','/ˈɒp.ər.ə/','Opera began in Italy.','primary3');
  V('primary3','violin','小提琴','/ˌvaɪ.əˈlɪn/','The violin is a string instrument.','primary3');
  V('primary3','piano','钢琴','/piˈæn.əʊ/','The piano has black and white keys.','primary3');
  V('primary3','guitar','吉他','/ɡɪˈtɑːr/','Spanish guitar music is beautiful.','primary3');
  V('primary3','soccer','足球','/ˈsɒk.ər/','Soccer is popular in Europe.','primary3');
  V('primary3','stadium','体育场','/ˈsteɪ.di.əm/','The stadium is very big.','primary3');

  // ---------- Primary 4 / A2+: European nature & science ----------
  V('primary4','volcano','火山','/vɒlˈkeɪ.nəʊ/','Mount Vesuvius is a volcano.','primary4');
  V('primary4','earthquake','地震','/ˈɜːθ.kweɪk/','Earthquakes shake the ground.','primary4');
  V('primary4','glacier','冰川','/ˈɡleɪ.si.ər/','Glaciers are found in the Alps.','primary4');
  V('primary4','waterfall','瀑布','/ˈwɔː.tə.fɔːl/','The Rhine Falls are big.','primary4');
  V('primary4','eruption','喷发','/ɪˈrʌp.ʃən/','The volcano eruption was powerful.','primary4');
  V('primary4','climate','气候','/ˈklaɪ.mət/','Europe has a temperate climate.','primary4');
  V('primary4','season','季节','/ˈsiː.zən/','There are four seasons.','primary4');
  V('primary4','temperature','温度','/ˈtem.prə.tʃər/','The temperature is 20 degrees.','primary4');
  V('primary4','experiment','实验','/ɪkˈsper.ɪ.mənt/','We do a science experiment.','primary4');
  V('primary4','microscope','显微镜','/ˈmaɪ.krə.skəʊp/','Look through the microscope.','primary4');
  V('primary4','telescope','望远镜','/ˈtel.ɪ.skəʊp/','Galileo used a telescope.','primary4');
  V('primary4','planet','行星','/ˈplæn.ɪt/','Mars is a planet.','primary4');
  V('primary4','scientist','科学家','/ˈsaɪ.ən.tɪst/','Marie Curie was a scientist.','primary4');
  V('primary4','discover','发现','/dɪˈskʌv.ər/','Columbus discovered America.','primary4');
  V('primary4','invent','发明','/ɪnˈvent/','Edison invented the light bulb.','primary4');
  V('primary4','electricity','电力','/ɪˌlekˈtrɪs.ɪ.ti/','Electricity powers our homes.','primary4');
  V('primary4','battery','电池','/ˈbæt.ər.i/','Alessandro Volta invented the battery.','primary4');
  V('primary4','gravity','重力','/ˈɡræv.ɪ.ti/','Newton discovered gravity.','primary4');
  V('primary4','energy','能量','/ˈen.ə.dʒi/','Solar energy is clean.','primary4');
  V('primary4','recycle','回收','/ˌriːˈsaɪ.kəl/','We recycle paper and plastic.','primary4');
  V('primary4','environment','环境','/ɪnˈvaɪ.rən.mənt/','We protect the environment.','primary4');
  V('primary4','pollution','污染','/pəˈluː.ʃən/','Air pollution is bad for health.','primary4');
  V('primary4','nature','自然','/ˈneɪ.tʃər/','Nature is beautiful.','primary4');
  V('primary4','forest','森林','/ˈfɒr.ɪst/','The Black Forest is in Germany.','primary4');
  V('primary4','garden','花园','/ˈɡɑː.dən/','The Kew Garden is in London.','primary4');
  V('primary4','animal','动物','/ˈæn.ɪ.məl/','Animals live in the wild.','primary4');
  V('primary4','plant','植物','/plɑːnt/','Plants need sunlight.','primary4');
  V('primary4','flower','花','/ˈflaʊ.ər/','The tulip is from Holland.','primary4');
  V('primary4','tree','树','/triː/','The oak tree is strong.','primary4');
  V('primary4','leaf','叶子','/liːf/','Leaves turn yellow in autumn.','primary4');

  // ---------- Primary 5 / B1: European history & civilization ----------
  V('primary5','renaissance','文艺复兴','/rəˈneɪ.səns/','The Renaissance began in Italy.','primary5');
  V('primary5','exploration','探索','/ˌek.spləˈreɪ.ʃən/','The Age of Exploration discovered new lands.','primary5');
  V('primary5','empire','帝国','/ˈem.paɪər/','The Roman Empire was powerful.','primary5');
  V('primary5','civilization','文明','/ˌsɪv.ɪ.laɪˈzeɪ.ʃən/','Ancient Greek civilization started democracy.','primary5');
  V('primary5','democracy','民主','/dɪˈmɒk.rə.si/','Democracy began in Athens.','primary5');
  V('primary5','parliament','议会','/ˈpɑː.lɪ.mənt/','The UK Parliament makes laws.','primary5');
  V('primary5','revolution','革命','/ˌrev.əˈluː.ʃən/','The French Revolution changed France.','primary5');
  V('primary5','industrial','工业的','/ɪnˈdʌs.tri.əl/','The Industrial Revolution started in Britain.','primary5');
  V('primary5','factory','工厂','/ˈfæk.tər.i/','Factories produced goods quickly.','primary5');
  V('primary5','railway','铁路','/ˈreɪl.weɪ/','The first railway was in England.','primary5');
  V('primary5','steam','蒸汽','/stiːm/','Steam engines powered trains.','primary5');
  V('primary5','invention','发明','/ɪnˈven.ʃən/','The printing press was a great invention.','primary5');
  V('primary5','printing','印刷','/ˈprɪn.tɪŋ/','Gutenberg invented the printing press.','primary5');
  V('primary5','university','大学','/ˌjuː.nɪˈvɜː.sɪ.ti/','Oxford is an old university.','primary5');
  V('primary5','library','图书馆','/ˈlaɪ.brər.i/','The British Library has millions of books.','primary5');
  V('primary5','literature','文学','/ˈlɪt.rə.tʃər/','Shakespeare wrote great literature.','primary5');
  V('primary5','play','戏剧','/pleɪ/','A play is performed on stage.','primary5');
  V('primary5','poem','诗歌','/ˈpəʊ.ɪm/','I write a poem about nature.','primary5');
  V('primary5','novel','小说','/ˈnɒv.əl/','I read a novel by Charles Dickens.','primary5');
  V('primary5','author','作者','/ˈɔː.θər/','J.K. Rowling is a famous author.','primary5');
  V('primary5','symphony','交响乐','/ˈsɪm.fə.ni/','Beethoven wrote symphonies.','primary5');
  V('primary5','orchestra','管弦乐团','/ˈɔː.kɪ.strə/','The orchestra plays classical music.','primary5');
  V('primary5','conductor','指挥','/kənˈdʌk.tər/','The conductor leads the orchestra.','primary5');
  V('primary5','ballet','芭蕾','/ˈbæl.eɪ/','Ballet started in France.','primary5');
  V('primary5','theatre','剧院','/ˈθɪə.tər/','The Royal Theatre is in London.','primary5');
  V('primary5','gallery','画廊','/ˈɡæl.ər.i/','The National Gallery has paintings.','primary5');
  V('primary5','sculpture','雕塑','/ˈskʌlp.tʃər/','Michelangelo made sculptures.','primary5');
  V('primary5','architecture','建筑','/ˈɑː.kɪ.tek.tʃər/','Gothic architecture has pointed arches.','primary5');
  V('primary5','monument','纪念碑','/ˈmɒn.ju.mənt/','The Colosseum is a Roman monument.','primary5');
  V('primary5','museum','博物馆','/mjuˈziː.əm/','The Uffizi Gallery is in Florence.','primary5');

  // ---------- Primary 6 / B1+: EU & modern Europe ----------
  V('primary6','european','欧洲的','/ˌjʊə.rəˈpiː.ən/','The European Union has 27 members.','primary6');
  V('primary6','union','联盟','/ˈjuː.ni.ən/','The EU is a union of countries.','primary6');
  V('primary6','treaty','条约','/ˈtriː.ti/','The Treaty of Rome started the EU.','primary6');
  V('primary6','currency','货币','/ˈkʌr.ən.si/','The Euro is the currency of many EU countries.','primary6');
  V('primary6','euro','欧元','/ˈjʊə.rəʊ/','I have 10 euros.','primary6');
  V('primary6','border','边境','/ˈbɔː.dər/','Schengen Area has no borders.','primary6');
  V('primary6','citizen','公民','/ˈsɪt.ɪ.zən/','I am a citizen of Europe.','primary6');
  V('primary6','rights','权利','/raɪts/','The EU Charter protects human rights.','primary6');
  V('primary6','freedom','自由','/ˈfriː.dəm/','Freedom of movement is an EU right.','primary6');
  V('primary6','peace','和平','/piːs/','The EU was built for peace.','primary6');
  V('primary6','cooperation','合作','/kəʊˌɒp.ərˈeɪ.ʃən/','European countries work in cooperation.','primary6');
  V('primary6','trade','贸易','/treɪd/','Countries trade with each other.','primary6');
  V('primary6','economy','经济','/ɪˈkɒn.ə.mi/','The German economy is strong.','primary6');
  V('primary6','industry','工业','/ˈɪn.də.stri/','The car industry is important in Germany.','primary6');
  V('primary6','technology','科技','/tekˈnɒl.ə.dʒi/','Europe has advanced technology.','primary6');
  V('primary6','research','研究','/rɪˈsɜːtʃ/','CERN does research in physics.','primary6');
  V('primary6','innovation','创新','/ˌɪn.əˈveɪ.ʃən/','Innovation drives progress.','primary6');
  V('primary6','education','教育','/ˌedʒ.uˈkeɪ.ʃən/','Education is important for everyone.','primary6');
  V('primary6','exchange','交流','/ɪksˈtʃeɪndʒ/','Erasmus is a student exchange program.','primary6');
  V('primary6','culture','文化','/ˈkʌl.tʃər/','Europe has rich culture.','primary6');
  V('primary6','heritage','遗产','/ˈher.ɪ.tɪdʒ/','UNESCO protects world heritage sites.','primary6');
  V('primary6','tradition','传统','/trəˈdɪʃ.ən/','Christmas markets are a German tradition.','primary6');
  V('primary6','festival','节日','/ˈfes.tɪ.vəl/','The Cannes Film Festival is famous.','primary6');
  V('primary6','cuisine','美食','/kwɪˈziːn/','French cuisine is world-famous.','primary6');
  V('primary6','fashion','时尚','/ˈfæʃ.ən/','Paris is the fashion capital.','primary6');
  V('primary6','design','设计','/dɪˈzaɪn/','Italian design is elegant.','primary6');
  V('primary6','sports','体育','/spɔːts/','The Olympics started in Greece.','primary6');
  V('primary6','championship','锦标赛','/ˈtʃæm.pi.ən.ʃɪp/','The UEFA Championship is every four years.','primary6');
  V('primary6','tourism','旅游','/ˈtʊə.rɪ.zəm/','Tourism is important for Spain.','primary6');
  V('primary6','travel','旅行','/ˈtræv.əl/','I love to travel in Europe.','primary6');

  // ---------- Junior 1 / B2: European literature & philosophy ----------
  V('junior1','philosophy','哲学','/fɪˈlɒs.ə.fi/','Ancient Greek philosophy asked big questions.','junior1');
  V('junior1','logic','逻辑','/ˈlɒdʒ.ɪk/','Aristotle invented logic.','junior1');
  V('junior1','ethics','伦理学','/ˈeθ.ɪks/','Ethics studies right and wrong.','junior1');
  V('junior1','democracy','民主','/dɪˈmɒk.rə.si/','Athens had the first democracy.','junior1');
  V('junior1','republic','共和国','/rɪˈpʌb.lɪk/','Rome was a republic before the empire.','junior1');
  V('junior1','senate','元老院','/ˈsen.ɪt/','The Roman Senate advised the emperor.','junior1');
  V('junior1','gladiator','角斗士','/ˈɡlæd.i.eɪ.tər/','Gladiators fought in the Colosseum.','junior1');
  V('junior1','aqueduct','引水渠','/ˈæk.wɪ.dʌkt/','Roman aqueducts carried water.','junior1');
  V('junior1','manuscript','手稿','/ˈmæn.jʊ.skrɪpt/','Monks copied manuscripts by hand.','junior1');
  V('junior1','illumination','彩绘','/ɪˌluː.mɪˈneɪ.ʃən/','Illuminated manuscripts have gold decorations.','junior1');
  V('junior1','cathedral','大教堂','/kəˈθiː.drəl/','Gothic cathedrals have stained glass.','junior1');
  V('junior1','pilgrim','朝圣者','/ˈpɪl.ɡrɪm/','Pilgrims walked to Santiago de Compostela.','junior1');
  V('junior1','reformation','宗教改革','/ˌref.əˈmeɪ.ʃən/','The Reformation split the Christian Church.','junior1');
  V('junior1','enlightenment','启蒙运动','/ɪnˈlaɪ.tən.mənt/','The Enlightenment valued reason and science.','junior1');
  V('junior1','reason','理性','/ˈriː.zən/','Reason is the basis of science.','junior1');
  V('junior1','science','科学','/ˈsaɪ.əns/','Modern science developed in Europe.','junior1');
  V('junior1','hypothesis','假设','/haɪˈpɒθ.ɪ.sɪs/','Form a hypothesis before your experiment.','junior1');
  V('junior1','theory','理论','/ˈθɪə.ri/','Darwin\'s theory of evolution changed biology.','junior1');
  V('junior1','algebra','代数','/ˈæl.dʒɪ.brə/','Algebra uses letters for unknown numbers.','junior1');
  V('junior1','geometry','几何','/dʒiˈɒm.ɪ.tri/','Euclid wrote about geometry.','junior1');
  V('junior1','equation','方程','/ɪˈkweɪ.ʒən/','Solve the equation for x.','junior1');
  V('junior1','function','函数','/ˈfʌŋk.ʃən/','A function maps inputs to outputs.','junior1');
  V('junior1','velocity','速度','/vɪˈlɒs.ɪ.ti/','Velocity includes speed and direction.','junior1');
  V('junior1','acceleration','加速度','/əkˌsel.əˈreɪ.ʃən/','Acceleration is change in velocity.','junior1');
  V('junior1','momentum','动量','/məˈmen.təm/','Momentum is mass times velocity.','junior1');
  V('junior1','energy','能量','/ˈen.ə.dʒi/','Energy cannot be created or destroyed.','junior1');
  V('junior1','molecule','分子','/ˈmɒl.ɪ.kjuːl/','Water is made of molecules.','junior1');
  V('junior1','element','元素','/ˈel.ɪ.mənt/','There are 118 known elements.','junior1');
  V('junior1','compound','化合物','/ˈkɒm.paʊnd/','Salt is a compound of sodium and chlorine.','junior1');
  V('junior1','reaction','反应','/riˈæk.ʃən/','A chemical reaction changes substances.','junior1');

  // ---------- Junior 2 / B2+: European science & maths ----------
  V('junior2','calculus','微积分','/ˈkæl.kjə.ləs/','Newton and Leibniz invented calculus.','junior2');
  V('junior2','derivative','导数','/dɪˈrɪv.ə.tɪv/','The derivative measures change.','junior2');
  V('junior2','integral','积分','/ˈɪn.tɪ.ɡrəl/','The integral calculates area under a curve.','junior2');
  V('junior2','logarithm','对数','/ˈlɒɡ.ər.ɪð.əm/','Logarithms simplify multiplication.','junior2');
  V('junior2','probability','概率','/ˌprɒb.əˈbɪl.ɪ.ti/','Probability measures likelihood.','junior2');
  V('junior2','statistics','统计学','/stəˈtɪs.tɪks/','Statistics analyze data.','junior2');
  V('junior2','quantum','量子','/ˈkwɒn.təm/','Quantum physics studies tiny particles.','junior2');
  V('junior2','relativity','相对论','/ˌrel.əˈtɪv.ɪ.ti/','Einstein\'s relativity changed physics.','junior2');
  V('junior2','radioactivity','放射性','/ˌreɪ.di.əʊ.ækˈtɪv.ɪ.ti/','Marie Curie discovered radioactivity.','junior2');
  V('junior2','radiation','辐射','/ˌreɪ.diˈeɪ.ʃən/','Radiation can be dangerous.','junior2');
  V('junior2','nuclear','核','/ˈnjuː.kli.ər/','Nuclear energy comes from splitting atoms.','junior2');
  V('junior2','catalyst','催化剂','/ˈkæt.əl.ɪst/','A catalyst speeds up a reaction.','junior2');
  V('junior2','electrolysis','电解','/iˌlekˈtrɒl.ɪ.sɪs/','Electrolysis splits water into gases.','junior2');
  V('junior2','oxidation','氧化','/ˌɒk.sɪˈdeɪ.ʃən/','Rust is oxidation of iron.','junior2');
  V('junior2','acid','酸','/ˈæs.ɪd/','Acids have a pH less than 7.','junior2');
  V('junior2','base','碱','/beɪs/','Bases have a pH more than 7.','junior2');
  V('junior2','chromosome','染色体','/ˈkrəʊ.mə.səʊm/','Humans have 23 pairs of chromosomes.','junior2');
  V('junior2','genetics','遗传学','/dʒəˈnet.ɪks/','Mendel is the father of genetics.','junior2');
  V('junior2','evolution','进化','/ˌiː.vəˈluː.ʃən/','Darwin studied evolution in the Galapagos.','junior2');
  V('junior2','species','物种','/ˈspiː.ʃiːz/','There are millions of species on Earth.','junior2');
  V('junior2','ecosystem','生态系统','/ˈiː.kəʊ.sɪs.təm/','An ecosystem includes all living things.','junior2');
  V('junior2','biodiversity','生物多样性','/ˌbaɪ.əʊ.daɪˈvɜː.sɪ.ti/','The Amazon has high biodiversity.','junior2');
  V('junior2','conservation','保护','/ˌkɒn.səˈveɪ.ʃən/','Conservation protects endangered species.','junior2');
  V('junior2','sustainable','可持续的','/səˈsteɪ.nə.bəl/','Sustainable development helps the planet.','junior2');
  V('junior2','renewable','可再生的','/rɪˈnjuː.ə.bəl/','Wind and solar are renewable energy.','junior2');
  V('junior2','carbon','碳','/ˈkɑː.bən/','Carbon dioxide causes global warming.','junior2');
  V('junior2','emission','排放','/ɪˈmɪʃ.ən/','We need to reduce carbon emissions.','junior2');
  V('junior2','climate','气候','/ˈklaɪ.mət/','Climate change is a global challenge.','junior2');
  V('junior2','european','欧洲的','/ˌjʊə.rəˈpiː.ən/','The EU leads in climate policy.','junior2');
  V('junior2','parliament','议会','/ˈpɑː.lɪ.mənt/','The European Parliament meets in Strasbourg.','junior2');

  // ---------- Junior 3 / C1: European integration & advanced topics ----------
  V('junior3','integration','一体化','/ˌɪn.tɪˈɡreɪ.ʃən/','European integration brings countries together.','junior3');
  V('junior3','sovereignty','主权','/ˈsɒv.rɪn.ti/','Countries share sovereignty in the EU.','junior3');
  V('junior3','subsidiarity','辅助性原则','/səbˌsɪd.iˈær.ɪ.ti/','Decisions are made at the closest level.','junior3');
  V('junior3','solidarity','团结','/ˌsɒl.ɪˈdær.ɪ.ti/','Solidarity means standing together.','junior3');
  V('junior3','diversity','多样性','/daɪˈvɜː.sɪ.ti/','Europe values cultural diversity.','junior3');
  V('junior3','multilingual','多语言的','/ˌmʌl.tiˈlɪŋ.ɡwəl/','The EU has 24 official languages.','junior3');
  V('junior3','constitution','宪法','/ˌkɒn.stɪˈtjuː.ʃən/','The EU has a constitutional treaty.','junior3');
  V('junior3','commission','委员会','/kəˈmɪʃ.ən/','The European Commission proposes laws.','junior3');
  V('junior3','directive','指令','/daɪˈrek.tɪv/','An EU directive sets goals for member states.','junior3');
  V('junior3','regulation','法规','/ˌreɡ.jʊˈleɪ.ʃən/','EU regulations apply directly in all members.','junior3');
  V('junior3','market','市场','/ˈmɑː.kɪt/','The single market allows free trade.','junior3');
  V('junior3','competition','竞争','/ˌkɒm.pəˈtɪʃ.ən/','EU competition law prevents monopolies.','junior3');
  V('junior3','consumer','消费者','/kənˈsjuː.mər/','Consumer rights are protected by EU law.','junior3');
  V('junior3','data','数据','/ˈdeɪ.tə/','The GDPR protects personal data.','junior3');
  V('junior3','privacy','隐私','/ˈprɪv.ə.si/','Privacy is a fundamental right.','junior3');
  V('junior3','digital','数字的','/ˈdɪdʒ.ɪ.təl/','The Digital Single Market connects Europe.','junior3');
  V('junior3','artificial','人工智能的','/ˌɑː.tɪˈfɪʃ.əl/','Artificial intelligence is transforming industry.','junior3');
  V('junior3','algorithm','算法','/ˈæl.ɡə.rɪð.əm/','An algorithm is a set of steps.','junior3');
  V('junior3','cybersecurity','网络安全','/ˌsaɪ.bə.sɪˈkjʊə.rɪ.ti/','EU cybersecurity laws protect citizens.','junior3');
  V('junior3','blockchain','区块链','/ˈblɒk.tʃeɪn/','Blockchain is a distributed ledger.','junior3');
  V('junior3','innovation','创新','/ˌɪn.əˈveɪ.ʃən/','Europe invests in green innovation.','junior3');
  V('junior3','research','研究','/rɪˈsɜːtʃ/','Horizon Europe funds research.','junior3');
  V('junior3','sustainability','可持续性','/səˌsteɪ.nəˈbɪl.ɪ.ti/','The Green Deal aims for sustainability.','junior3');
  V('junior3','neutrality','碳中和','/njuːˈtræl.ɪ.ti/','The EU aims for carbon neutrality by 2050.','junior3');
  V('junior3','biodiversity','生物多样性','/ˌbaɪ.əʊ.daɪˈvɜː.sɪ.ti/','The EU protects biodiversity.','junior3');
  V('junior3','circular','循环的','/ˈsɜː.kjə.lər/','The circular economy reduces waste.','junior3');
  V('junior3','european','欧洲的','/ˌjʊə.rəˈpiː.ən/','European citizenship gives rights across borders.','junior3');
  V('junior3','identity','身份','/aɪˈden.tɪ.ti/','European identity unites diverse cultures.','junior3');
  V('junior3','future','未来','/ˈfjuː.tʃər/','The future of Europe is shaped by young people.','junior3');
  V('junior3','democracy','民主','/dɪˈmɒk.rə.si/','European democracy is based on rule of law.','junior3');

  // ======================= GRAMMAR =======================
  const grammar = [
    { rule: 'Present Simple (一般现在时)', zh: '一般现在时表示经常发生的动作或存在的状态', en: 'I live in Europe. She speaks English.', example: 'The sun rises in the east. Cats like milk.' },
    { rule: 'Present Continuous (现在进行时)', zh: '现在进行时表示正在进行的动作', en: 'I am reading a book about Europe. She is studying French.', example: 'The children are playing in the park. It is raining in London.' },
    { rule: 'Past Simple (一般过去时)', zh: '一般过去时表示过去发生的动作', en: 'I visited Paris last year. She went to Rome.', example: 'The Romans built the Colosseum. Columbus discovered America in 1492.' },
    { rule: 'Past Continuous (过去进行时)', zh: '过去进行时表示过去某个时间正在进行的动作', en: 'I was walking in Berlin when it started to rain.', example: 'They were having dinner when the phone rang.' },
    { rule: 'Present Perfect (现在完成时)', zh: '现在完成时表示过去发生的动作对现在有影响', en: 'I have visited three European countries.', example: 'She has lived in Barcelona for five years.' },
    { rule: 'Future Simple (一般将来时)', zh: '一般将来时表示将要发生的动作', en: 'I will travel to Europe next summer.', example: 'The EU will launch a new environmental policy.' },
    { rule: 'Comparatives (比较级)', zh: '比较级用于比较两个事物', en: 'The Eiffel Tower is taller than the Arc de Triomphe.', example: 'German is more difficult than Italian.' },
    { rule: 'Superlatives (最高级)', zh: '最高级用于三个或以上事物的比较', en: 'Mont Blanc is the highest mountain in the Alps.', example: 'This is the most beautiful city in Europe.' },
    { rule: 'Countable vs Uncountable', zh: '可数名词和不可数名词的区别', en: 'I have many books (countable). I drink much water (uncountable).', example: 'There is some cheese on the table. There are several museums in the city.' },
    { rule: 'Articles (冠词 a/an/the)', zh: '不定冠词和定冠词的用法', en: 'A cat is an animal. The Eiffel Tower is in Paris.', example: 'The Rhine is a river in Europe. She is an artist from Italy.' },
    { rule: 'Prepositions of Place', zh: '表示位置的介词', en: 'The museum is on the left. The park is next to the library.', example: 'Vienna is in Austria. The cathedral is between the square and the river.' },
    { rule: 'Prepositions of Time', zh: '表示时间的介词', en: 'I go to school at 8 o\'clock. Christmas is in December.', example: 'The festival starts on Monday. I was born in 2010.' },
    { rule: 'Modal Verbs: Can/May/Must', zh: '情态动词的用法', en: 'I can speak French. You must visit the Louvre.', example: 'May I open the window? Students must do their homework.' },
    { rule: 'Conditionals: If-Clauses', zh: '条件句的用法', en: 'If it rains, I will stay home. If I were you, I would visit Spain.', example: 'If you study hard, you will learn English. If I had money, I would travel to Europe.' },
    { rule: 'Passive Voice (被动语态)', zh: '被动语态表示主语是动作的承受者', en: 'The Eiffel Tower was built in 1889.', example: 'Mona Lisa was painted by Leonardo da Vinci. English is spoken in many countries.' },
    { rule: 'Relative Clauses (定语从句)', zh: '定语从句修饰名词', en: 'The man who lives in Paris is my uncle.', example: 'The museum that I visited was amazing. This is the city where Mozart was born.' },
    { rule: 'Reported Speech (间接引语)', zh: '转述别人的话', en: 'She said that she was from Berlin.', example: 'He told me that he had visited Rome. The teacher said that the exam was next week.' },
    { rule: 'Gerunds and Infinitives', zh: '动名词和不定式的用法', en: 'I enjoy traveling. I want to learn German.', example: 'Swimming is good exercise. She decided to study in France.' },
    { rule: 'Phrasal Verbs (短语动词)', zh: '动词加介词的固定搭配', en: 'I look forward to your visit. She grew up in Spain.', example: 'Please turn off the lights. He gave up smoking. I get along with my classmates.' },
    { rule: 'Word Order (语序)', zh: '英语句子的基本语序', en: 'Subject + Verb + Object. I love European history.', example: 'She always eats breakfast. I never forget my homework.' },
    { rule: 'Question Formation (疑问句)', zh: '一般疑问句和特殊疑问句的构成', en: 'Do you speak French? Where is the Louvre?', example: 'Have you visited Rome? What time does the museum open?' },
    { rule: 'Negatives (否定句)', zh: '否定句的构成', en: 'I do not speak Italian. She has never been to Paris.', example: 'There is no cheese left. I can\'t find the museum.' },
    { rule: 'Possessives (所有格)', zh: '名词所有格和物主代词', en: 'This is Maria\'s book. The city\'s cathedral is old.', example: 'My house is near the park. Is this your pen? The cat is theirs.' },
    { rule: 'Adverbs of Frequency', zh: '频率副词的用法', en: 'I always brush my teeth. I sometimes eat pizza.', example: 'She never eats meat. They often visit museums. He usually walks to school.' },
    { rule: 'Connectors (连接词)', zh: '句子之间的连接词', en: 'I like Paris because it is beautiful. Although it rained, we enjoyed the trip.', example: 'She studied hard, so she passed. I want to visit Rome but it is far.' },
    { rule: 'There is/There are', zh: '表示存在的句型', en: 'There is a museum in the city. There are many parks in London.', example: 'There is some bread on the table. There are 27 countries in the EU.' },
  ];

  // ======================= SPEAKING =======================
  const speaking = [
    { zh: '你好，你叫什么名字？', en: 'Hello, what is your name?', topic: 'Greetings', zhPrompt: '学会用英语问好和自我介绍' },
    { zh: '你来自哪里？', en: 'Where are you from?', topic: 'Nationality', zhPrompt: '学会介绍自己的国籍和城市' },
    { zh: '你几岁了？', en: 'How old are you?', topic: 'Age', zhPrompt: '学会询问和回答年龄' },
    { zh: '你住在哪里？', en: 'Where do you live?', topic: 'Home', zhPrompt: '学会描述自己的住所' },
    { zh: '你有兄弟姐妹吗？', en: 'Do you have any brothers or sisters?', topic: 'Family', zhPrompt: '学会谈论家庭成员' },
    { zh: '你喜欢什么颜色？', en: 'What is your favorite color?', topic: 'Preferences', zhPrompt: '学会表达个人喜好' },
    { zh: '你早餐吃了什么？', en: 'What did you have for breakfast?', topic: 'Food', zhPrompt: '学会谈论日常饮食' },
    { zh: '今天天气怎么样？', en: 'What is the weather like today?', topic: 'Weather', zhPrompt: '学会描述天气状况' },
    { zh: '你最喜欢的科目是什么？', en: 'What is your favorite subject?', topic: 'School', zhPrompt: '学会谈论学校生活' },
    { zh: '你周末做了什么？', en: 'What did you do last weekend?', topic: 'Activities', zhPrompt: '学会描述过去的活动' },
    { zh: '你去过哪些国家？', en: 'Which countries have you visited?', topic: 'Travel', zhPrompt: '学会谈论旅行经历' },
    { zh: '你会说哪些语言？', en: 'What languages do you speak?', topic: 'Languages', zhPrompt: '学会谈论语言能力' },
    { zh: '你想去哪里旅行？', en: 'Where would you like to travel?', topic: 'Future Plans', zhPrompt: '学会表达未来计划' },
    { zh: '你喜欢什么音乐？', en: 'What music do you like?', topic: 'Music', zhPrompt: '学会谈论音乐品味' },
    { zh: '你平时做什么运动？', en: 'What sports do you do?', topic: 'Sports', zhPrompt: '学会谈论运动爱好' },
    { zh: '你最喜欢的电影是什么？', en: 'What is your favorite movie?', topic: 'Entertainment', zhPrompt: '学会谈论电影和电视' },
    { zh: '你的爱好是什么？', en: 'What are your hobbies?', topic: 'Hobbies', zhPrompt: '学会谈论兴趣爱好' },
    { zh: '你觉得学校怎么样？', en: 'What do you think about school?', topic: 'Opinions', zhPrompt: '学会表达个人观点' },
    { zh: '你长大想做什么？', en: 'What do you want to be when you grow up?', topic: 'Dreams', zhPrompt: '学会谈论未来职业' },
    { zh: '请描述你的家。', en: 'Please describe your house.', topic: 'Description', zhPrompt: '学会描述物体和场所' },
    { zh: '你怎样帮助家里？', en: 'How do you help at home?', topic: 'Responsibilities', zhPrompt: '学会谈论家庭责任' },
    { zh: '你最喜欢的节日是什么？', en: 'What is your favorite festival?', topic: 'Festivals', zhPrompt: '学会谈论节日和文化' },
    { zh: '你怎样保护环境？', en: 'How do you protect the environment?', topic: 'Environment', zhPrompt: '学会谈论环保行动' },
    { zh: '如果可以去欧洲任何地方，你想去哪？', en: 'If you could go anywhere in Europe, where would you go?', topic: 'Imagination', zhPrompt: '学会用条件句表达想象' },
    { zh: '你怎样学习英语？', en: 'How do you study English?', topic: 'Learning', zhPrompt: '学会谈论学习方法' },
  ];

  // ======================= WRITING PROMPTS =======================
  const writing = [
    { title: 'My Family', zh: '我的家庭', prompt_en: 'Write about your family. Who is in your family? What do you like to do together?', prompt_zh: '描写你的家庭。你家有哪些人？你们喜欢一起做什么？', words: '50-80' },
    { title: 'My Best Friend', zh: '我最好的朋友', prompt_en: 'Describe your best friend. How did you meet? What do you like about them?', prompt_zh: '描写你最好的朋友。你们是怎么认识的？你喜欢他们什么？', words: '60-100' },
    { title: 'My Dream Holiday', zh: '我的梦想假期', prompt_en: 'Where would you like to go on holiday in Europe? What would you do there?', prompt_zh: '你想去欧洲哪里度假？在那里你会做什么？', words: '80-120' },
    { title: 'A Day in My Life', zh: '我的一天', prompt_en: 'Describe a typical day in your life. What do you do from morning to evening?', prompt_zh: '描写你典型的一天。从早到晚你做什么？', words: '80-120' },
    { title: 'My Favorite Place', zh: '我最喜欢的地方', prompt_en: 'What is your favorite place? Why do you like it? What can you do there?', prompt_zh: '你最喜欢的地方是哪里？你为什么喜欢它？在那里可以做什么？', words: '60-100' },
    { title: 'If I Could Time Travel', zh: '如果我能穿越时空', prompt_en: 'If you could go back in time to any period in European history, when would you go and why?', prompt_zh: '如果你能穿越回欧洲历史的任何时期，你想去什么时候？为什么？', words: '100-150' },
    { title: 'My Favorite European Country', zh: '我最喜欢的欧洲国家', prompt_en: 'Which European country would you like to visit? What do you know about it?', prompt_zh: '你想去哪个欧洲国家？你对它了解多少？', words: '80-120' },
    { title: 'A Letter to My Pen Pal', zh: '给笔友的信', prompt_en: 'Write a letter to a pen pal in Europe. Introduce yourself and ask about their life.', prompt_zh: '给一位欧洲笔友写信。介绍你自己并询问他们的生活。', words: '100-150' },
    { title: 'My Favorite Story', zh: '我最喜欢的故事', prompt_en: 'Tell me about your favorite story. Who are the characters? What happens?', prompt_zh: '说说你最喜欢的故事。故事里有哪些人物？发生了什么？', words: '80-120' },
    { title: 'The Environment', zh: '环境保护', prompt_en: 'How can we help protect the environment? Write about things you can do at home and school.', prompt_zh: '我们如何帮助保护环境？写出你在家和学校可以做的事情。', words: '80-120' },
    { title: 'My School', zh: '我的学校', prompt_en: 'Describe your school. What subjects do you study? What is your favorite part?', prompt_zh: '描写你的学校。你学习哪些科目？你最喜欢什么？', words: '60-100' },
    { title: 'A Famous European', zh: '一位著名的欧洲人', prompt_en: 'Write about a famous person from Europe. What did they do? Why are they famous?', prompt_zh: '描写一位欧洲名人。他们做了什么？为什么出名？', words: '100-150' },
    { title: 'Technology in My Life', zh: '科技与生活', prompt_en: 'How does technology help you in your daily life? What are the good and bad things?', prompt_zh: '科技如何在日常生活中帮助你？好处和坏处是什么？', words: '80-120' },
    { title: 'My Dream Job', zh: '我的理想职业', prompt_en: 'What do you want to be when you grow up? Why does this job interest you?', prompt_zh: '你长大后想做什么？为什么对这个职业感兴趣？', words: '80-120' },
    { title: 'Why Learning Languages Matters', zh: '学习语言的意义', prompt_en: 'Why is it important to learn languages? How does it help you understand other cultures?', prompt_zh: '为什么学习语言很重要？它如何帮助你理解其他文化？', words: '100-150' },
  ];

  // ======================= READING COMPREHENSION =======================
  const reading = [
    {
      title: 'The Eiffel Tower',
      zh: '埃菲尔铁塔',
      en: 'The Eiffel Tower is in Paris, France. It was built in 1889 by Gustave Eiffel for the World Exhibition. The tower is 330 meters tall and was the tallest building in the world at that time. Today, about 7 million people visit it every year. At night, the tower lights up with thousands of sparkling lights.',
      zhText: '埃菲尔铁塔位于法国巴黎。它由古斯塔夫·埃菲尔在1889年为世界博览会建造。铁塔高330米，在当时是世界上最高的建筑。如今，每年约有700万人参观。到了晚上，铁塔会亮起数千盏闪烁的灯光。',
      questions: ['Where is the Eiffel Tower?', 'When was the Eiffel Tower built?', 'Who built the Eiffel Tower?', 'How tall is the tower?', 'How many people visit every year?'],
      answers: [['Paris'], ['1889'], ['Gustave Eiffel'], ['330 meters', '330m'], ['7 million']]
    },
    {
      title: 'The Colosseum',
      zh: '罗马斗兽场',
      en: 'The Colosseum is in Rome, Italy. It was built almost 2,000 years ago by the Roman Empire. It could hold up to 80,000 people. Gladiators fought there. Today, the Colosseum is one of the most popular tourist attractions in the world. It is a symbol of ancient Roman engineering.',
      zhText: '罗马斗兽场位于意大利罗马。它由罗马帝国在近2000年前建造。最多可容纳8万人。角斗士曾在此战斗。如今，斗兽场是世界上最受欢迎的旅游景点之一。它是古罗马工程的象征。',
      questions: ['Where is the Colosseum?', 'How old is the Colosseum?', 'How many people could it hold?', 'Who fought there?', 'What is the Colosseum a symbol of?'],
      answers: [['Rome'], ['2000', '2,000', '2000 years'], ['80000', '80,000', '80 thousand'], ['Gladiators'], ['Roman engineering', 'ancient Roman engineering']]
    },
    {
      title: 'The Northern Lights',
      zh: '北极光',
      en: 'The Northern Lights, also called Aurora Borealis, are a beautiful natural light show in the sky. You can see them in the northern parts of Europe, like Norway, Sweden, Finland, and Iceland. The best time to see them is in winter when the nights are long. The lights are green, purple, and blue.',
      zhText: '北极光（Aurora Borealis）是天空中美妙的自然光景。在欧洲北部如挪威、瑞典、芬兰和冰岛可以看到。观赏的最佳时间是冬季的漫长夜晚。北极光呈现绿色、紫色和蓝色。',
      questions: ['What are the Northern Lights also called?', 'Where can you see them?', 'When is the best time to see them?', 'What colors are the lights?'],
      answers: [['Aurora Borealis'], ['Norway', 'Sweden', 'Finland', 'Iceland', 'northern Europe'], ['winter'], ['green', 'purple', 'blue']]
    },
    {
      title: 'The Renaissance',
      zh: '文艺复兴',
      en: 'The Renaissance was a period of great art and learning in Europe. It began in Italy in the 14th century and spread across Europe. Famous artists like Leonardo da Vinci and Michelangelo created masterpieces. Scientists like Galileo made discoveries. The printing press was invented, helping ideas spread quickly.',
      zhText: '文艺复兴是欧洲艺术和学术的伟大时期。它始于14世纪的意大利，随后传遍欧洲。达芬奇和米开朗基罗等著名艺术家创作了杰作。伽利略等科学家有了新的发现。印刷术的发明帮助思想快速传播。',
      questions: ['What was the Renaissance?', 'Where did the Renaissance begin?', 'When did it begin?', 'Name one famous Renaissance artist.', 'What invention helped ideas spread?'],
      answers: [['art and learning', 'great art and learning'], ['Italy'], ['14th century', '1300s'], ['Leonardo da Vinci', 'Michelangelo', 'Raphael'], ['printing press']]
    },
    {
      title: 'The European Union',
      zh: '欧盟',
      en: 'The European Union (EU) is a group of 27 European countries. It started after World War II to create peace and cooperation. The EU has a single market where goods, services, and people can move freely. The Euro is the currency used by 20 EU countries. The EU flag has 12 gold stars on a blue background.',
      zhText: '欧盟是一个由27个欧洲国家组成的组织。它始于二战之后，旨在促进和平与合作。欧盟拥有单一市场，商品、服务和人员可以自由流通。欧元是20个欧盟国家使用的货币。欧盟旗帜是蓝底上12颗金星。',
      questions: ['How many countries are in the EU?', 'Why was the EU started?', 'What is the single market?', 'What currency do EU countries use?', 'How many stars are on the EU flag?'],
      answers: [['27'], ['peace and cooperation', 'peace', 'cooperation'], ['free movement of goods, services, and people'], ['Euro'], ['12']]
    },
    {
      title: 'Beethoven',
      zh: '贝多芬',
      en: 'Ludwig van Beethoven was a famous German composer. He was born in Bonn in 1770. He wrote beautiful music even though he became deaf later in his life. His most famous works include the Fifth Symphony, Für Elise, and Ode to Joy. His music is loved by people all over the world.',
      zhText: '路德维希·凡·贝多芬是著名的德国作曲家。他1770年出生于波恩。尽管后来失聪，他仍然创作了美妙的音乐。他最著名的作品包括第五交响曲、《致爱丽丝》和《欢乐颂》。他的音乐受到全世界人民的喜爱。',
      questions: ['Who was Ludwig van Beethoven?', 'Where was he born?', 'When was he born?', 'What happened to him later in life?', 'Name one of his famous works.'],
      answers: [['composer', 'German composer'], ['Bonn'], ['1770'], ['deaf', 'became deaf', 'lost his hearing'], ['Fifth Symphony', 'Für Elise', 'Ode to Joy']]
    },
    {
      title: 'The Vikings',
      zh: '维京人',
      en: 'The Vikings were people from Scandinavia (now Norway, Sweden, and Denmark). They lived from about 800 to 1100 AD. Vikings were skilled sailors who traveled in longboats. They explored, traded, and settled in many parts of Europe. They also discovered Iceland and Greenland.',
      zhText: '维京人来自斯堪的纳维亚（现在的挪威、瑞典和丹麦）。他们生活在公元800年至1100年左右。维京人是熟练的水手，乘坐长船航行。他们在欧洲许多地方探索、贸易和定居。他们还发现了冰岛和格陵兰。',
      questions: ['Where did the Vikings come from?', 'When did the Vikings live?', 'What kind of boats did they use?', 'What did Vikings do?', 'Which places did they discover?'],
      answers: [['Scandinavia', 'Norway', 'Sweden', 'Denmark'], ['800 to 1100', '800-1100'], ['longboats'], ['explored', 'traded', 'settled'], ['Iceland', 'Greenland']]
    },
    {
      title: 'The Euro. Currency',
      zh: '欧元货币',
      en: 'The euro is the currency of the European Union. It was introduced in 1999 for electronic payments and in 2002 as coins and banknotes. Today, 20 EU countries use the euro. The coins have one common side and one side with a national design. The banknotes show bridges and arches representing European architecture.',
      zhText: '欧元是欧盟的货币。它在1999年以电子支付形式引入，2002年开始有硬币和纸币。如今，20个欧盟国家使用欧元。硬币有一面是统一的，另一面是各国特色设计。纸币上印有代表欧洲建筑的桥梁和拱门。',
      questions: ['When was the euro introduced?', 'How many EU countries use the euro?', 'What do the banknotes show?'],
      answers: [['1999'], ['20'], ['bridges and arches', 'European architecture']]
    },
  ];

  // ======================= SPELLING WORDS =======================
  const spelling = [
    { level: '初级', words: ['cat', 'dog', 'sun', 'red', 'big', 'run', 'hat', 'bed', 'cup', 'egg', 'fish', 'book', 'tree', 'star', 'milk', 'bird', 'door', 'hand', 'frog', 'bell', 'lamp', 'rain', 'soap', 'tent', 'apple', 'happy', 'water', 'green', 'music', 'dance'] },
    { level: '中级', words: ['school', 'teacher', 'friend', 'family', 'market', 'train', 'river', 'castle', 'church', 'bridge', 'garden', 'forest', 'island', 'mountain', 'museum', 'palace', 'statue', 'temple', 'fountain', 'square', 'canal', 'gondola', 'pasta', 'cheese', 'chocolate', 'waffle', 'sandwich', 'salad', 'olive', 'piano'] },
    { level: '高级', words: ['Europe', 'country', 'capital', 'ancient', 'cathedral', 'scientist', 'experiment', 'microscope', 'telescope', 'electricity', 'discover', 'invent', 'gravity', 'volcano', 'glacier', 'pollution', 'environment', 'recycle', 'energy', 'climate', 'temperature', 'renaissance', 'civilization', 'democracy', 'revolution', 'industrial', 'literature', 'symphony', 'orchestra', 'ballet'] },
    { level: 'C1', words: ['philosophy', 'hypothesis', 'theory', 'evolution', 'genetics', 'biodiversity', 'conservation', 'sustainable', 'renewable', 'emission', 'parliament', 'constitution', 'sovereignty', 'solidarity', 'diversity', 'integration', 'regulation', 'competition', 'innovation', 'technology', 'algorithm', 'cybersecurity', 'blockchain', 'artificial', 'sustainability', 'neutrality', 'identity', 'democracy', 'multilingual', 'consumer'] }
  ];

  // ======================= CONTENT (for fetchContent API) =======================
  const content = {};
  function addContent(cat, items) {
    content[cat] = items;
  }

  // --- Science: Biology ---
  addContent('science_biology', [
    { title: 'European Forests', content: 'Europe has many types of forests. The Białowieża Forest in Poland is one of the last primeval forests in Europe. It is home to the European bison, the continent\'s heaviest land animal. Other forests like the Black Forest in Germany and the Forest of Fontainebleau in France have oak, beech, and pine trees.', content_zh: '欧洲有多种森林。波兰的比亚沃维耶扎森林是欧洲最后的原始森林之一。它是欧洲野牛的家园，这是欧洲最重的陆地动物。德国的黑森林和法国的枫丹白露森林等森林中生长着橡树、山毛榉和松树。' },
    { title: 'Alpine Animals', content: 'The Alps are home to unique animals. The Alpine ibex lives on high cliffs. The chamois can jump from rock to rock. Marmots whistle to warn each other. The golden eagle soars above the mountains. These animals have adapted to the cold mountain environment.', content_zh: '阿尔卑斯山是独特动物的家园。阿尔卑斯野山羊生活在高耸的悬崖上。岩羚羊可以在岩石间跳跃。旱獭通过吹口哨互相警告。金雕在山峰上空翱翔。这些动物已经适应了寒冷的高山环境。' },
    { title: 'Mediterranean Wildlife', content: 'The Mediterranean region has rich wildlife. The loggerhead sea turtle nests on Greek beaches. The monk seal lives in the Mediterranean Sea. Flamingos gather in the Camargue region of France. The Iberian lynx, found only in Spain, is one of the rarest cats in the world.', content_zh: '地中海地区有丰富的野生动物。蠵龟在希腊海滩筑巢。僧海豹生活在地中海。火烈鸟聚集在法国的卡马格地区。仅在西班牙发现的伊比利亚猞猁是世界上最稀有的猫科动物之一。' },
  ]);

  // --- Science: Chemistry ---
  addContent('science_chemistry', [
    { title: 'Famous European Chemists', content: 'Marie Curie was born in Poland and discovered radioactivity. She won two Nobel Prizes. Antoine Lavoisier, the father of modern chemistry, was French. He discovered oxygen\'s role in burning. Dmitri Mendeleev, a Russian chemist, created the periodic table of elements in 1869.', content_zh: '玛丽·居里出生于波兰，发现了放射性。她两次获得诺贝尔奖。安托万·拉瓦锡是现代化学之父，他是法国人。他发现了氧气在燃烧中的作用。俄罗斯化学家德米特里·门捷列夫于1869年创建了元素周期表。' },
    { title: 'Water: The Universal Solvent', content: 'Water is called the universal solvent because it dissolves many substances. In chemistry class, European students learn that water molecules are polar. The oxygen atom has a slight negative charge, and the hydrogen atoms have a slight positive charge. This polarity helps water dissolve salts, sugars, and acids.', content_zh: '水被称为万能溶剂，因为它能溶解许多物质。在欧洲化学课上，学生学习水分子是极性的。氧原子带轻微负电荷，氢原子带轻微正电荷。这种极性帮助水溶解盐、糖和酸。' },
  ]);

  // --- Science: Physics ---
  addContent('science_physics', [
    { title: 'Galileo and the Telescope', content: 'Galileo Galilei was an Italian scientist. In 1609, he improved the telescope and used it to study the sky. He discovered Jupiter\'s moons, Saturn\'s rings, and the phases of Venus. His observations showed that the Earth orbits the Sun, which was a revolutionary idea at the time.', content_zh: '伽利略·伽利莱是意大利科学家。1609年，他改进了望远镜并用它研究天空。他发现了木星的卫星、土星的光环和金星的相位。他的观测表明地球绕太阳运行，这在当时是一个革命性的想法。' },
    { title: 'Newton and Gravity', content: 'Isaac Newton was an English scientist. Legend says he saw an apple fall from a tree and wondered why it fell straight down. This led him to discover gravity. He also discovered the laws of motion. His book "Principia Mathematica" is one of the most important science books ever written.', content_zh: '艾萨克·牛顿是英国科学家。传说他看到苹果从树上掉下来，想知道为什么它直直地落下。这引导他发现了万有引力。他还发现了运动定律。他的著作《自然哲学的数学原理》是有史以来最重要的科学著作之一。' },
  ]);

  // --- Science: Geology ---
  addContent('science_geology', [
    { title: 'Mount Vesuvius', content: 'Mount Vesuvius is a volcano near Naples, Italy. In 79 AD, it erupted and destroyed the city of Pompeii. The city was buried under ash and mud, preserving it for centuries. Today, Vesuvius is still an active volcano. Scientists monitor it carefully to predict future eruptions.', content_zh: '维苏威火山是意大利那不勒斯附近的一座火山。公元79年，它喷发摧毁了庞贝城。城市被火山灰和泥土掩埋，保存了许多世纪。今天，维苏威火山仍然活跃。科学家们密切关注它以预测未来的喷发。' },
    { title: 'The Alps: Europe\'s Mountain Range', content: 'The Alps are the highest mountain range in Europe. They stretch across 8 countries: France, Switzerland, Italy, Germany, Austria, Slovenia, Liechtenstein, and Monaco. Mont Blanc is the highest peak at 4,809 meters. The Alps were formed millions of years ago when tectonic plates collided.', content_zh: '阿尔卑斯山是欧洲最高的山脉。它横跨8个国家：法国、瑞士、意大利、德国、奥地利、斯洛文尼亚、列支敦士登和摩纳哥。勃朗峰是最高峰，海拔4809米。阿尔卑斯山是在数百万年前地壳板块碰撞形成的。' },
  ]);

  // --- Science: Astronomy ---
  addContent('science_astronomy', [
    { title: 'Copernicus and the Solar System', content: 'Nicolaus Copernicus was a Polish astronomer. In 1543, he proposed that the Sun, not the Earth, is the center of the solar system. This idea, called the heliocentric model, changed astronomy forever. Previously, people thought the Earth was the center of everything.', content_zh: '尼古拉·哥白尼是波兰天文学家。1543年，他提出太阳而不是地球是太阳系的中心。这个被称为日心说的想法永远改变了天文学。在此之前，人们认为地球是万物的中心。' },
    { title: 'European Space Agency', content: 'The European Space Agency (ESA) was founded in 1975. It has 22 member countries. ESA launches satellites for science, communication, and Earth observation. The Ariane rocket is Europe\'s launch vehicle. ESA also works with NASA on international space projects, including the International Space Station.', content_zh: '欧洲空间局（ESA）成立于1975年，有22个成员国。ESA发射用于科学、通信和地球观测的卫星。阿丽亚娜火箭是欧洲的运载火箭。ESA还与NASA在国际太空项目上合作，包括国际空间站。' },
  ]);

  // --- Math: Geometry ---
  addContent('math_geometry', [
    { title: 'Euclid: Father of Geometry', content: 'Euclid was a Greek mathematician who lived around 300 BC. He wrote "Elements", one of the most influential books in mathematics. In it, he described points, lines, angles, and shapes. His work is still used in geometry classes today.', content_zh: '欧几里得是生活在公元前300年左右的希腊数学家。他写了《几何原本》，这是数学史上最有影响力的著作之一。在书中，他描述了点、线、角度和形状。他的工作至今仍在几何课上使用。' },
    { title: 'Shapes in Architecture', content: 'European architecture uses many geometric shapes. The dome of St. Peter\'s Basilica in Vatican City is a perfect hemisphere. Gothic cathedrals use pointed arches (two intersecting circles). The Leaning Tower of Pisa is a cylinder. The Colosseum uses arches in an oval shape.', content_zh: '欧洲建筑使用了许多几何形状。梵蒂冈圣彼得大教堂的穹顶是完美的半球体。哥特式大教堂使用尖拱（两个相交的圆）。比萨斜塔是圆柱体。罗马斗兽场在椭圆形状中使用拱门。' },
  ]);

  // --- Math: Measurement ---
  addContent('math_measurement', [
    { title: 'The Metric System', content: 'The metric system was invented in France during the French Revolution. It uses meters for length, grams for mass, and liters for volume. Almost all European countries use the metric system. It is easy to use because it is based on powers of 10: 1 meter = 100 cm = 1000 mm.', content_zh: '公制是在法国大革命期间在法国发明的。它使用米表示长度，克表示质量，升表示体积。几乎所有欧洲国家都使用公制。因为它基于10的幂，所以易于使用：1米=100厘米=1000毫米。' },
    { title: 'Time: From Sundials to Atomic Clocks', content: 'Europeans have measured time for thousands of years. The ancient Greeks used sundials. In the Middle Ages, mechanical clocks appeared in church towers. Big Ben in London is a famous clock. Today, the most accurate clocks are atomic clocks, used for GPS and scientific research.', content_zh: '欧洲人已经测量了数千年时间。古希腊人使用日晷。在中世纪，机械钟出现在教堂塔楼上。伦敦的大本钟是著名的时钟。如今，最精确的是原子钟，用于GPS和科学研究。' },
  ]);

  // --- Stories: Fairy Tales ---
  addContent('stories_fairy_tales', [
    { title: 'Cinderella (灰姑娘)', content: 'Once upon a time, a kind girl named Cinderella lived with her cruel stepmother and stepsisters. She had to work all day while they went to the prince\'s ball. Her fairy godmother appeared and gave her a beautiful dress and glass slippers. At the ball, the prince fell in love with her. She left at midnight, losing a slipper. The prince searched for the girl whose foot fit the slipper, and they lived happily ever after.', content_zh: '从前，一位名叫灰姑娘的善良女孩和她残忍的继母及继姐妹住在一起。当她们去参加王子的舞会时，灰姑娘必须整天工作。她的仙女教母出现了，给了她美丽的裙子和水晶鞋。在舞会上，王子爱上了她。她在午夜离开时丢了一只鞋。王子寻找脚能穿上那只鞋的女孩，他们从此幸福地生活在一起。' },
    { title: 'Little Red Riding Hood (小红帽)', content: 'Little Red Riding Hood went to visit her grandmother in the forest. A wolf saw her and ran to the grandmother\'s house first. He ate the grandmother and dressed in her clothes. When Red Riding Hood arrived, she noticed the wolf\'s big eyes, ears, and teeth. "All the better to eat you with!" said the wolf. A hunter heard and saved them both.', content_zh: '小红帽去森林里看望她的奶奶。一只狼看见了她，先跑到奶奶家。它把奶奶吃了，穿上奶奶的衣服。小红帽到了之后，注意到狼的大眼睛、大耳朵和大牙。"为了更好地吃你！"狼说。一位猎人听到声音救了她们。' },
    { title: 'Snow White (白雪公主)', content: 'A queen wished for a daughter with skin as white as snow. Her wish came true, but she died. The new queen was jealous of Snow White\'s beauty. She ordered a huntsman to kill her, but he let her go. Snow White found seven dwarfs who took her in. The queen disguised herself and gave Snow White a poisoned apple. A prince\'s kiss broke the spell.', content_zh: '一位王后想要一个皮肤像雪一样白的女儿。她的愿望实现了，但她去世了。新王后嫉妒白雪公主的美貌。她命令猎人杀死白雪公主，但猎人放走了她。白雪公主找到了七个小矮人，他们收留了她。王后伪装自己，给了白雪公主一个毒苹果。王子的亲吻解除了魔法。' },
    { title: 'The Pied Piper (花衣魔笛手)', content: 'The town of Hamelin was overrun with rats. A piper in colorful clothes offered to get rid of them for a payment. He played his pipe, and all the rats followed him into the river. When the townspeople refused to pay, he played again. This time, all the children followed him into a mountain and were never seen again.', content_zh: '哈梅林镇到处都是老鼠。一位穿着彩色衣服的吹笛人提出可以收钱赶走老鼠。他吹起笛子，所有老鼠都跟着他进了河里。当镇民拒绝付钱时，他又吹起了笛子。这次，所有孩子都跟着他走进了一座山，再也没有出现过。' },
  ]);

  // --- Stories: Bedtime ---
  addContent('stories_bedtime', [
    { title: 'The Star Child (星星孩子)', content: 'Every night, a little star looked down at the Earth. It wanted to play with the children it saw. One night, it wished so hard that it fell from the sky. A little girl found it and became its friend. The star child showed her the wonders of the night sky. In the morning, the star had to return, but it promised to shine extra bright for her every night.', content_zh: '每天晚上，一颗小星星俯视着地球。它想和看到的小朋友们一起玩。一天晚上，它太想这样做了，以至于从天上掉了下来。一个小女孩发现了它并和它成了朋友。星星孩子向她展示了夜空的奇迹。早上，星星不得不回去，但它答应每晚为她特别明亮地闪耀。' },
    { title: 'The Moonlit Garden (月光花园)', content: 'In a small village in France, there was a secret garden that only bloomed under the moonlight. Marie, a little girl, discovered it one night. The flowers glowed with silver light and the fireflies danced. An old gardener told her the garden was magical, and only kind-hearted children could see it. Marie visited every full moon and learned the secrets of the night-blooming flowers.', content_zh: '在法国的一个小村庄里，有一个只在月光下绽放的秘密花园。一个小女孩玛丽在一天晚上发现了它。花朵散发着银色的光芒，萤火虫在跳舞。一位老园丁告诉她这个花园很神奇，只有善良的孩子才能看到它。玛丽每个满月都来，学会了夜间开花植物的秘密。' },
    { title: 'The Little Lighthouse (小灯塔)', content: 'On the coast of Ireland, a small lighthouse stood on the cliffs. Every night, it guided ships safely to harbor. One stormy night, the light went out. A brave boy named Sean climbed up with his lantern and kept it lit all night. The ships were saved. From then on, everyone called him "the little lighthouse keeper".', content_zh: '在爱尔兰海岸上，一座小灯塔矗立在悬崖上。每晚，它都指引船只安全入港。在一个暴风雨的夜晚，灯灭了。一个叫肖恩的勇敢男孩提着他的灯笼爬上去，整晚都让灯亮着。船只得救了。从那时起，大家都叫他"小灯塔守护者"。' },
  ]);

  // --- Stories: Fables ---
  addContent('stories_fables', [
    { title: 'The Tortoise and the Hare (龟兔赛跑)', content: 'A hare always made fun of a tortoise for being slow. "Let\'s have a race!" said the tortoise. The hare ran very fast and got so far ahead that he decided to take a nap. The tortoise kept walking slowly but steadily. When the hare woke up, the tortoise was about to cross the finish line. Slow and steady wins the race.', content_zh: '兔子总是嘲笑乌龟爬得慢。"我们赛跑吧！"乌龟说。兔子跑得很快，远远领先，于是决定打个盹。乌龟继续慢慢地但稳定地走着。当兔子醒来时，乌龟即将冲过终点线。稳扎稳打赢得比赛。' },
    { title: 'The Boy Who Cried Wolf (狼来了)', content: 'A shepherd boy was bored watching his sheep. He shouted "Wolf! Wolf!" even though there was no wolf. The villagers came running to help. They were angry when they found no wolf. He did it again. Later, a real wolf came. When the boy cried for help, nobody believed him. The wolf attacked the sheep. The lesson: nobody believes a liar.', content_zh: '一个放羊的男孩觉得看羊很无聊。他大喊"狼来了！狼来了！"即使根本没有狼。村民们跑来帮忙。当他们发现没有狼时很生气。他又做了一次。后来，真来了一只狼。当男孩呼救时，没人相信他。狼袭击了羊群。教训：没人相信说谎者。' },
  ]);

  // --- Music ---
  addContent('music_rhymes', [
    { title: 'Frère Jacques (雅克兄弟)', content: 'Frère Jacques, Frère Jacques, Dormez-vous? Dormez-vous? Sonnez les matines! Sonnez les matines! Ding, dang, dong. Ding, dang, dong. This French nursery rhyme is known all over the world. Children sing it as a round, with different groups starting at different times.', content_zh: '雅克兄弟，雅克兄弟，你还睡吗？你还睡吗？晨钟已敲响！晨钟已敲响！叮当咚。叮当咚。这首法国儿歌全世界都知道。孩子们把它作为轮唱歌曲，不同的小组在不同时间开始唱。' },
    { title: 'Twinkle Twinkle Little Star', content: 'Twinkle, twinkle, little star, How I wonder what you are! Up above the world so high, Like a diamond in the sky. This song was written by English poet Jane Taylor in 1806. The melody is from a French tune "Ah! vous dirai-je, Maman" which was also used by Mozart for his variations.', content_zh: '一闪一闪亮晶晶，满天都是小星星。挂在天上放光明，好像许多小眼睛。这首歌由英国诗人简·泰勒在1806年创作。旋律来自法国曲调"啊！妈妈请听我说"，莫扎特也用它创作了变奏曲。' },
  ]);
  addContent('music_instruments', [
    { title: 'The Violin', content: 'The violin is a string instrument played with a bow. It has four strings tuned to G, D, A, and E. The violin family includes the viola, cello, and double bass. Famous violin makers like Stradivari from Italy made violins that are still played today. The violin is important in classical music, folk music, and jazz.', content_zh: '小提琴是用弓演奏的弦乐器。它有四根弦，调音为G、D、A和E。提琴家族包括中提琴、大提琴和低音提琴。意大利的斯特拉迪瓦里等著名制琴师制作的小提琴至今仍在演奏。小提琴在古典音乐、民间音乐和爵士乐中都很重要。' },
    { title: 'The Piano', content: 'The piano was invented in Italy around 1700 by Bartolomeo Cristofori. It has 88 keys: 52 white and 36 black. The piano is called "pianoforte" which means "soft-loud" in Italian, because it can play both soft and loud sounds. Famous European composers like Mozart, Beethoven, and Chopin wrote beautiful piano music.', content_zh: '钢琴由巴尔托洛梅奥·克里斯托福里在1700年左右在意大利发明。它有88个琴键：52个白键和36个黑键。钢琴在意大利语中叫"pianoforte"，意思是"轻柔-响亮"，因为它既能弹奏轻柔也能弹奏响亮的声音。莫扎特、贝多芬和肖邦等著名欧洲作曲家创作了优美的钢琴曲。' },
  ]);
  addContent('music_classical', [
    { title: 'Mozart', content: 'Wolfgang Amadeus Mozart was born in Salzburg, Austria in 1756. He was a child prodigy, composing music at age 5. He wrote over 600 works, including symphonies, operas, and chamber music. His most famous works include "Eine kleine Nachtmusik", "The Magic Flute", and his Requiem. Mozart\'s music is known for its beauty and perfection.', content_zh: '沃尔夫冈·阿马德乌斯·莫扎特1756年出生于奥地利的萨尔茨堡。他是神童，5岁就开始作曲。他写了600多部作品，包括交响曲、歌剧和室内乐。他最著名的作品包括《小夜曲》、《魔笛》和《安魂曲》。莫扎特的音乐以优美和完美著称。' },
    { title: 'Beethoven', content: 'Ludwig van Beethoven was born in Bonn, Germany in 1770. He began losing his hearing in his late 20s but continued composing. His Third Symphony "Eroica" was originally dedicated to Napoleon. His Fifth Symphony has one of the most famous openings in music. His Ninth Symphony includes "Ode to Joy", now the EU\'s anthem.', content_zh: '路德维希·凡·贝多芬1770年出生于德国波恩。他在20多岁时开始失聪，但继续作曲。他的第三交响曲"英雄"原本献给拿破仑。他的第五交响曲有音乐史上最著名的开头之一。他的第九交响曲包含《欢乐颂》，现在是欧盟的盟歌。' },
  ]);
  addContent('music_singing', [
    { title: 'Ode to Joy', content: '"Ode to Joy" is the anthem of the European Union. The melody is from Beethoven\'s Ninth Symphony. The poem was written by Friedrich Schiller in 1785. It celebrates brotherhood and joy: "Alle Menschen werden Brüder" (All men become brothers).', content_zh: '《欢乐颂》是欧盟的盟歌。旋律来自贝多芬的第九交响曲。诗歌由弗里德里希·席勒于1785年创作。它歌颂博爱与欢乐："Alle Menschen werden Brüder"（所有人类成为兄弟）。' },
    { title: 'European Folk Songs', content: 'Every European country has traditional folk songs. "Scarborough Fair" is from England. "Au clair de la lune" is a French folk song. "Die Gedanken sind frei" is a German freedom song. These songs tell stories of love, nature, and daily life.', content_zh: '每个欧洲国家都有传统民歌。《斯卡布罗集市》来自英国。《月光下》是法国民歌。《思想是自由的》是德国自由之歌。这些歌曲讲述爱情、自然和日常生活。' },
  ]);

  // --- Arts ---
  addContent('arts_painting', [
    { title: 'Leonardo da Vinci', content: 'Leonardo da Vinci was an Italian artist and inventor. He painted the "Mona Lisa" which is in the Louvre Museum in Paris. He also painted "The Last Supper" in Milan. Leonardo was not just an artist; he also studied anatomy, engineering, and flight. He filled notebooks with his inventions and observations.', content_zh: '列奥纳多·达芬奇是意大利艺术家和发明家。他绘制了存放在巴黎卢浮宫的《蒙娜丽莎》。他还在米兰绘制了《最后的晚餐》。达芬奇不仅是艺术家，他还研究解剖学、工程学和飞行。他的笔记本里记满了发明和观察记录。' },
    { title: 'Vincent van Gogh', content: 'Vincent van Gogh was a Dutch painter. He is famous for his bold colors and dramatic brushstrokes. He painted "Starry Night", "Sunflowers", and many self-portraits. During his life, he sold only one painting. Today, his paintings are among the most expensive in the world. He worked in France, where he created most of his famous works.', content_zh: '文森特·梵高是荷兰画家。他以大胆的色彩和戏剧性的笔触闻名。他绘制了《星夜》、《向日葵》和许多自画像。他一生中只卖出一幅画。如今，他的画作是世界上最昂贵的之一。他在法国工作，在那里创作了大部分著名作品。' },
  ]);
  addContent('arts_drawing', [
    { title: 'European Sketching Techniques', content: 'European artists developed many drawing techniques. Leonardo da Vinci used sfumato, a technique that blends colors smoothly. Albrecht Dürer from Germany was a master of detail in his drawings. Rembrandt used light and shadow, called chiaroscuro. These techniques are still taught in art schools today.', content_zh: '欧洲艺术家发展了许多绘画技法。达芬奇使用晕涂法，平滑地融合色彩。德国的阿尔布雷希特·丢勒是细节大师。伦勃朗使用光影对比，即明暗对照法。这些技法至今仍在艺术学校教授。' },
    { title: 'How to Sketch a Landscape', content: 'Start by drawing the horizon line one-third from the top. Add the largest shapes first: mountains, buildings, trees. Then add smaller details like windows and leaves. Use hatching (parallel lines) for shadows. European landscape artists like Constable and Turner painted nature scenes. Practice sketching outdoors like they did!', content_zh: '从在三分之一处画地平线开始。先画最大的形状：山、建筑、树。然后添加较小的细节如窗户和树叶。用排线法画阴影。像康斯太勃尔和透纳这样的欧洲风景画家描绘自然场景。像他们一样在户外练习素描！' },
  ]);
  addContent('arts_sculpture', [
    { title: 'Michelangelo', content: 'Michelangelo was an Italian sculptor, painter, and architect. His most famous sculpture is "David", carved from a single block of marble. He also sculpted "Pietà" in St. Peter\'s Basilica. He painted the ceiling of the Sistine Chapel in Vatican City. Michelangelo is considered one of the greatest artists of all time.', content_zh: '米开朗基罗是意大利雕塑家、画家和建筑师。他最著名的雕塑是《大卫》，由一整块大理石雕刻而成。他还在圣彼得大教堂雕刻了《哀悼基督》。他绘制了梵蒂冈西斯廷教堂的天顶画。米开朗基罗被认为是有史以来最伟大的艺术家之一。' },
  ]);
  addContent('arts_drama', [
    { title: 'Shakespeare', content: 'William Shakespeare was an English playwright and poet. He wrote about 38 plays, including "Romeo and Juliet", "Hamlet", and "Macbeth". His plays are performed more often than any other playwright\'s. He invented many words and phrases still used today. His theater, the Globe, has been rebuilt in London.', content_zh: '威廉·莎士比亚是英国剧作家和诗人。他写了大约38部戏剧，包括《罗密欧与朱丽叶》、《哈姆雷特》和《麦克白》。他的戏剧演出频率超过任何其他剧作家。他发明了许多至今仍使用的单词和短语。他的剧院——环球剧场已经在伦敦重建。' },
  ]);
  addContent('arts_crafts', [
    { title: 'Venetian Glass', content: 'Venice, Italy is famous for its glass-making tradition. Venetian glassmakers on the island of Murano have been making beautiful glass art for over 700 years. They create colorful vases, jewelry, and decorations. The techniques are passed down from master to apprentice. Venetian glass is known worldwide for its quality and beauty.', content_zh: '意大利威尼斯以玻璃制造传统闻名。穆拉诺岛上的威尼斯玻璃工匠制作精美玻璃艺术已超过700年。他们创造彩色花瓶、珠宝和装饰品。技术从师傅传给学徒。威尼斯玻璃以其品质和美感闻名于世。' },
  ]);

  // --- Technology ---
  addContent('tech_coding', [
    { title: 'Introduction to Python', content: 'Python was created by Dutch programmer Guido van Rossum in 1991. It is a programming language that is easy to learn. Python is used for web development, data science, artificial intelligence, and more. Many European schools teach Python as the first programming language.', content_zh: 'Python由荷兰程序员吉多·范罗苏姆于1991年创建。它是一种易于学习的编程语言。Python用于网页开发、数据科学、人工智能等领域。许多欧洲学校将Python作为第一门编程语言教授。' },
    { title: 'What is an Algorithm?', content: 'An algorithm is a step-by-step plan for solving a problem. The word comes from the name of a Persian mathematician, Al-Khwarizmi. When you follow a recipe, you are using an algorithm. In coding, algorithms tell the computer exactly what to do. Sorting, searching, and calculating are all done with algorithms.', content_zh: '算法是解决问题的分步计划。这个词来自波斯数学家阿尔·花拉子模的名字。当你按照食谱做菜时，你就在使用算法。在编程中，算法精确地告诉计算机该做什么。排序、搜索和计算都是用算法完成的。' },
  ]);
  addContent('tech_robotics', [
    { title: 'European Robotics', content: 'Europe is a leader in robotics. The European robotics industry develops robots for factories, hospitals, and homes. The robot "ASIMO" was created by Honda in Japan, but Europe has its own robots like "NAO" from France and "Pepper" from SoftBank Robotics Europe. Robots help with surgery, exploring space, and even vacuum cleaning.', content_zh: '欧洲在机器人技术方面处于领先地位。欧洲机器人产业为工厂、医院和家庭开发机器人。虽然ASIMO机器人由日本本田公司创造，但欧洲有自己的机器人，如法国的NAO和软银机器人欧洲公司的Pepper。机器人帮助做手术、探索太空，甚至吸尘清洁。' },
  ]);
  addContent('tech_ai', [
    { title: 'What is Artificial Intelligence?', content: 'Artificial Intelligence (AI) is when computers can do tasks that normally need human intelligence. This includes recognizing pictures, understanding speech, and making decisions. The term "Artificial Intelligence" was first used in 1956. European countries work together on AI research, with important centers in the UK, Germany, France, and Switzerland.', content_zh: '人工智能（AI）是指计算机能完成通常需要人类智能的任务。这包括识别图片、理解说话和做决策。"人工智能"这个术语最早在1956年被使用。欧洲国家在AI研究上合作，在英国、德国、法国和瑞士有重要的研究中心。' },
  ]);

  // --- Engineering ---
  addContent('eng_structure', [
    { title: 'The Eiffel Tower', content: 'The Eiffel Tower was built for the 1889 World Exhibition in Paris. It was designed by Gustave Eiffel\'s company. The tower is made of wrought iron and weighs 7,300 tons. It was the tallest building in the world until 1930. The tower expands and contracts with temperature changes, growing 15 cm taller in summer.', content_zh: '埃菲尔铁塔是为1889年巴黎世界博览会建造的。它由古斯塔夫·埃菲尔的公司设计。铁塔由锻铁制成，重7300吨。它一直是世界最高建筑直到1930年。铁塔随温度变化热胀冷缩，夏天会"长高"15厘米。' },
    { title: 'The Channel Tunnel', content: 'The Channel Tunnel connects England and France under the English Channel. It is 50 km long, making it the longest underwater tunnel in the world. Construction began in 1988 and finished in 1994. Trains can travel through the tunnel in about 35 minutes. It is an amazing engineering achievement.', content_zh: '英吉利海峡隧道连接英国和法国，位于英吉利海峡下方。它长50公里，是世界上最长的海底隧道。建设从1988年开始，1994年完成。火车大约35分钟就能穿过隧道。这是一项了不起的工程成就。' },
  ]);
  addContent('eng_aerospace', [
    { title: 'Airbus', content: 'Airbus is a European aerospace company. It was founded in 1970 by companies from France, Germany, Spain, and the UK. Airbus makes commercial airplanes, including the A320 and the A380, the world\'s largest passenger airplane. The company also makes military aircraft and helicopters. Airbus headquarters are in Toulouse, France.', content_zh: '空客是欧洲航空航天公司。它于1970年由法国、德国、西班牙和英国的公司共同创建。空客制造商用飞机，包括A320和世界上最大的客机A380。该公司还制造军用飞机和直升机。空客总部位于法国图卢兹。' },
  ]);
  addContent('eng_automotive', [
    { title: 'German Automobiles', content: 'Germany is famous for its car industry. Mercedes-Benz, BMW, Audi, and Volkswagen are all German brands. The first car was invented by Karl Benz in Germany in 1886. German cars are known for their quality, safety, and engineering. Today, European car companies are leading the shift to electric vehicles.', content_zh: '德国以其汽车工业闻名。梅赛德斯-奔驰、宝马、奥迪和大众都是德国品牌。第一辆汽车由卡尔·本茨在1886年的德国发明。德国汽车以品质、安全和工程闻名。如今，欧洲汽车公司正在引领向电动汽车的转型。' },
  ]);

  // ======================= RETURN =======================
  return {
    vocab,
    grammar,
    speaking,
    writing,
    reading,
    spelling,
    content
  };
})();
