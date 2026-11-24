import { Hind_Siliguri, Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import Navbar from "@/components/Navbar";

const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bangla",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata = {
  title: "Train Ticket Exchange | নিরাপদ ট্রেন টিকিট এক্সচেঞ্জ",
  description:
    "Secure peer-to-peer train ticket exchange in Bangladesh with NID verification and escrow protection.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="bn" className={`${hindSiliguri.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans">
        <LanguageProvider>
          <Navbar />
          <main>{children}</main>
        </LanguageProvider>
      </body>
    </html>
  );
}