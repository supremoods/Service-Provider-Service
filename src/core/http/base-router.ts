

const GET = 'get'
const POST = 'post'
const PUT = 'put'
const PATCH = 'patch'
const DELETE = 'delete'

type HttpMethodsType = 'get' | 'post' | 'put' | 'patch' | 'delete'


import express, { type IRoute } from 'express'
import { type Request, type Response, type NextFunction, Router } from 'express'
import BaseController from './base-controller';
import type { Model } from 'sequelize';
import type { Mappings } from '../types/base-router.types'
import type { ApiResponse } from '../types/base-controller.types'

import Logger from '../../shared/logger'

export default class BaseRouter<T extends BaseController<Model>> {
    public grantPublicAccess: boolean = false;
    public controller: T;
    /**
     * 
     * @param {Controller} controller 
     */
    constructor(controller: T) {
        this.controller = controller
        this.get = this.get.bind(this);
        this.post = this.post.bind(this);
        this.getId = this.getId.bind(this);
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this)
        this.archives = this.archives.bind(this)
        this.restore = this.restore.bind(this)
        this.count = this.count.bind(this)
        this.stats = this.stats.bind(this)
    }

    /**
     * @description GET route
     * @param {Request} req 
     * @param {Response} res 
     * @param {NextFunction} next 
     */
    async get(req: Request, res: Response, next: NextFunction): Promise<void> {
        let response: ApiResponse;
        try {
            response = await this.controller.find(req, res, next)
            res.status(200).json(response)
        } catch (error) {
            Logger.error(error as Error)
            res.status(422).json(error)
        }
    }

    /**
     * @description GET ARCHIVES route
     * @param {Request} req 
     * @param {Response} res 
     * @param {NextFunction} next 
     */
    async archives(req: Request, res: Response, next: NextFunction): Promise<void> {
        let response: ApiResponse;
        try {
            
            response = await this.controller.archives(req, res, next)
            res.status(200).json(response)
        } catch (error) {
            Logger.error(error as Error)
            res.status(422).json(error)
        }
    }

    /**
     * @description POST route
     * @param {Request} req 
     * @param {Response} res 
     * @param {NextFunction} next 
     */
    async post(req: Request, res: Response, next: NextFunction): Promise<void> {
        let response: ApiResponse;
        try {
            response = await this.controller.create(req, res, next)
            res.status(200).json(response)
        } catch (error) {
            Logger.error(error as Error)
            res.status(422).json(error)
        }
    }

    /**
     * @description GET route (/:id) 
     * @param {HttpRequest} req 
     * @param {HttpResponse} res 
     * @param {*} next 
     */
    async getId(req: Request, res: Response, next: NextFunction): Promise<void> {
        let response: ApiResponse;
        try {
            response = await this.controller.findById(req, res, next)
            res.status(200).json(response)
        } catch (error) {
            Logger.error(error as Error)
            res.status(422).json(error)
        }
    }

    /**
     * @description PUT route (/:id) 
     * @param {HttpRequest} req 
     * @param {HttpResponse} res 
     * @param {*} next 
     */
    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        let response: ApiResponse;
        try {
            response = await this.controller.update(req, res, next)
            res.status(200).json(response)
        } catch (error) {
            Logger.error(error as Error)
            res.status(422).json(error)
        }
    }

    /**
     * 
     * @param req 
     * @param res 
     * @param next 
     */
    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        let response: ApiResponse;
        try {
            response = await this.controller.delete(req, res, next)
            res.status(200).json(response)
        } catch (error) {
            Logger.error(error as Error)
            res.status(422).json(error)
        }
    }


    /**
     * 
     * @param req 
     * @param res 
     * @param next 
     */
    async restore(req: Request, res: Response, next: NextFunction): Promise<void> {
        let response: ApiResponse;
        try {
            response = await this.controller.restore(req, res, next)
            res.status(200).json(response)
        } catch (error) {
            Logger.error(error as Error)
            res.status(422).json(error)
        }
    }


    
    /**
     * /count route
     * @param req 
     * @param res 
     * @param next 
     */
    async count(req: Request, res: Response, next: NextFunction): Promise<void> {
        let response: {count: number};
        try {
            response = await this.controller.count(req, res, next)
            res.status(200).json(response)
        } catch (error) {
            Logger.error(error as Error)
            res.status(422).json(error)
        }
    }

    /**
     * /stats get count by group
     * @param req 
     * @param res 
     * @param next 
     */
    async stats(req: Request, res: Response, next: NextFunction): Promise<void> {
        let response: {count: number};
        try {
            response = await this.controller.stats(req, res, next)
            res.status(200).json(response)
        } catch (error) {
            Logger.error(error as Error)
            res.status(422).json(error)
        }
    }


    /**
     * @description default mappings that will be inherited across all router class
     * @returns {Array} mappings
     */
    getMapping = (): Mappings[] => {
        return [
            { method: GET, path: '/', function: this.get },
            { method: POST, path: '/', function: this.post },
            { method: GET, path: '/archives', function: this.archives },
            { method: GET, path: '/count', function: this.count },
            { method: GET, path: '/stats', function: this.stats },
            { method: GET, path: '/:id', function: this.getId },
            { method: PUT, path: '/:id', function: this.update },
            { method: DELETE, path: '/:id', function: this.delete },
            { method: PUT, path: '/restore/:id', function: this.restore },

        ]
    }

    /**
     * @description additional mappings placeholder, designed to be overriden
     * @returns {Array} mappings
     */
    getAdditionalMapping = (): Mappings[] => {
        return []
    }


    /**
     * @description create the express router
     * @returns {Router} router
     */
    getRoutes(): Router {
        const router: Router = express.Router();

        this.getAdditionalMapping().forEach(mapping => {
            let route = router.route(mapping.path)
            let method = mapping.method.toLowerCase() as keyof typeof route;

            let met: HttpMethodsType = method as HttpMethodsType
            route[met](mapping.function)

        })

        this.getMapping().forEach(mapping => {
            let route = router.route(mapping.path)
            let method = mapping.method.toLowerCase() as keyof typeof route;
            let met: HttpMethodsType = method as HttpMethodsType

            if (mapping.middleware) {
                route[met](mapping.middleware, mapping.function)
            } else {
                route[met](mapping.function)
            }
        })

        return router;
    }

}
