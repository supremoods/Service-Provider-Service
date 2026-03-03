
export enum FindTypeEnum {
    FIND_ALL = 'findAndCountAll',
    FIND_PK = 'findByPk',
    FIND_ONE = 'findOne',
    COUNT = 'count'
}


export type IncludesType = {

    path?: string,
    association?: AssociationType
}   


export type AssociationType = {
    include: Array<string> | Array<object>,
    association?: string
    where?:object
}


export type QueryType = {
    where?:object,
    limit?:number,
    offset?:number,
    select?:object,
    order?:object,
    attributes?:object,
    returning?:boolean,
    raw?:boolean,
    nest?: boolean,
    distinct?: string,
    include?:object
}

export type RequestUserType = {
    id?: number,
    email?: string,
    clientSecret?:string
}

export type ModelOptions = {
    tableName: string, 
    schema?: string, 
    paranoid?: boolean, 
    defaultAttributes?: boolean, 
    comment?:string
}