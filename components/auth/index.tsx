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
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useRegisterUser } from "@/hooks/api/useRegisterUser";
import { useLoginUser } from "@/hooks/api/useLoginUser";
import { useGoogleLogin } from "@/hooks/api/useGoogleLogin";
import { useForgotPassword } from "@/hooks/api/useForgotPassword";
import { useUserStore } from "@/store/useUserStore";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@/lib/supabase-client";

type AuthMode = "login" | "register" | "forgot";

type AuthFormData = {
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

const getAuthSchema = (mode: AuthMode) => {
  const email = z.string().email("Invalid research email address");

  if (mode === "forgot") {
    return z.object({
      email,
      password: z.string().optional(),
      confirmPassword: z.string().optional(),
      acceptTerms: z.boolean().optional(),
    });
  }

  if (mode === "login") {
    return z.object({
      email,
      password: z.string().min(8, "Password must be at least 8 characters"),
      confirmPassword: z.string().optional(),
      acceptTerms: z.boolean().optional(),
    });
  }

  return z
    .object({
      email,
      password: z.string().min(8, "Password must be at least 8 characters"),
      confirmPassword: z.string().min(1, "Please confirm your access key"),
      acceptTerms: z.literal(true, {
        errorMap: () => ({ message: "You must accept the terms to proceed" }),
      }),
    })
    .refine((data) => data.confirmPassword === data.password, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    });
};

