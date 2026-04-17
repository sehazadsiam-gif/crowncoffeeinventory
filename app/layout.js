import './globals.css'
import { ToastProvider } from '../components/Toast'
import HelpTooltip from '../components/HelpTooltip'
import EnvCheck from '../components/EnvCheck'
import LoginGate from '../components/LoginGate'

export const metadata = {
  title: 'Crown Coffee — Inventory & Stock Management',
  description: 'Premium inventory and stock management for Crown Coffee. Track ingredients, recipes, sales, and bazar purchases.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <EnvCheck />
        <ToastProvider>
          <LoginGate>
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
              {children}
              <HelpTooltip />
            </div>
          </LoginGate>
        </ToastProvider>
      </body>
    </html>
  )
}
