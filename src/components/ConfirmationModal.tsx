import React, { useState } from 'react'
import LoadingSpinner from './LoadingSpinner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, MessageSquare, CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import { wbAuthInstance } from '@/lib/wildberries-auth'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function ConfirmationModal({ isOpen, onClose, onSuccess }: ConfirmationModalProps) {
  const [smsCode, setSmsCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

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

  const resetForm = () => {
    setSmsCode('')
    setError('')
    setSuccess(false)
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
      resetForm()
    }
  }

  const openWildberriesBasket = () => {
    console.log('Opening Wildberries basket from confirmation modal')
    
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

  return (
    <>
      {/* Полноэкранная анимация загрузки */}
      {loading && (
        <LoadingSpinner 
          message="Синхронизируем сессию Wildberries..."
          size="lg"
        />
      )}
      
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-purple-600" />
            Синхронизация Wildberries
          </DialogTitle>
          <DialogDescription>
            Введите код из SMS для синхронизации сессии и добавления товара в корзину
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sms">Код из SMS</Label>
            <Input
              id="sms"
              type="text"
              placeholder="123456"
              value={smsCode}
              onChange={(e) => setSmsCode(e.target.value)}
              maxLength={6}
              disabled={loading}
              className="text-center text-lg tracking-widest"
            />
          </div>

          <Button 
            onClick={handleCompleteAuth} 
            disabled={loading || !smsCode.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Проверка кода...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Подтвердить код
              </>
            )}
          </Button>

          <Button 
            variant="outline" 
            onClick={openWildberriesBasket}
            className="w-full"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Перейти в WB
          </Button>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>Синхронизация успешно завершена!</AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
} 