export default function AuthPageComponent() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [sentResetEmail, setSentResetEmail] = useState<string | null>(null);
  const setUser = useUserStore((state) => state.setUser);
  const clearUser = useUserStore((state) => state.clearUser);
  const isLogin = mode === "login";
  const isRegister = mode === "register";
  const isForgot = mode === "forgot";

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
        description: "Welcome back to Metapeptides.",
      });
      router.push("/shop");
      router.refresh();
    },
  });

  const { mutate: register, isPending: isLoadingRegister } = useRegisterUser({
    onSuccess: () => {
      switchMode("login");
    },
  });

  const { mutate: requestPasswordReset, isPending: isLoadingForgotPassword } =
    useForgotPassword({
      onSuccess: (data, variables) => {
        setSentResetEmail(data.data?.email || variables.email);
      },
    });

  const { handleGoogleLogin } = useGoogleLogin();

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<AuthFormData>({
    resolver: zodResolver(getAuthSchema(mode)),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  // Watch status checkbox untuk kontrol button
  const isTermsAccepted = watch("acceptTerms");

  const onSubmit = (data: AuthFormData) => {
    if (isForgot) {
      requestPasswordReset({ email: data.email });
      return;
    }

    if (isLogin) {
      login({ email: data.email, password: data.password });
    } else {
      register(data);
    }
  };

  const switchMode = (nextMode: AuthMode) => {
    const currentEmail = watch("email");
    setMode(nextMode);
    setShowPassword(false);
    setSentResetEmail(null);
    reset({
      email: currentEmail || "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    });
  };

  const handleGuestLogin = async () => {
    try {
      const { data, error } =
        await createClientComponentClient().auth.signInAnonymously();
      if (error) throw error;
      toast.success("Continuing as Guest", {
        description: "You can now browse products and proceed to checkout.",
      });
      if (data.user) setUser(data.user);
      router.push("/shop");
    } catch (error: any) {
      toast.error("Guest login failed", { description: error.message });
    }
  };

  const isLoading =
    isLoadingRegister || isLoadingLogin || isLoadingForgotPassword;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent/30 font-sans antialiased">
      <main className="relative flex items-center justify-center pt-32 pb-20 px-4 overflow-hidden">
        {/* --- Background --- */}
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
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="w-20 h-20 bg-foreground rounded-[2.2rem] flex items-center justify-center mb-6 shadow-2xl relative">
              <Fingerprint className="w-10 h-10 text-accent" />
            </div>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tighter uppercase italic leading-none">
              {isLogin
                ? "LOG IN."
                : isForgot
                  ? "RESET PASSWORD."
                  : "SIGN UP."}
              <span className="text-accent block text-[10px] not-italic tracking-[0.5em] mt-3 font-black uppercase">
                {isLogin
                  ? "INITIALIZING SECURE SESSION"
                  : isForgot
                    ? "ISSUING SECURE RECOVERY LINK"
                  : "ENROLLING NEW STRAIN"}
              </span>
            </h2>
          </div>

          <Card className="p-10 border border-accent/20 bg-card/80 backdrop-blur-xl shadow-2xl rounded-[3.5rem] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-accent to-transparent" />

            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {/* Email & Password Fields (Sama seperti sebelumnya) */}
              {isForgot && (
                <div className="bg-accent/5 p-5 rounded-3xl border border-accent/10">
                  <p className="text-[11px] font-bold text-muted-foreground leading-relaxed tracking-tight">
                    Enter the email connected to your registered account. We
                    will send a secure password reset link with clear
                    instructions.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground ml-4">
                  Research Email
                </label>
                <div className="relative group">
                  <Mail
                    className={`absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 ${errors.email ? "text-red-500" : "text-muted-foreground group-focus-within:text-accent"}`}
                  />
                  <input
                    {...registerField("email")}
                    type="email"
                    placeholder="researcher@metapeptides.com"
                    className={`w-full pl-14 pr-6 py-4 bg-accent/[0.03] border-2 rounded-2xl outline-none font-bold text-sm ${errors.email ? "border-red-500/50" : "border-border/50 focus:border-accent"}`}
                  />
                </div>
              </div>

              {!isForgot && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
                      Password
                    </label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => switchMode("forgot")}
                        className="text-[10px] font-black uppercase tracking-[0.2em] text-accent hover:text-foreground transition-colors"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative group">
                    <Lock
                      className={`absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 ${errors.password ? "text-red-500" : "text-muted-foreground group-focus-within:text-accent"}`}
                    />
                    <input
                      {...registerField("password")}
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className={`w-full pl-14 pr-14 py-4 bg-accent/[0.03] border-2 rounded-2xl outline-none font-bold text-sm ${errors.password ? "border-red-500/50" : "border-border/50 focus:border-accent"}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <AnimatePresence>
                {isRegister && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-6 overflow-hidden"
                  >
                    {/* Confirm Password */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground ml-4">
                        Verify Password
                      </label>
                      <div className="relative group">
                        <Fingerprint
                          className={`absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 ${errors?.confirmPassword ? "text-red-500" : "text-muted-foreground group-focus-within:text-accent"}`}
                        />
                        <input
                          {...registerField("confirmPassword")}
                          type={showPassword ? "text" : "password"}
                          placeholder="REPEAT KEY"
                          className={`w-full pl-14 pr-6 py-4 bg-accent/[0.03] border-2 rounded-2xl outline-none font-bold text-sm ${errors.confirmPassword ? "border-red-500/50" : "border-border/50 focus:border-accent"}`}
                        />
                      </div>
                    </div>

                    {/* --- TNC CHECKBOX SECTION --- */}
                    <div className="bg-accent/5 p-5 rounded-3xl border border-accent/10 space-y-4">
                      <label className="flex items-start gap-4 cursor-pointer group/check">
                        <div className="relative mt-1">
                          <input
                            type="checkbox"
                            {...registerField("acceptTerms")}
                            className="peer sr-only"
                          />
                          <div className="w-6 h-6 border-2 border-accent/30 rounded-lg bg-background peer-checked:bg-accent peer-checked:border-accent transition-all flex items-center justify-center shadow-sm">
                            <CheckCircle2 className="w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        <p className="text-[11px] font-bold text-muted-foreground leading-relaxed group-hover/check:text-foreground transition-colors tracking-tight">
                          I confirm that I am at least 18 years old and have
                          read, understood, and agreed to the{" "}
                          <Link
                            href="/tnc"
                            className="text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
                          >
                            Terms & Conditions
                          </Link>
                          , including product use limitations and no-refund
                          policy.
                        </p>
                      </label>
                      {errors.acceptTerms && (
                        <p className="text-[9px] font-black text-red-500 uppercase tracking-widest ml-10">
                          {errors.acceptTerms.message as string}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {isForgot && sentResetEmail && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700">
                    Reset Link Sent
                  </p>
                  <p className="text-[11px] font-bold text-emerald-900 leading-relaxed tracking-tight">
                    We sent a secure password reset link to{" "}
                    <span className="underline decoration-emerald-300">
                      {sentResetEmail}
                    </span>
                    . Open the newest email, click the reset button, and choose
                    your new password on the secure page.
                  </p>
                </div>
              )}

              {/* Submit Button - Disabled logic updated */}
              <Button
                disabled={
                  isLoading || (isRegister && !isTermsAccepted)
                }
                className="w-full h-16 bg-accent hover:bg-accent text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-xl shadow-accent/20 transition-all active:scale-[0.97] mt-6 flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed group/btn"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {isForgot
                      ? sentResetEmail
                        ? "SEND AGAIN"
                        : "SEND RESET LINK"
                      : isLogin
                        ? "LOGIN"
                        : "REGISTER"}
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>

              {!isForgot && (
                <div className="grid grid-cols-1 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleLogin}
                    className="w-full h-14 border-2 border-accent/20 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3"
                  >
                    <Chrome className="w-4 h-4 text-accent" /> Login With Google
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleGuestLogin}
                    className="w-full h-14 bg-accent/5 text-accent rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 border border-accent/10"
                  >
                    <User className="w-4 h-4" /> Continue as Guest
                  </Button>
                </div>
              )}
            </form>

            <div className="mt-10 pt-8 border-t border-accent/10 text-center">
              <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest leading-relaxed">
                {isLogin
                  ? "New to the facility?"
                  : isForgot
                    ? "Remembered your password?"
                    : "Already verified?"}{" "}
                <button
                  type="button"
                  onClick={() =>
                    switchMode(isLogin ? "register" : "login")
                  }
                  className="text-foreground font-black hover:text-accent ml-1 block mt-2 mx-auto border-b-2 border-accent/20"
                >
                  {isLogin ? "SIGN UP HERE" : "LOG IN HERE"}
                </button>
              </p>
            </div>
          </Card>
          {/* Footer content... */}
        </motion.div>
      </main>
    </div>
  );
}
