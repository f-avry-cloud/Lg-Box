#!/usr/bin/env bash
# Récupère les photos du site actuel pour les réutiliser dans la version
# légère. À lancer depuis une machine ayant accès à lg-box.fr.
#
#   ./site/fetch-images.sh
#
# Les fichiers atterrissent dans site/static/images/_telechargees/ ; il reste
# à choisir les huit meilleures et à les renommer selon le tableau du README.
set -euo pipefail

cd "$(dirname "$0")"
dest="static/images/_telechargees"
mkdir -p "$dest"

pages=(
  "" faq.html
  garde-meuble-quimper-finistere-sud.html
  location-box-quimper-finistere.html
  garde-meuble-box-stockage-douarnenez.html
  location-box-pas-cher-quimper-29.html
  garde-meubles-quimper-avis.html
  location-box-quimper-adresse.html
  location-box-quimper-contact.html
)

for page in "${pages[@]}"; do
  url="https://www.lg-box.fr/${page}"
  echo "→ $url"
  curl -sSL "$url" \
    | grep -oiE '(src|href)="[^"]+\.(jpe?g|png|webp|avif)"' \
    | cut -d'"' -f2
done | sort -u | while read -r img; do
  case "$img" in
    http*) full="$img" ;;
    /*)    full="https://www.lg-box.fr$img" ;;
    *)     full="https://www.lg-box.fr/$img" ;;
  esac
  echo "   ↓ $full"
  curl -sSL --create-dirs -o "$dest/$(basename "$img")" "$full" || true
done

echo
echo "Images récupérées dans $dest :"
ls -1sh "$dest"
echo
echo "Renommez les huit retenues selon le tableau de site/README.md,"
echo "placez-les dans site/static/images/, puis relancez : node site/build.mjs"
