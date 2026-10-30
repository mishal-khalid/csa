import { Suspense } from "react";
import { DirectorySkeleton } from "@/components/dashboard/skeletons";
import Directory from "@/components/directory/Directory";

export const metadata = { title: "Directory" };

// The Directory tab: everything under the CSA, in folders and inside one another. (Suspense,
// because the picked entry is read from the address.)
export default function DirectoryPage() {
  return (
    <Suspense fallback={<DirectorySkeleton />}>
      <Directory />
    </Suspense>
  );
}
