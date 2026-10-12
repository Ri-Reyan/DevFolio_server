const credentials = {
  port: process.env.PORT,
  node_env: process.env.NODE_ENV,
  upstash_redis_rest_url: process.env.UPSTASH_REDIS_REST_URL,
  upstash_redis_rest_token: process.env.UPSTASH_REDIS_REST_TOKEN,
};

export default credentials;
