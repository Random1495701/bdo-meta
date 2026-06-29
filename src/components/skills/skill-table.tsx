'use client'

import * as React from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown, Columns3, Zap } from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  CC_TYPES,
  NON_CC_EFFECTS,
  PROTECTION_META,
  classAbbrev,
  classColor,
  formatAnimDuration,
  formatCooldown,
  skillTypeLabel,
  typeAbbrev,
  type Skill,
  type SkillSort,
} from '@/lib/skills'
import { formatDamage } from '@/lib/damage'
import { useSkillStore } from '@/lib/skill-store'
import { cn } from '@/lib/utils'

// ---------- column definitions ----------

type ColumnId =
  | 'icon'
  | 'name'
  | 'class'
  | 'type'
  | 'level'
  | 'cooldown'
  | 'pveDmg'
  | 'pvpDmg'
  | 'anim'
  | 'ccCounters'
  | 'ccTypes'
  | 'protection'
  | 'command'

interface ColumnDef {
  id: ColumnId
  label: string
  sortable: boolean
  // SkillSort key used by the store/API (null = column not sortable)
  sortKey: SkillSort | null
  // Minimum column width hint for compactness
  width?: string
}

const COLUMNS: ColumnDef[] = [
  { id: 'icon', label: '', sortable: false, sortKey: null, width: 'w-12' },
  { id: 'name', label: 'Name', sortable: true, sortKey: 'name' },
  { id: 'class', label: 'Class', sortable: true, sortKey: 'class', width: 'w-20' },
  { id: 'type', label: 'Type', sortable: true, sortKey: 'type', width: 'w-16' },
  { id: 'level', label: 'Lv', sortable: true, sortKey: 'level', width: 'w-12' },
  { id: 'cooldown', label: 'CD', sortable: true, sortKey: 'cooldown', width: 'w-16' },
  { id: 'pveDmg', label: 'PvE', sortable: true, sortKey: 'damage', width: 'w-20' },
  { id: 'pvpDmg', label: 'PvP', sortable: true, sortKey: 'pvpDamage', width: 'w-20' },
  { id: 'anim', label: 'Anim', sortable: true, sortKey: 'anim', width: 'w-16' },
  { id: 'ccCounters', label: 'CC', sortable: true, sortKey: 'ccCounters', width: 'w-14' },
  { id: 'ccTypes', label: 'CC Types', sortable: false, sortKey: null, width: 'w-20' },
  { id: 'protection', label: 'Prot', sortable: false, sortKey: null, width: 'w-16' },
  { id: 'command', label: 'Cmd', sortable: false, sortKey: null, width: 'w-24' },
]

const DEFAULT_VISIBLE: ColumnId[] = [
  'icon',
  'name',
  'class',
  'type',
  'level',
  'pveDmg',
  'pvpDmg',
  'ccCounters',
  'protection',
]

const STORAGE_KEY = 'bdo-meta-table-columns'

function loadVisibleColumns(): ColumnId[] {
  if (typeof window === 'undefined') return DEFAULT_VISIBLE
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_VISIBLE
    const parsed = JSON.parse(raw) as ColumnId[]
    // Always include icon + name
    const set = new Set(parsed)
    set.add('icon')
    set.add('name')
    return COLUMNS.map((c) => c.id).filter((id) => set.has(id))
  } catch {
    return DEFAULT_VISIBLE
  }
}

function saveVisibleColumns(cols: ColumnId[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cols))
  } catch {
    // ignore (private mode etc.)
  }
}

// ---------- compact cell renderers ----------

function TableSkillIcon({ skill }: { skill: Skill }) {
  const [errored, setErrored] = React.useState(false)
  const color = classColor(skill.className)
  const firstLetter = skill.name?.[0] ?? '?'

  if (!skill.iconUrl || errored) {
    return (
      <div
        className="flex size-7 items-center justify-center rounded-sm border font-bold"
        style={{
          borderColor: `${color}aa`,
          backgroundColor: `${color}1a`,
          color,
          fontSize: 12,
        }}
      >
        {firstLetter}
      </div>
    )
  }

  return (
    <div
      className="size-7 shrink-0 overflow-hidden rounded-sm border"
      style={{
        borderColor: 'rgba(156,126,46,0.55)',
        background: 'linear-gradient(135deg, #1a1612 0%, #0a0908 100%)',
        boxShadow: 'inset 0 0 0 1px rgba(240,208,96,0.15)',
      }}
    >
      <img
        src={skill.iconUrl}
        alt={skill.name}
        loading="lazy"
        onError={() => setErrored(true)}
        className="h-full w-full object-cover"
      />
    </div>
  )
}

