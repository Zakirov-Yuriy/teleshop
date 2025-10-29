import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

interface LoyaltyUser {
  id: string
  telegram_id: string
  phone_number?: string
  first_name?: string
  last_name?: string
  username?: string
  total_points: number
  available_points: number
  completed_orders: number
  cashback_cycles: number
  last_cashback_date?: string
  registration_date: string
  updated_at: string
}

interface LoyaltyTransaction {
  id: string
  user_id: string
  transaction_type: 'earn' | 'spend' | 'expire' | 'adjust'
  points: number
  order_id?: string
  marketplace?: string
  order_amount?: number
  description?: string
  created_at: string
}

interface LoyaltyCashback {
  id: string
  user_id: string
  amount: 50 | 100 | 150
  points_spent: number
  points_remaining: number
  phone_number: string
  payment_provider?: string
  payment_status: 'pending' | 'success' | 'failed' | 'cancelled'
  payment_id?: string
  payment_response?: any
  created_at: string
  processed_at?: string
}

interface PlatformBalance {
  id: string
  current_balance: number
  total_deposited: number
  total_paid_out: number
  last_deposit_date?: string
  last_payout_date?: string
  updated_at: string
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
      case 'register_user':
        return await registerUser(supabase, data)
      
      case 'add_points':
        return await addPoints(supabase, data)
      
      case 'get_user_points':
        return await getUserPoints(supabase, data)
      
      case 'request_cashback':
        return await requestCashback(supabase, data)
      
      case 'process_cashback_payment':
        return await processCashbackPayment(supabase, data)
      
      case 'get_platform_balance':
        return await getPlatformBalance(supabase)
      
      case 'update_platform_balance':
        return await updatePlatformBalance(supabase, data)
      
      case 'adjust_user_points':
        return await adjustUserPoints(supabase, data)
      
