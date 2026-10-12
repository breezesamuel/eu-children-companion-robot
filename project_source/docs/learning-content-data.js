// ==================== EMBEDDED EDUCATIONAL DATA ====================
// Grades: kindergarten, primary1-6, junior1-3 (年龄 3-15)
// Subjects: 语文/数学/英语/科学/编程/社会

window._EMBEDDED = (function() {

  // ======================= LEVEL LABELS =======================
  const LEVELS = {
    'kindergarten': '幼儿园 (3-5岁)',
    'primary1': '小学一年级 (6-7岁)',
    'primary2': '小学二年级 (7-8岁)',
    'primary3': '小学三年级 (8-9岁)',
    'primary4': '小学四年级 (9-10岁)',
    'primary5': '小学五年级 (10-11岁)',
    'primary6': '小学六年级 (11-12岁)',
    'junior1': '初中一年级 (12-13岁)',
    'junior2': '初中二年级 (13-14岁)',
    'junior3': '初中三年级 (14-15岁)'
  };

  // ======================= VOCABULARY =======================
  const vocab = [];
  function V(word, meaning, phonetic, example, level) {
    vocab.push({ word, meaning, phonetic, example, level });
  }

  // ---------- Kindergarten (幼儿园): 英语启蒙 ----------
  V('apple','苹果','/ˈæp.əl/','I eat a red apple.','kindergarten');
  V('banana','香蕉','/bəˈnæn.ə/','Monkeys like bananas.','kindergarten');
  V('cat','猫','/kæt/','The cat is sleeping.','kindergarten');
  V('dog','狗','/dɒɡ/','My dog can run fast.','kindergarten');
  V('elephant','大象','/ˈel.ɪ.fənt/','An elephant is big.','kindergarten');
  V('fish','鱼','/fɪʃ/','I see a fish in the water.','kindergarten');
  V('green','绿色','/ɡriːn/','The grass is green.','kindergarten');
  V('happy','开心的','/ˈhæp.i/','I am happy today!','kindergarten');
  V('ice','冰','/aɪs/','Ice is very cold.','kindergarten');
  V('jump','跳','/dʒʌmp/','Look! I can jump!','kindergarten');
  V('kite','风筝','/kaɪt/','I fly a kite.','kindergarten');
  V('lion','狮子','/ˈlaɪ.ən/','The lion is strong.','kindergarten');
  V('milk','牛奶','/mɪlk/','I drink milk every day.','kindergarten');
  V('nose','鼻子','/noʊz/','I can smell with my nose.','kindergarten');
  V('orange','橙子','/ˈɒr.ɪndʒ/','This orange is sweet.','kindergarten');
  V('panda','熊猫','/ˈpæn.də/','Pandas are black and white.','kindergarten');
  V('queen','女王','/kwiːn/','The queen wears a crown.','kindergarten');
  V('rabbit','兔子','/ˈræb.ɪt/','The rabbit is soft.','kindergarten');
  V('sun','太阳','/sʌn/','The sun is bright.','kindergarten');
  V('tree','树','/triː/','The tree is tall.','kindergarten');
  V('umbrella','雨伞','/ʌmˈbrel.ə/','Take your umbrella.','kindergarten');
  V('violin','小提琴','/ˌvaɪ.əˈlɪn/','She plays the violin.','kindergarten');
  V('water','水','/ˈwɔː.tər/','I want some water.','kindergarten');
  V('fox','狐狸','/fɒks/','The fox is clever.','kindergarten');
  V('yellow','黄色','/ˈjel.oʊ/','The sun is yellow.','kindergarten');
  V('zebra','斑马','/ˈzeb.rə/','A zebra has stripes.','kindergarten');
  V('book','书','/bʊk/','I read a book.','kindergarten');
  V('candy','糖果','/ˈkæn.di/','Candy is sweet.','kindergarten');
  V('duck','鸭子','/dʌk/','The duck swims on the lake.','kindergarten');
  V('egg','鸡蛋','/eɡ/','I eat an egg for breakfast.','kindergarten');
  // 中文启蒙 (拼音 + 简单汉字)
  V('一','yī','/ī/','一 只 小 猫','kindergarten');
  V('大','dà','/tà/','大 象 很 大','kindergarten');
  V('小','xiǎo','/ɕiàʊ/','小 鸟 飞 得 高','kindergarten');

  // ---------- Primary 1 (小学一年级) ----------
  V('school','学校','/skuːl/','I go to school every day.','primary1');
  V('teacher','老师','/ˈtiː.tʃər/','My teacher is nice.','primary1');
  V('student','学生','/ˈstjuː.dənt/','I am a student.','primary1');
  V('classroom','教室','/ˈklæs.ruːm/','We learn in the classroom.','primary1');
  V('pencil','铅笔','/ˈpen.səl/','I write with a pencil.','primary1');
  V('ruler','尺子','/ˈruː.lər/','Use a ruler to draw a line.','primary1');
  V('eraser','橡皮','/ɪˈreɪ.zər/','I use an eraser.','primary1');
  V('bag','书包','/bæɡ/','My bag is heavy.','primary1');
  V('mother','妈妈','/ˈmʌð.ər/','I love my mother.','primary1');
  V('father','爸爸','/ˈfɑː.ðər/','My father is tall.','primary1');
  V('sister','姐妹','/ˈsɪs.tər/','My sister is kind.','primary1');
  V('brother','兄弟','/ˈbrʌð.ər/','I play with my brother.','primary1');
  V('friend','朋友','/frend/','We are good friends.','primary1');
  V('one','一','/wʌn/','I have one apple.','primary1');
  V('two','二','/tuː/','I see two birds.','primary1');
  V('three','三','/θriː/','There are three books.','primary1');
  V('four','四','/fɔːr/','I have four pencils.','primary1');
  V('five','五','/faɪv/','Five little ducks.','primary1');
  V('red','红色','/red/','The apple is red.','primary1');
  V('blue','蓝色','/bluː/','The sky is blue.','primary1');
  V('white','白色','/waɪt/','Snow is white.','primary1');
  V('black','黑色','/blæk/','The cat is black.','primary1');
  V('bird','鸟','/bɜːd/','The bird can fly.','primary1');
  V('frog','青蛙','/frɒɡ/','The frog is green.','primary1');
  V('horse','马','/hɔːs/','I can ride a horse.','primary1');
  V('pig','猪','/pɪɡ/','The pig is pink.','primary1');
  V('sheep','羊','/ʃiːp/','The sheep is white.','primary1');
  V('chicken','鸡','/ˈtʃɪk.ɪn/','The chicken eats corn.','primary1');
  V('draw','画画','/drɔː/','I like to draw.','primary1');
  V('sing','唱歌','/sɪŋ/','Let us sing together.','primary1');
  V('dance','跳舞','/dæns/','She can dance.','primary1');
  V('run','跑步','/rʌn/','I can run fast.','primary1');
  V('walk','走路','/wɔːk/','We walk to school.','primary1');

  // ---------- Primary 2 (小学二年级) ----------
  V('weather','天气','/ˈweð.ər/','The weather is nice today.','primary2');
  V('sunny','晴朗的','/ˈsʌn.i/','It is a sunny day.','primary2');
  V('rainy','下雨的','/ˈreɪ.ni/','I stay home on rainy days.','primary2');
  V('cloudy','多云的','/ˈklaʊ.di/','It is cloudy today.','primary2');
  V('windy','有风的','/ˈwɪn.di/','It is windy outside.','primary2');
  V('snowy','下雪的','/ˈsnəʊ.i/','We play in snowy weather.','primary2');
  V('hot','热的','/hɒt/','Summer is hot.','primary2');
  V('cold','冷的','/kəʊld/','Winter is cold.','primary2');
  V('warm','温暖的','/wɔːm/','Spring is warm.','primary2');
  V('cool','凉爽的','/kuːl/','Autumn is cool.','primary2');
  V('spring','春天','/sprɪŋ/','Flowers bloom in spring.','primary2');
  V('summer','夏天','/ˈsʌm.ər/','I swim in summer.','primary2');
  V('autumn','秋天','/ˈɔː.təm/','Leaves fall in autumn.','primary2');
  V('winter','冬天','/ˈwɪn.tər/','It snows in winter.','primary2');
  V('shirt','衬衫','/ʃɜːt/','I wear a white shirt.','primary2');
  V('shoes','鞋子','/ʃuːz/','My shoes are blue.','primary2');
  V('hat','帽子','/hæt/','Put on your hat.','primary2');
  V('socks','袜子','/sɒks/','I need clean socks.','primary2');
  V('big','大的','/bɪɡ/','This box is big.','primary2');
  V('small','小的','/smɔːl/','The mouse is small.','primary2');
  V('tall','高的','/tɔːl/','He is very tall.','primary2');
  V('short','矮的','/ʃɔːt/','She is short.','primary2');
  V('long','长的','/lɒŋ/','The snake is long.','primary2');
  V('fast','快的','/fɑːst/','The car is fast.','primary2');
  V('slow','慢的','/sləʊ/','The turtle is slow.','primary2');
  V('kitchen','厨房','/ˈkɪtʃ.ɪn/','Mom is in the kitchen.','primary2');
  V('bedroom','卧室','/ˈbed.ruːm/','My bedroom is cozy.','primary2');
  V('garden','花园','/ˈɡɑː.dən/','There are flowers in the garden.','primary2');
  V('bridge','桥','/brɪdʒ/','We walk across the bridge.','primary2');
  V('river','河流','/ˈrɪv.ər/','The river is long.','primary2');

  // ---------- Primary 3 (小学三年级) ----------
  V('math','数学','/mæθ/','I like math class.','primary3');
  V('science','科学','/ˈsaɪ.əns/','Science is interesting.','primary3');
  V('history','历史','/ˈhɪs.tər.i/','We study history.','primary3');
  V('music','音乐','/ˈmjuː.zɪk/','I love music.','primary3');
  V('library','图书馆','/ˈlaɪ.brər.i/','I read at the library.','primary3');
  V('hospital','医院','/ˈhɒs.pɪ.təl/','The hospital is big.','primary3');
  V('supermarket','超市','/ˈsuː.pə.mɑː.kɪt/','We buy food at the supermarket.','primary3');
  V('restaurant','餐厅','/ˈres.tər.ɒnt/','We eat at a restaurant.','primary3');
  V('yesterday','昨天','/ˈjes.tər.deɪ/','I went to the park yesterday.','primary3');
  V('today','今天','/təˈdeɪ/','Today is Monday.','primary3');
  V('tomorrow','明天','/təˈmɒr.əʊ/','We will go tomorrow.','primary3');
  V('morning','早上','/ˈmɔː.nɪŋ/','Good morning!','primary3');
  V('afternoon','下午','/ˌɑːf.təˈnuːn/','Good afternoon!','primary3');
  V('evening','晚上','/ˈiːv.nɪŋ/','Good evening!','primary3');
  V('breakfast','早餐','/ˈbrek.fəst/','I eat breakfast at 7.','primary3');
  V('lunch','午餐','/lʌntʃ/','We have lunch at school.','primary3');
  V('dinner','晚餐','/ˈdɪn.ər/','Dinner is ready.','primary3');
  V('hungry','饿的','/ˈhʌŋ.ɡri/','I am hungry.','primary3');
  V('thirsty','渴的','/ˈθɜː.sti/','Are you thirsty?','primary3');
  V('delicious','美味的','/dɪˈlɪʃ.əs/','The cake is delicious.','primary3');
  V('doctor','医生','/ˈdɒk.tər/','The doctor is kind.','primary3');
  V('nurse','护士','/nɜːs/','The nurse helps patients.','primary3');
  V('farmer','农民','/ˈfɑː.mər/','The farmer grows rice.','primary3');
  V('driver','司机','/ˈdraɪ.vər/','The bus driver is friendly.','primary3');
  V('cook','厨师','/kʊk/','My dad is a good cook.','primary3');
  V('policeman','警察','/pəˈliːs.mən/','The policeman helps us.','primary3');
  V('singer','歌手','/ˈsɪŋ.ər/','She is a famous singer.','primary3');
  V('because','因为','/bɪˈkɒz/','I am happy because I got a gift.','primary3');
  V('always','总是','/ˈɔːl.weɪz/','She always smiles.','primary3');
  V('sometimes','有时候','/ˈsʌm.taɪmz/','I sometimes ride a bike.','primary3');

  // ---------- Primary 4 (小学四年级) ----------
  V('beautiful','美丽的','/ˈbjuː.tɪ.fəl/','The flower is beautiful.','primary4');
  V('dangerous','危险的','/ˈdeɪn.dʒər.əs/','Fire is dangerous.','primary4');
  V('important','重要的','/ɪmˈpɔː.tənt/','This is important.','primary4');
  V('wonderful','奇妙的','/ˈwʌn.də.fəl/','What a wonderful day!','primary4');
  V('different','不同的','/ˈdɪf.ər.ənt/','We are different.','primary4');
  V('difficult','困难的','/ˈdɪf.ɪ.kəlt/','The test is difficult.','primary4');
  V('easy','简单的','/ˈiː.zi/','This exercise is easy.','primary4');
  V('together','一起','/təˈɡeð.ər/','Let us sing together.','primary4');
  V('always','一直','/ˈɔːl.weɪz/','I always tell the truth.','primary4');
  V('usually','通常','/ˈjuː.ʒu.ə.li/','I usually walk to school.','primary4');
  V('often','经常','/ˈɒf.ən/','We often play soccer.','primary4');
  V('never','从不','/ˈnev.ər/','I never give up.','primary4');
  V('mountain','山','/ˈmaʊn.tɪn/','The mountain is high.','primary4');
  V('ocean','海洋','/ˈəʊ.ʃən/','The ocean is deep.','primary4');
  V('forest','森林','/ˈfɒr.ɪst/','The forest is dark.','primary4');
  V('island','岛屿','/ˈaɪ.lənd/','We visited an island.','primary4');
  V('desert','沙漠','/ˈdez.ət/','The desert is dry.','primary4');
  V('planet','行星','/ˈplæn.ɪt/','Earth is a planet.','primary4');
  V('space','太空','/speɪs/','I want to explore space.','primary4');
  V('invent','发明','/ɪnˈvent/','Who invented the light bulb?','primary4');
  V('discover','发现','/dɪˈskʌv.ər/','I discover new things.','primary4');
  V('protect','保护','/prəˈtekt/','We must protect nature.','primary4');
  V('pollution','污染','/pəˈluː.ʃən/','Air pollution is bad.','primary4');
  V('energy','能量','/ˈen.ə.dʒi/','The sun gives us energy.','primary4');
  V('magnet','磁铁','/ˈmæɡ.nət/','The magnet attracts iron.','primary4');
  V('experiment','实验','/ɪkˈsper.ɪ.mənt/','We did a science experiment.','primary4');
  V('temperature','温度','/ˈtem.prə.tʃər/','The temperature is 25°C.','primary4');
  V('measure','测量','/ˈmeʒ.ər/','We measure the length.','primary4');
  V('compare','比较','/kəmˈpeər/','Compare these two items.','primary4');
  V('electricity','电力','/ɪˌlekˈtrɪs.ɪ.ti/','Electricity powers our home.','primary4');

  // ---------- Primary 5 (小学五年级) ----------
  V('adventure','冒险','/ədˈven.tʃər/','We had an adventure.','primary5');
  V('knowledge','知识','/ˈnɒl.ɪdʒ/','Knowledge is power.','primary5');
  V('experience','经验','/ɪkˈspɪə.ri.əns/','I have experience in coding.','primary5');
  V('practice','练习','/ˈpræk.tɪs/','Practice makes perfect.','primary5');
  V('improve','提高','/ɪmˈpruːv/','I want to improve my English.','primary5');
  V('achieve','实现','/əˈtʃiːv/','You can achieve your dream.','primary5');
  V('respect','尊重','/rɪˈspekt/','We respect our elders.','primary5');
  V('honest','诚实的','/ˈɒn.ɪst/','Be honest always.','primary5');
  V('brave','勇敢的','/breɪv/','The firefighter is brave.','primary5');
  V('curious','好奇的','/ˈkjʊə.ri.əs/','I am curious about science.','primary5');
  V('generous','慷慨的','/ˈdʒen.ər.əs/','She is generous.','primary5');
  V('patient','耐心的','/ˈpeɪ.ʃənt/','Be patient and listen.','primary5');
  V('responsible','负责的','/rɪˈspɒn.sɪ.bəl/','I am responsible.','primary5');
  V('nation','国家','/ˈneɪ.ʃən/','China is a great nation.','primary5');
  V('culture','文化','/ˈkʌl.tʃər/','I love Chinese culture.','primary5');
  V('tradition','传统','/trəˈdɪʃ.ən/','This is an old tradition.','primary5');
  V('festival','节日','/ˈfes.tɪ.vəl/','Spring Festival is fun.','primary5');
  V('ancient','古代的','/ˈeɪn.ʃənt/','The Great Wall is ancient.','primary5');
  V('century','世纪','/ˈsen.tʃər.i/','This building is a century old.','primary5');
  V('population','人口','/ˌpɒp.juˈleɪ.ʃən/','The population is large.','primary5');
  V('technology','技术','/tekˈnɒl.ə.dʒi/','Technology changes fast.','primary5');
  V('internet','互联网','/ˈɪn.tə.net/','I use the internet.','primary5');
  V('computer','电脑','/kəmˈpjuː.tər/','I learn on my computer.','primary5');
  V('digital','数字的','/ˈdɪdʒ.ɪ.təl/','We live in a digital world.','primary5');
  V('program','程序','/ˈprəʊ.ɡræm/','I write a program.','primary5');
  V('robot','机器人','/ˈrəʊ.bɒt/','The robot can help us.','primary5');
  V('machine','机器','/məˈʃiːn/','This machine works fast.','primary5');
  V('solar','太阳的','/ˈsəʊ.lər/','Solar energy is clean.','primary5');
  V('gravity','重力','/ˈɡræv.ɪ.ti/','Gravity pulls things down.','primary5');
  V('orbit','轨道','/ˈɔː.bɪt/','The moon orbits the Earth.','primary5');

  // ---------- Primary 6 (小学六年级) ----------
  V('opportunity','机会','/ˌɒp.əˈtʃuː.nɪ.ti/','Take every opportunity.','primary6');
  V('challenge','挑战','/ˈtʃæl.ɪndʒ/','Face the challenge bravely.','primary6');
  V('succeed','成功','/səkˈsiːd/','Work hard to succeed.','primary6');
  V('effort','努力','/ˈef.ət/','Your effort matters.','primary6');
  V('prepare','准备','/prɪˈpeər/','We prepare for the exam.','primary6');
  V('encourage','鼓励','/ɪnˈkʌr.ɪdʒ/','Teachers encourage us.','primary6');
  V('confident','自信的','/ˈkɒn.fɪ.dənt/','I feel confident.','primary6');
  V('independent','独立的','/ˌɪn.dɪˈpen.dənt/','I am independent.','primary6');
  V('graduation','毕业','/ˌɡrædʒ.uˈeɪ.ʃən/','Graduation is in June.','primary6');
  V('secondary','中学的','/ˈsek.ən.dər.i/','I go to secondary school.','primary6');
  V('biography','传记','/baɪˈɒɡ.rə.fi/','I read a biography.','primary6');
  V('fiction','小说','/ˈfɪk.ʃən/','I like science fiction.','primary6');
  V('poem','诗歌','/ˈpəʊ.ɪm/','I wrote a poem.','primary6');
  V('author','作者','/ˈɔː.θər/','Who is your favorite author?','primary6');
  V('paragraph','段落','/ˈpær.ə.ɡrɑːf/','Write a short paragraph.','primary6');
  V('summary','摘要','/ˈsʌm.ər.i/','Write a summary.','primary6');
  V('vocabulary','词汇','/vəˈkæb.jə.lər.i/','Learn new vocabulary.','primary6');
  V('pronounce','发音','/prəˈnaʊns/','How do you pronounce this?','primary6');
  V('translate','翻译','/trænsˈleɪt/','Translate the sentence.','primary6');
  V('grammar','语法','/ˈɡræm.ər/','Grammar is important.','primary6');
  V('sentence','句子','/ˈsen.təns/','Make a sentence.','primary6');
  V('conversation','对话','/ˌkɒn.vəˈseɪ.ʃən/','We had a good conversation.','primary6');
  V('debate','辩论','/dɪˈbeɪt/','We had a class debate.','primary6');
  V('persuade','说服','/pəˈsweɪd/','Try to persuade me.','primary6');
  V('evaporate','蒸发','/ɪˈvæp.ə.reɪt/','Water evaporates in heat.','primary6');
  V('condense','凝结','/kənˈdens/','Steam condenses on glass.','primary6');
  V('ecosystem','生态系统','/ˈiː.kəʊ.sɪs.təm/','A forest is an ecosystem.','primary6');
  V('photosynthesis','光合作用','/ˌfəʊ.təʊˈsɪn.θə.sɪs/','Plants use photosynthesis.','primary6');
  V('recycle','回收','/ˌriːˈsaɪ.kəl/','We should recycle waste.','primary6');
  V('sustainable','可持续的','/səˈsteɪ.nə.bəl/','We need sustainable energy.','primary6');

  // ---------- Junior 1 (初中一年级) ----------
  V('algebra','代数','/ˈæl.dʒɪ.brə/','We study algebra in math.','junior1');
  V('equation','等式','/ɪˈkweɪ.ʒən/','Solve the equation.','junior1');
  V('variable','变量','/ˈveə.ri.ə.bəl/','X is a variable.','junior1');
  V('function','函数','/ˈfʌŋk.ʃən/','A function maps input to output.','junior1');
  V('geometry','几何','/dʒiˈɒm.ɪ.tri/','Geometry studies shapes.','junior1');
  V('angle','角度','/ˈæŋ.ɡəl/','A right angle is 90 degrees.','junior1');
  V('triangle','三角形','/ˈtraɪ.æŋ.ɡəl/','A triangle has 3 sides.','junior1');
  V('parallel','平行的','/ˈpær.ə.lel/','These lines are parallel.','junior1');
  V('velocity','速度','/vɪˈlɒs.ɪ.ti/','Velocity includes direction.','junior1');
  V('acceleration','加速度','/əkˌsel.əˈreɪ.ʃən/','Acceleration is change in velocity.','junior1');
  V('force','力','/fɔːs/','Force equals mass times acceleration.','junior1');
  V('friction','摩擦力','/ˈfrɪk.ʃən/','Friction slows things down.','junior1');
  V('density','密度','/ˈden.sɪ.ti/','Density is mass per volume.','junior1');
  V('pressure','压力','/ˈpreʃ.ər/','Pressure is force per area.','junior1');
  V('volume','体积','/ˈvɒl.juːm/','Measure the volume of water.','junior1');
  V('atom','原子','/ˈæt.əm/','Everything is made of atoms.','junior1');
  V('molecule','分子','/ˈmɒl.ɪ.kjuːl/','Water is H2O molecules.','junior1');
  V('element','元素','/ˈel.ɪ.mənt/','Oxygen is an element.','junior1');
  V('compound','化合物','/ˈkɒm.paʊnd/','Salt is a compound.','junior1');
  V('chemical','化学的','/ˈkem.ɪ.kəl/','Chemical reactions change substances.','junior1');
  V('continent','大陆','/ˈkɒn.tɪ.nənt/','Asia is the largest continent.','junior1');
  V('latitude','纬度','/ˈlæt.ɪ.tjuːd/','Latitude lines run east-west.','junior1');
  V('longitude','经度','/ˈlɒn.dʒɪ.tjuːd/','Longitude lines run north-south.','junior1');
  V('climate','气候','/ˈklaɪ.mət/','The climate is changing.','junior1');
  V('dynasty','朝代','/ˈdɪn.ə.sti/','The Tang Dynasty was prosperous.','junior1');
  V('civilization','文明','/ˌsɪv.ɪ.laɪˈzeɪ.ʃən/','China has an ancient civilization.','junior1');
  V('empire','帝国','/ˈem.paɪər/','The Roman Empire was vast.','junior1');
  V('revolution','革命','/ˌrev.əˈluː.ʃən/','The Industrial Revolution changed world.','junior1');
  V('constitution','宪法','/ˌkɒn.stɪˈtjuː.ʃən/','The constitution protects our rights.','junior1');
  V('democracy','民主','/dɪˈmɒk.rə.si/','Democracy means rule by the people.','junior1');

  // ---------- Junior 2 (初中二年级) ----------
  V('quadratic','二次的','/kwɒˈdræt.ɪk/','Solve the quadratic equation.','junior2');
  V('polynomial','多项式','/ˌpɒl.ɪˈnəʊ.mi.əl/','This is a polynomial expression.','junior2');
  V('probability','概率','/ˌprɒb.əˈbɪl.ɪ.ti/','The probability is 50%.','junior2');
  V('statistics','统计','/stəˈtɪs.tɪks/','We use statistics to analyze data.','junior2');
  V('congruent','全等的','/ˈkɒŋ.ɡru.ənt/','These triangles are congruent.','junior2');
  V('similar','相似的','/ˈsɪm.ɪ.lər/','These shapes are similar.','junior2');
  V('theorem','定理','/ˈθɪə.rəm/','The Pythagorean theorem is useful.','junior2');
  V('proof','证明','/pruːf/','We write a geometric proof.','junior2');
  V('optical','光学的','/ˈɒp.tɪ.kəl/','Optical fibers transmit light.','junior2');
  V('lens','透镜','/lenz/','The lens focuses light.','junior2');
  V('mirror','镜子','/ˈmɪr.ər/','Light reflects from a mirror.','junior2');
  V('refraction','折射','/rɪˈfræk.ʃən/','Refraction bends light.','junior2');
  V('circuit','电路','/ˈsɜː.kɪt/','Current flows in a circuit.','junior2');
  V('voltage','电压','/ˈvəʊl.tɪdʒ/','Voltage drives electric current.','junior2');
  V('current','电流','/ˈkʌr.ənt/','Current is measured in amperes.','junior2');
  V('resistance','电阻','/rɪˈzɪs.təns/','Resistance opposes current.','junior2');
  V('magnetic','磁性的','/mæɡˈnet.ɪk/','The magnetic field attracts iron.','junior2');
  V('electromagnetic','电磁的','/ɪˌlek.trəʊ.mæɡˈnet.ɪk/','Light is electromagnetic waves.','junior2');
  V('catalyst','催化剂','/ˈkæt.əl.ɪst/','The catalyst speeds up the reaction.','junior2');
  V('oxidation','氧化','/ˌɒk.sɪˈdeɪ.ʃən/','Iron undergoes oxidation to rust.','junior2');
  V('reduction','还原','/rɪˈdʌk.ʃən/','Reduction is the opposite of oxidation.','junior2');
  V('acid','酸','/ˈæs.ɪd/','Lemon juice contains acid.','junior2');
  V('base','碱','/beɪs/','Soap is a base.','junior2');
  V('pH','pH值','/piːˈeɪtʃ/','Pure water has pH 7.','junior2');
  V('evaporation','蒸发','/ɪˌvæp.əˈreɪ.ʃən/','Evaporation cools the surface.','junior2');
  V('distillation','蒸馏','/ˌdɪs.tɪˈleɪ.ʃən/','Distillation separates mixtures.','junior2');
  V('chromosome','染色体','/ˈkrəʊ.mə.səʊm/','Humans have 23 pairs of chromosomes.','junior2');
  V('heredity','遗传','/hɪˈred.ɪ.ti/','Heredity passes traits from parents.','junior2');
  V('evolution','进化','/ˌiː.vəˈluː.ʃən/','Evolution explains how species change.','junior2');
  V('photosynthesis','光合作用','/ˌfəʊ.təʊˈsɪn.θə.sɪs/','Plants make food by photosynthesis.','junior2');

  // ---------- Junior 3 (初中三年级) ----------
  V('function','函数','/ˈfʌŋk.ʃən/','A quadratic function forms a parabola.','junior3');
  V('parabola','抛物线','/pəˈræb.ə.lə/','The graph is a parabola.','junior3');
  V('trigonometry','三角学','/ˌtrɪɡ.əˈnɒm.ɪ.tri/','Trigonometry studies triangles.','junior3');
  V('logarithm','对数','/ˈlɒɡ.ər.ɪð.əm/','The logarithm is the inverse of exponent.','junior3');
  V('vector','向量','/ˈvek.tər/','A vector has magnitude and direction.','junior3');
  V('matrix','矩阵','/ˈmeɪ.trɪks/','We use matrices in linear algebra.','junior3');
  V('momentum','动量','/məˈmen.təm/','Momentum is mass times velocity.','junior3');
  V('nuclear','核的','/ˈnjuː.kli.ər/','Nuclear energy releases a huge amount of power.','junior3');
  V('radiation','辐射','/ˌreɪ.diˈeɪ.ʃən/','Radiation can be harmful.','junior3');
  V('thermodynamics','热力学','/ˌθɜː.məʊ.daɪˈnæm.ɪks/','Thermodynamics studies heat and energy.','junior3');
  V('electrolysis','电解','/iˌlekˈtrɒl.ɪ.sɪs/','Electrolysis splits water into hydrogen and oxygen.','junior3');
  V('equilibrium','平衡','/ˌiː.kwɪˈlɪb.ri.əm/','Chemical equilibrium is a balanced state.','junior3');
  V('organic','有机的','/ɔːˈɡæn.ɪk/','Organic chemistry studies carbon compounds.','junior3');
  V('synthesis','合成','/ˈsɪn.θə.sɪs/','Photosynthesis is the synthesis of glucose.','junior3');
  V('gene','基因','/dʒiːn/','Genes determine our traits.','junior3');
  V('DNA','脱氧核糖核酸','/ˌdiː.enˈeɪ/','DNA stores genetic information.','junior3');
  V('species','物种','/ˈspiː.ʃiːz/','There are many species of birds.','junior3');
  V('ecosystem','生态系统','/ˈiː.kəʊ.sɪs.təm/','Coral reefs are diverse ecosystems.','junior3');
  V('renewable','可再生的','/rɪˈnjuː.ə.bəl/','Solar energy is renewable.','junior3');
  V('carbon','碳','/ˈkɑː.bən/','Carbon emissions cause global warming.','junior3');
  V('economy','经济','/ɪˈkɒn.ə.mi/','The economy is growing.','junior3');
  V('globalization','全球化','/ˌɡləʊ.bəl.aɪˈzeɪ.ʃən/','Globalization connects countries.','junior3');
  V('innovation','创新','/ˌɪn.əˈveɪ.ʃən/','Innovation drives progress.','junior3');
  V('philosophy','哲学','/fɪˈlɒs.ə.fi/','Philosophy asks deep questions.','junior3');
  V('psychology','心理学','/saɪˈkɒl.ə.dʒi/','Psychology studies the mind.','junior3');
  V('literature','文学','/ˈlɪt.rə.tʃər/','I enjoy reading literature.','junior3');
  V('criticism','批评','/ˈkrɪt.ɪ.sɪ.zəm/','Constructive criticism helps improvement.','junior3');
  V('perspective','视角','/pəˈspek.tɪv/','Look at it from my perspective.','junior3');
  V('comprehensive','全面的','/ˌkɒm.prɪˈhen.sɪv/','We need a comprehensive plan.','junior3');
  V('examination','考试','/ɪɡˌzæm.ɪˈneɪ.ʃən/','The examination is next week.','junior3');

  // ======================= QUIZ QUESTIONS =======================
  const quiz = [];
  function Q(question, options, answer, example, level, phonetic) {
    quiz.push({ question, options, answer, example, level, phonetic });
  }

  // Kindergarten
  Q('What color is the sky?','["Red","Blue","Green","Yellow"]','Blue','The sky is blue.','kindergarten');
  Q('How many legs does a cat have?','["2","4","6","8"]','4','A cat has 4 legs.','kindergarten');
  Q('What animal says "Moo"?','["Dog","Cat","Cow","Duck"]','Cow','A cow says moo.','kindergarten');
  Q('Apple的中文意思是？','["香蕉","苹果","橘子","西瓜"]','苹果','I eat an apple.','kindergarten');
  Q('Which one is a fruit?','["Chair","Table","Apple","Book"]','Apple','An apple is a fruit.','kindergarten');

  // Primary 1
  Q('What do you use to write?','["Pencil","Spoon","Cup","Hat"]','Pencil','I write with a pencil.','primary1');
  Q('3 + 2 = ?','["4","5","6","7"]','5','Three plus two equals five.','primary1');
  Q('"Teacher" means?','["医生","老师","学生","司机"]','老师','My teacher is nice.','primary1','/ˈtiː.tʃər/');
  Q('Which animal can fly?','["Fish","Bird","Dog","Cat"]','Bird','A bird can fly.','primary1');
  Q('What color is snow?','["Black","Red","White","Blue"]','White','Snow is white.','primary1');
  Q('"Student"在中文里是什么意思？','["老师","学生","校长","工人"]','学生','I am a student.','primary1');
  Q('What day comes after Wednesday?','["Monday","Tuesday","Thursday","Friday"]','Thursday','Thursday comes after Wednesday.','primary1');
  Q('How many eyes do you have?','["1","2","3","4"]','2','I have two eyes.','primary1');
  Q('Which is a shape?','["Apple","Circle","Water","Music"]','Circle','A circle is round.','primary1');
  Q('"Brother"的中文是？','["姐妹","兄弟","父母","同学"]','兄弟','I play with my brother.','primary1');
  Q('What do you wear on your head?','["Shoes","Hat","Gloves","Socks"]','Hat','Put on your hat.','primary1');
  Q('10 - 4 = ?','["5","6","7","8"]','6','Ten minus four equals six.','primary1');
  Q('Which animal lives on a farm?','["Lion","Tiger","Cow","Monkey"]','Cow','The cow lives on a farm.','primary1');
  Q('What do you call your mother\'s mother?','["Aunt","Grandma","Sister","Cousin"]','Grandma','My grandma is kind.','primary1');
  Q('How many fingers on one hand?','["3","4","5","6"]','5','I have five fingers.','primary1');

  // Primary 2
  Q('What is the opposite of "hot"?','["Warm","Cold","Cool","Mild"]','Cold','Winter is cold.','primary2');
  Q('Which season comes after spring?','["Winter","Autumn","Summer","Rainy"]','Summer','Summer is after spring.','primary2');
  Q('"River"的中文是？','["湖泊","河流","大海","溪流"]','河流','The river is long.','primary2');
  Q('What do you wear on your feet?','["Hat","Shirt","Shoes","Gloves"]','Shoes','My shoes are blue.','primary2');
  Q('Which is bigger?','["Mouse","Cat","Elephant","Bird"]','Elephant','An elephant is big.','primary2');
  Q('What season does snow fall in?','["Spring","Summer","Autumn","Winter"]','Winter','It snows in winter.','primary2');
  Q('"Sunny"的中文是？','["多云的","下雨的","晴朗的","有风的"]','晴朗的','It is a sunny day.','primary2');
  Q('Which room do you sleep in?','["Kitchen","Bedroom","Bathroom","Garden"]','Bedroom','My bedroom is cozy.','primary2');
  Q('What grows in a garden?','["Books","Flowers","Shoes","Cars"]','Flowers','There are flowers in the garden.','primary2');
  Q('"Slow" is the opposite of?','["Fast","Tall","Big","Heavy"]','Fast','The turtle is slow, but the car is fast.','primary2');
  Q('A baby cat is called a?','["Puppy","Kitten","Cub","Foal"]','Kitten','The kitten is cute.','primary2');
  Q('What can you see in the sky at night?','["Sun","Moon","Rainbow","Cloud"]','Moon','The moon shines at night.','primary2');
  Q('How many months in a year?','["10","11","12","13"]','12','There are 12 months in a year.','primary2');
  Q('What is a bridge over?','["River","Chair","Table","House"]','River','We walk across the bridge over the river.','primary2');
  Q('"Hat"的中文是？','["手套","衬衫","帽子","腰带"]','帽子','Put on your hat.','primary2');

  // Primary 3
  Q('What meal do you eat in the morning?','["Lunch","Dinner","Breakfast","Snack"]','Breakfast','I eat breakfast at 7.','primary3');
  Q('"Because"的中文意思是？','["所以","但是","因为","虽然"]','因为','I am happy because I got a gift.','primary3');
  Q('Where can you borrow books?','["Hospital","Library","Market","Park"]','Library','I read at the library.','primary3');
  Q('What does a doctor do?','["Teach","Drive","Heal","Cook"]','Heal','The doctor heals patients.','primary3');
  Q('Which day comes after Monday?','["Sunday","Tuesday","Wednesday","Friday"]','Tuesday','Tuesday comes after Monday.','primary3');
  Q('"Lunch"在中午吃的叫什么？','["早餐","午餐","晚餐","宵夜"]','午餐','We have lunch at school.','primary3');
  Q('What is 4 × 5?','["15","20","25","30"]','20','Four times five equals twenty.','primary3');
  Q('Who works in a hospital?','["Teacher","Doctor","Driver","Singer"]','Doctor','The doctor is kind.','primary3');
  Q('"Hungry"的中文是？','["渴的","饱的","饿的","累的"]','饿的','I am hungry.','primary3');
  Q('What instrument can you play?','["Book","Pencil","Violin","Chair"]','Violin','She plays the violin.','primary3');
  Q('If today is Monday, tomorrow is?','["Sunday","Tuesday","Wednesday","Thursday"]','Tuesday','Tomorrow is Tuesday.','primary3');
  Q('What is the opposite of "always"?','["Often","Usually","Sometimes","Never"]','Never','I never give up.','primary3');
  Q('Where does a farmer work?','["Office","Farm","School","Bank"]','Farm','The farmer works on the farm.','primary3');
  Q('"Museum"的中文是？','["图书馆","博物馆","体育馆","电影院"]','博物馆','We visit the museum.','primary3');
  Q('How many days in a week?','["5","6","7","8"]','7','There are 7 days in a week.','primary3');

  // Primary 4
  Q('What is the closest planet to the Sun?','["Earth","Venus","Mercury","Mars"]','Mercury','Mercury is the closest.','primary4');
  Q('What pulls things toward Earth?','["Magnet","Gravity","Wind","Light"]','Gravity','Gravity pulls things down.','primary4');
  Q('"Protect" means?','["破坏","保护","建造","扔掉"]','保护','We must protect nature.','primary4');
  Q('Which is a renewable energy source?','["Coal","Oil","Solar","Gas"]','Solar','Solar energy is renewable.','primary4');
  Q('What does a magnet do?','["Repel everything","Attract iron","Float","Burn"]','Attract iron','A magnet attracts iron.','primary4');
  Q('"Dangerous"的中文是？','["安全的","危险的","重要的","美丽的"]','危险的','Fire is dangerous.','primary4');
  Q('What is the largest ocean?','["Atlantic","Indian","Pacific","Arctic"]','Pacific','The Pacific Ocean is the largest.','primary4');
  Q('Which planet has rings?','["Earth","Mars","Jupiter","Saturn"]','Saturn','Saturn has beautiful rings.','primary4');
  Q('What is 12 × 12?','["124","134","144","154"]','144','Twelve times twelve equals 144.','primary4');
  Q('"Experiment"的中文是？','["经验","实验","练习","考察"]','实验','We did a science experiment.','primary4');
  Q('What do we use to measure temperature?','["Ruler","Scale","Thermometer","Clock"]','Thermometer','The thermometer shows 25°C.','primary4');
  Q('How many sides does a square have?','["3","4","5","6"]','4','A square has 4 sides.','primary4');
  Q('What is deforestation?','["Planting trees","Cutting down forests","Building houses","Growing crops"]','Cutting down forests','Deforestation harms the environment.','primary4');
  Q('Which energy comes from the sun?','["Wind","Solar","Hydro","Nuclear"]','Solar','Solar energy comes from the sun.','primary4');
  Q('"Island"的中文是？','["半岛","岛屿","大陆","海峡"]','岛屿','We visited an island.','primary4');

  // Primary 5
  Q('Knowledge is ___?','["Weakness","Power","Nothing","Pain"]','Power','Knowledge is power.','primary5');
  Q('What does "curious" mean?','["勇敢的","懒惰的","好奇的","开心的"]','好奇的','I am curious about science.','primary5');
  Q('Which festival is the most important in China?','["Christmas","Spring Festival","Halloween","Thanksgiving"]','Spring Festival','Spring Festival is the most important.','primary5');
  Q('What does a robot do?','["Only play","Help humans","Sleep","Eat"]','Help humans','The robot helps us.','primary5');
  Q('Which is a programming language?','["English","Python","Chinese","Math"]','Python','Python is a programming language.','primary5');
  Q('"Ancient" means?','["现代的","古代的","未来的","外国的"]','古代的','The Great Wall is ancient.','primary5');
  Q('What is the largest planet?','["Earth","Mars","Jupiter","Venus"]','Jupiter','Jupiter is the largest planet.','primary5');
  Q('What keeps planets orbiting the Sun?','["Magnetism","Gravity","Wind","Light"]','Gravity','Gravity keeps planets in orbit.','primary5');
  Q('"Nation"的中文是？','["民族","国家","家庭","学校"]','国家','China is a great nation.','primary5');
  Q('What does a computer program do?','["Only play games","Give instructions","Make food","Clean room"]','Give instructions','A program gives instructions.','primary5');
  Q('How many centimeters in a meter?','["10","50","100","1000"]','100','There are 100 centimeters in a meter.','primary5');
  Q('What is renewable energy?','["Coal","Oil","Solar","Gas"]','Solar','Solar energy is renewable.','primary5');
  Q('"Tradition"的中文是？','["创新","传统","改革","开放"]','传统','This is an old tradition.','primary5');
  Q('What is gravity?','["A push","A pull","A light","A sound"]','A pull','Gravity pulls things down.','primary5');
  Q('What does "brave" mean?','["害怕的","勇敢的","懒惰的","聪明的"]','勇敢的','The firefighter is brave.','primary5');

  // Primary 6
  Q('"Challenge" means?','["机会","挑战","成功","失败"]','挑战','Face the challenge bravely.','primary6');
  Q('What happens when water evaporates?','["Freezes","Turns to gas","Turns to solid","Disappears"]','Turns to gas','Water evaporates into gas.','primary6');
  Q('What is photosynthesis?','["Plant makes food","Animal sleeps","Water freezes","Rock breaks"]','Plant makes food','Plants use photosynthesis.','primary6');
  Q('"Grammar" studies?','["Numbers","Language rules","History","Stars"]','Language rules','Grammar is important.','primary6');
  Q('Why should we recycle?','["Waste less","Make money","Have fun","Run faster"]','Waste less','We should recycle waste.','primary6');
  Q('What is an ecosystem?','["A building","A community of living things","A machine","A type of rock"]','A community of living things','A forest is an ecosystem.','primary6');
  Q('"Confident"的中文是？','["害羞的","自信的","骄傲的","谦虚的"]','自信的','I feel confident.','primary6');
  Q('What is the water cycle?','["Water moves between earth and sky","Water stays in one place","Water only falls as rain","Water becomes solid forever"]','Water moves between earth and sky','Water evaporates, condenses, and falls as rain.','primary6');
  Q('What does "author" mean?','["画家","作者","歌手","舞者"]','作者','Who is your favorite author?','primary6');
  Q('Why is the sky blue?','["Because of water","Because of light scattering","Because of clouds","Because of the ocean"]','Because of light scattering','Blue light scatters more than other colors.','primary6');
  Q('"Sustainable" means?','["快速的","可持续的","危险的","完美的"]','可持续的','We need sustainable energy.','primary6');
  Q('What is a debate?','["A fight","A formal discussion","A game","A song"]','A formal discussion','We had a class debate.','primary6');
  Q('What does a summary do?','["Adds details","Shortens the main points","Changes the story","Asks questions"]','Shortens the main points','Write a summary of the chapter.','primary6');
  Q('How does a telescope help us?','["Sees far objects clearly","Measures temperature","Weighs things","Cooks food"]','Sees far objects clearly','A telescope helps us see stars.','primary6');
  Q('"Independent" means?','["依赖的","独立的","害怕的","开心的"]','独立的','I am independent.','primary6');

  // Junior 1
  Q('What does F = ma describe?','["Gravity","Force","Energy","Light"]','Force','Force equals mass times acceleration.','junior1');
  Q('What is an atom?','["Smallest unit of matter","A type of energy","Biggest star","A molecule"]','Smallest unit of matter','Everything is made of atoms.','junior1');
  Q('Which is NOT a state of matter?','["Solid","Liquid","Gas","Energy"]','Energy','States of matter are solid, liquid, gas.','junior1');
  Q('What is a variable in algebra?','["A fixed number","An unknown value","A shape","A color"]','An unknown value','X is a variable.','junior1');
  Q('The Tang Dynasty was in which country?','["Japan","China","India","Korea"]','China','The Tang Dynasty was in China.','junior1');
  Q('What is density?','["Mass per volume","Volume per mass","Weight per area","Length per time"]','Mass per volume','Density is mass per volume.','junior1');
  Q('"Revolution" means?','["进化","革命","旋转","改革"]','革命','The Industrial Revolution changed the world.','junior1');
  Q('What are the three states of matter?','["Solid, liquid, gas","Hot, cold, warm","Big, small, medium","Fast, slow, steady"]','Solid, liquid, gas','Matter exists as solid, liquid, or gas.','junior1');
  Q('What is a molecule?','["A type of atom","Two or more atoms bonded","A type of energy","A particle of light"]','Two or more atoms bonded','Water is H2O molecules.','junior1');
  Q('"Latitude" measures?','["North-south position","East-west position","Height above sea","Depth below sea"]','North-south position','Latitude lines run east-west but measure north-south.','junior1');
  Q('What does "civilization" mean?','["A city","An advanced society","A building","A war"]','An advanced society','China has an ancient civilization.','junior1');
  Q('What is AC current?','["Current that flows one way","Current that alternates direction","Static electricity","Magnetic current"]','Current that alternates direction','AC current alternates direction periodically.','junior1');
  Q('What causes friction?','["Smooth surfaces","Rough surfaces rubbing","Gravity","Wind"]','Rough surfaces rubbing','Friction slows things down.','junior1');
  Q('"Democracy" means?','["Rule by king","Rule by the people","Rule by army","No rules"]','Rule by the people','Democracy means rule by the people.','junior1');
  Q('What is a chemical compound?','["A pure element","A substance from combined elements","A type of mixture","A physical change"]','A substance from combined elements','Salt is a compound of sodium and chlorine.','junior1');

  // Junior 2
  Q('What does pH 7 mean?','["Acidic","Neutral","Basic","Salty"]','Neutral','Pure water has pH 7.','junior2');
  Q('What does a lens do?','["Reflects light","Focuses light","Blocks light","Creates light"]','Focuses light','A lens focuses light.','junior2');
  Q('What carries genetic information?','["RNA","DNA","Protein","Lipid"]','DNA','DNA stores genetic information.','junior2');
  Q('Ohm\'s law relates what?','["Force and mass","Voltage and current","Speed and time","Light and heat"]','Voltage and current','V = IR relates voltage and current.','junior2');
  Q('What is a catalyst?','["Slows reaction","Speeds up reaction","Stops reaction","Has no effect"]','Speeds up reaction','A catalyst speeds up the reaction.','junior2');
  Q('What is refraction?','["Light bouncing off","Light bending through","Light being absorbed","Light disappearing"]','Light bending through','Refraction bends light when it enters water.','junior2');
  Q('"Probability" means?','["Certainty","Likelihood of an event","A number","A measurement"]','Likelihood of an event','The probability of rolling a 6 is 1/6.','junior2');
  Q('What is oxidation?','["A substance gains oxygen","A substance loses mass","A substance freezes","A substance melts"]','A substance gains oxygen','Iron oxidizes to form rust.','junior2');
  Q('What are parallel lines?','["Lines that cross","Lines that never meet","Lines that curve","Lines that break"]','Lines that never meet','Parallel lines never intersect.','junior2');
  Q('What is the Pythagorean theorem used for?','["Finding area","Finding relationships in triangles","Finding volume","Finding speed"]','Finding relationships in triangles','a² + b² = c² for right triangles.','junior2');
  Q('What is electrolysis?','["Splitting compounds with electricity","Mixing chemicals","Heating substances","Cooling gases"]','Splitting compounds with electricity','Electrolysis splits water into H₂ and O₂.','junior2');
  Q('How do mirrors reflect light?','["Angle of incidence equals angle of reflection","Light is absorbed","Light is scattered","Light is bent"]','Angle of incidence equals angle of reflection','Light reflects at the same angle it arrives.','junior2');
  Q('What is voltage?','["Flow of electrons","Electrical potential difference","Resistance","Power"]','Electrical potential difference','Voltage drives electric current.','junior2');
  Q('"Statistics" is about?','["Collecting and analyzing data","Creating art","Writing stories","Building structures"]','Collecting and analyzing data','We use statistics to analyze data.','junior2');
  Q('What is evolution?','["Species change over time","Animals become machines","Plants turn to animals","Everything stays the same"]','Species change over time','Evolution explains how species change.','junior2');

  // Junior 3
  Q('What shape is a quadratic graph?','["Line","Circle","Parabola","Triangle"]','Parabola','A quadratic function forms a parabola.','junior3');
  Q('What is momentum?','["Mass × velocity","Force × distance","Energy × time","Power × speed"]','Mass × velocity','Momentum is mass times velocity.','junior3');
  Q('What is globalization?','["Countries disconnect","World becomes connected","Only trade","Only culture"]','World becomes connected','Globalization connects countries.','junior3');
  Q('Which energy is NOT renewable?','["Solar","Wind","Coal","Hydro"]','Coal','Coal is not renewable.','junior3');
  Q('What does DNA stand for?','["Deoxyribonucleic Acid","Dynamic Network","Digital Code","Double Nuclear Atom"]','Deoxyribonucleic Acid','DNA stores genetic information.','junior3');
  Q('What is thermodynamics?','["Study of heat and energy","Study of life","Study of stars","Study of rocks"]','Study of heat and energy','Thermodynamics studies heat and energy.','junior3');
  Q('"Innovation" means?','["保持不变","创新","破坏","模仿"]','创新','Innovation drives progress.','junior3');
  Q('What is a logarithm?','["Inverse of exponent","Type of angle","A shape","A number"]','Inverse of exponent','Logarithm is the inverse of exponent.','junior3');
  Q('What is organic chemistry?','["Study of carbon compounds","Study of rocks","Study of water","Study of air"]','Study of carbon compounds','Organic chemistry studies carbon compounds.','junior3');
  Q('What are electromagnetic waves?','["Sound waves","Waves of electric and magnetic fields","Water waves","Seismic waves"]','Waves of electric and magnetic fields','Light is electromagnetic waves.','junior3');
  Q('"Philosophy" means?','["Love of wisdom","Study of numbers","Study of stars","Study of languages"]','Love of wisdom','Philosophy asks deep questions.','junior3');
  Q('What is nuclear fusion?','["Splitting atoms","Combining atoms","Burning fuel","Solar panels"]','Combining atoms','The sun uses nuclear fusion.','junior3');
  Q('What is a vector?','["Quantity with magnitude and direction","A straight line","A type of number","A shape"]','Quantity with magnitude and direction','A vector has magnitude and direction.','junior3');
  Q('"Psychology" studies?','["The mind","The stars","Rocks","Plants"]','The mind','Psychology studies the mind.','junior3');
  Q('What is carbon footprint?','["Total carbon emissions","Size of carbon atom","Weight of carbon","Color of carbon"]','Total carbon emissions','We should reduce our carbon footprint.','junior3');

  // ======================= CONTENT / LESSONS =======================
  const content = [];
  function C(title, level, type, tags, body) {
    content.push({ title, level, type, tags, content: body });
  }

  // Kindergarten - Chinese stories & math
  C('认识数字 1-10','kindergarten','lesson',['math','numbers'],'认识数字1到10。1像铅笔细又长，2像小鸭水上漂，3像耳朵听声音，4像小旗迎风飘，5像秤钩来买菜，6像豆芽咧嘴角，7像镰刀割青草，8像麻花拧一遭，9像勺子能盛饭，10像铅笔加鸡蛋。');
  C('认识颜色','kindergarten','lesson',['art','colors'],'红色是苹果的颜色，黄色是香蕉的颜色，蓝色是天空的颜色，绿色是小草的颜色。我们周围有各种各样的颜色，让世界变得美丽多彩。');
  C('小兔子乖乖','kindergarten','story',['story','safety'],'小兔子乖乖，把门开开，不开不开就不开，妈妈没回来。大灰狼来了，小兔子不开门，真是聪明的小兔子。小朋友们也要记住，不能给陌生人开门哦。');
  C('认识动物','kindergarten','lesson',['science','animals'],'小猫喵喵叫，小狗汪汪叫，小鸡叽叽叽，小鸭嘎嘎嘎。每个动物都有自己独特的叫声。动物是我们的好朋友，我们要爱护它们。');
  C('拔萝卜','kindergarten','story',['story','teamwork'],'老公公种了一个大萝卜，萝卜长得太大了，老公公拔不动。老婆婆来帮忙，还是拔不动。小孙女、小狗、小猫、小老鼠都来帮忙，大家一起用力，终于把大萝卜拔出来了！团结力量大！');
  C('汉语拼音 a o e','kindergarten','lesson',['chinese','pinyin'],'a像一张大嘴巴，医生检查嘴巴张大大。o像公鸡喔喔叫，圆圆嘴巴o o o。e像白鹅水中游，扁扁嘴巴e e e。跟着老师一起读：a——o——e——');

  // Primary 1 - Chinese curriculum
  C('春天来了','primary1','lesson',['chinese','season'],'春天来了，冰雪融化了，小草从地里钻出来了。柳树长出了嫩绿的新芽，桃花、杏花都开了。小燕子从南方飞回来了，春天真美丽！');
  C('认识钟表','primary1','lesson',['math','time'],'钟表上有12个数字，两根指针。短的是时针，长的是分针。时针走一大格是1小时，分针走一小格是1分钟。学会看钟表，做时间的小主人。');
  C('小蝌蚪找妈妈','primary1','story',['story','science'],'小蝌蚪在池塘里游来游去找妈妈。它们看到金鱼叫妈妈，金鱼说"我不是你们的妈妈"。它们看到乌龟叫妈妈，乌龟也说不是。最后它们找到了青蛙妈妈，自己也变成了小青蛙。');
  C('20以内的加减法','primary1','lesson',['math','addition'],'3+5=8，8+2=10，15-5=10。加法是把两个数合在一起，减法是从一个数里去掉一部分。做计算题要仔细认真，先算个位再算十位。');
  C('姓氏歌','primary1','lesson',['chinese','culture'],'赵钱孙李，周吴郑王。诸葛东方，上官欧阳。每个人都有姓氏，姓氏是家族的标志。中国有几百个姓氏，你知道自己的姓氏排在百家姓第几位吗？');

  // Primary 2 - Chinese curriculum
  C('曹冲称象','primary2','story',['story','chinese'],'曹操得到一头大象，想知道大象有多重。大家想了很多办法都不行。曹冲说："把大象赶到船上，在船身刻上水位记号。再把大象换成石头，让船沉到同样的位置。称称石头就知道了。"大家都夸曹冲聪明。');
  C('乘法口诀','primary2','lesson',['math','multiplication'],'一一得一，一二得二，一三得三……九九八十一。乘法口诀是中国特有的计算方法，已经用了两千多年。熟练背诵乘法口诀，计算又快又准。');
  C('望庐山瀑布','primary2','lesson',['chinese','poem'],'日照香炉生紫烟，遥看瀑布挂前川。飞流直下三千尺，疑是银河落九天。这是李白写的诗，描写了庐山瀑布的壮观景象。');
  C('认识方向','primary2','lesson',['science','geography'],'早晨起来，面向太阳，前面是东，后面是西，左面是北，右面是南。迷路了可以看太阳、看星星、看指南针，现在还可以用手机地图导航。');
  C('植物妈妈有办法','primary2','lesson',['science','plants'],'蒲公英妈妈准备了降落伞，风一吹孩子们就出发了。苍耳妈妈给孩子穿上带刺的铠甲，挂在动物的皮毛上到处旅行。豌豆妈妈让豆荚晒在太阳下，啪的一声豆子就蹦跳着离开。');

  // Primary 3 - Chinese curriculum
  C('古诗两首：咏柳、春日','primary3','lesson',['chinese','poem'],'碧玉妆成一树高，万条垂下绿丝绦。不知细叶谁裁出，二月春风似剪刀。——贺知章《咏柳》。胜日寻芳泗水滨，无边光景一时新。等闲识得东风面，万紫千红总是春。——朱熹《春日》。');
  C('分数的初步认识','primary3','lesson',['math','fractions'],'把一个蛋糕平均分成4份，每份是它的四分之一，写作1/4。分子是取的份数，分母是总份数。分数线表示平均分。分数在生活中很常见，比如半个苹果、半杯水。');
  C('陶罐和铁罐','primary3','story',['story','chinese'],'国王的橱柜里有两个罐子，一个是陶罐，一个是铁罐。铁罐总是看不起陶罐，说它一碰就碎。很多年后，铁罐生锈烂掉了，而陶罐被挖出来依然完好。每个人都有长处和短处，要互相尊重。');
  C('认识周长和面积','primary3','lesson',['math','geometry'],'周长是图形一周的长度，面积是图形表面的大小。长方形的周长=(长+宽)×2，面积=长×宽。正方形的周长=边长×4，面积=边长×边长。');
  C('昆虫备忘录','primary3','lesson',['science','animals'],'蜻蜓的翅膀透明轻盈，飞行高手。瓢虫有七星瓢虫和二十八星瓢虫，七星瓢虫是益虫。独角仙力大无穷，能搬动比自己重很多的东西。昆虫的世界真奇妙！');

  // Primary 4 - Chinese curriculum
  C('观潮','primary4','lesson',['chinese','nature'],'钱塘江大潮，自古以来被称为天下奇观。农历八月十八是一年一度的观潮日。浪潮越来越近，犹如千万匹白色战马齐头并进，浩浩荡荡地飞奔而来。那声音如同山崩地裂，好像大地都被震得颤动起来。');
  C('运算定律','primary4','lesson',['math','arithmetic'],'加法交换律：a+b=b+a。加法结合律：(a+b)+c=a+(b+c)。乘法交换律：a×b=b×a。乘法结合律：(a×b)×c=a×(b×c)。乘法分配律：(a+b)×c=a×c+b×c。掌握运算定律可以让计算更简便。');
  C('爬山虎的脚','primary4','lesson',['science','plants'],'爬山虎的脚长在茎上，茎上长叶柄的地方，反面伸出枝状的六七根细丝，每根细丝像蜗牛的触角。细丝跟新叶子一样，也是嫩红的。爬山虎的脚触着墙的时候，六七根细丝的头上就变成小圆片，巴住墙。');
  C('小数加减法','primary4','lesson',['math','decimals'],'计算小数加减法，要把小数点对齐，也就是相同数位对齐。然后按照整数加减法的方法计算，最后在得数里点上小数点。例如：3.5+2.7=6.2，要注意进位和退位。');
  C('为中华之崛起而读书','primary4','story',['chinese','history'],'周恩来少年时在奉天读书。一次校长问大家"为什么而读书"，有的说为明理，有的说为做官。周恩来清晰而坚定地回答："为中华之崛起而读书！"从小树立远大理想，为祖国的强大而努力学习。');

  // Primary 5 - Chinese curriculum
  C('将相和','primary5','story',['chinese','history'],'蔺相如完璧归赵，被封为上大夫。老将廉颇不服气，处处为难蔺相如。蔺相如以国家利益为重，处处避让。廉颇知道后非常惭愧，背上荆条到蔺相如门前请罪。从此将相和好，同心协力保卫赵国。');
  C('分数的乘除法','primary5','lesson',['math','fractions'],'分数乘以整数，分子乘以整数，分母不变。分数乘以分数，分子乘分子，分母乘分母。除以一个数等于乘以它的倒数。例如：2/3×3/4=6/12=1/2。');
  C('少年中国说','primary5','lesson',['chinese','patriotism'],'故今日之责任，不在他人，而全在我少年。少年智则国智，少年富则国富，少年强则国强，少年独立则国独立，少年自由则国自由，少年进步则国进步。美哉我少年中国，与天不老！壮哉我中国少年，与国无疆！');
  C('多边形的面积','primary5','lesson',['math','geometry'],'平行四边形面积=底×高。三角形面积=底×高÷2。梯形面积=(上底+下底)×高÷2。通过割补法，可以把多边形转化为已学过的图形来计算面积。');
  C('太阳系大家庭','primary5','lesson',['science','astronomy'],'太阳是太阳系的中心，八大行星围绕太阳运转。从近到远依次是：水星、金星、地球、火星、木星、土星、天王星、海王星。地球是目前已知唯一有生命的行星。');

  // Primary 6 - Chinese curriculum
  C('石灰吟','primary6','lesson',['chinese','poem'],'千锤万凿出深山，烈火焚烧若等闲。粉骨碎身浑不怕，要留清白在人间。——于谦。这首诗借石灰表达诗人不畏艰难、坚贞不屈的高尚情操。');
  C('百分数','primary6','lesson',['math','percent'],'百分数表示一个数是另一个数的百分之几。例如：45%表示一百分之四十五。折扣：八折就是80%。利率：本金×利率×时间=利息。百分数在生活和金融中广泛应用。');
  C('匆匆','primary6','lesson',['chinese','literature'],'燕子去了，有再来的时候；杨柳枯了，有再青的时候；桃花谢了，有再开的时候。但是，聪明的，你告诉我，我们的日子为什么一去不复返呢？——朱自清。时间飞逝，我们要珍惜时间。');
  C('比例和比例尺','primary6','lesson',['math','ratio'],'比例表示两个比相等的式子。图上距离:实际距离=比例尺。例如1:1000000表示图上1厘米代表实际10千米。比例尺帮助我们在地图上认识和测量距离。');
  C('宇宙与航天','primary6','lesson',['science','space'],'2003年，中国第一艘载人飞船神舟五号发射成功，杨利伟成为中国首位航天员。此后，中国航天不断突破，嫦娥探月、天宫空间站、天问火星探测。探索宇宙是人类永恒的梦想。');

  // Junior 1 - Chinese & Math & Science
  C('一元一次方程','junior1','lesson',['math','algebra'],'含有未知数的等式叫做方程。解方程就是求未知数的值。解一元一次方程的一般步骤：去分母、去括号、移项、合并同类项、系数化为1。例如：2x+3=9，解得x=3。');
  C('世说新语二则','junior1','lesson',['chinese','literature'],'谢太傅寒雪日内集，与儿女讲论文义。俄而雪骤，公欣然曰："白雪纷纷何所似？"兄子胡儿曰："撒盐空中差可拟。"兄女曰："未若柳絮因风起。"——比喻的妙用，让文字充满诗意。');
  C('力和运动','junior1','lesson',['science','physics'],'力是物体对物体的作用。力的三要素：大小、方向、作用点。牛顿第一定律：一切物体在没有受到力的作用时，总保持静止状态或匀速直线运动状态。摩擦力阻碍物体的相对运动。');
  C('生物与环境','junior1','lesson',['science','biology'],'生态系统由生物部分和非生物部分组成。食物链：草→兔→狐。生态系统中能量沿着食物链流动，物质在生物与环境之间循环。保护生态平衡，人人有责。');
  C('从百草园到三味书屋','junior1','lesson',['chinese','literature'],'不必说碧绿的菜畦，光滑的石井栏，高大的皂荚树，紫红的桑葚；也不必说鸣蝉在树叶里长吟，肥胖的黄蜂伏在菜花上，轻捷的叫天子忽然从草间直窜向云霄里去了。单是周围的短短的泥墙根一带，就有无限趣味。');

  // Junior 2 - Chinese & Math & Physics
  C('三角形全等的判定','junior2','lesson',['math','geometry'],'SSS：三边对应相等的两个三角形全等。SAS：两边和它们的夹角对应相等的两个三角形全等。ASA：两角和它们的夹边对应相等的两个三角形全等。AAS：两角和其中一角的对边对应相等的两个三角形全等。HL：斜边和一条直角边对应相等的两个直角三角形全等。');
  C('桃花源记','junior2','lesson',['chinese','literature'],'晋太元中，武陵人捕鱼为业。缘溪行，忘路之远近。忽逢桃花林，夹岸数百步，中无杂树，芳草鲜美，落英缤纷。——陶渊明笔下的世外桃源。');
  C('光的反射和折射','junior2','lesson',['science','physics'],'光的反射定律：反射光线、入射光线和法线在同一平面内，反射光线和入射光线分居法线两侧，反射角等于入射角。光的折射：光从一种介质斜射入另一种介质时，传播方向发生偏折。');
  C('电路与电流','junior2','lesson',['science','physics'],'电路由电源、开关、导线和用电器组成。串联电路电流处处相等，总电压等于各部分电压之和。并联电路各支路电压相等，总电流等于各支路电流之和。欧姆定律：I=U/R。');
  C('岳阳楼记','junior2','lesson',['chinese','literature'],'不以物喜，不以己悲。居庙堂之高则忧其民，处江湖之远则忧其君。是进亦忧，退亦忧。然则何时而乐耶？其必曰"先天下之忧而忧，后天下之乐而乐"乎！——范仲淹的博大胸怀。');

  // Junior 3 - Chinese & Math & Chemistry
  C('二次函数','junior3','lesson',['math','algebra'],'形如y=ax²+bx+c（a≠0）的函数叫做二次函数。其图像是一条抛物线。a>0开口向上，a<0开口向下。对称轴x=-b/(2a)，顶点坐标(-b/(2a), (4ac-b²)/(4a))。二次函数在物理、经济等领域有广泛应用。');
  C('出师表','junior3','lesson',['chinese','literature'],'臣亮言：先帝创业未半而中道崩殂，今天下三分，益州疲弊，此诚危急存亡之秋也。然侍卫之臣不懈于内，忠志之士忘身于外者，盖追先帝之殊遇，欲报之于陛下也。——诸葛亮的赤胆忠心。');
  C('化学方程式','junior3','lesson',['science','chemistry'],'化学方程式用化学式表示化学反应的式子。例如：2H₂+O₂→2H₂O。书写步骤：写化学式，配平，标注反应条件和气体沉淀符号。化学方程式揭示了反应物和生成物之间的质量关系。');
  C('锐角三角函数','junior3','lesson',['math','trigonometry'],'在直角三角形中，sinA=对边/斜边，cosA=邻边/斜边，tanA=对边/邻边。特殊的三角函数值：sin30°=1/2，sin45°=√2/2，sin60°=√3/2。三角函数在测量、工程中广泛应用。');
  C('能源与可持续发展','junior3','lesson',['science','environment'],'化石能源（煤、石油、天然气）不可再生且污染环境。新能源包括太阳能、风能、水能、核能、地热能等。我国提出"双碳"目标：2030年前碳达峰，2060年前碳中和。发展清洁能源，保护地球家园。');

  // ======================= NEW CONTENT: Programming, Geography, Art, Music, Health =======================

  // Kindergarten - fun activities
  C('认识形状','kindergarten','lesson',['math','geometry'],'圆形像太阳，方形像窗户，三角形像屋顶，长方形像门。小朋友们，请看看周围，你能找到这些形状吗？圆形、方形、三角形、长方形，它们无处不在！');
  C('交通标志','kindergarten','lesson',['safety','life'],'红灯停，绿灯行，黄灯亮了等一等。过马路要走斑马线，牵好爸爸妈妈的手。安全第一，小朋友们要记住哦！');
  C('我的身体','kindergarten','lesson',['science','health'],'我有两只眼睛看世界，两只耳朵听声音，一个鼻子闻气味，一张嘴巴吃东西。两只手能做很多事情，两只脚能跑能跳。我的身体真奇妙！');
  C('认识天气','kindergarten','lesson',['science','nature'],'今天天气怎么样？晴天出太阳，阴天灰蒙蒙，下雨要打伞，下雪可以堆雪人。不同的天气，我们可以做不同的事情。');
  C('礼貌用语','kindergarten','lesson',['moral','culture'],'请、谢谢、对不起、没关系、再见。礼貌用语要记牢，做个文明好宝宝。见到老师说"老师好"，得到帮助说"谢谢"。');

  // Primary 1 - expanded
  C('认识人民币','primary1','lesson',['math','money'],'人民币是中国的钱。元、角、分是人民币的单位。1元=10角，1角=10分。纸币有1元、5元、10元、20元、50元、100元。学会用钱，做个理财小能手。');
  C('升国旗','primary1','lesson',['moral','patriotism'],'星期一早上，学校举行升旗仪式。国旗是五星红旗，红色象征革命，黄色星星象征光明。我们面向国旗敬礼，唱国歌。我爱我的祖国！');
  C('身边的科学','primary1','lesson',['science','nature'],'为什么天会下雨？云朵里的水滴变大了就会落下来。为什么冰会融化？温度升高了冰就变成水。科学就在我们身边！');
  C('动物分类','primary1','lesson',['science','animals'],'动物可以分为哺乳动物、鸟类、爬行动物、两栖动物和鱼类。哺乳动物有毛发，用奶喂宝宝。鸟类有羽毛和翅膀。鱼类生活在水中。');
  C('认识地图','primary1','lesson',['geography','life'],'地图是世界的缩小版。上北下南，左西右东。我们可以在地图上找到自己的家、学校和公园。地图帮助我们找到想去的地方。');

  // Primary 2 - expanded  
  C('传统节日','primary2','lesson',['culture','chinese'],'春节是中国最重要的节日，全家团圆吃饺子。元宵节看花灯吃汤圆。端午节赛龙舟吃粽子。中秋节赏月吃月饼。每个节日都有独特的风俗和美食。');
  C('动物迁徙','primary2','lesson',['science','animals'],'大雁秋天飞到南方过冬，春天飞回北方。燕子也喜欢温暖的地方。动物迁徙是为了找到食物和适宜的气候。大自然真奇妙！');
  C('我的家乡','primary2','lesson',['geography','culture'],'每个人都有自己的家乡。你的家乡在哪里？是江南水乡，还是北方平原？是繁华城市，还是宁静山村？无论在哪里，家乡都是最温暖的地方。');
  C('安全用电','primary2','lesson',['safety','science'],'电是很危险的。不要用手去摸插座，不要用湿手碰电器。雷雨天不要看电视。如果看到电线断了，要远离并告诉大人。安全用电，保护自己。');
  C('小小音乐家','primary2','lesson',['music','art'],'do re mi fa so la ti do - 七个音符可以组成美妙的音乐。钢琴有黑白键，小提琴有四根弦，中国的古筝有21根弦。音乐让生活更美好！');

  // Primary 3 - expanded
  C('认识地球','primary3','lesson',['geography','science'],'地球是我们的家园，它像一个大篮球在太空中旋转。地球表面有陆地和海洋，海洋比陆地大得多。地球绕着太阳转，一年转一圈。地球自转一圈是一天。');
  C('编程思维入门','primary3','lesson',['technology','programming'],'编程就像给计算机下指令。顺序执行：先做这个，再做那个。循环：重复做同样的事情。条件判断：如果怎么样，就怎么样。编程思维让我们更有逻辑！');
  C('垃圾分类','primary3','lesson',['environment','science'],'垃圾分为四类：可回收垃圾（纸、塑料、玻璃）、厨余垃圾（食物残渣）、有害垃圾（电池、药品）、其他垃圾。垃圾分类，保护环境，从我做起！');
  C('人体器官','primary3','lesson',['science','health'],'心脏像泵一样把血液送到全身。大脑是我们的"总指挥部"。肺部负责呼吸，吸入氧气。胃负责消化食物。肝脏是人体的"化工厂"。每个器官都很重要！');
  C('画家的故事','primary3','lesson',['art','history'],'齐白石是中国著名画家，他画的虾活灵活现。徐悲鸿画的马奔腾有力。达芬奇画鸡蛋的故事告诉我们：要想成功，必须从基础做起，反复练习。');

  // Primary 4 - expanded
  C('中国地理概况','primary4','lesson',['geography','culture'],'中国位于亚洲东部，面积约960万平方公里，是世界第三大国。有23个省、5个自治区、4个直辖市和2个特别行政区。长江是中国的第一大河，黄河是母亲河。');
  C('简单的电路','primary4','lesson',['technology','science'],'一个简单的电路需要电池、导线和小灯泡。电池提供电能，导线传输电能，小灯泡将电能转化为光能。闭合电路灯泡亮，断开电路灯泡灭。');
  C('书法艺术','primary4','lesson',['art','chinese'],'中国书法有几千年的历史。毛笔字有五种字体：篆书、隶书、楷书、行书、草书。文房四宝是笔、墨、纸、砚。练书法不仅写出漂亮的字，还能修身养性。');
  C('植物的生长','primary4','lesson',['science','plants'],'种子需要水、空气和适宜的温度才能发芽。根向下生长吸收水分，茎向上生长支撑植物，叶子进行光合作用制造食物。植物给我们提供氧气和食物。');
  C('机器人入门','primary4','lesson',['technology','programming'],'机器人是能执行任务的机器。传感器让机器人"看"和"听"，处理器是机器人的"大脑"，执行器让机器人"动"。扫地机器人、工业机器人、医疗机器人，机器人正在改变世界。');

  // Primary 5 - expanded
  C('世界地理奇观','primary5','lesson',['geography','nature'],'珠穆朗玛峰是世界最高峰，高8848米。马里亚纳海沟是世界最深的海沟。撒哈拉沙漠是世界上最大的沙漠。亚马逊雨林是"地球之肺"。尼亚加拉大瀑布壮观无比。');
  C('编程基础：Python','primary5','lesson',['technology','programming'],'Python是一种简单易学的编程语言。print("Hello World") 可以输出文字。变量存储数据，if语句做判断，for循环做重复。学会编程，就能创造属于自己的程序！');
  C('音乐欣赏','primary5','lesson',['music','art'],'贝多芬的《命运交响曲》开头"当当当——当"震撼人心。中国的《梁祝》小提琴协奏曲凄美动人。不同的音乐带给我们不同的感受。你最喜欢什么音乐？');
  C('健康饮食','primary5','lesson',['health','science'],'平衡膳食宝塔告诉我们：每天要多吃谷物和蔬菜，适量吃水果和蛋白质，少吃油盐和糖。早餐要吃好，午餐要吃饱，晚餐要吃少。健康饮食让我们更强壮！');
  C('中国古代科技','primary5','lesson',['history','technology'],'中国古代四大发明：造纸术、印刷术、火药、指南针。蔡伦改进造纸术，毕昇发明活字印刷。这些发明传遍世界，推动了人类文明的进步。');

  // Primary 6 - expanded
  C('世界板块与地震','primary6','lesson',['geography','science'],'地球表面由七大板块组成。板块碰撞形成山脉，板块分离形成海洋。地震是板块运动的结果，用里氏震级衡量强度。日本、印度尼西亚是地震多发国家。');
  C('人工智能基础','primary6','lesson',['technology','programming'],'人工智能让计算机像人一样思考和学习。机器学习通过数据训练模型，深度学习模拟人脑神经网络。AI在医疗、教育、交通、娱乐等领域广泛应用。');
  C('水资源保护','primary6','lesson',['environment','science'],'地球上只有3%的淡水，其中只有不到1%可以饮用。中国是水资源短缺的国家。节约用水：关紧水龙头、用洗菜水浇花、用洗衣水冲厕所。每一滴水都珍贵。');
  C('世界著名建筑','primary6','lesson',['art','history'],'中国的长城蜿蜒万里，埃及的金字塔是古代奇迹，法国的埃菲尔铁塔高324米，澳大利亚的悉尼歌剧院像贝壳，印度的泰姬陵是爱情的象征。建筑是人类智慧的结晶。');
  C('情绪管理','primary6','lesson',['health','psychology'],'每个人都会有开心、难过、生气、害怕的时候。当我们生气时，可以深呼吸、数到10。当我们难过时，可以找朋友聊天。学会管理情绪，做情绪的主人。');

  // Junior 1 - expanded
  C('世界气候类型','junior1','lesson',['geography','science'],'地球有热带、温带和寒带。热带雨林气候炎热多雨，地中海气候夏季炎热干燥、冬季温和多雨，温带季风气候四季分明。气候影响人们的生活方式和农业生产。');
  C('编程：算法入门','junior1','lesson',['technology','programming'],'算法是解决问题的步骤。计算1到100的和可以用循环算法。二分查找比线性查找快得多。冒泡排序是最简单的排序算法。学好算法，编程事半功倍。');
  C('青春期健康','junior1','lesson',['health','biology'],'青春期是身体快速发育的时期。男孩会长高变声，女孩会来月经。要注意营养均衡，保证充足睡眠，适当运动。了解身体的变化，健康快乐地成长。');
  C('中西绘画比较','junior1','lesson',['art','culture'],'中国画讲究"意境"，用笔墨纸砚，山水花鸟皆可入画。西洋画注重"写实"，用油彩画布，讲究透视和光影。徐悲鸿融合中西，开创了中国现代美术。');
  C('互联网安全','junior1','lesson',['technology','safety'],'不要在网上透露真实姓名、地址和电话。不要和陌生网友见面。遇到网络霸凌要告诉家长或老师。设置强密码，定期更换。健康上网，保护自己。');

  // Junior 2 - expanded
  C('中国地形地势','junior2','lesson',['geography','science'],'中国地势西高东低，呈三级阶梯。第一阶梯是青藏高原，平均海拔4000米以上。第二阶梯是内蒙古高原、黄土高原、云贵高原。第三阶梯是东部平原和丘陵。');
  C('数据结构基础','junior2','lesson',['technology','programming'],'数组是相同类型数据的集合，链表由节点连接而成，栈是"后进先出"，队列是"先进先出"，树有根节点和子节点，图由顶点和边组成。数据结构是编程的核心。');
  C('营养与消化','junior2','lesson',['health','biology'],'食物在口腔中被咀嚼，在胃中被消化成食糜，在小肠中被吸收营养，在大肠中水分被吸收。蛋白质、碳水化合物、脂肪、维生素、矿物质是五大营养素。');
  C('文艺复兴艺术','junior2','lesson',['art','history'],'文艺复兴发生在14-16世纪的欧洲。达芬奇的《蒙娜丽莎》《最后的晚餐》，米开朗基罗的《大卫》《创世纪》，拉斐尔的《雅典学院》。文艺复兴让人文精神重放光芒。');
  C('环境保护行动','junior2','lesson',['environment','science'],'减少使用一次性塑料，自带购物袋和水杯。选择公共交通或骑自行车，减少碳排放。参与植树造林，保护野生动物。每个人的小小行动，汇聚成保护地球的巨大力量。');

  // Junior 3 - expanded
  C('中国的自然资源','junior3','lesson',['geography','environment'],'中国矿产资源丰富，煤炭、石油、天然气储量居世界前列。水能资源居世界第一。但人均资源不足，资源分布不均。合理开发、节约资源是可持续发展的关键。');
  C('Python数据分析','junior3','lesson',['technology','programming'],'用Python分析数据：pandas库处理表格数据，matplotlib库绘制图表，numpy库进行数值计算。数据分析帮助我们发现问题、发现规律、做出决策。数据驱动未来！');
  C('疾病预防与免疫','junior3','lesson',['health','biology'],'疫苗帮助身体产生抗体，预防传染病。新冠病毒让全世界认识到公共卫生的重要性。勤洗手、戴口罩、保持社交距离是预防疾病的有效方法。健康是第一财富。');
  C('现代艺术流派','junior3','lesson',['art','culture'],'印象派追求光影变化，莫奈的《日出·印象》是代表作。立体派把物体分解成几何形状，毕加索是代表人物。抽象派完全脱离具象，康定斯基的作品如音乐般自由。');
  C('职业规划','junior3','lesson',['moral','life'],'初中毕业面临人生第一次选择：高中还是职业院校？了解自己的兴趣和特长，探索不同的职业方向。无论选择什么道路，终身学习是成功的基石。');

  // ======================= RETURN =======================
  return {
    vocab,
    quiz,
    content,
    levels: LEVELS
  };

})();
