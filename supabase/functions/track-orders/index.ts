import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { action, data } = await req.json()

    switch (action) {
      case 'track_wildberries_order':
        return await trackWildberriesOrder(supabase, data)
      
      case 'track_ozon_order':
        return await trackOzonOrder(supabase, data)
      
      case 'process_completed_order':
        return await processCompletedOrder(supabase, data)
      
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Track orders error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Отслеживание заказа Wildberries
async function trackWildberriesOrder(supabase: any, data: {
  order_id: string,
  telegram_id: string,
  utm_source?: string
}) {
  try {
    // Получаем информацию о заказе через WB API
    const orderInfo = await getWildberriesOrderInfo(data.order_id)
    
    if (!orderInfo) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Order not found or not accessible' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Проверяем статус заказа
    if (orderInfo.status === 'delivered' || orderInfo.status === 'completed') {
      // Начисляем баллы за завершенный заказ
      return await processCompletedOrder(supabase, {
        telegram_id: data.telegram_id,
        order_id: data.order_id,
        marketplace: 'wildberries',
        order_amount: orderInfo.total_amount,
        utm_source: data.utm_source
      })
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Order tracked, waiting for completion',
        order_status: orderInfo.status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    throw new Error(`Track Wildberries order error: ${error.message}`)
  }
}

// Отслеживание заказа Ozon
async function trackOzonOrder(supabase: any, data: {
  order_id: string,
  telegram_id: string,
  utm_source?: string
}) {
  try {
    // Получаем информацию о заказе через Ozon API
    const orderInfo = await getOzonOrderInfo(data.order_id)
    
    if (!orderInfo) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Order not found or not accessible' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Проверяем статус заказа
    if (orderInfo.status === 'delivered' || orderInfo.status === 'completed') {
      // Начисляем баллы за завершенный заказ
      return await processCompletedOrder(supabase, {
        telegram_id: data.telegram_id,
        order_id: data.order_id,
        marketplace: 'ozon',
        order_amount: orderInfo.total_amount,
        utm_source: data.utm_source
      })
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Order tracked, waiting for completion',
        order_status: orderInfo.status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    throw new Error(`Track Ozon order error: ${error.message}`)
  }
}

// Обработка завершенного заказа и начисление баллов
async function processCompletedOrder(supabase: any, data: {
  telegram_id: string,
  order_id: string,
  marketplace: string,
  order_amount: number,
  utm_source?: string
}) {
  try {
    // Проверяем, не был ли заказ уже обработан
    const { data: existingOrder } = await supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('order_id', data.order_id)
      .eq('transaction_type', 'earn')
      .single()

    if (existingOrder) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Order already processed' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Начисляем баллы через систему лояльности
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/loyalty-system`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        action: 'add_points',
        data: {
          telegram_id: data.telegram_id,
          order_id: data.order_id,
          marketplace: data.marketplace,
          order_amount: data.order_amount,
          utm_source: data.utm_source
        }
      })
    })

    const result = await response.json()

    if (result.success) {
      // Отправляем уведомление пользователю через Telegram бота
      await sendTelegramNotification(data.telegram_id, {
        type: 'points_earned',
        points: result.points_awarded,
        order_amount: data.order_amount,
        marketplace: data.marketplace
      })
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    throw new Error(`Process completed order error: ${error.message}`)
  }
}

// Получение информации о заказе Wildberries через API
async function getWildberriesOrderInfo(orderId: string) {
  try {
    // Здесь должна быть реальная интеграция с WB API
    // Пока используем мок-реализацию
    const wbApiKey = Deno.env.get('WILDBERRIES_API_KEY')
    const wbApiUrl = Deno.env.get('WILDBERRIES_API_URL')

    if (!wbApiKey || !wbApiUrl) {
      console.warn('Wildberries API credentials not configured, using mock data')
      return {
        status: 'delivered',
        total_amount: 1500,
        items: []
      }
    }

    // Реальная интеграция с WB API
    const response = await fetch(`${wbApiUrl}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${wbApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      return null
    }

    const orderData = await response.json()
    return {
      status: orderData.status,
      total_amount: orderData.total_amount,
      items: orderData.items || []
    }
  } catch (error) {
    console.error('Wildberries API error:', error)
    return null
  }
}

// Получение информации о заказе Ozon через API
async function getOzonOrderInfo(orderId: string) {
  try {
    // Здесь должна быть реальная интеграция с Ozon API
    // Пока используем мок-реализацию
    const ozonApiKey = Deno.env.get('OZON_API_KEY')
    const ozonApiUrl = Deno.env.get('OZON_API_URL')

    if (!ozonApiKey || !ozonApiUrl) {
      console.warn('Ozon API credentials not configured, using mock data')
      return {
        status: 'delivered',
        total_amount: 1200,
        items: []
      }
    }

    // Реальная интеграция с Ozon API
    const response = await fetch(`${ozonApiUrl}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ozonApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      return null
    }

    const orderData = await response.json()
    return {
      status: orderData.status,
      total_amount: orderData.total_amount,
      items: orderData.items || []
    }
  } catch (error) {
    console.error('Ozon API error:', error)
    return null
  }
}

// Отправка уведомления пользователю через Telegram
async function sendTelegramNotification(telegramId: string, data: {
  type: string,
  points: number,
  order_amount: number,
  marketplace: string
}) {
  try {
    // Получаем токен бота из базы данных
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    const { data: stores } = await supabase
      .from('stores')
      .select('telegram_bot_token')
      .not('telegram_bot_token', 'is', null)
      .eq('status', 'active')
      .limit(1)
    
    if (!stores || stores.length === 0) {
      console.warn('No active store with bot token found')
      return
    }
    
    const botToken = stores[0].telegram_bot_token
    if (!botToken) {
      console.warn('Telegram bot token not configured')
      return
    }

    let message = ''
    if (data.type === 'points_earned') {
      message = `🎉 Заказ выполнен!\n\n` +
        `💰 Сумма заказа: ${data.order_amount} ₽\n` +
        `🛒 Маркетплейс: ${data.marketplace === 'wildberries' ? 'Wildberries' : 'Ozon'}\n` +
        `💎 Начислено баллов: ${data.points}\n\n` +
        `Используйте команду /баллы для просмотра баланса`
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: telegramId,
        text: message,
        parse_mode: 'HTML'
      })
    })

    const result = await response.json()
    if (!response.ok) {
      console.error('Telegram notification error:', result)
    }
  } catch (error) {
    console.error('Error sending Telegram notification:', error)
  }
} 