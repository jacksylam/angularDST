import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { Http } from '@angular/http';
import {MapFirestoreService} from './map-firestore.service'


import { MapComponent } from '../map.component'
import { Grid } from './grid'

@Injectable()
export class MapService {

  mapHash = [];
  panelButtonHash = [];
  detailPanelHash = [];
  controlPanelHash = [];


  mapEnabled: boolean;
  mapEnabledObs = new Subject<boolean>();

  map: any;

  tempData: any;
  csvData: Grid[];

  constructor(private http: Http, private firestore: MapFirestoreService) {

   }

  init(){
  }

  setMap(newMap: any) {
    this.mapHash.push(newMap);
  }

  setButtonPanel(buttonPanel: any) {
    this.panelButtonHash.push(buttonPanel);
  }

  setControlPanel(controlPanel: any) {
    this.controlPanelHash.push(controlPanel);
  }

  setDetailsPanel(detailPanel: any) {
    this.detailPanelHash.push(detailPanel);
  }

  toggleShape(buttonPanel: any) {
    let index = this.panelButtonHash.indexOf(buttonPanel);
    this.mapHash[index].changeShapeFile();
  }

  showHideObjects(showOrHide: string, controlPanel: any) {
    let index = this.controlPanelHash.indexOf(controlPanel);
    this.mapHash[index].showHideObjects(showOrHide);
    console.log(this.mapHash.length);
  }

  changeLayer(map: any, type: string) {
    let index = this.mapHash.indexOf(map);
    this.panelButtonHash[index].changeLayer(type);
    this.controlPanelHash[index].changeLayer(type);
  }

  changeCover(buttonPanel: any, cover: string) {
    let index = this.panelButtonHash.indexOf(buttonPanel);
    this.mapHash[index].updateCover(cover);
  }

  setMode(buttonPanel: any, mode: string) {
    let index = this.panelButtonHash.indexOf(buttonPanel);
    this.mapHash[index].setMode(mode);
  }

  toggleCaprock(detailPanel: any, mode: string) {
    let index = this.detailPanelHash.indexOf(detailPanel);
    this.mapHash[index].toggleCaprock(mode);
  }

  changeScenario(buttonPanel: any, scenario: string) {
    let index = this.panelButtonHash.indexOf(buttonPanel);
    this.mapHash[index].changeScenario(scenario);
  }

  updateMetrics(map: any, mode: string, metrics: any) {
    let index = this.mapHash.indexOf(map);
    this.detailPanelHash[index].updateMetrics(mode, metrics);
  }

  // updateDetails(map: any, scenario: string) {
  //   let index = this.mapHash.indexOf(map);
  //   this.detailPanelHash[index].updateDetails(scenario);
  // }

  // updateRechargeSum(map: any, rechargeArr: number[]) {
  //   var totalRecharge = 0;
  //   rechargeArr.forEach(element => {
  //     totalRecharge += element;
  //   });
  //   let index = this.mapHash.indexOf(map);
  //   this.detailPanelHash[index].updateTotalRecharge(totalRecharge);
  // }

  // setTotalRecharge(map: any, rechargeArr: number[]) {
  //   var totalRecharge = 0;
  //   rechargeArr.forEach(element => {
  //     totalRecharge += element;
  //   });
  //   let index = this.mapHash.indexOf(map);
  //   this.detailPanelHash[index].setTotalRecharge(totalRecharge);
  // }

  // setTotalAndCurrentRecharge(map: any, rechargeArr: number[]) {
  //   var totalRecharge = 0;
  //   rechargeArr.forEach(element => {
  //     totalRecharge += element;
  //   });
  //   let index = this.mapHash.indexOf(map);
  //   this.detailPanelHash[index].setTotalRecharge(totalRecharge);
  //   this.detailPanelHash[index].updateTotalRecharge(totalRecharge);
  // }

  baseDetails(map: any) {
    let index = this.mapHash.indexOf(map);
    this.detailPanelHash[index].backToBase();
  }

  changeOpacity(controlPanel: any, opacity: number) {
    let index = this.controlPanelHash.indexOf(controlPanel);
    this.mapHash[index].changeLayerOpacity(opacity);
  }


  uploadShapefile(controlPanel: any, type: string, files: any[]) {
    let index = this.controlPanelHash.indexOf(controlPanel);
    switch(type) {
      case "reference":
        this.mapHash[index].uploadShapefileAsReference(files);
        break;
      case "custom":
        this.mapHash[index].uploadShapefileAsCustom(files);
        break;
    }
    

  }


  // downloadShapefile(controlPanel: any) {
  //   let index = this.controlPanelHash.indexOf(controlPanel);
  //   this.mapHash[index].downloadShapefile();
  // }

  // downloadRaster(controlPanel: any, type: string, format: string) {
  //   let index = this.controlPanelHash.indexOf(controlPanel);
  //   this.mapHash[index].downloadRaster(type, format);
  // }

  download(controlPanel: any, info: any) {
    let index = this.controlPanelHash.indexOf(controlPanel);
    this.mapHash[index].download(info);
  }

  upload(controlPanel: any, info: any) {
    let index = this.controlPanelHash.indexOf(controlPanel);
    this.mapHash[index].upload(info);
  }

  setUnits(controlPanel: any, unitType: string) {
    let index = this.controlPanelHash.indexOf(controlPanel);
    this.detailPanelHash[index].setUnits(unitType);
    this.mapHash[index].setUnits(unitType);
  }


  generateReport(controlPanel: any, unitSystem: string) {
    let index = this.controlPanelHash.indexOf(controlPanel);
    this.mapHash[index].generateReport(unitSystem);
  }


  toggleNameMode(controlPanel: any) {
    let index = this.controlPanelHash.indexOf(controlPanel);
    this.mapHash[index].toggleNameMode();
    this.panelButtonHash[index].toggleDisable();
  }

  registerNameToShape(controlPanel: any, name: string) {
    let index = this.controlPanelHash.indexOf(controlPanel);
    this.mapHash[index].registerNameToShape(name);
  }

  setNameOnSelect(map: any, name: string) {
    let index = this.mapHash.indexOf(map);
    this.controlPanelHash[index].setNameOnSelect(name);
  }


  setLoading(map: any, isLoading: boolean) {
    let loading = isLoading ? 1 : -1;
    let index = this.mapHash.indexOf(map);
    this.controlPanelHash[index].setLoading(loading);
    this.detailPanelHash[index].setLoading(loading);
    this.panelButtonHash[index].setLoading(loading);
  }

  changeRechargeStyle(buttonPanel: any, style: string) {
    let index = this.panelButtonHash.indexOf(buttonPanel);
    this.mapHash[index].changeRechargeStyle(style);
  }
  
}