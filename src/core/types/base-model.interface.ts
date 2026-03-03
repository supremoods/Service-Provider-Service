
export default interface IBaseModel {
     id?: string;

     created_by_id?: string;
     updated_by_id?: string;

     createdAt?:Date;
     updatedAt?: Date;

     _search?: string;

}