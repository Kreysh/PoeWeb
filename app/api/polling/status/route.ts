import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getDb } from '@/lib/db'

export async function GET() {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const db = getDb()
  const recentJobs = db.prepare(
    'SELECT * FROM polling_jobs ORDER BY started_at DESC LIMIT 20'
  ).all()

  return NextResponse.json({ success: true, data: recentJobs })
}
