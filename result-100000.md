pnpm run setup

> tags_benchmark@1.0.0 setup /Users/coji/progs/spike/postgresql/tags_benchmark
> prisma migrate reset --force && prisma db push

Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public" at "localhost:5432"

Database reset successful

✔ Generated Prisma Client (v6.8.2) to ./node_modules/.pnpm/@prisma+client@6.8.2_prisma@6.8.2_typescript@5.8.3__typescript@5.8.3
/node_modules/@prisma/client in 47ms

Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public" at "localhost:5432"

🚀  Your database is now in sync with your Prisma schema. Done in 86ms

✔ Generated Prisma Client (v6.8.2) to ./node_modules/.pnpm/@prisma+client@6.8.2_prisma@6.8.2_typescript@5.8.3__typescript@5.8.3
/node_modules/@prisma/client in 28ms

pnpm run benchmark

> tags_benchmark@1.0.0 benchmark /Users/coji/progs/spike/postgresql/tags_benchmark
> tsx src/benchmark.ts

🚀 PostgreSQL Tags Benchmark Starting...

Configuration: { type: 'all', model: 'all', dataSize: 100000, searchIterations: 1000 }
🔧 Setting up database...
🧹 Cleaning up data...
📝 Seeding 100,000 records for jsonb...

=== SEARCH BENCHMARK: JSONB ===
[JSONB] Single tag (engineer): avg=355.1ms, p50=353.3ms, p95=371.4ms (1000 queries, total=355.1s)
[JSONB] AND search (engineer AND remote): avg=320.6ms, p50=317.2ms, p95=343.4ms (1000 queries, total=320.6s)
[JSONB] OR search (frontend OR backend): avg=488.0ms, p50=451.9ms, p95=567.8ms (1000 queries, total=488.0s)

=== WRITE BENCHMARK: JSONB ===
[JSONB] Single: 0.8ms/record (10,000 records, total=8.1s)
[JSONB] Batch: 0.0ms/record (10,000 records, total=0.3s)
[JSONB] Update: 0.9ms/record (10000 records, total=9.3s)
🧹 Cleaning up data...
📝 Seeding 100,000 records for array...

=== SEARCH BENCHMARK: ARRAY ===
[ARRAY] Single tag (engineer): avg=304.3ms, p50=303.0ms, p95=313.9ms (1000 queries, total=304.3s)
[ARRAY] AND search (engineer AND remote): avg=262.9ms, p50=261.6ms, p95=272.2ms (1000 queries, total=262.9s)
[ARRAY] OR search (frontend OR backend): avg=376.8ms, p50=376.8ms, p95=391.3ms (1000 queries, total=376.8s)

=== WRITE BENCHMARK: ARRAY ===
[ARRAY] Single: 0.6ms/record (10,000 records, total=5.8s)
[ARRAY] Batch: 0.0ms/record (10,000 records, total=0.4s)
[ARRAY] Update: 0.6ms/record (10000 records, total=5.9s)

✅ Benchmark completed successfully!
