import React, { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import StoresPage from './components/StoresPage'
import ProductsPage from './components/ProductsPage'
import CustomersPage from './components/CustomersPage'
import EmployeesPage from './components/EmployeesPage'
import SettingsPage from './components/SettingsPage'
import ReportsPage from './components/ReportsPage'
import AnalyticsPage from './components/AnalyticsPage'
import SupportPage from './components/SupportPage'
import DocsPage from './components/DocsPage'
import MarketingPage from './components/MarketingPage'
import ReviewsPage from './components/ReviewsPage'
import AuthPage from './components/AuthPage'
import MiniAppRoute from './components/MiniAppRoute'
import LoyaltyDashboard from './pages/admin/loyalty-dashboard'
import ActivityPage from './components/ActivityPage'
import AiPage from './components/AiPage'
import { auth, User } from '@/lib/supabase'

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [miniAppStoreId, setMiniAppStoreId] = useState<string | null>(null)

  useEffect(() => {
    // Проверяем, не является ли это мини-приложением
    const path = window.location.pathname
    const miniAppMatch = path.match(/^\/miniapp\/(.+)$/)
    
    if (miniAppMatch) {
      setMiniAppStoreId(miniAppMatch[1])
      setLoading(false)
      return
    }

    // Проверяем текущего пользователя при загрузке для обычного приложения
    checkUser()

    // Подписываемся на изменения аутентификации
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session)
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session?.user || null)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkUser = async () => {
    try {
      console.log('Checking current session...')
      const session = await auth.getSession()
      console.log('Current session:', session)
      
      if (session?.user) {
        console.log('User found in session:', session.user)
        setUser(session.user)
      } else {
        console.log('No user in session, checking user directly...')
        const currentUser = await auth.getCurrentUser()
        console.log('Current user:', currentUser)
        setUser(currentUser)
      }
    } catch (error) {
      console.error('Error checking user:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const renderPage = () => {
    console.log('Рендерим страницу:', currentPage)
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />
      case 'stores':
        return <StoresPage />
      case 'products':
        return <ProductsPage />
      case 'customers':
        return <CustomersPage />
      case 'employees':
        return <EmployeesPage />
      case 'loyalty':
        return <LoyaltyDashboard />
      case 'activity':
        return <ActivityPage />
      case 'settings':
        console.log('Рендерим SettingsPage')
        return <SettingsPage />
      case 'ai':
        return <AiPage />
      case 'reports':
        return <ReportsPage />
      case 'analytics':
        return <AnalyticsPage />
      case 'support':
        return <SupportPage />
      case 'docs':
        return <DocsPage />
      case 'marketing':
        return <MarketingPage />
      case 'reviews':
        return <ReviewsPage />
      default:
        console.log('Неизвестная страница, показываем Dashboard')
        return <Dashboard />
    }
  }

  // Если это мини-приложение, показываем его
  if (miniAppStoreId) {
    return <MiniAppRoute storeId={miniAppStoreId} />
  }

  // Показываем загрузку
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  // Если пользователь не авторизован, показываем страницу входа
  if (!user) {
    return <AuthPage />
  }

  // Если пользователь авторизован, показываем основное приложение
  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage} user={user}>
      {renderPage()}
    </Layout>
  )
}

export default App