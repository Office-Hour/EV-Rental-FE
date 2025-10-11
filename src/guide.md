# EV Rental Frontend - Folder Structure Guide

This guide explains the purpose and usage of each folder in the application.

## Root Level (`src/`)

### `app/`

The main application folder containing all Angular components, services, and features.

---

## Core Application Files (`src/app/`)

### `core/`

**Purpose**: Contains singleton services, guards, interceptors, and other application-wide utilities that should be instantiated only once.

**What to put here**:

- **`auth/guards/`**: Route guards for authentication and authorization (e.g., `AuthGuard`, `GuestGuard`)
- **`interceptors/`**: HTTP interceptors for request/response manipulation (e.g., `AuthInterceptor`, `ErrorInterceptor`)
- **`services/`**: Core singleton services used across the app (e.g., `AuthService`, `ConfigService`)
- **`tokens/`**: Injection tokens for dependency injection

**Guidelines**:

- Services should be provided in `'root'`
- Should NOT be imported in multiple modules
- Keep these services stateless when possible
- Examples: authentication, HTTP handling, app configuration

---

### `features/`

**Purpose**: Contains feature modules organized by business domain. Each feature is self-contained with its own components, services, and routes.

**What to put here**:

- **`auth/`**: Authentication-related features
  - `pages/sign-in/`: Login page
  - `pages/sign-up/`: Registration page
  - `pages/forgot-password/`: Password recovery
  - `pages/reset-password/`: Password reset
  - `pages/confirmation-required/`: Email confirmation
  - `pages/unlock-session/`: Session unlock
  - `pages/sign-out/`: Logout page
  - `components/`: Reusable auth-specific components
  - `auth.routes.ts`: Auth feature routing

- **`landing/`**: Landing page and marketing content
- **`orders/`**: Order management features

**Guidelines**:

- Each feature should be independently lazy-loadable
- Use standalone components
- Keep feature-specific logic within the feature folder
- Each feature should have its own `.routes.ts` file
- Don't share components between features; use `shared/` instead

---

### `layout/`

**Purpose**: Contains layout components that define the structure of different pages.

**What to put here**:

- **`main-layout/`**: Primary application layout (header, sidebar, footer)
- Additional layouts (e.g., `auth-layout/`, `admin-layout/`)
- `layout.ts` and `layout.html`: Base layout component

**Guidelines**:

- Layouts should be reusable across multiple routes
- Keep layout logic minimal
- Use signals for layout state management
- Implement responsive design patterns

---

### `shared/`

**Purpose**: Contains reusable components, directives, pipes, and utilities used across multiple features.

**What to put here**:

- **`animations/`**: Reusable Angular animations
- **`components/`**: Shared UI components
  - `alert/`: Alert/notification components
  - `card/`: Card container components
  - `drawer/`: Side drawer/panel components
  - `fullscreen/`: Fullscreen toggle components
  - `highlight/`: Code/text highlighting components
  - `loading-bar/`: Loading progress indicators
  - `masonry/`: Masonry grid layout components
  - `navigation/`: Navigation components (breadcrumbs, menus)

- **`directives/`**: Custom Angular directives (e.g., `AutofocusDirective`, `ClickOutsideDirective`)
- **`pipes/`**: Custom Angular pipes (e.g., `SafeHtmlPipe`, `TimeAgoPipe`)
- **`forms/`**: Form-related utilities and validators
- **`services/`**: Shared utility services
  - `loading/`: Loading state management
  - `splash-screen/`: Splash screen service
- **`styles/`**: Shared SCSS/CSS utilities and mixins

**Guidelines**:

- Only put truly reusable code here
- Components should be feature-agnostic
- Use standalone components
- Keep dependencies minimal
- Document component inputs/outputs clearly

---

### `state/`

**Purpose**: Global state management using signals or other state management solutions.

**What to put here**:

- Global application state
- State slices for cross-feature data
- State management utilities
- Signal-based stores

**Guidelines**:

- Use signals for reactive state
- Keep state immutable
- Use `computed()` for derived state
- Organize by domain (e.g., `user.state.ts`, `cart.state.ts`)

---

### `mock-api/`

**Purpose**: Mock API data and services for development and testing.

**What to put here**:

- Mock data generators
- In-memory API implementations
- Development-only HTTP handlers
- Test fixtures

**Guidelines**:

- Should be easily toggleable via environment config
- Mirror real API structure
- Use TypeScript for type safety
- Should NOT be included in production builds

---

### `testing/`

**Purpose**: Testing utilities, helpers, and shared test setup.

**What to put here**:

- Test utilities and helper functions
- Mock factories
- Shared test fixtures
- Custom matchers
- Testing module configurations

**Guidelines**:

- Keep test helpers DRY (Don't Repeat Yourself)
- Use TypeScript for better IDE support
- Document complex test utilities

---

## Best Practices Summary

### When to use each folder:

1. **`core/`**: Singleton services, guards, interceptors - used once app-wide
2. **`features/`**: Business logic grouped by domain - lazy loaded routes
3. **`layout/`**: Page structure components - wrapping your features
4. **`shared/`**: Reusable UI components - used in multiple features
5. **`state/`**: Global state - data shared across features
6. **`mock-api/`**: Development data - simulating backend
7. **`testing/`**: Test helpers - making tests easier to write

### Folder Organization Rules:

✅ **DO**:

- Keep features independent and lazy-loadable
- Use standalone components everywhere
- Use signals for state management
- Group related files together
- Use clear, descriptive folder names

❌ **DON'T**:

- Mix core services with feature services
- Create circular dependencies between features
- Put feature-specific code in `shared/`
- Import entire feature modules elsewhere
- Create deeply nested folder structures (3-4 levels max)

---

## File Naming Conventions

- **Components**: `component-name.ts`, `component-name.html`, `component-name.css`
- **Services**: `service-name.service.ts`
- **Guards**: `guard-name.guard.ts`
- **Interceptors**: `interceptor-name.interceptor.ts`
- **Pipes**: `pipe-name.pipe.ts`
- **Directives**: `directive-name.directive.ts`
- **Routes**: `feature-name.routes.ts`
- **State**: `domain-name.state.ts`

---

## Example: Adding a New Feature

Let's say you want to add a "Vehicles" feature:

1. Create `src/app/features/vehicles/`
2. Add `vehicles.routes.ts` with lazy-loaded routes
3. Create `pages/` folder for route components (list, detail, edit)
4. Create `components/` for vehicle-specific components
5. Create `services/` for vehicle-specific business logic (if needed)
6. Update `app.routes.ts` to lazy-load the vehicles routes

```typescript
// app.routes.ts
{
  path: 'vehicles',
  loadChildren: () => import('./features/vehicles/vehicles.routes')
}
```

---

This structure ensures your application remains:

- **Scalable**: Easy to add new features
- **Maintainable**: Clear separation of concerns
- **Testable**: Isolated, focused modules
- **Performant**: Lazy-loaded features reduce initial bundle size
