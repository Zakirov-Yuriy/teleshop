import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  Target, 
  Megaphone,
  BarChart3,
  Users,
  Eye,
  MousePointer,
  DollarSign,
  Calendar,
  Settings,
  Play,
  Pause,
  Edit,
  Trash2,
  Plus,
  ExternalLink,
  Zap,
  Star,
  MessageSquare,
  Share2
} from 'lucide-react'

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState([
    {
      id: 1,
      name: 'Летняя распродажа 2024',
      type: 'promotion',
      status: 'active',
      budget: 50000,
      spent: 32450,
      impressions: 125000,
      clicks: 3250,
      conversions: 89,
      startDate: '2024-06-01',
      endDate: '2024-08-31',
      targetAudience: 'Женщины 25-45'
    },
    {
      id: 2,
      name: 'Реклама новых товаров',
      type: 'awareness',
      status: 'paused',
      budget: 25000,
      spent: 18750,
      impressions: 89000,
      clicks: 1890,
      conversions: 45,
      startDate: '2024-07-15',
      endDate: '2024-09-15',
      targetAudience: 'Мужчины 30-50'
    },
    {
      id: 3,
      name: 'Ретаргетинг клиентов',
      type: 'retargeting',
      status: 'active',
      budget: 15000,
      spent: 8900,
      impressions: 45000,
      clicks: 1200,
      conversions: 67,
      startDate: '2024-08-01',
      endDate: '2024-10-31',
      targetAudience: 'Существующие клиенты'
    }
  ])

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    type: 'promotion',
    budget: '',
    startDate: '',
    endDate: '',
    targetAudience: ''
  })

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Активна', color: 'bg-green-100 text-green-800' },
      paused: { label: 'Приостановлена', color: 'bg-yellow-100 text-yellow-800' },
      completed: { label: 'Завершена', color: 'bg-gray-100 text-gray-800' },
      draft: { label: 'Черновик', color: 'bg-blue-100 text-blue-800' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    )
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'promotion': return Megaphone
      case 'awareness': return Eye
      case 'retargeting': return Target
      default: return TrendingUp
    }
  }

  const calculateCTR = (clicks: number, impressions: number) => {
    return impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00'
  }

  const calculateCPC = (spent: number, clicks: number) => {
    return clicks > 0 ? (spent / clicks).toFixed(2) : '0.00'
  }

  const calculateROAS = (conversions: number, spent: number, avgOrderValue = 2500) => {
    const revenue = conversions * avgOrderValue
    return spent > 0 ? (revenue / spent).toFixed(2) : '0.00'
  }

  const totalStats = campaigns.reduce((acc, campaign) => ({
    budget: acc.budget + campaign.budget,
    spent: acc.spent + campaign.spent,
    impressions: acc.impressions + campaign.impressions,
    clicks: acc.clicks + campaign.clicks,
    conversions: acc.conversions + campaign.conversions
  }), { budget: 0, spent: 0, impressions: 0, clicks: 0, conversions: 0 })

  const toggleCampaignStatus = (id: number) => {
    setCampaigns(campaigns.map(campaign => 
      campaign.id === id 
        ? { ...campaign, status: campaign.status === 'active' ? 'paused' : 'active' }
        : campaign
    ))
  }

  const createCampaign = () => {
    const campaign = {
      id: Date.now(),
      ...newCampaign,
      budget: parseInt(newCampaign.budget),
      status: 'draft',
      spent: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0
    }
    setCampaigns([...campaigns, campaign])
    setNewCampaign({
      name: '',
      type: 'promotion',
      budget: '',
      startDate: '',
      endDate: '',
      targetAudience: ''
    })
    setShowCreateForm(false)
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Реклама и продвижение</h1>
          <p className="text-gray-600 mt-1">
            Управление рекламными кампаниями и продвижением товаров
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Создать кампанию
        </Button>
      </div>

      {/* Общая статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Общий бюджет</p>
                <p className="text-2xl font-bold text-blue-600">
                  ₽{totalStats.budget.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Потрачено</p>
                <p className="text-2xl font-bold text-red-600">
                  ₽{totalStats.spent.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Показы</p>
                <p className="text-2xl font-bold text-purple-600">
                  {totalStats.impressions.toLocaleString()}
                </p>
              </div>
              <Eye className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Клики</p>
                <p className="text-2xl font-bold text-green-600">
                  {totalStats.clicks.toLocaleString()}
                </p>
              </div>
              <MousePointer className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Конверсии</p>
                <p className="text-2xl font-bold text-orange-600">
                  {totalStats.conversions}
                </p>
              </div>
              <Target className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-6">
        <TabsList>
          <TabsTrigger value="campaigns">Кампании</TabsTrigger>
          <TabsTrigger value="analytics">Аналитика</TabsTrigger>
          <TabsTrigger value="audiences">Аудитории</TabsTrigger>
          <TabsTrigger value="creatives">Креативы</TabsTrigger>
        </TabsList>

        {/* Кампании */}
        <TabsContent value="campaigns">
          {/* Форма создания кампании */}
          {showCreateForm && (
            <Card>
              <CardHeader>
                <CardTitle>Создать новую кампанию</CardTitle>
                <CardDescription>
                  Настройте параметры рекламной кампании
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Название кампании</label>
                    <Input
                      value={newCampaign.name}
                      onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                      placeholder="Название кампании"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Тип кампании</label>
                    <select
                      value={newCampaign.type}
                      onChange={(e) => setNewCampaign({ ...newCampaign, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="promotion">Продвижение товаров</option>
                      <option value="awareness">Повышение узнаваемости</option>
                      <option value="retargeting">Ретаргетинг</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Бюджет (₽)</label>
                    <Input
                      type="number"
                      value={newCampaign.budget}
                      onChange={(e) => setNewCampaign({ ...newCampaign, budget: e.target.value })}
                      placeholder="50000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Дата начала</label>
                    <Input
                      type="date"
                      value={newCampaign.startDate}
                      onChange={(e) => setNewCampaign({ ...newCampaign, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Дата окончания</label>
                    <Input
                      type="date"
                      value={newCampaign.endDate}
                      onChange={(e) => setNewCampaign({ ...newCampaign, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Целевая аудитория</label>
                  <Input
                    value={newCampaign.targetAudience}
                    onChange={(e) => setNewCampaign({ ...newCampaign, targetAudience: e.target.value })}
                    placeholder="Женщины 25-45, интересы: мода, красота"
                  />
                </div>

                <div className="flex space-x-2">
                  <Button onClick={createCampaign}>
                    Создать кампанию
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Отмена
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Список кампаний */}
          <div className="space-y-4">
            {campaigns.map((campaign) => {
              const TypeIcon = getTypeIcon(campaign.type)
              const ctr = calculateCTR(campaign.clicks, campaign.impressions)
              const cpc = calculateCPC(campaign.spent, campaign.clicks)
              const roas = calculateROAS(campaign.conversions, campaign.spent)
              
              return (
                <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <TypeIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {campaign.name}
                          </h3>
                          <div className="flex items-center space-x-3">
                            {getStatusBadge(campaign.status)}
                            <span className="text-sm text-gray-600">
                              {campaign.targetAudience}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span>
                              {new Date(campaign.startDate).toLocaleDateString('ru-RU')} - 
                              {new Date(campaign.endDate).toLocaleDateString('ru-RU')}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleCampaignStatus(campaign.id)}
                        >
                          {campaign.status === 'active' ? (
                            <>
                              <Pause className="h-4 w-4 mr-1" />
                              Приостановить
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-1" />
                              Запустить
                            </>
                          )}
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4 mr-1" />
                          Редактировать
                        </Button>
                        <Button size="sm" variant="outline">
                          <BarChart3 className="h-4 w-4 mr-1" />
                          Отчет
                        </Button>
                      </div>
                    </div>

                    {/* Прогресс бюджета */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Потрачено: ₽{campaign.spent.toLocaleString()}</span>
                        <span>Бюджет: ₽{campaign.budget.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.min((campaign.spent / campaign.budget) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Метрики */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Показы</p>
                        <p className="text-lg font-bold">{campaign.impressions.toLocaleString()}</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Клики</p>
                        <p className="text-lg font-bold">{campaign.clicks.toLocaleString()}</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">CTR</p>
                        <p className="text-lg font-bold">{ctr}%</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">CPC</p>
                        <p className="text-lg font-bold">₽{cpc}</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Конверсии</p>
                        <p className="text-lg font-bold">{campaign.conversions}</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">ROAS</p>
                        <p className="text-lg font-bold">{roas}x</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Аналитика */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Эффективность кампаний</CardTitle>
                <CardDescription>
                  Сравнение показателей по кампаниям
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">График эффективности кампаний</p>
                    <p className="text-sm text-gray-500">CTR, CPC, ROAS по кампаниям</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Динамика трат</CardTitle>
                <CardDescription>
                  Расходы на рекламу за последние 30 дней
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">График расходов</p>
                    <p className="text-sm text-gray-500">Ежедневные траты на рекламу</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Топ площадки</CardTitle>
                <CardDescription>
                  Самые эффективные рекламные площадки
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'Telegram Ads', impressions: 89000, clicks: 2340, ctr: 2.63 },
                    { name: 'Яндекс.Директ', impressions: 67000, clicks: 1890, ctr: 2.82 },
                    { name: 'VK Реклама', impressions: 45000, clicks: 1120, ctr: 2.49 },
                    { name: 'Google Ads', impressions: 34000, clicks: 890, ctr: 2.62 }
                  ].map((platform, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{platform.name}</p>
                        <p className="text-sm text-gray-600">
                          {platform.impressions.toLocaleString()} показов • {platform.clicks.toLocaleString()} кликов
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{platform.ctr}%</p>
                        <p className="text-sm text-gray-600">CTR</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Конверсии по источникам</CardTitle>
                <CardDescription>
                  Откуда приходят самые качественные клиенты
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { source: 'Поисковая реклама', conversions: 45, rate: 3.2, cost: 1250 },
                    { source: 'Социальные сети', conversions: 38, rate: 2.8, cost: 980 },
                    { source: 'Ретаргетинг', conversions: 67, rate: 5.6, cost: 890 },
                    { source: 'Медийная реклама', conversions: 23, rate: 1.9, cost: 1450 }
                  ].map((source, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{source.source}</p>
                        <p className="text-sm text-gray-600">
                          {source.conversions} конверсий • {source.rate}% CR
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-600">₽{source.cost}</p>
                        <p className="text-sm text-gray-600">CPA</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Аудитории */}
        <TabsContent value="audiences">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Сохраненные аудитории
                </CardTitle>
                <CardDescription>
                  Настроенные сегменты для таргетинга
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'Женщины 25-45', size: 2500000, description: 'Интересы: мода, красота, дом' },
                    { name: 'Мужчины 30-50', size: 1800000, description: 'Интересы: спорт, техника, авто' },
                    { name: 'Молодые родители', size: 950000, description: 'Возраст 25-35, есть дети' },
                    { name: 'Постоянные клиенты', size: 15000, description: 'Более 3 покупок за год' }
                  ].map((audience, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{audience.name}</h4>
                        <p className="text-sm text-gray-600">{audience.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Размер аудитории: {audience.size.toLocaleString()} человек
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Создать аудиторию
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Аналитика аудиторий</CardTitle>
                <CardDescription>
                  Эффективность различных сегментов
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { segment: 'Женщины 25-35', ctr: 3.2, cpc: 45, cr: 4.1, color: 'bg-pink-100 text-pink-800' },
                    { segment: 'Женщины 36-45', ctr: 2.8, cpc: 52, cr: 3.8, color: 'bg-purple-100 text-purple-800' },
                    { segment: 'Мужчины 30-40', ctr: 2.1, cpc: 38, cr: 2.9, color: 'bg-blue-100 text-blue-800' },
                    { segment: 'Мужчины 41-50', ctr: 1.9, cpc: 41, cr: 2.6, color: 'bg-indigo-100 text-indigo-800' }
                  ].map((segment, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{segment.segment}</h4>
                        <Badge className={segment.color}>
                          Активен
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <p className="text-gray-600">CTR</p>
                          <p className="font-bold">{segment.ctr}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-600">CPC</p>
                          <p className="font-bold">₽{segment.cpc}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-600">CR</p>
                          <p className="font-bold">{segment.cr}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Креативы */}
        <TabsContent value="creatives">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="h-5 w-5 mr-2" />
                  Библиотека креативов
                </CardTitle>
                <CardDescription>
                  Рекламные материалы и их эффективность
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { 
                      id: 1, 
                      name: 'Летняя коллекция', 
                      type: 'image', 
                      ctr: 3.2, 
                      impressions: 45000,
                      status: 'active'
                    },
                    { 
                      id: 2, 
                      name: 'Скидки до 50%', 
                      type: 'video', 
                      ctr: 4.1, 
                      impressions: 67000,
                      status: 'active'
                    },
                    { 
                      id: 3, 
                      name: 'Новые поступления', 
                      type: 'carousel', 
                      ctr: 2.8, 
                      impressions: 34000,
                      status: 'paused'
                    },
                    { 
                      id: 4, 
                      name: 'Бесплатная доставка', 
                      type: 'image', 
                      ctr: 3.5, 
                      impressions: 56000,
                      status: 'active'
                    },
                    { 
                      id: 5, 
                      name: 'Отзывы клиентов', 
                      type: 'video', 
                      ctr: 4.8, 
                      impressions: 23000,
                      status: 'active'
                    },
                    { 
                      id: 6, 
                      name: 'Сезонная распродажа', 
                      type: 'image', 
                      ctr: 2.9, 
                      impressions: 41000,
                      status: 'draft'
                    }
                  ].map((creative) => (
                    <Card key={creative.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="aspect-video bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                          <div className="text-center">
                            {creative.type === 'video' && <Play className="h-8 w-8 text-gray-400 mx-auto mb-2" />}
                            {creative.type === 'image' && <Eye className="h-8 w-8 text-gray-400 mx-auto mb-2" />}
                            {creative.type === 'carousel' && <Share2 className="h-8 w-8 text-gray-400 mx-auto mb-2" />}
                            <p className="text-sm text-gray-500 capitalize">{creative.type}</p>
                          </div>
                        </div>
                        
                        <h4 className="font-medium mb-2">{creative.name}</h4>
                        
                        <div className="flex items-center justify-between mb-3">
                          {getStatusBadge(creative.status)}
                          <span className="text-sm text-gray-600">
                            {creative.impressions.toLocaleString()} показов
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">CTR: {creative.ctr}%</span>
                          <div className="flex space-x-1">
                            <Button size="sm" variant="outline">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="flex justify-center mt-6">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Загрузить креатив
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}