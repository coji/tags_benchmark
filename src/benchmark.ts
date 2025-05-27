import { PrismaClient } from '@prisma/client';
import { DuckDBConnection } from '@duckdb/node-api';
import { NormalizedModel } from './models/normalized.js';
import { JsonbModel } from './models/jsonb.js';
import { ArrayModel } from './models/array.js';
import { DuckDBNormalizedModel } from './models/duckdb-normalized.js';
import { DuckDBJsonbModel } from './models/duckdb-jsonb.js';
import { DuckDBArrayModel } from './models/duckdb-array.js';
import { generatePeople } from './utils/data-generator.js';
import { Timer } from './utils/timer.js';
import { match } from 'ts-pattern';

type ModelType = 'normalized' | 'jsonb' | 'array';
type DatabaseType = 'postgresql' | 'duckdb' | 'both';
type BenchmarkType = 'search' | 'write' | 'all';

interface BenchmarkConfig {
  type: BenchmarkType;
  database?: DatabaseType;
  model?: ModelType;
  dataSize: number;
  searchIterations: number;
  warmupIterations: number;
  writeTestSize: number;
}

class BenchmarkRunner {
  private prisma: PrismaClient;
  private duckdbConnection?: DuckDBConnection;
  private normalizedModel: NormalizedModel;
  private jsonbModel: JsonbModel;
  private arrayModel: ArrayModel;
  private duckdbNormalizedModel?: DuckDBNormalizedModel;
  private duckdbJsonbModel?: DuckDBJsonbModel;
  private duckdbArrayModel?: DuckDBArrayModel;

  constructor() {
    this.prisma = new PrismaClient();
    this.normalizedModel = new NormalizedModel(this.prisma);
    this.jsonbModel = new JsonbModel(this.prisma);
    this.arrayModel = new ArrayModel(this.prisma);
  }

  async initDuckDB() {
    if (!this.duckdbConnection) {
      this.duckdbConnection = await DuckDBConnection.create();
      this.duckdbNormalizedModel = new DuckDBNormalizedModel(
        this.duckdbConnection
      );
      this.duckdbJsonbModel = new DuckDBJsonbModel(this.duckdbConnection);
      this.duckdbArrayModel = new DuckDBArrayModel(this.duckdbConnection);
    }
  }

  private getModel(type: ModelType, database: DatabaseType = 'postgresql') {
    return match({ type, database })
      .with(
        { type: 'normalized', database: 'postgresql' },
        () => this.normalizedModel
      )
      .with({ type: 'jsonb', database: 'postgresql' }, () => this.jsonbModel)
      .with({ type: 'array', database: 'postgresql' }, () => this.arrayModel)
      .with({ type: 'normalized', database: 'duckdb' }, () => {
        if (!this.duckdbNormalizedModel)
          throw new Error('DuckDB not initialized');
        return this.duckdbNormalizedModel;
      })
      .with({ type: 'jsonb', database: 'duckdb' }, () => {
        if (!this.duckdbJsonbModel) throw new Error('DuckDB not initialized');
        return this.duckdbJsonbModel;
      })
      .with({ type: 'array', database: 'duckdb' }, () => {
        if (!this.duckdbArrayModel) throw new Error('DuckDB not initialized');
        return this.duckdbArrayModel;
      })
      .otherwise(() => {
        throw new Error(`Unsupported combination: ${database} + ${type}`);
      });
  }

  async setupDatabase(database: DatabaseType = 'postgresql') {
    console.log(`🔧 Setting up ${database} database...`);

    if (database === 'postgresql' || database === 'both') {
      await this.normalizedModel.setup();
      await this.jsonbModel.setup();
      await this.arrayModel.setup();
    }

    if (database === 'duckdb' || database === 'both') {
      await this.initDuckDB();
      await this.duckdbNormalizedModel?.setup();
      await this.duckdbJsonbModel?.setup();
      await this.duckdbArrayModel?.setup();
    }
  }

