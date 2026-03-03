import { 
    BaseError, 
    DatabaseError, 
    ValidationError, 
    UniqueConstraintError, 
    ValidationErrorItem, 
    ValidationErrorItemType, 
    Op, 
    Sequelize 
} from "sequelize";
import type {
    RequestQuery,
    QueryOptions,
    ApiResponse,
    CommonType
} from "../types/base-controller.types";
import ErrorHandler from "../../shared/error-handler";
import Logger from "../../shared/logger";

/**
 * Constructs a Sequelize query object based on the provided request query.
 * This function dynamically builds the `where` clause, allows for sorting,
 * pagination, field selection, and includes related models.
 *
 * @param {RequestQuery} query - The incoming request query parameters.
 * @returns {QueryOptions} - Returns a Sequelize query options object to be used for querying the database.
 */
export function constructQuery(query: RequestQuery): QueryOptions {
    let options: QueryOptions = {}

    // Build the 'where' clause if search conditions are provided.
    if (query.search) {
        let where: CommonType = {};
        const pairs = query.search.split(',');
        
        // Handle logical OR, AND, NOT conditions and NOT NULL checks
        pairs.forEach((field) => {
            if(field.indexOf('$')>-1){
                //do nothing to be injected in the include options

            }else if (field.indexOf("|") > -1) {
                // Handle "OR" condition
                if (!where.hasOwnProperty(Op.or)) where[Op.or] = [];
                let orFields = field.split("|");
                orFields.forEach((orField) => {
                    let _field = getQueryField(orField);
                    if (_field) where[Op.or].push(_field);
                });
            } else if (field.indexOf("&") > -1) {
                // Handle "AND" condition
                if (!where.hasOwnProperty(Op.and)) where[Op.and] = [];
                let andFields = field.split("&");
                andFields.forEach((andField) => {
                    let _field = getQueryField(andField);
                    if (_field) where[Op.and].push(_field);
                });
            } else if (field.indexOf("!") > -1) {
                // Handle "NOT" condition
                let notField = field.replace("!", "");
                let _field = getQueryField(notField);
                if (_field) {
                    where[Op.not] = { ...where[Op.not], ..._field };
                }
            } else if (field.indexOf("?") > -1) {
                // Handle NOT NULL condition
                let notNullField = field.replace("?", "");
                where[notNullField] = { [Op.ne]: null };  // Add condition to check NOT NULL
            } else {
                // Handle standard fields
                let _field = getQueryField(field);
                where = { ...where, ..._field };
            }
        });
        
        // Handle date range filters if provided
        if (query.date_range) {
            let date_ranges = query.date_range.split(",");
            date_ranges.forEach((date_range) => {
                let pair = date_range.split(":");
                let date_query: CommonType = {};
                if (pair[1]) date_query[Op.gte] = new Date(pair[1] + "T00:00:00.000+08:00");
                if (pair[2]) date_query[Op.lt] = new Date(pair[2] + "T23:59:59.000+08:00");
                where[pair[0] ?? ''] = date_query;
            });
        }
        
        // For full-text search if `scan` parameter is provided
        if (query.scan) {
            where['_search'] = { [Op.match]: Sequelize.fn('phraseto_tsquery', query.scan) }
        }
        
        options.where = where;
        
    }

    // If search is not present but full-text search (`scan`) is, apply it.
    if (!query.search && query.scan) {
        let where: CommonType = {};
        where['_search'] = { [Op.match]: Sequelize.fn('phraseto_tsquery', query.scan) }
        options.where = where;
    }

    // Handle pagination with limit and offset.
    if (query.paginate != "false") {
        options.limit = query.limit ? query.limit : 5;
        options.offset = query.page ? (query.page - 1) * options.limit : 0;
    }

    // Handle field selection if `fields` parameter is present.
    if (query.fields) {
        const fields = query.fields.split(',');
        options.attributes = fields;
    }

    // Handle field exclusion if `exclude` parameter is present.
    if (query.exclude) {
        const excludeFields = query.exclude.split(',');
        options.attributes = { exclude: excludeFields };
    }

    // Handle sorting of results by fields if `sort` is provided.
    if (query.sort) {
        let sortOptions: any = [];
        const fields = query.sort.split(',');
        fields.forEach(field => {
            let orders = field.split(':');
            sortOptions.push(orders);
        });
        options.order = sortOptions;
    }

    // Handle model inclusion (eager loading) with nested relationships.
    if (query.includes) {
        let data = query.includes.split(',');
        let includes: Array<any> = []

        let toplevel: Array<any> = data.filter(el => el.indexOf('.') == -1);
        toplevel.forEach(top=>{
            let association:{association:string, attributes?:string[], through?:any, required:boolean} = {association: top, required:false}

            // Handle attribute selection for the included model
            const fieldsKey = `${top}.fields` as keyof RequestQuery;
            if (query[fieldsKey]) {
                association.attributes = (query[fieldsKey] as string).split(',');
            }

            // Handle attribute selection for the through table (junction table)
            const throughFieldsKey = `${top}.through.fields` as keyof RequestQuery;
            if (query[throughFieldsKey] !== undefined) {
                const throughFields = query[throughFieldsKey] as string;
                // Empty string means hide the through table completely
                association.through = { attributes: throughFields ? throughFields.split(',') : [] };
            }

            // inject where clause for associated model
            if(query.search){
                const queries = query.search.split(',');
                let injectable = queries.find(q=>q.indexOf('$')>-1 && q.indexOf(top)>-1)
                if(injectable){
                    injectable = injectable.replaceAll('$','')
                    let nested = injectable.split('.')
                    let pair = (nested[1]??'').split(':')
                    let associationkey = pair[0] as keyof typeof association
                    association.through = association.through || {where:{}}
                    if(!association.through.where) association.through.where = {}
                    let value = pair[1] ?? ''
                    
                    //dirty workaround for array element splitting issue
                    if((pair[1]??'').indexOf('[')>-1
                         && (pair[1]??'').indexOf(']')>-1 
                            && (pair[1]??'').indexOf(';')>-1){
                        value = JSON.parse(value.replaceAll(';',','))
                    }else {
                        value = JSON.parse(pair[1] ?? '')
                    }

                    association.through.where[associationkey] = value
                    association.required = true
                    Logger.info(`association.where: ${JSON.stringify(association)}`)
                }
            }
            includes.push(association)
        })
        
        let nested = data.filter(el => el.indexOf('.') > -1);
        // Handle nested includes using a dot notation (e.g., `user.profile`).
        nested.forEach(nest => {
            let keypair = nest.split('.');
            let records: Array<any> = [];
            for (let i = keypair.length - 1; i >= 0; i--) {
                records.push({ include: [{ association: keypair[i]?.trim() }] });
            }
            let temp;
            for (let i = 0; i < records.length - 1; i++) {
                records[i + 1].include[0].include = records[i].include[0];
                temp = records[i + 1].include[0];
            }
            includes.push(temp);
        });
        options.includes = includes;
    }

    // Soft delete flag (paranoid) control
    if(query.paranoid){
        options.paranoid = query.paranoid !== "false"; // Default is true unless explicitly set to false.
    }

    return options;
}

