import { Crimson_Pro, Inter } from "next/font/google";
import PageLoader from "@/components/loader/PageLoader";
import ImageGuard from "@/components/ImageGuard";
import "./globals.css";

// The CSA Portal (portal.csa.org; for now portal.agee.pro), a separate app from the main site in
// ../frontend. It shares the site's fonts, colours and loading screen, copied across.

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const crimsonPro = Crimson_Pro({
  variable: "--font-crimson-pro",
  subsets: ["latin"],
});

// Page addresses for link previews: SITE_URL once the address is decided, until then the Vercel
// project's production domain (Vercel sets it at build time), and the local dev server.
const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const siteUrl = process.env.SITE_URL ?? (vercelDomain ? `https://${vercelDomain}` : "http://localhost:3200");

export const metadata = {
  metadataBase: new URL(siteUrl),
  // pages set just their own name; the template adds the agency's
  title: { template: "%s · Continental Security Agency", default: "Continental Security Agency" },
  // kept out of search engines, like the main site
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return (
    // data-loading: the login page opens under the loading screen, which clears it as it lifts; a
    // signed-in page clears it at once (see PageLoader)
    <html lang="en" data-loading="" className={`${inter.variable} ${crimsonPro.variable} antialiased`}>
      <body className="font-sans">
        <PageLoader />
        {/* without JavaScript the loading screen could never lift, so it isn't shown */}
        <noscript
          dangerouslySetInnerHTML={{
            __html: "<style>#page-loader{display:none}html[data-loading] *{animation-play-state:running!important}</style>",
          }}
        />
        <ImageGuard />
        {children}
      </body>
    </html>
  );
}
