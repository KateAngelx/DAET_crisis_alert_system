"use client";

import React, { useState } from "react";
import { useAuthStore } from "@/app/store/crisisStore";
import { useRouter } from "next/navigation";
import { Card } from "@/app/components/ui/Card";
import { UserPlus, CheckCircle, ArrowRight, User, Mail, Phone, Globe, Lock, Loader2 } from "lucide-react";
import Link from "next/link";
import { typography, iconSize } from "@/lib/designSystem";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    nationality: "Filipino",
  });

  const [isRegistered, setIsRegistered] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [regError, setRegError] = useState(null);

  const { register, loading } = useAuthStore();
  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError(null);

    if (!formData.name || !formData.email || !formData.password || !formData.phone) {
      setRegError("Please fill in all required fields.");
      return;
    }

    const result = await register(
      formData.name,
      formData.email,
      formData.password,
      formData.phone,
      formData.nationality
    );

    if (result.success) {
      setNeedsConfirmation(!!result.needsConfirmation);
      setIsRegistered(true);
    } else {
      setRegError(result.error);
    }
  };

  if (isRegistered) {
    return (
      <Card className="max-w-md w-full p-6 sm:p-8 lg:p-10 text-center animate-in zoom-in-95 duration-300 shadow-2xl border-none bg-white rounded-[32px]">
        <div className="bg-green-100 size-16 sm:size-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={iconSize.empty} className="text-green-600" />
        </div>
        <p className={`${typography.statLabel} tracking-[0.25em] text-green-600 mb-2`}>Registration Complete</p>
        <h1 className={`${typography.heroTitle} mb-2`}>
          Welcome, {formData.name.split(" ")[0]}!
        </h1>
        <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
          {needsConfirmation
            ? "Please check your email to confirm your account, then sign in. Your profile will be created automatically on first login."
            : "Your account is ready. You can now receive emergency alerts and submit incident reports through CONNECT-DAET."}
        </p>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg"
        >
          Sign In Now <ArrowRight size={18} />
        </button>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg w-full p-6 sm:p-8 lg:p-10 border-none shadow-2xl bg-white rounded-[32px]">
      <div className="text-center mb-8 sm:mb-10">
        <div className="bg-zinc-950 size-12 sm:size-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
          <UserPlus size={iconSize.auth} className="text-white" />
        </div>
        <p className={`${typography.statLabel} tracking-[0.25em] text-zinc-500 mb-2`}>Tourist Registration</p>
        <h1 className={typography.heroTitle}>Create Account</h1>
        <p className={`${typography.description} mt-2`}>
          Register as a tourist to receive emergency alerts and report incidents in Daet.
        </p>
      </div>

      {regError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold flex items-center gap-2">
          {regError}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="register-name" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 ml-1">
            <User size={12} /> Full Name
          </label>
          <input
            id="register-name"
            required
            autoComplete="name"
            disabled={loading}
            placeholder="Juan Dela Cruz"
            className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 transition-all disabled:opacity-50"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="register-email" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 ml-1">
            <Mail size={12} /> Email Address
          </label>
          <input
            id="register-email"
            type="email"
            required
            autoComplete="email"
            disabled={loading}
            placeholder="you@example.com"
            className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 transition-all disabled:opacity-50"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="register-password" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 ml-1">
            <Lock size={12} /> Password
          </label>
          <input
            id="register-password"
            type="password"
            required
            autoComplete="new-password"
            disabled={loading}
            placeholder="Create a secure password"
            className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 transition-all disabled:opacity-50"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="register-phone" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 ml-1">
              <Phone size={12} /> Phone Number
            </label>
            <input
              id="register-phone"
              type="tel"
              required
              autoComplete="tel"
              disabled={loading}
              placeholder="09123456789"
              className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 transition-all disabled:opacity-50"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="register-nationality" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2 ml-1">
              <Globe size={12} /> Nationality
            </label>
            <select
              id="register-nationality"
              required
              disabled={loading}
              className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 appearance-none disabled:opacity-50"
              value={formData.nationality}
              onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
            >
              <option value="Filipino">Filipino</option>
              <option value="Foreigner">Foreigner</option>
            </select>
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-zinc-950 text-white rounded-[24px] font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </div>
      </form>

      <div className="mt-8 pt-6 border-t border-zinc-100 text-center">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
          Already have an account?
          <Link href="/login" className="ml-2 text-blue-600 hover:underline font-black">
            Sign In
          </Link>
        </p>
      </div>
    </Card>
  );
}
