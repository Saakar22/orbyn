// `npm run db:seed` — creates one demo workspace and prints its user id.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { createDemoUser } from "../src/server/seed/demoWorkspace";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

createDemoUser(db)
  .then((user) => console.log(`Seeded demo workspace for ${user.name} (${user.id})`))
  .finally(() => db.$disconnect());
