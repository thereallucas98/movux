import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'

interface SafetyTermRequiredProps {
  recipientName: string
  shipmentDescription: string
}

export function SafetyTermRequired({
  recipientName,
  shipmentDescription,
}: SafetyTermRequiredProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Confirme o termo de segurança do seu frete.</Preview>
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
          <Heading style={{ color: '#1e1e1e', fontSize: 24 }}>Confirme o termo de segurança</Heading>
          <Text style={{ color: '#1e1e1e', fontSize: 14 }}>
            Olá, {recipientName}! O frete &ldquo;{shipmentDescription}&rdquo; já tem um
            transportador selecionado. Antes da coleta, confirme o termo de segurança na Movux.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default SafetyTermRequired
