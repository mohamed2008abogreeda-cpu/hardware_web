-- Migration: 004_device_overrides
CREATE TABLE IF NOT EXISTS device_overrides (
  device_code TEXT PRIMARY KEY,
  rep_state TEXT,
  rep_state2 TEXT,
  rep_amount TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
