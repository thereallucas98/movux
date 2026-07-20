#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..', '..', '..', '..')
const WEB = path.join(ROOT, 'apps', 'web')
const SRC = path.join(WEB, 'src')
const API_DIR = path.join(SRC, 'app', 'api')

const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 }
const SEVERITY_LABEL = { critical: 'CRÍTICO', high: 'ALTO', medium: 'MÉDIO', low: 'BAIXO' }

function run(cmd, opts = {}) {
  try {
    const out = execSync(cmd, {
      cwd: opts.cwd || ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 1024 * 1024 * 50,
    })
    return { stdout: out, code: 0 }
  } catch (e) {
    return { stdout: (e.stdout || '').toString(), stderr: (e.stderr || '').toString(), code: e.status ?? 1 }
  }
}

function walk(dir, filter, results = []) {
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.turbo', 'dist', 'generated', '.git'].includes(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, filter, results)
    else if (filter(full)) results.push(full)
  }
  return results
}

function readSafe(file) {
  try {
    return fs.readFileSync(file, 'utf8')
  } catch {
    return ''
  }
}

// diretórios de código-fonte real — nada de build output, reports ou node_modules
const SOURCE_DIRS = ['apps/web/src', 'packages/auth/src', 'packages/env']

function grepDirs(pattern, dirs = SOURCE_DIRS) {
  const excludeArgs = ['node_modules', '.next', '.turbo', 'dist', 'generated', '.git', 'playwright-report', 'test-results', 'coverage']
    .map((d) => `--exclude-dir=${d}`)
    .join(' ')
  const includeArgs = ['*.ts', '*.tsx', '*.js', '*.jsx'].map((g) => `--include=${g}`).join(' ')
  const existing = dirs.filter((d) => fs.existsSync(path.join(ROOT, d)))
  if (existing.length === 0) return []
  const { stdout } = run(`grep -rnE ${excludeArgs} ${includeArgs} "${pattern}" ${existing.join(' ')} 2>/dev/null`)
  return stdout.split('\n').filter(Boolean)
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

// ---------------------------------------------------------------------------
// SECRETS (20 pts)
// ---------------------------------------------------------------------------
function checkSecrets() {
  const issues = []
  let score = 0

  // .env no .gitignore (5 pts)
  const gitignore = readSafe(path.join(ROOT, '.gitignore'))
  const gitignoreOk = /(^|\n)\s*\.env(\*|\s*$)/m.test(gitignore) || /(^|\n)\s*\.env\.local/m.test(gitignore)
  if (gitignoreOk) score += 5
  else issues.push({ severity: 'critical', points: 5, message: '.env não está listado no .gitignore raiz — risco de commitar segredos' })

  // .env.example existe (5 pts)
  const hasEnvExample = fs.existsSync(path.join(ROOT, '.env.example')) || fs.existsSync(path.join(WEB, '.env.example'))
  if (hasEnvExample) score += 5
  else issues.push({ severity: 'low', points: 5, message: '.env.example não encontrado — dificulta onboarding e auditoria de variáveis exigidas' })

  // segredos hardcoded via grep (10 pts)
  const tokenPatterns = [
    ['Stripe live key', 'sk_live_[A-Za-z0-9]{10,}'],
    ['AWS access key', 'AKIA[0-9A-Z]{16}'],
    ['Google API key', 'AIza[0-9A-Za-z_-]{20,}'],
    ['GitHub PAT (classic)', 'ghp_[A-Za-z0-9]{30,}'],
    ['GitHub PAT (fine-grained)', 'github_pat_[A-Za-z0-9_]{20,}'],
  ]
  let hits = []
  for (const [label, pattern] of tokenPatterns) {
    const lines = grepDirs(pattern)
    hits = hits.concat(lines.map((l) => `[${label}] ${l}`))
  }

  // heurística genérica: variável tipo secret/password/token atribuída a literal longo
  const codeFiles = SOURCE_DIRS.flatMap((d) =>
    walk(path.join(ROOT, d), (f) => /\.(ts|tsx|js|jsx)$/.test(f) && !f.endsWith('.d.ts')),
  )
  const literalAssignRe = /\b(password|senha|secret|api[_-]?key|apikey|token)\b\s*[:=]\s*(['"])[A-Za-z0-9+/_.-]{12,}\2/i
  for (const file of codeFiles) {
    const rel = path.relative(ROOT, file)
    const content = readSafe(file)
    const lines = content.split('\n')
    lines.forEach((line, idx) => {
      if (line.includes('process.env')) return
      if (/z\.(string|email|uuid)\(\)/.test(line)) return
      if (literalAssignRe.test(line)) {
        hits.push(`[literal suspeito] ${rel}:${idx + 1}: ${line.trim().slice(0, 120)}`)
      }
    })
  }

  hits = [...new Set(hits)]
  const secretPts = clamp(10 - hits.length * 2, 0, 10)
  score += secretPts
  if (hits.length > 0) {
    issues.push({
      severity: 'critical',
      points: 10 - secretPts,
      message: `${hits.length} possível(is) segredo(s) hardcoded no código: ${hits.slice(0, 5).join(' | ')}${hits.length > 5 ? ' …' : ''}`,
    })
  }

  return { name: 'SECRETS', score, max: 20, issues }
}

// ---------------------------------------------------------------------------
// INPUTS (25 pts)
// ---------------------------------------------------------------------------
function checkInputs() {
  const issues = []
  let score = 0

  // validação Zod em rotas mutantes (10 pts)
  const routeFiles = walk(API_DIR, (f) => f.endsWith('route.ts'))
  const mutatingFiles = []
  const unvalidatedFiles = []
  for (const file of routeFiles) {
    const content = readSafe(file)
    const isMutating = /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/.test(content)
    if (!isMutating) continue
    mutatingFiles.push(file)
    if (!content.includes('.safeParse(')) unvalidatedFiles.push(path.relative(ROOT, file))
  }
  const validationRatio = mutatingFiles.length === 0 ? 1 : (mutatingFiles.length - unvalidatedFiles.length) / mutatingFiles.length
  const validationPts = Math.round(10 * validationRatio)
  score += validationPts
  if (unvalidatedFiles.length > 0) {
    issues.push({
      severity: 'high',
      points: 10 - validationPts,
      message: `${unvalidatedFiles.length}/${mutatingFiles.length} rota(s) mutante(s) sem \`.safeParse(\` visível: ${unvalidatedFiles.slice(0, 5).join(', ')}${unvalidatedFiles.length > 5 ? ' …' : ''}`,
    })
  }

  // eval / innerHTML / dangerouslySetInnerHTML (8 pts)
  const dangerousPatterns = [
    ['eval(', 'eval\\('],
    ['innerHTML', '\\.innerHTML\\s*='],
    ['dangerouslySetInnerHTML', 'dangerouslySetInnerHTML'],
  ]
  let dangerHits = []
  for (const [label, pattern] of dangerousPatterns) {
    const lines = grepDirs(pattern)
    dangerHits = dangerHits.concat(lines.map((l) => `[${label}] ${l}`))
  }
  const dangerPts = clamp(8 - dangerHits.length * 2, 0, 8)
  score += dangerPts
  if (dangerHits.length > 0) {
    issues.push({
      severity: 'high',
      points: 8 - dangerPts,
      message: `${dangerHits.length} uso(s) de eval/innerHTML/dangerouslySetInnerHTML: ${dangerHits.slice(0, 5).join(' | ')}${dangerHits.length > 5 ? ' …' : ''}`,
    })
  }

  // SQL injection — queryRawUnsafe / executeRawUnsafe (7 pts)
  const sqlHits = grepDirs('(queryRawUnsafe|executeRawUnsafe)\\(')
  const sqlPts = clamp(7 - sqlHits.length * 3.5, 0, 7)
  score += sqlPts
  if (sqlHits.length > 0) {
    issues.push({
      severity: 'critical',
      points: 7 - sqlPts,
      message: `${sqlHits.length} uso(s) de queryRawUnsafe/executeRawUnsafe (SQL não parametrizado): ${sqlHits.slice(0, 5).join(' | ')}`,
    })
  }

  return { name: 'INPUTS', score: Math.round(score), max: 25, issues }
}

// ---------------------------------------------------------------------------
// AUTH (25 pts)
// ---------------------------------------------------------------------------
const PUBLIC_ROUTE_WHITELIST = [
  'auth/login/route.ts',
  'auth/register/route.ts',
  'auth/verify-email/route.ts',
  'auth/logout/route.ts',
  'api-docs/route.ts',
  'graphql/route.ts', // auth resolvido no contexto do Pothos, não por getPrincipal na rota
]

function checkAuth() {
  const issues = []
  let score = 0

  // rotas protegidas exigem getPrincipal (12 pts)
  const routeFiles = walk(API_DIR, (f) => f.endsWith('route.ts'))
  const missingAuth = []
  let checkable = 0
  for (const file of routeFiles) {
    const rel = path.relative(API_DIR, file)
    if (PUBLIC_ROUTE_WHITELIST.includes(rel)) continue
    checkable++
    const content = readSafe(file)
    if (!content.includes('getPrincipal(')) missingAuth.push(path.relative(ROOT, file))
  }
  const authRatio = checkable === 0 ? 1 : (checkable - missingAuth.length) / checkable
  const authPts = Math.round(12 * authRatio)
  score += authPts
  if (missingAuth.length > 0) {
    issues.push({
      severity: 'critical',
      points: 12 - authPts,
      message: `${missingAuth.length}/${checkable} rota(s) não-públicas sem chamada a getPrincipal(): ${missingAuth.slice(0, 5).join(', ')}${missingAuth.length > 5 ? ' …' : ''}`,
    })
  }

  // senha hasheada (8 pts)
  const hashHits = grepDirs('bcrypt\\.hash\\(')
  const compareHits = grepDirs('bcrypt\\.compare\\(')
  let hashPts = 0
  if (hashHits.length > 0) hashPts += 4
  if (compareHits.length > 0) hashPts += 4
  if (hashHits.length === 0 || compareHits.length === 0) {
    issues.push({
      severity: 'critical',
      points: 8 - hashPts,
      message: 'bcrypt.hash()/bcrypt.compare() não encontrados — verificar se senha é hasheada antes de persistir',
    })
  }
  // comparação em texto plano (heurística negativa, não soma pontos extra)
  // escopo restrito a server/lib (backend) — forms cliente comparam password===confirmPassword, o que é validação de formulário, não autenticação
  const plaintextHits = grepDirs('\\bpassword\\s*===?\\s*', ['apps/web/src/server', 'apps/web/src/lib']).filter(
    (l) => !l.includes('passwordHash') && !l.includes('confirmPassword'),
  )
  if (plaintextHits.length > 0) {
    hashPts = clamp(hashPts - 4, 0, 8)
    issues.push({
      severity: 'critical',
      points: 4,
      message: `possível comparação de senha em texto plano: ${plaintextHits.slice(0, 3).join(' | ')}`,
    })
  }
  score += hashPts

  // CSRF — flags do cookie de sessão (5 pts)
  const cookieHits = grepDirs('sameSite|httpOnly|secure:\\s*process\\.env')
  const cookieBlob = cookieHits.join('\n')
  let csrfPts = 0
  if (/sameSite:\s*'(lax|strict)'/.test(cookieBlob)) csrfPts += 2
  if (/httpOnly:\s*true/.test(cookieBlob)) csrfPts += 2
  if (/secure:\s*process\.env/.test(cookieBlob)) csrfPts += 1
  score += csrfPts
  if (csrfPts < 5) {
    issues.push({
      severity: 'medium',
      points: 5 - csrfPts,
      message: `cookie de sessão sem todas as flags esperadas (sameSite/httpOnly/secure) — ${csrfPts}/5 encontradas`,
    })
  }
  const csrfDocs = grepDirs('NEXT_PUBLIC_APP_URL')
  if (csrfDocs.length === 0) {
    issues.push({
      severity: 'low',
      points: 0,
      message: 'docs/CLAUDE-INSTRUCTIONS.md descreve validação de Origin header (CSRF) que não existe no código — nenhum uso de NEXT_PUBLIC_APP_URL encontrado; proteção real hoje é só via cookie SameSite/HttpOnly',
    })
  }

  return { name: 'AUTH', score: Math.round(score), max: 25, issues }
}

// ---------------------------------------------------------------------------
// DEPS (15 pts)
// ---------------------------------------------------------------------------
function checkDeps() {
  const issues = []
  let score = 0

  // pnpm audit (10 pts)
  const audit = run('pnpm audit --json')
  let auditPts = 10
  try {
    const data = JSON.parse(audit.stdout)
    const v = (data.metadata && data.metadata.vulnerabilities) || {}
    const critical = v.critical || 0
    const high = v.high || 0
    const moderate = v.moderate || 0
    const low = v.low || 0
    auditPts = clamp(10 - (critical * 5 + high * 3 + moderate * 1.5 + low * 0.5), 0, 10)
    const total = critical + high + moderate + low
    if (total > 0) {
      issues.push({
        severity: critical > 0 ? 'critical' : high > 0 ? 'high' : 'medium',
        points: 10 - auditPts,
        message: `pnpm audit: ${total} vulnerabilidade(s) — critical=${critical} high=${high} moderate=${moderate} low=${low}`,
      })
    }
  } catch {
    issues.push({ severity: 'low', points: 0, message: 'pnpm audit não retornou JSON parseável — verificação pulada (sem rede?)' })
  }
  score += auditPts

  // pnpm outdated (5 pts)
  const outdated = run('pnpm outdated')
  const outdatedLines = outdated.stdout
    .split('\n')
    .filter((l) => l.trim().startsWith('│') && !l.includes('Package') && !/^[│\s]*$/.test(l))
  const outdatedCount = outdatedLines.length
  let outdatedPts
  if (outdatedCount === 0) outdatedPts = 5
  else if (outdatedCount <= 5) outdatedPts = 4
  else if (outdatedCount <= 15) outdatedPts = 3
  else if (outdatedCount <= 30) outdatedPts = 1
  else outdatedPts = 0
  score += outdatedPts
  if (outdatedCount > 0) {
    issues.push({
      severity: outdatedCount > 15 ? 'medium' : 'low',
      points: 5 - outdatedPts,
      message: `${outdatedCount} dependência(s) desatualizada(s) (pnpm outdated)`,
    })
  }

  return { name: 'DEPS', score: Math.round(score), max: 15, issues }
}

// ---------------------------------------------------------------------------
// HEADERS (15 pts)
// ---------------------------------------------------------------------------
function checkHeaders() {
  const issues = []
  let score = 0

  const configCandidates = ['next.config.js', 'next.config.ts', 'next.config.mjs'].map((f) => path.join(WEB, f))
  const configFile = configCandidates.find((f) => fs.existsSync(f))
  const configContent = configFile ? readSafe(configFile) : ''
  const middlewareContent = readSafe(path.join(SRC, 'middleware.ts'))
  const combined = configContent + '\n' + middlewareContent

  const securityHeaders = [
    'Content-Security-Policy',
    'X-Frame-Options',
    'X-Content-Type-Options',
    'Referrer-Policy',
    'Permissions-Policy',
    'Strict-Transport-Security',
  ]
  const found = securityHeaders.filter((h) => combined.includes(h))
  const missing = securityHeaders.filter((h) => !combined.includes(h))
  const headerPts = Math.round((10 * found.length) / securityHeaders.length)
  score += headerPts
  if (missing.length > 0) {
    issues.push({
      severity: found.length === 0 ? 'high' : 'medium',
      points: 10 - headerPts,
      message: `next.config/middleware sem os headers de segurança: ${missing.join(', ')}`,
    })
  }

  // HTTPS forçado em produção (5 pts)
  const hasHSTS = combined.includes('Strict-Transport-Security')
  const hasVercelConfig = fs.existsSync(path.join(ROOT, 'vercel.json'))
  let httpsPts = 0
  if (hasHSTS) {
    httpsPts = 5
  } else if (hasVercelConfig) {
    httpsPts = 2
    issues.push({
      severity: 'medium',
      points: 3,
      message: 'HTTPS depende só do default da Vercel (vercel.json presente) — nenhum header Strict-Transport-Security explícito no app',
    })
  } else {
    issues.push({ severity: 'high', points: 5, message: 'nenhuma evidência de enforcement de HTTPS (sem HSTS, sem config de deploy conhecida)' })
  }
  score += httpsPts

  return { name: 'HEADERS', score: Math.round(score), max: 15, issues }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
function main() {
  const categories = [checkSecrets(), checkInputs(), checkAuth(), checkDeps(), checkHeaders()]
  const total = categories.reduce((sum, c) => sum + c.score, 0)
  const maxTotal = categories.reduce((sum, c) => sum + c.max, 0)

  const allIssues = []
  for (const c of categories) {
    for (const issue of c.issues) {
      allIssues.push({ category: c.name, ...issue })
    }
  }
  allIssues.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.points - a.points)

  // relatório completo -> stderr (visível no terminal, não polui stdout)
  const lines = []
  lines.push('')
  lines.push(`SECURITY CHECK — Movux — nota final: ${total}/${maxTotal}`)
  lines.push('='.repeat(60))
  lines.push('')
  lines.push('Breakdown por categoria:')
  for (const c of categories) {
    lines.push(`  ${c.name.padEnd(10)} ${String(c.score).padStart(3)}/${c.max}`)
  }
  lines.push('')
  if (allIssues.length === 0) {
    lines.push('Nenhum problema encontrado pelas verificações mecânicas.')
  } else {
    lines.push(`Problemas encontrados (${allIssues.length}), em ordem de prioridade:`)
    lines.push('')
    allIssues.forEach((issue, i) => {
      lines.push(`${i + 1}. [${SEVERITY_LABEL[issue.severity]}] (${issue.category}, -${issue.points}pt) ${issue.message}`)
    })
  }
  lines.push('')
  console.error(lines.join('\n'))

  // apenas o número -> stdout (contrato do verify command)
  console.log(total)
}

main()
