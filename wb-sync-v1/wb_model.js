const axios = require('axios');
const readline = require('readline');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class WildberriesAuth {
    constructor(sessionFile = 'wb_session.json') {
        this.sessionFile = sessionFile;
        this.deviceId = 'device_id=site_e6d3a2fbab6247a0bb708666e27d2ee6';
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';
        this.correlationId = crypto.randomBytes(16).toString('hex');
        this.antibotKey = '217cc4d5276448d6a980d07034a3c89c';
        this.cookies = new Map();
        this.session = {
            sticker: null,
            accessToken: null,
            refreshToken: null,
            validationKey: null,
            userInfo: null
        };
    }

  
    saveSession() {
        try {
            const sessionData = {
                deviceId: this.deviceId,
                correlationId: this.correlationId,
                session: this.session,
                cookies: Object.fromEntries(this.cookies),
                timestamp: Date.now()
            };

            fs.writeFileSync(this.sessionFile, JSON.stringify(sessionData, null, 2));
            console.log('💾 Сессия успешно сохранена');
            return true;
        } catch (error) {
            console.error('❌ Ошибка сохранения сессии:', error.message);
            return false;
        }
    }

   
    loadSession() {
        try {
            if (!fs.existsSync(this.sessionFile)) {
                console.log('📂 Файл сессии не найден, потребуется новая авторизация');
                return false;
            }

            const sessionData = JSON.parse(fs.readFileSync(this.sessionFile, 'utf8'));
            
           
            if (!sessionData.session || !sessionData.session.accessToken) {
                console.log('❌ Некорректные данные сессии');
                this.clearSession();
                return false;
            }
            
           
            const sessionAge = Date.now() - (sessionData.timestamp || 0);
            const maxAge = 24 * 60 * 60 * 1000; 
            
            if (sessionAge > maxAge) {
                console.log('⏰ Сессия устарела, потребуется повторная авторизация');
                this.clearSession();
                return false;
            }

            
            if (sessionData.deviceId) this.deviceId = sessionData.deviceId;
            if (sessionData.correlationId) this.correlationId = sessionData.correlationId;
            this.session = { ...this.session, ...sessionData.session };
            
            if (sessionData.cookies) {
                this.cookies = new Map(Object.entries(sessionData.cookies));
            }

            console.log('📋 Сессия успешно загружена');
            return true;
        } catch (error) {
            console.error('❌ Ошибка загрузки сессии:', error.message);
            this.clearSession();
            return false;
        }
    }

   
    clearSession() {
        try {
            if (fs.existsSync(this.sessionFile)) {
                fs.unlinkSync(this.sessionFile);
                console.log('🗑️ Файл сессии удален');
            }
        } catch (error) {
            console.error('❌ Ошибка удаления файла сессии:', error.message);
        }
    }

   
    async validateSession() {
        if (!this.session || !this.session.accessToken) {
            return false;
        }

        try {
            const userResult = await this.getUserInfo();
            return userResult.success;
        } catch (error) {
            return false;
        }
    }

   
    async refreshAccessToken() {
        if (!this.session || !this.session.refreshToken) {
            return false;
        }

        try {
            const response = await axios.post('https://wbx-auth.wildberries.ru/v2/refresh', {
                refresh_token: this.session.refreshToken
            }, {
                headers: {
                    ...this.getBaseHeaders(),
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.result === 0 && response.data.payload?.access_token) {
                this.session.accessToken = response.data.payload.access_token;
                
               
                if (response.data.payload.refresh_token) {
                    this.session.refreshToken = response.data.payload.refresh_token;
                }

               
                this.parseCookiesFromHeaders(response.headers['set-cookie']);
                
                
                this.saveSession();
                
                console.log('🔄 Токены успешно обновлены');
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('❌ Ошибка обновления токена:', error.message);
            return false;
        }
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

    
    getAuthHeaders() {
        const headers = {
            ...this.getBaseHeaders(),
            'Authorization': `Bearer ${this.session.accessToken}`,
            'X-Requested-With': 'XMLHttpRequest',
            'X-SPA-Version': '12.9.0',
            'Sec-Fetch-Site': 'same-origin'
        };

       
        const cookieString = this.buildCookieString();
        if (cookieString) {
            headers['Cookie'] = cookieString;
        }

        return headers;
    }

   
    buildCookieString() {
        const cookies = [];
        
       
        if (this.session.validationKey) {
            cookies.push(`wbx-validation-key=${this.session.validationKey}`);
        }
        
        
        this.cookies.forEach((value, key) => {
            if (key !== 'wbx-validation-key') { 
                cookies.push(`${key}=${value}`);
            }
        });

        return cookies.length > 0 ? cookies.join('; ') : null;
    }

  
    parseCookiesFromHeaders(setCookieHeaders) {
        if (!setCookieHeaders) return;
        
        setCookieHeaders.forEach(cookieHeader => {
            const cookieParts = cookieHeader.split(';')[0].split('=');
            if (cookieParts.length >= 2) {
                const name = cookieParts[0].trim();
                const value = cookieParts[1].trim();
                
                if (name === 'wbx-validation-key') {
                    this.session.validationKey = value;
                } else if (name === 'wbx-refresh') {
                    this.session.refreshToken = value;
                }
                
                this.cookies.set(name, value);
            }
        });
    }

    
    async requestCaptcha(phoneNumber) {
        const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
        console.log(`📞 Отправляем запрос для номера: ${normalizedPhone}`);
        
        try {
            const response = await axios.post('https://wbx-auth.wildberries.ru/v2/code/wb-captcha', {
                phone_number: normalizedPhone,
                captcha_token: ""
            }, {
                headers: {
                    ...this.getBaseHeaders(),
                    'Content-Type': 'text/plain;charset=UTF-8',
                    'WB-AppType': 'web',
                    'WB-AppVersion': '12.8.3'
                }
            });
            
            console.log(`📡 Ответ wb-captcha:`, JSON.stringify(response.data, null, 2));
            
            // need captcha
            if (response.data.error === "need captcha") {
                console.log(`🔐 Требуется капча, переходим к созданию токена`);
                return { needsCaptcha: true };
            }
            
            if (response.data.result === 0 && response.data.payload) {
                const { auth_method, sticker, ttl } = response.data.payload;
                
                if (auth_method === 'push' || auth_method === 'sms') {
                    this.session.sticker = sticker;
                    console.log(`✅ Получен sticker для ${auth_method}: ${sticker.substring(0, 20)}...`);
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
            console.error(`❌ Ошибка requestCaptcha:`, error.response?.status, error.response?.data || error.message);
            return { needsCaptcha: false, error: error.message };
        }
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

  
    async createOneTimeToken(phoneNumber) {
        const phonePrefix = this.getPhonePrefix(phoneNumber);
        console.log(`🔍 Исходный номер: ${phoneNumber}`);
        console.log(`📱 Нормализованный номер: ${this.normalizePhoneNumber(phoneNumber)}`);
        console.log(`🌍 Используемый префикс: ${phonePrefix}`);
        
        try {
            // Первый запрос
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

            console.log(`📡 Первый ответ antibot API:`, JSON.stringify(response.data, null, 2));

            if (response.data.code === 498 && response.data.challenge) {
                console.log(`🔐 Получен challenge, тип: ${response.data.challenge.scriptPath || 'unknown'}`);
                
                // Fingerprint challenge
                const fingerprintSolution = await this.executeFingerprint(response.data.challenge);
                console.log(`👆 Отправляем fingerprint решение`);
                
                // Второй запрос с fingerprint
                response = await axios.post('https://antibot.wildberries.ru/api/v1/create-one-time-token', {
                    action: "auth",
                    userScope: {
                        phone_prefix: phonePrefix
                    },
                    challenge: response.data.challenge,
                    solution: fingerprintSolution
                }, {
                    headers: {
                        ...this.getBaseHeaders(),
                        'Content-Type': 'application/json',
                        'X-WB-Antibot-Key': this.antibotKey,
                        'X-WB-Antibot-SDK-Version': '1.0.0'
                    }
                });

                console.log(`📡 Второй ответ antibot API:`, JSON.stringify(response.data, null, 2));
                
                // Proof of Work challenge
                if (response.data.code === 498 && response.data.challenge && 
                    response.data.challenge.scriptPath && response.data.challenge.scriptPath.includes('pow')) {
                    
                    console.log(`⚡ Получен PoW challenge, решаем...`);
                    const powSolution = await this.executeProofOfWork(response.data.challenge);
                    
                    // Третий запрос с PoW
                    response = await axios.post('https://antibot.wildberries.ru/api/v1/create-one-time-token', {
                        action: "auth",
                        userScope: {
                            phone_prefix: phonePrefix
                        },
                        challenge: response.data.challenge,
                        solution: powSolution
                    }, {
                        headers: {
                            ...this.getBaseHeaders(),
                            'Content-Type': 'application/json',
                            'X-WB-Antibot-Key': this.antibotKey,
                            'X-WB-Antibot-SDK-Version': '1.0.0'
                        }
                    });

                    console.log(`📡 Третий ответ antibot API:`, JSON.stringify(response.data, null, 2));
                }
                
                if (response.data.secureToken) {
                    console.log(`✅ Получен secureToken: ${response.data.secureToken.substring(0, 20)}...`);
                    return response.data.secureToken;
                } else {
                    console.log(`❌ secureToken не получен в финальном ответе`);
                }
            } else if (response.data.secureToken) {
                console.log(`✅ Получен secureToken сразу: ${response.data.secureToken.substring(0, 20)}...`);
                return response.data.secureToken;
            } else {
                console.log(`❌ Неожиданный ответ от antibot API`);
            }

            return null;
        } catch (error) {
            console.error(`❌ Ошибка создания токена:`, error.response?.status, error.response?.data || error.message);
            return null;
        }
    }

    
    async requestSmsWithToken(phoneNumber, secureToken) {
        const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
        console.log(`📱 Отправляем SMS для номера: ${normalizedPhone} с токеном: ${secureToken.substring(0, 20)}...`);
        
        try {
            const response = await axios.post('https://wbx-auth.wildberries.ru/v2/code/wb-captcha', {
                phone_number: normalizedPhone,
                captcha_token: secureToken
            }, {
                headers: {
                    ...this.getBaseHeaders(),
                    'Content-Type': 'text/plain;charset=UTF-8',
                    'WB-AppType': 'web',
                    'WB-AppVersion': '12.8.3'
                }
            });
            
            console.log(`📡 Ответ SMS запроса:`, JSON.stringify(response.data, null, 2));
            
            if (response.data.result === 0 && response.data.payload) {
                const { auth_method, sticker, ttl } = response.data.payload;
                this.session.sticker = sticker;
                console.log(`✅ SMS отправлен, sticker: ${sticker.substring(0, 20)}...`);
                
                return {
                    success: true,
                    authMethod: auth_method,
                    sticker: sticker,
                    ttl: ttl
                };
            }
            
            return { success: false, error: 'Unexpected response format' };
        } catch (error) {
            console.error(`❌ Ошибка отправки SMS:`, error.response?.status, error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }

   
    async authenticate(smsCode, paymentPubKey = "9205a821cac11b8c9808a3a1ca88110e7e185561a23f744f390fc69f2c7bbd86") {
        try {
            const headers = {
                ...this.getBaseHeaders(),
                'Content-Type': 'text/plain;charset=UTF-8',
                'WB-AppType': 'web',
                'WB-AppVersion': '12.8.3'
            };

           
            const cookieString = this.buildCookieString();
            if (cookieString) {
                headers['Cookie'] = cookieString;
            }

            const response = await axios.post('https://wbx-auth.wildberries.ru/v2/auth', {
                sticker: this.session.sticker,
                code: parseInt(smsCode),
                payment_pub_key: paymentPubKey
            }, { headers });
            
            if (response.data.result === 0 && response.data.payload?.access_token) {
                this.session.accessToken = response.data.payload.access_token;
                
               
                this.parseCookiesFromHeaders(response.headers['set-cookie']);
                
                return true;
            }
            
            return false;
        } catch (error) {
            return false;
        }
    }

   
    async afterAuth() {
        try {
            const response = await axios.post('https://www.wildberries.ru/webapi/security/afterauth', {}, {
                headers: this.getAuthHeaders()
            });

            return response.data.resultState === 0;
        } catch (error) {
            return false;
        }
    }

   
    async getUserInfo() {
        if (!this.session.accessToken) {
            return { 
                success: false, 
                error: 'No access token' 
            };
        }

        try {
           
            if (this.cookies.size === 0) {
                this.cookies.set('_wbauid', Date.now().toString() + Math.random().toString().substr(2, 10));
                this.cookies.set('_cp', '1');
                
                const wbaasToken = `1|2|${Math.floor(Date.now() / 1000) + 86400}|AA==|${crypto.randomBytes(16).toString('hex')}|${crypto.randomBytes(32).toString('base64')}`;
                this.cookies.set('x_wbaas_token', wbaasToken);
            }

            const response = await axios.post('https://www.wildberries.ru/webapi/personalinfo', {}, {
                headers: this.getAuthHeaders()
            });
            
            if (response.data.resultState === 0 && response.data.value) {
                this.session.userInfo = response.data.value;
                
                return {
                    success: true,
                    userInfo: response.data.value
                };
            } else {
                return {
                    success: false,
                    error: 'Unexpected response format'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message,
                status: error.response?.status
            };
        }
    }

    normalizePhoneNumber(phoneNumber) {
        // Удаляем все нечисловые символы
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        
        // Если номер начинается с 8, заменяем на 7 (для российских номеров)
        if (cleanNumber.startsWith('8') && cleanNumber.length === 11) {
            return '7' + cleanNumber.substring(1);
        }
        
        return cleanNumber;
    }

    getPhonePrefix(phoneNumber) {
        const normalized = this.normalizePhoneNumber(phoneNumber);
        
        // Определяем префикс на основе кода страны
        if (normalized.startsWith('7')) {
            // Россия/Казахстан - берем первые 4 цифры
            return normalized.substring(0, 4);
        } else if (normalized.startsWith('375')) {
            // Беларусь - берем код страны
            return '375';
        } else if (normalized.startsWith('380')) {
            // Украина - берем код страны  
            return '380';
        } else if (normalized.startsWith('374')) {
            // Армения - берем код страны
            return '374';
        } else if (normalized.startsWith('995')) {
            // Грузия - берем код страны
            return '995';
        } else if (normalized.startsWith('996')) {
            // Кыргызстан - берем код страны
            return '996';
        } else if (normalized.startsWith('998')) {
            // Узбекистан - берем код страны
            return '998';
        } else {
            // По умолчанию берем первые 4 цифры
            return normalized.substring(0, 4);
        }
    }

  
    async fullAuth(phoneNumber) {
       
        if (this.loadSession()) {
            console.log('🔍 Проверяем существующую сессию...');
            
           
            if (await this.validateSession()) {
                console.log('✅ Существующая сессия валидна!');
                return { success: true, fromCache: true };
            }
            
           
            console.log('🔄 Пытаемся обновить токен...');
            if (await this.refreshAccessToken()) {
                if (await this.validateSession()) {
                    console.log('✅ Токен успешно обновлен!');
                    return { success: true, fromRefresh: true };
                }
            }
            
            console.log('⚠️ Сессия недействительна, требуется новая авторизация');
            this.clearSession();
        }

      
        return await this.performFullAuth(phoneNumber);
    }

    async getProductInfo(cod_1s) {
        try {
            const response = await axios.get(`https://card.wb.ru/cards/v4/detail?appType=1&curr=byn&dest=-59202&spp=30&hide_dtype=10%3B13%3B14&ab_testing=false&lang=ru&nm=${cod_1s}`, {
                headers: {
                    ...this.getBaseHeaders(),
                    'Accept': 'application/json',
                    'Origin': 'https://www.wildberries.ru',
                    'Referer': `https://www.wildberries.ru/catalog/${cod_1s}/detail.aspx`,
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'cross-site'
                }
            });
    
            console.log('📊 Ответ API:', JSON.stringify(response.data, null, 2));
    
            if (response.data?.products?.[0]) {
                const product = response.data.products[0];
                const size = product.sizes?.[0];
                
                if (!size) {
                    return {
                        success: false,
                        error: 'У товара нет доступных размеров/вариантов'
                    };
                }
    
                
                const price = size.price?.product || 0;
                
                console.log('🔍 Данные товара:', {
                    id: product.id,
                    name: product.name,
                    brand: product.brand,
                    chrtId: size.optionId,
                    price: price,
                    subjectId: product.subjectId
                });
    
                return {
                    success: true,
                    product: {
                        chrt_id: size.optionId,
                        cod_1s: product.id,
                        price: price,
                        subject_id: product.subjectId,
                        name: product.name,
                        brand: product.brand
                    }
                };
            } else {
                return {
                    success: false,
                    error: 'Товар не найден в ответе API'
                };
            }
        } catch (error) {
            console.error('❌ Ошибка запроса:', error.response?.status, error.response?.data);
            return {
                success: false,
                error: `Ошибка получения товара: ${error.message}`
            };
        }
    }

    async addToCartByArticle(cod_1s, quantity = 1) {
        if (!this.session.accessToken) {
            return {
                success: false,
                error: 'Не авторизован. Требуется выполнить авторизацию'
            };
        }
    
        console.log(`🔍 Получаем информацию о товаре ${cod_1s}...`);
        
    
        const productInfo = await this.getProductInfo(cod_1s);
        if (!productInfo.success) {
            return productInfo;
        }
    
        const product = productInfo.product;
        console.log(`📦 Найден товар: ${product.brand} - ${product.name}`);
        console.log(`💰 Цена: ${(product.price / 100).toFixed(2)} BYN`);
    
        try {
            const currentTime = Date.now() - 1000000;
            
            
            const url = new URL('https://cart-storage-api.wildberries.ru/api/basket/sync');
            url.searchParams.set('ts', currentTime.toString());
            url.searchParams.set('device_id', this.deviceId);
    
            
            const cartItem = {
                chrt_id: product.chrt_id,
                quantity: quantity,
                cod_1s: product.cod_1s,
                client_ts: Math.floor(currentTime / 1000),
                op_type: 1,
                target_url: "EX|3|MCS|IT|||||||||",
                meta_json: JSON.stringify({
                    analitic: {
                        tailObject: {
                            loc: "MCS",
                            loc_way: "IT",
                            sort: "",
                            terms: {
                                catalog_type: "presets",
                                catalog_value: "preset=1050599030",
                                preset_type: "pers",
                                recid: `recid${Math.random().toString().substr(2, 15)}${currentTime}`
                            }
                        },
                        logs: ""
                    },
                    originalPrice: {
                        price: (product.price / 100).toFixed(2)
                    }
                }),
                price: product.price,
                subject_id: product.subject_id,
                currency: "BYN",
                timezonemin: 180
            };
    
           
            const headers = {
                ...this.getAuthHeaders(),
                'Content-Type': 'application/json',
                'Origin': 'https://www.wildberries.ru',
                'Referer': `https://www.wildberries.ru/catalog/${cod_1s}/detail.aspx`,
                'Wb-Apptype': 'site'
            };
    
            console.log(`🛒 Добавляем товар в корзину...`);
            console.log(`🔗 URL запроса: ${url.toString()}`);
            console.log(`📦 Данные товара для корзины:`, JSON.stringify(cartItem, null, 2));
            console.log(`📋 Заголовки запроса:`, JSON.stringify(headers, null, 2));
    
         
            const response = await axios.post(url.toString(), [cartItem], { headers });
    
            console.log(`📡 Статус ответа: ${response.status}`);
            console.log(`📄 Тело ответа:`, JSON.stringify(response.data, null, 2));
            console.log(`📋 Заголовки ответа:`, JSON.stringify(response.headers, null, 2));
    
            if (response.status === 200) {
                if (response.data.state === 0) {
                    console.log(`✅ Товар успешно добавлен в корзину! (state: 0)`);
                    return {
                        success: true,
                        message: `Товар "${product.brand} - ${product.name}" добавлен в корзину`,
                        product: product,
                        quantity: quantity,
                        response: response.data
                    };
                } else {
                    console.log(`❌ Товар НЕ добавлен! (state: ${response.data.state})`);
                    return {
                        success: false,
                        error: `API вернул ошибку (state: ${response.data.state})`,
                        response: response.data
                    };
                }
            } else {
                return {
                    success: false,
                    error: `Ошибка HTTP ${response.status}: ${response.statusText}`,
                    response: response.data
                };
            }
    
        } catch (error) {
            console.log(`❌ Ошибка добавления в корзину: ${error.message}`);
            return {
                success: false,
                error: error.message,
                status: error.response?.status
            };
        }
    }

    
    async performFullAuth(phoneNumber) {
        console.log(`🔄 Начинаем полную авторизацию для номера: ${phoneNumber}`);
        
        // Первый запрос - проверяем нужна ли капча
        const captchaResult = await this.requestCaptcha(phoneNumber);
        
        if (captchaResult.error) {
            return { success: false, error: captchaResult.error };
        }

        let finalAuthMethod = 'unknown';

        if (captchaResult.needsCaptcha) {
            console.log(`🔐 Капча требуется, создаем токен...`);
            
            // Создаем токен для обхода капчи
            const secureToken = await this.createOneTimeToken(phoneNumber);
            if (!secureToken) {
                return { success: false, error: 'Не удалось создать токен' };
            }

            // Отправляем SMS с токеном
            const smsResult = await this.requestSmsWithToken(phoneNumber, secureToken);
            if (!smsResult.success) {
                return { success: false, error: 'Не удалось отправить код: ' + smsResult.error };
            }
            
            finalAuthMethod = smsResult.authMethod || 'sms';
            
        } else if (captchaResult.authMethod) {
            console.log(`✅ Капча не нужна, метод авторизации: ${captchaResult.authMethod}`);
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


async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

    try {
        const auth = new WildberriesAuth();
        
        console.log('🚀 Авторизация Wildberries\n');
        
        const phoneNumber = await question('📱 Введите номер телефона: ');
        
        
        const authResult = await auth.fullAuth(phoneNumber);
        
        if (!authResult.success) {
            console.log('❌ Ошибка:', authResult.error);
            return;
        }

       
        if (authResult.fromCache || authResult.fromRefresh) {
            const userResult = await auth.getUserInfo();
            
            if (userResult.success) {
                console.log('\n✅ Авторизация успешна (из сохраненной сессии)!');
                console.log('👤 Пользователь:', userResult.userInfo.fullName);
                console.log('📱 Телефон:', userResult.userInfo.formattedPhoneMobile);
                console.log('🆔 ID:', userResult.userInfo.id);
                console.log('🌍 Страна:', userResult.userInfo.country);
                console.log('💰 Скидка:', userResult.userInfo.personalDiscount + '%');
            }
            return;
        }

        
        if (authResult.needsCode) {
            
            if (authResult.authMethod === 'push') {
                console.log('📱 Push-уведомление отправлено');
            } else if (authResult.authMethod === 'sms') {
                console.log('💬 SMS код отправлен');
            }
            
           
            let authCode;
            if (authResult.authMethod === 'push') {
                authCode = await question('💬 Введите SMS код (или Enter для push): ');
                
                if (!authCode.trim()) {
                    console.log('⚠️ Push-авторизация не реализована');
                    return;
                }
            } else {
                authCode = await question('💬 Введите SMS код: ');
            }
            
         
            const authenticated = await auth.authenticate(authCode);
            if (!authenticated) {
                console.log('❌ Авторизация не удалась');
                return;
            }
            
         
            await auth.afterAuth();
            
           
            const userResult = await auth.getUserInfo();
            
            if (userResult.success) {
              
                auth.saveSession();
                
                console.log('\n✅ Авторизация успешна!');
                console.log('👤 Пользователь:', userResult.userInfo.fullName);
                console.log('📱 Телефон:', userResult.userInfo.formattedPhoneMobile);
                console.log('🆔 ID:', userResult.userInfo.id);
                console.log('🌍 Страна:', userResult.userInfo.country);
                console.log('💰 Скидка:', userResult.userInfo.personalDiscount + '%');
            } else {
                console.log('❌ Не удалось получить данные пользователя:', userResult.error);
            }
        }

    } catch (error) {
        console.error('💥 Ошибка:', error.message);
    } finally {
        rl.close();
    }
}

async function addProductToCart() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

    try {
        const auth = new WildberriesAuth();
        
       
        if (!auth.loadSession() || !await auth.validateSession()) {
            console.log('❌ Не авторизован. Сначала выполните авторизацию.');
            rl.close();
            return;
        }

        console.log('🛒 Добавление товара в корзину\n');
        
        const articleInput = await question('📝 Введите артикул товара: ');
        const article = parseInt(articleInput);
        
        if (!article || isNaN(article)) {
            console.log('❌ Неверный артикул');
            rl.close();
            return;
        }

        const quantityInput = await question('📊 Введите количество (по умолчанию 1): ');
        const quantity = quantityInput ? parseInt(quantityInput) : 1;

        console.log(''); 

        const result = await auth.addToCartByArticle(article, quantity);
        
        if (result.success) {
            console.log(`\n🎉 ${result.message}`);
            console.log(`📊 Количество: ${result.quantity}`);
        } else {
            console.log(`\n❌ Ошибка: ${result.error}`);
        }

    } catch (error) {
        console.error('💥 Критическая ошибка:', error.message);
    } finally {
        rl.close();
    }
}


if (typeof module !== 'undefined') {
    module.exports = { addProductToCart };
}


if (require.main === module) {
    main();
}