"use client";

import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TikTokEmbed, InstagramEmbed } from "react-social-media-embed";
import {
  BookOpen,
  Video,
  ArrowRight,
  Clock,
  Microscope,
  Zap,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { RESEARCH_POSTS } from "@/contants/research";
import { useRef } from "react";

export default function ResearchPage() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const scrollTo =
        direction === "left"
          ? scrollLeft - clientWidth * 0.8
          : scrollLeft + clientWidth * 0.8;
      scrollContainerRef.current.scrollTo({
        left: scrollTo,
        behavior: "smooth",
      });
    }
  };

  const socialContent = [
    {
      type: "TIKTOK",
      label: "Synthesis Demo",
      url: "https://www.tiktok.com/@mediconmedia/video/7597104842057714966",
    },
    {
      type: "REELS",
      label: "Quality Control",
      url: "https://www.instagram.com/p/DUfdcfVD836/",
    },
    {
      type: "TIKTOK",
      label: "Lab Protocol",
      url: "https://www.tiktok.com/@mediconmedia/video/7605967835180928278",
    },
    {
      type: "REELS",
      label: "Batch Testing",
      url: "https://www.instagram.com/p/DUfdcfVD836/",
    },
  ];

  return (
    <div className="min-h-screen bg-background selection:bg-green-500/30">
      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-16 overflow-hidden bg-[#414042]">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-500/5 rounded-full blur-[120px]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <Badge className="mb-4 bg-green-500/10 text-green-400 border-green-500/20 uppercase tracking-[0.3em] font-black text-[10px]">
            Technical Intelligence
          </Badge>
          <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tighter leading-[0.85] uppercase italic">
            Research <br />
            <span className="text-green-500">Archives.</span>
          </h1>
        </div>
      </section>

      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-24">
          {/* --- BLOGS SECTION: Mencerminkan Real Blog --- */}
          <div className="space-y-10">
            <div className="flex items-center justify-between border-b border-border pb-6">
              <div className="flex items-center gap-3">
                <BookOpen className="text-green-500" size={24} />
                <h2 className="text-2xl font-black uppercase tracking-tight">
                  Technical Publications
                </h2>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest hidden md:block">
                Domestic Research Only
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {RESEARCH_POSTS.map((post) => (
                <Link
                  href={`/research/${post.slug}`}
                  key={post.slug}
                  className="group block"
                >
                  <article className="relative flex flex-col md:flex-row gap-8 items-start p-2 rounded-[2.5rem] hover:bg-muted/30 transition-all duration-500">
                    {/* Visual Media Placeholder */}
                    <div className="w-full md:w-56 h-56 rounded-[2rem] bg-slate-900 border border-border overflow-hidden flex-shrink-0 relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Microscope className="w-12 h-12 text-green-500/20 group-hover:scale-110 transition-transform duration-500" />
                      </div>
                    </div>

                    <div className="flex flex-col justify-center py-2 pr-4 space-y-4">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className="text-[9px] font-black tracking-widest uppercase border-green-500/30 text-green-500"
                        >
                          {post.category}
                        </Badge>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                          <Clock size={12} /> {post.readTime}
                        </span>
                      </div>

                      <h3 className="text-2xl lg:text-3xl font-black group-hover:text-green-500 transition-colors uppercase italic leading-[1.1] tracking-tighter">
                        {post.title}
                      </h3>

                      <p className="text-sm text-muted-foreground font-medium leading-relaxed line-clamp-3">
                        {post.excerpt}
                      </p>

                      <div className="pt-2 flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-foreground group-hover:text-green-500 transition-all">
                        Open Protocol{" "}
                        <ArrowRight
                          className="ml-2 group-hover:translate-x-2 transition-transform"
                          size={14}
                        />
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>

          {/* --- VIDEO CAROUSEL SECTION: Ringkas & Tidak Memakan Layar --- */}
          <div className="space-y-8 bg-muted/20 px-2 py-8 lg:p-12 rounded-[3.5rem] border border-border/50">
            <div className="flex items-center justify-between border-b border-border/50 pb-6">
              <div className="flex items-center gap-3">
                <Video className="text-green-500" size={24} />
                <h2 className="text-2xl font-black uppercase tracking-tight italic">
                  Lab In{" "}
                  <span className="text-green-500 text-3xl">Motion.</span>
                </h2>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => scroll("left")}
                  variant="outline"
                  size="icon"
                  className="w-12 h-12 rounded-full border-border bg-background hover:bg-green-500 hover:text-white transition-all shadow-xl"
                >
                  <ChevronLeft size={20} />
                </Button>
                <Button
                  onClick={() => scroll("right")}
                  variant="outline"
                  size="icon"
                  className="w-12 h-12 rounded-full border-border bg-background hover:bg-green-500 hover:text-white transition-all shadow-xl"
                >
                  <ChevronRight size={20} />
                </Button>
              </div>
            </div>

            <div
              ref={scrollContainerRef}
              className="flex overflow-x-auto gap-6 pb-8 snap-x snap-mandatory no-scrollbar items-stretch" // Gunakan items-stretch agar tinggi card sama
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {socialContent.map((video, index) => (
                <div
                  key={index}
                  className="min-w-[300px] md:min-w-[350px] snap-center flex"
                >
                  <div className="bg-[#414042] rounded-[2.5rem] py-5 px-1 border border-white/5 shadow-2xl relative group flex flex-col w-full">
                    {/* Header Card */}
                    <div className="mb-4 flex items-center justify-between px-4">
                      <div className="flex items-center gap-2">
                        <Zap
                          size={12}
                          className="text-green-500 fill-green-500"
                        />
                        <span className="text-[9px] font-black uppercase text-white/50 tracking-widest">
                          {video.label}
                        </span>
                      </div>
                      <Badge className="bg-white/5 text-white/30 border-none text-[8px] uppercase">
                        {video.type}
                      </Badge>
                    </div>

                    {/* Video Wrapper dengan Aspect Ratio Tetap */}
                    <div className="relative mx-3 flex-1 rounded-2xl border border-white/5 bg-black/40 overflow-hidden">
                      <div className="aspect-[9/16] w-full">
                        {video.type === "TIKTOK" ? (
                          <TikTokEmbed
                            url={video.url}
                            width="100%"
                            // Menggunakan style untuk memaksa embed mengikuti container
                            style={{ borderRadius: "1rem", height: "100%" }}
                          />
                        ) : (
                          <InstagramEmbed
                            url={video.url}
                            width="100%"
                            style={{ borderRadius: "1rem", height: "100%" }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
