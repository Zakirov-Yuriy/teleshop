import { createClient } from 'npm:@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

interface WBSession {
  id: string
  user_id: string
  device_id: string
  correlation_id: string
  access_token: string
  refresh_token: string
  validation_key: string
  user_info: any
  cookies: Record<string, string>
  created_at: string
  updated_at: string
  sticker?: string
}

class WildberriesAuth {
  private deviceId: string
  private correlationId: string
  private userAgent: string
  private antibotKey: string
  private session: Partial<WBSession> = {}

  constructor() {
    this.deviceId = 'device_id=site_e6d3a2fbab6247a0bb708666e27d2ee6'
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    this.correlationId = this.generateCorrelationId()
    this.antibotKey = '217cc4d5276448d6a980d07034a3c89c'
  }

  private generateCorrelationId(): string {
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  private getBaseHeaders() {
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
    }
  }

  private getAuthHeaders() {
    const headers = {
      ...this.getBaseHeaders(),
      'Authorization': `Bearer ${this.session.access_token}`,
      'X-Requested-With': 'XMLHttpRequest',
      'X-SPA-Version': '12.9.0',
      'Sec-Fetch-Site': 'same-origin'
    }

    const cookieString = this.buildCookieString()
    if (cookieString) {
      headers['Cookie'] = cookieString
    }

    return headers
  }

  private buildCookieString(): string | null {
    const cookies = []
    
    if (this.session.validation_key) {
      cookies.push(`wbx-validation-key=${this.session.validation_key}`)
    }
    
    if (this.session.cookies) {
      Object.entries(this.session.cookies).forEach(([key, value]) => {
        if (key !== 'wbx-validation-key') {
          cookies.push(`${key}=${value}`)
        }
      })
    }

    return cookies.length > 0 ? cookies.join('; ') : null
  }

  private parseCookiesFromHeaders(setCookieHeaders: string[] | undefined) {
    if (!setCookieHeaders) return
    
    setCookieHeaders.forEach(cookieHeader => {
      const cookieParts = cookieHeader.split(';')[0].split('=')
      if (cookieParts.length >= 2) {
        const name = cookieParts[0].trim()
        const value = cookieParts[1].trim()
        
        if (name === 'wbx-validation-key') {
          this.session.validation_key = value
        } else if (name === 'wbx-refresh') {
          this.session.refresh_token = value
        }
        
        if (!this.session.cookies) this.session.cookies = {}
        this.session.cookies[name] = value
      }
    })
  }

  async loadSession(supabase: any, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('wb_sessions')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error || !data) {
        console.log('Сессия не найдена в базе данных')
        return false
      }

      // Проверяем возраст сессии (24 часа)
      const sessionAge = Date.now() - new Date(data.updated_at).getTime()
      const maxAge = 24 * 60 * 60 * 1000

      if (sessionAge > maxAge) {
        console.log('Сессия устарела')
        await this.deleteSession(supabase, userId)
        return false
      }

      this.session = data
      this.deviceId = data.device_id
      this.correlationId = data.correlation_id

