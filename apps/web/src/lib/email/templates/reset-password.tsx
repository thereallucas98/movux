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

interface ResetPasswordProps {
  token: string
  appUrl: string
}

export function ResetPassword({ token, appUrl }: ResetPasswordProps) {
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Redefina sua senha da Movux.</Preview>
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
            Redefinir senha
          </Heading>
          <Text style={{ color: '#1e1e1e', fontSize: 14 }}>
            Recebemos uma solicitação para redefinir a senha da sua conta.
            Clique no botão abaixo para escolher uma nova senha.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Button
              href={resetUrl}
              style={{
                backgroundColor: '#0d3b66',
                borderRadius: 8,
                color: '#ffffff',
                fontWeight: 600,
                padding: '12px 24px',
                textDecoration: 'none',
              }}
            >
              Redefinir senha
            </Button>
          </Section>
          <Text style={{ color: '#718096', fontSize: 12 }}>
            Se o botão não funcionar, copie e cole este link no navegador:
          </Text>
          <Text
            style={{ color: '#0d3b66', fontSize: 12, wordBreak: 'break-all' }}
          >
            {resetUrl}
          </Text>
          <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />
          <Text style={{ color: '#718096', fontSize: 12 }}>
            Este link expira em 1 hora. Se você não solicitou esta mudança, pode
            ignorar este email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default ResetPassword
