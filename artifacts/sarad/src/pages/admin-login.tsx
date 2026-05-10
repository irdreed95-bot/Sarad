import { useState } from "react";
import { useLocation } from "wouter";
import { setAdminToken, generateClientToken } from "@/lib/auth";
import { useLang } from "@/lib/language";
import { Eye, EyeOff, Lock, Shield } from "lucide-react";

// Hardcoded admin credentials
const ADMIN_EMAIL = "syckbocckv@gmail.com";
const ADMIN_PASSWORD = "DREED12345FNR";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();
  const { t } = useLang();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Client-side credential check (primary — no network required)
    if (email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD) {
      const token = generateClientToken(email.trim().toLowerCase());
      setAdminToken(token);
      navigate("/admin/dashboard");
      return;
    }

    // API fallback
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setAdminToken(data.token);
        navigate("/admin/dashboard");
      } else {
        setError(t("بيانات الدخول غير صحيحة", "Invalid credentials"));
      }
    } catch {
      setError(t("بيانات الدخول غير صحيحة", "Invalid credentials"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-1">
            <span className="text-primary">سرّاد</span>
            <span className="text-white/40 mx-2">|</span>
            <span className="text-white">Sarad</span>
          </h1>
          <p className="text-white/40 text-sm mt-2">{t("لوحة تحكم المسؤول", "Admin Control Panel")}</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-950 border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mx-auto mb-6">
            <Shield size={24} className="text-primary" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">
                {t("البريد الإلكتروني", "Email")}
              </label>
              <input
                data-testid="input-admin-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                autoComplete="username"
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-primary/60 focus:bg-zinc-900/80 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">
                {t("كلمة المرور", "Password")}
              </label>
              <div className="relative">
                <input
                  data-testid="input-admin-password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-primary/60 transition-all text-sm pr-12"
                />
                <button
                  type="button"
                  data-testid="button-toggle-password"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p data-testid="text-login-error" className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg py-2 px-3">
                {error}
              </p>
            )}

            <button
              data-testid="button-admin-login"
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-black py-3.5 rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50 mt-2 shadow-[0_0_20px_rgba(212,175,55,0.3)] text-sm tracking-wide"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                  {t("جاري الدخول...", "Signing in...")}
                </span>
              ) : (
                t("دخول", "Sign In")
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          {t("الوصول مقيد للمسؤولين فقط", "Access restricted to administrators only")}
        </p>
      </div>
    </div>
  );
}
