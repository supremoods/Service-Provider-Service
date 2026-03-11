import type { Request, Response, NextFunction } from "express";
import BaseController from "../../../core/http/base-controller";
import Users from "../users/users.model";
import { generate } from "../../../shared/token-generator";
import { createErrorResponse, createSuccessResponse } from "../../../core/http/base-controller.helper";
import Logger from "../../../shared/logger";
import RefreshToken from "./refresh-token.model";
import crypto from "crypto";

const REFRESH_TOKEN_TTL_DAYS = (() => {
   const parsed = Number.parseInt(process.env.REFRESH_TOKEN_TTL_DAYS ?? "", 10);
   return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
})();

const REFRESH_TOKEN_SECRET = process.env.JWT_SECRET_KEY ?? "";

function newRefreshTokenValue() {
   return crypto.randomBytes(64).toString("hex");
}

function hashRefreshToken(token: string) {
   return crypto
      .createHmac("sha256", REFRESH_TOKEN_SECRET)
      .update(token)
      .digest("hex");
}

export default class AuthController extends BaseController<Users> {
   
   constructor() {
      super(Users)
   }
 
   async login(req: Request, res: Response) : Promise<void> {
      try {
         const { username, password } = req.body

         if(!username) throw new Error("Username is required")
         if(!password) throw new Error("Password is required")
         
         const user = await Users.findOne({where:{username}, attributes: ['id','username','email','account_type','status','password_hash']})

         if(!user) throw new Error('User not found')

         if(!user.authenticate(password)) throw new Error("Invalid Credentials")

         if(user.status === "pending") throw new Error("Account is still pending approval")
         if(user.status === "rejected") throw new Error("Your account has been rejected")

         const { password_hash, ...authenticatedUser } = user.toJSON() as Users
         
         const token = generate(authenticatedUser)
         const refreshToken = newRefreshTokenValue()
         const dateNow = Date.now() 
         await RefreshToken.create({
            user_id: user.id,
            token_hash: hashRefreshToken(refreshToken),
            expires_at: new Date(dateNow + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
            created_by_ip: req.ip,
            user_agent: req.get("user-agent")
         })

         await user.update({
            last_login: dateNow
         })
         
         res.status(200).json(createSuccessResponse({
            token,
            refreshToken,
            data: {
               ...authenticatedUser
            }
         }))

      } catch (error) {
         Logger.error(error as Error)
         res.status(422).json(createErrorResponse(error))
      }

   }

   async refresh(req: Request, res: Response): Promise<void> {
      try {
         const { refreshToken } = req.body
         if(!refreshToken) throw new Error("Refresh token is required")

         const tokenHash = hashRefreshToken(refreshToken)
         const stored = await RefreshToken.findOne({ where: { token_hash: tokenHash } })
         if(!stored) throw new Error("Invalid refresh token")

         const now = new Date()
         if(stored.revoked_at) {
            // Possible token reuse: revoke all active tokens for this user.
            await RefreshToken.update(
               { revoked_at: now, revoked_by_ip: req.ip },
               { where: { user_id: stored.user_id, revoked_at: null } }
            )
            throw new Error("Invalid refresh token")
         }

         if(stored.expires_at.getTime() <= now.getTime()) {
            throw new Error("Refresh token expired")
         }

         const user = await Users.findByPk(stored.user_id, { attributes: ['id','username','email'] })
         if(!user) throw new Error("User not found")

         const newToken = generate(user.toJSON())
         const rotatedRefreshToken = newRefreshTokenValue()

         const rotatedRecord = await RefreshToken.create({
            user_id: stored.user_id,
            token_hash: hashRefreshToken(rotatedRefreshToken),
            expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
            created_by_ip: req.ip,
            user_agent: req.get("user-agent")
         })

         stored.revoked_at = now
         stored.revoked_by_ip = req.ip
         stored.replaced_by_token_id = rotatedRecord.id
         await stored.save()

         res.status(200).json(createSuccessResponse({
            token: newToken,
            refreshToken: rotatedRefreshToken,
            data: {
               ...user.toJSON()
            }
         }))
      } catch (error) {
         Logger.error(error as Error)
         res.status(422).json(createErrorResponse(error))
      }
   }

}
