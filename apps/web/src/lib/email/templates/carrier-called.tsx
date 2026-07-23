import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface CarrierCalledProps {
  carrierName: string
}

export function CarrierCalled({ carrierName }: CarrierCalledProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Você foi chamado para propor em um frete.</Preview>
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
            Você foi chamado!
          </Heading>
          <Text style={{ color: '#1e1e1e', fontSize: 14 }}>
            Olá, {carrierName}! Você foi chamado pra propor em um frete
            disponível na fila. Acesse a Movux e envie sua proposta antes que a
            vaga expire.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default CarrierCalled
