"use client";

import { Navbar } from "@/components/navbar";
import { ChevronLeft, Share2, Calendar, User, Clock } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "../ui/button";
import { ResearchPost } from "@/contants/research";

interface ResearchDetailProps {
  post: ResearchPost;
}

export default function ResearchDetailPageComponent({
  post,
}: ResearchDetailProps) {
  return (
    <div className="min-h-screen bg-background pb-20">
      <article className="pt-40 lg:pt-48">
        <div className="max-w-4xl mx-auto px-4">
          <Link
            href="/research"
            className="inline-flex items-center text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground hover:text-green-500 mb-12 transition-all hover:-translate-x-2"
          >
            <ChevronLeft size={14} className="mr-2" /> Back to Research Hub
          </Link>

          <div className="space-y-8 mb-16">
            <Badge className="bg-green-500/10 text-green-500 border-green-500/20 uppercase tracking-widest px-4 py-1.5 font-black text-[10px]">
              {post.category}
            </Badge>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic leading-[0.85] text-foreground">
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center gap-y-4 gap-x-8 text-[10px] font-black text-muted-foreground uppercase border-y border-border py-8 tracking-[0.2em]">
              <div className="flex items-center gap-2">
                <User size={14} className="text-green-500" /> {post.author}
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-green-500" /> {post.date}
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-green-500" /> {post.readTime}
              </div>
            </div>
          </div>

          <div
            className="prose prose-invert prose-green max-w-none 
            text-slate-400 text-lg leading-relaxed 
            prose-h3:text-white prose-h3:uppercase prose-h3:font-black prose-h3:italic prose-h3:tracking-tight prose-h3:mt-12
            prose-p:mb-6 prose-strong:text-green-500 prose-strong:font-black
            prose-blockquote:border-l-green-500 prose-blockquote:bg-green-500/5 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-2xl"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>
      </article>
    </div>
  );
}
