import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  PieChart,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  Filter,
  RefreshCw
} from 'lucide-react'
import { supabase, auth } from '@/lib/supabase'
import { formatPrice, formatDate } from '@/lib/utils'

interface ReportData {
  period: string
  revenue: number
  orders: number
  products: number
  customers: number
  avgOrderValue: number
  conversionRate: number
  topProducts: Array<{
    name: string
    sales: number
    revenue: number
  }>
  topStores: Array<{
    name: string
    orders: number
    revenue: number
  }>
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [reportData, setReportData] = useState<ReportData | null>(null)

  useEffect(() => {
    loadReportData()
  }, [selectedPeriod])

  const loadReportData = async () => {
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
        setReportData({
          period: selectedPeriod,
          revenue: 0,
          orders: 0,
          products: 0,
          customers: 0,
          avgOrderValue: 0,
          conversionRate: 0,
          topProducts: [],
          topStores: []
        })
        return
      }

      // Определяем период
      const now = new Date()
      let startDate = new Date()
      
      switch (selectedPeriod) {
        case 'week':
          startDate.setDate(now.getDate() - 7)
          break
        case 'month':
          startDate.setMonth(now.getMonth() - 1)
          break
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3)
          break
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1)
          break
      }

      // Загружаем заказы за период
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            price,
            products (
              name
            )
          ),
          stores (
            name
          )
        `)
        .in('store_id', storeIds)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      // Загружаем товары
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id')
        .in('store_id', storeIds)

      if (productsError) throw productsError

      // Загружаем клиентов
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id')
        .in('id', orders?.map(o => o.customer_id).filter(Boolean) || [])

      if (customersError) throw customersError

      // Вычисляем метрики
      const revenue = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0
      const ordersCount = orders?.length || 0
      const productsCount = products?.length || 0
      const customersCount = customers?.length || 0
      const avgOrderValue = ordersCount > 0 ? revenue / ordersCount : 0

      // Топ товары
      const productSales = new Map()
      orders?.forEach(order => {
        order.order_items?.forEach((item: any) => {
          const productName = item.products?.name || 'Неизвестный товар'
          const existing = productSales.get(productName) || { sales: 0, revenue: 0 }
          productSales.set(productName, {
            sales: existing.sales + item.quantity,
            revenue: existing.revenue + (item.price * item.quantity)
          })
        })
      })

      const topProducts = Array.from(productSales.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      // Топ магазины
      const storeSales = new Map()
      orders?.forEach(order => {
        const storeName = order.stores?.name || 'Неизвестный магазин'
        const existing = storeSales.get(storeName) || { orders: 0, revenue: 0 }
        storeSales.set(storeName, {
          orders: existing.orders + 1,
          revenue: existing.revenue + Number(order.total_amount)
        })
      })

      const topStores = Array.from(storeSales.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      setReportData({
        period: selectedPeriod,
        revenue,
        orders: ordersCount,
        products: productsCount,
        customers: customersCount,
        avgOrderValue,
        conversionRate: customersCount > 0 ? (ordersCount / customersCount) * 100 : 0,
        topProducts,
        topStores
      })
    } catch (error) {
      console.error('Error loading report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportReport = (format: 'pdf' | 'excel') => {
    // В реальном приложении здесь будет логика экспорта
    alert(`Экспорт в ${format.toUpperCase()} будет доступен в следующих версиях`)
  }

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'week': return 'За неделю'
      case 'month': return 'За месяц'
      case 'quarter': return 'За квартал'
      case 'year': return 'За год'
      default: return 'За период'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Отчеты</h1>
          <p className="text-gray-600 mt-1">
            Детальная аналитика продаж и эффективности
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => loadReportData()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Обновить
          </Button>
          <Button variant="outline" onClick={() => exportReport('excel')}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" onClick={() => exportReport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Фильтры периода */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <Calendar className="h-5 w-5 text-gray-400" />
            <span className="font-medium">Период:</span>
            <div className="flex space-x-2">
              {[
                { value: 'week', label: 'Неделя' },
                { value: 'month', label: 'Месяц' },
                { value: 'quarter', label: 'Квартал' },
                { value: 'year', label: 'Год' }
              ].map((period) => (
                <Button
                  key={period.value}
                  size="sm"
                  variant={selectedPeriod === period.value ? "default" : "outline"}
                  onClick={() => setSelectedPeriod(period.value)}
                >
                  {period.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <>
          {/* Основные метрики */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Выручка</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatPrice(reportData.revenue)}
                    </p>
                    <div className="flex items-center mt-1">
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-sm text-green-600">+12.5%</span>
                    </div>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Заказы</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {reportData.orders}
                    </p>
                    <div className="flex items-center mt-1">
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-sm text-green-600">+8.2%</span>
                    </div>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Средний чек</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatPrice(reportData.avgOrderValue)}
                    </p>
                    <div className="flex items-center mt-1">
                      <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                      <span className="text-sm text-red-600">-2.1%</span>
                    </div>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Конверсия</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {reportData.conversionRate.toFixed(1)}%
                    </p>
                    <div className="flex items-center mt-1">
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-sm text-green-600">+5.3%</span>
                    </div>
                  </div>
                  <PieChart className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Обзор</TabsTrigger>
              <TabsTrigger value="products">Товары</TabsTrigger>
              <TabsTrigger value="stores">Магазины</TabsTrigger>
              <TabsTrigger value="customers">Клиенты</TabsTrigger>
            </TabsList>

            {/* Обзор */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Динамика продаж</CardTitle>
                    <CardDescription>
                      {getPeriodLabel(selectedPeriod)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">График продаж</p>
                        <p className="text-sm text-gray-500">Интерактивный график будет здесь</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Распределение по категориям</CardTitle>
                    <CardDescription>
                      Структура продаж по категориям товаров
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">Круговая диаграмма</p>
                        <p className="text-sm text-gray-500">Распределение по категориям</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Товары */}
            <TabsContent value="products">
              <Card>
                <CardHeader>
                  <CardTitle>Топ товары по продажам</CardTitle>
                  <CardDescription>
                    Самые продаваемые товары {getPeriodLabel(selectedPeriod).toLowerCase()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {reportData.topProducts.length > 0 ? (
                    <div className="space-y-4">
                      {reportData.topProducts.map((product, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-bold text-purple-600">
                                {index + 1}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-gray-600">
                                Продано: {product.sales} шт.
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">
                              {formatPrice(product.revenue)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600">Нет данных о продажах товаров</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Магазины */}
            <TabsContent value="stores">
              <Card>
                <CardHeader>
                  <CardTitle>Эффективность магазинов</CardTitle>
                  <CardDescription>
                    Сравнение показателей магазинов {getPeriodLabel(selectedPeriod).toLowerCase()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {reportData.topStores.length > 0 ? (
                    <div className="space-y-4">
                      {reportData.topStores.map((store, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-bold text-blue-600">
                                {index + 1}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{store.name}</p>
                              <p className="text-sm text-gray-600">
                                Заказов: {store.orders}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">
                              {formatPrice(store.revenue)}
                            </p>
                            <p className="text-sm text-gray-600">
                              Средний чек: {formatPrice(store.revenue / store.orders)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600">Нет данных о продажах магазинов</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Клиенты */}
            <TabsContent value="customers">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Сегментация клиентов</CardTitle>
                    <CardDescription>
                      Распределение клиентов по сегментам
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <div>
                          <p className="font-medium text-purple-900">VIP клиенты</p>
                          <p className="text-sm text-purple-700">Более ₽10,000</p>
                        </div>
                        <Badge className="bg-purple-600">12</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div>
                          <p className="font-medium text-blue-900">Постоянные</p>
                          <p className="text-sm text-blue-700">₽5,000 - ₽10,000</p>
                        </div>
                        <Badge className="bg-blue-600">28</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <p className="font-medium text-green-900">Активные</p>
                          <p className="text-sm text-green-700">3+ заказа</p>
                        </div>
                        <Badge className="bg-green-600">45</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Новые</p>
                          <p className="text-sm text-gray-700">1-2 заказа</p>
                        </div>
                        <Badge className="bg-gray-600">67</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Активность клиентов</CardTitle>
                    <CardDescription>
                      Метрики вовлеченности клиентов
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-gray-600">Повторные покупки</span>
                          <span className="text-sm font-medium">68%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{ width: '68%' }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-gray-600">Активные клиенты</span>
                          <span className="text-sm font-medium">45%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-gray-600">Удержание клиентов</span>
                          <span className="text-sm font-medium">72%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-purple-600 h-2 rounded-full" style={{ width: '72%' }}></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}