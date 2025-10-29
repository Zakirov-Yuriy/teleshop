import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { connect } from "https://deno.land/x/redis@v0.29.3/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url, method = 'GET', headers = {}, body } = await req.json()
    
    console.log(`🔗 Проксируем запрос: ${method} ${url}`)
    
    // Создаем запрос к Wildberries API
    const response = await fetch(url, {
      method,
      headers: {
        'Accept': '*/*',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    })

    const raw = await response.text()
    // Логируем начало ответа для отладки (обрезаем до 2к символов)
    console.log(`📡 Ответ получен: ${response.status} ${raw.slice(0, 2000)}`)
    
    return new Response(raw, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    })
    
  } catch (error) {
    console.error('❌ Ошибка прокси:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    })
  }
}) 