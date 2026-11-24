"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  User,
  Phone,
  Mail,
  Wallet,
  IdCard,
  Camera,
  Loader2,
  PlusCircle,
  FileText,
  ArrowRight,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { useLanguage } from "@/context/LanguageContext";
import { getUserData } from "@/lib/api/me";
import { kyc } from "@/lib/actions/kyc";

const uploadToImgBB = async (file) => {
  const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
  if (!apiKey) {
    throw new Error("ImgBB API key is missing in environment variables.");
  }

  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error?.message || "Image upload failed");
  }

  return result.data.url;
};

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { lang, t } = useLanguage();

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [nidNumber, setNidNumber] = useState("");
  const [nidFile, setNidFile] = useState(null);
  const [nidPreview, setNidPreview] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await getUserData();
      if (res.ok) {
        setProfile(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
      return;
    }
    if (session?.user) {
      fetchProfile();
    }
  }, [isPending, session, router, fetchProfile]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (nidPreview) URL.revokeObjectURL(nidPreview);
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    };
  }, [nidPreview, selfiePreview]);

  const handleKycSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);

    const cleanNid = nidNumber.replace(/\s+/g, "");
    if (!/^(\d{10}|\d{13}|\d{17})$/.test(cleanNid)) {
      setAlert({
        type: "error",
        text: t(
          "সঠিক ১০, ১৩ অথবা ১৭ সংখ্যার জাতীয় পরিচয়পত্র (NID) নম্বর দিন।",
          "Please enter a valid 10, 13, or 17-digit National ID (NID) number."
        ),
      });
      return;
    }

    if (!nidFile || !selfieFile) {
      setAlert({
        type: "error",
        text: t(
          "অনুগ্রহ করে এনআইডি কার্ডের ছবি এবং আপনার সেলফি উভয়ই নির্বাচন করুন।",
          "Please select both your NID front photo and your selfie."
        ),
      });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload both images to ImgBB concurrently
      const [nidPhotoUrl, selfieUrl] = await Promise.all([
        uploadToImgBB(nidFile),
        uploadToImgBB(selfieFile),
      ]);

      // 2. Submit uploaded URLs + NID number to backend via Server Action
      const res = await kyc({
        nidNumber: cleanNid,
        nidPhotoUrl,
        selfieUrl,
      });

      if (!res.ok) {
        setAlert({
          type: "error",
          text:
            res.data?.message ||
            t("এনআইডি জমা দিতে সমস্যা হয়েছে।", "Failed to submit KYC."),
        });
        setSubmitting(false);
        return;
      }

      setAlert({
        type: "success",
        text: t(
          "আপনার এনআইডি তথ্য সফলভাবে জমা হয়েছে! অ্যাডমিন যাচাইয়ের পর আপনি টিকিট বিক্রি করতে পারবেন।",
          "Your NID documents have been uploaded and submitted! You can list tickets once an admin approves them."
        ),
      });

      // Reset file inputs & refresh profile status
      setNidNumber("");
      setNidFile(null);
      setNidPreview(null);
      setSelfieFile(null);
      setSelfiePreview(null);
      await fetchProfile();
    } catch (err) {
      setAlert({
        type: "error",
        text:
          err.message ||
          t("ছবি আপলোড বা সার্ভার সংযোগে ত্রুটি হয়েছে।", "Image upload or network error."),
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (isPending || loadingProfile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
      </div>
    );
  }

  const user = profile || session?.user;
  const kycStatus = user?.kycStatus || "unverified";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {t("প্রোফাইল ও এনআইডি ভেরিফিকেশন", "Profile & NID Verification")}
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          {t(
            "টিকিট বিক্রি করতে ও এসক্রো পেআউট পেতে এনআইডি ভেরিফিকেশন সম্পন্ন করুন",
            "Complete NID verification to list tickets and receive Escrow payouts"
          )}
        </p>
      </div>

      {/* Account Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900">{user?.name}</h2>
                <span className="text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {user?.role || "buyer"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
            </div>
          </div>

          {/* Escrow Wallet Badge */}
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
            <Wallet className="w-5 h-5 text-emerald-600" />
            <div>
              <span className="block text-[11px] font-medium text-emerald-800">
                {t("এসক্রো ব্যালেন্স", "Escrow Balance")}
              </span>
              <span className="block text-base font-bold text-emerald-900 timer-digits">
                ৳{user?.walletBalance || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 text-sm">
          <div className="flex items-center gap-2.5 text-slate-700">
            <User className="w-4 h-4 text-slate-400" />
            <span>{user?.name}</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-700 timer-digits">
            <Phone className="w-4 h-4 text-slate-400" />
            <span>{user?.phone || "N/A"}</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-700">
            <Mail className="w-4 h-4 text-slate-400" />
            <span className="truncate">{user?.email}</span>
          </div>
        </div>
      </div>

      {/* Seller KYC Verification Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <IdCard className="w-5 h-5 text-emerald-600" />
              {t("সেলার এনআইডি ভেরিফিকেশন (KYC)", "Seller NID Verification (KYC)")}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {t(
                "ভুয়া টিকিট প্রতিরোধে প্রতিটি বিক্রেতার এনআইডি যাচাই করা বাধ্যতামূলক।",
                "Every seller must verify their NID to prevent ticket fraud."
              )}
            </p>
          </div>

          {/* Status Pill */}
          {kycStatus === "verified" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 self-start">
              <ShieldCheck className="w-4 h-4" />
              {t("✓ এনআইডি ভেরিফাইড", "✓ NID Verified")}
            </span>
          )}
          {kycStatus === "pending" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 self-start">
              <Clock className="w-4 h-4" />
              {t("যাচাইয়ের অপেক্ষায় (Pending)", "Pending Review")}
            </span>
          )}
          {kycStatus === "rejected" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-700 self-start">
              <AlertCircle className="w-4 h-4" />
              {t("বাতিল হয়েছে — পুনরায় জমা দিন", "Rejected — Re-submit")}
            </span>
          )}
          {kycStatus === "unverified" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 self-start">
              {t("ভেরিফাইড নয়", "Unverified")}
            </span>
          )}
        </div>

        {/* Motion Alert Banner */}
        <AnimatePresence mode="wait">
          {alert && (
            <motion.div
              key={alert.text}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`mb-5 p-3.5 rounded-xl border text-sm flex items-start gap-2.5 ${
                alert.type === "error"
                  ? "bg-red-50 border-red-200 text-red-700"
                  : "bg-emerald-50 border-emerald-200 text-emerald-800"
              }`}
            >
              {alert.type === "error" ? (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
              )}
              <span>{alert.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* State 1: Verified */}
        {kycStatus === "verified" && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-sm text-emerald-900">
              <p className="font-semibold">
                {t(
                  "আপনার অ্যাকাউন্টটি সম্পূর্ণ ভেরিফাইড!",
                  "Your account is fully verified!"
                )}
              </p>
              <p className="text-xs text-emerald-800 mt-0.5">
                {t(
                  "এখন আপনি আপনার অব্যবহৃত ট্রেনের টিকিট নিরাপদে লিস্ট করতে পারবেন।",
                  "You can now list your unused train tickets on the marketplace."
                )}
              </p>
            </div>
            <Link
              href="/dashboard/sell"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold min-h-[44px] shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              {t("টিকিট বিক্রি করুন", "Post a Ticket")}
            </Link>
          </div>
        )}

        {/* State 2: Pending Review */}
        {kycStatus === "pending" && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
            <p className="font-semibold">
              {t(
                "আপনার এনআইডি ডকুমেন্ট পর্যালোচনা করা হচ্ছে",
                "Your NID documents are under review"
              )}
            </p>
            <p className="text-xs text-amber-800 mt-1">
              {t(
                "আমাদের অ্যাডমিন টিম সাধারণত ১-২ ঘণ্টার মধ্যে এনআইডি যাচাই সম্পন্ন করে। অনুমোদন হলে ইমেইলে জানানো হবে।",
                "Our admin team typically verifies submissions within 1–2 hours. You will receive an email once approved."
              )}
            </p>
          </div>
        )}

        {/* State 3: Unverified or Rejected -> File Upload Form */}
        {(kycStatus === "unverified" || kycStatus === "rejected") && (
          <form onSubmit={handleKycSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {lang === "bn" ? "জাতীয় পরিচয়পত্র (NID) নম্বর" : "National ID (NID) Number"}
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FileText className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  required
                  maxLength={17}
                  value={nidNumber}
                  onChange={(e) => setNidNumber(e.target.value)}
                  placeholder="e.g. 19942691234567890"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm tabular-nums timer-digits"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* NID Front Photo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {lang === "bn" ? "এনআইডি ফ্রন্ট ছবি" : "NID Front Photo"}
                </label>

                <label className="flex flex-col items-center justify-center w-full min-h-48 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-400 cursor-pointer transition overflow-hidden">
                  {nidPreview ? (
                    <Image
                      src={nidPreview}
                      alt="NID Preview"
                      width={640}
                      height={192}
                      unoptimized
                      className="w-full h-48 object-contain p-2"
                    />
                  ) : (
                    <div className="text-center p-6">
                      <Camera className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                      <p className="text-sm font-medium text-slate-700">
                        {lang === "bn" ? "NID ছবি নির্বাচন করুন" : "Choose NID Photo"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        JPG, PNG or WEBP (Max 5MB)
                      </p>
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      if (file.size > 5 * 1024 * 1024) {
                        setAlert({
                          type: "error",
                          text: t(
                            "ছবির সাইজ অবশ্যই ৫ মেগাবাইটের কম হতে হবে।",
                            "Image must be smaller than 5MB."
                          ),
                        });
                        e.target.value = "";
                        return;
                      }

                      setNidPreview((previous) => {
                        if (previous) URL.revokeObjectURL(previous);
                        return URL.createObjectURL(file);
                      });
                      setNidFile(file);
                    }}
                  />
                </label>

                {nidFile && (
                  <p className="text-xs text-emerald-600 mt-2 truncate">
                    Selected: {nidFile.name}
                  </p>
                )}
              </div>

              {/* Selfie Photo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {lang === "bn" ? "আপনার সেলফি" : "Your Selfie"}
                </label>

                <label className="flex flex-col items-center justify-center w-full min-h-48 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-400 cursor-pointer transition overflow-hidden">
                  {selfiePreview ? (
                    <Image
                      src={selfiePreview}
                      alt="Selfie Preview"
                      width={640}
                      height={192}
                      unoptimized
                      className="w-full h-48 object-contain p-2"
                    />
                  ) : (
                    <div className="text-center p-6">
                      <Camera className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                      <p className="text-sm font-medium text-slate-700">
                        {lang === "bn" ? "সেলফি নির্বাচন করুন" : "Choose Selfie"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        JPG, PNG or WEBP (Max 5MB)
                      </p>
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      if (file.size > 5 * 1024 * 1024) {
                        setAlert({
                          type: "error",
                          text: t(
                            "ছবির সাইজ অবশ্যই ৫ মেগাবাইটের কম হতে হবে।",
                            "Image must be smaller than 5MB."
                          ),
                        });
                        e.target.value = "";
                        return;
                      }

                      setSelfiePreview((previous) => {
                        if (previous) URL.revokeObjectURL(previous);
                        return URL.createObjectURL(file);
                      });
                      setSelfieFile(file);
                    }}
                  />
                </label>

                {selfieFile && (
                  <p className="text-xs text-emerald-600 mt-2 truncate">
                    Selected: {selfieFile.name}
                  </p>
                )}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
              {t(
                "গোপনীয়তা সুরক্ষা: আপনার এনআইডি তথ্য শুধুমাত্র অ্যাডমিন যাচাইয়ের জন্য সংরক্ষিত থাকবে এবং কোনো ক্রেতার সাথে শেয়ার করা হবে না।",
                "Privacy Guarantee: Your NID details are visible only to platform admins for verification and are never shared with buyers."
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || !nidFile || !selfieFile}
                className="w-full sm:w-auto min-h-[44px] px-8 py-3 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] transition shadow-md shadow-emerald-600/20 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>
                      {lang === "bn"
                        ? "আপলোড ও জমা হচ্ছে..."
                        : "Uploading & Submitting..."}
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      {lang === "bn"
                        ? "যাচাইয়ের জন্য জমা দিন"
                        : "Submit for Verification"}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}