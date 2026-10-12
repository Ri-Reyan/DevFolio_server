import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../generated/prisma/client";



const connectionString = `${process.env.DATABASE_URL}`;

const pool = new pg.Pool({
	connectionString,
	max: 10,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 10000,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export { prisma };
