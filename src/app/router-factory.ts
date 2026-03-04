import fs from "fs";
import path from "path";

import type { Application } from 'express';
import Logger from "../shared/logger";
import { authMiddleware } from "../middlewares/auth.middleware";
import { csrfMiddleware } from "../middlewares/csrf.middleware";

const UNSECURED_SEGMENTS = new Set(['dev', 'public', 'public-v2.0'])

export default class RouterFactory {
    private static collectRouterFiles(rootDir: string): string[] {
        if (!fs.existsSync(rootDir)) {
            return [];
        }

        const files: string[] = [];
        const walk = (currentDir: string) => {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });

            for (const entry of entries) {
                if (entry.name.startsWith('.')) continue;

                const fullPath = path.join(currentDir, entry.name);

                if (entry.isDirectory()) {
                    walk(fullPath);
                    continue;
                }

                const lower = entry.name.toLowerCase();
                if (lower.endsWith('.router.ts') || lower.endsWith('.router.js')) {
                    files.push(fullPath);
                }
            }
        };

        walk(rootDir);
        return files;
    }

    private static getEndpoint(routerRoot: string, routeFile: string, context: string): string {
        const relativePath = path.relative(routerRoot, routeFile).split(path.sep).join('/');
        const stripped = relativePath
            .replace(/\.(ts|js)$/i, '')
            .replace(/\.router$/i, '')
            .replace(/\/index$/i, '');

        const segments = stripped.split('/').filter(Boolean);
        const lastIndex = segments.length - 1;
        if (lastIndex > 0 && segments[lastIndex] === segments[lastIndex - 1]) {
            segments.pop();
        }

        const normalizedPath = segments.join('/');
        const prefix = context ? `${context}/${normalizedPath}` : normalizedPath;
        return `/${prefix}`.replace(/\/+/g, '/');
    }

    /**
     * 
     * @param app express application instance
     * @param pathName root path of the application
     * @param folderName path of the routers (default: src/modules)
     */
    static async init(app: Application, pathName: string, folderName: string = 'src/modules', context: string = 'api') {
        try {
            Logger.info("Create API Routes...\n")

            const routerRoot = path.isAbsolute(folderName)
                ? folderName
                : path.resolve(pathName, folderName);

            const routerFiles = RouterFactory.collectRouterFiles(routerRoot);

            for (const routeFile of routerFiles) {
                const endpoint = RouterFactory.getEndpoint(routerRoot, routeFile, context);
                const pathSegments = endpoint.split('/').filter(Boolean);
                const isUnsecure = pathSegments.some((segment) => UNSECURED_SEGMENTS.has(segment));

                const routerModule = await import(routeFile);
                const RouterClass = routerModule.default;
                if (!RouterClass) {
                    Logger.warn(`Skipping router file without default export: ${routeFile}`);
                    continue;
                }

                const router = new RouterClass();
                app.use(
                    endpoint,
                    csrfMiddleware(),
                    authMiddleware(isUnsecure || router.grantPublicAccess),
                    router.getRoutes()
                );

                Logger.info('Initializing endpoint:', endpoint);
            }
        } catch (error) {
            Logger.error(error as Error)
            throw error;
        }
    }
}
