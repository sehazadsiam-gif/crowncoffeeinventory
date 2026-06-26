import './globals.css'
import { ToastProvider } from '../components/Toast'
import AIAssistant from '../components/AIAssistant'
import EnvCheck from '../components/EnvCheck'
import LoginGate from '../components/LoginGate'

export const metadata = {
  title: 'Crown Coffee Inventory and Stock Management',
  description: 'Stock and inventory management for Crown Coffee',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{__html: `
          (function() {
            try {
              var saved = localStorage.getItem('cc_theme_mode');
              if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.body.classList.add('dark-mode');
              } else {
                document.body.classList.remove('dark-mode');
              }
            } catch (e) {}
          })();
        `}} />
        <EnvCheck />
        <ToastProvider>
          <LoginGate>
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
              {children}
              <AIAssistant />
            </div>
          </LoginGate>
        </ToastProvider>
      </body>
    </html>
  )
}