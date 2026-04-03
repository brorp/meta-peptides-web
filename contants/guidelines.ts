export type GuideSlide = {
  id: number;
  type: "cover" | "package" | "overview" | "step" | "closing";
  step?: number;
  section?: string;
  title: string;
  subtitle?: string;
};

export const GUIDE_SLIDES: GuideSlide[] = [
  {
    id: 1,
    type: "cover",
    title: "Peptides Guide",
    subtitle:
      "Everything you need to know about handling, application and storage — written in Bahasa Indonesia for your research peptides journey.",
  },
  {
    id: 2,
    type: "package",
    section: "Section 1",
    title: "What You'll Get in Every Package",
    subtitle:
      "Each order is prepared to ensure you have the essential tools to handle and prepare your research peptides properly.",
  },
  {
    id: 3,
    type: "overview",
    section: "Section 2",
    title: "The Big Picture Overview",
    subtitle:
      "Proper peptide application is easy and simple, but it must be done in the correct order.",
  },
  {
    id: 4,
    type: "step",
    step: 1,
    title: "Sanitization",
    subtitle:
      "Sebelum menangani vial, syringe, atau larutan apa pun, pastikan area kerja kamu bersih dan terkontrol.",
  },
  {
    id: 5,
    type: "step",
    step: 2,
    title: "Deciding Concentration",
    subtitle:
      "Sebelum mencampur, tentukan konsentrasi yang ingin kamu gunakan. Ini akan mempermudah proses dosing dan meningkatkan akurasi.",
  },
  {
    id: 6,
    type: "step",
    step: 3,
    title: "Reconstitution",
    subtitle:
      "Proses melarutkan peptide berbentuk powder (lyophilized) menggunakan BAC water hingga menjadi larutan.",
  },
  {
    id: 7,
    type: "step",
    step: 4,
    title: "Dosing",
    subtitle:
      "Setelah peptide larut, proses dosing dilakukan berdasarkan konsentrasi yang sudah kamu buat.",
  },
  {
    id: 8,
    type: "step",
    step: 5,
    title: "Application",
    subtitle:
      "Pilih area yang paling nyaman. Area abdomen adalah yang paling umum karena paling mudah dan visible.",
  },
  {
    id: 9,
    type: "step",
    step: 6,
    title: "Storage",
    subtitle:
      "Penyimpanan yang benar akan membantu menjaga stabilitas dan konsistensi peptide kamu.",
  },
  {
    id: 10,
    type: "closing",
    title: "You're All Set!",
    subtitle:
      "Congrats, now you have fully understood how to apply your peptides.",
  },
];
