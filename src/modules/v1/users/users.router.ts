import BaseRouter from "@/core/http/base-router";
import UsersController from "./users.controller";

export default class UsersRouter extends BaseRouter<UsersController> {
    constructor(){
        super(new UsersController())
    }

     
}
