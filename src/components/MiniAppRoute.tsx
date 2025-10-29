import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Search, 
  ShoppingCart, 
  Star,
  Plus,
  Minus,
  Heart,
  ArrowLeft,
  Package,
  Home,
  User,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  Camera,
  Shield,
  LogIn,
  CheckCircle,
  Settings,
  Gift,
  Award,
  TrendingUp,
  Info,
  DollarSign,
  ArrowRight
} from 'lucide-react'
import { supabase, Product } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import { wbAuthInstance } from '@/lib/wildberries-auth'
import { getLoyaltyPoints, createLoyaltyUser, getLevelInfo, type LoyaltyUser } from '@/lib/loyalty'
import WBAuthModal from './WBAuthModal'
import OrdersPage from './OrdersPage'
import ConfirmationModal from './ConfirmationModal'
import SuccessModal from './SuccessModal'
import LoadingSpinner from './LoadingSpinner'
import { LoyaltyInfoModal } from './LoyaltyInfoModal'
import { CashbackManagement } from './CashbackManagement'
import { logActivity } from '@/lib/activity'

interface PurchaseRequest {
  store_id: string
  marketplace: 'wildberries'
  products: Array<{
    marketplace_id: string
    quantity: number
    name: string
    price: number
  }>
  user_telegram_id?: string
}

interface PurchaseResponse {
  success: boolean
  scenario: 'browser' | 'auto_purchase'
  action_url?: string
  order_id?: string
  message: string
  error?: string
}

interface WBAuthStatus {
  isAuthenticated: boolean
  userInfo?: any
}

interface CartItem {
  product: Product
  quantity: number
  addedAt?: string // Добавляем время добавления в корзину
}

interface Order {
  id: string
  order_id: string
  marketplace: string
  status: string
  created_at: string
  products_data?: Array<{
    marketplace_id: string
    name: string
    quantity: number
    price: number
  }>
  products?: Array<{
    marketplace_id: string
    name: string
    quantity: number
    price: number
  }>
}

interface Review {
  id: string
  text: string
  pros: string
  cons: string
  productValuation: number
  createdDate: string
  userName: string
  photoLinks: string[]
  answer?: {
    text: string
    createdDate: string
  }
  matchingSize: string
}

interface MiniAppRouteProps {
  storeId: string
}

type ViewMode = 'catalog' | 'cart' | 'profile' | 'product-detail' | 'orders' | 'cashback-management'

// Удаляем старый ConfirmationModal - теперь используем импортированный

