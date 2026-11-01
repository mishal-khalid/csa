import Viewer from "@/components/syllabus/Viewer";

// The Instructor Platoon's Training Syllabus & Notes, for anyone with the link (the user's call): its
// 14 pages, rendered from the PDF to pictures in public/syllabus-pages, so no PDF is ever served.

const TITLE = "Instructor Training Syllabus";

export const metadata = { title: TITLE };
export const viewport = { themeColor: "#323639" };

const pages = Array.from({ length: 14 }, (_, i) => `/syllabus-pages/${String(i + 1).padStart(2, "0")}.jpg`);

export default function Syllabus() {
  return <Viewer title={TITLE} pages={pages} ratio={3396 / 2400} />;
}
