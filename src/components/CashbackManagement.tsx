import React, { useState, useEffect } from 'react'
import { 
  Gift, 
  TrendingUp, 
  Award, 
  DollarSign, 
  CreditCard, 
  History, 
  ArrowRight,
  ArrowLeft,
  Plus,
  Minus,
  Calendar,
  User,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle,
  Clock,
  X
} from 'lucide-react'

interface CashbackTransaction {
  id: string
  user_id: string
  type: 'withdrawal' | 'accrual' | 'exchange'
  points: number
  amount?: number
  description: string
  status: 'pending' | 'completed' | 'failed'
  created_at: string
}

interface CashbackWithdrawal {
  id: string
  user_id: string
  amount: number
  points_used: number
  phone: string
  status: 'pending' | 'completed' | 'failed'
  payment_method: string
  created_at: string
}

interface CashbackManagementProps {
  loyaltyUser: any
  onBack: () => void
}

export const CashbackManagement: React.FC<CashbackManagementProps> = ({ 
  loyaltyUser, 
  onBack 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'withdraw' | 'history'>('overview')
  const [withdrawalAmount, setWithdrawalAmount] = useState<number>(50)
  const [phone, setPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [transactions, setTransactions] = useState<CashbackTransaction[]>([])
  const [withdrawals, setWithdrawals] = useState<CashbackWithdrawal[]>([])

  // Загрузка истории транзакций
  useEffect(() => {
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    try {
      const userId = loyaltyUser?.telegram_id || getTelegramUserId()
      
      if (!userId) {
        console.error('No user ID available')
        return
      }

      // Загружаем транзакции
      const transactionsResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cashback-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          action: 'get_transactions',
          data: { user_id: userId }
        })
      })

      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json()
        setTransactions(transactionsData.transactions || [])
      }

      // Загружаем выводы
      const withdrawalsResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cashback-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          action: 'get_withdrawals',
          data: { user_id: userId }
        })
      })

      if (withdrawalsResponse.ok) {
        const withdrawalsData = await withdrawalsResponse.json()
        setWithdrawals(withdrawalsData.withdrawals || [])
      }
    } catch (error) {
      console.error('Error loading transactions:', error)
    }
  }

  const getTelegramUserId = () => {
    // Получаем Telegram User ID из различных источников
    const telegramUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user
    if (telegramUser?.id) {
      return telegramUser.id.toString()
    }

    const urlParams = new URLSearchParams(window.location.search)
    const tgUserId = urlParams.get('tg_user_id') || urlParams.get('user_id')
    if (tgUserId) {
      return tgUserId
    }

    const storedUserId = localStorage.getItem('telegram_user_id')
    if (storedUserId) {
      return storedUserId
    }

    return null
  }



  const handleWithdrawal = async () => {
    if (!phone || withdrawalAmount < 50) {
      alert('Введите номер телефона и сумму не менее 50₽')
      return
    }

    setIsSubmitting(true)
    
    try {
      const userId = loyaltyUser?.telegram_id || getTelegramUserId()
      const pointsToDeduct = Math.ceil(withdrawalAmount * 0.9) // 90% от суммы

      if (!userId) {
        alert('Ошибка: не удалось определить пользователя')
        return
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cashback-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          action: 'create_withdrawal',
          data: {
            user_id: userId,
            amount: withdrawalAmount,
            phone,
            points_to_deduct: pointsToDeduct
          }
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        // Обновляем локальные данные
        setWithdrawals(prev => [result.withdrawal, ...prev])
        
        // Обновляем баллы пользователя
        if (loyaltyUser) {
          loyaltyUser.available_points -= pointsToDeduct
        }

        alert('Заявка на вывод кэшбека отправлена!')
        setActiveTab('history')
        
        // Перезагружаем данные
        await loadTransactions()
      } else {
        alert(result.error || 'Ошибка при отправке заявки')
      }
    } catch (error) {
      console.error('Error creating withdrawal:', error)
      alert('Ошибка при отправке заявки')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Выполнено'
      case 'pending':
        return 'В обработке'
      case 'failed':
        return 'Ошибка'
      default:
        return 'Неизвестно'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
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

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="text-purple-400 hover:text-purple-300 transition-colors p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-semibold">Управление кэшбеком</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="flex">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'overview' 
                ? 'text-purple-400 border-b-2 border-purple-400' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Обзор
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'withdraw' 
                ? 'text-purple-400 border-b-2 border-purple-400' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Вывод
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'history' 
                ? 'text-purple-400 border-b-2 border-purple-400' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            История
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Статистика */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-4">
              <div className="text-center mb-4">
                <Gift className="h-8 w-8 text-white mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-white">Ваши баллы</h3>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-white">{loyaltyUser?.total_points || 0}</div>
                  <div className="text-xs text-purple-200">Всего баллов</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{loyaltyUser?.available_points || 0}</div>
                  <div className="text-xs text-purple-200">Доступно</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{loyaltyUser?.completed_orders || 0}</div>
                  <div className="text-xs text-purple-200">Заказов</div>
                </div>
              </div>
            </div>

            {/* Уровень */}
            {loyaltyUser && (
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Award className="h-5 w-5 text-yellow-400" />
                    <span className="font-medium">Уровень лояльности</span>
                  </div>
                  <span className="text-purple-400 font-semibold">
                    {loyaltyUser.total_points >= 10000 ? 'VIP' :
                     loyaltyUser.total_points >= 5000 ? 'Gold' :
                     loyaltyUser.total_points >= 2000 ? 'Silver' :
                     loyaltyUser.total_points >= 500 ? 'Bronze' : 'Новичок'}
                  </span>
                </div>
              </div>
            )}

                         {/* Быстрые действия */}
             <div className="bg-gray-800 rounded-lg p-4">
               <h4 className="font-medium mb-3">Быстрые действия</h4>
               <div className="space-y-2">
                 <button
                   onClick={() => setActiveTab('withdraw')}
                   className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-between"
                 >
                   <span>Вывести кэшбек</span>
                   <ArrowRight className="h-4 w-4" />
                 </button>
                 <button
                   onClick={() => setActiveTab('history')}
                   className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-between"
                 >
                   <span>История операций</span>
                   <History className="h-4 w-4" />
                 </button>
               </div>
             </div>
          </div>
        )}

        {activeTab === 'withdraw' && (
          <div className="space-y-4">
            {/* Форма вывода */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium mb-4">Вывод кэшбека</h4>
              
              <div className="space-y-4">
                {/* Сумма */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Сумма вывода (₽)
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setWithdrawalAmount(Math.max(50, withdrawalAmount - 50))}
                      className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      value={withdrawalAmount}
                      onChange={(e) => setWithdrawalAmount(Number(e.target.value))}
                      min="50"
                      max={loyaltyUser?.available_points || 0}
                      className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                    <button
                      onClick={() => setWithdrawalAmount(withdrawalAmount + 50)}
                      className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Минимум 50₽, максимум {loyaltyUser?.available_points || 0} баллов
                  </p>
                </div>

                {/* Номер телефона */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Номер телефона для СБП
                  </label>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+7 (999) 123-45-67"
                      className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                </div>

                {/* Информация о комиссии */}
                <div className="bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">Сумма вывода:</span>
                    <span className="text-white">{formatPrice(withdrawalAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">Комиссия (10%):</span>
                    <span className="text-red-400">-{formatPrice(withdrawalAmount * 0.1)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="text-gray-300">К выплате:</span>
                    <span className="text-green-400">{formatPrice(withdrawalAmount * 0.9)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">Баллов к списанию:</span>
                    <span className="text-purple-400">{Math.ceil(withdrawalAmount * 0.9)}</span>
                  </div>
                </div>

                {/* Кнопка вывода */}
                <button
                  onClick={handleWithdrawal}
                  disabled={isSubmitting || !phone || withdrawalAmount < 50 || withdrawalAmount > (loyaltyUser?.available_points || 0)}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Обработка...</span>
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-4 w-4" />
                      <span>Вывести кэшбек</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Условия */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h5 className="font-medium mb-2">Условия вывода</h5>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Минимальная сумма: 50₽</li>
                <li>• Комиссия: 10% от суммы</li>
                <li>• Выплата через СБП на номер телефона</li>
                <li>• Обработка заявки: 1-3 рабочих дня</li>
                <li>• Необходимо минимум 2 заказа для первого вывода</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            {/* История транзакций */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium mb-4">История операций</h4>
              
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {transaction.type === 'withdrawal' ? (
                        <DollarSign className="h-5 w-5 text-red-400" />
                      ) : transaction.type === 'accrual' ? (
                        <Plus className="h-5 w-5 text-green-400" />
                      ) : (
                        <Gift className="h-5 w-5 text-purple-400" />
                      )}
                      <div>
                        <div className="font-medium text-white">{transaction.description}</div>
                        <div className="text-xs text-gray-400">{formatDate(transaction.created_at)}</div>
                      </div>
                    </div>
                                           <div className="text-right">
                         <div className={`font-medium ${
                           transaction.type === 'withdrawal' ? 'text-red-400' : 'text-green-400'
                         }`}>
                           {transaction.type === 'withdrawal' ? '-' : '+'}
                           {transaction.type === 'withdrawal' ? 
                             (transaction.amount ? formatPrice(transaction.amount) : `${Math.abs(transaction.points)} баллов`) : 
                             `${transaction.points} баллов`
                           }
                         </div>
                         <div className="flex items-center space-x-1 text-xs text-gray-400">
                           {getStatusIcon(transaction.status)}
                           <span>{getStatusText(transaction.status)}</span>
                         </div>
                       </div>
                  </div>
                ))}
              </div>
            </div>

            {/* История выводов */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium mb-4">История выводов</h4>
              
              <div className="space-y-3">
                {withdrawals.map((withdrawal) => (
                  <div key={withdrawal.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <DollarSign className="h-5 w-5 text-red-400" />
                      <div>
                        <div className="font-medium text-white">Вывод на СБП</div>
                        <div className="text-xs text-gray-400">
                          {withdrawal.phone} • {formatDate(withdrawal.created_at)}
                        </div>
                      </div>
                    </div>
                                         <div className="text-right">
                       <div className="font-medium text-red-400">
                         -{formatPrice(withdrawal.amount)}
                       </div>
                       <div className="text-xs text-gray-400">
                         {withdrawal.points_used} баллов
                       </div>
                       <div className="flex items-center space-x-1 text-xs text-gray-400">
                         {getStatusIcon(withdrawal.status)}
                         <span>{getStatusText(withdrawal.status)}</span>
                       </div>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 