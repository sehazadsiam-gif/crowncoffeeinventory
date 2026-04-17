'use client'
import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          fontFamily: 'var(--font-sans)',
          color: 'var(--text-primary)'
        }}>
          <h2 style={{ 
            color: 'var(--danger)',
            marginBottom: '12px'
          }}>
            Something went wrong
          </h2>
          <p style={{ 
            color: 'var(--text-muted)', 
            fontSize: '13px',
            marginBottom: '20px'
          }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 22px',
              cursor: 'pointer',
              fontSize: '12px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
