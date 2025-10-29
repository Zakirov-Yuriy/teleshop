import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}

interface ActivityLog {
  telegram_id: string
  activity_type: string
  activity_data?: any
  session_id?: string
  user_agent?: string
  ip_address?: string
}

interface Notification {
  telegram_id: string
  notification_type: string
  title: string
  message: string
  action_url?: string
  action_text?: string
}

interface BulkNotification {
  notification_type: string
  title: string
  message: string
  action_url?: string
  action_text?: string
  telegram_ids?: string[]
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
    case 'trigger_sync_orders':
      return await triggerSyncOrders(supabase, data)
      case 'log_activity':
        return await logActivity(supabase, data)
      
      case 'get_activity_logs':
        return await getActivityLogs(supabase, data)
      
      case 'create_notification':
        return await createNotification(supabase, data)
      
      case 'send_bulk_notifications':
        return await sendBulkNotifications(supabase, data)
      
      case 'get_notifications':
        return await getNotifications(supabase, data)
      
      case 'mark_notification_sent':
        return await markNotificationSent(supabase, data)
      
      case 'get_notification_templates':
        return await getNotificationTemplates(supabase)
      
      case 'create_notification_template':
        return await createNotificationTemplate(supabase, data)
      
      case 'update_notification_template':
        return await updateNotificationTemplate(supabase, data)
      
      case 'delete_notification_template':
        return await deleteNotificationTemplate(supabase, data)
      
