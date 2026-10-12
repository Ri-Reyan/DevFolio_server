import { createServer } from "http";
import app from "./app.js";
import credentials from "./config/credentials.js";

const PORT = credentials.port || 3000;

const main = () => {
  const server = createServer(app);

  try {
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
