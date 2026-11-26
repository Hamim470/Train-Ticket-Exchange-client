"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Train,
  Menu,
  X,
  Globe,
  LogOut,
  PlusCircle,
  Ticket,
  ShieldCheck,
  User,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { useLanguage } from "@/context/LanguageContext";

function NavbarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { lang, toggleLang, t } = useLanguage();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const user = session?.user || null;
  const role = user?.role || "buyer";

  const navLinks = [
    {
      href: "/tickets",
      label: t("টিকিট খুঁজুন", "Browse Tickets"),
      icon: Ticket,
      show: true,
    },
    {
      href: "/dashboard/sell",
      label: t("টিকিট বিক্রি", "Sell Ticket"),
      icon: PlusCircle,
      show: Boolean(user),
    },
    {
      href: "/dashboard/bookings",
      label: t("আমার বুকিং", "My Bookings"),
      icon: Train,
      show: Boolean(user),
    },
    {
      href: "/dashboard/profile",
      label: t("প্রোফাইল ও KYC", "Profile & KYC"),
      icon: User,
      show: Boolean(user),
    },
    {
      href: "/admin/tickets",
      label: t("অ্যাডমিন টিকিট", "Admin Tickets"),
      icon: ShieldCheck,
      show: role === "admin",
    },
    {
      href: "/admin/kyc",
      label: t("KYC যাচাই", "KYC Queue"),
      icon: ShieldCheck,
      show: role === "admin",
    },
  ].filter((item) => item.show);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            setMobileMenuOpen(false);
            router.push("/login");
            router.refresh();
          },
        },
      });
    } catch (err) {
      console.error("Sign out error:", err);
      router.push("/login");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <Link
          href="/"
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center gap-2 text-slate-900 font-bold text-base sm:text-lg shrink-0"
        >
          <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Train className="w-5 h-5" />
          </span>
          <span className="tracking-tight">
            {t("ট্রেন টিকিট এক্সচেঞ্জ", "Train Ticket Exchange")}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname?.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Controls: Language Toggle + Auth */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleLang}
            aria-label="Toggle Language"
            className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span>{lang === "bn" ? "EN" : "বাং"}</span>
          </button>

          {isPending ? (
            <div className="w-20 h-9 rounded-xl bg-slate-100 animate-pulse" />
          ) : user ? (
            <button
              type="button"
              disabled={signingOut}
              onClick={handleSignOut}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t("লগআউট", "Sign Out")}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center"
              >
                {t("লগইন", "Log In")}
              </Link>
              <Link
                href="/register"
                className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center"
              >
                {t("রেজিস্টার", "Register")}
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Right Actions */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={toggleLang}
            aria-label="Toggle Language"
            className="min-h-[40px] px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 inline-flex items-center gap-1 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span>{lang === "bn" ? "EN" : "বাং"}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle Navigation Menu"
            className="min-h-[40px] min-w-[40px] rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center justify-center cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname?.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`min-h-[44px] px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            {user ? (
              <button
                type="button"
                disabled={signingOut}
                onClick={handleSignOut}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{t("লগআউট", "Sign Out")}</span>
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm font-semibold flex items-center justify-center"
                >
                  {t("লগইন", "Log In")}
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold flex items-center justify-center"
                >
                  {t("রেজিস্টার", "Register")}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default function Navbar() {
  return (
    <Suspense
      fallback={
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 h-16" />
      }
    >
      <NavbarContent />
    </Suspense>
  );
}