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
  title: "RIBO CRM | Omnichannel Lead Capture",
  description: "Next-gen inbound lead tracking and AI classification for modern sales teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <nav className="ribo-nav glass">
          <div className="nav-container">
            <a href="/" className="logo">RIBO <span>CRM</span></a>
            <div className="nav-links">
              <a href="/leads">Pipeline</a>
              <a href="/dashboard/integrations">Integrations</a>
              <a href="/dashboard/settings/ai">AI Settings</a>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
