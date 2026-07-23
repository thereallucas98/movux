import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface DocumentRejectedProps {
  carrierName: string
  documentType: string
  rejectionReason: string
}

export function DocumentRejected({
  carrierName,
  documentType,
  rejectionReason,
}: DocumentRejectedProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Seu documento precisa de atenção.</Preview>
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
            Documento rejeitado
          </Heading>
          <Text style={{ color: '#1e1e1e', fontSize: 14 }}>
            Olá, {carrierName}. Seu documento ({documentType}) não foi aprovado.
          </Text>
          <Text style={{ color: '#718096', fontSize: 12 }}>
            Motivo: {rejectionReason}
          </Text>
          <Text style={{ color: '#1e1e1e', fontSize: 14 }}>
            Envie um novo documento corrigido na Movux.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default DocumentRejected
