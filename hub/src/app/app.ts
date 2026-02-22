import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'dba-hub-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App {}
