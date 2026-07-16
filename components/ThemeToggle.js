'use client'
import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle({ style }) {
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    const savedTheme = localStorage.getItem('cc_theme_mode')
    if (savedTheme) {
      setTheme(savedTheme)
      document.body.classList.toggle('dark-mode', savedTheme === 'dark')
    } else {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setTheme(systemDark ? 'dark' : 'light')
      document.body.classList.toggle('dark-mode', systemDark)
    }
  }, [])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('cc_theme_mode', next)
    document.body.classList.toggle('dark-mode', next === 'dark')
  }

  return (
    <button
      onClick={toggleTheme}
      title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
      aria-label="Toggle Theme Mode"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: 10,
        border: '1px solid var(--border-medium)',
        background: 'var(--bg-surface)',
        color: theme === 'light' ? '#D4933A' : '#60A5FA',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ...style
      }}
    >
      {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
