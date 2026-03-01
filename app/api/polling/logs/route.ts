import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { getDb } from '@/lib/db'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  const url = new URL(request.url)
  const limit = parseInt(url.searchParams.get('limit') || '50', 10)
  const jobType = url.searchParams.get('type')

  const db = getDb()
  let query = 'SELECT * FROM polling_jobs'
  const params: any[] = []

  if (jobType) {
    query += ' WHERE job_type = ?'
    params.push(jobType)
  }
  query += ' ORDER BY started_at DESC LIMIT ?'
  params.push(limit)

  const logs = db.prepare(query).all(...params)
  return NextResponse.json({ success: true, data: logs })
}
