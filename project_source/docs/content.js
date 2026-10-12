// Learning Companion Robot - Real Content Database
// This file contains real educational content for children

// ==================== ENGLISH VOCABULARY ====================
const englishWordsData = [
    { word: 'Red', meaning: '红色 - /rɛd/', example: 'The apple is red.' },
    { word: 'Blue', meaning: '蓝色 - /bluː/', example: 'The sky is blue.' },
    { word: 'Green', meaning: '绿色 - /ɡriːn/', example: 'The grass is green.' },
    { word: 'Yellow', meaning: '黄色 - /ˈjɛloʊ/', example: 'The sun is yellow.' },
    { word: 'Orange', meaning: '橙色 - /ˈɔrɪndʒ/', example: 'I like orange juice.' },
    { word: 'Purple', meaning: '紫色 - /ˈpɜrpəl/', example: 'The flower is purple.' },
    { word: 'Pink', meaning: '粉色 - /pɪŋk/', example: 'She wears a pink dress.' },
    { word: 'Black', meaning: '黑色 - /blæk/', example: 'The cat is black.' },
    { word: 'White', meaning: '白色 - /waɪt/', example: 'The snow is white.' },
    { word: 'Brown', meaning: '棕色 - /braʊn/', example: 'The dog is brown.' },
    { word: 'Gray', meaning: '灰色 - /ɡreɪ/', example: 'The cloud is gray.' },
    { word: 'Gold', meaning: '金色 - /ɡoʊld/', example: 'The star is gold.' },
    { word: 'Silver', meaning: '银色 - /ˈsɪlvər/', example: 'The spoon is silver.' },
    { word: 'One', meaning: '一 - /wʌn/', example: 'I have one ball.' },
    { word: 'Two', meaning: '二 - /tuː/', example: 'I see two birds.' },
    { word: 'Three', meaning: '三 - /θriː/', example: 'She has three cats.' },
    { word: 'Four', meaning: '四 - /fɔr/', example: 'There are four chairs.' },
    { word: 'Five', meaning: '五 - /faɪv/', example: 'I eat five cookies.' },
    { word: 'Six', meaning: '六 - /sɪks/', example: 'He has six toys.' },
    { word: 'Seven', meaning: '七 - /ˈsɛvən/', example: 'I see seven stars.' },
    { word: 'Eight', meaning: '八 - /eɪt/', example: 'She has eight books.' },
    { word: 'Nine', meaning: '九 - /naɪn/', example: 'I draw nine flowers.' },
    { word: 'Ten', meaning: '十 - /tɛn/', example: 'I have ten fingers.' },
    { word: 'Eleven', meaning: '十一 - /ɪˈlɛvən/', example: 'I see eleven fish.' },
    { word: 'Twelve', meaning: '十二 - /twɛlv/', example: 'She eats twelve grapes.' },
    { word: 'Thirteen', meaning: '十三 - /θɜrˈtiːn/', example: 'He has thirteen blocks.' },
    { word: 'Fourteen', meaning: '十四 - /fɔrˈtiːn/', example: 'I count fourteen eggs.' },
    { word: 'Fifteen', meaning: '十五 - /fɪfˈtiːn/', example: 'She draws fifteen trees.' },
    { word: 'Sixteen', meaning: '十六 - /sɪksˈtiːn/', example: 'I see sixteen stars.' },
    { word: 'Seventeen', meaning: '十七 - /sɛvənˈtiːn/', example: 'He has seventeen cars.' },
    { word: 'Eighteen', meaning: '十八 - /eɪˈtiːn/', example: 'She counts eighteen cups.' },
    { word: 'Nineteen', meaning: '十九 - /naɪnˈtiːn/', example: 'I see nineteen birds.' },
    { word: 'Twenty', meaning: '二十 - /ˈtwɛnti/', example: 'I have twenty toys.' },
    { word: 'Cat', meaning: '猫 - /kæt/', example: 'The cat drinks milk.' },
    { word: 'Dog', meaning: '狗 - /dɒɡ/', example: 'The dog runs fast.' },
    { word: 'Bird', meaning: '鸟 - /bɜrd/', example: 'The bird sings a song.' },
    { word: 'Fish', meaning: '鱼 - /fɪʃ/', example: 'The fish swims in water.' },
    { word: 'Rabbit', meaning: '兔子 - /ˈræbɪt/', example: 'The rabbit jumps high.' },
    { word: 'Duck', meaning: '鸭子 - /dʌk/', example: 'The duck walks slowly.' },
    { word: 'Cow', meaning: '奶牛 - /kaʊ/', example: 'The cow eats grass.' },
    { word: 'Pig', meaning: '猪 - /pɪɡ/', example: 'The pig is pink.' },
    { word: 'Horse', meaning: '马 - /hɔrs/', example: 'The horse runs fast.' },
    { word: 'Sheep', meaning: '羊 - /ʃiːp/', example: 'The sheep is white.' },
    { word: 'Chicken', meaning: '鸡 - /ˈtʃɪkɪn/', example: 'The chicken eats rice.' },
    { word: 'Bear', meaning: '熊 - /bɛr/', example: 'The bear is big.' },
    { word: 'Elephant', meaning: '大象 - /ˈɛlɪfənt/', example: 'The elephant is very big.' },
    { word: 'Monkey', meaning: '猴子 - /ˈmʌŋki/', example: 'The monkey eats bananas.' },
    { word: 'Lion', meaning: '狮子 - /ˈlaɪən/', example: 'The lion is strong.' },
    { word: 'Eyes', meaning: '眼睛 - /aɪz/', example: 'I have two eyes.' },
    { word: 'Ears', meaning: '耳朵 - /ɪrz/', example: 'My ears are small.' },
    { word: 'Nose', meaning: '鼻子 - /noʊz/', example: 'My nose is red.' },
    { word: 'Mouth', meaning: '嘴巴 - /maʊθ/', example: 'I open my mouth.' },
    { word: 'Hands', meaning: '手 - /hændz/', example: 'I wash my hands.' },
    { word: 'Feet', meaning: '脚 - /fiːt/', example: 'My feet are clean.' },
    { word: 'Arms', meaning: '手臂 - /ɑrmz/', example: 'I raise my arms.' },
    { word: 'Legs', meaning: '腿 - /lɛɡz/', example: 'I have two legs.' },
    { word: 'Head', meaning: '头 - /hɛd/', example: 'I nod my head.' },
    { word: 'Hair', meaning: '头发 - /hɛr/', example: 'My hair is long.' },
    { word: 'Teeth', meaning: '牙齿 - /tiːθ/', example: 'I brush my teeth.' },
    { word: 'Fingers', meaning: '手指 - /ˈfɪŋɡərz/', example: 'I have ten fingers.' },
    { word: 'Toes', meaning: '脚趾 - /toʊz/', example: 'I have ten toes.' },
    { word: 'Tongue', meaning: '舌头 - /tʌŋ/', example: 'I stick out my tongue.' },
    { word: 'Apple', meaning: '苹果 - /ˈæpəl/', example: 'I eat an apple.' },
    { word: 'Milk', meaning: '牛奶 - /mɪlk/', example: 'I drink milk every day.' },
    { word: 'Bread', meaning: '面包 - /brɛd/', example: 'I eat bread for breakfast.' },
    { word: 'Egg', meaning: '鸡蛋 - /ɛɡ/', example: 'I eat an egg.' },
    { word: 'Rice', meaning: '米饭 - /raɪs/', example: 'I eat rice for lunch.' },
    { word: 'Meat', meaning: '肉 - /miːt/', example: 'I eat meat for dinner.' },
    { word: 'Cake', meaning: '蛋糕 - /keɪk/', example: 'I eat cake at parties.' },
    { word: 'Candy', meaning: '糖果 - /ˈkændi/', example: 'I like sweet candy.' },
    { word: 'Water', meaning: '水 - /ˈwɔtər/', example: 'I drink water every day.' },
    { word: 'Juice', meaning: '果汁 - /dʒuːs/', example: 'I drink apple juice.' },
    { word: 'Banana', meaning: '香蕉 - /bəˈnænə/', example: 'The monkey eats a banana.' },
    { word: 'Grape', meaning: '葡萄 - /ɡreɪp/', example: 'The grape is purple.' },
    { word: 'Mom', meaning: '妈妈 - /mɑm/', example: 'Mom reads a book.' },
    { word: 'Dad', meaning: '爸爸 - /dæd/', example: 'Dad drives a car.' },
    { word: 'Brother', meaning: '兄弟 - /ˈbrʌðər/', example: 'My brother is tall.' },
    { word: 'Sister', meaning: '姐妹 - /ˈsɪstər/', example: 'My sister is small.' },
    { word: 'Baby', meaning: '宝宝 - /ˈbeɪbi/', example: 'The baby cries loudly.' },
    { word: 'Grandma', meaning: '奶奶 - /ˈɡrænmɑ/', example: 'Grandma cooks good food.' },
    { word: 'Grandpa', meaning: '爷爷 - /ˈɡrænpɑ/', example: 'Grandpa tells stories.' },
    { word: 'Aunt', meaning: '阿姨 - /ænt/', example: 'My aunt visits us.' },
    { word: 'Uncle', meaning: '叔叔 - /ˈʌŋkəl/', example: 'My uncle is funny.' },
    { word: 'Cousin', meaning: '表兄妹 - /ˈkʌzən/', example: 'My cousin plays with me.' },
    { word: 'Mother', meaning: '母亲 - /ˈmʌðər/', example: 'Mother hugs me tight.' },
    { word: 'Father', meaning: '父亲 - /ˈfɑðər/', example: 'Father works all day.' },
    { word: 'Ball', meaning: '球 - /bɔl/', example: 'I throw the ball.' },
    { word: 'Doll', meaning: '洋娃娃 - /dɑl/', example: 'She hugs her doll.' },
    { word: 'Teddy', meaning: '泰迪熊 - /ˈtɛdi/', example: 'I sleep with Teddy.' },
    { word: 'Block', meaning: '积木 - /blɑk/', example: 'I build with blocks.' },
    { word: 'Robot', meaning: '机器人 - /ˈroʊbɑt/', example: 'The robot can walk.' },
    { word: 'Puzzle', meaning: '拼图 - /ˈpʌzəl/', example: 'I do a puzzle.' },
    { word: 'Kite', meaning: '风筝 - /kaɪt/', example: 'The kite flies high.' },
    { word: 'Drum', meaning: '鼓 - /drʌm/', example: 'I play the drum.' },
    { word: 'Balloon', meaning: '气球 - /bəˈluːn/', example: 'The balloon is red.' },
    { word: 'Puppet', meaning: '木偶 - /ˈpʌpɪt/', example: 'I play with a puppet.' },
    { word: 'Scooter', meaning: '滑板车 - /ˈskutər/', example: 'I ride my scooter.' },
    { word: 'Yo-yo', meaning: '悠悠球 - /ˈjoʊjoʊ/', example: 'I play with a yo-yo.' },
    { word: 'Shirt', meaning: '衬衫 - /ʃɜrt/', example: 'I wear a red shirt.' },
    { word: 'Shoes', meaning: '鞋子 - /ʃuːz/', example: 'I put on my shoes.' },
    { word: 'Hat', meaning: '帽子 - /hæt/', example: 'I wear a hat outside.' },
    { word: 'Socks', meaning: '袜子 - /sɑks/', example: 'My socks are warm.' },
    { word: 'Pants', meaning: '裤子 - /pænts/', example: 'I wear blue pants.' },
    { word: 'Dress', meaning: '连衣裙 - /drɛs/', example: 'She wears a pretty dress.' },
    { word: 'Coat', meaning: '外套 - /koʊt/', example: 'I wear a coat in winter.' },
    { word: 'Skirt', meaning: '裙子 - /skɜrt/', example: 'She wears a pink skirt.' },
    { word: 'Gloves', meaning: '手套 - /ɡlʌvz/', example: 'I wear gloves in snow.' },
    { word: 'Scarf', meaning: '围巾 - /skɑrf/', example: 'I wear a warm scarf.' },
    { word: 'Boots', meaning: '靴子 - /buːts/', example: 'I wear boots in rain.' },
    { word: 'Jacket', meaning: '夹克 - /ˈdʒækɪt/', example: 'My jacket is blue.' },
    { word: 'Bed', meaning: '床 - /bɛd/', example: 'I sleep on my bed.' },
    { word: 'Table', meaning: '桌子 - /ˈteɪbəl/', example: 'The cup is on the table.' },
    { word: 'Chair', meaning: '椅子 - /tʃɛr/', example: 'I sit on the chair.' },
    { word: 'Door', meaning: '门 - /dɔr/', example: 'I open the door.' },
    { word: 'Window', meaning: '窗户 - /ˈwɪndoʊ/', example: 'I look out the window.' },
    { word: 'Cup', meaning: '杯子 - /kʌp/', example: 'I drink from a cup.' },
    { word: 'Plate', meaning: '盘子 - /pleɪt/', example: 'The apple is on the plate.' },
    { word: 'Spoon', meaning: '勺子 - /spuːn/', example: 'I eat with a spoon.' },
    { word: 'Fork', meaning: '叉子 - /fɔrk/', example: 'I use a fork to eat.' },
    { word: 'Book', meaning: '书 - /bʊk/', example: 'I read a book.' },
    { word: 'Clock', meaning: '钟 - /klɑk/', example: 'The clock shows time.' },
    { word: 'Lamp', meaning: '灯 - /læmp/', example: 'The lamp is on.' },
    { word: 'Sun', meaning: '太阳 - /sʌn/', example: 'The sun is hot.' },
    { word: 'Moon', meaning: '月亮 - /muːn/', example: 'The moon is bright.' },
    { word: 'Flower', meaning: '花 - /ˈflaʊər/', example: 'The flower is pretty.' },
    { word: 'Tree', meaning: '树 - /triː/', example: 'The tree is tall.' },
    { word: 'Grass', meaning: '草 - /ɡræs/', example: 'The grass is green.' },
    { word: 'Cloud', meaning: '云 - /klaʊd/', example: 'The cloud is white.' },
    { word: 'Sky', meaning: '天空 - /skaɪ/', example: 'The sky is blue.' },
    { word: 'Rain', meaning: '雨 - /reɪn/', example: 'The rain falls down.' },
    { word: 'Snow', meaning: '雪 - /snoʊ/', example: 'The snow is cold.' },
    { word: 'River', meaning: '河流 - /ˈrɪvər/', example: 'The river flows slowly.' },
    { word: 'Sea', meaning: '大海 - /siː/', example: 'The sea is blue.' },
    { word: 'Mountain', meaning: '山 - /ˈmaʊntən/', example: 'The mountain is high.' },
    { word: 'Leaf', meaning: '叶子 - /liːf/', example: 'The leaf falls down.' },
    { word: 'Rock', meaning: '石头 - /rɑk/', example: 'The rock is heavy.' },
    { word: 'Sunny', meaning: '晴朗的 - /ˈsʌni/', example: 'It is sunny today.' },
    { word: 'Rainy', meaning: '下雨的 - /ˈreɪni/', example: 'It is rainy outside.' },
    { word: 'Cloudy', meaning: '多云的 - /ˈklaʊdi/', example: 'It is cloudy today.' },
    { word: 'Windy', meaning: '有风的 - /ˈwɪndi/', example: 'It is very windy.' },
    { word: 'Snowy', meaning: '下雪的 - /ˈsnoʊi/', example: 'It is snowy and cold.' },
    { word: 'Warm', meaning: '温暖的 - /wɔrm/', example: 'The sun feels warm.' },
    { word: 'Cool', meaning: '凉爽的 - /kuːl/', example: 'The wind is cool.' },
    { word: 'Stormy', meaning: '暴风雨的 - /ˈstɔrmi/', example: 'It is stormy tonight.' },
    { word: 'Foggy', meaning: '有雾的 - /ˈfɒɡi/', example: 'It is foggy outside.' },
    { word: 'Bright', meaning: '明亮的 - /braɪt/', example: 'The sun is bright.' },
    { word: 'Sit', meaning: '坐 - /sɪt/', example: 'I sit on the chair.' },
    { word: 'Stand', meaning: '站 - /stænd/', example: 'I stand up tall.' },
    { word: 'Walk', meaning: '走 - /wɔk/', example: 'I walk to school.' },
    { word: 'Run', meaning: '跑 - /rʌn/', example: 'I run in the park.' },
    { word: 'Jump', meaning: '跳 - /dʒʌmp/', example: 'I jump up high.' },
    { word: 'Eat', meaning: '吃 - /iːt/', example: 'I eat my breakfast.' },
    { word: 'Drink', meaning: '喝 - /drɪŋk/', example: 'I drink cold water.' },
    { word: 'Sleep', meaning: '睡觉 - /sliːp/', example: 'I sleep at night.' },
    { word: 'Read', meaning: '读 - /riːd/', example: 'I read a book.' },
    { word: 'Write', meaning: '写 - /raɪt/', example: 'I write my name.' },
    { word: 'Sing', meaning: '唱歌 - /sɪŋ/', example: 'I sing a song.' },
    { word: 'Dance', meaning: '跳舞 - /dæns/', example: 'I dance with mom.' },
    { word: 'Play', meaning: '玩 - /pleɪ/', example: 'I play with friends.' },
    { word: 'Swim', meaning: '游泳 - /swɪm/', example: 'I swim in the pool.' },
    { word: 'Fly', meaning: '飞 - /flaɪ/', example: 'The bird can fly.' },
    { word: 'Clap', meaning: '拍手 - /klæp/', example: 'I clap my hands.' },
    { word: 'Hop', meaning: '单脚跳 - /hɑp/', example: 'I hop on one foot.' },
    { word: 'In', meaning: '在...里面 - /ɪn/', example: 'The cat is in the box.' },
    { word: 'On', meaning: '在...上面 - /ɒn/', example: 'The book is on the table.' },
    { word: 'Under', meaning: '在...下面 - /ˈʌndər/', example: 'The ball is under the chair.' },
    { word: 'Behind', meaning: '在...后面 - /bɪˈhaɪnd/', example: 'I stand behind the door.' },
    { word: 'Above', meaning: '在...上方 - /əˈbʌv/', example: 'The star is above us.' },
    { word: 'Below', meaning: '在...下方 - /bɪˈloʊ/', example: 'The fish swims below.' },
    { word: 'Inside', meaning: '在...里面 - /ɪnˈsaɪd/', example: 'I play inside the house.' },
    { word: 'Between', meaning: '在...之间 - /bɪˈtwiːn/', example: 'I sit between mom and dad.' },
    { word: 'Beside', meaning: '在...旁边 - /bɪˈsaɪd/', example: 'I sit beside my friend.' },
    { word: 'Near', meaning: '在...附近 - /nɪr/', example: 'The park is near my house.' },
    { word: 'Hello', meaning: '你好 - /hɛˈloʊ/', example: 'Hello, how are you?' },
    { word: 'Goodbye', meaning: '再见 - /ɡʊdˈbaɪ/', example: 'Goodbye, see you later.' },
    { word: 'Please', meaning: '请 - /pliːz/', example: 'Please give me the book.' },
    { word: 'Sorry', meaning: '对不起 - /ˈsɒri/', example: 'I am sorry.' },
    { word: 'Thank you', meaning: '谢谢你 - /θæŋk juː/', example: 'Thank you for the gift.' },
    { word: 'Yes', meaning: '是的 - /jɛs/', example: 'Yes, I want more milk.' },
    { word: 'No', meaning: '不 - /noʊ/', example: 'No, I do not want.' },
    { word: 'Hi', meaning: '嗨 - /haɪ/', example: 'Hi, my name is Tom.' },
    { word: 'Bye', meaning: '拜拜 - /baɪ/', example: 'Bye, see you soon.' },
    { word: 'Thanks', meaning: '谢谢 - /θæŋks/', example: 'Thanks for the toy.' },
    { word: 'Welcome', meaning: '欢迎 - /ˈwɛlkəm/', example: 'Welcome to my house.' },
    { word: 'Excuse', meaning: '打扰一下 - /ɪkˈskjuːz/', example: 'Excuse me, please.' },
    { word: 'Big', meaning: '大的 - /bɪɡ/', example: 'The elephant is big.' },
    { word: 'Small', meaning: '小的 - /smɔl/', example: 'The mouse is small.' },
    { word: 'Happy', meaning: '开心的 - /ˈhæpi/', example: 'I am happy today.' },
    { word: 'Sad', meaning: '伤心的 - /sæd/', example: 'The baby is sad.' },
    { word: 'Tall', meaning: '高的 - /tɔl/', example: 'My dad is tall.' },
    { word: 'Short', meaning: '矮的 - /ʃɔrt/', example: 'My sister is short.' },
    { word: 'Long', meaning: '长的 - /lɒŋ/', example: 'The snake is long.' },
    { word: 'Fast', meaning: '快的 - /fæst/', example: 'The car is fast.' },
    { word: 'Slow', meaning: '慢的 - /sloʊ/', example: 'The turtle is slow.' },
    { word: 'Clean', meaning: '干净的 - /kliːn/', example: 'My room is clean.' },
    { word: 'Dirty', meaning: '脏的 - /ˈdɜrti/', example: 'My hands are dirty.' },
    { word: 'Soft', meaning: '柔软的 - /sɒft/', example: 'The teddy is soft.' },
    { word: 'Hard', meaning: '坚硬的 - /hɑrd/', example: 'The rock is hard.' },
    { word: 'Wet', meaning: '湿的 - /wɛt/', example: 'The towel is wet.' },
    { word: 'Dry', meaning: '干的 - /draɪ/', example: 'My shirt is dry.' },
    { word: 'Car', meaning: '汽车 - /kɑr/', example: 'The car is red.' },
    { word: 'Bus', meaning: '公共汽车 - /bʌs/', example: 'I ride the bus to school.' },
    { word: 'Train', meaning: '火车 - /treɪn/', example: 'The train goes fast.' },
    { word: 'Plane', meaning: '飞机 - /pleɪn/', example: 'The plane flies in the sky.' },
    { word: 'Boat', meaning: '船 - /boʊt/', example: 'The boat floats on water.' },
    { word: 'Bike', meaning: '自行车 - /baɪk/', example: 'I ride my bike.' },
    { word: 'Truck', meaning: '卡车 - /trʌk/', example: 'The truck is big.' },
    { word: 'Ship', meaning: '轮船 - /ʃɪp/', example: 'The ship sails on the sea.' },
    { word: 'Van', meaning: '面包车 - /væn/', example: 'We go in the van.' },
    { word: 'Taxi', meaning: '出租车 - /ˈtæksi/', example: 'We take a taxi.' },
    { word: 'Helicopter', meaning: '直升机 - /ˈhɛlɪkɑptər/', example: 'The helicopter flies up.' },
    { word: 'Circle', meaning: '圆形 - /ˈsɜrkəl/', example: 'I draw a circle.' },
    { word: 'Square', meaning: '正方形 - /skwɛr/', example: 'The box is a square.' },
    { word: 'Triangle', meaning: '三角形 - /ˈtraɪæŋɡəl/', example: 'The pizza is a triangle.' },
    { word: 'Star', meaning: '星星 - /stɑr/', example: 'I see a star.' },
    { word: 'Heart', meaning: '心形 - /hɑrt/', example: 'I draw a heart.' },
    { word: 'Oval', meaning: '椭圆形 - /ˈoʊvəl/', example: 'The egg is an oval.' },
    { word: 'Rectangle', meaning: '长方形 - /ˈrɛktæŋɡəl/', example: 'The door is a rectangle.' },
    { word: 'Diamond', meaning: '菱形 - /ˈdaɪəmənd/', example: 'The kite is a diamond.' },
    { word: 'Cross', meaning: '十字形 - /krɒs/', example: 'I make a cross shape.' },
    { word: 'Arrow', meaning: '箭头 - /ˈæroʊ/', example: 'The arrow points up.' },
    { word: 'Crescent', meaning: '月牙形 - /ˈkrɛsənt/', example: 'The moon is a crescent.' },
    { word: 'Morning', meaning: '早上 - /ˈmɔrnɪŋ/', example: 'Good morning, Mom.' },
    { word: 'Afternoon', meaning: '下午 - /æftərˈnuːn/', example: 'Good afternoon, Dad.' },
    { word: 'Evening', meaning: '傍晚 - /ˈiːvnɪŋ/', example: 'Good evening, Grandma.' },
    { word: 'Night', meaning: '夜晚 - /naɪt/', example: 'Good night, sleep well.' },
    { word: 'Day', meaning: '白天 - /deɪ/', example: 'I play during the day.' },
    { word: 'Today', meaning: '今天 - /təˈdeɪ/', example: 'Today is a sunny day.' },
    { word: 'Now', meaning: '现在 - /naʊ/', example: 'I eat now.' },
    { word: 'Later', meaning: '稍后 - /ˈleɪtər/', example: 'I will play later.' },
    { word: 'Early', meaning: '早的 - /ˈɜrli/', example: 'I wake up early.' },
    { word: 'Late', meaning: '晚的 - /leɪt/', example: 'Do not be late.' },
    { word: 'Soon', meaning: '很快 - /suːn/', example: 'We will go soon.' },
    { word: 'Up', meaning: '向上 - /ʌp/', example: 'Look up at the sky.' },
    { word: 'Down', meaning: '向下 - /daʊn/', example: 'Sit down, please.' },
    { word: 'Left', meaning: '左边 - /lɛft/', example: 'Turn left at the corner.' },
    { word: 'Right', meaning: '右边 - /raɪt/', example: 'Turn right at the tree.' },
    { word: 'Here', meaning: '这里 - /hɪr/', example: 'Come here, please.' },
    { word: 'There', meaning: '那里 - /ðɛr/', example: 'The ball is over there.' },
    { word: 'Front', meaning: '前面 - /frʌnt/', example: 'I stand in front.' },
    { word: 'Back', meaning: '后面 - /bæk/', example: 'I go back home.' },
    { word: 'Top', meaning: '顶部 - /tɒp/', example: 'The cat is on top.' },
    { word: 'Bottom', meaning: '底部 - /ˈbɒtəm/', example: 'The ball is at the bottom.' },
    { word: 'I', meaning: '我 - /aɪ/', example: 'I am a boy.' },
    { word: 'You', meaning: '你 - /juː/', example: 'You are my friend.' },
    { word: 'He', meaning: '他 - /hiː/', example: 'He is my brother.' },
    { word: 'She', meaning: '她 - /ʃiː/', example: 'She is my sister.' },
    { word: 'It', meaning: '它 - /ɪt/', example: 'It is a cat.' },
    { word: 'We', meaning: '我们 - /wiː/', example: 'We go to school.' },
    { word: 'They', meaning: '他们 - /ðeɪ/', example: 'They play outside.' },
    { word: 'My', meaning: '我的 - /maɪ/', example: 'This is my toy.' },
    { word: 'Your', meaning: '你的 - /jɔr/', example: 'That is your book.' },
    { word: 'His', meaning: '他的 - /hɪz/', example: 'This is his hat.' },
    { word: 'Her', meaning: '她的 - /hɜr/', example: 'That is her doll.' },
    { word: 'Its', meaning: '它的 - /ɪts/', example: 'The dog wags its tail.' },
    { word: 'Our', meaning: '我们的 - /aʊr/', example: 'This is our house.' },
    { word: 'This', meaning: '这个 - /ðɪs/', example: 'This is a ball.' },
    { word: 'That', meaning: '那个 - /ðæt/', example: 'That is a star.' },
    { word: 'These', meaning: '这些 - /ðiːz/', example: 'These are my shoes.' },
    { word: 'Those', meaning: '那些 - /ðoʊz/', example: 'Those are your socks.' },
    { word: 'ruler', meaning: '尺子 - /ˈruːlər/', example: 'I have a new ruler.' },
    { word: 'eraser', meaning: '橡皮擦 - /ɪˈreɪsər/', example: 'My eraser is small.' },
    { word: 'sharpener', meaning: '卷笔刀 - /ˈʃɑːrpənər/', example: 'Use the sharpener for pencils.' },
    { word: 'backpack', meaning: '书包 - /ˈbækpæk/', example: 'My backpack is heavy.' },
    { word: 'notebook', meaning: '笔记本 - /ˈnoʊtbʊk/', example: 'I write in my notebook.' },
    { word: 'blackboard', meaning: '黑板 - /ˈblækbɔːrd/', example: 'The teacher writes on the blackboard.' },
    { word: 'chalk', meaning: '粉笔 - /tʃɔːk/', example: 'Write with white chalk.' },
    { word: 'glue', meaning: '胶水 - /ɡluː/', example: 'Glue the paper here.' },
    { word: 'scissors', meaning: '剪刀 - /ˈsɪzərz/', example: 'Cut the paper with scissors.' },
    { word: 'marker', meaning: '马克笔 - /ˈmɑːrkər/', example: 'Color with a red marker.' },
    { word: 'paintbrush', meaning: '画笔 - /ˈpeɪntbrʌʃ/', example: 'I paint with a paintbrush.' },
    { word: 'calculator', meaning: '计算器 - /ˈkælkjuleɪtər/', example: 'Use a calculator for math.' },
    { word: 'dictionary', meaning: '词典 - /ˈdɪkʃəneri/', example: 'Look up words in a dictionary.' },
    { word: 'breakfast', meaning: '早餐 - /ˈbrekfəst/', example: 'I eat eggs for breakfast.' },
    { word: 'dinner', meaning: '晚餐 - /ˈdɪnər/', example: 'We have dinner at six.' },
    { word: 'vegetables', meaning: '蔬菜 - /ˈvedʒtəbəlz/', example: 'Eat your vegetables every day.' },
    { word: 'fruit', meaning: '水果 - /fruːt/', example: 'I like fresh fruit.' },
    { word: 'cheese', meaning: '奶酪 - /tʃiːz/', example: 'Put cheese on the bread.' },
    { word: 'bread', meaning: '面包 - /bred/', example: 'I eat bread for breakfast.' },
    { word: 'juice', meaning: '果汁 - /dʒuːs/', example: 'Drink orange juice with lunch.' },
    { word: 'soup', meaning: '汤 - /suːp/', example: 'The soup is very hot.' },
    { word: 'rice', meaning: '米饭 - /raɪs/', example: 'We eat rice for dinner.' },
    { word: 'noodles', meaning: '面条 - /ˈnuːdəlz/', example: 'I like noodles with sauce.' },
    { word: 'sandwich', meaning: '三明治 - /ˈsændwɪtʃ/', example: 'Make a cheese sandwich.' },
    { word: 'cookie', meaning: '饼干 - /ˈkʊki/', example: 'This cookie tastes sweet.' },
    { word: 'pizza', meaning: '披萨 - /ˈpiːtsə/', example: 'We eat pizza on Friday.' },
    { word: 'cow', meaning: '奶牛 - /kaʊ/', example: 'The cow eats grass.' },
    { word: 'bear', meaning: '熊 - /bɛr/', example: 'The bear lives in the forest.' },
    { word: 'giraffe', meaning: '长颈鹿 - /dʒəˈræf/', example: 'The giraffe has a long neck.' },
    { word: 'zebra', meaning: '斑马 - /ˈziːbrə/', example: 'A zebra has black and white stripes.' },
    { word: 'panda', meaning: '熊猫 - /ˈpændə/', example: 'Pandas eat bamboo every day.' },
    { word: 'kangaroo', meaning: '袋鼠 - /ˌkæŋɡəˈruː/', example: 'A kangaroo can jump far.' },
    { word: 'dolphin', meaning: '海豚 - /ˈdɑːlfɪn/', example: 'The dolphin swims in the sea.' },
    { word: 'whale', meaning: '鲸鱼 - /weɪl/', example: 'The whale is very big.' },
    { word: 'turtle', meaning: '海龟 - /ˈtɜːrtl/', example: 'The turtle walks slowly.' },
    { word: 'parrot', meaning: '鹦鹉 - /ˈpærət/', example: 'The parrot can talk.' },
    { word: 'owl', meaning: '猫头鹰 - /aʊl/', example: 'The owl sees at night.' },
    { word: 'butterfly', meaning: '蝴蝶 - /ˈbʌtərflaɪ/', example: 'A butterfly has pretty wings.' },
    { word: 'spider', meaning: '蜘蛛 - /ˈspaɪdər/', example: 'The spider makes a web.' },
    { word: 'parents', meaning: '父母 - /ˈpɛrənts/', example: 'My parents love me.' },
    { word: 'uncle', meaning: '叔叔 - /ˈʌŋkəl/', example: 'My uncle tells funny stories.' },
    { word: 'aunt', meaning: '阿姨 - /ænt/', example: 'My aunt bakes good cakes.' },
    { word: 'cousin', meaning: '表亲 - /ˈkʌzən/', example: 'My cousin plays with me.' },
    { word: 'grandfather', meaning: '爷爷 - /ˈɡrænfɑːðər/', example: 'My grandfather reads books.' },
    { word: 'grandmother', meaning: '奶奶 - /ˈɡrænmʌðər/', example: 'My grandmother knits scarves.' },
    { word: 'grandpa', meaning: '爷爷（口语） - /ˈɡrænpɑː/', example: 'Grandpa takes me to the park.' },
    { word: 'grandma', meaning: '奶奶（口语） - /ˈɡrænmɑː/', example: 'Grandma makes soup for me.' },
    { word: 'baby', meaning: '婴儿 - /ˈbeɪbi/', example: 'The baby cries a lot.' },
    { word: 'daughter', meaning: '女儿 - /ˈdɔːtər/', example: 'She is my daughter.' },
    { word: 'son', meaning: '儿子 - /sʌn/', example: 'My son goes to school.' },
    { word: 'grandparent', meaning: '祖父母 - /ˈɡrænpɛrənt/', example: 'I visit my grandparents.' },
    { word: 'niece', meaning: '侄女 - /niːs/', example: 'My niece is five years old.' },
    { word: 'draw', meaning: '画 - /drɔː/', example: 'I draw a rainbow.' },
    { word: 'dance', meaning: '跳舞 - /dæns/', example: 'The girls dance together.' },
    { word: 'climb', meaning: '爬 - /klaɪm/', example: 'We climb the big tree.' },
    { word: 'cook', meaning: '做饭 - /kʊk/', example: 'Mom cooks dinner for us.' },
    { word: 'cry', meaning: '哭 - /kraɪ/', example: 'The baby cries at night.' },
    { word: 'cut', meaning: '剪 - /kʌt/', example: 'Cut the paper with scissors.' },
    { word: 'help', meaning: '帮助 - /hɛlp/', example: 'I help my mom clean.' },
    { word: 'hide', meaning: '躲藏 - /haɪd/', example: 'The cat hides behind the door.' },
    { word: 'hop', meaning: '单脚跳 - /hɑːp/', example: 'The rabbit can hop.' },
    { word: 'hug', meaning: '拥抱 - /hʌɡ/', example: 'I hug my teddy bear.' },
    { word: 'kick', meaning: '踢 - /kɪk/', example: 'Kick the ball to me.' },
    { word: 'laugh', meaning: '笑 - /læf/', example: 'The clown makes us laugh.' },
    { word: 'learn', meaning: '学习 - /lɜːrn/', example: 'I learn new words today.' },
    { word: 'beautiful', meaning: '美丽的 - /ˈbjuːtɪfəl/', example: 'The flower is beautiful.' },
    { word: 'wonderful', meaning: '精彩的 - /ˈwʌndərfəl/', example: 'What a wonderful day.' },
    { word: 'colorful', meaning: '多彩的 - /ˈkʌlərfəl/', example: 'The rainbow is colorful.' },
    { word: 'delicious', meaning: '美味的 - /dɪˈlɪʃəs/', example: 'This cake is delicious.' },
    { word: 'brave', meaning: '勇敢的 - /breɪv/', example: 'The brave boy helps others.' },
    { word: 'kind', meaning: '善良的 - /kaɪnd/', example: 'My teacher is kind.' },
    { word: 'clever', meaning: '聪明的 - /ˈklɛvər/', example: 'The clever girl solves the puzzle.' },
    { word: 'funny', meaning: '有趣的 - /ˈfʌni/', example: 'The clown is very funny.' },
    { word: 'gentle', meaning: '温柔的 - /ˈdʒɛntl/', example: 'My dog is very gentle.' },
    { word: 'fast', meaning: '快的 - /fæst/', example: 'The car goes fast.' },
    { word: 'slow', meaning: '慢的 - /sloʊ/', example: 'The turtle is slow.' },
    { word: 'soft', meaning: '柔软的 - /sɔːft/', example: 'The cat has soft fur.' },
    { word: 'pretty', meaning: '漂亮的 - /ˈprɪti/', example: 'She has a pretty dress.' },
    { word: 'summer', meaning: '夏天 - /ˈsʌmər/', example: 'Summer is very hot.' },
    { word: 'winter', meaning: '冬天 - /ˈwɪntər/', example: 'It snows in winter.' },
    { word: 'spring', meaning: '春天 - /sprɪŋ/', example: 'Flowers grow in spring.' },
    { word: 'autumn', meaning: '秋天 - /ˈɔːtəm/', example: 'Leaves fall in autumn.' },
    { word: 'hot', meaning: '热的 - /hɒt/', example: 'The sun is hot today.' },
    { word: 'warm', meaning: '温暖的 - /wɔːrm/', example: 'The weather is warm.' },
    { word: 'cool', meaning: '凉爽的 - /kuːl/', example: 'A cool wind blows.' },
    { word: 'windy', meaning: '有风的 - /ˈwɪndi/', example: 'It is very windy outside.' },
    { word: 'cloudy', meaning: '多云的 - /ˈklaʊdi/', example: 'The sky is cloudy today.' },
    { word: 'sunny', meaning: '晴朗的 - /ˈsʌni/', example: 'It is a sunny day.' },
    { word: 'rainy', meaning: '下雨的 - /ˈreɪni/', example: 'I stay home on rainy days.' },
    { word: 'snowy', meaning: '下雪的 - /ˈsnoʊi/', example: 'It is snowy outside.' },
    { word: 'storm', meaning: '暴风雨 - /stɔːrm/', example: 'The storm is very loud.' },
    { word: 'bedroom', meaning: '卧室 - /ˈbɛdruːm/', example: 'My bedroom has a blue bed.' },
    { word: 'bathroom', meaning: '浴室 - /ˈbæθruːm/', example: 'Take a shower in the bathroom.' },
    { word: 'living room', meaning: '客厅 - /ˈlɪvɪŋ ruːm/', example: 'We watch TV in the living room.' },
    { word: 'dining room', meaning: '餐厅 - /ˈdaɪnɪŋ ruːm/', example: 'We eat in the dining room.' },
    { word: 'garden', meaning: '花园 - /ˈɡɑːrdən/', example: 'Flowers grow in the garden.' },
    { word: 'garage', meaning: '车库 - /ɡəˈrɑːʒ/', example: 'Dad parks the car in the garage.' },
    { word: 'stairs', meaning: '楼梯 - /stɛrz/', example: 'Walk up the stairs slowly.' },
    { word: 'hallway', meaning: '走廊 - /ˈhɔːlweɪ/', example: 'The cat runs in the hallway.' },
    { word: 'balcony', meaning: '阳台 - /ˈbælkəni/', example: 'We sit on the balcony.' },
    { word: 'sofa', meaning: '沙发 - /ˈsoʊfə/', example: 'The cat sleeps on the sofa.' },
    { word: 'lamp', meaning: '台灯 - /læmp/', example: 'Turn on the lamp to read.' },
    { word: 'fridge', meaning: '冰箱 - /frɪdʒ/', example: 'Milk is in the fridge.' },
    { word: 'shower', meaning: '淋浴 - /ˈʃaʊər/', example: 'I take a shower every morning.' },
    { word: 'tired', meaning: '累的 - /ˈtaɪərd/', example: 'I am tired after school.' },
    { word: 'hungry', meaning: '饿的 - /ˈhʌŋɡri/', example: 'The dog is hungry.' },
    { word: 'thirsty', meaning: '渴的 - /ˈθɜːrsti/', example: 'I am thirsty after running.' },
    { word: 'excited', meaning: '兴奋的 - /ɪkˈsaɪtɪd/', example: 'I am excited for the party.' },
    { word: 'scared', meaning: '害怕的 - /skɛrd/', example: 'She is scared of the dark.' },
    { word: 'lonely', meaning: '孤独的 - /ˈloʊnli/', example: 'The lonely cat has no home.' },
    { word: 'proud', meaning: '骄傲的 - /praʊd/', example: 'Mom is proud of me.' },
    { word: 'angry', meaning: '生气的 - /ˈæŋɡri/', example: 'Dad is angry about the mess.' },
    { word: 'shy', meaning: '害羞的 - /ʃaɪ/', example: 'The shy boy hides behind Mom.' },
    { word: 'bored', meaning: '无聊的 - /bɔːrd/', example: 'I am bored at home.' },
    { word: 'calm', meaning: '平静的 - /kɑːm/', example: 'Stay calm and breathe.' },
    { word: 'worried', meaning: '担心的 - /ˈwʌrid/', example: 'She is worried about the test.' },
    { word: 'surprised', meaning: '惊讶的 - /sərˈpraɪzd/', example: 'I am surprised by the gift.' },
    { word: 'home', meaning: '家 - /hoʊm/', example: 'I go home after school.' },
    { word: 'supermarket', meaning: '超市 - /ˈsuːpərmɑːrkɪt/', example: 'We shop at the supermarket.' },
    { word: 'library', meaning: '图书馆 - /ˈlaɪbreri/', example: 'Borrow books from the library.' },
    { word: 'hospital', meaning: '医院 - /ˈhɒspɪtl/', example: 'The doctor works at the hospital.' },
    { word: 'cinema', meaning: '电影院 - /ˈsɪnəmə/', example: 'We watch a film at the cinema.' },
    { word: 'museum', meaning: '博物馆 - /mjuːˈziːəm/', example: 'See dinosaurs at the museum.' },
    { word: 'bank', meaning: '银行 - /bæŋk/', example: 'Dad goes to the bank.' },
    { word: 'airport', meaning: '机场 - /ˈɛrpɔːrt/', example: 'The plane leaves the airport.' },
    { word: 'station', meaning: '车站 - /ˈsteɪʃən/', example: 'The train stops at the station.' },
    { word: 'restaurant', meaning: '餐厅 - /ˈrɛstərɒnt/', example: 'We eat dinner at a restaurant.' },
    { word: 'farm', meaning: '农场 - /fɑːrm/', example: 'The cows live on a farm.' },
    { word: 'beach', meaning: '海滩 - /biːtʃ/', example: 'Build a sandcastle at the beach.' },
    { word: 'forest', meaning: '森林 - /ˈfɔːrɪst/', example: 'Deer live in the forest.' },
    { word: 'puzzle', meaning: '拼图 - /ˈpʌzəl/', example: 'I finish the puzzle.' },
    { word: 'kite', meaning: '风筝 - /kaɪt/', example: 'Fly a kite in the park.' },
    { word: 'robot', meaning: '机器人 - /ˈroʊbɒt/', example: 'My robot can walk.' },
    { word: 'skateboard', meaning: '滑板 - /ˈskeɪtbɔːrd/', example: 'Ride the skateboard slowly.' },
    { word: 'bicycle', meaning: '自行车 - /ˈbaɪsɪkəl/', example: 'I ride my bicycle to school.' },
    { word: 'teddy bear', meaning: '泰迪熊 - /ˈtɛdi bɛr/', example: 'I sleep with my teddy bear.' },
    { word: 'blocks', meaning: '积木 - /blɒks/', example: 'Build a tower with blocks.' },
    { word: 'cards', meaning: '卡片 - /kɑːrdz/', example: 'We play cards together.' },
    { word: 'balloon', meaning: '气球 - /bəˈluːn/', example: 'The red balloon flies up.' },
    { word: 'puppet', meaning: '木偶 - /ˈpʌpɪt/', example: 'The puppet dances on stage.' },
    { word: 'marbles', meaning: '弹珠 - /ˈmɑːrbəlz/', example: 'I roll the marbles on the floor.' },
    { word: 'yoyo', meaning: '悠悠球 - /ˈjoʊjoʊ/', example: 'My yoyo goes up and down.' },
    { word: 'train set', meaning: '火车套装 - /treɪn sɛt/', example: 'I play with my train set.' },
    { word: 'bus', meaning: '公共汽车 - /bʌs/', example: 'Take the bus to school.' },
    { word: 'plane', meaning: '飞机 - /pleɪn/', example: 'The plane flies in the sky.' },
    { word: 'boat', meaning: '小船 - /boʊt/', example: 'We ride a boat on the lake.' },
    { word: 'helicopter', meaning: '直升机 - /ˈhɛlɪkɒptər/', example: 'The helicopter lands on the roof.' },
    { word: 'taxi', meaning: '出租车 - /ˈtæksi/', example: 'Take a taxi to the airport.' },
    { word: 'van', meaning: '面包车 - /væn/', example: 'Our van is big and white.' },
    { word: 'motorcycle', meaning: '摩托车 - /ˈmoʊtərsaɪkəl/', example: 'Dad rides a motorcycle.' },
    { word: 'scooter', meaning: '滑板车 - /ˈskuːtər/', example: 'I ride my scooter fast.' },
    { word: 'rocket', meaning: '火箭 - /ˈrɒkɪt/', example: 'The rocket goes to space.' },
    { word: 'subway', meaning: '地铁 - /ˈsʌbweɪ/', example: 'We go by subway.' },
    { word: 'ferry', meaning: '渡轮 - /ˈfɛri/', example: 'Take the ferry across the river.' },
    { word: 'ambulance', meaning: '救护车 - /ˈæmbjələns/', example: 'The ambulance goes fast.' },
    { word: 'fire engine', meaning: '消防车 - /ˈfaɪər ˈɛndʒɪn/', example: 'The fire engine is red.' },
    { word: 'jacket', meaning: '夹克 - /ˈdʒækɪt/', example: 'Wear your jacket outside.' },
    { word: 'sweater', meaning: '毛衣 - /ˈswɛtər/', example: 'This sweater is warm.' },
    { word: 'pants', meaning: '裤子 - /pænts/', example: 'My pants are blue.' },
    { word: 'skirt', meaning: '裙子 - /skɜːrt/', example: 'She wears a pink skirt.' },
    { word: 'dress', meaning: '连衣裙 - /drɛs/', example: 'The dress is very pretty.' },
    { word: 'scarf', meaning: '围巾 - /skɑːrf/', example: 'Wear a scarf in winter.' },
    { word: 'gloves', meaning: '手套 - /ɡlʌvz/', example: 'Put on your gloves.' },
    { word: 'socks', meaning: '袜子 - /sɒks/', example: 'My socks are white.' },
    { word: 'boots', meaning: '靴子 - /buːts/', example: 'Wear boots in the snow.' },
    { word: 'belt', meaning: '腰带 - /bɛlt/', example: 'Put on your belt.' },
    { word: 'coat', meaning: '外套 - /koʊt/', example: 'Hang your coat on the hook.' },
    { word: 'shirt', meaning: '衬衫 - /ʃɜːrt/', example: 'He wears a white shirt.' },
    { word: 'uniform', meaning: '校服 - /ˈjuːnɪfɔːrm/', example: 'I wear a uniform to school.' },
    { word: 'brush teeth', meaning: '刷牙 - /brʌʃ tiːθ/', example: 'Brush your teeth every morning.' },
    { word: 'wash face', meaning: '洗脸 - /wɒʃ feɪs/', example: 'Wash your face with soap.' },
    { word: 'get up', meaning: '起床 - /ɡɛt ʌp/', example: 'I get up at seven.' },
    { word: 'go to sleep', meaning: '睡觉 - /ɡoʊ tuː sliːp/', example: 'Go to sleep early.' },
    { word: 'comb hair', meaning: '梳头 - /koʊm hɛr/', example: 'Comb your hair nicely.' },
    { word: 'take a shower', meaning: '洗淋浴 - /teɪk ə ˈʃaʊər/', example: 'Take a shower before bed.' },
    { word: 'get dressed', meaning: '穿衣服 - /ɡɛt drɛst/', example: 'Get dressed for school.' },
    { word: 'go home', meaning: '回家 - /ɡoʊ hoʊm/', example: 'I go home at four.' },
    { word: 'do homework', meaning: '做作业 - /duː ˈhoʊmwɜːrk/', example: 'Do your homework now.' },
    { word: 'pack bag', meaning: '收拾书包 - /pæk bæɡ/', example: 'Pack your bag for school.' },
    { word: 'tidy up', meaning: '整理 - /ˈtaɪdi ʌp/', example: 'Tidy up your room.' },
    { word: 'wake up', meaning: '醒来 - /weɪk ʌp/', example: 'Wake up at six.' },
    { word: 'cook breakfast', meaning: '做早餐 - /kʊk ˈbrekfəst/', example: 'Mom cooks breakfast for us.' },
    { word: 'melody', meaning: '旋律 - /ˈmɛlədi/', example: 'The melody sounds nice.' },
    { word: 'piano', meaning: '钢琴 - /piˈænoʊ/', example: 'She plays the piano well.' },
    { word: 'drum', meaning: '鼓 - /drʌm/', example: 'He hits the drum loudly.' },
    { word: 'guitar', meaning: '吉他 - /ɡɪˈtɑːr/', example: 'I play the guitar.' },
    { word: 'violin', meaning: '小提琴 - /ˌvaɪəˈlɪn/', example: 'She plays the violin softly.' },
    { word: 'flute', meaning: '长笛 - /fluːt/', example: 'Blow the flute gently.' },
    { word: 'trumpet', meaning: '小号 - /ˈtrʌmpɪt/', example: 'The trumpet makes a loud sound.' },
    { word: 'bell', meaning: '铃铛 - /bɛl/', example: 'Ring the bell for class.' },
    { word: 'whistle', meaning: '口哨 - /ˈwɪsəl/', example: 'The teacher blows the whistle.' },
    { word: 'canvas', meaning: '画布 - /ˈkænvəs/', example: 'I paint on a white canvas.' },
    { word: 'palette', meaning: '调色板 - /ˈpælɪt/', example: 'Mix colors on the palette.' },
    { word: 'sculpt', meaning: '雕刻 - /skʌlpt/', example: 'I sculpt a dog with clay.' },
    { word: 'sketch', meaning: '素描 - /skɛtʃ/', example: 'I sketch a tree outside.' },
    { word: 'always', meaning: '总是 - /ˈɔːlweɪz/', example: 'I always eat breakfast.' },
    { word: 'sometimes', meaning: '有时候 - /ˈsʌmtaɪmz/', example: 'Sometimes I play outside.' },
    { word: 'never', meaning: '从不 - /ˈnɛvər/', example: 'I never eat bugs.' },
    { word: 'usually', meaning: '通常 - /ˈjuːʒuəli/', example: 'I usually walk to school.' },
    { word: 'often', meaning: '经常 - /ˈɔːfən/', example: 'I often read before bed.' },
    { word: 'already', meaning: '已经 - /ɔːlˈrɛdi/', example: 'I already finished my homework.' },
    { word: 'just', meaning: '刚刚 - /dʒʌst/', example: 'I just ate my lunch.' },
    { word: 'still', meaning: '仍然 - /stɪl/', example: 'I am still hungry.' },
    { word: 'soon', meaning: '很快 - /suːn/', example: 'The bus will come soon.' },
    { word: 'early', meaning: '早地 - /ˈɜːrli/', example: 'I wake up early.' },
    { word: 'late', meaning: '晚地 - /leɪt/', example: 'Do not be late for school.' },
    { word: 'again', meaning: '再一次 - /əˈɡɛn/', example: 'Please sing the song again.' },
    { word: 'also', meaning: '也 - /ˈɔːlsoʊ/', example: 'I also like to draw.' },
    { word: 'what', meaning: '什么 - /wɒt/', example: 'What is your name?' },
    { word: 'where', meaning: '哪里 - /wɛr/', example: 'Where is my book?' },
    { word: 'when', meaning: '什么时候 - /wɛn/', example: 'When is your birthday?' },
    { word: 'who', meaning: '谁 - /huː/', example: 'Who is your teacher?' },
    { word: 'why', meaning: '为什么 - /waɪ/', example: 'Why are you sad?' },
    { word: 'how', meaning: '如何 - /haʊ/', example: 'How do you make this?' },
    { word: 'which', meaning: '哪一个 - /wɪtʃ/', example: 'Which one do you want?' },
    { word: 'whose', meaning: '谁的 - /huːz/', example: 'Whose coat is this?' },
    { word: 'how many', meaning: '多少（可数） - /haʊ ˈmɛni/', example: 'How many cats do you see?' },
    { word: 'how much', meaning: '多少（不可数） - /haʊ mʌtʃ/', example: 'How much is this toy?' },
    { word: 'how old', meaning: '几岁 - /haʊ oʊld/', example: 'How old are you?' },
    { word: 'how long', meaning: '多长 - /haʊ lɔːŋ/', example: 'How long is the bridge?' },
    { word: 'what time', meaning: '几点 - /wɒt taɪm/', example: 'What time is it now?' },
    { word: 'pond', meaning: '池塘 - /pɒnd/', example: 'Ducks swim in the pond.' },
    { word: 'grass', meaning: '草地 - /ɡræs/', example: 'Sit on the soft grass.' },
    { word: 'rainbow', meaning: '彩虹 - /ˈreɪnboʊ/', example: 'I see a rainbow in the sky.' },
    { word: 'cloud', meaning: '云 - /klaʊd/', example: 'The cloud looks like a dog.' },
    { word: 'moon', meaning: '月亮 - /muːn/', example: 'The moon shines at night.' },
    { word: 'mountain', meaning: '山 - /ˈmaʊntən/', example: 'We climb the mountain.' },
    { word: 'valley', meaning: '山谷 - /ˈvæli/', example: 'The river runs through the valley.' },
    { word: 'island', meaning: '岛屿 - /ˈaɪlənd/', example: 'We swim near the island.' },
    { word: 'cliff', meaning: '悬崖 - /klɪf/', example: 'Stand away from the cliff.' },
    { word: 'sea', meaning: '大海 - /siː/', example: 'The sea is blue.' },
    { word: 'rock', meaning: '岩石 - /rɒk/', example: 'Sit on the big rock.' },
    { word: 'leaf', meaning: '叶子 - /liːf/', example: 'The leaf falls from the tree.' },
    { word: 'wind', meaning: '风 - /wɪnd/', example: 'The wind blows my hat.' },
    { word: 'finger', meaning: '手指 - /ˈfɪŋɡər/', example: 'I have five fingers.' },
    { word: 'knee', meaning: '膝盖 - /niː/', example: 'I bend my knee.' },
    { word: 'tongue', meaning: '舌头 - /tʌŋ/', example: 'Stick out your tongue.' },
    { word: 'shoulder', meaning: '肩膀 - /ˈʃoʊldər/', example: 'Put your bag on your shoulder.' },
    { word: 'arm', meaning: '手臂 - /ɑːrm/', example: 'Raise your arm up.' },
    { word: 'elbow', meaning: '手肘 - /ˈɛlboʊ/', example: 'Do not touch your elbow.' },
    { word: 'wrist', meaning: '手腕 - /rɪst/', example: 'I wear a watch on my wrist.' },
    { word: 'ankle', meaning: '脚踝 - /ˈæŋkəl/', example: 'I hurt my ankle.' },
    { word: 'chin', meaning: '下巴 - /tʃɪn/', example: 'The cat rubs my chin.' },
    { word: 'cheek', meaning: '脸颊 - /tʃiːk/', example: 'Her cheeks are pink.' },
    { word: 'lip', meaning: '嘴唇 - /lɪp/', example: 'Bite your lip gently.' },
    { word: 'thumb', meaning: '大拇指 - /θʌm/', example: 'Give a thumbs up.' },
    { word: 'nail', meaning: '指甲 - /neɪl/', example: 'Paint your nails pink.' },
    { word: 'birthday', meaning: '生日 - /ˈbɜːrθdeɪ/', example: 'Happy birthday to you.' },
    { word: 'New Year', meaning: '新年 - /nuː jɪr/', example: 'Happy New Year.' },
    { word: 'gift', meaning: '礼物 - /ɡɪft/', example: 'I open my gift.' },
    { word: 'party', meaning: '派对 - /ˈpɑːrti/', example: 'We have a party at school.' },
    { word: 'candle', meaning: '蜡烛 - /ˈkændəl/', example: 'Blow out the candle.' },
    { word: 'firework', meaning: '烟花 - /ˈfaɪərwɜːrk/', example: 'The firework lights the sky.' },
    { word: 'card', meaning: '贺卡 - /kɑːrd/', example: 'I make a card for Mom.' },
    { word: 'present', meaning: '礼物 - /ˈprɛzənt/', example: 'This present is for you.' },
    { word: 'celebration', meaning: '庆祝 - /ˌsɛlɪˈbreɪʃən/', example: 'We have a celebration today.' },
    { word: 'festival', meaning: '节日 - /ˈfɛstɪvəl/', example: 'The festival has lights.' },
    { word: 'Easter', meaning: '复活节 - /ˈiːstər/', example: 'We find Easter eggs.' },
    { word: 'Halloween', meaning: '万圣节 - /ˌhæloʊˈiːn/', example: 'Wear a costume on Halloween.' },
    { word: 'costume', meaning: '服装 - /ˈkɒstjuːm/', example: 'My costume is a pirate.' },
    { word: 'Doctor', meaning: '医生 - /ˈdɒktər/', example: 'The doctor helps sick people.' },
    { word: 'Nurse', meaning: '护士 - /nɜːrs/', example: 'The nurse took my temperature.' },
    { word: 'Firefighter', meaning: '消防员 - /ˈfaɪərfaɪtər/', example: 'Firefighters put out big fires.' },
    { word: 'Scientist', meaning: '科学家 - /ˈsaɪəntɪst/', example: 'The scientist works in a lab.' },
    { word: 'Artist', meaning: '艺术家 - /ˈɑːrtɪst/', example: 'The artist painted a beautiful picture.' },
    { word: 'Pilot', meaning: '飞行员 - /ˈpaɪlət/', example: 'The pilot flies the airplane.' },
    { word: 'Driver', meaning: '司机 - /ˈdraɪvər/', example: 'The bus driver drives carefully.' },
    { word: 'Cook', meaning: '厨师 - /kʊk/', example: 'The cook prepares delicious meals.' },
    { word: 'Farmer', meaning: '农民 - /ˈfɑːrmər/', example: 'The farmer grows vegetables on the farm.' },
    { word: 'Musician', meaning: '音乐家 - /mjuˈzɪʃən/', example: 'The musician plays the guitar well.' },
    { word: 'Photographer', meaning: '摄影师 - /fəˈtɒɡrəfər/', example: 'The photographer took many photos.' },
    { word: 'Astronaut', meaning: '宇航员 - /ˈæstrənɔːt/', example: 'The astronaut flew to the moon.' },
    { word: 'Engineer', meaning: '工程师 - /ˌendʒɪˈnɪər/', example: 'The engineer designs new buildings.' },
    { word: 'Football', meaning: '足球 - /ˈfʊtbɔːl/', example: 'He plays football every Saturday.' },
    { word: 'Basketball', meaning: '篮球 - /ˈbæskɪtbɔːl/', example: 'They played basketball after school.' },
    { word: 'Tennis', meaning: '网球 - /ˈtenɪs/', example: 'She is learning to play tennis.' },
    { word: 'Swimming', meaning: '游泳 - /ˈswɪmɪŋ/', example: 'Swimming is my favorite sport.' },
    { word: 'Cycling', meaning: '骑自行车 - /ˈsaɪklɪŋ/', example: 'I enjoy cycling in the park.' },
    { word: 'Running', meaning: '跑步 - /ˈrʌnɪŋ/', example: 'He goes running every morning.' },
    { word: 'Jumping', meaning: '跳跃 - /ˈdʒʌmpɪŋ/', example: 'The children are jumping on the bed.' },
    { word: 'Climbing', meaning: '攀岩 - /ˈklaɪmɪŋ/', example: 'She enjoys climbing the tall tree.' },
    { word: 'Dancing', meaning: '跳舞 - /ˈdænsɪŋ/', example: 'They are dancing at the party.' },
    { word: 'Skating', meaning: '滑冰 - /ˈskeɪtɪŋ/', example: 'She fell while skating on ice.' },
    { word: 'Skiing', meaning: '滑雪 - /ˈskiːɪŋ/', example: 'We went skiing in the mountains.' },
    { word: 'Sailing', meaning: '帆船运动 - /ˈseɪlɪŋ/', example: 'He learned sailing last summer.' },
    { word: 'Wrestling', meaning: '摔跤 - /ˈreslɪŋ/', example: 'They watch wrestling on television.' },
    { word: 'Collecting', meaning: '收集 - /kəˈlektɪŋ/', example: 'He enjoys collecting stamps from abroad.' },
    { word: 'Gardening', meaning: '园艺 - /ˈɡɑːrdnɪŋ/', example: 'My grandmother loves gardening in spring.' },
    { word: 'Cooking', meaning: '烹饪 - /ˈkʊkɪŋ/', example: 'She is cooking dinner for her family.' },
    { word: 'Photography', meaning: '摄影 - /fəˈtɒɡrəfi/', example: 'He is interested in wildlife photography.' },
    { word: 'Fishing', meaning: '钓鱼 - /ˈfɪʃɪŋ/', example: 'Dad and I went fishing yesterday.' },
    { word: 'Painting', meaning: '绘画 - /ˈpeɪntɪŋ/', example: 'She spends hours painting pictures.' },
    { word: 'Singing', meaning: '唱歌 - /ˈsɪŋɪŋ/', example: 'The girl loves singing in the shower.' },
    { word: 'Reading', meaning: '阅读 - /ˈriːdɪŋ/', example: 'I enjoy reading adventure stories.' },
    { word: 'Drawing', meaning: '画画 - /ˈdrɔːɪŋ/', example: 'He is drawing a cartoon character.' },
    { word: 'Sewing', meaning: '缝纫 - /ˈsoʊɪŋ/', example: 'She learned sewing from her grandmother.' },
    { word: 'Knitting', meaning: '编织 - /ˈnɪtɪŋ/', example: 'Grandma is knitting a warm scarf.' },
    { word: 'Baking', meaning: '烘焙 - /ˈbeɪkɪŋ/', example: 'They are baking cookies for the party.' },
    { word: 'Blogging', meaning: '写博客 - /ˈblɒɡɪŋ/', example: 'She started blogging about her travels.' },
    { word: 'Exercise', meaning: '锻炼 - /ˈeksərsaɪz/', example: 'Regular exercise keeps you healthy.' },
    { word: 'Medicine', meaning: '药 - /ˈmedɪsɪn/', example: 'Take this medicine after your meals.' },
    { word: 'Fever', meaning: '发烧 - /ˈfiːvər/', example: 'She has a high fever today.' },
    { word: 'Cough', meaning: '咳嗽 - /kɒf/', example: 'His cough sounds very bad.' },
    { word: 'Toothache', meaning: '牙痛 - /ˈtuːθeɪk/', example: 'I have a terrible toothache now.' },
    { word: 'Stomachache', meaning: '肚子痛 - /ˈstʌməkeɪk/', example: 'He has a stomachache from eating too much.' },
    { word: 'Headache', meaning: '头疼 - /ˈhedeɪk/', example: 'She has a bad headache again.' },
    { word: 'Cold', meaning: '感冒 - /koʊld/', example: 'I caught a cold last week.' },
    { word: 'Temperature', meaning: '体温 - /ˈtemprətʃər/', example: 'The nurse checked his temperature.' },
    { word: 'Bandage', meaning: '绷带 - /ˈbændɪdʒ/', example: 'Put a bandage on the wound.' },
    { word: 'Checkup', meaning: '体检 - /ˈtʃekʌp/', example: 'I have a checkup at the dentist.' },
    { word: 'Healthy', meaning: '健康的 - /ˈhelθi/', example: 'Eating fruits helps you stay healthy.' },
    { word: 'Tired', meaning: '疲倦的 - /ˈtaɪərd/', example: 'She felt tired after the long walk.' },
    { word: 'Math', meaning: '数学 - /mæθ/', example: 'I have math class every morning.' },
    { word: 'Science', meaning: '科学 - /ˈsaɪəns/', example: 'Science is my favorite subject.' },
    { word: 'History', meaning: '历史 - /ˈhɪstəri/', example: 'We learned about ancient history today.' },
    { word: 'Geography', meaning: '地理 - /dʒiˈɒɡrəfi/', example: 'Geography helps us understand the world.' },
    { word: 'Music', meaning: '音乐 - /ˈmjuːzɪk/', example: 'She enjoys listening to music.' },
    { word: 'Art', meaning: '美术 - /ɑːrt/', example: 'He painted a picture in art class.' },
    { word: 'English', meaning: '英语 - /ˈɪŋɡlɪʃ/', example: 'She speaks English very well.' },
    { word: 'Chinese', meaning: '中文 - /ˌtʃaɪˈniːz/', example: 'He is learning to write Chinese.' },
    { word: 'Biology', meaning: '生物 - /baɪˈɒlədʒi/', example: 'We dissected a flower in biology.' },
    { word: 'Physics', meaning: '物理 - /ˈfɪzɪks/', example: 'Physics explains how things move.' },
    { word: 'Chemistry', meaning: '化学 - /ˈkemɪstri/', example: 'They mixed chemicals in chemistry class.' },
    { word: 'Literature', meaning: '文学 - /ˈlɪtrətʃər/', example: 'She loves reading classic literature.' },
    { word: 'Grammar', meaning: '语法 - /ˈɡræmər/', example: 'Grammar rules help us write correctly.' },
    { word: 'Library', meaning: '图书馆 - /ˈlaɪbreri/', example: 'I borrowed a book from the library.' },
    { word: 'Hospital', meaning: '医院 - /ˈhɒspɪtl/', example: 'The hospital is near my house.' },
    { word: 'Police Station', meaning: '警察局 - /pəˈliːs ˈsteɪʃən/', example: 'The police station is on Main Street.' },
    { word: 'Bank', meaning: '银行 - /bæŋk/', example: 'Dad went to the bank yesterday.' },
    { word: 'Post Office', meaning: '邮局 - /poʊst ˈɒfɪs/', example: 'I mailed a letter at the post office.' },
    { word: 'Museum', meaning: '博物馆 - /mjuˈziːəm/', example: 'We visited the science museum yesterday.' },
    { word: 'Cinema', meaning: '电影院 - /ˈsɪnəmə/', example: 'Let us go to the cinema tonight.' },
    { word: 'Theater', meaning: '剧院 - /ˈθɪətər/', example: 'The theater show starts at seven.' },
    { word: 'Stadium', meaning: '体育场 - /ˈsteɪdiəm/', example: 'The stadium was full of fans.' },
    { word: 'Market', meaning: '市场 - /ˈmɑːrkɪt/', example: 'We buy fruit at the market.' },
    { word: 'Pharmacy', meaning: '药房 - /ˈfɑːrməsi/', example: 'She bought medicine at the pharmacy.' },
    { word: 'Bakery', meaning: '面包店 - /ˈbeɪkəri/', example: 'The bakery sells fresh bread daily.' },
    { word: 'Gym', meaning: '健身房 - /dʒɪm/', example: 'He works out at the gym.' },
    { word: 'Left', meaning: '左边 - /left/', example: 'Turn left at the traffic lights.' },
    { word: 'Right', meaning: '右边 - /raɪt/', example: 'The bookstore is on the right.' },
    { word: 'Straight', meaning: '笔直 - /streɪt/', example: 'Walk straight for two blocks.' },
    { word: 'Corner', meaning: '拐角 - /ˈkɔːrnər/', example: 'The restaurant is around the corner.' },
    { word: 'Cross', meaning: '穿过 - /krɒs/', example: 'Look both ways before you cross.' },
    { word: 'Bridge', meaning: '桥 - /brɪdʒ/', example: 'We walked across the old bridge.' },
    { word: 'Turn', meaning: '转弯 - /tɜːrn/', example: 'Turn right at the next corner.' },
    { word: 'Block', meaning: '街区 - /blɒk/', example: 'The school is one block away.' },
    { word: 'Traffic Light', meaning: '红绿灯 - /ˈtræfɪk laɪt/', example: 'Stop when the traffic light is red.' },
    { word: 'Crosswalk', meaning: '人行横道 - /ˈkrɒswɔːk/', example: 'Always use the crosswalk to cross.' },
    { word: 'Sidewalk', meaning: '人行道 - /ˈsaɪdwɔːk/', example: 'Walk on the sidewalk for safety.' },
    { word: 'Roundabout', meaning: '环岛 - /ˈraʊndəbaʊt/', example: 'Go around the roundabout slowly.' },
    { word: 'Avenue', meaning: '大街 - /ˈævənjuː/', example: 'The parade went down the avenue.' },
    { word: 'Recipe', meaning: '食谱 - /ˈresɪpi/', example: 'Follow the recipe to make a cake.' },
    { word: 'Boil', meaning: '煮 - /bɔɪl/', example: 'Boil the water before drinking it.' },
    { word: 'Fry', meaning: '煎/炸 - /fraɪ/', example: 'She will fry the fish for dinner.' },
    { word: 'Oven', meaning: '烤箱 - /ˈʌvən/', example: 'Bake the cookies in the oven.' },
    { word: 'Knife', meaning: '刀 - /naɪf/', example: 'Cut the bread with a knife.' },
    { word: 'Spoon', meaning: '勺子 - /spuːn/', example: 'Use a spoon to eat your soup.' },
    { word: 'Fork', meaning: '叉子 - /fɔːrk/', example: 'He eats salad with a fork.' },
    { word: 'Plate', meaning: '盘子 - /pleɪt/', example: 'Put the food on a clean plate.' },
    { word: 'Bowl', meaning: '碗 - /boʊl/', example: 'She poured cereal into a bowl.' },
    { word: 'Chopsticks', meaning: '筷子 - /ˈtʃɒpstɪks/', example: 'He can use chopsticks very well.' },
    { word: 'Pan', meaning: '平底锅 - /pæn/', example: 'Heat the oil in a pan.' },
    { word: 'Mix', meaning: '搅拌 - /mɪks/', example: 'Mix the eggs and flour together.' },
    { word: 'Pour', meaning: '倒 - /pɔːr/', example: 'Pour the milk into the glass.' },
    { word: 'Price', meaning: '价格 - /praɪs/', example: 'The price of this toy is ten dollars.' },
    { word: 'Cheap', meaning: '便宜的 - /tʃiːp/', example: 'This jacket was very cheap.' },
    { word: 'Expensive', meaning: '昂贵的 - /ɪkˈspensɪv/', example: 'That watch is too expensive for me.' },
    { word: 'Change', meaning: '零钱 - /tʃeɪndʒ/', example: 'The cashier gave me my change.' },
    { word: 'Wallet', meaning: '钱包 - /ˈwɒlɪt/', example: 'I left my wallet at home.' },
    { word: 'Receipt', meaning: '收据 - /rɪˈsiːt/', example: 'Keep the receipt in case you return it.' },
    { word: 'Cash', meaning: '现金 - /kæʃ/', example: 'Do you have enough cash?' },
    { word: 'Credit Card', meaning: '信用卡 - /ˈkredɪt kɑːrd/', example: 'She paid with her credit card.' },
    { word: 'Bargain', meaning: '便宜货 - /ˈbɑːrɡɪn/', example: 'This dress was a real bargain.' },
    { word: 'Discount', meaning: '折扣 - /ˈdɪskaʊnt/', example: 'Students get a discount on tickets.' },
    { word: 'Shop Assistant', meaning: '店员 - /ʃɒp əˈsɪstənt/', example: 'The shop assistant helped me find shoes.' },
    { word: 'Customer', meaning: '顾客 - /ˈkʌstəmər/', example: 'The customer bought many items.' },
    { word: 'Brand', meaning: '品牌 - /brænd/', example: 'What brand of shoes do you like?' },
    { word: 'Hotel', meaning: '酒店 - /hoʊˈtel/', example: 'We stayed in a nice hotel.' },
    { word: 'Passport', meaning: '护照 - /ˈpæspɔːrt/', example: 'Do not forget your passport.' },
    { word: 'Airport', meaning: '机场 - /ˈeərpɔːrt/', example: 'The airport is far from here.' },
    { word: 'Luggage', meaning: '行李 - /ˈlʌɡɪdʒ/', example: 'Please carry your luggage carefully.' },
    { word: 'Map', meaning: '地图 - /mæp/', example: 'Read the map to find the way.' },
    { word: 'Ticket', meaning: '票 - /ˈtɪkɪt/', example: 'I bought a train ticket online.' },
    { word: 'Train', meaning: '火车 - /treɪn/', example: 'The train arrives at nine o clock.' },
    { word: 'Bus', meaning: '公共汽车 - /bʌs/', example: 'Take the bus to the museum.' },
    { word: 'Ferry', meaning: '渡轮 - /ˈferi/', example: 'The ferry crosses the river daily.' },
    { word: 'Guide', meaning: '导游 - /ɡaɪd/', example: 'The tour guide showed us around.' },
    { word: 'Trip', meaning: '旅行 - /trɪp/', example: 'We planned a trip to the beach.' },
    { word: 'Suitcase', meaning: '手提箱 - /ˈsuːtkeɪs/', example: 'She packed her suitcase for vacation.' },
    { word: 'Destination', meaning: '目的地 - /ˌdestɪˈneɪʃən/', example: 'Our destination is the beautiful beach.' },
    { word: 'Computer', meaning: '电脑 - /kəmˈpjuːtər/', example: 'The computer needs to be charged.' },
    { word: 'Keyboard', meaning: '键盘 - /ˈkiːbɔːrd/', example: 'Clean the keyboard with a cloth.' },
    { word: 'Screen', meaning: '屏幕 - /skriːn/', example: 'Do not touch the screen with dirty hands.' },
    { word: 'Mouse', meaning: '鼠标 - /maʊs/', example: 'Move the mouse to click the icon.' },
    { word: 'Game', meaning: '游戏 - /ɡeɪm/', example: 'This video game is very fun.' },
    { word: 'Internet', meaning: '互联网 - /ˈɪntərnet/', example: 'We use the internet for homework.' },
    { word: 'Website', meaning: '网站 - /ˈwebsaɪt/', example: 'The school website has information.' },
    { word: 'Password', meaning: '密码 - /ˈpæswɜːrd/', example: 'Do not share your password with others.' },
    { word: 'Printer', meaning: '打印机 - /ˈprɪntər/', example: 'The printer has run out of ink.' },
    { word: 'Battery', meaning: '电池 - /ˈbætəri/', example: 'My phone battery is almost dead.' },
    { word: 'Charger', meaning: '充电器 - /ˈtʃɑːrdʒər/', example: 'I forgot my phone charger at home.' },
    { word: 'Download', meaning: '下载 - /daʊnˈloʊd/', example: 'Download the app from the store.' },
    { word: 'Upload', meaning: '上传 - /ʌpˈloʊd/', example: 'She will upload the photos later.' },
    { word: 'Mountain', meaning: '高山 - /ˈmaʊntɪn/', example: 'We climbed the high mountain.' },
    { word: 'Forest', meaning: '森林 - /ˈfɒrɪst/', example: 'Many animals live in the forest.' },
    { word: 'Ocean', meaning: '海洋 - /ˈoʊʃən/', example: 'The ocean is very deep and wide.' },
    { word: 'Island', meaning: '岛屿 - /ˈaɪlənd/', example: 'They visited a tropical island.' },
    { word: 'Weather', meaning: '天气 - /ˈweðər/', example: 'The weather is sunny and warm today.' },
    { word: 'Climate', meaning: '气候 - /ˈklaɪmɪt/', example: 'The climate is changing around the world.' },
    { word: 'River', meaning: '河流 - /ˈrɪvər/', example: 'The river flows through the valley.' },
    { word: 'Lake', meaning: '湖泊 - /leɪk/', example: 'We swam in the clear lake.' },
    { word: 'Waterfall', meaning: '瀑布 - /ˈwɔːtərfɔːl/', example: 'The waterfall made a loud sound.' },
    { word: 'Volcano', meaning: '火山 - /vɒlˈkeɪnoʊ/', example: 'The volcano erupted last night.' },
    { word: 'Earthquake', meaning: '地震 - /ˈɜːrθkweɪk/', example: 'The earthquake shook the whole city.' },
    { word: 'Rainbow', meaning: '彩虹 - /ˈreɪnboʊ/', example: 'A rainbow appeared after the rain.' },
    { word: 'Storm', meaning: '暴风雨 - /stɔːrm/', example: 'The storm knocked down many trees.' },
    { word: 'Mammal', meaning: '哺乳动物 - /ˈmæməl/', example: 'A whale is a large mammal.' },
    { word: 'Reptile', meaning: '爬行动物 - /ˈreptaɪl/', example: 'A snake is a long reptile.' },
    { word: 'Insect', meaning: '昆虫 - /ˈɪnsekt/', example: 'Bees are very useful insects.' },
    { word: 'Jungle', meaning: '丛林 - /ˈdʒʌŋɡl/', example: 'Monkeys live in the thick jungle.' },
    { word: 'Desert', meaning: '沙漠 - /ˈdezərt/', example: 'Camels can survive in the desert.' },
    { word: 'Cave', meaning: '洞穴 - /keɪv/', example: 'The bear slept inside the cave.' },
    { word: 'Pond', meaning: '池塘 - /pɒnd/', example: 'Ducks swim in the small pond.' },
    { word: 'Grassland', meaning: '草原 - /ˈɡræslænd/', example: 'Lions hunt on the grassland.' },
    { word: 'Amphibian', meaning: '两栖动物 - /æmˈfɪbiən/', example: 'Frogs are a type of amphibian.' },
    { word: 'Bird', meaning: '鸟 - /bɜːrd/', example: 'The bird built a nest in the tree.' },
    { word: 'Fish', meaning: '鱼 - /fɪʃ/', example: 'Colorful fish swim in the ocean.' },
    { word: 'Turtle', meaning: '海龟 - /ˈtɜːrtl/', example: 'The turtle moves very slowly.' },
    { word: 'Snake', meaning: '蛇 - /sneɪk/', example: 'The snake shed its old skin.' },
    { word: 'Monday', meaning: '星期一 - /ˈmʌndeɪ/', example: 'Monday is the first school day.' },
    { word: 'Tuesday', meaning: '星期二 - /ˈtjuːzdeɪ/', example: 'She has piano lessons on Tuesday.' },
    { word: 'Wednesday', meaning: '星期三 - /ˈwenzdeɪ/', example: 'We have a test on Wednesday.' },
    { word: 'Thursday', meaning: '星期四 - /ˈθɜːrzdeɪ/', example: 'Thursday is my favorite day.' },
    { word: 'Friday', meaning: '星期五 - /ˈfraɪdeɪ/', example: 'We eat pizza every Friday night.' },
    { word: 'Saturday', meaning: '星期六 - /ˈsætərdeɪ/', example: 'Saturday is for playing outside.' },
    { word: 'Sunday', meaning: '星期日 - /ˈsʌndeɪ/', example: 'We visit grandma every Sunday.' },
    { word: 'Calendar', meaning: '日历 - /ˈkælɪndər/', example: 'Mark the date on your calendar.' },
    { word: 'Date', meaning: '日期 - /deɪt/', example: 'What is the date of the party?' },
    { word: 'Weekend', meaning: '周末 - /ˈwiːkend/', example: 'We go camping on the weekend.' },
    { word: 'Midnight', meaning: '午夜 - /ˈmɪdnaɪt/', example: 'The clock struck twelve at midnight.' },
    { word: 'Noon', meaning: '中午 - /nuːn/', example: 'We will meet at noon tomorrow.' },
    { word: 'Season', meaning: '季节 - /ˈsiːzən/', example: 'My favorite season is spring.' },
    { word: 'Honest', meaning: '诚实的 - /ˈɒnɪst/', example: 'It is important to be honest.' },
    { word: 'Generous', meaning: '慷慨的 - /ˈdʒenərəs/', example: 'She is generous with her time.' },
    { word: 'Patient', meaning: '耐心的 - /ˈpeɪʃənt/', example: 'Please be patient and wait.' },
    { word: 'Polite', meaning: '有礼貌的 - /pəˈlaɪt/', example: 'The polite boy said thank you.' },
    { word: 'Helpful', meaning: '乐于助人的 - /ˈhelpfəl/', example: 'She is very helpful to others.' },
    { word: 'Brave', meaning: '勇敢的 - /breɪv/', example: 'The brave girl saved the cat.' },
    { word: 'Kind', meaning: '善良的 - /kaɪnd/', example: 'It is kind to help others.' },
    { word: 'Clever', meaning: '聪明的 - /ˈklevər/', example: 'The clever fox found a way.' },
    { word: 'Friendly', meaning: '友好的 - /ˈfrendli/', example: 'My neighbor is very friendly.' },
    { word: 'Funny', meaning: '有趣的 - /ˈfʌni/', example: 'He told a very funny joke.' },
    { word: 'Shy', meaning: '害羞的 - /ʃaɪ/', example: 'The shy boy hid behind his mother.' },
    { word: 'Serious', meaning: '严肃的 - /ˈsɪəriəs/', example: 'Her face looked very serious.' },
    { word: 'Curious', meaning: '好奇的 - /ˈkjʊriəs/', example: 'The curious cat explored the garden.' },
    { word: 'Phone', meaning: '电话 - /foʊn/', example: 'She answered the phone quickly.' },
    { word: 'Letter', meaning: '信 - /ˈletər/', example: 'He wrote a letter to his cousin.' },
    { word: 'Email', meaning: '电子邮件 - /ˈiːmeɪl/', example: 'I sent an email to my teacher.' },
    { word: 'Message', meaning: '留言 - /ˈmesɪdʒ/', example: 'She left a message on my phone.' },
    { word: 'Chat', meaning: '聊天 - /tʃæt/', example: 'We can chat after class.' },
    { word: 'Speak', meaning: '说话 - /spiːk/', example: 'Please speak more slowly.' },
    { word: 'Conversation', meaning: '对话 - /ˌkɒnvərˈseɪʃən/', example: 'We had a long conversation yesterday.' },
    { word: 'Discuss', meaning: '讨论 - /dɪˈskʌs/', example: 'Let us discuss the homework together.' },
    { word: 'Explain', meaning: '解释 - /ɪkˈspleɪn/', example: 'Can you explain this problem to me?' },
    { word: 'Whisper', meaning: '耳语 - /ˈwɪspər/', example: 'Do not whisper in class.' },
    { word: 'Shout', meaning: '喊叫 - /ʃaʊt/', example: 'Do not shout in the library.' },
    { word: 'Borrow', meaning: '借入 - /ˈbɒroʊ/', example: 'Can I borrow your pencil please?' },
    { word: 'Lend', meaning: '借出 - /lend/', example: 'Can you lend me some paper?' },
    { word: 'Police Officer', meaning: '警察 - /pəˈliːs ˈɒfɪsər/', example: 'The police officer helped us cross the street.' },
    { word: 'Dentist', meaning: '牙医 - /ˈdentɪst/', example: 'I visit the dentist twice a year.' },
    { word: 'Vet', meaning: '兽医 - /vet/', example: 'The vet checked the sick dog.' },
    { word: 'Baker', meaning: '面包师 - /ˈbeɪkər/', example: 'The baker makes fresh bread daily.' },
    { word: 'Postman', meaning: '邮递员 - /ˈpoʊstmən/', example: 'The postman delivered a package today.' },
    { word: 'Librarian', meaning: '图书管理员 - /laɪˈbreəriən/', example: 'The librarian helped me find a book.' },
    { word: 'Professor', meaning: '教授 - /prəˈfesər/', example: 'The professor teaches history at university.' },
    { word: 'Waitress', meaning: '女服务员 - /ˈweɪtrɪs/', example: 'The waitress brought us our food.' },
    { word: 'Mechanic', meaning: '修理工 - /məˈkænɪk/', example: 'The mechanic fixed our broken car.' },
    { word: 'Plumber', meaning: '水管工 - /ˈplʌmər/', example: 'The plumber fixed the leaking pipe.' },
    { word: 'Tailor', meaning: '裁缝 - /ˈteɪlər/', example: 'The tailor shortened my new pants.' },
    { word: 'Judge', meaning: '法官 - /dʒʌdʒ/', example: 'The judge listened to both sides.' },
    { word: 'Paramedic', meaning: '急救人员 - /ˌpærəˈmedɪk/', example: 'The paramedic arrived very quickly.' },
    { word: 'Cupboard', meaning: '橱柜 - /ˈkʌbərd/', example: 'Put the plates in the cupboard.' },
    { word: 'Fridge', meaning: '冰箱 - /frɪdʒ/', example: 'Keep the milk inside the fridge.' },
    { word: 'Microwave', meaning: '微波炉 - /ˈmaɪkrəweɪv/', example: 'Heat the soup in the microwave.' },
    { word: 'Cooker', meaning: '灶具 - /ˈkʊkər/', example: 'She cleaned the cooker after dinner.' },
    { word: 'Sink', meaning: '水槽 - /sɪŋk/', example: 'Wash your hands in the sink.' },
    { word: 'Kettle', meaning: '水壶 - /ˈketl/', example: 'Boil water in the kettle.' },
    { word: 'Toaster', meaning: '烤面包机 - /ˈtoʊstər/', example: 'Put the bread in the toaster.' },
    { word: 'Blender', meaning: '搅拌机 - /ˈblendər/', example: 'Make a smoothie with the blender.' },
    { word: 'Apron', meaning: '围裙 - /ˈeɪprən/', example: 'Wear an apron when you cook.' },
    { word: 'Oven Glove', meaning: '烤箱手套 - /ˈʌvən ɡlʌv/', example: 'Use an oven glove to take it out.' },
    { word: 'Washing Machine', meaning: '洗衣机 - /ˈwɒʃɪŋ məˈʃiːn/', example: 'Put dirty clothes in the washing machine.' },
    { word: 'Dishwasher', meaning: '洗碗机 - /ˈdɪʃwɒʃər/', example: 'Load the dishes into the dishwasher.' },
    { word: 'Counter', meaning: '操作台 - /ˈkaʊntər/', example: 'Place the bowl on the counter.' },
    { word: 'Camping', meaning: '露营 - /ˈkæmpɪŋ/', example: 'We went camping near the river.' },
    { word: 'Hiking', meaning: '远足 - /ˈhaɪkɪŋ/', example: 'They went hiking in the forest.' },
    { word: 'Picnic', meaning: '野餐 - /ˈpɪknɪk/', example: 'We had a picnic at the park.' },
    { word: 'Barbecue', meaning: '烧烤 - /ˈbɑːrbɪkjuː/', example: 'Dad cooked meat on the barbecue.' },
    { word: 'Rollerblading', meaning: '轮滑 - /ˈroʊlərbleɪdɪŋ/', example: 'She enjoys rollerblading in the park.' },
    { word: 'Skateboarding', meaning: '滑板 - /ˈskeɪtbɔːrdɪŋ/', example: 'He practices skateboarding every weekend.' },
    { word: 'Bird Watching', meaning: '观鸟 - /bɜːrd ˈwɒtʃɪŋ/', example: 'They enjoy bird watching in the forest.' },
    { word: 'Kayaking', meaning: '皮划艇 - /ˈkaɪækɪŋ/', example: 'We went kayaking on the lake.' },
    { word: 'Canoeing', meaning: '独木舟 - /kəˈnuːɪŋ/', example: 'Canoeing is fun on calm water.' },
    { word: 'Rafting', meaning: '漂流 - /ˈræftɪŋ/', example: 'White water rafting is very exciting.' },
    { word: 'Orienteering', meaning: '定向越野 - /ˌɔːriənˈtɪərɪŋ/', example: 'Orienteering combines running with map reading.' },
    { word: 'Scouting', meaning: '童子军 - /ˈskaʊtɪŋ/', example: 'He joined the scouting group last year.' },
    { word: 'Sunbathing', meaning: '晒太阳 - /ˈsʌnbeɪðɪŋ/', example: 'She is sunbathing by the pool.' },
    { word: 'Muscle', meaning: '肌肉 - /ˈmʌsl/', example: 'Exercise helps build strong muscles.' },
    { word: 'Bone', meaning: '骨头 - /boʊn/', example: 'The dog buried a bone in the yard.' },
    { word: 'Skin', meaning: '皮肤 - /skɪn/', example: 'Use sunscreen to protect your skin.' },
    { word: 'Heart', meaning: '心脏 - /hɑːrt/', example: 'Your heart pumps blood through your body.' },
    { word: 'Brain', meaning: '大脑 - /breɪn/', example: 'The brain controls everything we do.' },
    { word: 'Blood', meaning: '血液 - /blʌd/', example: 'The doctor took a blood sample.' },
    { word: 'Breath', meaning: '呼吸 - /breθ/', example: 'Take a deep breath before the test.' },
    { word: 'Lung', meaning: '肺 - /lʌŋ/', example: 'Running is good for your lungs.' },
    { word: 'Nerve', meaning: '神经 - /nɜːrv/', example: 'The dentist hit a nerve in my tooth.' },
    { word: 'Pulse', meaning: '脉搏 - /pʌls/', example: 'The nurse checked his pulse rate.' },
    { word: 'Rib', meaning: '肋骨 - /rɪb/', example: 'He broke a rib in the accident.' },
    { word: 'Elbow', meaning: '肘部 - /ˈelboʊ/', example: 'Do not put your elbow on the table.' },
    { word: 'Shoulder', meaning: '肩膀 - /ˈʃoʊldər/', example: 'She carried a bag on her shoulder.' },
    { word: 'Experiment', meaning: '实验 - /ɪkˈsperɪmənt/', example: 'We did a science experiment today.' },
    { word: 'Research', meaning: '研究 - /rɪˈsɜːrtʃ/', example: 'She does research on animals.' },
    { word: 'Calculate', meaning: '计算 - /ˈkælkjuleɪt/', example: 'Can you calculate the total cost?' },
    { word: 'Conclusion', meaning: '结论 - /kənˈkluːʒn/', example: 'What is your conclusion from this?' },
    { word: 'Observe', meaning: '观察 - /əbˈzɜːrv/', example: 'Observe how the plant grows.' },
    { word: 'Analyze', meaning: '分析 - /ˈænəlaɪz/', example: 'Let us analyze the data together.' },
    { word: 'Evidence', meaning: '证据 - /ˈevɪdəns/', example: 'Do you have any evidence for that?' },
    { word: 'Theory', meaning: '理论 - /ˈθɪri/', example: 'We learned a new theory in class.' },
    { word: 'Definition', meaning: '定义 - /ˌdefɪˈnɪʃn/', example: 'Write the definition of this word.' },
    { word: 'Compare', meaning: '比较 - /kəmˈper/', example: 'Compare these two pictures carefully.' },
    { word: 'Category', meaning: '类别 - /ˈkætəɡɔːri/', example: 'Sort the items into each category.' },
    { word: 'Summarize', meaning: '总结 - /ˈsʌməraɪz/', example: 'Please summarize the main points.' },
    { word: 'Method', meaning: '方法 - /ˈmeθəd/', example: 'This method works very well.' },
    { word: 'Gravity', meaning: '重力 - /ˈɡrævəti/', example: 'Gravity pulls everything toward Earth.' },
    { word: 'Energy', meaning: '能量 - /ˈenərdʒi/', example: 'The sun gives us energy.' },
    { word: 'Electricity', meaning: '电 - /ɪˌlekˈtrɪsəti/', example: 'Electricity powers our lights and devices.' },
    { word: 'Magnet', meaning: '磁铁 - /ˈmæɡnət/', example: 'A magnet attracts metal objects.' },
    { word: 'Microscope', meaning: '显微镜 - /ˈmaɪkrəskoʊp/', example: 'Look at the cell under the microscope.' },
    { word: 'Solar system', meaning: '太阳系 - /ˈsoʊlər ˈsɪstəm/', example: 'There are eight planets in the solar system.' },
    { word: 'Molecule', meaning: '分子 - /ˈmɑːlɪkjuːl/', example: 'Water is made of tiny molecules.' },
    { word: 'Chemical', meaning: '化学的 - /ˈkemɪkl/', example: 'Mix the chemicals in the beaker.' },
    { word: 'Temperature', meaning: '温度 - /ˈtemprətʃər/', example: 'The temperature dropped ten degrees.' },
    { word: 'Evolution', meaning: '进化 - /ˌevəˈluːʃn/', example: 'Evolution happens over millions of years.' },
    { word: 'Organism', meaning: '生物体 - /ˈɔːrɡənɪzəm/', example: 'A bacterium is a tiny organism.' },
    { word: 'Friction', meaning: '摩擦力 - /ˈfrɪkʃn/', example: 'Friction slows the moving box down.' },
    { word: 'Density', meaning: '密度 - /ˈdensəti/', example: 'Ice has a lower density than water.' },
    { word: 'Recycle', meaning: '回收利用 - /riːˈsaɪkəl/', example: 'We should recycle paper and plastic.' },
    { word: 'Pollution', meaning: '污染 - /pəˈluːʃn/', example: 'Pollution harms the air and water.' },
    { word: 'Climate', meaning: '气候 - /ˈklaɪmət/', example: 'The climate is changing around the world.' },
    { word: 'Habitat', meaning: '栖息地 - /ˈhæbɪtæt/', example: 'A forest is a habitat for many animals.' },
    { word: 'Protect', meaning: '保护 - /prəˈtekt/', example: 'We must protect endangered animals.' },
    { word: 'Conserve', meaning: '节约 - /kənˈsɜːrv/', example: 'Try to conserve water every day.' },
    { word: 'Ecosystem', meaning: '生态系统 - /ˈiːkoʊsɪstəm/', example: 'A pond is a small ecosystem.' },
    { word: 'Renewable', meaning: '可再生的 - /rɪˈnuːəbl/', example: 'Solar energy is a renewable resource.' },
    { word: 'Atmosphere', meaning: '大气层 - /ˈætməsfɪr/', example: 'The atmosphere protects life on Earth.' },
    { word: 'Extinction', meaning: '灭绝 - /ɪkˈstɪŋkʃn/', example: 'Many species are at risk of extinction.' },
    { word: 'Sustainable', meaning: '可持续的 - /səˈsteɪnəbl/', example: 'We need sustainable ways to live.' },
    { word: 'Deforestation', meaning: '森林砍伐 - /diːˌfɔːrɪˈsteɪʃn/', example: 'Deforestation destroys animal homes.' },
    { word: 'Carbon', meaning: '碳 - /ˈkɑːrbən/', example: 'Trees absorb carbon from the air.' },
    { word: 'Download', meaning: '下载 - /ˌdaʊnˈloʊd/', example: 'Download the app from the store.' },
    { word: 'Upload', meaning: '上传 - /ˌʌpˈloʊd/', example: 'Upload your photos to the website.' },
    { word: 'Software', meaning: '软件 - /ˈsɔːftwer/', example: 'This software helps you edit videos.' },
    { word: 'Device', meaning: '设备 - /dɪˈvaɪs/', example: 'Each student has their own device.' },
    { word: 'Digital', meaning: '数字的 - /ˈdɪdʒɪtl/', example: 'We live in a digital world now.' },
    { word: 'Code', meaning: '代码 - /koʊd/', example: 'She learned to write computer code.' },
    { word: 'Program', meaning: '程序 - /ˈproʊɡræm/', example: 'He wrote a simple computer program.' },
    { word: 'Database', meaning: '数据库 - /ˈdeɪtəbeɪs/', example: 'The database stores all user information.' },
    { word: 'Network', meaning: '网络 - /ˈnetwɜːrk/', example: 'The network connects all the computers.' },
    { word: 'Processor', meaning: '处理器 - /ˈprɑːsesər/', example: 'The processor makes the computer fast.' },
    { word: 'Interface', meaning: '界面 - /ˈɪntərfeɪs/', example: 'The interface is easy to use.' },
    { word: 'Innovation', meaning: '创新 - /ˌɪnəˈveɪʃn/', example: 'Innovation changes how we live.' },
    { word: 'Algorithm', meaning: '算法 - /ˈælɡərɪðəm/', example: 'The algorithm sorts data very fast.' },
    { word: 'Government', meaning: '政府 - /ˈɡʌvərnmənt/', example: 'The government makes laws for everyone.' },
    { word: 'Citizen', meaning: '公民 - /ˈsɪtɪzn/', example: 'Every citizen has rights and duties.' },
    { word: 'Culture', meaning: '文化 - /ˈkʌltʃər/', example: 'We learned about Japanese culture.' },
    { word: 'Tradition', meaning: '传统 - /trəˈdɪʃn/', example: 'This tradition is hundreds of years old.' },
    { word: 'History', meaning: '历史 - /ˈhɪstri/', example: 'History teaches us about the past.' },
    { word: 'Festival', meaning: '节日 - /ˈfestɪvl/', example: 'The festival lasts for three days.' },
    { word: 'Democracy', meaning: '民主 - /dɪˈmɑːkrəsi/', example: 'In a democracy, people vote for leaders.' },
    { word: 'Constitution', meaning: '宪法 - /ˌkɑːnstɪˈtuːʃn/', example: 'The constitution protects our rights.' },
    { word: 'Community', meaning: '社区 - /kəˈmjuːnəti/', example: 'Our community helps each other.' },
    { word: 'Economy', meaning: '经济 - /ɪˈkɑːnəmi/', example: 'The economy affects everyone\'s life.' },
    { word: 'Empire', meaning: '帝国 - /ˈempaɪər/', example: 'The Roman empire was very powerful.' },
    { word: 'Revolution', meaning: '革命 - /ˌrevəˈluːʃn/', example: 'The revolution changed the country.' },
    { word: 'Immigrant', meaning: '移民 - /ˈɪmɪɡrənt/', example: 'My grandfather was an immigrant.' },
    { word: 'Vitamin', meaning: '维生素 - /ˈvaɪtəmɪn/', example: 'Oranges are full of vitamin C.' },
    { word: 'Protein', meaning: '蛋白质 - /ˈproʊtiːn/', example: 'Eggs and beans contain lots of protein.' },
    { word: 'Calcium', meaning: '钙 - /ˈkælsiəm/', example: 'Milk gives you calcium for strong bones.' },
    { word: 'Allergy', meaning: '过敏 - /ˈælərdʒi/', example: 'She has a peanut allergy.' },
    { word: 'Diet', meaning: '饮食 - /ˈdaɪət/', example: 'A balanced diet keeps you healthy.' },
    { word: 'Exercise', meaning: '锻炼 - /ˈeksərsaɪz/', example: 'Exercise is good for your heart.' },
    { word: 'Nutrition', meaning: '营养 - /nuˈtrɪʃn/', example: 'Good nutrition helps you grow strong.' },
    { word: 'Mineral', meaning: '矿物质 - /ˈmɪnərəl/', example: 'Your body needs minerals to stay healthy.' },
    { word: 'Digest', meaning: '消化 - /daɪˈdʒest/', example: 'Your stomach helps digest food.' },
    { word: 'Immune', meaning: '免疫的 - /ɪˈmjuːn/', example: 'Sleep helps your immune system.' },
    { word: 'Antibiotic', meaning: '抗生素 - /ˌæntibaɪˈɑːtɪk/', example: 'The doctor gave me an antibiotic.' },
    { word: 'Calorie', meaning: '卡路里 - /ˈkæləri/', example: 'This snack has one hundred calories.' },
    { word: 'Hydrate', meaning: '补水 - /ˈhaɪdreɪt/', example: 'Drink water to hydrate your body.' },
    { word: 'Friendship', meaning: '友谊 - /ˈfrendʃɪp/', example: 'Their friendship lasted for many years.' },
    { word: 'Respect', meaning: '尊重 - /rɪˈspekt/', example: 'You should respect your classmates.' },
    { word: 'Trust', meaning: '信任 - /trʌst/', example: 'I trust my best friend completely.' },
    { word: 'Apologise', meaning: '道歉 - /əˈpɑːlədʒaɪz/', example: 'You should apologise for your mistake.' },
    { word: 'Encourage', meaning: '鼓励 - /ɪnˈkɜːrɪdʒ/', example: 'My parents always encourage me to try.' },
    { word: 'Support', meaning: '支持 - /səˈpɔːrt/', example: 'My family supports me in everything.' },
    { word: 'Conflict', meaning: '冲突 - /ˈkɑːnflɪkt/', example: 'We solved the conflict by talking.' },
    { word: 'Lonely', meaning: '孤独的 - /ˈloʊnli/', example: 'He felt lonely on his first day.' },
    { word: 'Generous', meaning: '慷慨的 - /ˈdʒenərəs/', example: 'She is very generous with her time.' },
    { word: 'Patient', meaning: '耐心的 - /ˈpeɪʃnt/', example: 'A good teacher is always patient.' },
    { word: 'Grateful', meaning: '感激的 - /ˈɡreɪtfl/', example: 'I am grateful for your help.' },
    { word: 'Empathy', meaning: '共情 - /ˈempəθi/', example: 'Having empathy means understanding others.' },
    { word: 'Jealous', meaning: '嫉妒的 - /ˈdʒeləs/', example: 'She felt jealous of her sister\'s toy.' },
    { word: 'Freedom', meaning: '自由 - /ˈfriːdəm/', example: 'Everyone wants freedom to choose.' },
    { word: 'Courage', meaning: '勇气 - /ˈkɜːrɪdʒ/', example: 'It takes courage to speak up.' },
    { word: 'Justice', meaning: '正义 - /ˈdʒʌstɪs/', example: 'We all want justice and fairness.' },
    { word: 'Peace', meaning: '和平 - /piːs/', example: 'The two countries signed a peace agreement.' },
    { word: 'Responsibility', meaning: '责任 - /rɪˌspɑːnsəˈbɪləti/', example: 'Taking responsibility is part of growing up.' },
    { word: 'Equality', meaning: '平等 - /iˈkwɑːləti/', example: 'Equality means everyone is treated fairly.' },
    { word: 'Honesty', meaning: '诚实 - /ˈɑːnəsti/', example: 'Honesty is the most important quality.' },
    { word: 'Dignity', meaning: '尊严 - /ˈdɪɡnəti/', example: 'Everyone deserves to be treated with dignity.' },
    { word: 'Charity', meaning: '慈善 - /ˈtʃærəti/', example: 'We raised money for charity.' },
    { word: 'Pride', meaning: '自豪 - /praɪd/', example: 'She felt pride in her achievement.' },
    { word: 'Ambition', meaning: '抱负 - /æmˈbɪʃn/', example: 'Her ambition is to become a doctor.' },
    { word: 'Wisdom', meaning: '智慧 - /ˈwɪzdəm/', example: 'Grandma shares her wisdom with us.' },
    { word: 'Loyalty', meaning: '忠诚 - /ˈlɔɪəlti/', example: 'A dog shows loyalty to its owner.' },
    { word: 'Author', meaning: '作者 - /ˈɔːθər/', example: 'The author signed my book.' },
    { word: 'Chapter', meaning: '章节 - /ˈtʃæptər/', example: 'Read chapter three for homework.' },
    { word: 'Paragraph', meaning: '段落 - /ˈpærəɡræf/', example: 'Each paragraph has one main idea.' },
    { word: 'Poem', meaning: '诗歌 - /ˈpoʊəm/', example: 'She wrote a poem about the ocean.' },
    { word: 'Editor', meaning: '编辑 - /ˈedɪtər/', example: 'The editor fixed my grammar mistakes.' },
    { word: 'Publish', meaning: '出版 - /ˈpʌblɪʃ/', example: 'They will publish my story next month.' },
    { word: 'Genre', meaning: '体裁 - /ˈʒɑːnrə/', example: 'Fantasy is my favorite genre.' },
    { word: 'Biography', meaning: '传记 - /baɪˈɑːɡrəfi/', example: 'I read a biography of Einstein.' },
    { word: 'Plot', meaning: '情节 - /plɑːt/', example: 'The plot of the story was exciting.' },
    { word: 'Character', meaning: '角色 - /ˈkærəktər/', example: 'The main character is a brave girl.' },
    { word: 'Journalist', meaning: '记者 - /ˈdʒɜːrnəlɪst/', example: 'The journalist reported the news story.' },
    { word: 'Headline', meaning: '标题 - /ˈhedlaɪn/', example: 'The headline caught everyone\'s attention.' },
    { word: 'Manuscript', meaning: '手稿 - /ˈmænjuskrɪpt/', example: 'The author sent her manuscript to publishers.' },
    { word: 'Painting', meaning: '绘画 - /ˈpeɪntɪŋ/', example: 'Her painting won first prize.' },
    { word: 'Sculpture', meaning: '雕塑 - /ˈskʌlptʃər/', example: 'The sculpture is made of marble.' },
    { word: 'Theater', meaning: '剧院 - /ˈθɪətər/', example: 'We went to the theater last night.' },
    { word: 'Orchestra', meaning: '管弦乐队 - /ˈɔːrkɪstrə/', example: 'The orchestra played beautiful music.' },
    { word: 'Exhibition', meaning: '展览 - /ˌeksɪˈbɪʃn/', example: 'There is a new art exhibition in town.' },
    { word: 'Gallery', meaning: '画廊 - /ˈɡæləri/', example: 'The gallery displays modern artworks.' },
    { word: 'Melody', meaning: '旋律 - /ˈmelədi/', example: 'The melody of the song is lovely.' },
    { word: 'Rhythm', meaning: '节奏 - /ˈrɪðəm/', example: 'The drums have a strong rhythm.' },
    { word: 'Canvas', meaning: '画布 - /ˈkænvəs/', example: 'She painted on a large canvas.' },
    { word: 'Portrait', meaning: '肖像 - /ˈpɔːrtrət/', example: 'The artist painted a portrait of the king.' },
    { word: 'Choreography', meaning: '编舞 - /ˌkɔːriˈɑːɡrəfi/', example: 'The choreography was very creative.' },
    { word: 'Pottery', meaning: '陶艺 - /ˈpɑːtəri/', example: 'We made bowls in pottery class.' },
    { word: 'Performance', meaning: '表演 - /pərˈfɔːrməns/', example: 'The performance received a standing ovation.' },
    { word: 'Continent', meaning: '大洲 - /ˈkɑːntɪnənt/', example: 'Africa is the second largest continent.' },
    { word: 'Country', meaning: '国家 - /ˈkʌntri/', example: 'Japan is a beautiful country.' },
    { word: 'Capital', meaning: '首都 - /ˈkæpɪtl/', example: 'Paris is the capital of France.' },
    { word: 'Population', meaning: '人口 - /ˌpɑːpjuˈleɪʃn/', example: 'The population of the city is growing.' },
    { word: 'Latitude', meaning: '纬度 - /ˈlætɪtuːd/', example: 'Latitude measures distance from the equator.' },
    { word: 'Longitude', meaning: '经度 - /ˈlɑːndʒɪtuːd/', example: 'Longitude runs from north to south.' },
    { word: 'Equator', meaning: '赤道 - /ɪˈkweɪtər/', example: 'The equator divides Earth into two halves.' },
    { word: 'Hemisphere', meaning: '半球 - /ˈhemɪsfɪr/', example: 'We live in the northern hemisphere.' },
    { word: 'Mountain', meaning: '山脉 - /ˈmaʊntn/', example: 'The mountain is covered with snow.' },
    { word: 'Ocean', meaning: '海洋 - /ˈoʊʃn/', example: 'The Pacific is the largest ocean.' },
    { word: 'Desert', meaning: '沙漠 - /ˈdezərt/', example: 'It rarely rains in the desert.' },
    { word: 'Volcano', meaning: '火山 - /vɑːlˈkeɪnoʊ/', example: 'The volcano erupted with hot lava.' },
    { word: 'Peninsula', meaning: '半岛 - /pəˈnɪnsələ/', example: 'Italy is a peninsula in Europe.' },
    { word: 'Budget', meaning: '预算 - /ˈbʌdʒɪt/', example: 'We need to plan our budget carefully.' },
    { word: 'Salary', meaning: '薪水 - /ˈsæləri/', example: 'She gets a monthly salary for her work.' },
    { word: 'Invest', meaning: '投资 - /ɪnˈvest/', example: 'My dad wants to invest in stocks.' },
    { word: 'Loan', meaning: '贷款 - /loʊn/', example: 'The bank gave us a loan for the house.' },
    { word: 'Afford', meaning: '负担得起 - /əˈfɔːrd/', example: 'We cannot afford a new car right now.' },
    { word: 'Income', meaning: '收入 - /ˈɪnkʌm/', example: 'His income comes from his small business.' },
    { word: 'Expense', meaning: '开支 - /ɪkˈspens/', example: 'Rent is our biggest monthly expense.' },
    { word: 'Savings', meaning: '储蓄 - /ˈseɪvɪŋz/', example: 'She put her savings in the bank.' },
    { word: 'Interest', meaning: '利息 - /ˈɪntrəst/', example: 'The bank pays interest on savings.' },
    { word: 'Currency', meaning: '货币 - /ˈkɜːrənsi/', example: 'Different countries use different currency.' },
    { word: 'Value', meaning: '价值 - /ˈvæljuː/', example: 'The value of the painting increased.' },
    { word: 'Poverty', meaning: '贫困 - /ˈpɑːvərti/', example: 'We want to help people in poverty.' },
    { word: 'Wealth', meaning: '财富 - /welθ/', example: 'Health is more important than wealth.' },
    { word: 'Tournament', meaning: '锦标赛 - /ˈtʊrnəmənt/', example: 'Our team won the final tournament.' },
    { word: 'Champion', meaning: '冠军 - /ˈtʃæmpiən/', example: 'She became the school chess champion.' },
    { word: 'Medal', meaning: '奖牌 - /ˈmedl/', example: 'He won a gold medal in swimming.' },
    { word: 'Coach', meaning: '教练 - /koʊtʃ/', example: 'The coach taught us new techniques.' },
    { word: 'Opponent', meaning: '对手 - /əˈpoʊnənt/', example: 'My opponent was very talented.' },
    { word: 'Score', meaning: '得分 - /skɔːr/', example: 'What was the final score of the game?' },
    { word: 'Practice', meaning: '练习 - /ˈpræktɪs/', example: 'Practice makes you better at sports.' },
    { word: 'Competition', meaning: '比赛 - /ˌkɑːmpəˈtɪʃn/', example: 'The competition was very close.' },
    { word: 'Defeat', meaning: '击败 - /dɪˈfiːt/', example: 'Our team defeated the rivals easily.' },
    { word: 'Spectator', meaning: '观众 - /ˈspekteɪtər/', example: 'The spectators cheered loudly.' },
    { word: 'Stadium', meaning: '体育场 - /ˈsteɪdiəm/', example: 'The stadium can hold fifty thousand people.' },
    { word: 'Athlete', meaning: '运动员 - /ˈæθliːt/', example: 'She wants to be a professional athlete.' },
    { word: 'Victory', meaning: '胜利 - /ˈvɪktəri/', example: 'The team celebrated their victory.' },
    { word: 'Strategy', meaning: '策略 - /ˈstrætədʒi/', example: 'We need a good strategy to win.' },
    { word: 'Solution', meaning: '解决方案 - /səˈluːʃn/', example: 'We found a solution to the puzzle.' },
    { word: 'Evaluate', meaning: '评估 - /ɪˈvæljueɪt/', example: 'Evaluate your work before submitting it.' },
    { word: 'Logical', meaning: '逻辑的 - /ˈlɑːdʒɪkl/', example: 'That is a logical way to think.' },
    { word: 'Identify', meaning: '识别 - /aɪˈdentɪfaɪ/', example: 'Can you identify the main problem?' },
    { word: 'Alternative', meaning: '替代方案 - /ɔːlˈtɜːrnətɪv/', example: 'We need an alternative plan.' },
    { word: 'Decision', meaning: '决定 - /dɪˈsɪʒn/', example: 'Think carefully before making a decision.' },
    { word: 'Prioritize', meaning: '优先处理 - /praɪˈɔːrətaɪz/', example: 'Prioritize your most important tasks first.' },
    { word: 'Obstacle', meaning: '障碍 - /ˈɑːbstəkl/', example: 'Every obstacle can be overcome.' },
    { word: 'Brainstorm', meaning: '头脑风暴 - /ˈbreɪnstɔːrm/', example: 'Let us brainstorm ideas together.' },
    { word: 'Investigate', meaning: '调查 - /ɪnˈvestɪɡeɪt/', example: 'The detective will investigate the case.' },
    { word: 'Hypothesis', meaning: '假设 - /haɪˈpɑːθəsɪs/', example: 'Form a hypothesis before the experiment.' },
    { word: 'Interpret', meaning: '解读 - /ɪnˈtɜːrprɪt/', example: 'Interpret the chart and explain it.' },
    { word: 'Career', meaning: '职业 - /kəˈrɪr/', example: 'She wants a career in medicine.' },
    { word: 'Future', meaning: '未来 - /ˈfjuːtʃər/', example: 'What do you want to do in the future?' },
    { word: 'Goal', meaning: '目标 - /ɡoʊl/', example: 'My goal is to learn Spanish this year.' },
    { word: 'Plan', meaning: '计划 - /plæn/', example: 'Do you have a plan for the weekend?' },
    { word: 'Profession', meaning: '职业 - /prəˈfeʃn/', example: 'Teaching is a rewarding profession.' },
    { word: 'Volunteer', meaning: '志愿者 - /ˌvɑːlənˈtɪr/', example: 'I volunteer at the animal shelter.' },
    { word: 'Achieve', meaning: '实现 - /əˈtʃiːv/', example: 'Work hard to achieve your dreams.' },
    { word: 'Aspiration', meaning: '志向 - /ˌæspəˈreɪʃn/', example: 'Her aspiration is to help others.' },
    { word: 'Determine', meaning: '决心 - /dɪˈtɜːrmɪn/', example: 'She is determined to succeed.' },
    { word: 'Potential', meaning: '潜力 - /pəˈtenʃl/', example: 'You have great potential in music.' },
    { word: 'Motivation', meaning: '动力 - /ˌmoʊtɪˈveɪʃn/', example: 'I need motivation to finish this project.' },
    { word: 'Graduate', meaning: '毕业 - /ˈɡrædʒuət/', example: 'She will graduate from high school next year.' },
    { word: 'Scholarship', meaning: '奖学金 - /ˈskɑːlərʃɪp/', example: 'He won a scholarship to study abroad.' },
    { word: 'Emergency', meaning: '紧急情况 - /iˈmɜːrdʒənsi/', example: 'Call 911 in an emergency.' },
    { word: 'Accident', meaning: '事故 - /ˈæksɪdənt/', example: 'There was a car accident on the road.' },
    { word: 'First aid', meaning: '急救 - /fɜːrst eɪd/', example: 'She learned first aid at camp.' },
    { word: 'Rescue', meaning: '救援 - /ˈreskjuː/', example: 'The firefighter helped rescue the cat.' },
    { word: 'Danger', meaning: '危险 - /ˈdeɪndʒər/', example: 'Stay away from danger.' },
    { word: 'Evacuate', meaning: '疏散 - /ɪˈvækjueɪt/', example: 'Everyone must evacuate the building.' },
    { word: 'Warning', meaning: '警告 - /ˈwɔːrnɪŋ/', example: 'The warning sign said danger ahead.' },
    { word: 'Prevent', meaning: '预防 - /prɪˈvent/', example: 'Wash your hands to prevent illness.' },
    { word: 'Survive', meaning: '幸存 - /sərˈvaɪv/', example: 'They managed to survive the storm.' },
    { word: 'Earthquake', meaning: '地震 - /ˈɜːrθkweɪk/', example: 'The earthquake shook the whole city.' },
    { word: 'Injury', meaning: '受伤 - /ˈɪndʒəri/', example: 'He suffered a minor injury during the game.' },
    { word: 'Ambulance', meaning: '救护车 - /ˈæmbjələns/', example: 'The ambulance arrived within minutes.' },
    { word: 'Hazard', meaning: '危险物 - /ˈhæzərd/', example: 'Broken glass is a safety hazard.' },
    { word: 'Custom', meaning: '风俗 - /ˈkʌstəm/', example: 'Every country has its own customs.' },
    { word: 'Language', meaning: '语言 - /ˈlæŋɡwɪdʒ/', example: 'Learning a new language is fun.' },
    { word: 'Souvenir', meaning: '纪念品 - /ˌsuːvəˈnɪr/', example: 'I bought a souvenir from the trip.' },
    { word: 'Foreign', meaning: '外国的 - /ˈfɔːrən/', example: 'She can speak three foreign languages.' },
    { word: 'Translate', meaning: '翻译 - /trænzˈleɪt/', example: 'Can you translate this sentence for me?' },
    { word: 'Passport', meaning: '护照 - /ˈpæspɔːrt/', example: 'You need a passport to travel abroad.' },
    { word: 'Destination', meaning: '目的地 - /ˌdestɪˈneɪʃn/', example: 'Our destination is Paris, France.' },
    { word: 'Visa', meaning: '签证 - /ˈviːzə/', example: 'We applied for a tourist visa.' },
    { word: 'Guide', meaning: '导游 - /ɡaɪd/', example: 'The guide showed us around the city.' },
    { word: 'Luggage', meaning: '行李 - /ˈlʌɡɪdʒ/', example: 'Please keep your luggage with you.' },
    { word: 'Accommodation', meaning: '住宿 - /əˌkɑːməˈdeɪʃn/', example: 'We found nice accommodation near the beach.' },
    { word: 'Itinerary', meaning: '行程 - /aɪˈtɪnəreri/', example: 'Our itinerary includes three museums.' },
    { word: 'Cuisine', meaning: '菜肴 - /kwɪˈziːn/', example: 'Italian cuisine is famous worldwide.' },
    { word: 'Confident', meaning: '自信的 - /ˈkɑːnfɪdənt/', example: 'She feels confident about the exam.' },
    { word: 'Responsible', meaning: '负责的 - /rɪˈspɑːnsəbl/', example: 'Be responsible for your own actions.' },
    { word: 'Independent', meaning: '独立的 - /ˌɪndɪˈpendənt/', example: 'He is learning to be independent.' },
    { word: 'Reliable', meaning: '可靠的 - /rɪˈlaɪəbl/', example: 'She is a very reliable friend.' },
    { word: 'Mature', meaning: '成熟的 - /məˈtʃʊr/', example: 'He handled the situation like a mature person.' },
    { word: 'Curious', meaning: '好奇的 - /ˈkjʊriəs/', example: 'Curious kids ask many questions.' },
    { word: 'Determined', meaning: '坚定的 - /dɪˈtɜːrmɪnd/', example: 'She is determined to finish the race.' },
    { word: 'Disciplined', meaning: '自律的 - /ˈdɪsəplɪnd/', example: 'A disciplined student studies every day.' },
    { word: 'Ambitious', meaning: '有雄心的 - /æmˈbɪʃəs/', example: 'He is ambitious about his future.' },
    { word: 'Adaptable', meaning: '适应力强的 - /əˈdæptəbl/', example: 'Children are very adaptable to change.' },
    { word: 'Considerate', meaning: '体贴的 - /kənˈsɪdərət/', example: 'It is considerate to help elderly people.' },
    { word: 'Persistent', meaning: '坚持不懈的 - /pərˈsɪstənt/', example: 'Be persistent and never give up.' },
    { word: 'Humble', meaning: '谦虚的 - /ˈhʌmbl/', example: 'Stay humble even when you succeed.' },
    { word: 'Negotiate', meaning: '谈判 - /nɪˈɡoʊʃieɪt/', example: 'They had to negotiate a fair deal.' },
    { word: 'Persuade', meaning: '说服 - /pərˈsweɪd/', example: 'Can I persuade you to join us?' },
    { word: 'Explain', meaning: '解释 - /ɪkˈspleɪn/', example: 'Please explain how this machine works.' },
    { word: 'Describe', meaning: '描述 - /dɪˈskraɪb/', example: 'Describe what you saw on the trip.' },
    { word: 'Argue', meaning: '争论 - /ˈɑːrɡjuː/', example: 'Do not argue with your friends.' },
    { word: 'Debate', meaning: '辩论 - /dɪˈbeɪt/', example: 'The class held a debate about recycling.' },
    { word: 'Announce', meaning: '宣布 - /əˈnaʊns/', example: 'The principal will announce the winners.' },
    { word: 'Compliment', meaning: '赞美 - /ˈkɑːmplɪmənt/', example: 'She gave me a nice compliment.' },
    { word: 'Feedback', meaning: '反馈 - /ˈfiːdbæk/', example: 'My teacher gave me helpful feedback.' },
    { word: 'Convey', meaning: '传达 - /kənˈveɪ/', example: 'Convey your ideas with confidence.' },
    { word: 'Correspond', meaning: '通信 - /ˌkɔːrəˈspɑːnd/', example: 'We correspond by email every week.' },
    { word: 'Express', meaning: '表达 - /ɪkˈspres/', example: 'Learn to express your feelings clearly.' },
    { word: 'Clarify', meaning: '澄清 - /ˈklærəfaɪ/', example: 'Let me clarify what I meant.' },
    { word: 'Astronaut', meaning: '宇航员 - /ˈæstrənɔːt/', example: 'The astronaut walked on the moon.' },
    { word: 'Planet', meaning: '行星 - /ˈplænɪt/', example: 'Mars is called the red planet.' },
    { word: 'Orbit', meaning: '轨道 - /ˈɔːrbɪt/', example: 'The satellite orbits the Earth.' },
    { word: 'Satellite', meaning: '卫星 - /ˈsætəlaɪt/', example: 'A satellite sends signals to Earth.' },
    { word: 'Telescope', meaning: '望远镜 - /ˈtelɪskoʊp/', example: 'Look at the stars through this telescope.' },
    { word: 'Galaxy', meaning: '星系 - /ˈɡæləksi/', example: 'The Milky Way is our galaxy.' },
    { word: 'Comet', meaning: '彗星 - /ˈkɑːmət/', example: 'A comet has a bright tail.' },
    { word: 'Asteroid', meaning: '小行星 - /ˈæstərɔɪd/', example: 'An asteroid belt lies between Mars and Jupiter.' },
    { word: 'Launch', meaning: '发射 - /lɔːntʃ/', example: 'They will launch the rocket at dawn.' },
    { word: 'Spacecraft', meaning: '航天器 - /ˈspeɪskræft/', example: 'The spacecraft landed on Mars.' },
    { word: 'Constellation', meaning: '星座 - /ˌkɑːnstəˈleɪʃn/', example: 'Orion is a famous constellation.' },
    { word: 'Universe', meaning: '宇宙 - /ˈjuːnɪvɜːrs/', example: 'The universe is bigger than we imagine.' },
    { word: 'Observation', meaning: '观测 - /ˌɑːbzərˈveɪʃn/', example: 'The observation lasted for three hours.' }
];

