# benchmark results at 10000 data size

pnpm run setup

> tags_benchmark@1.0.0 setup /Users/coji/progs/spike/postgresql/tags_benchmark
> prisma migrate reset --force && prisma db push

Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public" at "localhost:5432"

Database reset successful

✔ Generated Prisma Client (v6.8.2) to ./node_modules/.pnpm/@prisma+client@6.8.2_prisma@6.8.2_typescript@5.8.3
__typescript@5.8.3/node_modules/@prisma/client in 26ms

Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public" at "localhost:5432"

🚀  Your database is now in sync with your Prisma schema. Done in 81ms

✔ Generated Prisma Client (v6.8.2) to ./node_modules/.pnpm/@prisma+client@6.8.2_prisma@6.8.2_typescript@5.8.3
__typescript@5.8.3/node_modules/@prisma/client in 27ms

pnpm run benchmark

> tags_benchmark@1.0.0 benchmark /Users/coji/progs/spike/postgresql/tags_benchmark
> tsx src/benchmark.ts

🚀 PostgreSQL Tags Benchmark Starting...

Configuration: { type: 'all', model: 'all', dataSize: 10000, searchIterations: 1000 }
🔧 Setting up database...
🧹 Cleaning up data...
📝 Seeding 10,000 records for normalized...

=== SEARCH BENCHMARK: NORMALIZED ===
[NORMALIZED] Single tag (engineer): avg=573.5ms, p50=553.0ms, p95=646.3ms (1000 queries, total=573.5s)
[NORMALIZED] AND search (engineer AND remote): avg=605.6ms, p50=608.7ms, p95=710.9ms (1000 queries, total=605.6s)
[NORMALIZED] OR search (frontend OR backend): avg=672.0ms, p50=652.8ms, p95=799.9ms (1000 queries, total=672.0s)

=== WRITE BENCHMARK: NORMALIZED ===
[NORMALIZED] Single: 3.7ms/record (10,000 records, total=36.6s)
[NORMALIZED] Batch: 0.1ms/record (10,000 records, total=1.4s)
[NORMALIZED] Update: 3.5ms/record (10000 records, total=35.2s)
🧹 Cleaning up data...
📝 Seeding 10,000 records for jsonb...

=== SEARCH BENCHMARK: JSONB ===
[JSONB] Single tag (engineer): avg=39.5ms, p50=39.5ms, p95=42.4ms (1000 queries, total=39.5s)
[JSONB] AND search (engineer AND remote): avg=35.2ms, p50=35.3ms, p95=38.0ms (1000 queries, total=35.2s)
[JSONB] OR search (frontend OR backend): avg=47.0ms, p50=46.8ms, p95=50.2ms (1000 queries, total=47.0s)

=== WRITE BENCHMARK: JSONB ===
[JSONB] Single: 0.9ms/record (10,000 records, total=9.1s)
[JSONB] Batch: 0.0ms/record (10,000 records, total=0.4s)
[JSONB] Update: 1.7ms/record (10000 records, total=16.5s)
🧹 Cleaning up data...
📝 Seeding 10,000 records for array...

=== SEARCH BENCHMARK: ARRAY ===
[ARRAY] Single tag (engineer): avg=39.1ms, p50=39.1ms, p95=44.0ms (1000 queries, total=39.1s)
[ARRAY] AND search (engineer AND remote): avg=34.2ms, p50=33.8ms, p95=37.9ms (1000 queries, total=34.2s)
[ARRAY] OR search (frontend OR backend): avg=46.8ms, p50=44.8ms, p95=60.1ms (1000 queries, total=46.8s)

=== WRITE BENCHMARK: ARRAY ===
[ARRAY] Single: 0.8ms/record (10,000 records, total=8.1s)
[ARRAY] Batch: 0.0ms/record (10,000 records, total=0.4s)
[ARRAY] Update: 1.0ms/record (10000 records, total=9.5s)

✅ Benchmark completed successfully!
