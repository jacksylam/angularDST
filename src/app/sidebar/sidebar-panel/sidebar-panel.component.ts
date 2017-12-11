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
        transform: 'translate(300px, 0px)',
      })),
      transition('active => inactive', animate('500ms ease-in-out')),
      transition('inactive => active', animate('500ms ease-in-out'))
    ]),
  ]
})
export class SidebarPanelComponent implements OnInit {
  state = 'inactive';


  constructor(private mapService: MapService) { }

  ngOnInit() {

  }

  toggleMenu() {
    this.state = (this.state == 'inactive' ? 'active' : 'inactive');
  }

  changeShapeFile(){
    this.mapService.toggleShape(this);
    
  }


  ngAfterViewInit(){
    this.mapService.setButtonPanel(this);;
  }

  changeAlienForest(){
    this.mapService.changeCover(this, "AlienForest");
  }

  changeAlienForestFog(){
    this.mapService.changeCover(this, "AlienForestFog");
  }

  changeFallow(){
    this.mapService.changeCover(this, "Fallow");
  }

  changeGrassland(){
    this.mapService.changeCover(this, "Grassland");
  }

  changeKiawae(){
    this.mapService.changeCover(this, "Kiawae");
  }

  changeLowIntensity(){
    this.mapService.changeCover(this, "LowIntensity");
  }

  changeNative(){
    this.mapService.changeCover(this, "Native");
  }
}
