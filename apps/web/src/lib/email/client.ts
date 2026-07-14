import type { ReactElement } from 'react'
import { env } from '@movux/env'

export interface SendEmailInput {
  to: string
  subject: string
  react: ReactElement
}

export interface SendEmailResult {
  id: string | null
}

export interface EmailClient {
  send(input: SendEmailInput): Promise<SendEmailResult>
}

class ResendClient implements EmailClient {
  private client: unknown = null

  async send({ to, subject, react }: SendEmailInput): Promise<SendEmailResult> {
    if (!this.client) {
      const { Resend } = await import('resend')
      this.client = new Resend(env.RESEND_API_KEY!)
    }
    // Cast is safe — Resend SDK shape validated at runtime by the library.
    const client = this.client as {
      emails: {
        send: (args: {
          from: string
          to: string
          subject: string
          react: ReactElement
        }) => Promise<{ data?: { id?: string } }>
      }
    }
    const response = await client.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      react,
    })
    return { id: response.data?.id ?? null }
  }
}

class ConsoleClient implements EmailClient {
  async send({ to, subject, react }: SendEmailInput): Promise<SendEmailResult> {
    const { render } = await import('@react-email/components')
    const html = await render(react)
    console.log(
      `\n=== [EMAIL DEV] to=${to} subject="${subject}" ===\n${html}\n=== end ===\n`,
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
