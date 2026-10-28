import { notFound } from "next/navigation";
import ProfilePage from "@/components/organisation/ProfilePage";
import { profileBySlug, profilesIn } from "@/components/organisation/profiles";

// Each service is prerendered. The address is read before rendering so an unknown one gets a
// real 404 (see the department pages for why instant is off).
export const instant = false;

export function generateStaticParams() {
  return profilesIn("services").map(({ slug }) => ({ body: slug }));
}

export async function generateMetadata({ params }) {
  const { body } = await params;
  const profile = profileBySlug("services", body);
  return { title: profile?.name, description: profile?.line };
}

export default async function ServicePage({ params }) {
  const { body } = await params;
  const profile = profileBySlug("services", body);
  if (!profile) notFound();
  return <ProfilePage profile={profile} />;
}
