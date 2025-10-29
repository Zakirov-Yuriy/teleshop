import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

interface WBOrder {
  state: number
  order_dt: number
  pay_type: number
  id: string
  rids: Array<{
    nm_id: number
    name: string
    brand: string
    price: number
    total_price: number
    uid: string
  }>
}

interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  price: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    // Проверяем авторизацию
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { action, data } = await req.json()

    switch (action) {
      case 'sync_orders':
        return await syncOrders(supabase, data)

      case 'get_orders':
        return await getOrders(supabase, data)

      case 'sync_all_sessions':
        return await syncAllSessions(supabase)

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Sync orders error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Синхронизация заказов из Wildberries
async function syncOrders(supabase: any, data: { wb_orders?: WBOrder[], user_id: string }) {
  try {
    const { user_id } = data
    let wb_orders: WBOrder[] = Array.isArray(data.wb_orders) ? data.wb_orders : []
    if (wb_orders.length === 0) {
      // Пытаемся получить заказы напрямую по сохраненной WB-сессии пользователя
      const fetched = await fetchWbOrdersForUser(supabase, user_id)
      wb_orders = fetched || []
    }
    console.log(`🔄 Начинаем синхронизацию ${wb_orders.length} заказов для пользователя ${user_id}`)
    
    const syncedOrders = []
    const errors = []

    for (const wbOrder of wb_orders) {
      try {
        // Проверяем, существует ли уже заказ с таким ID
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id')
          .eq('order_number', wbOrder.id)
          .single()

                 // Получаем или создаем запись в таблице customers
         let { data: customer } = await supabase
           .from('customers')
           .select('id')
           .eq('telegram_id', user_id)
           .single()

         if (!customer) {
           console.log(`👤 Создаем запись в customers для пользователя ${user_id}`)
           const { data: newCustomer, error: customerError } = await supabase
             .from('customers')
             .insert({
               telegram_id: user_id,
               telegram_username: '',
               first_name: 'Пользователь',
               last_name: '',
               phone: '',
               address: ''
             })
             .select()
             .single()

           if (customerError) {
             console.error(`❌ Ошибка создания customer:`, customerError)
             errors.push({ order_id: wbOrder.id, error: customerError.message })
             continue
           }

           customer = newCustomer
         }

        // Пытаемся найти активный магазин владельца (если применимо).
        // Для Telegram-покупателей owner_id не совпадает с telegram_id, поэтому отсутствие магазина не блокирует синхронизацию.
        // Пытаемся сопоставить telegram_id с владельцем (таблица users может хранить соответствие)
        let ownerCandidateId: string | null = user_id
        const { data: ownerUser } = await supabase
          .from('users')
          .select('id')
          .eq('telegram_id', user_id)
          .single()
        if (ownerUser?.id) ownerCandidateId = ownerUser.id

        const { data: stores } = await supabase
          .from('stores')
          .select('id')
          .eq('owner_id', ownerCandidateId!)
          .eq('status', 'active')
          .limit(1)

        const storeId = stores?.[0]?.id || null
        if (!storeId) {
          console.log(`ℹ️ Магазин не найден для ${user_id}. Продолжаем без store_id`)
        }

        // Готовим order_id: либо существующий, либо создаем новый заказ
        let dbOrderId: string | null = existingOrder?.id || null
        let candidateStoreId: string | null = null
        if (!dbOrderId) {
          const orderData: any = {
            customer_id: customer.id,
            order_number: wbOrder.id,
            total_amount: wbOrder.rids.reduce((sum, rid) => sum + rid.total_price, 0) / 100,
            status: getOrderStatus(wbOrder.state),
            delivery_address: 'Адрес доставки',
            delivery_method: 'Курьерская доставка',
            payment_method: wbOrder.pay_type === 1 ? 'Онлайн оплата' : 'Наличными',
            notes: `Синхронизирован из Wildberries`,
            created_at: new Date(wbOrder.order_dt * 1000).toISOString()
          }
          if (storeId) orderData.store_id = storeId

          const { data: newOrder, error: orderError } = await supabase
            .from('orders')
            .insert(orderData)
            .select()
            .single()

          if (orderError) {
            console.error(`Ошибка создания заказа ${wbOrder.id}:`, orderError)
            errors.push({ order_id: wbOrder.id, error: orderError.message })
            continue
          }
          dbOrderId = newOrder.id
        } else {
          console.log(`Заказ ${wbOrder.id} уже существует (id: ${dbOrderId}), проверяем товары...`)
        }

        // Добавляем товары заказа
        const orderItems: OrderItem[] = []
        for (const rid of wbOrder.rids) {
          console.log(`🔍 Ищем товар с nm_id: ${rid.nm_id}`)
          
          // Ищем товар в нашей базе по nm_id (используем marketplace_id)
          const { data: product, error: productError } = await supabase
            .from('products')
            .select('id, name, marketplace_id, store_id')
            .eq('marketplace_id', rid.nm_id.toString())
            .eq('marketplace', 'wildberries')
            .single()

          if (productError) {
            console.log(`❌ Ошибка поиска товара ${rid.nm_id}:`, productError)
          }

          if (product) {
            console.log(`✅ Найден товар: ${product.name} (ID: ${product.id})`)
            if (!candidateStoreId && product.store_id) candidateStoreId = product.store_id
            orderItems.push({
              order_id: dbOrderId!,
              product_id: product.id,
              quantity: 1,
              price: rid.price / 100,
              marketplace_id: rid.nm_id?.toString() || null,
              product_name_cache: product.name,
              product_image_cache: product.image_url || (product.images && product.images[0]) || null
            } as any)
          } else {
            console.log(`❌ Товар с nm_id ${rid.nm_id} не найден в базе`)
            // fallback — всё равно сохраняем позицию без product_id на основе nm_id
            orderItems.push({
              order_id: dbOrderId!,
              product_id: null,
              quantity: 1,
              price: rid.price / 100,
              marketplace_id: rid.nm_id?.toString() || null,
              product_name_cache: rid.name || null
            } as any)
          }
        }

        if (orderItems.length > 0) {
          // Вставляем только те позиции, которых ещё нет
          for (const it of orderItems) {
            const { data: exists } = await supabase
              .from('order_items')
              .select('id')
              .eq('order_id', it.order_id)
              .eq('product_id', it.product_id)
              .limit(1)
              .single()
            if (!exists) {
              const { error: insErr } = await supabase.from('order_items').insert(it)
              if (insErr) {
                console.error(`Ошибка добавления товара заказа ${wbOrder.id}:`, insErr)
                errors.push({ order_id: wbOrder.id, error: insErr.message })
              }
            }
          }

        }

        syncedOrders.push({
          order_id: wbOrder.id,
          db_order_id: dbOrderId,
          items_count: orderItems.length
        })

        // Если у заказа нет store_id, но найден кандидат — обновим заказ
        if (!storeId && candidateStoreId && dbOrderId) {
          const { error: updErr } = await supabase
            .from('orders')
            .update({ store_id: candidateStoreId })
            .eq('id', dbOrderId)
          if (updErr) {
            console.error(`Ошибка обновления store_id для заказа ${wbOrder.id}:`, updErr)
            errors.push({ order_id: wbOrder.id, error: updErr.message })
          }
        }

      } catch (error) {
        console.error(`Ошибка обработки заказа ${wbOrder.id}:`, error)
        errors.push({ order_id: wbOrder.id, error: error.message })
      }
    }

    console.log(`✅ Синхронизация завершена: ${syncedOrders.length} успешно, ${errors.length} ошибок`)
    
    return new Response(
      JSON.stringify({
        success: true,
        synced_orders: syncedOrders,
        errors,
        message: `Синхронизировано ${syncedOrders.length} заказов`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    throw new Error(`Sync orders error: ${error.message}`)
  }
}

// Получение заказов пользователя
async function getOrders(supabase: any, data: { user_id: string }) {
  try {
    const { user_id } = data

         // Получаем customer_id для пользователя
     const { data: customer } = await supabase
       .from('customers')
       .select('id')
       .eq('telegram_id', user_id)
       .single()

     if (!customer) {
       console.log(`❌ Нет записи в customers для пользователя ${user_id}`)
       return new Response(
         JSON.stringify({
           success: true,
           orders: []
         }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }

    // Получаем заказы пользователя
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (*)
        )
      `)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Ошибка получения заказов:', error)
      throw error
    }

    console.log(`📦 Найдено ${orders?.length || 0} заказов для пользователя ${user_id}`)

    return new Response(
      JSON.stringify({
        success: true,
        orders: orders || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    throw new Error(`Get orders error: ${error.message}`)
  }
}

// Получение WB заказов, используя сохраненную сессию пользователя
async function fetchWbOrdersForUser(supabase: any, userId: string): Promise<WBOrder[] | null> {
  try {
    const { data: session } = await supabase
      .from('wb_sessions')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (!session || !session.access_token) return null

    const deviceId = session.device_id
    const correlationId = session.correlation_id
    const validationKey = session.validation_key
    const cookies: Record<string, string> = session.cookies || {}
    if (validationKey) cookies['wbx-validation-key'] = validationKey
    const cookieHeader = Object.entries(cookies).map(([k,v]) => `${k}=${v}`).join('; ')

    const headers: Record<string,string> = {
      'Accept': '*/*',
      'User-Agent': 'Mozilla/5.0',
      'DeviceId': deviceId,
      'X-Correlation-Id': correlationId,
      'Authorization': `Bearer ${session.access_token}`
    }
    if (cookieHeader) headers['Cookie'] = cookieHeader

    const resp = await fetch('https://wbxoofex.wildberries.ru/api/v2/orders', { headers })
    if (!resp.ok) {
      console.log('WB orders fetch failed', resp.status)
      return null
    }
    const json = await resp.json()
    return Array.isArray(json?.data) ? json.data as WBOrder[] : (Array.isArray(json) ? json as WBOrder[] : [])
  } catch (e) {
    console.error('fetchWbOrdersForUser error', e)
    return null
  }
}

// Синхронизация по всем активным WB-сессиям
async function syncAllSessions(supabase: any) {
  try {
    const { data: sessions } = await supabase
      .from('wb_sessions')
      .select('user_id, updated_at')
    const results: any[] = []
    let totalSynced = 0
    let totalErrors = 0
    for (const s of (sessions || [])) {
      const wbOrders = await fetchWbOrdersForUser(supabase, s.user_id)
      const res = await syncOrders(supabase, { user_id: s.user_id, wb_orders: wbOrders || [] })
      const body = await res.json()
      results.push({ user_id: s.user_id, ...body })
      totalSynced += (body?.synced_orders?.length || 0)
      totalErrors += (body?.errors?.length || 0)
    }
    return new Response(JSON.stringify({ success: true, totalSynced, totalErrors, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
}

// Преобразование статуса заказа Wildberries в наш формат
function getOrderStatus(state: number): string {
  switch (state) {
    case 1: return 'pending'  // processing -> pending
    case 2: return 'confirmed'
    case 3: return 'pending'  // processing -> pending
    case 4: return 'shipped'
    case 5: return 'delivered'
    case 6: return 'cancelled'
    default: return 'pending'  // unknown -> pending
  }
} 