// Renders compact CC symbols (⚡↓↓ for Stun + Knockdown). Tooltip shows full names.
function CCSymbols({ skill }: { skill: Skill }) {
  const realCCs = skill.realCCs ?? []
  const others = skill.nonCCEffects ?? []
  if (!realCCs.length && !others.length) {
    return <span className="text-amber-200/30">—</span>
  }
  const parts: { symbol: string; color: string; name: string }[] = []
  for (const c of realCCs) {
    const m = CC_TYPES[c]
    if (m) parts.push({ symbol: m.symbol, color: m.color, name: c })
  }
  for (const e of others) {
    const m = NON_CC_EFFECTS[e]
    if (m) parts.push({ symbol: m.symbol, color: m.color, name: e })
  }
  if (!parts.length) {
    return <span className="text-amber-200/30">—</span>
  }
  const tooltipText = parts.map((p) => p.name).join(', ')
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="cursor-help text-sm leading-none"
          title={tooltipText}
        >
          {parts.map((p, i) => (
            <span key={i} style={{ color: p.color }}>
              {p.symbol}
            </span>
          ))}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px]">
        <div className="space-y-0.5">
          {parts.map((p, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span style={{ color: p.color }}>{p.symbol}</span>
              <span>{p.name}</span>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

// Renders compact Protection symbols (🛡⬛ for SA + FG). Tooltip shows full names.
function ProtectionSymbols({ skill }: { skill: Skill }) {
  const prots = skill.protectionTypes ?? []
  if (!prots.length) return <span className="text-amber-200/30">—</span>
  const parts = prots
    .map((p) => {
      const m = PROTECTION_META[p]
      return m ? { symbol: m.symbol, color: m.color, name: p, short: m.shortName } : null
    })
    .filter((x): x is { symbol: string; color: string; name: string; short: string } => x !== null)
  if (!parts.length) return <span className="text-amber-200/30">—</span>
  const tooltipText = parts.map((p) => `${p.name} (${p.short})`).join(', ')
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="cursor-help text-sm leading-none"
          title={tooltipText}
        >
          {parts.map((p, i) => (
            <span key={i} style={{ color: p.color }}>
              {p.symbol}
            </span>
          ))}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px]">
        <div className="space-y-0.5">
          {parts.map((p, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span style={{ color: p.color }}>{p.symbol}</span>
              <span>{p.name} ({p.short})</span>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

// Compact cooldown: "5s" or "1m 30s"
function formatCdCompact(sec: number | null): string {
  if (sec == null) return '—'
  if (sec === 0) return '0s'
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s ? `${m}m${s}s` : `${m}m`
}

// Compact command: collapse spaces around +
function formatCommandCompact(cmd: string | null): string {
  if (!cmd) return '—'
  // Replace " + " with "+" and trim — keeps "S+LMB" compact
  return cmd.replace(/\s*\+\s*/g, '+').slice(0, 24)
}

// ---------- main table ----------

export const SkillTable = React.memo(function SkillTable({
  skills,
}: {
  skills: Skill[]
}) {
  const selectSkill = useSkillStore((s) => s.selectSkill)
  const sort = useSkillStore((s) => s.filters.sort)
  const order = useSkillStore((s) => s.filters.order)
  const setSort = useSkillStore((s) => s.setSort)
  const toggleOrder = useSkillStore((s) => s.toggleOrder)

  const [visible, setVisible] = React.useState<ColumnId[]>(() => loadVisibleColumns())

  // Persist visible columns to localStorage whenever they change
  React.useEffect(() => {
    saveVisibleColumns(visible)
  }, [visible])

  const toggleColumn = (id: ColumnId) => {
    setVisible((cur) => {
      // Don't allow hiding icon or name (always visible)
      if (id === 'icon' || id === 'name') return cur
      return cur.includes(id) ? cur.filter((c) => c !== id) : [...cur, id]
    })
  }

  const handleSort = (col: ColumnDef) => {
    if (!col.sortable || !col.sortKey) return
    if (sort === col.sortKey) {
      toggleOrder()
    } else {
      setSort(col.sortKey)
    }
  }

  const visibleCols = COLUMNS.filter((c) => visible.includes(c.id))

  return (
    <div className="space-y-2">
      {/* Column picker dropdown */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-wider text-amber-200/40">
          {skills.length} skill{skills.length === 1 ? '' : 's'} · click any header to sort
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="bdo-btn h-7 px-2 text-xs"
            >
              <Columns3 className="size-3.5" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bdo-recessed border-amber-800/50 text-amber-100"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-amber-200/60">
              Toggle Columns
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-amber-900/40" />
            {COLUMNS.filter((c) => c.id !== 'icon' && c.id !== 'name').map((col) => (
              <DropdownMenuCheckboxItem
                key={col.id}
                checked={visible.includes(col.id)}
                onCheckedChange={() => toggleColumn(col.id)}
                className="text-xs text-amber-100/90 focus:bg-amber-500/15 focus:text-amber-200"
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        className="overflow-x-auto rounded-sm border border-amber-900/50 bg-bdo-leather-dark"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(240,208,96,0.1), inset 0 0 18px rgba(0,0,0,0.6)' }}
      >
        <Table className="text-sm">
          <TableHeader>
            <TableRow className="border-amber-900/50 hover:bg-transparent">
              {visibleCols.map((col) => (
                <TableHead
                  key={col.id}
                  className={cn(
                    'h-9 px-2 text-[10px] uppercase tracking-wider text-amber-200/50 whitespace-nowrap',
                    col.width,
                  )}
                >
                  <SortHeader
                    label={col.label}
                    col={col}
                    sort={sort}
                    order={order}
                    onSort={handleSort}
                  />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {skills.map((skill) => {
              const type = skillTypeLabel(skill)
              const color = classColor(skill.className)
              const dmg = skill.damage
              const hasDmg = !!dmg && dmg.hasDamage
              return (
                <TableRow
                  key={skill.id}
                  onClick={() => selectSkill(skill.skillId)}
                  className={cn(
                    'cursor-pointer border-amber-900/30 transition-colors',
                    'hover:border-amber-500/40 hover:bg-amber-900/10',
                  )}
                >
                  {visibleCols.map((col) => {
                    switch (col.id) {
                      case 'icon':
                        return (
                          <TableCell key={col.id} className="py-1.5">
                            <TableSkillIcon skill={skill} />
                          </TableCell>
                        )
                      case 'name':
                        return (
                          <TableCell key={col.id} className="py-1.5">
                            <div
                              className="bdo-heading truncate text-sm text-amber-100"
                              title={skill.name}
                            >
                              {skill.name}
                            </div>
                          </TableCell>
                        )
                      case 'class':
                        return (
                          <TableCell key={col.id} className="py-1.5">
                            {skill.className ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className="flex items-center gap-1.5 text-xs font-semibold cursor-help"
                                    style={{ color }}
                                  >
                                    <span
                                      className="size-2 rounded-full"
                                      style={{ backgroundColor: color }}
                                    />
                                    <span className="font-mono">
                                      {classAbbrev(skill.className)}
                                    </span>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  {skill.className}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-amber-200/30">—</span>
                            )}
                          </TableCell>
                        )
                      case 'type':
                        return (
                          <TableCell key={col.id} className="py-1.5">
                            <span
                              className="font-mono text-[10px] font-semibold text-amber-200/70"
                              title={type ?? '—'}
                            >
                              {typeAbbrev(type)}
                            </span>
                          </TableCell>
                        )
                      case 'level':
                        return (
                          <TableCell
                            key={col.id}
                            className="py-1.5 text-center font-mono tabular-nums text-amber-100/80"
                          >
                            {skill.requiredLevel || '—'}
                          </TableCell>
                        )
                      case 'cooldown':
                        return (
                          <TableCell
                            key={col.id}
                            className="py-1.5 font-mono tabular-nums text-amber-100/80"
                          >
                            {formatCdCompact(skill.cooldownSec)}
                          </TableCell>
                        )
                      case 'pveDmg':
                        return (
                          <TableCell key={col.id} className="py-1.5">
                            {hasDmg ? (
                              <span
                                className="font-mono font-bold tabular-nums text-amber-300"
                                title={`PvE: ${dmg!.totalPvE.toLocaleString()}%`}
                              >
                                {formatDamage(dmg!.totalPvE)}
                              </span>
                            ) : (
                              <span className="text-amber-200/30">—</span>
                            )}
                          </TableCell>
                        )
                      case 'pvpDmg':
                        return (
                          <TableCell key={col.id} className="py-1.5">
                            {hasDmg && dmg!.totalPvP != null ? (
                              <span
                                className="font-mono font-bold tabular-nums text-pink-400"
                                title={`PvP: ${dmg!.totalPvP.toLocaleString()}% (${dmg!.pvpDamagePercent}% of PvE)`}
                              >
                                {formatDamage(dmg!.totalPvP)}
                              </span>
                            ) : (
                              <span className="text-amber-200/30">—</span>
                            )}
                          </TableCell>
                        )
                      case 'anim':
                        return (
                          <TableCell
                            key={col.id}
                            className="py-1.5 font-mono tabular-nums text-amber-300"
                          >
                            {skill.animationDurationMs != null
                              ? formatAnimDuration(skill.animationDurationMs)
                              : '—'}
                          </TableCell>
                        )
                      case 'ccCounters':
                        return (
                          <TableCell key={col.id} className="py-1.5 text-center">
                            {skill.ccCounters != null && skill.ccCounters > 0 ? (
                              <span
                                className="inline-flex items-center gap-0.5 rounded-sm border border-red-700/60 bg-red-900/30 px-1.5 py-0.5 font-mono text-xs font-bold tabular-nums text-red-300"
                                title={`CC Counters: ${skill.ccCounterDisplay || skill.ccCounters} (PvP only, target is CC-immune at 2)`}
                              >
                                <Zap className="size-2.5" />
                                {skill.ccCounterDisplay || skill.ccCounters}
                              </span>
                            ) : (
                              <span className="text-amber-200/30">0</span>
                            )}
                          </TableCell>
                        )
                      case 'ccTypes':
                        return (
                          <TableCell key={col.id} className="py-1.5">
                            <CCSymbols skill={skill} />
                          </TableCell>
                        )
                      case 'protection':
                        return (
                          <TableCell key={col.id} className="py-1.5">
                            <ProtectionSymbols skill={skill} />
                          </TableCell>
                        )
                      case 'command':
                        return (
                          <TableCell key={col.id} className="py-1.5">
                            {skill.command ? (
                              <kbd
                                className="rounded-sm border border-amber-800/60 bg-bdo-leather px-1 py-0.5 font-mono text-[10px] text-amber-200/80"
                                title={skill.command}
                              >
                                {formatCommandCompact(skill.command)}
                              </kbd>
                            ) : (
                              <span className="text-amber-200/30">—</span>
                            )}
                          </TableCell>
                        )
                      default:
                        return null
                    }
                  })}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
})

// Clickable sortable header. Shows up/down arrow when active.
function SortHeader({
  label,
  col,
  sort,
  order,
  onSort,
}: {
  label: string
  col: ColumnDef
  sort: SkillSort | undefined
  order: 'asc' | 'desc' | undefined
  onSort: (col: ColumnDef) => void
}) {
  if (!col.sortable || !col.sortKey) {
    return <span className="text-amber-200/50">{label}</span>
  }
  const isActive = sort === col.sortKey
  return (
    <button
      type="button"
      onClick={() => onSort(col)}
      className={cn(
        'inline-flex items-center gap-1 transition-colors hover:text-amber-200',
        isActive ? 'text-amber-300' : 'text-amber-200/50',
      )}
    >
      {label}
      {isActive ? (
        order === 'asc' ? (
          <ArrowUp className="size-3" />
        ) : (
          <ArrowDown className="size-3" />
        )
      ) : (
        <ChevronsUpDown className="size-3 opacity-50" />
      )}
    </button>
  )
}
