import type { Options } from "sequelize";

const development: Options = {
    "username": process.env.DB_USER,
    "password": process.env.DB_PASSWORD,
    "database": process.env.DB_NAME,
    "host": process.env.DB_HOST,
    "port": process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
    "dialect": "postgres",
    "logging": process.env.DB_LOGGING === 'true' ? console.log : false,
    "schema": process.env.DB_SCHEMA,
}

const production: Options = {
    "username": process.env.DB_USER,
    "password": process.env.DB_PASSWORD,
    "database": process.env.DB_NAME,
    "host": process.env.DB_HOST,
    "port": process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
    "dialect": "postgres",
    "logging": process.env.DB_LOGGING === 'true',
    "schema": process.env.DB_SCHEMA,
}

export default {
    development, production
}