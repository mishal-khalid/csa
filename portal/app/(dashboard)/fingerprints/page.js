import FingerprintManagement from "@/components/fingerprints/FingerprintManagement";

export const metadata = { title: "Fingerprint Management" };

// The Fingerprint Management tab (the main account only): fingerprints added, named, linked to
// accounts and deleted.
export default function FingerprintsPage() {
  return <FingerprintManagement />;
}
