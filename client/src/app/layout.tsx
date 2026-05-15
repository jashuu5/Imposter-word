import type { Metadata } from "next";
import { Syne, Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600", "700"],
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Imposter Word — Multiplayer Social Deduction",
  description: "A real-time multiplayer social deduction game. Find the imposter among your friends.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${syne.variable} ${spaceGrotesk.variable} ${spaceMono.variable}`}>
      <body className="bg-void text-white font-body antialiased">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#13131f",
              color: "#f0f0ff",
              border: "1px solid #1e1e2e",
              borderRadius: "12px",
              fontFamily: "var(--font-body)",
              fontSize: "14px",
            },
            success: {
              iconTheme: { primary: "#10b981", secondary: "#050507" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#050507" },
            },
            duration: 3000,
          }}
        />
      </body>
    </html>
  );
}
