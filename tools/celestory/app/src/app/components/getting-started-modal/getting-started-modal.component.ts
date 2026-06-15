import {
  ChangeDetectionStrategy,
  Component,
  computed,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconButtonComponent, TextButtonComponent } from '@db-astro-suite/ui';
import {
  INSTALL_COMMANDS,
  INSTALL_LABELS,
  SCAN_COMMAND,
} from '../../models/landing.constants';
import type { InstallTool } from '../../models/landing.types';
import { copyToClipboard } from '../../utils/clipboard.util';

/**
 * "Create Your Own Celestory" onboarding modal shown from the Demo Viewer state.
 * Walks a new user through installing the CLI, generating their celestory.json,
 * and uploading it. Never enters publishing (a demo has no data to publish).
 */
@Component({
  selector: 'dba-getting-started-modal',
  standalone: true,
  imports: [RouterLink, TextButtonComponent, IconButtonComponent],
  templateUrl: './getting-started-modal.component.html',
  styleUrl: './getting-started-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GettingStartedModalComponent {
  /** Emits when the modal should close. */
  readonly closed = output<void>();

  /** Selected CLI install channel. */
  protected readonly installTool = signal<InstallTool>('brew');
  /** Install command for the selected channel. */
  protected readonly installCommand = computed(() => INSTALL_COMMANDS[this.installTool()]);
  /** Tab labels per install channel. */
  protected readonly installLabels = INSTALL_LABELS;
  /** Scan command shown in step 2. */
  protected readonly scanCommand = SCAN_COMMAND;
  /** Which copy button last flashed "Copied". */
  protected readonly copied = signal('');

  /** Switches the displayed install channel. */
  selectInstall(tool: InstallTool): void {
    this.installTool.set(tool);
  }

  /** Copies text and flashes a "Copied" state for the given key. */
  copy(key: string, text: string): void {
    void copyToClipboard(text).then((ok) => {
      if (!ok) {
        return;
      }
      this.copied.set(key);
      setTimeout(() => {
        if (this.copied() === key) {
          this.copied.set('');
        }
      }, 1400);
    });
  }

  /** Closes when the backdrop itself is clicked. */
  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }
}
