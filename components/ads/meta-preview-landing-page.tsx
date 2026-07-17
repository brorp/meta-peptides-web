import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BadgePlus,
  Brain,
  Dumbbell,
  Moon,
  Sparkles,
  Target,
} from "lucide-react";

export const META_AD_ROUTE_CODES = [
  "mw-fit-a7x2",
  "mw-fit-b9m4",
  "mw-fit-c3q8",
] as const;

export type MetaAdRouteCode = (typeof META_AD_ROUTE_CODES)[number];

const ASSET_BASE = "/ads/meta-preview-4";

const peptideBenefits = [
  { label: "Fat Loss", icon: Activity },
  { label: "Muscle Building", icon: Dumbbell },
  { label: "Injury Recovery", icon: BadgePlus },
  { label: "Kulit Glowing,\nRambut Tebal\n& Detoks", icon: Sparkles },
  { label: "Energy\n& Brain\nBooster", icon: Brain },
  { label: "Deeper\nSleep", icon: Moon },
];

function consultationHref(code: MetaAdRouteCode) {
  const params = new URLSearchParams({
    utm_source: "meta_ads",
    utm_medium: "landing_page",
    utm_campaign: code,
    utm_content: "landing_page_meta_preview_4",
  });

  return `/free-consultation?${params.toString()}`;
}

