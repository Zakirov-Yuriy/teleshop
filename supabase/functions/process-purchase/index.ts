/*
  # Process Purchase Edge Function
  
  Основная функция обработки покупок:
  1. Проверяет наличие способа оплаты и адреса доставки
  2. Определяет сценарий: браузер или автопокупка
  3. Запускает соответствующий процесс
*/

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

interface PurchaseRequest {
  store_id: string
  marketplace: 'wildberries' | 'ozon'
  products: Array<{
    marketplace_id: string
    quantity: number
    name: string
    price: number
  }>
  user_telegram_id?: string
}

interface PurchaseResponse {
  success: boolean
  scenario: 'browser' | 'auto_purchase'
  action_url?: string
  order_id?: string
  message: string
  error?: string
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

    const { store_id, marketplace, products, user_telegram_id }: PurchaseRequest = await req.json()

    if (!store_id || !marketplace || !products || products.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: store_id, marketplace, products' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Processing purchase for ${marketplace} with ${products.length} products`)

    // 1. Получаем или создаем пользователя
    let userId = null
    if (user_telegram_id) {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', user_telegram_id)
        .single()
      
      userId = user?.id
      
      if (!userId) {
        // Создаем нового пользователя
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({
            telegram_id: user_telegram_id,
            created_at: new Date().toISOString()
          })
          .select('id')
          .single()
        
        if (userError) {
          console.error('Error creating user:', userError)
        } else {
          userId = newUser?.id
        }
      }
    }

    // 2. Проверяем настройки пользователя для выбранного маркетплейса
    const userSettings = userId ? await checkUserSettings(supabase, userId, marketplace) : null
    
    console.log('User settings:', userSettings)

    // 3. Определяем сценарий
    /*
    const hasPaymentMethod = userSettings?.has_payment_method || false
    const hasDeliveryAddress = userSettings?.has_delivery_address || false
    const hasCredentials = userSettings?.has_credentials || false
    */
    
    let scenario: 'browser' | 'auto_purchase' = 'browser'
    let actionUrl = ''
    let orderId = null

    //if (hasPaymentMethod && hasDeliveryAddress && hasCredentials) {
      // Сценарий автопокупки
      scenario = 'auto_purchase'
      
      try {
        const autoPurchaseResult = await processAutoPurchase(
          supabase, 
          userId!, 
          marketplace, 
          products, 
          store_id
        )
        
        if (autoPurchaseResult.success) {
          orderId = autoPurchaseResult.order_id
        } else {
          // Fallback на браузер если автопокупка не удалась
          scenario = 'browser'
          actionUrl = generateMarketplaceUrl(marketplace, products)
        }
      } catch (error) {
        console.error('Auto purchase failed:', error)
        scenario = 'browser'
        actionUrl = generateMarketplaceUrl(marketplace, products)
      }
    //} else {
      // Сценарий через браузер
      //scenario = 'browser'
      //actionUrl = generateMarketplaceUrl(marketplace, products)
    //}

    // 4. Сохраняем информацию о попытке покупки
    if (userId) {
      await savePurchaseAttempt(supabase, {
        user_id: userId,
        store_id,
        marketplace,
        products,
        scenario,
        order_id: orderId,
        action_url: actionUrl
      })
    }

    const response: PurchaseResponse = {
      success: true,
      scenario,
      action_url: actionUrl,
      order_id: orderId,
      message: scenario === 'auto_purchase' 
        ? 'Заказ оформлен автоматически' 
        : 'Переход в браузер для оформления заказа'
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in process-purchase function:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function checkUserSettings(supabase: any, userId: string, marketplace: string) {
  try {
    const { data, error } = await supabase
      .from('user_marketplace_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('marketplace', marketplace)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = row not found
      console.error('Error checking user settings:', error)
      return null
    }

    return data || {
      has_payment_method: false,
      has_delivery_address: false,
      has_credentials: false
    }
  } catch (error) {
    console.error('Error in checkUserSettings:', error)
    return null
  }
}

async function processAutoPurchase(
  supabase: any, 
  userId: string, 
  marketplace: string, 
  products: any[], 
  storeId: string
) {
  // Вызываем соответствующую функцию автопокупки
  const functionName = marketplace === 'ozon' ? 'autopurchase-ozon' : 'autopurchase-wildberries'
  
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    },
    body: JSON.stringify({
      user_id: userId,
      marketplace,
      products,
      store_id: storeId
    })
  })

  if (!response.ok) {
    throw new Error(`Auto purchase failed: ${response.status}`)
  }

  return await response.json()
}

function generateMarketplaceUrl(marketplace: string, products: any[]): string {
  if (marketplace === 'wildberries') {
    const productIds = products.map(p => p.marketplace_id).join(',')
    return products.length === 1 
      ? `https://www.wildberries.ru/catalog/${products[0].marketplace_id}/detail.aspx`
      : `https://www.wildberries.ru/catalog/0/search.aspx?search=${productIds}`
  } else if (marketplace === 'ozon') {
    const productIds = products.map(p => p.marketplace_id).join(',')
    return products.length === 1 
      ? `https://www.ozon.ru/product/${products[0].marketplace_id}/`
      : `https://www.ozon.ru/search/?text=${productIds}`
  }
  
  return ''
}

async function savePurchaseAttempt(supabase: any, data: {
  user_id: string
  store_id: string
  marketplace: string
  products: any[]
  scenario: string
  order_id?: string | null
  action_url?: string
}) {
  try {
    const { error } = await supabase
      .from('purchase_attempts')
      .insert({
        user_id: data.user_id,
        store_id: data.store_id,
        marketplace: data.marketplace,
        products_data: data.products,
        scenario: data.scenario,
        order_id: data.order_id,
        action_url: data.action_url,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error saving purchase attempt:', error)
    }
  } catch (error) {
    console.error('Error in savePurchaseAttempt:', error)
  }
}