-- Hardware Portal — Database Schema
-- All tables for the portal's own data (SQLite)
-- Access database is read-only and remains separate

-- ============================================
-- Chat Messages
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_code TEXT NOT NULL,
    sender_type TEXT NOT NULL CHECK(sender_type IN ('customer', 'support')),
    message TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_read INTEGER DEFAULT 0,
    conversation_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_chat_device ON chat_messages(device_code);
CREATE INDEX IF NOT EXISTS idx_chat_timestamp ON chat_messages(timestamp);

-- ============================================
-- Ratings
-- ============================================
CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_code TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('service', 'chat')),
    rating_speed INTEGER CHECK(rating_speed BETWEEN 1 AND 5),
    rating_quality INTEGER CHECK(rating_quality BETWEEN 1 AND 5),
    rating_handling INTEGER CHECK(rating_handling BETWEEN 1 AND 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    chat_conversation_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_ratings_device ON ratings(device_code);

-- ============================================
-- Cost Approvals
-- ============================================
CREATE TABLE IF NOT EXISTS cost_approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_code TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'expired')),
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    responded_at DATETIME
);
CREATE INDEX IF NOT EXISTS idx_approvals_device ON cost_approvals(device_code);

-- ============================================
-- Customer Sessions
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    phone TEXT NOT NULL,
    expires_at DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_phone ON sessions(phone);

-- ============================================
-- System Logs
-- ============================================
CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_type TEXT CHECK(user_type IN ('customer', 'admin', 'system')),
    user_id TEXT,
    action TEXT NOT NULL,
    details TEXT,
    ip TEXT
);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON system_logs(timestamp);

-- ============================================
-- Share Links (temporary device sharing)
-- ============================================
CREATE TABLE IF NOT EXISTS share_links (
    token TEXT PRIMARY KEY,
    device_code TEXT NOT NULL,
    expires_at DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_share_device ON share_links(device_code);

-- ============================================
-- Device Events (status change history)
-- ============================================
CREATE TABLE IF NOT EXISTS device_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_code TEXT NOT NULL,
    event_type TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_events_device ON device_events(device_code);

-- ============================================
-- Settings (key-value system config)
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('work_hours_start', '09:00');
INSERT OR IGNORE INTO settings (key, value) VALUES ('work_hours_end', '18:00');
INSERT OR IGNORE INTO settings (key, value) VALUES ('emergency_stop', 'false');
INSERT OR IGNORE INTO settings (key, value) VALUES ('vacation_mode', 'false');
INSERT OR IGNORE INTO settings (key, value) VALUES ('vacation_message', 'نحن حالياً في إجازة. سنعود قريباً.');

-- ============================================
-- Admin Sessions
-- ============================================
CREATE TABLE IF NOT EXISTS admin_sessions (
    token TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'support')),
    expires_at DATETIME NOT NULL,
    ip TEXT,
    user_agent TEXT
);

-- ============================================
-- Staging Whitelist
-- ============================================
CREATE TABLE IF NOT EXISTS staging_whitelist (
    phone TEXT PRIMARY KEY
);

-- ============================================
-- Notification Templates
-- ============================================
CREATE TABLE IF NOT EXISTS notification_templates (
    event_type TEXT PRIMARY KEY,
    template TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    channels TEXT DEFAULT 'whatsapp'
);

-- Insert default templates
INSERT OR IGNORE INTO notification_templates (event_type, template, channels) VALUES
    ('new_device', 'مرحباً {{name}}، تم استلام جهازك {{device}} بكود {{code}}. لمتابعة الحالة: {{link}}', 'whatsapp'),
    ('status_change', 'تم تحديث حالة جهازك {{code}} إلى {{status}}.', 'whatsapp'),
    ('device_ready', 'جهازك {{code}} جاهز! التكلفة: {{amount}}. يرجى الحضور لاستلامه.', 'whatsapp,sms'),
    ('approval_request', 'هناك تكلفة إضافية {{amount}} للجهاز {{code}}. للموافقة أو الرفض: {{link}}', 'whatsapp'),
    ('chat_reply', 'تم الرد على رسالتك: {{preview}}. {{link}}', 'whatsapp'),
    ('reminder_3days', 'جهازك {{code}} لا يزال جاهزاً للاستلام. نأمل زيارتك قريباً.', 'whatsapp'),
    ('bad_rating', 'تقييم سيئ من العميل {{name}} للجهاز {{code}}: {{comment}}', 'whatsapp'),
    ('system_alert', 'تنبيه النظام: {{message}}', 'whatsapp');

-- ============================================
-- Device Notes (internal staff notes)
-- ============================================
CREATE TABLE IF NOT EXISTS device_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_code TEXT NOT NULL,
    note TEXT NOT NULL,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Frozen Clients
-- ============================================
CREATE TABLE IF NOT EXISTS frozen_clients (
    phone TEXT PRIMARY KEY,
    frozen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reason TEXT
);

-- ============================================
-- Admin 2FA Codes
-- ============================================
CREATE TABLE IF NOT EXISTS admin_2fa_codes (
    username TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    PRIMARY KEY (username, code)
);
