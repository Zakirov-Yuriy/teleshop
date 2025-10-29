import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { action, data } = await req.json()

    switch (action) {
      case 'get_transactions':
        return await getTransactions(supabase, data)
      
      case 'get_withdrawals':
        return await getWithdrawals(supabase, data)
      
      case 'create_withdrawal':
        return await createWithdrawal(supabase, data)
      
      case 'get_cashback_stats':
        return await getCashbackStats(supabase, data)
      
      
      
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function getTransactions(supabase: any, data: any) {
  const { user_id } = data
  
  if (!user_id) {
    return new Response(
      JSON.stringify({ error: 'user_id is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Получаем транзакции из таблицы loyalty_transactions
    const { data: transactions, error } = await supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('user_id', user_id.toString())
      .order('created_at', { ascending: false })

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        success: true, 
        transactions: transactions || [] 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error getting transactions:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to get transactions' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function getWithdrawals(supabase: any, data: any) {
  const { user_id } = data
  
  if (!user_id) {
    return new Response(
      JSON.stringify({ error: 'user_id is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Получаем выводы из таблицы loyalty_cashbacks
    const { data: withdrawals, error } = await supabase
      .from('loyalty_cashbacks')
      .select('*')
      .eq('user_id', user_id.toString())
      .order('created_at', { ascending: false })

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        success: true, 
        withdrawals: withdrawals || [] 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error getting withdrawals:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to get withdrawals' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function createWithdrawal(supabase: any, data: any) {
  const { user_id, amount, phone, points_to_deduct } = data
  
  if (!user_id || !amount || !phone || !points_to_deduct) {
    return new Response(
      JSON.stringify({ error: 'user_id, amount, phone, and points_to_deduct are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Проверяем, что у пользователя достаточно баллов
    const { data: user, error: userError } = await supabase
      .from('loyalty_users')
      .select('available_points')
      .eq('telegram_id', user_id)
      .single()

    if (userError) throw userError

    if (!user || user.available_points < points_to_deduct) {
      return new Response(
        JSON.stringify({ error: 'Недостаточно баллов для вывода' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Создаем запись о выводе
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('loyalty_cashbacks')
      .insert({
        user_id: user_id.toString(),
        amount,
        phone,
        points_used: points_to_deduct,
        status: 'pending',
        payment_method: 'sbp'
      })
      .select()
      .single()

    if (withdrawalError) throw withdrawalError

    // Создаем транзакцию списания баллов
    const { error: transactionError } = await supabase
      .from('loyalty_transactions')
      .insert({
        user_id: user_id.toString(),
        type: 'withdrawal',
        points: -points_to_deduct,
        amount: amount,
        description: `Вывод кэшбека на номер ${phone}`,
        status: 'completed'
      })

    if (transactionError) throw transactionError

    // Обновляем доступные баллы пользователя
    const { error: updateError } = await supabase
      .from('loyalty_users')
      .update({ 
        available_points: user.available_points - points_to_deduct 
      })
      .eq('telegram_id', user_id)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ 
        success: true, 
        withdrawal,
        message: 'Заявка на вывод кэшбека создана успешно'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating withdrawal:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create withdrawal' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function getCashbackStats(supabase: any, data: any) {
  const { user_id } = data
  
  if (!user_id) {
    return new Response(
      JSON.stringify({ error: 'user_id is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Получаем статистику пользователя
    const { data: user, error: userError } = await supabase
      .from('loyalty_users')
      .select('*')
      .eq('telegram_id', user_id)
      .single()

    if (userError) throw userError

    // Получаем статистику транзакций
    const { data: transactions, error: transactionsError } = await supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('user_id', user_id.toString())

    if (transactionsError) throw transactionsError

    // Получаем статистику выводов
    const { data: withdrawals, error: withdrawalsError } = await supabase
      .from('loyalty_cashbacks')
      .select('*')
      .eq('user_id', user_id.toString())

    if (withdrawalsError) throw withdrawalsError

    // Подсчитываем статистику
    const totalEarned = transactions
      ?.filter(t => t.type === 'accrual')
      ?.reduce((sum, t) => sum + (t.points || 0), 0) || 0

    const totalWithdrawn = withdrawals
      ?.filter(w => w.status === 'completed')
      ?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0

    const pendingWithdrawals = withdrawals
      ?.filter(w => w.status === 'pending')
      ?.length || 0

    return new Response(
      JSON.stringify({ 
        success: true, 
        stats: {
          user,
          totalEarned,
          totalWithdrawn,
          pendingWithdrawals,
          totalTransactions: transactions?.length || 0,
          totalWithdrawals: withdrawals?.length || 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error getting cashback stats:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to get cashback stats' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

 