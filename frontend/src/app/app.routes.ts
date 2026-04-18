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
		path: 'movies/:id',
		loadComponent: () =>
			import('./pages/movie-detail/movie-detail.component').then((m) => m.MovieDetailComponent)
	},
	{
		path: 'games',
		loadComponent: () =>
			import('./pages/games/games.component').then((m) => m.GamesComponent)
	},
	{
		path: 'games/:id',
		loadComponent: () =>
			import('./pages/game-detail/game-detail.component').then((m) => m.GameDetailComponent)
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
			import('./pages/social/social.component').then((m) => m.SocialComponent)
	},
	{
		path: 'profile',
		loadComponent: () =>
			import('./pages/profile/profile.component').then((m) => m.ProfileComponent)
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
