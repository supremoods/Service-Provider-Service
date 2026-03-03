import { hashSync, compareSync } from "bcryptjs";
import BaseModel from "../database/base-model";

const SALT_ROUNDS: number | string = process.env.AUTH_SALT_ROUNDS || 12;

export default class BaseAuthenticatorModel extends BaseModel {

    declare password_hash?: string;

    authenticate(password: string) {
        if (this.password_hash && password) return compareSync(password, this.password_hash)
        else return false
    }

    updatePassword(password?: string) {
        let newPassword = password ? password : this.password_hash
        if (newPassword) {
            const hash = hashSync(newPassword, SALT_ROUNDS)
            this.password_hash = hash
        }
        return this.password_hash
    }

}
