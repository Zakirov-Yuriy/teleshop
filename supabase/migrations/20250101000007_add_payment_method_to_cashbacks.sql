-- Добавляем колонку payment_method в таблицу loyalty_cashbacks, если её нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'loyalty_cashbacks' 
        AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE loyalty_cashbacks ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'sbp';
    END IF;
END $$; 