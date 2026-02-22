import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { ControlPanel } from './components/control-panel/control-panel';
import { Simulator } from './components/simulator/simulator';
import { HeaderComponent } from '@db-astro-suite/ui';

@Component({
  selector: 'dba-sw-root',
  standalone: true,
  imports: [ControlPanel, Simulator, HeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  protected readonly title = signal('starwizz');
}
