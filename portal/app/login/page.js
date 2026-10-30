import Image from "next/image";
import LoginForm from "@/components/LoginForm";

const intro = "Login to the official citizen portal of the Continental Security Agency using your login.";

export const metadata = { title: "Login", description: intro };

// The CSA Portal's login page (portal.agee.pro/login). The user's design: a photo of
// the building across the bottom of the page, the heading on the right with a thin rule under it,
// and the login form in a frosted glass card on the left (the nav's glass), standing over both the
// white and the photo so the photo shows blurred through its lower part. No nav; the loading screen
// still comes first. On phones the heading comes first and the card sits below it, over the photo.
export default function PortalLoginPage() {
  return (
    <main className="relative isolate flex min-h-svh flex-col overflow-hidden bg-white text-ink lg:block lg:h-svh lg:min-h-[44rem]">
      {/* the photo across the bottom */}
      <div className="absolute inset-x-0 bottom-0 -z-10 h-[45%] lg:h-[37%]">
        <Image
          src="/images/portal-building.jpg"
          alt=""
          fill
          preload
          sizes="100vw"
          className="object-cover object-[center_40%]"
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-4 sm:px-6 lg:block lg:h-full">
        {/* the heading, in the white above the photo, with the rule under it running across the page
            (behind the card) */}
        <div className="pt-28 lg:flex lg:h-[63%] lg:flex-col lg:justify-end lg:pb-[7.5rem] lg:pt-0">
          <header className="text-right lg:ml-auto lg:w-[42%]">
            <h1 className="font-serif text-6xl font-semibold leading-[0.95] tracking-tight sm:text-7xl lg:text-[6.5rem] xl:text-[8rem]">
              {/* broken after "to" at every size, as in the design */}
              Login to
              <br />
              the CSA
            </h1>
            <p className="ml-auto mt-6 max-w-[28rem] text-lg text-ink/60 lg:mt-8 lg:text-xl">{intro}</p>
          </header>
        </div>
        <span
          aria-hidden="true"
          className="mt-10 block h-px bg-ink/10 lg:absolute lg:inset-x-6 lg:bottom-[calc(37%+4.75rem)] lg:mt-0"
        />

        {/* the glass card with the form */}
        <section
          aria-label="Login"
          className="my-8 flex items-center justify-center rounded-[32px] border border-white/70 bg-neutral-100/85 px-6 py-12 shadow-[0_1px_2px_rgba(11,11,12,0.04)] backdrop-blur-xl sm:px-10 lg:absolute lg:bottom-8 lg:left-6 lg:top-24 lg:my-0 lg:w-[calc((100%-3rem)*0.58)]"
        >
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
