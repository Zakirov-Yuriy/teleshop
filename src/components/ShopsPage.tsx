import React, { useEffect, useState, useMemo } from 'react'
import { 
  Store, 
  MapPin, 
  Phone, 
  Clock,
  Users,
  Package,
  TrendingUp,
  DollarSign,
  Settings,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  Download,
  RefreshCcw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Star,
  BarChart3,
  Calendar,
  Globe,
  Mail
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Shop = {
  id: string
  name: string
  address: string
  phone: string
  email: string
  workingHours: string
  status: 'active' | 'inactive' | 'maintenance'
  manager: string
  employees: number
  revenue: number
  orders: number
  rating: number
  created_at: string
  lastSync: string
  coordinates?: {
    lat: number
    lng: number
  }
  metrics?: {
    todayRevenue: number
    todayOrders: number
    avgCheck: number
    conversionRate: number
  }
}

export default function ShopsPage() {
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'maintenance'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'revenue' | 'orders' | 'rating'>('revenue')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    loadShops()
  }, [])

  const loadShops = async () => {
    setLoading(true)
    try {
      // Заглушка с демо данными
      const mockShops: Shop[] = [
        {
          id: '1',
          name: 'Магазин на Тверской',
          address: 'г. Москва, ул. Тверская, д. 15',
          phone: '+7 495 123-45-67',
          email: 'tverskaya@shop.ru',
          workingHours: '09:00 - 22:00',
          status: 'active',
          manager: 'Иванов И.И.',
          employees: 12,
          revenue: 3456780,
          orders: 234,
          rating: 4.8,
          created_at: '2024-01-15T10:00:00',
          lastSync: '2024-12-26T14:30:00',
          coordinates: { lat: 55.7558, lng: 37.6173 },
          metrics: {
            todayRevenue: 145600,
            todayOrders: 18,
            avgCheck: 8089,
            conversionRate: 4.2
          }
        },
        {
          id: '2',
          name: 'Магазин в ТЦ Европейский',
          address: 'г. Москва, пл. Киевского вокзала, д. 2',
          phone: '+7 495 987-65-43',
          email: 'evropeyskiy@shop.ru',
          workingHours: '10:00 - 22:00',
          status: 'active',
          manager: 'Петрова А.С.',
          employees: 8,
          revenue: 2890500,
          orders: 189,
          rating: 4.6,
          created_at: '2024-02-20T10:00:00',
          lastSync: '2024-12-26T14:25:00',
          metrics: {
            todayRevenue: 98700,
            todayOrders: 12,
            avgCheck: 8225,
            conversionRate: 3.8
          }
        },
        {
          id: '3',
          name: 'Магазин на Арбате',
          address: 'г. Москва, ул. Арбат, д. 45',
          phone: '+7 495 555-44-33',
          email: 'arbat@shop.ru',
          workingHours: '09:00 - 21:00',
          status: 'maintenance',
          manager: 'Сидоров К.В.',
          employees: 6,
          revenue: 1234560,
          orders: 98,
          rating: 4.3,
          created_at: '2024-03-10T10:00:00',
          lastSync: '2024-12-26T12:00:00',
          metrics: {
            todayRevenue: 0,
            todayOrders: 0,
            avgCheck: 0,
            conversionRate: 0
          }
        },
        {
          id: '4',
          name: 'Интернет-магазин',
          address: 'Онлайн',
          phone: '+7 800 123-45-67',
          email: 'online@shop.ru',
          workingHours: '24/7',
          status: 'active',
          manager: 'Козлова Е.П.',
          employees: 15,
          revenue: 8765400,
          orders: 567,
          rating: 4.9,
          created_at: '2024-01-01T10:00:00',
          lastSync: '2024-12-26T14:35:00',
          metrics: {
            todayRevenue: 456700,
            todayOrders: 45,
            avgCheck: 10149,
            conversionRate: 5.6
          }
        },
        {
          id: '5',
          name: 'Пункт выдачи Северный',
          address: 'г. Москва, ул. Северная, д. 10',
          phone: '+7 495 111-22-33',
          email: 'north@shop.ru',
          workingHours: '10:00 - 20:00',
          status: 'inactive',
          manager: 'Новиков Д.А.',
          employees: 3,
          revenue: 456780,
          orders: 67,
          rating: 4.1,
          created_at: '2024-04-05T10:00:00',
          lastSync: '2024-12-25T18:00:00'
        }
      ]
      
      setShops(mockShops)
    } catch (e) {
      console.error('Failed to load shops', e)
    } finally {
      setLoading(false)
    }
  }

  const filteredShops = useMemo(() => {
    let result = shops

    // Фильтр по статусу
    if (statusFilter !== 'all') {
      result = result.filter(shop => shop.status === statusFilter)
    }

    // Поиск
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(shop =>
        shop.name.toLowerCase().includes(query) ||
        shop.address.toLowerCase().includes(query) ||
        shop.manager.toLowerCase().includes(query)
      )
    }

    // Сортировка
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'revenue':
          return b.revenue - a.revenue
        case 'orders':
          return b.orders - a.orders
        case 'rating':
          return b.rating - a.rating
        default:
          return 0
      }
    })

    return result
  }, [shops, statusFilter, searchQuery, sortBy])

  const stats = useMemo(() => {
    const activeShops = shops.filter(s => s.status === 'active')
    const totalRevenue = activeShops.reduce((sum, s) => sum + s.revenue, 0)
    const totalOrders = activeShops.reduce((sum, s) => sum + s.orders, 0)
    const avgRating = activeShops.length > 0 
      ? activeShops.reduce((sum, s) => sum + s.rating, 0) / activeShops.length 
      : 0
    const totalEmployees = shops.reduce((sum, s) => sum + s.employees, 0)
    
    return {
      totalShops: shops.length,
      activeShops: activeShops.length,
      totalRevenue,
      totalOrders,
      avgRating,
      totalEmployees
    }
  }, [shops])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(value)
  }

  const getStatusBadge = (status: Shop['status']) => {
    switch (status) {
      case 'active':
        return (
          <div className="badge badge-success gap-1">
            <CheckCircle className="h-3 w-3" />
            Активен
          </div>
        )
      case 'inactive':
        return (
          <div className="badge badge-error gap-1">
            <XCircle className="h-3 w-3" />
            Неактивен
          </div>
        )
      case 'maintenance':
        return (
          <div className="badge badge-warning gap-1">
            <AlertTriangle className="h-3 w-3" />
            Обслуживание
          </div>
        )
    }
  }

  const handleEditShop = (shop: Shop) => {
    setSelectedShop(shop)
    setShowEditModal(true)
  }

  const handleDeleteShop = async (shopId: string) => {
    if (confirm('Вы уверены, что хотите удалить этот магазин?')) {
      setShops(shops.filter(s => s.id !== shopId))
    }
  }

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
        <div className="stat">
          <div className="stat-figure text-primary">
            <Store className="h-8 w-8" />
          </div>
          <div className="stat-title">Всего магазинов</div>
          <div className="stat-value text-primary">{stats.totalShops}</div>
          <div className="stat-desc">{stats.activeShops} активных</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-secondary">
            <DollarSign className="h-8 w-8" />
          </div>
          <div className="stat-title">Общая выручка</div>
          <div className="stat-value text-secondary text-2xl">
            {formatCurrency(stats.totalRevenue)}
          </div>
          <div className="stat-desc">За текущий месяц</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-success">
            <Package className="h-8 w-8" />
          </div>
          <div className="stat-title">Всего заказов</div>
          <div className="stat-value text-success">{stats.totalOrders}</div>
          <div className="stat-desc">За сегодня</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-warning">
            <Star className="h-8 w-8" />
          </div>
          <div className="stat-title">Средний рейтинг</div>
          <div className="stat-value text-warning">{stats.avgRating.toFixed(1)}</div>
          <div className="stat-desc">По всем магазинам</div>
        </div>
      </div>

      {/* Заголовок и действия */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Store className="h-7 w-7 text-primary" />
            Магазины
          </h2>
          <p className="text-base-content/60">Управление точками продаж</p>
        </div>
        <div className="flex gap-2">
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="h-4 w-4" />
            Добавить магазин
          </button>
          <button className="btn btn-ghost btn-sm" onClick={loadShops}>
            <RefreshCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Фильтры и поиск */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="form-control">
                <div className="input-group">
                  <span>
                    <Search className="h-5 w-5" />
                  </span>
                  <input 
                    type="text" 
                    placeholder="Поиск по названию, адресу или менеджеру..." 
                    className="input input-bordered w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <select 
                className="select select-bordered"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              >
                <option value="all">Все статусы</option>
                <option value="active">Активные</option>
                <option value="inactive">Неактивные</option>
                <option value="maintenance">На обслуживании</option>
              </select>
              
              <select 
                className="select select-bordered"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              >
                <option value="revenue">По выручке</option>
                <option value="orders">По заказам</option>
                <option value="rating">По рейтингу</option>
                <option value="name">По названию</option>
              </select>

              <div className="btn-group">
                <button 
                  className={cn("btn btn-sm", viewMode === 'grid' && "btn-active")}
                  onClick={() => setViewMode('grid')}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <rect x="3" y="3" width="7" height="7" strokeWidth="2"/>
                    <rect x="14" y="3" width="7" height="7" strokeWidth="2"/>
                    <rect x="3" y="14" width="7" height="7" strokeWidth="2"/>
                    <rect x="14" y="14" width="7" height="7" strokeWidth="2"/>
                  </svg>
                </button>
                <button 
                  className={cn("btn btn-sm", viewMode === 'list' && "btn-active")}
                  onClick={() => setViewMode('list')}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <line x1="3" y1="6" x2="21" y2="6" strokeWidth="2"/>
                    <line x1="3" y1="12" x2="21" y2="12" strokeWidth="2"/>
                    <line x1="3" y1="18" x2="21" y2="18" strokeWidth="2"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Список магазинов */}
      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : filteredShops.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <Store className="h-16 w-16 mx-auto text-base-content/30 mb-4" />
            <h3 className="text-xl font-bold mb-2">Магазины не найдены</h3>
            <p className="text-base-content/60">
              Попробуйте изменить параметры поиска
            </p>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredShops.map(shop => (
            <div key={shop.id} className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="card-title text-lg">{shop.name}</h3>
                  {getStatusBadge(shop.status)}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-base-content/80">
                    <MapPin className="h-4 w-4 text-base-content/60" />
                    <span className="line-clamp-1">{shop.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-base-content/80">
                    <Phone className="h-4 w-4 text-base-content/60" />
                    <span>{shop.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-base-content/80">
                    <Clock className="h-4 w-4 text-base-content/60" />
                    <span>{shop.workingHours}</span>
                  </div>
                  <div className="flex items-center gap-2 text-base-content/80">
                    <Users className="h-4 w-4 text-base-content/60" />
                    <span>{shop.manager} ({shop.employees} сотр.)</span>
                  </div>
                </div>

                <div className="divider my-2"></div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-base-content/60">Выручка</p>
                    <p className="font-bold">{formatCurrency(shop.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-base-content/60">Заказов</p>
                    <p className="font-bold">{shop.orders}</p>
                  </div>
                  <div>
                    <p className="text-xs text-base-content/60">Рейтинг</p>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-warning fill-warning" />
                      <span className="font-bold">{shop.rating}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-base-content/60">Синхронизация</p>
                    <p className="text-sm">
                      {new Date(shop.lastSync).toLocaleTimeString('ru-RU', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>

                {shop.metrics && shop.status === 'active' && (
                  <>
                    <div className="divider my-2"></div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="badge badge-ghost">
                        Сегодня: {formatCurrency(shop.metrics.todayRevenue)}
                      </div>
                      <div className="badge badge-ghost">
                        {shop.metrics.todayOrders} заказов
                      </div>
                    </div>
                  </>
                )}

                <div className="card-actions justify-end mt-4">
                  <button 
                    className="btn btn-sm btn-ghost"
                    onClick={() => handleEditShop(shop)}
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button 
                    className="btn btn-sm btn-ghost text-error"
                    onClick={() => handleDeleteShop(shop.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Название</th>
                    <th>Адрес</th>
                    <th>Статус</th>
                    <th>Менеджер</th>
                    <th>Выручка</th>
                    <th>Заказы</th>
                    <th>Рейтинг</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShops.map(shop => (
                    <tr key={shop.id}>
                      <td className="font-medium">{shop.name}</td>
                      <td>{shop.address}</td>
                      <td>{getStatusBadge(shop.status)}</td>
                      <td>{shop.manager}</td>
                      <td className="font-bold">{formatCurrency(shop.revenue)}</td>
                      <td>{shop.orders}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-warning fill-warning" />
                          <span>{shop.rating}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button 
                            className="btn btn-xs btn-ghost"
                            onClick={() => handleEditShop(shop)}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button 
                            className="btn btn-xs btn-ghost text-error"
                            onClick={() => handleDeleteShop(shop.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}