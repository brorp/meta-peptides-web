export type Lang = "ID" | "EN";

export const t = {
  // ── Slide 1 — Cover ──────────────────────────────────────────────
  cover: {
    researchManual: { ID: "Panduan Research", EN: "Research Manual" },
    subtitle: {
      ID: "Semua yang perlu kamu tahu tentang penanganan, aplikasi, dan penyimpanan — dalam Bahasa Indonesia untuk perjalanan riset kamu.",
      EN: "Everything you need to know about handling, application and storage — written in English for your research journey.",
    },
    swipeToBegin: { ID: "Geser untuk mulai →", EN: "Swipe to begin →" },
  },

  // ── Slide 2 — Package ────────────────────────────────────────────
  package: {
    section: { ID: "Bagian 1", EN: "Section 1" },
    title: { ID: "Isi Setiap", EN: "What You'll Get in" },
    titleHighlight: { ID: "Paket Kamu", EN: "Every Package" },
    subtitle: {
      ID: "Peralatan lengkap untuk menangani dan menyiapkan research peptides.",
      EN: "Essential tools to handle and prepare your research peptides.",
    },
    items: {
      ID: [
        { name: "Lyophilized Peptide", desc: "Bentuk powder, steril", emoji: "🧪" },
        { name: "Bacteriostatic Water", desc: "BAC Water untuk reconstitution", emoji: "💧" },
        { name: "Alcohol Swab", desc: "Protokol sanitasi", emoji: "🧴" },
        { name: "Syringe 3mL / 10 mL", desc: "Untuk reconstitution", emoji: "💉" },
        { name: "Syringe 0.5mL", desc: "Dosing presisi", emoji: "🔬" },
      ],
      EN: [
        { name: "Lyophilized Peptide", desc: "Powder form, sterile", emoji: "🧪" },
        { name: "Bacteriostatic Water", desc: "BAC Water for reconstitution", emoji: "💧" },
        { name: "Alcohol Swab", desc: "Sanitization protocol", emoji: "🧴" },
        { name: "Syringe 3mL / 10 mL", desc: "For reconstitution", emoji: "💉" },
        { name: "Syringe 0.5mL", desc: "Precise dosing", emoji: "🔬" },
      ],
    },
    noteLabel: { ID: "Note:", EN: "Note:" },
    noteText: {
      ID: "Isi paket dapat bervariasi tergantung jenis produk atau ketersediaan. Jika ada perbedaan, akan dijelaskan saat checkout atau dikonfirmasi oleh support.",
      EN: "Contents may vary depending on product type or availability. If any item differs, it will be clearly stated during checkout or confirmed by support.",
    },
  },

  // ── Slide 3 — Overview ───────────────────────────────────────────
  overview: {
    section: { ID: "Bagian 2", EN: "Section 2" },
    title: { ID: "Gambaran", EN: "The Big Picture" },
    titleHighlight: { ID: "Umum", EN: "Overview" },
    subtitle: {
      ID: "Aplikasi peptide yang benar mudah dilakukan — harus dikerjakan dengan urutan yang tepat.",
      EN: "Proper peptide application is easy and simple — must be done in correct order.",
    },
    steps: {
      ID: ["Sanitization", "Menentukan Konsentrasi", "Reconstitution", "Dosing", "Aplikasi", "Penyimpanan"],
      EN: ["Sanitization", "Deciding Concentration", "Reconstitution", "Dosing", "Application", "Storage"],
    },
    watchLabel: { ID: "Tonton Video Protokol", EN: "Watch Protocol Video" },
    watchSub: { ID: "Panduan lengkap step-by-step", EN: "Full walkthrough" },
    readAll: {
      ID: "Baca semua langkah dengan seksama — setiap langkah memengaruhi akurasi & stabilitas",
      EN: "Please read all steps carefully — each affects accuracy & stability",
    },
  },

  // ── Slide 4 — Sanitization ───────────────────────────────────────
  sanitization: {
    step: { ID: "Langkah 1", EN: "Step 1" },
    title: { ID: "Sanitasi", EN: "Sanitization" },
    subtitle: {
      ID: "Sebelum menangani vial, syringe, atau larutan apa pun — pastikan area kerja bersih.",
      EN: "Before handling any vial, syringe, or solution — ensure your work area is clean.",
    },
    whyLabel: { ID: "Kenapa ini penting", EN: "Why this matters" },
    whyText: {
      ID: "Peptides umumnya dipersiapkan dengan standar steril. Kontaminasi dapat memengaruhi stabilitas dan menimbulkan unwanted variable dalam proses penelitian.",
      EN: "Peptides are generally prepared under sterile standards. Contamination can affect stability and introduce unwanted variables in your research process.",
    },
    checklistLabel: { ID: "Checklist Sanitasi ✓", EN: "Sanitization Checklist ✓" },
    checklist: {
      ID: [
        "Cuci tangan dengan bersih sebelum memulai",
        "Gunakan alcohol swab untuk membersihkan tutup vial",
        "Siapkan di permukaan yang bersih dan kering",
        "Gunakan syringe baru (jangan pernah reuse)",
        "Hindari menyentuh ujung jarum atau bagian dalam tutup vial",
      ],
      EN: [
        "Wash hands thoroughly before starting",
        "Use an alcohol swab to clean the vial cap",
        "Prepare on a clean, dry surface",
        "Use a new syringe (never reuse)",
        "Avoid touching needle tips or the inside of vial caps",
      ],
    },
    note: {
      ID: "Catatan: Selalu bersihkan karet penutup vial dengan alc swab sebelum jarum dimasukkan.",
      EN: "Note: Always clean the vial rubber stopper with an alc swab before inserting the needle.",
    },
  },

  // ── Slide 5 — Concentration ──────────────────────────────────────
  concentration: {
    step: { ID: "Langkah 2", EN: "Step 2" },
    title: { ID: "Menentukan Konsentrasi", EN: "Deciding Concentration" },
    subtitle: {
      ID: "Tentukan konsentrasi sebelum mencampur untuk dosing yang lebih mudah & akurat.",
      EN: "Decide your concentration before mixing for easier & more accurate dosing.",
    },
    tooPekat: { ID: "Terlalu Pekat", EN: "Too Concentrated" },
    tooPekatSub: { ID: "Sulit micro-dosing", EN: "Hard to micro-dose" },
    tooEncer: { ID: "Terlalu Encer", EN: "Too Diluted" },
    tooEncerSub: { ID: "Volume injeksi terlalu besar", EN: "Injection volume too large" },
    exampleLabel: { ID: "Contoh (Vial 10mg Retatrutide)", EN: "Example (10mg Retatrutide Vial)" },
    applyLabel: { ID: "Aplikasi", EN: "Apply" },
    needLabel: { ID: "butuh", EN: "needs" },
    tipText: {
      ID: "Don't worry — setiap produk yang kamu beli sudah disertai rekomendasi konsentrasi dan dosing guidelines.",
      EN: "Don't worry — every product you purchase already comes with concentration recommendations and dosing guidelines.",
    },
    learnMore: { ID: "Klik di sini untuk pelajari lebih lanjut", EN: "Click here to learn more" },
  },

  // ── Slide 6 — Reconstitution ─────────────────────────────────────
  reconstitution: {
    step: { ID: "Langkah 3", EN: "Step 3" },
    title: { ID: "Reconstitution", EN: "Reconstitution" },
    subtitle: {
      ID: "Pencampuran — melarutkan powder menggunakan BAC water.",
      EN: "Mixing — dissolving the powder using BAC water.",
    },
    steps: {
      ID: [
        "Gunakan syringe 3mL untuk mengambil BAC water sesuai volume",
        "Masukkan jarum ke dalam vial peptide",
        "Suntikkan BAC water secara perlahan melalui dinding bagian dalam vial",
        "Biarkan powder larut secara natural",
        "Putar perlahan vial (swirl) — jangan dikocok keras",
      ],
      EN: [
        "Use a 3mL syringe to draw the required volume of BAC water",
        "Insert the needle into the peptide vial",
        "Slowly inject BAC water along the inner wall of the vial",
        "Let the powder dissolve naturally",
        "Gently swirl the vial — do not shake vigorously",
      ],
    },
    dos: {
      ID: [
        ["❌", "Jangan tuang bacwater terlalu cepat (foam/bubble)"],
        ["❌", "Jangan shake secara agresif"],
        ["✅", "Diamkan 5–10 menit agar larutan stabil (larutan harus terlihat bening transparan)"],
        ["⚠️", "Jika larutan keruh/cloudy atau ada bubuk yang tidak larut sempurna, jangan digunakan"],
      ],
      EN: [
        ["❌", "Don't pour BAC water too fast (causes foam/bubbles)"],
        ["❌", "Don't shake aggressively"],
        ["✅", "Let sit 5–10 minutes for the solution to stabilize (should appear clear and transparent)"],
        ["⚠️", "If the solution is cloudy or has undissolved powder, do not use it"],
      ],
    },
  },

  // ── Slide 7 — Dosing ─────────────────────────────────────────────
  dosing: {
    step: { ID: "Langkah 4", EN: "Step 4" },
    title: { ID: "Dosing", EN: "Dosing" },
    subtitle: {
      ID: "Proses dosing berdasarkan konsentrasi yang sudah kamu buat.",
      EN: "Dosing process based on the concentration you prepared.",
    },
    checklistLabel: { ID: "Checklist Dosing", EN: "Dosing Checklist" },
    checklist: {
      ID: [
        "Pastikan konsentrasi sudah benar sebelum menarik larutan",
        "Gunakan syringe baru dan steril",
        "Tarik larutan secara perlahan untuk menghindari air bubble",
        "Pastikan angka pada syringe sesuai dengan dosis yang diinginkan",
      ],
      EN: [
        "Ensure the concentration is correct before drawing the solution",
        "Use a new, sterile syringe",
        "Draw the solution slowly to avoid air bubbles",
        "Verify the syringe markings match your intended dose",
      ],
    },
    calculatorLabel: { ID: "Kalkulator Peptide", EN: "Peptide Calculator" },
    calculatorSub: { ID: "Untuk perhitungan lebih akurat", EN: "For more accurate calculations" },
  },

  // ── Slide 8 — Application ────────────────────────────────────────
  application: {
    step: { ID: "Langkah 5", EN: "Step 5" },
    title: { ID: "Aplikasi", EN: "Application" },
    subtitle: {
      ID: "Area abdomen adalah yang paling umum — paling mudah dan visible.",
      EN: "The abdomen area is the most common — easiest and most visible.",
    },
    stepsLabel: { ID: "Cara Aplikasi", EN: "How to Apply" },
    steps: {
      ID: [
        "Bersihkan area injeksi dengan alcohol swab",
        "Gunakan syringe baru",
        "Pastikan volume dosis sesuai perhitungan",
        "Aplikasikan pada area yang ditentukan",
      ],
      EN: [
        "Clean the injection area with an alcohol swab",
        "Use a new syringe",
        "Ensure the dose volume matches your calculation",
        "Apply to the designated area",
      ],
    },
    safetyReminder: {
      ID: "Safety Reminder: Jangan pernah menggunakan syringe yang sama lebih dari satu kali.",
      EN: "Safety Reminder: Never use the same syringe more than once.",
    },
  },

  // ── Slide 9 — Storage ────────────────────────────────────────────
  storage: {
    step: { ID: "Langkah 6", EN: "Step 6" },
    title: { ID: "Penyimpanan", EN: "Storage" },
    subtitle: {
      ID: "Penyimpanan yang benar menjaga stabilitas dan konsistensi peptide kamu.",
      EN: "Proper storage maintains your peptide's stability and consistency.",
    },
    beforeLabel: { ID: "Sebelum Reconstitution — Powder Form", EN: "Before Reconstitution — Powder Form" },
    beforeItems: {
      ID: [
        "Simpan di tempat sejuk dan kering",
        "Hindari paparan cahaya langsung",
        "Hindari area lembap atau panas",
      ],
      EN: [
        "Store in a cool, dry place",
        "Avoid direct light exposure",
        "Avoid humid or hot areas",
      ],
    },
    afterLabel: { ID: "Setelah Reconstitution — Liquid Form", EN: "After Reconstitution — Liquid Form" },
    afterItems: {
      ID: [
        "Simpan di kulkas suhu 2°C – 4°C",
        "Pastikan vial tertutup rapat saat tidak digunakan",
        "Simpan di pojok kulkas — suhu lebih stabil",
        "Hindari guncangan & perubahan suhu berulang",
      ],
      EN: [
        "Refrigerate at 2°C – 4°C",
        "Ensure the vial is tightly closed when not in use",
        "Store in the back corner of the fridge — more stable temperature",
        "Avoid shaking & repeated temperature changes",
      ],
    },
  },

  // ── Slide 10 — Closing ───────────────────────────────────────────
  closing: {
    sectionLabel: { ID: "Selesai!", EN: "All Done!" },
    title: { ID: "Kamu Sudah", EN: "You're" },
    titleHighlight: { ID: "Siap.", EN: "All Set." },
    subtitle: {
      ID: "Selamat — sekarang kamu sudah paham sepenuhnya cara menggunakan peptides kamu.",
      EN: "Congrats — now you fully understand how to apply your peptides.",
    },
    mistakesLabel: { ID: "⚠️ Kesalahan Umum yang Harus Dihindari", EN: "⚠️ Common Mistakes to Avoid" },
    mistakes: {
      ID: [
        "Mengocok vial secara agresif",
        "Menyuntikkan BAC water terlalu cepat",
        "Menyentuh ujung jarum",
        "Tidak mensanitasi tutup vial",
        "Menggunakan perhitungan konsentrasi yang salah",
        "Menyimpan peptide pada suhu tidak stabil",
        "Menggunakan syringe yang sama berulang kali",
      ],
      EN: [
        "Shaking the vial aggressively",
        "Injecting BAC water too quickly",
        "Touching needle tips",
        "Not sanitizing vial tops",
        "Using incorrect concentration calculations",
        "Storing peptides at unstable temperatures",
        "Reusing syringes",
      ],
    },
    disclaimerLabel: { ID: "Disclaimer", EN: "Disclaimer" },
    disclaimerText: {
      ID: "Semua produk yang dijual di website ini semata-mata ditujukan untuk keperluan laboratorium dan penelitian. Tidak dimaksudkan untuk konsumsi manusia, penggunaan medis, diagnosis, pengobatan, atau pencegahan penyakit. Pembeli bertanggung jawab penuh atas penanganan, penyimpanan, dan penggunaan.",
      EN: "All products sold on this website are strictly intended for laboratory and research purposes only. They are not intended for human consumption, medical use, diagnosis, treatment, or prevention of disease. The buyer assumes full responsibility for handling, storage, and usage.",
    },
    goToShop: { ID: "Pergi ke Toko", EN: "Go to Shop" },
  },
} as const;
