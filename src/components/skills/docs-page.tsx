'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, GitBranch, Tag, BookOpen, Database, Zap, Shield, Swords, Film, Download, Upload, RefreshCw, GitGraph } from 'lucide-react'

interface VersionEntry {
  version: string
  date: string
  title: string
  features: string[]
  fixes: string[]
}

const VERSIONS: VersionEntry[] = [
  {
    version: 'v1.0.0',
    date: '2025-06-28',
    title: 'Initial Release',
    features: [
      '7,231 skills ingested from bdocodex.com (query.php + ajax.php + tip.php)',
      'Prisma + SQLite database with BdoClass, Skill, SyncLog models',
      '4-phase data ingestion pipeline (list, trees, tooltips, videos)',
      'Animation duration extraction via ffprobe on preview videos',
      '6 API endpoints (skills, stats, classes, sync, export, upload)',
      '9 UI components: header, class-bar, filter-sidebar, skill-card, skill-grid, skill-detail-drawer, sync-footer, pagination, providers',
      'Dark BDO-themed UI with amber accents',
      'Sticky header + class bar + filter sidebar',
      'Right-side detail drawer with video preview, damage breakdown, CC/protection chips',
    ],
    fixes: [],
  },
  {
    version: 'v1.1.0',
    date: '2025-06-28',
    title: 'Lurker v1 — Polite Background Sync',
    features: [
      'Lurker v1 daemon with endpoint rotation (2 English endpoints)',
      'Session cookie warmup + realistic Chrome headers',
      'Jittered delays (1.5-3.5s + 10% long pauses)',
      'Single concurrency + random skill order',
      'Per-endpoint cooldown (30 min) on bot-challenge',
      'Heartbeat state file for real-time UI monitoring',
      'Lurker UI: emerald button + real-time status indicator',
    ],
    fixes: [],
  },
  {
    version: 'v1.2.0',
    date: '2025-06-28',
    title: 'Lurker v2 — JS Challenge Solver',
    features: [
      'JS challenge solver: ported bdocodex\'s get_jhash() to TypeScript (1.68M iterations)',
      'Single-instance PID lock (prevents competing processes)',
      'Adaptive backoff (5 min cooldown on persistent challenge)',
      'Session cookie persistence (reuse solved cookies)',
      'Upload endpoint: POST /api/upload/skills-json (JSON import)',
      'Export endpoint: GET /api/export (JSON download)',
      'Data dialog in footer with BDO game file extraction instructions',
    ],
    fixes: [
      'Lurker stalling: root cause was 3 competing processes triggering bot detection',
      'Parser card-extraction regex: was stopping at card header',
      'Cooldown parser: now handles "5s"/"20m" format',
    ],
  },
  {
    version: 'v1.3.0',
    date: '2025-06-29',
    title: 'BDO Meta Redesign',
    features: [
      'Max-rank auto-filtering (7,231 → ~2,400 unique skills)',
      'Evasion auto-filtering (40 skills excluded)',
      'GET /api/ranges endpoint for dynamic slider values',
      'Class icons from bdocodex CDN (31 icons, self-hosted later)',
      '15-second auto-refresh (no flicker, preserves user state)',
      'BDO-themed UI: dark leather (#0a0908), gold accents (#c8aa44), EB Garamond serif',
      '13 BDO utility classes (.bdo-frame, .bdo-leather, .bdo-title, etc.)',
      'Project renamed from "BDO Skills Codex" to "BDO Meta"',
    ],
    fixes: [
      'Warrior classId=0 falsy bug (if(classId && ...) treated 0 as falsy)',
      'Succession/Absolute flags = 0 (re-detected from name prefixes)',
      'Warrior count = 1 (stats grouping by classId)',
      'Cooldown parser (handles "5s"/"20m" format)',
      'German locale leak (Schwarzmagierin → Sorceress)',
    ],
  },
  {
    version: 'v1.4.0',
    date: '2025-06-29',
    title: 'Prime Fix + Class Icons + Scroll UX',
    features: [
      'Self-hosted 31 class icons (webp from bdocodex skillbuilder)',
      'Wheel-scroll + drag-to-scroll on class bar',
      'Unified BDO gold-themed scrollbars across all components',
      'Improvement plan: docs/IMPROVEMENT_PLAN.md (20 items)',
    ],
    fixes: [
      '"Prime:" skills (867) now flagged as Succession (was missing)',
      'Class icons not displaying (self-hosted to avoid bot challenge)',
    ],
  },
  {
    version: 'v1.5.0',
    date: '2025-06-29',
    title: 'Damage Calc + Multi-Select + New Views',
    features: [
      'Damage calculation: per-phase breakdown, total PvE + PvP damage',
      'Multi-select filtering: classes, skill types, protection types',
      'Three view modes: Grid (cards), List (compact rows), Table (sortable columns)',
      'New filters: SP range, damage range, has prerequisites',
      'Damage display on cards (⚔ PvE amber + ☠ PvP pink)',
      'Damage summary + per-phase breakdown in detail drawer',
      'Passive max-rank: extended roman numerals to XXX (30)',
    ],
    fixes: [],
  },
  {
    version: 'v1.6.0',
    date: '2025-06-29',
    title: 'CC System + Protection Icons + Table Sort',
    features: [
      'BDO CC counter system: 8 real CCs with counter values',
      'CC metadata (src/lib/cc.ts): symbols, colors, descriptions',
      'CC counters on cards + table column',
      'Protection icons: 💪 SA, 🛡 FG, ✦ IF in detail drawer + table',
      'Table column picker with localStorage persistence',
      'All table columns sortable',
      'Compact symbols for CC/protection/class/type in table',
    ],
    fixes: [
      'Card damage clipping: icons replace "damage" text',
    ],
  },
  {
    version: 'v1.7.0',
    date: '2025-06-29',
    title: 'CC Counter Fix + Detail Redesign',
    features: [
      'X+Y CC counter display (e.g., "1+1" instead of total)',
      'PvE-only warning banner in detail drawer',
      'Dynamic damage range in /api/ranges',
    ],
    fixes: [
      'CC counter values: Stiffness=0.7, Knockback=0.7 (sourced from foundry+garmoth)',
      'PvE-only CCs excluded from PvP counter',
      'Detail drawer stat cards reordered by relevance',
      'Protection icons: SA=💪 (muscles), FG=🛡 (shield)',
    ],
  },
  {
    version: 'v1.8.0',
    date: '2025-06-29',
    title: 'PvP CC Filter + Range Fix + Video Plan',
    features: [
      '"PvP CC only" filter (first in CC types, 482 skills)',
      'docs/VIDEO_PARSING_PLAN.md (ffmpeg scene detection plan)',
      'Garmoth API discovery: api.garmoth.com/api/skill-addons (open, 927 skills)',
    ],
    fixes: [
      'Cooldown slider: 60s (90th percentile, was 1200s)',
      'Damage slider: 163K (99th percentile, was 544K)',
    ],
  },
  {
    version: 'v1.9.0',
    date: '2025-06-29',
    title: 'Cooldown Slider + PAZ Docs + GitHub',
    features: [
      'Cooldown slider: 0-240s + "Include Black Spirit (20m)" jump button',
      'docs/PAZ_EXTRACTION.md: BDO game file extraction guide',
      'GitHub backup: https://github.com/Random1495701/bdo-meta',
    ],
    fixes: [
      'db/custom.db removed from git (102MB > GitHub 100MB limit)',
    ],
  },
  {
    version: 'v2.0.0',
    date: '2025-06-29',
    title: 'Succession/Awakening Spec Filtering',
    features: [
      'S/A buttons on class chips (replace skill count badge)',
      'Succession spec: Prime skills replace Main/Absolute, no Awakening',
      'Awakening spec: Absolute replaces Main, no Succession',
      'Spec-aware deduplication (base name comparison across prefixes)',
    ],
    fixes: [],
  },
  {
    version: 'v2.1.0',
    date: '2025-06-29',
    title: 'Multi-Spec + Vault Backup',
    features: [
      'S and A can be clicked together (multi-spec toggle)',
      'Clicking class icon activates BOTH specs',
      'specs[] array in store (replaces single spec)',
      '9 chat history transcripts in docs/chat-history/',
    ],
    fixes: [
      'Black Spirit: Prime: prefix detection (nested prefix)',
      'Absolute-over-Main dedup in succession spec',
    ],
  },
  {
    version: 'v2.2.0',
    date: '2025-06-30',
    title: 'Ascension Spec + Meta Page',
    features: [
      'Ascension as 3rd spec (Scholar, Archer, Wukong, Shai, Seraph, Deadeye)',
      'Meta page: per-class stats for all 3 specs',
      'Table view for Meta page (all specs side-by-side)',
      'Tab switcher: Data | Meta',
      'docs/ROADMAP.md: 24 prioritized improvement items',
    ],
    fixes: [],
  },
  {
    version: 'v2.3.0',
    date: '2025-06-30',
    title: 'Ascension Fix + Skill Icons + Garmoth Addons',
    features: [
      'Self-hosted 2,889 skill icons (100% coverage)',
      'Garmoth addon data: 800 skills with addon popularity',
      'API caching for /api/ranges (10min TTL)',
    ],
    fixes: [
      '6 ascension-only classes: Wukong, Scholar, Shai, Archer, Seraph, Deadeye',
      'Their "awakening" skills are actually ascension (PA nomenclature)',
    ],
  },
  {
    version: 'v2.4.0',
    date: '2025-06-30',
    title: 'Split Spec Cards + Class Portraits',
    features: [
      '56 spec cards (each class×spec = separate card)',
      '31 class portraits downloaded via image search',
      'Spec-specific border colors (gold=AWK, green=SUCC, purple=ASC)',
      'Table view flattened to spec rows',
    ],
    fixes: [],
  },
  {
    version: 'v2.5.0',
    date: '2025-06-30',
    title: 'Official PA Portraits + Documentation',
    features: [
      '87 official Pearl Abyss portraits (31 main + 31 awakening + 25 succession)',
      'Spec-specific portraits from naeu.playblackdesert.com CDN',
      'Documentation page with full version history',
      'Data and Meta pages confirmed sharing same database',
    ],
    fixes: [],
  },
]

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  'skills': <Database className="size-3.5" />,
  'damage': <Swords className="size-3.5" />,
  'cc': <Zap className="size-3.5" />,
  'protection': <Shield className="size-3.5" />,
  'animation': <Film className="size-3.5" />,
  'sync': <RefreshCw className="size-3.5" />,
  'upload': <Upload className="size-3.5" />,
  'download': <Download className="size-3.5" />,
  'api': <GitGraph className="size-3.5" />,
}

