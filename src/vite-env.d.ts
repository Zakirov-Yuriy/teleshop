/// <reference types="vite/client" />

interface TelegramWebApp {
  expand: () => void
  close: () => void
  ready: () => void
  setHeaderColor: (color: string) => void
  setBackgroundColor: (color: string) => void
  enableClosingConfirmation: () => void
  disableClosingConfirmation: () => void
  onEvent: (eventType: string, callback: () => void) => void
  offEvent: (eventType: string, callback: () => void) => void
  sendData: (data: string) => void
  openLink: (url: string) => void
  showPopup: (params: any) => void
  showAlert: (message: string, callback?: () => void) => void
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  headerColor: string
  backgroundColor: string
  isClosingConfirmationEnabled: boolean
  BackButton: any
  MainButton: any
  HapticFeedback: any
  initData: string
  initDataUnsafe: any
  version: string
  platform: string
  colorScheme: string
  themeParams: any
}

interface Window {
  Telegram?: {
    WebApp?: TelegramWebApp
  }
}
