"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Train, PlusCircle, User, Loader2 } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useLanguage } from "@/context/LanguageContext";

const DASHBOARD_NAV = [
  {
    href: "/dashboard/bookings",
    bn: "আমার বুকিং",
    en: "My Bookings",
    icon: Train,
  },
  {
    href: "/dashboard/sell",
    bn: "টিকিট বিক্রি",
    en: "Sell Ticket",
    icon: PlusCircle,
  },
  {
    href: "/dashboard/profile",
    bn: "প্রোফাইল ও KYC",
    en: "Profile & KYC",
    icon: User,
  },
];

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { t } = useLanguage();

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [isPending, session, router]);

  if (isPending) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pt-6">
      <div className="flex flex-wrap items-center gap-2 pb-4 mb-2 border-b border-slate-200">
        {DASHBOARD_NAV.map((tab) => {
          const Icon = tab.icon;
          const active =
            pathname === tab.href || pathname?.startsWith(`${tab.href}/`);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition ${
                active
                  ? "bg-emerald-600 text-white shadow-xs"
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