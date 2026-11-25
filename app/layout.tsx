import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DISCOVER OS — Summit Command Center',
  description: 'Internal operating system for the DISCOVER board, workstream leads and volunteers.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,300;6..72,400;6..72,500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
