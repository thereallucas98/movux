declare module 'swagger-ui-react' {
  import type { FC } from 'react'

  interface SwaggerUIProps {
    url?: string
    spec?: Record<string, unknown>
    deepLinking?: boolean
    displayRequestDuration?: boolean
    tryItOutEnabled?: boolean
    persistAuthorization?: boolean
    requestInterceptor?: (request: unknown) => unknown
    responseInterceptor?: (response: unknown) => unknown
    supportedSubmitMethods?: string[]
    defaultModelsExpandDepth?: number
    defaultModelExpandDepth?: number
    docExpansion?: 'list' | 'full' | 'none'
  }

  const SwaggerUI: FC<SwaggerUIProps>
  export default SwaggerUI
}
