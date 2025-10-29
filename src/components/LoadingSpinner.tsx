import React, { useState, useEffect } from 'react'
import { Package, Store, ShoppingCart, Gift, CheckCircle, Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  showSteps?: boolean
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Добавляем товары в корзину...', 
  size = 'md',
  showSteps = false
}) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)

  const steps = [
    { icon: Store, text: 'Подключение к Wildberries', color: 'from-blue-500 to-blue-600' },
    { icon: Package, text: 'Загрузка товаров', color: 'from-purple-500 to-purple-600' },
    { icon: ShoppingCart, text: 'Обновление корзины', color: 'from-green-500 to-green-600' },
    { icon: Gift, text: 'Начисление баллов', color: 'from-pink-500 to-pink-600' },
    { icon: CheckCircle, text: 'Готово!', color: 'from-emerald-500 to-emerald-600' }
  ]

  useEffect(() => {
    if (showSteps) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval)
            return 100
          }
          return prev + 2
        })
      }, 50)

      const stepInterval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= steps.length - 1) {
            clearInterval(stepInterval)
            return prev
          }
          return prev + 1
        })
      }, 800)

      return () => {
        clearInterval(interval)
        clearInterval(stepInterval)
      }
    }
  }, [showSteps, steps.length])

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  if (showSteps) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-3xl p-8 shadow-2xl max-w-md mx-4 border border-gray-600/30">
          <div className="flex flex-col items-center space-y-6">
            {/* Анимированный логотип */}
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center animate-pulse shadow-lg">
                <Package className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle className="h-3 w-3 text-white" />
              </div>
            </div>

            {/* Текущий этап */}
            <div className="text-center">
              <div className="flex items-center justify-center space-x-3 mb-4">
                {steps.map((step, index) => {
                  const Icon = step.icon
                  const isActive = index === currentStep
                  const isCompleted = index < currentStep
                  
                  return (
                    <div key={index} className="flex flex-col items-center space-y-2">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                        isCompleted 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg scale-110' 
                          : isActive 
                            ? `bg-gradient-to-r ${step.color} shadow-lg animate-pulse` 
                            : 'bg-gray-600/50'
                      }`}>
                        <Icon className={`h-6 w-6 ${
                          isCompleted || isActive ? 'text-white' : 'text-gray-400'
                        }`} />
                      </div>
                      <span className={`text-xs font-medium transition-all duration-300 ${
                        isCompleted 
                          ? 'text-green-400' 
                          : isActive 
                            ? 'text-white' 
                            : 'text-gray-500'
                      }`}>
                        {step.text}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Прогресс-бар */}
              <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden mb-4">
                <div 
                  className="bg-gradient-to-r from-purple-500 via-blue-500 to-green-500 h-3 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>

              {/* Текст статуса */}
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white mb-2">
                  {steps[currentStep]?.text || 'Загрузка...'}
                </h3>
                <p className="text-sm text-gray-400">
                  {progress}% завершено
                </p>
              </div>
            </div>

            {/* Анимированные точки */}
            <div className="flex space-x-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full animate-pulse ${
                    i === (currentStep % 3) ? 'bg-purple-400' : 'bg-gray-600'
                  }`}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Обычный спиннер для других случаев
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl max-w-sm mx-4">
        <div className="flex flex-col items-center space-y-4">
          {/* Анимированный спиннер */}
          <div className="relative">
            <div className={`${sizeClasses[size]} border-4 border-gray-200 dark:border-gray-600 rounded-full`}></div>
            <div className={`${sizeClasses[size]} border-4 border-blue-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0`}></div>
          </div>
          
          {/* Текст */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {message}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Пожалуйста, подождите...
            </p>
          </div>
          
          {/* Прогресс-бар */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoadingSpinner 