import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import {animate, transition, state, trigger, style} from '@angular/animations';
import {MapService} from '../../map/shared/map.service';
import {COVER_INDEX_DETAILS} from '../../map/shared/cover_enum';

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


export class SidebarPanelComponent implements OnInit, AfterViewInit {
  @ViewChild("scrollableMenu") scrollableMenu;

  state = 'active';

  layer = "landcover";

  selected = "Baseline Rainfall 1978-2007";
  rechargeStyle = "rate"
  colorScheme = "usgs";

  loading = 0;
  debug = false;

  updateBase = false;

  disabled = true;

  panel = [];

  constructor(private mapService: MapService, private elementRef: ElementRef) { }

  ngOnInit() {
    this.mapService.setButtonPanel(this);
    this.elementRef.nativeElement.style.setProperty("--in-out-menu", "'\\00BB'");
  }

  toggleMenu() {
    //this.elementRef.nativeElement.style.setProperty("--scrollheight", this.sidebar.nativeElement.scrollHeight);
    //console.log(this.sidebar.nativeElement.scrollHeight);
    this.state = this.state == 'inactive' ? 'active' : 'inactive';
    this.state == 'active' ? this.elementRef.nativeElement.style.setProperty("--in-out-menu", "'\\00BB'") : this.elementRef.nativeElement.style.setProperty("--in-out-menu", "'\\00AB'");
  }

  changeShapeFile() {
    this.mapService.toggleShape(this);
    
  }


  ngAfterViewInit(){
    this.elementRef.nativeElement.style.setProperty("--scrollheight", this.scrollableMenu.nativeElement.scrollHeight + 20 + "px");
    //console.log(this.sidebar.nativeElement.scrollHeight);
  }


  colorChange() {
    this.mapService.changeColor(this, this.colorScheme);
  }

  setLCPalette() {
    this.panel = Object.keys(COVER_INDEX_DETAILS)
    .filter((code) => {
      return COVER_INDEX_DETAILS[code].type != "Background";
    })
    .map((code) => {
      return {
        name: COVER_INDEX_DETAILS[code].type,
        background: "linear-gradient(90deg," + COVER_INDEX_DETAILS[code].color + " 12%, ivory 10%, ivory 10%, ivory 10%, ivory 10%, ivory 10%, ivory 10%, ivory 10%, ivory 10%, ivory 10%)"
      };
    })
    .sort((a, b) => {
      let t1 = a.name;
      let t2 = b.name;
      return t1 < t2 ? -1 : 1;
    });
  }


  climateChange() {
    //console.log(this.selected);
    switch(this.selected) {
      case "Baseline Rainfall 1978-2007":
        this.mapService.changeScenario(this, "recharge_scenario0", this.updateBase);
        break;
      case "Rainfall Projection 2041-2070 (RCP 8.5)":
        this.mapService.changeScenario(this, "recharge_scenario1", this.updateBase);
        break;
    }
  }

  styleChange(e) {
    this.mapService.changeRechargeStyle(this, e);
  }

  changeCover(type: string) {
    this.mapService.changeCover(this, type);
  }

  //might want to disable custom shapes button for recharge if no drawn items
  setMode(mode: string) {
    this.mapService.setMode(this, mode);
  }

  changeLayer(type: string) {
    this.elementRef.nativeElement.style.setProperty("--scrollheight", "100px");
    this.layer = type;
    setTimeout(() => {
      this.elementRef.nativeElement.style.setProperty("--scrollheight", this.scrollableMenu.nativeElement.scrollHeight + 20 + "px");
    }, 0);
  }

  toggleDisable() {
    this.disabled = !this.disabled;
  }

  setLoading(isLoading: -1 | 1) {
    if(!this.debug) {
      this.loading += isLoading;
    }
  }

  dataLoaded() {
    this.disabled = false;
  }
}
