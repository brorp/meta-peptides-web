"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import Link from "next/link";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { email } from "@/contants/contact";
import { SendEmailRequest, useSendEmail } from "@/hooks/api/usePostSendEmail";

export default function ContactPageComponent() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const { mutate, isPending, isSuccess } = useSendEmail();

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data: SendEmailRequest = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      subject: formData.get("subject") as string,
      message: formData.get("message") as string,
    };

    mutate(data);
  };

  const contactInfo = [
    {
      icon: <Mail className="w-5 h-5" />,
      title: "Direct Email",
      value: "support@metapeptides.com",
      desc: "Avg. response: 2-4 hours",
    },
    {
      icon: <Phone className="w-5 h-5" />,
      title: "Lab Support",
      value: "+1 (555) 123-4567",
      desc: "Mon - Fri, 9 AM - 5 PM MST",
    },
    {
      icon: <MapPin className="w-5 h-5" />,
      title: "HQ Location",
      value: "Boulder, Colorado",
      desc: "123 Science Ave, 80301",
    },
    {
      icon: <MessageSquare className="w-5 h-5" />,
      title: "Live Chat",
      value: "Available Online",
      desc: "For urgent technical queries",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent/20">
      <section className="relative pt-32 pb-20 overflow-hidden bg-[#414042]">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] -mr-40 -mt-40" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-[10px] font-black uppercase tracking-[0.2em] mb-6">
            Global Support Desk
          </div>
          <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tighter leading-none mb-6">
            GET IN <br />
            <span className="text-accent italic">TOUCH.</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl font-medium italic mx-auto lg:mx-0">
            Our technical support team is composed of lab specialists ready to
            assist with your research inquiries.
          </p>
        </div>
      </section>

      {/* --- CONTACT INFO GRID --- */}
      <section className="py-12 -mt-10 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {contactInfo.map((info, i) => (
              <Card
                key={i}
                className="p-8 border-none bg-white shadow-xl shadow-slate-200/50 rounded-[2rem] hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-10 h-10 bg-accent/10 text-accent rounded-xl flex items-center justify-center mb-6">
                  {info.icon}
                </div>
                <h3 className="font-black text-[11px] uppercase tracking-widest text-muted-foreground mb-1">
                  {info.title}
                </h3>
                <p className="font-black text-slate-900 tracking-tight mb-1">
                  {info.value}
                </p>
                <p className="text-[11px] font-medium text-slate-400">
                  {info.desc}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* --- FORM SECTION --- */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-16 items-start">
            {/* Form Side */}
            <div className="lg:col-span-7">
              <div className="mb-10">
                <h2 className="text-4xl font-black tracking-tighter uppercase mb-4">
                  Inquiry Form
                </h2>
                <div className="h-1 w-20 bg-accent rounded-full" />
              </div>

              {isSuccess ? (
                <div className="p-10 bg-accent/5 border border-accent/20 rounded-[2.5rem] flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in duration-500">
                  <div className="w-20 h-20 bg-accent text-white rounded-full flex items-center justify-center shadow-2xl shadow-accent/40">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black tracking-tight">
                    Email Received
                  </h3>
                  <p className="text-muted-foreground max-w-xs mx-auto italic font-medium">
                    Thank you. Our team will review your inquiry and respond
                    within 24 business hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-6 py-4 border-2 border-slate-100 rounded-2xl bg-white focus:border-accent outline-none transition-all font-medium placeholder:text-slate-300"
                        placeholder="Dr. Alexander Wright"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
                        Lab Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-6 py-4 border-2 border-slate-100 rounded-2xl bg-white focus:border-accent outline-none transition-all font-medium placeholder:text-slate-300"
                        placeholder="wright@research.org"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
                      Message Detail
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows={6}
                      className="w-full px-6 py-4 border-2 border-slate-100 rounded-3xl bg-white focus:border-accent outline-none transition-all font-medium resize-none placeholder:text-slate-300"
                      placeholder="Specify your inquiry detail here..."
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isPending}
                    className="w-full h-16 bg-accent hover:bg-accent/90 text-white rounded-2xl font-black text-lg shadow-xl shadow-accent/30 transition-all active:scale-[0.98]"
                  >
                    {isPending ? (
                      "TRANSMITTING..."
                    ) : (
                      <span className="flex items-center gap-2 italic">
                        SEND MESSAGE <Send className="w-5 h-5" />
                      </span>
                    )}
                  </Button>
                </form>
              )}
            </div>

            {/* Side Info */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="p-10 border-none bg-slate-900 text-white rounded-[3rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Clock className="w-32 h-32" />
                </div>
                <div className="relative z-10 space-y-6">
                  <h3 className="text-2xl font-black uppercase italic tracking-tight">
                    Response Times
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed font-medium">
                    Our laboratory is operational 24/7, however our
                    administrative support desk operates:
                  </p>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-white/10 pb-2 text-sm font-bold">
                      <span>Mon - Fri</span>
                      <span className="text-accent">09:00 - 17:00 WIB</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/10 pb-2 text-sm font-bold opacity-50">
                      <span>Weekends</span>
                      <span>Closed</span>
                    </div>
                  </div>
                  <div className="pt-4">
                    <div className="flex items-center gap-3 text-accent text-xs font-black uppercase tracking-widest">
                      <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                      Typical Response: 4 Hours
                    </div>
                  </div>
                </div>
              </Card>

              <div className="p-10 bg-muted/50 rounded-[3rem] border border-slate-100">
                <h3 className="text-xl font-black uppercase mb-4 tracking-tight">
                  Institutional Orders
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed italic mb-6">
                  For university procurement and institutional bulk purchases,
                  please bypass the form and email our specialized department.
                </p>
                <Link
                  href={`mailto:${email}`}
                  className="text-accent font-black text-sm uppercase underline underline-offset-8 decoration-2 hover:text-slate-900 transition-colors"
                >
                  {email}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
