import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import RouterFactory from './router-factory';
import Logger from '../shared/logger';
import DatabaseConnector from './database/database-connector';
import { requestLoggerMiddleware } from '../middlewares/request-logger.middleware';

interface AppConfig {
    port: number;
    routeDir?: string;
    routeContext?: string;
    syncModels?: Array<string> | boolean;
}

export default class AppServer {
    private app: Application;
    private config: AppConfig;

    constructor(config: AppConfig) {
        this.app = express();
        this.config = config;
    }

    public async bootstrap(): Promise<void> {
        // Middlewares
        this.app.use(cors());
        this.app.use(helmet());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(requestLoggerMiddleware);

        const db = new DatabaseConnector(process.cwd())
        await DatabaseConnector.init()
        await db.initializeModels()


        // Root route: log server time
        this.app.get('/', (_, res) => {
            const serverTime = new Date().toISOString();
            Logger.info(`Root endpoint accessed at ${serverTime}`);
            res.json({ message: 'Server is running', serverTime });
        });

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

        // Start server
        this.app.listen(this.config.port, () => {
            Logger.info(`API Server ready at http://127.0.0.1:${this.config.port}`);
        });
    }
}
