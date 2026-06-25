"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { api as axios } from "@/lib/axios";

export default function LoginPanelPage() {
    const router = useRouter();
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) {
            toast.error("Please enter the access code");
            return;
        }

        setLoading(true);
        try {
            const { data } = await axios.post("/admin/auth/login", { code });
            if (data.success) {
                toast.success("Access granted");
                router.push(
                    data.data?.role === "admin"
                        ? "/panel-xyz123/orders"
                        : "/panel-xyz123",
                );
                router.refresh();
            } else {
                toast.error(data.message || "Access denied");
            }
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message || "Access denied",
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="dark">
            <div className="min-h-screen flex items-center justify-center bg-background px-4">
                <div className="w-full max-w-sm">
                    {/* Logo / Icon */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4">
                            <ShieldCheck className="w-8 h-8 text-accent" />
                        </div>
                        <h1 className="text-lg font-semibold text-foreground tracking-tight">
                            Secure Access
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Enter your access code to continue
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="password"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="Access Code"
                                autoFocus
                                disabled={loading}
                                className="w-full bg-card border border-border rounded-xl py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all disabled:opacity-50"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !code.trim()}
                            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-medium py-3 rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                "Enter"
                            )}
                        </button>
                    </form>

                    <p className="text-center text-xs text-muted-foreground/50 mt-8">
                        Authorized access only
                    </p>
                </div>
            </div>
        </div>
    );
}
