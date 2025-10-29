import React from 'react'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  CreditCard, 
  Settings, 
  BarChart3,
  Home
} from 'lucide-react'

const adminLinks = [
  {
    href: '/admin',
    label: 'Главная',
    icon: Home
  },
  {
    href: '/admin/loyalty',
    label: 'Лояльность',
    icon: CreditCard
  },
  {
    href: '/admin/users',
    label: 'Пользователи',
    icon: Users
  },
  {
    href: '/admin/analytics',
    label: 'Аналитика',
    icon: BarChart3
  },
  {
    href: '/admin/settings',
    label: 'Настройки',
    icon: Settings
  }
]

export default function AdminNavigation() {
  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <h1 className="text-xl font-bold text-gray-900">Админ-панель</h1>
          <div className="flex space-x-2">
            {adminLinks.map((link) => {
              const Icon = link.icon
              
              return (
                <Button
                  key={link.href}
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2"
                  onClick={() => window.open(link.href, '_blank')}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Button>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
} 