  async seedData(
    modelType: ModelType,
    count: number,
    database: DatabaseType = 'postgresql'
  ) {
    console.log(
      `📝 Seeding ${count.toLocaleString()} records for ${database} ${modelType}...`
    );
    const model = this.getModel(modelType, database);
    const people = generatePeople(count);

    const batchSize = 1000;
    for (let i = 0; i < people.length; i += batchSize) {
      const batch = people.slice(i, i + batchSize);
      await model.insertPersonsBatch(batch);
    }
  }

  async runSearchBenchmark(
    config: BenchmarkConfig,
    modelType: ModelType,
    database: DatabaseType = 'postgresql'
  ) {
    console.log(
      `\n=== SEARCH BENCHMARK: ${database.toUpperCase()} ${modelType.toUpperCase()} ===`
    );
    const model = this.getModel(modelType, database);

    const testCases = [
      {
        name: 'Single tag (engineer)',
        fn: () => model.searchByTag('engineer'),
      },
      {
        name: 'AND search (engineer AND remote)',
        fn: () => model.searchByTagsAnd(['engineer', 'remote']),
      },
      {
        name: 'OR search (frontend OR backend)',
        fn: () => model.searchByTagsOr(['frontend', 'backend']),
      },
    ];

    for (const testCase of testCases) {
      const timer = new Timer();

      // Warmup
      for (let i = 0; i < config.warmupIterations; i++) {
        await testCase.fn();
      }

      // Actual benchmark
      for (let i = 0; i < config.searchIterations; i++) {
        await timer.measure(async () => {
          await testCase.fn();
        });
      }

      const result = timer.getResult();
      console.log(
        `[${database.toUpperCase()}-${modelType.toUpperCase()}] ${
          testCase.name
        }: avg=${Timer.formatMs(result.avg)}, p50=${Timer.formatMs(
          result.p50
        )}, p95=${Timer.formatMs(result.p95)} (${
          result.count
        } queries, total=${Timer.formatSeconds(result.total)})`
      );
    }
  }

  async runWriteBenchmark(
    config: BenchmarkConfig,
    modelType: ModelType,
    database: DatabaseType = 'postgresql'
  ) {
    console.log(
      `\n=== WRITE BENCHMARK: ${database.toUpperCase()} ${modelType.toUpperCase()} ===`
    );
    const model = this.getModel(modelType, database);

    // Single insert test
    const singleTimer = new Timer();
    const singleTestData = generatePeople(config.writeTestSize);

    for (const person of singleTestData) {
      await singleTimer.measure(() =>
        model.insertPerson(person.name, person.tags)
      );
    }

    const singleResult = singleTimer.getResult();
    console.log(
      `[${database.toUpperCase()}-${modelType.toUpperCase()}] Single: ${Timer.formatMs(
        singleResult.avg
      )}/record (${singleResult.count.toLocaleString()} records, total=${Timer.formatSeconds(
        singleResult.total
      )})`
    );

    // Batch insert test
    const batchTimer = new Timer();
    const batchTestData = generatePeople(config.writeTestSize);

    await batchTimer.measure(() => model.insertPersonsBatch(batchTestData));

    const batchResult = batchTimer.getResult();
    const batchAvgPerRecord = batchResult.total / config.writeTestSize;
    console.log(
      `[${database.toUpperCase()}-${modelType.toUpperCase()}] Batch: ${Timer.formatMs(
        batchAvgPerRecord
      )}/record (${config.writeTestSize.toLocaleString()} records, total=${Timer.formatSeconds(
        batchResult.total
      )})`
    );

    // Update test - Get existing person IDs from the correct table
    const updateTimer = new Timer();
    let existingPersons: { id: number }[] = [];

    if (database === 'postgresql') {
      switch (modelType) {
        case 'normalized':
          existingPersons = await this.prisma.person.findMany({
            take: config.writeTestSize,
            select: { id: true },
          });
          break;
        case 'jsonb':
          existingPersons = await this.prisma.personJsonb.findMany({
            take: config.writeTestSize,
            select: { id: true },
          });
          break;
        case 'array':
          existingPersons = await this.prisma.personArray.findMany({
            take: config.writeTestSize,
            select: { id: true },
          });
          break;
      }
    } else if (database === 'duckdb') {
      // DuckDBから既存のIDを取得
      const tableName =
        modelType === 'normalized' ? 'person' : `person_${modelType}`;
      if (!this.duckdbConnection) {
        throw new Error('DuckDB connection not initialized');
      }
      const reader = await this.duckdbConnection.runAndReadAll(
        `SELECT id FROM ${tableName} LIMIT ?`,
        [config.writeTestSize]
      );
      existingPersons = reader.getRowObjects() as { id: number }[];
    }

    for (const person of existingPersons) {
      const newTags = generatePeople(1)[0].tags;
      await updateTimer.measure(async () => {
        await model.updatePersonTags(person.id, newTags);
      });
    }

    const updateResult = updateTimer.getResult();
    console.log(
      `[${database.toUpperCase()}-${modelType.toUpperCase()}] Update: ${Timer.formatMs(
        updateResult.avg
      )}/record (${updateResult.count} records, total=${Timer.formatSeconds(
        updateResult.total
      )})`
    );
  }

