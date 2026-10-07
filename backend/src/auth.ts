import { betterAuth } from 'better-auth';
import { pool } from './db/pool.js';
import { env } from './config/env.js';

export const auth = betterAuth({
  database: pool,
  baseURL: 'http://localhost:3000',
  trustedOrigins: ['http://localhost:5173', 'http://localhost:5174', env.corsOrigin],
  emailAndPassword: {
    enabled: true,
  },
});
