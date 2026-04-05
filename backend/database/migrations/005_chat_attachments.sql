-- Hardware Portal — Chat Attachments Migration
-- Already applied manually, keeping file for record

-- ALREADY DONE:
-- ALTER TABLE chat_messages ADD COLUMN file_url TEXT;
-- ALTER TABLE chat_messages ADD COLUMN file_type TEXT;
-- ALTER TABLE chat_messages ADD COLUMN file_size INTEGER;

-- Ensure indexes are created
CREATE INDEX IF NOT EXISTS idx_chat_file ON chat_messages(file_url) WHERE file_url IS NOT NULL;
