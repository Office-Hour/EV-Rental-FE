# API Configuration

This directory contains the API configuration for the EV Rental application.

## Files

- `api.config.ts` - Main API configuration file

## Setup

### 1. Update Base URL

Edit `api.config.ts` and update the `baseUrl` to match your backend API:

```typescript
export const API_CONFIG = {
  baseUrl: 'https://your-backend-api.com', // Update this
  // ...
};
```

### 2. Common Base URLs

- **Development**: `http://localhost:5000` or `https://localhost:5001`
- **Staging**: `https://api-staging.yourdomain.com`
- **Production**: `https://api.yourdomain.com`

### 3. Environment-Specific Configuration

For multiple environments, you can create environment-specific configs:

```typescript
// For production builds
export const API_CONFIG = {
  baseUrl: environment.production ? 'https://api.yourdomain.com' : 'http://localhost:5000',
  // ...
};
```

## API Endpoints

Current endpoints are organized by feature:

### Authentication (`AUTH_ENDPOINTS`)

- `login` - User login
- `register` - User registration
- `changePassword` - Password change
- `refreshToken` - Token refresh
- `profile` - User profile
- `updateProfile` - Profile update

### Adding New Endpoints

1. Add to `API_CONFIG.endpoints`:

```typescript
endpoints: {
  auth: { /* ... */ },
  cars: {
    list: '/api/Cars',
    get: '/api/Cars/{id}',
    // ...
  },
}
```

2. Create endpoint constants:

```typescript
export const CAR_ENDPOINTS = {
  list: getApiUrl(API_CONFIG.endpoints.cars.list),
  get: (id: string) => getApiUrl(API_CONFIG.endpoints.cars.get.replace('{id}', id)),
  // ...
};
```

## Usage in Services

Import and use the endpoint constants:

```typescript
import { AUTH_ENDPOINTS } from '../api/api.config';

@Injectable()
export class AuthService {
  login(credentials: LoginRequest) {
    return this.http.post(AUTH_ENDPOINTS.login, credentials);
  }
}
```

## Notes

- All endpoints are relative to the `baseUrl`
- The `getApiUrl()` helper combines base URL with endpoints
- HTTP interceptor automatically adds authorization headers
- Update base URL before deploying to different environments
