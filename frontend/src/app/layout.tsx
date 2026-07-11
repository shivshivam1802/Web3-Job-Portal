import type { Metadata } from 'next';
import './globals.css';
import { Web3Provider } from '@/context/Web3Context';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'DecentWork | Web3 Freelance Escrow Portal',
  description: 'A production-ready Web3 freelance marketplace with secure smart contract escrows and automated milestone payouts.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-background text-foreground grid-bg min-h-screen flex flex-col">
        <Web3Provider>
          <Navbar />
          <main className="flex-1 w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="w-full border-t border-slate-800/40 bg-slate-950/20 py-6 text-center text-xs text-slate-500">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              &copy; {new Date().getFullYear()} DecentWork. Secure Cryptographic Milestones & Disputes.
            </div>
          </footer>
        </Web3Provider>
      </body>
    </html>
  );
}
