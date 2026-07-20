import { z } from 'zod'

// Mensagens de validação em PT-BR (schemas do server são reaproveitados
// direto nos forms client-side — sem isso, os erros do zodResolver saem em
// inglês, violando a regra de UI em PT-BR do CLAUDE.md). Importar 1x é
// suficiente — z.config() é uma configuração global do módulo.
z.config(z.locales.pt())
