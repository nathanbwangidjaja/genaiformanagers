import { PrismaClient, MathDomain, NodeDepth, BloomLevel, QuestionType, PrereqType } from "@prisma/client";

const prisma = new PrismaClient();

type StandardSeed = {
  code: string;
  name: string;
  description?: string;
  difficulty?: number;
  bloom?: BloomLevel;
  prerequisites?: string[]; // codes of nodes that must come first
};

type DomainSeed = {
  code: string;
  name: string;
  domain: MathDomain;
  standards: StandardSeed[];
};

const CURRICULUM: DomainSeed[] = [
  {
    code: "7.RP",
    name: "Ratios & Proportional Relationships",
    domain: "RATIOS_PROPORTIONAL",
    standards: [
      { code: "7.RP.1", name: "Unit Rates with Fractions", description: "Compute unit rates associated with ratios of fractions.", difficulty: 2.5, bloom: "APPLY" },
      { code: "7.RP.2", name: "Proportional Relationships", description: "Recognize and represent proportional relationships between quantities.", difficulty: 3.0, bloom: "ANALYZE", prerequisites: ["7.RP.1"] },
      { code: "7.RP.2b", name: "Constant of Proportionality", description: "Identify the constant of proportionality.", difficulty: 3.2, bloom: "APPLY", prerequisites: ["7.RP.2"] },
      { code: "7.RP.3", name: "Multi-step Ratio & Percent Problems", description: "Use proportional relationships to solve multi-step ratio and percent problems.", difficulty: 3.8, bloom: "APPLY", prerequisites: ["7.RP.2", "7.RP.2b"] },
      { code: "7.RP.3a", name: "Multi-step Ratios", description: "Solve word problems involving ratios with multiple steps.", difficulty: 4.0, bloom: "APPLY", prerequisites: ["7.RP.3"] },
    ],
  },
  {
    code: "7.NS",
    name: "The Number System",
    domain: "NUMBER_SYSTEM",
    standards: [
      { code: "7.NS.1", name: "Integer Operations", description: "Apply and extend previous understandings of addition and subtraction.", difficulty: 2.5, bloom: "APPLY" },
      { code: "7.NS.1d", name: "Adding Rational Numbers", description: "Add rational numbers with different signs.", difficulty: 3.5, bloom: "APPLY", prerequisites: ["7.NS.1"] },
      { code: "7.NS.2", name: "Multiplying & Dividing Rationals", description: "Apply and extend previous understandings of multiplication and division.", difficulty: 3.5, bloom: "APPLY", prerequisites: ["7.NS.1d"] },
      { code: "7.NS.2d", name: "Convert Fractions/Decimals", description: "Convert a rational number to a decimal using long division.", difficulty: 3.0, bloom: "APPLY", prerequisites: ["7.NS.2"] },
      { code: "7.NS.3", name: "Real-World Rational Number Problems", description: "Solve real-world problems with the four operations on rational numbers.", difficulty: 4.0, bloom: "APPLY", prerequisites: ["7.NS.2"] },
    ],
  },
  {
    code: "7.EE",
    name: "Expressions & Equations",
    domain: "EXPRESSIONS_EQUATIONS",
    standards: [
      { code: "7.EE.1", name: "Linear Expressions", description: "Apply properties to add, subtract, factor, and expand linear expressions.", difficulty: 3.0, bloom: "APPLY", prerequisites: ["7.NS.1d"] },
      { code: "7.EE.2", name: "Equivalent Expressions", description: "Understand that rewriting an expression in different forms reveals new info.", difficulty: 3.2, bloom: "ANALYZE", prerequisites: ["7.EE.1"] },
      { code: "7.EE.3", name: "Multi-step Real-World Problems", description: "Solve multi-step real-world problems with positive and negative rationals.", difficulty: 3.8, bloom: "APPLY", prerequisites: ["7.NS.3", "7.EE.1"] },
      { code: "7.EE.4", name: "Solve Equations & Inequalities", description: "Use variables to represent quantities and solve equations.", difficulty: 3.5, bloom: "APPLY", prerequisites: ["7.EE.1"] },
      { code: "7.EE.4b", name: "Inequalities", description: "Solve word problems leading to inequalities of the form px+q > r.", difficulty: 4.0, bloom: "APPLY", prerequisites: ["7.EE.4"] },
    ],
  },
  {
    code: "7.G",
    name: "Geometry",
    domain: "GEOMETRY",
    standards: [
      { code: "7.G.1", name: "Scale Drawings", description: "Solve problems involving scale drawings of geometric figures.", difficulty: 3.0, bloom: "APPLY", prerequisites: ["7.RP.2"] },
      { code: "7.G.2", name: "Constructing Shapes", description: "Draw geometric shapes with given conditions.", difficulty: 2.8, bloom: "APPLY" },
      { code: "7.G.3", name: "Cross Sections of 3D", description: "Describe the 2D figures that result from slicing 3D figures.", difficulty: 3.2, bloom: "ANALYZE" },
      { code: "7.G.4", name: "Circumference & Area of Circles", description: "Know the formulas for area and circumference of a circle.", difficulty: 3.0, bloom: "APPLY" },
      { code: "7.G.5", name: "Angle Relationships", description: "Use facts about supplementary, complementary, vertical, and adjacent angles.", difficulty: 3.0, bloom: "APPLY" },
      { code: "7.G.6", name: "Area, Volume, Surface Area", description: "Solve real-world problems involving area, volume, and surface area.", difficulty: 3.5, bloom: "APPLY", prerequisites: ["7.G.4"] },
    ],
  },
  {
    code: "7.SP",
    name: "Statistics & Probability",
    domain: "STATISTICS_PROBABILITY",
    standards: [
      { code: "7.SP.1", name: "Random Sampling", description: "Understand statistics can be used to gain information about a population.", difficulty: 2.5, bloom: "UNDERSTAND" },
      { code: "7.SP.2", name: "Inferences from Samples", description: "Use data from a random sample to draw inferences about a population.", difficulty: 3.5, bloom: "ANALYZE", prerequisites: ["7.SP.1"] },
      { code: "7.SP.3", name: "Comparing Distributions", description: "Informally assess the degree of visual overlap of two numerical data distributions.", difficulty: 3.5, bloom: "ANALYZE", prerequisites: ["7.SP.2"] },
      { code: "7.SP.5", name: "Probability of Chance Events", description: "Understand that the probability of a chance event is a number between 0 and 1.", difficulty: 2.8, bloom: "UNDERSTAND" },
      { code: "7.SP.7", name: "Probability Models", description: "Develop a probability model and use it to find probabilities of events.", difficulty: 3.5, bloom: "APPLY", prerequisites: ["7.SP.5"] },
      { code: "7.SP.8", name: "Compound Events", description: "Find probabilities of compound events using lists, tables, tree diagrams, simulation.", difficulty: 4.0, bloom: "APPLY", prerequisites: ["7.SP.7"] },
    ],
  },
];

