import { SignUp } from '@clerk/nextjs';
import { BackgroundWrapper } from '@/components/ui/background-wrapper';

export default function SignUpPage() {
  return (
    <BackgroundWrapper fullHeight={true} className="flex items-center justify-center">
      <div className="bg-white/10 backdrop-blur-sm p-8 rounded-lg shadow-lg border border-white/20">
        <SignUp
          path="/auth/signup"
          routing="path"
          signInUrl="/auth/signin"
          fallbackRedirectUrl="/"
        />
      </div>
    </BackgroundWrapper>
  );
}