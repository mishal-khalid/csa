import Footer from "@/components/footer/Footer";

// Every page except the landing page: the plain footer, without the landing page's contact card.
// The (pages) folder is a route group, so it doesn't appear in the address.
export default function PagesLayout({ children }) {
  return (
    <>
      {children}
      <Footer />
    </>
  );
}
