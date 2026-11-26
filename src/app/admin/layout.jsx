"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  ShieldCheck,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useLanguage } from "@/context/LanguageContext";
import { getUserData } from "@/lib/api/me";

const ADMIN_NAV = [
  {
    href: "/admin",
    bn: "ওভারভিউ",
    en: "Overview",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/admin/tickets",
    bn: "টিকিট কিউ",
    en: "Tickets",
    icon: Ticket,
  },
  {
    href: "/admin/kyc",
    bn: "KYC যাচাই",
    en: "KYC Queue",
    icon: ShieldCheck,
  },
  {
    href: "/admin/disputes",
    bn: "ডিসপিউট",
    en: "Disputes",
    icon: ShieldAlert,
  },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { t } = useLanguage();

  const [profile, setProfile] = useState(null);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    if (isPending) return;

    if (!session?.user) {
      router.push("/login");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await getUserData();
        if (!cancelled && res?.ok) {
          setProfile(res.data);
        }
      } catch (err) {
        console.error("Admin layout profile check failed:", err);
      } finally {
        if (!cancelled) {
          setCheckingRole(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isPending, session, router]);

  const role = profile?.role || session?.user?.role;

  useEffect(() => {
    if (!isPending && !checkingRole && session?.user && role !== "admin") {
      router.push("/forbidden");
    }
  }, [isPending, checkingRole, session, role, router]);

  if (isPending || checkingRole) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (role !== "admin") {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pt-6">
      <div className="flex flex-wrap items-center gap-2 pb-4 mb-2 border-b border-slate-200">
        {ADMIN_NAV.map((tab) => {
          const Icon = tab.icon;
          const active = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname?.startsWith(`${tab.href}/`);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition ${
                active
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t(tab.bn, tab.en)}</span>
            </Link>
          );
        })}
      </div>
      <div>{children}</div>
    </div>
  );
}