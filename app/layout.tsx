import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Document Verifier',
  description: 'AI-powered verification for passports, visas, IDs, and travel documents',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
