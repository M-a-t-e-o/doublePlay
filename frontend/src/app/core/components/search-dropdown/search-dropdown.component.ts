import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SearchService, SearchResult } from '../../services/search.service';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-search-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-dropdown.component.html',
  styleUrl: './search-dropdown.component.scss'
})
export class SearchDropdownComponent implements OnDestroy {
  @Input() placeholder = 'Search movies, games...';
  @Input() label = 'Search';

  searchQuery = '';
  results: SearchResult[] = [];
  isOpen = false;
  isSearching = false;
  selectedIndex = -1;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private searchService: SearchService,
    private router: Router
  ) {
    this.searchSubject
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe((query) => {
        if (query.trim().length > 0) {
          this.performSearch(query);
        } else {
          this.results = [];
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchInputChange(query: string): void {
    this.selectedIndex = -1;
    this.searchQuery = query;
    this.searchSubject.next(query);
  }

  onFocus(): void {
    this.isOpen = true;
  }

  onBlur(): void {
    // Delay to allow click on dropdown items
    setTimeout(() => {
      this.isOpen = false;
    }, 200);
  }

  onKeyDown(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (!this.isOpen || this.results.length === 0) return;

    switch (keyboardEvent.key) {
      case 'ArrowDown':
        keyboardEvent.preventDefault();
        this.selectedIndex = (this.selectedIndex + 1) % this.results.length;
        break;
      case 'ArrowUp':
        keyboardEvent.preventDefault();
        this.selectedIndex = this.selectedIndex <= 0 ? this.results.length - 1 : this.selectedIndex - 1;
        break;
      case 'Enter':
        keyboardEvent.preventDefault();
        if (this.selectedIndex >= 0 && this.results[this.selectedIndex]) {
          this.selectResult(this.results[this.selectedIndex]);
        }
        break;
      case 'Escape':
        keyboardEvent.preventDefault();
        this.isOpen = false;
        this.searchQuery = '';
        break;
    }
  }

  selectResult(result: SearchResult): void {
    this.searchQuery = '';
    this.results = [];
    this.isOpen = false;

    if (result.type === 'movie') {
      this.router.navigate(['/movies', result.id]);
    } else {
      this.router.navigate(['/games', result.id]);
    }
  }

  private performSearch(query: string): void {
    this.isSearching = true;
    this.searchService.search(query)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          this.results = results;
          this.isSearching = false;
        },
        error: () => {
          this.results = [];
          this.isSearching = false;
        }
      });
  }
}
