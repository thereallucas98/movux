#!/bin/bash

# Script para adicionar export const dynamic = 'force-dynamic' em rotas de API
# que usam getUserSession mas ainda não têm essa configuração

API_DIR="apps/web/src/app/api"

# Encontrar todas as rotas que usam getUserSession
find "$API_DIR" -name "route.ts" -type f | while read -r file; do
  # Verificar se usa getUserSession ou request.headers
  if grep -q "getUserSession\|request\.headers\|headers()" "$file"; then
    # Verificar se já tem export const dynamic
    if ! grep -q "export const dynamic" "$file"; then
      echo "Adding dynamic export to: $file"
      
      # Encontrar a última linha de import (incluindo imports com 'from')
      last_import_line=$(grep -n "^import\|^import type" "$file" | tail -1 | cut -d: -f1)
      
      if [ -n "$last_import_line" ]; then
        # Adicionar após a última linha de import com uma linha em branco
        # Usar um arquivo temporário para compatibilidade cross-platform
        awk -v line="$last_import_line" '
          NR == line { print; print ""; print "export const dynamic = '\''force-dynamic'\''"; next }
          { print }
        ' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
      else
        # Se não houver imports, adicionar após a primeira linha não-vazia
        awk 'NR == 1 { print; print ""; print "export const dynamic = '\''force-dynamic'\''"; next } { print }' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
      fi
    else
      echo "Skipping (already has dynamic): $file"
    fi
  fi
done

echo "Done!"

