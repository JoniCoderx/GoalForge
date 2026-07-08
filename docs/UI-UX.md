# GoalForge AI — UI / UX Design System

The complete design language behind GoalForge AI: the tokens, components,
motion, layouts and per-screen UX that make the product feel like a premium
$100–200/mo tool (Vercel / Linear / Raycast tier). Everything here is
implemented in the codebase — this doc is the source of truth for how it looks
and behaves.

---

## 1. Design principles

1. **Dark, cinematic, focused.** A near-black navy canvas lets brand-green and
   content pop. No pure black, no pure white — always tinted.
2. **Glass over depth.** Panels are translucent, blurred glass layered over a
   soft animated glow, never flat cards on flat backgrounds.
3. **Motion with meaning.** Every entrance, hover and state change is animated,
   but subtly (150–600ms, spring/ease-out). Motion guides attention, never
   distracts. Respects `prefers-reduced-motion`.
4. **One-click first.** The primary action (Generate / Render) is always the
   brightest thing on screen. The happy path is never more than one tap away.
5. **Never a dead end.** Every screen handles loading (skeletons), empty
   (illustrated EmptyState + CTA) and error states.

---

## 2. Brand

| Token | Value | Use |
|-------|-------|-----|
| Wordmark | `GoalForge` white + `AI` brand-green | Nav, auth, sidebar |
| Logo mark | Rounded-square badge, football ring + forge shard, green→sky gradient | Favicon, nav |
| Voice | Energetic, confident, punchy — "forge", "viral", "on autopilot" | Copy |

---

## 3. Color

Defined in `client/tailwind.config.ts`.

### Canvas — `ink`
| Token | Hex | Use |
|-------|-----|-----|
| `ink-950` | `#050914` | App background |
| `ink-900` | `#0a1120` | Sidebar, elevated surfaces |
| `ink-800` | `#0f1729` | Popovers, modals |
| `ink-700` / `600` | `#16203a` / `#1f2b47` | Borders, device frame |

### Brand — `brand` (emerald/green)
`brand-400 #34d399` · **`brand-500 #22c55e`** (primary) · `brand-600 #16a34a`.
The green is the pitch, the go-signal, the identity.

### Accents
| Token | Hex | Meaning |
|-------|-----|---------|
| `accent.sky` | `#0ea5e9` | Secondary / info / rendering |
| `accent.violet` | `#a855f7` | Admin surfaces |
| `accent.amber` | `#f59e0b` | Warnings / queued / stats |
| `accent.rose` | `#f43f5e` | Danger / failed / destructive |

### Semantic status (`STATUS_META` in `lib/utils.ts`)
`DRAFT` slate · `QUEUED` amber · `RENDERING` sky (pulsing) · `READY` brand ·
`FAILED` rose. Rendered as a dot + label chip everywhere a video status shows.

### Signature gradients
- **`bg-grid-glow`** — radial green+sky glow, top-anchored (page ambiance)
- **`bg-mesh`** — three-point green/sky/violet mesh (auth & CTA panels)
- **`gradient-text`** — green→emerald→sky text clip (headlines, wordmark)
- The **video render** mirrors this: an animated radial-glow gradient from
  `backgroundColor → primaryColor`, so on-screen brand == exported brand.

---

## 4. Typography

Loaded in `index.html` (Google Fonts) with system fallbacks.

| Role | Family | Weights | Where |
|------|--------|---------|-------|
| Display | **Space Grotesk** (`font-display`) | 500/600/700 | Headlines, stats, nav, numbers |
| Body / UI | **Inter** (`font-sans`) | 400/500/600/700 | Everything else |
| Video captions | **Big Shoulders / Arsenal** (bundled TTFs) | Bold | FFmpeg-rendered on-screen text |

Scale: hero `text-5xl→6xl` · page titles `text-2xl→3xl` · card titles `text-lg`
· body `text-sm` · meta `text-xs`. Headlines use `text-balance` for clean wraps.

---

## 5. Core components (`client/src/components/ui`)

| Component | Notes |
|-----------|-------|
| **Button** | `primary` (green gradient + glow), `secondary` (glass), `ghost`, `danger`. Sizes sm/md/lg. Built-in `loading` spinner, `active:scale-[0.98]` press. |
| **Card** / **MotionCard** | `.card` = glass + rounded-2xl + soft shadow. MotionCard adds in-view fade-up. |
| **Badge / StatusBadge** | Pill chips; StatusBadge animates the dot while QUEUED/RENDERING. |
| **Input / Textarea** | `.input` glass field, floating focus ring (brand), label + hint + error slots. |
| **Modal** | Centered, backdrop blur, spring scale-in, Esc to close. |
| **Skeleton** | Shimmer sweep (`.skeleton`); presets SkeletonCard / SkeletonRow. |
| **Progress / CircularProgress** | Animated width / SVG ring for render progress. |
| **EmptyState** | Icon tile + title + copy + CTA — used on every empty list. |
| **PageHeader** | Icon + title + subtitle + actions, slides in on mount. |
| **PageLoader / Spinner** | Full-screen route loader (spinning football) + inline spinner. |

