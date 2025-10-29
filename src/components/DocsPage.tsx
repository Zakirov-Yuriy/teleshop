import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Search, 
  BookOpen,
  Code,
  Zap,
  Settings,
  ShoppingCart,
  MessageSquare,
  BarChart3,
  Shield,
  Download,
  ExternalLink,
  ChevronRight,
  Clock,
  Star,
  Eye
} from 'lucide-react'

export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const documentCategories = [
    { id: 'all', name: 'Все документы', icon: FileText },
    { id: 'getting-started', name: 'Начало работы', icon: Zap },
    { id: 'api', name: 'API документация', icon: Code },
    { id: 'integrations', name: 'Интеграции', icon: Settings },
    { id: 'tutorials', name: 'Руководства', icon: BookOpen },
    { id: 'troubleshooting', name: 'Решение проблем', icon: Shield }
  ]

  const documents = [
    {
      id: 1,
      title: 'Быстрый старт',
      description: 'Создайте свой первый Telegram магазин за 10 минут',
      category: 'getting-started',
      type: 'guide',
      readTime: '10 мин',
      difficulty: 'Начинающий',
      views: 1250,
      rating: 4.8,
      lastUpdated: '2024-10-20',
      tags: ['telegram', 'магазин', 'настройка']
    },
    {
      id: 2,
      title: 'Настройка Telegram бота',
      description: 'Подробное руководство по созданию и настройке Telegram бота',
      category: 'getting-started',
      type: 'tutorial',
      readTime: '15 мин',
      difficulty: 'Начинающий',
      views: 980,
      rating: 4.9,
      lastUpdated: '2024-10-18',
      tags: ['telegram', 'бот', 'настройка']
    },
    {
      id: 3,
      title: 'Интеграция с Wildberries API',
      description: 'Как подключить и настроить синхронизацию с Wildberries',
      category: 'integrations',
      type: 'guide',
      readTime: '20 мин',
      difficulty: 'Средний',
      views: 756,
      rating: 4.7,
      lastUpdated: '2024-10-15',
      tags: ['wildberries', 'api', 'синхронизация']
    },
    {
      id: 4,
      title: 'REST API Reference',
      description: 'Полная документация по REST API платформы',
      category: 'api',
      type: 'reference',
      readTime: '45 мин',
      difficulty: 'Продвинутый',
      views: 432,
      rating: 4.6,
      lastUpdated: '2024-10-22',
      tags: ['api', 'rest', 'разработка']
    },
    {
      id: 5,
      title: 'Webhook уведомления',
      description: 'Настройка и обработка webhook уведомлений',
      category: 'api',
      type: 'tutorial',
      readTime: '25 мин',
      difficulty: 'Средний',
      views: 623,
      rating: 4.5,
      lastUpdated: '2024-10-12',
      tags: ['webhook', 'уведомления', 'api']
    },
    {
      id: 6,
      title: 'Управление заказами',
      description: 'Как эффективно обрабатывать и отслеживать заказы',
      category: 'tutorials',
      type: 'guide',
      readTime: '18 мин',
      difficulty: 'Начинающий',
      views: 892,
      rating: 4.8,
      lastUpdated: '2024-10-10',
      tags: ['заказы', 'управление', 'клиенты']
    },
    {
      id: 7,
      title: 'Аналитика и отчеты',
      description: 'Используйте данные для роста вашего бизнеса',
      category: 'tutorials',
      type: 'guide',
      readTime: '22 мин',
      difficulty: 'Средний',
      views: 567,
      rating: 4.7,
      lastUpdated: '2024-10-08',
      tags: ['аналитика', 'отчеты', 'данные']
    },
    {
      id: 8,
      title: 'Решение частых проблем',
      description: 'Ответы на самые частые вопросы и проблемы',
      category: 'troubleshooting',
      type: 'faq',
      readTime: '12 мин',
      difficulty: 'Начинающий',
      views: 1340,
      rating: 4.9,
      lastUpdated: '2024-10-25',
      tags: ['проблемы', 'faq', 'помощь']
    },
    {
      id: 9,
      title: 'Безопасность и приватность',
      description: 'Как защитить ваши данные и данные клиентов',
      category: 'troubleshooting',
      type: 'guide',
      readTime: '16 мин',
      difficulty: 'Средний',
      views: 445,
      rating: 4.6,
      lastUpdated: '2024-10-05',
      tags: ['безопасность', 'приватность', 'защита']
    }
  ]

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'guide': return BookOpen
      case 'tutorial': return Zap
      case 'reference': return Code
      case 'faq': return MessageSquare
      default: return FileText
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Начинающий': return 'bg-green-100 text-green-800'
      case 'Средний': return 'bg-yellow-100 text-yellow-800'
      case 'Продвинутый': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const popularDocs = documents
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)

  const recentDocs = documents
    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Документация</h1>
        <p className="text-gray-600">
          Полные инструкции и руководства по работе с платформой
        </p>
      </div>

      {/* Поиск */}
      <Card>
        <CardContent className="p-6">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Поиск в документации..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-lg"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Боковая панель с категориями */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Категории</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {documentCategories.map((category) => {
                  const Icon = category.icon
                  const isActive = selectedCategory === category.id
                  const count = category.id === 'all' 
                    ? documents.length 
                    : documents.filter(doc => doc.category === category.id).length
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                        isActive 
                          ? 'bg-blue-100 text-blue-900 border border-blue-200' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {count}
                      </Badge>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Популярные документы */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Star className="h-4 w-4 mr-2" />
                Популярные
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {popularDocs.map((doc, index) => (
                  <div key={doc.id} className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-orange-600">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.title}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Eye className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{doc.views}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Основной контент */}
        <div className="lg:col-span-3">
          {/* Статистика */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Всего документов</p>
                    <p className="text-2xl font-bold text-blue-600">{documents.length}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Категории</p>
                    <p className="text-2xl font-bold text-green-600">{documentCategories.length - 1}</p>
                  </div>
                  <BookOpen className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Обновлено сегодня</p>
                    <p className="text-2xl font-bold text-purple-600">3</p>
                  </div>
                  <Clock className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Список документов */}
          <div className="space-y-4">
            {filteredDocuments.length > 0 ? (
              filteredDocuments.map((doc) => {
                const TypeIcon = getTypeIcon(doc.type)
                
                return (
                  <Card key={doc.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <TypeIcon className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {doc.title}
                              </h3>
                              <Badge className={getDifficultyColor(doc.difficulty)}>
                                {doc.difficulty}
                              </Badge>
                            </div>
                            <p className="text-gray-600 mb-3">{doc.description}</p>
                            
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <div className="flex items-center space-x-1">
                                <Clock className="h-4 w-4" />
                                <span>{doc.readTime}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Eye className="h-4 w-4" />
                                <span>{doc.views} просмотров</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span>{doc.rating}</span>
                              </div>
                              <span>Обновлено: {new Date(doc.lastUpdated).toLocaleDateString('ru-RU')}</span>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mt-3">
                              {doc.tags.map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-1" />
                            PDF
                          </Button>
                          <Button size="sm">
                            Читать
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Search className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Документы не найдены
                  </h3>
                  <p className="text-gray-600">
                    Попробуйте изменить поисковый запрос или выбрать другую категорию
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Дополнительные ресурсы */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Дополнительные ресурсы</CardTitle>
              <CardDescription>
                Полезные ссылки и инструменты для разработчиков
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <Code className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">API Playground</p>
                      <p className="text-sm text-gray-600">Тестируйте API запросы</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <Download className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">SDK и библиотеки</p>
                      <p className="text-sm text-gray-600">Готовые решения</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium">Сообщество разработчиков</p>
                      <p className="text-sm text-gray-600">Обсуждения и помощь</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="font-medium">Статус сервисов</p>
                      <p className="text-sm text-gray-600">Мониторинг работы API</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}