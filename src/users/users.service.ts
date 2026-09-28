import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PublicUser, Role, User } from './user.entity.js';

@Injectable()
export class UsersService {
  private readonly users: User[] = [];

  create(email: string, passwordHash: string, role: Role = 'user'): User {
    const user: User = {
      id: randomUUID(),
      email: email.toLowerCase(),
      passwordHash,
      role,
      createdAt: new Date(),
    };
    this.users.push(user);
    return user;
  }

  findByEmail(email: string): User | undefined {
    return this.users.find((u) => u.email === email.toLowerCase());
  }

  findById(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  toPublic(user: User): PublicUser {
    const { passwordHash: _passwordHash, ...rest } = user;
    return rest;
  }
}
