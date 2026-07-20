import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'

interface ProposalReceivedProps {
  customerName: string
  shipmentDescription: string
  priceInCents: number
}

export function ProposalReceived({
  customerName,
  shipmentDescription,
  priceInCents,
}: ProposalReceivedProps) {
  const price = (priceInCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Você recebeu uma nova proposta no seu frete.</Preview>
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
          <Heading style={{ color: '#1e1e1e', fontSize: 24 }}>Nova proposta recebida</Heading>
          <Text style={{ color: '#1e1e1e', fontSize: 14 }}>
            Olá, {customerName}! Um transportador enviou uma proposta de {price} pro seu frete
            &ldquo;{shipmentDescription}&rdquo;.
          </Text>
          <Text style={{ color: '#718096', fontSize: 12 }}>
            Acesse a Movux pra ver os detalhes e decidir.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default ProposalReceived
