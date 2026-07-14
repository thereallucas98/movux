import SchemaBuilder from '@pothos/core'
import SimpleObjectsPlugin from '@pothos/plugin-simple-objects'
import { GraphQLScalarType, Kind } from 'graphql'

import type { GraphQLContext } from './context'

const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'ISO 8601 date-time string',
  serialize(value) {
    if (value instanceof Date) return value.toISOString()
    if (typeof value === 'string') return value
    throw new Error('DateTime cannot represent a non-date value')
  },
  parseValue(value) {
    if (typeof value === 'string') {
      const date = new Date(value)
      if (isNaN(date.getTime())) throw new Error('Invalid DateTime string')
      return date
    }
    throw new Error('DateTime must be a string')
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      const date = new Date(ast.value)
      if (isNaN(date.getTime())) throw new Error('Invalid DateTime string')
      return date
    }
    throw new Error('DateTime must be a string')
  },
})

/**
 * Free-form JSON payload, used by ShiftTimelineEvent.payload (Task 14).
 * Serialized verbatim — no schema validation by GraphQL itself.
 */
const JsonScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON value',
  serialize(value) {
    return value as unknown
  },
  parseValue(value) {
    return value as unknown
  },
  parseLiteral(ast): unknown {
    if (ast.kind === Kind.STRING || ast.kind === Kind.BOOLEAN) return ast.value
    if (ast.kind === Kind.INT || ast.kind === Kind.FLOAT) {
      return Number(ast.value)
    }
    if (ast.kind === Kind.OBJECT) {
      const out: Record<string, unknown> = {}
      for (const f of ast.fields) {
        out[f.name.value] = (f.value as { value?: unknown }).value
      }
      return out
    }
    return null
  },
})

export const builder = new SchemaBuilder<{
  Context: GraphQLContext
  Scalars: {
    DateTime: {
      Input: Date
      Output: Date | string
    }
    JSON: {
      Input: unknown
      Output: unknown
    }
  }
}>({
  plugins: [SimpleObjectsPlugin],
})

builder.addScalarType('DateTime', DateTimeScalar)
builder.addScalarType('JSON', JsonScalar)

builder.queryType({})
builder.mutationType({})
