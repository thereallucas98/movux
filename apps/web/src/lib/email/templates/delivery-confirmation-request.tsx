import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface DeliveryConfirmationRequestProps {
  customerName: string
  shipmentDescription: string
}

export function DeliveryConfirmationRequest({
  customerName,
  shipmentDescription,
}: DeliveryConfirmationRequestProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Confirme o recebimento do seu frete.</Preview>
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
            Seu frete foi entregue
          </Heading>
          <Text style={{ color: '#1e1e1e', fontSize: 14 }}>
            Olá, {customerName}! O transportador marcou o frete &ldquo;
            {shipmentDescription}
            &rdquo; como entregue. Confirme o recebimento na Movux — se não
            responder em 24h, a entrega é confirmada automaticamente.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default DeliveryConfirmationRequest
