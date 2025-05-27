import { PrismaClient } from '@prisma/client';
import { NormalizedModel } from './models/normalized.js';
import { JsonbModel } from './models/jsonb.js';
import { ArrayModel } from './models/array.js';
import {
  PersonData,
  generatePeople,
  getTagPool,
} from './utils/data-generator.js';
import { Timer } from './utils/timer.js';

type ModelType = 'normalized' | 'jsonb' | 'array';
type BenchmarkType = 'search' | 'write' | 'all';

interface BenchmarkConfig {
  type: BenchmarkType;
  model?: ModelType;
  dataSize: number;
  searchIterations: number;
  warmupIterations: number;
  writeTestSize: number;
}

class BenchmarkRunner {
  private prisma: PrismaClient;
  private normalizedModel: NormalizedModel;
  private jsonbModel: JsonbModel;
  private arrayModel: ArrayModel;

  constructor() {
    this.prisma = new PrismaClient();
    this.normalizedModel = new NormalizedModel(this.prisma);
    this.jsonbModel = new JsonbModel(this.prisma);
    this.arrayModel = new ArrayModel(this.prisma);
  }

  private getModel(type: ModelType) {
    switch (type) {
      case 'normalized':
        return this.normalizedModel;
      case 'jsonb':
        return this.jsonbModel;
      case 'array':
        return this.arrayModel;
    }
  }

  async setupDatabase() {
    console.log('🔧 Setting up database...');
    await this.normalizedModel.setup();
    await this.jsonbModel.setup();
    await this.arrayModel.setup();
  }

  async seedData(modelType: ModelType, count: number) {
    console.log(`📝 Seeding ${count} records for ${modelType}...`);
    const model = this.getModel(modelType);
    const people = generatePeople(count);

    const batchSize = 1000;
    for (let i = 0; i < people.length; i += batchSize) {
      const batch = people.slice(i, i + batchSize);
      await model.insertPersonsBatch(batch);
    }
  }

  async runSearchBenchmark(config: BenchmarkConfig, modelType: ModelType) {
    console.log(`\n=== SEARCH BENCHMARK: ${modelType.toUpperCase()} ===`);
    const model = this.getModel(modelType);

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
        `${testCase.name}: avg=${Timer.formatMs(
          result.avg
        )}, p50=${Timer.formatMs(result.p50)}, p95=${Timer.formatMs(
          result.p95
        )} (${result.count} queries)`
      );
    }
  }

  async runWriteBenchmark(config: BenchmarkConfig, modelType: ModelType) {
    console.log(`\n=== WRITE BENCHMARK: ${modelType.toUpperCase()} ===`);
    const model = this.getModel(modelType);

    // Single insert test
    const singleTimer = new Timer();
    const singleTestData = generatePeople(config.writeTestSize);

    for (const person of singleTestData) {
      await singleTimer.measure(() =>
        model.insertPerson(person.name, person.tags)
      );
    }

    const singleResult = singleTimer.getResult();
    console.log(`Single insert: ${Timer.formatMs(singleResult.avg)}/record`);

    // Batch insert test
    const batchTimer = new Timer();
    const batchTestData = generatePeople(config.writeTestSize);

    await batchTimer.measure(() => model.insertPersonsBatch(batchTestData));

    const batchResult = batchTimer.getResult();
    const batchAvgPerRecord = batchResult.avg / config.writeTestSize;
    console.log(`Batch insert: ${Timer.formatMs(batchAvgPerRecord)}/record`);

    // Update test
    const updateTimer = new Timer();
    const existingIds = Array.from(
      { length: config.writeTestSize },
      (_, i) => i + 1
    );

    for (const id of existingIds) {
      const newTags = generatePeople(1)[0].tags;
      await updateTimer.measure(async () => {
        await model.updatePersonTags(id, newTags);
      });
    }

    const updateResult = updateTimer.getResult();
    console.log(`Update tags: ${Timer.formatMs(updateResult.avg)}/record`);
  }

  async cleanupData() {
    console.log('🧹 Cleaning up data...');
    await this.normalizedModel.cleanup();
    await this.jsonbModel.cleanup();
    await this.arrayModel.cleanup();
  }

  async run(config: BenchmarkConfig) {
    try {
      await this.setupDatabase();

      const modelsToTest: ModelType[] = config.model
        ? [config.model]
        : ['normalized', 'jsonb', 'array'];

      for (const modelType of modelsToTest) {
        await this.cleanupData();
        await this.seedData(modelType, config.dataSize);

        if (config.type === 'search' || config.type === 'all') {
          await this.runSearchBenchmark(config, modelType);
        }

        if (config.type === 'write' || config.type === 'all') {
          await this.runWriteBenchmark(config, modelType);
        }
      }

      console.log('\n✅ Benchmark completed successfully!');
    } catch (error) {
      console.error('❌ Benchmark failed:', error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }
}

function parseArgs(): BenchmarkConfig {
  const args = process.argv.slice(2);
  const config: BenchmarkConfig = {
    type: 'all',
    dataSize: 10000,
    searchIterations: 1000,
    warmupIterations: 100,
    writeTestSize: 1000,
  };

  for (const arg of args) {
    if (arg.startsWith('--type=')) {
      config.type = arg.split('=')[1] as BenchmarkType;
    } else if (arg.startsWith('--model=')) {
      config.model = arg.split('=')[1] as ModelType;
    } else if (arg.startsWith('--data-size=')) {
      config.dataSize = Number.parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--iterations=')) {
      config.searchIterations = Number.parseInt(arg.split('=')[1]);
    }
  }

  return config;
}

async function main() {
  console.log('🚀 PostgreSQL Tags Benchmark Starting...\n');

  const config = parseArgs();
  console.log('Configuration:', {
    type: config.type,
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
