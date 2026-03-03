import type { Request } from 'express';
import jwt, { type JwtPayload, type Secret, type SignOptions } from 'jsonwebtoken';
import type { RequestUserType } from '../core/types/base-model.types';

const SECRET_KEY: Secret = process.env.JWT_SECRET_KEY ?? ''
const EXPIRY = (process.env.JWT_EXPIRY) as SignOptions['expiresIn']

const ISSUER: string = process.env.JWT_ISSUER ?? ''

export function generate(payload: object): string {
    return jwt.sign(payload, SECRET_KEY, {expiresIn: EXPIRY,issuer: ISSUER});
}

export function verify(token:string, secret?:string): RequestUserType {
    let decoded:JwtPayload | string = jwt.verify(token, secret || SECRET_KEY)
    return decoded as RequestUserType
}

export function decode(val: string | Request):RequestUserType{
    let token:string = ''
    if (typeof val !== 'string' ){
        token = val.headers["access-token"] as string
    }else{
        token = val
    }
    let decoded = jwt.decode(token)
    
    return decoded as RequestUserType
}
