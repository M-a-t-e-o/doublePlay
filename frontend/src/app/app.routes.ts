import { Routes } from '@angular/router';
import { PlaceholderRouteData } from './pages/placeholder/placeholder.component';

export const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		redirectTo: 'home'
	},
	{
		path: 'home',
		loadComponent: () =>
			import('./pages/home/home.component').then((m) => m.HomeComponent)
	},
	{
		path: 'login',
		loadComponent: () =>
			import('./pages/login/login.component').then((m) => m.LoginComponent)
	},
	{
		path: 'register',
		loadComponent: () =>
			import('./pages/register/register.component').then((m) => m.RegisterComponent)
	},
	{
		path: 'movies',
		loadComponent: () =>
			import('./pages/movies/movies.component').then((m) => m.MoviesComponent)
	},
	{
		path: 'games',
		loadComponent: () =>
			import('./pages/placeholder/placeholder.component').then((m) => m.PlaceholderComponent),
		data: {
			title: 'Games',
			subtitle: 'Catalogo de juegos, tendencias y ranking por comunidad.',
			ctaLabel: 'Explorar Home'
		} satisfies PlaceholderRouteData
	},
	{
		path: 'chatbot',
		loadComponent: () =>
			import('./pages/placeholder/placeholder.component').then((m) => m.PlaceholderComponent),
		data: {
			title: 'AI Chat',
			subtitle: 'Asistente para sugerencias de peliculas y juegos segun tus gustos.',
			ctaLabel: 'Volver al Inicio'
		} satisfies PlaceholderRouteData
	},
	{
		path: 'social',
		loadComponent: () =>
			import('./pages/placeholder/placeholder.component').then((m) => m.PlaceholderComponent),
		data: {
			title: 'Social',
			subtitle: 'Actividad de amigos, comentarios y listas compartidas.',
			ctaLabel: 'Volver al Inicio'
		} satisfies PlaceholderRouteData
	},
	{
		path: 'profile',
		loadComponent: () =>
			import('./pages/placeholder/placeholder.component').then((m) => m.PlaceholderComponent),
		data: {
			title: 'Profile',
			subtitle: 'Configuracion de usuario, preferencias y privacidad.',
			ctaLabel: 'Volver al Inicio'
		} satisfies PlaceholderRouteData
	},
	{
		path: 'admin',
		loadComponent: () =>
			import('./pages/placeholder/placeholder.component').then((m) => m.PlaceholderComponent),
		data: {
			title: 'Admin Panel',
			subtitle: 'Panel de control para moderacion y gestion de contenido.',
			ctaLabel: 'Volver al Inicio'
		} satisfies PlaceholderRouteData
	},
	{
		path: '**',
		redirectTo: 'home'
	}
];
