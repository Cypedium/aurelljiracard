import type { NextConfig } from "next";

// The site's own address; www and the plain domain are different origins for the browser (separate logins
// and saved settings), so www always moves to the plain domain
const CANONICAL_HOST = "aurelltodo.com";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: `www.${CANONICAL_HOST}` }],
        destination: `https://${CANONICAL_HOST}/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