/**
 * Extracts query field and its corresponding value based on the provided string.
 * This function handles various data types like dates, booleans, and wildcards.
 *
 * @param {string} field - Field name along with its value and type (e.g., `createdAt:2021-10-10:Date`).
 * @returns {CommonType | null} - A key-value pair to be used in the Sequelize query or `null` if invalid.
 */
function getQueryField(field: string) {
    let pair = field.split(":");
    let dataType = pair[2];
    let fieldKey = null,
        fieldValue = null;

    // Handle different data types for filtering
    switch (dataType) {
        case "Date": // Date filtering
            fieldKey = pair[0];
            fieldValue = {
                [Op.gte]: pair[1] + "T00:00:00.000+08:00",
                [Op.lt]: pair[1] + "T23:59:59.000+08:00",
            };
            break;

        case "Boolean": // Boolean filtering
            fieldKey = pair[0];
            fieldValue = pair[1] == "true";
            break;

        default: // Wildcard, integer, or string
            if (!pair[1]) return null;
            if (pair[1].startsWith(".*") && pair[1].endsWith(".*")) {
                fieldKey = pair[0];
                fieldValue = {
                    [Op.iLike]: pair[1].replace(/\.\*/g, '%')
                };
            } else if (!isNaN(+pair[1])) {
                fieldKey = pair[0];
                fieldValue = parseInt(pair[1]);
            } else {
                fieldKey = pair[0];
                fieldValue = pair[1];
            }
    }
    return { [fieldKey ?? '']: fieldValue == "null" ? null : fieldValue };
}

/**
 * A helper function to structure a successful response.
 *
 * @param {any} response - Data to include in the response.
 * @returns {ApiResponse} - An object with success status and response data.
 */
export function createSuccessResponse(response?: any): ApiResponse {
    let res: ApiResponse = {
        success: true,
        response: response
    }
    return res;
}

/**
 * Handles errors and constructs an error response based on the type of error (Sequelize, database, or validation).
 *
 * @param {UniqueConstraintError | BaseError | Error | any} error - The error encountered during execution.
 * @returns {ApiResponse} - Returns a structured error response with error codes and messages.
 */
export function createErrorResponse(
    error: UniqueConstraintError
        | BaseError
        | Error
        | any): ApiResponse {
    let res: ApiResponse = { success: false }

    // Handle validation errors
    if (error instanceof ValidationError) {
        res.error = 1001;
        res.statusCode = 422;
        res.errorMessage = error.message;
        res.errorDescription = error.errors[0]?.message;
        res.errors = constructErrors(error.errors);
    } else if (error instanceof DatabaseError) {
        // Handle database errors
        res.error = 1002;
        res.statusCode = 500;
        res.errorMessage = error.message;
    } else if (error instanceof ErrorHandler) {
        // Handle custom errors
        res.error = 1003;
        res.statusCode = error.statusCode;
        res.errorMessage = error.message;
    } else if (error instanceof Error) {
        // Handle generic errors
        res.error = 1003;
        res.statusCode = 500;
        res.errorMessage = error.message;
    }

    return res;
}

/**
 * Constructs an array of error messages from Sequelize's `ValidationErrorItem`.
 *
 * @param {ValidationErrorItem[]} errors - An array of Sequelize validation error items.
 * @returns {string[]} - An array of error messages.
 */
function constructErrors(errors: ValidationErrorItem[]): string[] {
    var _errors: string[] = [];
    const error_types = Object.keys(ValidationErrorItemType);

    errors.forEach((error) => {
        switch (error.type?.toLowerCase()) {
            case error_types[0]: // NotNull violation
                _errors.push(`${error.path} is required.`);
                break;

            case error_types[2]: // Unique constraint violation
                _errors.push(`${error.path} must be unique.`);
                break;

            case error_types[1]: // String violation
            case error_types[3]: // Validation error
            default:
                _errors.push(error.message);
                break;
        }
    });
    return _errors;
}

export type { ApiResponse };
