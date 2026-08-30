'use client'
import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function UnlockInner() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const params = useSearchParams()
  const redirect = params.get('redirect') || '/'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || '密码错误')
        setLoading(false)
        return
      }
      router.replace(redirect)
    } catch {
      setError('网络错误，请重试')
      setLoading(false)
    }
  }

  return (
    <div style={styles.wrap}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <div style={styles.lock}>🔒</div>
        <h1 style={styles.title}>受保护的页面</h1>
        <p style={styles.sub}>请输入访问密码以继续</p>
        <input
          style={styles.input}
          type="password"
          placeholder="访问密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {error && <div style={styles.err}>{error}</div>}
        <button style={styles.btn} type="submit" disabled={loading}>
          {loading ? '验证中…' : '进入'}
        </button>
      </form>
    </div>
  )
}

export default function UnlockPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
      <UnlockInner />
    </Suspense>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0b0b0f',
    padding: '16px',
  },
  card: {
    width: '100%',
    maxWidth: '360px',
    background: '#16161c',
    border: '1px solid #2a2a33',
    borderRadius: '16px',
    padding: '32px 28px',
    boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  lock: { fontSize: '40px', marginBottom: '8px' },
  title: { color: '#f5f5f7', fontSize: '20px', margin: '0 0 4px', fontWeight: 600 },
  sub: { color: '#9a9aa5', fontSize: '13px', margin: '0 0 20px' },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #33333d',
    background: '#0f0f14',
    color: '#f5f5f7',
    fontSize: '14px',
    outline: 'none',
  },
  err: { color: '#ff6b6b', fontSize: '13px', marginTop: '10px' },
  btn: {
    width: '100%',
    marginTop: '16px',
    padding: '12px',
    borderRadius: '10px',
    border: 'none',
    background: '#4f46e5',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
}

