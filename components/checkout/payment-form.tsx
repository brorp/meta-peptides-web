"use client";

import { Card } from "@/components/ui/card";
import {
  Camera,
  Image as ImageIcon,
  QrCode,
  Download,
  ShieldCheck,
} from "lucide-react";
import { useRef } from "react";

interface PaymentFormProps {
  receiptPreview: string | null | undefined;
  setValue: any;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
}

export function PaymentForm({
  receiptPreview,
  setValue,
  onFileChange,
  isLoading,
}: PaymentFormProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadQR = () => {
    const link = document.createElement("a");
    link.href = "/qris-placeholder.png";
    link.download = "QRIS-Metapeptides.png";
    link.click();
  };

  return (
    <Card className="p-8 rounded-[2.5rem] border-muted bg-white shadow-xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center border-b border-muted pb-4">
        <h3 className="text-xl font-bold uppercase italic tracking-tighter">
          QRIS <span className="text-accent">Payment.</span>
        </h3>
        <div className="px-3 py-1 bg-accent/10 text-accent rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
          <QrCode className="w-3 h-3" /> All E-Wallets Supported
        </div>
      </div>

      {/* QRIS Display Section */}
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="relative p-4 bg-white border-2 border-slate-100 rounded-[2rem] shadow-inner">
          {/* Logo Brand di Tengah QR (Opsional ala QRIS asli) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-1 rounded-lg shadow-sm border border-slate-50">
            <img src="/logo.webp" alt="Logo" className="w-6 h-auto" />
          </div>

          {/* Ganti src dengan path QRIS kamu */}
          <img
            src="/qris-placeholder.png"
            alt="QRIS Metapeptides"
            className="w-64 h-64 object-contain rounded-xl"
          />
        </div>

        <div className="text-center space-y-1">
          <p className="text-sm font-black text-slate-800 uppercase tracking-tight">
            PT. METAPEPTIDES INDONESIA
          </p>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-[0.2em]">
            NMID: ID1234567890
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadQR}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 transition-all text-[10px] font-bold uppercase tracking-widest border border-slate-200"
        >
          <Download className="w-3 h-3" /> Save QR Code
        </button>
      </div>

      {/* Upload Section */}
      <div className="space-y-4 pt-4 border-t border-dashed border-muted">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground text-center">
          Upload Proof of Transaction
        </p>

        {!receiptPreview ? (
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-col items-center gap-3 p-8 rounded-[2rem] border-2 border-dashed border-muted hover:border-accent bg-muted/5 transition-all group"
            >
              <Camera className="w-6 h-6 text-slate-400 group-hover:text-accent transition-colors" />
              <span className="text-xs font-bold uppercase tracking-widest">
                Take Photo
              </span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-3 p-8 rounded-[2rem] border-2 border-dashed border-muted hover:border-accent bg-muted/5 transition-all group"
            >
              <ImageIcon className="w-6 h-6 text-slate-400 group-hover:text-accent transition-colors" />
              <span className="text-xs font-bold uppercase tracking-widest">
                Gallery
              </span>
            </button>
          </div>
        ) : (
          <div className="relative rounded-[2rem] overflow-hidden border-2 border-accent aspect-video bg-black shadow-2xl">
            <img
              src={receiptPreview}
              className="w-full h-full object-contain"
              alt="Payment Receipt Preview"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                disabled={isLoading}
                type="button"
                onClick={() => {
                  setValue("receiptPreview", null);
                  setValue("receiptFile", null);
                }}
                className="bg-red-500 text-white px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest"
              >
                Change Photo
              </button>
            </div>
          </div>
        )}

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFileChange}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onFileChange}
          className="hidden"
        />
      </div>

      {/* Trust Footer */}
      <div className="flex items-center justify-center gap-2 opacity-60">
        <ShieldCheck className="w-4 h-4 text-green-600" />
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          Verified Merchant by Metapeptides
        </span>
      </div>
      {/* Payment Instruction */}
      <div className="p-4 bg-accent/5 rounded-2xl border border-accent/10">
        <p className="text-[10px] text-slate-600 leading-relaxed font-medium">
          <span className="font-bold text-accent">Note:</span> Please make sure
          the transfer amount matches the total due exactly to speed up the
          automated verification process.
        </p>
      </div>
    </Card>
  );
}
