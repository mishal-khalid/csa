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
// Preview images need the site's full public address: SITE_URL once the address is decided, until
// then the Vercel project's production domain (Vercel sets it at build time), and the local dev
// server on this machine.
const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const siteUrl = process.env.SITE_URL ?? (vercelDomain ? `https://${vercelDomain}` : "http://localhost:3100");

export const metadata = {
  metadataBase: new URL(siteUrl),
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
