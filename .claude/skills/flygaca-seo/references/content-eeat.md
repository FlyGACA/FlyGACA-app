# Content, E-E-A-T & brand footprint reference

2026 core updates made E-E-A-T (experience, expertise, authoritativeness, trust) behave like a ranking factor rather than a guideline, and AI answer engines choose sources by brand trust signals gathered across the whole web. For a site whose product is *trustworthy regulatory reference*, this is home turf — but the signals must be made explicit.

## On-site trust surface

- **About / methodology page** (P0 if missing pieces): who builds Fly GACA, how regulatory content is processed from GACA's published documents (the sync + parse pipeline is a genuinely credible story — tell it), how often content updates (AIRAC / sync cadence), corrections policy, and contact (i@flygaca.com). Link it from the footer site-wide. This one page feeds both Google's quality raters' model and LLM entity profiles.
- **Provenance on every content page**: source Part/section, last-reviewed date, link to gaca.gov.sa. Already the ethos — formalize it as a consistent component so it's machine-extractable.
- **The disclaimer is an asset.** "Independent, not affiliated, verify against GACA" reads as honesty, which is E-E-A-T gold. Keep `<Disclaimer />` intact and visible.
- **First-hand experience signals** in guides: written from the perspective of people who actually navigate the process (what the ELP test day is like, what documents the medical actually requires). Generic rewrites of regulations score as low-value; lived specifics rank and get quoted.

## Content strategy (what to build, in priority order)

1. **Strengthen the money pages**: licensing, medical, licence conversion, English proficiency guides — apply the answer-first pattern (see ai-search.md), FAQ blocks, and provenance. These match the highest-intent queries.
2. **Query-map the library**: the 74 GACAR Parts + handbooks already exist as URLs; give each Part landing page a human summary (what this Part covers, who it applies to, most-referenced sections) so it can rank and be cited — a bare regulation dump can't answer anything.
3. **Fill definitional gaps**: glossary (EN/AR), "GACAR vs FAR/EASA equivalents", "how Saudi aviation regulation is structured". Definitional content is what assistants quote most.
4. **Arabic as a first-class content track**: research Arabic queries separately (رخصة الطيار التجاري، متطلبات رخصة الطيران الخاص، اختبار اللغة الإنجليزية للطيارين...) — search volume and phrasing differ wildly from English equivalents; dialect vs MSA matters. Write Arabic titles/descriptions/FAQ natively; never machine-translate them. Arabic AI/voice queries are the underserved market where an authoritative Arabic source can dominate.
5. **Original data as link magnets**: the aerodrome dataset, VFR chart index, tool suite — package as shareable reference ("all KSA aerodromes with ICAO codes") that earns organic mentions and links.

Cadence: quarterly review of the top ~20 pages (freshness decay, see ai-search.md); new content only where a real query exists (GSC, Captain Adel question logs are a proprietary goldmine of actual user questions — mine them, anonymized, for FAQ/guide topics).

## Off-site brand footprint (where LLMs learn)

LLMs and AI search rank brands largely from third-party coverage — forums, Reddit, communities, industry press. Mentions count even unlinked. Ethical playbook:

- Be genuinely present where Saudi/GCC aviation students talk: Reddit (r/flying, r/aviation), PPRuNe (Middle East forum), Twitter/X aviation community, Saudi flight-school groups. Answer questions well; link only when it truly helps. Never astroturf — one exposed fake thread costs more than a hundred honest answers earn.
- Partnerships: flight schools and instructors who recommend the ground-school/tools to cadets; guest explainers for aviation-training sites.
- Digital PR: original stats or datasets ("what changed in this AIRAC cycle", licensing statistics summaries) that aviation media can cite.
- Entity grounding: consistent naming and profile everywhere (Fly GACA + flygaca.com + same logo); a Wikidata entry is legitimate and helps entity resolution (Wikipedia only if notability is genuinely met — don't force it).

## Editorial red lines

- No mass AI-generated pages: 2025–26 Google updates demote scaled content without human editorial value, and it corrodes the trust profile everything else depends on. AI-assisted drafting is fine; every page needs human verification against the corpus and a reason to exist (a real query).
- No fabricated expertise (fake authors, fake credentials, fake reviews). The site's credibility position is "transparent independent reference" — protect it.
- Regulatory wording is quoted or cited, never paraphrased into inaccuracy; keep the verify-against-GACA caveat adjacent to simplified claims.
