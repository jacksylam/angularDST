import { Component, OnInit, ViewChild, ElementRef, EventEmitter } from '@angular/core';
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
import { COVER_ENUM, COVER_INDEX_DETAILS } from './shared/cover_enum';
import * as proj4x from 'proj4';
import * as shp from 'shpjs';
import * as shpwrite from 'shp-write';
import { UploadOutput, UploadInput, UploadFile, humanizeBytes, UploaderOptions } from 'ngx-uploader';



declare var L: any;
declare var CovJSON: any;
declare var C: any;
declare var require: any;


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

  // landCover: any;
  // landCoverLayer: any;
  // recharge: any;
  // rechargeLayer: any;
  // aquiferLayer: any;

  currentScenario: string;
  legend: any;

  // upperLeftLatLng: any;
  // lowerRightLatLng: any;
  
  // gridHeightCells: number;
  // gridWidthLong: number;
  // gridHeightLat: number;
  gridWidthCells: number;
  xmin: number;
  ymin: number;
  xrange: number;
  yrange: number;

  popupTimer: any;

  static baseStyle: any;

  //remember to reformat file so parameter isnt "recharge", etc
  static readonly landCoverFile = "../assets/covjson/landcover.covjson";
  //change once get actual data, just use first test file for now
  static readonly rechargeFile = "../assets/covjson/testfiles_sc0_0-fin.covjson"
  static readonly aquifersFile = "../assets/dlnr_aquifers.zip";

  types = {
    landCover: {
      parameter: 'cover',
      label: 'Land Cover',
      palette: C.directPalette(this.colorPalette()),
      data: null,
      layer: null
    },
    recharge: {
      parameter: 'recharge',
      label: 'Recharge Rate',
      data: null,
      layer: null
    },
    aquifers: {
      label: 'Aquifers',
      layer: null
    }
  };

  //???
  readonly layerOrdering = [this.types.landCover, this.types.recharge, this.types.aquifers];

  static readonly utm = "+proj=utm +zone=4 +datum=NAD83 +units=m";
  static readonly longlat = "+proj=longlat";
  static readonly proj4 = (proj4x as any).default;


  options: UploaderOptions;
  formData: FormData;
  files: UploadFile[];
  uploadInput: EventEmitter<UploadInput>;
  humanizeBytes: Function;
  dragOver: boolean;

  onUploadOutput(output: UploadOutput): void {
    console.log(this.files);
    if (output.type === 'allAddedToQueue') { // when all files added in queue
      // uncomment this if you want to auto upload files when added
      const event: UploadInput = {
        type: 'uploadAll',
        url: 'http://ngx-uploader.com/upload',
        method: 'POST',
        data: { foo: 'bar' }
      };
      console.log(event);
      this.uploadInput.emit(event);
    } else if (output.type === 'addedToQueue'  && typeof output.file !== 'undefined') { // add file to array when added
      this.files.push(output.file);
    } else if (output.type === 'uploading' && typeof output.file !== 'undefined') {
      // update current data in files array for uploading file
      const index = this.files.findIndex(file => typeof output.file !== 'undefined' && file.id === output.file.id);
      this.files[index] = output.file;
    } else if (output.type === 'removed') {
      // remove file from array when removed
      this.files = this.files.filter((file: UploadFile) => file !== output.file);
    } else if (output.type === 'dragOver') {
      this.dragOver = true;
    } else if (output.type === 'dragOut') {
      this.dragOver = false;
    } else if (output.type === 'drop') {
      this.dragOver = false;
    }
  }

  startUpload(): void {
    const event: UploadInput = {
      type: 'uploadAll',
      url: 'http://localhost:4200',
      method: 'POST',
      data: { foo: 'bar' }
    };

    this.uploadInput.emit(event);
  }

  cancelUpload(id: string): void {
    this.uploadInput.emit({ type: 'cancel', id: id });
  }

  removeFile(id: string): void {
    this.uploadInput.emit({ type: 'remove', id: id });
  }

  removeAllFiles(): void {
    this.uploadInput.emit({ type: 'removeAll' });
  }


  // //readonly URL = 'https://evening-anchorage-3159.herokuapp.com/api/';
  // //upload things
  // uploader:FileUploader = new FileUploader({url:''});
  // hasBaseDropZoneOver:boolean = false;
  // hasAnotherDropZoneOver:boolean = false;


  // //upload drag events
  // public fileOverBase(e:any):void {
  //   this.hasBaseDropZoneOver = e;
  //   this.uploader.queue.forEach(item => {
  //     console.log(item);
  //   });
  // }
 
  // public fileOverAnother(e:any):void {
  //   this.hasAnotherDropZoneOver = e;
  // }


  constructor( private DBService: DBConnectService, private mapService: MapService, private http: Http) {
    //should put all these in constructors to ensure initialized before use
    this.mapService.setMap(this);

    //probably swap out all this for file api stuff
    this.files = []; // local uploading files array
    this.uploadInput = new EventEmitter<UploadInput>(); // input events, we use this to emit data to ngx-uploader
    this.humanizeBytes = humanizeBytes;
   }

  ngOnInit() {
    
  }


  ngAfterViewInit() {

    this.mymap = L.map(this.mapid.nativeElement).setView([21.512, -157.96664], 15);

    var mapLayer = L.esri.basemapLayer('Imagery').addTo(this.mymap);
    // this.mymap.setZoom(20);
    this.mymap.setZoom(14);

    this.mymap.invalidateSize();


    this.loadDrawControls();

    this.popup = L.popup();
    //this.mymap.on('click', this.onMapClick);
    //this.mymap.on('zoomend', this.loadMarkers.bind(this));
    //this.mymap.on('moveend', this.loadMarkers.bind(this));

    //thinking I like the collapsed version with this stuff
    this.layers = L.control.layers(null, null/*, {collapsed: false}*/).addTo(this.mymap)

    this.initializeLayers();
    console.log("2");
    
    //this.loadcovJSON("covers", this.mymap, this.layers);
    this.changeScenario("recharge_scenario0");

    this.mymap.on('mouseover', () => {
      this.mymap.on('mousemove', (e) => {
        this.mymap.closePopup();
        clearTimeout(this.popupTimer);
        this.popupTimer = setTimeout(() => {
          //quadrants differ in directional change, should be upper left, but generalize by finding minimum of each
          //x grid corresponds to long
          //console.log(this.gridWidthCells);
          //this is off because grid cells offish because earth is round
          //instead need to convert coordinates to utm then find corresponding grid cell
          // var cellx = Math.floor((e.latlng.lng - Math.min(this.upperLeftLatLng[1], this.lowerRightLatLng[1])) / this.gridWidthLong * this.gridWidthCells);
          // // y lat
          // var celly = Math.floor(this.gridHeightLat / this.gridHeightCells * (e.latlng.lat - Math.min(this.upperLeftLatLng[0], this.lowerRightLatLng[0])));
          // //test cell calc
          // console.log("(" + cellx + "," + celly + ")")

          //coords for conversion in long lat format
          var convertedMousePoint = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [e.latlng.lng, e.latlng.lat]);
          //console.log(convertedMousePoint);
          //round x and y values to nearest multiple of 75 offset from first x/y value, then find position of grid cell that corresponds to this value from stored cover file
          //coord arrays converted to maps when layer generated
          
          
          //remember to change data name for this part (not recharge)
          //also need to remove all array stuff, since can be handled in single layer now
          var data = this.types.landCover.data._covjson.ranges.cover.values;
          var xs = this.types.landCover.data._covjson.domain.axes.get("x").values;
          var ys = this.types.landCover.data._covjson.domain.axes.get("y").values;
          
          //get difference from min to mouse position
          var diffx = convertedMousePoint[0] - this.xmin;
          var diffy = convertedMousePoint[1] - this.ymin;
          //do nothing if out of range of grid
          if(diffx >= 0 && diffy >= 0 && diffx <= this.xrange && diffy <= this.yrange) {

            //round down to nearest 75
            diffx = diffx == 0 ? 0 : Math.floor(diffx / 75) * 75
            diffy = diffy == 0 ? 0 : Math.floor(diffy / 75) * 75

            //add back 37.5 and rounded difference value to get cell coordinate
            var xCellVal = this.xmin + 37.5 + diffx;
            var yCellVal = this.ymin + 37.5 + diffy;

            //find index of cell with coordinates
            var xIndex = xs.indexOf(xCellVal);
            var yIndex = ys.indexOf(yCellVal);

            //convert to data cell index
            var index = this.getIndex(xIndex, yIndex);

            //popup cell value
            L.popup({autoPan: false})
            .setLatLng(e.latlng)
            .setContent(COVER_INDEX_DETAILS[data[index]].type)
            .openOn(this.mymap);
          }

        }, 1000);
      });
      
    });

    this.mymap.on('mouseout', () => {
      this.mymap.off('mousemove');
      clearTimeout(this.popupTimer);
      this.mymap.closePopup();
    });
  }


  initializeLayers() {
    var __this = this;

    var init1 = CovJSON.read(MapComponent.landCoverFile).then(function(coverage) {
      var xs = coverage._covjson.domain.axes.x.values;
      var ys = coverage._covjson.domain.axes.y.values;

      //find which value's the minimum, assumes oredered values
      //subtract 37.5 since centroid of 75m cell
      __this.xmin = Math.min(xs[0], xs[xs.length - 1]) - 37.5;
      __this.ymin = Math.min(ys[0], ys[ys.length - 1]) - 37.5;
      //get range + 75 to account for cell width
      __this.xrange = Math.abs(xs[0] - xs[xs.length - 1]) + 75
      __this.yrange = Math.abs(ys[0] - ys[ys.length - 1]) + 75;

      // var xutm = coverage._covjson.domain.axes.x.values;
      // var yutm = coverage._covjson.domain.axes.y.values;
      // var convertUpperLeft = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [xutm[0] - 37.5, yutm[0] + 37.5]);
      // var convertLowerRight = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [xutm[xutm.length - 1] + 37.5, yutm[yutm.length - 1] - 37.5]);
      // //coordinate standards are dumb and inconsistent, need to swap
      // __this.upperLeftLatLng = [convertUpperLeft[1], convertUpperLeft[0]];
      // __this.lowerRightLatLng = [convertLowerRight[1], convertLowerRight[0]];
      // //test conversion
      // //L.marker(__this.lowerRightLatLng).addTo(__this.mymap);
      __this.gridWidthCells = xs.length;
      // __this.gridHeightCells = yutm.length;
      // //height lat, width long, should be long lat order in conversion (this is why standardizations exist...)
      // __this.gridHeightLat = Math.abs(convertUpperLeft[1] - convertLowerRight[1]);
      // __this.gridWidthLong = Math.abs(convertUpperLeft[0] - convertLowerRight[0]);
      // __this.coverBase = coverage;

      __this.types.landCover.data = coverage;
      //console.log(__this.currentCover._covjson.domain.axes);

      __this.loadCover(__this.types.landCover, false);
    });

    
    var init2 = CovJSON.read(MapComponent.rechargeFile).then(function(coverage) {
      __this.types.recharge.data = coverage;
      //console.log(__this.currentCover._covjson.domain.axes);
      //change this

      __this.loadCover(__this.types.recharge, true);
      var rechargeVals = __this.types.recharge.data._covjson.ranges.recharge.values;
      //__this.mapService.updateRechargeSum(this, rechargeVals);
    });

    var init3 = shp(MapComponent.aquifersFile).then((geojson) => {
      var aquifers = L.geoJSON();
      //two shape files, so array
      //might want to just remove "lines" shapefile
      geojson[1].features.forEach(aquifer => {
        aquifers.addData(aquifer);
        //console.log(aquifer);
      })
      aquifers.setStyle({
        weight: 5,
        opacity: 1,
        color: 'black',
        fillOpacity: 0
      });
      this.types.aquifers.layer = aquifers;
      aquifers.addTo(this.mymap);
      //this.downloadShapefile(aquifers);
      this.layers.addOverlay(aquifers, this.types.aquifers.label);
    });

    Promise.all([init1, init2, init3]).then(() => {
      this.orderLayers();
    })
  }


  //ensure layers are ordered as wanted
  //DOESNT WORK??????
  //maybe needs to be added to map to work, maybe just add onadd event to recharge layer to bring to front
  //geojson layer might just be different, check up on this
  //pretty low priority
  orderLayers() {
    this.layerOrdering.forEach((type) => {
      type.layer.bringToFront()
    })
  }


  downloadShapefile(shapes: any) {

    //testing
    //success :)
    var options = {
      folder: 'myshapes',
      types: {
          point: 'mypoints',
          polygon: 'mypolygons',
          line: 'mylines'
      }
    }
    // a GeoJSON bridge for features
    var test = shpwrite.zip({
        type: 'FeatureCollection',
        features: shapes.toGeoJSON().features
    });
    //console.log(test);
  }


  //swap to be added to drawn items list (and add in any other controls that might be necessary)
  //wait until file loading added so can test
  loadShapefile(fname: string, __this = this) {
    var shapes = L.geoJSON();
    shp(fname).then((geojson) => {
      //formatted as array if multiple shapefiles in zip
      if(Array.isArray(geojson)) {
        geojson.forEach(shpfile => {
          shpfile.forEach(shape => {
            shapes.addData(shape);
          });
        });
      }
      else {
        geojson.forEach(shape => {
          shapes.addData(shape);
        });
      }
      shapes.addTo(__this.mymap);
    });
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

      var highlight = {
        fillColor: 'black',
        weight: 5,
        opacity: 1,
        color: 'black',  //Outline color
        fillOpacity: 0.2
      };
      var unhighlight = {
        weight: 5,
        opacity: 0.5,
        color: 'black',  //Outline color
        fillOpacity: 0
      }
      //this.downloadShapefile(this.drawnItems)

      var __this = this;

      layer.setStyle(highlight);
      layer.highlighted = true;
      this.highlightedItems.addLayer(layer);

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
        
        
        if(this.highlighted) {
          this.setStyle(unhighlight);
          this.highlighted = false;
          __this.highlightedItems.removeLayer(this);
        }
        else {
          this.setStyle(highlight);
          this.highlighted = true;
          __this.highlightedItems.addLayer(this);
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
  // private loadMarkers(){
  //   let temp = this.mymap.getBounds();
  //   console.log(temp);
  //   let markers: Grid[];

  //   this.markerLayer.clearLayers();

  //   if(this.mymap.getZoom() > 16){
  //     //load the markers from service
  //     markers = this.mapService.getMarkers(temp._southWest.lat, temp._southWest.lng, temp._northEast.lat, temp._northEast.lng);

  //     for(let i = 0; i < markers.length ; i++){
  //       this.markerLayer.addLayer(L.marker([markers[i].lat, markers[i].lng]));
  //     }

  //     this.markerLayer.addTo(this.mymap);
  //   }

  //   console.log(markers);
    
  
  // }

  //can update recharge on select, all handled async, so shouldn't be an issue as long as landcover update handled in app
  //speaking of which, need to know how indexing works and write in-app computation of grid cells to change from that
  private updateRecharge(cover: string, handler) {

    var numItems = this.highlightedItems.getLayers().length;

    if(numItems != 0) {
      //deal with errors too

      Observable.forkJoin(this.highlightedItems.toGeoJSON().features.map(element => {
        return this.DBService.spatialSearch(element.geometry)
      }))
      .subscribe((data) => {
        //console.log(typeof data);
        //use file(s) generated as cover
        handler(data);
      });
      
    }
    //do nothing if nothing selected (base landcover wont change)
    //moved
    // else if(this.coverBase == undefined) {
    //   this.mapService.updateDetails(this, null, null, cover);
    //   let coverFile = this.getCoverFile(cover);
    //   CovJSON.read('../assets/covjson/' + coverFile).then(function(coverage) {
    //     console.log(coverage._covjson.domain.axes);
    //     var xutm = coverage._covjson.domain.axes.x.values;
    //     var yutm = coverage._covjson.domain.axes.y.values;
    //     var convertUpperLeft = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [xutm[0] - 37.5, yutm[0] + 37.5]);
    //     var convertLowerRight = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [xutm[xutm.length - 1] + 37.5, yutm[yutm.length - 1] - 37.5]);
    //     //coordinate standards are dumb and inconsistent, need to swap
    //     __this.upperLeftLatLng = [convertUpperLeft[1], convertUpperLeft[0]];
    //     __this.lowerRightLatLng = [convertLowerRight[1], convertLowerRight[0]];
    //     //test conversion
    //     //L.marker(__this.lowerRightLatLng).addTo(__this.mymap);
    //     __this.gridWidthCells = xutm.length;
    //     __this.gridHeightCells = yutm.length;
    //     //height lat, width long, should be long lat order in conversion (this is why standardizations exist...)
    //     __this.gridHeightLat = Math.abs(convertUpperLeft[1] - convertLowerRight[1]);
    //     __this.gridWidthLong = Math.abs(convertUpperLeft[0] - convertLowerRight[0]);
    //     __this.coverBase = coverage;
    //     __this.currentCover = [coverage];
    //     console.log(__this.currentCover[0]._covjson.domain.axes);
    //     __this.coverColors = [COVER_ENUM[cover]];
    //     __this.updateRecharge(mymap, layers, __this)
    //   });
    // }
  }

  //horrendously innefficient, will be fixed when actual cover methods put in place

  //no longer need all the hole cutting stuff remove and clean up
  private updateCover(type: string) {
    var __this = this;
    //might as well update recharge as well, async so shouldnt affect performance of core app
    //also handle recharge sums (aquifers and total) here
    //also may need to add some sort of block that releases when finished (eg a boolean switch) to ensure reports generated include all changes (wait until async actions completed)
    this.updateRecharge(type, (update) => {
      update.forEach(area => {
        // var newCov = JSON.parse(JSON.stringify(this.currentCover[0]));
        //var newCovBase = newCov._covjson.ranges.recharge.values;
        // //stringify/parse does not copy over these values, since theyre functions
        // console.log(this.currentCover[0]);
        // newCov._covjson.domain.axes = new Map(this.currentCover[0]._covjson.domain.axes);
        // newCov.parameters = new Map(this.currentCover[0].parameters);
        // newCov._domainPromise.__zone_symbol__value.axes = new Map(this.currentCover[0]._domainPromise.__zone_symbol__value.axes);
        // console.log(newCov);
        //just the holes for shape, so rest null
        // for(var i = 0; i < newCovBase.length; i++) {
        //   newCovBase[i] = null;
        // }
        area.forEach(record => {
          var recordBase = record.value;
          var x = recordBase.x;
          var y = recordBase.y;
          var index = this.getIndex(x, y);
          //change to reflect enumerated type
          this.types.recharge.data[index] = recordBase[this.currentScenario][0];
        });
      });
      //reload recharge cover
      __this.loadCover(__this.types.recharge, true)
      var rechargeVals = this.types.recharge.data._covjson.ranges.recharge.values;
      this.mapService.updateRechargeSum(this, rechargeVals);
    });

    //ADD LOGIC FOR FINDING AND REPLACING CELLS IN LANDCOVER HERE

    //reload layer from changes
    this.loadCover(this.types.landCover, false)
  }


  //prolly need parameter to say whether to start layer toggled on or off, might want to add this to types def
  //update names and make sure works
  private loadCover(coverage, legend: boolean) {
    if(coverage.layer != undefined) {
      this.mymap.removeControl(coverage.layer);
      this.layers.removeLayer(coverage.layer);
    }
    //remove old layer from map and control
    //__this.currentCover = coverages;
    
    //var xaxis = coverage._covjson.domain.axes.x.values;
    //var yaxis = coverage._covjson.domain.axes.y.values;

    // var test = [];
    // for(var i = 0; i < 100000; i++) {
    //   test.push(null);
    // }

    // rechargeVals.splice(100000, 100000, ...test);
    //console.log(coverage);
    // work with Coverage object
    var layer = C.dataLayer(coverage.data, {parameter: coverage.parameter, palette: coverage.palette})
    .on('afterAdd', () => {
      if(legend) {
        //see how behaves, probably need this back
        // this.legend = C.legend(layer);
        // this.legend.addTo(this.mymap);
        C.legend(layer)
        .addTo(this.mymap);
      }
    })
    .setOpacity(1)
    //ensure recharge layer on top (don't want to have to remove covers to view it)
    if(this.types.recharge.layer != undefined) {
      this.types.recharge.layer.bringToFront();
    }
    //recharge disabled by default
    if(coverage != this.types.recharge) {
      layer.addTo(this.mymap);
    }
    this.layers.addOverlay(layer, coverage.label);
    coverage.layer = layer;
    
  }


  // public changeCover(cover: string){
  //   this.loadcovJSON(cover, this.mymap, this.layers);
  // }

  public changeScenario(type: string) {
    this.currentScenario = type;
    this.mapService.updateDetails(this, null, type, null);
  }


  // private getCoverFile(cover: string){
  //   if(cover === "AlienForest"){
  //     return "testfiles_sc0_0-fin.covjson";
  //   }
  //   else if(cover === "AlienForestFog"){
  //     return "testfiles_sc0_1-fin.covjson";
  //   }
  //   else if(cover === "Fallow"){
  //     return "testfiles_sc0_2-fin.covjson";
  //   }
  //   else if (cover === "Grassland"){
  //     return "testfiles_sc0_3-fin.covjson";
  //   }
  //   else if (cover === "Kiawe"){
  //     return "testfiles_sc0_4-fin.covjson";
  //   }
  //   else if(cover === "LowIntensity"){
  //     return "testfiles_sc0_5-fin.covjson";
  //   }
  //   else if(cover === "Native"){
  //     return "testfiles_sc0_6fin.covjson";
  //   }
  //   else if(cover === "covers") {
  //     return "landcover.covjson";
  //   }
  // }


  private agitate(vals: number[]) {
    for(var i = 0; i <30; i++) {
      var s1 = Math.round(Math.random() * 30);
      var s2 = Math.round(Math.random() * 30);
      var temp = vals[s1];
      vals[s1] = vals[s2];
      vals[s2] = temp;
    }
    return vals;
  }

  //generate 31 colors
  private colorPalette(): string[] {
    var palette = []
    var range = 255;
    var color;
    var r;
    var g;
    var b;
    var first = true;
    for(var i = 0; i < 4; i++) {
      for(var j = 0; j < 3; j++) {
        for(var k = 0; k < 3; k++) {
          if(palette.length >= 31) {
            break;
          }
          //avoid black so lines stand out more (have 5 extra colors)
          if(!first) {
            r = (Math.round(range / 2 * i)).toString(16);
            g = (Math.round(range / 2 * j)).toString(16);
            b = (Math.round(range / 2 * k)).toString(16);
            if(r.length < 2) r = "0" + r;
            if(g.length < 2) g = "0" + g;
            if(b.length < 2) b = "0" + b;
            color = "#" + r + g + b;
            palette.push(color);
          }
          else {
            first = false;
          }
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
    for(i = 0; i < 31; i++) {
      COVER_INDEX_DETAILS[i].color = palette[i];
      document.documentElement.style.setProperty("--color" + i.toString(), palette[i]);
    }
    
    //palette = this.agitate(palette);
    return palette;
  }

  private getIndex(x: number, y: number, __this = this): number {
    return y * __this.gridWidthCells + x;
  }
}


