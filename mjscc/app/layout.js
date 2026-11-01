import { Carlito } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

// The MJSCC instructor evaluation (mjscc.agee.pro): a phone app for the evaluating instructors, in
// (evaluation), plus the Instructor Platoon's syllabus for anyone with the link (/syllabus). It
// shares nothing with the CSA sites in this repository but the API's server.

// Dhivehi in Faruma (the user's pick; the mock's MV Boli can't be used on a website)
const faruma = localFont({ src: "./fonts/Faruma.ttf", variable: "--font-faruma", display: "swap" });
// the students' names in Carlito, a free match for the mock's Calibri
const carlito = Carlito({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-carlito" });

export const metadata = {
  title: "އިންސްޓްރަކްޓަރުންގެ އިވެލުއޭޝަން",
  // for the platoon only
  robots: { index: false, follow: false },
};

export const viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }) {
  return (
    <html lang="dv" dir="rtl" className={`${faruma.variable} ${carlito.variable} antialiased`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
