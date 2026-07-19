import { redirect } from 'next/navigation'

import { RegisterForm } from '~/components/features/auth/register-form'
import { getServerPrincipal } from '~/lib/get-server-principal'

export default async function RegisterPage() {
  const principal = await getServerPrincipal()

  if (principal) {
    switch (principal.role) {
      case 'ADMIN':
        redirect('/admin/dashboard')
        break
      case 'CARRIER':
        redirect('/carrier/dashboard')
        break
      default:
        redirect('/customer/dashboard')
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-foreground text-[20px] leading-[28px] font-bold">
          Criar conta
        </h1>
        <p className="text-muted-foreground text-[16px] leading-[24px]">
          Chama um Movux — cadastre-se para começar
        </p>
      </header>

      <RegisterForm />
    </div>
  )
}
