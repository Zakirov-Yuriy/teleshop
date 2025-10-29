import React, { useEffect, useState, useMemo } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  ShoppingCart, 
  DollarSign,
  Package,
  Activity,
  Calendar,
  RefreshCcw,
  BarChart3,
  Eye,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap,
  Award,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dashboard-stats`

type DashboardStats = {
  revenue: {
    total: number
    change: number
    period: string
  }
  orders: {
    total: number
    pending: number
    completed: number
    change: number
  }
  customers: {
    total: number
    new: number
    active: number
    change: number
  }
  products: {
    total: number
    views: number
    sold: number
    topSelling: Array<{
      id: string
      name: string
      sales: number
      revenue: number
    }>
  }
  conversion: {
    rate: number
    cartAbandonment: number
    avgOrderValue: number
  }
  activity: {
    hourly: Array<{
      hour: string
      visitors: number
      orders: number
    }>
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | '90d'>('7d')
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    loadDashboard()
    const interval = setInterval(loadDashboard, 60000) // Обновление каждую минуту
    return () => clearInterval(interval)
  }, [period])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      // Заглушка для демо данных
      const mockStats: DashboardStats = {
        revenue: {
          total: 2456780,
          change: 12.5,
          period: period
        },
        orders: {
          total: 342,
          pending: 23,
          completed: 319,
          change: 8.3
        },
        customers: {
          total: 1284,
          new: 94,
          active: 428,
          change: 15.2
        },
        products: {
          total: 156,
          views: 8456,
          sold: 892,
          topSelling: [
            { id: '1', name: 'Смартфон Samsung Galaxy S23', sales: 45, revenue: 2250000 },
            { id: '2', name: 'Наушники Apple AirPods Pro', sales: 67, revenue: 1005000 },
            { id: '3', name: 'Умные часы Xiaomi Band 8', sales: 123, revenue: 492000 },
            { id: '4', name: 'Powerbank Xiaomi 20000mAh', sales: 89, revenue: 267000 },
            { id: '5', name: 'Чехол для iPhone 15 Pro', sales: 234, revenue: 234000 }
          ]
        },
        conversion: {
          rate: 3.8,
          cartAbandonment: 68.5,
          avgOrderValue: 7180
        },
        activity: {
          hourly: [
            { hour: '00:00', visitors: 45, orders: 2 },
            { hour: '03:00', visitors: 23, orders: 1 },
            { hour: '06:00', visitors: 67, orders: 4 },
            { hour: '09:00', visitors: 234, orders: 12 },
            { hour: '12:00', visitors: 456, orders: 23 },
            { hour: '15:00', visitors: 389, orders: 18 },
            { hour: '18:00', visitors: 512, orders: 28 },
            { hour: '21:00', visitors: 267, orders: 14 }
          ]
        }
      }
      
      setStats(mockStats)
      setLastUpdate(new Date())
    } catch (e) {
      console.error('Failed to load dashboard', e)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('ru-RU').format(value)
  }

  const formatPercent = (value: number, showSign = true) => {
    const sign = showSign && value > 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  const periodLabel = {
    'today': 'Сегодня',
    '7d': '7 дней',
    '30d': '30 дней',
    '90d': '90 дней'
  }

  if (!stats && loading) {
    return (
      <div className="flex justify-center items-center min-h-[600px]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок с периодом */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            Обзор
          </h2>
          <p className="text-base-content/60">
            Последнее обновление: {lastUpdate.toLocaleTimeString('ru-RU')}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {Object.entries(periodLabel).map(([key, label]) => (
            <button
              key={key}
              className={cn(
                "btn btn-sm",
                period === key ? "btn-primary" : "btn-outline"
              )}
              onClick={() => setPeriod(key as typeof period)}
            >
              {label}
            </button>
          ))}
          <button 
            className="btn btn-sm btn-ghost"
            onClick={loadDashboard}
            disabled={loading}
          >
            <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Основные метрики */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-base-content/60 text-sm">Выручка</p>
                <h3 className="text-2xl font-bold mt-1">
                  {stats ? formatCurrency(stats.revenue.total) : '—'}
                </h3>
                <div className="flex items-center gap-1 mt-2">
                  {stats && stats.revenue.change > 0 ? (
                    <>
                      <ArrowUpRight className="h-4 w-4 text-success" />
                      <span className="text-sm text-success font-medium">
                        {formatPercent(stats.revenue.change)}
                      </span>
                    </>
                  ) : stats && stats.revenue.change < 0 ? (
                    <>
                      <ArrowDownRight className="h-4 w-4 text-error" />
                      <span className="text-sm text-error font-medium">
                        {formatPercent(stats.revenue.change)}
                      </span>
                    </>
                  ) : null}
                  <span className="text-sm text-base-content/60">vs прошлый период</span>
                </div>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-base-content/60 text-sm">Заказы</p>
                <h3 className="text-2xl font-bold mt-1">
                  {stats ? formatNumber(stats.orders.total) : '—'}
                </h3>
                <div className="flex items-center gap-1 mt-2">
                  {stats && stats.orders.change > 0 ? (
                    <>
                      <ArrowUpRight className="h-4 w-4 text-success" />
                      <span className="text-sm text-success font-medium">
                        {formatPercent(stats.orders.change)}
                      </span>
                    </>
                  ) : stats && stats.orders.change < 0 ? (
                    <>
                      <ArrowDownRight className="h-4 w-4 text-error" />
                      <span className="text-sm text-error font-medium">
                        {formatPercent(stats.orders.change)}
                      </span>
                    </>
                  ) : null}
                  <span className="text-sm text-base-content/60">
                    {stats?.orders.pending} в обработке
                  </span>
                </div>
              </div>
              <div className="p-3 bg-success/10 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-success" />
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-base-content/60 text-sm">Клиенты</p>
                <h3 className="text-2xl font-bold mt-1">
                  {stats ? formatNumber(stats.customers.total) : '—'}
                </h3>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-sm text-info font-medium">
                    +{stats?.customers.new || 0}
                  </span>
                  <span className="text-sm text-base-content/60">
                    новых, {stats?.customers.active || 0} активных
                  </span>
                </div>
              </div>
              <div className="p-3 bg-info/10 rounded-lg">
                <Users className="h-6 w-6 text-info" />
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-base-content/60 text-sm">Конверсия</p>
                <h3 className="text-2xl font-bold mt-1">
                  {stats ? `${stats.conversion.rate}%` : '—'}
                </h3>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-sm text-base-content/60">
                    Ср. чек: {stats ? formatCurrency(stats.conversion.avgOrderValue) : '—'}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-warning/10 rounded-lg">
                <Target className="h-6 w-6 text-warning" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Графики и детальная информация */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* График активности */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Активность по часам
            </h3>
            
            <div className="mt-4 space-y-3">
              {stats?.activity.hourly.map(item => (
                <div key={item.hour} className="flex items-center gap-4">
                  <span className="text-sm text-base-content/60 w-12">
                    {item.hour}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-base-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ 
                            width: `${(item.visitors / Math.max(...(stats?.activity.hourly.map(h => h.visitors) || [1]))) * 100}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {item.visitors}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-base-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-success rounded-full"
                          style={{ 
                            width: `${(item.orders / Math.max(...(stats?.activity.hourly.map(h => h.orders) || [1]))) * 100}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right text-success">
                        {item.orders}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span className="text-base-content/60">Посетители</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-success rounded-full"></div>
                <span className="text-base-content/60">Заказы</span>
              </div>
            </div>
          </div>
        </div>

        {/* Топ товары */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Топ товары
            </h3>
            
            <div className="space-y-3 mt-4">
              {stats?.products.topSelling.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-base-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                      index === 0 ? "bg-warning text-warning-content" : 
                      index === 1 ? "bg-base-300" :
                      index === 2 ? "bg-orange-200 text-orange-800" :
                      "bg-base-200"
                    )}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium line-clamp-1">{product.name}</p>
                      <p className="text-sm text-base-content/60">
                        {product.sales} продаж
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(product.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Дополнительные метрики */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-error/10 rounded-lg">
                <AlertCircle className="h-5 w-5 text-error" />
              </div>
              <div>
                <p className="text-sm text-base-content/60">Брошенные корзины</p>
                <p className="text-xl font-bold text-error">
                  {stats ? `${stats.conversion.cartAbandonment}%` : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-info/10 rounded-lg">
                <Eye className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-base-content/60">Просмотры товаров</p>
                <p className="text-xl font-bold">
                  {stats ? formatNumber(stats.products.views) : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <Package className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-base-content/60">Продано товаров</p>
                <p className="text-xl font-bold text-success">
                  {stats ? formatNumber(stats.products.sold) : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Быстрые действия */}
      <div className="card bg-gradient-to-r from-primary to-secondary text-primary-content shadow-xl">
        <div className="card-body">
          <h3 className="card-title text-primary-content flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Быстрые действия
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
            <button className="btn btn-outline btn-sm border-primary-content text-primary-content hover:bg-primary-content hover:text-primary">
              Создать заказ
            </button>
            <button className="btn btn-outline btn-sm border-primary-content text-primary-content hover:bg-primary-content hover:text-primary">
              Добавить товар
            </button>
            <button className="btn btn-outline btn-sm border-primary-content text-primary-content hover:bg-primary-content hover:text-primary">
              Отправить рассылку
            </button>
            <button className="btn btn-outline btn-sm border-primary-content text-primary-content hover:bg-primary-content hover:text-primary">
              Экспорт отчета
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}