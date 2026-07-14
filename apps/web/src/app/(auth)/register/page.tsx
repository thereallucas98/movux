import { RegisterForm } from '~/components/features/auth/register-form'

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-foreground text-[20px] leading-[28px] font-bold">
          Criar conta
        </h1>
        <p className="text-muted-foreground text-[16px] leading-[24px]">
          Comece a organizar suas escalas ainda hoje
        </p>
      </header>

      <RegisterForm />
    </div>
  )
}
