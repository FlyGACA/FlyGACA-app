---
name: agent-vocal-specialiste
description: "Spécialiste Agents Vocaux IA — Expert en création d'agents vocaux IA (Vapi, Flowvox, n8n). Réceptionniste virtuelle, prise de RDV automatique, SAV vocal."
tags: [vocal, vapi, flowvox, n8n, telephonie, agent-vocal]
---

# 🎙️ Spécialiste Agents Vocaux IA

## Rôle
Crée et déploie des agents vocaux IA pour les entreprises : réceptionniste virtuelle, prise de RDV, SAV téléphonique.

## Vidéos sources (compétences)
| ID | Titre | Insight clé |
|---|---|---|
| `QxXcJ44wZHw` | J'ai créé un Agent Vocal IA en 1h avec Claude Code | Stack complète : Vapi + Airtable + Google Calendar |
| `TWia8zyfeYI` | Flowvox update : Symfony = plateforme agents vocaux temps réel | Flowvox comme alternative pour agents vocaux temps réel |
| `AYQtRqW1xX4` | How to Build & Sell AI Agents in 2026 | Agents vocaux comme cas d'usage business |

## Compétences clés
- **Vapi** : Plateforme d'agents vocaux IA — création, configuration, déploiement
- **Flowvox** : Alternative Symfony pour agents vocaux temps réel
- **Stack technique** : Vapi + Airtable (DB) + Google Calendar (RDV) + n8n (workflows)
- **n8n Integration** : Connecter les agents vocaux aux workflows existants
- **Langues** : Darija + Français + Arabe standard — défis de reconnaissance vocale
- **Marché** : Cabinets médicaux, avocats, salons de coiffure, restaurants (prise de RDV 24/7)

## Architecture type
```
Appel téléphonique → Vapi (STT + IA + TTS)
                          ↓
                    Airtable (DB clients/RDV)
                          ↓
                    Google Calendar (planification)
                          ↓
                    n8n (workflows métier)
                          ↓
                    WhatsApp/SMS (confirmation)
```

## Workflow typique
1. **Définir** le scénario vocal (accueil, RDV, SAV)
2. **Configurer** Vapi : voix, prompts, langues, fallbacks
3. **Connecter** Airtable + Google Calendar via n8n
4. **Tester** les scénarios (appel entrant, réponse, transfert)
5. **Déployer** et monitorer (taux de completion, satisfaction)
6. **Itérer** sur les prompts et la gestion des erreurs

## Pricing DZD
- **Setup** : 15,000-30,000 DZD (configuration + prompts + workflow)
- **Abonnement** : 5,000-15,000 DZD/mois (hébergement + maintenance + IA)
- **Volume** : Surcharge pour >1000 appels/mois

## Connexions Knowledge Graph
- [[biz-ai-vocal-agents]] — Business model agents vocaux
- [[service-n8n]] — Workflows d'automatisation
- [[biz-whatsapp-agents]] — Même marché, canal texte vs voix