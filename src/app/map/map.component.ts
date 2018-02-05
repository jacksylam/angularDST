import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import {MapService} from '../map/shared/map.service';
import {Http} from '@angular/http';
import 'rxjs/add/operator/map';
import {Grid} from './shared/grid';
import {Cover} from './shared/cover';
import {DBConnectService} from './shared/dbconnect.service';
import { isNullOrUndefined } from 'util';
import 'rxjs/add/observable/forkJoin';
import { Observable } from 'rxjs';
import { CovDetailsService } from 'app/map/shared/cov-details.service';
import { COVER_ENUM } from './shared/cover_enum';



declare var L: any;
declare var CovJSON: any;
declare var C: any;


@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
})
export class MapComponent implements OnInit {

  @ViewChild('mapid') mapid;
  @ViewChild('scrollableMenu') scrollableMenu;
  @ViewChild('menuCol') menuCol;

  mymap: any;
  popup: any;
  shpfile: any;
  shpfileString: string;
  toggleShapeFile: boolean;

  csvLayer: any;
  csvData: any;
  markerLayer = new L.LayerGroup;
  
  layer: any;
  layers: any;

  drawnItems: any;
  highlightedItems: any;
  drawControl: any;

  coverBase: any
  //currentCover[0] stores coverBase with holes, additional items store hole data
  currentCover: any[];
  coverColors: string[];
  currentCovLayer: any[];
  currentScenario: string;
  legend: any;

  static baseStyle: any;

  constructor( private DBService: DBConnectService, private mapService: MapService, private http: Http) {

   }

  ngOnInit() {
    
  }


  ngAfterViewInit() {

    this.mymap = L.map(this.mapid.nativeElement).setView([21.512, -157.96664],15);

    var mapLayer = L.esri.basemapLayer('Imagery').addTo(this.mymap);
    // this.mymap.setZoom(20);
    this.mymap.setZoom(15);

    this.mymap.invalidateSize();



    this.loadDrawControls();

    this.popup = L.popup();
    //this.mymap.on('click', this.onMapClick);
    //this.mymap.on('zoomend', this.loadMarkers.bind(this));
    //this.mymap.on('moveend', this.loadMarkers.bind(this));

    this.mapService.setMap(this);

    this.layers = L.control.layers(null, null, {collapsed: false}).addTo(this.mymap)
    
    this.loadcovJSON("covers", this.mymap, this.layers);
    this.changeScenario("recharge_scenario0");
    
   
  }

  private loadDrawControls(){
    this.drawnItems = new L.featureGroup();
    this.highlightedItems = new L.featureGroup();
    this.mymap.addLayer(this.drawnItems);
    this.drawControl = new L.Control.Draw({
        edit: {
          featureGroup: this.drawnItems
        }
    });
    this.mymap.addControl(this.drawControl);

    this.mymap.on(L.Draw.Event.CREATED,  (event) => {
      var layer = event.layer;

      var __this = this;
      this.drawnItems.addLayer(layer);
      //this.loadcovJSON("Kiawe", this.mymap, this.layers);
      //alert(layer.getLatLngs());

      //set base drawing style for highlight reset
      if(MapComponent.baseStyle == undefined) {
        //clone base options
        MapComponent.baseStyle = JSON.parse(JSON.stringify(layer.options));
      }
      layer.on('click', function() {
        //alert(this._leaflet_id);
        var highlight = {
          fillColor: 'blue',
          weight: 5,
          opacity: 1,
          color: 'blue',  //Outline color
          fillOpacity: 0.2
        };
        
        if(this.highlighted == undefined || !this.highlighted) {
          this.setStyle(highlight);
          this.highlighted = true;
          __this.highlightedItems.addLayer(this);
        }
        else {
          this.setStyle(MapComponent.baseStyle);
          this.highlighted = false;
          __this.highlightedItems.removeLayer(this);
        }
      })

    });
  }


