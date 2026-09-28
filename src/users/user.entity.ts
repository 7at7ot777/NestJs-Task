export type Role = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: Date;
}

export type PublicUser = Omit<User, 'passwordHash'>;
