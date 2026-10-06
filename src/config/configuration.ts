export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    name: process.env.DB_NAME ?? 'meetia',
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/meetia?schema=public',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'meetia-super-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  twoFA: {
    issuer: 'Meetia',
    window: 1,
  },
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:4321',
    credentials: true,
  },
});