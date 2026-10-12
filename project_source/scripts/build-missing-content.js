const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

function id(prefix, n) { return `${prefix}-${n}`; }

// ===== TECHNOLOGY =====
const techItems = [];
const techCategories = {
  tech_coding: { prefix: 'tech-coding', titleEn: 'Coding Basics', levels: ['primary1','primary2','primary3','primary4'] },
  tech_robotics: { prefix: 'tech-robotics', titleEn: 'Robotics', levels: ['primary1','primary2','primary3','primary4'] },
  tech_ai: { prefix: 'tech-ai', titleEn: 'AI Basics', levels: ['primary2','primary3','primary4'] },
  tech_internet: { prefix: 'tech-internet', titleEn: 'Internet Knowledge', levels: ['primary1','primary2','primary3','primary4'] },
  tech_electronics: { prefix: 'tech-electronics', titleEn: 'Electronics', levels: ['primary2','primary3','primary4'] }
};

const codingTopics = [
  ["What is Coding?", "Coding is telling a computer what to do using special languages. Just like you follow a recipe to bake a cake, a computer follows code to do tasks.", "编程就是使用特殊的语言告诉计算机做什么。就像你按照食谱做蛋糕一样，计算机按照代码执行任务。", ["coding","computer","programming"]],
  ["Variables", "A variable is like a box that stores information. You can put numbers, words, or other data inside. Example: age = 10 stores the number 10.", "变量就像一个存储信息的盒子。你可以把数字、文字或其他数据放进去。", ["variable","data","storage"]],
  ["Loops", "Loops let you repeat actions without writing the same code many times. A 'for loop' runs a set number of times. A 'while loop' runs until a condition is met.", "循环让你重复执行动作而无需多次编写相同的代码。", ["loop","repeat","iteration"]],
  ["Conditionals (If/Else)", "Conditionals help the computer make decisions. If it's raining, take an umbrella. Else, wear sunglasses! In code: if (rain) { umbrella(); } else { sunglasses(); }", "条件语句帮助计算机做决定。如果下雨就带伞，否则戴太阳镜！", ["conditional","if","else","decision"]],
  ["Functions", "A function is a reusable block of code that does one specific job. Like a blender that always chops food the same way, a function always runs the same code.", "函数是可重复使用的代码块，完成一个特定的任务。", ["function","reusable","code"]],
  ["Arrays", "An array is a list of items stored together. Like a shopping list: ['apples', 'milk', 'bread']. You can access each item by its position (index).", "数组是一起存储的项目列表，就像购物清单一样。", ["array","list","index"]],
  ["Debugging", "Debugging is finding and fixing mistakes in your code. It's like being a detective! When your code doesn't work, check each step carefully.", "调试是发现和修复代码中的错误。就像当侦探一样！", ["debug","error","fix"]],
  ["Algorithms", "An algorithm is a step-by-step plan to solve a problem. Like a recipe: first preheat the oven, then mix ingredients, then bake.", "算法是解决问题的分步计划，就像食谱一样。", ["algorithm","steps","plan"]],
  ["Python Basics", "Python is a friendly programming language. You can print 'Hello World' with just: print('Hello World!'). It's great for beginners!", "Python 是一种友好的编程语言。只需 print('Hello World!') 就能打印出 Hello World！", ["python","hello world","print"]],
  ["Scratch Programming", "Scratch uses colorful blocks that snap together like LEGO. You don't need to type - just drag and drop blocks to make animations and games!", "Scratch 使用彩色积木块，像乐高一样拼在一起。不需要打字，只需拖放积木就能制作动画和游戏！", ["scratch","blocks","animation"]],
  ["HTML Basics", "HTML is the language of web pages. Tags like <h1> and <p> tell the browser how to show text. <h1>Hello</h1> makes a big heading.", "HTML 是网页的语言。<h1> 和 <p> 等标签告诉浏览器如何显示文本。", ["html","web","tags"]],
  ["CSS Basics", "CSS makes web pages look beautiful. You can change colors, fonts, sizes, and layouts. It's like the paint and decorations for a house!", "CSS 让网页变得美观。你可以改变颜色、字体、大小和布局。", ["css","style","design"]],
  ["JavaScript Basics", "JavaScript makes web pages interactive. You can create buttons that do things, games, and much more. It runs in your browser!", "JavaScript 让网页具有交互性。你可以创建按钮、游戏等。", ["javascript","interactive","browser"]],
  ["Binary Code", "Computers use only two numbers: 0 and 1. This is called binary. Each 0 or 1 is a 'bit'. 8 bits make a 'byte'. The letter 'A' is 01000001 in binary!", "计算机只使用两个数字：0 和 1。这叫做二进制。", ["binary","bit","byte"]],
  ["Input and Output", "Input is what goes into a computer (keyboard, mouse). Output is what comes out (screen, printer). The CPU processes input to create output.", "输入是进入计算机的内容（键盘、鼠标），输出是出来的内容（屏幕、打印机）。", ["input","output","cpu"]],
  ["Data Types", "Different kinds of data: integers (5), floats (3.14), strings ('hello'), booleans (true/false). Each type is used for different purposes.", "不同的数据类型：整数、浮点数、字符串、布尔值。", ["data type","integer","string","boolean"]],
  ["Comments in Code", "Comments are notes you write in code to explain what it does. In Python: # This is a comment. Comments help you and others understand your code.", "注释是你在代码中写的说明，帮助你和其他人理解代码。", ["comment","documentation","note"]],
  ["Recursion", "Recursion is when a function calls itself. Like mirrors reflecting each other. It's useful for solving problems that can be broken into smaller similar problems.", "递归是函数调用自身的情况。就像镜子相互反射。", ["recursion","function","self"]],
  ["Sorting Algorithms", "Sorting puts things in order. Bubble sort compares neighbors and swaps them. Merge sort divides the list in half, sorts each half, then merges them.", "排序算法把东西按顺序排列。冒泡排序比较相邻元素并交换它们。", ["sort","bubble sort","merge sort"]],
  ["Search Algorithms", "Search finds items in data. Linear search checks each item one by one. Binary search cuts the search area in half each time (much faster!).", "搜索算法在数据中查找项目。线性搜索逐个检查，二分搜索每次将搜索区域减半。", ["search","linear","binary"]]
];

const roboticsTopics = [
  ["What is a Robot?", "A robot is a machine that can do tasks automatically. Robots have sensors to see the world, a brain (computer) to think, and motors to move.", "机器人是能够自动执行任务的机器。机器人有传感器感知世界，有大脑思考，有马达移动。", ["robot","sensor","motor"]],
  ["Robot Sensors", "Sensors help robots understand their environment. Light sensors detect brightness. Ultrasonic sensors measure distance. Touch sensors feel when bumped.", "传感器帮助机器人了解环境。光传感器检测亮度，超声波传感器测量距离。", ["sensor","light","ultrasonic","touch"]],
  ["Robot Motors", "Motors make robots move. Servo motors turn to exact positions. DC motors spin continuously. Stepper motors move in precise steps.", "马达让机器人移动。伺服马达转到精确位置，直流马达持续旋转。", ["motor","servo","dc motor"]],
  ["Robot Arm", "A robot arm can pick up and move objects. It has joints like a human arm - shoulder, elbow, and wrist. Each joint can move in different ways.", "机械臂可以拾取和移动物体。它有关节，像人类手臂一样。", ["arm","joint","manipulator"]],
  ["Autonomous Vehicles", "Self-driving cars use cameras, radar, and AI to drive without a human. They can detect roads, signs, other cars, and pedestrians.", "自动驾驶汽车使用摄像头、雷达和AI来驾驶，无需人类操作。", ["autonomous","self-driving","vehicle"]],
  ["Drones", "Drones are flying robots. They use propellers to fly and can carry cameras. People use them for photography, delivery, and rescue missions.", "无人机是会飞的机器人。它们使用螺旋桨飞行，可以携带摄像头。", ["drone","propeller","flight"]],
  ["Humanoid Robots", "Humanoid robots look and move like humans. They have two legs, two arms, and a head. ASIMO and Atlas are famous humanoid robots.", "仿人机器人看起来和动作都像人类。它们有两条腿、两只胳膊和一个头。", ["humanoid","bipedal","ASIMO"]],
  ["Industrial Robots", "Industrial robots work in factories. They can weld, paint, assemble parts, and lift heavy objects. They work fast and never get tired.", "工业机器人在工厂工作。它们可以焊接、喷漆、组装零件和搬运重物。", ["industrial","factory","automation"]],
  ["Medical Robots", "Surgical robots help doctors perform precise operations. Rehabilitation robots help patients recover. Robot nurses deliver medicine in hospitals.", "手术机器人帮助医生进行精确操作。康复机器人帮助病人恢复。", ["medical","surgery","rehabilitation"]],
  ["Robot Programming", "You can program robots using block-based languages like Blockly or text-based languages like Python. The code tells the robot what to do and when.", "你可以使用 Blockly 等积木语言或 Python 等文本语言来编程机器人。", ["programming","blockly","python"]],
  ["Swarm Robots", "Swarm robots work together like ants or bees. Each robot is simple, but together they can do complex tasks like searching a large area.", "集群机器人像蚂蚁或蜜蜂一样共同工作。单个很简单，但一起能完成复杂任务。", ["swarm","collective","cooperation"]],
  ["Robot Competitions", "RoboCup and FIRST Lego League are robot competitions. Teams build robots that play soccer, rescue people, or complete obstacle courses.", "机器人比赛如 RoboCup 和 FIRST 乐高联赛。团队制造能踢足球、救援或完成障碍赛的机器人。", ["competition","RoboCup","FIRST"]],
  ["AI in Robotics", "AI helps robots make decisions. A robot with AI can learn from its mistakes, recognize objects, and understand speech.", "AI 帮助机器人做决定。有 AI 的机器人可以从错误中学习、识别物体和理解语言。", ["AI","machine learning","decision"]],
  ["Robot Ethics", "As robots become smarter, we need rules. Should a self-driving car protect its driver or pedestrians? These are important ethical questions.", "随着机器人变得更聪明，我们需要规则。自动驾驶汽车应该保护司机还是行人？", ["ethics","safety","rules"]],
  ["Wearable Robots", "Exoskeletons are wearable robots that help people walk or lift heavy things. They can help paralyzed people walk again!", "外骨骼是可穿戴的机器人，帮助人们行走或搬运重物。可以帮助瘫痪的人重新行走！", ["exoskeleton","wearable","assist"]],
  ["Underwater Robots", "ROVs (Remotely Operated Vehicles) explore the deep ocean where humans can't go. They study marine life and find shipwrecks.", "水下机器人探索人类无法到达的深海。它们研究海洋生物和寻找沉船。", ["underwater","ROV","ocean"]],
  ["Space Robots", "Robotic rovers like Perseverance explore Mars. Robotic arms on the ISS help astronauts. Robots are our eyes and hands in space.", "像毅力号这样的机器人探测器探索火星。空间站上的机械臂帮助宇航员。", ["space","rover","Mars"]],
  ["Robot History", "The first robot 'Unimate' worked in a car factory in 1961. Since then, robots have become smaller, smarter, and cheaper.", "第一个机器人 Unimate 于1961年在汽车工厂工作。从那以后，机器人变得更小、更聪明、更便宜。", ["history","Unimate","evolution"]],
  ["Educational Robots", "LEGO Mindstorms, micro:bit, and Arduino are great for learning robotics. You can build and program your own robot at home or school!", "LEGO Mindstorms、micro:bit 和 Arduino 是学习机器人的好工具。你可以在家或学校搭建和编程自己的机器人！", ["LEGO","micro:bit","Arduino"]],
  ["Future of Robots", "Future robots will be more helpful, friendly, and smart. They might become our teachers, helpers, and even friends!", "未来的机器人将更有帮助、更友好、更聪明。它们可能成为我们的老师、帮手，甚至朋友！", ["future","AI","assistant"]]
];

