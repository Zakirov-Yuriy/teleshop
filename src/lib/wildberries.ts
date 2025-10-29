interface WBProduct {
  nmID: number
  vendorCode: string
  sizes: Array<{
    skus: string[]
  }>
  characteristics: Array<{
    Наименование: string
    Значение: string
  }>
}

interface WBCardProduct {
  nmID: number
  imtID: number
  nm: string
  vendorCode: string
  brand: string
  brandID: number
  siteBrandID: number
  supplierID: number
  sale: number
  priceU: number
  salePriceU: number
  logisticsCost: number
  subject: string
  category: string
  pics: number
  rating: number
  reviewRating: number
  feedbacks: number
  panelPromoID: number
  promoTextCard: string
  promoTextCat: string
  volume: number
  colors: Array<{
    name: string
    id: number
  }>
  sizes: Array<{
    name: string
    origName: string
    rank: number
    optionId: number
    stocks: Array<{
      wh: number
      qty: number
    }>
    price: number
    discountedPrice: number
  }>
}

export class WildberriesAPI {
  private token: string
  private baseURL = 'https://suppliers-api.wildberries.ru'

  constructor(token: string) {
    this.token = token
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.token,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`WB API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async getCards(limit = 100): Promise<WBCardProduct[]> {
    const response = await this.request(`/content/v1/cards/cursor/list?limit=${limit}`)
    return response.data?.cards || []
  }

  async getCardByNmID(nmID: number): Promise<WBCardProduct | null> {
    const response = await this.request(`/content/v1/cards/filter?nm=${nmID}`)
    return response.data?.[0] || null
  }

  async getStocks(): Promise<any[]> {
    const response = await this.request('/api/v3/stocks')
    return response || []
  }

  async getOrders(dateFrom: string): Promise<any[]> {
    const response = await this.request(`/api/v3/orders?dateFrom=${dateFrom}`)
    return response || []
  }

  async getSupplies(limit = 1000): Promise<any[]> {
    const response = await this.request(`/api/v3/supplies?limit=${limit}`)
    return response?.supplies || []
  }
}

// Функция для синхронизации товаров через Edge Function
export async function syncStoreProducts(storeId: string): Promise<{
  success: boolean
  synced_count?: number
  error_count?: number
  total_products?: number
  errors?: string[]
  error?: string
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('Необходимо войти в систему')
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-wildberries`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ store_id: storeId })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Ошибка синхронизации')
    }

    return result
  } catch (error) {
    console.error('Error syncing products:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }
  }
}

import { supabase } from './supabase'
import { syncOzonProducts } from './ozon'