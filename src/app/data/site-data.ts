export const PROFILE = {
  name: 'Simone Nigro',
  role: 'Full-Stack Developer',
  company: 'ACCA software S.p.A.',
  location: 'Avellino, Campania, Italia',
  email: 'nigro.simone@gmail.com',
  bornYear: 1984,
  codingSinceYear: 2000,
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
    skills: ['Angular', 'TypeScript', 'JavaScript', 'RxJS', 'Signals', 'HTML5', 'CSS / SCSS'],
  },
  {
    labelKey: 'about.groups.backend',
    skills: ['Node.js', 'Express', 'PHP'],
  },
  {
    labelKey: 'about.groups.other',
    skills: ['PostgreSQL', 'MySQL', 'Delphi', 'WordPress', 'Web Performance', 'SEO', 'Accessibility', 'Open Source', 'WebMCP'],
  },
] as const;
