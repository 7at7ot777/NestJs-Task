# NestJS JWT Auth (Passport)

Small NestJS 12 app showing JWT authentication with Passport: signup, login, a protected route, a public route, plus role-based access, refresh tokens and a consistent error shape.

Users are stored in memory, so they are lost on restart.

## Run

```bash
npm install
cp .env.example .env   # then change the secrets
npm run start:dev
```

- API: http://localhost:3000
- Swagger: http://localhost:3000/docs (click **Authorize** and paste the access token)
- Postman: import `postman_collection.json`. The Login and Refresh requests save tokens into collection variables automatically.

```bash
npm run test:e2e   # full flow: signup -> login -> profile -> admin -> refresh
```

## Endpoints

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/health` | public | `{ status: 'ok' }` |
| POST | `/auth/signup` | public | `{ email, password, role? }`, returns the user without the password |
| POST | `/auth/login` | public | returns `{ accessToken, refreshToken }` |
| POST | `/auth/refresh` | refresh token | body `{ refreshToken }`, returns a new pair |
| GET | `/auth/profile` | Bearer token | returns `req.user` (read from the token, no DB call) |
| GET | `/auth/admin` | Bearer token + admin role | `@Roles('admin')` |

`role` on signup exists only so you can try the admin route. A real app wouldn't let clients choose their own role.

Every error looks like this:

```json
{ "success": false, "statusCode": 401, "message": "Unauthorized", "path": "/auth/profile", "timestamp": "..." }
```

## How the pieces fit

```
src/
  app.module.ts          global guards: JwtAuthGuard, then RolesGuard
  app.setup.ts           ValidationPipe + HttpExceptionFilter (shared by main.ts and the tests)
  auth/
    jwt.strategy.ts          Bearer header -> verify with the access secret -> validate() -> req.user
    jwt-refresh.strategy.ts  body.refreshToken -> verify with the refresh secret
    jwt-auth.guard.ts        AuthGuard('jwt'), skipped when @Public() is present
    roles.guard.ts           compares req.user.role with @Roles(...)
    decorators/              @Public(), @Roles(), @CurrentUser()
    dto/                     class-validator DTOs
  users/users.service.ts     in-memory store; toPublic() removes passwordHash
  common/filters/            consistent error shape
```

Request flow for `GET /auth/profile`:
1. `JwtAuthGuard.canActivate` checks for `@Public()` metadata. There is none, so it calls Passport.
2. `JwtStrategy` reads the Bearer token and checks its signature and expiry. If either fails, the request gets a 401.
3. `JwtStrategy.validate(payload)` returns `{ userId, email, role }`, and Passport sets it as `req.user`.
4. `RolesGuard` finds no `@Roles()` on the route, so it lets the request through.
5. The controller reads the user with `@CurrentUser()`, which is just `req.user`.

## Self-check answers

**Where does `validate()` output end up, and how do you access it in a controller?**
Passport attaches whatever `validate()` returns to `req.user`. In a controller you can read it with `@Req() req` and `req.user`, or, more cleanly, with a custom param decorator such as `@CurrentUser()` built with `createParamDecorator`. If `validate()` returns null or throws, the guard responds with 401.

**Why should access tokens expire quickly, and what problem do refresh tokens solve?**
A JWT is stateless: once it is signed, the server can't revoke it before it expires. Keeping the lifetime short (15m here) limits how long a stolen token is useful. Short tokens would make users log in again all the time, so a longer-lived refresh token (7d here) is used only at `/auth/refresh` to get a new access token. It is signed with a different secret, so an access token can't be used as a refresh token. Because refreshing is a single endpoint, it is also a good place to add revocation, rotation, or reuse detection.

**What happens if you forget `@Public()` on `/health` while `JwtAuthGuard` is global?**
`/health` then requires a valid Bearer token and returns 401 without one. Load balancer and Kubernetes health checks would fail, and the instance could be marked unhealthy. Registering the guard globally means routes are secure by default: forgetting `@Public()` locks a route (safe), while forgetting `@UseGuards` on a sensitive route would expose it (unsafe).
