import type { MetadataRoute } from "next";

import { SITE } from "@/lib/site/config";

export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const maintenant = new Date();
  const pages: Array<[string, number, "daily" | "weekly" | "monthly" | "yearly"]> = [
    ["", 1, "daily"],
    ["/tarifs", 0.9, "daily"],
    ["/box-stockage", 0.8, "monthly"],
    ["/garde-meuble-quimper", 0.8, "monthly"],
    ["/faq", 0.7, "weekly"],
    ["/contact", 0.7, "monthly"],
    ["/mentions-legales", 0.1, "yearly"],
  ];
  return pages.map(([chemin, priority, changeFrequency]) => ({
    url: SITE.url + chemin,
    lastModified: maintenant,
    changeFrequency,
    priority,
  }));
}
