import { HeroSection } from "@/components/marketing/hero-section";
import { SoftwareApplicationSchema } from "@/components/shared/json-ld";

export default function HomePage() {
  return (
    <>
      <SoftwareApplicationSchema />
      <HeroSection />
    </>
  );
}