// ==================== GRAMMAR RULES ====================
const grammarRulesData = [
    // Present Simple
    { rule: 'Present Simple Tense', example: 'I eat apples every day.', level: 'Grade 1-2' },
    { rule: 'Present Simple - Third Person', example: 'She eats apples every day.', level: 'Grade 1-2' },
    { rule: 'Present Simple - Negative', example: 'I do not eat oranges.', level: 'Grade 2-3' },
    { rule: 'Present Simple - Question', example: 'Do you like apples?', level: 'Grade 2-3' },
    // Present Continuous
    { rule: 'Present Continuous Tense', example: 'I am eating an apple now.', level: 'Grade 2-3' },
    { rule: 'Present Continuous - Negative', example: 'She is not eating.', level: 'Grade 2-3' },
    { rule: 'Present Continuous - Question', example: 'What are you doing?', level: 'Grade 3-4' },
    // Past Simple
    { rule: 'Past Simple Tense', example: 'I ate an apple yesterday.', level: 'Grade 3-4' },
    { rule: 'Past Simple - Irregular', example: 'She went to school.', level: 'Grade 3-4' },
    { rule: 'Past Simple - Negative', example: 'I did not eat breakfast.', level: 'Grade 4-5' },
    { rule: 'Past Simple - Question', example: 'Did you go to the park?', level: 'Grade 4-5' },
    // Past Continuous
    { rule: 'Past Continuous Tense', example: 'I was eating when she arrived.', level: 'Grade 4-5' },
    { rule: 'Past Continuous - Negative', example: 'He was not working.', level: 'Grade 4-5' },
    { rule: 'Past Continuous - Question', example: 'What were you doing?', level: 'Grade 5-6' },
    // Future Simple
    { rule: 'Future Simple with Will', example: 'I will eat an apple tomorrow.', level: 'Grade 4-5' },
    { rule: 'Future Simple - Negative', example: 'She will not come.', level: 'Grade 4-5' },
    { rule: 'Future Simple - Question', example: 'Will you help me?', level: 'Grade 5-6' },
    { rule: 'Future with Going to', example: 'I am going to visit Paris.', level: 'Grade 4-5' },
    // Present Perfect
    { rule: 'Present Perfect Tense', example: 'I have eaten apples.', level: 'Grade 5-6' },
    { rule: 'Present Perfect - Negative', example: 'She has not finished.', level: 'Grade 5-6' },
    { rule: 'Present Perfect - Question', example: 'Have you seen the movie?', level: 'Grade 5-6' },
    { rule: 'Present Perfect with For/Since', example: 'I have lived here for 5 years.', level: 'Grade 5-6' },
    // Past Perfect
    { rule: 'Past Perfect Tense', example: 'I had finished before he arrived.', level: 'Grade 6-Junior' },
    { rule: 'Past Perfect - Negative', example: 'She had not seen it.', level: 'Grade 6-Junior' },
    // Future Perfect
    { rule: 'Future Perfect Tense', example: 'I will have finished by tomorrow.', level: 'Grade 6-Junior' },
    // Modal Verbs
    { rule: 'Modal Verb - Can', example: 'I can swim.', level: 'Grade 2-3' },
    { rule: 'Modal Verb - May', example: 'May I go to the bathroom?', level: 'Grade 3-4' },
    { rule: 'Modal Verb - Must', example: 'You must study hard.', level: 'Grade 3-4' },
    { rule: 'Modal Verb - Should', example: 'You should drink water.', level: 'Grade 4-5' },
    { rule: 'Modal Verb - Would', example: 'I would like a cup of tea.', level: 'Grade 4-5' },
    { rule: 'Modal Verb - Could', example: 'I could swim when I was 5.', level: 'Grade 4-5' },
    { rule: 'Modal Verb - Need', example: 'You need to study.', level: 'Grade 4-5' },
    { rule: 'Modal Verb - Ought to', example: 'You ought to be careful.', level: 'Grade 5-6' },
    // Parts of Speech
    { rule: 'Nouns', example: 'Apple, book, cat (naming words)', level: 'Grade 1-2' },
    { rule: 'Verbs', example: 'Eat, run, play (action words)', level: 'Grade 1-2' },
    { rule: 'Adjectives', example: 'Big, happy, red (describing words)', level: 'Grade 2-3' },
    { rule: 'Adverbs', example: 'Quickly, happily, slowly (how words)', level: 'Grade 3-4' },
    { rule: 'Pronouns', example: 'I, you, he, she, it (replace nouns)', level: 'Grade 2-3' },
    { rule: 'Prepositions', example: 'In, on, under, beside', level: 'Grade 3-4' },
    { rule: 'Articles', example: 'A, an, the', level: 'Grade 1-2' },
    { rule: 'Conjunctions', example: 'And, but, or, so', level: 'Grade 2-3' },
    { rule: 'Interjections', example: 'Wow!, Oh!, Oops!', level: 'Grade 2-3' },
    // Sentence Structure
    { rule: 'Simple Sentence', example: 'The cat is black.', level: 'Grade 1-2' },
    { rule: 'Compound Sentence', example: 'I like apples and she likes oranges.', level: 'Grade 3-4' },
    { rule: 'Complex Sentence', example: 'When it rains, we stay inside.', level: 'Grade 4-5' },
    { rule: 'Compound-Complex Sentence', example: 'I like apples, but she likes oranges because they are sweet.', level: 'Grade 5-6' },
    // Conditionals
    { rule: 'Zero Conditional', example: 'If it rains, the ground gets wet.', level: 'Grade 5-6' },
    { rule: 'First Conditional', example: 'If it rains, we will stay home.', level: 'Grade 5-6' },
    { rule: 'Second Conditional', example: 'If I had wings, I would fly.', level: 'Grade 6-Junior' },
    { rule: 'Third Conditional', example: 'If I had known, I would have helped.', level: 'Grade 6-Junior' },
    // Passive Voice
    { rule: 'Passive Voice', example: 'The cake was eaten by the children.', level: 'Grade 5-6' },
    { rule: 'Passive Voice - Present', example: 'Books are read by students.', level: 'Grade 5-6' },
    { rule: 'Passive Voice - Future', example: 'The work will be finished tomorrow.', level: 'Grade 5-6' },
    // Comparatives and Superlatives
    { rule: 'Comparative Adjectives', example: 'The cat is bigger than the mouse.', level: 'Grade 3-4' },
    { rule: 'Superlative Adjectives', example: 'This is the biggest apple.', level: 'Grade 3-4' },
    // Question Types
    { rule: 'Yes/No Questions', example: 'Do you like ice cream?', level: 'Grade 2-3' },
    { rule: 'Wh-Questions', example: 'What is your name?', level: 'Grade 2-3' },
    { rule: 'Tag Questions', example: 'You like apples, don\'t you?', level: 'Grade 5-6' },
    // Subject-Verb Agreement
    { rule: 'Subject-Verb Agreement', example: 'He plays soccer. They play soccer.', level: 'Grade 3-4' },
    // Possessives
    { rule: 'Possessive Adjectives', example: 'My book, your pen, his bag', level: 'Grade 2-3' },
    { rule: 'Possessive Nouns', example: 'The cat\'s tail, children\'s toys', level: 'Grade 3-4' },
    // Contractions
    { rule: 'Contractions', example: 'I\'m = I am, don\'t = do not', level: 'Grade 2-3' },
    // Capitalization
    { rule: 'Capitalization Rules', example: 'Capitalize names, places, days, months', level: 'Grade 1-2' },
    // Punctuation
    { rule: 'Period (.)', example: 'Use at the end of a sentence.', level: 'Grade 1-2' },
    { rule: 'Question Mark (?)', example: 'Use at the end of a question.', level: 'Grade 1-2' },
    { rule: 'Exclamation Mark (!)', example: 'Use for strong feelings!', level: 'Grade 1-2' },
    { rule: 'Comma (,)', example: 'Use to separate items in a list.', level: 'Grade 2-3' }
];

