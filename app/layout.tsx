import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "./sw-register";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "지락실 게임",
  description: "지락실 4인 통과/실패 게임 진행 앱",
  manifest: `${BASE_PATH}/manifest.webmanifest`,
  applicationName: "지락실",
  appleWebApp: {
    capable: true,
    title: "지락실",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: `${BASE_PATH}/icon.svg`, type: "image/svg+xml" }],
    apple: [{ url: `${BASE_PATH}/icon.svg`, type: "image/svg+xml" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-zinc-950 text-white">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
