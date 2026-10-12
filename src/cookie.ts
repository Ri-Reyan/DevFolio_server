import type { JwtPayload } from "jsonwebtoken";
import jwt from "jsonwebtoken";
import type { Response } from "express";

export const generateToken = (
  secret: string,
  payload: string | JwtPayload,
  time: number,
) => {
  return jwt.sign(payload, secret, {
    expiresIn: time,
  });
};

export const verifyToken = (token: string, secret: string) => {
  return jwt.verify(token, secret);
};

export const sendCookie = (res: Response, name: string, value: string) => {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie(name, value, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge:
      name === "refreshToken" ? 1000 * 60 * 60 * 24 * 7 : 1000 * 60 * 60 * 24,
  });
};
