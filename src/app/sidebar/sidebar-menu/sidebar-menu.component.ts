import { Component, OnInit, animate, transition, state, trigger, style, } from '@angular/core';
import {WindowService} from '../../window/shared/window.service'
import {WindowPanel} from '../../window/shared/windowPanel'

@Component({
  selector: 'app-sidebar-menu',
  templateUrl: './sidebar-menu.component.html',
  styleUrls: ['./sidebar-menu.component.css'],
  animations: [
    trigger('movePanel', [
      state('active', style({
        transform: 'translate(0px, 0px)',
      })),
      state('inactive', style({
        transform: 'translate(-172px, 0px)',
      })),
      transition('active => inactive', animate('500ms ease-in-out')),
      transition('inactive => active', animate('500ms ease-in-out'))
    ]),
  ]
})
export class SidebarMenuComponent implements OnInit {
  state = 'inactive';

  constructor(private windowService: WindowService) { }

  ngOnInit() {
  }

  toggleMenu() {
    this.state = (this.state == 'inactive' ? 'active' : 'inactive');
  }

  createNewMap(){
    var newWindow = new WindowPanel("Map", "map", {});
    this.windowService.addWindow(newWindow);
  }
}
