import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema: 'src/server/graphql/schema.graphql',
  documents: 'src/graphql/operations/**/*.graphql',
  generates: {
    'src/graphql/generated/types.ts': {
      plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
      config: {
        // string-literal unions, não TS enums — combina com o padrão de
        // enums do resto do projeto (z.enum([...]) em vez de enum real)
        enumsAsTypes: true,
      },
    },
  },
}

export default config
