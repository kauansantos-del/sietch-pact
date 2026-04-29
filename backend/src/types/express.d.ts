import { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface UserContext {
      userId: string;
      email: string;
      role: UserRole;
    }

    interface Request {
      user?: UserContext;
    }
  }
}

export {};