const aiTopics = [
  ["What is AI?", "Artificial Intelligence (AI) is when computers can do things that normally need human intelligence, like understanding speech, recognizing faces, or playing games.", "人工智能（AI）是指计算机能做通常需要人类智能的事情，比如理解语言、识别人脸或玩游戏。", ["AI","intelligence","computer"]],
  ["Machine Learning", "Machine learning is how computers learn from data. Show a computer 1000 cat photos, and it learns to recognize cats. More data = better learning!", "机器学习是计算机从数据中学习的方式。给计算机看1000张猫的照片，它就能学会识别猫。", ["machine learning","data","training"]],
   ["Neural Networks", "Neural networks are computer systems inspired by the human brain. They have layers of 'neurons' that process information, just like your brain cells!", '神经网络是受人类大脑启发的计算机系统。它们有多层「神经元」来处理信息，就像你的脑细胞一样！', ["neural network","neuron","layer"]],
  ["Computer Vision", "Computer vision helps computers see and understand images. It can detect faces, read license plates, and even diagnose diseases from X-rays!", "计算机视觉帮助计算机看到和理解图像。它可以检测人脸、读取车牌，甚至从X光片诊断疾病！", ["computer vision","image","recognition"]],
  ["Natural Language Processing", "NLP helps computers understand human language. When you talk to Siri or Alexa, NLP converts your speech into words, then understands the meaning.", "自然语言处理帮助计算机理解人类语言。当你和 Siri 或 Alexa 说话时，NLP 将语音转换成文字并理解含义。", ["NLP","language","speech"]],
  ["AI in Healthcare", "AI helps doctors diagnose diseases faster and more accurately. It can analyze medical images, predict patient risks, and discover new medicines.", "AI 帮助医生更快更准确地诊断疾病。它可以分析医学图像、预测患者风险、发现新药。", ["healthcare","diagnosis","medicine"]],
  ["AI in Education", "AI tutors can personalize learning for each student. If you struggle with math, the AI gives you more practice. If you excel, it gives you harder problems.", "AI 辅导可以为每个学生个性化学习。如果你数学有困难，AI 给你更多练习；如果你擅长，就给你更难的问题。", ["education","tutor","personalized"]],
  ["AI in Entertainment", "Netflix recommends shows using AI. Video games use AI for smart opponents. Music apps suggest songs you might like.", "Netflix 使用 AI 推荐节目。电子游戏使用 AI 作为智能对手。音乐应用推荐你可能喜欢的歌曲。", ["entertainment","recommendation","games"]],
  ["AI Ethics", "AI must be fair and unbiased. If we train AI on unfair data, it might make unfair decisions. We need to make sure AI helps everyone equally.", "AI 必须公平无偏见。如果我们用不公平的数据训练 AI，它可能会做出不公平的决定。", ["ethics","fairness","bias"]],
  ["Generative AI", "Generative AI can create new things: write stories, draw pictures, compose music, or even make videos. ChatGPT and DALL-E are examples.", "生成式 AI 可以创造新事物：写故事、画画、作曲，甚至制作视频。ChatGPT 和 DALL-E 就是例子。", ["generative","ChatGPT","DALL-E"]]
];

const internetTopics = [
  ["What is the Internet?", "The internet is a global network connecting millions of computers. Information travels as tiny data packets through cables, satellites, and wireless signals.", "互联网是连接数百万台计算机的全球网络。信息以微小的数据包通过电缆、卫星和无线信号传输。", ["internet","network","global"]],
  ["How Email Works", "Email lets you send messages instantly anywhere in the world. When you click send, your email goes to a server, which forwards it to the recipient's server.", "电子邮件让你即时发送信息到世界各地。点击发送后，邮件到达服务器，再转发到收件人的服务器。", ["email","server","message"]],
  ["Web Browsers", "Browsers like Chrome, Firefox, and Safari let you view websites. They download HTML, CSS, and JavaScript files and render them into beautiful pages.", "Chrome、Firefox 和 Safari 等浏览器让你查看网站。它们下载 HTML、CSS 和 JavaScript 文件并渲染成漂亮的页面。", ["browser","Chrome","Firefox"]],
  ["Search Engines", "Search engines like Google index billions of web pages. When you search, they find the most relevant pages in milliseconds using complex algorithms.", "Google 等搜索引擎索引数十亿网页。当你搜索时，它们使用复杂算法在毫秒内找到最相关的页面。", ["search engine","Google","index"]],
  ["Internet Safety", "Stay safe online: use strong passwords, don't share personal information, be careful with strangers, and don't click suspicious links.", "网络安全：使用强密码，不分享个人信息，小心陌生人，不点击可疑链接。", ["safety","password","privacy"]],
  ["Social Media", "Social media platforms let you connect with friends and share content. Popular platforms include YouTube, TikTok, Instagram, and WeChat.", "社交媒体平台让你与朋友联系和分享内容。流行平台包括 YouTube、TikTok、Instagram 和微信。", ["social media","YouTube","WeChat"]],
  ["Cloud Computing", "The cloud lets you store files on remote servers instead of your computer. You can access your photos, documents, and music from any device!", "云存储让你把文件存在远程服务器上，而不是你的电脑。你可以从任何设备访问照片、文档和音乐！", ["cloud","storage","remote"]],
  ["How WiFi Works", "WiFi uses radio waves to connect devices to the internet without cables. A router sends and receives data using 2.4 GHz or 5 GHz radio signals.", "WiFi 使用无线电波将设备无线连接到互联网。路由器使用 2.4 GHz 或 5 GHz 的无线电信号发送和接收数据。", ["WiFi","router","wireless"]],
  ["Internet of Things", "IoT connects everyday devices to the internet. Smart lights, thermostats, refrigerators, and watches can all communicate and be controlled remotely.", "物联网将日常设备连接到互联网。智能灯、恒温器、冰箱和手表都可以通信和远程控制。", ["IoT","smart","connected"]],
  ["Websites and URLs", "A URL (Uniform Resource Locator) is a website's address. https://www.example.com has three parts: protocol (https), domain (example.com), and path.", "URL 是网站的地址。https://www.example.com 有三部分：协议、域名和路径。", ["URL","domain","website"]],
  ["Digital Footprint", "Everything you do online leaves a trace - your digital footprint. Posts, comments, and searches can stay online forever. Think before you post!", "你在网上做的一切都留下痕迹——你的数字足迹。帖子、评论和搜索可能永久留在网上。", ["digital footprint","privacy","online"]],
  ["Bandwidth and Speed", "Bandwidth is how much data can travel through an internet connection. More bandwidth means faster downloads and smoother video streaming.", "带宽是互联网连接能传输多少数据。带宽越大，下载越快，视频流越流畅。", ["bandwidth","speed","download"]],
  ["Cookies and Tracking", "Cookies are small files websites store on your computer to remember you. They can be useful (remembering login) but also track your browsing habits.", "Cookie 是网站存储在电脑上的小文件，用来记住你。它们可能有用，但也可能跟踪你的浏览习惯。", ["cookies","tracking","privacy"]],
  ["Encryption", "Encryption scrambles data so only authorized people can read it. When you see https:// in a website address, your connection is encrypted and secure.", "加密将数据打乱，只有授权的人才能读取。当网址显示 https:// 时，你的连接已加密安全。", ["encryption","security","https"]],
  ["The World Wide Web", "The Web (WWW) is a collection of web pages you access through the internet. It was invented by Tim Berners-Lee in 1989 at CERN.", "万维网是你通过互联网访问的网页集合。它由 Tim Berners-Lee 于 1989 年在 CERN 发明。", ["web","WWW","Tim Berners-Lee"]],
  ["Streaming Media", "Streaming lets you watch videos or listen to music in real-time without downloading. YouTube, Netflix, and Spotify use streaming technology.", "流媒体让你实时观看视频或听音乐，无需下载。YouTube、Netflix 和 Spotify 使用流媒体技术。", ["streaming","video","music"]],
  ["Cybersecurity", "Cybersecurity protects computers and networks from attacks. Hackers try to steal data, but security experts use firewalls, antivirus, and encryption to stop them.", "网络安全保护计算机和网络免受攻击。黑客试图窃取数据，安全专家使用防火墙、杀毒软件和加密来阻止他们。", ["cybersecurity","hacker","firewall"]],
  ["Online Learning", "The internet has made learning accessible to everyone. Khan Academy, Coursera, and YouTube offer free courses on almost any topic.", "互联网让学习变得人人可及。Khan Academy、Coursera 和 YouTube 提供几乎所有主题的免费课程。", ["online learning","Khan Academy","Coursera"]],
  ["E-commerce", "Online shopping lets you buy anything from anywhere. Amazon, Taobao, and eBay are e-commerce platforms where millions of products are sold daily.", "网上购物让你从任何地方购买任何东西。亚马逊、淘宝和 eBay 是每天销售数百万产品的电商平台。", ["e-commerce","shopping","Amazon"]],
  ["Future of the Internet", "The future internet will be faster (5G/6G), more connected (IoT), and more intelligent (AI). It might even include the Metaverse - a virtual world!", "未来的互联网将更快（5G/6G）、更互联（物联网）和更智能（AI）。甚至可能包括元宇宙！", ["5G","metaverse","future"]]
];

