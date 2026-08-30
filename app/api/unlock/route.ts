import { NextRequest, NextResponse } from 'next/server'
import { createAuthCookie, AUTH_COOKIE_NAME, AUTH_MAX_AGE } from '../../../lib/auth'

export async function POST(req: NextRequest) {
  let password = ''
  try {
    const body = await req.json()
    password = body?.password ?? ''
  } catch {
    return NextResponse.json({ ok: false, error: '请求格式错误' }, { status: 400 })
  }

  const cookie = await createAuthCookie(password)
  if (!cookie) {
    return NextResponse.json({ ok: false, error: '密码错误' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(AUTH_COOKIE_NAME, cookie, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: AUTH_MAX_AGE,
  })
  return res
}

