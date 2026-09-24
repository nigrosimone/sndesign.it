import { ARTICLES } from './data/articles';
import { CONTRIBUTION_STATS, CONTRIBUTIONS } from './data/contributions';
import { OS_STATS, PACKAGES, PROJECTS } from './data/open-source';
import { EXPERIENCE, PROFILE, SKILL_GROUPS, SOCIALS } from './data/site-data';
import en from '../i18n/optimized/en.json';

const EN: Record<string, string> = en;
const experience = EXPERIENCE.map((job) => ({
  ...job,
  role: EN[`about.jobs.${job.id}.role`],
  description: EN[`about.jobs.${job.id}.desc`],
}));

const asResult = (data: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(data) }],
});

const tool = (name: string, description: string, data: unknown) => ({
  name,
  description,
  inputSchema: { type: 'object' as const, properties: {} },
  execute: () => asResult(data),
});

/**
 * WebMCP tools exposed to AI agents through Angular's experimental
 * provideExperimentalWebMcpTools API.
 */
export const WEBMCP_TOOLS = [
  tool(
    'get_profile',
    "Simone Nigro's professional profile: role, company, location, skills and work experience.",
    { ...PROFILE, skills: SKILL_GROUPS, experience },
  ),
  tool(
    'list_open_source_projects',
    "Simone Nigro's open source projects with GitHub stars and monthly npm downloads.",
    { stats: OS_STATS, projects: PROJECTS, npmPackages: PACKAGES },
  ),
  tool(
    'list_contributions',
    "Simone Nigro's merged pull requests in popular open source projects he does not maintain.",
    { stats: CONTRIBUTION_STATS, contributions: CONTRIBUTIONS },
  ),
  tool(
    'list_articles',
    "Technical articles published by Simone Nigro on DEV Community.",
    ARTICLES,
  ),
  tool('get_contacts', "Simone Nigro's contacts and social profiles.", {
    email: PROFILE.email,
    socials: SOCIALS,
  }),
];
