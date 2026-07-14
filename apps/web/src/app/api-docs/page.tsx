'use client'

import 'swagger-ui-react/swagger-ui.css'

import SwaggerUI from 'swagger-ui-react'

export const dynamic = 'force-dynamic'

export default function ApiDocsPage() {
  return (
    <div className="bg-background min-h-screen">
      <div className="bg-muted/40 border-border border-b">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-foreground text-lg font-semibold">
              API Documentation
            </h1>
          </div>
        </div>
      </div>

      <SwaggerUI
        url="/api/api-docs"
        deepLinking={true}
        displayRequestDuration={true}
        tryItOutEnabled={true}
        requestInterceptor={(request) => request}
        responseInterceptor={(response) => response}
        supportedSubmitMethods={['get', 'post', 'put', 'delete', 'patch']}
        defaultModelsExpandDepth={1}
        defaultModelExpandDepth={1}
        docExpansion="list"
      />
    </div>
  )
}
