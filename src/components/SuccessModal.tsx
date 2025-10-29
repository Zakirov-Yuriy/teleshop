import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle, ShoppingCart, ExternalLink } from 'lucide-react'

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  successCount: number
  errorCount: number
}

export default function SuccessModal({ isOpen, onClose, successCount, errorCount }: SuccessModalProps) {
  const openWildberriesBasket = () => {
    console.log('Opening Wildberries basket from success modal')
    
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-500" />
            Товары добавлены в корзину!
          </DialogTitle>
          <DialogDescription className="text-center">
            {successCount} товар(ов) успешно добавлено в корзину Wildberries
            {errorCount > 0 && (
              <span className="block text-orange-500 mt-1">
                ⚠️ {errorCount} товар(ов) не удалось добавить
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <div className="bg-green-100 dark:bg-green-900/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Теперь вы можете перейти в корзину Wildberries для оформления заказа
            </p>
          </div>

          <div className="flex space-x-3">
            <Button 
              onClick={openWildberriesBasket}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Перейти в корзину WB
            </Button>
            
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Закрыть
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 