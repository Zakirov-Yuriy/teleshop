/*
  # Auto Purchase Ozon Edge Function
  
  Автоматическая покупка товаров на Ozon с помощью Selenium:
  1. Авторизация по куки или через логин
  2. Добавление товаров в корзину
  3. Оформление заказа
  4. Сохранение ID заказа
*/

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Импорт Selenium для Deno
import { Builder, Browser, By, until, WebDriver } from "https://deno.land/x/selenium@4.21.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PurchaseRequest {
  userId: string
  productUrl: string
  quantity: number
  maxPrice: number
  paymentMethod: string
  deliveryAddress: string
}

class OzonAutoPurchase {
  private driver: WebDriver | null = null

  async initDriver() {
    try {
      // Настройка Chrome для headless режима
      const chromeOptions = {
        args: [
          '--headless',
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--window-size=1920,1080',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ]
      }

      this.driver = await new Builder()
        .forBrowser(Browser.CHROME)
        .setChromeOptions(chromeOptions)
        .build()

      await this.driver.manage().setTimeouts({ implicit: 10000 })
      return true
    } catch (error) {
      console.error('Ошибка инициализации драйвера:', error)
      return false
    }
  }

  async navigateToProduct(productUrl: string) {
    if (!this.driver) throw new Error('Драйвер не инициализирован')
    
    await this.driver.get(productUrl)
    await this.driver.wait(until.titleContains('OZON'), 10000)
  }

  async checkProductAvailability() {
    if (!this.driver) throw new Error('Драйвер не инициализирован')

    try {
      // Проверяем наличие кнопки "В корзину"
      const addToCartButton = await this.driver.wait(
      until.elementLocated(By.xpath('//*[contains(translate(text(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "добавить в корзину")]')),
      10000
      );
      
      const buttonText = await addToCartButton.getText()
      return !buttonText.includes('Нет в наличии') && 
             !buttonText.includes('Недоступен')
    } catch (error) {
      console.log('Товар недоступен:', error)
      return false
    }
  }

  async getCurrentPrice(): Promise<number> {
    if (!this.driver) throw new Error('Драйвер не инициализирован')

    try {
      // Ищем цену товара
      const priceElement = await this.driver.findElement(
        By.css('.l9l_27 lm_27 l3m_27')
      )
      
      const priceText = await priceElement.getText()
      const price = parseFloat(priceText.replace(/[^\d.,]/g, '').replace(',', '.'))
      
      return price || 0
    } catch (error) {
      console.error('Не удалось получить цену:', error)
      return 0
    }
  }

  async setQuantityWithRetries(quantity: number, maxAttempts = 10) {
    // Селекторы
    const quantityIndicatorSelector = By.css('.r0j_27');
    const incrementButtonSelector = By.css('.rj1_27.ag5_3_1-a0.ag5_3_1-a4');

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Получаем текущее количество
        const quantityIndicator = await this.driver.findElement(quantityIndicatorSelector);
        const currentText = await quantityIndicator.getText();
        const currentQuantity = parseInt(currentText, 10);

        // Проверяем достижение целевого количества
        if (currentQuantity === quantity) {
            return;
        }

        // Ищем ВСЕ кнопки увеличения и берём вторую (индекс 1)
        const incrementButtons = await this.driver.findElements(incrementButtonSelector);
        if (incrementButtons.length < 2) {
            throw new Error('Не найдена вторая кнопка увеличения');
        }

        // Кликаем и ждём обновления
        await incrementButtons[1].click();
        await this.driver.sleep(500); // Краткая пауза для обновления
    }

    throw new Error(`Не удалось установить количество после ${maxAttempts} попыток`);
 }

  async addToCart(quantity: number = 1) {
    if (!this.driver) throw new Error('Драйвер не инициализирован')

    try {
      // Нажимаем "В корзину"
      const addToCartButton = await this.driver.wait(
      until.elementLocated(By.xpath('//*[contains(translate(text(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "добавить в корзину")]')),
      10000
      );
      await addToCartButton.click()

      // Устанавливаем количество товара
      await this.setQuantityWithRetries.call(this, quantity);


      // Ждем подтверждения добавления
      await this.driver.wait(
        until.elementLocated(By.xpath('//*[contains(translate(text(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "в корзине")]')),
        10000
      )
      
      return true
    } catch (error) {
      console.error('Ошибка добавления в корзину:', error)
      return false
    }
  }

