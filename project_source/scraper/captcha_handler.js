const axios = require('axios');

class CaptchaHandler {
    constructor(options = {}) {
        const apiKeys = options.apiKeys || {};
        this.services = {
            '2captcha': apiKeys.captcha2 || null,
            'antiCaptcha': apiKeys.antiCaptcha || null,
            'deathByCaptcha': apiKeys.deathByCaptcha || null
        };
    }

    async solveRecaptchaV2(siteKey, pageUrl, service = '2captcha') {
        const apiKey = this.services[service];
        if (!apiKey) {
            console.error(`No API key provided for ${service}`);
            return null;
        }

        try {
            switch (service) {
                case '2captcha':
                    return await this.solveWith2Captcha(siteKey, pageUrl, '6');
                case 'antiCaptcha':
                    return await this.solveWithAntiCaptcha(siteKey, pageUrl);
                default:
                    return null;
            }
        } catch (error) {
            console.error('Failed to solve reCAPTCHA:', error.message);
            return null;
        }
    }

    async solveRecaptchaV3(siteKey, pageUrl, action = 'verify', service = '2captcha') {
        const apiKey = this.services[service];
        if (!apiKey) {
            console.error(`No API key provided for ${service}`);
            return null;
        }

        try {
            switch (service) {
                case '2captcha':
                    return await this.solveWith2Captcha(siteKey, pageUrl, '3', action);
                case 'antiCaptcha':
                    return await this.solveWithAntiCaptchaV3(siteKey, pageUrl, action);
                default:
                    return null;
            }
        } catch (error) {
            console.error('Failed to solve reCAPTCHA v3:', error.message);
            return null;
        }
    }

    async solveImageCaptcha(imageBase64, service = '2captcha') {
        const apiKey = this.services[service];
        if (!apiKey) {
            console.error(`No API key provided for ${service}`);
            return null;
        }

        try {
            switch (service) {
                case '2captcha':
                    return await this.solveImageWith2Captcha(imageBase64);
                case 'deathByCaptcha':
                    return await this.solveImageWithDeathByCaptcha(imageBase64);
                default:
                    return null;
            }
        } catch (error) {
            console.error('Failed to solve image captcha:', error.message);
            return null;
        }
    }

    async solveWith2Captcha(siteKey, pageUrl, type, action = '') {
        const apiKey = this.services['2captcha'];
        const params = new URLSearchParams();
        params.append('key', apiKey);
        params.append('method', 'userrecaptcha');
        params.append('googlekey', siteKey);
        params.append('pageurl', pageUrl);
        params.append('json', '1');

        if (type === '3') {
            params.append('version', 'v3');
            params.append('action', action);
            params.append('min_score', '0.9');
        }

        const response = await axios.post('https://2captcha.com/in.php', params);
        const result = response.data;

        if (result.status !== 1) {
            throw new Error(`Failed to create task: ${result.request}`);
        }

        const taskId = result.request;
        await this.delay(5000);

        for (let i = 0; i < 20; i++) {
            const response2 = await axios.get(`https://2captcha.com/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`);
            const result2 = response2.data;

            if (result2.status === 1) {
                return result2.request;
            } else if (result2.request === 'CAPCHA_NOT_READY') {
                await this.delay(3000);
            } else {
                throw new Error(`Failed to solve: ${result2.request}`);
            }
        }

        throw new Error('Timeout waiting for captcha solution');
    }

    async solveWithAntiCaptcha(siteKey, pageUrl) {
        const apiKey = this.services['antiCaptcha'];
        const task = {
            type: 'RecaptchaV2TaskProxyless',
            websiteURL: pageUrl,
            websiteKey: siteKey
        };

        const createResponse = await axios.post('https://api.anti-captcha.com/createTask', {
            clientKey: apiKey,
            task
        });

        const taskId = createResponse.data.taskId;
        await this.delay(5000);

        for (let i = 0; i < 20; i++) {
            const resultResponse = await axios.post('https://api.anti-captcha.com/getTaskResult', {
                clientKey: apiKey,
                taskId
            });

            const status = resultResponse.data.status;
            if (status === 'ready') {
                return resultResponse.data.solution.gRecaptchaResponse;
            } else if (status === 'processing') {
                await this.delay(3000);
            } else {
                throw new Error(`Failed: ${resultResponse.data.errorDescription}`);
            }
        }

        throw new Error('Timeout waiting for captcha solution');
    }

