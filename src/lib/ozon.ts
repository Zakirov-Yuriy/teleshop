import { supabase } from './supabase'

interface OzonProduct {
  offer_id: string
  product_id: number
  name: string
  description: string
  category_id: number
  price: string
  old_price: string
  premium_price: string
  marketing_price: string
  min_price: string
  currency_code: string
  images: Array<{
    file_name: string
    default: boolean
    index: number
  }>
  attributes: Array<{
    attribute_id: number
    complex_id: number
    values: Array<{
      dictionary_value_id: number
      value: string
    }>
  }>
  barcode: string
  weight: number
  dimensions: {
    height: number
    length: number
    width: number
  }
  status: {
    state: string
    state_failed_reason: string
    moderate_status: string
    decline_reasons: string[]
    validation_state: string
    state_name: string
    state_description: string
    is_failed: boolean
    is_created: boolean
    state_tooltip: string
    item_errors: any[]
    state_updated_at: string
  }
  visibility: string
  has_discounted_item: boolean
  discounted_stocks: {
    coming: number
    present: number
    reserved: number
  }
  is_discounted: boolean
  primary_image: string
  stocks: {
    coming: number
    present: number
    reserved: number
  }
  errors: any[]
  vat: string
  visible: boolean
  price_index: string
  images360: any[]
  color_image: string
  parent_id: number
  rich_media_aplus: any[]
  rich_media_aplus_state: string
  tags: any[]
  video_url: string[]
  pdf_list: any[]
  state: string
  archive_reason: string
}

interface OzonProductInfo {
  result: {
    items: Array<{
      product_id: number
      offer_id: string
      is_fbo_visible: boolean
      is_fbs_visible: boolean
      archived: boolean
      is_discounted: boolean
    }>
    total: number
    last_id: string
  }
}

interface OzonPriceInfo {
  result: {
    items: Array<{
      product_id: number
      offer_id: string
      price: {
        currency_code: string
        old_price: string
        premium_price: string
        price: string
        recommended_price: string
        retail_price: string
        vat: string
        min_price: string
        marketing_price: string
        marketing_seller_price: string
        auto_action_enabled: string
        currency_code_options: string
      }
      marketing_actions: any[]
      volume_ordered_units: {
        orders_count: number
        period_iso: string
      }
      price_indexes: {
        external_index_data: {
          minimal_price: string
          minimal_price_currency: string
          price_index_value: number
        }
        ozon_index_data: {
          minimal_price: string
          minimal_price_currency: string
          price_index_value: number
        }
        price_index: string
        self_marketplaces_index_data: {
          minimal_price: string
          minimal_price_currency: string
          price_index_value: number
        }
      }
      commissions: {
        sales_percent: number
        fbo_fulfillment_amount: number
        fbo_direct_flow_trans_min_amount: number
        fbo_direct_flow_trans_max_amount: number
        fbo_deliv_to_customer_amount: number
        fbo_return_flow_amount: number
        fbo_return_flow_trans_min_amount: number
        fbo_return_flow_trans_max_amount: number
        fbs_first_mile_min_amount: number
        fbs_first_mile_max_amount: number
        fbs_direct_flow_trans_min_amount: number
        fbs_direct_flow_trans_max_amount: number
        fbs_deliv_to_customer_amount: number
        fbs_return_flow_amount: number
        fbs_return_flow_trans_min_amount: number
        fbs_return_flow_trans_max_amount: number
      }
    }>
  }
}

export class OzonAPI {
  private clientId: string
  private apiKey: string
  private baseURL = 'https://api-seller.ozon.ru'

  constructor(clientId: string, apiKey: string) {
    this.clientId = clientId
    this.apiKey = apiKey
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Client-Id': this.clientId,
        'Api-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Ozon API Error: ${response.status} ${response.statusText}. Response: ${errorText}`)
    }

    return response.json()
  }

  async getProducts(limit = 100, lastId = ''): Promise<OzonProductInfo> {
    const body = {
      filter: {
        visibility: 'ALL'
      },
      last_id: lastId,
      limit: limit
    }

    return this.request('/v2/product/list', {
      method: 'POST',
      body: JSON.stringify(body)
    })
  }

  async getProductInfo(productIds: number[]): Promise<any> {
    const body = {
      product_id: productIds,
      sku: [],
      offer_id: []
    }

    return this.request('/v2/product/info', {
      method: 'POST',
      body: JSON.stringify(body)
    })
  }

  async getProductPrices(productIds: number[]): Promise<OzonPriceInfo> {
    const body = {
      filter: {
        product_id: productIds,
        visibility: 'ALL'
      }
    }

    return this.request('/v4/product/info/prices', {
      method: 'POST',
      body: JSON.stringify(body)
    })
  }

  async getProductStocks(productIds: number[]): Promise<any> {
    const body = {
      filter: {
        product_id: productIds,
        visibility: 'ALL'
      }
    }

    return this.request('/v3/product/info/stocks', {
      method: 'POST',
      body: JSON.stringify(body)
    })
  }

  async getProductRating(productIds: number[]): Promise<any> {
    const body = {
      products: productIds.map(id => ({ sku: id, product_id: id }))
    }

    return this.request('/v1/product/rating-by-sku', {
      method: 'POST',
      body: JSON.stringify(body)
    })
  }
}

// Функция для синхронизации товаров Ozon через Edge Function
export async function syncOzonProducts(storeId: string): Promise<{
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

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-ozon`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ store_id: storeId })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Ошибка синхронизации Ozon')
    }

    return result
  } catch (error) {
    console.error('Error syncing Ozon products:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }
  }
}