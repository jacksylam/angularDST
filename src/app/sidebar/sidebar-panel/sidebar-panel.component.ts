import { Component, OnInit } from '@angular/core';
import {animate, transition, state, trigger, style} from '@angular/core';

@Component({
  selector: 'app-sidebar-panel',
  templateUrl: './sidebar-panel.component.html',
  styleUrls: ['./sidebar-panel.component.css'],
  animations: [
    trigger('movePanel', [
         state('active', style({
        transform: 'translate(10px, 0px)',
      })),
      state('inactive', style({
        transform: 'translate(-172px, 0px)',
      })),
      transition('active => inactive', animate('500ms ease-in-out')),
      transition('inactive => active', animate('500ms ease-in-out'))
    ]),
  ]
})
export class SidebarPanelComponent implements OnInit {
  state = 'inactive';
  
  constructor() { }

  ngOnInit() {
  }

  toggleMenu() {
    this.state = (this.state == 'inactive' ? 'active' : 'inactive');
  }

  

}
