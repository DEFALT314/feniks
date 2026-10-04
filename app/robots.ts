import type { MetadataRoute } from "next";

// Keep crawlers off the whole site. Every page renders per request and reads the database, so a
// crawler walking the catalog (about 160 innovations linking to each other) floods Supabase and
// uses up the Vercel function limits. Served as a static /robots.txt, without a function call.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
