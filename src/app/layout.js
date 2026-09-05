import { Geist, Geist_Mono } from "next/font/google";
import { GlobalEmergencyBanner } from "@/app/components/GlobalEmergencyBanner";
import { AuthSessionSync } from "@/app/components/AuthSessionSync";
import { AssignmentRequestHandler } from "@/app/components/tour/AssignmentRequestHandler";
import { NotificationArrivalListener } from "@/app/components/NotificationArrivalListener";
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
  title: "CONNECT-DAET | Daet LGU Crisis Alerts",
  description: "Official crisis alerts, safety advisories, and incident reporting for tourists in Daet, Camarines Norte.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scrollbar-none`}>
      <body className="min-h-full flex flex-col relative scrollbar-none">
        <AuthSessionSync />
        <AssignmentRequestHandler />
        <GlobalEmergencyBanner />
        <NotificationArrivalListener />
        {children}
      </body>
    </html>
  );
}