const SAMPLE_QUESTIONS: Array<{
  standardCode: string;
  text: string;
  options: { value: string; correct: boolean }[];
  difficulty: number;
  expectedTimeSec: number;
  hints: string[];
  commonErrors?: Record<string, string>;
}> = [
  {
    standardCode: "7.RP.1",
    text: "A car travels 240 miles in 4 hours. What is its unit rate (mph)?",
    options: [
      { value: "40 mph", correct: false },
      { value: "60 mph", correct: true },
      { value: "80 mph", correct: false },
      { value: "120 mph", correct: false },
    ],
    difficulty: 2.0,
    expectedTimeSec: 60,
    hints: ["Unit rate = total distance / total time.", "240 ÷ 4 = ?"],
    commonErrors: { "40 mph": "computational", "80 mph": "computational", "120 mph": "conceptual" },
  },
  {
    standardCode: "7.RP.2b",
    text: "If 3 notebooks cost $7.50, how much do 8 notebooks cost?",
    options: [
      { value: "$18.00", correct: false },
      { value: "$20.00", correct: true },
      { value: "$22.50", correct: false },
      { value: "$24.00", correct: false },
    ],
    difficulty: 3.0,
    expectedTimeSec: 90,
    hints: ["Find the unit price (cost per one notebook) first.", "$7.50 ÷ 3 = $2.50 per notebook. Now multiply by 8."],
    commonErrors: { "$18.00": "computational", "$22.50": "conceptual", "$24.00": "conceptual" },
  },
  {
    standardCode: "7.RP.3",
    text: "A jacket is on sale for 20% off. After tax (8%), the final price is $43.20. What was the original price?",
    options: [
      { value: "$45.00", correct: false },
      { value: "$48.00", correct: false },
      { value: "$50.00", correct: true },
      { value: "$54.00", correct: false },
    ],
    difficulty: 4.5,
    expectedTimeSec: 180,
    hints: ["Work backwards: undo the tax first.", "$43.20 ÷ 1.08 = $40 (sale price). Then divide by 0.8 to undo the discount."],
  },
  {
    standardCode: "7.NS.1d",
    text: "What is (-7) + 4?",
    options: [
      { value: "-11", correct: false },
      { value: "-3", correct: true },
      { value: "3", correct: false },
      { value: "11", correct: false },
    ],
    difficulty: 2.5,
    expectedTimeSec: 30,
    hints: ["Think about a number line. Start at -7 and move 4 units right."],
    commonErrors: { "-11": "conceptual", "3": "conceptual", "11": "conceptual" },
  },
  {
    standardCode: "7.EE.1",
    text: "Simplify: 3(2x + 4) - x",
    options: [
      { value: "5x + 12", correct: true },
      { value: "5x + 4", correct: false },
      { value: "6x + 12", correct: false },
      { value: "7x + 12", correct: false },
    ],
    difficulty: 3.0,
    expectedTimeSec: 60,
    hints: ["Distribute the 3 first, then combine like terms."],
  },
  {
    standardCode: "7.G.4",
    text: "What is the circumference of a circle with radius 5? (Use π ≈ 3.14)",
    options: [
      { value: "15.7", correct: false },
      { value: "31.4", correct: true },
      { value: "78.5", correct: false },
      { value: "25.0", correct: false },
    ],
    difficulty: 2.8,
    expectedTimeSec: 60,
    hints: ["Circumference = 2πr.", "2 × 3.14 × 5 = ?"],
    commonErrors: { "15.7": "conceptual", "78.5": "conceptual" },
  },
  {
    standardCode: "7.SP.5",
    text: "If you flip a fair coin, what is the probability of heads?",
    options: [
      { value: "0", correct: false },
      { value: "0.25", correct: false },
      { value: "0.5", correct: true },
      { value: "1", correct: false },
    ],
    difficulty: 1.5,
    expectedTimeSec: 20,
    hints: ["A fair coin has 2 equally likely outcomes."],
  },
];

