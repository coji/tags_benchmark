$ pnpm run benchmark --database=duckdb

> tags_benchmark@1.0.0 benchmark /Users/coji/progs/spike/postgresql/tags_benchmark
> tsx src/benchmark.ts --database\=duckdb

🚀 Database Tags Benchmark Starting...

Configuration: {
  type: 'all',
  database: 'duckdb',
  model: 'all',
  dataSize: 100000,
  searchIterations: 1000
}
🔧 Setting up duckdb database...
🧹 Cleaning up duckdb data...
📝 Seeding 100,000 records for duckdb normalized...

=== SEARCH BENCHMARK: DUCKDB NORMALIZED ===
[DUCKDB-NORMALIZED] Single tag (engineer): avg=22.8ms, p50=22.6ms, p95=23.9ms (1000 queries, total=22.8s)
[DUCKDB-NORMALIZED] AND search (engineer AND remote): avg=28.6ms, p50=28.5ms, p95=31.4ms (1000 queries, total=28.6s)
[DUCKDB-NORMALIZED] OR search (frontend OR backend): avg=26.9ms, p50=25.7ms, p95=30.7ms (1000 queries, total=26.9s)

=== WRITE BENCHMARK: DUCKDB NORMALIZED ===
[DUCKDB-NORMALIZED] Single: 4.4ms/record (10,000 records, total=44.4s)
[DUCKDB-NORMALIZED] Batch: 1.8ms/record (10,000 records, total=18.3s)
[DUCKDB-NORMALIZED] Update: 4.3ms/record (10000 records, total=42.7s)
🧹 Cleaning up duckdb data...
📝 Seeding 100,000 records for duckdb jsonb...

=== SEARCH BENCHMARK: DUCKDB JSONB ===
[DUCKDB-JSONB] Single tag (engineer): avg=120.3ms, p50=119.7ms, p95=125.8ms (1000 queries, total=120.3s)
[DUCKDB-JSONB] AND search (engineer AND remote): avg=126.3ms, p50=125.8ms, p95=130.4ms (1000 queries, total=126.3s)
[DUCKDB-JSONB] OR search (frontend OR backend): avg=148.3ms, p50=147.9ms, p95=154.0ms (1000 queries, total=148.3s)

=== WRITE BENCHMARK: DUCKDB JSONB ===
[DUCKDB-JSONB] Single: 0.4ms/record (10,000 records, total=3.7s)
[DUCKDB-JSONB] Batch: 0.4ms/record (10,000 records, total=3.6s)
[DUCKDB-JSONB] Update: 0.3ms/record (10000 records, total=2.5s)
🧹 Cleaning up duckdb data...
📝 Seeding 100,000 records for duckdb array...

=== SEARCH BENCHMARK: DUCKDB ARRAY ===
[DUCKDB-ARRAY] Single tag (engineer): avg=121.7ms, p50=117.9ms, p95=134.9ms (1000 queries, total=121.7s)
[DUCKDB-ARRAY] AND search (engineer AND remote): avg=107.2ms, p50=106.5ms, p95=112.4ms (1000 queries, total=107.2s)
[DUCKDB-ARRAY] OR search (frontend OR backend): avg=141.2ms, p50=142.2ms, p95=148.5ms (1000 queries, total=141.2s)

=== WRITE BENCHMARK: DUCKDB ARRAY ===
[DUCKDB-ARRAY] Single: 0.4ms/record (10,000 records, total=4.0s)
[DUCKDB-ARRAY] Batch: 0.4ms/record (10,000 records, total=4.1s)
[DUCKDB-ARRAY] Update: 0.4ms/record (10000 records, total=3.9s)

✅ Benchmark completed successfully!
