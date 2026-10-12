import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { globalErrorHandler } from "./global/errorHandler.js";

const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.use(globalErrorHandler);

export default app;