// ==================== SCIENCE FACTS ====================
const scienceFactsData = [
    // Plants
    { topic: 'Plants', fact: 'Edelweiss is a beautiful white flower that grows in the Alps mountains.' },
    { topic: 'Plants', fact: 'Sunflowers always face the sun as it moves across the sky.' },
    { topic: 'Plants', fact: 'Tulips are the national flower of the Netherlands.' },
    { topic: 'Plants', fact: 'Vineyards in France produce some of the best wine in the world.' },
    { topic: 'Plants', fact: 'Olive trees grow in the Mediterranean region and produce olives.' },
    { topic: 'Plants', fact: 'The English rose is a symbol of beauty and romance.' },
    { topic: 'Plants', fact: 'Plants make their own food through a process called photosynthesis.' },
    { topic: 'Plants', fact: 'Leaves are green because they contain chlorophyll.' },
    { topic: 'Plants', fact: 'Flowers help plants reproduce by making seeds.' },
    { topic: 'Plants', fact: 'Trees take in carbon dioxide and give out oxygen.' },
    // Animals
    { topic: 'Animals', fact: 'Red squirrels are native to the United Kingdom.' },
    { topic: 'Animals', fact: 'Alpine ibex are mountain goats that live in the Alps.' },
    { topic: 'Animals', fact: 'European bison are the largest land animals in Europe.' },
    { topic: 'Animals', fact: 'Scottish wildcats are one of the rarest cats in the world.' },
    { topic: 'Animals', fact: 'Iberian lynx is a critically endangered wild cat from Spain.' },
    { topic: 'Animals', fact: 'Dolphins live in the Mediterranean Sea.' },
    { topic: 'Animals', fact: 'Butterflies go through a metamorphosis from caterpillar to butterfly.' },
    { topic: 'Animals', fact: 'Bees help plants grow by carrying pollen from flower to flower.' },
    { topic: 'Animals', fact: 'Birds have feathers and wings that help them fly.' },
    { topic: 'Animals', fact: 'Fish breathe underwater using gills.' },
    // Weather
    { topic: 'Weather', fact: 'The UK has a maritime climate with frequent rain.' },
    { topic: 'Weather', fact: 'Norway experiences the midnight sun in summer.' },
    { topic: 'Weather', fact: 'Finland has very cold winters with lots of snow.' },
    { topic: 'Weather', fact: 'Iceland has geysers that shoot hot water into the air.' },
    { topic: 'Weather', fact: 'The Swiss Alps have heavy snow in winter, perfect for skiing.' },
    { topic: 'Weather', fact: 'Rain forms when water vapor condenses into droplets.' },
    { topic: 'Weather', fact: 'Thunder is the sound caused by lightning.' },
    { topic: 'Weather', fact: 'Rainbows appear when sunlight passes through water droplets.' },
    { topic: 'Weather', fact: 'Wind is moving air.' },
    { topic: 'Weather', fact: 'Clouds are made of tiny water droplets or ice crystals.' },
    // Space
    { topic: 'Space', fact: 'The European Space Agency (ESA) explores space.' },
    { topic: 'Space', fact: 'Galileo Galilei was an Italian astronomer who studied the stars.' },
    { topic: 'Space', fact: 'The Hubble Telescope takes amazing pictures of space.' },
    { topic: 'Space', fact: 'Earth is the third planet from the Sun.' },
    { topic: 'Space', fact: 'The Moon orbits around the Earth.' },
    { topic: 'Space', fact: 'Stars are huge balls of hot gas.' },
    { topic: 'Space', fact: 'Planets orbit around the Sun.' },
    { topic: 'Space', fact: 'Astronauts float in space because there is no gravity.' },
    { topic: 'Space', fact: 'The Sun is a star at the center of our solar system.' },
    { topic: 'Space', fact: 'There are eight planets in our solar system.' },
    // Chemistry
    { topic: 'Chemistry', fact: 'Marie Curie was a Polish-French scientist who discovered radium.' },
    { topic: 'Chemistry', fact: 'Water is made of hydrogen and oxygen (H2O).' },
    { topic: 'Chemistry', fact: 'Air is a mixture of gases, mostly nitrogen and oxygen.' },
    { topic: 'Chemistry', fact: 'Salt is made of sodium and chlorine.' },
    { topic: 'Chemistry', fact: 'Plants make oxygen through photosynthesis.' },
    { topic: 'Chemistry', fact: 'Iron rusts when it reacts with oxygen and water.' },
    { topic: 'Chemistry', fact: 'Baking soda and vinegar react to make bubbles.' },
    { topic: 'Chemistry', fact: 'All matter is made of tiny particles called atoms.' },
    { topic: 'Chemistry', fact: 'Different elements have different properties.' },
    { topic: 'Chemistry', fact: 'Chemical reactions change one substance into another.' },
    // Biology
    { topic: 'Biology', fact: 'The human body has 206 bones.' },
    { topic: 'Biology', fact: 'The heart pumps blood around the body.' },
    { topic: 'Biology', fact: 'The brain is the control center of the body.' },
    { topic: 'Biology', fact: 'Humans breathe in oxygen and breathe out carbon dioxide.' },
    { topic: 'Biology', fact: 'Plants need water, sunlight, and air to grow.' },
    { topic: 'Biology', fact: 'Cells are the building blocks of all living things.' },
    { topic: 'Biology', fact: 'DNA contains the instructions for life.' },
    { topic: 'Biology', fact: 'Animals need food, water, and shelter to survive.' },
    { topic: 'Biology', fact: 'Butterflies start as eggs, become caterpillars, then butterflies.' },
    { topic: 'Biology', fact: 'Fish lay eggs in water.' },
    // Physics
    { topic: 'Physics', fact: 'Gravity keeps us on the ground.' },
    { topic: 'Physics', fact: 'Light travels faster than sound.' },
    { topic: 'Physics', fact: 'Electricity can flow through wires.' },
    { topic: 'Physics', fact: 'Magnets attract iron and steel.' },
    { topic: 'Physics', fact: 'Heat makes things expand; cold makes them contract.' },
    { topic: 'Physics', fact: 'Sound is caused by vibrations.' },
    { topic: 'Physics', fact: 'Objects fall at the same speed regardless of weight.' },
    { topic: 'Physics', fact: 'Energy can change from one form to another.' },
    { topic: 'Physics', fact: 'Friction slows moving objects down.' },
    { topic: 'Physics', fact: 'A lever can help lift heavy objects.' },
    { topic: 'Physics', fact: 'Sound travels faster through solids than through air.' },
    { topic: 'Physics', fact: 'The speed of light is about 300,000 km per second.' },
    { topic: 'Physics', fact: 'A rainbow is formed by the dispersion of light.' },
    { topic: 'Physics', fact: 'When you rub two objects together, you create static electricity.' },
    { topic: 'Physics', fact: 'Simple machines help make work easier.' },
    // Geology
    { topic: 'Geology', fact: 'Mount Vesuvius in Italy is an active volcano.' },
    { topic: 'Geology', fact: 'The Swiss Alps were formed millions of years ago.' },
    { topic: 'Geology', fact: 'Norway has many fjords carved by glaciers.' },
    { topic: 'Geology', fact: 'The Giant\'s Causeway in Northern Ireland has hexagonal basalt columns.' },
    { topic: 'Geology', fact: 'The Mediterranean Sea was once a large desert.' },
    { topic: 'Geology', fact: 'Mountains are formed when tectonic plates collide.' },
    { topic: 'Geology', fact: 'Fossils are remains of ancient plants and animals.' },
    { topic: 'Geology', fact: 'Volcanoes erupt when magma rises to the surface.' },
    { topic: 'Geology', fact: 'Earthquakes are caused by moving tectonic plates.' },
    { topic: 'Geology', fact: 'Rocks can be igneous, sedimentary, or metamorphic.' },
    // European Culture
    { topic: 'Culture', fact: 'The Eiffel Tower was built for the 1889 World Fair in Paris.' },
    { topic: 'Culture', fact: 'The Colosseum in Rome is over 2000 years old.' },
    { topic: 'Culture', fact: 'The British Museum has over 8 million artifacts.' },
    { topic: 'Culture', fact: 'The Louvre in Paris is the largest art museum in the world.' },
    { topic: 'Culture', fact: 'Vienna is known as the "City of Music" because of Mozart and Beethoven.' },
    { topic: 'Culture', fact: 'The Netherlands is famous for its windmills and tulips.' },
    { topic: 'Culture', fact: 'The Northern Lights can be seen in Norway, Sweden, and Finland.' },
    { topic: 'Culture', fact: 'Edinburgh Castle overlooks the city of Edinburgh, Scotland.' },
    { topic: 'Culture', fact: 'The Acropolis in Athens is an ancient Greek landmark.' },
    { topic: 'Culture', fact: 'Prague Castle is one of the largest ancient castles in the world.' },
    // Health
    { topic: 'Health', fact: 'Washing your hands helps prevent germs from spreading.' },
    { topic: 'Health', fact: 'Eating fruits and vegetables keeps you healthy.' },
    { topic: 'Health', fact: 'Exercise helps your body stay strong.' },
    { topic: 'Health', fact: 'Brushing your teeth twice a day prevents cavities.' },
    { topic: 'Health', fact: 'Getting enough sleep is important for your brain.' },
    { topic: 'Health', fact: 'Drinking water keeps your body hydrated.' },
    { topic: 'Health', fact: 'Smiling makes you feel happy and reduces stress.' },
    { topic: 'Health', fact: 'Good posture helps prevent back pain.' },
    { topic: 'Health', fact: 'Sunlight helps your body make vitamin D.' },
    { topic: 'Health', fact: 'Sharing is good for your social health.' },
    // Environment
    { topic: 'Environment', fact: 'Recycling helps protect the environment.' },
    { topic: 'Environment', fact: 'Trees absorb carbon dioxide and produce oxygen.' },
    { topic: 'Environment', fact: 'Plastic pollution is harmful to oceans.' },
    { topic: 'Environment', fact: 'Saving water is important for the planet.' },
    { topic: 'Environment', fact: 'Solar energy is a renewable energy source.' },
    { topic: 'Environment', fact: 'Wind turbines produce clean electricity.' },
    { topic: 'Environment', fact: 'Bees are important pollinators for plants.' },
    { topic: 'Environment', fact: 'Rainforests are home to many animal species.' },
    { topic: 'Environment', fact: 'Littering harms wildlife and the environment.' },
    { topic: 'Environment', fact: 'Planting trees helps fight climate change.' }
];

