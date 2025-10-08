import { BackgroundWrapper } from '@/components/ui/background-wrapper'

export default function AboutPage() {
  return (
    <BackgroundWrapper fullHeight={true}>
      <div className="container mx-auto p-6">
        <div className="bg-white/20 backdrop-blur-lg rounded-xl p-8 border border-white/30 shadow-xl max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-white drop-shadow-lg">About BiletAra</h1>
          <p className="text-white/90 drop-shadow-md text-lg leading-relaxed">
            Your ultimate destination for concert tickets and live music experiences. We connect music lovers with their favorite artists and unforgettable live performances.
          </p>
          <div className="mt-6 text-white/80 drop-shadow-sm">
            <p className="mb-4">
              BiletAra is more than just a ticketing platform - we&apos;re passionate about bringing people together through the power of live music. Our platform makes it easy to discover, book, and enjoy incredible live performances.
            </p>
            <p>
              Join thousands of music enthusiasts who trust BiletAra for their concert ticket needs. Experience the magic of live music with us!
            </p>
          </div>
        </div>
      </div>
    </BackgroundWrapper>
  );
}