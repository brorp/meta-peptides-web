# 🧬 MetaPeptides Portal

### Next-Generation Research & Peptide Commerce Interface

**MetaPeptides** is a high-end, bio-tech inspired web application designed for researchers and medical professionals. Built with a clinical aesthetic, it focuses on fluid animations, emerald green accents, and a secure "Green-Vault" user experience.

---

## 🧪 Technical Core

- **Framework:** [Next.js 14/15](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **State Management:** [Zustand](https://docs.pmnd.rs/zustand/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Components:** [Shadcn UI](https://ui.shadcn.com/)

---

## ✨ Integrated System Features

### 🔐 Bio-Metric Authentication

- **AuthPortal:** Sleek Login/Sign-up interface with emerald focus states.
- **Biometric Visuals:** Fingerprint pulse animations for identity verification.
- **Secure Flow:** Optimized for encrypted credentials transmission.

### 🛰️ Adaptive Navigation Terminal

- **Smart Navbar:** Dynamic glassmorphism that transforms on scroll.
- **Integrated Cart:** Real-time synchronization of peptide orders via Zustand.
- **Portal Links:** Seamless routing between Research, Shop, and Auth sectors.

### 🔬 Clinical Error Protocols (404)

- **Unknown Strain:** Custom "Sequence Not Identified" error interface.
- **Micro-Animations:** Microscope and DNA visualizers for data-re-scanning.
- **Protocol Recovery:** One-tap return to the main terminal.

---

## 🚀 Deployment Protocol

1.  **Clone the Laboratory Repository**

    ```bash
    git clone [https://github.com/your-username/metapeptides.git](https://github.com/your-username/metapeptides.git)
    cd metapeptides
    ```

2.  **Synthesize Dependencies**

    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Configure Access Keys**
    Create a `.env.local` file in the root:

    ```env
    NEXT_PUBLIC_API_URL=[https://api.metapeptides.com/v1](https://api.metapeptides.com/v1)
    ```

4.  **Initialize Development Node**
    ```bash
    npm run dev
    ```

---

## 📂 Project Architecture

```text
src/
├── app/               # Next.js App Router (Pages, 404, Auth)
├── components/        # UI System (Navbar, Buttons, Lab-Cards)
├── lib/               # Utilities & Response Handlers
├── store/             # Zustand State (Cart & Session)
├── styles/            # Global Emerald & Dark-mode configurations
└── public/            # Static Lab Assets (Logo, DNA Patterns)
```
