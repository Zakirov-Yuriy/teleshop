import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  PieChart,
  LineChart,
  Activity,
  Target,
  Zap,
  Clock,
  Users,
  ShoppingCart,
  Package,
  DollarSign,
  Eye,
  MousePointer,
  Smartphone,
  Monitor,
  Globe
} from 'lucide-react'
import { supabase, auth } from '@/lib/supabase'
import { formatPrice, formatDate } from '@/lib/utils'

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<any>(null)

  useEffect(() => {
    loadAnalyticsData()
  }, [])

  const loadAnalyticsData = async () => {
    setLoading(true)
    try {
      const user = await auth.getCurrentUser()
      if (!user) return

      // Получаем магазины пользователя
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id, name')
        .eq('owner_id', user.id)
        .eq('status', 'active')

      if (storesError) throw storesError

      const storeIds = stores?.map(s => s.id) || []
      if (storeIds.length === 0) {
        setAnalyticsData({
          stores: [],
          totalRevenue: 0,
          totalOrders: 0,
          totalCustomers: 0,
          conversionRate: 0,
          avgOrderValue: 0,
          topChannels: [],
          deviceStats: [],
          timeStats: []
        })
        return
      }

      // Загружаем данные для аналитики
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          customers (
            id,
            created_at
          ),
          stores (
            name
          )
        `)
        .in('store_id', storeIds)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      if (ordersError) throw ordersError

      // Вычисляем метрики
      const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0
      const totalOrders = orders?.length || 0
      const uniqueCustomers = new Set(orders?.map(o => o.customer_id).filter(Boolean)).size
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

      // Генерируем данные для демонстрации (в реальном приложении это будут реальные данные)
      const mockData = {
        stores: stores || [],
        totalRevenue,
        totalOrders,
        totalCustomers: uniqueCustomers,
        conversionRate: Math.random() * 10 + 2, // 2-12%
        avgOrderValue,
        topChannels: [
          { name: 'Telegram', visitors: 1250, conversions: 89, rate: 7.1 },
          { name: 'Прямые переходы', visitors: 890, conversions: 45, rate: 5.1 },
          { name: 'Поиск', visitors: 650, conversions: 32, rate: 4.9 },
          { name: 'Социальные сети', visitors: 420, conversions: 18, rate: 4.3 }
        ],
        deviceStats: [
          { device: 'Мобильные', percentage: 68, users: 2140 },
          { device: 'Десктоп', percentage: 28, users: 880 },
          { device: 'Планшеты', percentage: 4, users: 126 }
        ],
        timeStats: [
          { hour: '00:00', orders: 2 },
          { hour: '06:00', orders: 8 },
          { hour: '12:00', orders: 45 },
          { hour: '18:00', orders: 67 },
          { hour: '21:00', orders: 38 }
        ],
        geographyStats: [
          { region: 'Москва', orders: 156, percentage: 35 },
          { region: 'Санкт-Петербург', orders: 89, percentage: 20 },
          { region: 'Екатеринбург', orders: 45, percentage: 10 },
          { region: 'Новосибирск', orders: 34, percentage: 8 },
          { region: 'Другие', orders: 120, percentage: 27 }
        ]
      }

      setAnalyticsData(mockData)
    } catch (error) {
      console.error('Error loading analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Нет данных для аналитики
        </h3>
        <p className="text-gray-600">
          Данные появятся после первых заказов в ваших магазинах
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Аналитика</h1>
          <p className="text-gray-600 mt-1">
            Детальная аналитика поведения клиентов и эффективности
          </p>
        </div>
        <Button variant="outline" onClick={loadAnalyticsData}>
          <Activity className="h-4 w-4 mr-2" />
          Обновить данные
        </Button>
      </div>

      {/* Ключевые метрики */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Выручка (30 дней)</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatPrice(analyticsData.totalRevenue)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Заказы</p>
                <p className="text-2xl font-bold text-blue-600">
                  {analyticsData.totalOrders}
                </p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Клиенты</p>
                <p className="text-2xl font-bold text-purple-600">
                  {analyticsData.totalCustomers}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Конверсия</p>
                <p className="text-2xl font-bold text-orange-600">
                  {analyticsData.conversionRate.toFixed(1)}%
                </p>
              </div>
              <Target className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Средний чек</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {formatPrice(analyticsData.avgOrderValue)}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="traffic" className="space-y-6">
        <TabsList>
          <TabsTrigger value="traffic">Трафик</TabsTrigger>
          <TabsTrigger value="behavior">Поведение</TabsTrigger>
          <TabsTrigger value="conversion">Конверсии</TabsTrigger>
          <TabsTrigger value="geography">География</TabsTrigger>
        </TabsList>

        {/* Трафик */}
        <TabsContent value="traffic">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  Источники трафика
                </CardTitle>
                <CardDescription>
                  Откуда приходят ваши клиенты
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.topChannels.map((channel: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{channel.name}</p>
                          <p className="text-sm text-gray-600">
                            {channel.visitors} посетителей
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          {channel.conversions} конверсий
                        </p>
                        <p className="text-sm text-gray-600">
                          {channel.rate}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Smartphone className="h-5 w-5 mr-2" />
                  Устройства
                </CardTitle>
                <CardDescription>
                  Распределение по типам устройств
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.deviceStats.map((device: any, index: number) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">{device.device}</span>
                        <span className="text-sm text-gray-600">
                          {device.percentage}% ({device.users} пользователей)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${device.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Поведение */}
        <TabsContent value="behavior">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Активность по времени
                </CardTitle>
                <CardDescription>
                  Когда клиенты наиболее активны
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <LineChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">График активности по часам</p>
                    <p className="text-sm text-gray-500">Пик активности: 18:00-21:00</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MousePointer className="h-5 w-5 mr-2" />
                  Взаимодействие с контентом
                </CardTitle>
                <CardDescription>
                  Как клиенты взаимодействуют с товарами
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Eye className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Просмотры товаров</span>
                    </div>
                    <span className="text-xl font-bold text-blue-600">2,847</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <ShoppingCart className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Добавления в корзину</span>
                    </div>
                    <span className="text-xl font-bold text-green-600">456</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Zap className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">Быстрые заказы</span>
                    </div>
                    <span className="text-xl font-bold text-purple-600">123</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Конверсии */}
        <TabsContent value="conversion">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Воронка продаж
                </CardTitle>
                <CardDescription>
                  Путь клиента от просмотра до покупки
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <span className="font-medium">Посетители</span>
                    <div className="text-right">
                      <span className="text-xl font-bold text-blue-600">3,150</span>
                      <div className="text-sm text-gray-600">100%</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <span className="font-medium">Просмотрели товары</span>
                    <div className="text-right">
                      <span className="text-xl font-bold text-green-600">2,847</span>
                      <div className="text-sm text-gray-600">90.4%</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                    <span className="font-medium">Добавили в корзину</span>
                    <div className="text-right">
                      <span className="text-xl font-bold text-yellow-600">456</span>
                      <div className="text-sm text-gray-600">14.5%</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                    <span className="font-medium">Оформили заказ</span>
                    <div className="text-right">
                      <span className="text-xl font-bold text-purple-600">234</span>
                      <div className="text-sm text-gray-600">7.4%</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Динамика конверсий
                </CardTitle>
                <CardDescription>
                  Изменение конверсии за последние 30 дней
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <LineChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">График конверсии</p>
                    <div className="flex items-center justify-center mt-2">
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-sm text-green-600">+2.3% за месяц</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* География */}
        <TabsContent value="geography">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  География заказов
                </CardTitle>
                <CardDescription>
                  Распределение заказов по регионам
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.geographyStats.map((region: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-green-600">
                            {index + 1}
                          </span>
                        </div>
                        <span className="font-medium">{region.region}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{region.orders} заказов</p>
                        <p className="text-sm text-gray-600">{region.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Карта активности</CardTitle>
                <CardDescription>
                  Визуализация географического распределения
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Интерактивная карта</p>
                    <p className="text-sm text-gray-500">Тепловая карта заказов по регионам</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}