    async solveWithAntiCaptchaV3(siteKey, pageUrl, action) {
        const apiKey = this.services['antiCaptcha'];
        const task = {
            type: 'RecaptchaV3TaskProxyless',
            websiteURL: pageUrl,
            websiteKey: siteKey,
            pageAction: action
        };

        const createResponse = await axios.post('https://api.anti-captcha.com/createTask', {
            clientKey: apiKey,
            task
        });

        const taskId = createResponse.data.taskId;
        await this.delay(5000);

        for (let i = 0; i < 20; i++) {
            const resultResponse = await axios.post('https://api.anti-captcha.com/getTaskResult', {
                clientKey: apiKey,
                taskId
            });

            const status = resultResponse.data.status;
            if (status === 'ready') {
                return resultResponse.data.solution.gRecaptchaResponse;
            } else if (status === 'processing') {
                await this.delay(3000);
            } else {
                throw new Error(`Failed: ${resultResponse.data.errorDescription}`);
            }
        }

        throw new Error('Timeout waiting for captcha solution');
    }

    async solveImageWith2Captcha(imageBase64) {
        const apiKey = this.services['2captcha'];
        const params = new URLSearchParams();
        params.append('key', apiKey);
        params.append('method', 'base64');
        params.append('body', imageBase64);
        params.append('json', '1');

        const response = await axios.post('https://2captcha.com/in.php', params);
        const result = response.data;

        if (result.status !== 1) {
            throw new Error(`Failed to create task: ${result.request}`);
        }

        const taskId = result.request;
        await this.delay(5000);

        for (let i = 0; i < 20; i++) {
            const response2 = await axios.get(`https://2captcha.com/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`);
            const result2 = response2.data;

            if (result2.status === 1) {
                return result2.request;
            } else if (result2.request === 'CAPCHA_NOT_READY') {
                await this.delay(3000);
            } else {
                throw new Error(`Failed to solve: ${result2.request}`);
            }
        }

        throw new Error('Timeout waiting for captcha solution');
    }

    async solveImageWithDeathByCaptcha(imageBase64) {
        const apiKey = this.services['deathByCaptcha'];
        const [username, password] = apiKey.split(':');

        const response = await axios.post('http://api.dbcapi.me/api/captcha', {
            username,
            password,
            captchabase64: imageBase64
        });

        const result = response.data;
        if (result.status !== 0) {
            throw new Error(`Failed: ${result.error}`);
        }

        const taskId = result.captcha;
        await this.delay(5000);

        for (let i = 0; i < 20; i++) {
            const response2 = await axios.get(`http://api.dbcapi.me/api/captcha/${taskId}`);
            const result2 = response2.data;

            if (result2.status === 0 && result2.text) {
                return result2.text;
            } else if (result2.status === 1) {
                await this.delay(3000);
            } else {
                throw new Error(`Failed: ${result2.error}`);
            }
        }

        throw new Error('Timeout waiting for captcha solution');
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async bypassCloudflare(page) {
        try {
            await page.waitForSelector('input[type="checkbox"]', { timeout: 5000 });
            await page.click('input[type="checkbox"]');
            await page.waitForNavigation({ timeout: 30000 });
            return true;
        } catch (error) {
            console.warn('Cloudflare bypass failed or not present:', error.message);
            return false;
        }
    }

    async handleRateLimit(page, maxRetries = 3, delayMs = 60000) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                await page.waitForNavigation({ timeout: 10000 });
                return true;
            } catch (error) {
                if (error.message.includes('rate limit')) {
                    console.log(`Rate limited, waiting ${delayMs / 1000} seconds...`);
                    await this.delay(delayMs * Math.pow(2, i));
                } else {
                    throw error;
                }
            }
        }
        throw new Error('Rate limit exceeded after retries');
    }
}

module.exports = CaptchaHandler;