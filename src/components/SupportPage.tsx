import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  HelpCircle, 
  MessageSquare, 
  Phone, 
  Mail, 
  Search,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  FileText,
  Video,
  Book,
  Headphones,
  Users,
  Zap
} from 'lucide-react'

export default function SupportPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: 'general',
    priority: 'medium',
    message: ''
  })

  const faqItems = [
    {
      category: 'Начало работы',
      questions: [
        {
          question: 'Как создать первый магазин?',
          answer: 'Перейдите в раздел "Магазины" и нажмите "Создать магазин". Введите название, токен Telegram бота и API ключ Wildberries.'
        },
        {
          question: 'Где получить токен Telegram бота?',
          answer: 'Напишите @BotFather в Telegram, создайте нового бота командой /newbot и получите токен.'
        },
        {
          question: 'Как получить API ключ Wildberries?',
          answer: 'Войдите в личный кабинет Wildberries, перейдите в раздел "Настройки" → "Доступ к API" и создайте новый ключ.'
        }
      ]
    },
    {
      category: 'Синхронизация товаров',
      questions: [
        {
          question: 'Почему товары не синхронизируются?',
          answer: 'Проверьте правильность API ключа Wildberries и убедитесь, что у вас есть товары в личном кабинете WB.'
        },
        {
          question: 'Как часто обновляются цены товаров?',
          answer: 'Цены обновляются автоматически каждые 4 часа. Вы также можете запустить синхронизацию вручную.'
        },
        {
          question: 'Можно ли выбрать какие товары синхронизировать?',
          answer: 'В текущей версии синхронизируются все активные товары. Функция выборочной синхронизации будет добавлена в следующих обновлениях.'
        }
      ]
    },
    {
      category: 'Заказы и клиенты',
      questions: [
        {
          question: 'Как обрабатывать заказы?',
          answer: 'Заказы появляются в разделе "Заказы". Вы можете изменять их статус, связываться с клиентами и отслеживать доставку.'
        },
        {
          question: 'Как настроить уведомления о новых заказах?',
          answer: 'Перейдите в "Настройки" → "Уведомления" и включите нужные типы уведомлений.'
        },
        {
          question: 'Можно ли экспортировать данные клиентов?',
          answer: 'Да, в разделе "Клиенты" есть функция экспорта в Excel и CSV форматы.'
        }
      ]
    }
  ]

  const supportChannels = [
    {
      icon: MessageSquare,
      title: 'Чат поддержки',
      description: 'Быстрые ответы на вопросы',
      availability: 'Пн-Пт 9:00-18:00',
      responseTime: '~5 минут',
      action: 'Начать чат'
    },
    {
      icon: Mail,
      title: 'Email поддержка',
      description: 'Подробные консультации',
      availability: 'Круглосуточно',
      responseTime: '~2 часа',
      action: 'Написать письмо'
    },
    {
      icon: Phone,
      title: 'Телефон',
      description: 'Срочные вопросы',
      availability: 'Пн-Пт 9:00-18:00',
      responseTime: 'Сразу',
      action: '+7 (800) 123-45-67'
    },
    {
      icon: Video,
      title: 'Видеозвонок',
      description: 'Персональная консультация',
      availability: 'По записи',
      responseTime: 'По договоренности',
      action: 'Записаться'
    }
  ]

  const recentTickets = [
    {
      id: '#12345',
      subject: 'Проблема с синхронизацией товаров',
      status: 'open',
      priority: 'high',
      created: '2024-10-25T10:30:00Z',
      updated: '2024-10-25T14:20:00Z'
    },
    {
      id: '#12344',
      subject: 'Вопрос по настройке уведомлений',
      status: 'resolved',
      priority: 'medium',
      created: '2024-10-24T16:15:00Z',
      updated: '2024-10-24T17:45:00Z'
    },
    {
      id: '#12343',
      subject: 'Ошибка при создании магазина',
      status: 'in_progress',
      priority: 'medium',
      created: '2024-10-23T09:20:00Z',
      updated: '2024-10-24T11:30:00Z'
    }
  ]

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { label: 'Открыт', color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
      in_progress: { label: 'В работе', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      resolved: { label: 'Решен', color: 'bg-green-100 text-green-800', icon: CheckCircle }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open
    const Icon = config.icon
    
    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { label: 'Низкий', color: 'bg-gray-100 text-gray-800' },
      medium: { label: 'Средний', color: 'bg-blue-100 text-blue-800' },
      high: { label: 'Высокий', color: 'bg-red-100 text-red-800' }
    }
    
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium
    
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    )
  }

  const submitTicket = () => {
    // В реальном приложении здесь будет отправка тикета
    alert('Обращение отправлено! Мы свяжемся с вами в ближайшее время.')
    setTicketForm({
      subject: '',
      category: 'general',
      priority: 'medium',
      message: ''
    })
  }

  const filteredFAQ = faqItems.map(category => ({
    ...category,
    questions: category.questions.filter(item =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0)

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Центр поддержки</h1>
        <p className="text-gray-600">
          Мы готовы помочь вам с любыми вопросами по использованию платформы
        </p>
      </div>

      {/* Быстрый поиск */}
      <Card>
        <CardContent className="p-6">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Поиск по базе знаний..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-lg"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="faq" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="faq">База знаний</TabsTrigger>
          <TabsTrigger value="contact">Связаться с нами</TabsTrigger>
          <TabsTrigger value="tickets">Мои обращения</TabsTrigger>
          <TabsTrigger value="resources">Ресурсы</TabsTrigger>
        </TabsList>

        {/* База знаний */}
        <TabsContent value="faq">
          <div className="space-y-6">
            {filteredFAQ.length > 0 ? (
              filteredFAQ.map((category, categoryIndex) => (
                <Card key={categoryIndex}>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Book className="h-5 w-5 mr-2" />
                      {category.category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {category.questions.map((item, index) => (
                        <details key={index} className="group">
                          <summary className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                            <span className="font-medium">{item.question}</span>
                            <ChevronRight className="h-5 w-5 text-gray-400 group-open:rotate-90 transition-transform" />
                          </summary>
                          <div className="p-4 text-gray-600 border-l-4 border-blue-500 bg-blue-50 mt-2 rounded-r-lg">
                            {item.answer}
                          </div>
                        </details>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Search className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Ничего не найдено
                  </h3>
                  <p className="text-gray-600">
                    Попробуйте изменить поисковый запрос или обратитесь в поддержку
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Связаться с нами */}
        <TabsContent value="contact">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Каналы поддержки */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Выберите удобный способ связи</h3>
              {supportChannels.map((channel, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <channel.icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{channel.title}</h4>
                        <p className="text-gray-600 text-sm mb-2">{channel.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500">
                            <p>{channel.availability}</p>
                            <p>Ответ: {channel.responseTime}</p>
                          </div>
                          <Button size="sm">
                            {channel.action}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Форма обращения */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Send className="h-5 w-5 mr-2" />
                  Создать обращение
                </CardTitle>
                <CardDescription>
                  Опишите вашу проблему, и мы поможем её решить
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Тема обращения</label>
                  <Input
                    value={ticketForm.subject}
                    onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                    placeholder="Кратко опишите проблему"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Категория</label>
                    <select
                      value={ticketForm.category}
                      onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="general">Общие вопросы</option>
                      <option value="technical">Технические проблемы</option>
                      <option value="billing">Оплата и тарифы</option>
                      <option value="feature">Новые функции</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Приоритет</label>
                    <select
                      value={ticketForm.priority}
                      onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Низкий</option>
                      <option value="medium">Средний</option>
                      <option value="high">Высокий</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Описание проблемы</label>
                  <textarea
                    value={ticketForm.message}
                    onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                    placeholder="Подробно опишите проблему, укажите шаги для воспроизведения..."
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <Button onClick={submitTicket} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Отправить обращение
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Мои обращения */}
        <TabsContent value="tickets">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                История обращений
              </CardTitle>
              <CardDescription>
                Отслеживайте статус ваших обращений в поддержку
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentTickets.length > 0 ? (
                <div className="space-y-4">
                  {recentTickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-start space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{ticket.subject}</h4>
                          <p className="text-sm text-gray-600">Обращение {ticket.id}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Создано: {new Date(ticket.created).toLocaleDateString('ru-RU')} • 
                            Обновлено: {new Date(ticket.updated).toLocaleDateString('ru-RU')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {getPriorityBadge(ticket.priority)}
                        {getStatusBadge(ticket.status)}
                        <Button size="sm" variant="outline">
                          Открыть
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Нет обращений
                  </h3>
                  <p className="text-gray-600">
                    У вас пока нет обращений в поддержку
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ресурсы */}
        <TabsContent value="resources">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Video className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Видеоуроки</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Пошаговые инструкции по работе с платформой
                </p>
                <Button variant="outline" size="sm">
                  Смотреть видео
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Book className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Документация</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Подробные руководства и API документация
                </p>
                <Button variant="outline" size="sm">
                  Читать документы
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Сообщество</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Общайтесь с другими пользователями платформы
                </p>
                <Button variant="outline" size="sm">
                  Присоединиться
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Headphones className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Вебинары</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Еженедельные обучающие вебинары
                </p>
                <Button variant="outline" size="sm">
                  Расписание
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Быстрый старт</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Настройте первый магазин за 10 минут
                </p>
                <Button variant="outline" size="sm">
                  Начать
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-yellow-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Шаблоны</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Готовые шаблоны для быстрого запуска
                </p>
                <Button variant="outline" size="sm">
                  Скачать
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}