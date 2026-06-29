'use client'

import * as React from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  classColor,
  formatAnimDuration,
  formatCooldown,
  SKILL_TYPE_META,
  skillTypeLabel,
  type Skill,
  type SkillSort,
} from '@/lib/skills'
import { formatDamage } from '@/lib/damage'
import { useSkillStore } from '@/lib/skill-store'
import { cn } from '@/lib/utils'

// Tiny inline icon for the table. 24px square.
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

type SortColumn =
  | 'name'
  | 'class'
  | 'type'
  | 'level'
  | 'sp'
  | 'cooldown'
  | 'damage'
  | 'anim'

// Map table column → SkillSort value used by the store / API.
const COLUMN_TO_SORT: Record<SortColumn, SkillSort | null> = {
  name: 'name',
  class: 'class',
  type: null,
  level: 'level',
  sp: 'sp',
  cooldown: 'cooldown',
  damage: null, // API doesn't sort by damage yet; column header shows a hint
  anim: 'anim',
}

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

  const handleSort = (col: SortColumn) => {
    const sortKey = COLUMN_TO_SORT[col]
    if (!sortKey) return
    if (sort === sortKey) {
      toggleOrder()
    } else {
      setSort(sortKey)
    }
  }

  return (
    <div
      className="overflow-hidden rounded-sm border border-amber-900/50 bg-bdo-leather-dark"
      style={{ boxShadow: 'inset 0 0 0 1px rgba(240,208,96,0.1), inset 0 0 18px rgba(0,0,0,0.6)' }}
    >
      <Table className="text-sm">
        <TableHeader>
          <TableRow className="border-amber-900/50 hover:bg-transparent">
            <TableHead className="h-9 w-10 px-2 text-[10px] uppercase tracking-wider text-amber-200/50">
              Icon
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-amber-200/50">
              <SortHeader
                label="Name"
                col="name"
                sort={sort}
                order={order}
                onSort={handleSort}
              />
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-amber-200/50">
              <SortHeader
                label="Class"
                col="class"
                sort={sort}
                order={order}
                onSort={handleSort}
              />
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-amber-200/50">
              Type
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-amber-200/50">
              <SortHeader
                label="Lv"
                col="level"
                sort={sort}
                order={order}
                onSort={handleSort}
              />
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-amber-200/50">
              <SortHeader
                label="SP"
                col="sp"
                sort={sort}
                order={order}
                onSort={handleSort}
              />
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-amber-200/50">
              <SortHeader
                label="CD"
                col="cooldown"
                sort={sort}
                order={order}
                onSort={handleSort}
              />
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-amber-300/80">
              PvE Dmg
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-pink-300/80">
              PvP Dmg
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-amber-200/50">
              <SortHeader
                label="Anim"
                col="anim"
                sort={sort}
                order={order}
                onSort={handleSort}
              />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {skills.map((skill) => {
            const type = skillTypeLabel(skill)
            const typeMeta = type ? SKILL_TYPE_META[type] : null
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
                <TableCell className="py-1.5">
                  <TableSkillIcon skill={skill} />
                </TableCell>
                <TableCell className="py-1.5">
                  <div
                    className="bdo-heading truncate text-sm text-amber-100"
                    title={skill.name}
                  >
                    {skill.name}
                  </div>
                </TableCell>
                <TableCell className="py-1.5">
                  {skill.className ? (
                    <span
                      className="flex items-center gap-1.5 text-xs"
                      style={{ color }}
                    >
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="truncate">{skill.className}</span>
                    </span>
                  ) : (
                    <span className="text-amber-200/30">—</span>
                  )}
                </TableCell>
                <TableCell className="py-1.5">
                  {typeMeta && (
                    <span
                      className="rounded-sm px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{
                        backgroundColor: `${typeMeta.color}1a`,
                        color: typeMeta.color,
                        boxShadow: `inset 0 0 0 1px ${typeMeta.color}55`,
                      }}
                      title={typeMeta.description}
                    >
                      {typeMeta.label}
                    </span>
                  )}
                </TableCell>
                <TableCell className="py-1.5 font-mono tabular-nums text-amber-100/80">
                  {skill.requiredLevel || '—'}
                </TableCell>
                <TableCell className="py-1.5 font-mono tabular-nums text-amber-100/80">
                  {skill.skillPoints || '—'}
                </TableCell>
                <TableCell className="py-1.5 font-mono tabular-nums text-amber-100/80">
                  {formatCooldown(skill.cooldownSec)}
                </TableCell>
                <TableCell className="py-1.5">
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
                <TableCell className="py-1.5">
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
                <TableCell className="py-1.5">
                  {skill.animationDurationMs != null ? (
                    <span className="font-mono tabular-nums text-amber-300">
                      {formatAnimDuration(skill.animationDurationMs)}
                    </span>
                  ) : (
                    <span className="text-amber-200/30">—</span>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
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
  col: SortColumn
  sort: SkillSort | undefined
  order: 'asc' | 'desc' | undefined
  onSort: (col: SortColumn) => void
}) {
  const sortKey = COLUMN_TO_SORT[col]
  const isActive = !!sortKey && sort === sortKey
  if (!sortKey) {
    return <span className="text-amber-200/50">{label}</span>
  }
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
