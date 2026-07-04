# AI-search (GEO/AEO) reference — getting flygaca.com cited

Goal: when someone asks Google AI Overviews, ChatGPT, Perplexity or Gemini anything about Saudi civil-aviation regulation, Fly GACA is one of the cited sources.

## Why Fly GACA can win this

AI systems prefer sources that are: specific, verifiable, structured, fresh, and honest about what they are. A regulatory reference that (a) quotes the exact GACAR Part/section, (b) links back to the official source, (c) is updated on the AIRAC cycle, and (d) states plainly that it's an independent educational reference — that is the profile of a citable source. Most competitors are thin blog posts. The moat is real; the work is making the content *extractable*.

## The answer-first pattern (apply to every guide & content landing page)

The first screen of a page must answer the query it targets. Concretely:

1. **H1 states the topic as the user searches it** ("Saudi Private Pilot Licence (PPL) requirements — GACAR Part 61"), not a clever title.
2. **A Key Facts block immediately after the H1**: 3–6 short factual bullets that fully answer the core question (minimum age, medical class, hours, exams, the governing Part/section). This is what AI extracts. Keep each bullet self-contained — assume it will be quoted alone.
3. **Then the body**: one topic per H2, tables for anything enumerable (requirements, minima, fees, durations), prose only where reasoning is needed.
4. **An FAQ section** for the real follow-up questions (see structured-data.md for FAQPage markup). Source FAQ topics from: Captain Adel's most-asked questions, GSC queries, and "People also ask".
5. **Provenance footer**: "Source: GACAR Part 61, §61.xx — verify the current version at gaca.gov.sa" + last-updated date. This is both the ethos and a citation magnet.

Implementation notes for this repo:
- Build Key Facts and FAQ as reusable components (bilingual props from i18n keys), so every guide gets them cheaply and consistently. Wire their text into the page's JSON-LD via `usePageMeta`.
- Never let the pattern fabricate: bullets must be traceable to the corpus (`public/data/`, `content/regulations/`). When a fact is simplified, keep the "verify against GACA" caveat adjacent.
- Word budget: the direct answer must be complete within ~200 words of the top of the page.

## Crawler access — the hard requirement

AI crawlers do not reliably execute JavaScript. Everything above only counts if it's in the prerendered HTML.

- The body prerender (`scripts/prerender.mjs`) runs in `npm run deploy`. Treat any deploy path that skips it as a production incident for SEO.
- Verify with: `curl -s -A "GPTBot" https://flygaca.com/<route> | grep -c "<key phrase>"` — repeat for `ClaudeBot`, `PerplexityBot`, `OAI-SearchBot`, and a plain browser UA. Check a sample across route types (library part, guide, tool, aerodrome, study).
- `public/robots.txt` currently allows all agents. Keep it that way; optionally add explicit `User-agent:` stanzas for the AI bots to document intent. Never add a blanket AI-bot block — being uncitable is fatal in 2026.
- Check `public/_headers` / `firebase.json` don't rate-limit or challenge bot UAs.

## Freshness — the AIRAC advantage

Measured AI-citation behaviour drops sharply when a page looks >~3 months old. Fly GACA has a structural gift: aeronautical data changes on the 28-day AIRAC cycle.

- Surface the current AIRAC cycle and a visible "Last reviewed" date on aerodrome/chart/data pages; bump `dateModified` in JSON-LD from real corpus metadata (not fake timestamps — AI systems and Google both detect content that claims freshness without changing).
- Quarterly refresh loop for the top ~20 evergreen pages (licensing, medical, conversion, ELP guides): re-verify facts, refresh examples, update stats, note the review date.

## Where LLMs learn who to trust

Models weight brand mentions across the open web — forums, Reddit, community sites — even when unlinked. See `content-eeat.md` for the off-site programme. On-site, make the brand machine-legible: consistent `Organization` entity (name, logo, sameAs), the About/methodology page, and consistent naming ("Fly GACA") everywhere.

## What to skip

- **llms.txt**: keep `public/llms.txt` accurate when routes change, but don't build tooling around it — large-scale log studies show AI crawlers essentially never fetch it and citation studies show no effect.
- **Bulk AI-generated pages**: Google's 2025–26 updates specifically demote mass-produced content without human editorial value; it also poisons the trust profile that makes the site citable.
- **Chasing every AI platform's quirks**: the fundamentals above (crawlable, answer-first, verifiable, fresh) cover Google AI Overviews, ChatGPT search, Perplexity and Gemini alike.

## Measuring AI visibility

- Segment AI referrals in analytics: referrers `chatgpt.com`, `perplexity.ai`, `gemini.google.com`, `copilot.microsoft.com` (they pass referrer on click-throughs).
- GSC: watch impressions/clicks divergence on answer-shaped queries (impressions up, clicks flat = appearing in AI Overviews).
- Quarterly manual audit: ask ChatGPT/Perplexity/Gemini ~10 canonical questions ("What are the PPL requirements in Saudi Arabia?", in Arabic too) and log whether flygaca.com is cited. Track the trend, not single answers.
