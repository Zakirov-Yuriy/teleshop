const axios = require('axios');

class WildberriesAuth {
    constructor() {
        this.deviceId = 'device_id=site_e6d3a2fbab6247a0bb708666e27d2ee6';
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';
        this.correlationId = crypto.randomBytes(16).toString('hex');
        this.antibotKey = '217cc4d5276448d6a980d07034a3c89c';
        this.session = {
            sticker: null,
            accessToken: null,
            refreshToken: null,
            validationKey: null,
            userInfo: null
        };
    }

    getBaseHeaders() {
        return {
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'User-Agent': this.userAgent,
            'Origin': 'https://www.wildberries.ru',
            'Referer': 'https://www.wildberries.ru/',
            'Sec-Ch-Ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-site',
            'DeviceId': this.deviceId,
            'X-Correlation-Id': this.correlationId,
            'Priority': 'u=1, i'
        };
    }

    async executeFingerprint(challenge) {
        const fingerprintData = {
            userAgent: this.userAgent,
            platform: 'Win32',
            languages: ['ru-RU', 'ru', 'en-US', 'en'],
            hardwareConcurrency: 8,
            deviceMemory: 8,
            colorDepth: 24,
            screenWidth: 1920,
            screenHeight: 1080,
            devicePixelRatio: 1,
            timezoneOffset: -180
        };
        
        return {
            payload: challenge.payload,
            fingerprint: Buffer.from(JSON.stringify(fingerprintData)).toString('base64')
        };
    }
    
    async executeProofOfWork(challenge) {
        const answers = [];
        for (let i = 0; i < 300; i++) {
            answers.push(Math.floor(Math.random() * 256));
        }
        
        return Buffer.from(answers.join(',')).toString('base64');
    }

    async createOneTimeToken(phonePrefix) {
        try {
            console.log('Creating one-time token for prefix:', phonePrefix);
            
            let response = await axios.post('https://antibot.wildberries.ru/api/v1/create-one-time-token', {
                action: "auth",
                userScope: {
                    phone_prefix: phonePrefix
                }
            }, {
                headers: {
                    ...this.getBaseHeaders(),
                    'Content-Type': 'application/json',
                    'X-WB-Antibot-Key': this.antibotKey,
                    'X-WB-Antibot-SDK-Version': '1.0.0'
                }
            });

            let data = response.data;
            console.log('Initial response:', data);

            if (data.code === 498 && data.challenge) {
                console.log('Got challenge, executing fingerprint...');
                const fingerprintSolution = await this.executeFingerprint(data.challenge);
                console.log('Fingerprint solution:', fingerprintSolution);
                
                response = await axios.post('https://antibot.wildberries.ru/api/v1/create-one-time-token', {
                    action: "auth",
                    userScope: {
                        phone_prefix: phonePrefix
                    },
                    challenge: data.challenge,
                    solution: fingerprintSolution
                }, {
                    headers: {
                        ...this.getBaseHeaders(),
                        'Content-Type': 'application/json',
                        'X-WB-Antibot-Key': this.antibotKey,
                        'X-WB-Antibot-SDK-Version': '1.0.0'
                    }
                });
                
                data = response.data;
                console.log('After fingerprint response:', data);
                
                if (data.code === 498 && data.challenge && 
                    data.challenge.scriptPath.includes('pow')) {
                    console.log('Got POW challenge, executing...');
                    const powSolution = await this.executeProofOfWork(data.challenge);
                    console.log('POW solution:', powSolution);
                    
                    response = await axios.post('https://antibot.wildberries.ru/api/v1/create-one-time-token', {
                        action: "auth",
                        userScope: {
                            phone_prefix: phonePrefix
                        },
                        challenge: data.challenge,
                        solution: powSolution
                    }, {
                        headers: {
                            ...this.getBaseHeaders(),
                            'Content-Type': 'application/json',
                            'X-WB-Antibot-Key': this.antibotKey,
                            'X-WB-Antibot-SDK-Version': '1.0.0'
                        }
                    });
                    
                    data = response.data;
                    console.log('After POW response:', data);
                }
                
                if (data.secureToken) {
                    console.log('Got secure token:', data.secureToken);
                    return data.secureToken;
                }
            }

            console.log('No secure token found, returning null');
            return null;
        } catch (error) {
            console.error('Error in createOneTimeToken:', error.message);
            return null;
        }
    }

    async requestCaptcha(phoneNumber) {
        try {
            const response = await axios.post('https://wbx-auth.wildberries.ru/v2/code/wb-captcha', {
                phone_number: phoneNumber,
                captcha_token: ""
            }, {
                headers: {
                    ...this.getBaseHeaders(),
                    'Content-Type': 'text/plain;charset=UTF-8',
                    'WB-AppType': 'web',
                    'WB-AppVersion': '12.8.3'
                }
            });
            
            console.log('Captcha response:', response.data);
            
            if (response.data.error === "need captcha") {
                return { needsCaptcha: true };
            }
            
            if (response.data.result === 0 && response.data.payload) {
                const { auth_method, sticker, ttl } = response.data.payload;
                
                if (auth_method === 'push' || auth_method === 'sms') {
                    this.session.sticker = sticker;
                    return { 
                        needsCaptcha: false, 
                        authMethod: auth_method,
                        sticker: sticker,
                        ttl: ttl
                    };
                }
            }
            
            return { needsCaptcha: false, error: 'Unknown response format' };
        } catch (error) {
            console.error('Error in requestCaptcha:', error.message);
            return { needsCaptcha: false, error: error.message };
        }
    }

    async performFullAuth(phoneNumber) {
        const phonePrefix = phoneNumber.substring(0, 4);
        console.log('Phone prefix:', phonePrefix);
        
        const captchaResult = await this.requestCaptcha(phoneNumber);
        console.log('Captcha result:', captchaResult);
        
        if (captchaResult.error) {
            return { success: false, error: captchaResult.error };
        }

        let finalAuthMethod = 'unknown';

        if (captchaResult.needsCaptcha) {
            console.log('Need captcha, creating token...');
            const secureToken = await this.createOneTimeToken(phonePrefix);
            console.log('Secure token result:', secureToken);
            
            if (!secureToken) {
                return { success: false, error: 'Не удалось создать токен' };
            }

            // Здесь должна быть логика отправки SMS с токеном
            console.log('Would send SMS with token:', secureToken);
            
            finalAuthMethod = 'sms';
            
        } else if (captchaResult.authMethod) {
            finalAuthMethod = captchaResult.authMethod;
            this.session.sticker = captchaResult.sticker;
        }

        return {
            success: true,
            needsCode: true,
            authMethod: finalAuthMethod
        };
    }
}

async function test() {
    const auth = new WildberriesAuth();
    const phoneNumber = '+375291234567'; // Тестовый номер
    
    console.log('Testing WB auth...');
    const result = await auth.performFullAuth(phoneNumber);
    console.log('Final result:', result);
}

test().catch(console.error); 