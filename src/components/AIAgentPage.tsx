import React, { useEffect, useState, useRef } from 'react'
import { 
  Bot, 
  Send, 
  Settings,
  Brain,
  MessageSquare,
  Zap,
  TrendingUp,
  Users,
  Target,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCcw,
  Download,
  Upload,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Info,
  Sparkles,
  ChevronDown,
  BarChart3,
  ShoppingCart,
  HelpCircle,
  Package,
  Star,
  ArrowUpRight,
  Mic,
  Paperclip
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Message = {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  rating?: 'good' | 'bad'
  metadata?: {
    confidence?: number
    intent?: string
    entities?: Record<string, any>
    suggestions?: string[]
  }
}

type Conversation = {
  id: string
  userId: string
  userName: string
  startTime: string
  endTime?: string
  status: 'active' | 'resolved' | 'escalated'
  messages: Message[]
  intent: string
  satisfaction?: number
}

type AIConfig = {
  model: 'gpt-4' | 'gpt-3.5' | 'claude'
  temperature: number
  maxTokens: number
  systemPrompt: string
  intents: {
    name: string
    description: string
    examples: string[]
    enabled: boolean
  }[]
  autoResponses: {
    trigger: string
    response: string
    enabled: boolean
  }[]
}

export default function AIAgentPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'conversations' | 'analytics' | 'settings'>('chat')
  const [config, setConfig] = useState<AIConfig>({
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: 'Вы - помощник в интернет-магазине. Помогайте клиентам с выбором товаров, оформлением заказов и ответами на вопросы.',
    intents: [
      {
        name: 'product_search',
        description: 'Поиск товаров',
        examples: ['найди смартфон', 'покажи наушники', 'что есть из электроники'],
        enabled: true
      },
      {
        name: 'order_status',
        description: 'Статус заказа',
        examples: ['где мой заказ', 'когда доставка', 'статус заказа 12345'],
        enabled: true
      },
      {
        name: 'support',
        description: 'Поддержка',
        examples: ['помощь', 'не работает', 'проблема с заказом'],
        enabled: true
      }
    ],
    autoResponses: [
      {
        trigger: 'привет',
        response: 'Здравствуйте! Я AI-ассистент магазина. Чем могу помочь?',
        enabled: true
      },
      {
        trigger: 'спасибо',
        response: 'Всегда рад помочь! Обращайтесь, если возникнут вопросы.',
        enabled: true
      }
    ]
  })

  const chatContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadConversations()
    loadDemoChat()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadConversations = async () => {
    // Заглушка с демо данными
    const mockConversations: Conversation[] = [
      {
        id: '1',
        userId: '123456789',
        userName: 'Иван Иванов',
        startTime: '2024-12-26T10:00:00',
        endTime: '2024-12-26T10:15:00',
        status: 'resolved',
        messages: [],
        intent: 'product_search',
        satisfaction: 5
      },
      {
        id: '2',
        userId: '987654321',
        userName: 'Анна Петрова',
        startTime: '2024-12-26T11:30:00',
        status: 'active',
        messages: [],
        intent: 'order_status'
      },
      {
        id: '3',
        userId: '456789123',
        userName: 'Алексей Сидоров',
        startTime: '2024-12-26T09:00:00',
        endTime: '2024-12-26T09:20:00',
        status: 'escalated',
        messages: [],
        intent: 'support',
        satisfaction: 3
      }
    ]
    
    setConversations(mockConversations)
  }

  const loadDemoChat = () => {
    const demoMessages: Message[] = [
      {
        id: '1',
        type: 'assistant',
        content: 'Здравствуйте! Я AI-ассистент магазина TeleShop. Я помогу вам с выбором товаров, оформлением заказа или отвечу на любые вопросы о нашем магазине. Чем могу быть полезен?',
        timestamp: new Date().toISOString(),
        metadata: {
          confidence: 1.0,
          suggestions: [
            'Показать популярные товары',
            'Проверить статус заказа',
            'Узнать о доставке',
            'Связаться с поддержкой'
          ]
        }
      }
    ]
    setMessages(demoMessages)
  }

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsTyping(true)

    // Симуляция ответа AI
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: generateAIResponse(inputMessage),
        timestamp: new Date().toISOString(),
        metadata: {
          confidence: 0.92,
          intent: detectIntent(inputMessage),
          suggestions: generateSuggestions(inputMessage)
        }
      }
      setMessages(prev => [...prev, aiResponse])
      setIsTyping(false)
    }, 1500)
  }

  const generateAIResponse = (input: string): string => {
    const lowerInput = input.toLowerCase()
    
    if (lowerInput.includes('товар') || lowerInput.includes('показ') || lowerInput.includes('найд')) {
      return 'Конечно! У нас есть отличные предложения. Вот наши топовые категории:\n\n📱 Электроника - смартфоны, наушники, умные часы\n🏠 Бытовая техника - пылесосы, кофемашины\n👕 Одежда и аксессуары\n\nЧто вас интересует больше всего?'
    }
    
    if (lowerInput.includes('заказ') || lowerInput.includes('достав')) {
      return 'Я помогу проверить статус вашего заказа. Пожалуйста, укажите номер заказа или ваш телефон, привязанный к аккаунту.'
    }
    
    if (lowerInput.includes('цен') || lowerInput.includes('скидк') || lowerInput.includes('акци')) {
      return 'Отличные новости! Сейчас у нас действуют следующие акции:\n\n🎉 Скидка 20% на всю электронику\n🎁 При покупке от 5000₽ - подарок\n💳 Двойные баллы для участников программы лояльности\n\nХотите узнать подробнее о какой-то акции?'
    }
    
    if (lowerInput.includes('помощ') || lowerInput.includes('поддержк')) {
      return 'Я здесь, чтобы помочь! Вы можете:\n\n• Задать мне любой вопрос о товарах или услугах\n• Написать в поддержку через меня\n• Позвонить по телефону +7 (800) 123-45-67\n\nОпишите вашу проблему, и я постараюсь решить её максимально быстро.'
    }
    
    return 'Интересный вопрос! Давайте я помогу вам с этим. Можете уточнить, что именно вас интересует? Я могу помочь с выбором товаров, информацией о доставке, акциях или ответить на другие вопросы о магазине.'
  }

  const detectIntent = (input: string): string => {
    const lowerInput = input.toLowerCase()
    
    if (lowerInput.includes('товар') || lowerInput.includes('купи') || lowerInput.includes('найд')) {
      return 'product_search'
    }
    if (lowerInput.includes('заказ') || lowerInput.includes('достав')) {
      return 'order_status'
    }
    if (lowerInput.includes('помощ') || lowerInput.includes('проблем')) {
      return 'support'
    }
    if (lowerInput.includes('цен') || lowerInput.includes('скидк')) {
      return 'pricing'
    }
    
    return 'general'
  }

  const generateSuggestions = (input: string): string[] => {
    const intent = detectIntent(input)
    
    const suggestions: Record<string, string[]> = {
      product_search: [
        'Показать новинки',
        'Товары со скидкой',
        'Популярные категории',
        'Сравнить товары'
      ],
      order_status: [
        'Отследить заказ',
        'Изменить адрес доставки',
        'Отменить заказ',
        'История заказов'
      ],
      support: [
        'Связаться с оператором',
        'Частые вопросы',
        'Политика возврата',
        'Гарантия'
      ],
      general: [
        'Каталог товаров',
        'Акции и скидки',
        'О магазине',
        'Помощь'
      ]
    }
    
    return suggestions[intent] || suggestions.general
  }

  const handleRateMessage = (messageId: string, rating: 'good' | 'bad') => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, rating } : msg
      )
    )
  }

  const stats = {
    totalConversations: 1234,
    activeConversations: 23,
    avgResponseTime: 1.5,
    satisfaction: 4.7,
    resolvedToday: 145,
    escalatedToday: 12,
    commonIntents: [
      { name: 'Поиск товаров', count: 456, percentage: 37 },
      { name: 'Статус заказа', count: 234, percentage: 19 },
      { name: 'Информация о доставке', count: 189, percentage: 15 },
      { name: 'Возврат и обмен', count: 123, percentage: 10 },
      { name: 'Другое', count: 232, percentage: 19 }
    ]
  }

  return (
    <div className="space-y-6 h-full">
      {/* Статистика */}
      <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
        <div className="stat">
          <div className="stat-figure text-primary">
            <MessageSquare className="h-8 w-8" />
          </div>
          <div className="stat-title">Всего диалогов</div>
          <div className="stat-value text-primary">{stats.totalConversations}</div>
          <div className="stat-desc">{stats.activeConversations} активных сейчас</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-secondary">
            <Zap className="h-8 w-8" />
          </div>
          <div className="stat-title">Среднее время ответа</div>
          <div className="stat-value text-secondary">{stats.avgResponseTime}с</div>
          <div className="stat-desc">На 23% быстрее вчера</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-success">
            <CheckCircle className="h-8 w-8" />
          </div>
          <div className="stat-title">Решено сегодня</div>
          <div className="stat-value text-success">{stats.resolvedToday}</div>
          <div className="stat-desc">{stats.escalatedToday} передано оператору</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-warning">
            <Star className="h-8 w-8" />
          </div>
          <div className="stat-title">Удовлетворенность</div>
          <div className="stat-value text-warning">{stats.satisfaction}</div>
          <div className="stat-desc">Из 5.0 баллов</div>
        </div>
      </div>

      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-7 w-7 text-primary" />
            AI Агент
          </h2>
          <p className="text-base-content/60">Интеллектуальный помощник для клиентов</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-sm btn-ghost">
            <Download className="h-4 w-4" />
            Экспорт чатов
          </button>
          <button className="btn btn-sm btn-ghost">
            <Brain className="h-4 w-4" />
            Обучение
          </button>
          <button className="btn btn-ghost btn-sm">
            <RefreshCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Вкладки */}
      <div className="tabs tabs-boxed">
        <a 
          className={cn("tab", activeTab === 'chat' && "tab-active")}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Чат
        </a>
        <a 
          className={cn("tab", activeTab === 'conversations' && "tab-active")}
          onClick={() => setActiveTab('conversations')}
        >
          <Users className="h-4 w-4 mr-2" />
          Диалоги
        </a>
        <a 
          className={cn("tab", activeTab === 'analytics' && "tab-active")}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Аналитика
        </a>
        <a 
          className={cn("tab", activeTab === 'settings' && "tab-active")}
          onClick={() => setActiveTab('settings')}
        >
          <Settings className="h-4 w-4 mr-2" />
          Настройки
        </a>
      </div>

      {/* Контент */}
      {activeTab === 'chat' && (
        <div className="card bg-base-100 shadow-xl h-[600px] flex flex-col">
          <div className="card-body flex flex-col p-0">
            {/* Заголовок чата */}
            <div className="navbar bg-base-200 rounded-t-xl px-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="avatar">
                    <div className="w-10 rounded-full bg-primary">
                      <Bot className="h-6 w-6 m-auto mt-2 text-primary-content" />
                    </div>
                  </div>
                  <div>
                    <p className="font-bold">AI Ассистент</p>
                    <p className="text-sm opacity-60 flex items-center gap-1">
                      <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                      Онлайн
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex-none gap-2">
                <button className="btn btn-sm btn-ghost">
                  <Info className="h-4 w-4" />
                </button>
                <button className="btn btn-sm btn-ghost">
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Сообщения */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "chat",
                    message.type === 'user' ? "chat-end" : "chat-start"
                  )}
                >
                  <div className="chat-image avatar">
                    <div className="w-10 rounded-full">
                      {message.type === 'user' ? (
                        <div className="bg-primary text-primary-content flex items-center justify-center h-10">
                          <span>ВЫ</span>
                        </div>
                      ) : (
                        <div className="bg-secondary text-secondary-content flex items-center justify-center h-10">
                          <Bot className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="chat-header">
                    {message.type === 'user' ? 'Вы' : 'AI Ассистент'}
                    <time className="text-xs opacity-50 ml-2">
                      {new Date(message.timestamp).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </time>
                  </div>
                  <div className="chat-bubble">
                    {message.content}
                    {message.metadata?.confidence && (
                      <div className="text-xs opacity-60 mt-2">
                        Уверенность: {(message.metadata.confidence * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                  {message.type === 'assistant' && (
                    <div className="chat-footer opacity-50 flex gap-2 mt-2">
                      <button
                        onClick={() => handleRateMessage(message.id, 'good')}
                        className={cn(
                          "btn btn-xs btn-ghost",
                          message.rating === 'good' && "btn-active text-success"
                        )}
                      >
                        <ThumbsUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleRateMessage(message.id, 'bad')}
                        className={cn(
                          "btn btn-xs btn-ghost",
                          message.rating === 'bad' && "btn-active text-error"
                        )}
                      >
                        <ThumbsDown className="h-3 w-3" />
                      </button>
                      <button className="btn btn-xs btn-ghost">
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="chat chat-start">
                  <div className="chat-bubble">
                    <span className="loading loading-dots loading-sm"></span>
                  </div>
                </div>
              )}

              {/* Быстрые действия */}
              {messages.length === 1 && (
                <div className="grid grid-cols-2 gap-2 mt-6">
                  {['Показать популярные товары', 'Проверить статус заказа', 'Узнать о доставке', 'Связаться с поддержкой'].map((suggestion) => (
                    <button
                      key={suggestion}
                      className="btn btn-outline btn-sm normal-case"
                      onClick={() => {
                        setInputMessage(suggestion)
                        handleSendMessage()
                      }}
                    >
                      <Sparkles className="h-4 w-4" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Поле ввода */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <button className="btn btn-circle btn-ghost">
                  <Paperclip className="h-5 w-5" />
                </button>
                <input
                  type="text"
                  placeholder="Введите сообщение..."
                  className="input input-bordered flex-1"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button className="btn btn-circle btn-ghost">
                  <Mic className="h-5 w-5" />
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim()}
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Диалоги */}
      {activeTab === 'conversations' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {conversations.map(conv => (
            <div key={conv.id} className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold">{conv.userName}</h3>
                    <p className="text-sm opacity-60">ID: {conv.userId}</p>
                  </div>
                  <div className={cn(
                    "badge gap-1",
                    conv.status === 'active' && "badge-success",
                    conv.status === 'resolved' && "badge-ghost",
                    conv.status === 'escalated' && "badge-warning"
                  )}>
                    {conv.status === 'active' && <Clock className="h-3 w-3" />}
                    {conv.status === 'resolved' && <CheckCircle className="h-3 w-3" />}
                    {conv.status === 'escalated' && <AlertTriangle className="h-3 w-3" />}
                    {conv.status === 'active' && 'Активный'}
                    {conv.status === 'resolved' && 'Завершен'}
                    {conv.status === 'escalated' && 'Передан'}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 opacity-60" />
                    <span>Интент: {conv.intent}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 opacity-60" />
                    <span>Начало: {new Date(conv.startTime).toLocaleTimeString('ru-RU')}</span>
                  </div>
                  {conv.endTime && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 opacity-60" />
                      <span>
                        Длительность: {Math.round((new Date(conv.endTime).getTime() - new Date(conv.startTime).getTime()) / 60000)} мин
                      </span>
                    </div>
                  )}
                  {conv.satisfaction && (
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-warning" />
                      <div className="rating rating-sm">
                        {[1, 2, 3, 4, 5].map(star => (
                          <input
                            key={star}
                            type="radio"
                            className="mask mask-star-2 bg-warning"
                            checked={star === conv.satisfaction}
                            disabled
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="card-actions justify-end mt-3">
                  <button className="btn btn-xs btn-ghost">Открыть</button>
                  <button className="btn btn-xs btn-ghost">Детали</button>
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
                Популярные интенты
              </h3>
              <div className="space-y-3 mt-4">
                {stats.commonIntents.map(intent => (
                  <div key={intent.name}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm">{intent.name}</span>
                      <span className="text-sm font-bold">{intent.count} ({intent.percentage}%)</span>
                    </div>
                    <progress 
                      className="progress progress-primary" 
                      value={intent.percentage} 
                      max="100"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title">
                <Activity className="h-5 w-5 text-success" />
                Активность по часам
              </h3>
              <div className="space-y-2 mt-4">
                {['00:00-06:00', '06:00-12:00', '12:00-18:00', '18:00-24:00'].map((period, idx) => (
                  <div key={period}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm">{period}</span>
                      <span className="text-sm font-bold">{50 + idx * 100} диалогов</span>
                    </div>
                    <progress 
                      className="progress progress-success" 
                      value={25 + idx * 25} 
                      max="100"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Настройки */}
      {activeTab === 'settings' && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title mb-4">
              <Settings className="h-5 w-5" />
              Настройки AI агента
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Модель AI</span>
                  </label>
                  <select className="select select-bordered">
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-3.5">GPT-3.5 Turbo</option>
                    <option value="claude">Claude 3</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Температура (креативность)</span>
                    <span className="label-text-alt">0.7</span>
                  </label>
                  <input type="range" min="0" max="100" value="70" className="range range-primary" />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Максимум токенов</span>
                  </label>
                  <input type="number" placeholder="2048" className="input input-bordered" value="2048" />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Системный промпт</span>
                  </label>
                  <textarea 
                    className="textarea textarea-bordered h-24" 
                    placeholder="Инструкции для AI..."
                    value={config.systemPrompt}
                  ></textarea>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-3">Интенты</h4>
                  <div className="space-y-2">
                    {config.intents.map(intent => (
                      <div key={intent.name} className="flex items-center justify-between p-2 bg-base-200 rounded">
                        <div>
                          <p className="font-medium text-sm">{intent.description}</p>
                          <p className="text-xs opacity-60">{intent.examples[0]}</p>
                        </div>
                        <input type="checkbox" className="toggle toggle-primary" checked={intent.enabled} />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Автоответы</h4>
                  <div className="space-y-2">
                    {config.autoResponses.map(response => (
                      <div key={response.trigger} className="flex items-center justify-between p-2 bg-base-200 rounded">
                        <div className="flex-1">
                          <p className="font-medium text-sm">Триггер: {response.trigger}</p>
                          <p className="text-xs opacity-60 truncate">{response.response}</p>
                        </div>
                        <input type="checkbox" className="toggle toggle-success" checked={response.enabled} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="card-actions justify-end mt-6">
              <button className="btn btn-ghost">Сбросить</button>
              <button className="btn btn-primary">Сохранить настройки</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}