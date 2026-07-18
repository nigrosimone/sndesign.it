import { ARTICLES } from './data/articles';
import { OS_STATS, PACKAGES, PROJECTS } from './data/open-source';
import { PROFILE, SKILL_GROUPS, SOCIALS } from './data/site-data';

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
 * Tool WebMCP esposti agli agenti AI tramite l'API sperimentale di Angular
 * (provideExperimentalWebMcpTools). Le descrizioni sono in inglese per
 * massimizzare l'interoperabilità con gli agenti.
 */
export const WEBMCP_TOOLS = [
  tool(
    'get_profile',
    "Simone Nigro's professional profile: role, company, location and skills.",
    { ...PROFILE, skills: SKILL_GROUPS },
  ),
  tool(
    'list_open_source_projects',
    "Simone Nigro's open source projects with GitHub stars and monthly npm downloads.",
    { stats: OS_STATS, projects: PROJECTS, npmPackages: PACKAGES },
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
