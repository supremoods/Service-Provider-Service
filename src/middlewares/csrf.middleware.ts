import type { NextFunction, Request, Response } from "express";
import Logger from "../shared/logger";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);

const CSRF_HEADER_NAME = (process.env.CSRF_HEADER_NAME ?? "x-csrf-token").toLowerCase();
const CSRF_COOKIE_NAME =
    process.env.CSRF_TOKEN_COOKIE_NAME ??
    process.env.NEXT_PUBLIC_CSRF_TOKEN_COOKIE_NAME ??
    "csrf_token";

const TRUSTED_ORIGINS = new Set(
    (process.env.CSRF_TRUSTED_ORIGINS ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
);

function getFirstHeaderValue(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) {
        return value[0];
    }

    return value;
}

function readCookieValue(req: Request, cookieName: string): string | undefined {
    const rawCookieHeader = getFirstHeaderValue(req.headers.cookie);
    if (!rawCookieHeader) {
        return undefined;
    }

    const pairs = rawCookieHeader.split(";");
    for (const pair of pairs) {
        const trimmed = pair.trim();
        if (!trimmed.startsWith(`${cookieName}=`)) {
            continue;
        }

        const value = trimmed.slice(cookieName.length + 1);
        try {
            return decodeURIComponent(value);
        } catch {
            return value;
        }
    }

    return undefined;
}

function parseOriginFromReferer(referer: string | undefined): string | undefined {
    if (!referer) {
        return undefined;
    }

    try {
        return new URL(referer).origin;
    } catch {
        return undefined;
    }
}

function resolveRequestOrigin(req: Request): string | undefined {
    const origin = req.get("origin");
    if (origin) {
        return origin;
    }

    return parseOriginFromReferer(req.get("referer"));
}

function hasValidTokenShape(token: string): boolean {
    // Accept URL/header-safe token characters with practical size bounds.
    return /^[A-Za-z0-9._-]{16,256}$/.test(token);
}

export function csrfMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const method = req.method.toUpperCase();
            if (SAFE_METHODS.has(method)) {
                next();
                return;
            }

            const csrfHeaderRaw = getFirstHeaderValue(req.headers[CSRF_HEADER_NAME]);
            const csrfHeaderToken = csrfHeaderRaw?.trim();
            if (!csrfHeaderToken) {
                res.status(403).send({
                    success: false,
                    error: 1006,
                    errorMessage: "Forbidden. Missing CSRF token."
                });
                return;
            }

            if (!hasValidTokenShape(csrfHeaderToken)) {
                res.status(403).send({
                    success: false,
                    error: 1007,
                    errorMessage: "Forbidden. Invalid CSRF token format."
                });
                return;
            }

            const csrfCookieToken = readCookieValue(req, CSRF_COOKIE_NAME);
            if (csrfCookieToken && csrfCookieToken !== csrfHeaderToken) {
                res.status(403).send({
                    success: false,
                    error: 1008,
                    errorMessage: "Forbidden. CSRF token mismatch."
                });
                return;
            }

            const requestOrigin = resolveRequestOrigin(req);
            if (
                requestOrigin &&
                TRUSTED_ORIGINS.size > 0 &&
                !TRUSTED_ORIGINS.has(requestOrigin)
            ) {
                res.status(403).send({
                    success: false,
                    error: 1009,
                    errorMessage: "Forbidden. Untrusted request origin."
                });
                return;
            }

            next();
            return;
        } catch (error) {
            Logger.error(error as Error);
            res.status(403).send({
                success: false,
                error: 1010,
                errorMessage: "Forbidden. CSRF validation failed."
            });
            return;
        }
    };
}
