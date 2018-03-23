import { Component, OnInit } from '@angular/core';
import {animate, transition, state, trigger, style} from '@angular/core';
import {MapService} from '../../map/shared/map.service';

@Component({
  selector: 'app-sidebar-panel',
  templateUrl: './sidebar-panel.component.html',
  styleUrls: ['./sidebar-panel.component.css'],
  animations: [
    trigger('movePanel', [
         state('active', style({
        transform: 'translate(50px, 0px)',
      })),
      state('inactive', style({
        transform: 'translate(00px, 0px)',
      })),
      transition('active => inactive', animate('500ms ease-in-out')),
      transition('inactive => active', animate('500ms ease-in-out'))
    ]),
  ]
})


export class SidebarPanelComponent implements OnInit {
  state = 'inactive';

  layer = "landcover";

  constructor(private mapService: MapService) { }

  ngOnInit() {
    this.mapService.setButtonPanel(this);
  }

  toggleMenu() {
    this.state = (this.state == 'inactive' ? 'active' : 'inactive');
  }

  changeShapeFile(){
    this.mapService.toggleShape(this);
    
  }


  ngAfterViewInit(){
    
  }

  changeScenario0() {
    this.mapService.changeScenario(this, "recharge_scenario0");
  }

  changeScenario1() {
    this.mapService.changeScenario(this, "recharge_scenario1");
  }

  changeCover(type: string) {
    this.mapService.changeCover(this, type);
  }

  //might want to disable custom shapes button for recharge if no drawn items
  setMode(mode: string) {
    this.mapService.setMode(this, mode);
  }

  changeLayer(type: string) {
    this.layer = type;
  }
}
