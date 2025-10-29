import React, { useEffect, useMemo, useState } from 'react'
import { 
  Calendar, 
  Download, 
  RefreshCcw, 
  Search, 
  MousePointer, 
  Eye, 
  ShoppingCart, 
  LogIn, 
  Filter, 
  ChevronRight, 
  CheckCircle2, 
  Circle, 
  Clock, 
  User,
  Users,
  X,
  AlertTriangle,
  Info,
  Activity,
  TrendingUp,
  Package,
  ArrowRight,
  LogOut,
  Smartphone
} from 'lucide-react'
import { cn } from '@/lib/utils'

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-activity`

type ActivityLog = {
  id: string
  telegram_id: string
  activity_type: string
  activity_data?: any
  session_id?: string
  user_agent?: string
  created_at: string
}

type CartItemBrief = { id?: string; name?: string; qty?: number }

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(false)
  const [telegramId, setTelegramId] = useState('')
  const [activityType, setActivityType] = useState('')
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | 'all'>('7d')
  const [textQuery, setTextQuery] = useState('')
  const [onlyWithCheckout, setOnlyWithCheckout] = useState(false)
  const [activeTab, setActiveTab] = useState<'timeline' | 'raw'>('timeline')

  useEffect(() => {
    loadLogs()
  }, [dateRange])

  const buildDateRange = () => {
    if (dateRange === 'all') return {}
    const now = new Date()
    let from = new Date()
    if (dateRange === 'today') {
      from.setHours(0, 0, 0, 0)
    } else if (dateRange === '7d') {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (dateRange === '30d') {
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }
    return { date_from: from.toISOString(), date_to: now.toISOString() }
  }

  const loadLogs = async () => {
    setLoading(true)
    try {
      const dateParams = buildDateRange()
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          action: 'get_activity_logs',
          data: {
            telegram_id: telegramId || undefined,
            activity_type: activityType || undefined,
            limit: 500,
            ...dateParams
          }
        })
      })
      const data = await res.json()
      setLogs((data.logs || []) as ActivityLog[])
    } catch (e) {
      console.error('Failed to load logs', e)
    } finally {
      setLoading(false)
    }
  }

  const iconFor = (type: string) => {
    switch (type) {
      case 'app_open': return <Smartphone className="h-4 w-4" />
      case 'view_product': return <Eye className="h-4 w-4" />
      case 'add_to_cart': return <ShoppingCart className="h-4 w-4" />
      case 'remove_from_cart': return <X className="h-4 w-4" />
      case 'view_cart': return <Package className="h-4 w-4" />
      case 'checkout_start': return <CheckCircle2 className="h-4 w-4" />
      case 'auth_success': return <LogIn className="h-4 w-4" />
      default: return <Circle className="h-4 w-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'app_open': return 'badge-ghost'
      case 'view_product': return 'badge-info'
      case 'add_to_cart': return 'badge-success'
      case 'remove_from_cart': return 'badge-error'
      case 'view_cart': return 'badge-warning'
      case 'checkout_start': return 'badge-primary'
      case 'auth_success': return 'badge-secondary'
      default: return 'badge-ghost'
    }
  }

  const humanize = (log: ActivityLog) => {
    const d = log.activity_data || {}
    switch (log.activity_type) {
      case 'app_open': return 'Открыл приложение'
      case 'view_product': return `Просмотр: ${d.name || d.wb_id || d.product_id || '—'}`
      case 'add_to_cart': return `В корзину: ${d.name || '—'}${d.price ? `, ${d.price}₽` : ''}`
      case 'remove_from_cart': return `Удалил: ${d.name || '—'}`
      case 'view_cart': {
        const items = d.items || []
        return `Корзина (${items.length} товаров)`
      }
      case 'checkout_start': return `Начал оформление (${d.items?.length || 0} товаров)`
      case 'auth_success': return 'Авторизация WB'
      default: return log.activity_type
    }
  }

  const sessions = useMemo(() => {
    const text = textQuery.trim().toLowerCase()
    const filtered = logs.filter(l => {
      if (!text) return true
      const str = `${l.telegram_id} ${l.activity_type} ${JSON.stringify(l.activity_data || {})}`.toLowerCase()
      return str.includes(text)
    })

    const groups = new Map<string, ActivityLog[]>()
    for (const log of filtered) {
      const key = log.session_id || `no_session_${log.telegram_id}_${log.id}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(log)
    }
    
    const result = Array.from(groups.entries()).map(([sid, items]) => {
      const sorted = items.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      const start = new Date(sorted[0].created_at)
      const end = new Date(sorted[sorted.length - 1].created_at)
      const durationMs = end.getTime() - start.getTime()
      const hasCheckout = sorted.some(i => i.activity_type === 'checkout_start')
      const views = sorted.filter(i => i.activity_type === 'view_product').length
      const adds = sorted.filter(i => i.activity_type === 'add_to_cart').length
      const lastCart = [...sorted].reverse().find(i => i.activity_type === 'view_cart')
      const lastCartItems: CartItemBrief[] = (lastCart?.activity_data?.items || [])
      
      return { 
        session_id: sid, 
        telegram_id: sorted[0].telegram_id, 
        start, 
        end, 
        durationMs, 
        items: sorted, 
        hasCheckout, 
        views, 
        adds, 
        lastCartItems 
      }
    })

    const afterConv = onlyWithCheckout ? result.filter(r => r.hasCheckout) : result
    return afterConv.sort((a, b) => b.start.getTime() - a.start.getTime())
  }, [logs, textQuery, onlyWithCheckout])

  const fmtTime = (d: Date) => d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const fmtDate = (d: Date) => d.toLocaleDateString('ru-RU')
  const fmtDur = (ms: number) => {
    if (ms < 1000) return `${ms} мс`
    const s = Math.round(ms / 1000)
    if (s < 60) return `${s} сек`
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m} мин ${sec} сек`
  }

  // Статистика
  const stats = useMemo(() => {
    const uniqueUsers = new Set(logs.map(l => l.telegram_id)).size
    const totalEvents = logs.length
    const conversionSessions = sessions.filter(s => s.hasCheckout).length
    const totalSessions = sessions.length
    const conversionRate = totalSessions > 0 ? (conversionSessions / totalSessions * 100).toFixed(1) : '0'
    
    return {
      uniqueUsers,
      totalEvents,
      conversionRate,
      totalSessions
    }
  }, [logs, sessions])

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
        <div className="stat">
          <div className="stat-figure text-primary">
            <Users className="h-8 w-8" />
          </div>
          <div className="stat-title">Уникальных пользователей</div>
          <div className="stat-value text-primary">{stats.uniqueUsers}</div>
          <div className="stat-desc">За выбранный период</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-secondary">
            <Activity className="h-8 w-8" />
          </div>
          <div className="stat-title">Всего событий</div>
          <div className="stat-value text-secondary">{stats.totalEvents}</div>
          <div className="stat-desc">{stats.totalSessions} сессий</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-success">
            <TrendingUp className="h-8 w-8" />
          </div>
          <div className="stat-title">Конверсия в оформление</div>
          <div className="stat-value text-success">{stats.conversionRate}%</div>
          <div className="stat-desc">Начали оформление</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-info">
            <Clock className="h-8 w-8" />
          </div>
          <div className="stat-title">Период</div>
          <div className="stat-value text-info text-lg">
            {dateRange === 'today' ? 'Сегодня' :
             dateRange === '7d' ? '7 дней' :
             dateRange === '30d' ? '30 дней' : 'Все время'}
          </div>
          <div className="stat-desc">Фильтр по времени</div>
        </div>
      </div>

      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-7 w-7 text-primary" />
            Активность пользователей
          </h2>
          <p className="text-base-content/60">Мониторинг действий в реальном времени</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={loadLogs}>
          <RefreshCcw className="h-4 w-4" />
          Обновить
        </button>
      </div>

      {/* Фильтры */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">Фильтры</h3>
          
          {/* Период */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button 
              className={cn("btn btn-sm", dateRange === 'today' ? "btn-primary" : "btn-outline")}
              onClick={() => setDateRange('today')}
            >
              Сегодня
            </button>
            <button 
              className={cn("btn btn-sm", dateRange === '7d' ? "btn-primary" : "btn-outline")}
              onClick={() => setDateRange('7d')}
            >
              7 дней
            </button>
            <button 
              className={cn("btn btn-sm", dateRange === '30d' ? "btn-primary" : "btn-outline")}
              onClick={() => setDateRange('30d')}
            >
              30 дней
            </button>
            <button 
              className={cn("btn btn-sm", dateRange === 'all' ? "btn-primary" : "btn-outline")}
              onClick={() => setDateRange('all')}
            >
              Все время
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Telegram ID</span>
              </label>
              <input 
                type="text" 
                placeholder="Например: 123456789" 
                className="input input-bordered w-full"
                value={telegramId}
                onChange={e => setTelegramId(e.target.value)}
              />
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">Тип события</span>
              </label>
              <select 
                className="select select-bordered w-full"
                value={activityType}
                onChange={e => setActivityType(e.target.value)}
              >
                <option value="">Все события</option>
                <option value="app_open">Открытие приложения</option>
                <option value="view_product">Просмотр товара</option>
                <option value="add_to_cart">Добавление в корзину</option>
                <option value="remove_from_cart">Удаление из корзины</option>
                <option value="view_cart">Просмотр корзины</option>
                <option value="checkout_start">Начало оформления</option>
                <option value="auth_success">Авторизация</option>
              </select>
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">Поиск</span>
              </label>
              <input 
                type="text" 
                placeholder="Название товара / ID..." 
                className="input input-bordered w-full"
                value={textQuery}
                onChange={e => setTextQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="form-control">
              <label className="label cursor-pointer">
                <input 
                  type="checkbox" 
                  className="checkbox checkbox-primary mr-2"
                  checked={onlyWithCheckout}
                  onChange={e => setOnlyWithCheckout(e.target.checked)}
                />
                <span className="label-text">Только с оформлением</span>
              </label>
            </div>
            
            <button className="btn btn-primary" onClick={loadLogs}>
              <Search className="h-4 w-4" />
              Применить фильтры
            </button>
          </div>
        </div>
      </div>

      {/* Вкладки */}
      <div className="tabs tabs-boxed">
        <a 
          className={cn("tab", activeTab === 'timeline' && "tab-active")}
          onClick={() => setActiveTab('timeline')}
        >
          Временная шкала
        </a>
        <a 
          className={cn("tab", activeTab === 'raw' && "tab-active")}
          onClick={() => setActiveTab('raw')}
        >
          Сырые данные
        </a>
      </div>

      {/* Контент */}
      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : (
        <>
          {/* Timeline View */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              {sessions.length === 0 ? (
                <div className="card bg-base-100 shadow-xl">
                  <div className="card-body text-center py-12">
                    <Activity className="h-16 w-16 mx-auto text-base-content/30 mb-4" />
                    <h3 className="text-xl font-bold mb-2">Нет данных</h3>
                    <p className="text-base-content/60">
                      Активность за выбранный период отсутствует
                    </p>
                  </div>
                </div>
              ) : (
                sessions.map(session => (
                  <div key={session.session_id} className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                      {/* Заголовок сессии */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                        <div>
                          <h3 className="font-bold text-lg flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            Пользователь {session.telegram_id}
                          </h3>
                          <p className="text-sm opacity-60 mt-1">
                            Сессия: {session.session_id.substring(0, 20)}...
                          </p>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {session.hasCheckout && (
                            <div className="badge badge-success gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Оформление
                            </div>
                          )}
                          <div className="badge badge-ghost">
                            <Clock className="h-3 w-3 mr-1" />
                            {fmtDur(session.durationMs)}
                          </div>
                          <div className="badge badge-info">
                            <Eye className="h-3 w-3 mr-1" />
                            {session.views} просмотров
                          </div>
                          <div className="badge badge-success">
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            {session.adds} в корзину
                          </div>
                        </div>
                      </div>

                      {/* Корзина если есть */}
                      {session.lastCartItems.length > 0 && (
                        <div className="alert alert-info mb-4">
                          <Package className="h-4 w-4" />
                          <div>
                            <div className="font-bold">Корзина</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {session.lastCartItems.slice(0, 5).map((item, idx) => (
                                <span key={idx} className="badge badge-sm">
                                  {item.name || 'Товар'} ×{item.qty || 1}
                                </span>
                              ))}
                              {session.lastCartItems.length > 5 && (
                                <span className="badge badge-sm">
                                  +{session.lastCartItems.length - 5}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Timeline */}
                      <div className="space-y-4">
                        {session.items.map((item, index) => (
                          <div key={item.id} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className={cn(
                                "badge badge-lg",
                                getActivityColor(item.activity_type)
                              )}>
                                {iconFor(item.activity_type)}
                              </div>
                              {index < session.items.length - 1 && (
                                <div className="w-0.5 h-16 bg-base-300 mt-2"></div>
                              )}
                            </div>
                            
                            <div className="flex-1 pb-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium">{humanize(item)}</p>
                                  {item.activity_data?.wb_id && (
                                    <p className="text-sm opacity-60 mt-1">
                                      Артикул: {item.activity_data.wb_id}
                                    </p>
                                  )}
                                </div>
                                <span className="text-sm opacity-60">
                                  {fmtTime(new Date(item.created_at))}
                                </span>
                              </div>
                              
                              {/* Детали корзины */}
                              {item.activity_type === 'view_cart' && item.activity_data?.items?.length > 0 && (
                                <div className="mt-2 p-3 bg-base-200 rounded-lg">
                                  <p className="text-sm font-medium mb-2">Содержимое корзины:</p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                                    {item.activity_data.items.map((cartItem: any, idx: number) => (
                                      <div key={idx} className="text-sm opacity-80">
                                        • {cartItem.name || 'Товар'} ×{cartItem.qty || 1}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Raw Data View */}
          {activeTab === 'raw' && (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title mb-4">Все события</h3>
                <div className="overflow-x-auto">
                  <table className="table table-zebra">
                    <thead>
                      <tr>
                        <th>Время</th>
                        <th>Telegram ID</th>
                        <th>Событие</th>
                        <th>Описание</th>
                        <th>Сессия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(log => (
                        <tr key={log.id}>
                          <td className="whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString('ru-RU')}
                          </td>
                          <td>{log.telegram_id}</td>
                          <td>
                            <div className={cn("badge", getActivityColor(log.activity_type))}>
                              {iconFor(log.activity_type)}
                              <span className="ml-1">{log.activity_type}</span>
                            </div>
                          </td>
                          <td className="max-w-xs truncate">{humanize(log)}</td>
                          <td className="max-w-[150px] truncate">
                            {log.session_id || '—'}
                          </td>
                        </tr>
                      ))}
                      {logs.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-8 opacity-60">
                            Нет данных за выбранный период
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}