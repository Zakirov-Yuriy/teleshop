/*
  # Wildberries Sync Edge Function
  
  Безопасная синхронизация товаров с Wildberries API.
  Функция получает товары через API Wildberries и обновляет базу данных.
*/

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

interface WBCard {
  nmID: number
  imtID: number
  object: string
  vendorCode: string
  brand: string
  title: string
  description: string
  video: string
  dimensions: {
    length: number
    width: number
    height: number
  }
  characteristics: Array<{
    id: number
    name: string
    value: string[]
  }>
  sizes: Array<{
    chrtID: number
    techSize: string
    wbSize: string
    skus: string[]
  }>
  photos: Array<{
    big: string
    c246x328: string
    c516x688: string
    square: string
    tm: string
  }>
  createdAt: string
  updatedAt: string
}

interface WBPriceItem {
  nmID: number
  price: number
  salePrice: number
  discount?: number
}

interface SyncRequest {
  store_id: string
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

    // Получаем JWT токен из заголовка Authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const jwt = authHeader.replace('Bearer ', '')
    
    // Проверяем JWT и получаем user_id
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { store_id }: SyncRequest = await req.json()

    if (!store_id) {
      return new Response(JSON.stringify({ error: 'store_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Проверяем, что пользователь является владельцем магазина
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('wildberries_token, name')
      .eq('id', store_id)
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return new Response(JSON.stringify({ error: 'Store not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!store.wildberries_token) {
      return new Response(JSON.stringify({ error: 'Wildberries token not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Синхронизируем товары с Wildberries
    const syncResult = await syncWildberriesProducts(supabase, store_id, store.wildberries_token)

    return new Response(JSON.stringify(syncResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in sync-wildberries function:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function syncWildberriesProducts(supabase: any, storeId: string, wbToken: string) {
  try {
    console.log(`syncWildberriesProducts: Starting sync for store ${storeId}`)
    
    // Получаем товары с Wildberries
    const cards = await getWildberriesCards(wbToken)
    console.log(`syncWildberriesProducts: Retrieved ${cards?.length || 0} cards from Wildberries`)
    
    if (!cards || cards.length === 0) {
      console.log('syncWildberriesProducts: No cards found, returning early')
      return {
        success: true,
        synced_count: 0,
        error_count: 0,
        total_products: 0,
        message: 'No products found in Wildberries account'
      }
    }

    // Получаем цены для всех товаров
    const nmIDs = cards.map(card => card.nmID)
    console.log('syncWildberriesProducts: Getting prices for nmIDs:', nmIDs.slice(0, 10), '...')
    const prices = await getWildberriesPrices(wbToken, nmIDs)
    console.log(`syncWildberriesProducts: Retrieved ${prices.length} price records`)
    
    let syncedCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const card of cards) {
      try {
        console.log(`\nsyncWildberriesProducts: Processing card ${card.nmID} - ${card.title}`)
        
        // Получаем изображения
        const images: string[] = []
        if (card.photos && card.photos.length > 0) {
          images.push(...card.photos.map(photo => photo.big))
        }

        // Получаем цену товара
        const priceInfo = prices.find(p => p.nmID === card.nmID)
        console.log(`syncWildberriesProducts: Price info for ${card.nmID}:`, JSON.stringify(priceInfo))
        
        // Цены уже в рублях, не нужно делить на 100
        const discountedPrice = priceInfo ? priceInfo.salePrice : 0
        const originalPrice = priceInfo ? priceInfo.price : 0
        console.log(`syncWildberriesProducts: Calculated prices for ${card.nmID}: discounted=${discountedPrice} RUB, original=${originalPrice} RUB`)

        // Определяем наличие товара
        const inStock = card.sizes?.some(size => size.skus && size.skus.length > 0) || false
        
        // Пропускаем товары без цены или не в наличии
        if (discountedPrice <= 0 || !inStock) {
          console.log(`syncWildberriesProducts: Skipping product ${card.nmID} - no price (${discountedPrice}) or not in stock (${inStock})`)
          continue
        }

        // Получаем характеристики
        const characteristics = card.characteristics || []
        const brand = characteristics.find(char => char.name === 'Бренд')?.value?.[0] || card.brand || ''
        const category = card.object || ''

        const product = {
          store_id: storeId,
          wb_id: card.nmID.toString(),
          marketplace: 'wildberries',
          marketplace_id: card.nmID.toString(),
          name: card.title || 'Без названия',
          description: card.description || '',
          price: discountedPrice,
          images: images,
          category: category,
          brand: brand,
          rating: 0, // API v2 не предоставляет рейтинг в списке карточек
          reviews_count: 0, // API v2 не предоставляет количество отзывов в списке карточек
          in_stock: inStock,
          properties: {
            vendorCode: card.vendorCode,
            imtID: card.imtID,
            object: card.object,
            dimensions: card.dimensions,
            characteristics: card.characteristics,
            sizes: card.sizes,
            video: card.video,
            originalPrice: originalPrice,
            discountedPrice: discountedPrice,
            discount: priceInfo?.discount || 0
          }
        }

        console.log(`syncWildberriesProducts: Syncing active product ${card.nmID}:`, JSON.stringify({
          marketplace_id: product.marketplace_id,
          name: product.name,
          price: product.price,
          originalPrice: product.properties.originalPrice,
          discountedPrice: product.properties.discountedPrice,
          discount: product.properties.discount
        }))
        const { error } = await supabase
          .from('products')
          .upsert(product, { 
            onConflict: 'store_id,marketplace,marketplace_id',
            ignoreDuplicates: false 
          })

        if (error) {
          console.error(`syncWildberriesProducts: Error syncing product ${card.nmID}:`, error)
          errors.push(`Product ${card.nmID}: ${error.message}`)
          errorCount++
        } else {
          console.log(`syncWildberriesProducts: Successfully synced product ${card.nmID}`)
          syncedCount++
        }
      } catch (productError) {
        console.error(`syncWildberriesProducts: Error processing product ${card.nmID}:`, productError)
        errors.push(`Product ${card.nmID}: ${productError.message}`)
        errorCount++
      }
    }

    console.log(`syncWildberriesProducts: Sync completed. Synced: ${syncedCount}, Errors: ${errorCount}`)
    return {
      success: true,
      synced_count: syncedCount,
      error_count: errorCount,
      total_products: cards.length,
      errors: errors.slice(0, 10) // Ограничиваем количество ошибок в ответе
    }
  } catch (error) {
    console.error('syncWildberriesProducts: Critical error:', error)
    throw error
  }
}

async function getWildberriesCards(token: string, limit = 100): Promise<WBCard[]> {
  console.log(`getWildberriesCards: Starting with limit ${limit}`)
  const url = 'https://content-api.wildberries.ru/content/v2/get/cards/list'
  
  const requestBody = {
    settings: {
      cursor: {
        limit: limit
      },
      filter: {
        withPhoto: -1 // Получаем все товары (с фото и без)
      }
    }
  }

  console.log('getWildberriesCards: Request body:', JSON.stringify(requestBody))
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  })

  console.log(`getWildberriesCards: Response status: ${response.status}`)
  if (!response.ok) {
    const errorText = await response.text()
    console.error('getWildberriesCards: API Error response:', errorText)
    throw new Error(`Wildberries Content API Error: ${response.status} ${response.statusText}. Response: ${errorText}`)
  }

  const data = await response.json()
  console.log('getWildberriesCards: API response structure:', {
    hasCards: !!data.cards,
    cardsLength: data.cards?.length || 0,
    hasError: !!data.error,
    errorText: data.errorText
  })
  
  if (data.error) {
    console.error('getWildberriesCards: API returned error:', data.errorText)
    throw new Error(`Wildberries Content API Error: ${data.errorText || 'Unknown error'}`)
  }

  console.log(`getWildberriesCards: Successfully retrieved ${data.cards?.length || 0} cards`)
  return data.cards || []
}

async function getWildberriesPrices(token: string, nmIDs: number[]): Promise<WBPriceItem[]> {
  if (!nmIDs || nmIDs.length === 0) {
    console.log('getWildberriesPrices: No nmIDs provided')
    return []
  }

  console.log(`getWildberriesPrices: Starting price sync for ${nmIDs.length} products`)
  const baseUrl = 'https://discounts-prices-api.wildberries.ru/api/v2/list/goods/filter'
  const prices: WBPriceItem[] = []
  
  // Обрабатываем товары по одному через GET запросы
  for (let i = 0; i < nmIDs.length; i++) {
    const nmID = nmIDs[i]
    console.log(`getWildberriesPrices: Processing nmID ${i + 1}/${nmIDs.length}: ${nmID}`)
    
    try {
      const url = `${baseUrl}?filterNmID=${nmID}&limit=1&offset=0`
      console.log('getWildberriesPrices: Request URL:', url)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': token,
        },
      })

      console.log(`getWildberriesPrices: Response status: ${response.status}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`getWildberriesPrices: API response for ${nmID}:`, JSON.stringify(data, null, 2))
        
        if (data.data?.listGoods && Array.isArray(data.data.listGoods)) {
          console.log(`getWildberriesPrices: Found ${data.data.listGoods.length} goods in response for ${nmID}`)
          
          // Добавляем полученную цену - используем discountedPrice вместо salePrice
          data.data.listGoods.forEach((good: any) => {
            // Извлекаем цены из первого размера (sizes[0])
            const firstSize = good.sizes?.[0]
            const basePrice = firstSize?.price || 0
            const discountedPrice = firstSize?.discountedPrice || firstSize?.price || 0
            
            const priceItem = {
              nmID: good.nmID || nmID,
              price: basePrice,
              salePrice: discountedPrice,
              discount: good.discount || 0
            }
            console.log(`getWildberriesPrices: Processing good for ${nmID}:`, JSON.stringify(priceItem))
            prices.push(priceItem)
          })
        } else {
          console.log(`getWildberriesPrices: No listGoods found in response for ${nmID}`)
          // Добавляем товар с нулевыми ценами если не найден
          prices.push({
            nmID: nmID,
            price: 0,
            salePrice: 0,
            discount: 0
          })
        }
      } else {
        const errorText = await response.text()
        console.error(`getWildberriesPrices: Error getting price for ${nmID}:`, response.status, response.statusText, errorText)
        // При ошибке добавляем товар с нулевыми ценами
        prices.push({
          nmID: nmID,
          price: 0,
          salePrice: 0,
          discount: 0,
        })
      }
      
      // Задержка между запросами для соблюдения лимитов API (10 запросов за 6 секунд = 600мс между запросами)
      if (i < nmIDs.length - 1) {
        console.log('getWildberriesPrices: Waiting 700ms before next request...')
        await new Promise(resolve => setTimeout(resolve, 700))
      }
    } catch (error) {
      console.error(`getWildberriesPrices: Error processing ${nmID}:`, error)
      // При ошибке добавляем товар с нулевыми ценами
      prices.push({
        nmID: nmID,
        price: 0,
        salePrice: 0,
        discount: 0,
      })
    }
  }

  console.log(`getWildberriesPrices: Completed. Total prices collected: ${prices.length}`)
  console.log('getWildberriesPrices: Sample prices:', prices.slice(0, 5))
  return prices
}

function calculateFinalPrice(salePriceInRubles: number): number {
  console.log(`calculateFinalPrice: Input salePrice: ${salePriceInRubles} rubles`)
  
  if (!salePriceInRubles || salePriceInRubles <= 0) {
    console.log('calculateFinalPrice: Invalid or zero salePrice, returning 0')
    return 0
  }
  
  // Цена уже в рублях, возвращаем как есть
  const finalPrice = salePriceInRubles
  console.log(`calculateFinalPrice: Final price: ${finalPrice} RUB`)
  return finalPrice
}