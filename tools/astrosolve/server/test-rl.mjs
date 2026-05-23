import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
// No explicit trustProxy
const fastify = Fastify();
fastify.register(rateLimit, { max: 3, timeWindow: "1 minute" });
fastify.get("/", async () => ({ ok: true }));
await fastify.listen({ port: 3037, host: "127.0.0.1" });
console.log("ready");
