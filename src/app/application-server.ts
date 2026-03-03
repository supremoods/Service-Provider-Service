import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import RouterFactory from './router-factory';
import Logger from '../shared/logger';
import DatabaseConnector from './database/database-connector';
import { requestLoggerMiddleware } from '../middlewares/request-logger.middleware';
import type { Server } from "node:http";

interface AppConfig {
    port: number;
    routeDir?: string;
    routeContext?: string;
    syncModels?: Array<string> | boolean;
}

interface BootstrapOptions {
    listen?: boolean;
    requireDatabase?: boolean;
}

export default class AppServer {
    private app: Application;
    private config: AppConfig;

    constructor(config: AppConfig) {
        this.app = express();
        this.config = config;
    }

    public async bootstrap(options: BootstrapOptions = {}): Promise<Application> {
        const { listen = true, requireDatabase = false } = options;
        let listener: Server | undefined;

        let dbReady = false;
        let dbError: string | null = null;

        // Middlewares
        this.app.use(cors());
        this.app.use(helmet());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(requestLoggerMiddleware);

        // Root route: log server time
        this.app.get('/', (_, res) => {
            const serverTime = new Date().toISOString();
            Logger.info(`Root endpoint accessed at ${serverTime}`);
            res.json({ message: 'Server is running', serverTime, dbReady, dbError });
        });

        // Health check (503 until DB is ready)
        this.app.get('/health', (_, res) => {
            const status = dbReady ? 200 : 503;
            res.status(status).json({ ok: dbReady, dbReady, dbError });
        });

        // If DB is not ready, block all other routes with 503 (except / and /health).
        this.app.use((req, res, next) => {
            if (!dbReady && req.path !== "/" && req.path !== "/health") {
                res.status(503).json({ message: "Service is starting", dbReady, dbError });
                return;
            }

            next();
        });

        // Start server early in non-production if DB is optional
        if (listen && !requireDatabase) {
            listener = this.app.listen(this.config.port, () => {
                Logger.info(`API Server listening (DB optional) at http://127.0.0.1:${this.config.port}`);
            });
        }

        // Initialize DB + routes
        try {
            const db = new DatabaseConnector(process.cwd());
            await DatabaseConnector.init();
            await db.initializeModels();
            dbReady = true;

            // Load app routes
            await RouterFactory.init(this.app, process.cwd(), this.config.routeDir, this.config.routeContext);

            // Sync models if requested
            if (this.config.syncModels) {
                if (Array.isArray(this.config.syncModels)) {
                    for (const model of this.config.syncModels) await DatabaseConnector.sync(model, true);
                } else {
                    await DatabaseConnector.syncAll(true);
                }
            }
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            dbError = err.message;

            if (requireDatabase) {
                throw err;
            }

            Logger.error(err);
        }

        // Start server
        if (listen && !listener) {
            listener = this.app.listen(this.config.port, () => {
                Logger.info(`API Server ready at http://127.0.0.1:${this.config.port}`);
            });
        }

        return this.app;
    }
}