// ==================== FULL STORY CONTENT ====================
const fullStoriesData = [
    // Bedtime Stories
    {
        title: 'Moonlit Journey to the Eiffel Tower',
        category: 'bedtime',
        content: `Once upon a time, there was a little girl named Lila who loved to dream about faraway places. One magical night, as the moon shone brightly in the sky, Lila closed her eyes and wished she could visit Paris.

Suddenly, her bedroom window opened and a beautiful silver moonbeam floated in. "Hop on," whispered the moonbeam. Lila climbed aboard, and the moonbeam carried her high above the clouds.

Below her, she could see the twinkling lights of Paris. The moonbeam gently landed near the Eiffel Tower, which sparkled like a giant diamond in the moonlight.

As Lila explored, she heard soft music coming from the tower. She climbed the stairs and found a tiny orchestra of moon fairies playing lullabies. They smiled at her and played a special song just for her.

"Thank you," Lila whispered. The fairies smiled and said, "Whenever you wish for adventure, the moon will guide you."

As the first rays of dawn appeared, Lila climbed back onto her moonbeam. It carried her safely home, where she fell into a peaceful sleep, dreaming of her magical journey.`,
        level: 'Age 4-7',
        duration: '5 minutes'
    },
    {
        title: 'Goodnight Little Prince',
        category: 'bedtime',
        content: `In a tiny castle on a hill, there lived a little prince named Leo. Every night, before going to bed, Leo would wave goodnight to all his friends in the kingdom.

"Goodnight, stars," he said to the twinkling sky. "Goodnight, moon, thank you for guiding me today."

He looked down at the village below. "Goodnight, Mrs. Baker and her warm bread. Goodnight, the blacksmith and his horses. Goodnight, all the children sleeping tight."

Then Leo turned to his favorite teddy bear. "Goodnight, Sir Fluffington. Thank you for being my brave knight today."

His nanny came in with a warm cup of milk. "Goodnight, sweet prince," she said. "The kingdom is safe because of you."

Leo snuggled under his covers, feeling warm and loved. Outside, the moon smiled down, watching over the little prince as he drifted off to sleep.`,
        level: 'Age 3-6',
        duration: '4 minutes'
    },
    {
        title: 'Dreaming of the Northern Lights',
        category: 'bedtime',
        content: `In a cozy cabin in Norway, a little boy named Erik lay in bed, listening to the wind whisper through the pine trees. His grandmother had told him stories about the Northern Lights, and he dreamed of seeing them.

As Erik closed his eyes, he felt himself floating up, up, up into the night sky. Below him, the snow-covered mountains sparkled like diamonds.

Then, suddenly, the sky lit up! Green, blue, and purple lights danced across the darkness. They swirled and twirled like magical ribbons.

"Hello," said a soft voice. Erik turned to see a beautiful aurora fairy with hair like flowing lights. "Welcome to the dance of the Northern Lights," she said.

The fairy took Erik's hand, and together they danced among the lights. The lights told stories of ancient times - of Vikings, of reindeer, of stars that had watched over the world for centuries.

As the first light of morning began to show, the fairy smiled. "Remember," she said, "the Northern Lights are always here, even when you can't see them."

Erik woke up with a smile, knowing he would never forget his magical night.`,
        level: 'Age 5-8',
        duration: '6 minutes'
    },
    {
        title: 'Starry Night Over the Mediterranean',
        category: 'bedtime',
        content: `On a warm summer night in Greece, a little girl named Sophia sat on her grandmother's balcony, staring at the stars above the Mediterranean Sea.

"Grandma," she asked, "why do the stars shine so brightly here?"

Her grandmother smiled. "Because the sea reflects their light, making them extra special."

As Sophia watched, one star began to fall. But instead of disappearing, it landed gently on the water, glowing like a tiny lantern.

Curious, Sophia climbed down to the beach. The star floated towards her, leaving a trail of sparkles. "Follow me," it whispered.

The star led her along the shore, where sea creatures peeked out to say hello. Dolphins splashed in the moonlight, and fireflies danced in the air.

At the end of the beach, the star stopped. "Look up," it said. Sophia gazed at the sky and saw the most beautiful constellation she had ever seen - shaped like a dolphin leaping over the waves.

"Thank you," Sophia said. The star twinkled and rose back into the sky. As she walked home, she felt the magic of the night in her heart.`,
        level: 'Age 4-7',
        duration: '5 minutes'
    },
    {
        title: 'The Sleeping Princess of the Alps',
        category: 'bedtime',
        content: `High in the Swiss Alps, there was a castle made of snow and ice. Inside slept Princess Clara, who had been waiting for a very special dream.

Every night, Clara dreamed of adventures. One night, she dreamed she was skiing down the mountain, her laughter echoing through the valleys.

In her dream, she met a friendly St. Bernard dog named Bruno. "Come with me," Bruno said. "I'll show you the magic of the mountains."

Together, they explored hidden caves filled with glittering ice crystals, and meadows where alpine flowers bloomed even in winter. They visited a family of ibex who taught Clara how to climb steep cliffs.

As the night wore on, Bruno said, "It's time to go back, Princess." Clara hugged him and said, "Thank you for the best adventure ever."

When Clara woke up, she found a tiny paw print in the snow outside her window. She smiled, knowing her dream friends were real in their own way.

From that night on, Clara looked forward to bedtime, knowing the mountains held endless adventures for her to discover.`,
        level: 'Age 4-7',
        duration: '5 minutes'
    },
    {
        title: 'The Gentle Giant of the Forest',
        category: 'bedtime',
        content: `Deep in the Black Forest of Germany, there lived a giant named Gustav. But unlike other giants, Gustav was very gentle. He loved nothing more than helping the animals of the forest.

One rainy night, a family of rabbits got lost. Gustav heard their tiny cries and gently picked them up, holding them in his huge hands like precious treasures.

"Don't worry," he rumbled softly. "I'll take you home."

As he walked through the forest, the animals peeked out from their hiding places. Squirrels chattered hello, and owls hooted greetings. Gustav knew every path and every creature.

When he found the rabbits' burrow, he carefully placed them at the entrance. The mother rabbit hopped out and nuzzled his hand, thanking him.

Gustav smiled and continued his nightly walk, making sure all the animals were safe. As the moon rose, he lay down under an ancient oak tree and closed his eyes, listening to the peaceful sounds of the forest.

And so, the gentle giant watched over the forest, keeping everyone safe while they dreamed.`,
        level: 'Age 3-6',
        duration: '4 minutes'
    },
    {
        title: 'The Moon Rabbit',
        category: 'bedtime',
        content: `Have you ever looked at the moon and seen a rabbit? According to an old story, there really is one!

Long ago, the moon was a lonely place. The moon goddess felt sorry for it, so she sent a little rabbit named Tsuki to live there.

Tsuki brought with her a magical mortar and pestle. Every night, she grinds moonflower seeds into a special powder that makes dreams come true.

One night, a little girl named Mei couldn't sleep. She stared at the moon and saw Tsuki waving. "Hello!" Mei whispered.

Tsuki smiled and tossed down a handful of moon dust. As it fell, it turned into tiny stars that danced around Mei's room.

"Close your eyes," Tsuki said. "Your dreams will be beautiful tonight."

Mei closed her eyes and dreamed of flying through the stars, visiting Tsuki on the moon, and dancing with moon fairies.

From that night on, whenever Mei can't sleep, she looks at the moon and waves. And if she listens very carefully, she can almost hear Tsuki's mortar grinding softly in the moonlight.`,
        level: 'Age 3-6',
        duration: '4 minutes'
    },
    {
        title: 'The Nightingale',
        category: 'bedtime',
        content: `In a beautiful garden in Copenhagen, there lived a nightingale whose song was so beautiful it could make flowers bloom and tears flow from the hardest hearts.

One day, the emperor heard about the nightingale and asked it to sing for him. The nightingale sang so beautifully that the emperor cried tears of joy.

But soon, the emperor received a mechanical nightingale as a gift. It sang perfectly every time, and the real nightingale flew away, back to the forest.

Years passed, and the emperor became very ill. He lay in his bed, feeling lonely and sad. The mechanical nightingale had broken and could no longer sing.

Just when the emperor thought he would never hear beautiful music again, the real nightingale flew through the window.

"I heard you were ill," the nightingale said. "Let me sing for you."

As the nightingale sang, the emperor felt his strength returning. The song was even more beautiful than before, filled with love and hope.

From that day on, the emperor learned that real beauty comes from the heart, not from machines. And the nightingale visited him often, filling his palace with the sweetest music.`,
        level: 'Age 5-8',
        duration: '6 minutes'
    },
    {
        title: 'The Dreamy Dragon',
        category: 'bedtime',
        content: `In a cave behind a rainbow waterfall, there lived a dragon named Luna. But Luna wasn't like other dragons - she loved to dream more than anything else.

Every night, Luna would close her eyes and dream of magical places. She dreamed of flying over cotton candy clouds, swimming in rivers of chocolate, and having tea parties with stars.

One night, Luna dreamed she met a little girl named Mia who couldn't sleep. "Why are you sad?" Luna asked.

Mia said, "I'm afraid of the dark." Luna smiled and said, "Let me show you how beautiful the night can be."

Together, they flew through the dream sky, visiting the moon, the stars, and even a comet that painted rainbows wherever it went.

By the time Mia woke up, she wasn't afraid anymore. She knew the night was full of magic and wonder.

And Luna? She continued dreaming, knowing that her dreams could help make the world a happier place, one sleepy child at a time.`,
        level: 'Age 3-6',
        duration: '4 minutes'
    },
    {
        title: 'The Peaceful Princess',
        category: 'bedtime',
        content: `In a kingdom surrounded by lavender fields, there lived Princess Elara. She was known not for her beauty or wealth, but for her ability to bring peace wherever she went.

Every evening, Elara would walk through her kingdom, listening to the worries of her people. She would sit with farmers, play with children, and talk with elders.

One night, a terrible storm came. Thunder boomed, and lightning lit up the sky. The villagers were scared.

Elara went from house to house, calming the frightened children and reassuring everyone that the storm would pass.

She sang soft lullabies and told stories of brave knights and gentle giants. By the time the storm ended, everyone was smiling.

As the sun rose, the villagers gathered to thank Elara. But she just smiled and said, "True peace comes from caring for one another."

From that night on, whenever there was trouble, the villagers remembered Elara's words. And they learned that peace begins with kindness.`,
        level: 'Age 4-7',
        duration: '5 minutes'
    },
    // Fairy Tales
    {
        title: 'Cinderella and the Glass Slipper',
        category: 'fairy tale',
        content: `Once upon a time, there was a kind girl named Cinderella who lived with her cruel stepmother and stepsisters. They made her work day and night, but Cinderella always kept a kind heart.

One day, the king announced a ball at the palace. Cinderella wanted to go, but her stepmother said she couldn't.

As Cinderella cried, her fairy godmother appeared. "Don't worry," she said, waving her wand. Cinderella's rags turned into a beautiful dress, and a pumpkin became a golden carriage.

"Remember," the fairy godmother said, "the magic will end at midnight."

At the ball, Cinderella danced with the prince. But when the clock struck twelve, she ran away, leaving one glass slipper behind.

The prince searched the kingdom, looking for the girl whose foot fit the slipper. When he found Cinderella, they were married and lived happily ever after.`,
        level: 'Age 4-8',
        duration: '5 minutes'
    },
    {
        title: 'Snow White and the Seven Dwarfs',
        category: 'fairy tale',
        content: `Snow White was a beautiful princess with skin as white as snow. Her stepmother, the evil queen, was jealous of her beauty.

One day, the queen ordered a huntsman to kill Snow White. But the huntsman couldn't do it and told her to run away.

Snow White found a little cottage in the woods. It belonged to seven dwarfs who worked in a mine. They took her in and told her to be careful.

The queen found out Snow White was alive. She disguised herself as an old woman and tricked Snow White into eating a poisoned apple.

Snow White fell into a death-like sleep. The dwarfs built a glass coffin for her. One day, a prince found her and kissed her. The kiss broke the spell.

Snow White woke up, and she and the prince were married. The evil queen got what she deserved, and Snow White lived happily ever after.`,
        level: 'Age 4-8',
        duration: '6 minutes'
    },
    {
        title: 'Sleeping Beauty',
        category: 'fairy tale',
        content: `When Princess Aurora was born, fairies came to bless her. But one evil fairy was angry because she wasn't invited. She cursed Aurora to prick her finger on a spinning wheel and die before her sixteenth birthday.

The good fairies softened the curse - Aurora would sleep for 100 years instead of dying.

On her sixteenth birthday, Aurora found a spinning wheel in a tower. She pricked her finger and fell asleep. The whole castle fell asleep too, and thorns grew around it.

One hundred years later, a prince came to the castle. He fought through the thorns and found Aurora. He kissed her, and she woke up.

The castle woke up too, and everyone celebrated. Aurora and the prince were married, and they ruled the kingdom with kindness and wisdom.`,
        level: 'Age 4-8',
        duration: '5 minutes'
    },
    {
        title: 'Rapunzel',
        category: 'fairy tale',
        content: `Rapunzel was a beautiful girl with hair as long as a tower. A witch locked her in a tall tower with no doors, only a window at the top.

When the witch wanted to visit, she would call, "Rapunzel, Rapunzel, let down your hair!" and Rapunzel would let her long hair fall down so the witch could climb up.

One day, a prince heard Rapunzel singing. He watched as the witch climbed up, and the next day he called the same words.

Rapunzel let down her hair, and the prince climbed up. They fell in love and planned to escape.

But the witch found out and cut off Rapunzel's hair. She threw Rapunzel into the forest. When the prince came, the witch tricked him, and he fell from the tower, losing his sight.

But Rapunzel's tears of sorrow restored his sight. They found each other again and lived happily ever after.`,
        level: 'Age 5-9',
        duration: '6 minutes'
    },
    {
        title: 'Hansel and Gretel',
        category: 'fairy tale',
        content: `Hansel and Gretel were poor children whose stepmother made their father abandon them in the woods.

Hansel dropped breadcrumbs so they could find their way back. But birds ate the breadcrumbs, and the children got lost.

They found a house made of candy and gingerbread. An old woman lived there, but she was a witch who wanted to eat them.

The witch locked Hansel in a cage and made Gretel do all the work. But Gretel was clever. When the witch tried to cook Hansel, Gretel pushed her into the oven.

The children found treasure in the witch's house and took it home. Their father was overjoyed to see them, and their stepmother was gone forever. They lived happily together.`,
        level: 'Age 5-9',
        duration: '6 minutes'
    },
    // Castle Stories
    {
        title: 'The Little Princess of Buckingham Palace',
        category: 'castle',
        content: `In Buckingham Palace, there lived a little princess named Charlotte. She loved exploring the palace, from the grand ballrooms to the secret gardens.

One day, Charlotte found a hidden door behind a tapestry. It led to a dusty attic filled with old toys and forgotten treasures.

Among the treasures was a tiny silver key. "What does this open?" Charlotte wondered.

She asked the palace librarian, who told her the key opened a box that belonged to Queen Victoria. Inside was a letter that said: "The greatest treasure is kindness."

Charlotte thought about this. She decided to use her allowance to buy warm coats for the children who lived near the palace.

When her parents found out, they were very proud. "You've found the true meaning of the key," her father said.

From that day on, Charlotte made it her mission to help others, proving that the greatest treasure really is kindness.`,
        level: 'Age 4-7',
        duration: '5 minutes'
    },
    {
        title: 'The Brave Knight of Windsor Castle',
        category: 'castle',
        content: `At Windsor Castle, there lived a young squire named William who dreamed of becoming a knight. One day, the king announced a tournament to find the bravest knight in the land.

William practiced every day - sword fighting, horse riding, and learning the code of chivalry.

On the day of the tournament, William faced many challenges. But he showed not just skill, but kindness too. When another knight fell, William helped him up instead of defeating him.

The king noticed William's kindness. "True bravery is not just about fighting," he said. "It's about caring for others."

William was knighted that day, becoming Sir William, the kindest knight in the kingdom. He served the king honorably, always remembering that courage and kindness go hand in hand.`,
        level: 'Age 5-8',
        duration: '5 minutes'
    },
    // Dragon Stories
    {
        title: 'The Friendly Dragon of Wales',
        category: 'dragon',
        content: `In the mountains of Wales, there lived a dragon named Dewi. Unlike other dragons, Dewi was gentle and loved making friends.

One day, a village was threatened by a terrible storm. Dewi flew to the rescue, using his wings to blow the storm away from the village.

The villagers were grateful. They brought Dewi gifts of honey cakes and shiny stones. Dewi loved the honey cakes!

From that day on, Dewi became the village's protector. He would fly high above the mountains, watching for danger. And when the children wanted to play, he would give them rides on his back.

The villagers built a special cave for Dewi near the village, and he lived there happily, protecting his friends and enjoying honey cakes.`,
        level: 'Age 3-6',
        duration: '4 minutes'
    },
    {
        title: 'Saint George and the Dragon',
        category: 'dragon',
        content: `Long ago, in a faraway land, a fierce dragon terrorized a village. It demanded a sheep every day, and when the sheep ran out, the villagers had to give it a child.

One day, it was the princess's turn. But Saint George, a brave knight, heard about the dragon and rode to the rescue.

Saint George faced the dragon bravely. But instead of killing it right away, he offered the dragon a deal: if it stopped terrorizing the village, he would feed it every day.

The dragon agreed. Saint George kept his promise, and over time, the dragon became gentle. It even helped the villagers by carrying heavy loads and protecting their flocks.

The village lived in peace, and Saint George showed everyone that even the fiercest creatures can change with kindness.`,
        level: 'Age 5-8',
        duration: '5 minutes'
    },
    // Adventure Stories
    {
        title: 'The Treasure Hunt in the English Countryside',
        category: 'adventure',
        content: `In a small English village, three children - Emma, Jack, and Lily - found an old map in their grandmother's attic. It showed a treasure hidden somewhere in the countryside.

The children set off early one morning, following the map's clues. They crossed a rickety bridge, climbed a hill, and found a hidden path through the woods.

At last, they reached an ancient oak tree with a hollow trunk. Inside was a small chest filled with old coins, a silver locket, and a letter.

The letter said the treasure belonged to their great-grandfather, who wanted them to share it. The children decided to use the money to fix the village playground.

As they walked home, they felt proud. They hadn't just found treasure - they had found the joy of adventure and helping their community.`,
        level: 'Age 6-10',
        duration: '6 minutes'
    },
    {
        title: 'Swiss Alps Adventure',
        category: 'adventure',
        content: `Two siblings, Anna and Peter, went on a hiking trip in the Swiss Alps. They loved the snow-capped mountains and the fresh mountain air.

One day, they wandered off the trail and found a hidden valley with a crystal-clear lake. As they explored, they heard a faint bleating sound.

They found a lost baby goat stuck on a ledge. Peter carefully climbed down and rescued it. The goat's mother appeared, bleating happily.

But then the sky turned dark. A storm was coming! The children followed the goats, who led them to a sheltered cave.

When the storm passed, they found their way back to their parents. They learned that adventure isn't just about exploring - it's about helping others too.

And they made a new friend that day: the mother goat and her baby, who would always remember the kind children who helped them.`,
        level: 'Age 6-10',
        duration: '6 minutes'
    },
    // Funny Stories
    {
        title: 'The Friendly Ghost of Edinburgh Castle',
        category: 'funny',
        content: `In Edinburgh Castle, there lived a ghost named Angus. But Angus wasn't a scary ghost - he was the friendliest ghost you could ever meet!

Every night, Angus would float around the castle, making sure everything was in order. But he was also very curious about the living world.

One night, a little girl named Fiona stayed in the castle with her family. She couldn't sleep, so she wandered the halls.

"Hello?" she called. Angus popped out, but instead of being scary, he smiled. "Hello! I'm Angus. Would you like to see the castle?"

Fiona wasn't scared at all. Angus showed her all the secret passages and told her funny stories about the castle's history.

When morning came, Fiona said goodbye to Angus. "Will you be here tomorrow?" she asked.

Angus winked. "I'll always be here, watching over the castle - and making new friends!"

From that day on, Fiona visited Angus every time her family came to the castle. And Angus learned that being a ghost could be fun, especially when you have friends.`,
        level: 'Age 4-7',
        duration: '5 minutes'
    },
    {
        title: 'The Laughing Leprechaun',
        category: 'funny',
        content: `In Ireland, there lived a leprechaun named Seamus who loved to laugh. In fact, he laughed so much that his laughter could be heard for miles!

One day, Seamus found a pot of gold, but instead of hiding it, he decided to share it. He gave gold to all the children in the village.

But the village grump, Mr. O'Malley, wasn't happy. "Leprechauns shouldn't give away gold!" he grumbled.

Seamus just laughed. "Why not? Sharing makes everyone happy!"

Mr. O'Malley tried to be grumpy, but Seamus kept making him laugh with silly jokes and funny faces.

Eventually, Mr. O'Malley couldn't help but laugh too. "You're right, Seamus," he said. "Laughter is the best treasure of all."

From that day on, the whole village was filled with laughter, thanks to the laughing leprechaun who taught everyone that joy is better than gold.`,
        level: 'Age 3-6',
        duration: '4 minutes'
    },
    // More Adventure Stories
    {
        title: 'The Lost Treasure of Atlantis',
        category: 'adventure',
        content: `Deep beneath the ocean waves, there lies the legendary city of Atlantis. Two young explorers, Alex and Zoe, decided to find it.

They built a special submarine and dove into the deep sea. After days of searching, they found it - a beautiful city made of crystal and gold.

But the city was guarded by a friendly sea dragon named Nautilus. "Only those who come in peace may enter," he said.

Alex and Zoe promised to respect the city. The dragon led them to the treasure room, filled with ancient artifacts and sparkling jewels.

But instead of taking the treasure, they took only a small crystal as a reminder. "The real treasure is the knowledge we've gained," Zoe said.

As they left, Nautilus smiled. "You have shown wisdom beyond your years," he said. "May your adventures always be filled with wonder."`,
        level: 'Age 7-10',
        duration: '7 minutes'
    },
    {
        title: 'The Secret of the Pyramids',
        category: 'adventure',
        content: `In the hot desert sands of Egypt, two siblings, Maya and Amir, discovered a hidden entrance to an ancient pyramid.

Inside, they found hieroglyphics telling the story of a great pharaoh. As they explored, they found a secret chamber with a golden sarcophagus.

But when Amir touched the sarcophagus, the pyramid began to shake! They ran through dark corridors, solving puzzles to escape.

Finally, they reached the entrance just as the pyramid sealed itself. Outside, the sun was setting, painting the desert in beautiful colors.

Maya smiled. "We didn't find gold," she said, "but we found an amazing adventure." Amir nodded. "And a story to tell forever."`,
        level: 'Age 7-10',
        duration: '7 minutes'
    },
    {
        title: 'Journey to the Center of the Earth',
        category: 'adventure',
        content: `Professor Lander and his daughter, Emma, found an ancient map showing a path to the center of the Earth.

They descended into a deep cave, where they discovered a world of glowing crystals and strange creatures. They met friendly mole people who lived underground.

The mole people showed them a magnificent underground ocean and crystal forests. Emma was amazed by the beauty.

But when a volcano began to erupt, they had to leave quickly. The mole people gave them a crystal as a gift.

Back on the surface, Emma held the crystal. "The Earth is full of wonders," she said. "We just have to look for them."`,
        level: 'Age 8-11',
        duration: '8 minutes'
    },
    // More Bedtime Stories
    {
        title: 'The Starry Night Adventure',
        category: 'bedtime',
        content: `Little Mia loved looking at the stars. One night, a shooting star landed in her backyard.

"Hello," said the star. "I'm Stella. Would you like to visit the stars?" Mia nodded excitedly.

Stella carried Mia into space, where they visited the moon, Mars, and even a comet. They met friendly aliens who lived on a distant planet.

As dawn approached, Stella said, "It's time to go home." Mia hugged Stella. "Thank you for the best night ever!"

When Mia woke up, she found a tiny star-shaped crystal on her pillow. She knew her adventure was real.

Every night, Mia looks at the stars and smiles, remembering her magical journey.`,
        level: 'Age 4-7',
        duration: '5 minutes'
    },
    {
        title: 'The Little Mermaid of the Mediterranean',
        category: 'bedtime',
        content: `In the warm waters of the Mediterranean, there lived a little mermaid named Marina. She loved collecting seashells and singing songs.

One day, Marina found a little boy named Luca who had fallen into the water. She saved him and brought him to shore.

Luca was grateful. "Thank you," he said. "You're my hero!" Marina blushed. "I just did what was right."

From that day on, Marina and Luca became friends. He would visit the shore every day, and she would bring him treasures from the sea.

As the years passed, Marina realized that true friendship is the most precious treasure of all. And every night, she sings songs of their adventures under the moonlight.`,
        level: 'Age 5-8',
        duration: '6 minutes'
    },
    {
        title: 'The Magic Christmas Tree',
        category: 'bedtime',
        content: `On Christmas Eve, a little girl named Clara found a tiny Christmas tree in the forest. It was only as tall as her hand!

"Hello," said the tree. "I'm a magic tree. Make a wish, and I'll grant it."

Clara thought for a moment. "I wish all the children in the world could be happy on Christmas."

The tree glowed brightly. "Your wish is kind. I'll make it come true."

That night, presents appeared under every Christmas tree in the world. Clara watched as children opened their gifts and laughed with joy.

The magic tree smiled. "Kindness is the most magical gift of all," it said. And Clara knew that Christmas is about love, not presents.`,
        level: 'Age 4-7',
        duration: '5 minutes'
    },
    // More Fairy Tales
    {
        title: 'Beauty and the Beast',
        category: 'fairy tale',
        content: `A kind girl named Belle lived with her father. One day, her father got lost in the woods and found a magical castle.

The castle belonged to a Beast, who was actually a prince under a spell. The Beast let the father go, but only if Belle came to live with him.

Belle agreed. At first, she was afraid of the Beast. But as she got to know him, she saw that he was kind and gentle.

One night, Belle dreamed that the Beast was dying. She rushed to him and said, "I love you!"

The spell was broken! The Beast turned back into a prince. Belle and the prince fell in love and lived happily ever after.`,
        level: 'Age 5-9',
        duration: '6 minutes'
    },
    {
        title: 'Rumpelstiltskin',
        category: 'fairy tale',
        content: `A miller lied to the king, saying his daughter could spin straw into gold. The king locked the girl in a tower and told her to spin straw into gold by morning.

Just as she was crying, a little man appeared. "I'll spin the straw into gold," he said, "if you give me your necklace." The girl agreed.

The next day, the king wanted more gold. The little man spun more straw into gold, and the girl gave him her ring.

On the third day, the king said if she spun more gold, she would be queen. But the girl had nothing left to give.

The little man said, "Promise me your first child." Desperate, the girl agreed.

When she had a baby, the little man came to take it. But he said if she guessed his name in three days, she could keep the baby.

After searching the kingdom, the girl heard a little man singing, "Rumpelstiltskin! That's my name!"

When the little man came, she said, "Your name is Rumpelstiltskin!" He was so angry that he stamped his foot and disappeared forever.`,
        level: 'Age 6-10',
        duration: '7 minutes'
    },
    {
        title: 'The Ugly Duckling',
        category: 'fairy tale',
        content: `A mother duck hatched her eggs, but one egg was much bigger than the others. When it hatched, the duckling was gray and ugly.

The other ducklings made fun of him. "You're ugly!" they said. Even his mother didn't want him.

The ugly duckling ran away. He wandered through the cold winter, lonely and sad.

Then spring came. The duckling saw beautiful swans swimming in a pond. He was sad because he knew he could never be so beautiful.

But when he looked at his reflection in the water, he saw that he was a swan too! The other swans welcomed him.

The ugly duckling realized that he had been a swan all along. And he lived happily with his new family.`,
        level: 'Age 4-8',
        duration: '6 minutes'
    },
    // More Dragon Stories
    {
        title: 'The Dragon and the Princess',
        category: 'dragon',
        content: `In a faraway kingdom, a princess named Lila befriended a baby dragon she found in the woods. She named him Spark.

As Spark grew, he became the princess's best friend. They played together, explored the forest, and told each other secrets.

One day, a fire-breathing dragon attacked the kingdom. The king sent his knights to fight it, but they were no match.

Lila knew what she had to do. She went to face the dragon with Spark by her side.

"Please don't hurt us," Lila said to the dragon. "We just want peace." The dragon looked at her and Spark, and his angry eyes softened.

The dragon explained that he was lonely and wanted a friend. Lila smiled. "You can be our friend too!"

From that day on, the kingdom had two dragons protecting it - Spark and his new friend. And Lila learned that kindness can turn enemies into friends.`,
        level: 'Age 5-8',
        duration: '6 minutes'
    },
    {
        title: 'The Dragon\'s Treasure',
        category: 'dragon',
        content: `A brave knight named Sir Gareth went to find a dragon's treasure. He found the dragon sleeping on a pile of gold.

But when the dragon woke up, he didn't roar or attack. "What do you want?" he asked calmly.

Sir Gareth was surprised. "I came to take your treasure," he said.

The dragon laughed. "Take it! It's just gold. But tell me - what will you do with it?"

Sir Gareth thought. "I'll give it to the poor people in my village."

The dragon nodded. "Then you may take as much as you need. But remember - true treasure is not gold, but helping others."

Sir Gareth thanked the dragon and took only what he needed. And he always remembered the dragon's wise words.`,
        level: 'Age 6-9',
        duration: '6 minutes'
    },
    // More Castle Stories
    {
        title: 'The Ghost of Château de Chambord',
        category: 'castle',
        content: `In France, there stands a beautiful castle called Château de Chambord. One night, a young boy named Pierre decided to explore it.

As he wandered the halls, he heard soft music coming from the tower. He climbed the stairs and found a ghost playing the violin.

"Who are you?" Pierre asked. The ghost smiled. "I'm Henri, a musician who lived here long ago. I play for anyone who will listen."

Pierre listened as Henri played a beautiful melody. "That was wonderful," he said. "Will you teach me?"

Henri nodded. For weeks, Pierre visited the castle every night to learn music from the ghost.

When Pierre's mother found out, she said, "You've been learning from a ghost?" Pierre smiled. "He's not scary - he's my friend."

And to this day, if you visit Château de Chambord on a quiet night, you might hear the ghost's violin playing.`,
        level: 'Age 6-9',
        duration: '6 minutes'
    },
    {
        title: 'The Castle of Dreams',
        category: 'castle',
        content: `In Scotland, there's a castle that appears only in dreams. A little girl named Fiona dreamed of it every night.

One night, the castle's gates opened, and a knight invited her in. "Welcome to Castle Lunan," he said.

Inside, Fiona met princesses, knights, and even a friendly dragon. They played games, danced, and told stories.

As dawn approached, the knight said, "You must leave now. But you can return anytime you dream."

When Fiona woke up, she found a tiny silver key on her pillow. "It's real!" she whispered.

From that night on, Fiona visited Castle Lunan whenever she dreamed. And she knew that the magic of the castle would always be with her.`,
        level: 'Age 4-7',
        duration: '5 minutes'
    },
    // More Funny Stories
    {
        title: 'The Squirrel Who Wanted to Fly',
        category: 'funny',
        content: `A little squirrel named Sammy watched birds flying and wished he could fly too.

"I'll build wings!" he said. He collected feathers and made a pair of wings. Then he climbed to the top of a tree.

"Here I go!" he said, jumping off. But instead of flying, he fell into a bush!

A bird saw him and laughed. "Squirrels don't fly - we jump!" she said.

Sammy felt silly. But then he realized - jumping was fun too! He practiced jumping from tree to tree, and soon he was the best jumper in the forest.

And whenever he sees birds flying, he smiles and thinks, "Jumping is my superpower!"`,
        level: 'Age 3-6',
        duration: '4 minutes'
    },
    {
        title: 'The Cat Who Thought He Was a Dog',
        category: 'funny',
        content: `A little kitten named Whiskers grew up with puppies. He thought he was a dog!

He barked like a dog, chased sticks like a dog, and even tried to dig holes like a dog.

One day, a mouse ran by. Whiskers chased it - and caught it! The puppies were amazed. "Wow! We can't do that!"

Whiskers realized he was different from the puppies. But that was okay - he was special!

From that day on, Whiskers was proud to be a cat. But he still loved playing with his dog friends.

And whenever the puppies want to catch a mouse, they call Whiskers - their cat friend who used to think he was a dog!`,
        level: 'Age 3-6',
        duration: '4 minutes'
    },
    {
        title: 'The Penguin Who Hated Cold',
        category: 'funny',
        content: `In Antarctica, there lived a penguin named Percy who hated the cold.

"I wish it was warmer here!" he said. So he packed a suitcase and went to find a warm place.

He tried the desert, but it was too hot. He tried the jungle, but it was too rainy. He tried the beach, but the sand got in his feathers.

Finally, Percy returned to Antarctica. "Home is the best place after all," he said.

But he still didn't like the cold. So he made himself a cozy sweater out of wool. Now he's the warmest penguin in Antarctica!`,
        level: 'Age 4-7',
        duration: '5 minutes'
    }
];

