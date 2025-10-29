import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { wbAuthInstance } from '@/lib/wildberries-auth'
import { Package, Clock, CheckCircle, Truck, AlertCircle } from 'lucide-react'

interface OrdersPageProps {
  wbAuthInstance?: any
  onBack?: () => void
}

interface OrderItem {
  id: string
  name: string
  brand: string
  price: number
  quantity: number
  image_url?: string
}

interface Order {
  id: string
  order_number: string
  total_amount: number
  status: string
  delivery_address: string
  delivery_method: string
  payment_method: string
  created_at: string
  items: OrderItem[]
}

const OrdersPage: React.FC<OrdersPageProps> = ({ wbAuthInstance, onBack }) => {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wbAuthAvailable, setWbAuthAvailable] = useState(false)

  useEffect(() => {
    // Проверяем авторизацию Wildberries перед загрузкой заказов
    checkWbAuth()
  }, [])

  const checkWbAuth = async () => {
    try {
      if (wbAuthInstance) {
        const sessionExists = await wbAuthInstance.checkSession()
        setWbAuthAvailable(sessionExists)
        
        if (sessionExists) {
          await loadOrders()
        } else {
          setLoading(false)
          setError('Требуется авторизация в Wildberries для просмотра заказов')
        }
      } else {
        setLoading(false)
        setError('Wildberries не подключен')
      }
    } catch (error) {
      console.error('Error checking WB auth:', error)
      setLoading(false)
      setError('Ошибка проверки авторизации Wildberries')
    }
  }

  const loadOrders = async () => {
    try {
      setLoading(true)
      setError(null)

      // Получаем пользователя (Telegram или анонимный)
      const telegramUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user
      let userId: string
      
      if (telegramUser?.id) {
        userId = telegramUser.id.toString()
        console.log(`✅ Используем Telegram user ID: ${userId}`)
      } else {
        // Получаем сохраненный анонимный ID или генерируем новый
        let anonId = localStorage.getItem('wb_anon_user_id')
        if (!anonId) {
          anonId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          localStorage.setItem('wb_anon_user_id', anonId)
          console.log(`🔄 Генерируем новый анонимный user ID: ${anonId}`)
        } else {
          console.log(`✅ Используем сохраненный анонимный user ID: ${anonId}`)
        }
        userId = anonId
      }

      // Получаем заказы из Wildberries API
      let wbOrders = []
      try {
        wbOrders = await fetchWbOrders()
        setWbAuthAvailable(true)
        
        // Синхронизируем заказы с нашей базой данных
        if (wbOrders.length > 0) {
          await syncOrdersWithDatabase(wbOrders, userId)
        }
      } catch (error) {
        console.log('Не удалось получить заказы из Wildberries:', error instanceof Error ? error.message : 'Неизвестная ошибка')
        setWbAuthAvailable(false)
        // Продолжаем загрузку заказов из нашей базы
      }

      // Проверяем доступность авторизации
      if (wbAuthInstance) {
        const sessionExists = await wbAuthInstance.checkSession()
        setWbAuthAvailable(sessionExists)
      } else {
        setWbAuthAvailable(false)
      }

      // Отладочная информация - показываем товары в базе
      const { data: debugProducts } = await supabase
        .from('products')
        .select('id, name, marketplace_id, marketplace')
        .eq('marketplace', 'wildberries')
        .limit(5)
      
      console.log('🔍 Товары в базе данных:', debugProducts)
      
      // Получаем или создаем customer_id для пользователя
      let customerId: string
      
      if (userId.startsWith('anon_')) {
        // Для анонимных пользователей ищем или создаем запись в customers
        let { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('telegram_id', userId)
          .single()

        if (!customer) {
          // Создаем запись для анонимного пользователя
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert({
              telegram_id: userId,
              telegram_username: '',
              first_name: 'Анонимный пользователь',
              last_name: '',
              phone: '',
              address: ''
            })
            .select('id')
            .single()

          if (customerError) {
            console.error('❌ Ошибка создания customer для анонимного пользователя:', customerError)
            customerId = ''
          } else {
            customerId = newCustomer.id
            console.log(`✅ Создан customer для анонимного пользователя: ${customerId}`)
          }
        } else {
          customerId = customer.id
          console.log(`✅ Найден customer для анонимного пользователя: ${customerId}`)
        }
      } else {
        // Для Telegram пользователей ищем по telegram_id
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('telegram_id', userId)
          .single()

        if (customer) {
          customerId = customer.id
          console.log(`✅ Найден customer для Telegram пользователя: ${customerId}`)
        } else {
          console.log(`❌ Customer не найден для Telegram пользователя: ${userId}`)
          customerId = ''
        }
      }

      // Получаем заказы из нашей базы данных
      let dbOrders: any[] = []
      
      if (customerId) {
        const { data: orders, error: dbError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
              *,
              products (*)
            )
          `)
          .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

        if (dbError) {
          console.error('❌ Ошибка получения заказов:', dbError)
        } else {
          dbOrders = orders || []
          console.log(`📦 Найдено ${dbOrders.length} заказов в базе данных`)
        }
      }

              // Ошибка уже обработана выше

      // Объединяем данные
      const combinedOrders = await combineOrders(wbOrders, dbOrders || [])
      setOrders(combinedOrders)
    } catch (err) {
      console.error('Error loading orders:', err)
      setError('Ошибка при загрузке заказов')
    } finally {
      setLoading(false)
    }
  }

  const fetchWbOrders = async () => {
    try {
      // Используем переданный wbAuthInstance
      const authInstance = wbAuthInstance
      
      if (!authInstance) {
        throw new Error('Нет авторизации Wildberries')
      }

      // Проверяем сессию
      const sessionExists = await authInstance.checkSession()
      if (!sessionExists) {
        throw new Error('Нет авторизации Wildberries')
      }

      // Получаем заказы через новый API
      return await authInstance.fetchOrders()
    } catch (error) {
      console.error('Error fetching WB orders:', error)
      throw error
    }
  }

  const syncOrdersWithDatabase = async (wbOrders: any[], userId: string) => {
    try {
      // Используем анонимный ключ для Edge Function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          action: 'sync_orders',
          data: {
            wb_orders: wbOrders,
            user_id: userId
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка синхронизации заказов')
      }

      const result = await response.json()
      console.log('Синхронизация заказов:', result)
    } catch (error) {
      console.error('Error syncing orders:', error)
      // Не прерываем загрузку заказов, если синхронизация не удалась
    }
  }

  const combineOrders = async (wbOrders: any[], dbOrders: any[]) => {
    const combined: Order[] = []

    // Обрабатываем заказы из Wildberries
    for (const wbOrder of wbOrders) {
      const orderItems: OrderItem[] = []
      
      for (const rid of wbOrder.rids) {
        console.log(`🔍 Ищем товар с nm_id: ${rid.nm_id}`)
        
        // Ищем товар в нашей базе по nm_id (используем marketplace_id)
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('marketplace_id', rid.nm_id.toString())
          .eq('marketplace', 'wildberries')
          .single()

        if (productError) {
          console.log(`❌ Ошибка поиска товара ${rid.nm_id}:`, productError)
        }

        if (product) {
          console.log(`✅ Найден товар: ${product.name} (ID: ${product.id})`)
          orderItems.push({
            id: rid.uid,
            name: rid.name,
            brand: rid.brand,
            price: rid.price / 100, // Конвертируем копейки в рубли
            quantity: 1,
            image_url: product.images?.[0] || product.image_url
          })
        } else {
          console.log(`❌ Товар с nm_id ${rid.nm_id} не найден в базе`)
        }
      }

      if (orderItems.length > 0) {
        combined.push({
          id: wbOrder.id,
          order_number: wbOrder.id,
          total_amount: wbOrder.rids.reduce((sum: number, rid: any) => sum + rid.total_price, 0) / 100,
          status: getOrderStatus(wbOrder.state),
          delivery_address: 'Адрес доставки',
          delivery_method: 'Курьерская доставка',
          payment_method: wbOrder.pay_type === 1 ? 'Онлайн оплата' : 'Наличными',
          created_at: new Date(wbOrder.order_dt * 1000).toISOString(),
          items: orderItems
        })
      }
    }

    // Добавляем заказы из нашей базы
    for (const dbOrder of dbOrders) {
      const orderItems: OrderItem[] = dbOrder.order_items?.map((item: any) => ({
        id: item.id,
        name: item.products?.name || 'Товар',
        brand: item.products?.brand || '',
        price: item.price,
        quantity: item.quantity,
        image_url: item.products?.image_url
      })) || []

      // Проверяем, что заказ еще не добавлен из Wildberries
      const existingOrder = combined.find(order => order.order_number === dbOrder.order_number)
      if (!existingOrder) {
        combined.push({
          id: dbOrder.id,
          order_number: dbOrder.order_number,
          total_amount: dbOrder.total_amount,
          status: getOrderStatusFromDB(dbOrder.status),
          delivery_address: dbOrder.delivery_address,
          delivery_method: dbOrder.delivery_method,
          payment_method: dbOrder.payment_method,
          created_at: dbOrder.created_at,
          items: orderItems
        })
      }
    }

    // Сортируем по дате создания (новые сначала)
    return combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  const getOrderStatus = (state: number) => {
    switch (state) {
      case 1: return 'Ожидает оплаты'
      case 2: return 'Оплачен'
      case 3: return 'В обработке'
      case 4: return 'Отправлен'
      case 5: return 'Доставлен'
      case 6: return 'Отменен'
      default: return 'Неизвестно'
    }
  }

  const getOrderStatusFromDB = (status: string) => {
    switch (status) {
      case 'pending': return 'Ожидает оплаты'
      case 'confirmed': return 'Оплачен'
      case 'processing': return 'В обработке'
      case 'shipped': return 'Отправлен'
      case 'delivered': return 'Доставлен'
      case 'cancelled': return 'Отменен'
      default: return 'Неизвестно'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Ожидает оплаты':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      case 'Оплачен':
        return <CheckCircle className="w-5 h-5 text-blue-500" />
      case 'В обработке':
        return <Clock className="w-5 h-5 text-blue-500" />
      case 'Отправлен':
        return <Truck className="w-5 h-5 text-purple-500" />
      case 'Доставлен':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'Отменен':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return <Package className="w-5 h-5 text-gray-500" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB'
    }).format(price)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Загрузка заказов...</p>
        </div>
      </div>
    )
  }

  if (error) {
  return (
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header с кнопкой назад */}
        <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
          <div className="flex items-center space-x-3">
            {onBack && (
              <button
                onClick={onBack}
                className="text-purple-400 hover:text-purple-300 transition-colors p-2"
              >
                ← Назад
              </button>
            )}
            <h1 className="text-xl font-semibold">Мои заказы</h1>
        </div>
      </div>

        {/* Error Content */}
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-400 mb-4 text-lg font-medium">{error}</p>
            <p className="text-gray-400 text-sm mb-6 max-w-md">
              Для просмотра заказов из Wildberries необходимо авторизоваться в разделе WB
            </p>
            <div className="space-y-3">
              <button
                onClick={checkWbAuth}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Проверить авторизацию
              </button>
              {onBack && (
                <button
                  onClick={onBack}
                  className="block w-full bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors"
                >
                  Вернуться назад
                </button>
              )}
            </div>
              </div>
            </div>
              </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
            <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {onBack && (
              <button
                onClick={onBack}
                className="text-purple-400 hover:text-purple-300 transition-colors p-2"
              >
                ← Назад
              </button>
            )}
              <div>
              <h1 className="text-xl font-semibold">Мои заказы</h1>
              {wbAuthAvailable ? (
                <p className="text-xs text-green-400">Wildberries подключен</p>
              ) : (
                <p className="text-xs text-orange-400">Требуется авторизация WB</p>
              )}
            </div>
              </div>
          <button
            onClick={loadOrders}
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            Обновить
          </button>
            </div>
      </div>

      {/* Orders List */}
      <div className="p-4 space-y-4">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">У вас пока нет заказов</p>
            <p className="text-gray-500 text-sm mt-2">
              {wbAuthAvailable ? 
                'Заказы появятся здесь после оформления покупок' : 
                'Для просмотра заказов из Wildberries требуется авторизация'
              }
            </p>
            {!wbAuthInstance && (
              <button
                onClick={() => {
                  // Здесь можно добавить логику для открытия модального окна авторизации
                  alert('Для просмотра заказов из Wildberries необходимо авторизоваться. Перейдите в раздел WB в нижнем меню.')
                }}
                className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Авторизоваться в WB
              </button>
            )}
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              {/* Order Header */}
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(order.status)}
                    <span className="font-medium">{order.status}</span>
                  </div>
                  <span className="text-sm text-gray-400">#{order.order_number}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">
                    {formatDate(order.created_at)}
                  </span>
                  <span className="font-semibold text-lg">
                      {formatPrice(order.total_amount)}
                  </span>
                  </div>
                </div>

              {/* Order Items */}
              <div className="p-4">
                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-cover bg-gray-700"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.brand}</p>
                        </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatPrice(item.price)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {item.quantity} шт.
                        </p>
                      </div>
                      </div>
                    ))}
                </div>
                        </div>

              {/* Order Footer */}
              <div className="px-4 py-3 bg-gray-750 border-t border-gray-700">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Способ доставки</p>
                    <p className="font-medium">{order.delivery_method}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Способ оплаты</p>
                    <p className="font-medium">{order.payment_method}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default OrdersPage