import React, { useState, useEffect } from 'react'
import { 
  Store, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar,
  Percent,
  BarChart3,
  Clock,
  DollarSign,
  Activity,
  TrendingDown,
  Plus,
  ExternalLink,
  Settings,
  Eye,
  Star,
  MessageSquare,
  ChevronRight,
  Zap,
  Target,
  CreditCard,
  Gift,
  Award,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase, auth } from '@/lib/supabase'
import { formatPrice, formatDate } from '@/lib/utils'

interface DashboardStats {
  totalRevenue: number
  activeStores: number
  totalOrders: number
  totalProducts: number
  revenueChange: number
  ordersChange: number
  totalCustomers: number
  conversionRate: number
}

interface RecentOrder {
  id: string
  order_number: string
  customer_name: string
  store_name: string
  total_amount: number
  status: string
  created_at: string
}

interface TopStore {
  name: string
  orders_count: number
  revenue: number
  growth: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    activeStores: 0,
    totalOrders: 0,
    totalProducts: 0,
    revenueChange: 0,
    ordersChange: 0,
    totalCustomers: 0,
    conversionRate: 0
  })
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [topStores, setTopStores] = useState<TopStore[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const user = await auth.getCurrentUser()
      if (!user) return

      await Promise.all([
        loadStats(user.id),
        loadRecentOrders(user.id),
        loadTopStores(user.id)
      ])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async (userId: string) => {
    try {
      const { data: stores } = await supabase
        .from('stores')
        .select('*')
        .eq('status', 'active')

      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      const { data: products } = await supabase
        .from('products')
        .select('*')

      const { data: customers } = await supabase
        .from('customers')
        .select('*')

      const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
      const totalOrders = orders?.length || 0
      const thisMonthOrders = orders?.filter(o => new Date(o.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length || 0
      const lastMonthOrders = orders?.filter(o => {
        const date = new Date(o.created_at)
        return date > new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) && date < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }).length || 0

      setStats({
        totalRevenue,
        activeStores: stores?.length || 0,
        totalOrders,
        totalProducts: products?.length || 0,
        revenueChange: ((totalRevenue - 450000) / 450000) * 100,
        ordersChange: lastMonthOrders ? ((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100 : 0,
        totalCustomers: customers?.length || 0,
        conversionRate: 2.4
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const loadRecentOrders = async (userId: string) => {
    try {
      const { data: orders } = await supabase
        .from('orders')
        .select(`
          *,
          stores (name),
          customers (first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5)

      const formattedOrders: RecentOrder[] = orders?.map(order => ({
        id: order.id,
        order_number: order.order_id || `#${order.id.slice(0, 8)}`,
        customer_name: order.customers ? `${order.customers.first_name} ${order.customers.last_name}` : 'Клиент',
        store_name: order.stores?.name || 'Магазин',
        total_amount: order.total_amount || 0,
        status: order.status || 'processing',
        created_at: order.created_at
      })) || []

      setRecentOrders(formattedOrders)
    } catch (error) {
      console.error('Error loading recent orders:', error)
    }
  }

  const loadTopStores = async (userId: string) => {
    try {
      const { data: stores } = await supabase
        .from('stores')
        .select(`
          name,
          orders (total_amount)
        `)
        .eq('status', 'active')
        .limit(3)

      const formattedStores: TopStore[] = stores?.map(store => ({
        name: store.name,
        orders_count: store.orders?.length || 0,
        revenue: store.orders?.reduce((sum: number, order: any) => sum + (order.total_amount || 0), 0) || 0,
        growth: Math.random() * 40 - 10
      })) || []

      setTopStores(formattedStores)
    } catch (error) {
      console.error('Error loading top stores:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      processing: { label: 'В обработке', class: 'badge-warning' },
      confirmed: { label: 'Подтвержден', class: 'badge-info' },
      shipped: { label: 'Отправлен', class: 'badge-primary' },
      delivered: { label: 'Доставлен', class: 'badge-success' },
      cancelled: { label: 'Отменен', class: 'badge-error' }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.processing
    return <div className={cn("badge badge-sm", config.class)}>{config.label}</div>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    )
  }

  const statsCards = [
    {
      title: 'Общая выручка',
      value: formatPrice(stats.totalRevenue),
      change: stats.revenueChange,
      icon: DollarSign,
      color: 'primary',
      description: 'За последние 30 дней'
    },
    {
      title: 'Всего заказов',
      value: stats.totalOrders.toString(),
      change: stats.ordersChange,
      icon: ShoppingCart,
      color: 'secondary',
      description: 'Активные и выполненные'
    },
    {
      title: 'Активные магазины',
      value: stats.activeStores.toString(),
      change: 15,
      icon: Store,
      color: 'accent',
      description: 'Telegram магазины'
    },
    {
      title: 'Товары в каталоге',
      value: stats.totalProducts.toString(),
      change: 8,
      icon: Package,
      color: 'info',
      description: 'Из Wildberries'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Панель управления</h1>
          <p className="text-base-content/60 mt-1">Добро пожаловать в систему управления TeleShop</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-sm btn-ghost">
            <Calendar className="h-4 w-4" />
            Сегодня
          </button>
          <button className="btn btn-sm btn-primary">
            <Plus className="h-4 w-4" />
            Новый заказ
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div className={cn("p-3 rounded-lg", `bg-${stat.color}/10`)}>
                    <Icon className={cn("h-6 w-6", `text-${stat.color}`)} />
                  </div>
                  <div className={cn(
                    "badge gap-1",
                    stat.change > 0 ? "badge-success" : "badge-error"
                  )}>
                    {stat.change > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(stat.change).toFixed(1)}%
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-base-content/60">{stat.title}</p>
                  <p className="text-xs text-base-content/40 mt-1">{stat.description}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders - 2 columns */}
        <div className="lg:col-span-2">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h2 className="card-title">
                  <Clock className="h-5 w-5" />
                  Последние заказы
                </h2>
                <button className="btn btn-sm btn-ghost">
                  Все заказы
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>№ Заказа</th>
                      <th>Клиент</th>
                      <th>Магазин</th>
                      <th>Сумма</th>
                      <th>Статус</th>
                      <th>Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="hover">
                        <td className="font-medium">{order.order_number}</td>
                        <td>{order.customer_name}</td>
                        <td>
                          <div className="badge badge-ghost badge-sm">{order.store_name}</div>
                        </td>
                        <td className="font-semibold">{formatPrice(order.total_amount)}</td>
                        <td>{getStatusBadge(order.status)}</td>
                        <td className="text-sm text-base-content/60">
                          {new Date(order.created_at).toLocaleDateString('ru-RU')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Top Stores - 1 column */}
        <div>
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title mb-4">
                <Award className="h-5 w-5" />
                Топ магазины
              </h2>
              
              <div className="space-y-4">
                {topStores.map((store, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-base-200 hover:bg-base-300 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "avatar placeholder",
                        index === 0 && "ring ring-warning ring-offset-base-100 ring-offset-2"
                      )}>
                        <div className={cn(
                          "w-10 rounded-full",
                          index === 0 ? "bg-warning text-warning-content" :
                          index === 1 ? "bg-primary text-primary-content" :
                          "bg-secondary text-secondary-content"
                        )}>
                          <span className="text-lg font-bold">{index + 1}</span>
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold">{store.name}</p>
                        <p className="text-xs text-base-content/60">{store.orders_count} заказов</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatPrice(store.revenue)}</p>
                      <div className={cn(
                        "text-xs flex items-center gap-1 justify-end",
                        store.growth > 0 ? "text-success" : "text-error"
                      )}>
                        {store.growth > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {Math.abs(store.growth).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button className="btn btn-sm btn-primary btn-block mt-4">
                Все магазины
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-br from-primary to-secondary text-primary-content">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold">Конверсия</p>
                <p className="text-3xl font-bold mt-2">{stats.conversionRate}%</p>
                <p className="text-sm opacity-80 mt-1">+0.8% за неделю</p>
              </div>
              <div className="radial-progress text-primary-content" style={{"--value": stats.conversionRate * 10} as React.CSSProperties}>
                <Percent className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-accent to-info text-accent-content">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold">Клиенты</p>
                <p className="text-3xl font-bold mt-2">{stats.totalCustomers}</p>
                <p className="text-sm opacity-80 mt-1">+124 новых</p>
              </div>
              <Users className="h-12 w-12 opacity-20" />
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-warning to-error text-warning-content">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold">Активность</p>
                <p className="text-3xl font-bold mt-2">89%</p>
                <p className="text-sm opacity-80 mt-1">За сегодня</p>
              </div>
              <Activity className="h-12 w-12 opacity-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title mb-4">
            <Zap className="h-5 w-5" />
            Быстрые действия
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="btn btn-outline btn-primary">
              <Store className="h-4 w-4" />
              Создать магазин
            </button>
            <button className="btn btn-outline btn-secondary">
              <Package className="h-4 w-4" />
              Добавить товар
            </button>
            <button className="btn btn-outline btn-accent">
              <Users className="h-4 w-4" />
              Пригласить клиента
            </button>
            <button className="btn btn-outline btn-info">
              <BarChart3 className="h-4 w-4" />
              Отчеты
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}