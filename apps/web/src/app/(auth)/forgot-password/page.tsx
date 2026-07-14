import { ForgotPasswordForm } from '~/components/features/auth/forgot-password-form'

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-foreground text-[20px] leading-[28px] font-bold">
          Esqueceu a senha?
        </h1>
        <p className="text-muted-foreground text-[16px] leading-[24px]">
          Enviaremos um link para você criar uma nova senha
        </p>
      </header>

      <ForgotPasswordForm />
    </div>
  )
}
