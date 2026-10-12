import type { Request, Response, NextFunction } from "express";

type CatchAsyncType = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<any>;

const catchAsync = (fn: CatchAsyncType) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

export default catchAsync;
