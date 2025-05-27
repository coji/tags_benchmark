# データベース タグ管理パフォーマンス比較

## 概要

PostgreSQLとDuckDBにおける「人 + タグ」管理システムの3つの実装アプローチを比較し、検索・書き込み性能を定量的に評価する。

## 比較対象

### データベース
- **PostgreSQL 15**: 従来の高性能RDBMS
- **DuckDB**: 分析特化のOLAPデータベース

### アプローチ
| アプローチ | データ構造 | インデックス | 特徴 |
|-----------|-----------|-------------|------|
| **正規化** | `Person`, `Tag`, `PersonTag` | 複合インデックス | リレーショナルDB標準設計 |
| **JSONB** | `Person(tags JSONB)` | GINインデックス | NoSQL風の柔軟性 |
| **配列** | `Person(tags TEXT[])` | GINインデックス/array_contains | PostgreSQL/DuckDB最適化 |

## データ仕様

- **総人数**: 10,000人
- **タグプール**: `["engineer", "remote", "frontend", "backend", "manager", "senior", "junior", "fullstack", "devops", "qa", "designer", "product", "marketing", "sales", "support"]`
- **タグ割当**: 1人あたりランダムに5～15個（平均10個）
- **分布**: 各タグ約60-80%の人に割当（現実的な偏り）

## ベンチマーク項目

### 🔍 検索性能テスト

各アプローチで以下のクエリを1,000回実行（ウォームアップ100回後）

| テストケース | 条件 | 期待結果数 |
|-------------|------|-----------|
| 単一タグ | `engineer` | ~6,000-8,00人 |
| AND検索 | `engineer AND remote` | ~4,000-6,000人 |
| OR検索 | `frontend OR backend` | ~8,000-10,000人 |

### ✍️ 書き込み性能テスト

- **単件挿入**: 1,000件を1件ずつ挿入
- **バッチ挿入**: 1,000件をバッチで挿入
- **更新**: 既存1,000人のタグを変更

## 技術スタック

```yaml
言語: TypeScript + Node.js
実行環境: tsx
PostgreSQL接続: Prisma ORM
DuckDB接続: @duckdb/node-api
DB: PostgreSQL 15 (Docker) + DuckDB (in-memory)
測定: performance.now()
```

## スキーマ設計

### PostgreSQL

#### 正規化アプローチ
```sql
CREATE TABLE Person (id SERIAL PRIMARY KEY, name TEXT);
CREATE TABLE Tag (id SERIAL PRIMARY KEY, name TEXT UNIQUE);
CREATE TABLE PersonTag (
  person_id INT REFERENCES Person(id),
  tag_id INT REFERENCES Tag(id),
  PRIMARY KEY (person_id, tag_id)
);
CREATE INDEX idx_person_tag_tag ON PersonTag(tag_id);
```

#### JSONBアプローチ
```sql
CREATE TABLE Person (
  id SERIAL PRIMARY KEY,
  name TEXT,
  tags JSONB
);
CREATE INDEX idx_person_tags_gin ON Person USING gin(tags);
```

#### 配列アプローチ
```sql
CREATE TABLE Person (
  id SERIAL PRIMARY KEY,
  name TEXT,
  tags TEXT[]
);
CREATE INDEX idx_person_tags_gin ON Person USING gin(tags);
```

### DuckDB

DuckDBでは同様のスキーマを作成し、PostgreSQL固有のGINインデックスの代わりに、DuckDBの最適化機能を活用します。

## プロジェクト構成

```sh
tags_benchmark/
├── compose.yml
├── package.json
├── tsconfig.json
├── biome.json
├── prisma/
│   └── schema.prisma
├── src/
│   ├── benchmark.ts
│   ├── models/
│   │   ├── normalized.ts          # PostgreSQL正規化
│   │   ├── jsonb.ts               # PostgreSQL JSONB
│   │   ├── array.ts               # PostgreSQL配列
│   │   ├── duckdb-normalized.ts   # DuckDB正規化
│   │   ├── duckdb-jsonb.ts        # DuckDB JSONB
│   │   └── duckdb-array.ts        # DuckDB配列
│   └── utils/
│       ├── data-generator.ts
│       └── timer.ts
└── README.md
```

## package.json スクリプト

