import { supabase } from './supabase'

interface AuthResponse {
  success: boolean
  message?: string
  needsCode?: boolean
  sessionId?: string
  cooldownSeconds?: number
  authData?: {
    deviceId: string
    correlationId: string
    session: {
      accessToken: string
      refreshToken?: string
      validationKey?: string
      userInfo?: any
    }
    cookies: any
  }
}

interface SessionData {
  device_id: string
  correlation_id: string
  access_token: string
  refresh_token?: string
  validation_key?: string
  user_info?: any
  cookies?: any
  created_at: string
  updated_at: string
}

class WildberriesAuth {
  private baseUrl = 'https://api.teleshop.su'
  private sessionId: string | null = null

  async startAuth(phoneNumber: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({ phoneNumber })
      })

      // Даже если статус не 2xx, пробуем разобрать тело
      const raw = await response.text()
      let json: any = {}
      try { json = raw ? JSON.parse(raw) : {} } catch {}

      if (!response.ok) {
        // Обрабатываем кейс WB: waiting resend (result: 4) с TTL
        const ttl = json?.payload?.ttl
        const isWaitingResend = json?.error === 'waiting resend' || json?.result === 4
        if (isWaitingResend) {
          return {
            success: true,
            needsCode: true,
            cooldownSeconds: typeof ttl === 'number' ? ttl : 60,
            message: 'Код уже отправлен. Подождите перед повторной отправкой.'
          }
        }
        return { success: false, message: json?.error || `HTTP ${response.status}` }
      }

      const data: AuthResponse = json
      
      if (data.success && data.sessionId) {
        this.sessionId = data.sessionId
        try { localStorage.setItem('wb_auth_session_id', data.sessionId) } catch {}
      }

      return data
    } catch (error) {
      console.error('❌ Ошибка начала авторизации:', error)
      return {
        success: false,
        message: 'Ошибка начала авторизации'
      }
    }
  }

  async completeAuth(smsCode: string): Promise<AuthResponse> {
    if (!this.sessionId) {
      return {
        success: false,
        message: 'Нет активной сессии'
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/auth/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json'
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          smsCode
        })
      })

      const data: AuthResponse = await response.json()
      
      if (data.success && data.authData) {
        await this.saveSession(data.authData)
        // Сессия больше не нужна для шага авторизации, но оставим sessionId в storage для cart API
      }

      return data
    } catch (error) {
      console.error('❌ Ошибка завершения авторизации:', error)
      return {
        success: false,
        message: 'Ошибка завершения авторизации'
      }
    }
  }

  private async saveSession(authData: any): Promise<void> {
    try {
      // Получаем Telegram user ID из WebApp или используем сохраненный анонимный
      const telegramUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user
      let userId: string
      
      if (telegramUser?.id) {
        userId = telegramUser.id.toString()
        console.log(`✅ Используем Telegram user ID: ${userId}`)
      } else {
        // Получаем сохраненный анонимный ID или генерируем новый
        let anonId = localStorage.getItem('wb_anon_user_id')
        if (!anonId) {
          anonId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          localStorage.setItem('wb_anon_user_id', anonId)
          console.log(`🔄 Генерируем новый анонимный user ID: ${anonId}`)
        } else {
          console.log(`✅ Используем сохраненный анонимный user ID: ${anonId}`)
        }
        userId = anonId
      }

      console.log('💾 Сохраняем сессию с данными:', {
        deviceId: authData.deviceId,
        correlationId: authData.correlationId,
        accessToken: authData.session.accessToken ? '***' : 'undefined'
      })

      const sessionData: SessionData = {
        device_id: authData.deviceId,
        correlation_id: authData.correlationId,
        access_token: authData.session.accessToken,
        refresh_token: authData.session.refreshToken,
        validation_key: authData.session.validationKey,
        user_info: authData.session.userInfo,
        cookies: authData.cookies,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Сначала удаляем старые сессии для этого пользователя
      await supabase
        .from('wb_sessions')
        .delete()
        .eq('user_id', userId)

      // Сохраняем новую сессию
      const { error } = await supabase
        .from('wb_sessions')
        .insert({
          user_id: userId,
          ...sessionData
        })

      if (error) {
        console.error('❌ Ошибка сохранения сессии:', error)
      } else {
        console.log('✅ Сессия сохранена успешно')
      }
    } catch (error) {
      console.error('❌ Ошибка сохранения сессии:', error)
    }
  }

  async checkSession(): Promise<boolean> {
    try {
      // Получаем Telegram user ID из WebApp или используем сохраненный анонимный
      const telegramUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user
      let userId: string
      
      if (telegramUser?.id) {
        userId = telegramUser.id.toString()
        console.log(`✅ Используем Telegram user ID: ${userId}`)
      } else {
        // Получаем сохраненный анонимный ID или генерируем новый
        let anonId = localStorage.getItem('wb_anon_user_id')
        if (!anonId) {
          anonId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          localStorage.setItem('wb_anon_user_id', anonId)
          console.log(`🔄 Генерируем новый анонимный user ID: ${anonId}`)
        } else {
          console.log(`✅ Используем сохраненный анонимный user ID: ${anonId}`)
        }
        userId = anonId
      }

      const { data: session } = await supabase
        .from('wb_sessions')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (session) {
        console.log('✅ Сессия найдена в базе данных')
        return true
      } else {
        console.log('📂 Сессия не найдена в базе данных')
        return false
      }
    } catch (error) {
      console.error('❌ Ошибка проверки сессии:', error)
      return false
    }
  }

  async getSession(): Promise<SessionData | null> {
    try {
      // Получаем Telegram user ID из WebApp или используем сохраненный анонимный
      const telegramUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user
      let userId: string
      
      if (telegramUser?.id) {
        userId = telegramUser.id.toString()
        console.log(`✅ Используем Telegram user ID: ${userId}`)
      } else {
        // Получаем сохраненный анонимный ID или генерируем новый
        let anonId = localStorage.getItem('wb_anon_user_id')
        if (!anonId) {
          anonId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          localStorage.setItem('wb_anon_user_id', anonId)
          console.log(`🔄 Генерируем новый анонимный user ID: ${anonId}`)
        } else {
          console.log(`✅ Используем сохраненный анонимный user ID: ${anonId}`)
        }
        userId = anonId
      }

      const { data: session } = await supabase
        .from('wb_sessions')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (session) {
        console.log('✅ Сессия найдена в базе данных')
        return session
      } else {
        console.log('❌ Сессия не найдена')
        return null
      }
    } catch (error) {
      console.error('❌ Ошибка получения сессии:', error)
      return null
    }
  }

  async addToCart(productId: string, quantity: number = 1): Promise<{ success: boolean; needsReauth?: boolean; message?: string }> {
    try {
      const session = await this.getSession()
      if (!session) {
        return { success: false, message: 'Нет авторизации Wildberries' }
      }

      console.log(`🔍 Получаем информацию о товаре ${productId}...`)
      
      // Получаем информацию о товаре
      const productInfo = await this.getProductInfo(productId)
      if (!productInfo) {
        return { success: false, message: 'Ошибка получения данных товара' }
      }
      
      console.log(`📦 Найден товар: ${productInfo.brand} - ${productInfo.name}`)
             console.log(`💰 Цена: ${productInfo.price} RUB`)

      // Используем актуальные UNIX секунды без сдвига назад
      const tsSec = Math.floor(Date.now() / 1000)
      
      // Если доступен sessionId от нашего бекенда, используем централизованный API
      const sessionId = this.sessionId || localStorage.getItem('wb_auth_session_id') || ''
      if (sessionId) {
        try {
          const backendResp = await fetch(`${this.baseUrl}/api/cart/add`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              accept: 'application/json'
            },
            body: JSON.stringify({
              sessionId,
              cod_1s: productInfo.nmId,
              quantity
            })
          })
          const backendJson = await backendResp.json()
          console.log('🧩 Cart API response:', backendJson)
          if (backendResp.ok) {
            // Трактуем state 0 и 1 как успех добавления
            if (backendJson.state === 0 || backendJson.state === 1 || backendJson?.response?.state === 0 || backendJson?.response?.state === 1) {
              const needsReauth = backendJson.state === 1 || backendJson?.response?.state === 1
              return {
                success: true,
                needsReauth,
                message: `Товар "${productInfo?.brand || 'Неизвестный'} - ${productInfo?.name || 'Товар'}" добавлен в корзину`
              }
            }
            return { success: false, message: backendJson?.error || 'Ошибка добавления в корзину' }
          }
          return { success: false, message: backendJson?.error || `Ошибка HTTP ${backendResp.status}` }
        } catch (e) {
          console.log('⚠️ Cart API недоступен, fallback на прямой WB', e)
        }
      }

      // Fallback: прямой WB через прокси (оставляем прежнюю реализацию)
      const url = `https://cart-storage-api.wildberries.ru/api/basket/sync?ts=${tsSec}&device_id=${session.device_id}`

      const cartItem = {
        chrt_id: productInfo.id,
        quantity: quantity,
        cod_1s: productInfo.nmId,
        client_ts: tsSec,
        op_type: 1,
        target_url: "EX|3|MCS|IT|||||||||",
        meta_json: JSON.stringify({ originalPrice: { price: productInfo.price.toString() } }),
        price: productInfo.price * 100,
        subject_id: productInfo.subjectId,
        currency: "RUB",
        timezonemin: 360
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'Origin': 'https://www.wildberries.ru',
        'Referer': 'https://www.wildberries.ru/lk/basket',
        'X-Requested-With': 'XMLHttpRequest',
        'DeviceId': session.device_id,
        'X-SPA-Version': (import.meta as any).env?.VITE_WB_SPA_VERSION || '10.0.0',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      } as Record<string, string>

      const response = await fetch('https://kzrafexlalajoirzugdj.supabase.co/functions/v1/wb-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(window as any).SUPABASE_ANON_KEY || ''}`
        },
        body: JSON.stringify({ url, method: 'POST', headers, body: [cartItem] })
      })
      const data = await response.json()

      if (response.status === 200) {
        if (data.state === 0 || data.state === 1) {
          const needsReauth = data.state === 1
          return {
            success: true,
            needsReauth,
            message: `Товар "${productInfo?.brand || 'Неизвестный'} - ${productInfo?.name || 'Товар'}" добавлен в корзину`
          }
        }
        return { success: false, message: `API вернул ошибку (state: ${data.state})` }
      }
      return { success: false, message: `Ошибка HTTP ${response.status}: ${response.statusText}` }
    } catch (error) {
      console.error('❌ Ошибка добавления в корзину:', error)
      return { success: false, message: 'Ошибка добавления в корзину' }
    }
  }

  /**
   * Генерирует URL изображений товара Wildberries
   */
  private generateProductImages(nmId: number, picsCount: number): string[] {
    const nm = parseInt(nmId.toString(), 10)
    const vol = Math.floor(nm / 1e5)
    const part = Math.floor(nm / 1e3)
    
    // Правильная логика определения хоста
    let hostNumStr: string
    if (vol >= 0 && vol <= 143) hostNumStr = '01'
    else if (vol >= 144 && vol <= 287) hostNumStr = '02'
    else if (vol >= 288 && vol <= 431) hostNumStr = '03'
    else if (vol >= 432 && vol <= 719) hostNumStr = '04'
    else if (vol >= 720 && vol <= 1007) hostNumStr = '05'
    else if (vol >= 1008 && vol <= 1061) hostNumStr = '06'
    else if (vol >= 1062 && vol <= 1115) hostNumStr = '07'
    else if (vol >= 1116 && vol <= 1169) hostNumStr = '08'
    else if (vol >= 1170 && vol <= 1313) hostNumStr = '09'
    else if (vol >= 1314 && vol <= 1601) hostNumStr = '10'
    else if (vol >= 1602 && vol <= 1655) hostNumStr = '11'
    else if (vol >= 1656 && vol <= 1919) hostNumStr = '12'
    else if (vol >= 1920 && vol <= 2045) hostNumStr = '13'
    else if (vol >= 2046 && vol <= 2189) hostNumStr = '14'
    else if (vol >= 2190 && vol <= 2405) hostNumStr = '15'
    else if (vol >= 2406 && vol <= 2621) hostNumStr = '16'
    else if (vol >= 2622 && vol <= 2837) hostNumStr = '17'
    else if (vol >= 2838 && vol <= 3053) hostNumStr = '18'
    else if (vol >= 3054 && vol <= 3269) hostNumStr = '19'
    else if (vol >= 3270 && vol <= 3485) hostNumStr = '20'
    else if (vol >= 3486 && vol <= 3701) hostNumStr = '21'
    else if (vol >= 3702 && vol <= 3917) hostNumStr = '22'
    else if (vol >= 3918 && vol <= 4133) hostNumStr = '23'
    else if (vol >= 4134 && vol <= 4349) hostNumStr = '24'
    else if (vol >= 4350 && vol <= 4565) hostNumStr = '25'
    else if (vol >= 4566 && vol <= 4781) hostNumStr = '26'
    else if (vol >= 4782 && vol <= 4997) hostNumStr = '27'
    else if (vol >= 4998 && vol <= 5213) hostNumStr = '28'
    else if (vol >= 5214 && vol <= 5429) hostNumStr = '29'
    else hostNumStr = '30'

    const images: string[] = []
    
    console.log(`🖼️ Генерируем изображения для товара ${nmId}: vol=${vol}, part=${part}, host=${hostNumStr}`)
    
    // Основные варианты - big изображения
    const basePath = `https://basket-${hostNumStr}.wbbasket.ru/vol${vol}/part${part}/${nm}/images/big/`
    for (let i = 1; i <= picsCount; i++) {
      images.push(`${basePath}${i}.webp`)
      images.push(`${basePath}${i}.jpg`)
    }
    
    // Альтернативные размеры
    const alternativeSizes = ['c246x328', 'c516x688', 'c246x328']
    for (const size of alternativeSizes) {
      for (let i = 1; i <= Math.min(picsCount, 5); i++) {
        images.push(`https://basket-${hostNumStr}.wbbasket.ru/vol${vol}/part${part}/${nm}/images/${size}/${i}.jpg`)
      }
    }
    
    // Резервные варианты - старый домен
    const oldBasePath = `https://basket-${hostNumStr}.wb.ru/vol${vol}/part${part}/${nm}/images/big/`
    for (let i = 1; i <= Math.min(picsCount, 3); i++) {
      images.push(`${oldBasePath}${i}.webp`)
      images.push(`${oldBasePath}${i}.jpg`)
    }
    
    // Еще один резервный вариант - без размера
    const simplePath = `https://basket-${hostNumStr}.wbbasket.ru/vol${vol}/part${part}/${nm}/images/`
    for (let i = 1; i <= Math.min(picsCount, 3); i++) {
      images.push(`${simplePath}${i}.jpg`)
    }
    
    // Дополнительные варианты для новых хостов
    if (parseInt(hostNumStr) >= 18) {
      // Для новых хостов пробуем дополнительные форматы
      for (let i = 1; i <= Math.min(picsCount, 2); i++) {
        images.push(`https://basket-${hostNumStr}.wbbasket.ru/vol${vol}/part${part}/${nm}/images/c246x328/${i}.webp`)
        images.push(`https://basket-${hostNumStr}.wbbasket.ru/vol${vol}/part${part}/${nm}/images/c516x688/${i}.webp`)
      }
    }
    
    return images
  }

  /**
   * Получить информацию о товаре с актуальными ценами
   */
