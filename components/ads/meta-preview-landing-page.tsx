import Image from "next/image";
import Link from "next/link";
import { LoopingVideo } from "./looping-video";
import { TestimonyCarousel } from "./testimony-carousel";

export const META_AD_ROUTE_CODES = [
  "mw-fit-a7x2",
  "mw-fit-b9m4",
  "mw-fit-c3q8",
] as const;

export type MetaAdRouteCode = (typeof META_AD_ROUTE_CODES)[number];

const ASSET_BASE = "/ads/meta-fit";

type AdSectionLink = {
  href: string;
  label: string;
  className: string;
};

type AdImageSection = {
  id: string;
  fileName: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  links?: AdSectionLink[];
  ctaLabel?: string;
  ctaClassName?: string;
  /** Extra classes on the outer <section> wrapper, e.g. for margin */
  sectionClassName?: string;
  /** Scale the image without changing section size. e.g. 1.3 = 30% zoom */
  imageScale?: number;
};

type AdCarouselSection = {
  id: string;
  type: "carousel";
  ctaLabel?: string;
  ctaClassName?: string;
};

type AdVideoSection = {
  id: string;
  type: "video";
  fileName: string;
  ctaLabel?: string;
  ctaClassName?: string;
};

type AdHtmlSection = {
  id: string;
  type: "html";
  ctaLabel?: string;
  ctaClassName?: string;
};

type AdSection = AdImageSection | AdCarouselSection | AdVideoSection | AdHtmlSection;

function isCarouselSection(s: AdSection): s is AdCarouselSection {
  return "type" in s && s.type === "carousel";
}

function isVideoSection(s: AdSection): s is AdVideoSection {
  return "type" in s && s.type === "video";
}

function isHtmlSection(s: AdSection): s is AdHtmlSection {
  return "type" in s && s.type === "html";
}

function consultationHref(code: MetaAdRouteCode) {
  const params = new URLSearchParams({
    utm_source: "meta_ads",
    utm_medium: "landing_page",
    utm_campaign: code,
    utm_content: "landing_page_meta_preview_4",
  });

  return `/free-consultation?${params.toString()}`;
}

function landingImageSections(code: MetaAdRouteCode): AdSection[] {
  return [
    {
      id: "hero",
      fileName: "hero.png",
      alt: "MetaWellness hero section",
      width: 1920,
      height: 1080,
      priority: true,
    },
    {
      id: "what-is-peptide",
      fileName: "whatispeptide.png",
      alt: "What peptides are and peptide benefits",
      width: 8000,
      height: 4500,
      ctaLabel: "Saya mau informasi detail tentang peptides",
      ctaClassName: "mb-12 sm:mb-18",
      sectionClassName: "relative left-1/2 w-screen -translate-x-1/2",
    },
    {
      id: "results-heading",
      type: "video",
      fileName: "result-shell.mp4",
    },
    {
      id: "result-caption",
      type: "html",
      ctaLabel: "Saya mau hasil nyata - Konsultasi Gratis",
    },
    {
      id: "purity",
      fileName: "purity.png",
      alt: "Purity and lab test section",
      width: 1920,
      height: 1080,
      links: [
        {
          href: "/labtest",
          label: "Open lab test result",
          className:
            "absolute left-[58.8%] top-[62.2%] h-[7%] w-[16.2%] rounded-full focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#414042]",
        },
      ],
      imageScale: 1.3,
      sectionClassName: "my-10 sm:my-14",
    },
    {
      id: "chat-proof",
      type: "carousel",
    },
    {
      id: "partner-cta",
      type: "html",
      ctaLabel: "Saya mau konsultasi seperti mereka - Gratis!",
    },
  ];
}

function ResultCaptionHtml() {
  return (
    <div className="bg-white px-8 py-16 text-center text-[#242529] sm:px-16 sm:py-24">
      <p className="mx-auto max-w-3xl text-lg leading-relaxed text-[#242529] sm:text-xl lg:text-2xl">
        <strong>Bukan Magic Medicine, Tapi Akselerator Goals-mu.</strong> Peptides
        tetap butuh dukungan pola hidup sehatmu. Namun, dia bekerja memangkas
        waktu perjalananmu, membuat prosesnya jauh lebih cepat, efektif, dan
        nyaman dijalani.
      </p>
    </div>
  );
}

