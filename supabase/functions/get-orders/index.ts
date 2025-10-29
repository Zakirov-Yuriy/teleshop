/*
  # Get Orders Edge Function
  
  Функция для получения заказов пользователя:
  1. Получает список заказов пользователя по telegram_id
  2. Возвращает заказы с информацией о товарах
*/

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

interface GetOrdersRequest {
  user_telegram_id: string
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

    const { user_telegram_id, marketplace }: GetOrdersRequest = await req.json()

    if (!user_telegram_id) {
      return new Response(JSON.stringify({ 
        error: 'user_telegram_id is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Получаем заказы пользователя
    let query = supabase
      .from('orders')
      .select(`
        id,
        marketplace_order_id,
        marketplace,
        status,
        created_at,
        updated_at,
        products_data,
        total_amount,
        tracking_number,
        users!inner(telegram_id)
      `)
      .eq('users.telegram_id', user_telegram_id)
      .order('created_at', { ascending: false })

    // Фильтруем по маркетплейсу, если указан
    if (marketplace) {
      query = query.eq('marketplace', marketplace)
    }

    const { data: orders, error } = await query

    if (error) {
      console.error('Error fetching orders:', error)
      throw new Error(`Failed to fetch orders: ${error.message}`)
    }

    // Форматируем заказы
    const formattedOrders = (orders || []).map(order => ({
      id: order.id,
      order_id: order.marketplace_order_id,
      marketplace: order.marketplace,
      status: order.status,
      created_at: order.created_at,
      updated_at: order.updated_at,
      total_amount: order.total_amount,
      tracking_number: order.tracking_number,
      products: Array.isArray(order.products_data) ? order.products_data : []
    }))

    return new Response(JSON.stringify({
      success: true,
      orders: formattedOrders,
      total_count: formattedOrders.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in get-orders function:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to get orders',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