async function main() {
  console.log("seeding curriculum...");

  await prisma.curriculumPrerequisite.deleteMany();
  await prisma.question.deleteMany();
  await prisma.curriculumNode.deleteMany();

  const codeToId = new Map<string, string>();

  for (const dom of CURRICULUM) {
    const cluster = await prisma.curriculumNode.create({
      data: {
        code: dom.code,
        name: dom.name,
        domain: dom.domain,
        depth: "CLUSTER",
        gradeLevel: 7,
        difficultyBaseline: 3.0,
      },
    });
    codeToId.set(dom.code, cluster.id);

    for (const std of dom.standards) {
      const node = await prisma.curriculumNode.create({
        data: {
          code: std.code,
          name: std.name,
          description: std.description,
          domain: dom.domain,
          depth: "STANDARD",
          gradeLevel: 7,
          difficultyBaseline: std.difficulty ?? 3.0,
          bloomLevel: std.bloom,
          parentId: cluster.id,
        },
      });
      codeToId.set(std.code, node.id);
    }
  }

  for (const dom of CURRICULUM) {
    for (const std of dom.standards) {
      if (!std.prerequisites) continue;
      for (const prereqCode of std.prerequisites) {
        const sourceId = codeToId.get(prereqCode);
        const targetId = codeToId.get(std.code);
        if (!sourceId || !targetId) continue;
        await prisma.curriculumPrerequisite.create({
          data: {
            sourceNodeId: sourceId,
            targetNodeId: targetId,
            strength: 1.0,
            relationshipType: "HARD",
          },
        });
      }
    }
  }

  console.log(`created ${codeToId.size} curriculum nodes`);

  for (const q of SAMPLE_QUESTIONS) {
    const nodeId = codeToId.get(q.standardCode);
    if (!nodeId) continue;
    await prisma.question.create({
      data: {
        curriculumNodeId: nodeId,
        content: { text: q.text, options: q.options },
        questionType: "MULTIPLE_CHOICE",
        difficulty: q.difficulty,
        expectedTimeSec: q.expectedTimeSec,
        hints: q.hints,
        commonErrors: q.commonErrors ?? {},
      },
    });
  }

  console.log(`created ${SAMPLE_QUESTIONS.length} sample questions`);
  console.log("done");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
