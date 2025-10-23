import { HeroBanner } from "@/components/sections/hero-banner"
import { CategoryIcons } from "@/components/sections/category-icons"
import { SearchBar } from "@/components/sections/search-bar"
import { FeaturedEventsSection } from "@/components/sections/featured-events-section"
import { BackgroundWrapper } from "@/components/ui/background-wrapper"

export default function Home() {
  return (
    <BackgroundWrapper fullHeight={false}>
      {/* Hero Banner */}
      <HeroBanner />
      
      {/* Category Icons */}
      <CategoryIcons />
      
      {/* Search Bar */}
      <SearchBar />
      
      {/* Featured Events Section */}
      <FeaturedEventsSection />
    </BackgroundWrapper>
  )
}
