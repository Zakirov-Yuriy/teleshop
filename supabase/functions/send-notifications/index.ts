import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

interface Notification {
  id: string
  telegram_id: string
  notification_type: string
  title: string
  message: string
  action_url?: string
  action_text?: string
  is_sent: boolean
  created_at: string
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
      case 'send_pending_notifications':
        return await sendPendingNotifications(supabase)
      
      case 'send_notification':
        return await sendNotification(supabase, data)
      
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Send notifications error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Отправка всех ожидающих уведомлений
async function sendPendingNotifications(supabase: any) {
  try {
    // Получаем все неотправленные уведомления
    const { data: notifications, error } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('is_sent', false)
      .order('created_at', { ascending: true })
      .limit(50) // Ограничиваем количество для одной отправки

    if (error) throw error

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No pending notifications to send',
          sent_count: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let sentCount = 0
    let failedCount = 0
    const results = []

    for (const notification of notifications) {
      try {
        const result = await sendTelegramMessage(notification)
        
        if (result.success) {
          // Обновляем статус уведомления
          const { error: updateError } = await supabase
            .from('user_notifications')
            .update({ 
              is_sent: true,
              sent_at: new Date().toISOString(),
              telegram_response: result
            })
            .eq('id', notification.id)

          if (updateError) {
            console.error('Error updating notification status:', updateError)
            failedCount++
          } else {
            sentCount++
          }
        } else {
          failedCount++
        }

        results.push({
          notification_id: notification.id,
          telegram_id: notification.telegram_id,
          success: result.success,
          error: result.error
        })

        // Небольшая задержка между отправками
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`Error sending notification ${notification.id}:`, error)
        failedCount++
        results.push({
          notification_id: notification.id,
          telegram_id: notification.telegram_id,
          success: false,
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent_count: sentCount,
        failed_count: failedCount,
        results,
        message: `Sent ${sentCount} notifications, failed ${failedCount}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    throw new Error(`Send pending notifications error: ${error.message}`)
  }
}

// Отправка конкретного уведомления
async function sendNotification(supabase: any, data: { notification_id: string }) {
  try {
    const { data: notification, error } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('id', data.notification_id)
      .single()

    if (error || !notification) {
      throw new Error('Notification not found')
    }

    const result = await sendTelegramMessage(notification)

    if (result.success) {
      // Обновляем статус уведомления
      const { error: updateError } = await supabase
        .from('user_notifications')
        .update({ 
          is_sent: true,
          sent_at: new Date().toISOString(),
          telegram_response: result
        })
        .eq('id', notification.id)

      if (updateError) {
        console.error('Error updating notification status:', updateError)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: result.success, 
        result,
        message: result.success ? 'Notification sent successfully' : 'Failed to send notification'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    throw new Error(`Send notification error: ${error.message}`)
  }
}

// Отправка сообщения через Telegram Bot API
async function sendTelegramMessage(notification: Notification) {
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
      throw new Error('No active store with bot token found')
    }
    
    const botToken = stores[0].telegram_bot_token
    if (!botToken) {
      throw new Error('Telegram bot token not configured')
    }

    // Формируем сообщение
    let message = `📢 ${notification.title}\n\n${notification.message}`
    
    // Добавляем кнопку действия, если есть
    let replyMarkup = undefined
    if (notification.action_url && notification.action_text) {
      replyMarkup = {
        inline_keyboard: [[
          {
            text: notification.action_text,
            url: notification.action_url
          }
        ]]
      }
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: notification.telegram_id,
        text: message,
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      })
    })

    const result = await response.json()

    if (result.ok) {
      return {
        success: true,
        message_id: result.result.message_id,
        chat_id: result.result.chat.id
      }
    } else {
      return {
        success: false,
        error: result.description || 'Unknown Telegram API error',
        error_code: result.error_code
      }
    }
  } catch (error) {
    console.error('Telegram API error:', error)
    return {
      success: false,
      error: error.message
    }
  }
} 