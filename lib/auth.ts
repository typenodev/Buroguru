// 访问密码认证：HMAC-SHA256 签名 Cookie（有效期 7 天）
// 同时兼容 Next.js Edge runtime(middleware) 与 Node runtime(API route)
// 仅使用全局 Web Crypto(crypto.subtle)，不依赖 node:crypto，确保 Edge 可用

const COOKIE_NAME = 'bg_auth'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 天（秒）

function getSecret(): string {
  // AUTH_SECRET 在 Netlify 后台配置（非公开环境变量）
  return process.env.AUTH_SECRET || 'insecure-dev-secret-change-me'
}

function getSitePass(): string | undefined {
  // SITE_PASS 在 Netlify 后台配置（非公开环境变量）
  return process.env.SITE_PASS
}

// Web Crypto HMAC-SHA256，返回 hex 字符串
async function hmacHex(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return bufToHex(new Uint8Array(sig))
}

function bufToHex(buf: Uint8Array): string {
  let s = ''
  for (const b of buf) s += b.toString(16).padStart(2, '0')
  return s
}

// 校验密码正确后生成签名 Cookie 值；密码错误或缺配置返回 null
export async function createAuthCookie(password: string): Promise<string | null> {
  const sitePass = getSitePass()
  if (!sitePass || password !== sitePass) return null
  const expires = Date.now() + MAX_AGE * 1000
  const payload = String(expires)
  const sig = await hmacHex(payload, getSecret())
  // 格式: <过期时间戳>.<HMAC 签名>
  return `${payload}.${sig}`
}

// 校验 Cookie 是否有效（签名正确且未过期）
export async function verifyAuthCookie(cookie: string): Promise<boolean> {
  if (!cookie) return false
  const parts = cookie.split('.')
  if (parts.length !== 2) return false
  const [expires, sig] = parts
  const expNum = Number(expires)
  if (!Number.isFinite(expNum) || expNum < Date.now()) return false
  const expected = await hmacHex(expires, getSecret())
  return sig === expected
}

export const AUTH_COOKIE_NAME = COOKIE_NAME
export const AUTH_MAX_AGE = MAX_AGE

