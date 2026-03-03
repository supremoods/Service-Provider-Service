import type { Application } from "express";
import AppServer from "../src/app/application-server";

let appPromise: Promise<Application> | undefined;

const getApp = async (): Promise<Application> => {
    if (!appPromise) {
        const envPort = Number.parseInt(process.env.PORT ?? "", 10);
        const port = Number.isFinite(envPort) ? envPort : 5001;

        const server = new AppServer({
            port,
            routeDir: "src/modules",
            routeContext: "sps",
        });

        appPromise = server.bootstrap({ listen: false });
    }

    return appPromise;
};

export default async function handler(req: any, res: any) {
    try {
        const app = await getApp();
        return app(req, res);
    } catch (error) {
        appPromise = undefined;
        throw error;
    }
}