// ==================== STORY TITLES (for backward compatibility) ====================
const storyTitlesData = fullStoriesData.map(story => ({
    title: story.title,
    category: story.category
}));

// ==================== SONGS LIST ====================
const songsListData = [
    {
        title: 'Twinkle Twinkle Little Star',
        lyrics: 'Twinkle, twinkle, little star, How I wonder what you are! Up above the world so high, Like a diamond in the sky. Twinkle, twinkle, little star, How I wonder what you are!'
    },
    {
        title: 'London Bridge Is Falling Down',
        lyrics: 'London Bridge is falling down, Falling down, falling down. London Bridge is falling down, My fair lady!'
    },
    {
        title: 'Frère Jacques',
        lyrics: 'Frère Jacques, Frère Jacques, Dormez-vous? Dormez-vous? Sonnez les matines! Sonnez les matines! Ding, dang, dong. Ding, dang, dong.'
    },
    {
        title: 'Ode to Joy',
        lyrics: 'Joy, beautiful spark of divinity, Daughter from Elysium, We enter, fire-drunk, Heavenly one, your sanctuary! Your magic binds again What custom strictly divided.'
    },
    {
        title: 'Edelweiss',
        lyrics: 'Edelweiss, Edelweiss, Every morning you greet me. Small and white, clean and bright, You look happy to meet me. Blossom of snow may you bloom and grow, Bloom and grow forever. Edelweiss, Edelweiss, Bless my homeland forever.'
    },
    {
        title: 'Scarborough Fair',
        lyrics: 'Are you going to Scarborough Fair? Parsley, sage, rosemary and thyme. Remember me to one who lives there, She once was a true love of mine.'
    },
    {
        title: 'Auld Lang Syne',
        lyrics: 'Should auld acquaintance be forgot, And never brought to mind? Should auld acquaintance be forgot, And auld lang syne?'
    },
    {
        title: 'Alouette',
        lyrics: 'Alouette, gentille alouette, Alouette, je te plumerai. Je te plumerai la tête, Je te plumerai la tête, Et la tête! Alouette! O-o-o!'
    },
    {
        title: 'Silent Night',
        lyrics: 'Silent night, holy night! All is calm, all is bright. Round yon Virgin, Mother and Child. Holy infant so tender and mild.'
    },
    {
        title: 'Jingle Bells',
        lyrics: 'Jingle bells, jingle bells, Jingle all the way! Oh what fun it is to ride In a one-horse open sleigh!'
    },
    {
        title: 'Mary Had a Little Lamb',
        lyrics: 'Mary had a little lamb, Little lamb, little lamb. Mary had a little lamb, Its fleece was white as snow.'
    },
    {
        title: 'Row Row Row Your Boat',
        lyrics: 'Row, row, row your boat, Gently down the stream. Merrily, merrily, merrily, merrily, Life is but a dream.'
    },
    {
        title: 'Humpty Dumpty',
        lyrics: 'Humpty Dumpty sat on a wall, Humpty Dumpty had a great fall. All the king\'s horses and all the king\'s men Couldn\'t put Humpty together again.'
    },
    {
        title: 'Old MacDonald',
        lyrics: 'Old MacDonald had a farm, E-I-E-I-O! And on that farm he had a cow, E-I-E-I-O! With a moo-moo here and a moo-moo there, Here a moo, there a moo, Everywhere a moo-moo!'
    },
    {
        title: 'Head, Shoulders, Knees and Toes',
        lyrics: 'Head, shoulders, knees and toes, Knees and toes. Head, shoulders, knees and toes, Knees and toes. And eyes and ears and mouth and nose! Head, shoulders, knees and toes, Knees and toes.'
    },
    {
        title: 'The Wheels on the Bus',
        lyrics: 'The wheels on the bus go round and round, Round and round, round and round. The wheels on the bus go round and round, All through the town.'
    },
    {
        title: 'Itsy Bitsy Spider',
        lyrics: 'The itsy bitsy spider climbed up the water spout. Down came the rain and washed the spider out. Out came the sun and dried up all the rain, And the itsy bitsy spider climbed up the spout again.'
    },
    {
        title: 'Baa Baa Black Sheep',
        lyrics: 'Baa, baa, black sheep, Have you any wool? Yes, sir, yes, sir, Three bags full! One for the master, One for the dame, And one for the little boy Who lives down the lane.'
    },
    {
        title: 'Twinkle Twinkle Little Star (German)',
        lyrics: 'Sternlein leucht, wie so klein, hoch am Himmel blühn. Wie ein Diamant so hell, scheint\'s in der Nacht so hell. Sternlein leucht, wie so klein, hoch am Himmel blühn.'
    },
    {
        title: 'Frère Jacques (English)',
        lyrics: 'Brother John, Brother John, Are you sleeping? Are you sleeping? Morning bells are ringing! Morning bells are ringing! Ding, dang, dong. Ding, dang, dong.'
    },
    // More songs added
    {
        title: 'Happy Birthday',
        lyrics: 'Happy birthday to you, Happy birthday to you, Happy birthday dear [Name], Happy birthday to you!'
    },
    {
        title: 'ABC Song',
        lyrics: 'A B C D E F G, H I J K L M N O P, Q R S, T U V, W X Y and Z. Now I know my ABCs, Next time won\'t you sing with me?'
    },
    {
        title: 'Five Little Ducks',
        lyrics: 'Five little ducks went out one day, Over the hills and far away. Mother duck said "Quack, quack, quack, quack!" But only four little ducks came back.'
    },
    {
        title: 'The Itsy Bitsy Spider (Continued)',
        lyrics: 'The itsy bitsy spider climbed up the water spout. Down came the rain and washed the spider out. Out came the sun and dried up all the rain, And the itsy bitsy spider climbed up the spout again.'
    },
    {
        title: 'Hickory Dickory Dock',
        lyrics: 'Hickory dickory dock, The mouse ran up the clock. The clock struck one, The mouse ran down, Hickory dickory dock.'
    },
    {
        title: 'Little Bo Peep',
        lyrics: 'Little Bo Peep has lost her sheep, And doesn\'t know where to find them. Leave them alone and they\'ll come home, Wagging their tails behind them.'
    },
    {
        title: 'Jack and Jill',
        lyrics: 'Jack and Jill went up the hill, To fetch a pail of water. Jack fell down and broke his crown, And Jill came tumbling after.'
    },
    {
        title: 'Little Miss Muffet',
        lyrics: 'Little Miss Muffet sat on a tuffet, Eating her curds and whey. Along came a spider who sat down beside her, And frightened Miss Muffet away.'
    },
    {
        title: 'Three Blind Mice',
        lyrics: 'Three blind mice, three blind mice, See how they run! See how they run! They all ran after the farmer\'s wife, Who cut off their tails with a carving knife. Did you ever see such a sight in your life, As three blind mice?'
    },
    {
        title: 'Simple Simon',
        lyrics: 'Simple Simon met a pieman, Going to the fair. Said Simple Simon to the pieman, "Let me taste your ware."'
    },
    {
        title: 'Yankee Doodle',
        lyrics: 'Yankee Doodle went to town, A-riding on a pony. Stuck a feather in his cap, And called it macaroni.'
    },
    {
        title: 'Pop Goes the Weasel',
        lyrics: 'Half a pound of tuppenny rice, Half a pound of treacle. That\'s the way the money goes, Pop goes the weasel.'
    },
    {
        title: 'Ring Around the Rosie',
        lyrics: 'Ring around the rosie, A pocket full of posies. Ashes, ashes, We all fall down!'
    },
    {
        title: 'Here We Go Round the Mulberry Bush',
        lyrics: 'Here we go round the mulberry bush, The mulberry bush, the mulberry bush. Here we go round the mulberry bush, On a cold and frosty morning.'
    },
    {
        title: 'If You\'re Happy and You Know It',
        lyrics: 'If you\'re happy and you know it clap your hands! If you\'re happy and you know it clap your hands! If you\'re happy and you know it, then your face will surely show it. If you\'re happy and you know it clap your hands!'
    },
    {
        title: 'The Farmer in the Dell',
        lyrics: 'The farmer in the dell, The farmer in the dell. Hi-ho, the derry-o, The farmer in the dell.'
    },
    {
        title: 'Oh Susanna',
        lyrics: 'Oh, I come from Alabama with my banjo on my knee. I\'m going to Louisiana, my true love for to see.'
    },
    {
        title: 'She\'ll Be Coming \'Round the Mountain',
        lyrics: 'She\'ll be coming \'round the mountain when she comes. She\'ll be coming \'round the mountain when she comes. She\'ll be coming \'round the mountain, She\'ll be coming \'round the mountain, She\'ll be coming \'round the mountain when she comes.'
    },
    {
        title: 'Michael Row the Boat Ashore',
        lyrics: 'Michael row the boat ashore, Hallelujah! Michael row the boat ashore, Hallelujah!'
    },
    {
        title: 'Amazing Grace',
        lyrics: 'Amazing grace, how sweet the sound, That saved a wretch like me! I once was lost, but now am found, Was blind, but now I see.'
    },
    {
        title: 'Joy to the World',
        lyrics: 'Joy to the world, the Lord is come! Let earth receive her King. Let every heart prepare Him room, And heaven and nature sing.'
    },
    {
        title: 'Deck the Halls',
        lyrics: 'Deck the halls with boughs of holly, Fa la la la la, la la la la. \'Tis the season to be jolly, Fa la la la la, la la la la.'
    },
    {
        title: 'We Wish You a Merry Christmas',
        lyrics: 'We wish you a Merry Christmas, We wish you a Merry Christmas, We wish you a Merry Christmas and a Happy New Year!'
    },
    {
        title: 'Rudolph the Red-Nosed Reindeer',
        lyrics: 'Rudolph the red-nosed reindeer, Had a very shiny nose. And if you ever saw it, You would even say it glows.'
    },
    {
        title: 'Feliz Navidad',
        lyrics: 'Feliz Navidad, Feliz Navidad, Feliz Navidad, Prospero Año y Felicidad.'
    },
    {
        title: 'Jingle Bell Rock',
        lyrics: 'Jingle bell, jingle bell, jingle bell rock. Jingle bells swing and jingle bells ring. Snowing and blowing up bushels of fun. Now the jingle hop has begun.'
    },
    {
        title: 'Silver Bells',
        lyrics: 'Silver bells, silver bells, It\'s Christmas time in the city. Ring-a-ling, hear them ring, Soon it will be Christmas day.'
    },
    {
        title: 'White Christmas',
        lyrics: 'I\'m dreaming of a white Christmas, Just like the ones I used to know. Where the treetops glisten, And children listen To hear sleigh bells in the snow.'
    },
    {
        title: 'Frosty the Snowman',
        lyrics: 'Frosty the Snowman was a jolly happy soul, With a corn cob pipe and a button nose, And two eyes made out of coal.'
    },
    {
        title: 'Winter Wonderland',
        lyrics: 'Sleigh bells ring, are you listening, In the lane, snow is glistening. A beautiful sight, We\'re happy tonight, Walking in a winter wonderland.'
    },
    {
        title: 'Away in a Manger',
        lyrics: 'Away in a manger, no crib for a bed. The little Lord Jesus laid down his sweet head.'
    },
    {
        title: 'Hark the Herald Angels Sing',
        lyrics: 'Hark the herald angels sing, Glory to the newborn King!'
    },
    {
        title: 'O Come All Ye Faithful',
        lyrics: 'O come all ye faithful, joyful and triumphant. O come ye, O come ye to Bethlehem. Come and behold Him, Born the King of Angels.'
    },
    {
        title: 'Silent Night (German)',
        lyrics: 'Stille Nacht, heilige Nacht, Alles schläft; einsam wacht. Nur das traute hochheilige Paar. Holder Knabe im lockigen Haar.'
    },
    {
        title: 'Ode to Joy (German)',
        lyrics: 'Freude, schöner Götterfunken, Tochter aus Elysium! Wir betreten feuertrunken, Himmlische, dein Heiligtum!'
    },
    {
        title: 'La Cucaracha',
        lyrics: 'La cucaracha, la cucaracha, Ya no puede caminar. Porque no tiene, porque le faltan, Las dos patas de atras.'
    },
    {
        title: 'Cielito Lindo',
        lyrics: 'Cielito lindo, de mi amor, Cielito lindo, de mi corazón. Ay, ay, ay, ay, Canta y no llores.'
    },
    {
        title: 'Guantanamera',
        lyrics: 'Guantanamera, guajira guantanamera. Guantanamera, guajira guantanamera. Yo soy un hombre sincero, De donde crece la palma.'
    },
    {
        title: 'Volare',
        lyrics: 'Volare, oh-oh! Cantare, oh-oh-oh-oh! Let\'s fly way up to the clouds, Away from the maddening crowds.'
    },
    {
        title: 'Santa Lucia',
        lyrics: 'Santa Lucia, Santa Lucia! The moon is bright, The stars are shining, Santa Lucia!'
    },
    {
        title: 'Arirang',
        lyrics: 'Arirang, arirang, arariyo! Arirang gogaero neomeoganda. Nareul beorigo gannineun neo, Sipeo sipeo jeongmal sipeo.'
    },
    {
        title: 'Sakura',
        lyrics: 'Sakura, sakura, ya yo sakura. Mi wa yama ni saku sakura. Kasumi ka ni ni wa saku, Yo no naka ni.'
    },
    {
        title: 'Oh! Susanna (German)',
        lyrics: 'Oh Susanna, oh don\'t you cry for me. I come from Alabama, With my banjo on my knee.'
    },
    {
        title: 'My Bonnie Lies Over the Ocean',
        lyrics: 'My Bonnie lies over the ocean, My Bonnie lies over the sea. My Bonnie lies over the ocean, Oh bring back my Bonnie to me.'
    },
    {
        title: 'Over the Rainbow',
        lyrics: 'Somewhere over the rainbow, Way up high. There\'s a land that I heard of, Once in a lullaby.'
    },
    {
        title: 'When You Wish Upon a Star',
        lyrics: 'When you wish upon a star, Makes no difference who you are. Anything your heart desires, Will come to you.'
    },
    {
        title: 'Zip-a-Dee-Doo-Dah',
        lyrics: 'Zip-a-dee-doo-dah, zip-a-dee-ay. My, oh my, what a wonderful day! Plenty of sunshine heading my way. Zip-a-dee-doo-dah, zip-a-dee-ay!'
    },
    {
        title: 'Supercalifragilisticexpialidocious',
        lyrics: 'Supercalifragilisticexpialidocious! Even though the sound of it is something quite atrocious. If you say it loud enough, you\'ll always sound precocious. Supercalifragilisticexpialidocious!'
    },
    {
        title: 'Let It Go',
        lyrics: 'Let it go, let it go. Can\'t hold it back anymore. Let it go, let it go. Turn away and slam the door!'
    },
    {
        title: 'Do Re Mi',
        lyrics: 'Doe, a deer, a female deer. Ray, a drop of golden sun. Me, a name I call myself. Far, a long, long way to run.'
    },
    {
        title: 'Edelweiss (German)',
        lyrics: 'Edelweiß, Edelweiß, Du grüßt mich jeden Morgen. Klein und weiß, rein und weiß, Du glüchlich siehst mich an.'
    },
    {
        title: 'O Sole Mio',
        lyrics: "'O sole mio! Sta 'nfronte a te! 'O sole mio! Sta 'nfronte a te! Quanno fa notte e 'o sole se ne va, Me vene quase a morir!"
    },
    {
        title: 'Torna a Surriento',
        lyrics: 'Torna a Surriento, fammi sentire. La tua voce, che mi piaci tanto. Torna a Surriento, che senza te. Non posso vivere.'
    },
    {
        title: 'La Vie En Rose',
        lyrics: 'Des yeux qui font baisser les miens. Un rire qui se perd sur sa bouche. Voilà le portrait sans retouche. De l\'homme auquel j\'appartiens.'
    },
    {
        title: 'Frère Jacques (French)',
        lyrics: 'Frère Jacques, Frère Jacques, Dormez-vous? Dormez-vous? Sonnez les matines! Sonnez les matines! Ding, dang, dong. Ding, dang, dong.'
    },
    {
        title: 'Sur le pont d\'Avignon',
        lyrics: 'Sur le pont d\'Avignon, L\'on y danse, l\'on y danse. Sur le pont d\'Avignon, L\'on y danse tous en rond.'
    },
    {
        title: 'Alouette (French)',
        lyrics: 'Alouette, gentille alouette, Alouette, je te plumerai. Je te plumerai la tête, Je te plumerai la tête, Et la tête! Alouette! O-o-o!'
    },
    {
        title: 'Frère Jacques (German)',
        lyrics: 'Bruder Jakob, Bruder Jakob, Schlafst du noch? Schlafst du noch? Kling die Glocken! Kling die Glocken! Ding, dang, dong. Ding, dang, dong.'
    },
    {
        title: 'Hänschen klein',
        lyrics: 'Hänschen klein ging allein, In den Wald hinein. Und das war die Abschiedsstunde, Weinte bitter Tränen.'
    },
    {
        title: 'Morgen kommt der Weihnachtsmann',
        lyrics: 'Morgen kommt der Weihnachtsmann, Mit seinem Sack voll Guts. Er kommt zu euch ins Haus, Bringt euch vielerlei Spaß.'
    },
    {
        title: 'O Tannenbaum',
        lyrics: 'O Tannenbaum, o Tannenbaum, Wie treu sind deine Blätter! Du grünst nicht nur zur Sommerzeit, Sondern auch im Winter, wenn es schneit.'
    },
    {
        title: 'Weihnachtslied',
        lyrics: 'Stille Nacht, heilige Nacht, Alles schläft; einsam wacht. Nur das traute hochheilige Paar. Holder Knabe im lockigen Haar.'
    },
    {
        title: 'Jingle Bells (German)',
        lyrics: 'Jingle bells, jingle bells, Jingle all the way! Oh what fun it is to ride In a one-horse open sleigh!'
    },
    {
        title: 'Silent Night (English)',
        lyrics: 'Silent night, holy night! All is calm, all is bright. Round yon Virgin, Mother and Child. Holy infant so tender and mild.'
    },
    {
        title: 'Away in a Manger (German)',
        lyrics: 'In der Krippe liegend, Da liegt das Kindlein. Es schläft so süß und still, In seiner Wiege.'
    },
    {
        title: 'Joy to the World (German)',
        lyrics: 'Freude überm Erden! Der Herr ist kommen! Erscheinen lassen wir den König. Sei bereit, ihr Herzen!'
    },
    {
        title: 'Deck the Halls (German)',
        lyrics: 'Schmücke die Hallen mit Tannenzweigen! Fa la la la la, la la la la. Die Weihnachtszeit ist da! Fa la la la la, la la la la.'
    },
    {
        title: 'We Wish You a Merry Christmas (German)',
        lyrics: 'Wir wünschen dir frohe Weihnachten, Wir wünschen dir frohe Weihnachten, Wir wünschen dir frohe Weihnachten und ein glückliches neues Jahr!'
    },
    {
        title: 'Rudolph the Red-Nosed Reindeer (German)',
        lyrics: 'Rudolph mit der roten Nase, Hat eine sehr leuchtende Nase. Und wenn man sie einmal sieht, Man sagt sie glüht wie ein Licht.'
    },
    {
        title: 'Feliz Navidad (Spanish)',
        lyrics: 'Feliz Navidad, Feliz Navidad, Feliz Navidad, Prospero Año y Felicidad.'
    },
    {
        title: 'Jingle Bell Rock (Spanish)',
        lyrics: 'Jingle Bell, Jingle Bell, Jingle Bell Rock. Jingle Bells swing and Jingle Bells ring. Snowing and blowing up bushels of fun. Now the Jingle hop has begun.'
    },
    {
        title: 'Silver Bells (Spanish)',
        lyrics: 'Silver Bells, Silver Bells, Es Navidad en la ciudad. Ring-a-ling, escucha el sonido, Pronto será día de Navidad.'
    },
    {
        title: 'White Christmas (Spanish)',
        lyrics: 'Soñando con una Navidad blanca, Como las que solía conocer. Donde los árboles brillan, Y los niños escuchan Los cascabeles en la nieve.'
    },
    {
        title: 'Frosty the Snowman (Spanish)',
        lyrics: 'Frosty el muñeco de nieve, Era un alma alegre y feliz. Con un pipa de maíz y una nariz de botón, Y dos ojos hechos de carbón.'
    },
    {
        title: 'Winter Wonderland (Spanish)',
        lyrics: 'Campanas de trineo, ¿estás escuchando? En el camino, la nieve brilla. Una vista hermosa, Estamos felices esta noche, Caminando en un paraíso de invierno.'
    }
];