      console.log('Сессия загружена из базы данных')
      return true
    } catch (error) {
      console.error('Ошибка загрузки сессии:', error)
      return false
    }
  }

  async saveSession(supabase: any, userId: string): Promise<boolean> {
    try {
      if (!this.session.access_token) {
        console.error('Нет токена для сохранения')
        return false
      }

      const sessionData = {
        user_id: userId,
        device_id: this.deviceId,
        correlation_id: this.correlationId,
        access_token: this.session.access_token,
        refresh_token: this.session.refresh_token || '',
        validation_key: this.session.validation_key || '',
        user_info: this.session.user_info || null,
        cookies: this.session.cookies || {}
      }

      const { error } = await supabase
        .from('wb_sessions')
        .upsert(sessionData, {
          onConflict: 'user_id'
        })

      if (error) {
        console.error('Ошибка сохранения сессии:', error)
        return false
      }

      console.log('Сессия сохранена в базу данных')
      return true
    } catch (error) {
      console.error('Ошибка сохранения сессии:', error)
      return false
    }
  }

  async deleteSession(supabase: any, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('wb_sessions')
        .delete()
        .eq('user_id', userId)

      if (error) {
        console.error('Ошибка удаления сессии:', error)
        return false
      }

      this.session = {}
      console.log('Сессия удалена из базы данных')
      return true
    } catch (error) {
      console.error('Ошибка удаления сессии:', error)
      return false
    }
  }

  async validateSession(): Promise<boolean> {
    if (!this.session.access_token) {
      return false
    }

    try {
      const userResult = await this.getUserInfo()
      return userResult.success
    } catch (error) {
      return false
    }
  }

  async refreshAccessToken(): Promise<boolean> {
    if (!this.session.refresh_token) {
      return false
    }

    try {
      const response = await fetch('https://wbx-auth.wildberries.ru/v2/refresh', {
        method: 'POST',
        headers: {
          ...this.getBaseHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refresh_token: this.session.refresh_token
        })
      })

      const data = await response.json()

      if (data.result === 0 && data.payload?.access_token) {
        this.session.access_token = data.payload.access_token
        
        if (data.payload.refresh_token) {
          this.session.refresh_token = data.payload.refresh_token
        }

        this.parseCookiesFromHeaders(response.headers.get('set-cookie')?.split(','))
        
        console.log('Токены успешно обновлены')
        return true
      }
      
      return false
    } catch (error) {
      console.error('Ошибка обновления токена:', error)
      return false
    }
  }

  async requestCaptcha(phoneNumber: string) {
    try {
      console.log('Requesting captcha for phone:', phoneNumber)
      console.log('Headers:', this.getBaseHeaders())
      
      // Используем реальный прокси сервер
      const proxyConfig = {
        host: 'p12360.ltespace.net',
        port: 12360,
        auth: {
          username: '3hm93qy5',
          password: 'wh4ygxd6'
        }
      }
      
      // Создаем URL с прокси
      const targetUrl = 'https://wbx-auth.wildberries.ru/v2/code/wb-captcha'
      const proxyUrl = `https://${proxyConfig.auth.username}:${proxyConfig.auth.password}@${proxyConfig.host}:${proxyConfig.port}`
      
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          ...this.getBaseHeaders(),
          'Content-Type': 'text/plain;charset=UTF-8',
          'WB-AppType': 'web',
          'WB-AppVersion': '12.9.0'
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
          captcha_token: ""
        })
      })
      
      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))
      
      const responseText = await response.text()
      console.log('Raw response text:', responseText)
      
      let data
      try {
        data = JSON.parse(responseText)
        console.log('Parsed response data:', data)
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError)
        return { needsCaptcha: false, error: `Invalid JSON response: ${responseText}` }
      }
      
      if (data.error === "need captcha") {
        console.log('Need captcha detected')
        return { needsCaptcha: true }
      }
      
      if (data.error === "ip is blocked") {
        console.log('IP is blocked by Wildberries')
        return { needsCaptcha: false, error: 'IP заблокирован Wildberries. Попробуйте позже или используйте VPN.' }
      }
      
      if (data.result === 0 && data.payload) {
        const { auth_method, sticker, ttl } = data.payload
        console.log('Auth method:', auth_method, 'Sticker:', sticker, 'TTL:', ttl)
        
        if (auth_method === 'push' || auth_method === 'sms') {
          this.session.sticker = sticker
          return { 
            needsCaptcha: false, 
            authMethod: auth_method,
            sticker: sticker,
            ttl: ttl
          }
        }
      }
      
      console.log('Unknown response format - data:', data)
      return { needsCaptcha: false, error: `Неизвестный формат ответа: ${JSON.stringify(data)}` }
    } catch (error) {
      console.error('Request captcha error:', error)
      return { needsCaptcha: false, error: error.message }
    }
  }

  async executeFingerprint(challenge: any) {
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
    }
    
    return {
      payload: challenge.payload,
      fingerprint: btoa(JSON.stringify(fingerprintData))
    }
  }
  
  async executeProofOfWork(challenge: any) {
    const answers = []
    for (let i = 0; i < 300; i++) {
      answers.push(Math.floor(Math.random() * 256))
    }
    
    return btoa(answers.join(','))
  }

  async createOneTimeToken(phonePrefix: string) {
    try {
      console.log('Creating one-time token for prefix:', phonePrefix)
      
      let response = await fetch('https://antibot.wildberries.ru/api/v1/create-one-time-token', {
        method: 'POST',
        headers: {
          ...this.getBaseHeaders(),
          'Content-Type': 'application/json',
          'X-WB-Antibot-Key': this.antibotKey,
          'X-WB-Antibot-SDK-Version': '1.0.0'
        },
        body: JSON.stringify({
          action: "auth",
          userScope: {
            phone_prefix: phonePrefix
          }
        })
      })

      let data = await response.json()
      console.log('Initial response:', data)

      if (data.code === 498 && data.challenge) {
        console.log('Got challenge, executing fingerprint...')
        // Выполняем fingerprint challenge
        const fingerprintSolution = await this.executeFingerprint(data.challenge)
        console.log('Fingerprint solution:', fingerprintSolution)
        
                 response = await fetch('https://antibot.wildberries.ru/api/v1/create-one-time-token', {
           method: 'POST',
           headers: {
             ...this.getBaseHeaders(),
             'Content-Type': 'application/json',
             'X-WB-Antibot-Key': this.antibotKey,
             'X-WB-Antibot-SDK-Version': '1.0.0',
             'X-Forwarded-For': '89.169.39.32',
             'X-Real-IP': '89.169.39.32'
           },
           body: JSON.stringify({
             action: "auth",
             userScope: {
               phone_prefix: phonePrefix
             },
             challenge: data.challenge,
             solution: fingerprintSolution
           })
         })
        
        data = await response.json()
        console.log('After fingerprint response:', data)
        
        if (data.code === 498 && data.challenge && 
            data.challenge.scriptPath.includes('pow')) {
          console.log('Got POW challenge, executing...')
          // Выполняем proof of work
          const powSolution = await this.executeProofOfWork(data.challenge)
          console.log('POW solution:', powSolution)
          
                     response = await fetch('https://antibot.wildberries.ru/api/v1/create-one-time-token', {
             method: 'POST',
             headers: {
               ...this.getBaseHeaders(),
               'Content-Type': 'application/json',
               'X-WB-Antibot-Key': this.antibotKey,
               'X-WB-Antibot-SDK-Version': '1.0.0',
               'X-Forwarded-For': '89.169.39.32',
               'X-Real-IP': '89.169.39.32'
             },
             body: JSON.stringify({
               action: "auth",
               userScope: {
                 phone_prefix: phonePrefix
               },
               challenge: data.challenge,
               solution: powSolution
             })
           })
          
          data = await response.json()
          console.log('After POW response:', data)
        }
        
        if (data.secureToken) {
          console.log('Got secure token:', data.secureToken)
          return data.secureToken
        }
      }

      console.log('No secure token found, returning null')
      return null
    } catch (error) {
      console.error('Error in createOneTimeToken:', error)
      return null
    }
  }

  async requestSmsWithToken(phoneNumber: string, secureToken: string) {
    try {
      const response = await fetch('https://wbx-auth.wildberries.ru/v2/code/wb-captcha', {
        method: 'POST',
        headers: {
          ...this.getBaseHeaders(),
          'Content-Type': 'text/plain;charset=UTF-8',
          'WB-AppType': 'web',
          'WB-AppVersion': '12.9.0'
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
          captcha_token: secureToken
        })
      })
      
      const data = await response.json()
      
      if (data.result === 0 && data.payload) {
        const { auth_method, sticker, ttl } = data.payload
        this.session.sticker = sticker
        
        return {
          success: true,
          authMethod: auth_method,
          sticker: sticker,
          ttl: ttl
        }
      }
      
      return { success: false, error: 'Unexpected response format' }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async authenticate(smsCode: string, paymentPubKey: string = "9205a821cac11b8c9808a3a1ca88110e7e185561a23f744f390fc69f2c7bbd86") {
    try {
      const headers = {
        ...this.getBaseHeaders(),
        'Content-Type': 'text/plain;charset=UTF-8',
        'WB-AppType': 'web',
        'WB-AppVersion': '12.9.0'
      }

      const cookieString = this.buildCookieString()
      if (cookieString) {
        headers['Cookie'] = cookieString
      }

      const response = await fetch('https://wbx-auth.wildberries.ru/v2/auth', {
        method: 'POST',
        headers: {
          ...headers,
          'X-Forwarded-For': '89.169.39.32',
          'X-Real-IP': '89.169.39.32'
        },
        body: JSON.stringify({
          sticker: this.session.sticker,
          code: parseInt(smsCode),
          payment_pub_key: paymentPubKey
        })
      })
      
      const data = await response.json()
      
      if (data.result === 0 && data.payload?.access_token) {
        this.session.access_token = data.payload.access_token
        
        this.parseCookiesFromHeaders(response.headers.get('set-cookie')?.split(','))
        
        return true
      }
      
      return false
    } catch (error) {
      return false
    }
  }

  async afterAuth() {
    try {
      const response = await fetch('https://www.wildberries.ru/webapi/security/afterauth', {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'X-Forwarded-For': '89.169.39.32',
          'X-Real-IP': '89.169.39.32'
        },
        body: JSON.stringify({})
      })

      const data = await response.json()
      return data.resultState === 0
    } catch (error) {
      return false
    }
  }

  async getUserInfo() {
    if (!this.session.access_token) {
      return { 
        success: false, 
        error: 'No access token' 
      }
    }

    try {
      if (!this.session.cookies || Object.keys(this.session.cookies).length === 0) {
        if (!this.session.cookies) this.session.cookies = {}
        
        this.session.cookies['_wbauid'] = Date.now().toString() + Math.random().toString().substr(2, 10)
        this.session.cookies['_cp'] = '1'
        
        const wbaasToken = `1|2|${Math.floor(Date.now() / 1000) + 86400}|AA==|${this.generateCorrelationId()}|${btoa(this.generateCorrelationId())}`
        this.session.cookies['x_wbaas_token'] = wbaasToken
      }

      const response = await fetch('https://www.wildberries.ru/webapi/personalinfo', {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
          'X-Forwarded-For': '89.169.39.32',
          'X-Real-IP': '89.169.39.32'
        },
        body: JSON.stringify({})
      })
      
      const data = await response.json()
      
      if (data.resultState === 0 && data.value) {
        this.session.user_info = data.value
        
        return {
          success: true,
          userInfo: data.value
        }
      } else {
        return {
          success: false,
          error: 'Unexpected response format'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status
      }
    }
  }

  async fullAuth(phoneNumber: string, userId: string, supabase: any) {
    // Пытаемся загрузить существующую сессию
    if (await this.loadSession(supabase, userId)) {
      console.log('Проверяем существующую сессию...')
      
      if (await this.validateSession()) {
        console.log('Существующая сессия валидна!')
        return { success: true, fromCache: true }
      }
      
      console.log('Пытаемся обновить токен...')
      if (await this.refreshAccessToken()) {
        if (await this.validateSession()) {
          console.log('Токен успешно обновлен!')
          await this.saveSession(supabase, userId)
          return { success: true, fromRefresh: true }
        }
      }
      
      console.log('Сессия недействительна, требуется новая авторизация')
      await this.deleteSession(supabase, userId)
    }

    return await this.performFullAuth(phoneNumber, userId, supabase)
  }

  normalizePhoneNumber(phoneNumber: string): string {
    // Убираем все пробелы, скобки и дефисы
    let normalized = phoneNumber.replace(/[\s\(\)\-]/g, '')
    
    // Если номер начинается с +, убираем его
    if (normalized.startsWith('+')) {
      normalized = normalized.substring(1)
    }
    
    // Если номер начинается с 8, заменяем на 7
    if (normalized.startsWith('8') && normalized.length === 11) {
      normalized = '7' + normalized.substring(1)
    }
    
    // Если номер начинается с 7 и имеет 11 цифр, оставляем как есть
    if (normalized.startsWith('7') && normalized.length === 11) {
      return normalized
    }
    
    // Если номер начинается с 375 (Беларусь), оставляем как есть
    if (normalized.startsWith('375') && normalized.length === 12) {
      return normalized
    }
    
    // Если номер начинается с 380 (Украина), оставляем как есть
    if (normalized.startsWith('380') && normalized.length === 12) {
      return normalized
    }
    
    // Если номер начинается с 7 и имеет 10 цифр, добавляем 7 в начало
    if (normalized.startsWith('7') && normalized.length === 10) {
      return '7' + normalized
    }
    
    // Если номер имеет 10 цифр и начинается с 9, добавляем 7
    if (normalized.length === 10 && normalized.startsWith('9')) {
      return '7' + normalized
    }
    
    return normalized
  }

  getPhonePrefix(phoneNumber: string): string {
    const normalized = this.normalizePhoneNumber(phoneNumber)
    
    // Для российских номеров (7)
    if (normalized.startsWith('7')) {
      return normalized.substring(0, 1) // Возвращаем только "7"
    }
    
    // Для белорусских номеров (375)
    if (normalized.startsWith('375')) {
      return normalized.substring(0, 3) // Возвращаем "375"
    }
    
    // Для украинских номеров (380)
    if (normalized.startsWith('380')) {
      return normalized.substring(0, 3) // Возвращаем "380"
    }
    
    // По умолчанию возвращаем первые 4 символа
    return normalized.substring(0, 4)
  }

  async performFullAuth(phoneNumber: string, userId: string, supabase: any) {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber)
    const phonePrefix = this.getPhonePrefix(normalizedPhone)
    console.log('Original phone:', phoneNumber)
    console.log('Normalized phone:', normalizedPhone)
    console.log('Phone prefix:', phonePrefix)
    
    const captchaResult = await this.requestCaptcha(normalizedPhone)
    console.log('Captcha result:', captchaResult)
    
    if (captchaResult.error) {
      return { success: false, error: captchaResult.error }
    }

    let finalAuthMethod = 'unknown'

    if (captchaResult.needsCaptcha) {
      console.log('Need captcha, creating token...')
      const secureToken = await this.createOneTimeToken(phonePrefix)
      console.log('Secure token result:', secureToken)
      
      if (!secureToken) {
        return { success: false, error: 'Не удалось создать токен' }
      }

      const smsResult = await this.requestSmsWithToken(normalizedPhone, secureToken)
      console.log('SMS result:', smsResult)
      
      if (!smsResult.success) {
        return { success: false, error: 'Не удалось отправить код' }
      }
      
      finalAuthMethod = smsResult.authMethod || 'sms'
      
    } else if (captchaResult.authMethod) {
      finalAuthMethod = captchaResult.authMethod
      this.session.sticker = captchaResult.sticker
    }

    return {
      success: true,
      needsCode: true,
      authMethod: finalAuthMethod
    }
  }

  async addToCartByArticle(cod_1s: number, quantity: number = 1) {
    if (!this.session.access_token) {
      return {
        success: false,
        error: 'Не авторизован. Требуется выполнить авторизацию'
      }
    }

    console.log(`Получаем информацию о товаре ${cod_1s}...`)
    
    const productInfo = await this.getProductInfo(cod_1s)
    if (!productInfo.success) {
      return productInfo
    }

    const product = productInfo.product
    console.log(`Найден товар: ${product.brand} - ${product.name}`)
    console.log(`Цена: ${(product.price / 100).toFixed(2)} BYN`)

    try {
      const currentTime = Date.now() - 1000000
      
      const url = new URL('https://cart-storage-api.wildberries.ru/api/basket/sync')
      url.searchParams.set('ts', currentTime.toString())
      url.searchParams.set('device_id', this.deviceId)

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
      }

      const headers = {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
        'Origin': 'https://www.wildberries.by',
        'Referer': `https://www.wildberries.by/catalog/${cod_1s}/detail.aspx`,
        'Wb-Apptype': 'site'
      }

      console.log(`Добавляем товар в корзину...`)

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          ...headers,
          'X-Forwarded-For': '89.169.39.32',
          'X-Real-IP': '89.169.39.32'
        },
        body: JSON.stringify([cartItem])
      })

      const result = await response.json()

      if (response.status === 200) {
        if (result.state === 0) {
          console.log(`Товар успешно добавлен в корзину! (state: 0)`)
          return {
            success: true,
            message: `Товар "${product.brand} - ${product.name}" добавлен в корзину`,
            product: product,
            quantity: quantity,
            response: result
          }
        } else {
          console.log(`Товар НЕ добавлен! (state: ${result.state})`)
          return {
            success: false,
            error: `API вернул ошибку (state: ${result.state})`,
            response: result
          }
        }
      } else {
        return {
          success: false,
          error: `Ошибка HTTP ${response.status}: ${response.statusText}`,
          response: result
        }
      }

    } catch (error) {
      console.log(`Ошибка добавления в корзину: ${error.message}`)
      return {
        success: false,
        error: error.message,
        status: error.response?.status
      }
    }
  }

  async getProductInfo(cod_1s: number) {
    try {
      const response = await fetch(`https://card.wb.ru/cards/v4/detail?appType=1&curr=byn&dest=-59202&spp=30&hide_dtype=10%3B13%3B14&ab_testing=false&lang=ru&nm=${cod_1s}`, {
        headers: {
          ...this.getBaseHeaders(),
          'Accept': 'application/json',
          'Origin': 'https://www.wildberries.by',
          'Referer': `https://www.wildberries.by/catalog/${cod_1s}/detail.aspx`,
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'cross-site',
          'X-Forwarded-For': '89.169.39.32',
          'X-Real-IP': '89.169.39.32'
        }
      })

      const data = await response.json()

      if (data?.products?.[0]) {
        const product = data.products[0]
        if (!product) {
          return {
            success: false,
            error: 'Товар не найден в ответе API'
          }
        }
        
        const size = product.sizes?.[0]
        
        if (!size) {
          return {
            success: false,
            error: 'У товара нет доступных размеров/вариантов'
          }
        }

        const price = size.price?.product || 0
        
        return {
          success: true,
          product: {
            chrt_id: size.optionId,
            cod_1s: product.id,
            price: price,
            subject_id: product.subjectId,
            name: product.name || '',
            brand: product.brand || ''
          }
        }
      } else {
        return {
          success: false,
          error: 'Товар не найден в ответе API'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Ошибка получения товара: ${error.message}`
      }
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { action, userId, phoneNumber, smsCode, cod_1s, quantity } = await req.json()

    const wbAuth = new WildberriesAuth()

    switch (action) {
      case 'check_session':
        const isAuthenticated = await wbAuth.loadSession(supabase, userId) && await wbAuth.validateSession()
        if (isAuthenticated) {
          const userResult = await wbAuth.getUserInfo()
          return new Response(JSON.stringify({
            success: true,
            isAuthenticated: true,
            userInfo: userResult.userInfo
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        } else {
          return new Response(JSON.stringify({
            success: true,
            isAuthenticated: false
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

      case 'request_code':
        console.log('Requesting code for phone:', phoneNumber, 'userId:', userId)
        const authResult = await wbAuth.fullAuth(phoneNumber, userId, supabase)
        console.log('Auth result:', authResult)
        return new Response(JSON.stringify(authResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

      case 'verify_code':
        await wbAuth.loadSession(supabase, userId)
        const authenticated = await wbAuth.authenticate(smsCode)
        if (authenticated) {
          await wbAuth.afterAuth()
          const userResult = await wbAuth.getUserInfo()
          if (userResult.success) {
            await wbAuth.saveSession(supabase, userId)
            return new Response(JSON.stringify({
              success: true,
              userInfo: userResult.userInfo
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
          } else {
            return new Response(JSON.stringify({
              success: false,
              error: 'Ошибка получения данных пользователя'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
          }
        } else {
          return new Response(JSON.stringify({
            success: false,
            error: 'Неверный код подтверждения'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

      case 'add_to_cart':
        await wbAuth.loadSession(supabase, userId)
        const cartResult = await wbAuth.addToCartByArticle(cod_1s, quantity)
        return new Response(JSON.stringify(cartResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

  } catch (error) {
    console.error('Error in wb-auth function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}) 