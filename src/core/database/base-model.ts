
import { DataTypes, Model } from 'sequelize';
// import Users from '../models/Users'
import type { ModelAttributes } from "sequelize";
import type { ModelOptions } from '../types/base-model.types';
import type IBaseModel from '../types/base-model.interface';
import DatabaseConnector from '../../app/database/database-connector';

export default class BaseModel extends Model implements IBaseModel{
    declare id?: string;

    /**
     * Sets common model attributes
     * @returns
     */
    static getCommonAttributes(defaultAttributes:boolean){
        return defaultAttributes?{
            id: {
                type: DataTypes.UUID,
                allowNull: false,
                comment: "primary key",
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            created_by_id: {
                type: DataTypes.UUID,
                comment: 'References the user who initially created the record; used for audit and traceability.'
            },

            updated_by_id: {
                type: DataTypes.UUID,
                comment: 'References the user who last updated the record; used for audit and traceability.'
            },

            is_active: {
                type: new DataTypes.BOOLEAN,
                comment: 'Indicates whether the record is currently active and relevant; inactive records are archived but retained for reference.',
                allowNull: false,
                defaultValue: true
            }
        }:null
    }


    static getCommonAssociations(){}


/**
 * Initialize the Sequelize model
 * @param {ModelAttributes} fields Table columns
 * @param {string | ModelOptions} tableOption Table name or options
 */
static initialize(fields: ModelAttributes, tableOption: string | ModelOptions) {
    // Default init options
    const defaultOptions = {
        sequelize: DatabaseConnector.getConnection(),
        schema: process.env.DB_SCHEMA,
        paranoid: true,
        timestamps: true,
        comment: '',
    }

    const options: ModelOptions = typeof tableOption === 'string' ? { tableName: tableOption }: tableOption

    const enableDefaultFields = options.defaultAttributes !== false

    const initOptions = {
        ...defaultOptions,
        tableName: options.tableName,
        schema: options.schema || defaultOptions.schema,
        paranoid: enableDefaultFields ? true : false,
        timestamps: enableDefaultFields ? true : false,
        comment: options.comment || options.tableName,
    }

    this.init(
        {
            ...this.getCommonAttributes(enableDefaultFields),
            ...fields
        },
        initOptions
    )
}

}