// ==================== GEOMETRY SHAPES ====================
const geometryShapesData = {
    '2D': [
        { name: 'Circle', sides: 0, vertices: 0, symmetry: 'infinite', description: 'A round shape with no corners', area: 'πr²', perimeter: '2πr' },
        { name: 'Square', sides: 4, vertices: 4, symmetry: 4, description: 'Four equal sides, all angles 90°', area: 's²', perimeter: '4s' },
        { name: 'Rectangle', sides: 4, vertices: 4, symmetry: 2, description: 'Opposite sides equal, all angles 90°', area: 'l×w', perimeter: '2(l+w)' },
        { name: 'Triangle', sides: 3, vertices: 3, symmetry: 3, description: 'Three sides, three angles', area: '½bh', perimeter: 'a+b+c' },
        { name: 'Equilateral Triangle', sides: 3, vertices: 3, symmetry: 3, description: 'Three equal sides, all angles 60°', area: '(√3/4)s²', perimeter: '3s' },
        { name: 'Isosceles Triangle', sides: 3, vertices: 3, symmetry: 1, description: 'Two equal sides', area: '½bh', perimeter: '2a+b' },
        { name: 'Right Triangle', sides: 3, vertices: 3, symmetry: 1, description: 'One 90° angle', area: '½ab', perimeter: 'a+b+c' },
        { name: 'Pentagon', sides: 5, vertices: 5, symmetry: 5, description: 'Five sides', area: '(5/2)sa', perimeter: '5s' },
        { name: 'Hexagon', sides: 6, vertices: 6, symmetry: 6, description: 'Six sides', area: '(3√3/2)s²', perimeter: '6s' },
        { name: 'Octagon', sides: 8, vertices: 8, symmetry: 8, description: 'Eight sides', area: '2(1+√2)s²', perimeter: '8s' },
        { name: 'Trapezoid', sides: 4, vertices: 4, symmetry: 1, description: 'At least one pair of parallel sides', area: '½(a+b)h', perimeter: 'a+b+c+d' },
        { name: 'Rhombus', sides: 4, vertices: 4, symmetry: 2, description: 'Four equal sides', area: 'd1×d2/2', perimeter: '4s' },
        { name: 'Parallelogram', sides: 4, vertices: 4, symmetry: 2, description: 'Opposite sides parallel', area: 'b×h', perimeter: '2(a+b)' },
        { name: 'Kite', sides: 4, vertices: 4, symmetry: 1, description: 'Two pairs of adjacent sides equal', area: 'd1×d2/2', perimeter: '2(a+b)' },
        { name: 'Star', sides: 10, vertices: 5, symmetry: 5, description: 'Five-pointed star', area: '(5/2)×side×distance' },
        { name: 'Oval', sides: 0, vertices: 0, symmetry: 2, description: 'Elongated circle', area: 'πab' }
    ],
    '3D': [
        { name: 'Cube', vertices: 8, edges: 12, faces: 6, description: 'Six square faces', volume: 's³', surfaceArea: '6s²' },
        { name: 'Sphere', vertices: 0, edges: 0, faces: 1, description: 'Round 3D shape', volume: '(4/3)πr³', surfaceArea: '4πr²' },
        { name: 'Cylinder', vertices: 0, edges: 2, faces: 3, description: 'Two circular bases', volume: 'πr²h', surfaceArea: '2πr(r+h)' },
        { name: 'Cone', vertices: 1, edges: 1, faces: 2, description: 'Circular base tapering to a point', volume: '(1/3)πr²h', surfaceArea: 'πr(r+l)' },
        { name: 'Pyramid', vertices: 5, edges: 8, faces: 5, description: 'Square base with triangular sides', volume: '(1/3)Bh', surfaceArea: 'B + ½Pl' },
        { name: 'Rectangular Prism', vertices: 8, edges: 12, faces: 6, description: 'Six rectangular faces', volume: 'l×w×h', surfaceArea: '2(lw+lh+wh)' },
        { name: 'Triangular Prism', vertices: 6, edges: 9, faces: 5, description: 'Two triangular bases', volume: '½×b×h×l', surfaceArea: 'Perimeter×l + 2×Base' },
        { name: 'Tetrahedron', vertices: 4, edges: 6, faces: 4, description: 'Four triangular faces', volume: '(√2/12)s³', surfaceArea: '√3s²' },
        { name: 'Octahedron', vertices: 6, edges: 12, faces: 8, description: 'Eight triangular faces', volume: '(√2/3)s³', surfaceArea: '2√3s²' },
        { name: 'Dodecahedron', vertices: 20, edges: 30, faces: 12, description: 'Twelve pentagonal faces', volume: '(15+7√5)/4 s³', surfaceArea: '3√25+10√5 s²' },
        { name: 'Icosahedron', vertices: 12, edges: 30, faces: 20, description: 'Twenty triangular faces', volume: '(5(3+√5)/12)s³', surfaceArea: '5√3s²' },
        { name: 'Hemisphere', vertices: 0, edges: 1, faces: 2, description: 'Half of a sphere', volume: '(2/3)πr³', surfaceArea: '3πr²' },
        { name: 'Torus', vertices: 0, edges: 0, faces: 1, description: 'Donut shape', volume: '2π²Rr²', surfaceArea: '4π²Rr' }
    ]
};

