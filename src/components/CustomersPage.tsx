import React, { useState, useEffect } from 'react'
import { 
  Users, 
  Search, 
  Filter,
  Eye,
  MessageSquare,
  Phone,
  Calendar,
  ShoppingCart,
  MapPin,
  User,
  Mail,
  Star,
  TrendingUp,
  Copy,
  Activity,
  CreditCard,
  UserCheck
} from 'lucide-react'
import { supabase, auth } from '@/lib/supabase'
import { formatPrice, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Customer {
  id: string
  telegram_id: string
  telegram_username: string
  first_name: string
  last_name: string
  phone: string
  address: string
  created_at: string
  orders_count: number
  total_spent: number
  last_order_date: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'orders' | 'spent' | 'date'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({})
  const [profileModal, setProfileModal] = useState<Customer | null>(null)
  const [ordersModal, setOrdersModal] = useState<{ customer: Customer; orders: any[] } | null>(null)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [selectedSegment, setSelectedSegment] = useState('all')

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    try {
      const user = await auth.getCurrentUser()
      if (!user) return

      // Получаем магазины пользователя
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id')
        .eq('status', 'active')

      if (storesError) throw storesError

      const storeIds = stores?.map(s => s.id) || []
      if (storeIds.length === 0) {
        setCustomers([])
        return
      }

      // Получаем клиентов с их статистикой заказов
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select(`
          *,
          orders (
            id,
            total_amount,
            created_at,
            store_id
          )
        `)

      if (customersError) throw customersError

      // Обрабатываем данные для получения статистики
      const processedCustomers = customersData?.reduce((acc: Customer[], customer: any) => {
        const existingCustomer = acc.find(c => c.id === customer.id)
        
        // Фильтруем заказы только из нужных магазинов
        const validOrders = customer.orders?.filter((order: any) => 
          storeIds.includes(order.store_id)
        ) || []
        
        if (existingCustomer) {
          // Добавляем статистику от новых заказов
          validOrders.forEach((order: any) => {
            existingCustomer.orders_count += 1
            existingCustomer.total_spent += Number(order.total_amount)
            if (new Date(order.created_at) > new Date(existingCustomer.last_order_date || 0)) {
              existingCustomer.last_order_date = order.created_at
            }
          })
        } else {
          // Создаем нового клиента
          const totalSpent = validOrders.reduce((sum: number, order: any) => 
            sum + Number(order.total_amount), 0
          )
          const lastOrderDate = validOrders.length > 0 
            ? validOrders.reduce((latest: string, order: any) => 
                new Date(order.created_at) > new Date(latest) ? order.created_at : latest
              , validOrders[0].created_at)
            : null
          
          acc.push({
            id: customer.id,
            telegram_id: customer.telegram_id,
            telegram_username: customer.telegram_username,
            first_name: customer.first_name,
            last_name: customer.last_name,
            phone: customer.phone,
            address: customer.address,
            created_at: customer.created_at,
            orders_count: validOrders.length,
            total_spent: totalSpent,
            last_order_date: lastOrderDate
          })
        }
        
        return acc
      }, []) || []

      setCustomers(processedCustomers)
    } catch (error) {
      console.error('Error loading customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCustomerSegment = (customer: Customer) => {
    const totalSpent = customer.total_spent || 0
    if (totalSpent >= 10000) {
      return 'vip'
    } else if (totalSpent >= 5000) {
      return 'regular'
    } else if (customer.orders_count >= 3) {
      return 'active'
    } else {
      return 'new'
    }
  }

  const filteredCustomers = customers.filter(customer => {
    const fullName = `${customer.first_name || 'Пользователь'} ${customer.last_name || ''}`.toLowerCase()
    const username = customer.telegram_username?.toLowerCase() || ''
    const phone = customer.phone?.toLowerCase() || ''
    
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) ||
           username.includes(searchQuery.toLowerCase()) ||
           phone.includes(searchQuery.toLowerCase())
    
    const matchesSegment = selectedSegment === 'all' || getCustomerSegment(customer) === selectedSegment
    
    return matchesSearch && matchesSegment
  })

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    let aValue: any, bValue: any
    
    switch (sortBy) {
      case 'name':
        aValue = `${a.first_name || 'Пользователь'} ${a.last_name || ''}`.toLowerCase()
        bValue = `${b.first_name || 'Пользователь'} ${b.last_name || ''}`.toLowerCase()
        break
      case 'orders':
        aValue = a.orders_count
        bValue = b.orders_count
        break
      case 'spent':
        aValue = a.total_spent
        bValue = b.total_spent
        break
      case 'date':
        aValue = new Date(a.last_order_date || 0)
        bValue = new Date(b.last_order_date || 0)
        break
      default:
        return 0
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  const getCustomerStats = () => {
    const total = customers.length
    const totalSpent = customers.reduce((sum, customer) => sum + (customer.total_spent || 0), 0)
    const totalOrders = customers.reduce((sum, c) => sum + c.orders_count, 0)
    const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0
    const activeCustomers = customers.filter(c => {
      if (!c.last_order_date) return false
      return new Date(c.last_order_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }).length
    
    return { total, totalSpent, avgOrderValue, activeCustomers }
  }

  const stats = getCustomerStats()

  const loadCustomerOrders = async (customer: Customer) => {
    setOrdersLoading(true)
    try {
      const { data: orders, error: ordersErr } = await supabase
        .from('orders')
        .select('id, created_at, order_number, status, total_amount')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
      
      if (ordersErr) { 
        setOrdersModal({ customer, orders: [] })
        return 
      }
      
      const list = orders || []
      if (list.length === 0) { 
        setOrdersModal({ customer, orders: [] })
        return 
      }
      
      const ids = list.map((o: any) => o.id)
      const { data: items } = await supabase
        .from('order_items')
        .select('order_id, product_id, quantity, price, product_name_cache, marketplace_id')
        .in('order_id', ids)

      const itemsByOrder: Record<string, any[]> = {}
      ;(items || []).forEach((it: any) => {
        if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = []
        itemsByOrder[it.order_id].push(it)
      })
      
      const withItems = list.map((o: any) => ({ 
        ...o, 
        order_items: itemsByOrder[o.id] || [] 
      }))
      
      setOrdersModal({ customer, orders: withItems })
    } finally {
      setOrdersLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
        <div className="stat">
          <div className="stat-figure text-primary">
            <Users className="h-8 w-8" />
          </div>
          <div className="stat-title">Всего клиентов</div>
          <div className="stat-value text-primary">{stats.total}</div>
          <div className="stat-desc">База клиентов</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-success">
            <Activity className="h-8 w-8" />
          </div>
          <div className="stat-title">Активные</div>
          <div className="stat-value text-success">{stats.activeCustomers}</div>
          <div className="stat-desc">За последние 30 дней</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-warning">
            <CreditCard className="h-8 w-8" />
          </div>
          <div className="stat-title">Общая выручка</div>
          <div className="stat-value text-warning">
            {formatPrice(stats.totalSpent).split(' ')[0]}
          </div>
          <div className="stat-desc">₽ всего потрачено</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-info">
            <Star className="h-8 w-8" />
          </div>
          <div className="stat-title">Средний чек</div>
          <div className="stat-value text-info">
            {formatPrice(stats.avgOrderValue).split(' ')[0]}
          </div>
          <div className="stat-desc">₽ за заказ</div>
        </div>
      </div>

      {/* Заголовок и действия */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">База клиентов</h2>
          <p className="text-base-content/60">Управление клиентами и сегментация</p>
        </div>
      </div>

      {/* Вкладки сегментов */}
      <div className="tabs tabs-boxed">
        <a 
          className={cn("tab", selectedSegment === 'all' && "tab-active")}
          onClick={() => setSelectedSegment('all')}
        >
          Все ({customers.length})
        </a>
        <a 
          className={cn("tab", selectedSegment === 'vip' && "tab-active")}
          onClick={() => setSelectedSegment('vip')}
        >
          VIP ({customers.filter(c => getCustomerSegment(c) === 'vip').length})
        </a>
        <a 
          className={cn("tab", selectedSegment === 'regular' && "tab-active")}
          onClick={() => setSelectedSegment('regular')}
        >
          Постоянные ({customers.filter(c => getCustomerSegment(c) === 'regular').length})
        </a>
        <a 
          className={cn("tab", selectedSegment === 'active' && "tab-active")}
          onClick={() => setSelectedSegment('active')}
        >
          Активные ({customers.filter(c => getCustomerSegment(c) === 'active').length})
        </a>
        <a 
          className={cn("tab", selectedSegment === 'new' && "tab-active")}
          onClick={() => setSelectedSegment('new')}
        >
          Новые ({customers.filter(c => getCustomerSegment(c) === 'new').length})
        </a>
      </div>

      {/* Фильтры и поиск */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="form-control">
              <div className="input-group">
                <input 
                  type="text" 
                  placeholder="Поиск клиентов..." 
                  className="input input-bordered w-full" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button className="btn btn-square">
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </div>
            <select 
              className="select select-bordered w-full"
              value={`${sortBy}-${sortOrder}`} 
              onChange={(e) => { 
                const [field, order] = e.target.value.split('-')
                setSortBy(field as any)
                setSortOrder(order as any) 
              }}
            >
              <option value="date-desc">Последний заказ (новые)</option>
              <option value="date-asc">Последний заказ (старые)</option>
              <option value="name-asc">По имени А-Я</option>
              <option value="name-desc">По имени Я-А</option>
              <option value="orders-desc">Больше заказов</option>
              <option value="orders-asc">Меньше заказов</option>
              <option value="spent-desc">Больше потратили</option>
              <option value="spent-asc">Меньше потратили</option>
            </select>
            <div className="text-sm opacity-60 flex items-center">
              Найдено: <span className="font-semibold ml-1">{sortedCustomers.length}</span> клиентов
            </div>
          </div>
        </div>
      </div>

      {/* Список клиентов */}
      <div className="space-y-4">
        {sortedCustomers.length > 0 ? (
          sortedCustomers.map((customer) => {
            const segment = getCustomerSegment(customer)
            
            return (
              <div key={customer.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
                <div className="card-body">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="avatar placeholder">
                        <div className="bg-primary text-primary-content rounded-full w-12">
                          <span className="text-xl">
                            {(customer.first_name?.[0] || 'U').toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="card-title text-lg">
                            {customer.first_name || 'Пользователь'} {customer.last_name || ''}
                          </h3>
                          
                          {segment === 'vip' && (
                            <span className="badge badge-primary">VIP</span>
                          )}
                          {segment === 'regular' && (
                            <span className="badge badge-info">Постоянный</span>
                          )}
                          {segment === 'active' && (
                            <span className="badge badge-success">Активный</span>
                          )}
                          {segment === 'new' && (
                            <span className="badge badge-ghost">Новый</span>
                          )}
                          
                          {customer.last_order_date ? (
                            <span className="badge badge-success badge-sm">Был(а) недавно</span>
                          ) : (
                            <span className="badge badge-error badge-sm">Нет заказов</span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm opacity-70 mb-3">
                          {customer.telegram_username && (
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4" />
                              @{customer.telegram_username}
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {customer.phone}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {customer.last_order_date ? formatDate(customer.last_order_date) : 'Нет заказов'}
                          </div>
                        </div>
                        
                        {customer.address && (
                          <div className="flex items-center gap-2 text-sm opacity-70">
                            <MapPin className="h-4 w-4" />
                            {customer.address}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold">{formatPrice(customer.total_spent || 0)}</div>
                      <div className="text-sm opacity-60">{customer.orders_count} заказ(ов)</div>
                      <div className="text-sm opacity-60">
                        Средний: {formatPrice((customer.total_spent || 0) / Math.max(customer.orders_count, 1))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="divider my-2"></div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm opacity-60">
                      <span>ID: {customer.telegram_id}</span>
                      <button
                        className="btn btn-ghost btn-xs btn-circle"
                        onClick={() => navigator.clipboard?.writeText(customer.telegram_id)}
                        title="Копировать ID"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                    
                    <div className="card-actions">
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => setProfileModal(customer)}
                      >
                        <Eye className="h-4 w-4" />
                        Профиль
                      </button>
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => loadCustomerOrders(customer)}
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Заказы
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body items-center text-center py-12">
              {customers.length === 0 ? (
                <>
                  <Users className="h-16 w-16 text-base-content/30 mb-4" />
                  <h3 className="text-xl font-bold mb-2">Нет клиентов</h3>
                  <p className="text-base-content/60">
                    Клиенты появятся после первых заказов в ваших магазинах
                  </p>
                </>
              ) : (
                <>
                  <Search className="h-16 w-16 text-base-content/30 mb-4" />
                  <h3 className="text-xl font-bold mb-2">Клиенты не найдены</h3>
                  <p className="text-base-content/60">
                    Попробуйте изменить параметры поиска или фильтры
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Модальное окно профиля */}
      {profileModal && (
        <>
          <input type="checkbox" id="profile-modal" className="modal-toggle" checked={!!profileModal} onChange={() => {}} />
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">Профиль клиента</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="avatar placeholder">
                    <div className="bg-primary text-primary-content rounded-full w-16">
                      <span className="text-2xl">
                        {(profileModal.first_name?.[0] || 'U').toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-lg">
                      {profileModal.first_name || 'Пользователь'} {profileModal.last_name || ''}
                    </div>
                    <div className="text-sm opacity-60">
                      Клиент с {formatDate(new Date(profileModal.created_at))}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {profileModal.telegram_username && (
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      @{profileModal.telegram_username}
                    </div>
                  )}
                  {profileModal.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {profileModal.phone}
                    </div>
                  )}
                  {profileModal.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {profileModal.address}
                    </div>
                  )}
                </div>
                
                <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
                  <div className="stat">
                    <div className="stat-title">Заказов</div>
                    <div className="stat-value text-primary">{profileModal.orders_count}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">Потрачено</div>
                    <div className="stat-value text-success text-xl">
                      {formatPrice(profileModal.total_spent || 0)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="modal-action">
                <button className="btn" onClick={() => setProfileModal(null)}>Закрыть</button>
              </div>
            </div>
            <div className="modal-backdrop" onClick={() => setProfileModal(null)}></div>
          </div>
        </>
      )}

      {/* Модальное окно заказов */}
      {ordersModal && (
        <>
          <input type="checkbox" id="orders-modal" className="modal-toggle" checked={!!ordersModal} onChange={() => {}} />
          <div className="modal modal-open">
            <div className="modal-box max-w-4xl">
              <h3 className="font-bold text-lg mb-2">История заказов</h3>
              <p className="text-sm opacity-60 mb-4">
                {ordersModal.customer.first_name || 'Пользователь'} {ordersModal.customer.last_name || ''}
              </p>
              
              {ordersLoading ? (
                <div className="flex justify-center py-8">
                  <span className="loading loading-spinner loading-lg"></span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>Дата</th>
                        <th>Номер</th>
                        <th>Статус</th>
                        <th>Товары</th>
                        <th>Сумма</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersModal.orders.length > 0 ? (
                        ordersModal.orders.map((order: any) => (
                          <React.Fragment key={order.id}>
                            <tr>
                              <td>{formatDate(order.created_at)}</td>
                              <td className="font-mono">{order.order_number || order.id.slice(0, 8)}</td>
                              <td>
                                <span className="badge badge-sm badge-primary">
                                  {order.status || 'Новый'}
                                </span>
                              </td>
                              <td>
                                <div className="flex flex-wrap gap-1">
                                  {order.order_items.slice(0, 3).map((item: any, idx: number) => (
                                    <span key={idx} className="badge badge-ghost badge-sm">
                                      {item.product_name_cache || `Товар`} ×{item.quantity}
                                    </span>
                                  ))}
                                  {order.order_items.length > 3 && (
                                    <span className="badge badge-ghost badge-sm">
                                      +{order.order_items.length - 3}
                                    </span>
                                  )}
                                </div>
                                {order.order_items.length > 0 && (
                                  <button 
                                    className="btn btn-ghost btn-xs mt-1"
                                    onClick={() => setExpandedOrders(prev => ({
                                      ...prev,
                                      [order.id]: !prev[order.id]
                                    }))}
                                  >
                                    {expandedOrders[order.id] ? 'Скрыть' : 'Подробнее'}
                                  </button>
                                )}
                              </td>
                              <td className="font-semibold">
                                {formatPrice(order.total_amount || 0)}
                              </td>
                            </tr>
                            {expandedOrders[order.id] && (
                              <tr>
                                <td colSpan={5} className="bg-base-200 p-4">
                                  <div className="space-y-2">
                                    {order.order_items.map((item: any, idx: number) => (
                                      <div key={idx} className="flex items-center justify-between">
                                        <div>
                                          <div className="font-medium">
                                            {item.product_name_cache || 'Товар'}
                                          </div>
                                          {item.marketplace_id && (
                                            <a 
                                              href={`https://www.wildberries.ru/catalog/${item.marketplace_id}/detail.aspx`}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="link link-primary text-xs"
                                            >
                                              WB: {item.marketplace_id}
                                            </a>
                                          )}
                                        </div>
                                        <div className="text-right">
                                          <div className="text-sm opacity-60">
                                            {item.quantity} шт
                                          </div>
                                          <div className="font-medium">
                                            {formatPrice(item.price || 0)}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="text-center py-8 opacity-60">
                            Заказы отсутствуют
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              
              <div className="modal-action">
                <button className="btn" onClick={() => setOrdersModal(null)}>Закрыть</button>
              </div>
            </div>
            <div className="modal-backdrop" onClick={() => setOrdersModal(null)}></div>
          </div>
        </>
      )}
    </div>
  )
}