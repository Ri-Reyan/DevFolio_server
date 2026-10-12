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
  res.send({ message: "Hello World!, server is running", status: 200 });
});

app.use(globalErrorHandler);

export default app;
