import React, { useEffect, useState, useMemo } from 'react'
import { 
  Heart, 
  Gift, 
  Star,
  Trophy,
  Target,
  TrendingUp,
  Users,
  Percent,
  DollarSign,
  Calendar,
  Clock,
  Award,
  Zap,
  Settings,
  Plus,
  Edit,
  Trash2,
  RefreshCcw,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Crown,
  Medal
} from 'lucide-react'
import { cn } from '@/lib/utils'

type LoyaltyProgram = {
  id: string
  name: string
  description: string
  status: 'active' | 'paused' | 'draft'
  type: 'points' | 'cashback' | 'discount' | 'tiered'
  rules: {
    earnRate: number // баллов за 100 рублей
    burnRate: number // рублей за 1 балл
    minOrderAmount?: number
    maxPointsPerOrder?: number
    expirationDays?: number
  }
  tiers?: {
    name: string
    minPoints: number
    benefits: string[]
    color: string
  }[]
  statistics: {
    totalMembers: number
    activeMembers: number
    totalPointsIssued: number
    totalPointsRedeemed: number
    avgPointsPerMember: number
  }
}

type Promotion = {
  id: string
  name: string
  type: 'bonus' | 'multiplier' | 'discount' | 'gift'
  status: 'active' | 'scheduled' | 'ended'
  startDate: string
  endDate: string
  conditions: {
    minAmount?: number
    categories?: string[]
    customerSegments?: string[]
  }
  reward: {
    type: string
    value: number
  }
  usage: {
    total: number
    unique: number
    revenue: number
  }
}

type Achievement = {
  id: string
  name: string
  description: string
  icon: string
  condition: string
  reward: {
    points?: number
    badge?: string
    discount?: number
  }
  progress?: {
    current: number
    target: number
    achieved: number
  }
}

