import { useState } from 'react'
import './LoginPage.css'
import ProductsPage from './ProductsPage'

interface LoginResponse {
  id: number
  username: string
  email: string
  firstName: string
  lastName: string
  gender: string
  image: string
  accessToken: string
  refreshToken: string
  message?: string
}

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  
  const [user, setUser] = useState<LoginResponse | null>(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        return JSON.parse(savedUser)
      } catch {
        return null
      }
    }
    return null
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('https://dummyjson.com/user/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          expiresInMins: 30,
        }),
      })

      const data: LoginResponse = await res.json()

      if (!res.ok) {
        setError(data.message || 'Invalid username or password.')
      } else {
        setUser(data)
        
        localStorage.setItem('user', JSON.stringify(data))
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    setUser(null)
    setUsername('')
    setPassword('')
    
    localStorage.removeItem('user')
  }

  if (user) {
    return (
      <ProductsPage
        username={user.username}
        avatar={user.image}
        accessToken={user.accessToken}
        refreshToken={user.refreshToken}
        onLogout={handleLogout}
      />
    )
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h2>Sign in</h2>
        <p className="login-subtitle">Enter your credentials to continue</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              placeholder="e.g. emilys"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="hint">
          Try: <code>emilys</code> / <code>emilyspass</code>
        </p>
      </div>
    </div>
  )
}