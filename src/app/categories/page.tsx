import { BackgroundWrapper } from '@/components/ui/background-wrapper'

export default function CategoriesPage() {
  return (
    <BackgroundWrapper fullHeight={true}>
      <div className="container mx-auto p-6">
        <div className="bg-white/20 backdrop-blur-lg rounded-xl p-8 border border-white/30 shadow-xl max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-white drop-shadow-lg">Event Categories</h1>
          <p className="text-white/90 drop-shadow-md text-lg leading-relaxed mb-8">
            Browse events by category to find exactly what you&apos;re looking for.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {['Rock & Pop', 'Jazz & Blues', 'Classical', 'Electronic', 'Hip-Hop', 'Country'].map((category) => (
              <div key={category} className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:bg-white/20 transition-all duration-200 cursor-pointer">
                <h3 className="text-xl font-semibold text-white mb-2">{category}</h3>
                <p className="text-white/80">Discover amazing {category.toLowerCase()} events</p>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <p className="text-white/70 text-sm">More categories and filtering options coming soon!</p>
          </div>
        </div>
      </div>
    </BackgroundWrapper>
  );
}