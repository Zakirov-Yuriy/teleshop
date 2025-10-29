/*
  # Ozon Sync Edge Function
  
  Безопасная синхронизация товаров с Ozon API.
  Функция получает товары через API Ozon и обновляет базу данных.
*/

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
      .select('ozon_client_id, ozon_api_key, name')
      .eq('id', store_id)
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return new Response(JSON.stringify({ error: 'Store not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!store.ozon_client_id || !store.ozon_api_key) {
      return new Response(JSON.stringify({ error: 'Ozon credentials not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Синхронизируем товары с Ozon
    const syncResult = await syncOzonProducts(supabase, store_id, store.ozon_client_id, store.ozon_api_key)

    return new Response(JSON.stringify(syncResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in sync-ozon function:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function syncOzonProducts(supabase: any, storeId: string, clientId: string, apiKey: string) {
  try {
    console.log(`syncOzonProducts: Starting sync for store ${storeId}`)
    console.log(`syncOzonProducts: Using clientId: ${clientId}, apiKey: ${apiKey ? '***' + apiKey.slice(-4) : 'NOT SET'}`)
    
    // Проверяем, что у нас есть необходимые данные
    if (!clientId || !apiKey) {
      throw new Error('Ozon credentials are missing')
    }
    
    // Получаем список товаров с Ozon
    const products = await getOzonProducts(clientId, apiKey)
    console.log(`syncOzonProducts: Retrieved ${products?.length || 0} products from Ozon`)
    
    if (!products || products.length === 0) {
      console.log('syncOzonProducts: No products found, returning early')
      return {
        success: true,
        synced_count: 0,
        error_count: 0,
        total_products: 0,
        message: 'No products found in Ozon account'
      }
    }

    // Получаем детальную информацию о товарах
    const productIds = products.map(p => p.product_id)
    console.log(`syncOzonProducts: Getting detailed info for ${productIds.length} products`)
    
    const [productInfo, priceInfo, stockInfo, ratingInfo] = await Promise.all([
      getOzonProductInfo(clientId, apiKey, productIds),
      getOzonProductPrices(clientId, apiKey, productIds),
      getOzonProductStocks(clientId, apiKey, productIds),
      getOzonProductRating(clientId, apiKey, productIds)
    ])

    console.log(`syncOzonProducts: Retrieved additional info for ${productIds.length} products`)
    console.log(`syncOzonProducts: Product info items: ${productInfo.result?.items?.length || 0}`)
    console.log(`syncOzonProducts: Price info items: ${priceInfo.result?.items?.length || 0}`)
    console.log(`syncOzonProducts: Stock info items: ${stockInfo.result?.items?.length || 0}`)
    console.log(`syncOzonProducts: Rating info products: ${ratingInfo.result?.products?.length || 0}`)
    
    let syncedCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Обрабатываем каждый товар
    const productsToUpsert: any[] = []
    
    for (const product of products) {
      console.log(`Processing product: offer_id=${product.offer_id}, product_id=${product.product_id}`)
      
      // Пропускаем архивированные товары
      if (product.archived) {
        console.log(`Skipping archived product ${product.product_id}`)
        continue
      }
      
      // Получаем детальную информацию о товаре
      const productDetails = await getProductDetails(clientId, apiKey, product.product_id)
      
      // Получаем информацию о ценах для товара
      const priceInfo = await getProductPrices(clientId, apiKey, product.offer_id, product.product_id)
      
      // Получаем изображения товара
      const images = await getProductImages(clientId, apiKey, product.product_id)
      
      // Получаем данные об остатках из stocks (если есть)
      const stockData = product.stocks?.[0] || {}
      const totalStock = stockData.present || 0
      const reservedStock = stockData.reserved || 0
      const sku = stockData.sku?.toString() || null
      
      // Подготавливаем данные для вставки
      const productData = {
        store_id: storeId,
        marketplace: 'ozon',
        marketplace_id: product.product_id?.toString() || product.offer_id,
        name: productDetails?.name || product.offer_id || `Product ${product.product_id}`,
        description: productDetails?.description || '',
        price: priceInfo?.price || 0,
        old_price: priceInfo?.old_price || 0,
        stock: totalStock,
        reserved: reservedStock,
        sku: sku,
        images: images,
        in_stock: product.has_fbo_stocks || product.has_fbs_stocks,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      console.log(`Product data prepared:`, {
        marketplace_id: productData.marketplace_id,
        name: productData.name,
        price: productData.price,
        stock: productData.stock,
        images_count: productData.images?.length || 0
      })
      productsToUpsert.push(productData)
    }
    
    // Вставляем все товары в базу данных
    if (productsToUpsert.length > 0) {
      console.log(`syncOzonProducts: Upserting ${productsToUpsert.length} products to database`)
      
      const { error: upsertError } = await supabase
        .from('products')
        .upsert(productsToUpsert, { 
          onConflict: 'store_id,marketplace,marketplace_id',
          ignoreDuplicates: false 
        })
      
      if (upsertError) {
        console.error('syncOzonProducts: Database upsert error:', upsertError)
        throw new Error(`Database error: ${upsertError.message}`)
      }
      
      console.log(`syncOzonProducts: Successfully synced ${productsToUpsert.length} products`)
      syncedCount = productsToUpsert.length
    } else {
      console.log('syncOzonProducts: No products to sync')
    }

    console.log(`syncOzonProducts: Sync completed. Synced: ${syncedCount}, Errors: ${errorCount}`)
    return {
      success: true,
      synced_count: syncedCount,
      error_count: errorCount,
      total_products: products.length,
      errors: errors.slice(0, 10)
    }
  } catch (error) {
    console.error('syncOzonProducts: Critical error:', error)
    throw error
  }
}

async function getOzonProducts(clientId: string, apiKey: string, limit = 1000): Promise<any[]> {
  console.log(`getOzonProducts: Starting with limit ${limit}`)
  const url = 'https://api-seller.ozon.ru/v3/product/list'
  
  const requestBody = {
    limit: limit,
    last_id: '',
    filter: {
      visibility: 'ALL'
    }
  }

  console.log('getOzonProducts: Request body:', JSON.stringify(requestBody))
  console.log('getOzonProducts: Headers:', {
    'Client-Id': clientId,
    'Api-Key': apiKey ? '***' + apiKey.slice(-4) : 'NOT SET',
    'Content-Type': 'application/json'
  })
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Client-Id': clientId,
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  })

  console.log(`getOzonProducts: Response status: ${response.status}`)
  console.log(`getOzonProducts: Response headers:`, Object.fromEntries(response.headers.entries()))
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('getOzonProducts: API Error response:', errorText)
    throw new Error(`Ozon API Error: ${response.status} ${response.statusText}. Response: ${errorText}`)
  }

  const data = await response.json()
  console.log('getOzonProducts: API response structure:', {
    hasResult: !!data.result,
    hasItems: !!data.result?.items,
    itemsLength: data.result?.items?.length || 0,
    hasTotal: !!data.result?.total,
    total: data.result?.total,
    hasLastId: !!data.result?.last_id,
    fullResponse: JSON.stringify(data).slice(0, 500) + '...'
  })
  
  console.log(`getOzonProducts: Successfully retrieved ${data.result?.items?.length || 0} products`)
  return data.result?.items || []
}

async function getOzonProductInfo(clientId: string, apiKey: string, productIds: number[]): Promise<any> {
  const url = 'https://api-seller.ozon.ru/v2/product/info'
  
  const requestBody = {
    product_id: productIds,
    sku: [],
    offer_id: []
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Client-Id': clientId,
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('getOzonProductInfo: API Error:', errorText)
    return { result: { items: [] } }
  }

  return response.json()
}

async function getOzonProductPrices(clientId: string, apiKey: string, productIds: number[]): Promise<any> {
  const url = 'https://api-seller.ozon.ru/v4/product/info/prices'
  
  const requestBody = {
    filter: {
      product_id: productIds,
      visibility: 'ALL'
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Client-Id': clientId,
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('getOzonProductPrices: API Error:', errorText)
    return { result: { items: [] } }
  }

  return response.json()
}

async function getOzonProductStocks(clientId: string, apiKey: string, productIds: number[]): Promise<any> {
  const url = 'https://api-seller.ozon.ru/v3/product/info/stocks'
  
  const requestBody = {
    filter: {
      product_id: productIds,
      visibility: 'ALL'
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Client-Id': clientId,
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('getOzonProductStocks: API Error:', errorText)
    return { result: { items: [] } }
  }

  return response.json()
}

async function getOzonProductRating(clientId: string, apiKey: string, productIds: number[]): Promise<any> {
  const url = 'https://api-seller.ozon.ru/v1/product/rating-by-sku'
  
  const requestBody = {
    products: productIds.map(id => ({ sku: id, product_id: id }))
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Client-Id': clientId,
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('getOzonProductRating: API Error:', errorText)
    return { result: { products: [] } }
  }

  return response.json()
}

async function getProductPrices(clientId: string, apiKey: string, offerId?: string, productId?: number): Promise<any> {
  if (!offerId && !productId) return null
  
  const url = 'https://api-seller.ozon.ru/v5/product/info/prices'
  
  const requestBody = {
    cursor: '',
    filter: {
      ...(offerId && { offer_id: [offerId] }),
      ...(productId && { product_id: [productId.toString()] }),
      visibility: 'ALL'
    },
    limit: 1
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Client-Id': clientId,
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  })
  
  if (!response.ok) {
    console.error(`getProductPrices: Error ${response.status}`)
    return null
  }
  
  const data = await response.json()
  const item = data.items?.[0]
  
  return {
    price: item?.price?.price || 0,
    old_price: item?.price?.old_price || 0
  }
}

async function getProductStocks(clientId: string, apiKey: string, offerId?: string, productId?: number): Promise<any> {
  if (!offerId && !productId) return null
  
  const url = 'https://api-seller.ozon.ru/v1/product/info/stocks-by-warehouse/fbs'
  
  // Нужно получить SKU для товара
  const sku = productId?.toString() || offerId
  
  const requestBody = {
    sku: [sku]
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Client-Id': clientId,
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  })
  
  if (!response.ok) {
    console.error(`getProductStocks: Error ${response.status}`)
    return null
  }
  
  const data = await response.json()
  const item = data.result?.[0]
  
  return {
    total_stock: item?.present || 0,
    reserved: item?.reserved || 0
  }
}

async function getProductImages(clientId: string, apiKey: string, productId: number): Promise<string[]> {
  const url = 'https://api-seller.ozon.ru/v2/product/pictures/info'
  
  const requestBody = {
    product_id: [productId],
    limit: 100
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Client-Id': clientId,
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  })
  
  if (!response.ok) {
    console.error(`getProductImages: Error ${response.status}`)
    return []
  }
  
  const data = await response.json()
  const item = data.items?.[0]
  
  if (item) {
    const images: string[] = []
    
    // Добавляем основное фото
    if (item.primary_photo && item.primary_photo.length > 0) {
      images.push(...item.primary_photo)
    }
    
    // Добавляем остальные фото
    if (item.photo && item.photo.length > 0) {
      images.push(...item.photo)
    }
    
    // Добавляем фото 360
    if (item.photo_360 && item.photo_360.length > 0) {
      images.push(...item.photo_360)
    }
    
    console.log(`getProductImages: Found ${images.length} images for product ${productId}`)
    return images
  }
  
  return []
}

async function getProductDetails(clientId: string, apiKey: string, productId: number): Promise<any> {
  const url = 'https://api-seller.ozon.ru/v1/product/info/description'
  
  const requestBody = {
    product_id: productId
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Client-Id': clientId,
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  })
  
  if (!response.ok) {
    console.error(`getProductDetails: Error ${response.status}`)
    return null
  }
  
  const data = await response.json()
  return data.result || null
}