  async cleanupData(database: DatabaseType = 'postgresql') {
    console.log(`🧹 Cleaning up ${database} data...`);

    if (database === 'postgresql' || database === 'both') {
      await this.normalizedModel.cleanup();
      await this.jsonbModel.cleanup();
      await this.arrayModel.cleanup();
    }

    if (database === 'duckdb' || database === 'both') {
      if (this.duckdbNormalizedModel)
        await this.duckdbNormalizedModel.cleanup();
      if (this.duckdbJsonbModel) await this.duckdbJsonbModel.cleanup();
      if (this.duckdbArrayModel) await this.duckdbArrayModel.cleanup();
    }
  }

  async run(config: BenchmarkConfig) {
    try {
      const databasesToTest: DatabaseType[] = config.database
        ? config.database === 'both'
          ? ['postgresql', 'duckdb']
          : [config.database]
        : ['postgresql'];

      const modelsToTest: ModelType[] = config.model
        ? [config.model]
        : ['normalized', 'jsonb', 'array'];

      for (const database of databasesToTest) {
        await this.setupDatabase(database);

        for (const modelType of modelsToTest) {
          await this.cleanupData(database);
          await this.seedData(modelType, config.dataSize, database);

          if (config.type === 'search' || config.type === 'all') {
            await this.runSearchBenchmark(config, modelType, database);
          }

          if (config.type === 'write' || config.type === 'all') {
            await this.runWriteBenchmark(config, modelType, database);
          }
        }
      }

      console.log('\n✅ Benchmark completed successfully!');
    } catch (error) {
      console.error('❌ Benchmark failed:', error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
      // DuckDB connection cleanup is handled automatically
    }
  }
}

function parseArgs(): BenchmarkConfig {
  const args = process.argv.slice(2);
  const config: BenchmarkConfig = {
    type: 'all',
    database: 'postgresql',
    dataSize: 100000,
    searchIterations: 1000,
    warmupIterations: 100,
    writeTestSize: 10000,
  };

  for (const arg of args) {
    if (arg.startsWith('--type=')) {
      config.type = arg.split('=')[1] as BenchmarkType;
    } else if (arg.startsWith('--database=')) {
      config.database = arg.split('=')[1] as DatabaseType;
    } else if (arg.startsWith('--model=')) {
      config.model = arg.split('=')[1] as ModelType;
    } else if (arg.startsWith('--data-size=')) {
      config.dataSize = Number.parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--iterations=')) {
      config.searchIterations = Number.parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--write-size=')) {
      config.writeTestSize = Number.parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--warmup-iterations=')) {
      config.warmupIterations = Number.parseInt(arg.split('=')[1]);
    }
  }

  return config;
}

async function main() {
  console.log('🚀 Database Tags Benchmark Starting...\n');

  const config = parseArgs();
  console.log('Configuration:', {
    type: config.type,
    database: config.database || 'postgresql',
    model: config.model || 'all',
    dataSize: config.dataSize,
    searchIterations: config.searchIterations,
  });

  const runner = new BenchmarkRunner();
  await runner.run(config);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
