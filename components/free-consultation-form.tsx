"use client";

import Image from "next/image";
import {
  ArrowRight,
  Dumbbell,
  HeartPulse,
  MessageCircle,
  Moon,
  Flame,
  ShieldCheck,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";

const WHATSAPP_NUMBER = "6285191378473";

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

type GoalCard = {
  title: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
};

const GOALS: GoalCard[] = [
  {
    title: "Weight Loss",
    eyebrow: "Body composition",
    description: "For guidance around body recomposition and wellness planning.",
    icon: Flame,
  },
  {
    title: "Energy & Recovery",
    eyebrow: "Daily performance",
    description: "For routines focused on stamina, recovery, and consistency.",
    icon: Zap,
  },
  {
    title: "Anti-Aging Support",
    eyebrow: "Longevity goals",
    description: "For age-management, vitality, and long-term wellness questions.",
    icon: Sparkles,
  },
  {
    title: "Skin & Hair",
    eyebrow: "Appearance support",
    description: "For consultation around skin quality, hair support, and glow goals.",
    icon: HeartPulse,
  },
  {
    title: "Muscle & Strength",
    eyebrow: "Training support",
    description: "For strength, lean mass, and training-adjacent wellness goals.",
    icon: Dumbbell,
  },
  {
    title: "Sleep & Stress",
    eyebrow: "Balance protocol",
    description: "For recovery rhythm, rest quality, and stress-management support.",
    icon: Moon,
  },
  {
    title: "Not Sure Yet",
    eyebrow: "Help me choose",
    description: "For a quick recommendation when you are unsure where to start.",
    icon: MessageCircle,
  },
];

function trackGoalClick(goal: string) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") {
    return;
  }

  window.fbq("track", "Lead", {
    content_name: "Free Consultation Goal",
    content_category: "Consultation",
    goal,
  });
}

function getWhatsAppUrl(goal: string) {
  const message = [
    "Halo Kak MetaPeptides, saya mau free consultation.",
    "",
    `Goal saya: ${goal}`,
    "Saya ingin dibantu pilih guidance yang paling sesuai.",
    "",
    "Mohon dibantu ya, thank you.",
  ].join("\n");

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function FreeConsultationForm() {
  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 opacity-[0.035] [background-image:radial-gradient(#414042_1px,transparent_1px)] [background-size:22px_22px]" />
      <div className="pointer-events-none fixed -left-24 top-16 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none fixed -right-20 bottom-10 h-80 w-80 rounded-full bg-[#414042]/10 blur-3xl" />

      <main className="relative mx-auto max-w-6xl px-5 py-5 md:px-8 md:py-8">
        <section className="overflow-hidden rounded-[2.25rem] border border-border bg-card shadow-[0_30px_90px_rgba(65,64,66,0.12)]">
          <div className="relative grid gap-0 lg:grid-cols-[0.9fr_1.35fr]">
            <div className="relative overflow-hidden bg-[#414042] p-7 text-white md:p-10">
              <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.26),transparent_24%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.14),transparent_26%),linear-gradient(145deg,rgba(255,255,255,0.14),transparent_45%)]" />
              <div className="relative">
                <div className="mb-9 flex items-center gap-3">
                  <div className="rounded-2xl bg-white p-2">
                    <Image
                      src="/logo.webp"
                      alt="MetaPeptides"
                      width={58}
                      height={58}
                      className="h-11 w-auto object-contain"
                      priority
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.34em] text-white/55">
                      MetaWellness
                    </p>
                    <p className="text-xs font-bold text-white/60">
                      Free Personal Consultation
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 md:p-8 lg:p-10">
              <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-accent">
                    Choose your goal,
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground md:text-3xl">
                    What do you want to improve?
                  </h2>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {GOALS.map((goal, index) => {
                  const Icon = goal.icon;

                  return (
                    <a
                      key={goal.title}
                      href={getWhatsAppUrl(goal.title)}
                      onClick={() => trackGoalClick(goal.title)}
                      className="group relative overflow-hidden rounded-[1.6rem] border border-border bg-muted/50 p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent hover:bg-card hover:shadow-xl hover:shadow-[#414042]/10 focus:outline-none focus:ring-4 focus:ring-accent/20"
                    >
                      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-accent/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
                      <div className="relative flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#414042] text-white shadow-lg shadow-[#414042]/10 transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105 group-hover:bg-accent">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-black leading-tight tracking-tight text-foreground">
                            {goal.title}
                          </h3>
                          <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                            {goal.description}
                          </p>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
