# Hermes Context Window Requirements

## Minimum Requirement
Hermes Agent requires models with **≥64K tokens context window**. Models below this threshold cause `ValueError` on startup or in cron jobs.

## Known Models (as of June 2026)

### ✅ Compatible (≥64K context)
| Model | Context | Size | Notes |
|-------|---------|------|-------|
| llama3.2:3b | 128K | 2.0 GB | Fast fallback, OK quality |
| glm-5.1:cloud | Cloud | — | NVIDIA NIM, default model |
| deepseek-v4-flash | Cloud | — | NVIDIA NIM, good for cron |
| deepseek-v4-pro | Cloud | — | NVIDIA NIM, best quality |

### ⚠️ Requires Override (32-64K context)
| Model | Context | Size | Notes |
|-------|---------|------|-------|
| qwen3:8b | 40,960 | 5.2 GB | Good local model, needs `context_length: 40960` in fallback_providers |

### ❌ Incompatible (<32K context)
| Model | Context | Size | Notes |
|-------|---------|------|-------|
| qwen2.5-coder:7b | 32,768 | 4.7 GB | Too small, removed |

### ❌ Removed (other reasons)
| Model | Context | Size | Notes |
|-------|---------|------|-------|
| devstral:24b | 128K | 14 GB | Too slow on CPU without GPU |
| qwen3:4b | — | — | Thinking mode broken via API |

## Fix: context_length Override
For models with <64K context, add `context_length` override in config.yaml:

```yaml
fallback_providers: '[
  {base_url: "http://127.0.0.1:11434/v1", model: qwen3:8b, 
   provider: ollama-launch, context_length: 40960},
  ...
]'
```

## How to Check Context Window
```bash
ollama show <model> | grep "context length"
```

## ⚠️ Cron Job Model Coupling
Before `ollama rm <model>`, ALWAYS check cron jobs referencing it:
```bash
hermes cron list | grep <model>
```
Each cron job using the deleted model will fail silently. Update them FIRST:
```bash
# Example: update a cron job to use a cloud model
hermes cron update <job_id> --model deepseek-ai/deepseek-v4-flash --provider nvidia-nim
```

## ⚠️ SSH Key Copy-Paste from Telegram
Telegram can corrupt SSH key characters (`l` → `1`, line breaks). Always test after adding:
```bash
ssh -T git@github.com
# Expected: "Hi ziri22! You've successfully authenticated"
```