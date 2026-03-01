import Database from 'better-sqlite3'
import path from 'path'
import { existsSync, mkdirSync } from 'fs'
import { initSchema } from './schema'

const DB_PATH = path.join(process.cwd(), 'data', 'poe-trade.db')

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (_db) return _db

  const dir = path.dirname(DB_PATH)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  _db = new Database(DB_PATH)
  _db.pragma('journal_mode = WAL')
  _db.pragma('busy_timeout = 5000')
  _db.pragma('synchronous = NORMAL')
  _db.pragma('foreign_keys = ON')

  initSchema(_db)
  return _db
}
