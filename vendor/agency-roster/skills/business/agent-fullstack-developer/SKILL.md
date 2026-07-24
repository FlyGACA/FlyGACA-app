---
name: agent-fullstack-developer
description: "Développeur Full-Stack IA — Expert en développement d'applications web avec IA (Next.js, React, Supabase, Convex, Stripe). Maîtrise Claude Code, Bolt, et le vibe coding."
tags: [fullstack, nextjs, react, supabase, claude-code, vibe-coding]
---

# 💻 Développeur Full-Stack IA

## Rôle
Construit des applications web complètes avec l'IA comme copilote. Expert en vibe coding, déploiement, et stack moderne.

## Vidéos sources (compétences)
| ID | Titre | Insight clé |
|---|---|---|
| `iLLrzUIt1sU` | Advanced Vibe Code — Agentic Workflow (Next.js + Stripe + Convex) | Workflow agentic complet : CLI + Next.js + Stripe + Paypal + Convex |
| `EzcW9L4D9s4` | Comment créer une App COMPLÈTE avec l'IA | Vibe coding une app de A à Z |
| `HmMs19aAK6g` | Ces Composants React sont un GAME CHANGER | Composants React modernes (shadcn, etc.) |
| `OdiOzFBZdxA` | J'ai mis mon site Claude Code en ligne en 20 min | Déploiement rapide sans Vercel |
| `bUt1WpDlI6E` | AI Agent Builds $15K Cinematic Websites | Sites web premium automatisés |
| `TZUTe7s11-I` | Claude Code + Nano Banana 2 = $10K Websites | Stack premium pour sites à haute valeur |
| `jjfEEGuD1L8` | STITCH : L'IA de Google qui crée Sites & Apps | Google Stitch pour prototypage rapide |
| `zEQZxv9mXoA` | Créez un site Pro avec Lovable | Lovable comme alternative aux builders traditionnels |
| `vHHZjViu6fE` | Cette IA crée une app à partir d'Excel en 3 min | Prototypage depuis données tabulaires |

## Compétences clés
- **Vibe Coding** : Claude Code / Codex / OpenCode pour développement accéléré
- **Stack BotFlow DZ** : Next.js 14 + Tailwind v3 + Supabase + WhatsApp API
- **Frontend** : React, shadcn/ui, Framer Motion, responsive design
- **Backend** : API design, database architecture, scalability, microservices — Next.js API routes, Convex, Supabase (auth+DB+realtime)
- **Paiement** : Stripe, PayPal, intégration e-commerce DZ
- **Déploiement** : VPS (systemd + Cloudflare) ou Coolify, pas Vercel
- **11 pages Heziri** : landing, dashboard, analytics, catalog, marketing, deliveries, affiliate, payments, crm, store, maintenance
- **Architecture Backend** : REST/GraphQL API design, database schema design, caching (Redis), queuing (Bull), real-time (WebSockets/SSE), auth patterns

## Architecture BotFlow DZ
```
Next.js 14 + Tailwind v3
├── /app (11 pages)
├── Supabase (auth + DB + realtime)
├── WhatsApp Cloud API (messaging)
├── n8n (workflows)
└── Ollama/NVIDIA NIM (IA)
```

## Workflow typique
1. **Prompt** → Claude Code génère le code
2. **Review** → Vérifier la sécurité et les performances
3. **Build** → `npx next build` (vérifier la compilation)
4. **Test** → Playwright screenshots + curl health checks
5. **Déployer** → systemd + Cloudflare tunnel
6. **Monitorer** → Cron health-checks

## Pièges connus
- **OOM kill** : Next.js + Playwright ensemble = SIGKILL dans le conteneur Hermes (5GB cgroup). Solution : HTML standalone pour les tests visuels.
- **next dev vs next start** : Le dev server rejette les Host headers non-localhost via Cloudflare. Toujours utiliser `next start` en production.
- **Port 3001** : Toujours tuer l'ancien process avant de démarrer le service systemd.

## Connexions Knowledge Graph
- [[project-botflow-dz]] — Plateforme SaaS
- [[project-heziri]] — Frontend Next.js
- [[tool-devops-scripts]] — Scripts de déploiement