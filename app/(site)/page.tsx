import Hero from "@/components/Hero";
import Intro from "@/components/Intro";
import Features from "@/components/Features";
import AppCTA from "@/components/AppCTA";
import Footer from "@/components/Footer";
import JoinLayer from "@/components/join/JoinLayer";

export default function Home() {
  return (
    // Reveal's horizontal entrance offsets sit off-frame until they animate in;
    // clip them here. Not on html/body — those propagate their overflow to the
    // viewport, so the page stays scrollable. `clip` keeps the vertical axis
    // `visible`, creating no scroll container, and leaves the fixed mark alone.
    <main className="overflow-x-clip">
      <Hero />
      <Intro />
      <Features />
      <AppCTA />
      <Footer />
      <JoinLayer />
    </main>
  );
}
