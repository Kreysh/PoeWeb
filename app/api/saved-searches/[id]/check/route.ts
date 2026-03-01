import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/require-auth'
import { checkSavedSearch } from '@/lib/polling/saved-search-checker'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if ('error' in auth) return auth.error

  try {
    const { id } = await params
    const result = await checkSavedSearch(parseInt(id, 10))
    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    console.error('Check search error:', err)
    return NextResponse.json({ success: false, error: 'Check failed' }, { status: 500 })
  }
}