export default function MiniAppRoute({ storeId }: MiniAppRouteProps) {
  // Массив разрешенных артикулов Wildberries
  const allowedWbIds = [
    '111410162', '330758414', '355942040', '446111118', '249192733',
    '196470591', '402234401', '216223413', '226003482', '330734928',
    '322459697', '322457267', '124952705', '57408794', '216222930',
    '216222929', '248189418', '196470364'
  ]

  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem('miniAppCart')
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart)
        // Добавляем время добавления для старых товаров, если его нет
        return parsedCart.map((item: CartItem) => ({
          ...item,
          addedAt: item.addedAt || new Date().toISOString()
        }))
      } catch (error) {
        console.error('Error parsing saved cart:', error)
        return []
      }
    }
    return []
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [pricesLoading, setPricesLoading] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState<{ [key: string]: number }>({})
  
  // Функция для загрузки изображения через прокси
  const getImageUrl = (originalUrl: string) => {
    if (!originalUrl || typeof originalUrl !== 'string') {
      console.log('❌ Неверный тип URL:', typeof originalUrl, originalUrl)
      return ''
    }
    
    // Проверяем, что URL содержит правильный домен
    if (originalUrl.includes('wbbasket.ru')) {
      return originalUrl
    }
    
    // Для старых URL с wb.ru заменяем на wbbasket.ru
    if (originalUrl.includes('wb.ru')) {
      return originalUrl.replace('wb.ru', 'wbbasket.ru')
    }
    
    // Для URL отзывов с feedback доменом
    if (originalUrl.includes('feedback')) {
      return originalUrl
    }
    
    return originalUrl
  }
  
  // Функция для генерации URL фотографий отзывов
  const generateReviewPhotoUrl = (reviewId: string, photoId: string) => {
    if (!reviewId || !photoId) {
      console.log('❌ Неверные параметры для генерации URL фото отзыва:', { reviewId, photoId })
      return ''
    }
    
    const reviewNum = parseInt(reviewId, 10)
    if (isNaN(reviewNum)) {
      console.log('❌ Неверный reviewId:', reviewId)
      return ''
    }
    
    const vol = Math.floor(reviewNum / 1e5)
    const part = Math.floor(reviewNum / 1e3)
    
    // Определяем номер сервера feedback (01-09)
    let serverNum: string
    if (vol >= 0 && vol <= 143) serverNum = '01'
    else if (vol >= 144 && vol <= 287) serverNum = '02'
    else if (vol >= 288 && vol <= 431) serverNum = '03'
    else if (vol >= 432 && vol <= 719) serverNum = '04'
    else if (vol >= 720 && vol <= 1007) serverNum = '05'
    else if (vol >= 1008 && vol <= 1061) serverNum = '06'
    else if (vol >= 1062 && vol <= 1115) serverNum = '07'
    else if (vol >= 1116 && vol <= 1169) serverNum = '08'
    else serverNum = '09'
    
    const baseUrl = `https://feedback${serverNum}.wbbasket.ru/vol${vol}/part${part}/${reviewId}/photos/${photoId}.webp`
    
    console.log(`🖼️ Генерируем URL фото отзыва: ${baseUrl}`)
    return baseUrl
  }
  
  // Функция для генерации альтернативных URL фотографий отзывов
  const generateAlternativeReviewPhotoUrls = (reviewId: string, photoId: string) => {
    if (!reviewId || !photoId) return []
    
    const reviewNum = parseInt(reviewId, 10)
    if (isNaN(reviewNum)) return []
    
    const vol = Math.floor(reviewNum / 1e5)
    const part = Math.floor(reviewNum / 1e3)
    
    // Определяем номер сервера feedback (01-09)
    let serverNum: string
    if (vol >= 0 && vol <= 143) serverNum = '01'
    else if (vol >= 144 && vol <= 287) serverNum = '02'
    else if (vol >= 288 && vol <= 431) serverNum = '03'
    else if (vol >= 432 && vol <= 719) serverNum = '04'
    else if (vol >= 720 && vol <= 1007) serverNum = '05'
    else if (vol >= 1008 && vol <= 1061) serverNum = '06'
    else if (vol >= 1062 && vol <= 1115) serverNum = '07'
    else if (vol >= 1116 && vol <= 1169) serverNum = '08'
    else serverNum = '09'
    
    const urls = []
    
    // Основной формат - webp
    urls.push(`https://feedback${serverNum}.wbbasket.ru/vol${vol}/part${part}/${reviewId}/photos/${photoId}.webp`)
    
    // Альтернативные форматы
    urls.push(`https://feedback${serverNum}.wbbasket.ru/vol${vol}/part${part}/${reviewId}/photos/${photoId}.jpg`)
    urls.push(`https://feedback${serverNum}.wbbasket.ru/vol${vol}/part${part}/${reviewId}/photos/ms.webp`)
    urls.push(`https://feedback${serverNum}.wbbasket.ru/vol${vol}/part${part}/${reviewId}/photos/ms.jpg`)
    
    return urls
  }
  const [store, setStore] = useState<any>(null)
  const [currentView, setCurrentView] = useState<ViewMode>('catalog')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productReviews, setProductReviews] = useState<Review[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [wbAuthStatus, setWbAuthStatus] = useState<WBAuthStatus>({ isAuthenticated: false })
  const [showWbAuthModal, setShowWbAuthModal] = useState(false)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successData, setSuccessData] = useState({ successCount: 0, errorCount: 0 })
  const [userId, setUserId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [loyaltyUser, setLoyaltyUser] = useState<LoyaltyUser | null>(null)
  const [isLoyaltyInfoModalOpen, setIsLoyaltyInfoModalOpen] = useState(false)
  const [showAddToCartNotification, setShowAddToCartNotification] = useState(false)
  const [addedProductName, setAddedProductName] = useState('')




  useEffect(() => {
    loadStoreData()
    initializeUser()
    
    // Проверяем URL параметры для фильтрации по маркетплейсу
    const urlParams = new URLSearchParams(window.location.search)
    const marketplaceParam = urlParams.get('marketplace')
    if (marketplaceParam === 'wildberries') {
      setSelectedCategory(marketplaceParam)
    }
  }, [storeId])

  useEffect(() => {
    logActivity('app_open', { store_id: storeId })
  }, [storeId])

  // Синхронизируем высоту с Telegram viewport (особенно iOS)
  useEffect(() => {
    const webApp = window.Telegram?.WebApp
    
    // Расширяем Mini App на весь экран при загрузке
    const expandApp = () => {
      if (webApp) {
        console.log('🚀 Telegram WebApp обнаружен, пробуем расширить...')
        console.log('isExpanded до:', webApp.isExpanded)
        
        // Метод 1: стандартный expand()
        if (webApp.expand && typeof webApp.expand === 'function') {
          webApp.expand()
          console.log('✅ Вызван webApp.expand()')
        }
        
        // Метод 2: через requestFullscreen если поддерживается
        if (!webApp.isExpanded) {
          setTimeout(() => {
            if (webApp.expand) {
              webApp.expand()
              console.log('✅ Повторный вызов webApp.expand() через 100ms')
            }
          }, 100)
        }
        
        // Метод 3: установка высоты вручную
        setTimeout(() => {
          console.log('isExpanded после:', webApp.isExpanded)
          console.log('viewportHeight:', webApp.viewportHeight)
          console.log('viewportStableHeight:', webApp.viewportStableHeight)
        }, 500)
      } else {
        console.log('❌ Telegram WebApp не найден')
      }
    }
    
    // Вызываем сразу и при ready
    expandApp()
    
    if (webApp && webApp.ready) {
      webApp.ready()
      console.log('✅ Вызван webApp.ready()')
    }
    
    const applyHeight = () => {
      try {
        // Используем stableHeight если доступен, иначе обычный
        const h = (webApp as any)?.viewportStableHeight || (webApp as any)?.viewportHeight
        if (h && typeof h === 'number') {
          document.documentElement.style.setProperty('--tg-viewport-height', `${h}px`)
        } else {
          // fallback на 100dvh
          document.documentElement.style.setProperty('--tg-viewport-height', '100dvh')
        }
      } catch {}
    }
    applyHeight()
    const waAny = webApp as any
    if (waAny?.onEvent) {
      try { waAny.onEvent('viewportChanged', applyHeight) } catch {}
    }
    return () => {
      if (waAny?.offEvent) {
        try { waAny.offEvent('viewportChanged', applyHeight) } catch {}
      }
    }
  }, [])

  // Доп. попытка expand по первому клику (iOS может требовать пользовательское действие)
  useEffect(() => {
    const waAny = (window.Telegram?.WebApp ?? {}) as any
    const tryExpand = () => {
      try { waAny.expand?.() } catch {}
      document.removeEventListener('click', tryExpand as any)
    }
    document.addEventListener('click', tryExpand as any, { once: true } as any)
    return () => document.removeEventListener('click', tryExpand as any)
  }, [])

  const initializeUser = async () => {
    try {
      // Принудительно инициализируем Telegram WebApp
      if (window.Telegram?.WebApp) {
        try {
          const wa = window.Telegram.WebApp
          wa.ready()
          // Многократные попытки expand для iOS
          const expandOnce = () => {
            try { (window.Telegram!.WebApp as any).expand?.() } catch {}
          }
          expandOnce()
          setTimeout(expandOnce, 50)
          setTimeout(expandOnce, 300)
          setTimeout(expandOnce, 1000)
          console.log('✅ Telegram WebApp готов, выполнено расширение')
        } catch (error) {
          console.log('⚠️ Ошибка инициализации Telegram WebApp:', error)
        }
      }
      
      // Проверяем, что мы в Telegram WebApp
      const isTelegramWebApp = window.Telegram?.WebApp
      console.log('🔍 Инициализация пользователя в Telegram WebApp:', !!isTelegramWebApp)
      
      // Получаем user_id из Telegram WebApp или создаем стабильный ID
      const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user
      let userUuid = ''
      
      if (telegramUser?.id) {
        // Используем Telegram ID как основу для user_id
        userUuid = `telegram_${telegramUser.id}`
        console.log('🎯 Используем Telegram User ID:', telegramUser.id)
        // Сохраняем Telegram ID для баллов лояльности
        localStorage.setItem('telegram_user_id', telegramUser.id.toString())
      } else if (isTelegramWebApp) {
        // Если WebApp доступен, но user.id нет, создаем анонимный ID
        const storedUserId = localStorage.getItem('telegram_anonymous_id')
        if (storedUserId) {
          userUuid = storedUserId
          console.log('🎯 Используем сохраненный анонимный ID:', userUuid)
        } else {
          // Создаем новый анонимный ID для Telegram
          userUuid = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          localStorage.setItem('telegram_anonymous_id', userUuid)
          console.log('🎯 Создан новый анонимный ID для Telegram:', userUuid)
        }
      } else {
        // Для браузера создаем обычный анонимный ID
        const storedUserId = localStorage.getItem('wb_user_id')
        if (storedUserId) {
          userUuid = storedUserId
        } else {
          userUuid = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          localStorage.setItem('wb_user_id', userUuid)
        }
        console.log('🎯 Используем браузерный анонимный ID:', userUuid)
      }
      
      setUserId(userUuid)
      
      // Загружаем баллы лояльности (использует Telegram User ID)
      await loadLoyaltyPoints()
      
      // Проверяем авторизацию Wildberries (использует анонимный ID)
      await checkWBAuth(userUuid)
    } catch (error) {
      console.error('Error initializing user:', error)
    }
  }

  const checkWBAuth = async (userUuid: string) => {
    try {
      const sessionExists = await wbAuthInstance.checkSession()
      
      if (sessionExists) {
        setWbAuthStatus({
          isAuthenticated: true,
          userInfo: null
        })
      } else {
        setWbAuthStatus({ isAuthenticated: false })
        // Автоматически открываем модальное окно авторизации
        setShowWbAuthModal(true)
      }
    } catch (error) {
      console.error('Error checking WB auth:', error)
      setWbAuthStatus({ isAuthenticated: false })
      // Автоматически открываем модальное окно авторизации при ошибке
      setShowWbAuthModal(true)
    }
  }

  const loadStoreData = async () => {
    try {
      console.log('Loading store data for storeId:', storeId)
      
      // Загружаем информацию о магазине
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('id, name, description')
        .eq('id', storeId)
        .single()

      console.log('Store query result:', { storeData, storeError })

      if (storeError) throw storeError
      setStore(storeData)

      // Загружаем товары магазина с фильтрацией по разрешенным артикулам
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .in('marketplace_id', allowedWbIds)
        .order('created_at', { ascending: false })

      console.log('Products query result:', { productsData, productsError })

      if (productsError) throw productsError
      
      // Дополнительная фильтрация на клиенте для безопасности
      const filteredProducts = (productsData || []).filter(product => 
        allowedWbIds.includes(product.marketplace_id || product.wb_id)
      )
      
      // Загружаем актуальные цены для Wildberries товаров
      setPricesLoading(true)
      const productsWithPrices = await Promise.all(
        filteredProducts.map(async (product) => {
          if (product.marketplace === 'wildberries' && (product.wildberries_id || product.wb_id)) {
            try {
              const nmId = product.wildberries_id || product.wb_id
              console.log(`🔄 Загружаем актуальную цену для товара ${nmId}`)
              const productInfo = await wbAuthInstance.getProductInfo(nmId)
                            if (productInfo) {
                console.log(`✅ Получена актуальная цена для ${nmId}: ${productInfo.price} руб, остаток: ${productInfo.stock}, рейтинг: ${productInfo.rating}, изображений: ${productInfo.images.length}`)
                console.log(`🖼️ Изображения для ${nmId}:`, productInfo.images.slice(0, 3)) // Показываем только первые 3 для краткости
                return {
                  ...product,
                  price: productInfo.price,
                  originalPrice: productInfo.originalPrice,
                  rating: productInfo.rating,
                  stock: productInfo.stock,
                  feedbacks: productInfo.feedbacks,
                  brand: productInfo.brand,
                  name: productInfo.name,
                  images: productInfo.images,
                  marketplace: 'wildberries' as const
                }
              } else {
                console.log(`⚠️ Не удалось получить актуальную цену для ${nmId}, используем сохраненную`)
              }
            } catch (error) {
              console.error(`❌ Ошибка загрузки цены для товара ${product.wildberries_id || product.wb_id}:`, error)
            }
          }
          
          // Fallback для товаров без Wildberries ID или при ошибке
          return {
            ...product,
            images: product.images || ['https://via.placeholder.com/300x200?text=Нет+изображения'],
            rating: product.rating || Math.floor(Math.random() * 2) + 4,
            brand: product.brand || 'Wildberries',
            marketplace: 'wildberries' as const
          }
        })
      )
      
      // Сортируем товары по количеству отзывов от большего к меньшему
      const sortedProducts = productsWithPrices.sort((a, b) => {
        const feedbacksA = a.feedbacks || 0
        const feedbacksB = b.feedbacks || 0
        return feedbacksB - feedbacksA // От большего к меньшему
      })
      
      console.log(`Загружено ${sortedProducts.length} товаров с актуальными ценами, отсортировано по отзывам`)
      setProducts(sortedProducts)
      setPricesLoading(false)
    } catch (error) {
      console.error('Error loading store data for storeId:', storeId, error)
    } finally {
      setLoading(false)
    }
  }

  const loadProductReviews = async (product: Product) => {
    setReviewsLoading(true)
    try {
      console.log('Loading reviews for product:', product.wb_id, 'store:', storeId)
      
      // Здесь будет вызов Edge Function для получения отзывов
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-product-reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          store_id: storeId,
          wb_id: product.wb_id
        })
      })

      console.log('Reviews API response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Reviews API response data:', data)
        setProductReviews(data.reviews || [])
      } else {
        const errorText = await response.text()
        console.error('Reviews API error:', response.status, errorText)
        // Fallback: показываем моковые отзывы
        setProductReviews(getMockReviews())
      }
    } catch (error) {
      console.error('Error loading reviews:', error)
      // Показываем моковые отзывы при ошибке
      setProductReviews(getMockReviews())
    } finally {
      setReviewsLoading(false)
    }
  }

  const getMockReviews = (): Review[] => [
    {
      id: '1',
      text: 'Отличный товар! Качество превзошло ожидания. Быстрая доставка.',
      pros: 'Качественный материал, удобный',
      cons: 'Нет недостатков',
      productValuation: 5,
      createdDate: '2024-01-15T10:30:00Z',
      userName: 'Анна К.',
      photoLinks: [],
      matchingSize: 'ok',
      answer: {
        text: 'Спасибо за отзыв! Рады, что товар вам понравился!',
        createdDate: '2024-01-16T09:15:00Z'
      }
    },
    {
      id: '2',
      text: 'Хороший товар за свою цену. Рекомендую к покупке.',
      pros: 'Доступная цена, быстрая доставка',
      cons: 'Упаковка могла быть лучше',
      productValuation: 4,
      createdDate: '2024-01-10T14:20:00Z',
      userName: 'Михаил П.',
      photoLinks: [],
      matchingSize: 'ok'
    },
    {
      id: '3',
      text: 'Товар соответствует описанию. Качество хорошее.',
      pros: 'Соответствует описанию',
      cons: 'Долго ждал доставку',
      productValuation: 4,
      createdDate: '2024-01-05T16:45:00Z',
      userName: 'Елена С.',
      photoLinks: [],
      matchingSize: 'small'
    }
  ]

  const addToCart = (product: Product) => {
    logActivity('add_to_cart', { product_id: product.id, wb_id: product.wb_id || product.marketplace_id, name: product.name, price: product.price })
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id)
      let newCart
      if (existingItem) {
        newCart = prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      } else {
        newCart = [...prevCart, { product, quantity: 1, addedAt: new Date().toISOString() }]
      }
      localStorage.setItem('miniAppCart', JSON.stringify(newCart))
      return newCart
    })
    setAddedProductName(product.name)
    setShowAddToCartNotification(true)
    setTimeout(() => setShowAddToCartNotification(false), 3000)
  }

  // Функция для проверки новых заказов в WB
  const checkNewOrders = async () => {
    try {
      if (!wbAuthStatus.isAuthenticated) return

      // Получаем текущую корзину из localStorage
      const currentCart = JSON.parse(localStorage.getItem('miniAppCart') || '[]')
      
      if (currentCart.length === 0) return

      // Получаем заказы из WB
      let wbOrders: any[] = []
      try {
        wbOrders = await wbAuthInstance.fetchOrders()
        console.log('📋 Получены заказы из WB:', wbOrders)
      } catch (error) {
        console.error('❌ Ошибка получения заказов из WB:', error)
        return
      }

      if (wbOrders.length === 0) return

      // Проверяем каждый товар в корзине
      const updatedCart = currentCart.filter((cartItem: CartItem) => {
        const cartItemAddedAt = new Date(cartItem.addedAt || Date.now())
        
        // Ищем заказы, созданные после добавления товара в корзину
        const hasNewOrder = wbOrders.some((wbOrder: any) => {
          // Проверяем дату создания заказа (order_dt в секундах)
          const orderCreatedAt = new Date((wbOrder.order_dt || 0) * 1000)
          
          // Проверяем, что заказ создан после добавления товара в корзину
          if (orderCreatedAt <= cartItemAddedAt) return false
          
          // Проверяем, есть ли этот товар в заказе
          return wbOrder.rids && wbOrder.rids.some((rid: any) => {
            const productId = cartItem.product.marketplace_id || cartItem.product.wb_id
            return rid.nm_id?.toString() === productId?.toString() ||
                   rid.name === cartItem.product.name
          })
        })
        
        // Если есть новый заказ для этого товара, удаляем его из корзины
        if (hasNewOrder) {
          console.log(`🔄 Удаляем товар ${cartItem.product.name} - найден в заказе WB`)
          return false
        }
        
        return true
      })
      
      // Обновляем корзину если что-то изменилось
      if (updatedCart.length !== currentCart.length) {
        setCart(updatedCart)
        localStorage.setItem('miniAppCart', JSON.stringify(updatedCart))
        console.log('🔄 Корзина обновлена: удалены товары, которые были заказаны в WB')
      }
    } catch (error) {
      console.error('Ошибка при проверке заказов WB:', error)
    }
  }

  // Функция для открытия корзины с проверкой заказов
  const openCart = async () => {
    logActivity('view_cart', { items: cart.map(i => ({ id: i.product.id, name: i.product.name, qty: i.quantity })) })
    setCurrentView('cart')
    await checkNewOrders()
  }

  const removeFromCart = (productId: string) => {
    const item = cart.find(c => c.product.id === productId)
    if (item) logActivity('remove_from_cart', { product_id: item.product.id, name: item.product.name })
    setCart(prevCart => {
      const newCart = prevCart.reduce((acc, item) => {
        if (item.product.id === productId) {
          if (item.quantity > 1) acc.push({ ...item, quantity: item.quantity - 1 })
        } else {
          acc.push(item)
        }
        return acc
      }, [] as CartItem[])
      localStorage.setItem('miniAppCart', JSON.stringify(newCart))
      return newCart
    })
  }

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0)
  }

  // Функция для расчета баллов за покупку
  const calculateLoyaltyPoints = (totalPrice: number) => {
    if (totalPrice <= 200) {
      return 10
    } else if (totalPrice <= 500) {
      return 40
    } else if (totalPrice <= 700) {
      return 60
    } else if (totalPrice >= 1000) {
      return 90
    } else {
      // Для промежуточных значений
      return Math.floor(totalPrice * 0.08) // 8% от суммы
    }
  }

  const handleCheckout = async () => {
    logActivity('checkout_start', { items: cart.map(i => ({ id: i.product.id, name: i.product.name, qty: i.quantity, price: i.product.price })) })
    try {
      if (!wbAuthStatus.isAuthenticated) {
        setShowWbAuthModal(true)
        return
      }
      const wbProducts = cart.filter(item => item.product.marketplace === 'wildberries')
      if (wbProducts.length > 0) {
        await processPurchase('wildberries', wbProducts)
      } else {
        alert('Корзина пуста')
      }
    } catch (error) {
      console.error('Error during checkout:', error)
      alert('Произошла ошибка при оформлении заказа. Попробуйте еще раз.')
    }
  }

  const handleWBAuthSuccess = async () => {
    logActivity('auth_success', { provider: 'wildberries' })
    setShowWbAuthModal(false)
    setWbAuthStatus({ isAuthenticated: true })
    await checkWBAuth(userId)
  }

  const loadLoyaltyPoints = async () => {
    try {
      // Используем новую функцию для получения Telegram User ID
      const loyaltyUserId = getTelegramUserId()
      console.log('🎯 Telegram User ID для баллов лояльности:', loyaltyUserId)
      
      // Сохраняем ID для будущего использования
      localStorage.setItem('telegram_user_id', loyaltyUserId)
      
      let loyaltyData = await getLoyaltyPoints(loyaltyUserId)
      
      if (!loyaltyData) {
        // Создаем нового пользователя лояльности
        loyaltyData = await createLoyaltyUser(loyaltyUserId)
      }
      
      setLoyaltyUser(loyaltyData)
    } catch (error) {
      console.error('❌ Ошибка загрузки баллов лояльности:', error)
    }
  }

  const processPurchase = async (marketplace: 'wildberries', cartItems: CartItem[]) => {
    try {
      console.log('🔄 Начинаем обработку заказа Wildberries...')
      console.log('📦 Товары в корзине:', cartItems)

      // Показываем анимацию загрузки
      setIsLoading(true)

      // Проверяем авторизацию
      const sessionExists = await wbAuthInstance.checkSession()
      if (!sessionExists) {
        console.error('WildberriesAuth session not available')
        setIsLoading(false)
        alert('Ошибка авторизации. Попробуйте авторизоваться заново.')
        setShowWbAuthModal(true)
        return
      }
      
      let successCount = 0
      let errorCount = 0
      let needsReauth = false
      
      for (const item of cartItems) {
        try {
          const cod_1s = parseInt(item.product.marketplace_id || item.product.wb_id || '0')
          if (cod_1s > 0) {
            const result = await wbAuthInstance.addToCart(cod_1s.toString(), item.quantity)
            if (result.success) {
              successCount++
              // Проверяем, нужна ли повторная авторизация
              if (result.needsReauth) {
                needsReauth = true
              }
            } else {
              errorCount++
              console.error(`Ошибка добавления товара ${item.product.name}:`, result.message)
            }
          } else {
            errorCount++
          }
        } catch (error) {
          errorCount++
          console.error(`Ошибка добавления товара ${item.product.name}:`, error)
        }
      }

      // Если WB вернул state=1 (needsReauth), считаем успехом и просто открываем корзину
      if (needsReauth) {
        setIsLoading(false)
        try {
          if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.openLink('https://www.wildberries.ru/lk/basket')
          } else {
            window.open('https://www.wildberries.ru/lk/basket', '_blank')
          }
        } catch (e) {
          setSuccessData({ successCount, errorCount })
          setShowSuccessModal(true)
        }
        return
      }

      if (successCount > 0) {
        // Обычное добавление без подтверждения → сразу открываем корзину WB
        setIsLoading(false)
        try {
          if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.openLink('https://www.wildberries.ru/lk/basket')
          } else {
            window.open('https://www.wildberries.ru/lk/basket', '_blank')
          }
        } catch (e) {
          // Fallback: показать попап успеха
          setSuccessData({ successCount, errorCount })
          setShowSuccessModal(true)
        }
      } else {
        setIsLoading(false)
        alert(`❌ Не удалось добавить товары в корзину Wildberries.\n\nПопробуйте авторизоваться заново.`)
        setShowWbAuthModal(true)
      }

    } catch (error) {
      console.error('Error in processPurchase:', error)
      setIsLoading(false)
      alert('Произошла ошибка при обработке заказа. Попробуйте еще раз.')
    }
  }

  const openMarketplace = (marketplace: 'wildberries', products: CartItem[]) => {
      openWildberries(products)
  }

  const openWildberries = (products: CartItem[]) => {
    console.log('Opening Wildberries basket')
    
    if (window.Telegram?.WebApp) {
      // В Telegram WebApp используем специальный API
      try {
        console.log('Using Telegram WebApp API to open Wildberries')
        window.Telegram.WebApp.openLink('https://www.wildberries.ru/lk/basket')
      } catch (error) {
        console.error('Error opening Wildberries basket via Telegram API:', error)
        // Fallback на обычное открытие
        window.open('https://www.wildberries.ru/lk/basket', '_blank')
      }
    } else {
      // В обычном браузере открываем корзину Wildberries
      console.log('Using standard browser window.open')
      window.open('https://www.wildberries.ru/lk/basket', '_blank')
    }
  }



  const openProductDetail = (product: Product) => {
    logActivity('view_product', { product_id: product.id, wb_id: product.wb_id || product.marketplace_id, name: product.name })
    setSelectedProduct(product)
    setCurrentView('product-detail')
    loadProductReviews(product)
  }
  
  // Принудительная загрузка баллов при открытии профиля
  const openProfile = () => {
    setCurrentView('profile')
    // Принудительно загружаем баллы при открытии профиля
        setTimeout(() => {
      loadLoyaltyPoints()
    }, 100)
  }
  
  // Функция для получения Telegram User ID из различных источников
  const getTelegramUserId = () => {
    // Способ 1: Из URL параметров (основной способ)
    const urlParams = new URLSearchParams(window.location.search)
    const tgUserId = urlParams.get('tg_user_id') || urlParams.get('user_id') || urlParams.get('id') || urlParams.get('from')
    if (tgUserId) {
      console.log('🎯 Telegram ID из URL параметров:', tgUserId)
      return tgUserId
    }
    
    // Способ 2: Из hash URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const hashTgUserId = hashParams.get('tg_user_id') || hashParams.get('user_id') || hashParams.get('id') || hashParams.get('from')
    if (hashTgUserId) {
      console.log('🎯 Telegram ID из hash URL:', hashTgUserId)
      return hashTgUserId
    }
    
    // Способ 3: Из Telegram WebApp
    const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user
    if (telegramUser?.id) {
      console.log('🎯 Telegram ID из WebApp:', telegramUser.id)
      return telegramUser.id.toString()
    }
    
    // Способ 4: Из localStorage
    const storedTgId = localStorage.getItem('telegram_user_id')
    if (storedTgId) {
      console.log('🎯 Telegram ID из localStorage:', storedTgId)
      return storedTgId
    }
    
    // Способ 5: Из wb_user_id
    const storedWbId = localStorage.getItem('wb_user_id')?.replace('telegram_', '')
    if (storedWbId && storedWbId !== 'undefined') {
      console.log('🎯 Telegram ID из wb_user_id:', storedWbId)
      return storedWbId
    }
    
    // Способ 6: Тестовый ID
    console.log('🎯 Используется тестовый Telegram ID')
    return '123456789'
  }

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'sm') => {
    const sizeClass = size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  // Фильтрация товаров
  const filteredProducts = products.filter(product => {
    // Фильтр по поиску
    const matchesSearch = searchQuery === '' || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Фильтр по категории/маркетплейсу
    let matchesCategory = true
    if (selectedCategory === 'wildberries') {
      matchesCategory = product.marketplace === 'wildberries'
    } else if (selectedCategory !== 'all') {
      matchesCategory = product.category === selectedCategory
    }
    
    return matchesSearch && matchesCategory
  })

  // Получаем уникальные категории
  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))]
  
  // Отладочная информация
  console.log('MiniApp Debug:', {
    totalProducts: products.length,
    categories,
    selectedCategory,
    filteredProductsCount: filteredProducts.length,
    productsWithMarketplace: products.filter(p => p.marketplace).length,
    sampleProducts: products.slice(0, 3).map(p => ({
      id: p.id,
      name: p.name,
      marketplace: p.marketplace,
      category: p.category
    }))
  })

  const getMarketplaceBadge = (marketplace: string) => {
    return marketplace === 'wildberries' ? (
      <div className="absolute top-2 right-12 bg-purple-500 text-white text-xs px-2 py-1 rounded shadow-lg">
        WB
      </div>
    ) : null
  }

  if (loading) {
    return (
      <LoadingSpinner 
        message="Инициализация приложения..."
        size="lg"
        showSteps={true}
      />
    )
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Магазин не найден</h2>
          <p className="text-gray-400">Проверьте правильность ссылки</p>
        </div>
      </div>
    )
  }



  // Профиль - Dark Theme
  if (currentView === 'profile') {
    return (
      <div className="min-h-screen bg-gray-900 pb-20">
        <div className="bg-gray-900 px-4 py-4">
          <div className="flex items-center space-x-3">
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => setCurrentView('catalog')}
              className="text-white hover:bg-gray-800"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold text-white">Профиль</h1>
          </div>
        </div>

        <div className="p-4">
          <div className="bg-gray-800 rounded-lg p-6 mb-4">
            <div className="text-center">
              <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Пользователь</h3>
              <p className="text-gray-400 mb-4">Информация о пользователе</p>
              
              {/* Статус авторизации */}
              <div className="bg-gray-700 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">Wildberries</span>
                  {wbAuthStatus.isAuthenticated ? (
                    <div className="flex items-center space-x-2 text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">Авторизован</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-orange-400">
                      <LogIn className="h-4 w-4" />
                      <span className="text-sm">Не авторизован</span>
                    </div>
                  )}
                </div>
              </div>
              
              <Button 
                onClick={() => setShowWbAuthModal(true)}
                className="w-full bg-purple-600 hover:bg-purple-700 mb-4"
              >
                {wbAuthStatus.isAuthenticated ? 'Переавторизоваться' : 'Авторизоваться'}
              </Button>



              {/* Баллы лояльности */}
              {loyaltyUser ? (
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-4 mb-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <Gift className="h-5 w-5 text-white" />
                      <h4 className="text-lg font-semibold text-white">Баллы лояльности</h4>
                    </div>
                    <p className="text-purple-200 text-xs mb-3">
                      Привязано к Telegram ID
                    </p>
                    <div className="flex items-center justify-center space-x-4 mb-3">
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-1 mb-1">
                          <Award className="h-4 w-4 text-yellow-300" />
                          <div className="text-2xl font-bold text-white">{loyaltyUser.total_points}</div>
                        </div>
                        <div className="text-xs text-purple-200">Всего баллов</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-1 mb-1">
                          <TrendingUp className="h-4 w-4 text-green-300" />
                          <div className="text-2xl font-bold text-white">{loyaltyUser.available_points}</div>
                        </div>
                        <div className="text-xs text-purple-200">Доступно</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-1 mb-1">
                          <Gift className="h-4 w-4 text-purple-300" />
                          <div className="text-2xl font-bold text-white">{loyaltyUser.completed_orders}</div>
                        </div>
                        <div className="text-xs text-purple-200">Заказов</div>
                      </div>
                    </div>
                    
                                         {/* Уровень лояльности */}
                     {(() => {
                       const levelInfo = getLevelInfo(loyaltyUser.total_points)
                       return (
                         <div className="flex items-center justify-center space-x-2">
                           <div className={`text-lg font-semibold ${levelInfo.color}`}>
                             {levelInfo.name}
                           </div>
                           <div className="text-xs text-purple-200">
                             Уровень
                           </div>
                         </div>
                       )
                     })()}
                   
                   {/* Кнопка управления кэшбеком */}
                   <button
                     onClick={() => setCurrentView('cashback-management')}
                     className="mt-4 w-full bg-white/20 hover:bg-white/30 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                   >
                     <DollarSign className="h-4 w-4" />
                     <span>Управление кэшбеком</span>
                     <ArrowRight className="h-4 w-4" />
                   </button>
                 </div>
               </div>
               ) : !loyaltyUser ? (
                 <div className="bg-gray-700 rounded-lg p-4 mb-4">
                   <div className="text-center">
                     <div className="flex items-center justify-center space-x-2 mb-2">
                       <Gift className="h-5 w-5 text-gray-400" />
                       <h4 className="text-lg font-semibold text-gray-300">Баллы лояльности</h4>
                     </div>
                     <p className="text-gray-400 text-sm">
                       Загрузка баллов лояльности...
                     </p>
                     <button
                       onClick={() => {
                         // Принудительно загружаем баллы с тестовым ID
                         const testUserId = '123456789'
                         localStorage.setItem('telegram_user_id', testUserId)
                         loadLoyaltyPoints()
                       }}
                       className="mt-2 px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                     >
                       Обновить баллы
                     </button>
                                          <button
                       onClick={async () => {
                         // Показываем индикатор загрузки
                         const button = event?.target as HTMLButtonElement
                         const originalText = button.textContent
                         button.textContent = 'Привязка...'
                         button.disabled = true
                         
                         try {
                           // Способ 1: Из URL параметров (основной способ)
                           const urlParams = new URLSearchParams(window.location.search)
                           const tgUserId = urlParams.get('tg_user_id') || urlParams.get('user_id') || urlParams.get('id') || urlParams.get('from')
                           if (tgUserId) {
                             localStorage.setItem('telegram_user_id', tgUserId)
                             console.log('✅ Привязан Telegram ID из URL:', tgUserId)
                             loadLoyaltyPoints()
                             return
                           }

                           // Способ 2: Из hash URL
                           const hashParams = new URLSearchParams(window.location.hash.substring(1))
                           const hashTgUserId = hashParams.get('tg_user_id') || hashParams.get('user_id') || hashParams.get('id') || hashParams.get('from')
                           if (hashTgUserId) {
                             localStorage.setItem('telegram_user_id', hashTgUserId)
                             console.log('✅ Привязан Telegram ID из hash URL:', hashTgUserId)
                             loadLoyaltyPoints()
                             return
                           }

                           // Способ 3: Прямой доступ к Telegram WebApp
                           const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user
                           if (telegramUser?.id) {
                             const realUserId = telegramUser.id.toString()
                             localStorage.setItem('telegram_user_id', realUserId)
                             console.log('✅ Привязан реальный Telegram ID:', realUserId)
                             loadLoyaltyPoints()
                             return
                           }

                           // Способ 4: Через Edge Function
                           const webApp = window.Telegram?.WebApp
                           if (webApp && (webApp as any).initData) {
                             try {
                               const response = await fetch('/functions/v1/get-telegram-user', {
                                 method: 'POST',
                                 headers: {
                                   'Content-Type': 'application/json',
                                   'Authorization': `Bearer ${(window as any).supabaseKey}`
                                 },
                                 body: JSON.stringify({
                                   telegram_user_id: '123456789' // Тестовый ID для проверки
                                 })
                               })
                               
                               if (response.ok) {
                                 const data = await response.json()
                                 if (data.success && data.user_id) {
                                   localStorage.setItem('telegram_user_id', data.user_id.toString())
                                   console.log('✅ Привязан Telegram ID через API:', data.user_id)
                                   loadLoyaltyPoints()
                                   return
                                 }
                               }
                             } catch (apiError) {
                               console.log('⚠️ Edge Function недоступна, пробуем другие способы')
                             }
                           }

                           // Способ 5: Генерируем уникальный ID
                           const uniqueId = Date.now().toString()
                           localStorage.setItem('telegram_user_id', uniqueId)
                           console.log('✅ Создан уникальный Telegram ID:', uniqueId)
                           loadLoyaltyPoints()
                           
                         } catch (error) {
                           console.error('❌ Ошибка при привязке Telegram:', error)
                           // Fallback - создаем уникальный ID
                           const uniqueId = Date.now().toString()
                           localStorage.setItem('telegram_user_id', uniqueId)
                           loadLoyaltyPoints()
                         } finally {
                           // Восстанавливаем кнопку
                           if (button) {
                             button.textContent = originalText
                             button.disabled = false
                           }
                         }
                       }}
                       className="mt-2 ml-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                     >
                       Привязать Telegram
                     </button>
                     <button
                       onClick={() => setIsLoyaltyInfoModalOpen(true)}
                       className="mt-2 ml-2 px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 flex items-center space-x-1"
                     >
                       <Info className="h-3 w-3" />
                       <span>О программе</span>
                     </button>
                     <button
                       onClick={() => setCurrentView('cashback-management')}
                       className="mt-2 ml-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center space-x-1"
                     >
                       <DollarSign className="h-3 w-3" />
                       <span>Кэшбек</span>
                     </button>
                   </div>
                 </div>
               ) : null}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Основной рендер с модальным окном
  return (
    <div className="tg-app relative">
      {/* Модальное окно с информацией о программе лояльности */}
      <LoyaltyInfoModal 
        isOpen={isLoyaltyInfoModalOpen}
        onClose={() => setIsLoyaltyInfoModalOpen(false)}
      />
      
      {currentView === 'product-detail' && selectedProduct ? (
        // Детальная страница товара - Dark Theme
        <div className="min-h-screen bg-gray-900 pb-20 pt-safe">
        {/* Заголовок */}
          <div className="bg-gray-900 px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setCurrentView('catalog')}
                  className="text-white hover:bg-gray-800"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-lg font-bold text-white">Товар</h1>
              </div>
              <div className="relative">
                <Button 
                  size="sm" 
                  className="relative bg-purple-600 hover:bg-purple-700"
                  onClick={() => {
                    openCart()
                  }}
                >
                  <ShoppingCart className="h-4 w-4" />
                  {getTotalItems() > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {getTotalItems()}
                    </span>
                  )}
                </Button>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Изображения товара */}
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            {selectedProduct.images && selectedProduct.images.length > 0 ? (
              <div className="relative">
              <img
                  src={getImageUrl(selectedProduct.images[currentImageIndex[selectedProduct.id] || 0])}
                alt={selectedProduct.name}
                className="w-full h-80 object-cover"
                  onError={(e) => {
                    const currentIndex = currentImageIndex[selectedProduct.id] || 0
                    const nextIndex = currentIndex + 1
                    
                    console.log(`❌ Ошибка загрузки изображения ${currentIndex + 1}/${selectedProduct.images.length} для товара ${selectedProduct.id}`)
                    
                    if (nextIndex < selectedProduct.images.length) {
                      console.log(`🔄 Переключаемся на изображение ${nextIndex + 1}`)
                      setCurrentImageIndex(prev => ({
                        ...prev,
                        [selectedProduct.id]: nextIndex
                      }))
                    } else {
                      console.log(`💤 Показываем placeholder для товара ${selectedProduct.id}`)
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjM0I0NTU5Ii8+CjxwYXRoIGQ9Ik0xNTAgODBDMTY1LjUyNiA4MCAxNzggOTIuNDc0IDUxNzggMTA1LjQ3NEMxNzggMTE4LjQ3NCAxNjUuNTI2IDEzMSAxNTAgMTMxQzEzNC40NzQgMTMxIDEyMiAxMTguNDc0IDEyMiAxMDUuNDc0QzEyMiA5Mi40NzQgMTM0LjQ3NCA4MCAxNTAgODBaIiBmaWxsPSIjN0M4M0Q5Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0Ij7QndC10YI6INC40LfQvtCx0YDQsNC20LXQvdC40Y88L3RleHQ+Cjwvc3ZnPgo='
                    }
                  }}
                />
                
                {/* Индикаторы изображений */}
                {selectedProduct.images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                    {selectedProduct.images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setCurrentImageIndex(prev => ({
                            ...prev,
                            [selectedProduct.id]: index
                          }))
                        }}
                        className={`w-3 h-3 rounded-full transition-all duration-200 ${
                          index === (currentImageIndex[selectedProduct.id] || 0) 
                            ? 'bg-white' 
                            : 'bg-white/50 hover:bg-white/75'
                        }`}
                      />
                    ))}
                  </div>
                )}
                
                {/* Счетчик изображений */}
                {selectedProduct.images.length > 1 && (
                  <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                    {(currentImageIndex[selectedProduct.id] || 0) + 1} / {selectedProduct.images.length}
                  </div>
                )}
                
                {/* Кнопки навигации */}
                {selectedProduct.images.length > 1 && (
                  <>
                    <button
                      onClick={() => {
                        const currentIndex = currentImageIndex[selectedProduct.id] || 0
                        const newIndex = currentIndex > 0 ? currentIndex - 1 : selectedProduct.images.length - 1
                        setCurrentImageIndex(prev => ({
                          ...prev,
                          [selectedProduct.id]: newIndex
                        }))
                      }}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-10 h-10 flex items-center justify-center transition-all duration-200"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {
                        const currentIndex = currentImageIndex[selectedProduct.id] || 0
                        const newIndex = currentIndex < selectedProduct.images.length - 1 ? currentIndex + 1 : 0
                        setCurrentImageIndex(prev => ({
                          ...prev,
                          [selectedProduct.id]: newIndex
                        }))
                      }}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-10 h-10 flex items-center justify-center transition-all duration-200"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="w-full h-80 bg-gray-700 flex items-center justify-center">
                <Package className="h-16 w-16 text-gray-400" />
              </div>
            )}
          </div>

          {/* Информация о товаре */}
            <div className="bg-gray-800 rounded-lg p-4 space-y-4">
            <div>
                <h2 className="text-xl font-bold text-white mb-2">
                {selectedProduct.name}
              </h2>
              {selectedProduct.brand && (
                  <p className="text-sm text-gray-300 mb-2">{selectedProduct.brand}</p>
              )}
              
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center space-x-2">
                    {renderStars(Math.round(selectedProduct.rating || 0), 'md')}
                    <span className="text-sm font-medium text-white">{(selectedProduct.rating || 0).toFixed(1)}</span>
                </div>
                  <span className="text-sm text-gray-300">
                  {selectedProduct.feedbacks || 0} отзывов
                </span>
              </div>

              <div className="flex items-center space-x-4">
                {selectedProduct.originalPrice && selectedProduct.originalPrice > selectedProduct.price ? (
                  <>
                      <div className="text-sm text-gray-400 line-through">
                      {formatPrice(selectedProduct.originalPrice)}
                    </div>
                      <div className="text-2xl font-bold text-purple-400">
                      {formatPrice(selectedProduct.price)}
                    </div>
                      <Badge className="bg-red-600 text-white">
                      -{Math.round((1 - selectedProduct.price / selectedProduct.originalPrice) * 100)}%
                    </Badge>
                  </>
                ) : (
                    <div className="text-2xl font-bold text-purple-400">
                    {formatPrice(selectedProduct.price)}
                  </div>
                )}
              </div>
            </div>

            {selectedProduct.description && (
              <div>
                  <h3 className="font-semibold mb-2 text-white">Описание</h3>
                  <p className="text-gray-300 text-sm">{selectedProduct.description}</p>
              </div>
            )}

            {/* Кнопки действий */}
            <div className="flex space-x-3 pt-4">
              {cart.find(item => item.product.id === selectedProduct.id) ? (
                <div className="flex items-center space-x-3 flex-1">
                  <Button
                    variant="outline"
                    onClick={() => removeFromCart(selectedProduct.id)}
                      className="border-gray-600 text-white hover:bg-gray-700"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                    <span className="font-medium text-lg text-white">
                    {cart.find(item => item.product.id === selectedProduct.id)?.quantity || 0}
                  </span>
                  <Button
                    onClick={() => addToCart(selectedProduct)}
                      className="bg-purple-600 hover:bg-purple-700 active:scale-95 transition-transform duration-100"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                    className="flex-1 bg-purple-600 hover:bg-purple-700 active:scale-95 transition-transform duration-100"
                  onClick={() => addToCart(selectedProduct)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  В корзину
                </Button>
              )}
                <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-700">
                <Heart className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Отзывы */}
            <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Отзывы ({productReviews.length})</h3>
              <div className="flex items-center space-x-2">
                  {renderStars(Math.round((productReviews.reduce((sum, review) => sum + review.productValuation, 0) / productReviews.length) || 0), 'sm')}
                  <span className="text-sm font-medium text-white">
                    {((productReviews.reduce((sum, review) => sum + review.productValuation, 0) / productReviews.length) || 0).toFixed(1)}
                  </span>
              </div>
            </div>

            {reviewsLoading ? (
              <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {productReviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-600 pb-4 last:border-b-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <p className="font-medium text-sm text-white">{review.userName}</p>
                          <div className="flex items-center space-x-2">
                            {renderStars(review.productValuation, 'sm')}
                              <span className="text-xs text-gray-400">
                              {new Date(review.createdDate).toLocaleDateString('ru-RU')}
                            </span>
                          </div>
                        </div>
                      </div>
                      {review.matchingSize === 'small' && (
                          <Badge variant="outline" className="text-xs border-gray-600 text-white">Маломерит</Badge>
                      )}
                      {review.matchingSize === 'big' && (
                          <Badge variant="outline" className="text-xs border-gray-600 text-white">Большемерит</Badge>
                      )}
                    </div>

                      <p className="text-sm text-gray-300 mb-2">{review.text}</p>

                    {(review.pros || review.cons) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        {review.pros && (
                          <div className="flex items-start space-x-2">
                              <ThumbsUp className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-xs font-medium text-green-400">Достоинства</p>
                                <p className="text-xs text-gray-300">{review.pros}</p>
                            </div>
                          </div>
                        )}
                        {review.cons && (
                          <div className="flex items-start space-x-2">
                              <ThumbsDown className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-xs font-medium text-red-400">Недостатки</p>
                                <p className="text-xs text-gray-300">{review.cons}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {review.photoLinks && review.photoLinks.length > 0 && (
                      <div className="flex space-x-2 mb-3">
                        {review.photoLinks.map((photo, index) => {
                          // Проверяем, что photo является строкой
                          if (typeof photo !== 'string') {
                            console.log('❌ Неверный тип photo в отзыве:', typeof photo, photo)
                            return null
                          }
                          
                          // Генерируем URL для фото отзыва
                          const photoUrl = generateReviewPhotoUrl(review.id, photo)
                          
                          return (
                          <img
                            key={index}
                              src={photoUrl}
                            alt="Фото отзыва"
                              className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => {
                                // Открываем фото в полном размере
                                if (photoUrl) {
                                  window.open(photoUrl, '_blank')
                                }
                              }}
                              onError={(e) => {
                                console.log(`❌ Ошибка загрузки фото отзыва: ${photoUrl}`)
                                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjM0I0NTU5Ii8+CjxwYXRoIGQ9Ik0zMiAxNkMyNC4yNjggMTYgMTggMjIuMjY4IDE4IDMwQzE4IDM3LjczMiAyNC4yNjggNDQgMzIgNDRDMzkuNzMyIDQ0IDQ2IDM3LjczMiA0NiAzMEM0NiAyMi4yNjggMzkuNzMyIDE2IDMyIDE2WiIgZmlsbD0iIzdEOENEOSIvPgo8dGV4dCB4PSIzMiIgeT0iNTIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iOCI+0J3QtdGCPC90ZXh0Pgo8L3N2Zz4K'
                              }}
                            />
                          )
                        })}
                      </div>
                    )}

                    {review.answer && (
                        <div className="bg-gray-700 rounded-lg p-3 mt-3">
                        <div className="flex items-center space-x-2 mb-2">
                            <Shield className="h-4 w-4 text-purple-400" />
                            <span className="text-xs font-medium text-purple-400">Ответ продавца</span>
                            <span className="text-xs text-gray-400">
                            {new Date(review.answer.createdDate).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                          <p className="text-xs text-gray-300">{review.answer.text}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      ) : currentView === 'cart' ? (
        // Корзина - Dark Theme
        <div className="min-h-screen bg-gray-900 text-white pb-20 pt-safe">
        {/* Заголовок корзины */}
          <div className="bg-gray-900 px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setCurrentView('catalog')}
                  className="text-white hover:bg-gray-800"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-xl font-bold text-white">Корзина</h1>
              </div>
              <div className="text-sm text-gray-300">
                {getTotalItems()} товар(ов)
            </div>
          </div>
        </div>

        {/* Содержимое корзины */}
        <div className="p-4">
          {cart.length > 0 ? (
            <div className="space-y-4">
              {cart.map((item) => (
                  <div key={item.product.id} className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-14 h-14 flex-shrink-0">
                        {item.product.images && item.product.images.length > 0 ? (
                          <img
                            src={item.product.images[0]}
                            alt={item.product.name}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-700 rounded flex items-center justify-center">
                            <Package className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm line-clamp-2 text-white mb-1">
                          {item.product.name}
                        </h3>
                        <div>
                          <p className="text-base font-bold text-purple-400">
                          {formatPrice(item.product.price)}
                        </p>
                          {item.product.originalPrice && item.product.originalPrice > item.product.price && (
                            <p className="text-xs text-gray-400 line-through">
                              {formatPrice(item.product.originalPrice)}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          onClick={() => removeFromCart(item.product.id)}
                          className="bg-purple-600 hover:bg-purple-700 active:scale-95 transition-transform duration-100 w-8 h-8 p-0 flex items-center justify-center"
                        >
                          <Minus className="h-3 w-3 text-white" />
                        </Button>
                        <span className="font-medium w-10 text-center text-white text-sm">
                          {item.quantity}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => addToCart(item.product)}
                          className="bg-purple-600 hover:bg-purple-700 active:scale-95 transition-transform duration-100 w-8 h-8 p-0 flex items-center justify-center"
                        >
                          <Plus className="h-3 w-3 text-white" />
                        </Button>
                      </div>
                    </div>
                  </div>
              ))}

              {/* Итого */}
                <div className="bg-gray-800 rounded-lg p-4 mt-6">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-semibold text-white">Итого:</span>
                    <span className="text-2xl font-bold text-purple-400">
                    {formatPrice(getTotalPrice())}
                  </span>
                </div>
                  
                  {/* Статус авторизации */}
                  <div className="mb-4 p-3 rounded-lg border border-gray-600">
                    {wbAuthStatus.isAuthenticated ? (
                      <div className="flex items-center space-x-2 text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">Авторизован в Wildberries</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-orange-400">
                        <LogIn className="h-4 w-4" />
                        <span className="text-sm">Требуется авторизация в Wildberries</span>
                      </div>
                    )}
                  </div>
                  
                <Button 
                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 mb-3"
                  onClick={handleCheckout}
                >
                  🛒 Перейти к оформлению
                </Button>

                {/* Информация о баллах лояльности */}
                <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg p-4 border border-purple-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Gift className="h-5 w-5 text-purple-300" />
                      <span className="text-sm text-purple-200">Бонус за покупку</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-purple-300">
                        +{calculateLoyaltyPoints(getTotalPrice())} баллов
                      </div>
                      <div className="text-xs text-purple-400">
                        За {formatPrice(getTotalPrice())}
                      </div>
                    </div>
                  </div>
                  
                  {/* Прогресс до следующего уровня */}
                  {loyaltyUser && (() => {
                    const currentPoints = loyaltyUser.total_points
                    const newPoints = currentPoints + calculateLoyaltyPoints(getTotalPrice())
                    const nextLevel = newPoints >= 10000 ? null :
                                     newPoints >= 5000 ? 10000 :
                                     newPoints >= 2000 ? 5000 :
                                     newPoints >= 500 ? 2000 : 500
                    
                    if (nextLevel) {
                      const progress = (newPoints / nextLevel) * 100
                      const levelName = newPoints >= 10000 ? 'VIP' :
                                       newPoints >= 5000 ? 'Gold' :
                                       newPoints >= 2000 ? 'Silver' :
                                       newPoints >= 500 ? 'Bronze' : 'Новичок'
                      
                      return (
                        <div className="mt-3">
                          <div className="flex justify-between items-center text-xs text-purple-300 mb-1">
                            <span>До {levelName}</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <div className="w-full bg-purple-800/50 rounded-full h-2">
                            <div 
                              className="bg-purple-400 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Корзина пуста</h3>
                <p className="text-gray-400">Добавьте товары из каталога</p>
            </div>
          )}
        </div>
      </div>
      ) : currentView === 'profile' ? (
  // Профиль с лояльностью
      <div className="min-h-screen bg-gray-900 text-white pb-20 pt-safe">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {

                setCurrentView('catalog')
              }}
              className="text-purple-400 hover:text-purple-300 transition-colors p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-semibold">Профиль</h1>
          </div>
        </div>

        <div className="p-4">
          {/* Статистика лояльности */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-4 mb-4">
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

          {/* Уровень лояльности */}
          {loyaltyUser && (
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
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

          {/* Кнопка управления кэшбеком */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              console.log('🔍 Клик по кнопке "Управление кэшбеком"')
              setCurrentView('cashback-management')
            }}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-between mb-4"
          >
            <span>Управление кэшбеком</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          {/* Кнопка "О программе" */}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsLoyaltyInfoModalOpen(true)
            }}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-between"
          >
            <span>О программе лояльности</span>
            <Info className="h-4 w-4" />
          </button>
        </div>
      </div>
      ) : currentView === 'orders' ? (
        // Заказы
        <div className="pt-safe">
          <OrdersPage 
            wbAuthInstance={wbAuthInstance} 
            onBack={() => setCurrentView('catalog')}
          />
        </div>
      ) : currentView === 'cashback-management' ? (
        // Управление кэшбеком
        <div className="min-h-screen bg-gray-900 text-white">
          <CashbackManagement 
            loyaltyUser={loyaltyUser} 
            onBack={() => setCurrentView('profile')}
          />
        </div>
      ) : (
        // Каталог (главная страница) - Wildberries Dark Theme
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pb-20 pt-safe">
          {/* Баннер программы лояльности */}
          <div className="bg-gradient-to-r from-purple-900 to-purple-800 px-4 py-4 shadow-lg">
            <div 
              className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-700 rounded-xl p-4 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-purple-400/30 hover:border-purple-300/50 relative overflow-hidden"
              onClick={(e) => {
                // Проверяем, что клик не был на кнопке информации
                if (!(e.target as HTMLElement).closest('button')) {
                  openProfile()
                }
              }}
            >
              {/* Анимированный фон */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 via-pink-400/10 to-purple-400/10 animate-pulse"></div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 rounded-full p-2 animate-pulse">
                    <Gift className="h-5 w-5 text-white drop-shadow-sm" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">EasyClean - сервис кэшбека</h3>
                    <p className="text-purple-100 text-xs">Зарабатываю на каждой покупке</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold text-lg animate-pulse">
                    {loyaltyUser ? loyaltyUser.total_points : 0}
                  </div>
                  <div className="text-purple-200 text-xs">баллов</div>
                </div>
          </div>

              {/* Прогресс-бар для следующего уровня */}
              {loyaltyUser && (() => {
                const levelInfo = getLevelInfo(loyaltyUser.total_points)
                const nextLevel = loyaltyUser.total_points >= 10000 ? null :
                                 loyaltyUser.total_points >= 5000 ? 10000 :
                                 loyaltyUser.total_points >= 2000 ? 5000 :
                                 loyaltyUser.total_points >= 500 ? 2000 : 500
                
                if (nextLevel) {
                  const progress = (loyaltyUser.total_points / nextLevel) * 100
                  return (
                    <div className="mt-3">
                      <div className="flex justify-between items-center text-xs text-purple-200 mb-1">
                        <span>До {levelInfo.name}</span>
                        <div className="flex items-center space-x-2">
                          <span>{Math.round(progress)}%</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setIsLoyaltyInfoModalOpen(true)
                            }}
                            className="bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-400 rounded-lg p-2.5 transition-all duration-300 transform hover:scale-110 shadow-lg animate-bounce"
                          >
                            <Info className="h-6 w-6 text-white drop-shadow-sm animate-pulse" />
                          </button>
          </div>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-400 to-pink-400 h-2 rounded-full transition-all duration-300 animate-pulse"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                }
                return null
              })()}
        </div>
      </div>

          {/* Search Bar */}
          <div className="bg-gradient-to-r from-purple-900 to-purple-800 px-4 py-4 shadow-lg">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white h-5 w-5" />
              <input
                type="text"
              placeholder="Поиск товаров..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-12 py-4 bg-purple-800/50 backdrop-blur-sm text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-50 placeholder-white/70 border border-purple-600/30"
              />
              <Camera className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white h-5 w-5" />
        </div>
      </div>



          {/* Список товаров - Grid 2 в ряд */}
      <div className="p-4">
        {pricesLoading && (
          <div className="text-center py-6 mb-4">
            <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-2xl shadow-lg">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              <span className="text-sm font-medium">Загружаем актуальные цены...</span>
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
                <div className="w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          {filteredProducts.map((product) => (
                <div 
              key={product.id} 
                  className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:scale-105 hover:-translate-y-1 border border-gray-700/50 overflow-hidden"
              onClick={() => openProductDetail(product)}
            >
                  <div className="relative overflow-hidden">
                {product.images && product.images.length > 0 ? (
                  <div className="relative">
                  <img
                        src={getImageUrl(product.images[currentImageIndex[product.id] || 0])}
                    alt={product.name}
                        className="w-full h-48 object-cover rounded-t-xl transition-transform duration-300 hover:scale-110"
                    onError={(e) => {
                          // Пробуем следующее изображение или показываем placeholder
                          const currentIndex = currentImageIndex[product.id] || 0
                          const nextIndex = currentIndex + 1
                          
                          console.log(`❌ Ошибка загрузки изображения ${currentIndex + 1}/${product.images.length} для товара ${product.id}`)
                          
                          if (nextIndex < product.images.length) {
                            console.log(`🔄 Переключаемся на изображение ${nextIndex + 1}`)
                            setCurrentImageIndex(prev => ({
                              ...prev,
                              [product.id]: nextIndex
                            }))
                          } else {
                            console.log(`💤 Показываем placeholder для товара ${product.id}`)
                            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjM0I0NTU5Ii8+CjxwYXRoIGQ9Ik0xNTAgODBDMTY1LjUyNiA4MCAxNzggOTIuNDc0IDUxNzggMTA1LjQ3NEMxNzggMTE4LjQ3NCAxNjUuNTI2IDEzMSAxNTAgMTMxQzEzNC40NzQgMTMxIDEyMiAxMTguNDc0IDEyMiAxMDUuNDc0QzEyMiA5Mi40NzQgMTM0LjQ3NCA4MCAxNTAgODBaIiBmaWxsPSIjN0M4M0Q5Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0Ij7QndC10YI6INC40LfQvtCx0YDQsNC20LXQvdC40Y88L3RleHQ+Cjwvc3ZnPgo='
                          }
                        }}
                      />
                    

                    
                    {/* Кнопки навигации */}
                    {product.images.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const currentIndex = currentImageIndex[product.id] || 0
                            const newIndex = currentIndex > 0 ? currentIndex - 1 : product.images.length - 1
                            setCurrentImageIndex(prev => ({
                              ...prev,
                              [product.id]: newIndex
                            }))
                          }}
                          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-9 h-9 flex items-center justify-center transition-all duration-200 backdrop-blur-sm shadow-lg"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const currentIndex = currentImageIndex[product.id] || 0
                            const newIndex = currentIndex < product.images.length - 1 ? currentIndex + 1 : 0
                            setCurrentImageIndex(prev => ({
                              ...prev,
                              [product.id]: newIndex
                            }))
                          }}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-9 h-9 flex items-center justify-center transition-all duration-200 backdrop-blur-sm shadow-lg"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-gray-700 to-gray-600 rounded-t-xl flex items-center justify-center">
                        <Package className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                    
                    {/* Discount Badge */}
                    {product.originalPrice && product.originalPrice > product.price && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs px-3 py-1 rounded-full shadow-lg">
                          -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                        </Badge>
                      </div>
                    )}
                    
                    {/* Favorite Button */}
                <Button
                  size="sm"
                  variant="ghost"
                      className="absolute top-2 right-2 bg-gray-800/90 hover:bg-purple-600/90 rounded-full w-8 h-8 p-0 text-white transition-all duration-200 shadow-lg"
                  onClick={(e) => {
                    e.stopPropagation()
                    // Добавить в избранное
                  }}
                >
                  <Heart className="h-4 w-4" />
                </Button>
                    
                    {/* Marketplace Badge */}
                    {getMarketplaceBadge(product.marketplace)}
              </div>
              
                  <div className="p-4 space-y-3">
                    <h3 className="font-semibold text-sm mb-2 line-clamp-2 text-white leading-tight">
                    {product.name}
                  </h3>
                  
                    {/* Brand */}
                  {product.brand && (
                      <div className="text-xs text-purple-300 font-medium mb-2">
                        {product.brand}
                      </div>
                    )}
                    
                    {/* Price */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-lg font-bold bg-gradient-to-r from-purple-400 to-purple-300 bg-clip-text text-transparent">
                            {formatPrice(product.price)}
                          </div>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <div className="text-xs text-gray-400 line-through">
                          {formatPrice(product.originalPrice)}
                      </div>
                    )}
                  </div>
                  
                    {/* Rating */}
                    <div className="flex items-center space-x-1 mb-3">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            className={`h-3 w-3 ${star <= Math.round(product.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} 
                          />
                        ))}
                          </div>
                      <span className="text-xs text-gray-300 font-medium">{(product.rating || 0).toFixed(1)}</span>
                      <span className="text-xs text-gray-400">({product.feedbacks || 0})</span>
                          </div>
                    
                    {/* Stock */}
                    <div className="text-xs text-gray-400 mb-4">
                      {product.stock && product.stock > 0 ? (
                        <span className="text-green-400">✓ В наличии: {product.stock} шт</span>
                      ) : (
                        <span className="text-red-400">✗ Нет в наличии</span>
                      )}
                    </div>
                    
                    {/* Add to Cart Button */}
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        addToCart(product)
                      }}
                      className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 active:scale-95"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      В корзину
                    </Button>
                  </div>
                </div>
          ))}
        </div>
        
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Товары не найдены</h3>
                <p className="text-gray-400">Попробуйте изменить поисковый запрос</p>
          </div>
        )}
      </div>

          {/* Bottom Navigation - Dark Theme with iPhone Safe Area Support */}
          <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-purple-900 to-purple-800 border-t border-purple-600 shadow-2xl backdrop-blur-sm pb-safe">
            <div className="grid grid-cols-5 h-16 px-4">
          <button
                         onClick={() => {
               setCurrentView('catalog')
             }}
            className={`flex flex-col items-center justify-center space-y-1 ${
                  currentView === 'catalog' ? 'text-white' : 'text-purple-300'
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">Главная</span>
          </button>
          
          <button
            onClick={() => {
              openCart()
            }}
            className={`flex flex-col items-center justify-center space-y-1 relative ${
              currentView === 'cart' ? 'text-white' : 'text-purple-300'
            }`}
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="text-xs">Корзина</span>
            {getTotalItems() > 0 && (
              <span className="absolute top-1 right-6 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {getTotalItems()}
              </span>
            )}
          </button>
          
          <button
                         onClick={() => {
               setCurrentView('orders')
             }}
            className={`flex flex-col items-center justify-center space-y-1 ${
                  currentView === 'orders' ? 'text-white' : 'text-purple-300'
            }`}
          >
            <Package className="h-5 w-5" />
            <span className="text-xs">Заказы</span>
          </button>
              
              <button
                onClick={() => setShowWbAuthModal(true)}
                className={`flex flex-col items-center justify-center space-y-1 ${
                  wbAuthStatus.isAuthenticated ? 'text-green-400' : 'text-orange-400'
                }`}
              >
                {wbAuthStatus.isAuthenticated ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <LogIn className="h-5 w-5" />
                )}
                <span className="text-xs">WB</span>
          </button>
          
                              <button
                      onClick={openProfile}
                      className={`flex flex-col items-center justify-center space-y-1 ${
                        currentView === 'profile' ? 'text-white' : 'text-purple-300'
            }`}
          >
            <User className="h-5 w-5" />
            <span className="text-xs">Профиль</span>
          </button>
        </div>
      </div>
    </div>
      )}

      {/* Анимация загрузки */}
      {isLoading && (
        <LoadingSpinner 
          message={cart.length === 1 
            ? "Добавляем товар в корзину Wildberries..." 
            : `Добавляем ${cart.length} товаров в корзину Wildberries...`
          }
          size="lg"
        />
      )}

      {/* Модальное окно авторизации Wildberries */}
      <WBAuthModal
        isOpen={showWbAuthModal}
        onClose={() => setShowWbAuthModal(false)}
        onSuccess={handleWBAuthSuccess}
      />

      {/* Модальное окно подтверждения добавления товаров */}
      <ConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        onSuccess={() => {
          setShowConfirmationModal(false)
          // НЕ очищаем корзину после подтверждения - оставляем для проверки заказов
          // setCart([])
          // localStorage.removeItem('miniAppCart')
          
          // Небольшая задержка для закрытия модального окна, затем открываем Wildberries
          setTimeout(() => {
            if (window.Telegram?.WebApp) {
              try {
                console.log('Using Telegram WebApp API to open Wildberries after confirmation')
                window.Telegram.WebApp.openLink('https://www.wildberries.ru/lk/basket')
              } catch (error) {
                console.error('Error opening Wildberries basket via Telegram API:', error)
                window.open('https://www.wildberries.ru/lk/basket', '_blank')
              }
            } else {
              window.open('https://www.wildberries.ru/lk/basket', '_blank')
            }
          }, 300)
        }}
      />

      {/* Модальное окно успешного добавления товаров */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        successCount={successData.successCount}
        errorCount={successData.errorCount}
      />

      {/* Уведомление о добавлении в корзину */}
      {showAddToCartNotification && (
        <div className="fixed top-4 left-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl border-2 border-green-400/50 flex items-center space-x-4 backdrop-blur-sm w-full">
            <div className="bg-white/20 rounded-full p-2 animate-bounce">
              <CheckCircle className="h-6 w-6 text-white drop-shadow-sm" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-base mb-1">✅ Товар добавлен в корзину!</div>
              <div className="text-sm opacity-95 font-medium">{addedProductName}</div>
            </div>
            <div className="bg-white/10 rounded-full p-1">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      )}



    </div>
  )
}

// Типы для Telegram WebApp
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        sendData: (data: string) => void
        close: () => void
        ready: () => void
        expand: () => void
        openLink: (url: string) => void
        initDataUnsafe?: {
          user?: {
            id: number
            first_name?: string
            last_name?: string
            username?: string
          }
        }
      }
    }
  }
}