export const SELENIUM_CONFIG = {
  // Настройки Chrome для headless режима
  chromeOptions: {
    args: [
      '--headless',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--window-size=1920,1080',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]
  },
  
  // Таймауты
  timeouts: {
    implicit: 10000,
    pageLoad: 30000,
    script: 30000
  },

  // Селекторы для разных маркетплейсов
  selectors: {
    ozon: {
      addToCart: '[data-widget="webAddToCart"] button, .vue-portal-target button[type="button"]',
      price: '[data-widget="webPrice"] span, .price-current-amount span',
      quantity: 'input[data-widget="quantityCounter"]',
      cart: '[data-widget="cartEntrypoint"]',
      checkout: 'button[data-widget="checkoutButton"]',
      addressInput: 'input[placeholder*="адрес"], input[name*="address"]',
      orderButton: 'button[data-widget="orderButton"], button[type="submit"]',
      orderSuccess: '[data-widget="orderSuccess"]',
      orderId: '[data-widget="orderId"], .order-number'
    },
    wildberries: {
      addToCart: '.product-page__add-to-cart, .btn-main, [data-link="add-to-cart"]',
      price: '.price-block__content .price-block__final-price, .product-page__price-final, .price .price__lower-price',
      sizes: '.sizes-list__item, .product-params__value',
      quantity: 'input[data-link="quantity"], .quantity-input',
      cart: '.navbar-pc__item--basket, .header-basket, [data-link="basket"]',
      checkout: '.btn-main[data-link="checkout"], .basket-btn-order',
      addressInput: 'input[placeholder*="адрес"], input[name*="address"], .address-input',
      paymentMethod: 'input[name="payment"], .payment-method',
      orderButton: '.btn-main[type="submit"], .order-button, [data-link="order"]',
      orderSuccess: '.order-success, .success-page',
      orderId: '.order-number, .order-id'
    }
  },

  // Настройки ретраев
  retry: {
    maxAttempts: 3,
    delay: 2000
  }
}