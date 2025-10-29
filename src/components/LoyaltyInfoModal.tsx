import React from 'react'
import { X } from 'lucide-react'

interface LoyaltyInfoModalProps {
  isOpen: boolean
  onClose: () => void
}

export const LoyaltyInfoModal: React.FC<LoyaltyInfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">💎 Программа лояльности</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Как работает */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 Как это работает</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              За каждую покупку вы получаете баллы, которые можно обменять на реальные деньги. 
              Чем больше покупаете, тем больше зарабатываете!
            </p>
          </div>

          {/* Начисление баллов */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">💰 Начисление баллов</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Регистрация</span>
                <span className="font-semibold text-green-600">+30 баллов</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">До 200 ₽</span>
                <span className="font-semibold text-green-600">+10 баллов</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">201-500 ₽</span>
                <span className="font-semibold text-green-600">+40 баллов</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">501-700 ₽</span>
                <span className="font-semibold text-green-600">+60 баллов</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">От 1000 ₽</span>
                <span className="font-semibold text-green-600">+90 баллов</span>
              </div>
            </div>
          </div>

          {/* Кэшбэк */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">💸 Кэшбэк</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">50 ₽</span>
                <span className="font-semibold text-blue-600">45 баллов</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">100 ₽</span>
                <span className="font-semibold text-blue-600">90 баллов</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">150 ₽</span>
                <span className="font-semibold text-blue-600">130 баллов</span>
              </div>
            </div>
          </div>

          {/* Условия */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">📌 <b>Условия</b></h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span>Первый кэшбэк доступен <b>после 2-й покупки</b></span>
              </div>
              <div className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span>Каждый следующий кэшбэк доступен <b>после новой покупки</b></span>
              </div>
              <div className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span>Не более <b>1 кэшбэка в день</b></span>
              </div>
              <div className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span>Баллы действуют <b>90 дней</b></span>
              </div>
              <div className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span>Выплата через <b>СБП на номер телефона</b></span>
              </div>
              <div className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span>Деньги можно вывести, <b>спустя 2 недели</b> после оформления <b>заказа</b></span>
              </div>
            </div>
          </div>

          {/* Как получить кэшбэк */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">🚀 <b>Как получить кэшбэк</b></h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">1</span>
                <span>Накопите нужное количество баллов</span>
              </div>
              <div className="flex items-start">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">2</span>
                <span>Перейдите в <b>личный профиль</b></span>
              </div>
              <div className="flex items-start">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">3</span>
                <span>Выберите сумму кэшбэка</span>
              </div>
              <div className="flex items-start">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">4</span>
                <span>Введите номер телефона</span>
              </div>
              <div className="flex items-start">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">5</span>
                <span>Получите деньги через СБП</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-purple-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-purple-700 transition-colors"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  )
} 