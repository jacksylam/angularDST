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
  //  this.firestore.getList().subscribe(val => console.log(val));
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



  //lat1 - lower latitude
  //lng2 - upper latitude
  //lng1 - right longitude
  //lng2 - left longitude
  getMarkers(lat1: number, lng1: number, lat2: number, lng2: number){
    let markers = new Array();
    console.log("Map lat " + this.csvData[0].lat);
    console.log("Map lng " + this.csvData[0].lng);

    console.log("lat1 " + lat1);
    console.log("lng1 " + lng1);
    console.log("lat2 " + lat2);
    console.log("lng2 " + lng2);

    for(let i = 0; i < this.csvData.length; i++){
      if((this.csvData[i].lat > lat1) && (this.csvData[i].lat < lat2) && (this.csvData[i].lng > lng1) && (this.csvData[i].lng < lng2)){
      // if((this.csvData[i].lng > lng1) && (this.csvData[i].lng < lng2)){
        markers.push(this.csvData[i]);
      }
    }
    return markers;
  }

  changeLayer(map: any, type: string) {
    let index = this.mapHash.indexOf(map);
    this.panelButtonHash[index].changeLayer(type);
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

  updateMetrics(map: any, originalRecharge: number, currentRecharge: number, mode: string) {
    let index = this.mapHash.indexOf(map);
    console.log(originalRecharge)
    this.detailPanelHash[index].updateMetrics(originalRecharge, currentRecharge, mode);
  }

  updateDetails(map: any, scenario: string) {
    let index = this.mapHash.indexOf(map);
    this.detailPanelHash[index].updateDetails(scenario);
  }

  updateRechargeSum(map: any, rechargeArr: number[]) {
    var totalRecharge = 0;
    rechargeArr.forEach(element => {
      totalRecharge += element;
    });
    let index = this.mapHash.indexOf(map);
    this.detailPanelHash[index].updateTotalRecharge(totalRecharge);
  }

  setTotalRecharge(map: any, rechargeArr: number[]) {
    var totalRecharge = 0;
    rechargeArr.forEach(element => {
      totalRecharge += element;
    });
    let index = this.mapHash.indexOf(map);
    this.detailPanelHash[index].setTotalRecharge(totalRecharge);
  }

  setTotalAndCurrentRecharge(map: any, rechargeArr: number[]) {
    var totalRecharge = 0;
    rechargeArr.forEach(element => {
      totalRecharge += element;
    });
    let index = this.mapHash.indexOf(map);
    this.detailPanelHash[index].setTotalRecharge(totalRecharge);
    this.detailPanelHash[index].updateTotalRecharge(totalRecharge);
  }

  baseDetails(map: any) {
    let index = this.mapHash.indexOf(map);
    this.detailPanelHash[index].backToBase();
  }

  changeOpacity(controlPanel: any, opacity: number) {
    let index = this.controlPanelHash.indexOf(controlPanel);
    this.mapHash[index].changeLayerOpacity(opacity);
  }
  
}