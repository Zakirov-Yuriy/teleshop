/*
  # Set Telegram Webhook Edge Function
  
  Настраивает webhook для Telegram бота через API.
  Функция получает store_id, проверяет права доступа и устанавливает webhook.
*/

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

interface SetWebhookRequest {
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

    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { store_id }: SetWebhookRequest = await req.json()

    if (!store_id) {
      return new Response(JSON.stringify({ error: 'store_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify user owns the store and get bot token
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('telegram_bot_token')
      .eq('id', store_id)
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return new Response(JSON.stringify({ error: 'Store not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!store.telegram_bot_token) {
      return new Response(JSON.stringify({ error: 'Telegram bot token not configured for this store' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const botToken = store.telegram_bot_token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const webhookSecret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET')!

    // Construct the webhook URL for the telegram-bot Edge Function
    const telegramBotWebhookUrl = `${supabaseUrl}/functions/v1/telegram-bot?secret=${webhookSecret}`
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/setWebhook`

    console.log(`Setting webhook for store ${store_id} to: ${telegramBotWebhookUrl}`)

    const telegramResponse = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: telegramBotWebhookUrl,
        drop_pending_updates: true // Clear any pending updates
      })
    })

    const telegramResult = await telegramResponse.json()

    if (!telegramResponse.ok || !telegramResult.ok) {
      console.error('Telegram API Error:', telegramResult)
      return new Response(JSON.stringify({ 
        success: false, 
        error: telegramResult.description || 'Failed to set webhook with Telegram API' 
      }), {
        status: telegramResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, message: 'Webhook set successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in set-telegram-webhook function:', error)
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})