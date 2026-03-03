import type { Request, Response, NextFunction, IRoute } from 'express'
import type { ApiResponse } from './base-controller.types'

export type Mappings = {
    path: string,
    method: string,
    function: (req: Request, res: Response, next: NextFunction)=> Promise<void | ApiResponse>,
    middleware?: (req: Request, res: Response, next: NextFunction)=> Promise<void>
}