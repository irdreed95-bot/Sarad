import { useState } from "react";
import { useLocation } from "wouter";
import { useAdminLogin } from "@workspace/api-client-react";
import { setAdminToken } from "@/lib/auth";
import { useLang } from "@/lib/language";
import { Eye, EyeOff, Lock } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [, navigate] = useLocation();
  const { t } = useLang();

  const loginMutation = useAdminLogin({
    mutation: {
      onSuccess: (data) => {
        if (data.isAdmin && data.token) {
          setAdminToken(data.token);
          navigate("/admin/dashboard");
        }
      },
      onError: () => {
        setError(t("بيانات الدخول غير صحيحة", "Invalid credentials"));
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ data: { email, password } });
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
          <p className="text-white/40 text-sm mt-2">{t("لوحة التحكم", "Admin Panel")}</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-950 border border-white/10 rounded-2xl p-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/20 mx-auto mb-6">
            <Lock size={20} className="text-primary" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/60 text-xs font-medium mb-2">
                {t("البريد الإلكتروني", "Email")}
              </label>
              <input
                data-testid="input-admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-white/60 text-xs font-medium mb-2">
                {t("كلمة المرور", "Password")}
              </label>
              <div className="relative">
                <input
                  data-testid="input-admin-password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors text-sm pr-12"
                />
                <button
                  type="button"
                  data-testid="button-toggle-password"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p data-testid="text-login-error" className="text-destructive text-sm text-center">{error}</p>
            )}

            <button
              data-testid="button-admin-login"
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 mt-2"
            >
              {loginMutation.isPending ? t("جاري الدخول...", "Signing in...") : t("دخول", "Sign In")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
