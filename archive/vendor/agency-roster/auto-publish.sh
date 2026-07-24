#!/bin/bash
# ============================================
# 🏢 Agency Roster — Auto-Publish Script
# ============================================
# Ce script publie automatiquement le pack sur Gumroad
# Prérequis: GUMROAD_TOKEN (obtenir sur https://app.gumroad.com/settings/developers)
# ============================================

set -e

GUMROAD_TOKEN="${GUMROAD_TOKEN:?❌ GUMROAD_TOKEN manquant. Va sur https://app.gumroad.com/settings/developers pour le créer.}"

echo "🏢 Agency Roster — Publication automatique"
echo "=========================================="

# Step 1: Create product on Gumroad
echo ""
echo "📦 Création du produit sur Gumroad..."

RESPONSE=$(curl -s -X POST "https://app.gumroad.com/api/products" \
  -H "Authorization: Bearer $GUMROAD_TOKEN" \
  -F "name=The Agency Roster — 24 AI Agent Skills" \
  -F "description=Stop hiring. Start deploying.

Get a complete AI agency team of 24 specialized agents that work with ANY AI tool — Claude Code, Cursor, ChatGPT, Copilot, Hermes, or any other AI.

🔴 Engineering Division (8 agents): Frontend Developer, Backend Architect, Mobile App Builder, AI Engineer, DevOps Automator, Rapid Prototyper, Senior Developer, Security Engineer

🎨 Design Division (7 agents): UI Designer, UX Researcher, MUX Architect, Brand Guardian, Visual Storyteller, Whimsy Injector, Image Prompt Engineer

🟢 Business & Automation (9 agents): Agent Architect, Business & Monetization, Content Creator, n8n Automator, WhatsApp Commerce, Vocal Specialist, AI Models & Routing, Research & Watch, NVIDIA SkillSpector

✅ Works with Claude Code, Cursor, ChatGPT, Copilot, Hermes, ANY AI tool
✅ MIT License — free to use, modify, resell
✅ Lifetime updates via GitHub

Created by Ziri Yahi • github.com/ziri22/agency-roster" \
  -F "price=2900" \
  -F "custom_price_type=pay_what_you_want" \
  -F "min_price=900" \
  -F "file=@/tmp/agency-roster-pack.zip" \
  -F "preview_url=https://github.com/ziri22/agency-roster")

PRODUCT_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('product',{}).get('id','ERROR'))" 2>/dev/null || echo "PARSE_ERROR")

if [ "$PRODUCT_ID" = "ERROR" ] || [ "$PRODUCT_ID" = "PARSE_ERROR" ] || [ -z "$PRODUCT_ID" ]; then
  echo "❌ Erreur lors de la création du produit"
  echo "$RESPONSE"
  echo ""
  echo "💡 Alternative: Crée manuellement sur https://app.gumroad.com/products/new"
  echo "   Utilise la description dans /tmp/agency-roster/GUMROAD-COPIER.md"
  exit 1
fi

echo "✅ Produit créé avec succès!"
echo "📋 Product ID: $PRODUCT_ID"
echo "🔗 URL: https://ziri.gumroad.com/l/agency-roster"
echo ""
echo "🎉 Publication Gumroad terminée!"
echo ""
echo "=========================================="
echo "📊 Prochaines étapes:"
echo "1. Vérifie le produit sur https://app.gumroad.com/products"
echo "2. Ajoute une image de couverture (ouvre cover.html dans un navigateur)"
echo "3. Lie Payoneer dans Settings → Payments"
echo ""
echo "🟢 Fiverr (à faire manuellement):"
echo "4. Va sur https://www.fiverr.com/users/ziri/seller_dashboard"
echo "5. Crée un gig avec la description dans FIVERR-COPIER.md"
echo ""