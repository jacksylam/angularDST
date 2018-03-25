import { Component, OnInit, Input } from '@angular/core';
import {animate, transition, state, trigger, style} from '@angular/core';
import {MapService} from '../../map/shared/map.service';


@Component({
  selector: 'app-sidebar-controls',
  templateUrl: './sidebar-controls.component.html',
  styleUrls: ['./sidebar-controls.component.css'],
  animations: [
    trigger('movePanel', [
         state('active', style({
        transform: 'translate(0px, 0px)',
      })),
      state('inactive', style({
        transform: 'translate(-160px, 0px)',
      })),
      transition('active => inactive', animate('500ms ease-in-out')),
      transition('inactive => active', animate('500ms ease-in-out'))
    ]),
  ]
})
export class SidebarControlsComponent implements OnInit {

  // max 
  // min [step]=0.1
  value = 1;

  state = 'inactive';

  displayType = "Hide";

  constructor(private mapService: MapService) { }

  ngOnInit() {
    this.mapService.setControlPanel(this);
  }

  toggleMenu() {
    this.state = (this.state == 'inactive' ? 'active' : 'inactive');
  }

  sliderChange(e) {
    this.mapService.changeOpacity(this, e.value);
  }

  toggleAreas() {
    this.mapService.showHideObjects(this.displayType, this);
    this.displayType = this.displayType == "Show" ? "Hide" : "Show";
  }

}
