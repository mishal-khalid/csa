import Image from "next/image";
import BlurTypeIn from "./BlurTypeIn";

const heading = "Securing peace and order across the continents";
// also the site's description for search engines and link previews (see app/layout.js)
export const intro =
  "A legislature, an executive and an independent judiciary, each answerable to the law and recorded openly in the CSA Gazette.";

// Pinned behind the page: the sections after it slide up and cover it.
// data-nav-surface tells the nav it's sitting over a photo.
export default function Hero() {
  return (
    <section
      data-nav-surface="photo"
      className="sticky top-0 flex h-svh items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0">
        <Image
          src="/images/hero-building.jpg"
          alt=""
          fill
          preload
          sizes="100vw"
          className="object-cover object-top"
        />
        {/* light wash over the photo, as in the mockup */}
        <div className="absolute inset-0 bg-white/20" />
      </div>

      {/* a faint shadow under the white text keeps it readable over the bright parts of the photo */}
      <div className="relative px-6 text-center text-white text-shadow-[0_1px_2px_rgba(11,11,12,0.2),0_2px_18px_rgba(11,11,12,0.16)]">
        <h1 className="mx-auto max-w-[1100px] text-balance font-serif text-[clamp(3rem,6vw,5.5rem)] font-bold leading-[1.15]">
          <BlurTypeIn text={heading} />
        </h1>
        <p className="mx-auto mt-12 max-w-[720px] font-serif text-xl font-semibold leading-[1.9]">
          {intro}
        </p>
      </div>
    </section>
  );
}
