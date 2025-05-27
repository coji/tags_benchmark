import type { PrismaClient } from '@prisma/client';

export class JsonbModel {
  constructor(private prisma: PrismaClient) {}

  async setup() {
    // インデックスはPrismaスキーマで定義済み
  }

  async insertPerson(name: string, tags: string[]) {
    return await this.prisma.personJsonb.create({
      data: {
        name,
        tags: tags,
      },
    });
  }

  async insertPersonsBatch(people: { name: string; tags: string[] }[]) {
    return await this.prisma.personJsonb.createManyAndReturn({
      data: people.map((p) => ({
        name: p.name,
        tags: p.tags,
      })),
    });
  }

  async updatePersonTags(personId: number, tags: string[]) {
    return await this.prisma.personJsonb.update({
      where: { id: personId },
      data: { tags },
    });
  }

  async searchByTag(tagName: string) {
    return await this.prisma.personJsonb.findMany({
      where: {
        tags: {
          array_contains: [tagName],
        },
      },
    });
  }

  async searchByTagsAnd(tagNames: string[]) {
    return await this.prisma.personJsonb.findMany({
      where: {
        tags: {
          array_contains: tagNames,
        },
      },
    });
  }

  async searchByTagsOr(tagNames: string[]) {
    const conditions = tagNames.map((tag) => ({
      tags: { array_contains: [tag] },
    }));

    return await this.prisma.personJsonb.findMany({
      where: {
        OR: conditions,
      },
    });
  }

  async cleanup() {
    await this.prisma.personJsonb.deleteMany();
  }
}
