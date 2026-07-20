import { writeFileSync } from 'fs'
import { join } from 'path'
import { printSchema } from 'graphql'

import { schema } from '~/server/graphql/schema'

const outPath = join(__dirname, '../src/server/graphql/schema.graphql')
writeFileSync(outPath, printSchema(schema))
console.log(`GraphQL schema exported to ${outPath}`)
