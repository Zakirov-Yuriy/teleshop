# Teleshop - Telegram Mini App для интернет-магазина

<div align="center">

![Telegram Mini App](https://img.shields.io/badge/Telegram-Mini%20App-blue?style=for-the-badge&logo=telegram)
![React](https://img.shields.io/badge/React-18.0.0-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0.0-blue?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Database-orange?style=for-the-badge&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)

**Современный Telegram Mini App для интернет-магазина с интеграцией Wildberries, системой лояльности и управлением кэшбеком**

</div>

---

# Особенности

# Интеграция с Wildberries
- Автоматическое добавление товаров в корзину Wildberries
- Реальные цены, остатки и рейтинги в реальном времени
- Прямая авторизация через Wildberries API
- Корзина сохраняется между сессиями

#  Система лояльности
- Баллы за покупки с автоматическим начислением
- Уровни лояльности (Бронза, Серебро, Золото, Платина)
- Прогресс-бар для отслеживания прогресса
- Интеграция с Telegram User ID

#  Управление кэшбеком
- Вывод средств с указанием реквизитов
- История транзакций и выводов
- Статистика по кэшбеку
- Автоматические циклы начисления

# Адаптивный дизайн
- Поддержка iPhone Dynamic Island
- Безопасные зоны для мобильных устройств
- Красивые анимации и переходы
- Современный UI с Tailwind CSS

# Медиа контент
- Слайдер изображений для товаров
- Фотографии отзывов с увеличением
- Автоматическая генерация URL изображений
- Fallback изображения при ошибках

---

# Технологии

- **Frontend:** React 18, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Edge Functions)
- **API:** Wildberries API, Telegram Bot API
- **Стили:** Tailwind CSS, shadcn/ui компоненты
- **Анимации:** CSS transitions, Tailwind animations

---

# Функциональность

# Главная страница
- Каталог товаров с реальными ценами
- Сортировка по количеству отзывов
- Баннер программы лояльности
- Поиск и фильтрация товаров

# Корзина
- Сохранение между сессиями (localStorage)
- Расчет баллов лояльности
- Прямое добавление в Wildberries
- Анимации при добавлении товаров

# Профиль
- Отображение баллов лояльности
- Управление кэшбеком
- История транзакций
- Информация о программе лояльности

# Заказы
- Интеграция с Wildberries
- История заказов
- Статусы доставки

---

# Архитектура

# Frontend компоненты
```
src/components/
├── MiniAppRoute.tsx      # Главный компонент приложения
├── SuccessModal.tsx      # Модальное окно успеха
├── LoyaltyInfoModal.tsx  # Информация о лояльности
├── CashbackManagement.tsx # Управление кэшбеком
└── OrdersPage.tsx        # Страница заказов
```

# Backend функции (Supabase Edge Functions)
```
supabase/functions/
├── cashback-api/         # API для кэшбека
├── get-telegram-user/    # Получение Telegram User ID
├── telegram-bot/         # Telegram Bot логика
└── wb-proxy/            # Прокси для Wildberries API
```

# База данных
```
supabase/migrations/
├── loyalty_users         # Пользователи лояльности
├── loyalty_transactions  # Транзакции
└── loyalty_cashbacks     # Выводы кэшбека
```

---

# Установка и запуск

# Предварительные требования
- Node.js 18+
- Supabase CLI
- Telegram Bot Token

# Клонирование и установка
```bash
git clone https://github.com/mcec/teleshop.su.git
cd teleshop.su
npm install
```

# Настройка Supabase
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_ID
supabase db push
supabase functions deploy
```

# Запуск в режиме разработки
```bash
npm run dev
```

---

# Telegram Bot интеграция

# Настройка бота
1. Создайте бота через @BotFather
2. Получите токен и добавьте в переменные окружения
3. Настройте webhook для получения обновлений

# Команды бота
- `/start` - Приветствие и главное меню
- `/catalog` - Открытие каталога товаров
- `/profile` - Профиль пользователя
- `/orders` - История заказов

---

# UI/UX особенности

# Адаптивность
- Поддержка iPhone Dynamic Island
- Безопасные зоны для мобильных устройств
- Адаптивная типографика
- Оптимизация для Telegram WebApp

# Анимации
- Плавные переходы между страницами
- Анимации при добавлении в корзину
- Пульсирующие элементы интерфейса
- Hover эффекты

# Цветовая схема
- Градиенты от фиолетового к розовому
- Темная тема для лучшего восприятия
- Контрастные элементы для доступности

---

# Безопасность

# Аутентификация 
- Telegram User ID валидация
- Supabase Row Level Security (RLS)
- Безопасные Edge Functions

# Данные
- Шифрование чувствительных данных
- Валидация входных данных
- Защита от XSS атак

---

# Производительность

# Оптимизация
- Ленивая загрузка изображений
- Кэширование данных в localStorage
- Оптимизированные запросы к API
- Минификация CSS и JS

# Метрики
- Время загрузки < 2 секунд
- Размер бандла < 500KB
- 99.9% uptime

---

# Вклад в проект

Мы приветствуем вклад в развитие проекта! Пожалуйста:

1. Форкните репозиторий
2. Создайте ветку для новой функции
3. Внесите изменения
4. Создайте Pull Request

---


⭐ Если проект вам понравился, поставьте звездочку!

</div>
