import GazetteIndex from "@/components/gazette/GazetteIndex";

// Draft copy, still to be approved.
const intro = "The official record of the CSA.";

export const metadata = { title: "The CSA Gazette", description: intro };

// The Gazette. Its header is an editorial headline mixing type: "The CSA" in the sans and
// "Gazette" in italic serif, over a soft gold glow. Then the searchable archive.
export default function GazettePage() {
  return (
    <main className="text-ink">
      <header className="relative isolate overflow-hidden bg-white px-4 pb-20 pt-40 text-center sm:px-6 lg:pb-28 lg:pt-52">
        {/* the soft gold glow behind the headline */}
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-0 -z-10 h-[44rem] w-[64rem] max-w-[160%] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[radial-gradient(closest-side,rgb(201_162_63/0.28),rgb(201_162_63/0.08)_55%,transparent)]"
        />
        <h1 className="mx-auto leading-[0.9]">
          <span className="block text-7xl font-medium tracking-tight sm:text-8xl lg:text-9xl">The CSA</span>
          <span className="mt-2 block font-serif text-8xl italic tracking-tight sm:text-9xl lg:text-[10rem]">Gazette</span>
        </h1>
        <p className="mx-auto mt-10 max-w-xl text-xl text-ink/60">{intro}</p>
      </header>

      <section aria-label="The archive" className="px-4 pb-24 sm:px-6 lg:pb-32">
        <div className="mx-auto max-w-[1200px]">
          <GazetteIndex />
        </div>
      </section>
    </main>
  );
}
