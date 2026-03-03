import { Model, type ModelStatic, Sequelize, type Options } from "sequelize";
import fs from "fs";
import path from "path";
import Logger from "../../shared/logger";

const env: string = process.env.NODE_ENV || "development";

export default class DatabaseConnector {
    private static connection: Sequelize;
    private static rootDir: string;

    constructor(path: string) {
        DatabaseConnector.rootDir = path;
    }

    /**
     * Initializes the database connection
     */
    static async init(): Promise<Sequelize> {
        try {
            Logger.info("Initializing DB Connection...\n");

            const configPath = DatabaseConnector.getConfigPath();
            const configs = await import(configPath);

            const config: Options =
                configs.default[env as keyof typeof configs.default];

            const connection = new Sequelize(config);

            await connection.authenticate();

            Logger.info( `Connection established successfully: ${connection.config.database}`);

            DatabaseConnector.connection = connection;

            return connection;
        } catch (error) {
            Logger.error(new Error("Connecting to database: ERROR!"));
            Logger.error(error as Error);
            throw error;
        }
    }

    private static getConfigPath(): string {
        const candidates = [
            path.join(DatabaseConnector.rootDir, "src/config/db.config.ts"),
            path.join(DatabaseConnector.rootDir, "db.config.ts"),
        ];

        const resolvedPath = candidates.find((candidate) => fs.existsSync(candidate));
        if (!resolvedPath) {
            throw new Error("Cannot find database config. Checked src/config/db.config.ts and db.config.ts");
        }

        return resolvedPath;
    }

    private static collectFiles(rootDir: string, matcher: (fileName: string) => boolean): string[] {
        if (!fs.existsSync(rootDir)) {
            return [];
        }

        const files: string[] = [];
        const walk = (currentDir: string) => {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name.startsWith(".")) continue;

                const fullPath = path.join(currentDir, entry.name);
                if (entry.isDirectory()) {
                    walk(fullPath);
                    continue;
                }

                if (matcher(entry.name.toLowerCase())) {
                    files.push(fullPath);
                }
            }
        };

        walk(rootDir);
        return files;
    }

    /**
     * Initialize all models
     */
    async initializeModels() {
        try {
            const moduleModelFiles = DatabaseConnector.collectFiles(
                path.join(DatabaseConnector.rootDir, "src/modules"),
                (fileName) => fileName.endsWith(".model.ts") || fileName.endsWith(".model.js")
            );

            const legacyModelFiles = DatabaseConnector.collectFiles(
                path.join(DatabaseConnector.rootDir, "models"),
                (fileName) => fileName.endsWith(".ts") || fileName.endsWith(".js")
            );

            const files = moduleModelFiles.length > 0 ? moduleModelFiles : legacyModelFiles;

            for (const file of files) {
                const model = await import(file);
                if (model?.default?.associate) model.default.associate() 
            }
        } catch (error) {
            Logger.error(error as Error);
        }
    }

    static getConnection(): Sequelize {
        return DatabaseConnector.connection;
    }

    static getModel(modelName: string): ModelStatic<Model> | undefined {
        return DatabaseConnector.connection.models[modelName];
    }

    static async sync(modelName: string, force = false, alter = false) {
        try {
            Logger.info("Syncing Database table:", modelName);
            await DatabaseConnector.connection.models[modelName]?.sync({force});
        } catch (error) {
            Logger.error(error as Error);
        }
    }

    static async syncAll(force = false, alter = false) {
        try {
            await DatabaseConnector.connection.sync({ force, alter });
        } catch (error) {
            Logger.error(error as Error);
        }
    }

    static async disconnect() {
        await DatabaseConnector.connection.close();
        Logger.info("Database connection closed.");
    }
}
