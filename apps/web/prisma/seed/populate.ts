/**
 * Full database population: 2026-01-01 → 2026-05-11.
 *
 * Creates 3 tenants (hospital, gym, clinic), 31 users, 15 schedules,
 * ~1 500 shifts with assignments, time entries, requests, and notifications.
 *
 * Run: cd apps/web && npx tsx prisma/seed/populate.ts
 * Idempotent: truncates all data tables before inserting.
 */

import 'dotenv/config'
import { Pool } from 'pg'
import bcryptjs from 'bcryptjs'
import { randomUUID } from 'crypto'

// ─── date helpers ────────────────────────────────────────────────────────────

/** Returns a Date for the given date string + time string in BRT (UTC-3, no DST). */
function brt(date: string, time: string): Date {
  return new Date(`${date}T${time}:00-03:00`)
}

/** Adds N calendar days to a date-string, returns new date-string. */
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Checks if a date string falls on a weekday (Mon–Fri). */
function isWeekday(dateStr: string): boolean {
  const day = new Date(dateStr + 'T12:00:00Z').getUTCDay()
  return day >= 1 && day <= 5
}

/** Generates every date string from startStr to endStr inclusive. */
function* eachDay(startStr: string, endStr: string): Generator<string> {
  let cur = startStr
  while (cur <= endStr) {
    yield cur
    cur = addDays(cur, 1)
  }
}

/** Random int in [min, max]. */
function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** Jitters a Date by ±minutes. */
function jitter(d: Date, minutes: number): Date {
  const delta = rand(-minutes, minutes) * 60_000
  return new Date(d.getTime() + delta)
}

// ─── IDs ─────────────────────────────────────────────────────────────────────

const TENANT = { hosp: randomUUID(), gym: randomUUID(), clinic: randomUUID() }
const WS = { hosp: randomUUID(), gym: randomUUID(), clinic: randomUUID() }

// Hospital users: 1 admin + 2 coords + 12 workers
const HOSP_ADMIN = randomUUID()
const HOSP_COORD_UTI = randomUUID()
const HOSP_COORD_PS = randomUUID()
const HOSP_W = Array.from({ length: 12 }, () => randomUUID())

// Gym users: 1 admin + 1 coord + 7 workers
const GYM_ADMIN = randomUUID()
const GYM_COORD = randomUUID()
const GYM_W = Array.from({ length: 7 }, () => randomUUID())

// Clinic users: 1 admin + 6 workers (includes 1 coordenador)
const CLINIC_ADMIN = randomUUID()
const CLINIC_W = Array.from({ length: 6 }, () => randomUUID())

// Categories (WORKSPACE-scoped)
const CAT = {
  uti: randomUUID(),
  ps: randomUUID(),
  musc: randomUUID(),
  aulas: randomUUID(),
  consult: randomUUID(),
  recepcaoClinic: randomUUID(),
}

// Specialties (WORKSPACE-scoped)
const SPEC = {
  nurse: randomUUID(),
  nurseTech: randomUUID(),
  doctor: randomUUID(),
  weightsInstructor: randomUUID(),
  groupInstructor: randomUUID(),
  clinicDoctor: randomUUID(),
  clinicNurse: randomUUID(),
  receptionist: randomUUID(),
}

// Schedules (5 per workspace = Jan–May 2026)
const HOSP_S = Array.from({ length: 5 }, () => randomUUID())
const GYM_S = Array.from({ length: 5 }, () => randomUUID())
const CLINIC_S = Array.from({ length: 5 }, () => randomUUID())

// ─── NOW reference ────────────────────────────────────────────────────────────
const NOW_UTC = new Date('2026-05-11T13:00:00Z') // = 10:00 BRT

// ─── batch insert helper ──────────────────────────────────────────────────────