/**
   * Получить информацию о товаре с актуальными ценами
   */
async getProductInfo(nmId: string): Promise<{
  id: number        // size.optionId для chrt_id
  nmId: number      // product.id для cod_1s  
  subjectId: number // product.subjectId для subject_id
  name: string
  brand: string
  price: number     // size.price.product (без логистики)
  originalPrice?: number
  rating: number
  feedbacks: number
  stock: number
  images: string[]
  available: boolean
} | null> {
  try {
    // ✅ Исправленные параметры API
    const url = `https://card.wb.ru/cards/v4/detail?appType=1&curr=rub&dest=197&spp=30&hide_dtype=10%3B13%3B14&ab_testing=false&lang=ru&nm=${nmId}`
    
    console.log(`🔗 Используем Edge Function прокси для: ${url}`)

    const response = await fetch('https://kzrafexlalajoirzugdj.supabase.co/functions/v1/wb-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(window as any).SUPABASE_ANON_KEY || ''}`
      },
      body: JSON.stringify({
        url: url,
        method: 'GET',
        headers: {
          'Origin': 'https://www.wildberries.kz',
          'Referer': `https://www.wildberries.kz/catalog/${nmId}/detail.aspx`
        }
      })
    })

    if (!response.ok) {
      console.error('Ошибка получения информации о товаре:', response.status)
      return null
    }

    const data = await response.json()
    
    if (!data.products || data.products.length === 0) {
      console.error('Товар не найден')
      return null
    }

    const product = data.products[0]
    const sizes = product.sizes || []
    
    if (sizes.length === 0) {
      console.error('Нет доступных размеров/вариантов')
      return null
    }

    // Берем первый доступный размер
    const size = sizes[0]
    const price = size.price

         // ✅ Используем product + logistics, переводим в рубли
     const productPrice = Math.round((price.product || 0) / 100) // Целое число в рублях
     const logisticsPrice = Math.round((price.logistics || 0) / 100) // Целое число в рублях
     const totalPrice = productPrice + logisticsPrice
     const originalPrice = price.basic ? Math.round(price.basic / 100) : undefined

    // Получаем все изображения товара
    const images = this.generateProductImages(product.id, product.pics)

    return {
      id: size.optionId,           // ✅ ID размера для chrt_id
      nmId: product.id,            // ✅ ID товара для cod_1s
      subjectId: product.subjectId, // ✅ ID категории для subject_id
      name: product.name,
      brand: product.brand,
      price: totalPrice,           // ✅ product + logistics
      originalPrice: originalPrice,
      rating: product.reviewRating || 0,
      feedbacks: product.feedbacks || 0,
      stock: product.totalQuantity || 0,
      images: images,
      available: product.totalQuantity > 0
    }
  } catch (error) {
    console.error('Ошибка получения информации о товаре:', error)
    return null
  }
}



  async fetchOrders(): Promise<any[]> {
    try {
      const session = await this.getSession()
      if (!session) {
        throw new Error('Нет авторизации Wildberries')
      }

      const response = await fetch('https://wbxoofex.wildberries.ru/api/v2/orders', {
        method: 'GET',
        headers: {
          'Accept': '*/*',
          'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
          'Authorization': `Bearer ${session.access_token}`,
          'Origin': 'https://www.wildberries.ru',
          'Referer': 'https://www.wildberries.ru/lk/myorders/delivery',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('📋 Получены заказы:', data)
      
      return data.data || []
    } catch (error) {
      console.error('❌ Ошибка получения заказов:', error)
      throw error
    }
  }
}

export const wbAuthInstance = new WildberriesAuth() 