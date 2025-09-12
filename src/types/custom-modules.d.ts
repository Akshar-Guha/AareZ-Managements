declare module 'cors' {
  import { Request, Response, NextFunction } from 'express';

  interface CorsOptions {
    origin?: string | string[] | RegExp | ((origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void);
    methods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
  }

  function cors(options?: CorsOptions): (req: Request, res: Response, next: NextFunction) => void;

  export = cors;
}

declare module 'cookie-parser' {
  import { Request, Response, NextFunction } from 'express';

  function cookieParser(secret?: string | string[]): (req: Request, res: Response, next: NextFunction) => void;

  export = cookieParser;
}

declare module 'jsonwebtoken' {
  export interface SignOptions {
    expiresIn?: string | number;
    notBefore?: string | number;
    audience?: string | string[];
    issuer?: string;
    jwtid?: string;
    subject?: string;
    noTimestamp?: boolean;
    header?: Record<string, any>;
  }

  export interface VerifyOptions {
    algorithms?: string[];
    audience?: string | string[];
    issuer?: string | string[];
    ignoreExpiration?: boolean;
    ignoreNotBefore?: boolean;
    subject?: string;
    clockTolerance?: number;
    maxAge?: string | number;
    clockTimestamp?: number;
  }

  export function sign(payload: string | Buffer | object, secretOrPrivateKey: string | Buffer, options?: SignOptions): string;
  export function verify(token: string, secretOrPublicKey: string | Buffer, options?: VerifyOptions): string | object;
}

declare module 'pg' {
  export interface QueryResult<T = any> {
    rows: T[];
    rowCount: number;
    command: string;
    oid: number;
    fields: any[];
  }

  export interface PoolConfig {
    connectionString?: string;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
  }

  export class Pool {
    constructor(config?: PoolConfig);
    query<T = any>(queryText: string, values?: any[]): Promise<QueryResult<T>>;
    on(event: 'error', listener: (err: Error) => void): this;
  }
}

declare module 'bcrypt' {
  export function hash(data: string | Buffer, saltOrRounds: string | number): Promise<string>;
  export function compare(data: string | Buffer, encrypted: string): Promise<boolean>;
}
