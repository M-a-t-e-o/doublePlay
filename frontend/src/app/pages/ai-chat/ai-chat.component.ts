import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { SidebarComponent } from '../../core/components/sidebar/sidebar.component';
import { SearchDropdownComponent } from '../../core/components/search-dropdown/search-dropdown.component';

export interface AIChatRouteData {
  title: string;
  subtitle: string;
  ctaLabel: string;
}

interface AIChatViewModel extends AIChatRouteData {
  apiPath: string;
}

type ChatRole = 'assistant' | 'user' | 'system';

type ChatMessage = {
  role: ChatRole;
  text: string;
  time: string;
};

type QuickPrompt = {
  label: string;
  prompt: string;
};

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, SearchDropdownComponent],
  templateUrl: './ai-chat.component.html',
  styleUrl: './ai-chat.component.scss'
})
export class AIChatComponent implements OnInit {
  private readonly api = environment.apiUrl;
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly welcomeMessage =
    'Hey! I\'m your doublePlay AI assistant. I can recommend movies and games based on your taste.';

  @ViewChild('messagesViewport') private messagesViewport?: ElementRef<HTMLElement>;
  @ViewChild('bottomAnchor') private bottomAnchor?: ElementRef<HTMLElement>;

  readonly quickPrompts: QuickPrompt[] = [
    { label: 'Sci-Fi', prompt: 'Recommend me a sci-fi movie and a sci-fi game.' },
    { label: 'Fantasy', prompt: 'I want a fantasy recommendation.' },
    { label: 'Horror', prompt: 'Recommend something scary and atmospheric.' },
    { label: 'Action', prompt: 'Give me an action movie or game with a lot of energy.' },
    { label: 'RPG', prompt: 'Suggest a role-playing game I should try.' }
  ];

  pageData: AIChatViewModel = {
    title: 'doublePlay AI',
    subtitle: 'Online · Ready to recommend',
    ctaLabel: 'Ask for a recommendation',
    apiPath: `${this.api}/ai/generate`
  };

  messages: ChatMessage[] = [];
  promptText = '';
  isSending = false;
  errorMessage = '';

  get avatarCacheBust(): number {
    return this.authService.getAvatarCacheBustValue();
  }

  get currentUserAvatarUrl(): string {
    const userId = this.authService.getUserIdFromToken();
    if (userId) {
      return `${this.api}/auth/profile-picture/${userId}?t=${this.avatarCacheBust}`;
    }

    return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(this.avatarSeed)}`;
  }

  get avatarSeed(): string {
    const userId = this.authService.getUserIdFromToken() || 'unknown';
    const userName = this.authService.getUserName() || 'user';
    return `${userId}-${userName}`;
  }

  handleCurrentUserAvatarError(event: Event): void {
    const target = event.target as HTMLImageElement | null;
    if (!target) return;

    target.src = `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(this.avatarSeed)}`;
  }

  ngOnInit(): void {
    const data = this.route.snapshot.data as Partial<AIChatRouteData>;
    const defaults: AIChatRouteData = {
      title: 'doublePlay AI',
      subtitle: 'Online · Ready to recommend',
      ctaLabel: 'Ask for a recommendation'
    };
    const routeData = { ...defaults, ...data };

    this.pageData = {
      ...routeData,
      apiPath: `${this.api}/ai/generate`
    };

    this.messages = [
      {
        role: 'assistant',
        text: this.welcomeMessage,
        time: '10:45'
      }
    ];
  }

  sendQuickPrompt(prompt: string): void {
    this.promptText = prompt;
    this.sendPrompt();
  }

  sendPrompt(): void {
    const trimmedPrompt = this.promptText.trim();
    if (!trimmedPrompt || this.isSending) {
      return;
    }

    this.errorMessage = '';
    this.messages = [...this.messages, this.buildMessage('user', trimmedPrompt)];
    this.promptText = '';
    this.isSending = true;
    this.scrollToBottom();

    this.http.post<{ response: string }>(`${this.api}/ai/generate`, { user_prompt: trimmedPrompt }).subscribe({
      next: (response) => {
        this.messages = [...this.messages, this.buildMessage('assistant', response.response || this.welcomeMessage)];
        this.isSending = false;
        this.scrollToBottom();
      },
      error: () => {
        this.messages = [
          ...this.messages,
          this.buildMessage('system', 'I could not reach the recommendation engine right now. Please try again in a moment.')
        ];
        this.errorMessage = 'No se pudo conectar con el asistente de IA.';
        this.isSending = false;
      }
    });
  }

  private buildMessage(role: ChatRole, text: string): ChatMessage {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    return { role, text, time: timeStr };
  }

  private scrollToBottom(): void {
    if (this.bottomAnchor?.nativeElement) {
      setTimeout(() => {
        this.bottomAnchor?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 0);
    }
  }

  trackByIndex(index: number): number {
    return index;
  }
}
