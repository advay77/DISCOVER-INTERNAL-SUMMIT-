import type { Metadata } from 'next';
import { Inter, Inter_Tight } from 'next/font/google';
import './globals.css';

// Self-hosted at build time: no request to Google at page load, no
// render-blocking stylesheet, and the files are cached with the app.
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });
const interTight = Inter_Tight({ subsets: ['latin'], weight: ['400', '500', '600'], display: 'swap', variable: '--font-inter-tight' });

export const metadata: Metadata = {
  title: 'DISCOVER OS — Summit Command Center',
  description: 'Internal operating system for the DISCOVER board, workstream leads and volunteers.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${interTight.variable}`}>
      <head>
        {/* Apply the saved theme before first paint. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
