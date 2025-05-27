import type { DuckDBConnection } from '@duckdb/node-api';

export class DuckDBNormalizedModel {
  constructor(private connection: DuckDBConnection) {}

  async setup() {
    // シーケンス作成
    await this.connection.run('CREATE SEQUENCE IF NOT EXISTS person_id_seq');
    await this.connection.run('CREATE SEQUENCE IF NOT EXISTS tag_id_seq');

    // テーブル作成
    await this.connection.run(`
      CREATE TABLE IF NOT EXISTS person (
        id INTEGER PRIMARY KEY DEFAULT nextval('person_id_seq'),
        name VARCHAR NOT NULL
      )
    `);

    await this.connection.run(`
      CREATE TABLE IF NOT EXISTS tag (
        id INTEGER PRIMARY KEY DEFAULT nextval('tag_id_seq'),
        name VARCHAR UNIQUE NOT NULL
      )
    `);

    await this.connection.run(`
      CREATE TABLE IF NOT EXISTS person_tag (
        person_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (person_id, tag_id),
        FOREIGN KEY (person_id) REFERENCES person(id),
        FOREIGN KEY (tag_id) REFERENCES tag(id)
      )
    `);
  }

  async insertPerson(
    name: string,
    tags: string[]
  ): Promise<{ id: number; name: string }> {
    await this.connection.run('BEGIN TRANSACTION');

    try {
      // Person挿入
      const reader = await this.connection.runAndReadAll(
        'INSERT INTO person (name) VALUES (?) RETURNING id, name',
        [name]
      );
      const person = reader.getRowObjects()[0] as { id: number; name: string };

      // タグ処理
      for (const tagName of tags) {
        // タグ存在確認または作成
        const tagReader = await this.connection.runAndReadAll(
          'SELECT id FROM tag WHERE name = ?',
          [tagName]
        );

        let tagId: number;
        if (tagReader.getRowObjects().length === 0) {
          const newTagReader = await this.connection.runAndReadAll(
            'INSERT INTO tag (name) VALUES (?) RETURNING id',
            [tagName]
          );
          tagId = (newTagReader.getRowObjects()[0] as { id: number }).id;
        } else {
          tagId = (tagReader.getRowObjects()[0] as { id: number }).id;
        }

        // Person-Tag関連付け
        await this.connection.run(
          'INSERT INTO person_tag (person_id, tag_id) VALUES (?, ?)',
          [person.id, tagId]
        );
      }

      await this.connection.run('COMMIT');
      return person;
    } catch (error) {
      await this.connection.run('ROLLBACK');
      throw error;
    }
  }

  async insertPersonsBatch(
    people: { name: string; tags: string[] }[]
  ): Promise<{ id: number; name: string }[]> {
    await this.connection.run('BEGIN TRANSACTION');

    try {
      const allTagNames = [...new Set(people.flatMap((p) => p.tags))];

      // 既存タグ取得
      const existingTagsReader = await this.connection.runAndReadAll(
        `SELECT id, name FROM tag WHERE name IN (${allTagNames
          .map(() => '?')
          .join(',')})`,
        allTagNames
      );

      const existingTagMap = new Map<string, number>();
      for (const row of existingTagsReader.getRowObjects()) {
        const tagRow = row as { id: number; name: string };
        existingTagMap.set(tagRow.name, tagRow.id);
      }

      // 新しいタグ作成
      const newTagNames = allTagNames.filter(
        (name) => !existingTagMap.has(name)
      );
      for (const tagName of newTagNames) {
        const reader = await this.connection.runAndReadAll(
          'INSERT INTO tag (name) VALUES (?) RETURNING id',
          [tagName]
        );
        const tagId = (reader.getRowObjects()[0] as { id: number }).id;
        existingTagMap.set(tagName, tagId);
      }

      // Person一括挿入
      const persons: { id: number; name: string }[] = [];
      for (const person of people) {
        const reader = await this.connection.runAndReadAll(
          'INSERT INTO person (name) VALUES (?) RETURNING id, name',
          [person.name]
        );
        persons.push(reader.getRowObjects()[0] as { id: number; name: string });
      }

      // Person-Tag関連付け一括挿入
      for (let i = 0; i < people.length; i++) {
        const person = persons[i];
        const tags = people[i].tags;
        for (const tagName of tags) {
          const tagId = existingTagMap.get(tagName);
          if (tagId) {
            await this.connection.run(
              'INSERT INTO person_tag (person_id, tag_id) VALUES (?, ?)',
              [person.id, tagId]
            );
          }
        }
      }

      await this.connection.run('COMMIT');
      return persons;
    } catch (error) {
      await this.connection.run('ROLLBACK');
      throw error;
    }
  }

  async updatePersonTags(personId: number, tags: string[]): Promise<void> {
    await this.connection.run('BEGIN TRANSACTION');

    try {
      // 既存の関連付けを削除
      await this.connection.run('DELETE FROM person_tag WHERE person_id = ?', [
        personId,
      ]);

      // 新しいタグを追加
      for (const tagName of tags) {
        const tagReader = await this.connection.runAndReadAll(
          'SELECT id FROM tag WHERE name = ?',
          [tagName]
        );

        let tagId: number;
        if (tagReader.getRowObjects().length === 0) {
          const newTagReader = await this.connection.runAndReadAll(
            'INSERT INTO tag (name) VALUES (?) RETURNING id',
            [tagName]
          );
          tagId = (newTagReader.getRowObjects()[0] as { id: number }).id;
        } else {
          tagId = (tagReader.getRowObjects()[0] as { id: number }).id;
        }

        await this.connection.run(
          'INSERT INTO person_tag (person_id, tag_id) VALUES (?, ?)',
          [personId, tagId]
        );
      }

      await this.connection.run('COMMIT');
    } catch (error) {
      await this.connection.run('ROLLBACK');
      throw error;
    }
  }

  async searchByTag(tagName: string) {
    const reader = await this.connection.runAndReadAll(
      `
      SELECT DISTINCT p.id, p.name 
      FROM person p
      JOIN person_tag pt ON p.id = pt.person_id
      JOIN tag t ON pt.tag_id = t.id
      WHERE t.name = ?
    `,
      [tagName]
    );

    return reader.getRowObjects() as { id: number; name: string }[];
  }

  async searchByTagsAnd(tagNames: string[]) {
    const placeholders = tagNames.map(() => '?').join(',');
    const reader = await this.connection.runAndReadAll(
      `
      SELECT p.id, p.name
      FROM person p
      WHERE (
        SELECT COUNT(DISTINCT t.name)
        FROM person_tag pt
        JOIN tag t ON pt.tag_id = t.id
        WHERE pt.person_id = p.id AND t.name IN (${placeholders})
      ) = ?
    `,
      [...tagNames, tagNames.length]
    );

    return reader.getRowObjects() as { id: number; name: string }[];
  }

  async searchByTagsOr(tagNames: string[]) {
    const placeholders = tagNames.map(() => '?').join(',');
    const reader = await this.connection.runAndReadAll(
      `
      SELECT DISTINCT p.id, p.name 
      FROM person p
      JOIN person_tag pt ON p.id = pt.person_id
      JOIN tag t ON pt.tag_id = t.id
      WHERE t.name IN (${placeholders})
    `,
      tagNames
    );

    return reader.getRowObjects() as { id: number; name: string }[];
  }

  async cleanup() {
    await this.connection.run('DELETE FROM person_tag');
    await this.connection.run('DELETE FROM person');
    await this.connection.run('DELETE FROM tag');
  }
}
