export default () => ({
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  port: parseInt(process.env['APP_PORT'] ?? '3001', 10),
  database: {
    host: process.env['POSTGRES_HOST'] ?? 'localhost',
    port: parseInt(process.env['POSTGRES_PORT'] ?? '5432', 10),
    user: process.env['POSTGRES_USER'] ?? 'creditmap',
    password: process.env['POSTGRES_PASSWORD'],
    name: process.env['POSTGRES_DB'] ?? 'creditmap_dev',
  },
  redis: {
    host: process.env['REDIS_HOST'] ?? 'localhost',
    port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
    password: process.env['REDIS_PASSWORD'],
  },
  jwt: {
    secret: process.env['JWT_SECRET'],
    expiry: process.env['JWT_EXPIRY'] ?? '15m',
    refreshSecret: process.env['JWT_REFRESH_SECRET'],
    refreshExpiry: process.env['JWT_REFRESH_EXPIRY'] ?? '7d',
  },
});
