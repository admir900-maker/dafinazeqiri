import { BackgroundWrapper } from '@/components/ui/background-wrapper';
import { getSiteConfig } from '@/lib/settings';
import { Metadata } from 'next';

// Generate dynamic metadata
export async function generateMetadata(): Promise<Metadata> {
  const siteConfig = await getSiteConfig();

  return {
    title: `About ${siteConfig.siteName}`,
    description: `Learn about ${siteConfig.siteName} - Your ultimate destination for event tickets and live experiences.`,
    openGraph: {
      title: `About ${siteConfig.siteName}`,
      description: `Learn about ${siteConfig.siteName} - Your ultimate destination for event tickets and live experiences.`,
    },
  };
}

export default async function AboutPage() {
  const siteConfig = await getSiteConfig();

  return (
    <BackgroundWrapper fullHeight={true}>
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-white drop-shadow-lg">
              About {siteConfig.siteName}
            </h1>
            <p className="text-xl md:text-2xl text-white/90 drop-shadow-md max-w-3xl mx-auto leading-relaxed">
              Your ultimate destination for event tickets and unforgettable live experiences.
            </p>
          </div>

          {/* Main Content Grid */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Mission Section */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-xl">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white">Our Mission</h2>
              </div>
              <p className="text-white/90 leading-relaxed">
                At {siteConfig.siteName}, we believe that live events have the power to bring people together,
                create lasting memories, and transform communities. Our mission is to make discovering and
                attending incredible live experiences as seamless as possible.
              </p>
            </div>

            {/* Platform Section */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-xl">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white">Our Platform</h2>
              </div>
              <p className="text-white/90 leading-relaxed">
                More than just a ticketing platform, {siteConfig.siteName} is a comprehensive event ecosystem
                that connects event organizers with passionate attendees, ensuring every experience is
                memorable and every transaction is secure.
              </p>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Easy Booking</h3>
              <p className="text-white/80 text-sm">
                Streamlined booking process with secure payment options and instant confirmation.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Secure Payments</h3>
              <p className="text-white/80 text-sm">
                Industry-standard security with multiple payment options for your convenience.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Passionate Community</h3>
              <p className="text-white/80 text-sm">
                Join thousands of event enthusiasts who trust us for their live experience needs.
              </p>
            </div>
          </div>

          {/* Stats Section */}
          <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-xl mb-16">
            <h2 className="text-3xl font-bold text-white text-center mb-8">Why Choose {siteConfig.siteName}?</h2>
            <div className="grid md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-white mb-2">24/7</div>
                <p className="text-white/80">Customer Support</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-white mb-2">100%</div>
                <p className="text-white/80">Secure Transactions</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-white mb-2">1000+</div>
                <p className="text-white/80">Happy Customers</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-white mb-2">500+</div>
                <p className="text-white/80">Events Hosted</p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-xl text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to Experience Something Amazing?</h2>
            <p className="text-white/90 mb-6 max-w-2xl mx-auto">
              Join the {siteConfig.siteName} community today and discover your next unforgettable live experience.
              From intimate concerts to grand festivals, we have something for everyone.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/events"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Browse Events
              </a>
              <a
                href="/contact"
                className="bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-8 rounded-lg border border-white/30 transition-all duration-300 backdrop-blur-sm"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </BackgroundWrapper>
  );
}