async function insertBatch(
  pool: Pool,
  table: string,
  columns: string[],
  rows: unknown[][],
  chunkSize = 500,
) {
  if (rows.length === 0) return
  const colList = columns.map((c) => `"${c}"`).join(', ')
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const placeholders = chunk
      .map(
        (_, ri) =>
          `(${columns.map((_, ci) => `$${ri * columns.length + ci + 1}`).join(', ')})`,
      )
      .join(', ')
    const flat = chunk.flat()
    await pool.query(
      `INSERT INTO "${table}" (${colList}) VALUES ${placeholders}`,
      flat,
    )
  }
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL not set')
  const pool = new Pool({ connectionString })

  try {
    // ── 0. clean slate ────────────────────────────────────────────────────────
    console.log('Truncating existing data…')
    await pool.query(`
      TRUNCATE TABLE
        "notificationPreference", "notification",
        "shiftTimelineNote", "timeEntry",
        "request", "shiftCandidate", "transferRequest",
        "shiftAssignment", "shiftExpectedComposition",
        "shift", "shiftPattern", "schedule",
        "userSpecialty", "specialty", "category",
        "workspaceMembership", "workspace",
        "tenantMembership", "tenant",
        "auditLog", "user"
      CASCADE
    `)

    // ── 1. password hash ──────────────────────────────────────────────────────
    console.log('Hashing passwords…')
    const hash = await bcryptjs.hash('senha123', 10)

    // ── 2. users ──────────────────────────────────────────────────────────────
    console.log('Inserting users…')
    type UserRow = [string, string, string, string, string | null, string | null]
    const userRows: UserRow[] = [
      // Hospital
      [HOSP_ADMIN,      'Dr. João Mendes',          'admin@hospitalsaolucas.com.br',    hash, '+5511991110001', '1978-03-12'],
      [HOSP_COORD_UTI,  'Ana Paula Costa',           'coord.uti@hospitalsaolucas.com.br', hash, '+5511991110002', '1985-07-22'],
      [HOSP_COORD_PS,   'Paulo Henrique Santos',     'coord.ps@hospitalsaolucas.com.br',  hash, '+5511991110003', '1982-11-05'],
      [HOSP_W[0],  'Maria Eduarda Silva',       'maria.silva@hospitalsaolucas.com.br',      hash, '+5511991110010', '1990-02-14'],
      [HOSP_W[1],  'Carlos Roberto Oliveira',   'carlos.oliveira@hospitalsaolucas.com.br',  hash, '+5511991110011', '1988-06-30'],
      [HOSP_W[2],  'Fernanda Lima',             'fernanda.lima@hospitalsaolucas.com.br',     hash, '+5511991110012', '1992-09-08'],
      [HOSP_W[3],  'Lucas Rocha',               'lucas.rocha@hospitalsaolucas.com.br',       hash, '+5511991110013', '1986-04-17'],
      [HOSP_W[4],  'Patrícia Alves',            'patricia.alves@hospitalsaolucas.com.br',    hash, '+5511991110014', '1993-12-01'],
      [HOSP_W[5],  'Roberto Ferreira',          'roberto.ferreira@hospitalsaolucas.com.br',  hash, '+5511991110015', '1987-08-25'],
      [HOSP_W[6],  'Juliana Nascimento',        'juliana.nascimento@hospitalsaolucas.com.br',hash, '+5511991110016', '1994-05-19'],
      [HOSP_W[7],  'Antônio Barbosa',           'antonio.barbosa@hospitalsaolucas.com.br',   hash, '+5511991110017', '1989-10-03'],
      [HOSP_W[8],  'Camila Souza',              'camila.souza@hospitalsaolucas.com.br',      hash, '+5511991110018', '1991-01-28'],
      [HOSP_W[9],  'Marcos Santos',             'marcos.santos@hospitalsaolucas.com.br',     hash, '+5511991110019', '1984-07-14'],
      [HOSP_W[10], 'Beatriz Rocha',             'beatriz.rocha@hospitalsaolucas.com.br',     hash, '+5511991110020', '1995-03-06'],
      [HOSP_W[11], 'Rafael Gomes',              'rafael.gomes@hospitalsaolucas.com.br',      hash, '+5511991110021', '1996-11-22'],
      // Gym
      [GYM_ADMIN,   'Carlos Eduardo Lima',     'admin@fitlife.com.br',       hash, '+5511992220001', '1980-05-15'],
      [GYM_COORD,   'Sandra Melo',             'coord@fitlife.com.br',       hash, '+5511992220002', '1987-09-20'],
      [GYM_W[0],   'Diego Carvalho',           'diego.carvalho@fitlife.com.br',    hash, '+5511992220010', '1991-03-11'],
      [GYM_W[1],   'Aline Fernandes',          'aline.fernandes@fitlife.com.br',   hash, '+5511992220011', '1993-06-28'],
      [GYM_W[2],   'Thiago Costa',             'thiago.costa@fitlife.com.br',      hash, '+5511992220012', '1989-12-03'],
      [GYM_W[3],   'Priscila Martins',         'priscila.martins@fitlife.com.br',  hash, '+5511992220013', '1994-08-17'],
      [GYM_W[4],   'Guilherme Lima',           'guilherme.lima@fitlife.com.br',    hash, '+5511992220014', '1990-01-22'],
      [GYM_W[5],   'Natália Santos',           'natalia.santos@fitlife.com.br',    hash, '+5511992220015', '1997-04-09'],
      [GYM_W[6],   'Henrique Vieira',          'henrique.vieira@fitlife.com.br',   hash, '+5511992220016', '1999-07-30'],
      // Clinic
      [CLINIC_ADMIN,   'Dra. Marina Silva',    'admin@clinicabemestar.com.br',       hash, '+5511993330001', '1979-08-04'],
      [CLINIC_W[0],   'Dr. Roberto Costa',     'roberto.costa@clinicabemestar.com.br',    hash, '+5511993330010', '1976-02-19'],
      [CLINIC_W[1],   'Luciana Pereira',       'luciana.pereira@clinicabemestar.com.br',  hash, '+5511993330011', '1988-10-07'],
      [CLINIC_W[2],   'Fernanda Xavier',       'fernanda.xavier@clinicabemestar.com.br',  hash, '+5511993330012', '1992-05-25'],
      [CLINIC_W[3],   'Alex Nogueira',         'alex.nogueira@clinicabemestar.com.br',    hash, '+5511993330013', '1995-09-13'],
      [CLINIC_W[4],   'Dra. Isabela Torres',   'isabela.torres@clinicabemestar.com.br',   hash, '+5511993330014', '1983-12-30'],
      [CLINIC_W[5],   'Paulo Andrade',         'paulo.andrade@clinicabemestar.com.br',    hash, '+5511993330015', '1990-06-16'],
    ]

    await insertBatch(pool, 'user', ['id', 'full_name', 'email', 'password_hash', 'phone', 'date_of_birth', 'email_verified', 'is_active', 'updated_at'],
      userRows.map(([id, name, email, pw, phone, dob]) => [id, name, email, pw, phone, dob, true, true, new Date()])
    )

    // ── 3. tenants ────────────────────────────────────────────────────────────
    console.log('Inserting tenants…')
    await insertBatch(pool, 'tenant', ['id', 'name', 'timezone', 'plan', 'is_active', 'created_at', 'updated_at'], [
      [TENANT.hosp,  'Hospital São Lucas',   'America/Sao_Paulo', 'BUSINESS',   true, new Date('2025-11-01'), new Date()],
      [TENANT.gym,   'Academia FitLife',     'America/Sao_Paulo', 'SMALL_TEAM', true, new Date('2025-12-01'), new Date()],
      [TENANT.clinic,'Clínica Bem Estar',    'America/Sao_Paulo', 'FREE',       true, new Date('2026-01-10'), new Date()],
    ])

    // ── 4. tenant memberships ─────────────────────────────────────────────────
    console.log('Inserting tenant memberships…')
    await insertBatch(pool, 'tenantMembership', ['id', 'tenant_id', 'user_id', 'role', 'is_active', 'updated_at'], [
      [randomUUID(), TENANT.hosp,  HOSP_ADMIN,   'SUPER_ADMIN', true, new Date()],
      [randomUUID(), TENANT.gym,   GYM_ADMIN,    'SUPER_ADMIN', true, new Date()],
      [randomUUID(), TENANT.clinic,CLINIC_ADMIN, 'SUPER_ADMIN', true, new Date()],
    ])

    // ── 5. workspaces ─────────────────────────────────────────────────────────
    console.log('Inserting workspaces…')
    await insertBatch(pool, 'workspace', ['id', 'tenant_id', 'name', 'timezone', 'vertical', 'clock_tolerance_minutes', 'is_active', 'updated_at'], [
      [WS.hosp,  TENANT.hosp,  'Hospital São Lucas — Centro',  'America/Sao_Paulo', 'HOSPITAL', 15, true, new Date()],
      [WS.gym,   TENANT.gym,   'FitLife — Unidade Jardins',    'America/Sao_Paulo', 'GYM',      10, true, new Date()],
      [WS.clinic,TENANT.clinic,'Clínica Bem Estar — Centro',   'America/Sao_Paulo', 'CLINIC',   15, true, new Date()],
    ])

    // ── 6. workspace memberships ──────────────────────────────────────────────
    console.log('Inserting workspace memberships…')
    const wsMembRows: unknown[][] = [
      // Hospital
      [randomUUID(), WS.hosp, HOSP_ADMIN,      'ADMIN',       true, new Date()],
      [randomUUID(), WS.hosp, HOSP_COORD_UTI,  'COORDENADOR', true, new Date()],
      [randomUUID(), WS.hosp, HOSP_COORD_PS,   'COORDENADOR', true, new Date()],
      ...HOSP_W.map((id) => [randomUUID(), WS.hosp, id, 'COLABORADOR', true, new Date()]),
      // Gym
      [randomUUID(), WS.gym, GYM_ADMIN, 'ADMIN',       true, new Date()],
      [randomUUID(), WS.gym, GYM_COORD, 'COORDENADOR', true, new Date()],
      ...GYM_W.map((id) => [randomUUID(), WS.gym, id, 'COLABORADOR', true, new Date()]),
      // Clinic
      [randomUUID(), WS.clinic, CLINIC_ADMIN, 'ADMIN',       true, new Date()],
      [randomUUID(), WS.clinic, CLINIC_W[0],  'COORDENADOR', true, new Date()], // Dr. Roberto Costa coord
      ...CLINIC_W.slice(1).map((id) => [randomUUID(), WS.clinic, id, 'COLABORADOR', true, new Date()]),
    ]
    await insertBatch(pool, 'workspaceMembership', ['id', 'workspace_id', 'user_id', 'role', 'is_active', 'updated_at'], wsMembRows)

    // ── 7. categories (WORKSPACE-scoped) ──────────────────────────────────────
    console.log('Inserting categories…')
    await insertBatch(pool, 'category', ['id', 'scope', 'vertical', 'workspace_id', 'slug', 'name', 'is_active', 'updated_at'], [
      [CAT.uti,          'WORKSPACE', 'HOSPITAL', WS.hosp,   'icu',          'UTI',                  true, new Date()],
      [CAT.ps,           'WORKSPACE', 'HOSPITAL', WS.hosp,   'emergency',    'Pronto-Socorro',        true, new Date()],
      [CAT.musc,         'WORKSPACE', 'GYM',      WS.gym,    'weights',      'Musculação',            true, new Date()],
      [CAT.aulas,        'WORKSPACE', 'GYM',      WS.gym,    'classes',      'Aulas Coletivas',       true, new Date()],
      [CAT.consult,      'WORKSPACE', 'CLINIC',   WS.clinic, 'consultation', 'Consultório',           true, new Date()],
      [CAT.recepcaoClinic,'WORKSPACE','CLINIC',   WS.clinic, 'reception',    'Recepção',              true, new Date()],
    ])

    // ── 8. specialties (WORKSPACE-scoped) ─────────────────────────────────────
    console.log('Inserting specialties…')
    await insertBatch(pool, 'specialty', ['id', 'scope', 'vertical', 'workspace_id', 'slug', 'name', 'is_active', 'updated_at'], [
      [SPEC.nurse,            'WORKSPACE', 'HOSPITAL', WS.hosp,   'nurse',              'Enfermeiro(a)',                   true, new Date()],
      [SPEC.nurseTech,        'WORKSPACE', 'HOSPITAL', WS.hosp,   'nurse_tech',         'Técnico(a) de Enfermagem',        true, new Date()],
      [SPEC.doctor,           'WORKSPACE', 'HOSPITAL', WS.hosp,   'doctor',             'Médico(a)',                       true, new Date()],
      [SPEC.weightsInstructor,'WORKSPACE', 'GYM',      WS.gym,    'weights_instructor', 'Instrutor(a) de Musculação',      true, new Date()],
      [SPEC.groupInstructor,  'WORKSPACE', 'GYM',      WS.gym,    'group_instructor',   'Professor(a) de Aulas Coletivas', true, new Date()],
      [SPEC.clinicDoctor,     'WORKSPACE', 'CLINIC',   WS.clinic, 'doctor',             'Médico(a)',                       true, new Date()],
      [SPEC.clinicNurse,      'WORKSPACE', 'CLINIC',   WS.clinic, 'nurse',              'Enfermeiro(a)',                   true, new Date()],
      [SPEC.receptionist,     'WORKSPACE', 'CLINIC',   WS.clinic, 'receptionist',       'Recepcionista',                   true, new Date()],
    ])

    // ── 9. user specialties ───────────────────────────────────────────────────
    console.log('Inserting user specialties…')
    const usRows: unknown[][] = [
      // Hospital
      ...[HOSP_W[0], HOSP_W[2], HOSP_W[8]].map((id) => [randomUUID(), id, WS.hosp, SPEC.nurse,     true, new Date()]),
      ...[HOSP_W[1], HOSP_W[4], HOSP_W[6], HOSP_W[7], HOSP_W[11]].map((id) => [randomUUID(), id, WS.hosp, SPEC.nurseTech, true, new Date()]),
      ...[HOSP_W[3], HOSP_W[9]].map((id) => [randomUUID(), id, WS.hosp, SPEC.doctor, true, new Date()]),
      [randomUUID(), HOSP_W[5],  WS.hosp, SPEC.nurse,     true, new Date()],
      [randomUUID(), HOSP_W[10], WS.hosp, SPEC.nurseTech, true, new Date()],
      // Gym
      ...[GYM_W[0], GYM_W[2], GYM_W[4], GYM_W[6]].map((id) => [randomUUID(), id, WS.gym, SPEC.weightsInstructor, true, new Date()]),
      ...[GYM_W[1], GYM_W[3]].map((id) => [randomUUID(), id, WS.gym, SPEC.groupInstructor, true, new Date()]),
      // Clinic
      ...[CLINIC_ADMIN, CLINIC_W[0], CLINIC_W[4]].map((id) => [randomUUID(), id, WS.clinic, SPEC.clinicDoctor,   true, new Date()]),
      ...[CLINIC_W[1], CLINIC_W[2]].map((id) => [randomUUID(), id, WS.clinic, SPEC.clinicNurse,     true, new Date()]),
      ...[CLINIC_W[3], CLINIC_W[5]].map((id) => [randomUUID(), id, WS.clinic, SPEC.receptionist,    true, new Date()]),
    ]
    await insertBatch(pool, 'userSpecialty', ['id', 'user_id', 'workspace_id', 'specialty_id', 'is_active', 'updated_at'], usRows)

    // ── 10. schedules ─────────────────────────────────────────────────────────
    console.log('Inserting schedules…')
    const scheduleMonths = [
      { month: '01', label: 'Janeiro 2026',   start: '2026-01-01', end: '2026-01-31' },
      { month: '02', label: 'Fevereiro 2026', start: '2026-02-01', end: '2026-02-28' },
      { month: '03', label: 'Março 2026',     start: '2026-03-01', end: '2026-03-31' },
      { month: '04', label: 'Abril 2026',     start: '2026-04-01', end: '2026-04-30' },
      { month: '05', label: 'Maio 2026',      start: '2026-05-01', end: '2026-05-31' },
    ]

    type ScheduleStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED'
    const scheduleRows: unknown[][] = []
    for (let i = 0; i < 5; i++) {
      const m = scheduleMonths[i]
      const status: ScheduleStatus = i < 4 ? 'CLOSED' : 'PUBLISHED'
      const publishedAt = status === 'CLOSED' ? new Date(`${m.start}T09:00:00-03:00`) : new Date('2026-04-28T09:00:00-03:00')
      const closedAt = status === 'CLOSED' ? new Date(`${addDays(m.end, 3)}T10:00:00-03:00`) : null
      for (const [idx, wsId] of [[0, WS.hosp], [1, WS.gym], [2, WS.clinic]] as [number, string][]) {
        const catId = idx === 0 ? CAT.uti : idx === 1 ? CAT.musc : CAT.consult
        const schedIds = idx === 0 ? HOSP_S : idx === 1 ? GYM_S : CLINIC_S
        scheduleRows.push([
          schedIds[i], wsId, catId, m.label,
          new Date(m.start + 'T00:00:00-03:00'),
          new Date(m.end + 'T23:59:59-03:00'),
          status, publishedAt, closedAt, true, publishedAt, new Date(),
        ])
      }
    }
    await insertBatch(pool, 'schedule', [
      'id', 'workspace_id', 'category_id', 'name',
      'period_start', 'period_end', 'status',
      'published_at', 'closed_at', 'is_active', 'created_at', 'updated_at',
    ], scheduleRows)

    // ── 11. shifts + assignments + time entries ───────────────────────────────
    console.log('Generating shifts…')

    type Shift = {
      id: string; scheduleId: string; categoryId: string
      startAt: Date; endAt: Date; headcount: number; status: string
    }
    type Assignment = {
      id: string; shiftId: string; userId: string; assignedByUserId: string
      status: string; decisionDeadline: Date; decidedAt: Date | null
    }
    type TimeEntry = {
      id: string; shiftAssignmentId: string; userId: string
      clockInAt: Date; clockOutAt: Date | null
      clockInWithinTolerance: boolean; clockOutWithinTolerance: boolean | null
      overtimeMinutes: number; closedAt: Date | null; closedByUserId: string | null
    }

    const shifts: Shift[] = []
    const assignments: Assignment[] = []
    const timeEntries: TimeEntry[] = []

    // ── Hospital shift patterns ──────────────────────────────────────────────
    // UTI: Diurno 07:00-19:00 (headcount 2), Noturno 19:00-07:00 (headcount 2)
    // PS: Manhã 07:00-15:00 (hc 3), Tarde 15:00-23:00 (hc 3), Noite 23:00-07:00 (hc 2)
    const hospPatterns = [
      { catId: CAT.uti, timeStart: '07:00', timeEnd: '19:00', crossesMidnight: false, hc: 2 },
      { catId: CAT.uti, timeStart: '19:00', timeEnd: '07:00', crossesMidnight: true,  hc: 2 },
      { catId: CAT.ps,  timeStart: '07:00', timeEnd: '15:00', crossesMidnight: false, hc: 3 },
      { catId: CAT.ps,  timeStart: '15:00', timeEnd: '23:00', crossesMidnight: false, hc: 2 },
      { catId: CAT.ps,  timeStart: '23:00', timeEnd: '07:00', crossesMidnight: true,  hc: 2 },
    ]
    const hospWorkerPool = HOSP_W // 12 workers, round-robin per shift slot
    const hospSupervisor = HOSP_COORD_UTI

    // ── Gym shift patterns ────────────────────────────────────────────────────
    // Musculação: Manhã 06-10, Tarde 14-18, Noite 18-22 (hc 2 each)
    // Aulas: Manhã 09-12, Noite 19-21 (hc 1 each) – weekdays only
    const gymPatterns = [
      { catId: CAT.musc,  timeStart: '06:00', timeEnd: '10:00', crossesMidnight: false, hc: 2, weekdayOnly: false },
      { catId: CAT.musc,  timeStart: '14:00', timeEnd: '18:00', crossesMidnight: false, hc: 2, weekdayOnly: false },
      { catId: CAT.musc,  timeStart: '18:00', timeEnd: '22:00', crossesMidnight: false, hc: 2, weekdayOnly: false },
      { catId: CAT.aulas, timeStart: '09:00', timeEnd: '12:00', crossesMidnight: false, hc: 1, weekdayOnly: true },
      { catId: CAT.aulas, timeStart: '19:00', timeEnd: '21:00', crossesMidnight: false, hc: 1, weekdayOnly: true },
    ]
    // Workers for each gym category
    const gymMuscWorkers = [GYM_W[0], GYM_W[2], GYM_W[4], GYM_W[6]] // instructors
    const gymAulasWorkers = [GYM_W[1], GYM_W[3]] // group instructors
    const gymSupervisor = GYM_COORD

    // ── Clinic shift patterns ─────────────────────────────────────────────────
    // Consultório: Manhã 08-14 (hc 2), Tarde 14-19 (hc 2) – weekdays
    // Recepção: Integral 07-19 (hc 1) – weekdays
    const clinicPatterns = [
      { catId: CAT.consult,       timeStart: '08:00', timeEnd: '14:00', crossesMidnight: false, hc: 2, weekdayOnly: true },
      { catId: CAT.consult,       timeStart: '14:00', timeEnd: '19:00', crossesMidnight: false, hc: 2, weekdayOnly: true },
      { catId: CAT.recepcaoClinic,timeStart: '07:00', timeEnd: '19:00', crossesMidnight: false, hc: 1, weekdayOnly: true },
    ]
    const clinicDoctors = [CLINIC_ADMIN, CLINIC_W[0], CLINIC_W[4]] // doctors
    const clinicNurses = [CLINIC_W[1], CLINIC_W[2]] // nurses/techs
    const clinicReception = [CLINIC_W[3], CLINIC_W[5]] // receptionists
    const clinicSupervisor = CLINIC_W[0]

    // ── shift generation ─────────────────────────────────────────────────────
    let hospShiftIdx = 0
    let gymShiftIdx = 0
    let clinicShiftIdx = 0

    function getScheduleId(wsKey: 'hosp' | 'gym' | 'clinic', dateStr: string): string {
      const month = parseInt(dateStr.slice(5, 7), 10)
      const i = month - 1 // Jan=0…May=4
      if (wsKey === 'hosp')  return HOSP_S[i]
      if (wsKey === 'gym')   return GYM_S[i]
      return CLINIC_S[i]
    }

    function makeAssignment(
      shiftId: string, userId: string, supervisorId: string,
      shiftStart: Date, shiftEnd: Date, shiftIdx: number,
    ): void {
      const isPast = shiftEnd <= NOW_UTC
      const isOngoing = shiftStart <= NOW_UTC && shiftEnd > NOW_UTC
      const isFuture = shiftStart > NOW_UTC

      const assignmentId = randomUUID()
      // ~5% of past assignments are CANCELLED (worker no-showed)
      const isCancelled = isPast && (shiftIdx % 20 === 7)
      const deadline = new Date(shiftStart.getTime() - 24 * 3600_000)

      const status = isCancelled
        ? 'CANCELLED'
        : isPast || isOngoing
          ? 'COMPLETED'
          : isFuture && shiftIdx % 5 === 0
            ? 'PENDING_ACCEPT'
            : 'ACCEPTED'

      const decidedAt = (status === 'COMPLETED' || status === 'ACCEPTED')
        ? new Date(Math.min(deadline.getTime(), shiftStart.getTime() - 3600_000))
        : status === 'CANCELLED'
          ? new Date(shiftStart.getTime() - 2 * 3600_000)
          : null

      assignments.push({ id: assignmentId, shiftId, userId, assignedByUserId: supervisorId, status, decisionDeadline: deadline, decidedAt })

      if (status === 'COMPLETED' && isPast) {
        const clockIn = jitter(shiftStart, 8)
        const clockOut = jitter(shiftEnd, 12)
        const overMinutes = Math.max(0, Math.round((clockOut.getTime() - shiftEnd.getTime()) / 60_000))
        timeEntries.push({
          id: randomUUID(),
          shiftAssignmentId: assignmentId,
          userId,
          clockInAt: clockIn,
          clockOutAt: clockOut,
          clockInWithinTolerance: Math.abs(clockIn.getTime() - shiftStart.getTime()) <= 15 * 60_000,
          clockOutWithinTolerance: Math.abs(clockOut.getTime() - shiftEnd.getTime()) <= 15 * 60_000,
          overtimeMinutes: overMinutes,
          closedAt: clockOut,
          closedByUserId: null,
        })
      } else if (status === 'COMPLETED' && isOngoing) {
        const clockIn = jitter(shiftStart, 8)
        timeEntries.push({
          id: randomUUID(),
          shiftAssignmentId: assignmentId,
          userId,
          clockInAt: clockIn,
          clockOutAt: null,
          clockInWithinTolerance: true,
          clockOutWithinTolerance: null,
          overtimeMinutes: 0,
          closedAt: null,
          closedByUserId: null,
        })
      }
    }

    // Hospital
    for (const dateStr of eachDay('2026-01-01', '2026-05-11')) {
      for (const pat of hospPatterns) {
        const startAt = brt(dateStr, pat.timeStart)
        const endAt = pat.crossesMidnight
          ? brt(addDays(dateStr, 1), pat.timeEnd)
          : brt(dateStr, pat.timeEnd)
        const isPast = endAt <= NOW_UTC
        const isOngoing = startAt <= NOW_UTC && endAt > NOW_UTC
        const shiftStatus = isPast ? 'COMPLETED' : isOngoing ? 'FILLED' : 'OPEN'
        const schedId = getScheduleId('hosp', dateStr)

        const shiftId = randomUUID()
        shifts.push({ id: shiftId, scheduleId: schedId, categoryId: pat.catId, startAt, endAt, headcount: pat.hc, status: shiftStatus })

        for (let slot = 0; slot < pat.hc; slot++) {
          const workerIdx = (hospShiftIdx + slot) % hospWorkerPool.length
          makeAssignment(shiftId, hospWorkerPool[workerIdx], hospSupervisor, startAt, endAt, hospShiftIdx + slot)
        }
        hospShiftIdx += pat.hc
      }
    }

    // Gym
    for (const dateStr of eachDay('2026-01-01', '2026-05-11')) {
      for (const pat of gymPatterns) {
        if (pat.weekdayOnly && !isWeekday(dateStr)) continue
        const startAt = brt(dateStr, pat.timeStart)
        const endAt = pat.crossesMidnight
          ? brt(addDays(dateStr, 1), pat.timeEnd)
          : brt(dateStr, pat.timeEnd)
        const isPast = endAt <= NOW_UTC
        const isOngoing = startAt <= NOW_UTC && endAt > NOW_UTC
        const shiftStatus = isPast ? 'COMPLETED' : isOngoing ? 'FILLED' : 'OPEN'
        const schedId = getScheduleId('gym', dateStr)
        const workerPool = pat.catId === CAT.musc ? gymMuscWorkers : gymAulasWorkers

        const shiftId = randomUUID()
        shifts.push({ id: shiftId, scheduleId: schedId, categoryId: pat.catId, startAt, endAt, headcount: pat.hc, status: shiftStatus })

        for (let slot = 0; slot < pat.hc; slot++) {
          const workerIdx = (gymShiftIdx + slot) % workerPool.length
          makeAssignment(shiftId, workerPool[workerIdx], gymSupervisor, startAt, endAt, gymShiftIdx + slot)
        }
        gymShiftIdx += pat.hc
      }
    }

    // Clinic
    for (const dateStr of eachDay('2026-01-01', '2026-05-11')) {
      if (!isWeekday(dateStr)) continue
      for (const pat of clinicPatterns) {
        const startAt = brt(dateStr, pat.timeStart)
        const endAt = brt(dateStr, pat.timeEnd)
        const isPast = endAt <= NOW_UTC
        const isOngoing = startAt <= NOW_UTC && endAt > NOW_UTC
        const shiftStatus = isPast ? 'COMPLETED' : isOngoing ? 'FILLED' : 'OPEN'
        const schedId = getScheduleId('clinic', dateStr)
        const workerPool = pat.catId === CAT.recepcaoClinic
          ? clinicReception
          : (clinicShiftIdx % 3 === 0 ? [...clinicDoctors, ...clinicNurses] : [...clinicDoctors, ...clinicNurses])

        const shiftId = randomUUID()
        shifts.push({ id: shiftId, scheduleId: schedId, categoryId: pat.catId, startAt, endAt, headcount: pat.hc, status: shiftStatus })

        for (let slot = 0; slot < pat.hc; slot++) {
          const workerIdx = (clinicShiftIdx + slot) % workerPool.length
          makeAssignment(shiftId, workerPool[workerIdx], clinicSupervisor, startAt, endAt, clinicShiftIdx + slot)
        }
        clinicShiftIdx += pat.hc
      }
    }

    console.log(`  ${shifts.length} shifts, ${assignments.length} assignments, ${timeEntries.length} time entries`)

    // Insert shifts
    console.log('Inserting shifts…')
    await insertBatch(pool, 'shift', [
      'id', 'schedule_id', 'category_id', 'start_at', 'end_at',
      'headcount', 'status', 'assignment_mode', 'decision_window_hours', 'updated_at',
    ], shifts.map((s) => [s.id, s.scheduleId, s.categoryId, s.startAt, s.endAt, s.headcount, s.status, 'DIRECT_ASSIGN', 48, new Date()]))

    // Insert assignments
    console.log('Inserting assignments…')
    await insertBatch(pool, 'shiftAssignment', [
      'id', 'shift_id', 'user_id', 'assigned_by_user_id',
      'status', 'decision_deadline', 'decided_at', 'updated_at',
    ], assignments.map((a) => [a.id, a.shiftId, a.userId, a.assignedByUserId, a.status, a.decisionDeadline, a.decidedAt, new Date()]))

    // Insert time entries
    console.log('Inserting time entries…')
    await insertBatch(pool, 'timeEntry', [
      'id', 'shift_assignment_id', 'user_id',
      'clock_in_at', 'clock_in_within_tolerance',
      'clock_out_at', 'clock_out_within_tolerance',
      'overtime_minutes', 'closed_at', 'closed_by_user_id', 'updated_at',
    ], timeEntries.map((t) => [
      t.id, t.shiftAssignmentId, t.userId,
      t.clockInAt, t.clockInWithinTolerance,
      t.clockOutAt, t.clockOutWithinTolerance,
      t.overtimeMinutes, t.closedAt, t.closedByUserId, new Date(),
    ]))

    // ── 12. requests ─────────────────────────────────────────────────────────
    console.log('Inserting requests…')
    const requestRows: unknown[][] = []

    // Pick a few hospital assignments for SWAP and TIME_OFF
    const hospPastAssignments = assignments.filter(
      (a) => a.status === 'COMPLETED' && shifts.find((s) => s.id === a.shiftId && s.startAt > new Date('2026-02-01') && s.startAt < new Date('2026-04-01') && s.categoryId === CAT.ps)
    ).slice(0, 4)

    // 2 APPROVED TIME_OFF requests
    for (let i = 0; i < 2; i++) {
      const requester = HOSP_W[i]
      const timeOffStart = new Date('2026-03-10T07:00:00-03:00')
      const timeOffEnd = new Date('2026-03-12T19:00:00-03:00')
      requestRows.push([
        randomUUID(), WS.hosp, 'TIME_OFF', 'APPROVED',
        requester, HOSP_COORD_UTI,
        `Motivo pessoal — folga ${i === 0 ? 'médica' : 'familiar'}`, 'Solicitação aprovada conforme política da unidade',
        null, null, null,
        null, null, null, null, null, null,
        timeOffStart, timeOffEnd,
        new Date('2026-03-08T10:00:00-03:00'),
        new Date('2026-02-28T14:00:00-03:00'), new Date(),
      ])
    }

    // 1 APPROVED SWAP request
    if (hospPastAssignments.length >= 2) {
      const [src, tgt] = hospPastAssignments
      requestRows.push([
        randomUUID(), WS.hosp, 'SWAP', 'APPROVED',
        src.userId!, HOSP_COORD_PS,
        'Necessito trocar turno por compromisso pessoal', 'Troca autorizada',
        null, null, null,
        src.id, tgt.userId, tgt.id, new Date('2026-02-15T09:00:00-03:00'), null,
        null,
        null, null,
        new Date('2026-02-14T11:00:00-03:00'),
        new Date('2026-02-12T08:00:00-03:00'), new Date(),
      ])
    }

    // 1 PENDING_PEER SWAP (recent – peer hasn't decided yet, but target assignment is known)
    const recentPairs = assignments.filter(
      (a) => a.status === 'ACCEPTED' && a.userId != null && shifts.find((s) => s.id === a.shiftId && s.startAt > NOW_UTC)
    )
    const srcSwap2 = recentPairs[0]
    const tgtSwap2 = recentPairs.find((a) => a.id !== srcSwap2?.id && a.userId !== srcSwap2?.userId)
    if (srcSwap2 && tgtSwap2) {
      requestRows.push([
        randomUUID(), WS.hosp, 'SWAP', 'PENDING_PEER',
        srcSwap2.userId!, null,
        'Preciso trocar turno da próxima semana', null,
        null, null, null,
        srcSwap2.id, tgtSwap2.userId, tgtSwap2.id, null, null,
        null, null, null,
        null,
        new Date('2026-05-09T10:00:00-03:00'), new Date(),
      ])
    }

    // 2 TIME_OFF for gym
    for (let i = 0; i < 2; i++) {
      const requester = GYM_W[i]
      requestRows.push([
        randomUUID(), WS.gym, 'TIME_OFF', i === 0 ? 'APPROVED' : 'PENDING',
        requester, i === 0 ? GYM_COORD : null,
        `Férias — ${i === 0 ? 'fevereiro' : 'maio'}`, i === 0 ? 'Aprovado' : null,
        null, null, null,
        null, null, null, null, null, null,
        new Date(`2026-0${i === 0 ? '2' : '5'}-10T00:00:00-03:00`),
        new Date(`2026-0${i === 0 ? '2' : '5'}-21T00:00:00-03:00`),
        i === 0 ? new Date('2026-02-05T09:00:00-03:00') : null,
        new Date(`2026-0${i === 0 ? '1' : '5'}-28T10:00:00-03:00`), new Date(),
      ])
    }

    if (requestRows.length > 0) {
      await insertBatch(pool, 'request', [
        'id', 'workspace_id', 'type', 'status',
        'requested_by_id', 'resolved_by_id',
        'reason', 'resolution_reason',
        'attachment_url', 'attachment_mime_type', 'attachment_size_bytes',
        'swap_source_assignment_id', 'swap_target_user_id', 'swap_target_assignment_id',
        'peer_accepted_at', 'peer_rejected_at',
        'offer_source_assignment_id',
        'time_off_start', 'time_off_end',
        'resolved_at', 'created_at', 'updated_at',
      ], requestRows)
    }

    // ── 13. timeline notes ────────────────────────────────────────────────────
    console.log('Inserting timeline notes…')
    const noteTemplates = [
      'Turno sem intercorrências.',
      'Paciente encaminhado para UTI durante o turno.',
      'Equipe completa. Passagem de plantão realizada.',
      'Falta de material — solicitação feita à administração.',
      'Ótimo desempenho da equipe neste turno.',
      'Aluno com dificuldades adaptativas orientado durante a aula.',
      'Equipamento de musculação em manutenção — turno adaptado.',
      'Consulta de urgência atendida fora do horário marcado.',
    ]

    const noteRows: unknown[][] = []
    const hospPastShifts = shifts.filter((s) => s.status === 'COMPLETED' && s.scheduleId === HOSP_S[1]).slice(0, 20)
    const gymPastShifts = shifts.filter((s) => s.status === 'COMPLETED' && s.scheduleId === GYM_S[2]).slice(0, 10)
    const clinicPastShifts = shifts.filter((s) => s.status === 'COMPLETED' && s.scheduleId === CLINIC_S[3]).slice(0, 8)

    for (const shift of [...hospPastShifts, ...gymPastShifts, ...clinicPastShifts]) {
      const wsAssignments = assignments.filter((a) => a.shiftId === shift.id && a.userId != null)
      const author = wsAssignments.length > 0 ? wsAssignments[0].userId! : HOSP_COORD_UTI
      const note = noteTemplates[Math.floor(Math.random() * noteTemplates.length)]
      const noteAt = jitter(shift.endAt, 30)
      noteRows.push([randomUUID(), shift.id, author, note, noteAt])
    }

    if (noteRows.length > 0) {
      await insertBatch(pool, 'shiftTimelineNote', ['id', 'shift_id', 'author_user_id', 'note', 'created_at'], noteRows)
    }

    // ── 14. notifications ─────────────────────────────────────────────────────
    console.log('Inserting notifications…')
    const notifRows: unknown[][] = []

    // SCHEDULE_PUBLISHED notification for all workspace members on each schedule publish
    const hospMembers = [HOSP_ADMIN, HOSP_COORD_UTI, HOSP_COORD_PS, ...HOSP_W]
    const gymMembers = [GYM_ADMIN, GYM_COORD, ...GYM_W]
    const clinicMembers = [CLINIC_ADMIN, ...CLINIC_W]

    for (let i = 0; i < 5; i++) {
      const m = scheduleMonths[i]
      for (const userId of hospMembers) {
        notifRows.push([randomUUID(), userId, WS.hosp, 'SCHEDULE_PUBLISHED', JSON.stringify({ scheduleName: m.label, period: m.start }), null, new Date(m.start + 'T09:00:00-03:00')])
      }
    }
    for (let i = 0; i < 5; i++) {
      const m = scheduleMonths[i]
      for (const userId of gymMembers) {
        notifRows.push([randomUUID(), userId, WS.gym, 'SCHEDULE_PUBLISHED', JSON.stringify({ scheduleName: m.label, period: m.start }), null, new Date(m.start + 'T09:00:00-03:00')])
      }
    }

    // ASSIGNMENT_CREATED notifications for future assignments
    const futureAssignments = assignments.filter(
      (a) => shifts.find((s) => s.id === a.shiftId && s.startAt > NOW_UTC)
    ).slice(0, 60)
    for (const a of futureAssignments) {
      const shift = shifts.find((s) => s.id === a.shiftId)!
      const wsId = shift.categoryId === CAT.uti || shift.categoryId === CAT.ps ? WS.hosp
        : shift.categoryId === CAT.musc || shift.categoryId === CAT.aulas ? WS.gym
        : WS.clinic
      notifRows.push([
        randomUUID(), a.userId!, wsId, 'ASSIGNMENT_CREATED',
        JSON.stringify({ shiftId: a.shiftId, startAt: shift.startAt }),
        null, new Date(shift.startAt.getTime() - 24 * 3600_000),
      ])
    }

    await insertBatch(pool, 'notification', ['id', 'user_id', 'workspace_id', 'type', 'payload', 'read_at', 'created_at'], notifRows)

    // ── 15. audit logs ────────────────────────────────────────────────────────
    console.log('Inserting audit logs…')
    const auditRows: unknown[][] = [
      [randomUUID(), HOSP_ADMIN,   'TENANT_CREATED',    'Tenant',    TENANT.hosp,  JSON.stringify({ name: 'Hospital São Lucas' }),  new Date('2025-11-01')],
      [randomUUID(), GYM_ADMIN,    'TENANT_CREATED',    'Tenant',    TENANT.gym,   JSON.stringify({ name: 'Academia FitLife' }),     new Date('2025-12-01')],
      [randomUUID(), CLINIC_ADMIN, 'TENANT_CREATED',    'Tenant',    TENANT.clinic,JSON.stringify({ name: 'Clínica Bem Estar' }),    new Date('2026-01-10')],
      [randomUUID(), HOSP_ADMIN,   'WORKSPACE_CREATED', 'Workspace', WS.hosp,      JSON.stringify({ name: 'Hospital São Lucas — Centro' }), new Date('2025-11-02')],
      [randomUUID(), GYM_ADMIN,    'WORKSPACE_CREATED', 'Workspace', WS.gym,       JSON.stringify({ name: 'FitLife — Unidade Jardins' }),   new Date('2025-12-02')],
      [randomUUID(), CLINIC_ADMIN, 'WORKSPACE_CREATED', 'Workspace', WS.clinic,    JSON.stringify({ name: 'Clínica Bem Estar — Centro' }),  new Date('2026-01-11')],
      ...HOSP_S.map((id, i) => [randomUUID(), HOSP_ADMIN, 'SCHEDULE_PUBLISHED', 'Schedule', id, JSON.stringify({ month: scheduleMonths[i].label }), new Date(scheduleMonths[i].start + 'T09:00:00-03:00')]),
      ...GYM_S.map((id, i) => [randomUUID(), GYM_ADMIN, 'SCHEDULE_PUBLISHED', 'Schedule', id, JSON.stringify({ month: scheduleMonths[i].label }), new Date(scheduleMonths[i].start + 'T09:00:00-03:00')]),
      ...CLINIC_S.map((id, i) => [randomUUID(), CLINIC_ADMIN, 'SCHEDULE_PUBLISHED', 'Schedule', id, JSON.stringify({ month: scheduleMonths[i].label }), new Date(scheduleMonths[i].start + 'T09:00:00-03:00')]),
    ]
    await insertBatch(pool, 'auditLog', ['id', 'actor_user_id', 'action', 'entity_type', 'entity_id', 'metadata', 'created_at'], auditRows)

    // ── summary ───────────────────────────────────────────────────────────────
    const counts = await pool.query(`
      SELECT
        (SELECT count(*) FROM "user")             AS users,
        (SELECT count(*) FROM "tenant")           AS tenants,
        (SELECT count(*) FROM "workspace")        AS workspaces,
        (SELECT count(*) FROM "schedule")         AS schedules,
        (SELECT count(*) FROM "shift")            AS shifts,
        (SELECT count(*) FROM "shiftAssignment")  AS assignments,
        (SELECT count(*) FROM "timeEntry")        AS time_entries,
        (SELECT count(*) FROM "request")          AS requests,
        (SELECT count(*) FROM "shiftTimelineNote")AS notes,
        (SELECT count(*) FROM "notification")     AS notifications,
        (SELECT count(*) FROM "auditLog")         AS audit_logs
    `)
    // eslint-disable-next-line no-console
    console.log('\n✅ Database populated successfully:\n', counts.rows[0])
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