  async proceedToCheckout() {
    if (!this.driver) throw new Error('Драйвер не инициализирован')

    try {
      // Переходим в корзину
      const cartButton = await this.driver.findElement(
        By.xpath('//*[contains(translate(text(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "в корзине")]')
      )
      await cartButton.click()

      // Ждем загрузки корзины
      await this.driver.wait(
        until.elementLocated(By.xpath('//*[contains(translate(text(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "перейти к оформлению")]')),
        10000
      )

      // Нажимаем "Перейти к оформлению"
      const checkoutButton = await this.driver.findElement(
        By.xpath('//*[contains(translate(text(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "перейти к оформлению")]')
      )
      await checkoutButton.click()

      return true
    } catch (error) {
      console.error('Ошибка перехода к оформлению:', error)
      return false
    }
  }

  async completePurchase(): Promise<{ success: boolean, orderId?: string }> {
    if (!this.driver) throw new Error('Драйвер не инициализирован')

    try {
      // Нажимаем "оплатить"
      const orderButton = await this.driver.findElement(
        By.xpath('//*[contains(translate(text(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "оплатить")]')
      )
      await orderButton.click()

      const returnToOrderButton = await this.driver.wait(
        until.elementLocated(By.xpath('//*[contains(translate(text(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "перейти в заказы")]')),
        10000
      )
      await returnToOrderButton.click()

      // Ждем подтверждения заказа
      await this.driver.wait(
        until.elementLocated(By.css('.tsBody400Small')),
        15000
      )

      // Получаем номер заказа
      const orderIdElement = await this.driver.findElement(
        By.css('.tsBody400Small')
      )
      const orderId = await orderIdElement.getText()

      return { success: true, orderId: orderId.replace(/\D/g, '') }
    } catch (error) {
      console.error('Ошибка оформления заказа:', error)
      return { success: false }
    }
  }

  async cleanup() {
    if (this.driver) {
      await this.driver.quit()
      this.driver = null
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, productUrl, quantity, maxPrice, paymentMethod, deliveryAddress }: PurchaseRequest = await req.json()

    // Создаем экземпляр автопокупки
    const autoPurchase = new OzonAutoPurchase()
    
    try {
      // Инициализируем драйвер
      const driverReady = await autoPurchase.initDriver()
      if (!driverReady) {
        throw new Error('Не удалось инициализировать веб-драйвер')
      }

      // Переходим на страницу товара
      await autoPurchase.navigateToProduct(productUrl)

      // Проверяем доступность товара
      const isAvailable = await autoPurchase.checkProductAvailability()
      if (!isAvailable) {
        throw new Error('Товар недоступен для покупки')
      }

      // Проверяем цену
      const currentPrice = await autoPurchase.getCurrentPrice()
      if (currentPrice > maxPrice) {
        throw new Error(`Цена товара (${currentPrice}) превышает максимальную (${maxPrice})`)
      }

      // Добавляем в корзину
      const addedToCart = await autoPurchase.addToCart(quantity)
      if (!addedToCart) {
        throw new Error('Не удалось добавить товар в корзину')
      }

      // Переходим к оформлению
      await autoPurchase.proceedToCheckout()

      // Завершаем покупку
      const purchaseResult = await autoPurchase.completePurchase()

      if (purchaseResult.success) {
        // Сохраняем информацию о заказе в БД
        const { data, error } = await supabase
          .from('orders')
          .insert({
            user_id: userId,
            marketplace: 'ozon',
            product_url: productUrl,
            quantity,
            price: currentPrice,
            order_id: purchaseResult.orderId,
            status: 'completed',
            created_at: new Date().toISOString()
          })

        if (error) {
          console.error('Ошибка сохранения заказа:', error)
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Покупка успешно завершена',
            orderId: purchaseResult.orderId,
            price: currentPrice
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        throw new Error('Не удалось завершить покупку')
      }

    } finally {
      // Всегда закрываем драйвер
      await autoPurchase.cleanup()
    }

  } catch (error) {
    console.error('Ошибка автопокупки:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})