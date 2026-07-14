# @movux/env

Shared environment validation for the monorepo using [@t3-oss/env-nextjs](https://github.com/t3-oss/env-nextjs).

## Usage

```ts
import { env } from '@movux/env'

console.log(env.NODE_ENV)
```

## Extending

Add your environment variables to the schema in `index.ts`:

- `server`: server-side only (never exposed to client)
- `client`: client-side (prefixed with NEXT_PUBLIC_)
- `shared`: both server and client
