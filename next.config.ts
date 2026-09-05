import type { NextConfig } from "next";

/**
 * Security headers applied to every response.
 *
 * No Content-Security-Policy yet: Next injects inline bootstrap scripts, so a
 * correct policy needs per-request nonces threaded through the proxy. That is
 * worth doing, but it is a change with real breakage risk and belongs in its
 * own pass rather than being bolted on here.
 */
const securityHeaders = [
  // Don't let the browser second-guess declared content types.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Legacy clickjacking defence; frame-ancestors supersedes it where CSP exists.
  { key: "X-Frame-Options", value: "DENY" },
  // Send the origin cross-site, the full path same-site.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nothing here needs these device APIs.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // Isolate the origin from cross-origin popups.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // The dashboard must never be cached by a shared proxy or indexed.
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
    ];
  },
};

export default nextConfig;
