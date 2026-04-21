'use client'
export default function LoginGate({ children }) {
  // Authentication is now handled per-page and via the Navbar's auto-router.
  // This component now acts as a simple wrapper to maintain compatibility with existing layouts.
  return <>{children}</>
}
