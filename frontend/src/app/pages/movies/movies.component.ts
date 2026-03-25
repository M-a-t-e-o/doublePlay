import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface Movie {
  id: string;
  title: string;
  genre: string[];
  rating: number;
  views: number;
  description: string;
  posterUrl: string;
  releaseDate: Date;
}

type SortOption = 'stars' | 'views' | 'title' | 'releaseDate';
type FilterGenre = 'All' | string;

type NavItem = {
  label: string;
  route: string;
};

@Component({
  selector: 'app-movies',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './movies.component.html',
  styleUrl: './movies.component.scss'
})
export class MoviesComponent implements OnInit {
  movies: Movie[] = [];
  filteredMovies: Movie[] = [];
  
  searchQuery: string = '';
  selectedGenre: FilterGenre = 'All';
  sortBy: SortOption = 'stars';
  
  genres: FilterGenre[] = [
    'All',
    'Action',
    'Sci-Fi',
    'Fantasy',
    'RPG',
    'Horror',
    'Adventure',
    'Thriller',
    'FPS',
    'Drama',
    'Strategy'
  ];

  readonly navItems: NavItem[] = [
    { label: 'Home', route: '/home' },
    { label: 'Movies', route: '/movies' },
    { label: 'Games', route: '/games' },
    { label: 'AI Chat', route: '/chatbot' },
    { label: 'Social', route: '/social' },
    { label: 'Profile', route: '/profile' },
    { label: 'Admin Panel', route: '/admin' }
  ];

  // Mock data - reemplazar con datos del backend
  readonly mockMovies: Movie[] = [
    {
      id: '1',
      title: 'Echoes of the Void',
      genre: ['Sci-Fi'],
      rating: 4.7,
      views: 128,
      description: 'A deep-space crew discovers a derelict station hiding humanity\'s darkest secret.',
      posterUrl: 'https://picsum.photos/250/400?random=1',
      releaseDate: new Date('2024-11-15')
    },
    {
      id: '2',
      title: 'Parallel Lines',
      genre: ['Drama'],
      rating: 4.6,
      views: 83,
      description: 'Two strangers, living in parallel timelines, realize they must discover the truth.',
      posterUrl: 'https://picsum.photos/250/400?random=2',
      releaseDate: new Date('2024-09-22')
    },
    {
      id: '3',
      title: 'Neon Horizon',
      genre: ['Thriller'],
      rating: 4.5,
      views: 95,
      description: 'In a rain-soaked megacity, a detective uncovers a conspiracy that shakes the city.',
      posterUrl: 'https://picsum.photos/250/400?random=3',
      releaseDate: new Date('2024-10-08')
    },
    {
      id: '4',
      title: 'Forsaken Realm',
      genre: ['Fantasy'],
      rating: 4.3,
      views: 74,
      description: 'An exiled knight returns to a kingdom ruled by shadow magic and ancient curses.',
      posterUrl: 'https://picsum.photos/250/400?random=4',
      releaseDate: new Date('2024-08-30')
    },
    {
      id: '5',
      title: 'The Last Signal',
      genre: ['Horror'],
      rating: 4.1,
      views: 62,
      description: 'A radio astronomer intercepts a signal from a dying star—but the message is alive.',
      posterUrl: 'https://picsum.photos/250/400?random=5',
      releaseDate: new Date('2024-07-12')
    },
    {
      id: '6',
      title: 'Void Protocol',
      genre: ['Action', 'Sci-Fi'],
      rating: 4.4,
      views: 110,
      description: 'Secret agents must infiltrate an orbital station before time runs out.',
      posterUrl: 'https://picsum.photos/250/400?random=6',
      releaseDate: new Date('2024-12-01')
    },
    {
      id: '7',
      title: 'Crimson Dawn',
      genre: ['Adventure'],
      rating: 4.2,
      views: 78,
      description: 'A treasure hunter explores ancient ruins and awakens something better left buried.',
      posterUrl: 'https://picsum.photos/250/400?random=7',
      releaseDate: new Date('2024-06-15')
    },
    {
      id: '8',
      title: 'Silent Echo',
      genre: ['Drama', 'Thriller'],
      rating: 4.0,
      views: 56,
      description: 'In a world without sound, communication becomes the most dangerous weapon.',
      posterUrl: 'https://picsum.photos/250/400?random=8',
      releaseDate: new Date('2024-05-20')
    }
  ];

  ngOnInit(): void {
    this.movies = this.mockMovies;
    this.applyFiltersAndSort();
  }

  onGenreFilter(genre: FilterGenre): void {
    this.selectedGenre = genre;
    this.applyFiltersAndSort();
  }

  onSortChange(sort: SortOption): void {
    this.sortBy = sort;
    this.applyFiltersAndSort();
  }

  applyFiltersAndSort(): void {
    let filtered = [...this.movies];

    // Aplicar búsqueda
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query)
      );
    }

    // Aplicar filtro de género
    if (this.selectedGenre !== 'All') {
      filtered = filtered.filter(m =>
        m.genre.some(g => g.toLowerCase() === this.selectedGenre.toLowerCase())
      );
    }

    // Aplicar ordenamiento
    switch (this.sortBy) {
      case 'stars':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'views':
        filtered.sort((a, b) => b.views - a.views);
        break;
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'releaseDate':
        filtered.sort((a, b) => b.releaseDate.getTime() - a.releaseDate.getTime());
        break;
    }

    this.filteredMovies = filtered;
  }

  getStarArray(rating: number): number[] {
    const fullStars = Math.floor(rating);
    return Array(fullStars).fill(0);
  }

  formatViews(views: number): string {
    if (views >= 1000) {
      return (views / 1000).toFixed(0) + 'k';
    }
    return views.toString();
  }

  trackByMovieId(_: number, movie: Movie): string {
    return movie.id;
  }

  trackByRoute(_: number, item: NavItem): string {
    return item.route;
  }
}
