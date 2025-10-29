import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Video, 
  Star, 
  Eye,
  ThumbsUp,
  MessageSquare,
  Share2,
  Play,
  Pause,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  Users,
  BarChart3,
  ExternalLink,
  Download,
  Upload
} from 'lucide-react'

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([
    {
      id: 1,
      type: 'video',
      title: 'Обзор летней коллекции 2024',
      author: 'Мария Иванова',
      authorFollowers: 45000,
      platform: 'YouTube',
      views: 12500,
      likes: 890,
      comments: 156,
      rating: 4.8,
      status: 'published',
      publishDate: '2024-10-20',
      products: ['Летнее платье', 'Сандалии', 'Сумка'],
      thumbnail: null,
      duration: '8:45'
    },
    {
      id: 2,
      type: 'text',
      title: 'Честный отзыв о качестве товаров',
      author: 'Анна Петрова',
      authorFollowers: 23000,
      platform: 'Telegram',
      views: 8900,
      likes: 567,
      comments: 89,
      rating: 4.6,
      status: 'published',
      publishDate: '2024-10-18',
      products: ['Джинсы', 'Футболка'],
      thumbnail: null,
      duration: null
    },
    {
      id: 3,
      type: 'video',
      title: 'Распаковка заказа и первые впечатления',
      author: 'Елена Сидорова',
      authorFollowers: 67000,
      platform: 'Instagram',
      views: 15600,
      likes: 1200,
      comments: 234,
      rating: 4.9,
      status: 'in_review',
      publishDate: '2024-10-22',
      products: ['Кроссовки', 'Спортивный костюм'],
      thumbnail: null,
      duration: '12:30'
    }
  ])

  const [campaigns, setCampaigns] = useState([
    {
      id: 1,
      name: 'Осенняя кампания блогеров',
      status: 'active',
      budget: 150000,
      spent: 89000,
      reviewers: 12,
      completedReviews: 8,
      totalViews: 145000,
      avgRating: 4.7,
      startDate: '2024-10-01',
      endDate: '2024-11-30'
    },
    {
      id: 2,
      name: 'Продвижение новой коллекции',
      status: 'completed',
      budget: 200000,
      spent: 195000,
      reviewers: 15,
      completedReviews: 15,
      totalViews: 280000,
      avgRating: 4.8,
      startDate: '2024-08-15',
      endDate: '2024-09-30'
    }
  ])

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      published: { label: 'Опубликован', color: 'bg-green-100 text-green-800' },
      in_review: { label: 'На модерации', color: 'bg-yellow-100 text-yellow-800' },
      draft: { label: 'Черновик', color: 'bg-gray-100 text-gray-800' },
      rejected: { label: 'Отклонен', color: 'bg-red-100 text-red-800' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    )
  }

  const getCampaignStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Активна', color: 'bg-green-100 text-green-800' },
      completed: { label: 'Завершена', color: 'bg-blue-100 text-blue-800' },
      paused: { label: 'Приостановлена', color: 'bg-yellow-100 text-yellow-800' },
      draft: { label: 'Черновик', color: 'bg-gray-100 text-gray-800' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    )
  }

  const getPlatformIcon = (platform: string) => {
    // В реальном приложении здесь будут иконки платформ
    return <Share2 className="h-4 w-4" />
  }

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = review.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         review.author.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPlatform = selectedPlatform === 'all' || review.platform.toLowerCase() === selectedPlatform
    const matchesStatus = selectedStatus === 'all' || review.status === selectedStatus
    return matchesSearch && matchesPlatform && matchesStatus
  })

  const totalStats = reviews.reduce((acc, review) => ({
    views: acc.views + review.views,
    likes: acc.likes + review.likes,
    comments: acc.comments + review.comments
  }), { views: 0, likes: 0, comments: 0 })

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : '0.0'

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Обзоры и видеообзоры</h1>
          <p className="text-gray-600 mt-1">
            Управление обзорами блогеров и влиятельных лиц
          </p>
        </div>
        <Button>
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
                <p className="text-sm text-gray-600">Всего обзоров</p>
                <p className="text-2xl font-bold text-blue-600">{reviews.length}</p>
              </div>
              <Video className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Просмотры</p>
                <p className="text-2xl font-bold text-green-600">
                  {totalStats.views.toLocaleString()}
                </p>
              </div>
              <Eye className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Лайки</p>
                <p className="text-2xl font-bold text-red-600">
                  {totalStats.likes.toLocaleString()}
                </p>
              </div>
              <ThumbsUp className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Комментарии</p>
                <p className="text-2xl font-bold text-purple-600">
                  {totalStats.comments.toLocaleString()}
                </p>
              </div>
              <MessageSquare className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Средний рейтинг</p>
                <p className="text-2xl font-bold text-yellow-600">{avgRating}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="reviews" className="space-y-6">
        <TabsList>
          <TabsTrigger value="reviews">Обзоры</TabsTrigger>
          <TabsTrigger value="campaigns">Кампании</TabsTrigger>
          <TabsTrigger value="bloggers">Блогеры</TabsTrigger>
          <TabsTrigger value="analytics">Аналитика</TabsTrigger>
        </TabsList>

        {/* Обзоры */}
        <TabsContent value="reviews">
          {/* Фильтры */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Поиск обзоров..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Все платформы</option>
                  <option value="youtube">YouTube</option>
                  <option value="instagram">Instagram</option>
                  <option value="telegram">Telegram</option>
                  <option value="tiktok">TikTok</option>
                </select>
                
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Все статусы</option>
                  <option value="published">Опубликован</option>
                  <option value="in_review">На модерации</option>
                  <option value="draft">Черновик</option>
                  <option value="rejected">Отклонен</option>
                </select>
                
                <div className="text-sm text-gray-600 flex items-center">
                  Найдено: {filteredReviews.length} обзоров
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Список обзоров */}
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <Card key={review.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-24 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {review.type === 'video' ? (
                        <Play className="h-6 w-6 text-gray-400" />
                      ) : (
                        <MessageSquare className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {review.title}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Users className="h-4 w-4" />
                              <span>{review.author}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              {getPlatformIcon(review.platform)}
                              <span>{review.platform}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(review.publishDate).toLocaleDateString('ru-RU')}</span>
                            </div>
                            {review.duration && (
                              <span>{review.duration}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          {getStatusBadge(review.status)}
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{review.rating}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-600 mb-3">
                        <div className="flex items-center space-x-1">
                          <Eye className="h-4 w-4" />
                          <span>{review.views.toLocaleString()} просмотров</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <ThumbsUp className="h-4 w-4" />
                          <span>{review.likes.toLocaleString()} лайков</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageSquare className="h-4 w-4" />
                          <span>{review.comments} комментариев</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4" />
                          <span>{review.authorFollowers.toLocaleString()} подписчиков</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                          {review.products.map((product, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {product}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            Просмотр
                          </Button>
                          <Button size="sm" variant="outline">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Открыть
                          </Button>
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-1" />
                            Скачать
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Кампании */}
        <TabsContent value="campaigns">
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {campaign.name}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>
                          {new Date(campaign.startDate).toLocaleDateString('ru-RU')} - 
                          {new Date(campaign.endDate).toLocaleDateString('ru-RU')}
                        </span>
                        <span>{campaign.reviewers} блогеров</span>
                        <span>{campaign.completedReviews} обзоров готово</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {getCampaignStatusBadge(campaign.status)}
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{campaign.avgRating}</span>
                      </div>
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
                  
                  {/* Прогресс выполнения */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Готово обзоров: {campaign.completedReviews}</span>
                      <span>Всего: {campaign.reviewers}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${(campaign.completedReviews / campaign.reviewers) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Просмотры</p>
                      <p className="text-lg font-bold">{campaign.totalViews.toLocaleString()}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">CPV</p>
                      <p className="text-lg font-bold">₽{(campaign.spent / campaign.totalViews).toFixed(2)}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Охват</p>
                      <p className="text-lg font-bold">{Math.round(campaign.totalViews * 0.7).toLocaleString()}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Вовлеченность</p>
                      <p className="text-lg font-bold">4.2%</p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4 mr-1" />
                      Редактировать
                    </Button>
                    <Button size="sm" variant="outline">
                      <BarChart3 className="h-4 w-4 mr-1" />
                      Отчет
                    </Button>
                    <Button size="sm" variant="outline">
                      <Users className="h-4 w-4 mr-1" />
                      Блогеры
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Блогеры */}
        <TabsContent value="bloggers">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: 'Мария Иванова',
                platform: 'YouTube',
                followers: 45000,
                avgViews: 12000,
                engagement: 4.2,
                category: 'Мода и стиль',
                rating: 4.8,
                price: 25000,
                reviews: 12
              },
              {
                name: 'Анна Петрова',
                platform: 'Instagram',
                followers: 67000,
                avgViews: 8500,
                engagement: 5.1,
                category: 'Красота',
                rating: 4.9,
                price: 35000,
                reviews: 18
              },
              {
                name: 'Елена Сидорова',
                platform: 'TikTok',
                followers: 123000,
                avgViews: 25000,
                engagement: 6.8,
                category: 'Лайфстайл',
                rating: 4.7,
                price: 45000,
                reviews: 24
              },
              {
                name: 'Ольга Козлова',
                platform: 'Telegram',
                followers: 23000,
                avgViews: 5600,
                engagement: 3.9,
                category: 'Обзоры товаров',
                rating: 4.6,
                price: 15000,
                reviews: 8
              }
            ].map((blogger, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{blogger.name}</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>{blogger.platform}</span>
                        <span>•</span>
                        <span>{blogger.category}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Подписчики</span>
                      <span className="font-medium">{blogger.followers.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Средние просмотры</span>
                      <span className="font-medium">{blogger.avgViews.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Вовлеченность</span>
                      <span className="font-medium">{blogger.engagement}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Рейтинг</span>
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{blogger.rating}</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Обзоров</span>
                      <span className="font-medium">{blogger.reviews}</span>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-600">Стоимость обзора</span>
                      <span className="text-lg font-bold text-green-600">
                        ₽{blogger.price.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" className="flex-1">
                        Пригласить
                      </Button>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Аналитика */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Эффективность платформ</CardTitle>
                <CardDescription>
                  Сравнение показателей по платформам
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { platform: 'YouTube', views: 45000, engagement: 4.2, cost: 125000 },
                    { platform: 'Instagram', views: 67000, engagement: 5.1, cost: 89000 },
                    { platform: 'TikTok', views: 123000, engagement: 6.8, cost: 156000 },
                    { platform: 'Telegram', views: 23000, engagement: 3.9, cost: 45000 }
                  ].map((platform, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{platform.platform}</p>
                        <p className="text-sm text-gray-600">
                          {platform.views.toLocaleString()} просмотров • {platform.engagement}% вовлеченность
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">₽{platform.cost.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">
                          ₽{(platform.cost / platform.views).toFixed(2)} за просмотр
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Динамика просмотров</CardTitle>
                <CardDescription>
                  Рост аудитории за последние 30 дней
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">График просмотров</p>
                    <p className="text-sm text-gray-500">Динамика по дням</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ROI по категориям</CardTitle>
                <CardDescription>
                  Возврат инвестиций по типам контента
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { category: 'Распаковка', roi: 3.2, reviews: 8, investment: 125000 },
                    { category: 'Обзор товаров', roi: 2.8, reviews: 12, investment: 89000 },
                    { category: 'Сравнение', roi: 4.1, reviews: 5, investment: 67000 },
                    { category: 'Лайфстайл', roi: 2.3, reviews: 15, investment: 156000 }
                  ].map((category, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{category.category}</p>
                        <p className="text-sm text-gray-600">
                          {category.reviews} обзоров • ₽{category.investment.toLocaleString()} инвестиций
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{category.roi}x ROI</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Топ блогеры по эффективности</CardTitle>
                <CardDescription>
                  Лучшие показатели конверсии
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'Елена Сидорова', conversion: 5.2, views: 25000, sales: 1300 },
                    { name: 'Мария Иванова', conversion: 4.8, views: 12000, sales: 576 },
                    { name: 'Анна Петрова', conversion: 4.1, views: 8500, sales: 349 },
                    { name: 'Ольга Козлова', conversion: 3.9, views: 5600, sales: 218 }
                  ].map((blogger, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-purple-600">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{blogger.name}</p>
                          <p className="text-sm text-gray-600">
                            {blogger.views.toLocaleString()} просмотров • {blogger.sales} продаж
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{blogger.conversion}%</p>
                        <p className="text-sm text-gray-600">конверсия</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}