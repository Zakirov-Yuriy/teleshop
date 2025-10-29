import { supabase } from '@/lib/supabase'

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-activity`

function ensureSessionId(): string {
  try {
    let sid = localStorage.getItem('miniapp_session_id')
    if (!sid) {
      sid = (window.crypto?.randomUUID?.() || `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`)
      localStorage.setItem('miniapp_session_id', sid)
    }
    return sid
  } catch {
    return `sess_${Date.now()}`
  }
}

function getTelegramUserIdForLogs(): string {
  try {
    const urlParams = new URLSearchParams(window.location.search)
    const idFromUrl = urlParams.get('tg_user_id') || urlParams.get('user_id') || urlParams.get('id') || urlParams.get('from')
    if (idFromUrl) return idFromUrl

    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const idFromHash = hashParams.get('tg_user_id') || hashParams.get('user_id') || hashParams.get('id') || hashParams.get('from')
    if (idFromHash) return idFromHash

    const tgUser = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user
    if (tgUser?.id) return tgUser.id.toString()

    const stored = localStorage.getItem('telegram_user_id')
    if (stored) return stored

    const wbStored = localStorage.getItem('wb_user_id')?.replace('telegram_', '')
    if (wbStored && wbStored !== 'undefined') return wbStored
  } catch {}
  return 'anonymous'
}

export async function logActivity(activityType: string, activityData?: any) {
  try {
    const telegramId = getTelegramUserIdForLogs()
    const sessionId = ensureSessionId()
    const userAgent = navigator.userAgent

    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        action: 'log_activity',
        data: {
          telegram_id: telegramId,
          activity_type: activityType,
          activity_data: activityData || null,
          session_id: sessionId,
          user_agent: userAgent
        }
      })
    })

    if (!res.ok) {
      // Не ломаем UX; просто логируем в консоль
      const text = await res.text()
      console.warn('Activity log failed:', res.status, text)
    }
  } catch (e) {
    console.warn('Activity log error:', (e as Error).message)
  }
}
