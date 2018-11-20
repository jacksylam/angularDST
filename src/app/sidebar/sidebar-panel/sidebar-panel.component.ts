import { Component, OnInit, ViewChild } from '@angular/core';
import {animate, transition, state, trigger, style} from '@angular/animations';
import {MapService} from '../../map/shared/map.service';

@Component({
  selector: 'app-sidebar-panel',
  templateUrl: './sidebar-panel.component.html',
  styleUrls: ['./sidebar-panel.component.css'],
  animations: [
    trigger('movePanel', [
         state('active', style({
        transform: 'translate(-225px, 0px)',
      })),
      state('inactive', style({
        transform: 'translate(0px, 0px)',
      })),
      transition('active => inactive', animate('500ms ease-in-out')),
      transition('inactive => active', animate('500ms ease-in-out'))
    ]),
  ]
})


export class SidebarPanelComponent implements OnInit {
  state = 'active';

  layer = "landcover";

  selected = "Baseline Rainfall 1978-2007";
  rechargeStyle = "rate"

  loading = 0;
  debug = false;

  disabled = false;

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



  climateChange(e) {
    switch(e.value) {
      case "Baseline Rainfall 1978-2007":
        this.mapService.changeScenario(this, "recharge_scenario0");
        break;
      case "Rainfall Projection 2041-2070 (RCP 8.5)":
        this.mapService.changeScenario(this, "recharge_scenario1");
        break;
    }
  }

  styleChange(e) {
    this.mapService.changeRechargeStyle(this, e.value);
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

  toggleDisable() {
    this.disabled = !this.disabled;
  }

  setLoading(isLoading: -1 | 1) {
    if(!this.debug) {
      this.loading += isLoading;
    }
  }
}
