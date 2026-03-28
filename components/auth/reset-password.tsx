"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Fingerprint,
  Loader2,
  Lock,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClientComponentClient } from "@/lib/supabase-client";
import { useUserStore } from "@/store/useUserStore";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
type ResetStatus = "checking" | "ready" | "success" | "invalid";

export default function ResetPasswordPageComponent() {
  const router = useRouter();
  const clearUser = useUserStore((state) => state.clearUser);
  const [supabase, setSupabase] = useState<ReturnType<
    typeof createClientComponentClient
  > | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<ResetStatus>("checking");
  const [statusMessage, setStatusMessage] = useState(
    "Verifying your secure recovery session...",
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    setSupabase(createClientComponentClient());
  }, []);

  useEffect(() => {
    if (!supabase) return;

    let isMounted = true;
    let attempts = 0;
    let retryTimer: number | null = null;

    const markInvalid = (message: string) => {
      if (!isMounted) return;
      setStatus("invalid");
      setStatusMessage(message);
    };

    const markReady = () => {
      if (!isMounted) return;
      setStatus("ready");
      setStatusMessage("");
    };

    const resolveRecoverySession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (error) {
        markInvalid(
          "This password reset link is invalid or has expired. Please request a new one.",
        );
        return;
      }

      if (data.session) {
        markReady();
        return;
      }

      const hasRecoveryHash =
        window.location.hash.includes("access_token=") ||
        window.location.hash.includes("type=recovery");

      if (hasRecoveryHash && attempts < 4) {
        attempts += 1;
        retryTimer = window.setTimeout(resolveRecoverySession, 400);
        return;
      }

      markInvalid(
        "This password reset link is no longer active. Request a fresh reset email to continue.",
      );
    };

    retryTimer = window.setTimeout(resolveRecoverySession, 150);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        markReady();
      }
    });

    return () => {
      isMounted = false;
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
      subscription.unsubscribe();
    };
  }, [supabase]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!supabase) return;

    const { error } = await supabase.auth.updateUser({
      password: data.password,
    });

    if (error) {
      toast.error("Password Update Failed", {
        description:
          error.message || "We could not update your password right now.",
      });
      return;
    }

    await supabase.auth.signOut();
    clearUser();
    reset();
    setStatus("success");
    toast.success("Password Updated", {
      description:
        "Your password has been updated. Log in with your new password.",
    });
  };

  const renderBody = () => {
    if (status === "checking") {
      return (
        <div className="space-y-5 text-center">
          <div className="w-16 h-16 rounded-full bg-accent/10 text-accent mx-auto flex items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black uppercase tracking-tight">
              Checking Recovery Link
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {statusMessage}
            </p>
          </div>
        </div>
      );
    }

    if (status === "invalid") {
      return (
        <div className="space-y-6 text-center">
          <div className="space-y-2">
            <h3 className="text-xl font-black uppercase tracking-tight">
              Reset Link Unavailable
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {statusMessage}
            </p>
          </div>
          <Link href="/auth" className="block">
            <Button className="w-full h-14 bg-accent hover:bg-accent text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.35em]">
              Request New Reset Link
            </Button>
          </Link>
        </div>
      );
    }

    if (status === "success") {
      return (
        <div className="space-y-6 text-center">
          <div className="space-y-2">
            <h3 className="text-xl font-black uppercase tracking-tight">
              Password Updated
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your password has been changed successfully. Continue to login and
              use your new password.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              router.push("/auth");
              router.refresh();
            }}
            className="w-full h-14 bg-accent hover:bg-accent text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.35em] flex items-center justify-center gap-3"
          >
            Return To Login
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      );
    }

    return (
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-accent/5 p-5 rounded-3xl border border-accent/10">
          <p className="text-[11px] font-bold text-muted-foreground leading-relaxed tracking-tight">
            Choose a new password for your account. Once saved, you will log in
            with this new password from now on.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground ml-4">
            New Password
          </label>
          <div className="relative group">
            <Lock
              className={`absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 ${errors.password ? "text-red-500" : "text-muted-foreground group-focus-within:text-accent"}`}
            />
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className={`w-full pl-14 pr-14 py-4 bg-accent/[0.03] border-2 rounded-2xl outline-none font-bold text-sm ${errors.password ? "border-red-500/50" : "border-border/50 focus:border-accent"}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
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

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground ml-4">
            Confirm Password
          </label>
          <div className="relative group">
            <Lock
              className={`absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 ${errors.confirmPassword ? "text-red-500" : "text-muted-foreground group-focus-within:text-accent"}`}
            />
            <input
              {...register("confirmPassword")}
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className={`w-full pl-14 pr-6 py-4 bg-accent/[0.03] border-2 rounded-2xl outline-none font-bold text-sm ${errors.confirmPassword ? "border-red-500/50" : "border-border/50 focus:border-accent"}`}
            />
          </div>
        </div>

        <Button
          disabled={isSubmitting}
          className="w-full h-16 bg-accent hover:bg-accent text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-xl shadow-accent/20 transition-all active:scale-[0.97] flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Save New Password
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </form>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent/30 font-sans antialiased">
      <main className="relative flex items-center justify-center pt-32 pb-20 px-4 overflow-hidden">
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
              RESET PASSWORD.
              <span className="text-accent block text-[10px] not-italic tracking-[0.5em] mt-3 font-black uppercase">
                SECURE ACCOUNT RECOVERY
              </span>
            </h2>
          </div>

          <Card className="p-10 border border-accent/20 bg-card/80 backdrop-blur-xl shadow-2xl rounded-[3.5rem] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-accent to-transparent" />
            {renderBody()}
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