      case 'get_admin_reports':
        return await getAdminReports(supabase, data)
      
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Loyalty system error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Регистрация пользователя в системе лояльности
async function registerUser(supabase: any, data: { telegram_id: string, first_name?: string, last_name?: string, username?: string }) {
  try {
    // Проверяем, существует ли пользователь
    const { data: existingUser } = await supabase
      .from('loyalty_users')
      .select('*')
      .eq('telegram_id', data.telegram_id)
      .single()

    if (existingUser) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          user: existingUser,
          message: 'User already registered'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Получаем настройки для бонуса за регистрацию
    const { data: settings } = await supabase
      .from('loyalty_settings')
      .select('setting_value')
      .eq('setting_key', 'points_rules')
      .single()

    const registrationBonus = settings?.setting_value?.registration_bonus || 30

    // Создаем нового пользователя
    const { data: newUser, error } = await supabase
      .from('loyalty_users')
      .insert({
        telegram_id: data.telegram_id,
        first_name: data.first_name,
        last_name: data.last_name,
        username: data.username,
        total_points: registrationBonus,
        available_points: registrationBonus
      })
      .select()
      .single()

    if (error) throw error

    // Создаем транзакцию за регистрацию
    await supabase
      .from('loyalty_transactions')
      .insert({
        user_id: newUser.id,
        transaction_type: 'earn',
        points: registrationBonus,
        description: 'Бонус за регистрацию в системе лояльности'
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: newUser,
        message: `Добро пожаловать! Начислено ${registrationBonus} баллов за регистрацию`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    throw new Error(`Registration error: ${error.message}`)
  }
}

// Начисление баллов за заказ
async function addPoints(supabase: any, data: { 
  telegram_id: string, 
  order_id: string, 
  marketplace: string, 
  order_amount: number,
  utm_source?: string 
}) {
  try {
    // Проверяем UTM-метки (только заказы из Telegram)
    if (!data.utm_source || !data.utm_source.includes('telegram')) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Order not from Telegram - no points awarded'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Получаем пользователя
    const { data: user } = await supabase
      .from('loyalty_users')
      .select('*')
      .eq('telegram_id', data.telegram_id)
      .single()

    if (!user) {
      throw new Error('User not found in loyalty system')
    }

    // Проверяем, не был ли заказ уже учтен
    const { data: existingTransaction } = await supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('order_id', data.order_id)
      .eq('user_id', user.id)
      .single()

    if (existingTransaction) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Order already processed'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Рассчитываем баллы за заказ
    const points = calculateOrderPoints(data.order_amount)

    // Обновляем данные пользователя
    const { data: updatedUser, error } = await supabase
      .from('loyalty_users')
      .update({
        total_points: user.total_points + points,
        available_points: user.available_points + points,
        completed_orders: user.completed_orders + 1
      })
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error

    // Создаем транзакцию
    await supabase
      .from('loyalty_transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'earn',
        points: points,
        order_id: data.order_id,
        marketplace: data.marketplace,
        order_amount: data.order_amount,
        description: `Баллы за заказ ${data.order_id} на сумму ${data.order_amount} ₽`
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        points_awarded: points,
        user: updatedUser,
        message: `Начислено ${points} баллов за заказ`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    throw new Error(`Add points error: ${error.message}`)
  }
}

// Получение баллов пользователя
async function getUserPoints(supabase: any, data: { telegram_id: string }) {
  try {
    const { data: user } = await supabase
      .from('loyalty_users')
      .select('*')
      .eq('telegram_id', data.telegram_id)
      .single()

    if (!user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'User not found in loyalty system'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Получаем историю транзакций
    const { data: transactions } = await supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    return new Response(
      JSON.stringify({ 
        success: true, 
        user,
        transactions,
        message: `У вас ${user.available_points} доступных баллов из ${user.total_points} накопленных`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    throw new Error(`Get user points error: ${error.message}`)
  }
}

// Запрос кэшбэка
async function requestCashback(supabase: any, data: { 
  telegram_id: string, 
  amount: 50 | 100 | 150,
  phone_number: string 
}) {
  try {
    // Проверяем возможность кэшбэка
    const { data: canRequest } = await supabase.rpc('can_request_cashback', {
      user_telegram_id: data.telegram_id
    })

    if (!canRequest.can_request) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          reason: canRequest.reason,
          details: canRequest
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Получаем пользователя
    const { data: user } = await supabase
      .from('loyalty_users')
      .select('*')
      .eq('telegram_id', data.telegram_id)
      .single()

    // Получаем настройки кэшбэка
    const { data: cashbackSettings } = await supabase
      .from('loyalty_settings')
      .select('setting_value')
      .eq('setting_key', 'cashback_options')
      .single()

    const cashbackOption = cashbackSettings.setting_value[data.amount.toString()]
    
    if (!cashbackOption || user.available_points < cashbackOption.points_required) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Insufficient points for this cashback amount'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Создаем запрос на кэшбэк
    const { data: cashback, error } = await supabase
      .from('loyalty_cashbacks')
      .insert({
        user_id: user.id,
        amount: data.amount,
        points_spent: cashbackOption.points_spent,
        points_remaining: cashbackOption.points_remaining,
        phone_number: data.phone_number
      })
      .select()
      .single()

    if (error) throw error

    // Обновляем баллы пользователя
    await supabase
      .from('loyalty_users')
      .update({
        available_points: user.available_points - cashbackOption.points_spent,
        cashback_cycles: user.cashback_cycles + 1,
        last_cashback_date: new Date().toISOString()
      })
      .eq('id', user.id)

    // Создаем транзакцию списания
    await supabase
      .from('loyalty_transactions')
      .insert({
        user_id: user.id,
        transaction_type: 'spend',
        points: -cashbackOption.points_spent,
        description: `Кэшбэк ${data.amount} ₽`
      })

    // Запускаем обработку платежа
    await processCashbackPayment(supabase, { cashback_id: cashback.id })

    return new Response(
      JSON.stringify({ 
        success: true, 
        cashback,
        message: `Кэшбэк ${data.amount} ₽ запрошен. Списалось ${cashbackOption.points_spent} баллов`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    throw new Error(`Request cashback error: ${error.message}`)
  }
}

// Обработка платежа кэшбэка через T-Bank API
async function processCashbackPayment(supabase: any, data: { cashback_id: string }) {
  try {
    const { data: cashback } = await supabase
      .from('loyalty_cashbacks')
      .select('*, loyalty_users(telegram_id)')
      .eq('id', data.cashback_id)
      .single()

    if (!cashback) {
      throw new Error('Cashback not found')
    }

    // Получаем настройки платежного провайдера
    const { data: paymentSettings } = await supabase
      .from('loyalty_settings')
      .select('setting_value')
      .eq('setting_key', 'payment_provider')
      .single()

    // Проверяем баланс платформы
    const { data: platformBalance } = await supabase
      .from('platform_balance')
      .select('*')
      .single()

    if (platformBalance.current_balance < cashback.amount) {
      // Обновляем статус на failed
      await supabase
        .from('loyalty_cashbacks')
        .update({ 
          payment_status: 'failed',
          payment_response: { error: 'Insufficient platform balance' }
        })
        .eq('id', cashback.id)

      // Отправляем уведомление администратору
      await sendAdminNotification(supabase, {
        type: 'low_balance',
        title: 'Недостаточно средств для выплаты',
        message: `Баланс платформы: ${platformBalance.current_balance} ₽, требуется: ${cashback.amount} ₽`
      })

      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Insufficient platform balance for payout'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Выполняем платеж через T-Bank API
    const paymentResult = await processTBankPayment({
      amount: cashback.amount,
      phone_number: cashback.phone_number,
      description: `Кэшбэк Easy Clean для пользователя ${cashback.loyalty_users.telegram_id}`
    })

    // Обновляем статус кэшбэка
    await supabase
      .from('loyalty_cashbacks')
      .update({
        payment_status: paymentResult.success ? 'success' : 'failed',
        payment_id: paymentResult.payment_id,
        payment_response: paymentResult,
        processed_at: new Date().toISOString()
      })
      .eq('id', cashback.id)

    if (paymentResult.success) {
      // Обновляем баланс платформы
      await supabase
        .from('platform_balance')
        .update({
          current_balance: platformBalance.current_balance - cashback.amount,
          total_paid_out: platformBalance.total_paid_out + cashback.amount,
          last_payout_date: new Date().toISOString()
        })

      // Проверяем уведомления о балансе
      await checkBalanceNotifications(supabase, platformBalance.current_balance - cashback.amount)
    }

    return new Response(
      JSON.stringify({ 
        success: paymentResult.success, 
        payment_result: paymentResult,
        message: paymentResult.success ? 'Кэшбэк успешно выплачен' : 'Ошибка выплаты кэшбэка'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    throw new Error(`Process cashback payment error: ${error.message}`)
  }
}

// Интеграция с T-Bank API для выплат
async function processTBankPayment(data: { 
  amount: number, 
  phone_number: string, 
  description: string 
}) {
  try {
    // Здесь должна быть реальная интеграция с T-Bank API
    // Пока используем мок-реализацию
    const tbankApiKey = Deno.env.get('TBANK_API_KEY')
    const tbankApiUrl = Deno.env.get('TBANK_API_URL')

    if (!tbankApiKey || !tbankApiUrl) {
      console.warn('T-Bank API credentials not configured, using mock payment')
      return {
        success: true,
        payment_id: `mock_${Date.now()}`,
        message: 'Mock payment processed successfully'
      }
    }

    // Реальная интеграция с T-Bank API
    const response = await fetch(`${tbankApiUrl}/payments/sbp`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tbankApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: data.amount * 100, // Конвертируем в копейки
        phone_number: data.phone_number,
        description: data.description
      })
    })

    const result = await response.json()

    return {
      success: response.ok,
      payment_id: result.payment_id,
      message: result.message || 'Payment processed'
    }
  } catch (error) {
    console.error('T-Bank API error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Получение баланса платформы
async function getPlatformBalance(supabase: any) {
  try {
    const { data: balance } = await supabase
      .from('platform_balance')
      .select('*')
      .single()

    return new Response(
      JSON.stringify({ 
        success: true, 
        balance
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    throw new Error(`Get platform balance error: ${error.message}`)
  }
}

// Обновление баланса платформы
async function updatePlatformBalance(supabase: any, data: { 
  action: 'deposit' | 'withdraw', 
  amount: number 
}) {
  try {
    // Получаем текущий баланс или создаем новый, если не существует
    let { data: currentBalance, error: balanceError } = await supabase
      .from('platform_balance')
      .select('*')
      .single()

    if (balanceError || !currentBalance) {
      // Создаем начальную запись баланса, если она не существует
      const { data: newBalance, error: createError } = await supabase
        .from('platform_balance')
        .insert({
          current_balance: 0,
          total_deposited: 0,
          total_paid_out: 0
        })
        .select()
        .single()

      if (createError) throw createError
      currentBalance = newBalance
    }

    let newBalance = currentBalance.current_balance
    let totalDeposited = currentBalance.total_deposited
    let totalPaidOut = currentBalance.total_paid_out

    if (data.action === 'deposit') {
      newBalance += data.amount
      totalDeposited += data.amount
    } else if (data.action === 'withdraw') {
      newBalance -= data.amount
      totalPaidOut += data.amount
    }

    const { data: updatedBalance, error } = await supabase
      .from('platform_balance')
      .update({
        current_balance: newBalance,
        total_deposited: totalDeposited,
        total_paid_out: totalPaidOut,
        last_deposit_date: data.action === 'deposit' ? new Date().toISOString() : currentBalance.last_deposit_date,
        last_payout_date: data.action === 'withdraw' ? new Date().toISOString() : currentBalance.last_payout_date
      })
      .eq('id', currentBalance.id)
      .select()
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        success: true, 
        balance: updatedBalance,
        message: `${data.action === 'deposit' ? 'Пополнение' : 'Списание'} ${data.amount} ₽ выполнено`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    throw new Error(`Update platform balance error: ${error.message}`)
  }
}

// Корректировка баллов пользователя
async function adjustUserPoints(supabase: any, data: { 
  telegram_id: string, 
  points: number, 
  reason: string 
}) {
  try {
    // Получаем пользователя
    const { data: user, error: userError } = await supabase
      .from('loyalty_users')
      .select('*')
      .eq('telegram_id', data.telegram_id)
      .single()

    if (userError || !user) {
      throw new Error('User not found')
    }

    // Обновляем баллы пользователя
    const newTotalPoints = user.total_points + data.points
    const newAvailablePoints = user.available_points + data.points

    const { data: updatedUser, error: updateError } = await supabase
      .from('loyalty_users')
      .update({
        total_points: newTotalPoints,
        available_points: newAvailablePoints
      })
      .eq('telegram_id', data.telegram_id)
      .select()
      .single()

    if (updateError) throw updateError

    // Создаем транзакцию
    const { error: transactionError } = await supabase
      .from('loyalty_transactions')
      .insert({
        user_id: user.id,
        transaction_type: data.points > 0 ? 'earn' : 'spend',
        points: Math.abs(data.points),
        description: `Корректировка: ${data.reason}`,
        created_at: new Date().toISOString()
      })

    if (transactionError) throw transactionError

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: updatedUser,
        message: `Баллы скорректированы на ${data.points > 0 ? '+' : ''}${data.points}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    throw new Error(`Adjust user points error: ${error.message}`)
  }
}

// Получение отчетов для администратора
async function getAdminReports(supabase: any, data: { 
  report_type: 'users' | 'transactions' | 'cashbacks' | 'balance',
  date_from?: string,
  date_to?: string,
  limit?: number 
}) {
  try {
    let reportData

    switch (data.report_type) {
      case 'users':
        const { data: users } = await supabase
          .from('loyalty_users')
          .select('*')
          .order('registration_date', { ascending: false })
          .limit(data.limit || 100)
        reportData = users
        break

      case 'transactions':
        const { data: transactions } = await supabase
          .from('loyalty_transactions')
          .select('*, loyalty_users(telegram_id, first_name, last_name)')
          .gte('created_at', data.date_from || '2024-01-01')
          .lte('created_at', data.date_to || new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(data.limit || 100)
        reportData = transactions
        break

      case 'cashbacks':
        const { data: cashbacks } = await supabase
          .from('loyalty_cashbacks')
          .select('*, loyalty_users(telegram_id, first_name, last_name)')
          .gte('created_at', data.date_from || '2024-01-01')
          .lte('created_at', data.date_to || new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(data.limit || 100)
        reportData = cashbacks
        break

      case 'balance':
        const { data: balance } = await supabase
          .from('platform_balance')
          .select('*')
          .single()
        reportData = balance
        break

      default:
        throw new Error('Unknown report type')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        report_type: data.report_type,
        data: reportData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    throw new Error(`Get admin reports error: ${error.message}`)
  }
}

// Вспомогательные функции

function calculateOrderPoints(orderAmount: number): number {
  if (orderAmount <= 200) return 10
  if (orderAmount <= 500) return 40
  if (orderAmount <= 700) return 60
  if (orderAmount >= 1000) return 90
  return 0
}

async function sendAdminNotification(supabase: any, data: { 
  type: string, 
  title: string, 
  message: string 
}) {
  try {
    await supabase
      .from('admin_notifications')
      .insert({
        notification_type: data.type,
        title: data.title,
        message: data.message
      })
  } catch (error) {
    console.error('Error sending admin notification:', error)
  }
}

async function checkBalanceNotifications(supabase: any, currentBalance: number) {
  try {
    const { data: notificationSettings } = await supabase
      .from('loyalty_settings')
      .select('setting_value')
      .eq('setting_key', 'notifications')
      .single()

    const settings = notificationSettings.setting_value
    const lowBalanceThreshold = settings.low_balance_threshold || 10000

    if (currentBalance < lowBalanceThreshold) {
      await sendAdminNotification(supabase, {
        type: 'low_balance',
        title: 'Низкий баланс платформы',
        message: `Баланс платформы: ${currentBalance} ₽. Рекомендуется пополнение.`
      })
    }
  } catch (error) {
    console.error('Error checking balance notifications:', error)
  }
} 