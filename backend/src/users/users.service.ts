import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import type { Role, User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';
import { AuthService, type Caller } from '../auth/auth.service.js';
import { normalise } from '../auth/identifiers.js';
import { hashPassword } from '../auth/passwords.js';
import { seal, unseal } from '../auth/sealed.js';
import { SessionsService } from '../auth/sessions.service.js';

export interface NewUser {
  name: string;
  email: string;
  username: string;
  password: string;
  role: Role;
}

export type Changes = Partial<NewUser>;

// one row of the User Management table (never the password itself, which is fetched on its own)
const row = (user: User) => ({
  id: user.id,
  number: user.number,
  name: user.name,
  username: user.username,
  email: user.email,
  role: user.role,
  main: user.mainAccount,
  passwordStored: user.passwordSealed !== null,
});

const isUniqueViolation = (error: unknown) => (error as { code?: string } | null)?.code === 'P2002';

// User Management, for admins. The rules, checked here whatever the portal shows:
// - The main account is changed, shown or deleted only by itself, its role stays Admin, and it can't
//   be deleted at all.
// - Nobody changes their own role or deletes their own account, so an admin can't lock themselves out.
// Every change, and every password shown, goes in the sign-in record.
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly sessions: SessionsService,
  ) {}

  async list() {
    const users = await this.prisma.user.findMany({ orderBy: { number: 'asc' } });
    return users.map(row);
  }

  async create(input: NewUser, me: User, caller: Caller) {
    // the id is made here so the sealed password can be bound to it
    const id = randomUUID();
    try {
      const user = await this.prisma.user.create({
        data: {
          id,
          name: input.name,
          email: input.email,
          username: input.username,
          role: input.role,
          passwordHash: await hashPassword(input.password),
          passwordSealed: seal(input.password, id),
        },
      });
      await this.auth.record('USER_CREATED', me.id, caller, { targetId: user.id });
      return row(user);
    } catch (error) {
      if (isUniqueViolation(error)) throw await this.taken(null, input.email);
      throw error;
    }
  }

  async update(id: string, changes: Changes, me: User, caller: Caller, req: Request) {
    const target = await this.target(id, me);
    if (changes.role !== undefined && changes.role !== target.role) {
      if (target.mainAccount) throw new ForbiddenException({ code: 'main_account' });
      if (target.id === me.id) throw new ForbiddenException({ code: 'self' });
    }

    const { password, ...fields } = changes;
    const data = {
      ...fields,
      ...(password !== undefined && {
        passwordHash: await hashPassword(password),
        passwordSealed: seal(password, target.id),
        // a new password also lifts any lock from wrong guesses
        failedLogins: 0,
        lockedUntil: null,
      }),
    };
    let user: User;
    try {
      user = await this.prisma.user.update({ where: { id: target.id }, data });
    } catch (error) {
      if (isUniqueViolation(error)) throw await this.taken(target.id, changes.email);
      throw error;
    }
    // whoever knew the old password is signed out everywhere (except the admin making the change)
    if (password !== undefined) await this.sessions.revokeOthers(target.id, req);
    await this.auth.record('USER_UPDATED', me.id, caller, { targetId: target.id, detail: Object.keys(changes).join(',') });
    return row(user);
  }

  // `confirm` is the account's username, typed out by the admin
  async remove(id: string, confirm: string, me: User, caller: Caller) {
    const target = await this.target(id, me);
    if (target.mainAccount) throw new ForbiddenException({ code: 'main_account' });
    if (target.id === me.id) throw new ForbiddenException({ code: 'self' });
    if (normalise(confirm) !== target.username) throw new BadRequestException({ code: 'confirm' });
    await this.prisma.user.delete({ where: { id: target.id } });
    await this.auth.record('USER_DELETED', me.id, caller, { targetId: target.id, detail: target.username });
  }

  async password(id: string, me: User, caller: Caller) {
    const target = await this.target(id, me);
    if (!target.passwordSealed) throw new NotFoundException({ code: 'not_stored' });
    const password = unseal(target.passwordSealed, target.id);
    if (password === null) throw new ConflictException({ code: 'unreadable' });
    await this.auth.record('PASSWORD_VIEWED', me.id, caller, { targetId: target.id });
    return { password };
  }

  // the account being acted on; only the main account may act on the main account
  private async target(id: string, me: User): Promise<User> {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException({ code: 'not_found' });
    if (target.mainAccount && target.id !== me.id) throw new ForbiddenException({ code: 'main_account' });
    return target;
  }

  // which of email or username another account already has
  private async taken(id: string | null, email?: string) {
    const other = email ? await this.prisma.user.findUnique({ where: { email }, select: { id: true } }) : null;
    return new ConflictException({ code: 'taken', field: other && other.id !== id ? 'email' : 'username' });
  }
}
