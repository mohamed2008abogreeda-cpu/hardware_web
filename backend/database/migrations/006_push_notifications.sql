-- Hardware Portal — Push Notifications Migration
-- Stores browser push subscriptions

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL, -- phone for customers, username for admins
    user_type TEXT NOT NULL CHECK(user_type IN ('customer', 'admin')),
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id, user_type);
