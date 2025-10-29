/*
  # Auto Purchase Wildberries Edge Function
  
  Автоматическая покупка товаров на Wildberries с помощью Selenium:
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

class WildberriesAutoPurchase {
  private driver: WebDriver | null = null

  async initDriver() {
    try {
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
    await this.driver.wait(until.titleContains('Wildberries'), 10000)
  }

  async checkProductAvailability() {
    if (!this.driver) throw new Error('Драйвер не инициализирован')

    try {
      // Проверяем наличие кнопки "Добавить в корзину"
      const addToCartButton = await this.driver.wait(
      until.elementLocated(By.xpath('//*[contains(translate(text(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "добавить в корзину")]')),
      10000
      );
      
      const buttonText = await addToCartButton.getText()
      const isDisabled = await addToCartButton.getAttribute('disabled')
      
      return !buttonText.includes('Нет в наличии') && 
             !buttonText.includes('Недоступен') &&
             !isDisabled
    } catch (error) {
      console.log('Товар недоступен:', error)
      return false
    }
  }

  async getCurrentPrice(): Promise<number> {
    if (!this.driver) throw new Error('Драйвер не инициализирован')

    try {
      // Ищем цену товара (несколько вариантов селекторов)
      let priceElement
      try {
        priceElement = await this.driver.findElement(
          By.css('.price-block__content .price-block  final-price, .product-page__price-final')
        )
      } catch {
        priceElement = await this.driver.findElement(
          By.css('.price .price__lower-price, .product-price .product-price__current')
        )
      }
      
      const priceText = await priceElement.getText()
      const price = parseFloat(priceText.replace(/[^\d]/g, ''))
      
      return price || 0
    } catch (error) {
      console.error('Не удалось получить цену:', error)
      return 0
    }
  }

  async selectProductSize(size?: string) {
    if (!this.driver) throw new Error('Драйвер не инициализирован')

    try {
      // Проверяем есть ли размеры
      const sizeElements = await this.driver.findElements(
        By.css('.sizes-list__item, .product-params__value')
      )

      if (sizeElements.length > 0) {
        if (size) {
          // Ищем конкретный размер
          for (const sizeElement of sizeElements) {
            const sizeText = await sizeElement.getText()
            if (sizeText.includes(size)) {
              await sizeElement.click()
              return true
            }
          }
          throw new Error(`Размер ${size} не найден`)
        } else {
          // Выбираем первый доступный размер
          const firstAvailable = sizeElements.find(async (element) => {
            const isDisabled = await element.getAttribute('disabled')
            return !isDisabled
          })
          
          if (firstAvailable) {
            await firstAvailable.click()
            return true
          }
        }
      }
      
      return true // Нет размеров - продолжаем
    } catch (error) {
      console.error('Ошибка выбора размера:', error)
      return false
    }
  }

  async addToCart(quantity: number = 1) {
    if (!this.driver) throw new Error('Драйвер не инициализирован')

    try {
      // Нажимаем "Добавить в корзину"
      const addToCartButton = await this.driver.wait(
      until.elementLocated(By.xpath('//*[contains(translate(text(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "добавить в корзину")]')),
      10000
      );
      await addToCartButton.click()

      // Переходим в корзину
      const cartButton = await this.driver.findElement(
        By.xpath('//*[contains(translate(text(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "в корзину")]')
      )
      await cartButton.click()

      // Ждем загрузки корзины
      await this.driver.wait(
        until.elementLocated(By.xpath('//*[contains(translate(text(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "к оформлению")]')),
        10000
      )

      // Устанавливаем количество товара
      const quantityInput = await this.driver.findElement(
        By.css('.in_tb j-tb-qnt count__numeric ignore')
      )
      await quantityInput.clear()
      await quantityInput.sendKeys(quantity.toString())

      
      return true
    } catch (error) {
      console.error('Ошибка добавления в корзину:', error)
      return false
    }
  }

  async proceedToCheckout() {
    if (!this.driver) throw new Error('Драйвер не инициализирован')

    try {
      // Нажимаем "Оформить заказ"
      const checkoutButton = await this.driver.wait(
        until.elementLocated(By.xpath('//*[contains(translate(text(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "к оформлению")]')),
        10000
      )
      await checkoutButton.click()

      return true
    } catch (error) {
      console.error('Ошибка перехода к оформлению:', error)
      return false
    }
  }

  async fillDeliveryInfo(address: string) {
    if (!this.driver) throw new Error('Драйвер не инициализирован')

    try {
      // Ждем загрузки страницы оформления заказа
      await this.driver.wait(
        until.elementLocated(By.css('.order-form, .checkout-page')),
        10000
      )

      // Ищем поле адреса
      const addressInput = await this.driver.findElement(
        By.css('input[placeholder*="адрес"], input[name*="address"], .address-input')
      )
      await addressInput.clear()
      await addressInput.sendKeys(address)

      // Ждем предложений адреса и выбираем первый
      await this.driver.sleep(2000)
      try {
        const firstSuggestion = await this.driver.findElement(
          By.css('.address-suggestions li:first-child, .suggestion-item:first-child')
        )
        await firstSuggestion.click()
      } catch {
        // Предложений нет, используем введенный адрес
      }

      return true
    } catch (error) {
      console.error('Ошибка заполнения адреса:', error)
      return false
    }
  }

  async selectPaymentMethod(paymentMethod: string) {
    if (!this.driver) throw new Error('Драйвер не инициализирован')

    try {
      // Ищем способы оплаты
      const paymentOptions = await this.driver.findElements(
        By.css('input[name="payment"], .payment-method')
      )

      for (const option of paymentOptions) {
        const value = await option.getAttribute('value')
        const label = await option.findElement(By.xpath('../label')).getText()
        
        if (value?.includes(paymentMethod) || label.includes(paymentMethod)) {
          await option.click()
          return true
        }
      }

      // Если не нашли точное совпадение, выбираем первый доступный
      if (paymentOptions.length > 0) {
        await paymentOptions[0].click()
        return true
      }

      return false
    } catch (error) {
      console.error('Ошибка выбора способа оплаты:', error)
      return false
    }
  }

  async completePurchase(): Promise<{ success: boolean, orderId?: string }> {
    if (!this.driver) throw new Error('Драйвер не инициализирован')

    try {
      // Нажимаем "Заказать"
      const orderButton = await this.driver.wait(
        until.elementLocated(By.xpath('//*[contains(translate(text(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "заказать")]')),
        10000
      )
      await orderButton.click()

      const returnToOrderButton = await this.driver.wait(
        until.elementLocated(By.xpath('//*[contains(translate(text(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "перейти в заказы")]')),
        10000
      )
      await returnToOrderButton.click()

      // Ждем подтверждения заказа
      await this.driver.wait(
        until.elementLocated(By.css('.delivery-code__value')),
        15000
      )

      // Получаем номер заказа
      try {
        const orderIdElement = await this.driver.findElement(
          By.css('.delivery-code__value')
        )
        const orderId = await orderIdElement.getText()
        return { success: true, orderId: orderId.replace(/\D/g, '') }
      } catch {
        // Номер заказа может быть в другом месте
        const pageText = await this.driver.findElement(By.tagName('body')).getText()
        const orderMatch = pageText.match(/№\s*(\d+)/i)
        
        return { 
          success: true, 
          orderId: orderMatch ? orderMatch[1] : 'unknown'
        }
      }
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

    const autoPurchase = new WildberriesAutoPurchase()
    
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
            marketplace: 'wildberries',
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