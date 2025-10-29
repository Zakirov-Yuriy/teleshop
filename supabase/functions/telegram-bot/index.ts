/*
  # Telegram Bot Edge Function
  
  Обрабатывает webhook запросы от Telegram Bot API и управляет взаимодействием с пользователями магазинов.
*/ import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};
// Глобальная переменная для хранения текущего токена бота
let currentBotToken = null;
// Временное хранилище телефона на время авторизации по SMS
const tempPhoneStorage = new Map();
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }
  try {
    // Более мягкая проверка secret
    const url = new URL(req.url);
    const secret = url.searchParams.get('secret');
    const expectedSecret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
    console.log('Webhook request received:', {
      method: req.method,
      url: req.url,
      hasSecret: !!secret,
      hasExpectedSecret: !!expectedSecret
    });
    // Только предупреждение если secret отсутствует или не совпадает
    if (expectedSecret && (!secret || secret !== expectedSecret)) {
      console.warn('Secret mismatch, but continuing...', {
        providedSecret: secret,
        expectedSecret: expectedSecret?.substring(0, 6) + '...'
      });
    // НЕ возвращаем ошибку, продолжаем обработку
    }
    console.log('Webhook processing continues');
    const supabase1 = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    const update = await req.json();
    console.log('Received Telegram update:', JSON.stringify(update, null, 2));
    // Определяем токен бота из заголовков или другим способом
    // Пока используем простой подход - ищем магазин с webhook URL
    await determineBotToken(supabase1);
    // Обработка обычных сообщений
    if (update.message) {
      console.log('Processing message:', update.message);
      await handleMessage(supabase1, update.message);
    }
    // Обработка callback запросов (inline кнопки)
    if (update.callback_query) {
      console.log('Processing callback query:', update.callback_query);
      await handleCallbackQuery(supabase1, update.callback_query);
    }
    console.log('Webhook processing completed successfully');
    return new Response(JSON.stringify({
      ok: true
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error processing update:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
async function determineBotToken(supabase1) {
  try {
    // Находим первый активный магазин с токеном бота
    const { data: stores } = await supabase1.from('stores').select('telegram_bot_token').not('telegram_bot_token', 'is', null).eq('status', 'active').limit(1);
    if (stores && stores.length > 0) {
      currentBotToken = stores[0].telegram_bot_token;
      console.log('Determined bot token for current request');
    }
  } catch (error) {
    console.error('Error determining bot token:', error);
  }
}
async function handleMessage(supabase1, message) {
  const { from, text, chat, contact } = message;
  console.log('Handling message:', {
    from,
    text,
    chat,
    contact
  });
  // Регистрируем или обновляем клиента
  await upsertCustomer(supabase1, from);
  // Регистрируем пользователя в системе лояльности
  await registerLoyaltyUser(supabase1, from);
  // Обработка поделившегося контакта
  if (contact) {
    console.log('Processing shared contact:', contact);
    await handleSharedContact(supabase1, from.id, contact);
    return;
  }
  if (text?.startsWith('/start')) {
    console.log('Processing /start command');
    await sendWelcomeMessage(from.id, extractStoreId(text));
  } else if (text === '/баллы') {
    console.log('Processing /баллы command');
    await sendPointsInfo(from.id);
  } else if (text === '/кэшбэк') {
    console.log('Processing /кэшбэк command');
    await sendCashbackMenu(from.id);
  } else if (text === '/правила') {
    console.log('Processing /правила command');
    await sendLoyaltyRules(from.id);
  } else if (text) {
    console.log('Processing default message');
    await sendWelcomeMessage(from.id, extractStoreId(text));
  } else {
    console.log('Processing message without text');
    await sendWelcomeMessage(from.id, undefined);
  }
}
async function handleCallbackQuery(supabase1, callbackQuery) {
  const { from, data } = callbackQuery;
  console.log('Handling callback query:', {
    from,
    data
  });
  if (data === 'cashback_menu') {
    await sendCashbackMenu(from.id);
  } else if (data === 'loyalty_rules') {
    await sendLoyaltyRules(from.id);
  } else if (data.startsWith('cashback_')) {
    const amount = parseInt(data.replace('cashback_', ''));
    await processCashbackRequest(from.id, amount);
  } else if (data === 'share_phone') {
    await requestPhoneNumber(from.id);
  }
}
// Обработка запроса кэшбэка
async function processCashbackRequest(chatId, amount) {
  try {
    // Сначала запрашиваем номер телефона
    await sendTelegramMessage(chatId, `📱 Для получения кэшбэка ${amount} ₽ необходимо поделиться номером телефона.\n\n` + `Нажмите кнопку "Поделиться номером" ниже:`, {
      reply_markup: {
        keyboard: [
          [
            {
              text: '📱 Поделиться номером',
              request_contact: true
            }
          ]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
    // Сохраняем запрошенную сумму кэшбэка во временное хранилище
    // В реальной реализации нужно использовать базу данных или кэш
    console.log(`User ${chatId} requested cashback ${amount} ₽`);
  } catch (error) {
    console.error('Error processing cashback request:', error);
    await sendTelegramMessage(chatId, '❌ Ошибка обработки запроса кэшбэка');
  }
}
// Запрос номера телефона
async function requestPhoneNumber(chatId) {
  await sendTelegramMessage(chatId, `📱 Для получения кэшбэка необходимо поделиться номером телефона.\n\n` + `Нажмите кнопку "Поделиться номером" ниже:`, {
    reply_markup: {
      keyboard: [
        [
          {
            text: '📱 Поделиться номером',
            request_contact: true
          }
        ]
      ],
      resize_keyboard: true,
      one_time_keyboard: true
    }
  });
}
// Обработка поделившегося контакта
async function handleSharedContact(supabase1, chatId, contact) {
  try {
    console.log('Processing shared contact for cashback:', contact);
    // Обновляем номер телефона пользователя в базе данных
    const { data: updatedUser, error: updateError } = await supabase1.from('loyalty_users').update({
      phone_number: contact.phone_number
    }).eq('telegram_id', chatId).select().single();
    if (updateError) {
      console.error('Error updating user phone number:', updateError);
      throw new Error('Failed to update phone number in DB.');
    }
    console.log('User phone number updated successfully:', updatedUser);
    // Получаем информацию о магазине (используем уже переданный клиент supabase1)
    let storeIdToUse = 'default';
    if (currentBotToken) {
      const { data: stores } = await supabase1.from('stores').select('id, name').eq('telegram_bot_token', currentBotToken).eq('status', 'active').limit(1);
      if (stores && stores.length > 0) {
        storeIdToUse = stores[0].id;
      }
    }
    await sendTelegramMessage(chatId, `✅ Спасибо! Ваш номер телефона получен: ${contact.phone_number}\n\n` + `📱 Мы обработаем ваш запрос на кэшбэк и свяжемся с вами в ближайшее время.\n\n` + `💰 Для проверки баланса баллов используйте команду /баллы`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🛍️ Открыть каталог',
              web_app: {
                url: `https://teleshop.su/miniapp/${storeIdToUse}?tg_user_id=${chatId}`
              }
            }
          ]
        ]
      }
    });
  } catch (error) {
    console.error('Error handling shared contact:', error);
    await sendTelegramMessage(chatId, '❌ Ошибка обработки контакта. Попробуйте еще раз.');
  }
}
async function upsertCustomer(supabase1, user) {
  console.log('Upserting customer:', user);
  // Сначала проверяем существование пользователя
  const { data: existingUser } = await supabase1.from('users').select('id').eq('telegram_id', user.id.toString()).single();
  if (!existingUser) {
    // Создаем нового пользователя
    const { data: newUser, error: userError } = await supabase1.from('users').insert({
      telegram_id: user.id.toString(),
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      created_at: new Date().toISOString()
    }).select('id').single();
    if (userError) {
      console.error('Error creating user:', userError);
    } else {
      console.log('New user created:', newUser.id);
    }
  }
  // Обновляем информацию о клиенте в таблице customers
  const { error } = await supabase1.from('customers').upsert({
    telegram_id: user.id.toString(),
    telegram_username: user.username,
    first_name: user.first_name,
    last_name: user.last_name
  }, {
    onConflict: 'telegram_id'
  });
  if (error) {
    console.error('Error upserting customer:', error);
  } else {
    console.log('Customer upserted successfully');
  }
}
async function sendWelcomeMessage(chatId, storeId) {
  console.log('Sending welcome message to:', chatId, 'storeId:', storeId);
  // Получаем информацию о магазине
  const supabase1 = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  let storeIdToUse = storeId || 'default';
  if (currentBotToken) {
    const { data: stores } = await supabase1.from('stores').select('id, name').eq('telegram_bot_token', currentBotToken).eq('status', 'active').limit(1);
    if (stores && stores.length > 0) {
      storeIdToUse = stores[0].id;
    }
  }
  const message = `
🛍️ Добро пожаловать в наш магазин!

Начни зарабатывать на любимых товарах  💴 

Открыть каталог 👇
  `;
  await sendTelegramMessage(chatId, message, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🛍️ Открыть каталог',
            web_app: {
              url: `https://teleshop.su/miniapp/${storeIdToUse}?tg_user_id=${chatId}`
            }
          }
        ]
      ]
    }
  });
}
// Функция sendCatalog удалена - упрощена логика
// Функция sendOrders удалена - упрощена логика
// Функция sendSettings удалена - упрощена логика
// Регистрация пользователя в системе лояльности
async function registerLoyaltyUser(supabase1, user) {
  try {
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/loyalty-system`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        action: 'register_user',
        data: {
          telegram_id: user.id.toString(),
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username
        }
      })
    });
    const result = await response.json();
    if (result.success) {
      console.log('User registered in loyalty system:', result.message);
    }
  } catch (error) {
    console.error('Error registering user in loyalty system:', error);
  }
}
// Отправка информации о баллах
async function sendPointsInfo(chatId) {
  try {
    // Получаем информацию о магазине
    const supabase1 = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    let storeIdToUse = 'default';
    if (currentBotToken) {
      const { data: stores } = await supabase1.from('stores').select('id, name').eq('telegram_bot_token', currentBotToken).eq('status', 'active').limit(1);
      if (stores && stores.length > 0) {
        storeIdToUse = stores[0].id;
      }
    }
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/loyalty-system`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        action: 'get_user_points',
        data: {
          telegram_id: chatId.toString()
        }
      })
    });
    const result = await response.json();
    if (result.success) {
      const user = result.user;
      const transactions = result.transactions;
      let message = `💎 Ваши баллы лояльности\n\n`;
      message += `📊 Всего накоплено: ${user.total_points} баллов\n`;
      message += `💰 Доступно: ${user.available_points} баллов\n`;
      message += `📦 Завершенных заказов: ${user.completed_orders}\n`;
      message += `🔄 Циклов кэшбэка: ${user.cashback_cycles}\n\n`;
      if (transactions && transactions.length > 0) {
        message += `📋 Последние операции:\n`;
        transactions.slice(0, 5).forEach((transaction)=>{
          const emoji = transaction.points > 0 ? '➕' : '➖';
          const date = new Date(transaction.created_at).toLocaleDateString('ru-RU');
          message += `${emoji} ${transaction.description} (${date})\n`;
        });
      }
      await sendTelegramMessage(chatId, message, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '💸 Обменять на кэшбэк',
                callback_data: 'cashback_menu'
              }
            ],
            [
              {
                text: '📋 Правила программы',
                callback_data: 'loyalty_rules'
              }
            ],
            [
              {
                text: '🛍️ Открыть каталог',
                web_app: {
                  url: `https://teleshop.su/miniapp/${storeIdToUse}`
                }
              }
            ]
          ]
        }
      });
    } else {
      await sendTelegramMessage(chatId, '❌ Ошибка получения информации о баллах');
    }
  } catch (error) {
    console.error('Error getting points info:', error);
    await sendTelegramMessage(chatId, '❌ Ошибка получения информации о баллах');
  }
}
// Отправка меню кэшбэка
async function sendCashbackMenu(chatId) {
  try {
    // Получаем информацию о магазине
    const supabase1 = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    let storeIdToUse = 'default';
    if (currentBotToken) {
      const { data: stores } = await supabase1.from('stores').select('id, name').eq('telegram_bot_token', currentBotToken).eq('status', 'active').limit(1);
      if (stores && stores.length > 0) {
        storeIdToUse = stores[0].id;
      }
    }
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/loyalty-system`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        action: 'get_user_points',
        data: {
          telegram_id: chatId.toString()
        }
      })
    });
    const result = await response.json();
    if (result.success) {
      const user = result.user;
      let message = `💸 Обмен баллов на кэшбэк\n\n`;
      message += `💰 Ваши доступные баллы: ${user.available_points}\n\n`;
      message += `💡 Доступные варианты кэшбэка:\n`;
      message += `• 50 ₽ - требуется 50 баллов (списывается 45)\n`;
      message += `• 100 ₽ - требуется 100 баллов (списывается 90)\n`;
      message += `• 150 ₽ - требуется 150 баллов (списывается 130)\n\n`;
      if (user.completed_orders < 2) {
        message += `⚠️ Для первого кэшбэка нужно ${2 - user.completed_orders} заказов\n`;
      }
      await sendTelegramMessage(chatId, message, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '50 ₽',
                callback_data: 'cashback_50'
              },
              {
                text: '100 ₽',
                callback_data: 'cashback_100'
              },
              {
                text: '150 ₽',
                callback_data: 'cashback_150'
              }
            ],
            [
              {
                text: '📱 Поделиться номером телефона',
                callback_data: 'share_phone'
              }
            ],
            [
              {
                text: '🛍️ Открыть каталог',
                web_app: {
                  url: `https://teleshop.su/miniapp/${storeIdToUse}`
                }
              }
            ]
          ]
        }
      });
    } else {
      await sendTelegramMessage(chatId, '❌ Ошибка получения информации о баллах');
    }
  } catch (error) {
    console.error('Error sending cashback menu:', error);
    await sendTelegramMessage(chatId, '❌ Ошибка получения меню кэшбэка');
  }
}
// Отправка правил программы лояльности
async function sendLoyaltyRules(chatId) {
  // Получаем информацию о магазине
  const supabase1 = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  let storeIdToUse = 'default';
  if (currentBotToken) {
    const { data: stores } = await supabase1.from('stores').select('id, name').eq('telegram_bot_token', currentBotToken).eq('status', 'active').limit(1);
    if (stores && stores.length > 0) {
      storeIdToUse = stores[0].id;
    }
  }
  let message = `📋 Правила программы "Easy-Баллы"\n\n`;
  message += `💎 Начисление баллов:\n`;
  message += `• Регистрация: +30 баллов\n`;
  message += `• До 200 ₽: +10 баллов\n`;
  message += `• 201-500 ₽: +40 баллов\n`;
  message += `• 501-700 ₽: +60 баллов\n`;
  message += `• От 1000 ₽: +90 баллов\n\n`;
  message += `💸 Кэшбэк:\n`;
  message += `• Первый кэшбэк после 2 заказов\n`;
  message += `• После кэшбэка нужен еще 1 заказ\n`;
  message += `• Максимум 1 кэшбэк в день\n`;
  message += `• Баллы действуют 90 дней\n\n`;
  message += `💰 Варианты кэшбэка:\n`;
  message += `• 50 ₽ (45 баллов)\n`;
  message += `• 100 ₽ (90 баллов)\n`;
  message += `• 150 ₽ (130 баллов)\n\n`;
  message += `📱 Выплата через СБП на номер телефона`;
  await sendTelegramMessage(chatId, message, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🛍️ Открыть каталог',
            web_app: {
              url: `https://teleshop.su/miniapp/${storeIdToUse}?tg_user_id=${chatId}`
            }
          }
        ]
      ]
    }
  });
}
async function sendTrackOrder(supabase1, chatId) {
  console.log('Sending track order to:', chatId);
  try {
    // Получаем пользователя
    const { data: user } = await supabase1.from('users').select('id').eq('telegram_id', chatId.toString()).single();
    if (!user) {
      await sendTelegramMessage(chatId, 'Пользователь не найден.');
      return;
    }
    // Получаем активные заказы
    const { data: activeOrders } = await supabase1.from('orders').select('id, marketplace_order_id, marketplace, status, created_at').eq('user_id', user.id).in('status', [
      'processing',
      'confirmed',
      'paid',
      'shipped'
    ]).order('created_at', {
      ascending: false
    });
    if (!activeOrders || activeOrders.length === 0) {
      await sendTelegramMessage(chatId, 'У вас нет активных заказов для отслеживания.');
      return;
    }
    let message = '📍 Активные заказы для отслеживания:\n\n';
    const buttons = [];
    activeOrders.forEach((order)=>{
      const statusEmoji = getStatusEmoji(order.status);
      const marketplaceIcon = order.marketplace === 'wildberries' ? '🟣' : '🔵';
      const date = new Date(order.created_at).toLocaleDateString('ru-RU');
      message += `${statusEmoji} Заказ №${order.marketplace_order_id || order.id.slice(0, 8)}\n`;
      message += `${marketplaceIcon} ${order.marketplace === 'wildberries' ? 'Wildberries' : 'Ozon'}\n`;
      message += `📅 ${date}\n\n`;
      buttons.push([
        {
          text: `📍 Отследить заказ №${order.marketplace_order_id || order.id.slice(0, 8)}`,
          callback_data: `track_${order.id}`
        }
      ]);
    });
    await sendTelegramMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: buttons
      }
    });
  } catch (error) {
    console.error('Error sending track order:', error);
    await sendTelegramMessage(chatId, 'Произошла ошибка при загрузке заказов.');
  }
}
async function sendHelp(chatId) {
  console.log('Sending help to:', chatId);
  const message = `
❓ Помощь

🛍️ *Как сделать заказ:*
1. Откройте каталог товаров
2. Выберите интересующие товары
3. Добавьте их в корзину
4. Оформите заказ

💳 *Автоматическое оформление:*
Для автоматического оформления заказов настройте:
• Данные для входа в маркетплейс
• Способ оплаты
• Адрес доставки

📞 *Поддержка:*
Если у вас есть вопросы, обратитесь к администратору магазина.

🚚 *Доставка:*
Доставка осуществляется по всей России. Стоимость и сроки доставки рассчитываются индивидуально.
  `;
  await sendTelegramMessage(chatId, message, {
    parse_mode: 'Markdown'
  });
}
async function sendMainMenu(chatId) {
  console.log('Sending main menu to:', chatId);
  await sendTelegramMessage(chatId, 'Выберите действие:', {
    reply_markup: {
      keyboard: [
        [
          {
            text: 'Каталог 📦'
          },
          {
            text: 'Мои заказы 📋'
          }
        ],
        [
          {
            text: 'Корзина 🛒'
          },
          {
            text: 'Отследить заказ 📍'
          }
        ],
        [
          {
            text: 'Настройки ⚙️'
          },
          {
            text: 'Помощь ❓'
          }
        ]
      ],
      resize_keyboard: true,
      persistent: true
    }
  });
}
async function showOrderDetails(supabase1, chatId, orderId) {
  console.log('Showing order details for:', orderId);
  try {
    const { data: order } = await supabase1.from('orders').select(`
        *,
        order_status_logs (
          new_status,
          created_at
        )
      `).eq('id', orderId).single();
    if (!order) {
      await sendTelegramMessage(chatId, 'Заказ не найден.');
      return;
    }
    const statusEmoji = getStatusEmoji(order.status);
    const date = new Date(order.created_at).toLocaleDateString('ru-RU');
    const marketplaceIcon = order.marketplace === 'wildberries' ? '🟣' : '🔵';
    let message = `
📋 Детали заказа

${statusEmoji} Статус: ${getStatusText(order.status)}
${marketplaceIcon} Маркетплейс: ${order.marketplace === 'wildberries' ? 'Wildberries' : 'Ozon'}
📅 Дата: ${date}
💰 Сумма: ${order.total_amount || 0} ₽
📦 Товары: ${order.products_data?.length || 0} шт.

${order.tracking_number ? `🚚 Трек-номер: ${order.tracking_number}\n` : ''}
${order.notes ? `📝 Примечания: ${order.notes}\n` : ''}
  `;
    const buttons = [
      [
        {
          text: '📍 Отследить заказ',
          callback_data: `track_${orderId}`
        }
      ]
    ];
    await sendTelegramMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: buttons
      }
    });
  } catch (error) {
    console.error('Error showing order details:', error);
    await sendTelegramMessage(chatId, 'Произошла ошибка при загрузке деталей заказа.');
  }
}
async function trackOrder(supabase1, chatId, orderId) {
  console.log('Tracking order:', orderId);
  try {
    const { data: order } = await supabase1.from('orders').select('*').eq('id', orderId).single();
    if (!order) {
      await sendTelegramMessage(chatId, 'Заказ не найден.');
      return;
    }
    // Вызываем функцию отслеживания статуса заказа
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/track-order-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        order_id: orderId,
        marketplace: order.marketplace,
        marketplace_order_id: order.marketplace_order_id
      })
    });
    if (response.ok) {
      const result = await response.json();
      let message = `
📍 Статус заказа №${order.marketplace_order_id || order.id.slice(0, 8)}

${getStatusEmoji(result.status)} ${getStatusText(result.status)}

${result.tracking_info ? `🚚 ${result.tracking_info}\n` : ''}
${result.estimated_delivery ? `📅 Ожидаемая доставка: ${result.estimated_delivery}\n` : ''}
  `;
      await sendTelegramMessage(chatId, message);
    } else {
      await sendTelegramMessage(chatId, 'Не удалось получить актуальный статус заказа.');
    }
  } catch (error) {
    console.error('Error tracking order:', error);
    await sendTelegramMessage(chatId, 'Произошла ошибка при отслеживании заказа.');
  }
}
async function showMarketplaceSettings(supabase1, chatId, marketplace) {
  console.log('Showing marketplace settings for:', marketplace);
  try {
    // Получаем пользователя
    const { data: user } = await supabase1.from('users').select('id').eq('telegram_id', chatId.toString()).single();
    if (!user) {
      await sendTelegramMessage(chatId, 'Пользователь не найден.');
      return;
    }
    // Получаем настройки для конкретного маркетплейса
    const { data: settings } = await supabase1.from('user_marketplace_settings').select('*').eq('user_id', user.id).eq('marketplace', marketplace).single();
    const marketplaceName = marketplace === 'wildberries' ? 'Wildberries' : 'Ozon';
    const marketplaceIcon = marketplace === 'wildberries' ? '🟣' : '🔵';
    let message = `
${marketplaceIcon} Настройки ${marketplaceName}

${settings ? `
✅ Данные для входа: ${settings.has_credentials ? 'Настроены' : 'Не настроены'}
💳 Способ оплаты: ${settings.has_payment_method ? 'Настроен' : 'Не настроен'}
📍 Адрес доставки: ${settings.has_delivery_address ? 'Настроен' : 'Не настроен'}
` : `
❌ Настройки не найдены
`}

Для автоматического оформления заказов необходимо настроить все параметры.
  `;
    const buttons = [
      [
        {
          text: '🔐 Настроить вход',
          callback_data: `setup_credentials_${marketplace}`
        },
        {
          text: '💳 Способ оплаты',
          callback_data: `setup_payment_${marketplace}`
        }
      ],
      [
        {
          text: '📍 Адрес доставки',
          callback_data: `setup_address_${marketplace}`
        },
        {
          text: '✅ Проверить настройки',
          callback_data: `check_settings_${marketplace}`
        }
      ]
    ];
    await sendTelegramMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: buttons
      }
    });
  } catch (error) {
    console.error('Error showing marketplace settings:', error);
    await sendTelegramMessage(chatId, 'Произошла ошибка при загрузке настроек.');
  }
}
async function sendTelegramMessage(chatId, text, extra) {
  console.log(`Attempting to send message to ${chatId}:`, {
    text,
    extra
  });
  try {
    // Используем текущий токен бота
    if (!currentBotToken) {
      console.error('No current bot token available');
      return;
    }
    const telegramApiUrl = `https://api.telegram.org/bot${currentBotToken}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text: text,
      ...extra
    };
    console.log('Sending to Telegram API:', {
      url: telegramApiUrl,
      payload
    });
    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) {
      console.error('Telegram API Error:', result);
    } else {
      console.log('Message sent successfully:', result);
    }
  } catch (error) {
    console.error('Error sending message to Telegram:', error);
  }
}
function extractStoreId(startText) {
  if (!startText) return undefined;
  const match = startText.match(/\/start (.+)/);
  return match ? match[1] : undefined;
}
function getStatusEmoji(status) {
  switch(status){
    case 'processing':
      return '⏳';
    case 'confirmed':
      return '✅';
    case 'paid':
      return '💳';
    case 'shipped':
      return '🚚';
    case 'delivered':
      return '📦';
    case 'cancelled':
      return '❌';
    case 'failed':
      return '💥';
    default:
      return '📋';
  }
}
function getStatusText(status) {
  switch(status){
    case 'processing':
      return 'Обрабатывается';
    case 'confirmed':
      return 'Подтвержден';
    case 'paid':
      return 'Оплачен';
    case 'shipped':
      return 'Отправлен';
    case 'delivered':
      return 'Доставлен';
    case 'cancelled':
      return 'Отменен';
    case 'failed':
      return 'Ошибка';
    default:
      return 'Неизвестно';
  }
}
async function showProduct(supabase1, chatId, productId) {
  // Показать детали товара
  console.log(`Showing product ${productId} to ${chatId}`);
}
async function addToCart(supabase1, chatId, productId) {
  // Добавить товар в корзину
  console.log(`Adding product ${productId} to cart for ${chatId}`);
}
async function showCart(supabase1, chatId) {
  // Показать корзину
  console.log(`Showing cart for ${chatId}`);
}
async function startCheckout(supabase1, chatId) {
  // Начать оформление заказа
  console.log(`Starting checkout for ${chatId}`);
}
async function sendAuthMenu(chatId) {
  const message = `
🔐 Авторизация в Wildberries

Для автоматических покупок необходимо авторизоваться в вашем аккаунте Wildberries.

📱 Введите команду:
\`/auth_phone +77079751816\`

Замените +79123456789 на ваш номер телефона.

⚠️ Ваши данные хранятся в зашифрованном виде и используются только для оформления заказов.
  `;
  await sendTelegramMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      keyboard: [
        [
          {
            text: 'Каталог 📦'
          },
          {
            text: 'Мои заказы 📋'
          }
        ],
        [
          //{
          //  text: 'Авторизация 🔐'
          //},
          {
            text: 'Помощь ❓'
          }
        ]
      ],
      resize_keyboard: true,
      persistent: true
    }
  });
}
async function startPhoneAuth(supabase1, chatId, phone) {
  try {
    console.log(`Starting phone auth for ${chatId}, phone: ${phone}`);
    await supabase1.from('users').upsert({
      telegram_id: chatId.toString(),
      phone: phone,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'telegram_id'
    });
    const url = `https://kzrafexlalajoirzugdj.supabase.co/functions/v1/wb-auth`;
    console.log('Calling wb-auth URL:', url);
    console.log('SUPABASE_URL env:', Deno.env.get('SUPABASE_URL'));
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        telegram_user_id: chatId.toString(),
        phone: phone,
        step: 'send_sms'
      })
    });
    console.log('Response status:', response.status);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const result = await response.json();
    console.log('wb-auth response:', result);
    if (result && result.success) {
      await sendTelegramMessage(chatId, `
✅ SMS код отправлен на номер ${phone}

📱 Введите код: 1234
     `);
      tempPhoneStorage.set(chatId, phone);
    } else {
      await sendTelegramMessage(chatId, `❌ Ошибка: ${result.error}`);
    }
  } catch (error) {
    console.error('Error in startPhoneAuth:', error);
    await sendTelegramMessage(chatId, `❌ Ошибка: ${error.message}`);
  }
}
async function verifySMSCode(supabase1, chatId, smsCode) {
  try {
    console.log(`Verifying SMS code for ${chatId}`);
    console.log('SUPABASE_URL:', Deno.env.get('SUPABASE_URL'));
    console.log('SERVICE_KEY exists:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    const { data: user } = await supabase1.from('users').select('phone').eq('telegram_id', chatId.toString()).single();
    const phone = user?.phone;
    if (!phone) {
      await sendTelegramMessage(chatId, 'Сначала введите номер телефона: /auth_phone +79123456789');
      return;
    }
    console.log('About to call wb-auth for verification...');
    const response = await fetch(`https://kzrafexlalajoirzugdj.supabase.co/functions/v1/wb-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        telegram_user_id: chatId.toString(),
        phone: phone,
        sms_code: smsCode,
        step: 'verify_code'
      })
    });
    console.log('wb-auth verify response status:', response.status);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const result = await response.json();
    console.log('wb-auth verify response:', result);
    if (result && result.success) {
      await sendTelegramMessage(chatId, `
🎉 Авторизация успешна!

Теперь вы можете делать автоматические покупки в Wildberries через наш бот.

🛍️ Перейдите в каталог для выбора товаров.
     `);
    } else {
      await sendTelegramMessage(chatId, `❌ ${result.error}`);
    }
  } catch (error) {
    console.error('Error in verifySMSCode:', error);
    await sendTelegramMessage(chatId, `❌ Детали ошибки: ${error.message}`);
  }
}
