import { Carlito } from "next/font/google";
import localFont from "next/font/local";
import { EvaluationProvider } from "@/lib/evaluation";
import "./globals.css";

// The MJSCC instructor evaluation (mjscc.agee.pro): a phone app for the evaluating instructors. It
// shares nothing with the CSA sites in this repository but the API's server.

// Dhivehi in Faruma (the user's pick; the mock's MV Boli can't be used on a website)
const faruma = localFont({ src: "./fonts/Faruma.ttf", variable: "--font-faruma", display: "swap" });
// the students' names in Carlito, a free match for the mock's Calibri
const carlito = Carlito({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-carlito" });

export const metadata = {
  title: "އިންސްޓްރަކްޓަރުންގެ އިވެލުއޭޝަން",
  // for the evaluating instructors only
  robots: { index: false, follow: false },
};

export const viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }) {
  return (
    <html lang="dv" dir="rtl" className={`${faruma.variable} ${carlito.variable} antialiased`}>
      <body className="font-sans">
        {/* the seal, faint and oversized behind every page, as in the mock */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/seal.svg" alt="" className="absolute top-1/2 left-[-38%] w-[135%] max-w-none -translate-y-1/2 opacity-[0.06] grayscale" />
        </div>
        <EvaluationProvider>{children}</EvaluationProvider>
      </body>
    </html>
  );
}
