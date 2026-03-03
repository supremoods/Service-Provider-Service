
import type { NextFunction, Request, Response } from 'express';
import { Model, Op, Sequelize, type Attributes, type ModelStatic, type WhereOptions } from "sequelize";

import type { QueryOptions, RequestQuery, ApiResponse } from '../types/base-controller.types';
import { constructQuery, createErrorResponse, createSuccessResponse } from './base-controller.helper';
import DatabaseConnector from '../../app/database/database-connector';

import type { RequestUserType } from '../types/base-model.types';
import Logger from '../../shared/logger';

export default class BaseController<TModel extends Model> {
    protected _model: ModelStatic<TModel>;
    protected _modelName;

    constructor(model: ModelStatic<TModel>) {
        this._model = model;
        this._modelName = model.name;
    }

    private getRequestWhere(req: Request): WhereOptions<Attributes<TModel>> {
        return { ...req.params } as WhereOptions<Attributes<TModel>>;
    }

    async find(req: Request, res: Response, next?: NextFunction): Promise<ApiResponse> {
        try {
            let query: RequestQuery = req.query
            let options: QueryOptions = constructQuery(query)
            let response = null
            if (!response) {
                response = await this._model?.findAndCountAll({
                    where: options.where,
                    limit: options.limit,
                    offset: options.offset,
                    attributes: options.attributes,
                    order: options.order,
                    include: options.includes,
                    subQuery: options.subQuery,
                    distinct: options.distinct
                })
            }

            return createSuccessResponse(response)
        } catch (error) {
            Logger.error(error as Error)
            throw createErrorResponse(error)
        }
    }
   
    async findById(req: Request, res: Response, next?: NextFunction): Promise<ApiResponse> {
        try {
            let query: RequestQuery = req.query
            let options: QueryOptions = constructQuery(query)

            let response = await this._model?.findByPk(req.params.id, {
                attributes: options.attributes,
                include: options.includes
            })

            return createSuccessResponse(response)
        } catch (error) {
            Logger.error(error as Error)
            throw createErrorResponse(error)
        }
    }

    async create(req: Request, res: Response, next?: NextFunction): Promise<ApiResponse> {
        try {
            await this.beforeCreate(req)

            let data: any = req.body
            
            if(req.user){
                data.created_by_id = req.user.id
            }

            let response;

            if (Array.isArray(data)) {
                response = await this._model?.bulkCreate(data);
            } else {
                response = await this._model?.create(data);
            }


            await this.afterCreate(req, response)

          
            return createSuccessResponse(response)
        } catch (error) {
            Logger.error(error as Error)
            throw createErrorResponse(error)
        }
    }

    async update(req: Request, res: Response, next?: NextFunction): Promise<ApiResponse> {
        try {
            await this.beforeUpdate(req)

            let data: any = req.body
          
            data.updated_by_id = ((req.user || {}) as RequestUserType).id || null;
            
            let originalData: any = await this._model?.findByPk(data.id)
            const where = this.getRequestWhere(req)
            let response = await this._model?.update(data, { where, returning: true, individualHooks:true, hooks: true })

            let result = response && response[1]?response[1]:undefined

            await this.afterUpdate(req, result, originalData)
        
            return createSuccessResponse(response)
        } catch (error) {
            Logger.error(error as Error)
            throw createErrorResponse(error)
        }
    }

    async delete(req: Request, res: Response, next?: NextFunction): Promise<ApiResponse> {
        try {

            await this.beforeDelete(req)

            const where = this.getRequestWhere(req)
            let response = await this._model?.destroy({ where, individualHooks:true })

            await this.afterDelete(req, req.params)

            return createSuccessResponse(response)
        } catch (error) {
            Logger.error(error as Error)
            throw createErrorResponse(error)
        }
    }

    async archives(req: Request, res: Response, next?: NextFunction): Promise<ApiResponse> {
        try {
            let query: RequestQuery = req.query
            let options: QueryOptions = constructQuery(query)
           
            let deletedAt = { [Op.not]: null }
            if (options.where) {
                options.where = { ...options.where, deletedAt }
            } else {
                options.where = { deletedAt }
            }

            let response = null
            if (!response) {
                response = await this._model?.findAndCountAll({
                    where: options.where,
                    limit: options.limit,
                    offset: options.offset,
                    attributes: options.attributes,
                    order: options.order,
                    include: options.includes,
                    paranoid: false
                })
            }

            return createSuccessResponse(response)
        } catch (error) {
            Logger.error(error as Error)
            throw createErrorResponse(error)
        }
    }

    async restore(req: Request, res: Response, next?: NextFunction): Promise<ApiResponse> {
        try {
            const where = this.getRequestWhere(req)
            let response = await this._model?.restore({ where, individualHooks:true })
            return createSuccessResponse(response)
        } catch (error) {
            Logger.error(error as Error)
            throw createErrorResponse(error)
        }
    }

    async count(req: Request, res: Response, next?: NextFunction): Promise<{count:number}> {
        try {
            let query: RequestQuery = req.query
            let options: QueryOptions = constructQuery(query)

            const count = await this._model?.count({
                    where: options.where,
                    attributes: options.attributes,
                    include: options.includes
                })

            return {count: count?count:0}
        } catch (error) {
            Logger.error(error as Error)
            throw createErrorResponse(error)
        }
    }

    async stats(req: Request, res: Response, next?: NextFunction): Promise<any> {
        try {
            let query: RequestQuery = req.query
            let options: QueryOptions = constructQuery(query)

            let response = null
            if (!response && query.groupBy) {
                response = await this._model?.findAll({
                    where: options.where,
                    attributes: [
                        query.groupBy,
                        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
                      ],
                    group:query.groupBy
                })
            }

            return response
        } catch (error) {
            Logger.error(error as Error)
            throw createErrorResponse(error)
        }
    }




    /**
     * ###############################################################
     * ###################### LIFE CYCLE HOOKS #######################
     * ###############################################################
     */
    async beforeCreate(req: Request) { }

    async afterCreate(req: Request, rec: any) {}

    async beforeUpdate(req: Request) { }

    async afterUpdate(req: Request, rec: any, orig: any) {}

    async beforeDelete(req: Request) { }

    async afterDelete(req: Request, rec: any) {}

}
