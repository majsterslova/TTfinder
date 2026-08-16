require('dotenv').config(); // Завантажує ключі з файла .env

const TelegramBotRaw = require('node-telegram-bot-api');
const TelegramBot = TelegramBotRaw.default || TelegramBotRaw;
const axios = require('axios');

// Отримуємо секретні токени із змінних оточення
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
 * @param {string} code - Дволітерний код (наприклад, "CA")
 * @param {string} lang - Мова назви ("uk")
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
 * Отримує дані про профіль TikTok через RapidAPI
 * @param {string} username - Нікнейм TikTok
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
    '👋 Привіт! Надішли мені нікнейм TikTok (наприклад: `mrbeast`), і я скажу точну країну акаунта.',
    { parse_mode: 'Markdown' }
  );
});

// Обробник текстових повідомлень
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text ? msg.text.trim() : '';

  if (text.startsWith('/')) return;

  bot.sendMessage(chatId, `🔍 Перевіряю акаунт **${text}**...`, { parse_mode: 'Markdown' });

  const result = await getTikTokProfileViaAPI(text);

  if (result.success) {
    const responseText = 
`✅ **Точна інформація про акаунт:**

👤 **Нікнейм:** @${result.username}
📛 **Ім'я:** ${result.nickname}
🌍 **Країна:** ${result.countryName} (${result.countryCode || 'N/A'})
👥 **Підписники:** ${result.followers.toLocaleString()}`;

    if (result.avatar) {
      bot.sendPhoto(chatId, result.avatar, { caption: responseText, parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, responseText, { parse_mode: 'Markdown' });
    }
  } else {
    bot.sendMessage(
      chatId, 
      `❌ **Помилка:** ${result.error}\n\nПеревірте правильність написання нікнейму.`, 
      { parse_mode: 'Markdown' }
    );
  }
});