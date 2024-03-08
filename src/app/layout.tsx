import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import PlausibleProvider from "next-plausible";

const inter = Inter({ subsets: ['latin'] })

export const runtime = 'edge'

export const metadata: Metadata = {
  title: 'Comfy Deploy Demo',
  description: 'Serverless Comfy UI realtime demo with Next.js',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className='dark'>
      {/* <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"></meta> */}
      {process.env.PLAUSIBLE_DOMAIN && (
        <head>
          <PlausibleProvider taggedEvents domain={process.env.PLAUSIBLE_DOMAIN} />
        </head>
      )}
      <body className={inter.className}>{children}</body>
    </html>
  )
}
