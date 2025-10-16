// import { HeroSection } from "@/components/sections/hero-section"
import { FeaturedEventsSection } from "@/components/sections/featured-events-section"
import { BackgroundWrapper } from "@/components/ui/background-wrapper"

export default function Home() {
  return (
    <BackgroundWrapper fullHeight={false}>

            {/* Featured Events Section */}
      <FeaturedEventsSection />
      {/* Hero Section */}
      {/* <HeroSection /> */}


    </BackgroundWrapper>
  )
}
