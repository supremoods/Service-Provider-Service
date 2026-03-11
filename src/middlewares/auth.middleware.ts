import type { NextFunction, Request, Response } from "express";
import { decode, verify } from "../shared/token-generator";
import Logger from "../shared/logger";

export function authMiddleware(grantPublicAccess: boolean = false) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const bearerToken = req.headers.authorization;

            if (bearerToken && bearerToken !== "null") {
                const token = bearerToken.split(" ")[1] ?? "";
                const payload = decode(token);
                const clientSecret = payload.clientSecret;
                const decoded = verify(token, clientSecret);

                req.user = decoded;
            } else if (!grantPublicAccess) {
                return res.status(401).send({
                    success: false,
                    error: 1004,
                    errorMessage: "Unauthorized. No access token found on the request."
                });
            }

            next();
            return;
        } catch (error) {
            Logger.error(error as Error);
            res.status(401).send({
                success: false,
                error: 1005,
                errorMessage: (error as Error).message
            });
            return;
        }
    };
}
