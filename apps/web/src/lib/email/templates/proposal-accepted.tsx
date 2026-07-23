import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface ProposalAcceptedProps {
  carrierName: string
  shipmentDescription: string
  priceInCents: number
}

export function ProposalAccepted({
  carrierName,
  shipmentDescription,
  priceInCents,
}: ProposalAcceptedProps) {
  const price = (priceInCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Sua proposta foi aceita!</Preview>
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
            Sua proposta foi aceita!
          </Heading>
          <Text style={{ color: '#1e1e1e', fontSize: 14 }}>
            Parabéns, {carrierName}! O customer aceitou sua proposta de {price}{' '}
            pro frete &ldquo;{shipmentDescription}&rdquo;. Você foi selecionado.
          </Text>
          <Text style={{ color: '#718096', fontSize: 12 }}>
            Confirme o termo de segurança na Movux pra seguir com a coleta.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default ProposalAccepted
