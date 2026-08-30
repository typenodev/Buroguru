import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyAuthCookie, AUTH_COOKIE_NAME } from './lib/auth'

const UNLOCK_PATH = '/unlock'

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  // 解锁页本身 / 登录接口 / 静态资源 / 系统文件 直接放行，避免死循环或样式加载失败
  if (
    pathname === UNLOCK_PATH ||
    pathname.startsWith('/api/unlock') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return NextResponse.next()
  }

  const cookie = req.cookies.get(AUTH_COOKIE_NAME)?.value
  if (cookie && (await verifyAuthCookie(cookie))) {
    return NextResponse.next()
  }

  // 未授权：跳转解锁页，并记录 redirect 以便登录后跳回原页面
  const url = req.nextUrl.clone()
  url.pathname = UNLOCK_PATH
  url.search = `?redirect=${encodeURIComponent(pathname + search)}`
  return NextResponse.redirect(url)
}

export const config = {
  // 匹配所有路径，排除 Next.js 内部静态资源与图片（这些已由上面的函数兜底放行）
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
