import './globals.css'
import { ToastProvider } from '../components/Toast'
import EnvCheck from '../components/EnvCheck'
import LoginGate from '../components/LoginGate'
import GlobalRfidListener from '../components/GlobalRfidListener'

export const viewport = {
  themeColor: '#8B5E3C',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata = {
  title: 'Crown Coffee Staffs',
  description: 'Crown Coffee Staff Management System',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Crown Coffee Staffs',
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    shortcut: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@600;700;800&family=Outfit:wght@500;600;700;800;900&family=Plus+Jakarta+Sans:wght@500;600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="theme-color" content="#8B5E3C" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Crown Coffee Staffs" />
        <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
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
        <script dangerouslySetInnerHTML={{__html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .then(function(reg) { console.log('SW registered:', reg.scope); })
                .catch(function(err) { console.error('SW registration failed:', err); });
            });
          }
        `}} />
        <EnvCheck />
        <ToastProvider>
          <GlobalRfidListener />
          <LoginGate>
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
              {children}
            </div>
          </LoginGate>
        </ToastProvider>
      </body>
    </html>
  )
}