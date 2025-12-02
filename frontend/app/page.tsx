import Hero from "./landing/hero/hero";
import Advantages from "./landing/advantages/advantages";
import Users from "./landing/users/users";
import KeyAdvantages from "./landing/key-advantages/key-advantages";
import Pricing from "./landing/pricing/pricing";
import FAQ from "./landing/faq/faq";

export default function Home() {
  return (
    <main>
      <Hero />
      <Advantages />
      <Users />
      <KeyAdvantages />
      <Pricing />
      <FAQ />
    </main>
  );
}