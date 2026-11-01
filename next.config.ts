import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is off: the app is client-side (data lives in the browser)
  // and the only server code is POST AI routes, which are never cached.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // pdfjs/react-pdf pull optional Node-only modules; keep them out of the server bundle.
  serverExternalPackages: ["@react-pdf/renderer", "pdfjs-dist", "mammoth"],
  poweredByHeader: false,
};

export default nextConfig;
