import { auth0, isAuthConfigured } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { OnboardingPage } from "@/components/onboarding/onboarding-page";

export default async function OnboardingRoute() {
  if (isAuthConfigured()) {
    const session = await auth0.getSession();
    if (!session) redirect("/login");
    return (
      <OnboardingPage
        user={{
          name: session.user.name ?? undefined,
          email: session.user.email ?? undefined,
        }}
      />
    );
  }
  return <OnboardingPage user={{}} />;
}