for (const [cat, info] of Object.entries(techCategories)) {
  let topics;
  if (cat === 'tech_coding') topics = codingTopics;
  else if (cat === 'tech_robotics') topics = roboticsTopics;
  else if (cat === 'tech_ai') topics = aiTopics;
  else if (cat === 'tech_internet') topics = internetTopics;
  else if (cat === 'tech_electronics') topics = getElectronics();
  else continue;

  topics.forEach((t, i) => {
    techItems.push({
      id: `${info.prefix}-${i+1}`,
      category: cat,
      title: t[0],
      content: t[1],
      content_zh: t[2],
      level: info.levels[i % info.levels.length],
      language: 'en',
      type: 'lesson',
      tags: t[3]
    });
  });
}

function getElectronics() {
  return [
  ["What is Electricity?", "Electricity is the flow of tiny particles called electrons. It powers our lights, computers, phones, and almost everything in modern life.", "电是称为电子的微小粒子的流动。它为我们提供动力。", ["electricity","electron","power"]],
  ["Circuits", "A circuit is a closed loop that lets electricity flow. It needs a power source (battery), wires, and a load (like a light bulb).", "电路是让电流流动的闭合回路。它需要电源、电线和负载。", ["circuit","battery","wire"]],
  ["Series and Parallel", "In a series circuit, components are connected in a single path. If one breaks, all stop. In parallel, each component has its own path.", "串联电路中元件连在一条路径上，一个坏了全部停止。并联电路中每个元件有自己的路径。", ["series","parallel","circuit"]],
  ["LEDs", "LED (Light Emitting Diode) is a component that lights up when electricity passes through. They're energy-efficient and last a long time.", "LED 是电流通过时发光的元件。它们节能且寿命长。", ["LED","light","diode"]],
  ["Resistors", "Resistors limit the flow of electricity. They're like narrow pipes that reduce water flow. The colored stripes tell you the resistance value.", "电阻器限制电流流动。彩色条纹告诉你电阻值。", ["resistor","resistance","ohm"]],
  ["Capacitors", "Capacitors store electrical energy like a tiny rechargeable battery. They release energy quickly when needed, like the flash in a camera.", "电容器像可充电小电池一样储存电能。需要时快速释放能量。", ["capacitor","store","energy"]],
  ["Transistors", "Transistors are tiny switches that control electrical flow. They're the building blocks of all modern computers. A computer chip has billions of them!", "晶体管是控制电流的微型开关。它们是所有现代计算机的基石。", ["transistor","switch","computer"]],
  ["Breadboards", "A breadboard lets you build circuits without soldering. You just push components and wires into the holes. Great for experimenting!", "面包板让你无需焊接就能搭建电路。只需将元件和电线插入孔中。", ["breadboard","prototype","solder"]],
  ["Arduino", "Arduino is a small computer board for making interactive projects. It can read sensors, control lights, and communicate with other devices.", "Arduino 是用于制作交互项目的小型计算机板。它可以读取传感器、控制灯光和与其他设备通信。", ["Arduino","microcontroller","board"]],
  ["Sensors", "Sensors detect things in the physical world. Temperature sensors measure heat. Motion sensors detect movement. Light sensors measure brightness.", "传感器检测物理世界中的事物。温度传感器测量热量，运动传感器检测移动。", ["sensor","detect","measure"]]
];
}
// Add electronics items
getElectronics().forEach((t, i) => {
  techItems.push({
    id: `tech-electronics-${i+1}`,
    category: 'tech_electronics',
    title: t[0],
    content: t[1],
    content_zh: t[2],
    level: ['primary2','primary3','primary4'][i % 3],
    language: 'en',
    type: 'lesson',
    tags: t[3]
  });
});

