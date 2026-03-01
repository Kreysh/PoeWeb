import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'
import { getDb } from '@/lib/db'

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json')

function loadSettings(): Record<string, any> {
  try {
    if (existsSync(SETTINGS_FILE)) {
      return JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'))
    }
  } catch { /* ignore */ }
  return {}
}

function saveSettings(settings: Record<string, any>): void {
  const dir = path.dirname(SETTINGS_FILE)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8')
}

export async function GET() {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const settings = loadSettings()
  const safe: Record<string, any> = { ...settings, poesessid: settings.poesessid ? '***configured***' : null }

  // Also include economy settings
  try {
    const db = getDb()
    const econSettings = db.prepare('SELECT polling_interval_min, enabled_categories_json FROM economy_settings WHERE id = 1').get() as any
    if (econSettings) {
      safe.economy_polling_interval = econSettings.polling_interval_min
      safe.economy_enabled_categories = JSON.parse(econSettings.enabled_categories_json)
    }
  } catch { /* ignore */ }

  return NextResponse.json({ success: true, data: safe })
}

export async function PUT(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  try {
    const body = await request.json()
    const settings = loadSettings()

    if (body.poesessid !== undefined) {
      settings.poesessid = body.poesessid || null
    }

    saveSettings(settings)

    // Update economy settings if provided
    if (body.economy_polling_interval !== undefined || body.economy_enabled_categories !== undefined) {
      const db = getDb()
      if (body.economy_polling_interval !== undefined) {
        const interval = Math.max(5, Math.min(360, parseInt(body.economy_polling_interval, 10) || 30))
        db.prepare("UPDATE economy_settings SET polling_interval_min = ?, updated_at = datetime('now') WHERE id = 1").run(interval)
      }
      if (body.economy_enabled_categories !== undefined) {
        const cats = Array.isArray(body.economy_enabled_categories) ? body.economy_enabled_categories : ['all']
        db.prepare("UPDATE economy_settings SET enabled_categories_json = ?, updated_at = datetime('now') WHERE id = 1").run(JSON.stringify(cats))
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Settings error:', err)
    return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 })
  }
}
