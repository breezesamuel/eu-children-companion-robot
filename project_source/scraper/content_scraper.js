const PexelsAPI = require('./pexels_api');
const BrowserScraper = require('./browser_scraper');
const ProxyManager = require('./proxy_manager');
const CaptchaHandler = require('./captcha_handler');

class ContentScraper {
    constructor(options = {}) {
        this.pexels = new PexelsAPI(options.pexelsApiKey);
        this.browser = null;
        this.proxyManager = new ProxyManager();
        this.captchaHandler = new CaptchaHandler(options.captchaApiKeys);
        this.isInitialized = false;
        this.stats = {
            photosFetched: 0,
            videosFetched: 0,
            pagesScraped: 0,
            errors: 0
        };
    }

    async initialize(proxyEnabled = false) {
        try {
            if (proxyEnabled) {
                await this.proxyManager.fetchFreeProxies();
                await this.proxyManager.validateAllProxies();
                console.log(`Proxy manager initialized with ${this.proxyManager.getProxiesCount().valid} valid proxies`);
            }

            this.isInitialized = true;
            console.log('Content scraper initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize content scraper:', error.message);
            return false;
        }
    }

    async fetchEducationalImages(query, count = 10) {
        try {
            const result = await this.pexels.searchPhotos(query, count);
            this.stats.photosFetched += result.photos?.length || 0;
            
            return result.photos?.map(photo => ({
                id: photo.id,
                url: photo.url,
                src: photo.src?.medium || photo.src?.large || photo.src?.original,
                thumbnail: photo.src?.tiny,
                photographer: photo.photographer,
                photographerUrl: photo.photographer_url,
                alt: photo.alt || query
            })) || [];
        } catch (error) {
            this.stats.errors++;
            console.error('Failed to fetch images:', error.message);
            return [];
        }
    }

    async fetchEducationalVideos(query, count = 5) {
        try {
            const result = await this.pexels.searchVideos(query, count);
            this.stats.videosFetched += result.videos?.length || 0;
            
            return result.videos?.map(video => ({
                id: video.id,
                url: video.url,
                thumbnail: video.image,
                duration: video.duration,
                width: video.width,
                height: video.height,
                files: video.video_files?.map(f => ({
                    quality: f.quality,
                    fileType: f.file_type,
                    link: f.link
                })) || []
            })) || [];
        } catch (error) {
            this.stats.errors++;
            console.error('Failed to fetch videos:', error.message);
            return [];
        }
    }

    async scrapeEducationalWebsite(url, options = {}) {
        const browserOptions = {
            headless: options.headless !== undefined ? options.headless : true
        };

        if (options.useProxy && this.proxyManager.getProxiesCount().valid > 0) {
            browserOptions.proxy = this.proxyManager.getNextProxy();
        }

        const scraper = new BrowserScraper(browserOptions);
        let result = {
            success: false,
            title: '',
            content: '',
            links: [],
            images: [],
            error: ''
        };

        try {
            await scraper.launch();
            await scraper.navigate(url);

            await scraper.waitForTimeout(2000);

            if (options.bypassCloudflare) {
                await this.captchaHandler.bypassCloudflare(scraper.page);
            }

            result.title = await scraper.getElementText('title') || '';
            
            const contentSelectors = ['article', '.article-content', '.content', 'main', 'body'];
            for (const selector of contentSelectors) {
                const text = await scraper.getElementText(selector);
                if (text && text.length > 100) {
                    result.content = text.substring(0, 5000);
                    break;
                }
            }

            result.links = await scraper.extractLinks();
            result.images = await scraper.extractImages();
            result.success = true;
            this.stats.pagesScraped++;

        } catch (error) {
            result.error = error.message;
            this.stats.errors++;
            console.error('Scraping failed:', error.message);
        } finally {
            await scraper.close();
        }

        return result;
    }