// ===== ENGINEERING =====
const engItems = [];
const engTopics = {
  eng_structure: [
    ["What are Structures?", "Structures are things that hold weight and resist forces. Buildings, bridges, towers, and even your body are structures! They must be strong and stable.", "结构是承受重量和抵抗外力的物体。建筑物、桥梁、塔，甚至你的身体都是结构！", ["structure","building","bridge"]],
    ["Beams and Columns", "Beams are horizontal supports that carry loads across a span. Columns are vertical supports that hold up beams. Together they form a frame.", "梁是水平支撑，跨度上承载负荷。柱是垂直支撑，支撑梁。它们一起构成框架。", ["beam","column","frame"]],
    ["Triangles are Strong", "Triangles are the strongest shape! They distribute force evenly. That's why bridges, cranes, and roof trusses use triangular designs.", "三角形是最坚固的形状！它们均匀分布力。这就是桥梁、起重机和屋顶桁架使用三角形设计的原因。", ["triangle","strength","truss"]],
    ["Arches", "An arch curves upward and distributes weight outward to its supports. Ancient Romans used arches for aqueducts and buildings that still stand today!", "拱门向上弯曲并将重量向外分布到支撑物。古罗马人使用拱门建造的水道和建筑至今仍矗立！", ["arch","Roman","weight"]],
    ["Foundations", "The foundation transfers building weight to the ground. Skyscrapers need deep foundations with concrete piles going far into the earth.", "地基将建筑重量传递到地面。摩天大楼需要深地基，混凝土桩深深打入地下。", ["foundation","concrete","pile"]],
    ["Suspension Bridges", "Suspension bridges hang from steel cables between towers. The Golden Gate Bridge is a famous example. Cables pull inward to hold the road up.", "悬索桥用钢缆悬挂在塔之间。金门大桥是著名的例子。", ["suspension","bridge","cable"]],
    ["Skyscrapers", "Skyscrapers need steel frames to stand tall. The Burj Khalifa in Dubai is 828 meters tall. A special concrete core helps it resist wind.", "摩天大楼需要钢框架才能高耸入云。哈利法塔高828米。特殊混凝土核心帮助抵抗风力。", ["skyscraper","steel","wind"]],
    ["Domes", "Domes are round roofs that distribute weight evenly. The Pantheon in Rome has a concrete dome that's been standing for 1900 years!", "穹顶是均匀分布重量的圆形屋顶。罗马万神殿的混凝土穹顶已经矗立了1900年！", ["dome","roof","Pantheon"]],
    ["Earthquake Engineering", "Buildings in earthquake areas need special designs. Base isolators act like shock absorbers. Flexible structures can sway without breaking.", "地震区域的建筑需要特殊设计。基础隔震器像减震器一样工作。", ["earthquake","seismic","isolator"]],
    ["Load and Stress", "Load is the weight a structure carries. Stress is the force inside the material. Too much stress causes materials to crack or break.", "载荷是结构承受的重量。应力是材料内部的力。过多的应力会导致材料开裂或断裂。", ["load","stress","force"]],
    ["Concrete", "Concrete is made from cement, sand, gravel, and water. It's strong under compression (pushing) but weak under tension (pulling). Steel bars reinforce it.", "混凝土由水泥、沙子、砾石和水制成。它在受压时强但在受拉时弱。钢筋增强它。", ["concrete","cement","reinforce"]],
    ["Steel Structures", "Steel is strong in both compression and tension. It can be shaped into beams, columns, and frames. Steel buildings can be built very tall.", "钢材在受压和受拉时都强。它可以制成梁、柱和框架。钢建筑可以建得很高。", ["steel","metal","frame"]],
    ["Green Buildings", "Green buildings are designed to be energy-efficient and environmentally friendly. They use solar panels, green roofs, and natural ventilation.", "绿色建筑被设计为节能环保。它们使用太阳能板、绿色屋顶和自然通风。", ["green","sustainable","energy"]],
    ["Tunnels", "Tunnels are underground passages. Tunnel boring machines (TBMs) dig through rock and soil. The Channel Tunnel connects England and France!", "隧道是地下通道。隧道掘进机（TBM）挖掘岩石和土壤。英吉利海峡隧道连接英国和法国！", ["tunnel","underground","TBM"]],
    ["Dams", "Dams hold back water to create reservoirs, generate electricity, and control floods. The Hoover Dam in the USA is 221 meters tall!", "水坝阻挡水以形成水库、发电和控制洪水。美国胡佛水坝高221米！", ["dam","reservoir","hydroelectric"]],
    ["Tensile Structures", "Tensile structures use fabric stretched over frames. Stadium roofs and circus tents use this design. They're lightweight and can cover large areas.", "张拉结构使用在框架上拉伸的织物。体育场屋顶和马戏团帐篷使用这种设计。", ["tensile","fabric","lightweight"]],
    ["Construction Materials", "Different materials for different needs: wood for houses, steel for skyscrapers, glass for windows, stone for monuments. Each has unique properties.", "不同材料满足不同需求：木材用于房屋，钢材用于摩天大楼，玻璃用于窗户，石材用于纪念碑。", ["materials","wood","glass","stone"]],
    ["Truss Bridges", "Truss bridges use connected triangles to support the road. They're strong, efficient, and can span long distances using less material.", "桁架桥使用连接的三角形来支撑路面。它们坚固高效，用更少的材料跨越更长的距离。", ["truss","bridge","triangle"]],
    ["Retaining Walls", "Retaining walls hold back soil and prevent landslides. They're used on hillsides and in basements. Gravity and reinforcement keep them stable.", "挡土墙阻挡土壤防止滑坡。它们用于山坡和地下室。重力和加固保持稳定。", ["retaining wall","soil","landslide"]],
    ["Future of Construction", "3D printing builds houses layer by layer. Smart buildings adjust temperature and lighting automatically. Self-healing materials repair cracks!", "3D打印逐层建造房屋。智能建筑自动调节温度和照明。自修复材料修复裂缝！", ["3D printing","smart","self-healing"]]
  ],
  eng_aerospace: [
    ["How Planes Fly", "Four forces act on a plane: lift (up), weight (down), thrust (forward), drag (backward). Wings create lift when air flows over them.", "四个力作用于飞机：升力向上、重力向下、推力向前、阻力向后。", ["flight","lift","thrust"]],
    ["Jet Engines", "Jet engines suck in air, compress it, mix with fuel, and burn it. The hot gas shoots out the back, pushing the plane forward.", "喷气发动机吸入空气，压缩，与燃料混合并燃烧。热气体从后方喷出，推动飞机前进。", ["jet","engine","turbine"]],
    ["Airplane Parts", "Main parts: fuselage (body), wings (lift), tail (stabilizer), engines (power), landing gear (wheels), and cockpit (where pilots sit).", "主要部分：机身、机翼、尾翼、发动机、起落架和驾驶舱。", ["fuselage","wing","cockpit"]],
    ["How Rockets Work", "Rockets carry their own oxygen, so they work in space. When fuel burns with oxygen, hot gas expands and pushes the rocket upward.", "火箭自带氧气，所以能在太空工作。燃料与氧气燃烧时，热气体膨胀推动火箭向上。", ["rocket","fuel","oxygen"]],
    ["Orbits", "An orbit is a curved path around a planet. The ISS orbits Earth at 28,000 km/h! Gravity keeps satellites in orbit, like a tether.", "轨道是围绕行星的弯曲路径。ISS 以 28000 km/h 的速度绕地球飞行！", ["orbit","satellite","ISS"]],
    ["Space Stations", "The International Space Station (ISS) is a home in space where astronauts live and do science. It's as big as a football field!", "国际空间站是宇航员生活和做研究的太空之家。它有一个足球场那么大！", ["space station","ISS","astronaut"]],
    ["Mars Exploration", "Rovers like Perseverance explore Mars. They take photos, collect rocks, and search for signs of life. NASA plans to send humans to Mars!", "像毅力号这样的探测器探索火星。它们拍照、收集岩石、寻找生命迹象。", ["Mars","rover","NASA"]],
    ["Air Traffic Control", "Air traffic controllers guide planes safely. They track planes on radar and give pilots instructions for takeoff, landing, and routes.", "空中交通管制员安全引导飞机。他们用雷达跟踪飞机，给飞行员起飞、降落和航线指示。", ["ATC","radar","control"]],
    ["Helicopters", "Helicopters can take off and land vertically. Their spinning rotor blades create lift. They can hover in one place, unlike airplanes.", "直升机可以垂直起降。旋转的旋翼产生升力。与飞机不同，它们可以悬停。", ["helicopter","rotor","hover"]],
    ["Black Box", "A black box records flight data and cockpit conversations. After a plane accident, investigators use it to find out what happened.", "黑匣子记录飞行数据和驾驶舱对话。飞机事故后，调查员用它来查明原因。", ["black box","recorder","investigation"]]
  ],
  eng_automotive: [
    ["How Cars Work", "A car engine burns fuel to create power. The power goes through the transmission to turn the wheels. The steering wheel controls direction.", "汽车发动机燃烧燃料产生动力。动力通过变速箱传递到车轮。方向盘控制方向。", ["engine","transmission","steering"]],
    ["Car Engines", "Most car engines are internal combustion engines. They have cylinders where fuel and air mix and explode, pushing pistons up and down.", "大多数汽车发动机是内燃机。它们有汽缸，燃料和空气在其中混合爆炸，推动活塞上下运动。", ["engine","cylinder","piston"]],
    ["Electric Cars", "Electric cars use batteries and electric motors instead of gas engines. They're cleaner, quieter, and cheaper to run. Tesla is a famous electric car.", "电动汽车使用电池和电动机代替汽油发动机。它们更清洁、更安静、运行更便宜。", ["electric","battery","Tesla"]],
    ["Transmission", "The transmission changes how engine power reaches the wheels. Low gears give more power for climbing. High gears save fuel at high speeds.", "变速箱改变发动机动力传到车轮的方式。低挡位提供更大爬坡力，高挡位在高速时省油。", ["transmission","gear","clutch"]],
    ["Brakes", "Brakes slow the car by creating friction. Disc brakes squeeze a rotor. Drum brakes press pads against a drum. ABS prevents wheel lock-up.", "刹车通过产生摩擦力来减速。盘式刹车夹住刹车盘，鼓式刹车将刹车片压在鼓上。", ["brake","disc","ABS"]],
    ["Suspension", "Suspension absorbs bumps so the ride is smooth. Springs absorb shocks, and dampers (shock absorbers) stop the bouncing.", "悬挂系统吸收颠簸使行驶平稳。弹簧吸收震动，减震器停止弹跳。", ["suspension","spring","damper"]],
    ["Hybrid Cars", "Hybrid cars have both a gas engine and an electric motor. They switch between them to save fuel. Toyota Prius is a famous hybrid.", "混合动力汽车既有汽油发动机又有电动机。它们之间切换以节省燃料。", ["hybrid","Toyota Prius","fuel"]],
    ["Self-driving Cars", "Self-driving cars use cameras, radar, and AI to drive. They can detect lanes, traffic signs, other cars, and pedestrians.", "自动驾驶汽车使用摄像头、雷达和AI来驾驶。它们可以检测车道、交通标志、其他车辆和行人。", ["autonomous","self-driving","AI"]],
    ["Car Safety", "Safety features include airbags, seatbelts, crumple zones, and anti-lock brakes. They protect passengers during accidents.", "安全功能包括安全气囊、安全带、溃缩区和防抱死刹车。它们在事故中保护乘客。", ["safety","airbag","seatbelt"]],
    ["Car Aerodynamics", "Aerodynamics helps cars cut through air with less drag. Smooth shapes, spoilers, and underbody panels improve efficiency and speed.", "空气动力学帮助汽车以更小阻力穿过空气。流线型、扰流板和底部护板提高效率和速度。", ["aerodynamics","drag","spoiler"]]
  ],
  eng_industrial: [
    ["What is Industrial Engineering?", "Industrial engineering makes processes better. It's about finding the best way to do things - faster, cheaper, and with better quality.", "工业工程让流程变得更好。它是关于找到做事情的最佳方式——更快、更便宜、质量更好。", ["industrial","efficiency","process"]],
    ["Assembly Line", "An assembly line divides work into steps. Each worker does one task as the product moves along. Henry Ford used this to make cars affordable.", "流水线将工作分为步骤。产品移动时每个工人做一个任务。亨利福特用这种方法让汽车变得 affordable。", ["assembly line","Ford","mass production"]],
    ["Quality Control", "Quality control checks products to ensure they meet standards. Inspectors test samples from each batch. Defective items are fixed or removed.", "质量控制检查产品以确保符合标准。检验员测试每批样品。有缺陷的物品被修复或移除。", ["quality","inspection","standard"]],
    ["Lean Manufacturing", "Lean manufacturing removes waste. Waste can be extra movement, waiting time, or defects. The goal is to do more with less.", "精益制造消除浪费。浪费可以是多余的动作、等待时间或缺陷。目标是用更少做更多。", ["lean","waste","efficiency"]],
    ["Supply Chain", "A supply chain is the network that gets products from raw materials to customers. It includes suppliers, factories, warehouses, and stores.", "供应链是从原材料到客户的产品网络。包括供应商、工厂、仓库和商店。", ["supply chain","logistics","distribution"]],
    ["Automation", "Automation uses machines and computers to do repetitive tasks. It's faster, more accurate, and never gets tired. Robots are a form of automation.", "自动化使用机器和计算机做重复任务。它更快、更精确、从不疲劳。机器人是自动化的一种形式。", ["automation","robot","machine"]],
    ["Ergonomics", "Ergonomics designs workplaces to fit people. Good chairs, proper desk height, and correct tool placement prevent injuries and improve comfort.", "人体工学设计适合人的工作场所。好椅子、合适的桌子高度和正确的工具放置可以防止受伤。", ["ergonomics","comfort","safety"]],
    ["Six Sigma", "Six Sigma is a method to reduce defects. It uses data and statistics to find problems and fix them. The goal is near-perfect quality.", "六西格玛是减少缺陷的方法。它使用数据和统计来发现问题并修复。目标是近乎完美的质量。", ["Six Sigma","quality","data"]],
    ["Inventory Management", "Inventory management tracks materials and products. Just-in-time (JIT) systems order parts only when needed, reducing storage costs.", "库存管理跟踪材料和产品。准时制系统只在需要时订购零件，减少存储成本。", ["inventory","JIT","storage"]],
    ["Operations Research", "Operations research uses math to solve problems. It finds the best routes for delivery trucks, optimal factory layouts, and efficient schedules.", "运筹学用数学解决问题。它找到最佳送货路线、最优工厂布局和高效排程。", ["operations","optimization","math"]]
  ],
  eng_electrical: [
    ["What is Electrical Engineering?", "Electrical engineering deals with electricity, electronics, and electromagnetism. It powers our world - from tiny circuits to huge power grids.", "电气工程处理电、电子学和电磁学。它为我们的世界提供动力。", ["electrical","power","electronics"]],
    ["Power Generation", "Electricity is generated in power plants. Coal, gas, nuclear, hydro, wind, and solar are used to spin turbines that create electricity.", "电在发电厂产生。煤、天然气、核能、水力、风能和太阳能用于旋转涡轮发电。", ["generation","turbine","power plant"]],
    ["Transformers", "Transformers change voltage. Step-up transformers increase voltage for long-distance transmission. Step-down transformers reduce voltage for home use.", "变压器改变电压。升压变压器增加电压用于远距离传输。降压变压器降低电压用于家庭使用。", ["transformer","voltage","power"]],
    ["Electric Motors", "Electric motors convert electrical energy into motion. They power fans, washing machines, elevators, and electric cars.", "电动机将电能转化为运动。它们为风扇、洗衣机、电梯和电动汽车提供动力。", ["motor","electrical","motion"]],
    ["Generators", "Generators do the opposite of motors - they convert motion into electricity. When you pedal a bicycle generator, you create electrical power!", "发电机做与电动机相反的事——将运动转化为电。当你踩自行车发电机时，就在发电！", ["generator","electricity","motion"]],
    ["Power Grid", "The power grid is a network of transmission lines that delivers electricity from power plants to homes and businesses. It spans entire countries.", "电网是从发电厂向家庭和企业输送电力的传输线网络。它覆盖整个国家。", ["grid","transmission","distribution"]],
    ["Renewable Energy", "Renewable energy comes from natural sources that don't run out: sunlight (solar), wind, water (hydro), and geothermal heat.", "可再生能源来自不会耗尽的自然来源：阳光、风、水和地热。", ["renewable","solar","wind"]],
    ["Circuit Breakers", "Circuit breakers protect homes from electrical fires. When too much current flows, they automatically shut off the power.", "断路器保护家庭免受电气火灾。当电流过大时，它们自动切断电源。", ["circuit breaker","safety","current"]],
    ["Electrical Wiring", "Homes have three wires: live (carries power), neutral (returns power), and ground (safety). Different colors help electricians identify them.", "家庭有三根线：火线（输送电力）、零线（返回电力）和地线（安全）。不同颜色帮助电工识别。", ["wiring","live","neutral","ground"]],
    ["Smart Grid", "Smart grids use digital technology to manage electricity. They can detect outages, balance loads, and integrate renewable energy sources.", "智能电网使用数字技术管理电力。它们可以检测停电、平衡负载和整合可再生能源。", ["smart grid","digital","efficiency"]]
  ]
};