// ==================== MEASUREMENT UNITS ====================
const measurementUnitsData = {
    length: [
        { name: 'Millimeter', symbol: 'mm', description: 'Very small length', example: 'A grain of sand' },
        { name: 'Centimeter', symbol: 'cm', description: 'Small length', example: 'Your fingernail' },
        { name: 'Meter', symbol: 'm', description: 'Standard length', example: 'A tall person' },
        { name: 'Kilometer', symbol: 'km', description: 'Long distance', example: 'Between cities' },
        { name: 'Inch', symbol: 'in', description: 'Small imperial length', example: 'A thumb width' },
        { name: 'Foot', symbol: 'ft', description: 'Imperial length', example: 'Your foot' },
        { name: 'Yard', symbol: 'yd', description: 'Imperial length', example: 'A big step' },
        { name: 'Mile', symbol: 'mi', description: 'Long imperial distance', example: 'Between towns' }
    ],
    weight: [
        { name: 'Gram', symbol: 'g', description: 'Small weight', example: 'A paperclip' },
        { name: 'Kilogram', symbol: 'kg', description: 'Standard weight', example: 'A bag of apples' },
        { name: 'Metric Ton', symbol: 't', description: 'Heavy weight', example: 'A car' },
        { name: 'Ounce', symbol: 'oz', description: 'Small imperial weight', example: 'A slice of bread' },
        { name: 'Pound', symbol: 'lb', description: 'Imperial weight', example: 'A small dog' }
    ],
    volume: [
        { name: 'Milliliter', symbol: 'mL', description: 'Small volume', example: 'A spoonful' },
        { name: 'Liter', symbol: 'L', description: 'Standard volume', example: 'A bottle of water' },
        { name: 'Cubic Meter', symbol: 'm³', description: 'Large volume', example: 'A room' },
        { name: 'Fluid Ounce', symbol: 'fl oz', description: 'Small imperial volume', example: 'A shot glass' },
        { name: 'Cup', symbol: 'c', description: 'Imperial volume', example: 'A cup of tea' },
        { name: 'Pint', symbol: 'pt', description: 'Imperial volume', example: 'A pint of milk' },
        { name: 'Gallon', symbol: 'gal', description: 'Large imperial volume', example: 'A big jug' }
    ],
    time: [
        { name: 'Second', symbol: 's', description: 'Short time', example: 'One heartbeat' },
        { name: 'Minute', symbol: 'min', description: '60 seconds', example: 'Singing a song' },
        { name: 'Hour', symbol: 'h', description: '60 minutes', example: 'A class' },
        { name: 'Day', symbol: 'd', description: '24 hours', example: 'A full day' },
        { name: 'Week', symbol: 'wk', description: '7 days', example: 'School week' },
        { name: 'Month', symbol: 'mo', description: 'About 30 days', example: 'A season' },
        { name: 'Year', symbol: 'yr', description: '365 days', example: 'A school year' }
    ],
    temperature: [
        { name: 'Celsius', symbol: '°C', description: 'Metric temperature', example: 'Water freezes at 0°C, boils at 100°C' },
        { name: 'Fahrenheit', symbol: '°F', description: 'Imperial temperature', example: 'Water freezes at 32°F, boils at 212°F' },
        { name: 'Kelvin', symbol: 'K', description: 'Scientific temperature', example: 'Absolute zero is 0K' }
    ]
};

// ==================== EUROPEAN COUNTRIES ====================
const europeanCountriesData = [
    { country: 'United Kingdom', flag: '🇬🇧', capital: 'London', population: '67 million', language: 'English', currency: 'British Pound', landmark: 'Big Ben' },
    { country: 'France', flag: '🇫🇷', capital: 'Paris', population: '67 million', language: 'French', currency: 'Euro', landmark: 'Eiffel Tower' },
    { country: 'Germany', flag: '🇩🇪', capital: 'Berlin', population: '83 million', language: 'German', currency: 'Euro', landmark: 'Brandenburg Gate' },
    { country: 'Italy', flag: '🇮🇹', capital: 'Rome', population: '60 million', language: 'Italian', currency: 'Euro', landmark: 'Colosseum' },
    { country: 'Spain', flag: '🇪🇸', capital: 'Madrid', population: '47 million', language: 'Spanish', currency: 'Euro', landmark: 'Sagrada Familia' },
    { country: 'Netherlands', flag: '🇳🇱', capital: 'Amsterdam', population: '17 million', language: 'Dutch', currency: 'Euro', landmark: 'Canals of Amsterdam' },
    { country: 'Belgium', flag: '🇧🇪', capital: 'Brussels', population: '11 million', language: 'Dutch, French, German', currency: 'Euro', landmark: 'Grand Place' },
    { country: 'Switzerland', flag: '🇨🇭', capital: 'Bern', population: '8 million', language: 'German, French, Italian, Romansh', currency: 'Swiss Franc', landmark: 'Matterhorn' },
    { country: 'Austria', flag: '🇦🇹', capital: 'Vienna', population: '9 million', language: 'German', currency: 'Euro', landmark: 'Schönbrunn Palace' },
    { country: 'Portugal', flag: '🇵🇹', capital: 'Lisbon', population: '10 million', language: 'Portuguese', currency: 'Euro', landmark: 'Belém Tower' },
    { country: 'Ireland', flag: '🇮🇪', capital: 'Dublin', population: '5 million', language: 'Irish, English', currency: 'Euro', landmark: 'Guinness Storehouse' },
    { country: 'Sweden', flag: '🇸🇪', capital: 'Stockholm', population: '10 million', language: 'Swedish', currency: 'Swedish Krona', landmark: 'Vasa Museum' },
    { country: 'Norway', flag: '🇳🇴', capital: 'Oslo', population: '5 million', language: 'Norwegian', currency: 'Norwegian Krone', landmark: 'Fjords' },
    { country: 'Denmark', flag: '🇩🇰', capital: 'Copenhagen', population: '6 million', language: 'Danish', currency: 'Danish Krone', landmark: 'Little Mermaid Statue' },
    { country: 'Finland', flag: '🇫🇮', capital: 'Helsinki', population: '5 million', language: 'Finnish, Swedish', currency: 'Euro', landmark: 'Santa Claus Village' },
    { country: 'Greece', flag: '🇬🇷', capital: 'Athens', population: '11 million', language: 'Greek', currency: 'Euro', landmark: 'Parthenon' },
    { country: 'Poland', flag: '🇵🇱', capital: 'Warsaw', population: '38 million', language: 'Polish', currency: 'Polish Zloty', landmark: 'Warsaw Old Town' },
    { country: 'Czech Republic', flag: '🇨🇿', capital: 'Prague', population: '11 million', language: 'Czech', currency: 'Czech Koruna', landmark: 'Prague Castle' },
    { country: 'Hungary', flag: '🇭🇺', capital: 'Budapest', population: '10 million', language: 'Hungarian', currency: 'Hungarian Forint', landmark: 'Buda Castle' },
    { country: 'Austria', flag: '🇦🇹', capital: 'Vienna', population: '9 million', language: 'German', currency: 'Euro', landmark: 'Hofburg Palace' }
];

// ==================== SCIENCE LEARNING CONTENT ====================
const scienceLearningData = {
    physics: [
        {
            title: "Newton's Laws",
            desc: 'Learn about motion, force, and gravity',
            content: `Newton's First Law: An object at rest stays at rest, and an object in motion stays in motion with the same speed and in the same direction unless acted upon by an unbalanced force.
                
Example: A book on a table stays there until you push it.

Newton's Second Law: Force equals mass times acceleration (F = ma).

Example: Pushing a heavy cart requires more force than pushing a light one.

Newton's Third Law: For every action, there is an equal and opposite reaction.

Example: When you jump, you push down on the ground, and the ground pushes you up!`,
            level: 'Age 8-12'
        },
        {
            title: 'Electricity',
            desc: 'Discover circuits and electromagnetism',
            content: `Electricity is a form of energy that powers our homes, schools, and devices.

How circuits work:
1. A circuit is a path for electricity to flow
2. It needs a power source (battery), wires, and a load (light bulb)
3. When the circuit is complete, electricity flows and the bulb lights up!

Types of circuits:
- Series: Components connected one after another
- Parallel: Components connected side by side

Safety tip: Never touch electrical outlets with wet hands!`,
            level: 'Age 8-12'
        },
        {
            title: 'Light and Sound',
            desc: 'Learn about waves and reflection',
            content: `Light travels in straight lines at 300,000 km per second!
- Reflection: Light bouncing off surfaces (like mirrors)
- Refraction: Light bending when it passes through water or glass

Sound is made by vibrations:
- Sound travels through air, water, and solids
- It travels much slower than light (about 343 meters per second)
- That's why we see lightning before we hear thunder!`,
            level: 'Age 7-11'
        },
        {
            title: 'Energy',
            desc: 'Discover different forms of energy',
            content: `Energy is the ability to do work. There are many forms:

1. Kinetic Energy: Energy of motion (a moving car, running child)
2. Potential Energy: Stored energy (a ball at the top of a hill)
3. Thermal Energy: Heat energy (from the sun, a fire)
4. Electrical Energy: From batteries or power plants
5. Solar Energy: Energy from sunlight

Energy can change from one form to another, but it can never be created or destroyed!`,
            level: 'Age 8-12'
        }
    ],
    biology: [
        {
            title: 'Human Body Systems',
            desc: 'Learn about circulatory, respiratory systems',
            content: `The Circulatory System:
- Heart: Pumps blood around the body
- Blood vessels: Arteries carry blood away from the heart; veins carry it back
- Blood: Transports oxygen, nutrients, and waste

The Respiratory System:
- Lungs: Where gas exchange happens
- Trachea: Windpipe that carries air to the lungs
- Diaphragm: Muscle that helps us breathe

Fun fact: Your heart beats about 100,000 times a day!`,
            level: 'Age 9-13'
        },
        {
            title: 'Cell Structure',
            desc: 'Discover the parts of a cell',
            content: `Cells are the building blocks of life!

Animal Cell Parts:
- Nucleus: The control center, contains DNA
- Mitochondria: Powerhouse, produces energy
- Cell Membrane: Controls what enters and exits
- Cytoplasm: Gel-like substance inside the cell

Plant Cell Extra Parts:
- Cell Wall: Provides structure
- Chloroplasts: Make food using sunlight (photosynthesis)

Fun fact: There are about 37 trillion cells in your body!`,
            level: 'Age 10-14'
        },
        {
            title: 'European Ecosystems',
            desc: 'Learn about Alpine meadows, Mediterranean forests',
            content: `Alpine Ecosystems (Swiss Alps):
- Cold, mountainous environment
- Animals: Ibex, chamois, marmots, golden eagles
- Plants: Edelweiss, alpine flowers that grow close to the ground

Mediterranean Ecosystems (Southern Europe):
- Warm, dry summers, mild winters
- Animals: Ibex, wild boar, flamingos
- Plants: Olive trees, grapevines, lavender

These ecosystems are home to many unique species!`,
            level: 'Age 8-12'
        },
        {
            title: 'Biodiversity',
            desc: 'Discover endangered species in Europe',
            content: `Biodiversity means the variety of life on Earth.

Endangered European Species:
1. Iberian Lynx: Only about 400 left in Spain and Portugal
2. European Bison: Once extinct in the wild, now recovering
3. Mediterranean Monk Seal: Only about 700 remaining
4. Atlantic Salmon: Threatened by pollution and dams

Why it matters: Every species plays an important role in the ecosystem.`,
            level: 'Age 9-13'
        }
    ],
    geography: [
        {
            title: 'European Mountains',
            desc: 'Explore the Alps, Pyrenees, Carpathians',
            content: `The Alps:
- Europe's highest mountain range
- Stretches across 8 countries: France, Switzerland, Italy, Austria, Germany, Slovenia, Liechtenstein, Monaco
- Highest peak: Mont Blanc (4,808 meters)

The Pyrenees:
- Form the border between France and Spain
- Home to unique plants and animals

The Carpathians:
- Eastern Europe's largest mountain range
- Important habitat for brown bears and wolves`,
            level: 'Age 7-11'
        },
        {
            title: 'European Volcanoes',
            desc: 'Discover Mount Vesuvius, Etna',
            content: `Mount Vesuvius (Italy):
- Famous for destroying Pompeii in 79 AD
- Still active today
- Located near Naples

Mount Etna (Sicily, Italy):
- Europe's most active volcano
- Has erupted over 200 times in recorded history
- Creates fertile soil for farming

Other European Volcanoes:
- Santorini (Greece) - famous for its volcanic caldera
- Stromboli (Italy) - known as the "Lighthouse of the Mediterranean"`,
            level: 'Age 8-12'
        },
        {
            title: 'Rivers of Europe',
            desc: 'Learn about the Rhine, Danube, Seine',
            content: `The Rhine:
- Flows through 6 countries: Switzerland, Liechtenstein, Austria, Germany, France, Netherlands
- Important for transportation and trade

The Danube:
- Europe's second longest river
- Flows through 10 countries
- Passes through Vienna, Budapest, and Belgrade

The Seine:
- Flows through Paris, France
- Famous for its bridges and romantic cruises

These rivers have shaped European history and culture!`,
            level: 'Age 7-11'
        },
        {
            title: 'European Lakes',
            desc: 'Discover Lake Geneva, Lake Como',
            content: `Lake Geneva:
- Located between Switzerland and France
- Europe's largest alpine lake
- Famous for its beautiful scenery

Lake Como (Italy):
- One of Italy's most scenic lakes
- Surrounded by mountains and villas
- Popular tourist destination

Lake Balaton (Hungary):
- Europe's largest lake by surface area
- Known as the "Hungarian Sea"

These lakes provide water, recreation, and habitat for wildlife.`,
            level: 'Age 7-11'
        }
    ]
};

// ==================== CLASSICAL MUSIC CONTENT ====================
const classicalMusicData = [
    {
        title: 'Mozart for Kids',
        desc: 'Enjoy and learn about Mozart\'s most famous compositions',
        composer: 'Wolfgang Amadeus Mozart',
        country: 'Austria',
        period: 'Classical',
        works: [
            { name: 'Eine kleine Nachtmusik', info: 'A beautiful serenade written in 1787, perfect for relaxing evenings' },
            { name: 'Piano Sonata K.545', info: 'Known as the "Sonata Facile", great for beginner piano students' },
            { name: 'Symphony No.40', info: 'One of Mozart\'s most famous symphonies, full of energy and emotion' }
        ],
        funFact: 'Mozart started composing music at the age of 5!'
    },
    {
        title: 'Beethoven\'s Symphonies',
        desc: 'Discover Beethoven\'s nine symphonies',
        composer: 'Ludwig van Beethoven',
        country: 'Germany',
        period: 'Classical/Romantic',
        works: [
            { name: 'Symphony No.5', info: 'Famous opening: "Da-da-da-DUM!" represents fate knocking' },
            { name: 'Symphony No.9', info: 'Includes "Ode to Joy", Beethoven wrote it when he was deaf' },
            { name: 'Symphony No.6 "Pastoral"', info: 'Describes nature scenes: a stream, birds, and a storm' }
        ],
        funFact: 'Beethoven continued composing even after he lost his hearing!'
    },
    {
        title: 'Bach\'s Masterpieces',
        desc: 'Learn about Bach\'s organ works and concertos',
        composer: 'Johann Sebastian Bach',
        country: 'Germany',
        period: 'Baroque',
        works: [
            { name: 'Brandenburg Concertos', info: 'Six concertos showing Bach\'s mastery of instrumental music' },
            { name: 'Toccata and Fugue in D minor', info: 'Famous organ piece often used in movies for dramatic effect' },
            { name: 'Goldberg Variations', info: 'A set of beautiful keyboard variations' }
        ],
        funFact: 'Bach had 20 children, many of whom became musicians!'
    },
    {
        title: 'Vivaldi\'s Four Seasons',
        desc: 'Listen to Vivaldi\'s famous violin concertos',
        composer: 'Antonio Vivaldi',
        country: 'Italy',
        period: 'Baroque',
        works: [
            { name: 'Spring', info: 'Birds singing, streams flowing, a joyful celebration of spring' },
            { name: 'Summer', info: 'Hot weather, thunderstorms, and insects buzzing' },
            { name: 'Autumn', info: 'Harvest time, hunting parties, and dancing' },
            { name: 'Winter', info: 'Cold winds, ice, and warm fires' }
        ],
        funFact: 'Vivaldi was also a violin teacher at a girls\' orphanage!'
    },
    {
        title: 'Chopin\'s Piano Works',
        desc: 'Enjoy Chopin\'s beautiful piano pieces',
        composer: 'Frédéric Chopin',
        country: 'Poland',
        period: 'Romantic',
        works: [
            { name: 'Nocturnes', info: 'Beautiful, dreamy pieces meant to be played at night' },
            { name: 'Waltzes', info: 'Elegant dance pieces, full of grace and style' },
            { name: 'Etudes', info: 'Technical exercises that are also beautiful music' }
        ],
        funFact: 'Chopin wrote most of his music for solo piano!'
    },
    {
        title: 'Strauss Waltzes',
        desc: 'Dance to the beautiful waltzes of Johann Strauss',
        composer: 'Johann Strauss II',
        country: 'Austria',
        period: 'Romantic',
        works: [
            { name: 'The Blue Danube', info: 'The most famous waltz of all time, synonymous with Vienna' },
            { name: 'Vienna Blood', info: 'A lively waltz that celebrates Vienna' },
            { name: 'Tales from the Vienna Woods', info: 'Evokes the beauty of Vienna\'s forests' }
        ],
        funFact: 'Strauss was known as "The Waltz King"!'
    }
];

