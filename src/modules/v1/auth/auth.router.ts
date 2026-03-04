import BaseRouter from "../../../core/http/base-router";
import AuthController from "./auth.controller";
import type { Mappings } from "../../../core/types/base-router.types";

export default class AuthRouter extends BaseRouter<AuthController> {
    constructor(){
        super(new AuthController())
        this.grantPublicAccess = true;
    }

    override getMapping = (): Mappings[] => {
        return [
            { method: "POST", path: '/login', function: (req, res, next) => this.controller.login(req, res) },
            { method: "POST", path: '/refresh', function: (req, res, next) => this.controller.refresh(req, res) },
            { method: "POST", path: '/register', function: this.post },
        ];
    };
}
