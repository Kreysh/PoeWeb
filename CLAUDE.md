# POE Trade Analyzer

## Git Workflow (OBLIGATORIO)
- **Repo**: github.com/Kreysh/PoeWeb.git (branch: main)
- **Después de cada cambio**: SIEMPRE hacer `git add`, `git commit` con mensaje descriptivo, y `git push origin main`
- No esperar a que el usuario lo pida — hacerlo automáticamente después de cada modificación de código

## Quick Reference
- **Stack**: Next.js 15.1.6 + React 18 + TypeScript + Tailwind + Tremor + SQLite + ws
- **Ports**: 3009 (HTTP proxy), 8447 (HTTPS)
- **URL**: https://poe.comercialcmc.cc/
- **Auth**: admin/admin (default, stored in data/auth.json)
- **DB**: SQLite at data/poe-trade.db (WAL mode)
- **Deploy**: `./deploy.sh` (build + restart servers + health check)

## Project Structure
```
app/
  login/          - Login page
  (dashboard)/    - Protected pages (sidebar layout)
    dashboard/    - Overview with KPIs and currency snapshot
    search/       - Trade search with filters → item cards + Go Live
    analyze/      - Trade URL analyzer: paste URL → price/mod analysis
    saved-searches/ - Manage saved searches with polling + live mode
    alerts/       - Alert rules and triggered alerts
    economy/      - Full economy browser: category tabs, item tables, sparklines, charts, analysis
    item/[id]/    - Item detail with mod analysis and scoring
    settings/     - POESESSID, economy interval, live search stats, manual polling
  api/
    auth/         - login, logout, me
    trade/        - search, fetch, analyze (proxy to GGG API)
    saved-searches/ - CRUD + manual check
    alerts/       - Rules CRUD + triggered alerts
    economy/      - currency, trending, history, items, categories, analysis
    live-search/  - GET status, POST start, DELETE stop, PUT update, stream (SSE)
    polling/      - trigger (economy, saved-searches, leagues, aggregate-daily, purge), status, logs
    settings/     - GET/PUT settings (POESESSID + economy settings), leagues, validate-session
    dashboard/    - Dashboard stats
    health/       - Health check

lib/
  auth/           - Store, password (bcrypt), session, require-auth
  db/             - SQLite connection + schema (with auto-migration for new columns)
  trade/          - Client, rate limiter, query builder, item parser, live-search-manager, types
  mods/           - Mod tier types, store, pattern index
  scoring/        - Scoring engine, weights, synergy rules
  archetypes/     - Build presets and matcher
  economy/        - poe.ninja client, poe2scout client, categories, types
  pricing/        - Price estimator
  cache/          - In-memory TTL cache
  polling/        - Cron orchestrator, search checker, economy updater, alert evaluator, aggregation
  constants/      - games.ts (POE1/POE2 config), navigation.ts
  contexts/       - AuthProvider, GameProvider
  hooks/          - useApi, useLiveSearch
  live-search-init.js - Resumes live searches at boot

components/
  ui/             - button, card, badge, skeleton, switch, tooltip, game-toggle, league-selector
  layout/         - sidebar (with live indicator), header, mobile-nav
  search/         - search-form, item-card (LIVE/auto-whisper badges), mod-tier-badge, live-search-panel
  economy/        - category-tabs, item-table, sparkline-cell, price-chart-modal, analysis-cards
  alerts/         - alert-rule-form
```

## Key Patterns
- **Dual Game**: GameContext provides `game` (poe1/poe2) + `league`. All API calls include game/league params.
- **Rate Limiting**: Token bucket in lib/trade/rate-limiter.ts parses GGG's X-Rate-Limit headers.
- **Scoring**: TotalScore = ModTierScore + RollQualityScore + SynergyScore. Grades: S(800+) A(600+) B(400+) C(250+) D(100+) F.
- **Polling**: node-cron in server-proxy.js worker #1: searches (15m), economy (configurable, default 30m), leagues (6h), aggregation (midnight), purge (Sunday 1AM).
- **Auth**: Simple single-user bcrypt auth with JSON file storage. Cookie: poe_trade_session.
- **Economy**: ALL poe.ninja categories (25+) for POE1, all poe2scout categories for POE2. Stored in item_prices_latest (current) + item_price_history (raw) + item_price_daily (aggregated). Analysis: buy/sell signals, stable/volatile items.
- **Live Search**: WebSocket to GGG trade API (wss://pathofexile.com/api/trade/live/...). Managed by LiveSearchManager singleton. Auto-reconnect with exponential backoff. SSE bridge for client. Auto-whisper copies to clipboard when price < threshold. Max 10 simultaneous connections.
- **IPC**: Worker #1 runs live searches and emits events via process.send(). Primary relays to all workers. SSE endpoint reads from both LiveSearchManager events and global IPC queue.

## Database Tables
- `leagues`, `saved_searches` (with live_mode, auto_whisper, max_price_threshold), `search_results` (with source)
- `alert_rules`, `triggered_alerts`
- `currency_rates` (history), `currency_rates_latest` (current), `currency_rate_daily` (aggregated)
- `item_price_history` (raw), `item_prices_latest` (current), `item_price_daily` (aggregated)
- `economy_settings` (polling interval, enabled categories)
- `live_search_events` (connection/item logs)
- `mod_tiers`, `meta_relevance`, `polling_jobs`

## Development
```bash
npm run dev          # Dev server on :3000
npm run build        # Production build
./deploy.sh          # Full deploy
```

## Important Notes
- POESESSID is optional, stored in data/settings.json
- Never commit data/ directory (contains auth, DB, settings)
- Trade API has strict rate limits - the rate limiter handles this automatically
- POE1 uses poe.ninja for economy, POE2 uses poe2scout.com
- Economy polls ALL categories (Currency, Fragment, Oil, Incubator, Scarab, Fossil, Resonator, Essence, DivinationCard, SkillGem, BaseType, UniqueMap, Map, UniqueJewel, UniqueFlask, UniqueWeapon, UniqueArmour, UniqueAccessory, Beast, ClusterJewel, DeliriumOrb, Omen, Memory, Tattoo, Vial)
- Live search requires POESESSID for best results (higher rate limits, proper WebSocket auth)
- POE Trade API works server-side with Node.js fetch + ws. No browser/iframe needed. POESESSID is only required for WebSocket (Live Search). REST API (search/fetch) works without it (with stricter rate limits).
- Trade URL Analyzer: paste a pathofexile.com/trade URL to analyze prices, mod frequency, valuable mod combos, rarity/base type distribution, and top items
- Notification sound at public/sounds/notification.mp3
