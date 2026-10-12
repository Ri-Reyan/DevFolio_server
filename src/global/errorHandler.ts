import type { Request, Response, NextFunction } from "express";
import AppError from "./AppError.js";

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let error = err;

  // 1. Prisma Unique Constraint Error (e.g. Email/Name already exists)
  if (err.code === "P2002") {
    const field = err.meta?.target?.[0] || "field";
    error = new AppError(`A record with this ${field} already exists.`, 400);
  }

  // 2. Prisma Record Not Found Error
  if (err.code === "P2025") {
    error = new AppError("The requested record was not found.", 404);
  }

  // Set default values if not defined
  const statusCode = error.statusCode || 500;
  const message =
    error.message || "Something went wrong! Please try again later.";

  // Development Response
  if (process.env.NODE_ENV === "development") {
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message,
      error,
      stack: error.stack,
    });
  }

  // Production Response: Trusted / Operational Error
  if (error.isOperational) {
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message,
    });
  }

  // Production Response: Programming or Unknown Error (Don't leak details)
  console.error("UNHANDLED ERROR 💥:", error);
  return res.status(500).json({
    success: false,
    statusCode: 500,
    message: "Something went wrong! Please try again later.",
  });
};
