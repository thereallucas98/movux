import { createYoga } from 'graphql-yoga'

import { schema } from '~/server/graphql/schema'
import { createGraphQLContext } from '~/server/graphql/context'

const yoga = createYoga({
  schema,
  context: ({ request }) => createGraphQLContext(request),
  graphqlEndpoint: '/api/graphql',
  graphiql: process.env.NODE_ENV !== 'production',
  fetchAPI: { Response },
})

const handler = yoga as unknown as (req: Request) => Promise<Response>

export { handler as GET, handler as POST }
