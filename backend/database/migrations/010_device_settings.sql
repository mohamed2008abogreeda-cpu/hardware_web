-- Default sorting and classification settings

-- ── 📊 Device List Defaults ──
INSERT OR IGNORE INTO settings (key, value) VALUES ('device_list_default_sort', 'rep_date1');
INSERT OR IGNORE INTO settings (key, value) VALUES ('device_list_sort_dir', 'desc');
INSERT OR IGNORE INTO settings (key, value) VALUES ('device_classification_source', 'rep_case');
