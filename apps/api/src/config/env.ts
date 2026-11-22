import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://fedsocial:fedsocial_secret@localhost:5432/fedsocial_db?schema=public',
  JWT_SECRET: process.env.JWT_SECRET || 'fedsocial_dev_secret_key_change_in_production_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  LOCAL_AGENT_URL: process.env.LOCAL_AGENT_URL || 'http://127.0.0.1:4848',
};
