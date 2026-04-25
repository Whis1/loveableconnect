import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Mail, Lock, User as UserIcon, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const HERO_BG = "https://images.unsplash.com/photo-1599148400620-8e1ff0bf28d8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA0MTJ8MHwxfHNlYXJjaHw0fHxuaWdodCUyMHNreSUyMHN0YXJzfGVufDB8fHx8MTc3NzEwNDY3Nnww&ixlib=rb-4.1.0&q=85";

export default function AuthLanding() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(loginForm.email, loginForm.password);
      toast.success("Bentornato tra le stelle ✦");
      navigate("/bacheca");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Accesso fallito");
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await register(registerForm.email, registerForm.password, registerForm.name);
      toast.success("Benvenuto nella magia ✦");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Registrazione fallita");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-16">
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(4,7,16,0.55) 0%, rgba(4,7,16,0.92) 100%), url('${HERO_BG}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-hidden="true"
      />

      <div className="grid lg:grid-cols-2 gap-12 max-w-6xl w-full items-center">
        {/* Hero copy */}
        <div className="space-y-8">
          <span className="inline-flex items-center gap-2 text-overline text-[#E6C998]" data-testid="landing-overline">
            <Sparkles className="h-3.5 w-3.5" />
            Sito di incontri
          </span>
          <h1 className="font-[Cormorant_Garamond] text-5xl sm:text-6xl lg:text-7xl leading-[1.05] text-[#F0F3F5]">
            Quando due anime <em className="text-[#E6C998] not-italic font-medium">si trovano</em> sotto le stelle.
          </h1>
          <p className="text-base sm:text-lg text-[#8F9CAE] max-w-lg leading-relaxed">
            Stelle è il rifugio dove il caso diventa destino. Crea il tuo profilo, esplora la bacheca celeste e
            lascia che le connessioni accadano — semplicemente, magicamente.
          </p>
          <div className="flex items-center gap-6 pt-2">
            {[
              { n: "1", t: "Iscriviti" },
              { n: "2", t: "Esplora la bacheca" },
              { n: "3", t: "Trova il tuo match" },
            ].map((s) => (
              <div key={s.n} className="flex items-center gap-2 text-sm text-[#8F9CAE]">
                <span className="h-7 w-7 grid place-items-center rounded-full border border-[#E6C998]/40 text-[#E6C998] font-medium">
                  {s.n}
                </span>
                {s.t}
              </div>
            ))}
          </div>
        </div>

        {/* Auth Card */}
        <div className="glass-strong rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/40" data-testid="auth-card">
          <div className="mb-6">
            <h2 className="font-[Cormorant_Garamond] text-3xl text-[#F0F3F5]">Accedi alla magia</h2>
            <p className="text-sm text-[#8F9CAE] mt-1">Entra nel cosmo degli incontri</p>
          </div>

          <Button
            onClick={handleGoogleLogin}
            data-testid="google-login-btn"
            className="w-full h-12 rounded-full bg-white text-[#040710] hover:bg-white/90 font-medium gap-3 transition-all duration-300 hover:-translate-y-0.5"
          >
            <svg className="h-5 w-5" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.5-5.9 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.6 8.4 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3c-2 1.4-4.6 2.3-7.4 2.3-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.5 39.5 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.4l6.3 5.3C41.6 35 44 30 44 24c0-1.3-.1-2.4-.4-3.5z"/>
            </svg>
            Continua con Google
          </Button>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-overline text-[#8F9CAE]">oppure</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid grid-cols-2 w-full bg-[#162032]/60 rounded-full p-1 h-11">
              <TabsTrigger value="login" data-testid="tab-login" className="rounded-full data-[state=active]:bg-[#E6C998] data-[state=active]:text-[#040710]">
                Accedi
              </TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register" className="rounded-full data-[state=active]:bg-[#E6C998] data-[state=active]:text-[#040710]">
                Registrati
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin} className="space-y-4" data-testid="login-form">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email" className="text-xs text-[#8F9CAE] uppercase tracking-wider">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8F9CAE]" />
                    <Input
                      id="login-email"
                      type="email"
                      required
                      data-testid="login-email-input"
                      placeholder="tu@esempio.it"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      className="pl-10 h-11 bg-[#162032]/50 border-[#233045] text-[#F0F3F5] placeholder:text-[#475B7A] rounded-xl focus-visible:ring-1 focus-visible:ring-[#E6C998]"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password" className="text-xs text-[#8F9CAE] uppercase tracking-wider">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8F9CAE]" />
                    <Input
                      id="login-password"
                      type="password"
                      required
                      data-testid="login-password-input"
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="pl-10 h-11 bg-[#162032]/50 border-[#233045] text-[#F0F3F5] placeholder:text-[#475B7A] rounded-xl focus-visible:ring-1 focus-visible:ring-[#E6C998]"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={busy}
                  data-testid="login-submit-btn"
                  className="w-full h-11 rounded-full bg-[#E6C998] text-[#040710] hover:bg-[#E6C998]/90 font-medium gap-2 transition-all duration-300 hover:-translate-y-0.5 gold-glow"
                >
                  Entra <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-6">
              <form onSubmit={handleRegister} className="space-y-4" data-testid="register-form">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#8F9CAE] uppercase tracking-wider">Nome</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8F9CAE]" />
                    <Input
                      required
                      data-testid="register-name-input"
                      placeholder="Il tuo nome"
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                      className="pl-10 h-11 bg-[#162032]/50 border-[#233045] text-[#F0F3F5] placeholder:text-[#475B7A] rounded-xl focus-visible:ring-1 focus-visible:ring-[#E6C998]"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#8F9CAE] uppercase tracking-wider">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8F9CAE]" />
                    <Input
                      type="email"
                      required
                      data-testid="register-email-input"
                      placeholder="tu@esempio.it"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      className="pl-10 h-11 bg-[#162032]/50 border-[#233045] text-[#F0F3F5] placeholder:text-[#475B7A] rounded-xl focus-visible:ring-1 focus-visible:ring-[#E6C998]"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#8F9CAE] uppercase tracking-wider">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8F9CAE]" />
                    <Input
                      type="password"
                      required
                      minLength={6}
                      data-testid="register-password-input"
                      placeholder="Almeno 6 caratteri"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      className="pl-10 h-11 bg-[#162032]/50 border-[#233045] text-[#F0F3F5] placeholder:text-[#475B7A] rounded-xl focus-visible:ring-1 focus-visible:ring-[#E6C998]"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={busy}
                  data-testid="register-submit-btn"
                  className="w-full h-11 rounded-full bg-[#E6C998] text-[#040710] hover:bg-[#E6C998]/90 font-medium gap-2 transition-all duration-300 hover:-translate-y-0.5 gold-glow"
                >
                  Crea il tuo cosmo <Sparkles className="h-4 w-4" />
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
