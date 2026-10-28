import { Crimson_Pro, Inter } from "next/font/google";
import Navbar from "@/components/navbar/Navbar";
import SmoothScroll from "@/components/SmoothScroll";
import ScrollReset from "@/components/ScrollReset";
import ImageGuard from "@/components/ImageGuard";
import { intro as siteDescription } from "@/components/Hero";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const crimsonPro = Crimson_Pro({
  variable: "--font-crimson-pro",
  subsets: ["latin"],
  // the italic is for the Gazette's editorial headings
  style: ["normal", "italic"],
});

// The site's metadata. Each page sets its own title and description; link previews pick both up,
// and every page shares the preview image and the icons (app/icon.svg, favicon.ico, apple-icon.png).
// SITE_URL is the site's public address, which preview images need in full; it isn't decided yet,
// so it falls back to the local dev server.
export const metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3100"),
  // inner pages set just their own name; the template adds the agency's
  title: { template: "%s · Continental Security Agency", default: "Continental Security Agency" },
  description: siteDescription,
  // the preview image is set here rather than as app/opengraph-image.jpg because Turbopack ignores
  // that file's alt text
  openGraph: {
    siteName: "Continental Security Agency",
    type: "website",
    images: [{ url: "/images/link-preview.jpg", width: 1200, height: 630, alt: "The Continental Security Agency letterhead" }],
  },
  twitter: { card: "summary_large_image" },
  // kept out of search engines (the user's choice); next.config.mjs also covers the PDFs and images
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${crimsonPro.variable} antialiased`}
    >
      <body className="font-sans">
        <SmoothScroll />
        <ScrollReset />
        <ImageGuard />
        <Navbar />
        {children}
      </body>
    </html>
  );
}