export function MetaPreviewLandingPage({ code }: { code: MetaAdRouteCode }) {
  return (
    <div className="overflow-hidden bg-[#f7f8f9] text-[#242529] selection:bg-[#414042]/15">
      <section className="relative mx-auto flex min-h-[760px] max-w-[1640px] flex-col justify-center px-6 pb-24 pt-36 sm:px-10 md:pt-44 lg:px-16">
        <div className="relative">
          <h1 className="max-w-[1360px] text-[clamp(3.2rem,6.8vw,7.2rem)] font-black uppercase leading-[1.09] tracking-[-0.055em] text-[#242529] md:leading-[1.06]">
            Rahasia
            <br />
            Transformasi Fisik
            <br />
            Instan & Efektif
            <br />
            Yang Lagi Viral Global
          </h1>

          <Image
            src={`${ASSET_BASE}/blue-vial.png`}
            alt="NAD+ vial"
            width={260}
            height={350}
            priority
            className="absolute right-[20%] top-[-3.6rem] hidden w-[15vw] max-w-[250px] rotate-[-4deg] drop-shadow-[0_30px_28px_rgba(0,0,0,0.12)] md:block"
          />
          <Image
            src={`${ASSET_BASE}/purple-vial.png`}
            alt="Retatrutide vial"
            width={320}
            height={370}
            priority
            className="absolute right-[2%] top-[11rem] hidden w-[17vw] max-w-[280px] rotate-[5deg] drop-shadow-[0_30px_28px_rgba(0,0,0,0.12)] md:block"
          />
        </div>
      </section>

      <section className="relative mx-auto max-w-[1540px] px-5 pb-28 sm:px-10 lg:px-16">
        <div className="relative rounded-[3.5rem] border border-[#d8dadd] bg-white px-6 py-16 shadow-[0_36px_80px_rgba(35,37,41,0.08)] sm:px-10 md:rounded-[5rem] md:px-20 md:py-24">
          <Image
            src={`${ASSET_BASE}/glutathione-vial.png`}
            alt="Glutathione vial"
            width={310}
            height={430}
            className="absolute -left-8 -top-24 hidden w-[18vw] max-w-[300px] drop-shadow-[0_28px_30px_rgba(0,0,0,0.12)] md:block"
          />
          <Image
            src={`${ASSET_BASE}/mots-vial.png`}
            alt="MOTS-C vial"
            width={270}
            height={390}
            className="absolute -right-6 bottom-0 hidden w-[16vw] max-w-[260px] translate-y-14 drop-shadow-[0_28px_30px_rgba(0,0,0,0.12)] md:block"
          />

          <div className="mx-auto max-w-[1060px] text-center">
            <h2 className="text-[clamp(2.25rem,4.4vw,4.7rem)] font-black uppercase leading-[0.95] tracking-[-0.045em] text-[#2b2c31]">
              Sebenarnya, Apa Sih
              <br />
              Peptides Itu?
            </h2>
            <div className="mx-auto mt-12 max-w-[900px] space-y-6 text-[clamp(0.95rem,1.45vw,1.35rem)] font-bold leading-[1.32] text-[#333438]">
              <p>
                Sederhananya, Peptides adalah versi mikro dari protein alami
                tubuh.
              </p>
              <p>
                Berbeda dengan suplemen biasa (susu/kapsul) yang harus dicerna
                berjam-jam di lambung, ukuran Peptides yang super kecil
                membuatnya langsung terserap 100% dan bekerja tepat sasaran ke
                area tubuh yang kamu tuju.
              </p>
              <p>
                Perlu ditekankan, peptides sangat berbeda dengan Steroid yang
                menggantikan hormon alami kita, melainkan Peptides memberikan
                "sinyal khusus" kepada tubuh untuk memproduksi hormon secara
                alami, sesuai dengan "goals" yang ingin kita kejar.
              </p>
            </div>

            <div className="mt-14 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
              {peptideBenefits.map((benefit) => {
                const Icon = benefit.icon;

                return (
                  <div
                    key={benefit.label}
                    className="flex flex-col items-center text-center"
                  >
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#d8dadd] bg-white text-[#c5c7ca] shadow-[inset_0_0_0_8px_rgba(247,248,249,0.9)]">
                      <Icon className="h-9 w-9 stroke-[1.6]" />
                    </div>
                    <p className="mt-5 whitespace-pre-line text-sm font-black leading-[1.05] tracking-[-0.02em] text-[#333438] md:text-base">
                      {benefit.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1540px] px-5 pb-28 pt-8 text-center sm:px-10 lg:px-16">
        <h2 className="text-[clamp(2.65rem,5vw,5.4rem)] font-medium uppercase leading-[1.02] tracking-[-0.055em] text-[#2b2c31]">
          Meta Wellness Giving
          <br />
          <span className="font-black">
            Results, <em className="italic">Not</em> Promises
          </span>
        </h2>

        <div className="mt-12 overflow-hidden rounded-[2.75rem] shadow-[0_34px_90px_rgba(35,37,41,0.08)] md:rounded-[4.25rem]">
          <Image
            src={`${ASSET_BASE}/result-body.png`}
            alt="Body transformation comparison preview"
            width={1520}
            height={780}
            className="h-auto w-full"
          />
        </div>

        <p className="mx-auto mt-12 max-w-[980px] text-[clamp(1rem,1.65vw,1.45rem)] font-black leading-[1.28] tracking-[-0.02em] text-[#333438]">
          Bukan Magic Medicine, Tapi Akselerator Goals-mu. Peptides tetap butuh
          dukungan pola hidup sehatmu. Namun, dia bekerja memangkas waktu
          perjalananmu, membuat prosesnya jauh lebih cepat, efektif, dan nyaman
          dijalani.
        </p>
      </section>

      <section className="mx-auto grid max-w-[1540px] items-center gap-12 px-6 py-28 sm:px-10 md:grid-cols-[0.72fr_1fr] lg:px-16">
        <h2 className="max-w-[540px] text-[clamp(2.85rem,5vw,5.8rem)] font-black uppercase leading-[0.95] tracking-[-0.06em] text-[#242529]">
          Transparan
          <br />
          & Teruji:
          <br />
          Purity &gt;99%
        </h2>

        <div className="rounded-[3.5rem] border border-[#dfe1e4] bg-white px-8 py-12 shadow-[0_32px_80px_rgba(35,37,41,0.07)] md:rounded-[5rem] md:px-20 md:py-20">
          <p className="max-w-[640px] text-[clamp(1.05rem,1.8vw,1.55rem)] font-bold leading-[1.2] tracking-[-0.02em] text-[#333438]">
            Bagi kami, kualitas adalah harga mati. Semua Peptides kami telah
            melewati uji lab independen dan terbukti memiliki kemurnian &gt;99%.
            Tidak ada yang disembunyikan. Sertifikat hasil lab lengkap bisa
            kamu akses secara transparan.
          </p>
          <Link
            href="/labtest"
            className="mt-10 inline-flex items-center rounded-full bg-[#414042] px-9 py-4 text-lg font-black text-white transition hover:-translate-y-0.5 hover:bg-[#2f3032]"
          >
            Lab Test Result
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1540px] items-center gap-12 px-6 pb-28 pt-20 sm:px-10 md:grid-cols-[0.98fr_0.72fr] lg:px-16">
        <div>
          <h2 className="text-[clamp(2.35rem,4.2vw,4.6rem)] font-normal uppercase leading-[1.02] tracking-[-0.055em] text-[#2b2c31]">
            More Than A <em className="italic">Seller</em>,{" "}
            <strong className="font-black italic">We Are</strong>
            <br />
            <strong className="font-black italic">
              Your Transformation
            </strong>
            <br />
            <strong className="font-black">Partner!</strong>
          </h2>

          <div className="mt-12 max-w-[770px] space-y-7 text-[clamp(1rem,1.55vw,1.38rem)] font-bold leading-[1.28] tracking-[-0.02em] text-[#333438]">
            <p>
              Kami tidak ingin sekedar menjual produk lalu pergi. Kami ingin
              menjadi "teman baru" yang siap mendampingi setiap langkah proses
              transformasimu sampai berhasil.
            </p>
            <p>
              Selama ini, kami bangga telah dipercaya oleh berbagai kalangan
              mulai dari dokter, fitness coach, binaragawan, hingga influencer.
              Dari mereka pula kami terus belajar dan menyempurnakan kualitas.
            </p>
            <p>
              Sekarang, giliranmu. Kami tunggu kamu untuk bergabung menjadi
              bagian dari wellness community kami!
            </p>
          </div>

          <Link
            href={consultationHref(code)}
            className="mt-12 inline-flex items-center gap-3 rounded-full bg-[#414042] px-9 py-4 text-lg font-black text-white transition hover:-translate-y-0.5 hover:bg-[#2f3032]"
          >
            Free Consultation
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <div className="relative mx-auto w-full max-w-[520px]">
          <div className="absolute inset-x-10 bottom-8 h-14 rounded-full bg-black/10 blur-2xl" />
          <Image
            src={`${ASSET_BASE}/chat-phone.png`}
            alt="Customer consultation chat preview"
            width={520}
            height={900}
            className="relative h-auto w-full"
          />
        </div>
      </section>
    </div>
  );
}
