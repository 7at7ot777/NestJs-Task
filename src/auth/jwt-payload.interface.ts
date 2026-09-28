import type { Role } from '../users/user.entity.js';

// Shape signed into the token.
export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

// Shape attached to req.user by the strategies' validate().
export interface AuthUser {
  userId: string;
  email: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends AuthUser {}
  }
}
