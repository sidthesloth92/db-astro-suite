import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardData, generateInstagramCaption } from '../../models/card-data';

@Component({
  selector: 'ac-caption-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="caption-container db-glass-panel">
      <!-- Interaction Icons -->
      <div class="post-interactions">
        <div class="left-icons">
          <span class="ig-icon">❤️</span>
          <span class="ig-icon">💬</span>
          <span class="ig-icon">✈️</span>
        </div>
        
        <div class="right-icons">
          <button 
            class="copy-icon-btn" 
            [class.copied]="copied"
            (click)="copyToClipboard()"
            [title]="copied ? 'Copied!' : 'Copy Caption'"
          >
            @if (copied) {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 text-green-400">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            } @else {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            }
          </button>
        </div>
      </div>

      <div class="caption-bubble">
        <div class="caption-content">
          <span class="username text-xs font-bold mr-2">{{ data.author || 'astrophotographer' }}</span>
          <pre class="caption-text">{{ formattedCaption }}</pre>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .caption-container {
      margin-top: 2px;
      padding: 0.5rem 0.75rem 1.25rem;
      border-top: none;
      border-radius: 0 0 12px 12px;
      position: relative;
    }
    .post-interactions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0.25rem 0.75rem;
    }
    .left-icons, .right-icons {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .ig-icon {
      font-size: 18px;
      cursor: pointer;
      filter: grayscale(0.2);
      transition: all 0.2s;
    }
    .ig-icon:hover {
      filter: grayscale(0);
      transform: scale(1.1);
    }
    .copy-icon-btn {
      width: 32px;
      height: 32px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: rgba(255, 255, 255, 0.8);
      cursor: pointer;
      border-radius: 50%;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }
    .copy-icon-btn:hover {
      background: rgba(0, 243, 255, 0.15);
      border-color: rgba(0, 243, 255, 0.4);
      color: #00f3ff;
      transform: scale(1.1);
      box-shadow: 0 0 12px rgba(0, 243, 255, 0.3);
    }
    .copy-icon-btn.copied {
      background: rgba(74, 222, 128, 0.15);
      border-color: rgba(74, 222, 128, 0.4);
      color: #4ade80;
      box-shadow: 0 0 12px rgba(74, 222, 128, 0.3);
    }
    .caption-bubble {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 0 0.25rem;
    }
    .caption-content {
      line-height: 1.5;
    }
    .username {
      color: white;
      font-weight: 700;
      float: left;
    }
    .caption-text {
      white-space: pre-wrap;
      word-wrap: break-word;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.9);
      margin: 0;
      padding: 0;
      font-family: inherit;
    }
  `]
})
export class CaptionSectionComponent {
  @Input() data!: CardData;
  copied = false;

  get formattedCaption(): string {
    return generateInstagramCaption(this.data);
  }

  async copyToClipboard() {
    try {
      await navigator.clipboard.writeText(this.formattedCaption);
      this.copied = true;
      setTimeout(() => this.copied = false, 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  }
}
