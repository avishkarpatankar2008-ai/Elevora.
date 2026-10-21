import { OndaLanding } from "./onda/OndaLanding";

/**
 * The public route deliberately uses the supplied Onda template's original
 * document hierarchy, layout values, and scroll choreography. Application
 * actions inside the template link to the existing ELEVORA auth and interview
 * routes; no mock product results are rendered here.
 */
export default function LandingPage() {
  return <OndaLanding />;
}
