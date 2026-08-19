import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import "./globals.css";

/**
 * 日本語・英字・数字を同一ファミリで揃える。
 * Latin専用ディスプレイフォントだと「5月」「B9」などでベースラインが崩れるため、
 * 和欧両対応の Noto Serif / Sans JP を本体に使う。
 */
const display = Noto_Serif_JP({
  variable: "--font-display-family",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const sans = Noto_Sans_JP({
  variable: "--font-sans-family",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ProBase Museum | プロ野球データ博物館",
  description:
    "数字が語る、感動の軌跡。あなただけのプロ野球データ博物館。",
  applicationName: "ProBase Museum",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "ProBase Museum",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
