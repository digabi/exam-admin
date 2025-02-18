import { Application, ParamsDictionary, PathParams, RouteParameters } from 'express-serve-static-core'
import { ParsedQs } from 'qs'
import { IRouter, NextFunction, Request, Response } from 'express'

type ErrorRequestHandler<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
  LocalsObj extends Record<string, any> = Record<string, any>
> = (
  err: any,
  req: Request<P, ResBody, ReqBody, ReqQuery, LocalsObj>,
  res: Response<ResBody, LocalsObj>,
  next: NextFunction
) => Promise<any> | void
// Notice!!! Change 1/2 to original ^

interface RequestHandler<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
  LocalsObj extends Record<string, any> = Record<string, any>
> {
  // tslint:disable-next-line callable-types (This is extended from and can't extend from a type alias in ts<2.2)
  (
    req: Request<P, ResBody, ReqBody, ReqQuery, LocalsObj>,
    res: Response<ResBody, LocalsObj>,
    next: NextFunction
  ): Promise<any> | void
}
// Notice!!! Change 2/2 to original ^

type RequestHandlerParams<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
  LocalsObj extends Record<string, any> = Record<string, any>
> =
  | RequestHandler<P, ResBody, ReqBody, ReqQuery, LocalsObj>
  | ErrorRequestHandler<P, ResBody, ReqBody, ReqQuery, LocalsObj>
  | Array<RequestHandler<P> | ErrorRequestHandler<P>>

interface IRouterMatcher<
  T,
  Method extends
    | 'allAsync'
    | 'getAsync'
    | 'postAsync'
    | 'putAsync'
    | 'deleteAsync'
    | 'patchAsync'
    | 'optionsAsync'
    | 'headAsync' = any
> {
  <
    Route extends string,
    P = RouteParameters<Route>,
    ResBody = any,
    ReqBody = any,
    ReqQuery = ParsedQs,
    LocalsObj extends Record<string, any> = Record<string, any>
  >(
    // (it's used as the default type parameter for P)
    path: Route,
    // (This generic is meant to be passed explicitly.)
    ...handlers: Array<RequestHandler<P, ResBody, ReqBody, ReqQuery, LocalsObj>>
  ): T
  <
    Path extends string,
    P = RouteParameters<Path>,
    ResBody = any,
    ReqBody = any,
    ReqQuery = ParsedQs,
    LocalsObj extends Record<string, any> = Record<string, any>
  >(
    // (it's used as the default type parameter for P)
    path: Path,
    // (This generic is meant to be passed explicitly.)
    ...handlers: Array<RequestHandlerParams<P, ResBody, ReqBody, ReqQuery, LocalsObj>>
  ): T
  <
    P = ParamsDictionary,
    ResBody = any,
    ReqBody = any,
    ReqQuery = ParsedQs,
    LocalsObj extends Record<string, any> = Record<string, any>
  >(
    path: PathParams,
    // (This generic is meant to be passed explicitly.)
    ...handlers: Array<RequestHandler<P, ResBody, ReqBody, ReqQuery, LocalsObj>>
  ): T
  <
    P = ParamsDictionary,
    ResBody = any,
    ReqBody = any,
    ReqQuery = ParsedQs,
    LocalsObj extends Record<string, any> = Record<string, any>
  >(
    path: PathParams,
    // (This generic is meant to be passed explicitly.)
    ...handlers: Array<RequestHandlerParams<P, ResBody, ReqBody, ReqQuery, LocalsObj>>
  ): T
  (path: PathParams, subApplication: Application): T
}

export interface IRouterAsync extends IRouter {
  postAsync: IRouterMatcher<this, 'postAsync'>
  getAsync: IRouterMatcher<this, 'getAsync'>
  putAsync: IRouterMatcher<this, 'putAsync'>
  allAsync: IRouterMatcher<this, 'allAsync'>
  deleteAsync: IRouterMatcher<this, 'deleteAsync'>
  patchAsync: IRouterMatcher<this, 'patchAsync'>
  optionsAsync: IRouterMatcher<this, 'optionsAsync'>
  headAsync: IRouterMatcher<this, 'headAsync'>
}
