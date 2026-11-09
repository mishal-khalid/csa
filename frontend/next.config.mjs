/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // keeps every address out of search engines, including the Gazette PDFs and images, which can't
  // carry the pages' robots tag
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
  // The Director's Office became The President's Office (Director's Order Number 02/2026); its
  // old address still leads to the page.
  async redirects() {
    return [{ source: "/exec/directors-office", destination: "/exec/presidents-office", permanent: true }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
