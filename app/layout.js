import './globals.css'
import { ToastProvider } from '../components/Toast'
import HelpTooltip from '../components/HelpTooltip'
import EnvCheck from '../components/EnvCheck'
import LoginGate from '../components/LoginGate'

export const metadata = {
  title: 'Crown Coffee Inventory and Stock Management',
  description: 'Premium stock and inventory management for Crown Coffee',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <EnvCheck />
        <ToastProvider>
          <LoginGate>
            <div className="relative min-h-screen flex flex-col">
              {children}
              <HelpTooltip />
            </div>
          </LoginGate>
        </ToastProvider>
      </body>
    </html>
  )
}
