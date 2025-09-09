import { StackServerApp } from '@stackframe/stack';

export const stackServerApp = new StackServerApp({
  secretServerKey: process.env.STACK_SECRET_SERVER_KEY!,
});
