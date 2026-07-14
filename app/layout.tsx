import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Weekly Report Viewer",
  description: "View student weekly reports from Google Sheets",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-gray-900">
        <header className="border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-red-500 flex items-center gap-2">
              <div className="w-6 h-6 bg-red-500 rounded-md text-white flex items-center justify-center text-sm">L</div>
              LAMP Reports
            </Link>
            <nav className="flex gap-6">
              <Link href="/" className="text-sm font-medium text-gray-600 hover:text-red-500 transition-colors">대시보드</Link>
              <Link href="/settings" className="text-sm font-medium text-gray-600 hover:text-red-500 transition-colors">학생 등록 (설정)</Link>
            </nav>
          </div>
        </header>
        <div className="flex-1 bg-gray-50/50">
          {children}
        </div>
      </body>
    </html>
  );
}
