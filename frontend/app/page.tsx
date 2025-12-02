import Header from "./landing/header/header";
import Hero from "./landing/hero/hero";
import Advantages from "./landing/advantages/advantages";
import Users from "./landing/users/users";
import KeyAdvantages from "./landing/key-advantages/key-advantages";
import Pricing from "./landing/pricing/pricing";
import FAQ from "./landing/faq/faq";
import FAQDecoration from "./landing/faq-decoration/faq-decoration";
import Lama from "./landing/lama/lama";
import MarqueeComponent from "./landing/marquee/marquee";
import Footer from "./landing/footer/footer";

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <Advantages />
      <Users />
      <KeyAdvantages />
      <Pricing />
      <FAQ />
      <FAQDecoration />
      <Lama />
      <MarqueeComponent />
      <Footer />
    </main>
  );
}