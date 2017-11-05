import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import {MapComponent} from '../map.component'

@Injectable()
export class MapService {
  
  mapHash = [];
  panelButtonHash = [];


  mapEnabled: boolean;
  mapEnabledObs = new Subject<boolean>();

  map: any;

  constructor() { }

  setMap(newMap: any){
    this.mapHash.push(newMap);
  }

  setButtonPanel(buttonPanel: any){
    this.panelButtonHash.push(buttonPanel);
  }

  toggleShape(buttonPanel: any){
    let index = this.panelButtonHash.indexOf(buttonPanel);
    this.mapHash[index].changeShapeFile();
  }



}
