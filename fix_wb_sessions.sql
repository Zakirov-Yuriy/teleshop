-- Добавление колонки sticker в таблицу wb_sessions
ALTER TABLE wb_sessions ADD COLUMN IF NOT EXISTS sticker TEXT; 