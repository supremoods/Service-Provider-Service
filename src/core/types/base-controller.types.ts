import type { Order, WhereOptions } from "sequelize";

export type RequestQuery = {
    search?:string;
    limit?:number;
    page?:number;
    includes?:string;
    fields?:string;
    exclude?:string;
    paranoid?:string;
    sort?:string;
    paginate?: string;
    date_range?: string;
    others?: any;
    scan?:string;
    groupBy?:string
}

export type QueryOptions = {
    where?:WhereOptions<any>;
    limit?:number;
    offset?:number;
    attributes?: Array<string> | { exclude: string[], include?: any[] };
    order?:Order;
    paranoid?:boolean;
    includes?:Array<string | IncludeType>;
    subQuery?: boolean;
    distinct?: boolean;
}


export type ApiResponse = {
    success: boolean;
    error?: number;
    statusCode?: number;
    errorMessage?: string,
    errorDescription?:string
    response?: object,
    version?: string,
    errors?: string[]
}

export type IncludeType = {
    association?: string;
    include?: Array<IncludeType>
}

export type CommonType = { [x: string | symbol]: any }
