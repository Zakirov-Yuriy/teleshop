import { supabase } from './supabase'

export interface LoyaltyUser {
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

export async function getLoyaltyPoints(userId: string): Promise<LoyaltyUser | null> {
  try {
    const { data, error } = await supabase
      .from('loyalty_users')
      .select('*')
      .eq('telegram_id', userId)
      .single()

    if (error) {
      console.error('Ошибка получения баллов лояльности:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Ошибка получения баллов лояльности:', error)
    return null
  }
}

export async function createLoyaltyUser(userId: string): Promise<LoyaltyUser | null> {
  try {
    const { data, error } = await supabase
      .from('loyalty_users')
      .insert({
        telegram_id: userId,
        total_points: 0,
        available_points: 0,
        completed_orders: 0,
        cashback_cycles: 0
      })
      .select()
      .single()

    if (error) {
      console.error('Ошибка создания пользователя лояльности:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Ошибка создания пользователя лояльности:', error)
    return null
  }
}

export function getLevelInfo(points: number) {
  if (points >= 10000) return { level: 'diamond', name: 'Алмаз', color: 'text-purple-400' }
  if (points >= 5000) return { level: 'platinum', name: 'Платина', color: 'text-gray-300' }
  if (points >= 2000) return { level: 'gold', name: 'Золото', color: 'text-yellow-400' }
  if (points >= 500) return { level: 'silver', name: 'Серебро', color: 'text-gray-400' }
  return { level: 'bronze', name: 'Бронза', color: 'text-orange-600' }
} 