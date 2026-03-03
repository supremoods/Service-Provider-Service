import type { NextFunction, Request, Response } from "express";
import Logger from "../shared/logger";

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();

    res.on("finish", () => {
        const duration = Date.now() - start;
        Logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} in ${duration}ms`);
    });

    next();
}
