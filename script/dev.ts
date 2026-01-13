import "dotenv/config";

process.env.NODE_ENV = process.env.NODE_ENV ?? "development";
process.env.PORT = process.env.PORT ?? "5000";

await import("../server/index.ts");

export {};
