import GazetteRegister from "@/components/gazette/GazetteRegister";

export const metadata = { title: "Gazette" };

// The Gazette tab (admins only): the Gazette Register, and New Document to publish the next one.
export default function GazettePage() {
  return <GazetteRegister />;
}
