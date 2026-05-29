import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
// Leaflet CSS must be imported globally before any map component renders
// Importing here ensures it's loaded on every page, even before client JS hydrates
import 'leaflet/dist/leaflet.css';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = { title: 'SheSafe', description: 'Drop safety pins on a map to help others stay safe.' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
