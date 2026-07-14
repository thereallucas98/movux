import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface VerifyEmailProps {
  token: string
  appUrl: string
}

export function VerifyEmail({ token, appUrl }: VerifyEmailProps) {
  const verifyUrl = `${appUrl}/verify-email?token=${encodeURIComponent(token)}`

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Verifique seu email para ativar sua conta Movux.</Preview>
      <Body style={{ backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
        <Container
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 12,
            margin: '40px auto',
            maxWidth: 480,
            padding: 32,
          }}
        >
          <Heading style={{ color: '#1e1e1e', fontSize: 24 }}>
            Bem-vindo à Movux!
          </Heading>
          <Text style={{ color: '#1e1e1e', fontSize: 14 }}>
            Clique no botão abaixo para verificar seu email e ativar sua conta.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button
              href={verifyUrl}
              style={{
                backgroundColor: '#0d3b66',
                borderRadius: 8,
                color: '#ffffff',
                fontWeight: 600,
                padding: '12px 24px',
                textDecoration: 'none',
              }}
            >
              Verificar email
            </Button>
          </Section>
          <Text style={{ color: '#718096', fontSize: 12 }}>
            Se o botão não funcionar, copie e cole este link no navegador:
          </Text>
          <Text
            style={{ color: '#0d3b66', fontSize: 12, wordBreak: 'break-all' }}
          >
            {verifyUrl}
          </Text>
          <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />
          <Text style={{ color: '#718096', fontSize: 12 }}>
            Se você não criou uma conta, pode ignorar este email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default VerifyEmail
