"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  FlaskConical,
  Fingerprint,
  Loader2,
  Chrome,
} from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useRegisterUser } from "@/hooks/api/useRegisterUser";
import { useLoginUser } from "@/hooks/api/useLoginUser";
import { useGoogleLogin } from "@/hooks/api/useGoogleLogin";
import { supabaseClient } from "@/lib/supabase-client";
import { useUserStore } from "@/store/useUserStore";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const authSchema = z.object({
  email: z.string().email("Invalid research email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().optional(),
});

type AuthFormData = z.infer<typeof authSchema>;

const getAuthSchema = (isLogin: boolean) => {
  const base = z.object({
    email: z.string().email("Invalid research email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
  });

  if (isLogin) return base;

  return base
    .extend({
      confirmPassword: z.string().min(1, "Please confirm your access key"),
    })
    .refine((data) => data.confirmPassword === data.password, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    });
};

export default function AuthPageComponent() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const setUser = useUserStore((state) => state.setUser);
  const clearUser = useUserStore((state) => state.clearUser);

  const { mutate: login, isPending: isLoadingLogin } = useLoginUser({
    onSuccess: () => {
      supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          setUser(session.user);
        } else {
          clearUser();
        }
      });

      toast.success("Login Successfully", {
        description: "Welcome back to the Metapeptides.",
      });

      router.push("/shop");
      router.refresh();
    },
  });
  const { mutate: register, isPending: isLoadingRegister } = useRegisterUser({
    onSuccess: () => {
      setIsLogin(true);
    },
  });

  const { handleGoogleLogin } = useGoogleLogin();

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AuthFormData>({
    resolver: zodResolver(getAuthSchema(isLogin)),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (data: AuthFormData) => {
    if (isLogin) {
      login({ email: data.email, password: data.password });
    } else {
      register(data);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    reset(); // Clear form when switching
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-green-500/30 font-sans antialiased">
      <main className="relative flex items-center justify-center pt-32 pb-20 px-4 overflow-hidden">
        {/* --- Background Ornaments --- */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-green-500/10 rounded-full blur-[120px] animate-pulse" />
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage:
                "linear-gradient(to right, #22c55e 1px, transparent 1px), linear-gradient(to bottom, #22c55e 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[440px] relative z-10"
        >
          {/* --- Branding Header --- */}
          <div className="flex flex-col items-center mb-10 text-center">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-20 h-20 bg-foreground rounded-[2.2rem] flex items-center justify-center mb-6 shadow-2xl shadow-green-500/20 border border-green-500/30 relative"
            >
              <div className="absolute inset-0 rounded-[2.2rem] border-2 border-green-500/50 animate-ping opacity-20" />
              <Fingerprint className="w-10 h-10 text-green-500" />
            </motion.div>

            <h2 className="text-4xl lg:text-5xl font-black tracking-tighter uppercase italic leading-none">
              {isLogin ? "LOG IN." : "SIGN UP."}
              <span className="text-green-600 dark:text-green-400 block text-[10px] not-italic tracking-[0.5em] mt-3 font-black">
                {isLogin
                  ? "INITIALIZING SECURE SESSION"
                  : "ENROLLING NEW STRAIN"}
              </span>
            </h2>
          </div>

          {/* --- Main Card --- */}
          <Card className="p-10 border border-green-500/20 bg-card/80 backdrop-blur-xl shadow-[0_40px_80px_-15px_rgba(34,197,94,0.1)] rounded-[3.5rem] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-green-500 to-transparent" />

            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground ml-4">
                  Research Email
                </label>
                <div className="relative group">
                  <Mail
                    className={`absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${errors.email ? "text-red-500" : "text-muted-foreground group-focus-within:text-green-500"}`}
                  />
                  <input
                    {...registerField("email")}
                    type="email"
                    placeholder="researcher@metapeptides.com"
                    className={`w-full pl-14 pr-6 py-4 bg-green-500/[0.03] border-2 rounded-2xl outline-none transition-all font-bold text-sm shadow-inner ${errors.email ? "border-red-500/50 focus:border-red-500" : "border-border/50 focus:border-green-500 focus:bg-background"}`}
                  />
                </div>
                {errors.email && (
                  <p className="text-[9px] font-black text-red-500 uppercase tracking-widest ml-4 mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
                    Password
                  </label>
                  {isLogin && (
                    <Link
                      href="#"
                      className="text-[10px] font-black text-foreground hover:text-green-500 transition-colors uppercase tracking-widest"
                    >
                      Forgot?
                    </Link>
                  )}
                </div>
                <div className="relative group">
                  <Lock
                    className={`absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${errors.password ? "text-red-500" : "text-muted-foreground group-focus-within:text-green-500"}`}
                  />
                  <input
                    {...registerField("password")}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className={`w-full pl-14 pr-14 py-4 bg-green-500/[0.03] border-2 rounded-2xl outline-none transition-all font-bold text-sm shadow-inner ${errors.password ? "border-red-500/50 focus:border-red-500" : "border-border/50 focus:border-green-500 focus:bg-background"}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-green-500 transition-all"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[9px] font-black text-red-500 uppercase tracking-widest ml-4 mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <AnimatePresence>
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <label className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground ml-4">
                      Verify Password
                    </label>
                    <div className="relative group">
                      <Fingerprint
                        className={`absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${errors.confirmPassword ? "text-red-500" : "text-muted-foreground group-focus-within:text-green-500"}`}
                      />
                      <input
                        {...registerField("confirmPassword")}
                        type={showPassword ? "text" : "password"}
                        placeholder="REPEAT KEY"
                        className={`w-full pl-14 pr-6 py-4 bg-green-500/[0.03] border-2 rounded-2xl outline-none transition-all font-bold text-sm shadow-inner ${errors.confirmPassword ? "border-red-500/50 focus:border-red-500" : "border-border/50 focus:border-green-500 focus:bg-background"}`}
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-[9px] font-black text-red-500 uppercase tracking-widest ml-4 mt-1">
                        {errors.confirmPassword.message}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <Button
                disabled={isLoadingRegister || isLoadingLogin}
                className="w-full h-16 bg-green-600 hover:bg-green-500 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-xl shadow-green-500/20 transition-all active:scale-[0.97] mt-6 flex items-center justify-center gap-3 group/btn"
              >
                {isLoadingRegister || isLoadingLogin ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {isLogin ? "LOGIN" : "REGISTER"}
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleLogin}
                className="w-full h-14 border-2 border-green-500/20 bg-transparent hover:bg-green-500/5 text-foreground rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3"
              >
                <Chrome className="w-4 h-4 text-green-500" />
                Login With Google
              </Button>
            </form>

            {/* Switch Mode */}
            <div className="mt-10 pt-8 border-t border-green-500/10 text-center">
              <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest leading-relaxed">
                {isLogin ? "New to the facility?" : "Already verified?"}{" "}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-foreground font-black hover:text-green-500 transition-all ml-1 block mt-2 mx-auto border-b-2 border-green-500/20 hover:border-green-500"
                >
                  {isLogin ? "SIGN UP HERE" : "LOG IN HERE"}
                </button>
              </p>
            </div>
          </Card>

          {/* --- Technical Footer --- */}
          <div className="mt-12 text-center px-10">
            <div className="flex items-center justify-center gap-3 mb-4 opacity-50">
              <div className="h-px w-8 bg-green-500/30" />
              <FlaskConical className="w-4 h-4 text-green-500 animate-bounce" />
              <div className="h-px w-8 bg-green-500/30" />
            </div>
            <p className="text-[9px] text-muted-foreground leading-relaxed uppercase tracking-[0.3em] font-black italic">
              Encrypted Node:{" "}
              <span className="text-green-600 not-italic">GREEN-VAULT-256</span>
              <br />
              <span className="opacity-40">
                Auth-Protocol: Bio-Metric Verified
              </span>
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
