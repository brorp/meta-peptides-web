"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Box,
  Droplets,
  Syringe,
  ShieldCheck,
  ArrowRight,
  Zap,
  Package,
  AlertTriangle,
  FlaskConical,
  CheckCircle2,
  ThermometerSnowflake,
  ExternalLink,
  PlayCircle,
  Info,
} from "lucide-react";
import Link from "next/link";

export default function PeptidesGuidesComponent() {
  const kitItems = [
    {
      name: "1pc Vial Peptide",
      desc: "Lyophilized Powder form",
      icon: <Box size={16} />,
    },
    {
      name: "1pc Bac Water",
      desc: "Bacteriostatic Water",
      icon: <Droplets size={16} />,
    },
    {
      name: "10pcs Alcohol Swab",
      desc: "Sanitization Protocol",
      icon: <ShieldCheck size={16} />,
    },
    {
      name: "1pc 3mL Syringe",
      desc: "For Reconstitution",
      icon: <Syringe size={16} />,
    },
    {
      name: "10pcs 0.5mL Syringe",
      desc: "Precise Dosing",
      icon: <Zap size={16} />,
    },
  ];

  return (
    <div className="min-h-screen bg-background selection:bg-accent/30 text-slate-900">
      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-[#414042]">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <Badge className="mb-4 bg-accent/20 text-accent border-accent/30 uppercase tracking-widest">
            Research Manual
          </Badge>
          <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tighter leading-[0.85] uppercase italic">
            Peptides <br />
            <span className="text-accent">Guide.</span>
          </h1>
          <p className="mt-8 text-slate-400 text-xl font-medium leading-relaxed italic max-w-3xl">
            Everything you need to know about handling, application and
            storage—written in Bahasa Indonesia for your research peptides
            journey guides.
          </p>
        </div>
      </section>

      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-24">
          {/* SECTION 1: WHAT'S IN THE BOX */}
          <div className="space-y-8">
            <div className="border-b border-border/60 pb-6">
              <div className="flex items-center gap-3 mb-2">
                <Package className="text-accent" size={24} />
                <h2 className="text-2xl font-black uppercase tracking-tight italic">
                  What You’ll Get in{" "}
                  <span className="text-accent">Every Package</span>
                </h2>
              </div>
              <p className="text-muted-foreground max-w-2xl">
                Each order is prepared to ensure you have the essential tools to
                handle and prepare your research peptides properly.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {kitItems.map((item, i) => (
                <div
                  key={i}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-lg transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-accent mb-4 shadow-sm">
                    {item.icon}
                  </div>
                  <h4 className="text-[13px] font-black uppercase tracking-tight">
                    {item.name}
                  </h4>
                  <p className="text-[11px] text-muted-foreground font-bold uppercase mt-1">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex gap-3 items-start">
              <Info className="text-amber-600 shrink-0" size={18} />
              <p className="text-[12px] text-amber-800 leading-relaxed font-medium">
                <strong>Note:</strong> Contents may vary depending on product
                type or availability. If any item differs, it will be clearly
                stated during checkout or confirmed by support.
              </p>
            </div>
          </div>

          {/* SECTION 2: THE BIG PICTURE */}
          <div className="space-y-12">
            <div className="border-b border-border/60 pb-6">
              <div className="flex items-center gap-3 mb-2">
                <FlaskConical className="text-accent" size={24} />
                <h2 className="text-2xl font-black uppercase tracking-tight italic">
                  The Big Picture{" "}
                  <span className="text-accent text-lg">Overview</span>
                </h2>
              </div>
              <p className="text-muted-foreground max-w-2xl">
                Proper peptide application is easy and simple, but it must be
                done in the correct order.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
              <div className="lg:col-span-2 space-y-6">
                <div className="aspect-video rounded-[2rem] overflow-hidden shadow-2xl">
                  <iframe
                    className="w-full h-full"
                    src="https://www.youtube.com/embed/RsfGEbbjlFU"
                    title="Protocol Video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <p className="text-[13px] text-muted-foreground leading-relaxed font-medium italic">
                  To help you learn the process faster, we’ve provided a video
                  on how to apply your research peptides. However, please make
                  sure to read the explanation below the video. Each step
                  affects accuracy and stability, and skipping details can lead
                  to inconsistent results.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="font-black uppercase italic tracking-widest text-sm border-l-4 border-accent pl-4">
                  Step-by-step overview
                </h4>
                <div className="space-y-2">
                  {[
                    "Sanitization",
                    "Deciding Concentration",
                    "Reconstitution",
                    "Dosing",
                    "Application",
                    "Storage",
                  ].map((step, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100 font-bold uppercase text-[12px] tracking-wider"
                    >
                      <span className="text-accent">0{i + 1}</span> {step}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* STEP BY STEP DETAILS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-24">
            {/* STEP 1 */}
            <div className="space-y-4">
              <div className="text-accent font-black tracking-widest text-sm italic">
                STEP 1: SANITIZATION
              </div>
              <h3 className="text-3xl font-black uppercase italic tracking-tighter">
                Maintain Sterility
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Sebelum menangani vial, syringe, atau larutan apa pun, pastikan
                area kerja kamu bersih dan terkontrol. Kontaminasi dapat
                memengaruhi stabilitas dan menimbulkan{" "}
                <strong>unwanted variable</strong> dalam proses penelitian.
              </p>
              <div className="bg-slate-50 p-6 rounded-2xl space-y-3">
                <p className="text-[11px] font-black uppercase tracking-widest mb-2">
                  Checklist Sanitasi:
                </p>
                {[
                  "Cuci tangan dengan bersih",
                  "Gunakan alcohol swab untuk tutup vial",
                  "Siapkan di permukaan bersih & kering",
                  "Gunakan syringe baru (no reuse)",
                  "Hindari menyentuh ujung jarum",
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-tight"
                  >
                    <CheckCircle2 size={14} className="text-accent" /> {item}
                  </div>
                ))}
              </div>
            </div>

            {/* STEP 2 */}
            <div className="space-y-4">
              <div className="text-accent font-black tracking-widest text-sm italic">
                STEP 2: DECIDING CONCENTRATION
              </div>
              <h3 className="text-3xl font-black uppercase italic tracking-tighter">
                mg per mL Ratio
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Konsentrasi yang tepat membuat micro-dosing lebih mudah. Terlalu
                pekat sulit diukur, terlalu encer membuat volume injeksi terlalu
                besar.
              </p>
              <div className="border-2 border-dashed border-slate-200 p-6 rounded-2xl bg-white">
                <p className="text-[11px] font-black uppercase tracking-widest text-accent mb-3">
                  Contoh Perhitungan (Vial 10mg):
                </p>
                <div className="space-y-1 text-[13px] font-bold">
                  <p>
                    10mg Peptide + 2mL BAC Water ={" "}
                    <span className="text-accent">5mg/mL</span>
                  </p>
                  <hr className="my-2" />
                  <p className="text-muted-foreground tracking-tight uppercase text-[11px]">
                    Dosing Guide:
                  </p>
                  <ul className="space-y-1 mt-2">
                    <li>0.5mg &rarr; 0.1mL</li>
                    <li>1.0mg &rarr; 0.2mL</li>
                    <li>2.0mg &rarr; 0.4mL</li>
                  </ul>
                </div>
              </div>
              <Link
                href="/shop"
                className="text-[11px] font-black text-accent uppercase flex items-center gap-1 hover:underline"
              >
                View Recommended Concentration Guidelines{" "}
                <ArrowRight size={12} />
              </Link>
            </div>

            {/* STEP 3 */}
            <div className="space-y-4">
              <div className="text-accent font-black tracking-widest text-sm italic">
                STEP 3: RECONSTITUTION
              </div>
              <h3 className="text-3xl font-black uppercase italic tracking-tighter">
                Pencampuran
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Melarutkan lyophilized powder menggunakan BAC water. Suntikkan
                perlahan melalui dinding vial untuk menghindari foam/bubble.
              </p>
              <ol className="list-decimal list-inside text-[12px] font-bold uppercase space-y-2 text-slate-700 leading-relaxed">
                <li>Ambil BAC Water dengan syringe 3mL</li>
                <li>Masukkan jarum ke vial peptide</li>
                <li>Suntikkan perlahan via dinding dalam</li>
                <li>Biarkan larut natural & Swirl perlahan (jangan dikocok)</li>
              </ol>
              <p className="text-[10px] p-3 bg-accent/5 rounded-lg border border-accent/10 font-bold uppercase">
                Best practice: Diamkan 5-10 menit agar larutan stabil.
              </p>
            </div>

            {/* STEP 4 */}
            <div className="space-y-4">
              <div className="text-accent font-black tracking-widest text-sm italic">
                STEP 4: DOSING
              </div>
              <h3 className="text-3xl font-black uppercase italic tracking-tighter">
                Akurasi Dosis
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Gunakan syringe 0.5mL untuk presisi tinggi. Tarik larutan
                perlahan untuk menghindari air bubble yang mengganggu volume
                dosis.
              </p>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-tight">
                  <CheckCircle2 size={14} className="text-accent" /> Gunakan
                  syringe baru & steril
                </div>
                <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-tight">
                  <CheckCircle2 size={14} className="text-accent" /> Pastikan
                  angka sesuai target dosis
                </div>
                <Link
                  href="https://particlepeptides.com/en/content/48-peptide-calculator"
                  target="_blank"
                  className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-[11px] font-black uppercase hover:bg-slate-800 transition-colors"
                >
                  Open Peptide Calculator <ExternalLink size={14} />
                </Link>
              </div>
            </div>

            {/* STEP 5 */}
            <div className="space-y-4">
              <div className="text-accent font-black tracking-widest text-sm italic">
                STEP 5: APPLICATION
              </div>
              <h3 className="text-3xl font-black uppercase italic tracking-tighter">
                Area Injeksi
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Pilih area yang paling nyaman. Area abdomen adalah yang paling
                umum karena mudah dijangkau dan visible secara langsung.
              </p>
              <div className="aspect-square bg-slate-100 rounded-[2rem] border-2 border-slate-200 flex items-center justify-center italic text-muted-foreground font-bold uppercase text-[10px]">
                [ Image: Injection Site Diagram ]
              </div>
              <p className="text-red-600 text-[11px] font-black uppercase tracking-widest">
                Safety Reminder: Jangan pernah menggunakan syringe yang sama
                lebih dari satu kali.
              </p>
            </div>

            {/* STEP 6 */}
            <div className="space-y-4">
              <div className="text-accent font-black tracking-widest text-sm italic">
                STEP 6: STORAGE
              </div>
              <h3 className="text-3xl font-black uppercase italic tracking-tighter">
                Penyimpanan
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-[12px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Box size={14} className="text-accent" /> Sebelum
                    Rekonstitusi (Powder)
                  </p>
                  <p className="text-[11px] font-bold uppercase text-muted-foreground pl-6">
                    Simpan di tempat sejuk, kering, dan hindari cahaya langsung.
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-[12px] font-black uppercase tracking-widest flex items-center gap-2">
                    <ThermometerSnowflake size={14} className="text-accent" />{" "}
                    Setelah Rekonstitusi (Liquid)
                  </p>
                  <ul className="text-[11px] font-bold uppercase text-muted-foreground pl-6 space-y-1">
                    <li>• Simpan di kulkas (2°C - 4°C)</li>
                    <li>• Simpan di pojok kulkas (suhu lebih stabil)</li>
                    <li>• Hindari guncangan & perubahan suhu berulang</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* WARNINGS & TOOLS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="p-8 rounded-[2.5rem] bg-red-50 border border-red-100">
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="text-red-500" size={24} />
                <h3 className="text-xl font-black uppercase italic text-red-600">
                  Common Mistakes to Avoid
                </h3>
              </div>
              <ul className="space-y-3">
                {[
                  "Shaking the vial aggressively",
                  "Injecting BAC water too quickly",
                  "Touching needle tips",
                  "Not sanitizing vial tops",
                  "Using incorrect concentration calculations",
                  "Storing peptides at unstable temperatures",
                  "Reusing syringes",
                ].map((err, i) => (
                  <li
                    key={i}
                    className="text-[11px] font-black text-red-500/80 uppercase tracking-widest flex items-center gap-3"
                  >
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />{" "}
                    {err}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-8 rounded-[2.5rem] bg-slate-900 text-white">
              <h3 className="text-xl font-black uppercase italic mb-6">
                Recommended Tools
              </h3>
              <div className="space-y-4">
                {[
                  { label: "Alcohol Swabs", link: "#" },
                  { label: "Sterile Working Surface", link: "#" },
                  { label: "Proper Disposal Container", link: "#" },
                ].map((tool, i) => (
                  <Link
                    key={i}
                    href={tool.link}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                  >
                    <span className="text-[12px] font-bold uppercase tracking-widest">
                      {tool.label}
                    </span>
                    <ArrowRight
                      size={16}
                      className="text-accent group-hover:translate-x-1 transition-transform"
                    />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* FOOTER CTA & DISCLAIMER */}
          <div className="text-center py-16 border-t border-border/50 space-y-8">
            <div className="space-y-3">
              <h4 className="text-4xl font-black uppercase italic tracking-tighter">
                Ready to Advance Your Research?
              </h4>
              <p className="text-muted-foreground text-[12px] uppercase tracking-[0.4em] font-bold">
                Congrats, now you fully understand how to handle your peptides.
              </p>
            </div>

            <Link href="/shop" className="inline-block">
              <Button className="h-16 px-16 bg-accent hover:bg-accent/80 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl shadow-accent/40 transition-all hover:scale-105 active:scale-95">
                Shop Now! <ArrowRight className="ml-3" size={20} />
              </Button>
            </Link>

            <div className="bg-slate-50 text-primary p-8 rounded-[2rem] text-[10px] max-w-3xl mx-auto font-medium uppercase tracking-widest leading-loose border border-slate-100">
              <span className="text-slate-900 font-black block mb-2 underline underline-offset-4 decoration-accent decoration-2">
                Disclaimer
              </span>
              All products sold on this website are strictly intended for
              laboratory and research purposes only. They are not intended for
              human consumption, medical use, diagnosis, treatment, or
              prevention of disease. The buyer assumes full responsibility for
              handling, storage, and usage.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
