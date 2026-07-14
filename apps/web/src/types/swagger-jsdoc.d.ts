declare module 'swagger-jsdoc' {
  function swaggerJsdoc(options: swaggerJsdoc.Options): Record<string, unknown>

  namespace swaggerJsdoc {
    interface Options {
      definition?: Record<string, unknown>
      apis?: string[]
    }
  }

  export = swaggerJsdoc
}
