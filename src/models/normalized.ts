import type { PrismaClient } from '@prisma/client';

export class NormalizedModel {
  constructor(private prisma: PrismaClient) {}

  async setup() {
    // インデックスはPrismaスキーマで定義済み
  }

  async insertPerson(name: string, tags: string[]) {
    return await this.prisma.$transaction(async (tx) => {
      const person = await tx.person.create({
        data: { name },
      });

      for (const tagName of tags) {
        let tag = await tx.tag.findUnique({ where: { name: tagName } });
        if (!tag) {
          tag = await tx.tag.create({ data: { name: tagName } });
        }

        await tx.personTag.create({
          data: {
            personId: person.id,
            tagId: tag.id,
          },
        });
      }

      return person;
    });
  }

  async insertPersonsBatch(people: { name: string; tags: string[] }[]) {
    return await this.prisma.$transaction(async (tx) => {
      const allTagNames = [...new Set(people.flatMap((p) => p.tags))];

      const existingTags = await tx.tag.findMany({
        where: { name: { in: allTagNames } },
      });

      const existingTagMap = new Map(
        existingTags.map((tag) => [tag.name, tag.id])
      );

      const newTagNames = allTagNames.filter(
        (name) => !existingTagMap.has(name)
      );
      if (newTagNames.length > 0) {
        const newTags = await Promise.all(
          newTagNames.map((name) => tx.tag.create({ data: { name } }))
        );
        for (const tag of newTags) {
          existingTagMap.set(tag.name, tag.id);
        }
      }

      const persons = await tx.person.createManyAndReturn({
        data: people.map((p) => ({ name: p.name })),
      });

      const personTagData = [];
      for (let i = 0; i < people.length; i++) {
        const person = persons[i];
        const tags = people[i].tags;
        for (const tagName of tags) {
          personTagData.push({
            personId: person.id,
            // biome-ignore lint/style/noNonNullAssertion: <explanation>
            tagId: existingTagMap.get(tagName)!,
          });
        }
      }

      await tx.personTag.createMany({ data: personTagData });
      return persons;
    });
  }

  async updatePersonTags(personId: number, tags: string[]) {
    return await this.prisma.$transaction(async (tx) => {
      await tx.personTag.deleteMany({ where: { personId } });

      for (const tagName of tags) {
        let tag = await tx.tag.findUnique({ where: { name: tagName } });
        if (!tag) {
          tag = await tx.tag.create({ data: { name: tagName } });
        }

        await tx.personTag.create({
          data: { personId, tagId: tag.id },
        });
      }
    });
  }

  async searchByTag(tagName: string) {
    return await this.prisma.person.findMany({
      where: {
        personTags: {
          some: {
            tag: { name: tagName },
          },
        },
      },
      include: {
        personTags: {
          include: { tag: true },
        },
      },
    });
  }

  async searchByTagsAnd(tagNames: string[]) {
    return await this.prisma.person.findMany({
      where: {
        AND: tagNames.map((tagName) => ({
          personTags: {
            some: {
              tag: { name: tagName },
            },
          },
        })),
      },
      include: {
        personTags: {
          include: { tag: true },
        },
      },
    });
  }

  async searchByTagsOr(tagNames: string[]) {
    return await this.prisma.person.findMany({
      where: {
        personTags: {
          some: {
            tag: { name: { in: tagNames } },
          },
        },
      },
      include: {
        personTags: {
          include: { tag: true },
        },
      },
    });
  }

  async cleanup() {
    await this.prisma.personTag.deleteMany();
    await this.prisma.person.deleteMany();
    await this.prisma.tag.deleteMany();
  }
}
