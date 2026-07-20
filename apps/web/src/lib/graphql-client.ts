import { ClientError, GraphQLClient } from 'graphql-request'

/**
 * Thin GraphQL client for `/api/graphql`. Auth travels via the `session`
 * httpOnly cookie (same origin) — no bearer token needed.
 *
 * graphql-request v7 constructs a `URL` internally and throws on a bare
 * relative path ("/api/graphql") — needs an absolute URL. All consumers
 * are client hooks, so `window` is available when a request actually runs;
 * the module only needs to not crash if evaluated during SSR bundling.
 */
const endpoint =
  typeof window !== 'undefined'
    ? `${window.location.origin}/api/graphql`
    : '/api/graphql'

export const graphqlClient = new GraphQLClient(endpoint, {
  credentials: 'include',
})

/**
 * `ClientError.message` dumps the full request/response JSON — not what a
 * toast should show. Extracts just the server's error extension code, so
 * callers can map it to a PT-BR message (server messages are English).
 */
export function getGraphQLErrorCode(error: unknown): string | undefined {
  if (error instanceof ClientError) {
    const code = error.response.errors?.[0]?.extensions?.code
    return typeof code === 'string' ? code : undefined
  }
  return undefined
}
