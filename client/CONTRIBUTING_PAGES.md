# Dashboard page contract (for contributors)

All dashboard pages live in `client/src/pages/dashboard/` and are rendered inside
`DashboardLayout` (sidebar + topbar already provided). Each file must have a
**default export** React component (no props). They are lazy-loaded in `src/App.tsx`.

## Must read before writing
- `src/lib/api.ts` — the typed API client (`api.*`)
- `src/lib/types.ts` — all data types
- `src/lib/utils.ts` — `cn`, `formatNumber`, `formatRelative`, `formatDate`, `formatDuration`, `STATUS_META`, `copyToClipboard`, `downloadUrl`
- `src/pages/dashboard/Create.tsx` — reference for style, data-fetching, toasts
- UI kit in `src/components/ui/`: `Button`, `Card`, `MotionCard`, `Badge`/`StatusBadge`,
  `Skeleton`/`SkeletonCard`/`SkeletonRow`, `Input`/`Textarea` (from `Field`), `Modal`,
  `EmptyState`, `Progress`/`CircularProgress`, `PageHeader`, `PageLoader`/`Spinner`
- Dashboard components: `StatCard`, `VideoCard`, `VideoThumb`

## Conventions
- Data fetching: `@tanstack/react-query` (`useQuery`, `useMutation`, `useQueryClient`).
- Toasts: `import toast from 'react-hot-toast'`.
- Icons: `lucide-react`.
- Animations: `framer-motion` (subtle, premium — fade/slide, stagger). Charts: `recharts`.
- Styling: Tailwind + the `.card`, `.btn-*`, `.input`, `.glass`, `.gradient-text`,
  `.chip`, `.skeleton` utility classes. Dark theme only.
- Always handle: loading (skeletons), empty (EmptyState), and error states.
- Import alias `@/` → `src/`.
- Keep it TypeScript-strict clean: no unused vars/params, no `any` unless necessary.
- Media URLs (`video.videoPath`, `thumbnailPath`) are same-origin paths like
  `/storage/...` — use directly in `<img>`/`<video>`/`downloadUrl`.

## Storage/media
- `<video src={video.videoPath} controls>` works in dev (Vite proxies `/storage`).
- Download with `downloadUrl(video.videoPath, 'goalforge.mp4')`.

Keep pages cohesive with the existing premium aesthetic. No placeholder "TODO"s.
