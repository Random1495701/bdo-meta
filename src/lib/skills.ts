// Types and constants for the BDO Skills Database

export interface DamageRow {
  label: string
  value?: string
  pvpOnly?: boolean
  pveOnly?: boolean
  kind: 'damage' | 'target' | 'cc' | 'protection' | 'buff' | 'note' | 'pvp'
}

export interface PrerequisiteRef {
  skillId: number
  name: string
  className: string | null
  iconUrl: string | null
  requiredLevel: number
}

export interface RelatedRank {
  skillId: number
  name: string
  requiredLevel: number
}

export interface Skill {
  id: string
  skillId: number
  groupId: number | null
  name: string
  krName: string | null
  className: string | null
  classId: number | null
  iconUrl: string | null
  iconPath: string | null
  requiredLevel: number
  maxLevel: number
  skillPoints: number
  command: string | null
  cooldown: string | null
  cooldownSec: number | null
  description: string | null
  damageRows: DamageRow[] | null
  ccTypes: string[] | null
  protectionTypes: string[] | null
  pvpDamagePercent: number | null
  isQuickSlot: boolean
  isAbsolute: boolean
  isAwakening: boolean
  isSuccession: boolean
  isBlackSpirit: boolean
  isPassive: boolean
  prerequisiteIds: number[]
  prerequisites?: PrerequisiteRef[]
  relatedRanks?: RelatedRank[]
  videoUrl: string | null
  animationDurationMs: number | null
  addons?: any
  syncedAt: string
  bdocodexUrl: string
}

