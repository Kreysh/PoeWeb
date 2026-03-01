import type Database from 'better-sqlite3'

export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS leagues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game TEXT NOT NULL,
      league_id TEXT NOT NULL,
      label TEXT NOT NULL,
      is_current INTEGER NOT NULL DEFAULT 0,
      start_at TEXT,
      end_at TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(game, league_id)
    );

    CREATE TABLE IF NOT EXISTS saved_searches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game TEXT NOT NULL,
      league TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      query_json TEXT NOT NULL,
      trade_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      poll_interval_min INTEGER NOT NULL DEFAULT 15,
      last_checked_at TEXT,
      last_result_count INTEGER DEFAULT 0,
      new_since_last INTEGER DEFAULT 0,
      live_mode TEXT DEFAULT 'polling',
      auto_whisper INTEGER DEFAULT 0,
      max_price_threshold REAL,
      price_threshold_currency TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS search_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      search_id INTEGER NOT NULL REFERENCES saved_searches(id) ON DELETE CASCADE,
      item_hash TEXT NOT NULL,
      item_json TEXT NOT NULL,
      price_amount REAL,
      price_currency TEXT,
      seller_account TEXT,
      seller_character TEXT,
      whisper_token TEXT,
      is_new INTEGER NOT NULL DEFAULT 1,
      source TEXT DEFAULT 'polling',
      found_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(search_id, item_hash)
    );

    CREATE TABLE IF NOT EXISTS alert_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game TEXT NOT NULL,
      league TEXT NOT NULL,
      name TEXT NOT NULL,
      rule_type TEXT NOT NULL,
      search_id INTEGER REFERENCES saved_searches(id) ON DELETE SET NULL,
      conditions_json TEXT NOT NULL,
      notification_method TEXT NOT NULL DEFAULT 'in_app',
      is_active INTEGER NOT NULL DEFAULT 1,
      cooldown_min INTEGER NOT NULL DEFAULT 5,
      last_triggered_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS triggered_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_id INTEGER NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
      search_result_id INTEGER REFERENCES search_results(id) ON DELETE SET NULL,
      game TEXT NOT NULL,
      message TEXT NOT NULL,
      details_json TEXT,
      trade_url TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      triggered_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS currency_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game TEXT NOT NULL,
      league TEXT NOT NULL,
      currency_id TEXT NOT NULL,
      currency_label TEXT NOT NULL,
      chaos_equivalent REAL NOT NULL,
      divine_equivalent REAL,
      icon_url TEXT,
      captured_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS currency_rates_latest (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game TEXT NOT NULL,
      league TEXT NOT NULL,
      currency_id TEXT NOT NULL,
      currency_label TEXT NOT NULL,
      chaos_equivalent REAL NOT NULL,
      divine_equivalent REAL,
      icon_url TEXT,
      change_24h REAL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(game, league, currency_id)
    );

    CREATE TABLE IF NOT EXISTS item_price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game TEXT NOT NULL,
      league TEXT NOT NULL,
      item_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      chaos_value REAL,
      divine_value REAL,
      listing_count INTEGER,
      icon_url TEXT,
      captured_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS item_prices_latest (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game TEXT NOT NULL,
      league TEXT NOT NULL,
      item_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      chaos_value REAL,
      divine_value REAL,
      listing_count INTEGER,
      icon_url TEXT,
      change_24h REAL,
      sparkline_json TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(game, league, item_type, item_id)
    );

    CREATE TABLE IF NOT EXISTS item_price_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game TEXT NOT NULL,
      league TEXT NOT NULL,
      item_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      avg_chaos REAL,
      min_chaos REAL,
      max_chaos REAL,
      avg_divine REAL,
      avg_listing_count REAL,
      sample_count INTEGER DEFAULT 1,
      date TEXT NOT NULL,
      UNIQUE(game, league, item_type, item_id, date)
    );

    CREATE TABLE IF NOT EXISTS currency_rate_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game TEXT NOT NULL,
      league TEXT NOT NULL,
      currency_id TEXT NOT NULL,
      currency_label TEXT NOT NULL,
      avg_chaos REAL,
      min_chaos REAL,
      max_chaos REAL,
      sample_count INTEGER DEFAULT 1,
      date TEXT NOT NULL,
      UNIQUE(game, league, currency_id, date)
    );

    CREATE TABLE IF NOT EXISTS economy_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      polling_interval_min INTEGER NOT NULL DEFAULT 30,
      enabled_categories_json TEXT NOT NULL DEFAULT '["all"]',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS live_search_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      search_id INTEGER NOT NULL REFERENCES saved_searches(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      item_count INTEGER DEFAULT 0,
      details_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mod_tiers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game TEXT NOT NULL,
      mod_id TEXT NOT NULL,
      internal_name TEXT,
      display_name TEXT NOT NULL,
      generation_type TEXT,
      domain TEXT,
      tier INTEGER,
      required_level INTEGER,
      spawn_weight INTEGER,
      mod_group TEXT,
      mod_category TEXT,
      influence TEXT,
      stats_json TEXT,
      applicable_tags_json TEXT,
      patch_version TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(game, mod_id)
    );

    CREATE TABLE IF NOT EXISTS meta_relevance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game TEXT NOT NULL,
      league TEXT NOT NULL,
      mod_category TEXT NOT NULL,
      relevance_score REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(game, league, mod_category)
    );

    CREATE TABLE IF NOT EXISTS polling_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_type TEXT NOT NULL,
      game TEXT NOT NULL,
      league TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      details_json TEXT,
      items_found INTEGER DEFAULT 0,
      items_new INTEGER DEFAULT 0,
      errors TEXT,
      duration_ms INTEGER,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_search_results_search_id ON search_results(search_id);
    CREATE INDEX IF NOT EXISTS idx_triggered_alerts_rule_id ON triggered_alerts(rule_id);
    CREATE INDEX IF NOT EXISTS idx_triggered_alerts_unread ON triggered_alerts(is_read, triggered_at);
    CREATE INDEX IF NOT EXISTS idx_currency_rates_latest_game ON currency_rates_latest(game, league);
    CREATE INDEX IF NOT EXISTS idx_item_price_history_lookup ON item_price_history(game, league, item_id);
    CREATE INDEX IF NOT EXISTS idx_polling_jobs_type ON polling_jobs(job_type, started_at);
    CREATE INDEX IF NOT EXISTS idx_item_prices_latest_game ON item_prices_latest(game, league, item_type);
    CREATE INDEX IF NOT EXISTS idx_item_price_daily_lookup ON item_price_daily(game, league, item_type, item_id, date);
    CREATE INDEX IF NOT EXISTS idx_currency_rate_daily_lookup ON currency_rate_daily(game, league, currency_id, date);
    CREATE INDEX IF NOT EXISTS idx_live_search_events_search ON live_search_events(search_id, created_at);

    CREATE TABLE IF NOT EXISTS analysis_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game TEXT NOT NULL,
      league TEXT NOT NULL,
      query_id TEXT NOT NULL,
      trade_url TEXT,
      items_json TEXT NOT NULL,
      analysis_json TEXT,
      total_items INTEGER NOT NULL DEFAULT 0,
      total_in_search INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_analysis_sessions_query ON analysis_sessions(game, league, query_id);
  `)

  // Migrate existing tables - add new columns with try/catch
  const alterStatements = [
    "ALTER TABLE saved_searches ADD COLUMN live_mode TEXT DEFAULT 'polling'",
    "ALTER TABLE saved_searches ADD COLUMN auto_whisper INTEGER DEFAULT 0",
    "ALTER TABLE saved_searches ADD COLUMN max_price_threshold REAL",
    "ALTER TABLE saved_searches ADD COLUMN price_threshold_currency TEXT",
    "ALTER TABLE search_results ADD COLUMN source TEXT DEFAULT 'polling'",
    "ALTER TABLE saved_searches ADD COLUMN query_id TEXT",
  ]
  for (const sql of alterStatements) {
    try { db.exec(sql) } catch { /* column already exists */ }
  }

  // Ensure economy_settings has a default row
  db.prepare(
    "INSERT OR IGNORE INTO economy_settings (id, polling_interval_min, enabled_categories_json) VALUES (1, 30, '[\"all\"]')"
  ).run()
}
