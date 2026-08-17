require('dotenv').config({ path: '.env.txt' });

let TelegramBot = require('node-telegram-bot-api');
if (typeof TelegramBot !== 'function') {
  TelegramBot = TelegramBot.default || TelegramBot.TelegramBot;
}

const axios = require('axios');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

if (!TELEGRAM_TOKEN || !RAPIDAPI_KEY) {
  console.error('❌ Помилка: Перевірте наявність TELEGRAM_TOKEN та RAPIDAPI_KEY у файлі .env.txt!');
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

console.log('🤖 Бот запущений та готовий до роботи...');

// Словник розшифровки дата-центрів (IDC) TikTok
function parseIDC(idcCode) {
  if (!idcCode) return 'НЕВІДОМО';

  const code = idcCode.toLowerCase();

  // Основні дата-центри
  if (code.includes('useast')) return `${idcCode.toUpperCase()} (США, Східне узбережжя 🇺🇸)`;
  if (code.includes('uswest')) return `${idcCode.toUpperCase()} (США, Західне узбережжя 🇺🇸)`;
  if (code.includes('us')) return `${idcCode.toUpperCase()} (США 🇺🇸)`;
  
  if (code.includes('maliva') || code.includes('va')) return `${idcCode.toUpperCase()} (США, Вірджинія / AWS 🇺🇸)`;
  if (code.includes('alisg') || code.includes('sg')) return `${idcCode.toUpperCase()} (Сінгапур 🇸🇬)`;
  if (code.includes('eu') || code.includes('my')) return `${idcCode.toUpperCase()} (Європа / Ірландія 🇪🇺)`;
  if (code.includes('jp')) return `${idcCode.toUpperCase()} (Японія 🇯🇵)`;
  if (code.includes('kr')) return `${idcCode.toUpperCase()} (Південна Корея 🇰🇷)`;
  if (code.includes('in')) return `${idcCode.toUpperCase()} (Індія 🇮🇳)`;

  return `${idcCode.toUpperCase()} (Серверний вузол TikTok)`;
}

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `👋 Привіт! Надішли мені нікнейм TikTok (наприклад: \`taylorswift\`), щоб отримати повний розширений звіт про акаунт.`,
    { parse_mode: 'Markdown' }
  );
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text ? msg.text.trim() : '';

  if (text.startsWith('/')) return;

  const username = text.replace(/^@/, '');
  if (!username) return;

  const waitMsg = await bot.sendMessage(chatId, `🔍 Збираю повну статистику та геолокаційні дані...`);

  try {
    const options = {
      method: 'GET',
      url: 'https://tiktok-api23.p.rapidapi.com/api/user/info-with-region',
      params: { uniqueId: username },
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com'
      }
    };

    const response = await axios.request(options);
    const data = response.data;

    const userInfo = data?.userInfo?.user || data?.user || data?.data?.user;
    const stats = data?.userInfo?.stats || data?.stats || data?.data?.stats;

    if (!userInfo) {
      return bot.editMessageText(`❌ Акаунт не знайдено або API не повернув дані.`, {
        chat_id: chatId,
        message_id: waitMsg.message_id
      });
    }

    // 1. Основні параметри
    const nickname = userInfo.nickname || username;
    const userId = userInfo.id || userInfo.uid || 'Н/Д';
    const isVerified = userInfo.verified ? 'Так ✅' : 'Ні ❌';
    const isPrivate = userInfo.privateAccount ? 'Так 🔒' : 'Ні 🌐';
    const isBusiness = userInfo.commerceUserInfo?.commerceUser ? 'Бізнес 💼' : 'Звичайний 👤';
    const category = userInfo.commerceUserInfo?.category || 'Не вказано';
    const bio = userInfo.signature ? userInfo.signature.trim() : 'Відсутня';
    const bioLink = userInfo.bioLink?.link ? userInfo.bioLink.link : 'Відсутнє';

    // 2. Окремі регіональні параметри
    const accountLanguage = userInfo.language ? userInfo.language.toUpperCase() : 'НЕВІДОМО';
    
    let rawIDC = '';
    if (userInfo.avatarLarger) {
      const idcMatch = userInfo.avatarLarger.match(/idc=([a-z0-9]+)/i);
      if (idcMatch && idcMatch[1]) {
        rawIDC = idcMatch[1];
      }
    }
    const idcServer = parseIDC(rawIDC);

    // 3. Форматування чисел статистики
    const followers = stats?.followerCount?.toLocaleString('uk-UA') || '0';
    const following = stats?.followingCount?.toLocaleString('uk-UA') || '0';
    const likes = stats?.heartCount?.toLocaleString('uk-UA') || stats?.heart?.toLocaleString('uk-UA') || '0';
    const videos = stats?.videoCount?.toLocaleString('uk-UA') || '0';
    const friends = stats?.friendCount?.toLocaleString('uk-UA') || '0';

    // 4. Формування звіту
    const report = 
      `📊 **ПОВНИЙ ЗВІТ ПРО АКАУНТ**\n\n` +
      `👤 **Ім'я:** ${nickname}\n` +
      `🏷 **Нікнейм:** @${username}\n` +
      `🆔 **ID користувача:** \`${userId}\` \n` +
      `🗣 **Мова акаунта:** \`${accountLanguage}\` \n` +
      `🖥 **Дата-центр (IDC):** \`${idcServer}\` \n\n` +
      `📈 **СТАТИСТИКА:**\n` +
      `👥 **Підписники:** ${followers}\n` +
      `🤝 **Підписки:** ${following}\n` +
      `❤️ **Всього лайків:** ${likes}\n` +
      `📹 **Всього відео:** ${videos}\n` +
      `👫 **Друзі:** ${friends}\n\n` +
      `⚙️ **ДОДАТКОВО:**\n` +
      `☑️ **Верифікація:** ${isVerified}\n` +
      `🔒 **Приватний акаунт:** ${isPrivate}\n` +
      `🏷 **Тип акаунта:** ${isBusiness}\n` +
      `📂 **Категорія:** ${category}\n` +
      `🔗 **Посилання в біо:** ${bioLink}\n` +
      `📝 **Біографія:** _${bio}_`;

    bot.editMessageText(report, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
      parse_mode: 'Markdown'
    });

  } catch (error) {
    console.error('Помилка API:', error.message);
    bot.editMessageText(`❌ Помилка запиту. Перевірте ключ або доступність API.`, {
      chat_id: chatId,
      message_id: waitMsg.message_id
    });
  }
});