import { Geist, Geist_Mono } from "next/font/google";
import { GlobalEmergencyBanner } from "@/app/components/GlobalEmergencyBanner";
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
  title: "CONNECT-DAET | Smart Tourism & Crisis Management",
  description: "Official prototype for System 6: Crisis Management Subsystem",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col relative">
        <GlobalEmergencyBanner /> 
        {children}
      </body>
    </html>
  );
}