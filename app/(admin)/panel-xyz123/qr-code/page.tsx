"use client";

import { useRef } from "react";
import QRCode from "react-qr-code";
import { Download, ExternalLink, QrCode } from "lucide-react";

const TARGET_URL = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://metapeptides.com"}/guidelines`;

export default function QrCodePage() {
  const qrRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const size = 1024;
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    const img = new Image();
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const padding = 40;
      ctx.drawImage(img, padding, padding, size - padding * 2, size - padding * 2);
      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = "metapeptides-guidelines-qr.png";
      link.href = pngUrl;
      link.click();
    };

    img.src = url;
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <QrCode className="w-5 h-5 text-accent" />
          Guidelines QR Code
        </h1>
        <p className="text-sm text-muted-foreground">
          QR Code ini mengarah ke halaman{" "}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">/guidelines</code>.
          Download dan tempel di greeting card.
        </p>
      </div>

      {/* QR Code card */}
      <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-6">
        {/* QR */}
        <div
          ref={qrRef}
          className="p-6 bg-white rounded-2xl border border-border shadow-sm"
        >
          <QRCode
            value={TARGET_URL}
            size={220}
            bgColor="#ffffff"
            fgColor="#1a1a2e"
            level="H"
            style={{ display: "block" }}
          />
        </div>

        {/* URL display */}
        <div className="w-full space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest text-center">
            URL yang di-encode
          </p>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-xl">
            <code className="text-xs text-foreground font-mono flex-1 break-all">
              {TARGET_URL}
            </code>
            <a
              href="/guidelines"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 p-1.5 rounded-lg hover:bg-muted-foreground/10 text-muted-foreground transition-colors"
              title="Open page"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Download button */}
        <button
          onClick={handleDownload}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-xl font-semibold text-sm hover:bg-accent/90 active:scale-95 transition-all"
        >
          <Download className="w-4 h-4" />
          Download QR Code (PNG 1024×1024)
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <p className="text-xs font-bold text-foreground uppercase tracking-widest">
          Petunjuk Penggunaan
        </p>
        <ol className="space-y-2">
          {[
            "Download QR Code di atas sebagai file PNG",
            "Import ke Canva / Photoshop / template greeting card",
            "Print dan tempel di greeting card fisik",
            "Saat customer scan, mereka langsung dibawa ke halaman Peptides Guide",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="w-4 h-4 rounded-full bg-accent/20 text-accent flex items-center justify-center shrink-0 font-black text-[10px] mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Preview link */}
      <a
        href="/guidelines"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Preview halaman /guidelines
      </a>
    </div>
  );
}
