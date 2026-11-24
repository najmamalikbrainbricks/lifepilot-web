import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import LifePilotApp from '@/components/lifepilot-app'

export const metadata: Metadata = {
  title: 'LifePilot — Your day, in flow',
  description: 'A calmer, more intentional home for your daily plan, routines, focus, and wellbeing.',
  applicationName: 'LifePilot',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark light',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f8fc' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1120' },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body suppressHydrationWarning>
        <LifePilotApp>{children}</LifePilotApp>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