    async scrapeWikipedia(topic) {
        const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(topic)}`;
        return await this.scrapeEducationalWebsite(url, {
            bypassCloudflare: false,
            headless: true
        });
    }

    async scrapeKidsWikipedia(topic) {
        const url = `https://kids.kiddle.co/${encodeURIComponent(topic)}`;
        return await this.scrapeEducationalWebsite(url, {
            bypassCloudflare: false,
            headless: true
        });
    }

    async scrapeNationalGeographicKids(topic) {
        const url = `https://kids.nationalgeographic.com/search?q=${encodeURIComponent(topic)}`;
        return await this.scrapeEducationalWebsite(url, {
            bypassCloudflare: false,
            headless: true
        });
    }

    async scrapeScienceKids(topic) {
        const url = `https://www.sciencekids.co.nz/search.html?q=${encodeURIComponent(topic)}`;
        return await this.scrapeEducationalWebsite(url, {
            bypassCloudflare: false,
            headless: true
        });
    }

    async generateMathProblems(count = 10, type = 'addition') {
        const problems = [];
        const operations = {
            addition: { symbol: '+', func: (a, b) => a + b },
            subtraction: { symbol: '-', func: (a, b) => a - b },
            multiplication: { symbol: '×', func: (a, b) => a * b },
            division: { symbol: '÷', func: (a, b) => Math.floor(a / b) }
        };

        const op = operations[type] || operations.addition;

        for (let i = 0; i < count; i++) {
            const num1 = Math.floor(Math.random() * 100) + 1;
            const num2 = type === 'division' 
                ? Math.floor(Math.random() * 12) + 1
                : Math.floor(Math.random() * 100) + 1;
            
            const answer = type === 'division' 
                ? Math.floor(num1 / num2)
                : op.func(num1, num2);

            problems.push({
                id: i + 1,
                question: `${num1} ${op.symbol} ${num2} = ?`,
                answer: answer,
                type: type,
                difficulty: num1 + num2 > 100 ? 'hard' : num1 + num2 > 50 ? 'medium' : 'easy'
            });
        }

        return problems;
    }

    async generateVocabularyWords(count = 10, category = 'general') {
        const vocabByCategory = {
            animals: [
                { word: 'elephant', meaning: 'A large mammal with a trunk', example: 'The elephant drank water from the pond.' },
                { word: 'giraffe', meaning: 'A tall animal with a long neck', example: 'The giraffe reached the leaves on the tall tree.' },
                { word: 'penguin', meaning: 'A flightless bird that swims', example: 'Penguins live in cold places like Antarctica.' },
                { word: 'tiger', meaning: 'A large striped cat', example: 'The tiger hunted for food in the jungle.' },
                { word: 'dolphin', meaning: 'A smart marine mammal', example: 'The dolphin jumped out of the water.' },
                { word: 'butterfly', meaning: 'An insect with colorful wings', example: 'The butterfly fluttered from flower to flower.' },
                { word: 'octopus', meaning: 'A sea creature with eight arms', example: 'The octopus changed color to hide.' },
                { word: 'koala', meaning: 'A marsupial that eats eucalyptus', example: 'The koala slept in the tree.' },
                { word: 'crocodile', meaning: 'A large reptile with sharp teeth', example: 'The crocodile waited in the water.' },
                { word: 'owl', meaning: 'A nocturnal bird of prey', example: 'The owl hooted in the night.' }
            ],
            food: [
                { word: 'vegetable', meaning: 'A plant used as food', example: 'Eat your vegetables to stay healthy.' },
                { word: 'fruit', meaning: 'The sweet part of a plant', example: 'Apples and bananas are my favorite fruit.' },
                { word: 'protein', meaning: 'A nutrient for building muscles', example: 'Chicken and beans are good sources of protein.' },
                { word: 'breakfast', meaning: 'The first meal of the day', example: 'I eat cereal for breakfast.' },
                { word: 'dessert', meaning: 'A sweet food after a meal', example: 'We had ice cream for dessert.' },
                { word: 'recipe', meaning: 'Instructions for cooking', example: 'Follow the recipe to make cookies.' },
                { word: 'ingredient', meaning: 'Something used to make food', example: 'Flour is an ingredient in bread.' },
                { word: 'delicious', meaning: 'Tasting very good', example: 'The cake was delicious!' },
                { word: 'hungry', meaning: 'Wanting food', example: 'I am hungry after playing.' },
                { word: 'cook', meaning: 'To prepare food', example: 'My mom will cook dinner.' }
            ],
            nature: [
                { word: 'mountain', meaning: 'A very tall land form', example: 'We climbed the mountain.' },
                { word: 'river', meaning: 'A flowing body of water', example: 'The river flows to the sea.' },
                { word: 'forest', meaning: 'A large area of trees', example: 'We went hiking in the forest.' },
                { word: 'flower', meaning: 'The colorful part of a plant', example: 'The flower bloomed in spring.' },
                { word: 'sunshine', meaning: 'Sunlight', example: 'We played in the sunshine.' },
                { word: 'rainbow', meaning: 'Colors in the sky after rain', example: 'We saw a rainbow after the storm.' },
                { word: 'cloud', meaning: 'Water vapor in the sky', example: 'The cloud looked like a sheep.' },
                { word: 'wind', meaning: 'Moving air', example: 'The wind blew the leaves.' },
                { word: 'snow', meaning: 'Frozen water crystals', example: 'It snowed all night.' },
                { word: 'leaf', meaning: 'The flat part of a plant', example: 'The leaf fell from the tree.' }
            ],
            general: [
                { word: 'happy', meaning: 'Feeling joy', example: 'I am happy today!' },
                { word: 'friend', meaning: 'A person you like', example: 'My friend came to play.' },
                { word: 'school', meaning: 'A place to learn', example: 'I go to school every day.' },
                { word: 'book', meaning: 'A collection of pages', example: 'I read a book before bed.' },
                { word: 'play', meaning: 'To have fun', example: 'Let\'s play outside.' },
                { word: 'learn', meaning: 'To gain knowledge', example: 'I learn new things every day.' },
                { word: 'family', meaning: 'People related to you', example: 'I love my family.' },
                { word: 'home', meaning: 'Where you live', example: 'Welcome to my home.' },
                { word: 'love', meaning: 'Strong affection', example: 'I love my parents.' },
                { word: 'kind', meaning: 'Nice and helpful', example: 'Be kind to others.' }
            ]
        };

        const words = vocabByCategory[category] || vocabByCategory.general;
        const shuffled = [...words].sort(() => Math.random() - 0.5);
        
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    async getScienceFacts(count = 5) {
        const facts = [
            { topic: 'astronomy', fact: 'The Sun is a star, not a planet. It is the center of our solar system.' },
            { topic: 'biology', fact: 'Humans have about 100 trillion cells in their body.' },
            { topic: 'chemistry', fact: 'Water is made of two hydrogen atoms and one oxygen atom (H2O).' },
            { topic: 'physics', fact: 'Gravity keeps us on the Earth and keeps the planets orbiting the Sun.' },
            { topic: 'geology', fact: 'The Earth has four layers: crust, mantle, outer core, and inner core.' },
            { topic: 'botany', fact: 'Plants make their own food through a process called photosynthesis.' },
            { topic: 'zoology', fact: 'Butterflies go through a life cycle called metamorphosis.' },
            { topic: 'oceanography', fact: 'The ocean covers about 71% of the Earth\'s surface.' },
            { topic: 'meteorology', fact: 'Lightning is hotter than the surface of the Sun!' },
            { topic: 'paleontology', fact: 'Dinosaurs lived on Earth for about 165 million years.' },
            { topic: 'astronomy', fact: 'There are more stars in the universe than grains of sand on all beaches.' },
            { topic: 'biology', fact: 'A honeybee can fly up to 15 miles per hour.' },
            { topic: 'chemistry', fact: 'Pure gold is so soft you can bend it with your hands.' },
            { topic: 'physics', fact: 'Sound travels faster through water than through air.' },
            { topic: 'geology', fact: 'Mount Everest is the highest mountain in the world.' }
        ];

        const shuffled = [...facts].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    async getEuropeanFacts(count = 5) {
        const facts = [
            { country: 'France', fact: 'The Eiffel Tower was originally built as a temporary structure for the 1889 World\'s Fair.' },
            { country: 'Germany', fact: 'Germany has over 300 types of bread!' },
            { country: 'United Kingdom', fact: 'Big Ben is actually the name of the bell, not the clock tower. The tower is called Elizabeth Tower.' },
            { country: 'Italy', fact: 'Pizza was invented in Naples, Italy in the 18th century.' },
            { country: 'Spain', fact: 'Spain has the most UNESCO World Heritage Sites of any country.' },
            { country: 'Netherlands', fact: 'Over 25% of the Netherlands is below sea level.' },
            { country: 'Switzerland', fact: 'Switzerland has four official languages: German, French, Italian, and Romansh.' },
            { country: 'Greece', fact: 'The Olympic Games originated in ancient Greece.' },
            { country: 'Austria', fact: 'Mozart was born in Salzburg, Austria.' },
            { country: 'Scotland', fact: 'Scotland has over 790 islands!' },
            { country: 'Ireland', fact: 'The Irish consume more tea per capita than any other country.' },
            { country: 'Portugal', fact: 'Portugal is the westernmost country in Europe.' },
            { country: 'Belgium', fact: 'Belgium invented French fries (though they are called "frites" there).' },
            { country: 'Denmark', fact: 'Denmark is the happiest country in the world according to the World Happiness Report.' },
            { country: 'Norway', fact: 'Norway has the longest fjord in the world, the Sognefjord.' }
        ];

        const shuffled = [...facts].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    getStats() {
        return this.stats;
    }

    resetStats() {
        this.stats = {
            photosFetched: 0,
            videosFetched: 0,
            pagesScraped: 0,
            errors: 0
        };
    }
}

module.exports = ContentScraper;