export interface SkillListResponse {
  items: Skill[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface BdoClass {
  id: number
  name: string
  slug: string
  awakened: boolean
  mainWeapon: string | null
  awakeningWeapon: string | null
  skillCount: number
}

export interface Stats {
  total: number
  withDescription: number
  withVideo: number
  withAnimation: number
  withCc: number
  withProtection: number
  classBreakdown: { className: string; classId: number; count: number }[]
  typeBreakdown: {
    main: number
    awakening: number
    succession: number
    absolute: number
    blackSpirit: number
    passive: number
  }
  syncLogs: {
    type: string
    status: string
    count: number
    total: number | null
    message: string | null
    createdAt: string
  }[]
}

export interface LurkerState {
  pid: number
  mode: string
  startedAt: string
  lastHeartbeatAt: string
  processed: number
  enriched: number
  failed: number
  skipped: number
  challengesSolved?: number
  currentSkillId: number | null
  currentEndpoint: string | null
  cooldowns: Record<string, number>
}

export interface SyncStatus {
  total: number
  withDescription: number
  withVideo: number
  withAnimation: number
  withKrName: number
  pendingTooltips: number
  pendingAnimations: number
  pendingKrNames: number
  lurker: { running: boolean; state: LurkerState | null }
  recentLogs: {
    id: string
    type: string
    status: string
    count: number
    total: number | null
    message: string | null
    createdAt: string
  }[]
}

// --- API helpers ---

export interface SkillFilters {
  q?: string
  classId?: number | 'all'
  type?: SkillType | 'all'
  protection?: string
  cc?: string[]
  minLvl?: number
  maxLvl?: number
  minCd?: number
  maxCd?: number
  minAnim?: number
  maxAnim?: number
  hasVideo?: boolean
  hasAnim?: boolean
  quickslot?: boolean
  hasAddon?: boolean
  sort?: SkillSort
  order?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export type SkillType =
  | 'main'
  | 'awakening'
  | 'succession'
  | 'absolute'
  | 'blackspirit'
  | 'passive'

export type SkillSort =
  | 'skillId'
  | 'name'
  | 'level'
  | 'cooldown'
  | 'anim'
  | 'class'
  | 'sp'

export function filtersToQuery(f: SkillFilters): URLSearchParams {
  const sp = new URLSearchParams()
  if (f.q) sp.set('q', f.q)
  // FIXED: handle classId=0 (Warrior) — check for null/undefined, not truthiness
  if (f.classId != null && f.classId !== 'all') sp.set('class', String(f.classId))
  if (f.type && f.type !== 'all') sp.set('type', f.type)
  if (f.protection) sp.set('protection', f.protection)
  if (f.cc && f.cc.length) sp.set('cc', f.cc.join(','))
  if (f.minLvl != null) sp.set('minLvl', String(f.minLvl))
  if (f.maxLvl != null) sp.set('maxLvl', String(f.maxLvl))
  if (f.minCd != null) sp.set('minCd', String(f.minCd))
  if (f.maxCd != null) sp.set('maxCd', String(f.maxCd))
  if (f.minAnim != null) sp.set('minAnim', String(f.minAnim))
  if (f.maxAnim != null) sp.set('maxAnim', String(f.maxAnim))
  if (f.hasVideo != null) sp.set('hasVideo', String(f.hasVideo))
  if (f.hasAnim != null) sp.set('hasAnim', String(f.hasAnim))
  if (f.quickslot != null) sp.set('quickslot', String(f.quickslot))
  if (f.hasAddon != null) sp.set('hasAddon', String(f.hasAddon))
  // maxRank and filterEvasion default to true (applied server-side)
  sp.set('maxRank', 'true')
  sp.set('filterEvasion', 'true')
  if (f.sort) sp.set('sort', f.sort)
  if (f.order) sp.set('order', f.order)
  if (f.page) sp.set('page', String(f.page))
  if (f.pageSize) sp.set('pageSize', String(f.pageSize))
  return sp
}

export async function fetchSkills(filters: SkillFilters): Promise<SkillListResponse> {
  const sp = filtersToQuery(filters)
  const res = await fetch(`/api/skills?${sp.toString()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to fetch skills: ${res.status}`)
  return res.json()
}

export async function fetchSkill(id: number): Promise<Skill> {
  const res = await fetch(`/api/skills/${id}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to fetch skill: ${res.status}`)
  return res.json()
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch('/api/stats', { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`)
  return res.json()
}

export async function fetchClasses(): Promise<{ classes: BdoClass[] }> {
  const res = await fetch('/api/classes', { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to fetch classes: ${res.status}`)
  return res.json()
}

export async function fetchSyncStatus(): Promise<SyncStatus> {
  const res = await fetch('/api/sync/status', { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to fetch sync status: ${res.status}`)
  return res.json()
}

// Dynamic filter ranges — used to set slider max values to actual data max
export interface SkillRanges {
  requiredLevel: { min: number; max: number }
  cooldownSec: { min: number; max: number }
  animationDurationMs: { min: number; max: number }
}

export async function fetchRanges(): Promise<SkillRanges> {
  const res = await fetch('/api/ranges', { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to fetch ranges: ${res.status}`)
  return res.json()
}

// Returns the bdocodex CDN URL for a class icon. `slug` is the lowercased
// Class icons are self-hosted at /icons/classes/{slug}.webp (downloaded from
// bdocodex's /images/skillcalc/class_{id}.webp). Self-hosting avoids bot-challenge
// issues when bdocodex rate-limits our IP.
export function classIconUrl(slug: string | null): string | null {
  if (!slug) return null
  return `/icons/classes/${slug}.webp`
}

export async function triggerSync(
  phase: 'list' | 'trees' | 'tooltips' | 'videos' | 'all' = 'all',
  limit?: number,
): Promise<{ ok: boolean; phase: string; message: string }> {
  const res = await fetch('/api/sync/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phase, limit, script: 'sync' }),
  })
  if (!res.ok) throw new Error(`Failed to trigger sync: ${res.status}`)
  return res.json()
}

export async function triggerLurker(
  phase: 'daemon' | 'batch' | 'videos' | 'kr-names' | 're-enrich' | 'once' = 'daemon',
  limit?: number,
): Promise<{ ok: boolean; script: string; phase: string; message: string; pid: number | null }> {
  const res = await fetch('/api/sync/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phase, limit, script: 'lurker' }),
  })
  if (!res.ok) throw new Error(`Failed to trigger lurker: ${res.status}`)
  return res.json()
}

// --- Display helpers ---

export const CLASS_COLORS: Record<string, string> = {
  Warrior: '#c9a25c',
  Ranger: '#7fbf3e',
  Sorceress: '#a253d6',
  Berserker: '#d6533a',
  Tamer: '#d6a53a',
  Valkyrie: '#e6c84c',
  Wizard: '#5c9cd6',
  Witch: '#5c9cd6',
  Musa: '#d6533a',
  Maehwa: '#d6533a',
  Lahn: '#e36fa8',
  Striker: '#e6a04c',
  Mystic: '#e6a04c',
  Kunoichi: '#a253d6',
  Ninja: '#7fa8bf',
  'Dark Knight': '#7a3ad6',
  Archer: '#5cbf8f',
  Shai: '#e6c84c',
  Guardian: '#5cbfd6',
  Hashashin: '#d6b54c',
  Nova: '#6fbfe6',
  Sage: '#5cd6a5',
  Corsair: '#d6a53a',
  Drakania: '#7ad6bf',
  Woosa: '#e6a5d6',
  Maegu: '#e6a5d6',
  Scholar: '#bfa5e6',
  Dosa: '#a5e6bf',
  Seraph: '#e6d6a5',
  Deadeye: '#bf5c5c',
  Wukong: '#d6853a',
}

export function classColor(name: string | null): string {
  if (!name) return '#a1a1aa'
  return CLASS_COLORS[name] || '#a1a1aa'
}

export function formatCooldown(sec: number | null): string {
  if (sec == null) return '—'
  if (sec === 0) return 'Instant'
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s ? `${m}m ${s}s` : `${m}m`
}

export function formatAnimDuration(ms: number | null): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export const PROTECTION_TYPES = ['Super Armor', 'Forward Guard', 'I-Frame', 'Crouching'] as const

export const CC_TYPES = [
  'Knockback',
  'Knockdown',
  'Stiffness',
  'Stun',
  'Freeze',
  'Float',
  'Grapple',
  'Bound',
  'Slow',
  'Push the target',
  'Spin the target',
  'Pull the target',
  'Burn',
  'Frostbite',
  'Chill',
  'Bleeding',
  'Poison',
  'Electrocute',
  'Down Smash',
  'Air Smash',
  'Smash',
  'Dehydrate',
  'Blind',
  'Shock',
] as const

export const SKILL_TYPE_META: Record<
  SkillType,
  { label: string; color: string; description: string }
> = {
  main: {
    label: 'Main',
    color: '#a1a1aa',
    description: 'Base / pre-awakening skills',
  },
  awakening: {
    label: 'Awakening',
    color: '#f59e0b',
    description: 'Awakening weapon skills (Level 56+)',
  },
  succession: {
    label: 'Succession',
    color: '#10b981',
    description: 'Succession skills (Level 56+)',
  },
  absolute: {
    label: 'Absolute',
    color: '#ef4444',
    description: 'Absolute versions of main skills',
  },
  blackspirit: {
    label: 'Black Spirit',
    color: '#8b5cf6',
    description: 'Black Spirit rage skills',
  },
  passive: {
    label: 'Passive',
    color: '#06b6d4',
    description: 'Passive buffs',
  },
}

// Returns the skill type label for a skill, picking the first matching flag.
export function skillTypeLabel(s: Skill): SkillType | null {
  if (s.isAwakening) return 'awakening'
  if (s.isSuccession) return 'succession'
  if (s.isAbsolute) return 'absolute'
  if (s.isBlackSpirit) return 'blackspirit'
  if (s.isPassive) return 'passive'
  return 'main'
}
