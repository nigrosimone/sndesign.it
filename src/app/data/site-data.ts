import type { Experience } from './types';

export const PROFILE = {
  name: 'Simone Nigro',
  role: 'Full-Stack Developer',
  company: 'ACCA software S.p.A.',
  location: 'Avellino, Campania, Italia',
  email: 'nigro.simone@gmail.com',
  bornYear: 1984,
  codingSinceYear: 1999,
  siteUrl: 'https://www.sndesign.it/',
} as const;

export const SOCIALS = [
  { label: 'github', name: 'GitHub', url: 'https://github.com/nigrosimone' },
  { label: 'npm', name: 'npm', url: 'https://www.npmjs.com/~nigro.simone' },
  { label: 'dev.to', name: 'DEV Community', url: 'https://dev.to/nigrosimone' },
  { label: 'stackoverflow', name: 'Stack Overflow', url: 'https://stackoverflow.com/users/3043248/simone-nigro' },
  { label: 'openjs', name: 'OpenJS Foundation', url: 'https://insights.linuxfoundation.org/collection/details/ojsf/contributors' },
  { label: 'linkedin', name: 'LinkedIn', url: 'https://www.linkedin.com/in/simonenigro/' },
  { label: 'wordpress', name: 'WordPress.org', url: 'https://profiles.wordpress.org/nigrosimone/' },
] as const;

export const SKILL_GROUPS = [
  {
    labelKey: 'about.groups.frontend',
    skills: ['Angular', 'TypeScript', 'JavaScript', 'React', 'RxJS', 'Signals', 'HTML5', 'CSS / SCSS'],
  },
  {
    labelKey: 'about.groups.backend',
    skills: ['Node.js', 'Express', 'PHP', 'Delphi'],
  },
  {
    labelKey: 'about.groups.database',
    skills: ['PostgreSQL', 'SQL Server', 'MySQL', 'MongoDB', 'Elasticsearch'],
  },
  {
    labelKey: 'about.groups.infra',
    skills: ['nginx', 'Apache', 'IIS', 'Redis', 'Varnish', 'CDN', 'Docker', 'Git', 'GitLab CI/CD'],
  },
  {
    labelKey: 'about.groups.testing',
    skills: ['Jest', 'Cypress', 'Karma'],
  },
  {
    labelKey: 'about.groups.other',
    skills: ['Web Performance', 'AI coding agents', 'MCP', 'WebMCP', 'WordPress', 'SEO', 'Accessibility', 'Open Source'],
  },
] as const;

// Role and description are in i18n under about.jobs.<id>.
export const EXPERIENCE: readonly Experience[] = [
  { id: 'acca', company: 'ACCA software S.p.A.', from: 2011 },
  { id: 'estrogeni', company: 'Estrogeni srl', from: 2010, to: 2011 },
  { id: 'teacher', company: 'ITI Sarrocchi', from: 2009, to: 2010 },
  { id: 'freelance', company: 'SN.DESIGN', from: 2004, to: 2011 },
  { id: 'degree', company: 'Università degli Studi di Salerno', from: 2003, to: 2008 },
];
