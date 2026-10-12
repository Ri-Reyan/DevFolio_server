import "dotenv/config";
import { createServer } from "http";
import app from "./app.js";
import credentials from "./config/credentials.js";
import redis from "./lib/redis.js";
import prisma from "./lib/prisma";

const PORT = credentials.port || 3000;

const main = async () => {
  const server = createServer(app);

  try {
    await redis.set("foo", "bar", { ex: 60 });
    const result = await redis.get("foo");
    if (result === "bar") {
      console.log("◇ [Redis]: Connected successfully");
    }

    await prisma.$connect();
    console.log("◇ [Prisma]: Connected successfully");

    server.listen(PORT, () => {
      console.log(
        `◇ Application successfully booted on http://localhost:${PORT}`,
      );
    });
  } catch (error) {
    console.error("Error starting the server:", error);
    process.exit(1);
  }
};

main();
