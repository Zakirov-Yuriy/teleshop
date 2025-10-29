import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB'
  }).format(price)
}

export function formatDate(date?: Date | string | number | null): string {
  if (date === null || date === undefined) {
    return 'Неизвестная дата'
  }

  const dateObj = date instanceof Date ? date : new Date(date)

  // Проверяем, что дата валидна
  if (isNaN(dateObj.getTime())) {
    return 'Неизвестная дата'
  }
  
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj)
}