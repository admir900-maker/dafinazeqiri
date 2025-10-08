import { BackgroundWrapper } from '@/components/ui/background-wrapper'

export default function ContactPage() {
  return (
    <BackgroundWrapper fullHeight={true}>
      <div className="container mx-auto p-6">
        <div className="bg-white/20 backdrop-blur-lg rounded-xl p-8 border border-white/30 shadow-xl max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-white drop-shadow-lg">Contact Us</h1>
          <div className="text-white/90 drop-shadow-md space-y-4">
            <p className="text-lg">
              Get in touch with the BiletAra team. We&apos;re here to help with any questions about tickets, events, or our platform.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                <h3 className="text-xl font-semibold mb-3 text-white">Customer Support</h3>
                <p className="text-white/80 mb-2">📧 support@biletara.com</p>
                <p className="text-white/80">📞 +1 (555) 123-4567</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                <h3 className="text-xl font-semibold mb-3 text-white">Business Inquiries</h3>
                <p className="text-white/80 mb-2">📧 business@biletara.com</p>
                <p className="text-white/80">📞 +1 (555) 987-6543</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BackgroundWrapper>
  );
}