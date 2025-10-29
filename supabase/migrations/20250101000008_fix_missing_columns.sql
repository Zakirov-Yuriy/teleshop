-- Добавляем недостающие колонки в таблицы лояльности

-- Добавляем колонку amount в loyalty_transactions, если её нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loyalty_transactions' 
        AND column_name = 'amount'
    ) THEN
        ALTER TABLE loyalty_transactions ADD COLUMN amount DECIMAL(10,2);
    END IF;
END $$;

-- Добавляем колонку payment_method в loyalty_cashbacks, если её нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loyalty_cashbacks' 
        AND column_name = 'payment_method'
    ) THEN
        -- Сначала добавляем колонку без ограничений
        ALTER TABLE loyalty_cashbacks ADD COLUMN payment_method TEXT DEFAULT 'sbp';
        
        -- Заполняем существующие записи значением по умолчанию
        UPDATE loyalty_cashbacks SET payment_method = 'sbp' WHERE payment_method IS NULL;
        
        -- Теперь добавляем ограничения
        ALTER TABLE loyalty_cashbacks ALTER COLUMN payment_method SET NOT NULL;
    END IF;
END $$;

-- Добавляем колонку description в loyalty_transactions, если её нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loyalty_transactions' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE loyalty_transactions ADD COLUMN description TEXT;
    END IF;
END $$;

-- Добавляем колонку status в loyalty_transactions, если её нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loyalty_transactions' 
        AND column_name = 'status'
    ) THEN
        -- Сначала добавляем колонку без ограничений
        ALTER TABLE loyalty_transactions ADD COLUMN status TEXT DEFAULT 'completed';
        
        -- Заполняем существующие записи значением по умолчанию
        UPDATE loyalty_transactions SET status = 'completed' WHERE status IS NULL;
        
        -- Теперь добавляем ограничения
        ALTER TABLE loyalty_transactions ALTER COLUMN status SET NOT NULL;
        ALTER TABLE loyalty_transactions ADD CONSTRAINT loyalty_transactions_status_check 
            CHECK (status IN ('pending', 'completed', 'failed'));
    END IF;
END $$;

-- Добавляем колонку type в loyalty_transactions, если её нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loyalty_transactions' 
        AND column_name = 'type'
    ) THEN
        -- Сначала добавляем колонку без ограничений
        ALTER TABLE loyalty_transactions ADD COLUMN type TEXT;
        
        -- Заполняем существующие записи значением по умолчанию
        UPDATE loyalty_transactions SET type = 'accrual' WHERE type IS NULL;
        
        -- Теперь добавляем ограничения
        ALTER TABLE loyalty_transactions ALTER COLUMN type SET NOT NULL;
        ALTER TABLE loyalty_transactions ADD CONSTRAINT loyalty_transactions_type_check 
            CHECK (type IN ('accrual', 'withdrawal', 'exchange'));
    END IF;
END $$;

-- Добавляем колонку points в loyalty_transactions, если её нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loyalty_transactions' 
        AND column_name = 'points'
    ) THEN
        -- Сначала добавляем колонку без ограничений
        ALTER TABLE loyalty_transactions ADD COLUMN points INTEGER;
        
        -- Заполняем существующие записи значением по умолчанию
        UPDATE loyalty_transactions SET points = 0 WHERE points IS NULL;
        
        -- Теперь добавляем ограничения
        ALTER TABLE loyalty_transactions ALTER COLUMN points SET NOT NULL;
    END IF;
END $$;

-- Добавляем колонку phone в loyalty_cashbacks, если её нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loyalty_cashbacks' 
        AND column_name = 'phone'
    ) THEN
        -- Сначала добавляем колонку без ограничений
        ALTER TABLE loyalty_cashbacks ADD COLUMN phone TEXT;
        
        -- Заполняем существующие записи значением по умолчанию
        UPDATE loyalty_cashbacks SET phone = '' WHERE phone IS NULL;
        
        -- Теперь добавляем ограничения
        ALTER TABLE loyalty_cashbacks ALTER COLUMN phone SET NOT NULL;
    END IF;
END $$;

-- Добавляем колонку points_used в loyalty_cashbacks, если её нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loyalty_cashbacks' 
        AND column_name = 'points_used'
    ) THEN
        -- Сначала добавляем колонку без ограничений
        ALTER TABLE loyalty_cashbacks ADD COLUMN points_used INTEGER;
        
        -- Заполняем существующие записи значением по умолчанию
        UPDATE loyalty_cashbacks SET points_used = 0 WHERE points_used IS NULL;
        
        -- Теперь добавляем ограничения
        ALTER TABLE loyalty_cashbacks ALTER COLUMN points_used SET NOT NULL;
    END IF;
END $$; 