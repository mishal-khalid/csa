import { notFound } from "next/navigation";
import ProfilePage from "@/components/organisation/ProfilePage";
import { profileBySlug, profilesIn } from "@/components/organisation/profiles";

// Each commission is prerendered. The address is read before rendering so an unknown one gets a
// real 404 (see the department pages for why instant is off).
export const instant = false;

export function generateStaticParams() {
  return profilesIn("commissions").map(({ slug }) => ({ body: slug }));
}

export async function generateMetadata({ params }) {
  const { body } = await params;
  const profile = profileBySlug("commissions", body);
  return { title: profile?.name, description: profile?.line };
}

export default async function CommissionPage({ params }) {
  const { body } = await params;
  const profile = profileBySlug("commissions", body);
  if (!profile) notFound();
  return <ProfilePage profile={profile} />;
}
