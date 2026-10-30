import type { User } from '../generated/prisma/client.js';

// what the portal may know about the signed-in account
export const profile = (user: User) => ({
  id: user.id,
  number: user.number,
  name: user.name,
  username: user.username,
  email: user.email,
  role: user.role,
  main: user.mainAccount,
});