for (const [cat, topics] of Object.entries(engTopics)) {
  topics.forEach((t, i) => {
    engItems.push({
      id: `${cat}-${i+1}`,
      category: cat,
      title: t[0],
      content: t[1],
      content_zh: t[2],
      level: ['primary2','primary3','primary4'][i % 3],
      language: 'en',
      type: 'lesson',
      tags: t[3]
    });
  });
}

// ===== ARTS =====
const artItems = [];
const artTopics = {
  arts_drawing: [
    ["Basic Drawing Tools", "Drawing tools include pencils (different hardness), erasers, paper, charcoal, and pastels. Hard pencils (H) make light lines. Soft pencils (B) make dark lines.", "绘画工具包括铅笔（不同硬度）、橡皮、纸张、炭笔和粉彩。硬铅笔画出浅线，软铅笔画出深线。", ["drawing","pencil","tool"]],
    ["Sketching Basics", "Sketching starts with basic shapes. Draw circles, squares, and triangles lightly. Then refine the lines and add details. Practice every day!", "素描从基本形状开始。轻轻画圆、正方形和三角形，然后细化线条并添加细节。", ["sketch","shape","practice"]],
    ["Perspective Drawing", "Perspective makes drawings look 3D. In one-point perspective, lines meet at one point on the horizon. Roads and train tracks use this.", "透视让绘画看起来是3D的。在一点透视中，线条汇聚到地平线上的一点。", ["perspective","3D","horizon"]],
    ["Color Theory", "Primary colors: red, blue, yellow. Mix them to get secondary colors: green, orange, purple. Complementary colors are opposite on the color wheel.", "三原色：红、蓝、黄。混合得到二次色：绿、橙、紫。互补色在色轮上相对。", ["color","primary","complementary"]],
    ["Shading Techniques", "Shading adds depth. Hatching uses parallel lines. Cross-hatching uses crossing lines. Blending smudges pencil for smooth shading.", "阴影增加深度。排线使用平行线。交叉排线使用交叉线。涂抹使铅笔晕染产生平滑阴影。", ["shading","hatching","blending"]],
    ["Portrait Drawing", "Drawing faces: eyes at the halfway line, nose halfway from eyes to chin, mouth halfway from nose to chin. Practice each feature separately.", "画脸：眼睛在中线，鼻子在眼睛到下巴中间，嘴巴在鼻子到下巴中间。分别练习每个特征。", ["portrait","face","proportion"]],
    ["Landscape Drawing", "Landscapes have foreground, middle ground, and background. Objects in the distance are smaller and lighter. Use atmospheric perspective.", "风景画有前景、中景和背景。远处的物体更小更淡。使用大气透视。", ["landscape","foreground","background"]],
    ["Still Life", "Still life arranges objects like fruit, flowers, or bottles. Practice drawing shapes, shadows, and textures. Great for learning observation.", "静物画排列水果、花朵或瓶子等物体。练习画形状、阴影和纹理。", ["still life","arrangement","observation"]],
    ["Anatomy for Artists", "The human body can be drawn using simple shapes: circles for joints, ovals for limbs. The body is about 7.5 heads tall.", "人体可以用简单形状绘制：圆圈代表关节，椭圆代表四肢。身体约7.5个头高。", ["anatomy","proportion","figure"]],
    ["Cartoon Drawing", "Cartoons exaggerate features. Big eyes show surprise. Small nose looks cute. Practice drawing different expressions: happy, sad, angry, surprised.", "卡通夸张特征。大眼睛表示惊讶，小鼻子看起来很可爱。练习画不同表情。", ["cartoon","exaggeration","expression"]]
  ],
  arts_painting: [
    ["Watercolor Basics", "Watercolor uses pigment mixed with water. Paint light to dark. Wet-on-wet creates soft blends. Wet-on-dry creates sharp edges.", "水彩用水混合颜料。从浅到深画。湿画法创造柔和过渡。干画法创造清晰边缘。", ["watercolor","pigment","brush"]],
    ["Acrylic Painting", "Acrylic dries fast and can be used on many surfaces. It's like both watercolor (thin) and oil paint (thick). Clean brushes with water!", "丙烯干得快，可用于多种表面。它既像水彩（稀薄）又像油画（厚重）。用水洗刷子！", ["acrylic","paint","fast-drying"]],
    ["Oil Painting", "Oil paints dry slowly, allowing blending on canvas. Use turpentine to thin. Paint dark to light. Famous artists like Van Gogh used oil.", "油画颜料干得慢，可以在画布上混合。使用松节油稀释。从暗到亮画。梵高等著名艺术家使用油画。", ["oil","canvas","Van Gogh"]],
    ["Brush Techniques", "Different brushes make different marks. Flat brushes for broad strokes. Round brushes for details. Fan brushes for textures like grass or fur.", "不同刷子制造不同痕迹。平刷用于宽笔触。圆刷用于细节。扇形刷用于草地或毛皮等纹理。", ["brush","stroke","texture"]],
    ["Mixing Colors", "Mix colors on a palette. Start with primaries, then create secondaries and tertiaries. Keep a color chart of your favorite mixes.", "在调色板上混合颜色。从原色开始，然后创造二次色和三次色。保留你最喜欢的颜色搭配表。", ["mixing","palette","color"]],
    ["Impressionism", "Impressionists like Monet painted quick brush strokes to capture light and moment. They often painted outdoors (plein air).", "印象派画家如莫奈用快速笔触捕捉光线和瞬间。他们经常在户外作画。", ["impressionism","Monet","light"]],
    ["Abstract Art", "Abstract art doesn't try to look real. It uses colors, shapes, and textures to express feelings. Picasso and Kandinsky made famous abstract art.", "抽象艺术不试图看起来真实。它使用色彩、形状和纹理来表达感受。", ["abstract","expression","Picasso"]],
    ["Canvas Preparation", "Stretch canvas tightly over a frame. Apply gesso primer to create a smooth surface. Let it dry before painting.", "将画布紧绷在框架上。涂上底漆创造光滑表面。干燥后再画。", ["canvas","stretch","gesso"]],
    ["Painting Landscapes", "Start with sky (top), then background (mountains), middle ground (trees), and foreground (details). Use cooler colors in distance.", "从天空开始（顶部），然后是背景（山）、中景（树）和前景（细节）。远处使用冷色。", ["landscape","sky","distance"]],
    ["Art Appreciation", "Look at famous paintings and ask: What do you see? How does it make you feel? What colors did the artist use? Art tells stories without words.", "欣赏名画：你看到了什么？它让你有什么感觉？艺术家用了什么颜色？艺术用无声讲故事。", ["appreciation","famous","emotion"]]
  ],
  arts_crafts: [
    ["Paper Crafts", "Paper can be folded, cut, glued, and decorated. Origami creates 3D shapes from flat paper. Paper cutting makes beautiful patterns.", "纸张可以折叠、剪切、粘贴和装饰。折纸用平面纸创造3D形状。剪纸创造美丽图案。", ["paper","origami","cutting"]],
    ["Origami", "Origami is the Japanese art of paper folding. A square sheet becomes animals, flowers, or boxes. The classic origami crane is a symbol of peace.", "折纸是日本折纸艺术。一张方形纸变成动物、花朵或盒子。经典纸鹤是和平的象征。", ["origami","fold","crane"]],
    ["Clay Modeling", "Clay can be shaped into sculptures, pots, or jewelry. Air-dry clay hardens without baking. Polymer clay needs oven baking.", "黏土可以塑造成雕塑、陶罐或首饰。风干黏土无需烘烤即可变硬。软陶需要烤箱烘烤。", ["clay","sculpt","pottery"]],
    ["Beading", "Beading strings beads together to make jewelry, decorations, or keychains. Learn basic patterns like single-strand, braided, or patterned.", "串珠将珠子串在一起制作首饰、装饰品或钥匙扣。学习基本模式如单串、编织或图案。", ["bead","jewelry","string"]],
    ["Card Making", "Handmade cards are special for birthdays and holidays. Use colored paper, stickers, stamps, and markers. Add a personal message inside.", "手工制作的卡片在生日和节日时特别有意义。使用彩纸、贴纸、印章和马克笔。", ["card","greeting","handmade"]],
    ["Scrapbooking", "Scrapbooks preserve photos and memories. Arrange photos on pages with decorative paper, stickers, and journaling.", "剪贴簿保存照片和回忆。在页面上用装饰纸、贴纸和日记排列照片。", ["scrapbook","photo","memory"]],
    ["Weaving", "Weaving interlaces threads to make fabric. A loom holds the vertical threads (warp) while you weave horizontal threads (weft) through.", "编织将线交织制成布料。织布机固定垂直的经线，你编织水平的纬线穿过。", ["weave","thread","loom"]],
    ["Macrame", "Macrame knots cords to create patterns. Basic knots: square knot, half hitch, lark's head. Make wall hangings, plant hangers, or bracelets.", "Macrame 打结编绳创造图案。基本结：方结、半结、云雀结。制作壁挂、植物吊架或手链。", ["macrame","knot","cord"]],
    ["Recycled Crafts", "Turn trash into treasure! Use cardboard tubes, plastic bottles, egg cartons, and newspaper to make art. Good for the planet and creativity.", "变废为宝！用纸板管、塑料瓶、蛋盒和报纸做艺术。对地球和创造力都有益。", ["recycled","eco-friendly","creative"]],
    ["Seasonal Crafts", "Make decorations for each season: paper snowflakes (winter), flower crowns (spring), leaf art (fall), and seashell crafts (summer).", "为每个季节制作装饰品：纸雪花（冬）、花冠（春）、树叶艺术（秋）、贝壳手工（夏）。", ["seasonal","decoration","holiday"]]
  ],
  arts_drama: [
    ["What is Drama?", "Drama is a story performed on stage. Actors play characters. The audience watches and feels emotions. Drama is also called theater or play.", "戏剧是在舞台上表演的故事。演员扮演角色。观众观看并感受情感。", ["drama","theater","performance"]],
    ["Voice Projection", "Actors must speak loudly and clearly so everyone hears. Breathe from your diaphragm (belly). Practice saying tongue twisters!", "演员必须大声清晰地说话，让每个人都能听到。用腹部深呼吸。练习说绕口令！", ["voice","projection","diaphragm"]],
    ["Body Language", "Your body tells the story too! Posture shows confidence. Gestures show emotions. Walk, stand, and move like your character would.", "你的身体也在讲故事！姿态显示自信。手势显示情感。像你的角色那样走路、站立和移动。", ["body language","gesture","posture"]],
    ["Character Creation", "Create a character: Give them a name, age, personality, and backstory. How do they walk? Talk? What makes them happy or sad?", "创造角色：给他们名字、年龄、个性和背景故事。他们怎么走路？说话？什么让他们开心或难过？", ["character","creation","backstory"]],
    ["Improvisation", "Improv is acting without a script. You make up scenes on the spot. Say 'Yes, and...' to build on others' ideas. It's fun and creative!", '即兴表演是没有剧本的表演。当场编造场景。说「是的，而且...」来延续别人的想法。', ["improv","spontaneous","yes and"]],
    ["Stage Directions", "Stage directions tell actors where to go. Upstage (away from audience), downstage (toward audience), stage left, stage right. Learn the map!", "舞台指示告诉演员去哪里。上舞台（远离观众）、下舞台（靠近观众）、舞台左、舞台右。", ["stage","direction","blocking"]],
    ["Costume Design", "Costumes show the character's personality, time period, and social status. Choose colors, fabrics, and accessories carefully.", "服装显示角色的个性、时代和社会地位。仔细选择颜色、面料和配饰。", ["costume","design","character"]],
    ["Set Design", "The set creates the world of the play. It includes backgrounds, furniture, and props. Good set design helps tell the story visually.", "布景创造戏剧的世界。包括背景、家具和道具。好的布景设计在视觉上帮助讲故事。", ["set","design","prop"]],
    ["Script Reading", "Reading scripts helps you understand story structure. Notice the beginning (setup), middle (conflict), and end (resolution).", "读剧本帮助你理解故事结构。注意开始（设定）、中间（冲突）和结束（解决）。", ["script","structure","reading"]],
    ["Stage Fright", "Stage fright is nervousness before performing. Prepare well, breathe deeply, and remember the audience wants you to succeed!", "舞台恐惧是表演前的紧张。充分准备、深呼吸，记住观众希望你成功！", ["stage fright","nervous","confidence"]]
  ],
  arts_sculpture: [
    ["What is Sculpture?", "Sculpture is 3D art. It can be carved (removing material) or modeled (adding material). Materials include stone, wood, clay, metal, and ice.", "雕塑是3D艺术。可以是雕刻（去除材料）或塑造（添加材料）。", ["sculpture","3D","carve"]],
    ["Clay Sculpting", "Start with a lump of clay. Pinch, coil, and slab techniques shape it. Use tools to add texture and details. Let it dry before painting.", "从一块黏土开始。捏、卷和板的技术塑造它。用工具添加纹理和细节。", ["clay","sculpt","pottery"]],
    ["Wire Sculpture", "Bend wire into shapes to create line sculptures. Use pliers to twist and connect pieces. Wire can make people, animals, or abstract forms.", "将金属丝弯曲成形状创作线条雕塑。用钳子扭转和连接片段。", ["wire","bend","line"]],
    ["Paper Mache", "Mix flour and water to make paste. Dip newspaper strips in paste and layer over a form. When dry, paint and decorate.", "混合面粉和水制成浆糊。将报纸条浸入浆糊后层层覆盖在模型上。干燥后涂色装饰。", ["paper mache","paste","newspaper"]],
    ["Stone Carving", "Stone carving removes material to reveal a form. Use chisels and hammers. Start with soft stone like soapstone or alabaster.", "石雕去除材料展现形状。使用凿子和锤子。从软石如皂石或雪花石膏开始。", ["stone","carve","chisel"]],
    ["Wood Carving", "Wood carving uses gouges, chisels, and knives. Always carve away from your body. Different woods have different grain and hardness.", "木雕使用弧口凿、凿子和刀。始终远离身体雕刻。不同木材有不同的纹理和硬度。", ["wood","carve","grain"]],
    ["Assemblage", "Assemblage art creates sculpture from found objects. Glue, wire, or screw together buttons, keys, toys, and recycled materials.", "集合艺术用现成物品创作雕塑。用胶水、金属丝或螺丝将纽扣、钥匙、玩具和回收材料组合。", ["assemblage","found object","recycled"]],
    ["Kinetic Sculpture", "Kinetic sculpture moves! Wind, motors, or hands make it move. Alexander Calder invented the mobile - a hanging kinetic sculpture.", "动态雕塑会移动！风、马达或手让它动起来。Alexander Calder 发明了动态雕塑。", ["kinetic","motion","Calder"]],
    ["Relief Sculpture", "Relief sculpture projects from a flat background. High relief stands out a lot. Low relief (bas-relief) stands out just a little, like on coins.", "浮雕从平坦背景上凸起。高浮雕凸起很多。低浮雕凸起一点点，像硬币上的图案。", ["relief","bas-relief","background"]],
    ["Finishing and Sealing", "Protect your sculpture with sealants. Varnish for clay, wax for stone, paint for wood. Sealing prevents damage from dust and moisture.", "用封闭剂保护你的雕塑。黏土用清漆，石头用蜡，木材用漆。封闭防止灰尘和湿气损坏。", ["sealant","varnish","protection"]]
  ]
};