```json
{
  "scripts": {
    "dev": "tsx src/benchmark.ts",
    "setup": "prisma migrate reset --force && prisma db push",
    "benchmark": "tsx src/benchmark.ts",
    "benchmark:search": "tsx src/benchmark.ts --type=search",
    "benchmark:write": "tsx src/benchmark.ts --type=write",
    "db:reset": "prisma migrate reset --force"
  },
  "dependencies": {
    "@duckdb/node-api": "^1.3.0-alpha.21",
    "@prisma/client": "^6.8.2",
    "prisma": "^6.8.2",
    "ts-pattern": "5.7.1"
  },
  "devDependencies": {
    "@biomejs/biome": "1.9.4",
    "@types/node": "^22.15.21",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

## 出力フォーマット

```sh
=== SEARCH BENCHMARK: POSTGRESQL JSONB ===
[POSTGRESQL-JSONB] Single tag (engineer): avg=1.4ms, p50=1.2ms, p95=2.1ms (1000 queries, total=1.4s)
[POSTGRESQL-JSONB] AND search (engineer AND remote): avg=2.3ms, p50=2.0ms, p95=3.4ms (1000 queries, total=2.3s)
[POSTGRESQL-JSONB] OR search (frontend OR backend): avg=1.8ms, p50=1.5ms, p95=2.8ms (1000 queries, total=1.8s)

=== SEARCH BENCHMARK: DUCKDB JSONB ===
[DUCKDB-JSONB] Single tag (engineer): avg=0.8ms, p50=0.7ms, p95=1.2ms (1000 queries, total=0.8s)
[DUCKDB-JSONB] AND search (engineer AND remote): avg=1.1ms, p50=1.0ms, p95=1.6ms (1000 queries, total=1.1s)
[DUCKDB-JSONB] OR search (frontend OR backend): avg=0.9ms, p50=0.8ms, p95=1.4ms (1000 queries, total=0.9s)

=== WRITE BENCHMARK: POSTGRESQL JSONB ===
[POSTGRESQL-JSONB] Single: 2.1ms/record (1000 records, total=2.1s)
[POSTGRESQL-JSONB] Batch: 0.5ms/record (1000 records, total=0.5s)
[POSTGRESQL-JSONB] Update: 1.8ms/record (1000 records, total=1.8s)

=== WRITE BENCHMARK: DUCKDB JSONB ===
[DUCKDB-JSONB] Single: 0.3ms/record (1000 records, total=0.3s)
[DUCKDB-JSONB] Batch: 0.1ms/record (1000 records, total=0.1s)
[DUCKDB-JSONB] Update: 0.4ms/record (1000 records, total=0.4s)
```

## 実行コマンド

```bash
# 環境準備（PostgreSQLのみ必要、DuckDBはin-memory）
docker compose up -d
pnpm install
pnpm run setup

# 全ベンチマーク実行（PostgreSQLのみ）
pnpm run benchmark

# データベース指定実行
pnpm run benchmark -- --database=postgresql    # PostgreSQLのみ
pnpm run benchmark -- --database=duckdb       # DuckDBのみ  
pnpm run benchmark -- --database=both         # 両方比較

# モデル・タイプ指定
pnpm run benchmark -- --type=search --model=jsonb --database=both
pnpm run benchmark -- --type=write --model=array --database=duckdb

# 開発時の実行
pnpm run dev
```

### コマンドオプション

| オプション | 値 | 説明 |
|-----------|---|------|
| `--database` | `postgresql`, `duckdb`, `both` | 使用するデータベース |
| `--type` | `search`, `write`, `all` | ベンチマークタイプ |
| `--model` | `normalized`, `jsonb`, `array` | データモデル |
| `--data-size` | 数値 | データサイズ（デフォルト: 100,000） |
| `--iterations` | 数値 | 検索反復回数（デフォルト: 1,000） |
| `--write-size` | 数値 | 書き込みテストサイズ（デフォルト: 10,000） |

## 評価観点

1. **性能**: レスポンス時間、スループット
2. **スケーラビリティ**: データ量増加時の性能劣化
3. **開発体験**: クエリの書きやすさ、型安全性
4. **運用性**: インデックスサイズ、メンテナンス性
5. **データベース間比較**: PostgreSQL vs DuckDB の特性差

## Docker 設定

```yaml
# compose.yml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: benchmark
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## 主な違い・特徴

### PostgreSQL
- **OLTP特化**: トランザクション処理に最適化
- **豊富なインデックス**: GINインデックスによる高速検索
- **成熟した生態系**: Prisma ORMとの統合

### DuckDB  
- **OLAP特化**: 分析クエリに最適化
- **インメモリ**: セットアップ不要、高速起動
- **カラムナ**: 分析処理で高いパフォーマンス
- **組み込み型**: アプリケーションに簡単統合

## ベンチマーク予想

| 項目 | PostgreSQL | DuckDB | 予想 |
|------|-----------|--------|------|
| 検索性能 | 💪 高性能 | 🚀 より高速 | DuckDBが有利 |
| 書き込み性能 | 💪 安定 | ⚡ 高速 | DuckDBが有利 |
| スケーラビリティ | 🏗️ 実績豊富 | 📈 分析向け | 用途により異なる |
| 運用性 | 🛠️ 豊富なツール | 🎯 シンプル | PostgreSQLが有利 |
