import { Builder, Browser, By, until, WebDriver } from "https://deno.land/x/selenium@4.21.0/mod.ts"
import { SELENIUM_CONFIG } from "./selenium-config.ts"

export class SeleniumUtils {
  static async createDriver(): Promise<WebDriver> {
    const driver = await new Builder()
      .forBrowser(Browser.CHROME)
      .setChromeOptions(SELENIUM_CONFIG.chromeOptions)
      .build()

    await driver.manage().setTimeouts(SELENIUM_CONFIG.timeouts)
    return driver
  }

  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxAttempts: number = SELENIUM_CONFIG.retry.maxAttempts
  ): Promise<T> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        console.log(`Попытка ${attempt} неудачна:`, error.message)
        
        if (attempt < maxAttempts) {
          await new Promise(resolve => 
            setTimeout(resolve, SELENIUM_CONFIG.retry.delay * attempt)
          )
        }
      }
    }
    
    throw lastError
  }

  static async safeClick(driver: WebDriver, selector: string): Promise<boolean> {
    try {
      const element = await driver.wait(until.elementLocated(By.css(selector)), 10000)
      await driver.wait(until.elementIsEnabled(element), 5000)
      await element.click()
      return true
    } catch (error) {
      console.error(`Ошибка клика по элементу ${selector}:`, error)
      return false
    }
  }

  static async safeInput(driver: WebDriver, selector: string, value: string): Promise<boolean> {
    try {
      const element = await driver.wait(until.elementLocated(By.css(selector)), 10000)
      await element.clear()
      await element.sendKeys(value)
      return true
    } catch (error) {
      console.error(`Ошибка ввода в элемент ${selector}:`, error)
      return false
    }
  }

  static async safeGetText(driver: WebDriver, selector: string): Promise<string> {
    try {
      const element = await driver.wait(until.elementLocated(By.css(selector)), 10000)
      return await element.getText()
    } catch (error) {
      console.error(`Ошибка получения текста элемента ${selector}:`, error)
      return ''
    }
  }

  static async waitForPageLoad(driver: WebDriver, expectedTitle?: string): Promise<void> {
    await driver.wait(until.elementLocated(By.tagName('body')), 10000)
    
    if (expectedTitle) {
      await driver.wait(until.titleContains(expectedTitle), 10000)
    }
    
    // Дополнительная пауза для загрузки динамического контента
    await driver.sleep(2000)
  }
}