// ==================== SPEAKING PRACTICE CONTENT ====================
const speakingPracticeData = [
    {
        title: 'Greetings in English',
        desc: 'Learn formal and informal greetings',
        content: `Formal Greetings:
- Good morning (used before noon)
- Good afternoon (used from noon to evening)
- Good evening (used in the evening)
- How do you do? (very formal, first meeting)

Informal Greetings:
- Hi! / Hello!
- Hey!
- What's up? (casual, with friends)
- How's it going?

Responses:
- I'm fine, thank you. And you?
- Very well, thanks.
- Not bad, thanks.

Practice:
1. Hello! My name is [Your Name].
2. Good morning, teacher! How are you?
3. Hi, Sarah! What's up?`,
        examples: ['Hello! How are you?', 'Good morning, teacher!', 'Hi, my name is Tom.'],
        level: 'Beginner'
    },
    {
        title: 'Ordering Food',
        desc: 'Practice ordering food in restaurants',
        content: `Useful Phrases:
- I would like... (polite)
- Can I have... (friendly)
- Could I get... (very polite)
- Do you have... (asking about availability)

Example Dialogue:
Waiter: Good evening! Can I take your order?
You: Yes, please. I would like a pizza with mushrooms.
Waiter: Would you like anything to drink?
You: Can I have a glass of lemonade, please?
Waiter: Sure! That will be ready in 15 minutes.
You: Thank you!

Practice:
1. I would like a hamburger and fries, please.
2. Can I have a salad with dressing on the side?
3. Do you have vegetarian options?`,
        examples: ['I would like a pizza, please.', 'Can I have a glass of water?', 'Could I get the chicken sandwich?'],
        level: 'Beginner'
    },
    {
        title: 'Asking Directions',
        desc: 'Learn how to ask for directions',
        content: `Useful Phrases:
- Where is...? (direct question)
- How do I get to...? (asking for route)
- Can you tell me the way to...? (polite)
- Is it far from here? (asking about distance)
- Go straight / Turn left / Turn right

Example Dialogue:
You: Excuse me, where is the Eiffel Tower?
Local: Go straight down this street, then turn right at the museum. It's about 10 minutes walk.
You: Is there a bus that goes there?
Local: Yes, take bus number 69 from the stop over there.
You: Thank you very much!
Local: You're welcome!

Practice:
1. Excuse me, how do I get to the train station?
2. Can you tell me where the nearest bathroom is?
3. Is the museum far from here?`,
        examples: ['Where is the nearest museum?', 'How do I get to the Eiffel Tower?', 'Can you tell me the way to the station?'],
        level: 'Beginner'
    },
    {
        title: 'Introducing Yourself',
        desc: 'Practice introducing yourself',
        content: `Key Phrases:
- My name is...
- I am [age] years old.
- I am from...
- I like... / My hobbies are...
- Nice to meet you!

Example Introduction:
"Hello! My name is Emma. I am 8 years old and I'm from London. I like reading books and playing the piano. Nice to meet you!"

Practice:
1. Hello! My name is [Your Name]. I am [age] years old.
2. I'm from [Country/City]. What about you?
3. My hobbies are [hobby 1] and [hobby 2].

Tips:
- Speak slowly and clearly
- Make eye contact
- Smile!`,
        examples: ['My name is Emma.', 'I am 8 years old.', 'I like playing football.'],
        level: 'Beginner'
    },
    {
        title: 'Talking About Hobbies',
        desc: 'Learn to talk about your hobbies and interests',
        content: `Useful Vocabulary:
- Reading books
- Playing sports (football, basketball, swimming)
- Playing musical instruments (piano, guitar)
- Drawing / Painting
- Playing video games
- Collecting stamps/coins
- Gardening
- Cooking

Example Conversation:
A: What do you like to do in your free time?
B: I like reading adventure stories. What about you?
A: I love playing football with my friends.
B: That sounds fun! When do you play?
A: Every Saturday morning.

Practice:
1. My favorite hobby is reading.
2. I enjoy playing the piano in the evening.
3. On weekends, I like to go hiking.`,
        examples: ['I like reading books.', 'My hobby is painting.', 'I enjoy playing the piano.'],
        level: 'Beginner'
    },
    {
        title: 'Weather Conversation',
        desc: 'Practice talking about the weather',
        content: `Weather Vocabulary:
- Sunny / Cloudy / Rainy / Snowy
- Windy / Foggy / Stormy
- Hot / Warm / Cool / Cold
- Temperature: It's 25 degrees Celsius.

Useful Phrases:
- What's the weather like today?
- It's a beautiful day!
- It's raining heavily.
- The weather is very cold today.
- Do you think it will rain?

Example Conversation:
A: Good morning! What's the weather like today?
B: It's sunny and warm. Perfect for going to the park!
A: Great! I think I'll have a picnic.
B: Enjoy your day!

Practice:
1. It's a beautiful sunny day today.
2. Take an umbrella, it's going to rain.
3. The weather is getting colder now.`,
        examples: ['It is a beautiful day!', 'It is raining heavily.', 'The weather is very cold today.'],
        level: 'Beginner'
    },
    {
        title: 'Shopping Dialogues',
        desc: 'Learn shopping vocabulary and phrases',
        content: `Shopping Vocabulary:
- Price: How much does this cost?
- Size: Small / Medium / Large
- Color: Red, blue, green, etc.
- Try on: Can I try this on?
- Pay: I'll pay with cash/credit card.

Example Dialogue:
Customer: Excuse me, how much does this shirt cost?
Shopkeeper: It's £25.
Customer: Do you have it in blue?
Shopkeeper: Yes, we have it in blue and green.
Customer: Can I try it on?
Shopkeeper: Sure, the fitting rooms are over there.
Customer: I'll take it!
Shopkeeper: Great! Would you like to pay with cash or card?

Practice:
1. How much does this book cost?
2. Do you have this dress in a smaller size?
3. Can I pay with a credit card?`,
        examples: ['How much does this cost?', 'Can I try this on?', 'Do you have this in blue?'],
        level: 'Beginner'
    },
    {
        title: 'Travel Phrases',
        desc: 'Useful phrases for traveling in Europe',
        content: `Travel Vocabulary:
- Train station / Bus stop / Airport
- Ticket / Passport / Map
- Hotel / Hostel / Accommodation
- Tourist information

Useful Phrases:
- Where is the train station?
- How much is a ticket to Paris?
- Does this bus go to the city center?
- Can you recommend a good restaurant?
- Excuse me, do you speak English?

Example Conversation:
Traveler: Excuse me, does this bus go to the Eiffel Tower?
Local: Yes, it does! Get off at the next stop.
Traveler: How much is a ticket?
Local: It's 2 euros.
Traveler: Thank you very much!
Local: Bon voyage!

Practice:
1. Where can I buy a train ticket?
2. How long does it take to get to Rome?
3. Do you know where I can find a good hotel?`,
        examples: ['Where is the train station?', 'How much is a ticket?', 'Does this bus go to the city center?'],
        level: 'Beginner'
    }
];

// ==================== READING CONTENT ====================
const readingContentData = [
    {
        title: 'London Adventure',
        desc: 'Join a magical adventure through the streets of London',
        level: 'Grade 3-5',
        length: '8 pages',
        content: `Chapter 1: The Magical Key

Lily loved exploring London. Every Saturday, she would wander through the old streets, imagining stories about the buildings and people.

One day, while walking near the Tower of London, she found an old brass key lying on the ground. It had strange symbols engraved on it.

"Interesting," she thought. "I wonder where this goes?"

Just then, the key began to glow. Before Lily knew what was happening, she was shrinking - smaller and smaller until she was no bigger than a mouse!

Chapter 2: The Secret Door

Lily looked around in amazement. The key was now the size of a sword. She picked it up and noticed a tiny door in the wall of the Tower.

The key fit perfectly! With a creak, the door opened, revealing a dark passage. Lily took a deep breath and stepped inside.

The passage led her to a hidden chamber filled with glittering treasures - gold coins, jewels, and ancient scrolls. But what caught her eye most was a beautiful silver crown sitting on a velvet cushion.

Chapter 3: The Guardian

"Who dares enter the secret vault?" a deep voice boomed.

Lily turned around and saw a large stone statue had come to life! It was a knight in shining armor.

"I-I'm Lily," she stammered. "I found the key outside."

The knight studied her carefully. "You have a pure heart," he said. "The key only opens for those with good intentions."

He told her about the crown - it belonged to Queen Elizabeth I and held magical powers to protect London.

Chapter 4: The Return

"Your secret is safe with me," Lily promised.

The knight smiled. "You may visit again, but remember - great power comes with great responsibility."

With a flash of light, Lily found herself back on the street, holding the tiny key in her hand.

From that day on, whenever Lily walks past the Tower of London, she smiles, knowing about the secret world hidden just beyond the stone walls.

The End`
    },
    {
        title: 'Paris Stories',
        desc: 'Read about a little girl exploring Paris',
        level: 'Grade 2-4',
        length: '6 pages',
        content: `My Trip to Paris

Last summer, my family and I went to Paris. It was the most amazing city I've ever seen!

The Eiffel Tower

First, we visited the Eiffel Tower. It's so tall and sparkly! We took the elevator to the top and saw all of Paris below. At night, the tower lights up with thousands of twinkling lights. It looked like magic!

The Louvre Museum

Next, we went to the Louvre. It's the biggest museum in the world! We saw the Mona Lisa painting - she has the most mysterious smile. My favorite part was the Egyptian mummies. They were really old but still looked amazing.

French Food

We ate delicious French food! My favorite was croissants - they're buttery and flaky. We also tried macarons in every color - pink, blue, green, and yellow. They tasted like candy!

The Seine River

One evening, we took a boat ride on the Seine River. We saw beautiful bridges and buildings lit up at night. My mom said it was like a fairy tale.

Saying Goodbye

On our last day, I didn't want to leave. Paris is such a special place. I told my parents I want to come back someday. Maybe when I'm older, I'll study art in Paris!

I'll never forget my trip to Paris. It was the best adventure ever!`
    },
    {
        title: 'German Fairy Tales',
        desc: 'Classic Grimm fairy tales from Germany',
        level: 'Grade 3-6',
        length: '10 pages',
        content: `Hansel and Gretel

Once upon a time, there lived a poor woodcutter and his wife. They had two children named Hansel and Gretel.

One day, when times were very hard, the wife said, "We can't feed the children anymore. Let's leave them in the woods."

Hansel heard this and gathered pebbles to mark their way home. But the next time, he didn't have pebbles, so he used breadcrumbs. The birds ate the breadcrumbs, and the children were lost!

They wandered until they found a house made of candy and gingerbread. An old woman lived there, but she was a witch! She wanted to fatten Hansel up and eat him.

But Gretel was clever. When the witch asked her to check if the oven was hot, Gretel pushed the witch inside and locked the door.

The children found treasure in the witch's house and followed the bird's song back home. Their parents were overjoyed to see them, and they never went hungry again.

Rumpelstiltskin

A miller told the king that his daughter could spin straw into gold. The king locked her in a tower and said, "Spin this straw into gold by morning, or you'll die!"

The girl cried, but a little man appeared and said, "I'll spin it for you... if you give me your first child." Desperate, she agreed.

The next morning, the straw was gold! But when the girl had a baby, the little man came to collect.

"Can't I keep my baby?" she begged. "Guess my name in three days, and you can," he said.

The girl searched everywhere. Finally, a servant heard the little man singing, "Rumpelstiltskin is my name!"

When the girl guessed correctly, Rumpelstiltskin stamped his foot so hard he split the ground and fell into it, never to be seen again.`
    },
    {
        title: 'Italian Legends',
        desc: 'Stories from ancient Rome and Italy',
        level: 'Grade 4-6',
        length: '12 pages',
        content: `Romulus and Remus: The Founding of Rome

Long ago, twin brothers named Romulus and Remus were born to a princess. Their evil uncle feared they would take his throne, so he ordered them to be thrown into the Tiber River.

But the babies didn't drown. A she-wolf found them and nursed them with her milk. Later, a shepherd found the boys and raised them.

When they grew up, Romulus and Remus decided to build a city. But they argued over who would be king. In the fight, Romulus killed Remus.

Romulus became the first king of the city he named Rome. The wolf became a symbol of the city, and you can still see her statue today!

Pandora's Box

In ancient Greece (but the story spread to Italy), the gods created Pandora, the first woman. They gave her a beautiful box and told her never to open it.

But Pandora was curious. One day, she opened the box, and out flew all the evils of the world - sickness, war, greed, and sadness.

Pandora quickly closed the box, but it was too late. All the bad things had escaped. But at the bottom of the box, there was one thing left: Hope.

And that's why, even in the darkest times, there's always hope.

The Story of Pinocchio

Pinocchio was a wooden puppet made by Geppetto, a kind woodcarver. When Pinocchio came to life, he promised to be good.

But Pinocchio was curious and easily tempted. He lied to Geppetto, and his nose grew longer each time he told a lie!

Pinocchio went on many adventures. He joined a puppet show, got swallowed by a whale, and even turned into a donkey!

But Pinocchio learned his lesson. He became brave, honest, and kind. Because of his good heart, the Blue Fairy turned him into a real boy.

From then on, Pinocchio lived happily with Geppetto, always telling the truth.`
    },
    {
        title: 'Greek Myths',
        desc: 'Stories of Greek gods and heroes',
        level: 'Grade 4-6',
        length: '11 pages',
        content: `Zeus: King of the Gods

Zeus was the most powerful god. He ruled Mount Olympus, where all the gods lived. He had a thunderbolt that could create storms.

Zeus was married to Hera, but he often fell in love with mortal women. This made Hera very jealous!

One of Zeus's sons was Hercules, the strongest man who ever lived. Hercules had to complete 12 impossible tasks, called the "Labors of Hercules."

Athena: Goddess of Wisdom

Athena was the goddess of wisdom, war, and crafts. She was born from Zeus's head, fully grown and wearing armor!

Athena and Poseidon, the god of the sea, once competed to be the patron of Athens. Poseidon gave the city a saltwater spring. Athena gave them an olive tree, which provided food and oil.

The people chose Athena, and that's how Athens got its name!

Hercules and the Twelve Labors

Hercules was the son of Zeus and a mortal woman. Hera hated him and made him go mad, causing him to kill his own family.

To atone for his sins, Hercules had to complete 12 labors:
1. Kill the Nemean Lion (its skin was invulnerable)
2. Slay the nine-headed Hydra
3. Capture the Golden Hind
4. Capture the Erymanthian Boar
5. Clean the Augean Stables in one day
6. Slay the Stymphalian Birds
7. Capture the Cretan Bull
8. Steal the Mares of Diomedes
9. Obtain the Girdle of Hippolyta
10. Capture the Cattle of Geryon
11. Steal Apples from the Garden of the Hesperides
12. Capture Cerberus, the three-headed dog of the Underworld

Hercules completed all 12 tasks and became a hero. After he died, Zeus placed him among the stars as a constellation.`
    }
];

// ==================== WRITING ACTIVITIES CONTENT ====================
const writingActivitiesData = [
    {
        title: 'Write a Postcard',
        desc: 'Learn to write a postcard to a friend',
        task: 'Imagine you are visiting Paris and write a postcard home',
        content: `How to Write a Postcard:

1. Date and Place: Start with where you are and the date
2. Greeting: "Dear [Friend's Name],"
3. Body: Tell them about your trip - what you've seen, done, and enjoyed
4. Closing: "Love," or "Best wishes,"
5. Sign your name

Example Postcard:
Paris, France
July 15

Dear Sarah,

Paris is amazing! I've seen the Eiffel Tower, the Louvre Museum, and I've eaten so many croissants! They're so buttery and delicious.

Yesterday, we took a boat ride on the Seine River at night. The lights were beautiful! I wish you were here with me.

I'll be home next week. Can't wait to show you my photos!

Love,
Emma

Tips:
- Keep it friendly and conversational
- Use exclamation points for excitement
- Mention specific things you've done
- Keep it short - postcards don't have much space!`,
        level: 'Grade 3-5'
    },
    {
        title: 'Write a Letter',
        desc: 'Practice writing formal and informal letters',
        task: 'Write a letter to your pen pal in London',
        content: `Informal Letter (to a friend):

[Your Address]
[Date]

Dear [Friend's Name],

How are you? I hope you're doing well. I'm writing to tell you about my summer vacation.

This year, my family and I went to the beach. We built sandcastles, swam in the ocean, and collected seashells. I found a really pretty one that's pink and white. I'll send it to you!

What did you do this summer? Did you go anywhere fun? I miss our playdates.

Write back soon!

Your friend,
[Your Name]

Formal Letter (to a teacher):

[Your Address]
[Date]

Dear Mr./Ms. [Last Name],

I am writing to thank you for teaching me this year. I really enjoyed your math class, especially the geometry projects.

Your lessons helped me understand fractions better, and now I'm much more confident in math. Thank you for being so patient and kind.

Have a wonderful summer!

Sincerely,
[Your Full Name]

Tips:
- Informal: Use contractions (don't, can't), friendly language
- Formal: Use full words (do not, cannot), polite language
- Always include your return address and date
- Sign your name neatly`,
        level: 'Grade 4-6'
    },
    {
        title: 'Write a Story',
        desc: 'Write your own European adventure story',
        task: 'Create a story about a dragon in the Black Forest',
        content: `How to Write a Story:

1. Characters: Who is your story about? (A brave knight, a curious child, a friendly dragon)
2. Setting: Where does the story take place? (A forest, a castle, a magical kingdom)
3. Problem/Goal: What does your character want to do? (Find treasure, help a friend, solve a mystery)
4. Plot: What happens? (Adventures, challenges, surprises)
5. Ending: How does it end? (Happy, sad, with a lesson learned)

Example Story Starter:

"The Dragon of the Black Forest"

Luka had heard stories about the dragon who lived in the Black Forest. Everyone said it was fierce and dangerous. But Luka wasn't afraid.

One day, he packed a bag and set off to find the dragon. The forest was dark and mysterious, but Luka kept going.

Then he saw it - a huge green dragon with scales that sparkled like emeralds. But instead of roaring, the dragon sighed.

"What's wrong?" Luka asked.

The dragon looked at him in surprise. "No one has ever asked me that before. I'm lonely. All the villagers are afraid of me."

Luka smiled. "I'm not afraid. Would you like to be friends?"

And so, Luka and the dragon became the best of friends. The villagers learned that dragons aren't always scary - sometimes they just need a friend.

Tips:
- Use descriptive words to make your story come alive
- Give your characters personality
- Add dialogue to make it interesting
- Make sure your story has a beginning, middle, and end`,
        level: 'Grade 4-6'
    },
    {
        title: 'Descriptive Writing',
        desc: 'Describe European landmarks',
        task: 'Describe the Eiffel Tower at sunset',
        content: `How to Write Descriptively:

1. Use your senses: What do you see, hear, smell, feel?
2. Use vivid adjectives: Instead of "big," say "enormous" or "majestic"
3. Use comparisons: "Like a giant iron lace" or "Sparkling like diamonds"
4. Show, don't tell: Instead of "The tower was beautiful," describe why it's beautiful

Example Description:

"The Eiffel Tower at Sunset"

As the sun dipped below the Parisian skyline, the Eiffel Tower began to glow. Its iron lattice structure turned golden, then pink, then deep purple as darkness fell.

From below, the tower seemed to touch the clouds. The setting sun painted streaks of orange and red across the sky behind it, making the tower look like it was on fire.

The air smelled of fresh croissants from nearby bakeries, and I could hear the distant sound of laughter from people picnicking on the grass.

As the first stars appeared, the tower lit up with thousands of twinkling lights. They sparkled like magic, turning the iron giant into something soft and beautiful.

I stood there, breathless, watching the tower change colors. It was more than just a building - it was a work of art, glowing in the evening light.

Tips:
- Start with an interesting opening
- Use specific details (colors, sounds, smells)
- Organize your description (top to bottom, left to right)
- End with how the place makes you feel`,
        level: 'Grade 5-7'
    }
];

// ==================== SCIENCE EXPERIMENTS CONTENT ====================
const scienceExperimentsData = [
    {
        title: 'Make a Volcano',
        desc: 'Create a baking soda volcano that erupts!',
        materials: ['Baking soda', 'Vinegar', 'Plastic cup', 'Red food coloring', 'Dish soap', 'Baking tray', 'Clay or play dough'],
        steps: [
            'Shape clay or play dough around a plastic cup to make a volcano shape.',
            'Place the volcano on a baking tray to catch spills.',
            'Add 2 tablespoons of baking soda to the cup.',
            'Add a few drops of red food coloring and a squirt of dish soap.',
            'Slowly pour vinegar into the cup... watch it erupt!',
            'The baking soda and vinegar react to create carbon dioxide gas, which makes the foam bubble up!'
        ],
        science: 'Chemical reaction between baking soda (sodium bicarbonate) and vinegar (acetic acid) produces carbon dioxide gas.',
        level: 'Age 6-10'
    },
    {
        title: 'Water Cycle',
        desc: 'Build a model of the water cycle',
        materials: ['Plastic bag', 'Water', 'Small dish', 'Small plant', 'Tape'],
        steps: [
            'Put the small plant in the dish and add a little water.',
            'Spray some water on the plant leaves.',
            'Place the dish inside the plastic bag.',
            'Seal the bag and tape it to a sunny window.',
            'Watch what happens over the next few days!',
            'You will see condensation (water droplets) forming on the bag, then precipitation (water dripping down).'
        ],
        science: 'Water evaporates from the plant and dish, condenses into droplets, and precipitates back down - just like the real water cycle!',
        level: 'Age 7-11'
    },
    {
        title: 'Simple Circuit',
        desc: 'Build a simple electric circuit',
        materials: ['Battery (AA or AAA)', 'Small light bulb', 'Insulated wire', 'Tape or alligator clips'],
        steps: [
            'Strip the ends of the wire to expose the metal inside.',
            'Connect one end of the wire to the positive (+) side of the battery.',
            'Connect the other end of the wire to the base of the light bulb.',
            'Connect another wire from the negative (-) side of the battery to the other side of the bulb.',
            'If everything is connected correctly, the bulb will light up!',
            'Try adding a switch by cutting one wire and connecting it to a paperclip that can touch another piece of metal.'
        ],
        science: 'Electricity flows from the battery through the wire to the bulb, creating a complete circuit.',
        level: 'Age 8-12'
    },
    {
        title: 'Crystal Growing',
        desc: 'Grow beautiful crystals',
        materials: ['Epsom salt', 'Water', 'Jar', 'String', 'Pencil', 'Food coloring (optional)'],
        steps: [
            'Boil water and let it cool for 5 minutes.',
            'Add Epsom salt to the water, stirring until no more dissolves.',
            'Add a few drops of food coloring if you want colored crystals.',
            'Tie one end of the string to a pencil and the other end to a small weight.',
            'Place the pencil across the top of the jar so the string hangs into the solution.',
            'Leave it undisturbed for 1-2 days.',
            'You will see beautiful crystals growing on the string!'
        ],
        science: 'As the water evaporates, the Epsom salt forms crystals because it can no longer stay dissolved.',
        level: 'Age 8-12'
    },
    {
        title: 'Density Experiment',
        desc: 'Learn about density with liquids',
        materials: ['Clear glass or jar', 'Honey', 'Water', 'Vegetable oil', 'Food coloring', 'Small objects (coin, paperclip, grape)'],
        steps: [
            'Pour honey into the jar first - it will sink to the bottom.',
            'Slowly pour colored water on top of the honey.',
            'Carefully pour vegetable oil on top of the water.',
            'Watch the layers form - honey at the bottom, water in the middle, oil on top.',
            'Drop in small objects and see which layer they float in!',
            'A coin will sink to the bottom (most dense), a grape will float in water, and a paperclip might float on oil.'
        ],
        science: 'Different liquids have different densities. Denser liquids sink to the bottom, less dense liquids float on top.',
        level: 'Age 7-11'
    },
    {
        title: 'Butterfly Life Cycle',
        desc: 'Watch caterpillars turn into butterflies',
        materials: ['Caterpillar kit (available at stores)', 'Milkweed leaves', 'Clear container', 'Stick or branch'],
        steps: [
            'Set up your caterpillar habitat with milkweed leaves for food.',
            'Place the caterpillars in the container and observe them daily.',
            'Watch them eat and grow bigger over the next week.',
            'When they are ready, they will form a chrysalis (pupa).',
            'Wait 1-2 weeks for the butterfly to emerge.',
            'When the butterfly comes out, let it dry its wings for a few hours, then release it outside!'
        ],
        science: 'Butterflies go through complete metamorphosis: egg -> caterpillar -> chrysalis -> butterfly.',
        level: 'Age 6-10'
    },
    {
        title: 'Plant Growth',
        desc: 'Grow your own plants from seeds',
        materials: ['Seeds (beans work well)', 'Soil', 'Pot or cup', 'Water', 'Sunlight'],
        steps: [
            'Fill a pot with soil, leaving a little space at the top.',
            'Plant 2-3 seeds about 1 inch deep in the soil.',
            'Water the soil gently.',
            'Place the pot in a sunny window.',
            'Water regularly to keep the soil moist but not soggy.',
            'Watch for sprouts in 3-7 days!',
            'Keep track of how tall your plant grows each week.'
        ],
        science: 'Seeds need water, air, and sunlight to germinate and grow into plants.',
        level: 'Age 5-9'
    },
    {
        title: 'Weather Station',
        desc: 'Build your own weather station',
        materials: ['Thermometer', 'Plastic bottle', 'Straw', 'Tape', 'Marker', 'String'],
        steps: [
            'Make a rain gauge: Cut the top off a plastic bottle, invert it, and tape it to the bottom half.',
            'Mark measurements on the side with a marker.',
            'Make a wind vane: Cut a straw and attach it to a pencil with a pin so it spins.',
            'Add arrow shapes to the ends of the straw.',
            'Place your weather station outside.',
            'Record the temperature and wind direction each day.',
            'Make a chart to track the weather over a week.'
        ],
        science: 'Temperature is measured with a thermometer. Wind direction tells us where the wind is coming from.',
        level: 'Age 8-12'
    }
];

// ==================== RIDDLES AND GAMES CONTENT ====================
const riddlesAndGamesData = {
    riddles: [
        { question: 'What has keys but can\'t open locks?', answer: 'A piano!' },
        { question: 'What has a head and a tail but no body?', answer: 'A coin!' },
        { question: 'What gets wetter as it dries?', answer: 'A towel!' },
        { question: 'What has four legs but can\'t walk?', answer: 'A table!' },
        { question: 'What goes up but never comes down?', answer: 'Your age!' },
        { question: 'What has eyes but can\'t see?', answer: 'A potato!' },
        { question: 'What has hands but can\'t clap?', answer: 'A clock!' },
        { question: 'What has a face but no eyes, hands but no arms?', answer: 'A clock!' },
        { question: 'What can you catch but not throw?', answer: 'A cold!' },
        { question: 'What belongs to you but is used more by others?', answer: 'Your name!' },
        { question: 'What has many teeth but can\'t bite?', answer: 'A comb!' },
        { question: 'What has a thumb and four fingers but is not alive?', answer: 'A glove!' },
        { question: 'What can you hold without touching it?', answer: 'Your breath!' },
        { question: 'What has holes but holds water?', answer: 'A sponge!' },
        { question: 'What goes through towns and over hills but never moves?', answer: 'A road!' }
    ],
    wordSearch: [
        {
            title: 'European Countries',
            grid: [
                ['F', 'R', 'A', 'N', 'C', 'E', 'S', 'P', 'A', 'I', 'N'],
                ['G', 'E', 'R', 'M', 'A', 'N', 'Y', 'B', 'R', 'I', 'T'],
                ['I', 'T', 'A', 'L', 'Y', 'P', 'O', 'L', 'A', 'N', 'D'],
                ['G', 'R', 'E', 'E', 'C', 'E', 'S', 'W', 'I', 'T', 'Z'],
                ['N', 'E', 'T', 'H', 'E', 'R', 'L', 'A', 'N', 'D', 'S']
            ],
            words: ['FRANCE', 'GERMANY', 'ITALY', 'GREECE', 'POLAND', 'SWITZERLAND', 'NETHERLANDS', 'SPAIN', 'BRITAIN']
        },
        {
            title: 'Weather Words',
            grid: [
                ['S', 'U', 'N', 'S', 'H', 'I', 'N', 'E', 'B', 'O', 'L'],
                ['C', 'L', 'O', 'U', 'D', 'Y', 'R', 'A', 'I', 'N', 'Y'],
                ['W', 'I', 'N', 'D', 'Y', 'H', 'O', 'T', 'S', 'N', 'O'],
                ['W', 'Y', 'F', 'O', 'G', 'G', 'Y', 'S', 'T', 'O', 'R'],
                ['M', 'Y', 'R', 'A', 'I', 'N', 'B', 'O', 'W', 'R', 'A']
            ],
            words: ['SUNSHINE', 'CLOUDY', 'RAINY', 'WINDY', 'HOT', 'SNOWY', 'FOGGY', 'STORMY', 'RAINBOW']
        }
    ],
    mathPuzzles: [
        { question: 'If you have 5 apples and give 2 to your friend, how many do you have left?', answer: '3 apples', solution: '5 - 2 = 3' },
        { question: 'A cat has 4 legs. How many legs do 3 cats have?', answer: '12 legs', solution: '4 x 3 = 12' },
        { question: 'There are 7 days in a week. How many days are in 2 weeks?', answer: '14 days', solution: '7 x 2 = 14' },
        { question: 'A book costs £5. How much do 4 books cost?', answer: '£20', solution: '5 x 4 = 20' },
        { question: 'If you bake 24 cookies and share them equally with 6 friends, how many does each get?', answer: '4 cookies', solution: '24 ÷ 6 = 4' },
        { question: 'Start with 10, add 5, subtract 3, multiply by 2. What do you get?', answer: '24', solution: '(10 + 5 - 3) x 2 = 24' }
    ],
    memoryGame: [
        { category: 'European Flags', items: ['🇬🇧', '🇫🇷', '🇩🇪', '🇮🇹', '🇪🇸', '🇵🇹', '🇳🇱', '🇧🇪'] },
        { category: 'Animals', items: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'] },
        { category: 'Fruits', items: ['🍎', '🍊', '🍋', '🍇', '🍓', '🍑', '🍒', '🥝'] }
    ],
    trivia: [
        { question: 'What is the capital of France?', answer: 'Paris' },
        { question: 'Which country is famous for pizza and pasta?', answer: 'Italy' },
        { question: 'What is the largest country in Europe?', answer: 'Russia' },
        { question: 'Which river flows through London?', answer: 'Thames' },
        { question: 'What is the currency used in most European countries?', answer: 'Euro' },
        { question: 'Which mountain range separates France and Spain?', answer: 'Pyrenees' },
        { question: 'What is the smallest country in the world?', answer: 'Vatican City' },
        { question: 'Which country gave us chocolate?', answer: 'Switzerland' },
        { question: 'What is the capital of Germany?', answer: 'Berlin' },
        { question: 'Which famous clock is in London?', answer: 'Big Ben' }
    ]
};

// Export for browser use
if (typeof window !== 'undefined') {
    window.englishWords = englishWordsData;
    window.grammarRules = grammarRulesData;
    window.scienceFacts = scienceFactsData;
    window.storyTitles = storyTitlesData;
    window.fullStories = fullStoriesData;
    window.songsList = songsListData;
    window.geometryShapes = geometryShapesData;
    window.measurementUnits = measurementUnitsData;
    window.europeanCountries = europeanCountriesData;
    window.scienceLearning = scienceLearningData;
    window.classicalMusic = classicalMusicData;
    window.speakingPractice = speakingPracticeData;
    window.readingContent = readingContentData;
    window.writingActivities = writingActivitiesData;
    window.scienceExperiments = scienceExperimentsData;
    window.riddlesAndGames = riddlesAndGamesData;
}

// Export for Node.js use
if (typeof module !== 'undefined') {
    module.exports = {
        englishWords: englishWordsData,
        grammarRules: grammarRulesData,
        scienceFacts: scienceFactsData,
        storyTitles: storyTitlesData,
        fullStories: fullStoriesData,
        songsList: songsListData,
        geometryShapes: geometryShapesData,
        measurementUnits: measurementUnitsData,
        europeanCountries: europeanCountriesData,
        scienceLearning: scienceLearningData,
        classicalMusic: classicalMusicData,
        speakingPractice: speakingPracticeData,
        readingContent: readingContentData,
        writingActivities: writingActivitiesData,
        scienceExperiments: scienceExperimentsData,
        riddlesAndGames: riddlesAndGamesData
    };
}