  private onMapClick(e) {

    // var popup = L.popup();

    // popup
    //   .setLatLng(e.latlng)
    //   .setContent("You clicked the map at " + e.latlng.toString())
    //   .openOn(this);

    //does this do something (other than throw an error)?
    //for coverjson
    // new C.DraggableValuePopup({
    //   layers: [this.layer]
    // }).setLatLng(e.latlng).openOn(this)

    //alert(this._leaflet_id);
    //this.mymap._layers['name'+LayerID].setStyle(highlight);
  }


  public resize(width: number, height: number) {

    
    this.mapid.nativeElement.style.height = height-60 + 'px';
    this.mapid.nativeElement.style.width = width;


    this.mymap.invalidateSize();
  }


  //Loads the different grid points for land coverage onto leaflet map
  private loadMarkers(){
    let temp = this.mymap.getBounds();
    console.log(temp);
    let markers: Grid[];

    this.markerLayer.clearLayers();

    if(this.mymap.getZoom() > 16){
      //load the markers from service
      markers = this.mapService.getMarkers(temp._southWest.lat, temp._southWest.lng, temp._northEast.lat, temp._northEast.lng);

      for(let i = 0; i < markers.length ; i++){
        this.markerLayer.addLayer(L.marker([markers[i].lat, markers[i].lng]));
      }

      this.markerLayer.addTo(this.mymap);
    }

    console.log(markers);
    
  
  }

  private loadcovJSON(cover: string, mymap, layers){
    var __this = this;

    var numItems = this.highlightedItems.getLayers().length;

    if(numItems != 0) {
      //deal with errors too

      Observable.forkJoin(this.highlightedItems.toGeoJSON().features.map(element => {
        return this.DBService.spatialSearch(element.geometry)
      }))
      .subscribe((data) => {
        //console.log(typeof data);
        //use file(s) generated as cover
        this.updateCover(cover, data, mymap, layers);
      });
      
    }
    //do nothing if nothing selected (base landcover wont change)
    else if(this.coverBase == undefined) {
      this.mapService.updateDetails(this, null, null, cover);
      let coverFile = this.getCoverFile(cover);
      CovJSON.read('./assets/covjson/' + coverFile).then(function(coverage) {
        __this.coverBase = coverage;
        __this.currentCover = [coverage];
        __this.coverColors = [COVER_ENUM[cover]];
        __this.updateRecharge(mymap, layers, __this)
      });
    }

    //figure out what base cover is going to be, coming from db?
  }

  //horrendously innefficient, will be fixed when actual cover methods put in place
  private updateCover(type: string, update, mymap, layers) {
    var coverBase = this.currentCover[0]._covjson.ranges.recharge.values
    var __this = this;
    CovJSON.read('./assets/covjson/' + "testfiles_sc0_0-fin.covjson").then(function(newCov) {
      update.forEach(area => {
      
        // var newCov = JSON.parse(JSON.stringify(this.currentCover[0]));
        var newCovBase = newCov._covjson.ranges.recharge.values;
        // //stringify/parse does not copy over these values, since theyre functions
        // console.log(this.currentCover[0]);
        // newCov._covjson.domain.axes = new Map(this.currentCover[0]._covjson.domain.axes);
        // newCov.parameters = new Map(this.currentCover[0].parameters);
        // newCov._domainPromise.__zone_symbol__value.axes = new Map(this.currentCover[0]._domainPromise.__zone_symbol__value.axes);
        // console.log(newCov);
        //just the holes for shape, so rest null
        for(var i = 0; i < newCovBase.length; i++) {
          newCovBase[i] = null;
        }
        area.forEach(record => {
          var recordBase = record.value;
          var x = recordBase.x;
          var y = recordBase.y;
          var index = y*920 + x;
          //cut hole in base cover and fill hole in new cover
          coverBase[index] = null;
          //change to reflect enumerated type
          newCovBase[index] = recordBase[__this.currentScenario][0];
        });
        __this.coverColors.push(COVER_ENUM[type]);
        __this.currentCover.push(newCov);
      });
      __this.updateRecharge(mymap, layers)
    });
  }

