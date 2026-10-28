import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ role: 'USER' }, { status: 200 })
  }
  return NextResponse.json({ role: (session.user as any).role || 'USER' }, { status: 200 })
}