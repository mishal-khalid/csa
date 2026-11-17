import "./globals.css";

// The Ethos documents portal (ethos.agee.pro, in-world ethos.com.csa): one page, a grid of the Ethos
// Group's documents, each opening its PDF in the browser's own viewer. It shares nothing with the
// CSA sites in this repository.

// Link previews need the full public address: SITE_URL if set, else the Vercel project's production
// domain (Vercel sets it at build time), else the local dev server.
const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const siteUrl = process.env.SITE_URL ?? (vercelDomain ? `https://${vercelDomain}` : "http://localhost:3500");

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: "Documents · Ethos Group of Companies",
  description: "Documents of the Ethos Group of Companies and its member companies.",
  openGraph: {
    siteName: "Ethos Group of Companies",
    type: "website",
    images: [{ url: "/link-preview.png", width: 1200, height: 630, alt: "The Ethos Group of Companies logo" }],
  },
  twitter: { card: "summary_large_image" },
  // kept out of search engines like the other sites here; next.config.mjs also covers the PDFs
  robots: { index: false, follow: false },
};

export const viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="antialiased">
      <body className="font-sans">{children}</body>
    </html>
  );
}
