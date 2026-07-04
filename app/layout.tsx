import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meal Planner",
  description: "Personal weekly meal planning",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        <header className="border-b border-stone-200 bg-white">
          <nav className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
            <span className="text-lg font-bold text-emerald-700">🥦 Meal Planner</span>
            <Link href="/" className="text-sm font-medium text-stone-600 hover:text-emerald-700">
              Week
            </Link>
            <Link
              href="/recipes"
              className="text-sm font-medium text-stone-600 hover:text-emerald-700"
            >
              Recipes
            </Link>
            <Link
              href="/shopping"
              className="text-sm font-medium text-stone-600 hover:text-emerald-700"
            >
              Shopping list
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
