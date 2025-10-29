import { supabase } from './supabase'

export async function setTelegramWebhook(storeId: string): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('Необходимо войти в систему')
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/set-telegram-webhook`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ store_id: storeId })
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Ошибка настройки webhook')
    }

    return { success: true, message: result.message }
  } catch (error) {
    console.error('Error setting webhook:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }
  }
}