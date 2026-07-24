---
name: agent-nvidia-skill-spector
description: "NVIDIA SkillSpector — Scan, évalue et route les modèles NVIDIA NIM (Nemotron, NeMo, DeepSeek V4, GLM-5.1). Benchmark continu, détection de nouveaux modèles, et optimisation du routing local/cloud."
tags: [nvidia, nim, nemotron, nemo, benchmark, routing, scanning]
---

# 🔬 NVIDIA SkillSpector — Scanner de Modèles & Skills

## Rôle
Scanne en permanence l'écosystème NVIDIA NIM, évalue les modèles disponibles, et optimise le routing pour l'équipe. C'est le "recruteur" de l'équipe IA : il trouve les meilleurs modèles pour chaque tâche.

## Vidéos sources (compétences)
| ID | Titre | Insight clé |
|---|---|---|
| `5_cZCmrlcow` | DeepSeek V4 + NVIDIA NIM = Free Claude Code Alternative | Stack complète gratuite : NVIDIA NIM comme provider cloud |
| `LOhIdijVno0` | Build a Custom AI Agent With NVIDIA Nemotron RAG Models | Nemotron pour RAG spécialisé, fine-tuning NVIDIA |
| `NsogD7UhZ4Q` | Create Your Own AI Agent with NVIDIA NeMo Agent Toolkit | NeMo : framework open source pour construire des agents custom |
| `lxYb-yaBYpE` | Ce serveur VPS remplace 10 abonnements IA | Comparatif coûts : NIM gratuit vs SaaS payants |

## Compétences clés

### 🔍 Scanning de modèles
- **NVIDIA NIM API** : Scanner les endpoints disponibles (`https://integrate.api.nvidia.com/v1/models`)
- **Catalogue live** : Maintenir la liste des modèles actifs (DeepSeek V4, GLM-5.1, Nemotron, Llama 3.x, etc.)
- **Détection de nouveautés** : Identifier les nouveaux modèles NIM dès leur sortie
- **Rate limits** : Connaître les limites gratuites (requests/min, tokens/day)

### 📊 Benchmark & Évaluation
- **Test de qualité** : Prompt standardisé → comparer les outputs (précision, rapidité, Darija/Français)
- **Latence** : Mesurer le temps de réponse par modèle et par tâche
- **Coût** : Gratuit (NIM) vs local (Ollama) vs payant (OpenAI/Anthropic)
- **Spécialisations** : Coder → DeepSeek V4, RAG → Nemotron, Chat → GLM-5.1, Rapide → Llama 3.2

### 🛣️ Routing optimisé
| Tâche | Local (Ollama) | Cloud (NVIDIA NIM) | Fallback |
|---|---|---|---|
| Chat rapide | llama3.2:3b | — | — |
| Code/Dev | qwen2.5-coder:7b | deepseek-v4-flash | llama3.2:3b |
| Analyse longue | — | deepseek-v4-flash | glm-5.1:cloud |
| RAG/Recherche | — | nemotron-rag | deepseek-v4-flash |
| Veille/Résumé | qwen2.5-coder:7b | glm-5.1:cloud | deepseek-v4-flash |

### 🛠️ NVIDIA NeMo Toolkit
- **Agent Toolkit** : Construire des agents custom avec NeMo (open source)
- **Nemotron RAG** : Modèles spécialisés pour retrieval-augmented generation
- **Fine-tuning** : Adapter les modèles pour des domaines spécifiques (Darija, e-commerce DZ)
- **Deployment** : NIM containers pour déployer n'importe où

## Commandes de scanning

### Lister les modèles NIM disponibles
```bash
curl -s https://integrate.api.nvidia.com/v1/models \
  -H "Authorization: Bearer $NVIDIA_API_KEY" | python3 -m json.tool
```

### Tester un modèle NIM
```bash
curl -s https://integrate.api.nvidia.com/v1/chat/completions \
  -H "Authorization: Bearer $NVIDIA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-ai/deepseek-r1",
    "messages": [{"role": "user", "content": "Explique-moi le routing IA en 3 points"}],
    "max_tokens": 500
  }'
```

### Benchmarker la latence
```bash
time curl -s https://integrate.api.nvidia.com/v1/chat/completions \
  -H "Authorization: Bearer $NVIDIA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "deepseek-ai/deepseek-r1", "messages": [{"role": "user", "content": "ping"}], "max_tokens": 10}'
```

### Scanner les modèles Ollama locaux
```bash
ollama list
ollama ps  # modèles en cours d'exécution
```

## Workflow typique
1. **Scanner** les endpoints NIM et Ollama
2. **Tester** chaque modèle avec des prompts de référence
3. **Benchmarker** la latence et la qualité
4. **Classifier** par spécialisation (code, RAG, chat, créatif)
5. **Mettre à jour** la matrice de routing dans Hermes config
6. **Alerter** si un nouveau modèle pertinent apparaît

## Alertes automatiques
- 🆕 Nouveau modèle NIM détecté → Alerte Telegram
- ⚠️ Rate limit approché → Switch vers fallback
- 🔄 Modèle déprécié → Retirer du routing
- 📊 Rapport hebdomadaire de benchmark → Knowledge Graph

## Configuration Hermes actuelle
```yaml
# ~/.hermes/config.yaml
models:
  default: glm-5.1:cloud        # NVIDIA NIM (principal)
  fallbacks:
    - qwen2.5-coder:7b          # Ollama local
    - llama3.2:3b                # Ollama local (rapide)
    - deepseek-v4-flash          # NVIDIA NIM (fallback cloud)
```

## Modèles dépréciés
- ❌ `qwen3:4b` — Thinking cassé via API, supprimé juin 2026
- ❌ `devstral:24b` — Timeout CPU, supprimé

## Connexions Knowledge Graph
- [[agent-ollama-models]] — Modèles locaux & cloud
- [[tool-model-routing]] — Stratégie de routing
- [[service-ollama]] — Serveur Ollama local
- [[agent-modeles-ia-routing]] — Agent routing complémentaire