export function DocsPage() {
  return (
    <div className="min-h-screen bg-bdo-ink text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-amber-900/50 bg-bdo-ink/95 px-4 py-3 backdrop-blur lg:px-6">
        <div className="flex items-center gap-3">
          <BookOpen className="size-6 text-amber-400" />
          <div>
            <h1 className="bdo-title text-2xl font-bold text-amber-400">BDO Meta Documentation</h1>
            <p className="text-xs text-amber-200/50">Complete feature list and version history</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-6 lg:px-6">
        {/* Overview */}
        <section className="mb-8 rounded-sm border-2 border-amber-800/40 bg-bdo-leather-dark/50 p-6">
          <h2 className="bdo-title mb-3 text-lg font-bold text-amber-300">Overview</h2>
          <p className="text-sm text-amber-100/70">
            BDO Meta is a Black Desert Online skill database tool with live data synced from
            bdocodex.com. It features damage calculation, CC counters, animation durations,
            spec filtering (Awakening/Succession/Ascension), and per-class meta statistics.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-sm border border-amber-800/30 bg-bdo-ink/50 p-3 text-center">
              <div className="font-mono text-xl font-bold text-amber-400">7,231</div>
              <div className="text-[10px] uppercase tracking-wider text-amber-200/40">Total Skills</div>
            </div>
            <div className="rounded-sm border border-amber-800/30 bg-bdo-ink/50 p-3 text-center">
              <div className="font-mono text-xl font-bold text-cyan-400">3,500+</div>
              <div className="text-[10px] uppercase tracking-wider text-amber-200/40">Enriched</div>
            </div>
            <div className="rounded-sm border border-amber-800/30 bg-bdo-ink/50 p-3 text-center">
              <div className="font-mono text-xl font-bold text-emerald-400">31</div>
              <div className="text-[10px] uppercase tracking-wider text-amber-200/40">Classes</div>
            </div>
            <div className="rounded-sm border border-amber-800/30 bg-bdo-ink/50 p-3 text-center">
              <div className="font-mono text-xl font-bold text-purple-400">56</div>
              <div className="text-[10px] uppercase tracking-wider text-amber-200/40">Spec Cards</div>
            </div>
          </div>
        </section>

        {/* Data sources */}
        <section className="mb-8">
          <h2 className="bdo-title mb-3 text-lg font-bold text-amber-300">Data Sources</h2>
          <div className="space-y-2">
            <div className="flex items-start gap-2 rounded-sm border border-amber-800/30 bg-bdo-leather-dark/30 p-3">
              <Database className="mt-0.5 size-4 shrink-0 text-amber-400" />
              <div>
                <div className="text-sm font-semibold text-amber-200">bdocodex.com</div>
                <div className="text-xs text-amber-100/50">Primary source: query.php (roster), ajax.php (trees), tip.php (tooltips). Preview videos for animation durations via ffprobe.</div>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-sm border border-amber-800/30 bg-bdo-leather-dark/30 p-3">
              <Download className="mt-0.5 size-4 shrink-0 text-emerald-400" />
              <div>
                <div className="text-sm font-semibold text-amber-200">api.garmoth.com</div>
                <div className="text-xs text-amber-100/50">Addon popularity data (800 skills). Fully open, no rate limit. Single 312KB request.</div>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-sm border border-amber-800/30 bg-bdo-leather-dark/30 p-3">
              <Film className="mt-0.5 size-4 shrink-0 text-purple-400" />
              <div>
                <div className="text-sm font-semibold text-amber-200">naeu.playblackdesert.com</div>
                <div className="text-xs text-amber-100/50">Official Pearl Abyss class portraits (31 main + 31 awakening + 25 succession = 87 images from static.pearlcdn.com)</div>
              </div>
            </div>
          </div>
        </section>

        {/* Version history */}
        <section>
          <h2 className="bdo-title mb-3 text-lg font-bold text-amber-300">Version History</h2>
          <div className="space-y-4">
            {VERSIONS.slice().reverse().map((v, i) => (
              <motion.div
                key={v.version}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-sm border-2 border-amber-800/40 bg-bdo-leather-dark/30 p-4"
              >
                <div className="mb-2 flex items-center gap-3">
                  <span className="rounded-sm bg-amber-500/20 px-2 py-0.5 font-mono text-sm font-bold text-amber-300">
                    {v.version}
                  </span>
                  <span className="text-xs text-amber-200/40">{v.date}</span>
                  <span className="text-sm font-semibold text-amber-100">{v.title}</span>
                </div>

                {v.features.length > 0 && (
                  <div className="mb-2">
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300/60">Added</div>
                    <ul className="space-y-1">
                      {v.features.map((f, j) => (
                        <li key={j} className="flex items-start gap-2 text-xs text-amber-100/70">
                          <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-emerald-400/60" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {v.fixes.length > 0 && (
                  <div>
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-red-300/60">Fixed</div>
                    <ul className="space-y-1">
                      {v.fixes.map((f, j) => (
                        <li key={j} className="flex items-start gap-2 text-xs text-amber-100/70">
                          <span className="mt-0.5 size-3 shrink-0 text-red-400/60">⚠</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div className="mt-8 border-t border-amber-900/30 pt-4 text-center text-[10px] text-amber-300/30">
          BDO Meta · {VERSIONS.length} versions · https://github.com/Random1495701/bdo-meta · Data from bdocodex.com + garmoth.com + Pearl Abyss
        </div>
      </div>
    </div>
  )
}
