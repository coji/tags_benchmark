import type { DuckDBConnection } from '@duckdb/node-api';

export class DuckDBJsonbModel {
  constructor(private connection: DuckDBConnection) {}

  async setup() {
    // シーケンス作成
    await this.connection.run(
      'CREATE SEQUENCE IF NOT EXISTS person_jsonb_id_seq'
    );

    // テーブル作成
    await this.connection.run(`
      CREATE TABLE IF NOT EXISTS person_jsonb (
        id INTEGER PRIMARY KEY DEFAULT nextval('person_jsonb_id_seq'),
        name VARCHAR NOT NULL,
        tags JSON NOT NULL
      )
    `);
  }

  async insertPerson(
    name: string,
    tags: string[]
  ): Promise<{ id: number; name: string; tags: string[] }> {
    const reader = await this.connection.runAndReadAll(
      'INSERT INTO person_jsonb (name, tags) VALUES (?, ?) RETURNING id, name, tags',
      [name, JSON.stringify(tags)]
    );

    const row = reader.getRowObjects()[0] as {
      id: number;
      name: string;
      tags: string;
    };
    return {
      id: row.id,
      name: row.name,
      tags: JSON.parse(row.tags),
    };
  }

  async insertPersonsBatch(
    people: { name: string; tags: string[] }[]
  ): Promise<{ id: number; name: string; tags: string[] }[]> {
    const results: { id: number; name: string; tags: string[] }[] = [];

    for (const person of people) {
      const reader = await this.connection.runAndReadAll(
        'INSERT INTO person_jsonb (name, tags) VALUES (?, ?) RETURNING id, name, tags',
        [person.name, JSON.stringify(person.tags)]
      );

      const row = reader.getRowObjects()[0] as {
        id: number;
        name: string;
        tags: string;
      };
      results.push({
        id: row.id,
        name: row.name,
        tags: JSON.parse(row.tags),
      });
    }

    return results;
  }

  async updatePersonTags(personId: number, tags: string[]): Promise<void> {
    await this.connection.run('UPDATE person_jsonb SET tags = ? WHERE id = ?', [
      JSON.stringify(tags),
      personId,
    ]);
  }

  async searchByTag(tagName: string) {
    // DuckDBのJSON配列検索 - list_containsで配列内を検索
    const reader = await this.connection.runAndReadAll(
      `
      SELECT id, name, tags
      FROM person_jsonb 
      WHERE list_contains(CAST(tags AS VARCHAR[]), ?)
    `,
      [tagName]
    );

    return reader.getRowObjects().map((row: unknown) => {
      const r = row as { id: number; name: string; tags: string };
      return {
        id: r.id,
        name: r.name,
        tags: JSON.parse(r.tags),
      };
    });
  }

  async searchByTagsAnd(tagNames: string[]) {
    // すべてのタグが含まれているかチェック
    const conditions = tagNames
      .map(() => 'list_contains(CAST(tags AS VARCHAR[]), ?)')
      .join(' AND ');

    const reader = await this.connection.runAndReadAll(
      `
      SELECT id, name, tags
      FROM person_jsonb 
      WHERE ${conditions}
    `,
      tagNames
    );

    return reader.getRowObjects().map((row: unknown) => {
      const r = row as { id: number; name: string; tags: string };
      return {
        id: r.id,
        name: r.name,
        tags: JSON.parse(r.tags),
      };
    });
  }

  async searchByTagsOr(tagNames: string[]) {
    // いずれかのタグが含まれているかチェック
    const conditions = tagNames
      .map(() => 'list_contains(CAST(tags AS VARCHAR[]), ?)')
      .join(' OR ');

    const reader = await this.connection.runAndReadAll(
      `
      SELECT id, name, tags
      FROM person_jsonb 
      WHERE ${conditions}
    `,
      tagNames
    );

    return reader.getRowObjects().map((row: unknown) => {
      const r = row as { id: number; name: string; tags: string };
      return {
        id: r.id,
        name: r.name,
        tags: JSON.parse(r.tags),
      };
    });
  }

  async cleanup() {
    await this.connection.run('DELETE FROM person_jsonb');
  }
}
