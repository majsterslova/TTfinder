require('dotenv').config({ path: '.env.txt' });

const TelegramBotRaw = require('node-telegram-bot-api');
const TelegramBot = TelegramBotRaw.default || TelegramBotRaw;
const axios = require('axios');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

if (!TELEGRAM_TOKEN || !RAPIDAPI_KEY) {
  console.error('❌ Помилка: Перевірте наявність TELEGRAM_TOKEN та RAPIDAPI_KEY у файлі .env!');
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

console.log('🤖 Бот успішно запущений із захищеними ключами...');

/**
 * Перетворює дволітерний код країни у повну назву
 */
function getFullCountryName(code, lang = 'uk') {
  if (!code) return 'Невідомо';
  try {
    const regionNames = new Intl.DisplayNames([lang], { type: 'region' });
    return regionNames.of(code.toUpperCase());
  } catch (error) {
    return code;
  }
}

/**
 * Безопечне екранування символів для HTML
 */
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Отримує дані про профіль TikTok через RapidAPI
 */
async function getTikTokProfileViaAPI(username) {
  const cleanUsername = username.replace(/^@/, '').trim().toLowerCase();

  if (!cleanUsername) {
    return { success: false, error: 'Введено порожній нікнейм.' };
  }

  const options = {
    method: 'GET',
    url: 'https://tiktok-api23.p.rapidapi.com/api/user/info',
    params: { uniqueId: cleanUsername },
    headers: {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com'
    }
  };

  try {
    const response = await axios.request(options);
    const userInfo = response.data?.userInfo?.user;
    const userStats = response.data?.userInfo?.stats;

    if (!userInfo || !userInfo.uniqueId) {
      throw new Error('Користувача не знайдено, він приватний або заблокований.');
    }

    const countryCode = userInfo.region || userInfo.storeRegion || userInfo.locationCreated;

    return {
      success: true,
      username: userInfo.uniqueId,
      nickname: userInfo.nickname || userInfo.uniqueId,
      countryCode: countryCode || null,
      countryName: getFullCountryName(countryCode, 'uk'),
      followers: userStats?.followerCount || 0,
      avatar: userInfo.avatarLarger || userInfo.avatarMedium
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Помилка при отриманні даних'
    };
  }
}

// Привітання при команді /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    '👋 Привіт! Надішли мені нікнейм TikTok (наприклад: <code>mrbeast</code>), і я скажу точну країну акаунта.',
    { parse_mode: 'HTML' }
  );
});

// Обробник повідомлень
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text ? msg.text.trim() : '';

  // Ігноруємо порожні повідомлення (стікери, фото) та команди
  if (!text || text.startsWith('/')) return;

  const safeText = escapeHTML(text);
  bot.sendMessage(chatId, `🔍 Перевіряю акаунт <b>${safeText}</b>...`, { parse_mode: 'HTML' });

  const result = await getTikTokProfileViaAPI(text);

  if (result.success) {
    const safeUsername = escapeHTML(result.username);
    const safeNickname = escapeHTML(result.nickname);
    const safeCountryName = escapeHTML(result.countryName);

    const responseText = 
`✅ <b>Точна інформація про акаунт:</b>

👤 <b>Нікнейм:</b> @${safeUsername}
📛 <b>Ім'я:</b> ${safeNickname}
🌍 <b>Країна:</b> ${safeCountryName} (${result.countryCode || 'N/A'})
👥 <b>Підписники:</b> ${result.followers.toLocaleString()}`;

    if (result.avatar) {
      try {
        await bot.sendPhoto(chatId, result.avatar, { caption: responseText, parse_mode: 'HTML' });
      } catch (photoError) {
        // Якщо Telegram не зміг завантажити аватарку за посиланням — відправляємо простий текст
        bot.sendMessage(chatId, responseText, { parse_mode: 'HTML' });
      }
    } else {
      bot.sendMessage(chatId, responseText, { parse_mode: 'HTML' });
    }
  } else {
    const safeError = escapeHTML(result.error);
    bot.sendMessage(
      chatId, 
      `❌ <b>Помилка:</b> ${safeError}\n\nПеревірте правильність написання нікнейму.`, 
      { parse_mode: 'HTML' }
    );
  }
});