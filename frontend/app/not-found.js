import Link from "next/link";
import Footer from "@/components/footer/Footer";

export const metadata = { title: "Page not found" };

function FingerprintIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M18.9 6.6A8.5 8.5 0 0 0 5.1 6.6M3.6 12.6a8.5 8.5 0 0 1 .6-3.2M20.4 11.5v1a12 12 0 0 1-.9 4.6M5.4 17a10 10 0 0 0 .6-3.6v-1.2a6 6 0 0 1 11.6-2.2M8.2 20a12 12 0 0 0 1.3-5.5v-2.3a2.5 2.5 0 0 1 5 0v1.6M12 12.4v2.4a14 14 0 0 1-1.6 6.6M14.5 17.2a15 15 0 0 1-1.1 4M18 12.4v1.2a13 13 0 0 1-1.3 5.6" />
    </svg>
  );
}

// Shown for any address the site doesn't have. A black screen with a planet's edge catching the
// light behind a large "404", then the footer on the same black. data-nav-surface keeps the nav smoky.
export default function NotFound() {
  return (
    <div className="bg-ink text-white">
      <main
        data-nav-surface="dark"
        className="relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 pb-16 pt-32 text-center"
      >
        <div className="relative">
          {/* the planet: a black disc whose top edge glows, wider than the screen so its sides fall away */}
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-[58%] -z-10 aspect-square w-[115vw] -translate-x-1/2 rounded-full bg-ink shadow-[0_-1px_0_rgb(255_255_255/0.65),0_-6px_24px_rgb(255_255_255/0.2),0_-30px_120px_rgb(255_255_255/0.08)]"
          />
          <h1 className="text-[clamp(7rem,22vw,16rem)] font-medium leading-none tracking-tight">404</h1>
        </div>

        <p className="mt-12 text-xl sm:text-2xl">It seems you got a little bit lost</p>

        <Link
          href="/"
          className="mt-20 flex flex-col items-center gap-4 text-white/60 transition-colors duration-300 hover:text-white"
        >
          <FingerprintIcon className="size-10 text-white" />
          Go back to homepage
        </Link>
      </main>

      <Footer />
    </div>
  );
}
