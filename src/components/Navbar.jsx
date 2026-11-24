"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Train,
  Menu,
  X,
  ShieldCheck,
  Ticket,
  PlusCircle,
  LayoutDashboard,
  LogOut,
  User,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { useLanguage } from "@/context/LanguageContext";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { lang, toggleLang, t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  const user = session?.user;
  const role = user?.role || "buyer";

  const handleLogout = async () => {
    await signOut();
    setMobileOpen(false);
    router.push("/login");
    router.refresh();
  };

  const navLinks = [
    {
      href: "/tickets",
      label: t("টিকিট খুঁজুন", "Browse Tickets"),
      icon: Ticket,
      show: true,
    },
    {
      href: "/dashboard/sell",
      label: t("টিকিট বিক্রি করুন", "Sell Ticket"),
      icon: PlusCircle,
      show: true,
    },
    {
      href: "/dashboard/bookings",
      label: t("আমার বুকিং", "My Bookings"),
      icon: User,
      show: Boolean(user),
    },
    {
      href: "/admin",
      label: t("অ্যাডমিন প্যানেল", "Admin Panel"),
      icon: ShieldCheck,
      show: user && role === "admin",
    },
  ].filter((link) => link.show);

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 min-h-[44px] text-slate-900 hover:opacity-90 transition"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <Train className="w-5 h-5" />
          </div>
          <div className="leading-tight">
            <span className="block font-bold text-base sm:text-lg tracking-tight text-slate-900">
              Train Ticket Exchange
            </span>
            <span className="block text-[11px] font-medium text-emerald-700">
              {t("নিরাপদ এসক্রো মার্কেটপ্লেস", "Verified Escrow Exchange")}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition min-h-[40px] ${
                  active
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Controls: BN | EN Toggle + Auth Actions */}
        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <div
            role="group"
            aria-label="Language Switcher"
            className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold"
          >
            <button
              type="button"
              onClick={() => toggleLang("bn")}
              className={`px-2.5 py-1.5 rounded-md transition min-h-[34px] ${
                lang === "bn"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              BN
            </button>
            <button
              type="button"
              onClick={() => toggleLang("en")}
              className={`px-2.5 py-1.5 rounded-md transition min-h-[34px] ${
                lang === "en"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              EN
            </button>
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-2">
            {isPending ? (
              <div className="w-24 h-10 rounded-lg bg-slate-100 animate-pulse" />
            ) : user ? (
              <>
                <Link
                  href="/dashboard/profile"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 min-h-[44px]"
                >
                  <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                  <span className="max-w-[110px] truncate">{user.name}</span>
                  {user.kycStatus === "verified" && (
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  title={t("লগআউট", "Logout")}
                  className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 transition min-h-[44px]"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 transition min-h-[44px] inline-flex items-center"
                >
                  {t("লগইন", "Login")}
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition min-h-[44px] inline-flex items-center"
                >
                  {t("নিবন্ধন করুন", "Register")}
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Button (44px touch target) */}
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-slate-200 bg-white"
          >
            <div className="px-4 py-3 space-y-1.5">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium min-h-[44px] ${
                      active
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="w-4 h-4 text-emerald-600" />
                    {item.label}
                  </Link>
                );
              })}

              <div className="pt-2 mt-2 border-t border-slate-100">
                {user ? (
                  <div className="space-y-1.5">
                    <Link
                      href="/dashboard/profile"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 text-sm font-semibold text-slate-800 min-h-[44px]"
                    >
                      <span className="flex items-center gap-2">
                        <User className="w-4 h-4 text-emerald-600" />
                        {user.name}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                        {role}
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 min-h-[44px]"
                    >
                      <LogOut className="w-4 h-4" />
                      {t("লগআউট করুন", "Log Out")}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Link
                      href="/login"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 min-h-[44px]"
                    >
                      {t("লগইন", "Login")}
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-center rounded-lg bg-emerald-600 text-sm font-semibold text-white min-h-[44px]"
                    >
                      {t("নিবন্ধন", "Register")}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}