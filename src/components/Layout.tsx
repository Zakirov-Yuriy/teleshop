import React, { useState } from 'react'
import { 
  Store, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Settings, 
  Users,
  Menu,
  X,
  Bell,
  Search,
  LogOut,
  ChevronDown,
  ChevronRight,
  CreditCard,
  User,
  UserCheck,
  Activity,
  Bot,
  Moon,
  Sun,
  Home,
  TrendingUp,
  FileText,
  MessageSquare,
  HelpCircle,
  Palette,
  Briefcase,
  Heart,
  Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { auth, User as UserType } from '@/lib/supabase'

interface LayoutProps {
  children: React.ReactNode
  currentPage: string
  onPageChange: (page: string) => void
  user: UserType
}

const navigation = [
  { name: 'Обзор', icon: Home, id: 'dashboard', badge: null },
  { name: 'Магазины', icon: Store, id: 'stores', badge: '3' },
  { name: 'Товары', icon: Package, id: 'products', badge: '124' },
  { name: 'Клиенты', icon: Users, id: 'customers', badge: null },
  { name: 'Сотрудники', icon: UserCheck, id: 'employees', badge: null },
  { name: 'Лояльность', icon: CreditCard, id: 'loyalty', badge: 'NEW' },
  { name: 'AI Агент', icon: Bot, id: 'ai', badge: 'BETA' },
  { name: 'Активность', icon: Activity, id: 'activity', badge: null },
]

const bottomNavigation = [
  { name: 'Настройки', icon: Settings, id: 'settings' },
  { name: 'Помощь', icon: HelpCircle, id: 'help' },
]

export default function Layout({ children, currentPage, onPageChange, user }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState('dark')
  const [searchQuery, setSearchQuery] = useState('')
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleSignOut = async () => { 
    await auth.signOut() 
  }

  const toggleTheme = () => {
    // Оставляем возможность переключения, но начинаем с dark
    const themes = ['dark', 'business', 'luxury', 'mytheme']
    const currentIndex = themes.indexOf(theme)
    const nextTheme = themes[(currentIndex + 1) % themes.length]
    setTheme(nextTheme)
    document.documentElement.setAttribute('data-theme', nextTheme)
  }

  React.useEffect(() => {
    // Всегда устанавливаем темную тему при загрузке
    document.documentElement.setAttribute('data-theme', 'dark')
    setTheme('dark')
  }, [])

  return (
    <div className="flex h-screen overflow-hidden" data-theme={theme}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-72 bg-base-100 border-r border-base-300 transform transition-transform duration-300 ease-in-out lg:transform-none flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Sidebar Header */}
        <div className="h-16 border-b border-base-300 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Store className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">TeleShop</h1>
              <p className="text-xs opacity-60">Admin Panel</p>
            </div>
          </div>
          <button 
            className="btn btn-ghost btn-sm btn-circle lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.id
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      onPageChange(item.id)
                      setSidebarOpen(false)
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                      isActive 
                        ? "bg-primary text-primary-content" 
                        : "hover:bg-base-200"
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="flex-1 text-left font-medium">{item.name}</span>
                    {item.badge && (
                      <span className={cn(
                        "badge badge-sm",
                        item.badge === 'NEW' ? "badge-success" :
                        item.badge === 'BETA' ? "badge-error" :
                        "badge-primary"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="divider my-4"></div>

          <ul className="space-y-1">
            {bottomNavigation.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      onPageChange(item.id)
                      setSidebarOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-base-200 transition-colors"
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="flex-1 text-left font-medium">{item.name}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-base-300">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-base-200">
            <div className="avatar online">
              <div className="w-10 rounded-full bg-primary text-primary-content">
                <span className="text-lg font-bold flex items-center justify-center h-full">
                  {user.email?.[0]?.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{user.email?.split('@')[0]}</p>
              <p className="text-xs opacity-60">Администратор</p>
            </div>
            <button 
              className="btn btn-ghost btn-sm btn-circle"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="h-16 bg-base-100 border-b border-base-300 flex items-center justify-between px-4 lg:px-6">
          {/* Left Side */}
          <div className="flex items-center gap-4">
            <button 
              className="btn btn-ghost btn-square lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            
            <div className="hidden lg:flex items-center gap-2 text-sm">
              <span className="opacity-60">Главная</span>
              <ChevronRight className="h-4 w-4 opacity-40" />
              <span className="font-semibold">
                {navigation.find(item => item.id === currentPage)?.name || 'Dashboard'}
              </span>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            {/* Search - Desktop Only */}
            <div className="hidden md:flex items-center">
              <div className="form-control">
                <div className="input-group input-group-sm">
                  <input 
                    type="text" 
                    placeholder="Поиск..." 
                    className="input input-bordered input-sm w-48 lg:w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button className="btn btn-square btn-sm">
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="dropdown dropdown-end">
              <button 
                tabIndex={0} 
                className="btn btn-ghost btn-circle"
                onClick={() => setNotificationOpen(!notificationOpen)}
              >
                <div className="indicator">
                  <Bell className="h-5 w-5" />
                  <span className="badge badge-xs badge-primary indicator-item">3</span>
                </div>
              </button>
              {notificationOpen && (
                <ul tabIndex={0} className="dropdown-content z-50 menu menu-sm bg-base-100 rounded-box w-80 p-2 shadow-xl border border-base-300">
                  <li className="menu-title">
                    <span>Уведомления</span>
                  </li>
                  <li>
                    <a className="gap-3">
                      <div className="badge badge-info badge-sm">Новый</div>
                      <span>Новый заказ #3421</span>
                    </a>
                  </li>
                  <li>
                    <a className="gap-3">
                      <div className="badge badge-success badge-sm">Успех</div>
                      <span>Товар добавлен</span>
                    </a>
                  </li>
                  <li>
                    <a className="gap-3">
                      <div className="badge badge-warning badge-sm">Внимание</div>
                      <span>Низкий остаток товара</span>
                    </a>
                  </li>
                </ul>
              )}
            </div>

            {/* Theme Toggle - Скрыто, так как используем только темную тему */}
            {/* <button 
              className="btn btn-ghost btn-circle"
              onClick={toggleTheme}
            >
              {theme === 'dark' || theme === 'business' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button> */}

            {/* User Menu */}
            <div className="dropdown dropdown-end">
              <button 
                tabIndex={0} 
                className="btn btn-ghost btn-circle avatar"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="w-10 rounded-full bg-primary text-primary-content">
                  <span className="text-xl font-bold flex items-center justify-center h-full">
                    {user.email?.[0]?.toUpperCase()}
                  </span>
                </div>
              </button>
              {userMenuOpen && (
                <ul tabIndex={0} className="dropdown-content z-50 menu menu-sm bg-base-100 rounded-box w-52 p-2 shadow-xl border border-base-300">
                  <li className="menu-title">
                    <span className="truncate">{user.email}</span>
                  </li>
                  <li><a>
                    <User className="h-4 w-4" />
                    Профиль
                  </a></li>
                  <li><a>
                    <Settings className="h-4 w-4" />
                    Настройки
                  </a></li>
                  <li><a>
                    <CreditCard className="h-4 w-4" />
                    Биллинг
                  </a></li>
                  <div className="divider my-0"></div>
                  <li><a onClick={handleSignOut} className="text-error">
                    <LogOut className="h-4 w-4" />
                    Выйти
                  </a></li>
                </ul>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-base-200">
          <div className="container mx-auto p-4 lg:p-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}