import './LandingPage.css';
import HeroSection from './components/Landing/HeroSection';
import ProblemSection from './components/Landing/ProblemSection';
import SignalSection from './components/Landing/SignalSection';
import FlowSection from './components/Landing/FlowSection';
import AlertSection from './components/Landing/AlertSection';
import RolesSection from './components/Landing/RolesSection';
import StatsSection from './components/Landing/StatsSection';
import PricingSection from './components/Landing/PricingSection';
import CtaFooter from './components/Landing/CtaFooter';

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <ProblemSection />
      <SignalSection />
      <FlowSection />
      <AlertSection />
      <RolesSection />
      <StatsSection />
      <PricingSection />
      <CtaFooter />
    </>
  );
}
