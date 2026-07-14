#!/bin/bash

# Script para testar localmente os mesmos comandos da pipeline de lint
# Uso: ./scripts/test-lint.sh

set -e  # Para o script se algum comando falhar

echo "🔍 Testando pipeline de lint localmente..."
echo ""

# Verificar se pnpm está instalado
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm não está instalado. Instale com: npm install -g pnpm@8.15.0"
    exit 1
fi

# Verificar versão do pnpm
PNPM_VERSION=$(pnpm --version)
echo "✅ pnpm versão: $PNPM_VERSION"
echo ""

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✅ Node.js versão: $NODE_VERSION"
echo ""

# Instalar dependências (simulando o que a pipeline faz)
echo "📦 Instalando dependências..."
pnpm install --frozen-lockfile
echo "✅ Dependências instaladas"
echo ""

# Executar ESLint (mesmo comando da pipeline)
echo "🔍 Executando ESLint..."
if pnpm --filter web lint; then
    echo "✅ ESLint passou!"
else
    echo "❌ ESLint falhou!"
    exit 1
fi
echo ""

# Executar TypeScript check (mesmo comando da pipeline)
echo "🔍 Executando TypeScript check..."
if pnpm --filter web typecheck; then
    echo "✅ TypeScript check passou!"
else
    echo "❌ TypeScript check falhou!"
    exit 1
fi
echo ""

echo "🎉 Todos os testes passaram! A pipeline deve funcionar no GitHub Actions."

