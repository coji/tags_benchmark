import type { DuckDBConnection } from '@duckdb/node-api';

export class DuckDBArrayModel {
  constructor(private connection: DuckDBConnection) {}

  async setup() {
    // シーケンス作成
    await this.connection.run(
      'CREATE SEQUENCE IF NOT EXISTS person_array_id_seq'
    );

    // テーブル作成
    await this.connection.run(`
      CREATE TABLE IF NOT EXISTS person_array (
        id INTEGER PRIMARY KEY DEFAULT nextval('person_array_id_seq'),
        name VARCHAR NOT NULL,
        tags VARCHAR[] NOT NULL
      )
    `);
  }

  async insertPerson(
    name: string,
    tags: string[]
  ): Promise<{ id: number; name: string; tags: string[] }> {
    const placeholders = tags.map(() => '?').join(',');
    const reader = await this.connection.runAndReadAll(
      `INSERT INTO person_array (name, tags) VALUES (?, [${placeholders}]) RETURNING id, name, tags`,
      [name, ...tags]
    );

    return reader.getRowObjects()[0] as unknown as {
      id: number;
      name: string;
      tags: string[];
    };
  }

  async insertPersonsBatch(
    people: { name: string; tags: string[] }[]
  ): Promise<{ id: number; name: string; tags: string[] }[]> {
    const results: { id: number; name: string; tags: string[] }[] = [];

    for (const person of people) {
      const placeholders = person.tags.map(() => '?').join(',');
      const reader = await this.connection.runAndReadAll(
        `INSERT INTO person_array (name, tags) VALUES (?, [${placeholders}]) RETURNING id, name, tags`,
        [person.name, ...person.tags]
      );

      results.push(
        reader.getRowObjects()[0] as unknown as {
          id: number;
          name: string;
          tags: string[];
        }
      );
    }

    return results;
  }

  async updatePersonTags(personId: number, tags: string[]): Promise<void> {
    const placeholders = tags.map(() => '?').join(',');
    await this.connection.run(
      `UPDATE person_array SET tags = [${placeholders}] WHERE id = ?`,
      [...tags, personId]
    );
  }

  async searchByTag(tagName: string) {
    // DuckDBの配列検索: array_contains関数を使用
    const reader = await this.connection.runAndReadAll(
      `
      SELECT id, name, tags
      FROM person_array 
      WHERE array_contains(tags, ?)
    `,
      [tagName]
    );

    return reader.getRowObjects() as unknown as {
      id: number;
      name: string;
      tags: string[];
    }[];
  }

  async searchByTagsAnd(tagNames: string[]) {
    // すべてのタグが含まれているかチェック
    const conditions = tagNames
      .map(() => 'array_contains(tags, ?)')
      .join(' AND ');

    const reader = await this.connection.runAndReadAll(
      `
      SELECT id, name, tags
      FROM person_array 
      WHERE ${conditions}
    `,
      tagNames
    );

    return reader.getRowObjects() as unknown as {
      id: number;
      name: string;
      tags: string[];
    }[];
  }

  async searchByTagsOr(tagNames: string[]) {
    // いずれかのタグが含まれているかチェック
    const conditions = tagNames
      .map(() => 'array_contains(tags, ?)')
      .join(' OR ');

    const reader = await this.connection.runAndReadAll(
      `
      SELECT id, name, tags
      FROM person_array 
      WHERE ${conditions}
    `,
      tagNames
    );

    return reader.getRowObjects() as unknown as {
      id: number;
      name: string;
      tags: string[];
    }[];
  }

  async cleanup() {
    await this.connection.run('DELETE FROM person_array');
  }
}
