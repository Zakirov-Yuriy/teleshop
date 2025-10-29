-- Проверяем, есть ли активные магазины с токенами ботов
-- Если нет, создаем тестовый магазин

DO $$
BEGIN
  -- Проверяем количество активных магазинов с токенами
  IF (SELECT COUNT(*) FROM stores WHERE status = 'active' AND telegram_bot_token IS NOT NULL) = 0 THEN
    -- Создаем тестовый магазин с токеном бота
    INSERT INTO stores (
      name,
      description,
      telegram_bot_token,
      wildberries_token,
      owner_id,
      status
    ) VALUES (
      'Тестовый магазин',
      'Магазин для тестирования системы уведомлений',
      'YOUR_BOT_TOKEN_HERE', -- Замените на реальный токен бота
      'YOUR_WB_TOKEN_HERE',  -- Замените на реальный токен WB
      'test-owner-id',
      'active'
    );
    
    RAISE NOTICE 'Создан тестовый магазин. Не забудьте заменить токены на реальные!';
  ELSE
    RAISE NOTICE 'Активные магазины с токенами ботов найдены';
  END IF;
END $$; 