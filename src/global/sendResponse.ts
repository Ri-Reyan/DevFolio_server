import type { Response } from "express";

type PayloadType<T> = {
  success: boolean;
  statusCode: number;
  message: string;
  error?: unknown;
  data?: T;
  metadata?: T;
};

const sendResponse = <T,>(res: Response, payload: PayloadType<T>) => {
  return res.status(payload.statusCode).json({
    success: payload.success,
    message: payload.message,
    data: payload.data,
    error: payload.error,
    metadata: payload.metadata,
  });
};

export default sendResponse;
