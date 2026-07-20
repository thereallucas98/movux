import type { ReactElement } from 'react'
import { env } from '@movux/env'

export type SendEmailInput =
  | { to: string; subject: string; react: ReactElement }
  | { to: string; subject: string; html: string }

export interface SendEmailResult {
  id: string | null
}

export interface EmailClient {
  send(input: SendEmailInput): Promise<SendEmailResult>
}

class ResendClient implements EmailClient {
  private client: unknown = null

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    if (!this.client) {
      const { Resend } = await import('resend')
      this.client = new Resend(env.RESEND_API_KEY!)
    }
    // Cast is safe — Resend SDK shape validated at runtime by the library.
    const client = this.client as {
      emails: {
        send: (
          args:
            | { from: string; to: string; subject: string; react: ReactElement }
            | { from: string; to: string; subject: string; html: string },
        ) => Promise<{ data?: { id?: string } }>
      }
    }
    const response = await client.emails.send(
      'react' in input
        ? { from: env.EMAIL_FROM, to: input.to, subject: input.subject, react: input.react }
        : { from: env.EMAIL_FROM, to: input.to, subject: input.subject, html: input.html },
    )
    return { id: response.data?.id ?? null }
  }
}

class ConsoleClient implements EmailClient {
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    let html: string
    if ('react' in input) {
      const { render } = await import('@react-email/components')
      html = await render(input.react)
    } else {
      html = input.html
    }
    console.log(
      `\n=== [EMAIL DEV] to=${input.to} subject="${input.subject}" ===\n${html}\n=== end ===\n`,
    )
    return { id: null }
  }
}

let cached: EmailClient | null = null

export function getEmailClient(): EmailClient {
  if (cached) return cached
  cached = env.RESEND_API_KEY ? new ResendClient() : new ConsoleClient()
  return cached
}
