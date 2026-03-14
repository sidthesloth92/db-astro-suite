import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { HeaderComponent } from '@db-astro-suite/ui';
import packageJson from '../../../../package.json';
import { ControlPanel } from './components/control-panel/control-panel';
import { Simulator } from './components/simulator/simulator';

@Component({
  selector: 'dba-sw-root',
  standalone: true,
  imports: [ControlPanel, Simulator, HeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly title = signal('starwizz');
  appVersion = packageJson.version || '1.0.0';
}
