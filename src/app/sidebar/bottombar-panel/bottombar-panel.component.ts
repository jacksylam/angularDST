import { Component, OnInit } from '@angular/core';
import {animate, transition, state, trigger, style} from '@angular/core';

@Component({
  selector: 'app-bottombar-panel',
  templateUrl: './bottombar-panel.component.html',
  styleUrls: ['./bottombar-panel.component.css'],
  animations: [
    trigger('movePanel', [
         state('active', style({
        transform: 'translate(0px, 160px)',
      })),
      state('inactive', style({
        transform: 'translate( 0px, -150px)',
      })),
      transition('active => inactive', animate('500ms ease-in-out')),
      transition('inactive => active', animate('500ms ease-in-out'))
    ]),
  ]
})
export class BottombarPanelComponent implements OnInit {
  state = 'inactive';
  
  constructor() { }

  ngOnInit() {
  }

  toggleMenu() {
    this.state = (this.state == 'inactive' ? 'active' : 'inactive');
  }

}
