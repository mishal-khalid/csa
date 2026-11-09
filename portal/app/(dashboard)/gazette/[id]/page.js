import GazetteEditor from "@/components/gazette/GazetteEditor";

export const metadata = { title: "Gazette document" };

// One Gazette document: a draft being made and checked, or a published document's Register entry.
export default async function GazetteDocumentPage({ params }) {
  const { id } = await params;
  return <GazetteEditor id={id} />;
}
