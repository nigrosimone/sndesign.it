export const PROFILE = {
  name: 'Simone Nigro',
  role: 'Full-Stack Developer',
  company: 'ACCA software S.p.A.',
  location: 'Avellino, Campania, Italia',
  email: 'nigro.simone@gmail.com',
  sinceYear: 1984,
  siteUrl: 'https://www.sndesign.it/',
} as const;

export const SOCIALS = [
  { label: 'github', name: 'GitHub', url: 'https://github.com/nigrosimone' },
  { label: 'npm', name: 'npm', url: 'https://www.npmjs.com/~nigro.simone' },
  { label: 'dev.to', name: 'DEV Community', url: 'https://dev.to/nigrosimone' },
  { label: 'linkedin', name: 'LinkedIn', url: 'https://www.linkedin.com/in/simonenigro/' },
  { label: 'wordpress', name: 'WordPress.org', url: 'https://profiles.wordpress.org/nigrosimone/' },
] as const;

export const SKILL_GROUPS = [
  {
    labelKey: 'about.groups.frontend',
    skills: ['Angular', 'TypeScript', 'JavaScript', 'RxJS', 'Signals', 'HTML5', 'CSS / SCSS'],
  },
  {
    labelKey: 'about.groups.backend',
    skills: ['Node.js', 'Express', 'PHP', 'PostgreSQL', 'MySQL', 'Delphi'],
  },
  {
    labelKey: 'about.groups.other',
    skills: ['WordPress', 'Web Performance', 'SEO', 'Accessibility', 'Open Source', 'WebMCP'],
  },
] as const;