export default function LoyaltyPage() {
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'programs' | 'promotions' | 'achievements' | 'analytics'>('programs')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Заглушка с демо данными
      const mockPrograms: LoyaltyProgram[] = [
        {
          id: '1',
          name: 'Основная программа лояльности',
          description: 'Накапливайте баллы с каждой покупки и обменивайте их на скидки',
          status: 'active',
          type: 'points',
          rules: {
            earnRate: 5,
            burnRate: 1,
            minOrderAmount: 500,
            maxPointsPerOrder: 500,
            expirationDays: 365
          },
          statistics: {
            totalMembers: 1284,
            activeMembers: 428,
            totalPointsIssued: 456780,
            totalPointsRedeemed: 234560,
            avgPointsPerMember: 356
          }
        },
        {
          id: '2',
          name: 'VIP уровни',
          description: 'Эксклюзивные привилегии для самых активных покупателей',
          status: 'active',
          type: 'tiered',
          rules: {
            earnRate: 10,
            burnRate: 0.5
          },
          tiers: [
            {
              name: 'Бронза',
              minPoints: 0,
              benefits: ['5% скидка', 'Бесплатная доставка от 3000₽'],
              color: 'badge-ghost'
            },
            {
              name: 'Серебро',
              minPoints: 1000,
              benefits: ['7% скидка', 'Бесплатная доставка от 2000₽', 'Ранний доступ к распродажам'],
              color: 'badge-outline'
            },
            {
              name: 'Золото',
              minPoints: 5000,
              benefits: ['10% скидка', 'Бесплатная доставка всегда', 'Персональный менеджер', 'Подарок на ДР'],
              color: 'badge-warning'
            },
            {
              name: 'Платина',
              minPoints: 10000,
              benefits: ['15% скидка', 'VIP обслуживание', 'Эксклюзивные предложения', 'Кешбэк 3%'],
              color: 'badge-accent'
            }
          ],
          statistics: {
            totalMembers: 856,
            activeMembers: 342,
            totalPointsIssued: 789000,
            totalPointsRedeemed: 456000,
            avgPointsPerMember: 922
          }
        }
      ]

      const mockPromotions: Promotion[] = [
        {
          id: '1',
          name: 'Двойные баллы на электронику',
          type: 'multiplier',
          status: 'active',
          startDate: '2024-12-20T00:00:00',
          endDate: '2024-12-31T23:59:59',
          conditions: {
            categories: ['Электроника']
          },
          reward: {
            type: 'multiplier',
            value: 2
          },
          usage: {
            total: 234,
            unique: 189,
            revenue: 1234000
          }
        },
        {
          id: '2',
          name: 'Бонус за первую покупку',
          type: 'bonus',
          status: 'active',
          startDate: '2024-12-01T00:00:00',
          endDate: '2024-12-31T23:59:59',
          conditions: {
            customerSegments: ['new']
          },
          reward: {
            type: 'points',
            value: 500
          },
          usage: {
            total: 94,
            unique: 94,
            revenue: 456000
          }
        },
        {
          id: '3',
          name: 'Скидка 20% для VIP клиентов',
          type: 'discount',
          status: 'scheduled',
          startDate: '2025-01-01T00:00:00',
          endDate: '2025-01-15T23:59:59',
          conditions: {
            customerSegments: ['vip'],
            minAmount: 5000
          },
          reward: {
            type: 'percent',
            value: 20
          },
          usage: {
            total: 0,
            unique: 0,
            revenue: 0
          }
        },
        {
          id: '4',
          name: 'Подарок за покупку от 10000₽',
          type: 'gift',
          status: 'ended',
          startDate: '2024-11-01T00:00:00',
          endDate: '2024-11-30T23:59:59',
          conditions: {
            minAmount: 10000
          },
          reward: {
            type: 'gift',
            value: 1
          },
          usage: {
            total: 45,
            unique: 42,
            revenue: 567000
          }
        }
      ]

      const mockAchievements: Achievement[] = [
        {
          id: '1',
          name: 'Первая покупка',
          description: 'Совершите свою первую покупку',
          icon: 'shopping-bag',
          condition: 'orders >= 1',
          reward: {
            points: 100,
            badge: 'Новичок'
          },
          progress: {
            current: 1284,
            target: 1,
            achieved: 1284
          }
        },
        {
          id: '2',
          name: 'Постоянный покупатель',
          description: 'Совершите 10 покупок',
          icon: 'star',
          condition: 'orders >= 10',
          reward: {
            points: 500,
            badge: 'Постоянный клиент'
          },
          progress: {
            current: 342,
            target: 10,
            achieved: 342
          }
        },
        {
          id: '3',
          name: 'Big Spender',
          description: 'Потратьте более 100 000₽',
          icon: 'dollar',
          condition: 'totalSpent >= 100000',
          reward: {
            points: 2000,
            badge: 'VIP',
            discount: 5
          },
          progress: {
            current: 67,
            target: 100000,
            achieved: 67
          }
        },
        {
          id: '4',
          name: 'Коллекционер',
          description: 'Купите товары из 5 разных категорий',
          icon: 'collection',
          condition: 'categories >= 5',
          reward: {
            points: 300,
            badge: 'Исследователь'
          },
          progress: {
            current: 456,
            target: 5,
            achieved: 456
          }
        },
        {
          id: '5',
          name: 'Рекомендатель',
          description: 'Пригласите 3 друзей',
          icon: 'users',
          condition: 'referrals >= 3',
          reward: {
            points: 1000,
            badge: 'Амбассадор'
          },
          progress: {
            current: 123,
            target: 3,
            achieved: 123
          }
        }
      ]

      setPrograms(mockPrograms)
      setPromotions(mockPromotions)
      setAchievements(mockAchievements)
    } catch (e) {
      console.error('Failed to load loyalty data', e)
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const totalMembers = programs.reduce((sum, p) => sum + p.statistics.totalMembers, 0)
    const activeMembers = programs.reduce((sum, p) => sum + p.statistics.activeMembers, 0)
    const totalPointsIssued = programs.reduce((sum, p) => sum + p.statistics.totalPointsIssued, 0)
    const totalPointsRedeemed = programs.reduce((sum, p) => sum + p.statistics.totalPointsRedeemed, 0)
    const activePromotions = promotions.filter(p => p.status === 'active').length
    const totalAchievements = achievements.length
    const avgAchievementRate = achievements.length > 0
      ? achievements.reduce((sum, a) => sum + (a.progress?.achieved || 0), 0) / achievements.length / 1284 * 100
      : 0

    return {
      totalMembers,
      activeMembers,
      totalPointsIssued,
      totalPointsRedeemed,
      activePromotions,
      totalAchievements,
      avgAchievementRate,
      engagementRate: totalMembers > 0 ? (activeMembers / totalMembers * 100) : 0
    }
  }, [programs, promotions, achievements])

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('ru-RU').format(value)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <div className="badge badge-success gap-1">
            <CheckCircle className="h-3 w-3" />
            Активна
          </div>
        )
      case 'scheduled':
        return (
          <div className="badge badge-info gap-1">
            <Clock className="h-3 w-3" />
            Запланирована
          </div>
        )
      case 'paused':
        return (
          <div className="badge badge-warning gap-1">
            <AlertTriangle className="h-3 w-3" />
            На паузе
          </div>
        )
      case 'ended':
        return (
          <div className="badge badge-ghost gap-1">
            <XCircle className="h-3 w-3" />
            Завершена
          </div>
        )
      case 'draft':
        return (
          <div className="badge badge-outline gap-1">
            <Edit className="h-3 w-3" />
            Черновик
          </div>
        )
      default:
        return null
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
        <div className="stat">
          <div className="stat-figure text-primary">
            <Users className="h-8 w-8" />
          </div>
          <div className="stat-title">Участники программы</div>
          <div className="stat-value text-primary">{formatNumber(stats.totalMembers)}</div>
          <div className="stat-desc">
            {formatNumber(stats.activeMembers)} активных ({formatPercent(stats.engagementRate)})
          </div>
        </div>
        <div className="stat">
          <div className="stat-figure text-secondary">
            <Star className="h-8 w-8" />
          </div>
          <div className="stat-title">Баллы начислено</div>
          <div className="stat-value text-secondary">{formatNumber(stats.totalPointsIssued)}</div>
          <div className="stat-desc">
            Использовано: {formatNumber(stats.totalPointsRedeemed)}
          </div>
        </div>
        <div className="stat">
          <div className="stat-figure text-success">
            <Gift className="h-8 w-8" />
          </div>
          <div className="stat-title">Активных акций</div>
          <div className="stat-value text-success">{stats.activePromotions}</div>
          <div className="stat-desc">Из {promotions.length} всего</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-warning">
            <Trophy className="h-8 w-8" />
          </div>
          <div className="stat-title">Достижения</div>
          <div className="stat-value text-warning">{stats.totalAchievements}</div>
          <div className="stat-desc">
            Выполнение: {formatPercent(stats.avgAchievementRate)}
          </div>
        </div>
      </div>

      {/* Заголовок и действия */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="h-7 w-7 text-primary" />
            Программа лояльности
          </h2>
          <p className="text-base-content/60">Управление системой поощрений</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-sm btn-ghost">
            <Download className="h-4 w-4" />
            Экспорт
          </button>
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="h-4 w-4" />
            Создать
          </button>
          <button className="btn btn-ghost btn-sm" onClick={loadData}>
            <RefreshCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Вкладки */}
      <div className="tabs tabs-boxed">
        <a 
          className={cn("tab", activeTab === 'programs' && "tab-active")}
          onClick={() => setActiveTab('programs')}
        >
          <Award className="h-4 w-4 mr-2" />
          Программы
        </a>
        <a 
          className={cn("tab", activeTab === 'promotions' && "tab-active")}
          onClick={() => setActiveTab('promotions')}
        >
          <Percent className="h-4 w-4 mr-2" />
          Акции
        </a>
        <a 
          className={cn("tab", activeTab === 'achievements' && "tab-active")}
          onClick={() => setActiveTab('achievements')}
        >
          <Trophy className="h-4 w-4 mr-2" />
          Достижения
        </a>
        <a 
          className={cn("tab", activeTab === 'analytics' && "tab-active")}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Аналитика
        </a>
      </div>

      {/* Контент */}
      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : (
        <>
          {/* Программы лояльности */}
          {activeTab === 'programs' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {programs.map(program => (
                <div key={program.id} className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="card-title">{program.name}</h3>
                        <p className="text-sm opacity-60 mt-1">{program.description}</p>
                      </div>
                      {getStatusBadge(program.status)}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                        <div>
                          <p className="text-sm opacity-60">Правила начисления</p>
                          <p className="font-bold">{program.rules.earnRate} баллов за 100₽</p>
                        </div>
                        <Zap className="h-5 w-5 text-warning" />
                      </div>

                      {program.tiers ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Уровни программы:</p>
                          {program.tiers.map(tier => (
                            <div key={tier.name} className="flex items-center justify-between p-2 bg-base-200 rounded">
                              <div className="flex items-center gap-2">
                                <div className={cn("badge", tier.color)}>
                                  {tier.name}
                                </div>
                                <span className="text-sm opacity-60">от {tier.minPoints} баллов</span>
                              </div>
                              {tier.name === 'Платина' && <Crown className="h-4 w-4 text-warning" />}
                              {tier.name === 'Золото' && <Medal className="h-4 w-4 text-warning" />}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="opacity-60">Мин. заказ</p>
                            <p className="font-medium">{program.rules.minOrderAmount}₽</p>
                          </div>
                          <div>
                            <p className="opacity-60">Макс. баллов</p>
                            <p className="font-medium">{program.rules.maxPointsPerOrder}</p>
                          </div>
                          <div>
                            <p className="opacity-60">Срок действия</p>
                            <p className="font-medium">{program.rules.expirationDays} дней</p>
                          </div>
                          <div>
                            <p className="opacity-60">Курс обмена</p>
                            <p className="font-medium">1 балл = {program.rules.burnRate}₽</p>
                          </div>
                        </div>
                      )}

                      <div className="divider"></div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs opacity-60">Участников</p>
                          <p className="font-bold">{formatNumber(program.statistics.totalMembers)}</p>
                        </div>
                        <div>
                          <p className="text-xs opacity-60">Активных</p>
                          <p className="font-bold">{formatNumber(program.statistics.activeMembers)}</p>
                        </div>
                        <div>
                          <p className="text-xs opacity-60">Начислено</p>
                          <p className="font-bold">{formatNumber(program.statistics.totalPointsIssued)}</p>
                        </div>
                        <div>
                          <p className="text-xs opacity-60">Использовано</p>
                          <p className="font-bold">{formatNumber(program.statistics.totalPointsRedeemed)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="card-actions justify-end mt-4">
                      <button className="btn btn-sm btn-ghost">
                        <Settings className="h-4 w-4" />
                      </button>
                      <button className="btn btn-sm btn-ghost">
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Акции */}
          {activeTab === 'promotions' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {promotions.map(promo => (
                <div key={promo.id} className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold">{promo.name}</h3>
                      {getStatusBadge(promo.status)}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 opacity-60" />
                        <span>{formatDate(promo.startDate)} - {formatDate(promo.endDate)}</span>
                      </div>
                      
                      {promo.conditions.minAmount && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 opacity-60" />
                          <span>От {promo.conditions.minAmount}₽</span>
                        </div>
                      )}
                      
                      {promo.conditions.categories && (
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 opacity-60" />
                          <span>{promo.conditions.categories.join(', ')}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-primary/10 rounded-lg mt-3">
                      <p className="text-xs opacity-60 mb-1">Награда</p>
                      <p className="font-bold flex items-center gap-2">
                        {promo.type === 'multiplier' && <Sparkles className="h-4 w-4 text-primary" />}
                        {promo.type === 'bonus' && <Gift className="h-4 w-4 text-success" />}
                        {promo.type === 'discount' && <Percent className="h-4 w-4 text-warning" />}
                        {promo.reward.type === 'multiplier' && `x${promo.reward.value} баллов`}
                        {promo.reward.type === 'points' && `${promo.reward.value} баллов`}
                        {promo.reward.type === 'percent' && `${promo.reward.value}% скидка`}
                        {promo.reward.type === 'gift' && 'Подарок'}
                      </p>
                    </div>

                    {promo.status !== 'scheduled' && (
                      <>
                        <div className="divider my-2"></div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-xs opacity-60">Использований</p>
                            <p className="font-bold">{promo.usage.total}</p>
                          </div>
                          <div>
                            <p className="text-xs opacity-60">Клиентов</p>
                            <p className="font-bold">{promo.usage.unique}</p>
                          </div>
                          <div>
                            <p className="text-xs opacity-60">Выручка</p>
                            <p className="font-bold text-sm">
                              {new Intl.NumberFormat('ru-RU', { 
                                notation: 'compact',
                                maximumFractionDigits: 1 
                              }).format(promo.usage.revenue)}₽
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="card-actions justify-end mt-3">
                      <button className="btn btn-xs btn-ghost">
                        <Edit className="h-4 w-4" />
                      </button>
                      {promo.status === 'active' && (
                        <button className="btn btn-xs btn-ghost text-warning">
                          <AlertTriangle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Достижения */}
          {activeTab === 'achievements' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map(achievement => (
                <div key={achievement.id} className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <div className="flex items-start gap-3">
                      <div className="p-3 bg-warning/10 rounded-lg">
                        <Trophy className="h-6 w-6 text-warning" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold">{achievement.name}</h3>
                        <p className="text-sm opacity-60 mt-1">{achievement.description}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm opacity-60">Прогресс</span>
                        <span className="text-sm font-bold">
                          {achievement.progress?.achieved} / {stats.totalMembers}
                        </span>
                      </div>
                      <progress 
                        className="progress progress-warning" 
                        value={achievement.progress?.achieved} 
                        max={stats.totalMembers}
                      />
                      <p className="text-xs opacity-60 mt-1">
                        {((achievement.progress?.achieved || 0) / stats.totalMembers * 100).toFixed(1)}% участников
                      </p>
                    </div>

                    <div className="divider my-2"></div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Награда:</p>
                      <div className="flex flex-wrap gap-2">
                        {achievement.reward.points && (
                          <div className="badge badge-ghost gap-1">
                            <Star className="h-3 w-3" />
                            {achievement.reward.points} баллов
                          </div>
                        )}
                        {achievement.reward.badge && (
                          <div className="badge badge-primary gap-1">
                            <Award className="h-3 w-3" />
                            {achievement.reward.badge}
                          </div>
                        )}
                        {achievement.reward.discount && (
                          <div className="badge badge-success gap-1">
                            <Percent className="h-3 w-3" />
                            {achievement.reward.discount}% скидка
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="card-actions justify-end mt-3">
                      <button className="btn btn-xs btn-ghost">
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Аналитика */}
          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h3 className="card-title">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Динамика участников
                  </h3>
                  <div className="space-y-3 mt-4">
                    {['Январь', 'Февраль', 'Март', 'Апрель', 'Май'].map((month, idx) => (
                      <div key={month} className="flex items-center justify-between">
                        <span className="text-sm">{month}</span>
                        <div className="flex items-center gap-2">
                          <progress 
                            className="progress progress-primary w-32" 
                            value={20 + idx * 15} 
                            max="100"
                          />
                          <span className="text-sm font-bold">+{20 + idx * 15}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h3 className="card-title">
                    <Target className="h-5 w-5 text-success" />
                    Эффективность акций
                  </h3>
                  <div className="space-y-3 mt-4">
                    {promotions.slice(0, 4).map(promo => (
                      <div key={promo.id} className="flex items-center justify-between">
                        <span className="text-sm truncate flex-1">{promo.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm opacity-60">ROI:</span>
                          <span className="font-bold text-success">
                            {(Math.random() * 300 + 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}