import { Redis } from "@upstash/redis";
import credentials from "../config/credentials.js";

const redis = new Redis({
  url: credentials.upstash_redis_rest_url as string,
  token: credentials.upstash_redis_rest_token as string,
});

export default redis;
