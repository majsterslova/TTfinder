const puppeteer = require('puppeteer');

/**
 * Отримує регіон/країну акаунта TikTok через headless-браузер
 * @param {string} username - Нікнейм користувача без символу @
 */
async function getTikTokRegion(username) {
  const cleanUsername = username.replace(/^@/, '');
  const url = `https://www.tiktok.com/@${cleanUsername}`;

  let browser;
  try {
    // Запускаємо фоновий браузер
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=en-US']
    });

    const page = await browser.newPage();

    // Підставляємо заголовки та роздільну здатність екрана реального пристрою
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 800 });

    // Переходимо на сторінку
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Витягуємо дані з запущеної DOM-структури сторінки
    const resultData = await page.evaluate(() => {
      const html = document.documentElement.innerHTML;

      // Пошук країни за внутрішніми тегами TikTok
      const regionMatch =
        html.match(/"region":"([A-Z]{2})"/i) ||
        html.match(/"locationCreated":"([A-Z]{2})"/i) ||
        html.match(/"storeRegion":"([A-Z]{2})"/i);

      const nicknameMatch = html.match(/"nickname":"([^"]+)"/i);

      return {
        region: regionMatch ? regionMatch[1] : null,
        nickname: nicknameMatch ? nicknameMatch[1] : null
      };
    });

    await browser.close();

    if (resultData.region) {
      return {
        success: true,
        username: cleanUsername,
        nickname: resultData.nickname || cleanUsername,
        region: resultData.region
      };
    }

    throw new Error(`Регіон не знайдено (можливо, з'явилася візуальна CAPTCHA).`);

  } catch (error) {
    if (browser) await browser.close();
    return {
      success: false,
      error: error.message
    };
  }
}

// Тестовий запуск
(async () => {
  const targetUser = 'tiktok';
  console.log(`Скануємо акаунт через браузер: @${targetUser}...`);

  const result = await getTikTokRegion(targetUser);
  console.log('Результат:', result);
})();