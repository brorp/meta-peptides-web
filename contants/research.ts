export interface ResearchPost {
  slug: string;
  title: string;
  category: string;
  date: string;
  readTime: string;
  excerpt: string;
  content: string;
  author: string;
}

export const RESEARCH_POSTS: ResearchPost[] = [
  {
    slug: "hplc-purity-validation-standards",
    title: "Advanced HPLC Purity Validation",
    category: "LAB PROTOCOL",
    date: "Feb 14, 2026",
    readTime: "8 min read",
    author: "Lab Division 01",
    excerpt:
      "Detailed breakdown of our high-performance liquid chromatography testing phase for every batch synthesized in our facility.",
    content: `
      <p>Purity is the most critical factor in peptide research. At MetaPeptides, we ensure that every molecule meets the "Gold Standard" of ≥99% purity.</p>
      <br/>
      <h3 style="color: white; font-weight: 800; text-transform: uppercase;">1. The HPLC Process</h3>
      <p>High-Performance Liquid Chromatography (HPLC) is our primary tool for verifying chemical purity. By passing the peptide through a specialized column under high pressure, we can separate and identify every component within the sample.</p>
      <br/>
      <h3 style="color: white; font-weight: 800; text-transform: uppercase;">2. Mass Spectrometry (MS)</h3>
      <p>While HPLC tells us the purity, Mass Spec confirms the identity. This ensures that the sequence you receive is exactly what was ordered, with no molecular deviations.</p>
    `,
  },
  {
    slug: "indonesia-cold-chain-logistics",
    title: "Domestic Cold-Chain Standards",
    category: "LOGISTICS",
    date: "Feb 05, 2026",
    readTime: "5 min read",
    author: "Logistics Dept",
    excerpt:
      "Maintaining molecular stability during transit across the Indonesian archipelago requires specialized infrastructure.",
    content: `
      <p>Shipping sensitive research compounds in a tropical climate like Indonesia presents unique challenges.</p>
      <br/>
      <h3 style="color: white; font-weight: 800; text-transform: uppercase;">Temperature Regulation</h3>
      <p>We utilize medical-grade thermal packaging for all domestic shipments within Indonesia, ensuring that the structural integrity of the peptides is maintained from our lab to your facility.</p>
    `,
  },
];
