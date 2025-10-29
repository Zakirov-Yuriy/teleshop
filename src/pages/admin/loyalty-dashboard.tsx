import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  Wallet, 
  Activity, 
  Download,
  Plus,
  Minus,
  RefreshCw,
  Send,
  X,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react'

interface LoyaltyUser {
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

interface LoyaltyTransaction {
  id: string
  user_id: string
  transaction_type: 'earn' | 'spend' | 'expire' | 'adjust'
  points: number
  order_id?: string
  marketplace?: string
  order_amount?: number
  description?: string
  created_at: string
  loyalty_users?: {
    telegram_id: string
    first_name?: string
    last_name?: string
  }
}

interface LoyaltyCashback {
  id: string
  user_id: string
  amount: 50 | 100 | 150
  points_spent: number
  points_remaining: number
  phone_number: string
  payment_provider?: string
  payment_status: 'pending' | 'success' | 'failed' | 'cancelled'
  payment_id?: string
  payment_response?: any
  created_at: string
  processed_at?: string
  loyalty_users?: {
    telegram_id: string
    first_name?: string
    last_name?: string
  }
}

interface PlatformBalance {
  id: string
  current_balance: number
  total_deposited: number
  total_paid_out: number
  last_deposit_date?: string
  last_payout_date?: string
  updated_at: string
}

export default function LoyaltyDashboard() {
  // Простые тосты (локальная реализация)
  const [toasts, setToasts] = useState<Array<{ id: string; type: 'success' | 'error' | 'info' | 'warning'; title: string; description?: string }>>([])
  const showToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, description?: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    setToasts((prev) => [...prev, { id, type, title, description }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500)
  }
  const removeToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id))

  const [users, setUsers] = useState<LoyaltyUser[]>([])
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([])
  const [cashbacks, setCashbacks] = useState<LoyaltyCashback[]>([])
  const [balance, setBalance] = useState<PlatformBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const [depositAmount, setDepositAmount] = useState('')
  const [adjustUserId, setAdjustUserId] = useState('')
  const [adjustPoints, setAdjustPoints] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  
  // Новые состояния для активности и уведомлений
  const [activityLogs, setActivityLogs] = useState([])
  const [activityStats, setActivityStats] = useState({})
  const [notifications, setNotifications] = useState([])
  const [notificationTemplates, setNotificationTemplates] = useState([])
  const [selectedNotificationType, setSelectedNotificationType] = useState('')
  const [notificationTitle, setNotificationTitle] = useState('')
  const [notificationMessage, setNotificationMessage] = useState('')
  const [notificationActionUrl, setNotificationActionUrl] = useState('')
  const [notificationActionText, setNotificationActionText] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [templateForm, setTemplateForm] = useState({
    template_key: '',
    title_template: '',
    message_template: '',
    action_url_template: '',
    action_text_template: ''
  })

  useEffect(() => {
    loadDashboardData()
    loadNotificationData()
    loadActivityData()
  }, [])

  // Обработчики для загрузки данных при переключении вкладок
  const handleTabChange = (value: string) => {
    if (value === 'activity') {
      loadActivityData()
    } else if (value === 'notifications') {
      loadNotificationData()
    }
  }

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [usersRes, transactionsRes, cashbacksRes, balanceRes] = await Promise.all([
        fetchLoyaltyData('users'),
        fetchLoyaltyData('transactions'),
        fetchLoyaltyData('cashbacks'),
        fetchLoyaltyData('balance')
      ])

      if (usersRes.success) setUsers(usersRes.data || [])
      if (transactionsRes.success) setTransactions(transactionsRes.data || [])
      if (cashbacksRes.success) setCashbacks(cashbacksRes.data || [])
      if (balanceRes.success) setBalance(balanceRes.data)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Функции для работы с активностью
  const loadActivityData = async () => {
    try {
      const [logsRes, statsRes] = await Promise.all([
        fetchActivityData('get_activity_logs', {}),
        fetchActivityData('get_activity_stats', {})
      ])

      if (logsRes.success) setActivityLogs(logsRes.logs || [])
      if (statsRes.success) setActivityStats(statsRes || {})
    } catch (error) {
      console.error('Error loading activity data:', error)
    }
  }

  const fetchActivityData = async (action: string, data: any) => {
    try {
      const response = await fetch('https://kzrafexlalajoirzugdj.supabase.co/functions/v1/user-activity', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ action, data })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching activity data:', error)
      return { success: false, error: error.message }
    }
  }

  // Функции для работы с уведомлениями
  const loadNotificationData = async () => {
    try {
      const [notificationsRes, templatesRes] = await Promise.all([
        fetchNotificationData('get_notifications', {}),
        fetchNotificationData('get_notification_templates', {})
      ])

      if (notificationsRes.success) setNotifications(notificationsRes.notifications || [])
      if (templatesRes.success) setNotificationTemplates(templatesRes.templates || [])
    } catch (error) {
      console.error('Error loading notification data:', error)
    }
  }

  const fetchNotificationData = async (action: string, data: any) => {
    try {
      const response = await fetch('https://kzrafexlalajoirzugdj.supabase.co/functions/v1/user-activity', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ action, data })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching notification data:', error)
      return { success: false, error: error.message }
    }
  }

  const sendNotification = async () => {
    if (!notificationTitle || !notificationMessage) return

    try {
      // Сначала создаем уведомления в базе данных
      const response = await fetchNotificationData('send_bulk_notifications', {
        notification_type: selectedNotificationType || 'custom',
        title: notificationTitle,
        message: notificationMessage,
        action_url: notificationActionUrl || undefined,
        action_text: notificationActionText || undefined
      })

      if (response.success) {
        // Затем отправляем их через Telegram
        const sendResponse = await fetch('https://kzrafexlalajoirzugdj.supabase.co/functions/v1/send-notifications', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            action: 'send_pending_notifications'
          })
        })

        const sendResult = await sendResponse.json()
        
        setNotificationTitle('')
        setNotificationMessage('')
        setNotificationActionUrl('')
        setNotificationActionText('')
        setSelectedNotificationType('')
        loadNotificationData()
        
        if (sendResult.success) {
          showToast('success', 'Уведомления отправлены', `Отправлено: ${sendResult.sent_count}, Ошибок: ${sendResult.failed_count}`)
        } else {
          showToast('warning', 'Созданы, но не отправлены', 'Возникла ошибка при отправке')
        }
      }
    } catch (error) {
      console.error('Error sending notifications:', error)
      showToast('error', 'Ошибка', 'Не удалось отправить уведомления')
    }
  }

  const createNotificationTemplate = async () => {
    if (!templateForm.template_key || !templateForm.title_template || !templateForm.message_template) return

    try {
      const response = await fetchNotificationData('create_notification_template', templateForm)

      if (response.success) {
        setTemplateForm({
          template_key: '',
          title_template: '',
          message_template: '',
          action_url_template: '',
          action_text_template: ''
        })
        loadNotificationData()
        showToast('success', 'Шаблон создан')
      }
    } catch (error) {
      console.error('Error creating template:', error)
      showToast('error', 'Ошибка', 'Не удалось создать шаблон')
    }
  }

  const sendPendingNotifications = async () => {
    try {
      const response = await fetch('https://kzrafexlalajoirzugdj.supabase.co/functions/v1/send-notifications', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          action: 'send_pending_notifications'
        })
      })

      const result = await response.json()
      
      if (result.success) {
        showToast('success', 'Отправка завершена', `Отправлено: ${result.sent_count}, Ошибок: ${result.failed_count}`)
        loadNotificationData()
      } else {
        showToast('error', 'Ошибка', 'Не удалось отправить уведомления')
      }
    } catch (error) {
      console.error('Error sending notifications:', error)
      showToast('error', 'Ошибка', 'Не удалось отправить уведомления')
    }
  }

  const sendSingleNotification = async (notificationId: string) => {
    try {
      const response = await fetch('https://kzrafexlalajoirzugdj.supabase.co/functions/v1/send-notifications', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          action: 'send_notification',
          data: { notification_id: notificationId }
        })
      })

      const result = await response.json()
      
      if (result.success) {
        showToast('success', 'Уведомление отправлено')
        loadNotificationData()
      } else {
        showToast('error', 'Ошибка', 'Не удалось отправить уведомление')
      }
    } catch (error) {
      console.error('Error sending single notification:', error)
      showToast('error', 'Ошибка', 'Не удалось отправить уведомление')
    }
  }

  const fetchLoyaltyData = async (reportType: string) => {
    try {
      console.log('🔍 Запрашиваем данные:', reportType)
      console.log('🔑 API Key:', import.meta.env.VITE_SUPABASE_ANON_KEY)
      
      const response = await fetch('https://kzrafexlalajoirzugdj.supabase.co/functions/v1/loyalty-system', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          action: 'get_admin_reports',
          data: { report_type: reportType }
        })
      })
      
      console.log('📡 Статус ответа:', response.status)
      console.log('📄 Заголовки:', response.headers)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Ошибка API:', errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
      
      const data = await response.json()
      console.log('✅ Получены данные:', data)
      return data
    } catch (error) {
      console.error('❌ Ошибка fetchLoyaltyData:', error)
      return { success: false, error: error.message }
    }
  }

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return

    try {
      const response = await fetch('https://kzrafexlalajoirzugdj.supabase.co/functions/v1/loyalty-system', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          action: 'update_platform_balance',
          data: {
            action: 'deposit',
            amount: parseFloat(depositAmount)
          }
        })
      })

      const result = await response.json()
      if (result.success) {
        setDepositAmount('')
        loadDashboardData()
        showToast('success', 'Баланс пополнен')
      }
    } catch (error) {
      console.error('Error depositing funds:', error)
      showToast('error', 'Ошибка', 'Не удалось пополнить баланс')
    }
  }

  const handleAdjustPoints = async () => {
    if (!adjustUserId || !adjustPoints || !adjustReason) return

    try {
      const response = await fetch('https://kzrafexlalajoirzugdj.supabase.co/functions/v1/loyalty-system', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          action: 'adjust_user_points',
          data: {
            telegram_id: adjustUserId,
            points: parseInt(adjustPoints),
            reason: adjustReason
          }
        })
      })

      const result = await response.json()
      if (result.success) {
        setAdjustUserId('')
        setAdjustPoints('')
        setAdjustReason('')
        loadDashboardData()
        showToast('success', 'Баллы скорректированы')
      }
    } catch (error) {
      console.error('Error adjusting points:', error)
      showToast('error', 'Ошибка', 'Не удалось скорректировать баллы')
    }
  }

  const exportData = async (type: string) => {
    try {
      const response = await fetchLoyaltyData(type)
      if (response.success) {
        const dataStr = JSON.stringify(response.data, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `loyalty-${type}-${new Date().toISOString().split('T')[0]}.json`
        link.click()
        URL.revokeObjectURL(url)
        showToast('success', 'Экспорт готов', `Файл loyalty-${type} сохранён`)
      }
    } catch (error) {
      console.error('Error exporting data:', error)
      showToast('error', 'Ошибка', 'Не удалось экспортировать данные')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500', text: 'Ожидает' },
      success: { color: 'bg-green-500', text: 'Успешно' },
      failed: { color: 'bg-red-500', text: 'Ошибка' },
      cancelled: { color: 'bg-gray-500', text: 'Отменено' }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return <Badge className={config.color}>{config.text}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        <style>{`@keyframes shrink { from { width: 100% } to { width: 0% } }`}</style>
        {toasts.map((t) => (
          <div key={t.id} className="w-80 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-3 flex items-start gap-3">
              {t.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />}
              {t.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />}
              {t.type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />}
              {t.type === 'info' && <Info className="h-5 w-5 text-indigo-600 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{t.title}</div>
                {t.description && <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">{t.description}</div>}
              </div>
              <button onClick={() => removeToast(t.id)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="h-1 bg-gray-100">
              <div className={
                t.type === 'success' ? 'h-1 bg-emerald-500' :
                t.type === 'error' ? 'h-1 bg-red-500' :
                t.type === 'warning' ? 'h-1 bg-amber-500' : 'h-1 bg-indigo-500'
              } style={{ width: '100%', animation: 'shrink 4.5s linear forwards' }} />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Левая колонка */}
        <div className="lg:col-span-8 space-y-6">
          {/* Статистика */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="border border-gray-200 bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Пользователи</CardTitle>
                <Users className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-gray-900">{users.length}</div>
                <p className="text-xs text-gray-500">Зарегистрировано</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200 bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Баланс платформы</CardTitle>
                <Wallet className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-gray-900">{balance?.current_balance?.toLocaleString() || 0} ₽</div>
                <p className="text-xs text-gray-500">Доступно для выплат</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200 bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Выплачено</CardTitle>
                <CreditCard className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-gray-900">{balance?.total_paid_out?.toLocaleString() || 0} ₽</div>
                <p className="text-xs text-gray-500">Всего кэшбэка</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-200 bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Транзакции</CardTitle>
                <Activity className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-gray-900">{transactions.length}</div>
                <p className="text-xs text-gray-500">За период</p>
              </CardContent>
            </Card>
          </div>

          {/* Табы с данными */}
          <Tabs defaultValue="users" className="space-y-4" onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="users">Пользователи ({users.length})</TabsTrigger>
              <TabsTrigger value="transactions">Транзакции ({transactions.length})</TabsTrigger>
              <TabsTrigger value="cashbacks">Кэшбэки ({cashbacks.length})</TabsTrigger>
              <TabsTrigger value="activity">Активность ({activityLogs.length || 0})</TabsTrigger>
              <TabsTrigger value="notifications">Уведомления ({notifications.length || 0})</TabsTrigger>
            </TabsList>
 
          <TabsContent value="users" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Пользователи системы лояльности</h3>
              <Button onClick={() => exportData('users')} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Экспорт
              </Button>
            </div>
          <Card className="border border-gray-200 bg-white">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Telegram ID</th>
                    <th className="p-2 text-left">Имя</th>
                    <th className="p-2 text-left">Телефон</th>
                    <th className="p-2 text-left">Баллы</th>
                    <th className="p-2 text-left">Заказы</th>
                    <th className="p-2 text-left">Регистрация</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((user) => (
                    <tr key={user.id} className="border-t hover:bg-slate-50/60">
                      <td className="p-2">{user.telegram_id}</td>
                      <td className="p-2">
                        {user.first_name} {user.last_name}
                      </td>
                      <td className="p-2">{user.phone_number || '-'}</td>
                      <td className="p-2">
                        <Badge variant="secondary">
                          {user.available_points}/{user.total_points}
                        </Badge>
                      </td>
                      <td className="p-2">{user.completed_orders}</td>
                      <td className="p-2">
                        {new Date(user.registration_date).toLocaleDateString('ru-RU')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </CardContent>
          </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">История транзакций</h3>
              <Button onClick={() => exportData('transactions')} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Экспорт
              </Button>
            </div>
          <Card className="border border-gray-200 bg-white">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Дата</th>
                    <th className="p-2 text-left">Пользователь</th>
                    <th className="p-2 text-left">Тип</th>
                    <th className="p-2 text-left">Баллы</th>
                    <th className="p-2 text-left">Описание</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions?.map((transaction) => (
                    <tr key={transaction.id} className="border-t hover:bg-slate-50/60">
                      <td className="p-2">
                        {new Date(transaction.created_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="p-2">
                        {transaction.loyalty_users?.telegram_id || '-'}
                      </td>
                      <td className="p-2">
                        <Badge variant={transaction.points > 0 ? 'default' : 'destructive'}>
                          {transaction.transaction_type}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <span className={transaction.points > 0 ? 'text-green-600' : 'text-red-600'}>
                          {transaction.points > 0 ? '+' : ''}{transaction.points}
                        </span>
                      </td>
                      <td className="p-2">{transaction.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </CardContent>
          </Card>
          </TabsContent>

          <TabsContent value="cashbacks" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">История кэшбэков</h3>
              <Button onClick={() => exportData('cashbacks')} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Экспорт
              </Button>
            </div>
          <Card className="border border-gray-200 bg-white">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Дата</th>
                    <th className="p-2 text-left">Пользователь</th>
                    <th className="p-2 text-left">Сумма</th>
                    <th className="p-2 text-left">Телефон</th>
                    <th className="p-2 text-left">Статус</th>
                    <th className="p-2 text-left">Баллы</th>
                  </tr>
                </thead>
                <tbody>
                  {cashbacks?.map((cashback) => (
                    <tr key={cashback.id} className="border-t hover:bg-slate-50/60">
                      <td className="p-2">
                        {new Date(cashback.created_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="p-2">
                        {cashback.loyalty_users?.telegram_id || '-'}
                      </td>
                      <td className="p-2">
                        <Badge variant="secondary">{cashback.amount} ₽</Badge>
                      </td>
                      <td className="p-2">{cashback.phone_number}</td>
                      <td className="p-2">
                        {getStatusBadge(cashback.payment_status)}
                      </td>
                      <td className="p-2">
                        -{cashback.points_spent} (осталось: {cashback.points_remaining})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </CardContent>
          </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Активность пользователей</h3>
              <Button onClick={loadActivityData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Обновить
              </Button>
            </div>
          {/* Статистика активности */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Всего действий</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activityStats.total_actions || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Уникальных пользователей</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activityStats.unique_users || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Период</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {activityStats.period?.from} - {activityStats.period?.to}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Логи активности */}
          <Card className="border border-gray-200 bg-white">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Дата</th>
                    <th className="p-2 text-left">Пользователь</th>
                    <th className="p-2 text-left">Действие</th>
                    <th className="p-2 text-left">Данные</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLogs?.map((log: any) => (
                    <tr key={log.id} className="border-t hover:bg-slate-50/60">
                      <td className="p-2">
                        {new Date(log.created_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="p-2">{log.telegram_id}</td>
                      <td className="p-2">
                        <Badge variant="outline">{log.activity_type}</Badge>
                      </td>
                      <td className="p-2">
                        {log.activity_data ? JSON.stringify(log.activity_data) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </CardContent>
          </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Управление уведомлениями</h3>
                <div className="flex gap-2">
                  <Button onClick={sendPendingNotifications} variant="default">
                    <Send className="h-4 w-4 mr-2" />
                    Отправить ожидающие
                  </Button>
                  <Button onClick={loadNotificationData} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Обновить
                  </Button>
                </div>
              </div>

          {/* Отправка уведомлений */}
          <Card>
            <CardHeader>
              <CardTitle>Отправить уведомления</CardTitle>
              <CardDescription>
                Массовая отправка уведомлений всем пользователям
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="notification-type">Тип уведомления</Label>
                  <Select value={selectedNotificationType} onValueChange={setSelectedNotificationType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тип" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Пользовательское</SelectItem>
                      <SelectItem value="abandoned_cart">Брошенная корзина</SelectItem>
                      <SelectItem value="promotion">Акция</SelectItem>
                      <SelectItem value="new_product">Новый товар</SelectItem>
                      <SelectItem value="loyalty_points">Баллы лояльности</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notification-title">Заголовок</Label>
                  <Input
                    id="notification-title"
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    placeholder="Заголовок уведомления"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notification-message">Сообщение</Label>
                <Textarea
                  id="notification-message"
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  placeholder="Текст уведомления"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="notification-url">URL действия (необязательно)</Label>
                  <Input
                    id="notification-url"
                    value={notificationActionUrl}
                    onChange={(e) => setNotificationActionUrl(e.target.value)}
                    placeholder="https://teleshop.su/miniapp/..."
                  />
                </div>
                <div>
                  <Label htmlFor="notification-action-text">Текст кнопки (необязательно)</Label>
                  <Input
                    id="notification-action-text"
                    value={notificationActionText}
                    onChange={(e) => setNotificationActionText(e.target.value)}
                    placeholder="Открыть каталог"
                  />
                </div>
              </div>
              <Button onClick={sendNotification}>
                <Send className="h-4 w-4 mr-2" />
                Отправить уведомления
              </Button>
            </CardContent>
          </Card>

          {/* Предпросмотр уведомления */}
          <Card className="border border-gray-200 bg-white">
            <CardHeader>
              <CardTitle>Предпросмотр</CardTitle>
              <CardDescription>Как увидит пользователь в Telegram</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-w-md border border-gray-200 rounded-lg p-4 bg-white">
                <div className="text-sm font-medium text-gray-900">{notificationTitle || 'Заголовок уведомления'}</div>
                <div className="text-sm text-gray-700 mt-2 whitespace-pre-line">{notificationMessage || 'Текст уведомления...'}
                </div>
                {(notificationActionText || notificationActionUrl) && (
                  <a href="#" className="inline-flex mt-3 px-3 py-1.5 text-sm rounded-md border border-indigo-200 text-indigo-700 bg-indigo-50">
                    {notificationActionText || 'Открыть'}
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* История уведомлений */}
          <Card className="border border-gray-200 bg-white">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Дата</th>
                    <th className="p-2 text-left">Пользователь</th>
                    <th className="p-2 text-left">Тип</th>
                    <th className="p-2 text-left">Заголовок</th>
                    <th className="p-2 text-left">Статус</th>
                    <th className="p-2 text-left">Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications?.map((notification: any) => (
                    <tr key={notification.id} className="border-t hover:bg-slate-50/60">
                      <td className="p-2">
                        {new Date(notification.created_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="p-2">{notification.telegram_id}</td>
                      <td className="p-2">
                        <Badge variant="outline">{notification.notification_type}</Badge>
                      </td>
                      <td className="p-2">{notification.title}</td>
                      <td className="p-2">
                        <Badge variant={notification.is_sent ? 'default' : 'secondary'}>
                          {notification.is_sent ? 'Отправлено' : 'В очереди'}
                        </Badge>
                      </td>
                      <td className="p-2">
                        {!notification.is_sent && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => sendSingleNotification(notification.id)}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Отправить
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </CardContent>
          </Card>
          </TabsContent>
          </Tabs>
        </div>

        {/* Правая колонка */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-semibold text-gray-900">Панель лояльности</h1>
              <Button onClick={loadDashboardData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" /> Обновить
              </Button>
            </div>
          </div>

          {/* Управление балансом */}
          <Card className="border border-gray-200 bg-white">
            <CardHeader>
              <CardTitle>Баланс платформы</CardTitle>
              <CardDescription>Пополнение средств для выплат</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Input type="number" placeholder="Сумма (₽)" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
                <Button onClick={handleDeposit}><Plus className="h-4 w-4 mr-2" />Пополнить</Button>
              </div>
              <div className="text-sm text-gray-600">Текущий баланс: <span className="font-medium text-gray-900">{balance?.current_balance?.toLocaleString() || 0} ₽</span></div>
            </CardContent>
          </Card>

          {/* Корректировка баллов */}
          <Card className="border border-gray-200 bg-white">
            <CardHeader>
              <CardTitle>Корректировка баллов</CardTitle>
              <CardDescription>Ручное изменение баллов пользователя</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Telegram ID" value={adjustUserId} onChange={(e) => setAdjustUserId(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" placeholder="Баллы (+/-)" value={adjustPoints} onChange={(e) => setAdjustPoints(e.target.value)} />
                <Input placeholder="Причина" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} />
              </div>
              <Button onClick={handleAdjustPoints}><Minus className="h-4 w-4 mr-2" />Скорректировать</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 