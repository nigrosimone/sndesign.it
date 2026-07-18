import { Routes } from '@angular/router';
import { Site } from './components/site/site';

export const routes: Routes = [
  { path: '', component: Site, data: { lang: 'it' } },
  { path: 'en', component: Site, data: { lang: 'en' } },
];