  private updateRecharge(mymap, layers, __this = this) {
    if(__this.currentCovLayer != undefined) {
      __this.currentCovLayer.forEach(layer => {
        mymap.removeControl(layer);
        layers.removeLayer(layer);
      })
    }
    else {
      __this.currentCovLayer = [];
    }
    for(var i = 0; i < __this.currentCover.length; i++) {
      var coverage = __this.currentCover[i];
      var color = __this.coverColors[i];
      //remove old layer from map and control
      //__this.currentCover = coverages;
      var rechargeVals = coverage._covjson.ranges.recharge.values;
      //var xaxis = coverage._covjson.domain.axes.x.values;
      //var yaxis = coverage._covjson.domain.axes.y.values;

      // var test = [];
      // for(var i = 0; i < 100000; i++) {
      //   test.push(null);
      // }

      // rechargeVals.splice(100000, 100000, ...test);
      //console.log(coverage);
      // work with Coverage object
      var layer = C.dataLayer(coverage, {parameter: 'recharge', palette: C.directPalette(this.colorPalette())})
      .on('afterAdd', function () {
        if(__this.legend == undefined) {
          __this.legend = C.legend(layer);
        }
        __this.legend.addTo(mymap);
      })
      .setOpacity(0.75)
      .addTo(mymap);
      console.log(coverage);
      layer.on('mouseover', () => {
        console.log("test");
        layer.openPopup();
      });
      layers.addOverlay(layer, 'Recharge');
      __this.currentCovLayer.push(layer);
      __this.mapService.updateRechargeSum(__this, rechargeVals);
    }
  }


  public changeCover(cover: string){
    this.loadcovJSON(cover, this.mymap, this.layers);
  }

  public changeScenario(type: string) {
    this.currentScenario = type;
    this.mapService.updateDetails(this, null, type, null);
  }


  private getCoverFile(cover: string){
    if(cover === "AlienForest"){
      return "testfiles_sc0_0-fin.covjson";
    }
    else if(cover === "AlienForestFog"){
      return "testfiles_sc0_1-fin.covjson";
    }
    else if(cover === "Fallow"){
      return "testfiles_sc0_2-fin.covjson";
    }
    else if (cover === "Grassland"){
      return "testfiles_sc0_3-fin.covjson";
    }
    else if (cover === "Kiawe"){
      return "testfiles_sc0_4-fin.covjson";
    }
    else if(cover === "LowIntensity"){
      return "testfiles_sc0_5-fin.covjson";
    }
    else if(cover === "Native"){
      return "testfiles_sc0_6fin.covjson";
    }
    else if(cover === "covers") {
      return "landcover.covjson";
    }
  }


  private colorPalette(): string[] {
    var palette = []
    var range = 255;
    var color;
    var r;
    var g;
    var b;
    for(var i = 0; i < 3; i++) {
      for(var j = 0; j < 3; j++) {
        for(var k = 0; k < 3; k++) {
          r = (Math.round(range / 2 * i)).toString(16);
          g = (Math.round(range / 2 * j)).toString(16);
          b = (Math.round(range / 2 * k)).toString(16);
          if(r.length < 2) r = "0" + r;
          if(g.length < 2) g = "0" + g;
          if(b.length < 2) b = "0" + b;
          color = "#" + r + g + b;
          palette.push(color);
          console.log(color);
        }
      }
    }
    // var range = 16777215;
    
    // for(var i = 0; i < 30; i++) {
    //   color = Math.round((range / 29) * i);
    //   var hex = color.toString(16)
    //   while(hex.length < 6) {
    //     hex = "0" + hex;
    //   }
    //   hex = "#" + hex;
    //   //console.log(hex);
    //   palette.push(hex);
      
    // }
    console.log(palette.length)
    return palette;
  }
}