Utility classes (`index.css`): `.glass`, `.glass-strong`, `.card`, `.btn-*`,
`.input`, `.label`, `.chip`, `.gradient-text`, `.skeleton`, `.noise`, `.text-balance`.

---

## 6. Motion language

- **Library split:** Framer Motion for component/state motion; **GSAP** for the
  hero timeline (staggered reveal + phone scale-in).
- **Entrances:** fade + 16px rise, `ease [0.22,1,0.36,1]`, staggered by index.
- **Hover:** cards lift (`-translate-y-1`) + border brighten + green glow.
- **Active nav:** shared-layout indicator (`layoutId`) slides between items.
- **Route change:** content cross-fades + rises (keyed on pathname).
- **Ambient:** floating football/trophy emojis (`FloatingBalls`), drifting glow
  blobs, shimmer skeletons, pulsing live-status dots, animated progress bars.
- **Signature keyframes** (`tailwind.config`): `float`, `float-slow`, `shimmer`,
  `gradient-x`, `pulse-ring`, `fade-up`.
- **Accessibility:** all of the above collapse under `prefers-reduced-motion`.

---

## 7. Layout system

- **Landing:** full-bleed sections, floating pill nav that solidifies to glass on
  scroll, max-width 6xl content, generous vertical rhythm (`py-24`).
- **Dashboard shell** (`DashboardLayout`): fixed 256px glass sidebar (desktop) /
  spring drawer (mobile) + sticky glass topbar (Generate CTA + user menu) +
  `max-w-7xl` main. Sidebar footer shows the live **AI Engine** status pill.
- **Grids:** responsive `sm:2 / lg:3` for cards, `9/16` aspect video thumbs.
- **Breakpoints:** mobile-first; every page collapses cleanly to a single column.

---

## 8. Screen-by-screen UX

| Screen | Experience |
|--------|-----------|
| **Landing** | Hero with rotating live phone mockup, glass nav, feature grid, template showcase, 3-step how-it-works, 3-tier pricing (Creator highlighted), accordion FAQ, glowing CTA, footer. |
| **Auth** | Split screen: form left, glass "perks" panel with mesh + floating balls right. Demo creds pre-filled on login. |
| **Overview** | Personalized greeting, 4 stat cards, 14-day views area-chart, quick-actions, recent-videos grid. |
| **Create** | Template picker grid → sticky generate bar (topic/tone/audience) → full editor with **live phone preview**, per-scene inline editing, hashtag chips, platform descriptions, Save + Render&Export. |
| **Videos / Drafts** | Filter chips by status + search, VideoCard grid with thumb, status, duration, view/like/share stats. |
| **VideoDetail** | Real `<video>` player (polls while rendering), meta panel, action buttons, and every content field with copy buttons. |
| **Queue** | Live-polling (1.5s) job rows with animated progress + stage; jobs animate out on completion. |
| **Exports** | Full history, status filter, computed render durations, error surfacing. |
| **Templates** | Gradient-tiled gallery of the 10 formats → "Use template" deep-links into Create. |
| **Prompt Editor** | Two-pane list + editor, save/reset, dirty-state aware. |
| **Brand** | Form + **live render preview** (radial gradient, accent bars, caption box, watermark) mirroring the FFmpeg output; color pickers with hex sync. |
| **Analytics** | Stat cards + area chart (Views/Videos toggle) + template bar chart + content-mix donut, dark glass tooltips. |
| **Settings** | Profile card, device-local preference toggles, danger zone. |
| **Admin** | Violet-accented tabbed panel: Users (role mgmt), Templates (edit), Prompts (create/delete), Logs (level-filtered, color-coded). |

---

## 9. Iconography & imagery

- **Icons:** `lucide-react`, 18–24px, stroke-based, consistent across the app.
- **Football flavor:** emoji accents (⚽🏆🔥📈) as floating ambient elements and
  template glyphs — playful without being childish.
- **No stock photos.** The aesthetic is generated: gradients, glass, type and
  motion. This keeps it fast, original and on-brand.

---

## 10. Accessibility & performance

- Focus-visible rings on all interactive elements; semantic labels on icon buttons.
- Color choices maintain legible contrast on the dark canvas; status never relies
  on color alone (dot + label).
- `prefers-reduced-motion` honored globally.
- Route-level code splitting (React.lazy), vendor chunking, lazy images,
  skeletons for perceived speed. Landing ships with preconnected fonts.

---

*This document mirrors the shipped implementation in `client/src`. Update it
alongside the components it describes.*
