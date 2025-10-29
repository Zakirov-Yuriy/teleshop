import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Store, X, CheckCircle2, AlertTriangle, Eye, EyeOff } from 'lucide-react'

export default function AuthPage() {
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showPass2, setShowPass2] = useState(false)

  // Локальные тосты
  const [toasts, setToasts] = useState<Array<{ id: string; type: 'success' | 'error' | 'info' | 'warning'; title: string; description?: string }>>([])
  const showToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, description?: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    setToasts((prev) => [...prev, { id, type, title, description }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500)
  }
  const removeToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id))

  const handleSignIn = async () => {
    if (!email || !password) {
      showToast('warning', 'Заполните поля', 'Email и пароль обязательны')
      return
    }
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      showToast('success', 'Добро пожаловать')
      // App.tsx поймает SIGNED_IN и перепрендерит
    } catch (e: any) {
      showToast('error', 'Ошибка входа', e?.message || 'Проверьте данные')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async () => {
    if (!email || !password) {
      showToast('warning', 'Заполните поля', 'Email и пароль обязательны')
      return
    }
    if (password.length < 6) {
      showToast('warning', 'Слабый пароль', 'Минимум 6 символов')
      return
    }
    if (password !== password2) {
      showToast('warning', 'Пароли не совпадают')
      return
    }
    try {
      setLoading(true)
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
      if (error) throw error
      showToast('success', 'Регистрация успешна', 'Проверьте email для подтверждения')
      setMode('sign_in')
    } catch (e: any) {
      showToast('error', 'Ошибка регистрации', e?.message || 'Попробуйте позже')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    if (!email) { showToast('info', 'Укажите email', 'Чтобы восстановить пароль'); return }
    try {
      setLoading(true)
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
      if (error) throw error
      showToast('success', 'Ссылка отправлена', 'Проверьте email для восстановления')
    } catch (e: any) {
      showToast('error', 'Ошибка восстановления', e?.message || 'Попробуйте позже')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 overflow-x-hidden">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        <style>{`@keyframes shrink { from { width: 100% } to { width: 0% } }`}</style>
        {toasts.map((t) => (
          <div key={t.id} className="w-[90vw] sm:w-80 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-3 flex items-start gap-3">
              {t.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
              {t.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-600" />}
              {t.type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-600" />}
              {t.type === 'info' && <AlertTriangle className="h-5 w-5 text-indigo-600" />}
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

      <div className="w-full max-w-md">
        {/* Логотип */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
              <Store className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-semibold text-gray-900">TeleShop Admin</span>
          </div>
          <p className="text-gray-600 text-sm">Панель управления Telegram-магазинами</p>
        </div>

        {/* Форма */}
        <Card className="border border-gray-200 bg-white">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">
              {mode === 'sign_in' ? 'Вход в систему' : 'Регистрация'}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {mode === 'sign_in' ? 'Войдите в свой аккаунт' : 'Создайте новый аккаунт'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm text-gray-700">Email</Label>
              <Input type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label className="text-sm text-gray-700">Пароль</Label>
              <div className="relative">
                <Input type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {mode === 'sign_up' && (
              <div>
                <Label className="text-sm text-gray-700">Повторите пароль</Label>
                <div className="relative">
                  <Input type={showPass2 ? 'text' : 'password'} placeholder="••••••••" value={password2} onChange={(e) => setPassword2(e.target.value)} className="pr-10" />
                  <button type="button" onClick={() => setShowPass2(!showPass2)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'sign_in' && (
              <div className="text-right">
                <button className="text-xs text-indigo-600 hover:text-indigo-700" onClick={handleReset}>Забыли пароль?</button>
              </div>
            )}

            <Button onClick={mode === 'sign_in' ? handleSignIn : handleSignUp} disabled={loading} className="w-full">
              {loading ? (mode === 'sign_in' ? 'Вход...' : 'Регистрация...') : (mode === 'sign_in' ? 'Войти' : 'Зарегистрироваться')}
            </Button>

            <div className="text-center pt-2">
              <button
                onClick={() => setMode(mode === 'sign_in' ? 'sign_up' : 'sign_in')}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                {mode === 'sign_in' ? 'Нет аккаунта? Зарегистрироваться' : 'Есть аккаунт? Войти'}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Футер */}
        <div className="text-center mt-6 text-xs text-gray-500">
          © 2025 TeleShop. Все права защищены.
        </div>
      </div>
    </div>
  )
}