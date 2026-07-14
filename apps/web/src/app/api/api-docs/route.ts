import type { NextRequest } from 'next/server'

import { swaggerSpec } from '~/lib/swagger'

export async function GET(req: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production'
  const hostname = req.headers.get('host') || ''
  const forwardedHost = req.headers.get('x-forwarded-host') || ''
  const forwardedFor = req.headers.get('x-forwarded-for') || ''

  if (isProduction) {
    const isLocalhost =
      hostname.includes('localhost') ||
      hostname.includes('127.0.0.1') ||
      forwardedHost.includes('localhost') ||
      forwardedHost.includes('127.0.0.1') ||
      forwardedFor.includes('127.0.0.1') ||
      forwardedFor.includes('::1')

    if (!isLocalhost) {
      return Response.json(
        { error: 'Swagger available in local development only.' },
        { status: 403 },
      )
    }
  }

  try {
    const origin = `${req.nextUrl.protocol}//${req.headers.get('host')}`
    return Response.json(swaggerSpec, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET',
      },
    })
  } catch (error) {
    return Response.json(
      {
        error: 'Failed to generate API documentation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
