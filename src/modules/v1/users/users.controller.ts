import Users from "./users.model";
import BaseController from "@/core/http/base-controller";

export default class UsersController extends BaseController<Users> {

   constructor() {
      super(Users)
   }

 
}