      case 'get_activity_stats':
        return await getActivityStats(supabase, data)
      
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('User activity error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
// Триггер синхронизации заказов для пользователя по telegram_id без открытия страницы
async function triggerSyncOrders(supabase: any, data: { telegram_id: string, wb_orders?: any[] }) {
  try {
    const { telegram_id, wb_orders } = data
    if (!telegram_id) throw new Error('telegram_id required')
    // Если WB заказы не переданы с клиента, просто выходим (в реальном сценарии сюда можно добавить вызов прокси WB)
    if (!Array.isArray(wb_orders) || wb_orders.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No orders to sync' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const resp = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/sync-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({ action: 'sync_orders', data: { wb_orders, user_id: telegram_id } })
    })
    const json = await resp.json()
    return new Response(JSON.stringify({ success: true, sync: json }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
}


// Логирование активности пользователя
async function logActivity(supabase: any, data: ActivityLog) {
  try {
    const { data: logId, error } = await supabase.rpc('log_user_activity', {
      p_telegram_id: data.telegram_id,
      p_activity_type: data.activity_type,
      p_activity_data: data.activity_data,
      p_session_id: data.session_id,
      p_user_agent: data.user_agent,
      p_ip_address: data.ip_address
    })

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        success: true, 
        log_id: logId,
        message: 'Activity logged successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    throw new Error(`Log activity error: ${error.message}`)
  }
}

// Получение логов активности
async function getActivityLogs(supabase: any, data: { 
  telegram_id?: string,
  activity_type?: string,
  date_from?: string,
  date_to?: string,
  limit?: number,
  offset?: number
}) {
  try {
    let query = supabase
      .from('user_activity_logs')
      .select('*')
      .order('created_at', { ascending: false })

    if (data.telegram_id) {
      query = query.eq('telegram_id', data.telegram_id)
    }

    if (data.activity_type) {
      query = query.eq('activity_type', data.activity_type)
    }

    if (data.date_from) {
      query = query.gte('created_at', data.date_from)
    }

    if (data.date_to) {
      query = query.lte('created_at', data.date_to)
    }

    if (data.limit) {
      query = query.limit(data.limit)
    }

    if (data.offset) {
      query = query.range(data.offset, data.offset + (data.limit || 50) - 1)
    }

    const { data: logs, error } = await query

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        success: true, 
        logs,
        count: logs.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    throw new Error(`Get activity logs error: ${error.message}`)
  }
}

// Создание уведомления
async function createNotification(supabase: any, data: Notification) {
  try {
    const { data: notificationId, error } = await supabase.rpc('create_user_notification', {
      p_telegram_id: data.telegram_id,
      p_notification_type: data.notification_type,
      p_title: data.title,
      p_message: data.message,
      p_action_url: data.action_url,
      p_action_text: data.action_text
    })

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        success: true, 
        notification_id: notificationId,
        message: 'Notification created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    throw new Error(`Create notification error: ${error.message}`)
  }
}

// Массовая отправка уведомлений
async function sendBulkNotifications(supabase: any, data: BulkNotification) {
  try {
    const { data: affectedCount, error } = await supabase.rpc('send_bulk_notifications', {
      p_notification_type: data.notification_type,
      p_title: data.title,
      p_message: data.message,
      p_action_url: data.action_url,
      p_action_text: data.action_text,
      p_telegram_ids: data.telegram_ids
    })

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        success: true, 
        affected_count: affectedCount,
        message: `Notifications created for ${affectedCount} users`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    throw new Error(`Send bulk notifications error: ${error.message}`)
  }
}

// Получение уведомлений
async function getNotifications(supabase: any, data: { 
  telegram_id?: string,
  notification_type?: string,
  is_sent?: boolean,
  limit?: number,
  offset?: number
}) {
  try {
    let query = supabase
      .from('user_notifications')
      .select('*')
      .order('created_at', { ascending: false })

    if (data.telegram_id) {
      query = query.eq('telegram_id', data.telegram_id)
    }

    if (data.notification_type) {
      query = query.eq('notification_type', data.notification_type)
    }

    if (data.is_sent !== undefined) {
      query = query.eq('is_sent', data.is_sent)
    }

    if (data.limit) {
      query = query.limit(data.limit)
    }

    if (data.offset) {
      query = query.range(data.offset, data.offset + (data.limit || 50) - 1)
    }

    const { data: notifications, error } = await query

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifications,
        count: notifications.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    throw new Error(`Get notifications error: ${error.message}`)
  }
}

// Отметка уведомления как отправленного
async function markNotificationSent(supabase: any, data: { notification_id: string }) {
  try {
    const { error } = await supabase
      .from('user_notifications')
      .update({ 
        is_sent: true,
        sent_at: new Date().toISOString()
      })
      .eq('id', data.notification_id)

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification marked as sent'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    throw new Error(`Mark notification sent error: ${error.message}`)
  }
}

// Получение шаблонов уведомлений
async function getNotificationTemplates(supabase: any) {
  try {
    const { data: templates, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('is_active', true)
      .order('template_key')

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        success: true, 
        templates
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    throw new Error(`Get notification templates error: ${error.message}`)
  }
}

// Создание шаблона уведомления
async function createNotificationTemplate(supabase: any, data: {
  template_key: string,
  title_template: string,
  message_template: string,
  action_url_template?: string,
  action_text_template?: string
}) {
  try {
    const { data: template, error } = await supabase
      .from('notification_templates')
      .insert({
        template_key: data.template_key,
        title_template: data.title_template,
        message_template: data.message_template,
        action_url_template: data.action_url_template,
        action_text_template: data.action_text_template
      })
      .select()
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        success: true, 
        template,
        message: 'Template created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    throw new Error(`Create notification template error: ${error.message}`)
  }
}

// Обновление шаблона уведомления
async function updateNotificationTemplate(supabase: any, data: {
  id: string,
  template_key?: string,
  title_template?: string,
  message_template?: string,
  action_url_template?: string,
  action_text_template?: string,
  is_active?: boolean
}) {
  try {
    const updateData: any = {}
    if (data.template_key) updateData.template_key = data.template_key
    if (data.title_template) updateData.title_template = data.title_template
    if (data.message_template) updateData.message_template = data.message_template
    if (data.action_url_template !== undefined) updateData.action_url_template = data.action_url_template
    if (data.action_text_template !== undefined) updateData.action_text_template = data.action_text_template
    if (data.is_active !== undefined) updateData.is_active = data.is_active

    const { data: template, error } = await supabase
      .from('notification_templates')
      .update(updateData)
      .eq('id', data.id)
      .select()
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        success: true, 
        template,
        message: 'Template updated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    throw new Error(`Update notification template error: ${error.message}`)
  }
}

// Удаление шаблона уведомления
async function deleteNotificationTemplate(supabase: any, data: { id: string }) {
  try {
    const { error } = await supabase
      .from('notification_templates')
      .delete()
      .eq('id', data.id)

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Template deleted successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    throw new Error(`Delete notification template error: ${error.message}`)
  }
}

// Получение статистики активности
async function getActivityStats(supabase: any, data: { 
  date_from?: string,
  date_to?: string
}) {
  try {
    let query = supabase
      .from('user_activity_logs')
      .select('activity_type, created_at')

    if (data.date_from) {
      query = query.gte('created_at', data.date_from)
    }

    if (data.date_to) {
      query = query.lte('created_at', data.date_to)
    }

    const { data: logs, error } = await query

    if (error) throw error

    // Группируем по типам активности
    const stats = logs.reduce((acc: any, log: any) => {
      const type = log.activity_type
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})

    // Общее количество действий
    const totalActions = logs.length

    // Уникальные пользователи
    const uniqueUsers = new Set(logs.map((log: any) => log.telegram_id)).size

    return new Response(
      JSON.stringify({ 
        success: true, 
        stats,
        total_actions: totalActions,
        unique_users: uniqueUsers,
        period: {
          from: data.date_from || 'all time',
          to: data.date_to || 'now'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    throw new Error(`Get activity stats error: ${error.message}`)
  }
} 