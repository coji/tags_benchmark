const TAG_POOL = [
  'engineer',
  'remote', 
  'frontend',
  'backend',
  'manager',
  'senior',
  'junior',
  'fullstack',
  'devops',
  'qa',
  'designer',
  'product',
  'marketing',
  'sales',
  'support'
];

export interface PersonData {
  name: string;
  tags: string[];
}

function getRandomTags(): string[] {
  const tagCount = Math.floor(Math.random() * 11) + 5; // 5-15 tags
  const shuffled = [...TAG_POOL].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, tagCount);
}

export function generatePeople(count: number): PersonData[] {
  const people: PersonData[] = [];

  for (let i = 1; i <= count; i++) {
    people.push({
      name: `Person ${i}`,
      tags: getRandomTags(),
    });
  }

  return people;
}

export function getTagPool(): string[] {
  return [...TAG_POOL];
}
