-- ============================================
-- User Management & RBAC Roles
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'tech', 'viewer')),
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Insert Dynamic System Settings (Full Server Control)
-- ============================================

-- ── 📂 File Paths ──
INSERT OR IGNORE INTO settings (key, value) VALUES ('access_db_path', '/media/foggy/test4/hardware/backups/accounting.mdb');
INSERT OR IGNORE INTO settings (key, value) VALUES ('sqlite_db_path', '/media/foggy/test4/hardware/backend/data/portal.sqlite');
INSERT OR IGNORE INTO settings (key, value) VALUES ('whatsapp_session_path', '/media/foggy/test4/hardware/backend/data/whatsapp-session');

-- ── 📱 WhatsApp ──
INSERT OR IGNORE INTO settings (key, value) VALUES ('whatsapp_enabled', 'true');
INSERT OR IGNORE INTO settings (key, value) VALUES ('whatsapp_auto_reconnect', 'true');
INSERT OR IGNORE INTO settings (key, value) VALUES ('whatsapp_reconnect_delay_ms', '5000');
INSERT OR IGNORE INTO settings (key, value) VALUES ('whatsapp_version_url', 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html');
INSERT OR IGNORE INTO settings (key, value) VALUES ('whatsapp_default_country_code', '20');

-- ── 🔒 Security & Rate Limits ──
INSERT OR IGNORE INTO settings (key, value) VALUES ('jwt_expires_in', '24h');
INSERT OR IGNORE INTO settings (key, value) VALUES ('admin_jwt_expires_in', '30m');
INSERT OR IGNORE INTO settings (key, value) VALUES ('anti_copy_enabled', 'true');
INSERT OR IGNORE INTO settings (key, value) VALUES ('rate_limit_search_max', '3');
INSERT OR IGNORE INTO settings (key, value) VALUES ('rate_limit_search_window_min', '15');
INSERT OR IGNORE INTO settings (key, value) VALUES ('rate_limit_admin_max', '5');
INSERT OR IGNORE INTO settings (key, value) VALUES ('rate_limit_admin_window_min', '15');
INSERT OR IGNORE INTO settings (key, value) VALUES ('rate_limit_chat_max', '1');
INSERT OR IGNORE INTO settings (key, value) VALUES ('rate_limit_chat_window_sec', '10');
INSERT OR IGNORE INTO settings (key, value) VALUES ('rate_limit_general_max', '100');
INSERT OR IGNORE INTO settings (key, value) VALUES ('rate_limit_general_window_sec', '60');

-- ── ⏰ Scheduling & Cron ──
INSERT OR IGNORE INTO settings (key, value) VALUES ('polling_interval_ms', '5000');
INSERT OR IGNORE INTO settings (key, value) VALUES ('approval_expiry_hours', '48');
INSERT OR IGNORE INTO settings (key, value) VALUES ('reminder_days', '3');
INSERT OR IGNORE INTO settings (key, value) VALUES ('reminder_time', '10:00');
INSERT OR IGNORE INTO settings (key, value) VALUES ('session_cleanup_hours', '6');
INSERT OR IGNORE INTO settings (key, value) VALUES ('queue_retry_attempts', '3');
INSERT OR IGNORE INTO settings (key, value) VALUES ('queue_retry_delay_min', '5');

-- ── 🌐 Network ──
INSERT OR IGNORE INTO settings (key, value) VALUES ('server_port', '3000');
INSERT OR IGNORE INTO settings (key, value) VALUES ('json_body_limit', '10mb');
INSERT OR IGNORE INTO settings (key, value) VALUES ('frontend_url', 'http://localhost:5173');
INSERT OR IGNORE INTO settings (key, value) VALUES ('redis_url', 'redis://localhost:6379');

-- ── 📊 Analytics ──
INSERT OR IGNORE INTO settings (key, value) VALUES ('posthog_enabled', 'true');
INSERT OR IGNORE INTO settings (key, value) VALUES ('posthog_api_key', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('posthog_host', 'https://app.posthog.com');

-- ── 🚨 Operations ──
INSERT OR IGNORE INTO settings (key, value) VALUES ('emergency_stop', 'false');
INSERT OR IGNORE INTO settings (key, value) VALUES ('vacation_mode', 'false');
INSERT OR IGNORE INTO settings (key, value) VALUES ('vacation_message', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('staging_mode', 'false');
INSERT OR IGNORE INTO settings (key, value) VALUES ('staging_whitelist', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('allow_public_tracking', 'true');
INSERT OR IGNORE INTO settings (key, value) VALUES ('work_hours_start', '09:00');
INSERT OR IGNORE INTO settings (key, value) VALUES ('work_hours_end', '17:00');
INSERT OR IGNORE INTO settings (key, value) VALUES ('log_level', 'info');
