import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import '../styles/globals.css';
import { AuthProvider } from '@/contexts/auth-context';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'CreditMap',
  description: 'Credit mapping platform',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
