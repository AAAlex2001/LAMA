'use client';

import { LocaleProvider } from '../locale-context';
import Header from "./header/header";
import Hero from "./hero/hero";
import Advantages from "./advantages/advantages";

export default function LandingPage() {
  return (
    <LocaleProvider>
      <main>
        <Header />
        <Hero />
        <Advantages />
      </main>
    </LocaleProvider>
  );
}


