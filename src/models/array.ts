import type { PrismaClient } from '@prisma/client';

export class ArrayModel {
  constructor(private prisma: PrismaClient) {}

  async setup() {
    await this.prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_person_tags_gin ON persons_array USING gin(tags);
    `;
  }

  async insertPerson(name: string, tags: string[]) {
    return await this.prisma.personArray.create({
      data: {
        name,
        tags,
      },
    });
  }

  async insertPersonsBatch(people: { name: string; tags: string[] }[]) {
    return await this.prisma.personArray.createManyAndReturn({
      data: people.map((p) => ({
        name: p.name,
        tags: p.tags,
      })),
    });
  }

  async updatePersonTags(personId: number, tags: string[]) {
    return await this.prisma.personArray.update({
      where: { id: personId },
      data: { tags },
    });
  }

  async searchByTag(tagName: string) {
    return await this.prisma.personArray.findMany({
      where: {
        tags: {
          has: tagName,
        },
      },
    });
  }

  async searchByTagsAnd(tagNames: string[]) {
    return await this.prisma.personArray.findMany({
      where: {
        tags: {
          hasEvery: tagNames,
        },
      },
    });
  }

  async searchByTagsOr(tagNames: string[]) {
    return await this.prisma.personArray.findMany({
      where: {
        tags: {
          hasSome: tagNames,
        },
      },
    });
  }

  async cleanup() {
    await this.prisma.personArray.deleteMany();
  }
}
