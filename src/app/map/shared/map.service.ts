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
  }


  generateReport(controlPanel: any) {
    let index = this.controlPanelHash.indexOf(controlPanel);
    //probably need to get details from this function, then generate new window with info, placeholder for now
    this.mapHash[index].generateReport();
  }

}