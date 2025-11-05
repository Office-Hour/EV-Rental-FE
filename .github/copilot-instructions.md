You are an expert in TypeScript, Angular 20, and scalable web application development. Write functional, maintainable, performant, and accessible code that aligns with this project.

- Keep strict typing; prefer inference; never introduce `any` (use `unknown` as a last resort) and avoid template arrow functions or regex.
- Standalone Angular app boots in `src/main.ts`; global providers in `app/app.config.ts` enable `provideZonelessChangeDetection`, so rely on signals/computed and explicit Observables instead of zone-dependent hacks.

## Architecture

- Feature routes live in `*.routes.ts` and lazy load folders (e.g. `features/customer/booking/booking.routes.ts`); protect segments with `AuthGuard` + `data.roles` and fall back to `NoAuthGuard` for guest flows.
- Shared domain logic belongs in `core-logic/**` (auth, user, station, bookings) which orchestrates OpenAPI clients and exposes signal-backed state; UI primitives live in `lib/common-ui/**` and utilities in `lib/ngm-dev-blocks/**`.
- Authentication flows: `AuthService` stores tokens via `TokenService` signals, `auth.interceptor.ts` refreshes access tokens before retrying requests, and `AuthService.redirectUser()` handles role-specific routing—extend these patterns when adding auth features.

## State & Data

- Use `signal`/`computed`/`toSignal` for local state just like `CarList` and `LayoutComponent`; when exposing arrays return copies to prevent mutation.
- Inject OpenAPI clients from `contract` (wired up by `provideApi` + `APIS`) but wrap complex sequences in services such as `StationService` which forks requests and caches pagination signals.
- Update signals with `.set()` or `.update()` only—never `mutate`—and prefer `computed()` for derived values; use `inject()` rather than constructor injection.

## UI Conventions

- Components default to `ChangeDetectionStrategy.OnPush`; use `input()`/`input.required()` and `output()` helpers, and configure host bindings via the `host` object instead of `@HostBinding`/`@HostListener` (Angular v20 already defaults to standalone—never add `standalone: true`).
- Templates use Angular v20 control flow (`@if`, `@for`) and class bindings; do not use `ngClass`/`ngStyle`. Tailwind utility classes are acceptable through literal `class` attributes.
- Always import `NgOptimizedImage` for static imagery and follow `CarCard`’s `[ngSrc]` pattern with explicit width/height; keep alt text meaningful for AXE. Prefer Reactive forms for data entry (see `features/auth/sign-in/sign-in.component.ts`).
- Layout is handled by `layout/layout.ts` (Material toolbar + sidenav, `DeviceService` breakpoints, `cx` helper); new shell features should plug into its navigation signals.

## Styling & Assets

- Global theme and Material overrides live in `src/styles.scss`; scope feature styles locally and only use `::ng-deep` when extending Material as seen in `layout.scss`.
- Static assets (images, Lottie JSON) live under `public/**` and are referenced with root-relative paths (`/images/...`, `animations/...`); reuse `SplashScreenService` instead of toggling body classes yourself.

## Tooling & Workflows

- Use `pnpm install` and scripts `pnpm start`, `pnpm build`, `pnpm test`, `pnpm test:ci`, `pnpm lint`, `pnpm lint:fix`, `pnpm lint-style`; formatters are driven by ESLint + Stylelint + Prettier.
- Regenerate the OpenAPI client with `pnpm generate-openapi` before editing `src/contract/**`; the command uses Windows `curl.exe -k` to download the spec.

## Accessibility & UX

- Follow WCAG AA: retain focus styles from `styles.scss`, ensure interactive icons have labels (`mat-icon aria-hidden` adjustments in `layout.html`), and keep responsive behavior consistent with `DeviceService`.
- Maintain the splash screen lifecycle (navigation completion + `afterNextRender`) by using the existing `SplashScreenService.show()/hide()` APIs when adjusting startup flows.
