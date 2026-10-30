"use client";

import { useEffect } from "react";

// Keeps the site's images from being saved the usual ways: no right-click menu (so no "Save image
// as…") and no dragging them out of the page. Together with the img rule in globals.css, which
// covers long-press saving on phones. It can't stop a screenshot.
export default function ImageGuard() {
  useEffect(() => {
    const block = (e) => {
      if (e.target instanceof Element && e.target.closest("img")) e.preventDefault();
    };
    document.addEventListener("contextmenu", block);
    document.addEventListener("dragstart", block);
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("dragstart", block);
    };
  }, []);

  return null;
}
