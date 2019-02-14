import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import {animate, transition, state, trigger, style} from '@angular/animations';
import {MapService} from '../../map/shared/map.service';
import {MatDialog} from "@angular/material";
import {UploadDialogComponent} from "../upload-dialog/upload-dialog.component"
import {DownloadDialogComponent} from "../download-dialog/download-dialog.component"

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
        transform: 'translate(-162px, 0px)',
      })),
      transition('active => inactive', animate('500ms ease-in-out')),
      transition('inactive => active', animate('500ms ease-in-out'))
    ]),
  ]
})
export class SidebarControlsComponent implements OnInit {

  
  @ViewChild("menu") menuDiv;
  @ViewChild("leftScrollbar") leftScrollbarDiv;
  @ViewChild("nameInput") nameInput;

  loading = 0;
  debug = false;

  disabled = true;

  baselayer = "landcover";

  value = 1;

  state = 'active';

  displayType = "Hide";

  scrollLock = false;

  id: number;

  units = "USC";

  precision = 3;

  mode = "normal";
  areaSelected = false;

  name: string;

  constructor(private mapService: MapService, private dialog: MatDialog, private elementRef: ElementRef) {
  }

  // changeValueFunctionToReplaceAngularsDumbEventSystem(e) {
  //   console.log(this.nameInput);
  // }

  ngAfterViewInit() {
    let scrollbarWidth = this.leftScrollbarDiv.nativeElement.offsetWidth - this.leftScrollbarDiv.nativeElement.clientWidth;
    this.elementRef.nativeElement.style.setProperty("--control-scrollbar-width", (scrollbarWidth + 1).toString() + "px");
  }

  openDialog(type: string) {
    switch(type) {
      case "upload":
        this.dialog.open(UploadDialogComponent, {data: {id: this.id}, maxHeight: "90vh"}).afterClosed()
        .subscribe((data) => {
          if(data) {
            this.mapService.upload(this, data);
          }
        });
        break;

      case "download":
        this.dialog.open(DownloadDialogComponent, {data: {id: this.id}, maxHeight: "90vh"}).afterClosed()
        .subscribe((data) => {
          if(data) {
            this.mapService.download(this, data);
          }
        });
        break;

      default:
        console.log("Invalid dialog");
    }
  }

  setWindowId(id: number) {
    this.id = id;
  }

  ngOnInit() {
    this.mapService.setControlPanel(this);
    this.elementRef.nativeElement.style.setProperty("--in-out-control", "'\\00AB'");
  }

  toggleMenu() {
    this.state = this.state == 'inactive' ? 'active' : 'inactive';
    this.state == 'active' ? this.elementRef.nativeElement.style.setProperty("--in-out-control", "'\\00AB'") : this.elementRef.nativeElement.style.setProperty("--in-out-control", "'\\00BB'");
  }

  sliderChange(e) {
    this.mapService.changeOpacity(this, e.value);
  }

  toggleAreas() {
    this.mapService.showHideObjects(this.displayType, this);
    this.displayType = this.displayType == "Show" ? "Hide" : "Show";
  }

  switchToShow() {
    this.displayType = "Hide";
  }

  toggleNameMode() {
    this.mode = this.mode == "normal" ? "name" : "normal";
    this.mapService.toggleNameMode(this);
    this.areaSelected = false;
  }

  setNameOnSelect(name: string) {
    this.name = name;
    this.areaSelected = true;
  }

  // setName(e) {
  //   console.log(e);
  //   this.name = e.value;
  // }

  registerNameToShape() {
    this.mapService.registerNameToShape(this, this.nameInput.nativeElement.value);
  }

  upload(e: any, type: string) {
    this.mapService.uploadShapefile(this, type, e.target.files);
  }

  // download() {
  //   this.mapService.downloadShapefile(this);
  // }

  // downloadRaster(type: string, format: string) {
  //   this.mapService.downloadRaster(this, type, format);
  // }

  setUnits(e) {
    //should switch mapService coordination to window service
    this.mapService.setUnits(this, e);
  }

  generateReport() {
    this.mapService.generateReport(this, this.units);
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
      //set scrollbar width so dynamic with mac's dissappearing scroll bar
      let scrollbarWidth = this.leftScrollbarDiv.nativeElement.offsetWidth - this.leftScrollbarDiv.nativeElement.clientWidth;
      this.elementRef.nativeElement.style.setProperty("--control-scrollbar-width", (scrollbarWidth).toString() + "px");
    }
    else {
      //unlock after bounce
      this.scrollLock = false;
    }
  }

  changeLayer(type: string) {
    this.baselayer = type;
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
