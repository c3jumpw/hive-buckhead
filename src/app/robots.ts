/**
 * src/app/robots.ts
 * =============================================================================
 * Generates /robots.txt. Added 2026-07-16 — the root layout already sets
 * `robots: { index: false, follow: false }` in its metadata (see
 * layout.tsx), but that's a meta-tag-level signal, not the same channel as
 * robots.txt. Some crawlers — AI ones in particular — check robots.txt
 * directives independently and don't reliably honor the meta tag alone.
 * This whole deployment is an internal operations tool (reservations,
 * staff, onboarding) reached through non-public subdomains, not something
 * meant to be discoverable via search or scraped for AI training — the
 * separate hivebuckhead.com marketing site is what's meant to be public.
 *
 * Named explicitly rather than relying solely on the wildcard rule below,
 * since a wildcard "Disallow: /" is sometimes ignored by crawlers that DO
 * respect a rule naming them specifically.
 * =============================================================================
 */
import type { MetadataRoute } from "next"

const AI_CRAWLERS = [
  "GPTBot", "ChatGPT-User", "CCBot", "anthropic-ai", "ClaudeBot", "Claude-Web",
  "Google-Extended", "Bytespider", "PerplexityBot", "Amazonbot", "Applebot-Extended",
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", disallow: "/" },
      ...AI_CRAWLERS.map(userAgent => ({ userAgent, disallow: "/" })),
    ],
  }
}
