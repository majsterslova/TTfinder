const TelegramBotRaw = require('node-telegram-bot-api');
const TelegramBot = TelegramBotRaw.default || TelegramBotRaw;
const axios = require('axios');

const TELEGRAM_TOKEN = '8564921240:AAETS_mt9fgscbab0SYV9jOivAkCmgipFEs';
// Ваш ключ із зображення:
const RAPIDAPI_KEY = '2cbdefede7msh9f1904901697b7cp1363d4jsn3d6cebf68f73';

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

console.log('🤖 Бот на RapidAPI успішно запущений...');

function getFullCountryName(code, lang = 'uk') {
  if (!code) return 'Невідомо';
  try {
    const regionNames = new Intl.DisplayNames([lang], { type: 'region' });
    return regionNames.of(code.toUpperCase());
  } catch (error) {
    return code;
  }
}

async function getTikTokProfileViaAPI(username) {
  const cleanUsername = username.replace(/^@/, '').trim();

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

    if (!userInfo) {
      throw new Error('Користувача не знайдено');
    }

    const countryCode = userInfo.region || userInfo.storeRegion || userInfo.locationCreated;

    return {
      success: true,
      username: userInfo.uniqueId,
      nickname: userInfo.nickname,
      countryCode: countryCode,
      countryName: getFullCountryName(countryCode, 'uk'),
      followers: userStats?.followerCount || 0,
      avatar: userInfo.avatarLarger
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Помилка запиту'
    };
  }
}

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    '👋 Привіт! Надішли мені нікнейм TikTok (наприклад: `mrbeast`), і я скажу точну країну акаунта.',
    { parse_mode: 'Markdown' }
  );
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text ? msg.text.trim() : '';

  if (text.startsWith('/')) return;

  bot.sendMessage(chatId, `🔍 Шукаю дані для **${text}**...`, { parse_mode: 'Markdown' });

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
    bot.sendMessage(chatId, `❌ **Помилка:** ${result.error}`, { parse_mode: 'Markdown' });
  }
});