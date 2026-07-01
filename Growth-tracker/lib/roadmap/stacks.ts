// lib/roadmap/stacks.ts
// Curated learning stacks users can pick from to personalise their 96-week roadmap.

export type TaskCategory =
  | 'coding'
  | 'product'
  | 'documentation'
  | 'portfolio'
  | 'community'
  | 'design'
  | 'career'

export interface StackConfig {
  id: string
  name: string
  category: TaskCategory
  description: string
  topics: string[]
  projectIdeas: string[]
  resources: { title: string; url: string }[]
}

export const STACKS: StackConfig[] = [
  {
    id: 'react',
    name: 'React',
    category: 'coding',
    description: 'Component-based UI library for modern web apps.',
    topics: [
      'JSX and components', 'Hooks (useState, useEffect, useContext)', 'Custom hooks',
      'Performance (memo, useMemo, useCallback)', 'Suspense and lazy loading',
      'Error boundaries', 'Portals and refs', 'Testing with React Testing Library',
    ],
    projectIdeas: [
      'Todo app with hooks', 'Movie search with Suspense', 'Custom hook library',
      'Multi-step form wizard', 'Real-time dashboard',
    ],
    resources: [
      { title: 'React docs', url: 'https://react.dev' },
      { title: 'Epic React', url: 'https://epicreact.dev' },
    ],
  },
  {
    id: 'nextjs',
    name: 'Next.js',
    category: 'coding',
    description: 'React framework for production-grade applications.',
    topics: [
      'App Router', 'Server Components', 'Data fetching patterns', 'Middleware',
      'API routes', 'Static and dynamic rendering', 'Caching strategies',
      'Authentication patterns', 'Deployment on Vercel',
    ],
    projectIdeas: [
      'Blog with MDX', 'SaaS landing page', 'Auth-protected dashboard',
      'E-commerce storefront', 'Real-time collaboration app',
    ],
    resources: [
      { title: 'Next.js docs', url: 'https://nextjs.org/docs' },
      { title: 'Vercel learn', url: 'https://nextjs.org/learn' },
    ],
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    category: 'coding',
    description: 'Typed JavaScript for safer, scalable code.',
    topics: [
      'Types vs interfaces', 'Generics', 'Utility types', 'Type narrowing',
      'Discriminated unions', 'Declaration files', 'TSConfig deep dive',
      'Type-safe APIs', 'Zod runtime validation',
    ],
    projectIdeas: [
      'Type-safe API client', 'CLI tool in TS', 'Library with .d.ts',
      'Refactor JS codebase to TS', 'Schema validation project',
    ],
    resources: [
      { title: 'TypeScript docs', url: 'https://www.typescriptlang.org/docs' },
      { title: 'Total TypeScript', url: 'https://www.totaltypescript.com' },
    ],
  },
  {
    id: 'tailwind',
    name: 'Tailwind CSS',
    category: 'design',
    description: 'Utility-first CSS framework for rapid UI development.',
    topics: [
      'Utility classes', 'Responsive design', 'Dark mode', 'Custom config',
      'Tailwind plugins', 'Animations', 'Component extraction patterns',
      'Design tokens', 'Tailwind v4 features',
    ],
    projectIdeas: [
      'Landing page clone', 'Design system', 'Animated UI kit',
      'Responsive dashboard', 'Portfolio site',
    ],
    resources: [
      { title: 'Tailwind docs', url: 'https://tailwindcss.com/docs' },
      { title: 'Tailwind UI', url: 'https://tailwindui.com' },
    ],
  },
  {
    id: 'nodejs',
    name: 'Node.js',
    category: 'coding',
    description: 'JavaScript runtime for scalable backend services.',
    topics: [
      'Event loop', 'Streams and buffers', 'File system', 'HTTP servers',
      'Express/Fastify', 'Authentication (JWT, sessions)', 'WebSockets',
      'Error handling', 'Clustering and performance',
    ],
    projectIdeas: [
      'REST API', 'WebSocket chat', 'CLI automation', 'Microservice',
      'File processing pipeline',
    ],
    resources: [
      { title: 'Node.js docs', url: 'https://nodejs.org/en/docs' },
      { title: 'Node Design Patterns', url: 'https://nodejsdesignpatterns.com' },
    ],
  },
  {
    id: 'python',
    name: 'Python',
    category: 'coding',
    description: 'Versatile language for backend, data and AI tooling.',
    topics: [
      'Python basics', 'OOP in Python', 'Asyncio', 'FastAPI',
      'Data processing with Pandas', 'Scripting', 'Testing with pytest',
      'Environment management', 'Type hints',
    ],
    projectIdeas: [
      'FastAPI backend', 'Data scraper', 'Automation script',
      'CLI tool', 'ML model wrapper',
    ],
    resources: [
      { title: 'Python docs', url: 'https://docs.python.org/3' },
      { title: 'FastAPI docs', url: 'https://fastapi.tiangolo.com' },
    ],
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    category: 'coding',
    description: 'Powerful open-source relational database.',
    topics: [
      'Schema design', 'Indexes and query planning', 'Joins and CTEs',
      'Transactions', 'Triggers and functions', 'JSONB',
      'Full-text search', 'Row-level security', 'Migrations',
    ],
    projectIdeas: [
      'Schema for SaaS', 'Analytics queries', 'Search implementation',
      'Multi-tenant design', 'Audit log with triggers',
    ],
    resources: [
      { title: 'PostgreSQL docs', url: 'https://www.postgresql.org/docs' },
      { title: 'Use The Index, Luke', url: 'https://use-the-index-luke.com' },
    ],
  },
  {
    id: 'ai-llm',
    name: 'AI / LLMs',
    category: 'product',
    description: 'Build intelligent features with large language models.',
    topics: [
      'Prompt engineering', 'RAG pipelines', 'Embeddings', 'Vector databases',
      'OpenAI / Anthropic APIs', 'Function calling', 'Agents',
      'Fine-tuning basics', 'AI product UX',
    ],
    projectIdeas: [
      'AI writing assistant', 'RAG chatbot', 'Semantic search',
      'Meeting summariser', 'Code reviewer agent',
    ],
    resources: [
      { title: 'OpenAI docs', url: 'https://platform.openai.com/docs' },
      { title: 'LangChain docs', url: 'https://python.langchain.com' },
    ],
  },
  {
    id: 'docker',
    name: 'Docker',
    category: 'coding',
    description: 'Containerise and ship applications consistently.',
    topics: [
      'Images and containers', 'Dockerfile best practices', 'Multi-stage builds',
      'Docker Compose', 'Volumes and networks', 'Container registries',
      'Health checks', 'Kubernetes basics',
    ],
    projectIdeas: [
      'Containerised full-stack app', 'Local dev environment',
      'CI/CD pipeline', 'Microservices setup',
    ],
    resources: [
      { title: 'Docker docs', url: 'https://docs.docker.com' },
      { title: 'Docker Mastery', url: 'https://www.udemy.com/course/docker-mastery' },
    ],
  },
  {
    id: 'aws',
    name: 'AWS Cloud',
    category: 'coding',
    description: 'Cloud infrastructure and serverless patterns.',
    topics: [
      'IAM and security', 'S3 and storage', 'EC2 and compute', 'Lambda',
      'API Gateway', 'RDS and DynamoDB', 'CloudFront', 'Infrastructure as Code',
    ],
    projectIdeas: [
      'Serverless API', 'Static site hosting', 'Image processing pipeline',
      'Event-driven architecture', 'Cost-optimised deployment',
    ],
    resources: [
      { title: 'AWS docs', url: 'https://docs.aws.amazon.com' },
      { title: 'AWS Skill Builder', url: 'https://skillbuilder.aws' },
    ],
  },
  {
    id: 'figma',
    name: 'Figma',
    category: 'design',
    description: 'Interface design and prototyping tool.',
    topics: [
      'Frames and auto-layout', 'Components and variants', 'Design systems',
      'Prototyping', 'Responsive constraints', 'Styles and tokens',
      'Developer handoff', 'Accessibility in design',
    ],
    projectIdeas: [
      'Mobile app UI', 'Design system', 'Landing page mockup',
      'Interactive prototype', 'Icon set',
    ],
    resources: [
      { title: 'Figma docs', url: 'https://help.figma.com' },
      { title: 'DesignCode', url: 'https://designcode.io' },
    ],
  },
  {
    id: 'ux',
    name: 'UX Design',
    category: 'design',
    description: 'User research and experience design fundamentals.',
    topics: [
      'User research', 'Personas and journeys', 'Information architecture',
      'Wireframing', 'Usability testing', 'Accessibility (a11y)',
      'Conversion optimisation', 'Design critiques',
    ],
    projectIdeas: [
      'UX case study', 'Heuristic evaluation', 'Usability test plan',
      'Redesign proposal', 'Accessibility audit',
    ],
    resources: [
      { title: 'Nielsen Norman', url: 'https://www.nngroup.com' },
      { title: 'Refactoring UI', url: 'https://refactoringui.com' },
    ],
  },
]

export function getStack(id: string): StackConfig | undefined {
  return STACKS.find((s) => s.id === id)
}

export function getStacksByCategory(category: TaskCategory): StackConfig[] {
  return STACKS.filter((s) => s.category === category)
}

export const STACK_CATEGORIES: { value: TaskCategory; label: string }[] = [
  { value: 'coding', label: 'Engineering' },
  { value: 'product', label: 'Product & AI' },
  { value: 'design', label: 'Design' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'community', label: 'Community' },
  { value: 'career', label: 'Career' },
]
