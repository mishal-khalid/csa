import Hero from "@/components/Hero";
import WhoWeAre from "@/components/who-we-are/WhoWeAre";
import Stats from "@/components/stats/Stats";
import Explore from "@/components/explore/Explore";
import Footer from "@/components/footer/Footer";

export default function Home() {
  return (
    <>
      <main>
        <Hero />

        {/* everything after the hero sits above it, so it slides up and swallows the pinned hero.
            overflow-clip (not hidden) rounds the top without breaking sticky children */}
        <div data-nav-surface="light" className="relative z-10 overflow-clip rounded-t-[40px]">
          <WhoWeAre />
          <Stats />
          <Explore />
        </div>
      </main>

      {/* only the landing page has the contact card over the footer */}
      <Footer withCard />
    </>
  );
}
