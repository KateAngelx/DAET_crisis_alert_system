import { Geist, Geist_Mono } from "next/font/google";
import { GlobalEmergencyBanner } from "@/app/components/GlobalEmergencyBanner";
import { AuthSessionSync } from "@/app/components/AuthSessionSync";
import { PasswordRecoveryRedirect } from "@/app/components/PasswordRecoveryRedirect";
import { ChannelPreferencesGate } from "@/app/components/ChannelPreferencesGate";
import { AssignmentRequestHandler } from "@/app/components/tour/AssignmentRequestHandler";
import { NotificationArrivalListener } from "@/app/components/NotificationArrivalListener";
import { ConfirmDialogProvider } from "@/app/components/ui/ConfirmDialogProvider";
import { InstallPwaPrompt } from "@/app/components/InstallPwaPrompt";
import { siteInfo } from "@/lib/siteInfo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: `${siteInfo.brandName} | Crisis Alerts — Daet, Camarines Norte`,
  description: siteInfo.tagline,
  applicationName: siteInfo.brandName,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: siteInfo.brandName,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scrollbar-none`}>
      <body className="min-h-full flex flex-col relative scrollbar-none">
        <AuthSessionSync />
        <PasswordRecoveryRedirect />
        <ChannelPreferencesGate />
        <AssignmentRequestHandler />
        <GlobalEmergencyBanner />
        <NotificationArrivalListener />
        <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
        <InstallPwaPrompt />
      </body>
    </html>
  );
}