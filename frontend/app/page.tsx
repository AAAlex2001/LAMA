import Hero from "./landing/hero/hero";
import Advantages from "./landing/advantages/advantages";
import Users from "./landing/users/users";

export default function Home() {
  return (
    <main>
      <Hero />
      <Advantages />
      <Users />
    </main>
  );
}