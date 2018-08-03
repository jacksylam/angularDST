import { Component, OnInit, animate, transition, state, trigger, style, } from '@angular/core';
import {WindowService} from '../../window/shared/window.service'
import {WindowPanel} from '../../window/shared/windowPanel'

@Component({
  selector: 'app-sidebar-menu',
  templateUrl: './sidebar-menu.component.html',
  styleUrls: ['./sidebar-menu.component.css'],
})

export class SidebarMenuComponent implements OnInit {
  state = 'inactive';

  constructor(private windowService: WindowService) { }

  ngOnInit() {
    this.createNewMap(true);
  }

  toggleMenu() {
    this.state = (this.state == 'inactive' ? 'active' : 'inactive');
  }

  createNewMap(reset = false) {
    //console.log(SidebarMenuComponent.isFirstVisit)
    let newWindow = new WindowPanel("Map", "map", {});
    this.windowService.addWindow(newWindow, -1, reset);
  }
}