function PartnerCtaHtml() {
  return (
    <div className="bg-white px-8 pb-16 pt-6 text-center text-[#242529] sm:px-16 sm:pb-24 sm:pt-8 lg:px-32">
      <h2 className="mx-auto max-w-3xl text-4xl font-black uppercase leading-tight tracking-tight sm:text-5xl lg:text-6xl">
        More than <em className="font-black not-italic italic">a seller,</em>{" "}
        <strong className="font-black italic">we are your</strong>{" "}
        transformation partner!
      </h2>

      <div className="mx-auto mt-10 max-w-2xl space-y-5 text-left text-base leading-relaxed text-[#242529] sm:text-lg">
        <p>
          Kami tidak ingin sekedar menjual produk lalu pergi. Kami ingin menjadi
          &ldquo;teman baru&rdquo; yang siap mendampingi setiap langkah proses
          transformasimu sampai berhasil.
        </p>
        <p>
          Selama ini, kami bangga telah dipercaya oleh berbagai kalangan mulai
          dari dokter, fitness coach, binaragawan, hingga influencer. Dari mereka
          pula kami terus belajar dan menyempurnakan kualitas.
        </p>
        <p>
          Sekarang, giliranmu. Kami tunggu kamu untuk bergabung menjadi bagian
          dari wellness community kami!
        </p>
      </div>
    </div>
  );
}

export function MetaPreviewLandingPage({ code }: { code: MetaAdRouteCode }) {
  const sections = landingImageSections(code);
  const href = consultationHref(code);

  return (
    <div className="bg-white text-[#242529] selection:bg-[#414042]/15">
      <main className="mx-auto w-full max-w-[1920px]">
        <div className="sr-only">
          <h1>
            Rahasia transformasi fisik instan dan efektif yang lagi viral
            global.
          </h1>
          <p>
            Sederhananya, peptides adalah versi mikro dari protein alami tubuh
            yang bekerja tepat sasaran sesuai goals yang ingin dikejar.
          </p>
          <p>
            MetaWellness memberi hasil, bukan janji. Peptides tetap membutuhkan
            dukungan pola hidup sehat, namun membantu membuat proses lebih
            cepat, efektif, dan nyaman dijalani.
          </p>
          <p>
            Semua peptides telah melewati uji lab Eropa dan terbukti
            memiliki kemurnian di atas 99%.
          </p>
          <p>
            MetaWellness hadir sebagai transformation partner dengan free
            consultation untuk membantu memilih peptide sesuai kebutuhan.
          </p>
        </div>

        {sections.map((section) => (
          <section
            key={section.id}
            data-ad-section={section.id}
            className={`relative${"sectionClassName" in section && section.sectionClassName ? ` ${section.sectionClassName}` : ""}`}
          >
            {isCarouselSection(section) ? (
              <TestimonyCarousel />
            ) : isVideoSection(section) ? (
              <LoopingVideo
                src={`${ASSET_BASE}/${section.fileName}`}
                className="block h-auto w-full select-none"
              />
            ) : isHtmlSection(section) ? (
              section.id === "result-caption" ? (
                <ResultCaptionHtml />
              ) : (
                <PartnerCtaHtml />
              )
            ) : (
              <>
                <div className={section.imageScale ? "overflow-hidden" : undefined}>
                  <Image
                    src={`${ASSET_BASE}/${section.fileName}`}
                    alt={section.alt}
                    width={section.width}
                    height={section.height}
                    priority={section.priority}
                    sizes="100vw"
                    style={
                      section.imageScale
                        ? { transform: `scale(${section.imageScale})` }
                        : undefined
                    }
                    className="block h-auto w-full select-none"
                  />
                </div>

                {section.links?.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    aria-label={link.label}
                    className={link.className}
                  >
                    <span className="sr-only">{link.label}</span>
                  </Link>
                ))}
              </>
            )}

            {section.ctaLabel && (
              <div
                className={`flex justify-center bg-white py-6 sm:py-8${section.ctaClassName ? ` ${section.ctaClassName}` : ""
                  }`}
              >
                <Link
                  href={href}
                  className="inline-flex items-center rounded-full bg-[#414042] px-8 py-4 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:bg-[#242529] hover:shadow-xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#414042] active:scale-95 sm:text-base"
                >
                  {section.ctaLabel}
                </Link>
              </div>
            )}
          </section>
        ))}
      </main>
    </div>
  );
}
