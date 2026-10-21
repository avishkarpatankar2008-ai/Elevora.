import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ELEVORA — AI Interview Intelligence',
  description: 'Production-ready AI interview platform with editorial precision and advanced analytics.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#09090b] text-[#fafafa] antialiased selection:bg-purple-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
