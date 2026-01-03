import { Component, signal } from '@angular/core';
import { ControlPanel } from './components/control-panel/control-panel';
import { Simulator } from './components/simulator/simulator';
import { HeaderComponent } from './components/header/header';

@Component({
  selector: 'sfg-root',
  standalone: true,
  imports: [ControlPanel, Simulator, HeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('starwizz');
}
