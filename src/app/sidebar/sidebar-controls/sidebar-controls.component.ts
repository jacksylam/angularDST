import { Component, OnInit, Input, ViewChild } from '@angular/core';
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
        transform: 'translate(-180px, 0px)',
      })),
      transition('active => inactive', animate('500ms ease-in-out')),
      transition('inactive => active', animate('500ms ease-in-out'))
    ]),
  ]
})
export class SidebarControlsComponent implements OnInit {

  
  @ViewChild("menu") menuDiv;
  @ViewChild("leftScrollbar") leftScrollbarDiv;
  


  value = 1;

  state = 'inactive';

  displayType = "Hide";

  scrollLock = false;

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

  upload(e: any, type: string) {
    console.log(e.target.files);
    this.mapService.uploadShapefile(this, type, e.target.files);
  }

  download() {
    this.mapService.downloadShapefile(this);
  }

  setUnits(unitType: string) {
    //should switch mapService coordination to window service
    this.mapService.setUnits(this, unitType);
  }

  generateReport() {
    this.mapService.generateReport(this);
  }

  menuScroll(e) {
    //stops events from bouncing back and forth since both scrolling
    if(!this.scrollLock) {
      //lock scroll so other element doesn't scroll
      this.scrollLock = true;
      this.leftScrollbarDiv.nativeElement.scrollTop = e.target.scrollTop;
    }
    else {
      //unlock after bounce
      this.scrollLock = false;
    }
  }

  scrollbarScroll(e) {
    if(!this.scrollLock) {
      //lock scroll so other element doesn't scroll
      this.scrollLock = true;
      this.menuDiv.nativeElement.scrollTop = e.target.scrollTop;
    }
    else {
      //unlock after bounce
      this.scrollLock = false;
    }
  }



}
