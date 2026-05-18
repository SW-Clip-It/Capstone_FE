import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "material-symbols/outlined.css";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { I18nProvider } from "@/providers/I18nProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader" });

export const metadata: Metadata = {
  title: "CLIP-IT",
  description:
    "AI가 생성한 영상으로 고전 문학을 경험하세요 | Experience classic literature through AI-generated video scenes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${inter.variable} ${newsreader.variable} font-sans antialiased`}>
        <AuthProvider>
          <I18nProvider>
            <ToastProvider>{children}</ToastProvider>
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
