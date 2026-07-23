import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface DocumentApprovedProps {
  carrierName: string
  documentType: string
}

export function DocumentApproved({
  carrierName,
  documentType,
}: DocumentApprovedProps) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Seu documento foi aprovado.</Preview>
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
            Documento aprovado
          </Heading>
          <Text style={{ color: '#1e1e1e', fontSize: 14 }}>
            Olá, {carrierName}! Seu documento ({documentType}) foi aprovado pela
            nossa equipe.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default DocumentApproved