for (const [cat, topics] of Object.entries(artTopics)) {
  topics.forEach((t, i) => {
    artItems.push({
      id: `${cat.split('_')[1]}-${i+1}`,
      category: cat,
      title: t[0],
      content: t[1],
      content_zh: t[2],
      level: 'primary3',
      language: 'en',
      type: 'lesson',
      tags: t[3]
    });
  });
}

// ===== MUSIC =====
const musicItems = [];
const musicTopics = {
  music_rhymes: [
    ["Twinkle Twinkle Little Star", "Twinkle twinkle little star, how I wonder what you are! Up above the world so high, like a diamond in the sky.", "", ["nursery","rhyme","star"]],
    ["Row Row Row Your Boat", "Row row row your boat, gently down the stream. Merrily merrily merrily merrily, life is but a dream.", "", ["nursery","boat","stream"]],
    ["Mary Had a Little Lamb", "Mary had a little lamb, its fleece was white as snow. And everywhere that Mary went, the lamb was sure to go.", "", ["nursery","lamb","Mary"]],
    ["London Bridge", "London Bridge is falling down, falling down, falling down. London Bridge is falling down, my fair lady.", "", ["nursery","bridge","London"]],
    ["Old MacDonald", "Old MacDonald had a farm, E-I-E-I-O. And on his farm he had a cow, E-I-E-I-O. With a moo-moo here and a moo-moo there.", "", ["nursery","farm","animals"]],
    ["Itsy Bitsy Spider", "The itsy bitsy spider climbed up the water spout. Down came the rain and washed the spider out. Out came the sun and dried up all the rain.", "", ["nursery","spider","rain"]],
    ["Humpty Dumpty", "Humpty Dumpty sat on a wall. Humpty Dumpty had a great fall. All the king's horses and all the king's men couldn't put Humpty together again.", "", ["nursery","egg","wall"]],
    ["Baa Baa Black Sheep", "Baa baa black sheep, have you any wool? Yes sir, yes sir, three bags full! One for the master, one for the dame, and one for the little boy who lives down the lane.", "", ["nursery","sheep","wool"]],
    ["Five Little Ducks", "Five little ducks went out to play, over the hills and far away. Mother duck said quack quack quack, but only four little ducks came back.", "", ["nursery","ducks","counting"]],
    ["Head Shoulders Knees and Toes", "Head shoulders knees and toes, knees and toes. Head shoulders knees and toes, knees and toes. Eyes and ears and mouth and nose. Head shoulders knees and toes.", "", ["nursery","body","actions"]],
    ["If You're Happy and You Know It", "If you're happy and you know it, clap your hands! If you're happy and you know it, then your face will surely show it. If you're happy and you know it, clap your hands!", "", ["nursery","happy","clap"]],
    ["Wheels on the Bus", "The wheels on the bus go round and round, round and round, round and round. The wheels on the bus go round and round, all through the town.", "", ["nursery","bus","wheels"]],
    ["Incy Wincy Spider", "Incy Wincy spider climbed up the water spout. Down came the rain and washed the spider out. Out came the sun and dried up all the rain. Incy Wincy spider climbed up again.", "", ["nursery","spider","weather"]],
    ["Rock-a-bye Baby", "Rock-a-bye baby on the tree top. When the wind blows the cradle will rock. When the bough breaks the cradle will fall. And down will come baby cradle and all.", "", ["nursery","lullaby","baby"]],
    ["Hickory Dickory Dock", "Hickory dickory dock, the mouse ran up the clock. The clock struck one, the mouse ran down. Hickory dickory dock.", "", ["nursery","clock","mouse"]],
    ["Jack and Jill", "Jack and Jill went up the hill to fetch a pail of water. Jack fell down and broke his crown. And Jill came tumbling after.", "", ["nursery","hill","water"]],
    ["Little Bo Peep", "Little Bo Peep has lost her sheep and doesn't know where to find them. Leave them alone and they'll come home, wagging their tails behind them.", "", ["nursery","sheep","lost"]],
    ["Hey Diddle Diddle", "Hey diddle diddle, the cat and the fiddle. The cow jumped over the moon. The little dog laughed to see such sport. And the dish ran away with the spoon.", "", ["nursery","cat","moon"]],
    ["Little Miss Muffet", "Little Miss Muffet sat on a tuffet, eating her curds and whey. Along came a spider who sat down beside her. And frightened Miss Muffet away.", "", ["nursery","spider","frightened"]],
    ["Three Blind Mice", "Three blind mice, three blind mice. See how they run, see how they run. They all ran after the farmer's wife. Who cut off their tails with a carving knife.", "", ["nursery","mice","run"]]
  ],
  music_instruments: [
    ["Piano", "The piano has 88 keys - 52 white and 36 black. Pressing keys makes hammers strike strings inside. It's called the 'King of Instruments'.", "钢琴有88个键——52白键和36黑键。按键使内部音锤击弦。被称为'乐器之王'。", ["piano","keyboard","strings"]],
    ["Guitar", "The guitar has 6 strings. Strum or pluck strings to make sound. Frets on the neck change the pitch. Types: acoustic, electric, classical.", "吉他有6根弦。弹拨或扫弦发声。琴颈上的品改变音高。类型：原声、电声、古典。", ["guitar","strings","strum"]],
    ["Violin", "The violin is the smallest string instrument. Play with a bow (arco) or pluck (pizzicato). It has 4 strings: G, D, A, E. Called the 'Queen of Instruments'.", "小提琴是最小的弦乐器。用弓拉奏或拨奏。有四根弦：G D A E。被称为'乐器皇后'。", ["violin","bow","strings"]],
    ["Drums", "Drums are percussion instruments. A drum kit has: snare, bass drum, hi-hat, cymbals, and tom-toms. Drumsticks hit the surfaces to make rhythm.", "鼓是打击乐器。一套鼓包括：军鼓、低音鼓、踩镲、钹和通鼓。鼓槌敲击表面产生节奏。", ["drum","percussion","rhythm"]],
    ["Flute", "The flute is a woodwind instrument. You blow across the mouthpiece. Covering holes changes the pitch. It makes a high, clear sound.", "长笛是木管乐器。对着吹口吹气。覆盖音孔改变音高。发出高亢清晰的声音。", ["flute","wind","woodwind"]],
    ["Trumpet", "The trumpet is a brass instrument. Buzz your lips into the mouthpiece. Pressing valves changes the pitch. It makes a bright, powerful sound.", "小号是铜管乐器。对着吹嘴振动嘴唇。按阀改变音高。发出明亮有力的声音。", ["trumpet","brass","valve"]],
    ["Cello", "The cello is larger than a violin and has a deeper sound. Play sitting down with the cello between your knees. It has 4 strings: C, G, D, A.", "大提琴比小提琴大，声音更深沉。坐着演奏，大提琴在膝间。有四根弦：C G D A。", ["cello","strings","deep"]],
    ["Saxophone", "The saxophone is a woodwind instrument made of brass. It uses a reed mouthpiece. Types: alto, tenor, soprano, baritone. Common in jazz.", "萨克斯管是黄铜制的木管乐器。使用簧片吹嘴。类型：中音、次中音、高音、低音。常见于爵士乐。", ["saxophone","reed","jazz"]],
    ["Harp", "The harp has strings stretched across a frame. Pluck strings with fingers. It has 47 strings and 7 pedals. It makes a beautiful, gentle sound.", "竖琴有琴弦在框架上拉伸。用手指拨弦。有47根弦和7个踏板。发出优美柔和的声音。", ["harp","strings","pluck"]],
    ["Accordion", "The accordion has a keyboard on one side and buttons on the other. Push and pull the bellows to make air flow through reeds. Common in folk music.", "手风琴一侧有键盘，另一侧有按钮。推拉风箱使空气流过簧片。常见于民间音乐。", ["accordion","bellows","folk"]],
    ["Maracas", "Maracas are rattles made from gourds or plastic. Shake them to make a rhythmic sound. They come from Latin American music.", "沙锤是由葫芦或塑料制成的摇铃。摇晃它们产生节奏声音。来自拉丁美洲音乐。", ["maracas","shaker","Latin"]],
    ["Xylophone", "The xylophone has wooden bars of different sizes. Hit bars with mallets. Longer bars make lower sounds. Shorter bars make higher sounds.", "木琴有不同大小的木条。用槌敲击木条。长条声音低，短条声音高。", ["xylophone","bars","mallet"]],
    ["Harmonica", "The harmonica is a small instrument you hold to your mouth. Blow or draw air through holes. Common in blues, folk, and rock music.", "口琴是放在嘴边的小乐器。通过音孔吹气或吸气。常见于蓝调、民谣和摇滚音乐。", ["harmonica","mouth","blues"]],
    ["Bass Guitar", "The bass guitar has 4 thick strings. It plays low notes that provide the rhythm foundation. Used in rock, pop, jazz, and funk.", "贝斯吉他有4根粗弦。演奏低音提供节奏基础。用于摇滚、流行、爵士和放克音乐。", ["bass","guitar","low"]],
    ["Clarinet", "The clarinet uses a single reed. Cover holes and press keys to change notes. It has a rich, warm sound. Used in classical and jazz music.", "单簧管使用单簧片。覆盖音孔和按键改变音符。音色丰富温暖。用于古典和爵士乐。", ["clarinet","reed","woodwind"]],
    ["Tambourine", "The tambourine is a small drum with jingling metal discs. Shake or hit it. Used in many types of music from folk to rock.", "铃鼓是有叮当作响金属片的小鼓。摇晃或敲击。用于从民谣到摇滚的多种音乐。", ["tambourine","jingle","percussion"]],
    ["Organ", "The organ is like a giant piano. It has multiple keyboards (manuals) and foot pedals. Air blows through pipes to make sound. Found in churches.", "管风琴像巨大的钢琴。有多个键盘和脚键盘。空气吹过音管发声。常见于教堂。", ["organ","pipe","keyboard"]],
    ["Ukulele", "The ukulele is a small guitar-like instrument from Hawaii. It has 4 strings. Easy to learn and fun to play! Sounds happy and cheerful.", "尤克里里是来自夏威夷的小型吉他状乐器。有4根弦。易学好玩！声音快乐欢快。", ["ukulele","Hawaii","small"]],
    ["French Horn", "The French horn is a brass instrument with coiled tubes. The right hand goes inside the bell to control sound. It has a warm, mellow tone.", "圆号是有螺旋管的铜管乐器。右手放入喇叭口控制声音。音色温暖圆润。", ["French horn","brass","coiled"]],
    ["Electronic Keyboard", "Electronic keyboards can sound like many instruments. They have built-in rhythms, backing tracks, and recording features. Great for learning music!", "电子琴可以发出多种乐器的声音。有内置节奏、伴奏和录音功能。学习音乐的好工具！", ["keyboard","electronic","synthesizer"]]
  ],
  music_singing: [
    ["Breathing for Singing", "Good singing starts with good breathing. Breathe from your diaphragm (belly). Feel your stomach expand, not your chest. Control your breath as you sing.", "好的歌唱从好的呼吸开始。用腹部呼吸。感觉肚子鼓起而不是胸部。唱歌时控制呼吸。", ["breathing","diaphragm","control"]],
    ["Warm Up Your Voice", "Always warm up before singing. Hum gently. Do lip trills (brrr). Sing scales: do-re-mi-fa-so-la-ti-do. Warm ups prevent voice strain.", "唱歌前一定要热身。轻轻哼唱。做嘴唇颤音。唱音阶。热身防止声带疲劳。", ["warm up","voice","scales"]],
    ["Pitch and Tone", "Pitch is how high or low a note is. Tone is the quality of your sound. Practice matching pitch with a piano or tuning app.", "音高是音符的高低。音色是你声音的质量。用钢琴或调音应用练习匹配音高。", ["pitch","tone","matching"]],
    ["Singing with Emotion", "Great singers tell a story. Feel the song's emotion. Use your face and body to express it. Happy songs sound bright. Sad songs sound soft.", "优秀的歌手讲述故事。感受歌曲的情感。用表情和身体表达。快乐的歌明亮，悲伤的歌柔和。", ["emotion","expression","story"]],
    ["Your Vocal Range", "Your vocal range is the notes you can sing comfortably. Find your range by singing from low to high. Soprano, alto, tenor, bass are voice types.", "你的音域是你能舒适唱出的音符。从低到高唱找到音域。女高音、女低音、男高音、男低音是声部类型。", ["vocal range","voice type","register"]],
    ["Diction in Singing", "Clear words make your song understandable. Practice consonants (B, P, T, K) and vowels (A, E, I, O, U). Sing tongue twisters!", "清晰的歌词让听众理解你的歌。练习辅音和元音。唱绕口令！", ["diction","pronunciation","clear"]],
    ["Harmony", "Harmony is singing different notes that sound good together. Two or more voices sing different pitches at the same time. Start with simple thirds.", "和声是唱不同的音符，它们在一起听起来很好。两个或更多声音同时唱不同音高。", ["harmony","voice","third"]],
    ["Microphone Technique", "Hold the mic close but not touching your mouth. Sing across the mic, not directly into it. Practice distance for loud and soft parts.", "握住麦克风靠近但不接触嘴巴。对着麦克风侧面唱，不要直接对着顶部。练习远近控制音量。", ["microphone","technique","distance"]],
    ["Performance Skills", "Look at the audience. Stand confidently. Move naturally. Connect with your listeners. Practice in front of a mirror or record yourself.", "看着观众。自信站立。自然移动。与听众连接。在镜子前练习或录下自己。", ["performance","audience","confidence"]],
    ["Practice Routine", "Practice 15-30 minutes daily. Start with warm ups. Practice difficult parts slowly. Record and listen to yourself. Celebrate small improvements!", "每天练习15-30分钟。从热身开始。慢慢练习困难部分。录下自己听。庆祝小的进步！", ["practice","routine","improvement"]]
  ],
  music_classical: [
    ["Beethoven", "Ludwig van Beethoven (1770-1827) was a German composer. He wrote famous pieces like Symphony No.5 and Für Elise. He continued composing even after losing his hearing!", "贝多芬是德国作曲家。他创作了第五交响曲和致爱丽丝等著名作品。他在失聪后仍坚持作曲！", ["Beethoven","symphony","composer"]],
    ["Mozart", "Wolfgang Amadeus Mozart (1756-1791) was a child prodigy. He started composing at age 5! He wrote over 600 works including operas, symphonies, and concertos.", "莫扎特是神童。5岁开始作曲！他创作了600多部作品，包括歌剧、交响曲和协奏曲。", ["Mozart","prodigy","opera"]],
    ["Bach", "Johann Sebastian Bach (1685-1750) was a German composer and organist. His complex fugues and chorales are masterpieces of the Baroque period.", "巴赫是德国作曲家和管风琴家。他的复杂赋格曲和赞美诗是巴洛克时期的杰作。", ["Bach","Baroque","organ"]],
    ["Tchaikovsky", "Pyotr Ilyich Tchaikovsky (1840-1893) was a Russian composer. Famous for Swan Lake, The Nutcracker, and 1812 Overture. His music is full of emotion.", "柴可夫斯基是俄罗斯作曲家。以天鹅湖、胡桃夹子和1812序曲闻名。他的音乐充满情感。", ["Tchaikovsky","ballet","Russian"]],
    ["Vivaldi", "Antonio Vivaldi (1678-1741) was an Italian composer and violinist. The Four Seasons is his most famous work - four violin concertos for each season.", "维瓦尔第是意大利作曲家和小提琴家。四季是他最著名的作品。", ["Vivaldi","Four Seasons","violin"]],
    ["Chopin", "Frédéric Chopin (1810-1849) was a Polish composer and pianist. He wrote beautiful piano pieces like nocturnes, waltzes, and études. Known as the 'poet of the piano'.", "肖邦是波兰作曲家和钢琴家。他创作了优美的夜曲、华尔兹和练习曲。被称为'钢琴诗人'。", ["Chopin","piano","nocturne"]],
    ["Haydn", "Joseph Haydn (1732-1809) was an Austrian composer. He helped develop the symphony and string quartet forms. Called the 'Father of the Symphony'.", "海顿是奥地利作曲家。他帮助发展了交响曲和弦乐四重奏形式。被称为'交响曲之父'。", ["Haydn","symphony","classical"]],
    ["Debussy", "Claude Debussy (1862-1918) was a French composer. His impressionist style used unusual scales and harmonies. Clair de Lune (Moonlight) is famous.", "德彪西是法国作曲家。他的印象派风格使用不寻常的音阶和和声。月光曲很著名。", ["Debussy","impressionist","French"]],
    ["Strauss", "Johann Strauss II (1825-1899) was the 'Waltz King'. He wrote The Blue Danube waltz. His music is graceful, lively, and perfect for dancing.", "小约翰·施特劳斯是'华尔兹之王'。他创作了蓝色多瑙河华尔兹。他的音乐优雅活泼。", ["Strauss","waltz","Vienna"]],
    ["Rachmaninoff", "Sergei Rachmaninoff (1873-1943) was a Russian composer and virtuoso pianist. His piano concertos are among the most challenging ever written!", "拉赫玛尼诺夫是俄罗斯作曲家和钢琴大师。他的钢琴协奏曲是有史以来最具挑战性的之一！", ["Rachmaninoff","piano","concerto"]]
  ]
};

for (const [cat, topics] of Object.entries(musicTopics)) {
  topics.forEach((t, i) => {
    musicItems.push({
      id: `${cat.split('_')[1]}-${i+1}`,
      category: cat,
      title: t[0],
      content: t[1] || `${t[0]} lyrics: ${t[2] || ''}`,
      content_zh: t[2] || '',
      level: 'primary1',
      language: 'en',
      type: cat === 'music_rhymes' ? 'song' : 'lesson',
      tags: t[3]
    });
  });
}

// Write files
fs.writeFileSync(path.join(dataDir, 'content-tech.json'), JSON.stringify(techItems, null, 2));
fs.writeFileSync(path.join(dataDir, 'content-engineering.json'), JSON.stringify(engItems, null, 2));
fs.writeFileSync(path.join(dataDir, 'content-arts.json'), JSON.stringify(artItems, null, 2));
fs.writeFileSync(path.join(dataDir, 'content-music.json'), JSON.stringify(musicItems, null, 2));

console.log('Tech items:', techItems.length);
console.log('Engineering items:', engItems.length);
console.log('Arts items:', artItems.length);
console.log('Music items:', musicItems.length);
console.log('Total new items:', techItems.length + engItems.length + artItems.length + musicItems.length);
