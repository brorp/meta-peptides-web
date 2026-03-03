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
  User,
} from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useRegisterUser } from "@/hooks/api/useRegisterUser";
import { useLoginUser } from "@/hooks/api/useLoginUser";
import { useGoogleLogin } from "@/hooks/api/useGoogleLogin";
import { useUserStore } from "@/store/useUserStore";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@/lib/supabase-client";

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
      createClientComponentClient().auth.onAuthStateChange((event, session) => {
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
    reset();
  };

  const handleGuestLogin = async () => {
    try {
      // Pemicu login anonim ke Supabase
      const { data, error } =
        await createClientComponentClient().auth.signInAnonymously();

      if (error) throw error;

      toast.success("Continuing as Guest", {
        description:
          "You can now browse products, proceed to checkout, and complete your payment.",
      });

      if (data.user && data.user.id) {
        setUser({
          ...data.user,
        });
      }

      router.push("/shop");
    } catch (error: any) {
      toast.error("Guest login failed", {
        description: error.message,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent/30 font-sans antialiased">
      <main className="relative flex items-center justify-center pt-32 pb-20 px-4 overflow-hidden">
        {/* --- Background Ornaments --- */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-accent/10 rounded-full blur-[120px] animate-pulse" />
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
              className="w-20 h-20 bg-foreground rounded-[2.2rem] flex items-center justify-center mb-6 shadow-2xl shadow-accent/20 border border-accent/30 relative"
            >
              <div className="absolute inset-0 rounded-[2.2rem] border-2 border-accent/50 animate-ping opacity-20" />
              <Fingerprint className="w-10 h-10 text-accent" />
            </motion.div>

            <h2 className="text-4xl lg:text-5xl font-black tracking-tighter uppercase italic leading-none">
              {isLogin ? "LOG IN." : "SIGN UP."}
              <span className="text-accent block text-[10px] not-italic tracking-[0.5em] mt-3 font-black">
                {isLogin
                  ? "INITIALIZING SECURE SESSION"
                  : "ENROLLING NEW STRAIN"}
              </span>
            </h2>
          </div>

          {/* --- Main Card --- */}
          <Card className="p-10 border border-accent/20 bg-card/80 backdrop-blur-xl shadow-[0_40px_80px_-15px_rgba(34,197,94,0.1)] rounded-[3.5rem] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-accent to-transparent" />

            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground ml-4">
                  Research Email
                </label>
                <div className="relative group">
                  <Mail
                    className={`absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${errors.email ? "text-red-500" : "text-muted-foreground group-focus-within:text-accent"}`}
                  />
                  <input
                    {...registerField("email")}
                    type="email"
                    placeholder="researcher@metapeptides.com"
                    className={`w-full pl-14 pr-6 py-4 bg-accent/[0.03] border-2 rounded-2xl outline-none transition-all font-bold text-sm shadow-inner ${errors.email ? "border-red-500/50 focus:border-red-500" : "border-border/50 focus:border-accent focus:bg-background"}`}
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
                      className="text-[10px] font-black text-foreground hover:text-accent transition-colors uppercase tracking-widest"
                    >
                      Forgot?
                    </Link>
                  )}
                </div>
                <div className="relative group">
                  <Lock
                    className={`absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${errors.password ? "text-red-500" : "text-muted-foreground group-focus-within:text-accent"}`}
                  />
                  <input
                    {...registerField("password")}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className={`w-full pl-14 pr-14 py-4 bg-accent/[0.03] border-2 rounded-2xl outline-none transition-all font-bold text-sm shadow-inner ${errors.password ? "border-red-500/50 focus:border-red-500" : "border-border/50 focus:border-accent focus:bg-background"}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent transition-all"
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
                        className={`absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${errors.confirmPassword ? "text-red-500" : "text-muted-foreground group-focus-within:text-accent"}`}
                      />
                      <input
                        {...registerField("confirmPassword")}
                        type={showPassword ? "text" : "password"}
                        placeholder="REPEAT KEY"
                        className={`w-full pl-14 pr-6 py-4 bg-accent/[0.03] border-2 rounded-2xl outline-none transition-all font-bold text-sm shadow-inner ${errors.confirmPassword ? "border-red-500/50 focus:border-red-500" : "border-border/50 focus:border-accent focus:bg-background"}`}
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
                className="w-full h-16 bg-accent hover:bg-accent text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-xl shadow-accent/20 transition-all active:scale-[0.97] mt-6 flex items-center justify-center gap-3 group/btn"
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
                className="w-full h-14 border-2 border-accent/20 bg-transparent hover:bg-accent/5 text-foreground rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3"
              >
                <Chrome className="w-4 h-4 text-accent" />
                Login With Google
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleGuestLogin}
                className="w-full h-14 bg-accent/5 hover:bg-accent/10 text-accent dark:text-accent rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 border border-accent/10"
              >
                <User className="w-4 h-4" />
                Continue as Guest
              </Button>
            </form>

            {/* Switch Mode */}
            <div className="mt-10 pt-8 border-t border-accent/10 text-center">
              <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest leading-relaxed">
                {isLogin ? "New to the facility?" : "Already verified?"}{" "}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-foreground font-black hover:text-accent transition-all ml-1 block mt-2 mx-auto border-b-2 border-accent/20 hover:border-accent"
                >
                  {isLogin ? "SIGN UP HERE" : "LOG IN HERE"}
                </button>
              </p>
            </div>
          </Card>

          {/* --- Technical Footer --- */}
          <div className="mt-12 text-center px-10">
            <div className="flex items-center justify-center gap-3 mb-4 opacity-50">
              <div className="h-px w-8 bg-accent/30" />
              <FlaskConical className="w-4 h-4 text-accent animate-bounce" />
              <div className="h-px w-8 bg-accent/30" />
            </div>
            <p className="text-[9px] text-muted-foreground leading-relaxed uppercase tracking-[0.3em] font-black italic">
              Encrypted Node:{" "}
              <span className="text-accent not-italic">GREEN-VAULT-256</span>
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
