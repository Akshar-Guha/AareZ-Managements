import type { Knex } from "knex";
import * as dotenv from 'dotenv';
dotenv.config();

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "pg",
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { 
        rejectUnauthorized: false,
        ca: process.env.DATABASE_CA_CERT // Optional: if you need a custom CA cert
      }
    },
    migrations: {
      directory: './migrations'
    },
    seeds: {
      directory: './seeds'
    },
  },

  production: {
    client: "pg",
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { 
        rejectUnauthorized: false,
        ca: process.env.DATABASE_CA_CERT // Optional: if you need a custom CA cert
      }
    },
    migrations: {
      directory: './migrations'
    },
    seeds: {
      directory: './seeds'
    },
    pool: {
      min: 2,
      max: 10
    },
  }
};

export default config;
