# PostgreSQL タグ管理パフォーマンス比較：要件定義書

## 概要

PostgreSQLにおける「人 + タグ」管理システムの3つの実装アプローチを比較し、検索・書き込み性能を定量的に評価する。

## 比較対象

| アプローチ | データ構造 | インデックス | 特徴 |
|-----------|-----------|-------------|------|
| **正規化** | `Person`, `Tag`, `PersonTag` | 複合インデックス | リレーショナルDB標準設計 |
| **JSONB** | `Person(tags JSONB)` | GINインデックス | NoSQL風の柔軟性 |
| **配列** | `Person(tags TEXT[])` | GINインデックス | PostgreSQL最適化 |

## データ仕様

- **総人数**: 1,000,000人
- **タグプール**: `["engineer", "remote", "frontend", "backend", "manager", "senior", "junior", "fullstack", "devops", "qa", "designer", "product", "marketing", "sales", "support"]`
- **タグ割当**: 1人あたりランダムに5～15個（平均10個）
- **分布**: 各タグ約60-80%の人に割当（現実的な偏り）

## ベンチマーク項目

### 🔍 検索性能テスト

各アプローチで以下のクエリを1,000回実行（ウォームアップ100回後）

| テストケース | 条件 | 期待結果数 |
|-------------|------|-----------|
| 単一タグ | `engineer` | ~600,000-800,000人 |
| AND検索 | `engineer AND remote` | ~400,000-600,000人 |
| OR検索 | `frontend OR backend` | ~800,000-1,000,000人 |

### ✍️ 書き込み性能テスト

- **単件挿入**: 1,000件を1件ずつ挿入
- **バッチ挿入**: 1,000件をバッチで挿入
- **更新**: 既存1,000人のタグを変更

## 技術スタック

```yaml
言語: TypeScript + Node.js
実行環境: tsx
ORM: Prisma
DB: PostgreSQL 15 (Docker)
測定: performance.now()
```

## スキーマ設計

### 正規化アプローチ

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

### JSONBアプローチ

```sql
CREATE TABLE Person (
  id SERIAL PRIMARY KEY,
  name TEXT,
  tags JSONB
);
CREATE INDEX idx_person_tags_gin ON Person USING gin(tags);
```

### 配列アプローチ

```sql
CREATE TABLE Person (
  id SERIAL PRIMARY KEY,
  name TEXT,
  tags TEXT[]
);
CREATE INDEX idx_person_tags_gin ON Person USING gin(tags);
```

## プロジェクト構成

```sh
benchmark-tags/
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── .env
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── benchmark.ts
│   ├── models/
│   │   ├── normalized.ts
│   │   ├── jsonb.ts
│   │   └── array.ts
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
    "@prisma/client": "^5.0.0",
    "prisma": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

## 出力フォーマット

```sh
=== SEARCH BENCHMARK ===
[NORMALIZED] engineer: avg=2.1ms, p50=1.8ms, p95=3.2ms (1000 queries, total=2.1s)
[JSONB]      engineer: avg=1.4ms, p50=1.2ms, p95=2.1ms (1000 queries, total=1.4s)
[ARRAY]      engineer: avg=1.2ms, p50=1.0ms, p95=1.8ms (1000 queries, total=1.2s)

[NORMALIZED] engineer AND remote: avg=3.5ms, p50=3.1ms, p95=5.2ms (1000 queries, total=3.5s)
[JSONB]      engineer AND remote: avg=2.3ms, p50=2.0ms, p95=3.4ms (1000 queries, total=2.3s)
[ARRAY]      engineer AND remote: avg=2.1ms, p50=1.8ms, p95=3.1ms (1000 queries, total=2.1s)

=== WRITE BENCHMARK ===
[NORMALIZED] Single: 4.5ms/record (1000 records, total=4.5s), Batch: 1.2ms/record (1000 records, total=1.2s)
[JSONB]      Single: 2.1ms/record (1000 records, total=2.1s), Batch: 0.5ms/record (1000 records, total=0.5s)
[ARRAY]      Single: 1.9ms/record (1000 records, total=1.9s), Batch: 0.4ms/record (1000 records, total=0.4s)
```

## 実行コマンド

```bash
# 環境準備
docker compose up -d
npm install
npm run setup

# 全ベンチマーク実行
npm run benchmark

# 個別実行
npm run benchmark -- --type=search --model=normalized
npm run benchmark -- --type=write --model=jsonb

# 開発時の実行
npm run dev
```

## 評価観点

1. **性能**: レスポンス時間、スループット
2. **スケーラビリティ**: データ量増加時の性能劣化
3. **開発体験**: クエリの書きやすさ、型安全性
4. **運用性**: インデックスサイズ、メンテナンス性

## Docker 設定

```yaml
# docker-compose.yml
version: '3.8'
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

## 環境変数

```env
# .env
DATABASE_URL="postgresql://postgres:password@localhost:5432/benchmark"
```
