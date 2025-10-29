/*
  # Track Order Status Edge Function
  
  Функция для отслеживания статуса заказов:
  1. Получает список заказов пользователя
  2. Обновляет статусы через API маркетплейсов (в будущем)
  3. Возвращает актуальную информацию
*/

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

interface TrackOrderRequest {
  user_telegram_id?: string
  order_id?: string
  marketplace?: 'wildberries' | 'ozon'
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

    const { user_telegram_id, order_id, marketplace }: TrackOrderRequest = await req.json()

    if (!user_telegram_id && !order_id) {
      return new Response(JSON.stringify({ 
        error: 'Either user_telegram_id or order_id is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let orders = []

    if (order_id) {
      // Получаем конкретный заказ
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          users!inner(telegram_id),
          stores(name)
        `)
        .eq('id', order_id)
        .single()

      if (error) {
        throw new Error(`Order not found: ${error.message}`)
      }

      orders = [data]
    } else if (user_telegram_id) {
      // Получаем все заказы пользователя
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          users!inner(telegram_id),
          stores(name)
        `)
        .eq('users.telegram_id', user_telegram_id)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch orders: ${error.message}`)
      }

      orders = data || []
    }

    // Обновляем статусы заказов (если нужно)
    const updatedOrders = await Promise.all(
      orders.map(async (order) => {
        // Пропускаем уже завершенные заказы
        if (['delivered', 'cancelled', 'failed'].includes(order.status)) {
          return order
        }

        try {
          // Здесь в будущем будет вызов API маркетплейса для получения актуального статуса
          const updatedStatus = await getOrderStatusFromMarketplace(
            order.marketplace, 
            order.marketplace_order_id
          )

          if (updatedStatus && updatedStatus !== order.status) {
            // Обновляем статус в базе данных
            const { error: updateError } = await supabase
              .from('orders')
              .update({ 
                status: updatedStatus,
                updated_at: new Date().toISOString()
              })
              .eq('id', order.id)

            if (!updateError) {
              order.status = updatedStatus
            }
          }
        } catch (error) {
          console.error(`Failed to update status for order ${order.id}:`, error)
        }

        return order
      })
    )

    // Форматируем ответ
    const formattedOrders = updatedOrders.map(order => ({
      id: order.id,
      marketplace: order.marketplace,
      marketplace_order_id: order.marketplace_order_id,
      status: order.status,
      total_amount: order.total_amount,
      products_count: Array.isArray(order.products_data) ? order.products_data.length : 0,
      store_name: order.stores?.name,
      created_at: order.created_at,
      updated_at: order.updated_at,
      tracking_number: order.tracking_number,
      
      // Человекочитаемый статус
      status_text: getStatusText(order.status),
      status_emoji: getStatusEmoji(order.status)
    }))

    return new Response(JSON.stringify({
      success: true,
      orders: formattedOrders,
      total_count: formattedOrders.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in track-order-status function:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to track order status',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function getOrderStatusFromMarketplace(marketplace: string, orderIl: string): Promise<string | null> {
  // Заглушка для получения статуса заказа из API маркетплейса
  // В реальной реализации здесь будут вызовы к API Wildberries/Ozon
  
  console.log(`Checking status for ${marketplace} order: ${orderIl}`)
  
  try {
    if (marketplace === 'wildberries') {
      // return await getWildberriesOrderStatus(orderIl)
      return null // Пока API не реализован
    } else if (marketplace === 'ozon') {
      // return await getOzonOrderStatus(orderIl)
      return null // Пока API не реализован
    }
  } catch (error) {
    console.error(`Error getting status from ${marketplace}:`, error)
  }
  
  return null
}

// async function getWildberriesOrderStatus(orderIl: string): Promise<string> {
//   // Реализация получения статуса через API Wildberries
//   const response = await fetch('https://suppliers-api.wildberries.ru/api/v3/orders', {
//     headers: {
//       'Authorization': 'Bearer ' + WB_API_TOKEN,
//       'Content-Type': 'application/json'
//     }
//   })
//   
//   const data = await response.json()
//   // Маппинг статусов WB на наши статусы
//   return mapWildberriesStatus(data.status)
// }

// async function getOzonOrderStatus(orderIl: string): Promise<string> {
//   // Реализация получения статуса через API Ozon
//   const response = await fetch('https://api-seller.ozon.ru/v3/posting/fbs/list', {
//     method: 'POST',
//     headers: {
//       'Client-Il': OZON_CLIENT_Il,
//       'Api-Key': OZON_API_KEY,
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify({
//       filter: { order_number: orderIl }
//     })
//   })
//   
//   const data = await response.json()
//   // Маппинг статусов Ozon на наши статусы
//   return mapOzonStatus(data.result[0]?.status)
// }

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    'processing': 'Обрабатывается',
    'confirmed': 'Подтвержден',
    'paid': 'Оплачен',
    'shipped': 'Отправлен',
    'delivered': 'Доставлен',
    'cancelled': 'Отменен',
    'failed': 'Ошибка'
  }
  
  return statusMap[status] || status
}

function getStatusEmoji(status: string): string {
  const emojiMap: Record<string, string> = {
    'processing': '⏳',
    'confirmed': '✅',
    'paid': '💳',
    'shipped': '🚚',
    'delivered': '📦',
    'cancelled': '❌',
    'failed': '⚠️'
  }
  
  return emojiMap[status] || '❓'
}

// function mapWildberriesStatus(wbStatus: string): string {
//   const statusMap: Record<string, string> = {
//     'new': 'confirmed',
//     'confirm': 'confirmed', 
//     'complete': 'shipped',
//     'cancel': 'cancelled'
//   }
//   
//   return statusMap[wbStatus] || 'processing'
// }

// function mapOzonStatus(ozonStatus: string): string {
//   const statusMap: Record<string, string> = {
//     'awaiting_approve': 'processing',
//     'awaiting_packaging': 'confirmed',
//     'awaiting_deliver': 'shipped',
//     'delivering': 'shipped',
//     'delivered': 'delivered',
//     'cancelled': 'cancelled'
//   }
//   
//   return statusMap[ozonStatus] || 'processing'
// }