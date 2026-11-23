import dotenv from 'dotenv';
dotenv.config();

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
const knexConfig = {
  development: {
    client: process.env.DB_CLIENT || 'mysql2',
    connection: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'pg_backend_db',
      timezone: '+05:30',
    },
    pool: {
      min: 2,
      max: 10,
      afterCreate: (connection, done) => {
        connection.query("SET time_zone = '+05:30';", (err) => {
          done(err, connection);
        });
      },
    },
    migrations: {
      directory: './src/database/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './src/database/seeds',
    },
  },

  test: {
    client: process.env.DB_CLIENT || 'mysql2',
    connection: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: (process.env.DB_NAME || 'pg_backend_db') + '_test',
    },
    pool: {
      min: 2,
      max: 10,
      afterCreate: (connection, done) => {
        connection.query("SET time_zone = '+05:30';", (err) => {
          done(err, connection);
        });
      },
    },
    migrations: {
      directory: './src/database/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './src/database/seeds',
    },
  },

  production: {
    client: process.env.DB_CLIENT || 'mysql2',
    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      timezone: process.env.DB_TIMEZONE || '+05:30',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
    },
    pool: {
      min: 2,
      max: 20,
      afterCreate: (connection, done) => {
        connection.query("SET time_zone = '+05:30';", (err) => {
          done(err, connection);
        });
      },
    },
    migrations: {
      directory: './src/database/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './src/database/seeds',
    },
  },
};

export default knexConfig;

