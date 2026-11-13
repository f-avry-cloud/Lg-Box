import type { MetadataRoute } from "next";

import { SITE } from "@/lib/site/config";

// Les espaces privés ne regardent personne ; tout le reste est ouvert, y
// compris aux robots des assistants IA, nommés un à un : certains ne se
// considèrent autorisés que s'ils sont cités explicitement.
const PRIVE = ["/admin", "/suivi", "/portail", "/connexion", "/signature", "/api", "/reservation-embed"];

const ROBOTS_IA = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "MistralAI-User",
  "Bingbot",
];

export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV === "preview") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVE },
      { userAgent: ROBOTS_IA, allow: "/", disallow: PRIVE },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
