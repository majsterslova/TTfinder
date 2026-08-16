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

console.log('🤖 Бот успішно запущений із захищеними ключами...');

// Обробка команди /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    `👋 Привіт! Надішли мені нікнейм акаунта TikTok (наприклад: \`mrbeast\`), щоб дізнатися країну його реєстрації.`,
    { parse_mode: 'Markdown' }
  );
});

// Обробка текстових повідомлень (нікнеймів)
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text ? msg.text.trim() : '';

  // Ігноруємо системні команди
  if (text.startsWith('/')) return;

  // Видаляємо символ @, якщо користувач ввів його
  const username = text.replace(/^@/, '');

  if (!username) {
    return bot.sendMessage(chatId, `⚠️ Будь ласка, введіть коректний нікнейм TikTok.`);
  }

  const waitMsg = await bot.sendMessage(chatId, `🔍 Шукаю інформацію про акаунт...`);

  try {
    const options = {
      method: 'GET',
      url: `https://tiktok-api23.p.rapidapi.com/api/user/info`,
      params: { uniqueId: username },
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com'
      }
    };

    const response = await axios.request(options);
    const userInfo = response.data?.userInfo?.user;

    if (!userInfo) {
      return bot.editMessageText(`❌ Акаунт не знайдено або виникла помилка отримання даних.`, {
        chat_id: chatId,
        message_id: waitMsg.message_id
      });
    }

    const nickname = userInfo.nickname || username;
    const region = userInfo.region || 'Невідомо';

    const resultMessage = 
      `👤 **Акаунт:** ${nickname} (@${username})\n` +
      `🌍 **Країна реєстрації:** ${region.toUpperCase()}`;

    bot.editMessageText(resultMessage, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
      parse_mode: 'Markdown'
    });

  } catch (error) {
    console.error('Помилка запиту:', error.message);
    bot.editMessageText(`❌ Помилка під час з'єднання з сервером. Перевірте правильність нікнейму або RapidAPI ключ.`, {
      chat_id: chatId,
      message_id: waitMsg.message_id
    });
  }
});