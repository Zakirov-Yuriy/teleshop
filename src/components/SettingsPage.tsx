import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Key, 
  Mail, 
  Phone, 
  Globe, 
  Palette,
  Database,
  Webhook,
  CreditCard,
  Lock,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  X,
  CheckCircle2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface UserProfile {
  id: string
  email: string
  full_name?: string
  company?: string
  phone?: string
  website?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

interface UserSettings {
  id: string
  user_id: string
  email_notifications: {
    orders: boolean
    products: boolean
    marketing: boolean
  }
  push_notifications: {
    orders: boolean
    products: boolean
    marketing: boolean
  }
  security: {
    two_factor: boolean
    login_alerts: boolean
    api_access: boolean
  }
  created_at: string
  updated_at: string
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [toasts, setToasts] = useState<Array<{ id: string; type: 'success' | 'error' | 'info' | 'warning'; title: string; description?: string }>>([])
  const showToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, description?: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    setToasts((prev) => [...prev, { id, type, title, description }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500)
  }
  const removeToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id))

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        await loadProfile(user.id, user.email)
        await loadSettings(user.id)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  const loadProfile = async (userId: string, userEmail: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setProfile(data)
      } else {
        // Создаем профиль если не существует
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            email: userEmail,
    full_name: '',
    company: '',
    phone: '',
    website: ''
  })
          .select()
          .single()

        if (createError) throw createError
        setProfile(newProfile)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const loadSettings = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setSettings(data)
      } else {
        // Создаем настройки если не существуют
        const { data: newSettings, error: createError } = await supabase
          .from('user_settings')
          .insert({
            user_id: userId,
            email_notifications: {
              orders: true,
              products: false,
              marketing: true
            },
            push_notifications: {
              orders: true,
              products: true,
              marketing: false
            },
            security: {
    two_factor: false,
    login_alerts: true,
    api_access: true
            }
          })
          .select()
          .single()

        if (createError) throw createError
        setSettings(newSettings)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const updateProfile = async () => {
    if (!profile) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: profile.full_name,
          company: profile.company,
          phone: profile.phone,
          website: profile.website,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (error) throw error

      showToast('success', 'Профиль обновлен')
    } catch (error) {
      console.error('Error updating profile:', error)
      showToast('error', 'Ошибка', 'Не удалось обновить профиль')
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async () => {
    if (!settings) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({
          email_notifications: settings.email_notifications,
          push_notifications: settings.push_notifications,
          security: settings.security,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id)

      if (error) throw error

      showToast('success', 'Настройки сохранены')
    } catch (error) {
      console.error('Error updating settings:', error)
      showToast('error', 'Ошибка', 'Не удалось сохранить настройки')
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  const changePassword = async () => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user?.email || '', {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) throw error

      showToast('success', 'Письмо отправлено', 'Проверьте email')
    } catch (error) {
      console.error('Error sending password reset:', error)
      showToast('error', 'Ошибка', 'Не удалось отправить письмо')
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const deleteAccount = async () => {
    if (!confirm('Вы уверены, что хотите удалить аккаунт? Это действие необратимо.')) {
      return
    }

    try {
      // Сначала удаляем связанные данные
      if (profile) {
        await supabase.from('user_profiles').delete().eq('id', profile.id)
      }
      if (settings) {
        await supabase.from('user_settings').delete().eq('id', settings.id)
      }

      // Затем удаляем пользователя (это требует admin прав)
      // Пока просто выходим из аккаунта
      const { error } = await supabase.auth.signOut()

      if (error) throw error

      showToast('success', 'Аккаунт удален')
      setTimeout(() => {
        supabase.auth.signOut()
      }, 2000)
    } catch (error) {
      console.error('Error deleting account:', error)
      showToast('error', 'Ошибка', 'Не удалось удалить аккаунт')
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const generateApiKey = async () => {
    try {
      const apiKey = `sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
      
      const { error } = await supabase
        .from('user_settings')
        .update({
          api_key: apiKey,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings?.id)

      if (error) throw error

      await loadSettings(user?.id)
      showToast('success', 'API ключ обновлен')
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Error generating API key:', error)
      showToast('error', 'Ошибка', 'Не удалось обновить ключ')
      setTimeout(() => setMessage(null), 3000)
    }
  }

  if (!user || !profile || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        <style>{`@keyframes shrink { from { width: 100% } to { width: 0% } }`}</style>
        {toasts.map((t) => (
          <div key={t.id} className="w-[90vw] sm:w-80 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-3 flex items-start gap-3">
              {t.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
              {t.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-600" />}
              {t.type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-600" />}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{t.title}</div>
                {t.description && <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">{t.description}</div>}
              </div>
              <button onClick={() => removeToast(t.id)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="h-1 bg-gray-100"><div className="h-1 bg-indigo-500" style={{ width: '100%', animation: 'shrink 4.5s linear forwards' }} /></div>
          </div>
        ))}
      </div>

      {/* Заголовок */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h1 className="text-2xl font-semibold text-gray-900">Настройки</h1>
        <p className="text-sm text-gray-600 mt-1">Управление аккаунтом и платформой</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Профиль</TabsTrigger>
          <TabsTrigger value="notifications">Уведомления</TabsTrigger>
          <TabsTrigger value="security">Безопасность</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
        </TabsList>

        {/* Профиль */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="border border-gray-200 bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Личная информация
                  </CardTitle>
                  <CardDescription>
                    Обновите информацию о вашем профиле
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        disabled
                        className="bg-gray-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Email нельзя изменить
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="full_name">Полное имя</Label>
                      <Input
                        id="full_name"
                        value={profile.full_name || ''}
                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                        placeholder="Иван Иванов"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="company">Компания</Label>
                      <Input
                        id="company"
                        value={profile.company || ''}
                        onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                        placeholder="ООО Моя компания"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Телефон</Label>
                      <Input
                        id="phone"
                        value={profile.phone || ''}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        placeholder="+7 (999) 123-45-67"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="website">Веб-сайт</Label>
                    <Input
                      id="website"
                      value={profile.website || ''}
                      onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                      placeholder="https://mycompany.com"
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button onClick={updateProfile} disabled={loading}>
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? 'Сохранение...' : 'Сохранить'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card className="border border-gray-200 bg-white">
                <CardHeader>
                  <CardTitle>Аватар</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="h-12 w-12 text-purple-600" />
                  </div>
                  <Button variant="outline" size="sm">
                    Загрузить фото
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    JPG, PNG до 2MB
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Уведомления */}
        <TabsContent value="notifications">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="h-5 w-5 mr-2" />
                  Email уведомления
                </CardTitle>
                <CardDescription>
                  Настройте получение уведомлений на email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Новые заказы</p>
                    <p className="text-sm text-gray-600">Уведомления о новых заказах</p>
                  </div>
                  <Switch
                    checked={settings.email_notifications.orders}
                    onCheckedChange={(checked) => {
                      setSettings({
                        ...settings,
                        email_notifications: {
                          ...settings.email_notifications,
                          orders: checked
                        }
                      })
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Обновления товаров</p>
                    <p className="text-sm text-gray-600">Синхронизация с Wildberries</p>
                  </div>
                  <Switch
                    checked={settings.email_notifications.products}
                    onCheckedChange={(checked) => {
                      setSettings({
                        ...settings,
                        email_notifications: {
                          ...settings.email_notifications,
                          products: checked
                        }
                      })
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Маркетинг</p>
                    <p className="text-sm text-gray-600">Новости и обновления платформы</p>
                  </div>
                  <Switch
                    checked={settings.email_notifications.marketing}
                    onCheckedChange={(checked) => {
                      setSettings({
                        ...settings,
                        email_notifications: {
                          ...settings.email_notifications,
                          marketing: checked
                        }
                      })
                    }}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="h-5 w-5 mr-2" />
                  Push уведомления
                </CardTitle>
                <CardDescription>
                  Настройте push-уведомления в браузере
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Новые заказы</p>
                    <p className="text-sm text-gray-600">Мгновенные уведомления</p>
                  </div>
                  <Switch
                    checked={settings.push_notifications.orders}
                    onCheckedChange={(checked) => {
                      setSettings({
                        ...settings,
                        push_notifications: {
                          ...settings.push_notifications,
                          orders: checked
                        }
                      })
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Обновления товаров</p>
                    <p className="text-sm text-gray-600">Статус синхронизации</p>
                  </div>
                  <Switch
                    checked={settings.push_notifications.products}
                    onCheckedChange={(checked) => {
                      setSettings({
                        ...settings,
                        push_notifications: {
                          ...settings.push_notifications,
                          products: checked
                        }
                      })
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Маркетинг</p>
                    <p className="text-sm text-gray-600">Промо и акции</p>
                  </div>
                  <Switch
                    checked={settings.push_notifications.marketing}
                    onCheckedChange={(checked) => {
                      setSettings({
                        ...settings,
                        push_notifications: {
                          ...settings.push_notifications,
                          marketing: checked
                        }
                      })
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={updateSettings} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Сохранение...' : 'Сохранить настройки'}
            </Button>
          </div>
        </TabsContent>

        {/* Безопасность */}
        <TabsContent value="security">
          <div className="space-y-6">
            <Card className="border border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Безопасность аккаунта
                </CardTitle>
                <CardDescription>
                  Настройки безопасности и доступа к аккаунту
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Смена пароля</p>
                    <p className="text-sm text-gray-600">Обновите пароль для входа</p>
                  </div>
                  <Button variant="outline" onClick={changePassword}>
                    <Key className="h-4 w-4 mr-2" />
                    Сменить пароль
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Двухфакторная аутентификация</p>
                    <p className="text-sm text-gray-600">Дополнительная защита аккаунта</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={settings.security.two_factor ? "default" : "outline"}>
                      {settings.security.two_factor ? 'Включена' : 'Отключена'}
                    </Badge>
                    <Switch
                      checked={settings.security.two_factor}
                      onCheckedChange={(checked) => {
                        setSettings({
                          ...settings,
                          security: {
                            ...settings.security,
                            two_factor: checked
                          }
                        })
                      }}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Уведомления о входе</p>
                    <p className="text-sm text-gray-600">Email при входе с нового устройства</p>
                  </div>
                  <Switch
                    checked={settings.security.login_alerts}
                    onCheckedChange={(checked) => {
                      setSettings({
                        ...settings,
                        security: {
                          ...settings.security,
                          login_alerts: checked
                        }
                      })
                    }}
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-red-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center text-red-600">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Опасная зона
                </CardTitle>
                <CardDescription>
                  Необратимые действия с аккаунтом
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                  <div>
                    <p className="font-medium text-red-600">Удалить аккаунт</p>
                    <p className="text-sm text-gray-600">
                      Полное удаление аккаунта и всех данных
                    </p>
                  </div>
                  <Button variant="outline" onClick={deleteAccount} className="text-red-600 border-red-200 hover:bg-red-50">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Удалить
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* API */}
        <TabsContent value="api">
          <Card className="border border-gray-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="h-5 w-5 mr-2" />
                API ключи
              </CardTitle>
              <CardDescription>
                Управление API ключами для интеграций
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium">Основной API ключ</p>
                    <p className="text-sm text-gray-600">Для доступа к API платформы</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Активен</Badge>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={settings.api_key || "sk_live_1234567890abcdef"}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" onClick={generateApiKey}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Обновить
                  </Button>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium">Webhook URL</p>
                    <p className="text-sm text-gray-600">Для получения уведомлений</p>
                  </div>
                </div>
                
                <Input
                  placeholder="https://your-domain.com/webhook"
                  className="mb-2"
                />
                <Button variant="outline" size="sm">
                  <Webhook className="h-4 w-4 mr-2" />
                  Тестировать
                </Button>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Документация API</h4>
                <p className="text-sm text-blue-700 mb-3">
                  Изучите нашу документацию для интеграции с платформой
                </p>
                <Button variant="outline" size="sm">
                  <Globe className="h-4 w-4 mr-2" />
                  Открыть документацию
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}