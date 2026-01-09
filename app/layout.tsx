import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "אקו קאפלט — מערך ניהול מלאי",
  description: "מערכת ניהול מחסן עבור Eco Cuplate (עברית, RTL)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 text-slate-800`}
      >
        <div className="min-h-screen flex">
          {/* Sidebar */}
          <aside className="hidden md:flex md:w-64 flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white border-l border-slate-700 shadow-xl sticky top-0 h-screen">
            {/* Logo */}
            <div className="p-6 border-b border-slate-700 flex items-center gap-3">
              <img
                src="/לוגו אקו.jpg"
                alt="אקו קופלט לוגו"
                className="h-10 object-contain"
              />
              <div>
                <h1 className="font-bold text-lg">אקו קאפלט</h1>
                <p className="text-xs text-slate-400">ניהול מחסן</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
              <NavLink href="/" label="לוח מחוונים" icon="📊" />
              <NavLink href="/inventory" label="קבלה חומרים" icon="📥" />
              <NavLink href="/materials" label="ניהול פריטים" icon="📋" />
              <NavLink href="/issue" label="הוצאה חומרים" icon="📤" />
              <NavLink href="/reception" label="היסטוריית תנועות" icon="📜" />
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-700 text-xs text-slate-400 text-center">
              <p>© {new Date().getFullYear()} אקו קופלט</p>
            </div>
          </aside>

          {/* Mobile Header */}
          <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <img
                  src="/לוגו אקו.jpg"
                  alt="אקו קופלט לוגו"
                  className="h-8 object-contain"
                />
                <span className="font-bold text-sm">אקו קאפלט</span>
              </div>
              <details className="relative">
                <summary className="cursor-pointer text-xl list-none">☰</summary>
                <div className="absolute left-0 top-full mt-2 w-48 bg-gradient-to-b from-slate-900 to-slate-800 rounded-lg shadow-xl border border-slate-700 p-2 space-y-1">
                  <MobileNavLink href="/" label="לוח מחוונים" icon="📊" />
                  <MobileNavLink href="/inventory" label="קבלה חומרים" icon="📥" />
                  <MobileNavLink href="/materials" label="ניהול פריטים" icon="📋" />
                  <MobileNavLink href="/issue" label="הוצאה חומרים" icon="📤" />
                  <MobileNavLink href="/reception" label="היסטוריה" icon="📜" />
                </div>
              </details>
            </div>
          </div>

          {/* Main Content */}
          <main className="flex-1 w-full overflow-auto md:p-6 p-4 pt-20 md:pt-0">
            <div className="mx-auto max-w-6xl space-y-8">
              {children}
              <footer className="text-center text-sm text-slate-500 py-6">
                נבנה ע"י אלי לבין
              </footer>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-white/10 hover:shadow-lg active:bg-emerald-600/30 group"
    >
      <span className="text-xl group-hover:scale-110 transition-transform">{icon}</span>
      <span>{label}</span>
    </a>
  );
}

function MobileNavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white hover:bg-white/10 transition-colors"
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </a>
  );
}
