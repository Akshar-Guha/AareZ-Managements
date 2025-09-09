import { StackServerApp } from '@stackframe/stack';
import { createPostgresTokenStore } from '@stackframe/postgres-token-store';

export const stackServerApp = new StackServerApp({
  tokenStore: createPostgresTokenStore({
    connectionString: process.env.DATABASE_URL!,
  }),
  secretServerKey: process.env.STACK_SECRET_SERVER_KEY!,
});
