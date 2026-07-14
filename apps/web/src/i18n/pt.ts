export const dict: Record<string, string> = {
  // Common
  'common.loading': 'Carregando…',
  'common.submit': 'Confirmar',
  'common.cancel': 'Cancelar',
  'common.back': 'Voltar',
  'common.required': 'Obrigatório',

  // Auth — shared
  'auth.email.label': 'E-mail',
  'auth.email.placeholder': 'mail@exemplo.com',
  'auth.email.invalid': 'Email inválido',
  'auth.password.label': 'Senha',
  'auth.password.placeholder': 'Digite sua senha',
  'auth.password.min': 'Mínimo 8 caracteres',
  'auth.password.show': 'Mostrar senha',
  'auth.password.hide': 'Ocultar senha',

  // Auth — login
  'auth.login.title': 'Fazer login',
  'auth.login.forgotLink': 'Recuperar senha',
  'auth.login.submit': 'Entrar',
  'auth.login.submitting': 'Entrando…',
  'auth.login.invalidCredentials': 'Email ou senha inválidos',
  'auth.login.registerCta': 'Criar conta',

  // Auth — register
  'auth.register.title': 'Criar conta',
  'auth.register.fullName.label': 'Nome completo',
  'auth.register.fullName.placeholder': 'Seu nome completo',
  'auth.register.fullName.min': 'Nome obrigatório',
  'auth.register.confirmPassword.label': 'Confirmar senha',
  'auth.register.confirmPassword.mismatch': 'Senhas não conferem',
  'auth.register.submit': 'Criar conta',
  'auth.register.submitting': 'Criando conta…',
  'auth.register.error': 'Erro ao criar conta. Tente novamente.',
  'auth.register.loginCta': 'Já tem conta? Entrar',

  // Auth — forgot password
  'auth.forgot.title': 'Recuperar senha',
  'auth.forgot.description':
    'Informe seu email e enviaremos um link para redefinir sua senha.',
  'auth.forgot.submit': 'Enviar link',
  'auth.forgot.submitting': 'Enviando…',
  'auth.forgot.success':
    'Se o email estiver cadastrado, você receberá um link em instantes.',
  'auth.forgot.backToLogin': 'Voltar para login',

  // Auth — reset password
  'auth.reset.title': 'Nova senha',
  'auth.reset.description': 'Escolha uma nova senha para sua conta.',
  'auth.reset.newPassword.label': 'Nova senha',
  'auth.reset.confirmPassword.label': 'Confirmar nova senha',
  'auth.reset.submit': 'Redefinir senha',
  'auth.reset.submitting': 'Redefinindo…',
  'auth.reset.success': 'Senha redefinida com sucesso.',
  'auth.reset.tokenExpired': 'Link inválido ou expirado.',
  'auth.reset.invalidToken': 'Token inválido.',
  'auth.reset.backToLogin': 'Ir para login',

  // Auth — verify email
  'auth.verify.title': 'Verificar email',
  'auth.verify.verifying': 'Verificando seu email…',
  'auth.verify.success': 'Email verificado com sucesso.',
  'auth.verify.alreadyVerified': 'Email já estava verificado.',
  'auth.verify.invalidToken': 'Token inválido ou expirado.',
  'auth.verify.resendCta': 'Reenviar email de verificação',
  'auth.verify.resending': 'Reenviando…',
  'auth.verify.resent': 'Email reenviado. Verifique sua caixa de entrada.',

  // Auth — logout
  'auth.logout.submit': 'Sair',
  'auth.logout.submitting': 'Saindo…',
}
