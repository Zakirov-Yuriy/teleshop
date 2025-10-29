import React, { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Phone, MessageSquare, CheckCircle, XCircle, Shield, Lock, Sparkles, ChevronDown, Clock, ArrowLeft } from 'lucide-react'
import { wbAuthInstance } from '@/lib/wildberries-auth'

interface WBAuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function WBAuthModal({ isOpen, onClose, onSuccess }: WBAuthModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [smsCode, setSmsCode] = useState('')
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [resendSeconds, setResendSeconds] = useState<number>(0)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', ''])
  const otpRefs = useRef<Array<HTMLInputElement | null>>([null, null, null, null, null, null])

  // Маска телефона и UX
  const [country, setCountry] = useState<'ru' | 'kz' | 'by'>('ru')
  const [nationalNumber, setNationalNumber] = useState<string>('') // только цифры без кода страны
  const [countryMenuOpen, setCountryMenuOpen] = useState(false)
  const phoneInputRef = useRef<HTMLInputElement>(null)

  const countryMeta = {
    ru: { flag: '🇷🇺', code: '+7', max: 10, name: 'Россия' },
    kz: { flag: '🇰🇿', code: '+7', max: 10, name: 'Казахстан' },
    by: { flag: '🇧🇾', code: '+375', max: 9, name: 'Беларусь' }
  } as const

  const getE164 = (c: 'ru'|'kz'|'by', nn: string) => `${countryMeta[c].code}${nn}`

  const formatNational = (c: 'ru'|'kz'|'by', nn: string) => {
    const digits = nn.slice(0, countryMeta[c].max)
    if (c === 'by') {
      // +375 (XX) XXX-XX-XX
      const p1 = digits.slice(0,2)
      const p2 = digits.slice(2,5)
      const p3 = digits.slice(5,7)
      const p4 = digits.slice(7,9)
      let out = ''
      if (p1) out = `(${p1}`
      if (p1 && p1.length===2) out += ')'
      if (p2) out += ` ${p2}`
      if (p3) out += `-${p3}`
      if (p4) out += `-${p4}`
      return out.trim()
    }
    // RU/KZ: +7 (XXX) XXX-XX-XX
    const p1 = digits.slice(0,3)
    const p2 = digits.slice(3,6)
    const p3 = digits.slice(6,8)
    const p4 = digits.slice(8,10)
    let out = ''
    if (p1) out = `(${p1}`
    if (p1 && p1.length===3) out += ')'
    if (p2) out += ` ${p2}`
    if (p3) out += `-${p3}`
    if (p4) out += `-${p4}`
    return out.trim()
  }

  const formattedPhone = `${countryMeta[country].code} ${formatNational(country, nationalNumber)}`.trim()

  useEffect(() => {
    // обновляем e164 для логики авторизации (не меняем остальные части)
    setPhoneNumber(getE164(country, nationalNumber))
  }, [country, nationalNumber])

  // Таймер повторной отправки
  useEffect(() => {
    if (resendSeconds <= 0) return
    const t = setInterval(() => setResendSeconds((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [resendSeconds])

  // Синхронизация smsCode с OTP боксами
  useEffect(() => {
    setSmsCode(otpDigits.join(''))
  }, [otpDigits])

  const handleMaskedInputChange = (value: string) => {
    // Извлекаем все цифры
    const digits = (value.match(/\d+/g) || []).join('')
    // Автоопределение по началу: 8xxxxxxxxxx => +7 и 10 цифр
    if (digits.startsWith('8')) {
      setCountry('ru')
      setNationalNumber(digits.slice(1, 11))
      return
    }
    // Если начинается с 375 — переключим на BY
    if (digits.startsWith('375')) {
      setCountry('by')
      setNationalNumber(digits.slice(3, 12))
      return
    }
    // Если начинается с 7 — RU/KZ (по умолчанию RU)
    if (digits.startsWith('7')) {
      const nn = digits.slice(1, 11)
      if (country === 'by') setCountry('ru')
      setNationalNumber(nn)
      return
    }
    // Иначе — пишем только национальную часть согласно текущей стране
    // Обрезаем до max
    setNationalNumber(digits.slice(0, countryMeta[country].max))
  }

  const onPhoneFocus = () => {
    setTimeout(() => phoneInputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50)
  }

  const handleStartAuth = async () => {
    if (!phoneNumber.trim()) {
      setError('Введите номер телефона')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await wbAuthInstance.startAuth(phoneNumber)
      
      if (result.success) {
        setStep('code')
        setSuccess(false)
        setResendSeconds(result.cooldownSeconds ?? 60)
        // Сброс ввода кода
        setOtpDigits(['', '', '', '', '', ''])
        setTimeout(() => otpRefs.current[0]?.focus(), 200)
      } else {
        setError(result.message || 'Ошибка отправки SMS')
      }
    } catch (error) {
      setError('Ошибка отправки SMS')
      console.error('Ошибка начала авторизации:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteAuth = async () => {
    if (!smsCode.trim()) {
      setError('Введите код из SMS')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await wbAuthInstance.completeAuth(smsCode)
      
      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          onSuccess()
          onClose()
          resetForm()
        }, 1500)
      } else {
        setError(result.message || 'Неверный код')
      }
    } catch (error) {
      setError('Ошибка завершения авторизации')
      console.error('Ошибка завершения авторизации:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendSeconds > 0 || loading) return
    setLoading(true)
    setError('')
    try {
      const result = await wbAuthInstance.startAuth(phoneNumber)
      if (result.success) {
        setResendSeconds(result.cooldownSeconds ?? 60)
      } else {
        setError(result.message || 'Не удалось отправить код повторно')
      }
    } catch (e) {
      setError('Не удалось отправить код повторно')
    } finally {
      setLoading(false)
    }
  }

  // OTP inputs
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(0, 1)
    const next = [...otpDigits]
    next[index] = digit
    setOtpDigits(next)
    if (digit && index < otpRefs.current.length - 1) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      otpRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < otpRefs.current.length - 1) {
      e.preventDefault()
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    e.preventDefault()
    const arr = pasted.split('')
    const next = ['','','','','','']
    for (let i = 0; i < Math.min(arr.length, 6); i++) next[i] = arr[i]
    setOtpDigits(next)
    const last = Math.min(arr.length, 6) - 1
    setTimeout(() => otpRefs.current[last >= 0 ? last : 0]?.focus(), 0)
  }

  const resetForm = () => {
    setPhoneNumber('')
    setSmsCode('')
    setStep('phone')
    setError('')
    setSuccess(false)
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
      resetForm()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl p-0">
        {/* Градиентная шапка */}
        <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-rose-500 p-6">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-44 h-44 bg-white/10 rounded-full blur-2xl" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-white/90">
                <Sparkles className="h-5 w-5" />
                <span className="text-xs uppercase tracking-wider">Быстрая авторизация</span>
              </div>
              <h3 className="mt-2 text-white text-xl font-semibold">Wildberries</h3>
              <p className="text-white/80 text-sm">Получите кэшбэк и быструю оплату заказов</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-white/80">
              <Shield className="h-5 w-5" />
              <span className="text-xs">Безопасное соединение</span>
            </div>
          </div>
          {/* Степпер */}
          <div className="relative z-10 mt-4 flex items-center gap-2">
            <div className={`h-1.5 flex-1 rounded-full ${step === 'phone' ? 'bg-white' : 'bg-white/50'}`} />
            <div className={`h-1.5 flex-1 rounded-full ${step === 'code' ? 'bg-white' : 'bg-white/50'}`} />
          </div>
        </div>

        {/* Контент */}
        <div className="p-6">
          {/* Блок доверия */}
          <div className="mb-5 rounded-xl border border-purple-100 bg-purple-50 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-white p-2 shadow">
                <Lock className="h-4 w-4 text-purple-600" />
              </div>
              <div className="text-sm text-purple-900">
                <p className="font-medium">Авторизация по номеру телефона</p>
                <p className="text-purple-700/90">Мы не сохраняем ваши пароли. Код подтверждения приходит в виде SMS или PUSH-уведомления от Wildberries.</p>
              </div>
            </div>
          </div>

          {step === 'phone' ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-gray-800">Номер телефона</Label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCountryMenuOpen(!countryMenuOpen)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <span className="text-base">{countryMeta[country].flag}</span>
                    <span>{countryMeta[country].code}</span>
                    <ChevronDown className="ml-1 h-3.5 w-3.5 text-gray-500" />
                  </button>
                  {countryMenuOpen && (
                    <div className="absolute z-10 mt-1 w-40 overflow-hidden rounded-md border border-gray-200 bg-white shadow">
                      {(['ru', 'kz', 'by'] as const).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setCountry(c)
                            setCountryMenuOpen(false)
                            setTimeout(() => phoneInputRef.current?.focus(), 0)
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                        >
                          <span>{countryMeta[c].flag}</span>
                          <span className="text-gray-700">{countryMeta[c].name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <Input
                    id="phone"
                    ref={phoneInputRef}
                    type="tel"
                    inputMode="numeric"
                    enterKeyHint="done"
                    autoComplete="tel"
                    placeholder={country === 'by' ? '+375 (29) 123-45-67' : '+7 (999) 123-45-67'}
                    value={formattedPhone}
                    onFocus={onPhoneFocus}
                    onChange={(e) => handleMaskedInputChange(e.target.value)}
                    className="pl-32 h-12 text-base"
                    disabled={loading}
                  />
                </div>
              </div>

              <Button
                onClick={handleStartAuth}
                disabled={loading || (country === 'by' ? nationalNumber.length < countryMeta.by.max : nationalNumber.length < countryMeta.ru.max)}
                className="h-11 w-full rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white hover:from-purple-700 hover:to-fuchsia-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Отправка SMS...
                  </>
                ) : (
                  <>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Отправить код
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Код отправлен на <span className="font-medium text-gray-900">{formattedPhone}</span>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-sm text-purple-700 hover:text-purple-800"
                  onClick={() => setStep('phone')}
                  disabled={loading}
                >
                  <ArrowLeft className="h-4 w-4" /> Изменить номер
                </button>
              </div>

              {/* OTP */}
              <div className="mt-2 flex items-center justify-between gap-2">
                {otpDigits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    className="h-12 w-11 rounded-lg border border-gray-300 bg-white text-center text-lg tracking-widest outline-none ring-2 ring-transparent focus:border-purple-500 focus:ring-purple-200"
                    value={d}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={handleOtpPaste}
                    disabled={loading}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  {resendSeconds > 0 ? (
                    <span>Повторная отправка через {resendSeconds}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      className="text-purple-700 hover:text-purple-800"
                      disabled={loading}
                    >
                      Отправить код ещё раз
                    </button>
                  )}
                </div>
                <div className="text-xs text-gray-500">СМС может прийти в течение 1–2 минут</div>
              </div>

              <Button
                onClick={handleCompleteAuth}
                disabled={loading || smsCode.trim().length < 4}
                className="h-11 w-full rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white hover:from-purple-700 hover:to-fuchsia-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Проверка кода...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Подтвердить
                  </>
                )}
              </Button>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mt-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>Авторизация успешно завершена!</AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 