import { Component, OnInit, AfterContentInit, ViewChild, ElementRef, EventEmitter, Input, Output } from '@angular/core';
import { MapService } from '../map/shared/map.service';
import { Http } from '@angular/http';
import 'rxjs/add/operator/map';
import { Grid } from './shared/grid';
import { Cover } from './shared/cover';
import { DBConnectService } from './shared/dbconnect.service';
import { isNullOrUndefined } from 'util';
import 'rxjs/add/observable/forkJoin';
import { Observable } from 'rxjs';
//import { CovDetailsService } from 'app/map/shared/cov-details.service';
import { COVER_ENUM, COVER_INDEX_DETAILS } from './shared/cover_enum';
import * as proj4x from 'proj4';
import * as shp from 'shpjs';
//import * as shpwrite from 'shp-write';
import * as JSZip from 'jszip'
// import * as shpWriteGeojson from '../../../node_modules/shp-write/src/geojson'
import * as shpWritePrj from '../../../node_modules/shp-write/src/prj';
import { saveAs } from 'file-saver';
import { WindowService } from '../window/shared/window.service';
import { WindowPanel } from '../window/shared/windowPanel';
import { isGeoJSONObject } from 'geojson-validation'
import { MessageDialogComponent } from "../message-dialog/message-dialog.component"
import {MatDialog} from "@angular/material";
import { AdvancedMappingDialogComponent } from '../advanced-mapping-dialog/advanced-mapping-dialog.component';
import { ModifiedShpwriteService } from './shared/modified-shpwrite.service';
import { CovjsonTemplateService } from './shared/covjson-template.service';
import { AQUIFER_NAME_MAP, AQUIFER_CODE_MAP } from './shared/aquifer_name_map';
import * as chroma from '../../../node_modules/chroma-js/chroma.js';
import * as CovJSON from 'covjson-reader';
import { WebWorkerService } from 'ngx-web-worker';
import 'leaflet-easyprint';
import * as pnglib from 'pnglib';
import {workerGetInternalIndices} from "./worker-scripts/worker-scripts";



declare let L: any;
declare let C: any;
declare let require: any;


@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
  providers: []
})
export class MapComponent implements OnInit, AfterContentInit {

  @ViewChild('mapid') mapid;

  @Output("showReport") report = new EventEmitter();

  static readonly METER_TO_MILE_FACTOR = 0.000621371;
  static readonly INCH_TO_MILLIMETER_FACTOR = 25.4;
  static readonly GALLON_TO_LITER_FACTOR = 3.78541;
  static readonly SPECIAL_AQUIFERS = ["30701", "30702"];
  static readonly MAX_RECHARGE = 180;
  static readonly USGS_PURPLE_RECHARGE = 450;

  rechargePaletteTailLength: number;
  rechargePaletteHeadLength: number;

  currentDataInitialized = false;
  scenariosInitialized = false;

  map: any;
  popup: any;
  shpfile: any;
  shpfileString: string;
  toggleShapeFile: boolean;
  paletteType: string;

  csvLayer: any;
  csvData: any;
  markerLayer = new L.LayerGroup;
  baseLayer: any;

  layer: any;
  layers: any;

  drawnItems: any;
  uneditableItems: any;
  highlightedItems: any;
  drawControl: any;

  nonDisplayedCustomObjects: any;

  highlightedCell: any;

  selectedCell: any;

  opacity = 1;

  interactionType: string;

  nameModeDetails: {
    oldInteractionType: string,
    selectedShape: any
  }

  shapeMetricsEnabled: boolean;

  paletteExtent = [0, MapComponent.MAX_RECHARGE];
  pchangeExtent = [-100, 100];
  diffExtent = [-10, 10];

  windowId: number;

  advancedMappingState: any;

  customAreasCount = 1;

  customAreaMap: any = {};

  metrics: {
    customAreas: any[],
    aquifers: any[],
    aquifersNoCaprock: any[],
    customAreasTotal: any,
    total: any,
    totalNoCaprock: any
  }

  scenarioLabelMap = {
    recharge_scenario0: {
      baseline: "Baseline Rainfall",
      current: "Baseline Rainfall 1978-2007"
    },
    recharge_scenario1: {
      baseline: "RCP 8.5",
      current: "RCP 8.5 2041-2070"
    }
  }

  scenarioFnames = {
    recharge_scenario0: "_baseline_rainfall",
    recharge_scenario1: "_rainfall_projection_RCP_8.5"
  };

  defaultMetrics: any;

  // landCover: any;
  // landCoverLayer: any;
  // recharge: any;
  // rechargeLayer: any;
  // aquiferLayer: any;

  currentScenario: string;
  baseScenario: string;
  legend: any;

  // upperLeftLatLng: any;
  // lowerRightLatLng: any;

  // gridWidthLong: number;
  // gridHeightLat: number;
  gridWidthCells: number;
  gridHeightCells: number;
  xmin: number;
  ymin: number;
  xrange: number;
  yrange: number;

  popupTimer: any;

  validLandcoverRange: {
    min: number,
    max: number
  };

  numCustomOverlays = 0;


  undoStack: any[];
  redoStack: any[];
  


  //static baseStyle: any;

  //remember to reformat file so parameter isnt "recharge", etc
  static readonly landCoverFile = "../assets/covjson/landcover.covjson";
  //change once get actual data, just use first test file for now
  static readonly rechargeFiles = {
    recharge_scenario0: "../assets/covjson/sc0.covjson",
    recharge_scenario1: "../assets/covjson/sc1.covjson"
  }
  static readonly aquiferFiles = {
    aquiferShpFile: "../assets/dlnr_aquifers.zip",
    aquiferGridFile: "/assets/Oahu__75m__AQUI_CODE.asc"
  };
  static readonly caprockFiles = {
    caprockShpFile: "../assets/oahu_caprock.zip",
    caprockGridFile: "../assets/Oahu__75m__caprock.asc"
  };

  rcPalette: string[];
  rcDivergingPalette: string[];

  types = {
    landCover: {
      parameter: "cover",
      label: "Land Cover",
      palette: null,
      data: null,
      baseData: null,
      layer: null
    },
    recharge: {
      parameter: "recharge",
      label: "Recharge Rate",
      palette: null,
      data: null,
      baseData: {
        recharge_scenario0: null,
        recharge_scenario1: null
      },
      currentData: {
        recharge_scenario0: null,
        recharge_scenario1: null
      },
      layer: null,
      style: "rate"
    },
    aquifers: {
      label: "Aquifers",
      layer: null
    },
    caprocks: {
      label: "Caprocks",
      layer: null
    }
  };

  unitType = "USC"

  aquifers = [];
  caprock = [];
  includeCaprock = true;

  highlightedAquiferIndices = [];

  readonly layerOrdering = [this.types.landCover, this.types.recharge, this.types.aquifers];

  static readonly utm = "+proj=utm +zone=4 +datum=NAD83 +units=m";
  static readonly longlat = "+proj=longlat";
  static readonly proj4 = (proj4x as any).default;

  fileHandler: {
    reader: FileReader,
    working: Promise<any>[],
    busy: boolean
  };


  constructor(private DBService: DBConnectService, private mapService: MapService, private windowService: WindowService, private http: Http, private dialog: MatDialog, private modShpWrite: ModifiedShpwriteService, private covjsonTemplate: CovjsonTemplateService, private webWorker: WebWorkerService) {
    //should put all these in constructors to ensure initialized before use
    this.mapService.setMap(this);
  }

  ngOnInit() {

  }

  ngAfterContentInit() {
    this.mapService.setLCButtonPalette(this);
  }

  ngAfterViewInit() {

    this.map = L.map(this.mapid.nativeElement, {
      zoomSnap: 0.01,
      wheelPxPerZoomLevel: 200,
      minZoom: 10,
      center: [21.48, -157.9665],
      zoom: 10.6,
      maxBounds: [
        [21.1462, -158.4377],
        [21.7852, -157.5153]
      ]
    });

    // L.easyPrint({
    //   title: 'My awesome print button',
    //   position: 'bottomright',
    //   sizeModes: ['A4Portrait', 'A4Landscape'],
    //   exportOnly: true
    // }).addTo(this.map);

    L.esri.basemapLayer('Imagery').addTo(this.map);
    //create empty layer for displaying base map
    let empty = L.featureGroup();
    L.control.scale().addTo(this.map);

    //remove esri logo, couldn't find a better way
    this.map._controlContainer.children[3].removeChild(this.map._controlContainer.children[3].children[0]);

    this.popup = L.popup();
    this.paletteType = "usgs";

    //thinking I like the collapsed version with this stuff
    this.layers = L.control.layers({ "Satellite Image": empty }, null).addTo(this.map)
    
    let layerControl = this.map._controlContainer.children[1];
    layerControl.style.visibility = "hidden";

    this.rcPalette = this.USGSStyleRechargePalette();
    this.rcDivergingPalette = this.divergingPalette();

    this.types.recharge.palette = C.linearPalette(this.rcPalette);
    this.types.landCover.palette = C.directPalette(this.landCoverPalette());

    this.initializeData().then(() => {
      layerControl.style.visibility = "visible";

      this.mapService.dataLoaded(this);
      this.mapService.setLoading(this, false);

      //possibly change if on recharge
      this.map.on('mouseover', () => {
        L.DomUtil.addClass(this.map._container, 'crosshair-cursor-enabled');
        this.map.on('mousemove', (e) => {
          if (this.highlightedCell) {
            this.map.removeLayer(this.highlightedCell);
            this.highlightedCell = null;
          }
          this.map.closePopup();
          clearTimeout(this.popupTimer);
          this.popupTimer = setTimeout(() => {

            //coords for conversion in long lat format
            let convertedMousePoint = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [e.latlng.lng, e.latlng.lat]);
            //round x and y values to nearest multiple of 75 offset from first x/y value, then find position of grid cell that corresponds to this value from stored cover file
            let data = this.types.landCover.data._covjson.ranges.cover.values;
            let xs = this.types.landCover.data._covjson.domain.axes.get("x").values;
            let ys = this.types.landCover.data._covjson.domain.axes.get("y").values;

            //get difference from min to mouse position
            let diffx = convertedMousePoint[0] - this.xmin;
            let diffy = convertedMousePoint[1] - this.ymin;
            //do nothing if out of range of grid
            if (diffx >= 0 && diffy >= 0 && diffx <= this.xrange && diffy <= this.yrange) {

              //round down to nearest 75
              diffx = Math.floor(diffx / 75) * 75;
              diffy = Math.floor(diffy / 75) * 75;

              //get cell boundaries as geojson object to draw on map
              //cell corners
              let c1 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [this.xmin + diffx, this.ymin + diffy]);
              let c2 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [this.xmin + diffx + 75, this.ymin + diffy]);
              let c3 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [this.xmin + diffx + 75, this.ymin + diffy + 75]);
              let c4 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [this.xmin + diffx, this.ymin + diffy + 75]);
              let cellBounds = {
                "type": "Feature",
                "properties": {},
                "geometry": {
                  "type": "Polygon",
                  "coordinates": [[c1, c2, c3, c4, c1]]
                }
              };
              this.highlightedCell = L.geoJSON(cellBounds, { interactive: false })
                .setStyle({
                  fillColor: 'orange',
                  weight: 3,
                  opacity: 1,
                  color: 'orange',
                  fillOpacity: 0.2
                })
                .addTo(this.map)

              //add back 37.5 and rounded difference value to get cell coordinate
              let xCellVal = this.xmin + 37.5 + diffx;
              let yCellVal = this.ymin + 37.5 + diffy;

              //find index of cell with coordinates
              let xIndex = xs.indexOf(xCellVal);
              let yIndex = ys.indexOf(yCellVal);

              //convert to data cell index
              let index = this.getIndex(xIndex, yIndex);

              //popup cell value
              let popup = L.popup({ autoPan: false })
                .setLatLng(e.latlng);
              if (data[index] == this.types.landCover.baseData[index]) {
                popup.setContent("Current: " + COVER_INDEX_DETAILS[data[index]].type)
              }
              else {
                popup.setContent("Current: " + COVER_INDEX_DETAILS[data[index]].type + "<br> Original: " + COVER_INDEX_DETAILS[this.types.landCover.baseData[index]].type)
              }
              popup.openOn(this.map);
            }

          }, 1000);
        });

      });
    });

    this.undoStack = [];
    this.redoStack = [];

    this.fileHandler = {
      reader: new FileReader(),
      working: [],
      busy: false
    };

    this.defaultMetrics = {
      USC: {
        average: {
          original: "0.00",
          current: "0.00",
          diff: "0.00",
          pchange: "0.00"
        },
        volumetric: {
          original: "0.00",
          current: "0.00",
          diff: "0.00",
          pchange: "0.00"
        },
        area: "0.00"
      },
      Metric: {
        average: {
          original: "0.00",
          current: "0.00",
          diff: "0.00",
          pchange: "0.00"
        },
        volumetric: {
          original: "0.00",
          current: "0.00",
          diff: "0.00",
          pchange: "0.00"
        },
        area: "0.00"
      }
    };

    //think there's a value in the middle that's invalid, may need to give valid values if issue, probably ok and more efficient like this though
    this.validLandcoverRange = {
      min: 0,
      max: 32
    };

    this.map.on('movestart', () => {
      L.DomUtil.removeClass(this.map._container, 'crosshair-cursor-enabled');
      L.DomUtil.addClass(this.map._container, 'leaflet-grab');
    });
    this.map.on('moveend', () => {
      L.DomUtil.removeClass(this.map._container, 'leaflet-grab');
      L.DomUtil.addClass(this.map._container, 'crosshair-cursor-enabled');
    });

    //need to add a way to store initial layer, just need layer and name probably, so manually add name at init
    this.map.on('baselayerchange', (e) => {
      //console.log(e);
      //store current layer details
      this.baseLayer = e;
      //if ever need to get neame from leaflet layer control, here it is, change "0" in children[1][0] to index of label
      //let's just use my control panel and toss the idea of using the layer control, waaaaay more effort than anything is worth
      //console.log(this.map._controlCorners.topright.children[0].children[1][0].labels[0].innerText);
      switch (e.name) {
        case "Land Cover":
          this.mapService.changeLayer(this, "landcover");
          //if swapping to land cover mode while in naming mode indicate want shape interaction when break out, otherwise just enable
          if(this.interactionType != "name") {
            this.setMode("custom");
            this.drawControl.addTo(this.map);
          }
          else {
            this.nameModeDetails.oldInteractionType = "custom"
          }
          this.mapService.baseDetails(this);
          //throws an error for some reason if run immediately (though it still works...)
          //possible that event goes through before layer fully swapped, so run on a delay
          setTimeout(() => {
            this.baseLayer.layer.setOpacity(this.opacity);
          }, 0);

          break;
        //need to figure out how you want to handle this, should modifications be disabled?
        case "Satellite Image":
          this.mapService.changeLayer(this, "base");
          //if swapping to base map while in naming mode indicate want shape interaction when break out, otherwise just enable
          if(this.interactionType != "name") {
            this.setMode("custom");
          }
          else {
            this.nameModeDetails.oldInteractionType = "custom"
          }
          this.drawControl.remove();
          this.mapService.baseDetails(this);
          break;
        //can use fallthrough to have any recharge layers have the same behavior
        case "Recharge Rate":
          
          this.mapService.changeLayer(this, "recharge");
          this.drawControl.remove();
          //console.log(this.metrics.total);
          // this.includeCaprock ? this.mapService.updateMetrics(this, "full", this.metrics.total.roundedMetrics) : this.mapService.updateMetrics(this, "full", this.metrics.totalNoCaprock.roundedMetrics);
          //if swapping to recharge mode while in naming mode indicate want full map metrics (default recharge mode) when break out, otherwise just switch
          if(this.interactionType != "name") {
            this.setMode("full");
          }
          else {
            this.nameModeDetails.oldInteractionType = "full";
          }
          
          //throw errors for some reason if run immediately
          //possible that event goes through before layer fully swapped, so run on a delay
          setTimeout(() => {
            this.baseLayer.layer.setOpacity(this.opacity);
          }, 0);
          break;
      }
    });

    this.map.on('mouseout', () => {
      L.DomUtil.removeClass(this.map._container, 'crosshair-cursor-enabled');
      this.map.off('mousemove');
      clearTimeout(this.popupTimer);
      this.map.closePopup();
    });
  }



  dropHandler(e) {
    e.preventDefault();
    //defualt to custom shapes for drag upload, maybe change later
    //this.uploadShapefileAsCustom(e.dataTransfer.files);
    //console.log(e.dataTransfer.files);

  }

  // uploadShapefileAsCustom(files: any[]) {
  //   //ensure reader initialized
  //   if (this.r) {
  //     //think can redefine onload function, if not working might have to reinitialize file reader
  //     this.r.onload = (e) => {
  //       //console.log(this.r.result);
  //       shp(this.r.result).then((geojson) => {
  //         //console.log(geojson);
  //         //array if multiple shapefiles, else single object
  //         if (Array.isArray(geojson)) {
  //           geojson.forEach(shpset => {
  //             this.parseAndAddShapes(shpset);
  //           });
  //         }
  //         else {
  //           this.parseAndAddShapes(geojson);
  //         }
  //       });
  //     }

  //     for (let i = 0; i < files.length; i++) {
  //       this.r.readAsArrayBuffer(files[i]);
  //     }
  //   }
  // }


  // uploadShapefileAsReference(files: any[]) {

  //   //name layer name of first file
  //   let fname = files[0].name;
  //   //strip extension
  //   fname = fname.substr(0, fname.lastIndexOf('.'));

  //   //ensure reader initialized
  //   if (this.r) {
  //     //think can redefine onload function, if not working might have to reinitialize file reader
  //     this.r.onload = (e) => {
  //       //console.log(this.r.result);
  //       shp(this.r.result).then((geojson) => {

  //         let refLayer = L.geoJSON();

  //         //array if multiple shpfiles
  //         if (Array.isArray(geojson)) {
  //           geojson.forEach((shpset) => {
  //             shpset.features.forEach(object => {
  //               refLayer.addData(object);
  //             })
  //           })

  //         }
  //         //else single element
  //         else {
  //           geojson.features.forEach(object => {
  //             refLayer.addData(object);
  //           })
  //         }

  //         refLayer.setStyle({
  //           weight: 3,
  //           opacity: 1,
  //           color: 'black',
  //           fillOpacity: 0
  //         });
  //         refLayer.addTo(this.map);
  //         this.layers.addOverlay(refLayer, fname);

  //       });
  //     }

  //     for (let i = 0; i < files.length; i++) {
  //       this.r.readAsArrayBuffer(files[i]);
  //     }
  //   }


  // }


  setUnits(type: string) {
    this.unitType = type;
    if(this.legend != undefined) {
      this.map.removeControl(this.legend);
    }
    if(this.baseLayer.name == "Recharge Rate") {
      this.createLegend(this.types.recharge.style);
    }
  }

  //should anything be here?
  dragOverHandler(e) {
    e.preventDefault();
  }

  //add file end handling. think have to remove it, etc
  dragEndHandler(e) {
    e.preventDefault();
  }

  //swap values in bottom level arrays
  private swapCoordinates(arrLevel: any[]): any[] {
    //deep copy everything so not changing base array
    let arrCopy = [];
    //base case, values are not arrays
    if (!Array.isArray(arrLevel[0])) {
      arrCopy = Array.from(arrLevel)
      let temp = arrCopy[0];
      arrCopy[0] = arrCopy[1];
      arrCopy[1] = temp;
      return arrCopy;
    }
    arrLevel.forEach(arr => {
      arrCopy.push(this.swapCoordinates(arr));
    });
    return arrCopy;
  }

  // private repackageShapes(shapes: any): any {
  //   let componentIndices = [];
  //   let indices = this.getInternalIndices(shapes.toGeoJSON());
  //   indices.forEach((index) => {
  //     componentIndices.push(this.getComponents(index));
  //   });
  //   return this.generateGeometriesFromPoints(componentIndices);
  // }

  private repackageIndices(internalIndices: number[]) {
    let componentIndices = [];
    internalIndices.forEach((index) => {
      componentIndices.push(this.getComponents(index));
    });
    //console.log(componentIndices);
    return this.generateGeometriesFromPoints(componentIndices);
  }

  
  private parseAndAddShapes(shapes: any, nameProperty: string) {

    let args = {
      host: window.location.host,
      path: window.location.pathname,
      protocol: window.location.protocol,
      data: {
        geojsonObjects: shapes,
        xs: this.types.landCover.data._covjson.domain.axes.get("x").values,
        ys: this.types.landCover.data._covjson.domain.axes.get("y").values,
        lcVals: this.types.landCover.data._covjson.ranges.cover.values,
        gridWidthCells: this.gridWidthCells,
        gridHeightCells: this.gridHeightCells,
        longlat: MapComponent.longlat,
        utm: MapComponent.utm,
        options: {
          breakdown: true
        }
      }
    }
    this.webWorker.run(workerGetInternalIndices, args).then((indices) => {
      let precomputedIndices = {
        layer: null,
        total: indices.internal
      }

      shapes.features.forEach((shape, i) => {
        //deepcopy so don't mess up original object when swapping coordinates
        let coordsBase = shape.geometry.coordinates;
  
        //allow for custom property to be defined
        //default is name
        let name = shape.properties[nameProperty];
  
        //swap coordinates, who wants consistent standards anyway?
        //different formats have different numbers of nested arrays, recursively swap values in bottom level arrays
        let polyCoords = this.swapCoordinates(coordsBase);
  
  
        let last = i == shapes.features.length - 1;
        //this should handle multipolygons fine, actually
        precomputedIndices.layer = indices.breakdown[i].internal;
        this.addDrawnItem(L.polygon(polyCoords, {}), true, name, last, precomputedIndices);
        // }
      });
    });


  
    // let indices = this.getInternalIndices(this.drawnItems.toGeoJSON(), {});
    // let customTotal = this.getMetricsSuite(indices.internal, true);
    // this.metrics.customAreasTotal.metrics = customTotal;
    // this.metrics.customAreasTotal.roundedMetrics = this.roundMetrics(customTotal);
  }


  //need to check if shapes have valid property (moved so have to check here)
  addUploadedLandcoverByShape(shapes: any, lcProperty: string, overwrite: boolean) {
    //create new geojson set with only items that have landcover property
    let lcShapes = L.geoJSON(shapes.features.filter(shape => shape.properties[lcProperty] != undefined)).toGeoJSON();
    //shapes.features = shapes.features.filter(shape => shape.properties[lcProperty]);

    //L.geojson creates layer and is probably inefficient, want to make own function that creates geojson objects from features directly

    //can't do this while db ops running, need to run checks before can run db ops
    //package relevant information and run land cover replacements async
    let indices: any = this.getInternalIndices(lcShapes, {background: true, breakdown: true});
    let repackage = this.checkRepackageShapes(lcShapes, indices.breakdown);
    let internalIndices = indices.internal;

    //there are no indices to change
    if(internalIndices.length == 0) {
      return;
    }

    let queryShapes = repackage ? this.repackageIndices(internalIndices) : lcShapes;

    if(indices.background > 0) {
      this.dialog.open(MessageDialogComponent, {data: {message: "Attempting to change background cells.\nPlease note that changes to background cells will not be included.", type: "Warning"}});
    }

    let covData = this.types.landCover.data._covjson.ranges.cover.values;

    //backup values to restore on data failure
    let backupData = Array.from(covData);

    let covRemap = new Promise((resolve) => {

      lcShapes.features.forEach((shape, i) => {
        //default property is lcCode, add advanced option to upload where can specify
        let lc = shape.properties[lcProperty];
        let featureIndices = indices.breakdown[i].internal;

        featureIndices.forEach((index) => {
          if(covData[index] != 0) {
            covData[index] = lc;
            if(overwrite) {
              this.types.landCover.baseData[index] = lc;
            }
          }
        });

      });
      
      //reload layer from changes
      this.loadCover(this.types.landCover, false);
      resolve();
    });

    this.updateRecharge(queryShapes, (update) => {
      //console.log(update);
      //ensure coverage remapping complete before processing recharge values
      covRemap.then(() => {
        update.forEach((area) => {
          //how does it behave if out of coverage range? check db response and modify so doesn't throw an error
          area.forEach(record => {
            let recordBase = record.value;
            let x = recordBase.x;
            let y = recordBase.y;
            let index = this.getIndex(x, y);

            //might contain points not changed, 
            //coverage reassignment completed first, so use this value (covData[index]) to get index in db results
            let mappedType = covData[index];

            Object.keys(this.types.recharge.currentData).forEach((scenario) => {
              //background is not included in the database so indexes shifted by 1
              //if background type set recharge rate to 0
              let recordValue = mappedType == 0 ? 0 : recordBase[scenario][mappedType - 1]

              this.types.recharge.currentData[scenario][index] = recordValue;
              if(overwrite) {
                this.types.recharge.baseData[scenario][index] = recordValue;
              }
            });

          });
        });

        this.updateMetrics(lcShapes);
        this.loadRechargeStyle(this.types.recharge.style);
      });
      
    }, (error) => {
      //restore land cover on failure
      backupData.forEach((value, i) => {
        covData[i] = value;
      });
      this.loadCover(this.types.landCover, false);
    });

  }

  forceObjectsShow() {
    if(!this.map.hasLayer(this.drawnItems)) {
      this.drawnItems.addTo(this.map);
      if(this.baseLayer.name == "Land Cover") {
        this.drawControl.addTo(this.map);
      }
    }
    this.mapService.switchToShow(this);
  }

  showHideObjects(showOrHide: string) {
    if(showOrHide == "Show") {
      this.drawnItems.addTo(this.map);
      if(this.baseLayer.name == "Land Cover") {
        this.drawControl.addTo(this.map);
      }
    }
    else {
      this.drawControl.remove();
      this.map.removeLayer(this.drawnItems);
    }
  }

  private changeLayerOpacity(opacity: number) {
    //shouldn't change base map opacity
    if(this.baseLayer.name != "Satellite Image") {
      this.baseLayer.layer.setOpacity(opacity);
    }
    this.opacity = opacity;
  }

  public setMode(mode: string) {
    switch(mode) {
      case "cell": {
        //disable mass selection
        this.mapService.updateSelect(this, 0, 0);
        this.addCellInteraction();
        break;
      }  
      case "custom": {
        this.forceObjectsShow();
        if(this.baseLayer.name == "Recharge Rate") {
          this.enableShapeInteraction(true);
          //get initial metrics for already selected shapes
          this.getSelectedShapeMetrics();
        }
        else {
          this.enableShapeInteraction(false);
        }
        break;
      }
      case "aquifer": {
        this.addAquiferInteractions();
        break;
      }
      case "full": {
        //disable mass selection
        this.mapService.updateSelect(this, 0, 0);
        //just get metrics, not interactive
        this.getWholeMapMetrics();
        break;
      }
    }
  }

  toggleNameMode() {
    let highlight = {
      fillColor: 'black',
      weight: 3,
      opacity: 1,
      color: 'black',  //Outline color
      fillOpacity: 0.2
    };
    let unhighlight = {
      weight: 3,
      opacity: 0.5,
      color: 'black',  //Outline color
      fillOpacity: 0
    }

    if(this.interactionType == "name") {
      this.drawnItems.eachLayer((layer) => {
        layer.off('click');
        layer.setStyle(unhighlight);
      });
      this.highlightedItems.eachLayer((layer) => {
        layer.setStyle(highlight);
      });
      if(this.baseLayer.name == "Land Cover") {
        this.drawControl.addTo(this.map);
      }
      this.setMode(this.nameModeDetails.oldInteractionType);
      
    }
    else {
      this.forceObjectsShow();
      this.drawControl.remove();
      this.disableInteraction(this.interactionType);
      this.nameModeDetails = {
        oldInteractionType: this.interactionType,
        selectedShape: null
      }
      this.interactionType = "name";
  
      this.drawnItems.eachLayer((layer) => {
        layer.setStyle(unhighlight);
        layer.on('click', (e) => {
          if(this.nameModeDetails.selectedShape) {
            this.nameModeDetails.selectedShape.setStyle(unhighlight);
          }
          layer.setStyle(highlight);
          this.nameModeDetails.selectedShape = layer;
          this.mapService.setNameOnSelect(this, this.customAreaMap[layer._leaflet_id].name);
        });
      });
    }
    
  }

  registerNameToShape(name: string) {
    this.customAreaMap[this.nameModeDetails.selectedShape._leaflet_id].name = name;
  }


  private disableInteraction(interaction: string) {
    switch (interaction) {
      case "cell":
        this.disableCellInteraction();
        break;
      case "custom":
        this.disableShapeInteraction();
        break;
      case "aquifer":
        this.disableAquiferInteraction();
        break;
      //no whole map interaction to disable
      //name interaction handled on toggle off, so no need do anything
    }
  }

  // updateSelect() {
  //   ;
  //   fwerw
  //   this.mapService.updateSelect(this, this.drawnItems.getLayers().length, this.highlightedItems.getLayers().length);
  // }

  private addAquiferInteractions() {
    if (this.interactionType == "aquifer") {
      //already in aquifer mode
      return;
    }
    else {
      //disable previous interaction type
      this.disableInteraction(this.interactionType)
    }

    this.interactionType = "aquifer";

    let highlightedAquifers = [];

    let highlight = {
      fillColor: 'black',
      weight: 3,
      opacity: 1,
      color: 'black',  //Outline color
      fillOpacity: 0.2
    };
    let unhighlight = {
      weight: 3,
      opacity: 1,
      color: 'black',  //Outline color
      fillOpacity: 0
    }

    //make sure aquifers aren't hidden
    if(!this.map.hasLayer(this.types.aquifers.layer)) {
      this.types.aquifers.layer.addTo(this.map);
    }

    this.types.aquifers.layer.eachLayer((layer) => {
      //console.log(layer)
      layer.higlighted = false;
      //clicks intercepted by drawn shapes if behind
      layer.bringToFront();
      layer.on('click', (e) => {
        if(layer.highlighted) {
          layer.setStyle(unhighlight)
          layer.highlighted = false;
          //remove aquifer name from highlighted list
          highlightedAquifers.splice(highlightedAquifers.indexOf(layer.feature.properties.CODE), 1);
        }
        else {
          layer.setStyle(highlight)
          layer.highlighted = true;
          //add highlighted aquifer name to list
          highlightedAquifers.push(layer.feature.properties.CODE);
        }

        //check if metrics are locked in event
        if(e.lockMetrics == undefined || !e.lockMetrics) {
          //get rounded metrics from indexes and send to bottom panel
          let metrics = this.roundMetrics(this.getSelectedAquiferMetrics(highlightedAquifers, this.includeCaprock));
          //console.log(indexes);
          this.mapService.updateMetrics(this, "aquifer", metrics);
        }
        
        this.mapService.updateSelect(this, this.types.aquifers.layer.getLayers().length, highlightedAquifers.length);
      });
    });
    this.mapService.updateSelect(this, this.types.aquifers.layer.getLayers().length, highlightedAquifers.length);
    this.mapService.updateMetrics(this, "aquifer", this.defaultMetrics);

  }

  private disableAquiferInteraction() {
    let hidden = false;
    L.DomUtil.addClass(this.map._container, 'crosshair-cursor-enabled');
    //if hidden add to map to remove event listeners
    if(!this.map.hasLayer(this.types.aquifers.layer)) {
      this.types.aquifers.layer.addTo(this.map);
      hidden = true;
    }
    this.types.aquifers.layer.eachLayer((layer) => {
      layer.off('click')
      layer.bringToBack();
      layer.setStyle({
        weight: 3,
        opacity: 1,
        color: 'black',
        fillOpacity: 0
      });
      layer.highlighted = false;
    });
    this.highlightedAquiferIndices = [];
    //remove again if was hidden
    if(hidden) {
      this.map.removeLayer(this.types.aquifers.layer);
    }

  }


  private addCellInteraction() {

    if (this.interactionType == "cell") {
      //already in cell mode
      return;
    }
    else {
      //disable previous interaction type
      this.disableInteraction(this.interactionType)
    }

    this.interactionType = "cell";

    //really need to refoactor this to a generalized function since used 3 times
    this.map.on('click', (e) => {
      if (this.selectedCell) {
        this.map.removeLayer(this.selectedCell);
      }
      let convertedMousePoint = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [e.latlng.lng, e.latlng.lat]);
      //round x and y values to nearest multiple of 75 offset from first x/y value, then find position of grid cell that corresponds to this value from stored cover file
      let data = this.types.landCover.data._covjson.ranges.cover.values;
      let xs = this.types.landCover.data._covjson.domain.axes.get("x").values;
      let ys = this.types.landCover.data._covjson.domain.axes.get("y").values;

      //get difference from min to mouse position
      let diffx = convertedMousePoint[0] - this.xmin;
      let diffy = convertedMousePoint[1] - this.ymin;
      //do nothing if out of range of grid
      if (diffx >= 0 && diffy >= 0 && diffx <= this.xrange && diffy <= this.yrange) {

        //round down to nearest 75
        diffx = Math.floor(diffx / 75) * 75;
        diffy = Math.floor(diffy / 75) * 75;

        //get cell boundaries as geojson object to draw on map
        //cell corners
        let c1 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [this.xmin + diffx, this.ymin + diffy]);
        let c2 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [this.xmin + diffx + 75, this.ymin + diffy]);
        let c3 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [this.xmin + diffx + 75, this.ymin + diffy + 75]);
        let c4 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [this.xmin + diffx, this.ymin + diffy + 75]);
        let cellBounds = {
          "type": "Feature",
          "properties": {},
          "geometry": {
            "type": "Polygon",
            "coordinates": [[c1, c2, c3, c4, c1]]
          }
        };
        //should also make highlight styles global letiables since used a lot
        this.selectedCell = L.geoJSON(cellBounds, { interactive: false })
          .setStyle({
            fillColor: 'black',
            weight: 3,
            opacity: 1,
            color: 'black',  //Outline color
            fillOpacity: 0.2
          })
          .addTo(this.map)

        //add back 37.5 and rounded difference value to get cell coordinate
        let xCellVal = this.xmin + 37.5 + diffx;
        let yCellVal = this.ymin + 37.5 + diffy;

        //find index of cell with coordinates
        let xIndex = xs.indexOf(xCellVal);
        let yIndex = ys.indexOf(yCellVal);

        //convert to data cell index
        let index = this.getIndex(xIndex, yIndex);

        //send get rounded metrics and send to bottom panel
        let metrics = this.roundMetrics(this.getMetricsSuite([index], true));
        //single cell too small, still want to be able to display size, so just use meters and feet
        metrics.USC.area = "246.063";
        metrics.Metric.area = "75.00";
        this.mapService.updateMetrics(this, "cell", metrics);
      }
    });

    this.mapService.updateMetrics(this, "cell", this.defaultMetrics);
  }

  private disableShapeInteraction() {
    this.drawnItems.eachLayer((layer) => {
      // layer.on('mouseover', () => {
      //   L.DomUtil.addClass(layer._container,'crosshair-cursor-enabled');
      // })
      layer.off('click');
    });
  }


  private enableShapeInteraction(metrics: boolean) {

    if (this.interactionType == "custom" && metrics == this.shapeMetricsEnabled) {
      //already in custom mode and same metric type
      return;
    }
    else {
      //disable previous interaction type
      this.disableInteraction(this.interactionType)
    }

    this.interactionType = "custom";
    this.shapeMetricsEnabled = metrics;

    this.drawnItems.eachLayer((layer) => {
      layer.bringToFront();
      this.addInteractionToLayer(layer, metrics, this);
    });
  }


  private disableCellInteraction() {
    if (this.selectedCell) {
      this.map.removeLayer(this.selectedCell);
    }
    this.map.off('click');
  }

  // private getSelectedCellMetrics(index: number) {
    
  // }

  private getSelectedShapeMetrics() {
    let indices = this.getInternalIndices(this.highlightedItems.toGeoJSON(), {});

    //THIS CAN BE SPED UP BY USING ALREADY COMPUTED METRICS, CREATE IMPROVED METRICS COMBINING FUNCTION

    //get rounded metrics for highlighted sshapes and send to bottom panel
    let metrics = this.roundMetrics(this.getMetricsSuite(indices.internal, true));
    this.mapService.updateMetrics(this, "custom", metrics);
  }



  private getWholeMapMetrics() {
    if (this.interactionType == "full") {
      //already in full map mode
      return;
    }
    else {
      //disable previous interaction type
      this.disableInteraction(this.interactionType)
    }

    this.interactionType = "full";

    this.includeCaprock ? this.mapService.updateMetrics(this, "full", this.metrics.total.roundedMetrics) : this.mapService.updateMetrics(this, "full", this.metrics.totalNoCaprock.roundedMetrics);
  }


  toggleCaprock(mode: string) {
    this.includeCaprock = !this.includeCaprock
    if(mode == "Full") {
      this.includeCaprock ? this.mapService.updateMetrics(this, "full", this.metrics.total.roundedMetrics) : this.mapService.updateMetrics(this, "full", this.metrics.totalNoCaprock.roundedMetrics);
    }
    else if(mode == "Aquifer") {
      //get rounded metrics from indexes and send to bottom panel
      let metrics = this.roundMetrics(this.getMetricsSuite(this.highlightedAquiferIndices, this.includeCaprock));
      this.mapService.updateMetrics(this, "aquifer", metrics);
    }
  }











  private initializeData(): Promise<any> {
    setTimeout(() => {
      this.mapService.setLoading(this, true);
    }, 0);

    this.currentScenario = "recharge_scenario0";
    this.baseScenario = "recharge_scenario0";

    this.metrics = {
      customAreas: [],
      aquifers: [],
      aquifersNoCaprock: [],
      customAreasTotal: {},
      total: {},
      totalNoCaprock: {}
    };

    this.shapeMetricsEnabled = false;
    this.interactionType = "custom";

    let __this = this;

    let pause = 1000;

    let startLoad = new Date().getTime();
    
    let loadDataArrayFromASC = (data) => {
      let details = data.split('\n');
      let dataArray = []
      //console.log(details.length);
      for(let i = 6; i < details.length; i++) {
        //get data values after first six detail lines
        //split on spaces, tabs, or commas for values
        dataArray = dataArray.concat(details[i].trim().split(/[ \t,]+/));
        
        //if whitespace at the end might reult in whitespace only element, remove these
        if(dataArray[dataArray.length - 1].trim() == "") {
          dataArray.splice(dataArray.length - 1, 1);
        }
      }
      return dataArray;
    };
    
    //if still slow can add pauses within these sub-funtions
    //this is still slow, should modify some
    //load current data, needed for metric computations
    let initializeCurrentData = (): Promise<any> => {

      let tasks = [
        CovJSON.read(MapComponent.landCoverFile).then((coverage) => {
          let xs = coverage._covjson.domain.axes.x.values;
          let ys = coverage._covjson.domain.axes.y.values;
          //console.log(coverage)
    
          //find which value's the minimum, assumes oredered values
          //subtract 37.5 since centroid of 75m cell
          __this.xmin = Math.min(xs[0], xs[xs.length - 1]) - 37.5;
          __this.ymin = Math.min(ys[0], ys[ys.length - 1]) - 37.5;
          //get range + 75 to account for cell width
          __this.xrange = Math.abs(xs[0] - xs[xs.length - 1]) + 75
          __this.yrange = Math.abs(ys[0] - ys[ys.length - 1]) + 75;
          
    
          __this.gridWidthCells = xs.length;
          //console.log(xs.length);
          __this.gridHeightCells = ys.length;
    
          __this.types.landCover.data = coverage;
          //deepcopy values for comparisons with modified types, array of primitives, so can use array.from
          __this.types.landCover.baseData = Array.from(coverage._covjson.ranges.cover.values);
          //console.log(__this.currentCover._covjson.domain.axes);
          __this.loadCover(__this.types.landCover, false);
        }),

        this.http.get(MapComponent.caprockFiles.caprockGridFile).toPromise(),
    
        //load aquifer grid
        this.http.get(MapComponent.aquiferFiles.aquiferGridFile).toPromise(),

        CovJSON.read(MapComponent.rechargeFiles[this.currentScenario]).then(function (coverage) {
          //deepcopy values for comparisons with modified types
          __this.types.recharge.baseData[__this.currentScenario] = Array.from(coverage._covjson.ranges.recharge.values);
          //deepcopy so not messed up when data swapped
          __this.types.recharge.currentData[__this.currentScenario] = Array.from(coverage._covjson.ranges.recharge.values);
    
          //set up data, recharge layer, and metrics based on these values
          __this.types.recharge.data = coverage;
          __this.loadRechargeStyle("rate");
          
        })
      ];

      return Promise.all(tasks);
    };

    let initializeRemainingScenarios = (): Promise<any> => {
      return new Promise<any>((resolve) => {
        Object.keys(MapComponent.rechargeFiles).forEach((scenario) => {
          //current scenario already processed
          if(scenario != this.currentScenario) {
            CovJSON.read(MapComponent.rechargeFiles[scenario]).then(function (coverage) {
              //deepcopy values for comparisons with modified types
              __this.types.recharge.baseData[scenario] = Array.from(coverage._covjson.ranges.recharge.values);
              //deepcopy so not messed up when data swapped
              __this.types.recharge.currentData[scenario] = Array.from(coverage._covjson.ranges.recharge.values);     
            });
          }
        });
        resolve();
      });
    }

    //doesn't matter when aesthetic parts complete, so load last
    let initializeAesthetics = () => {
      //load aquifer shapes
      shp(MapComponent.aquiferFiles.aquiferShpFile).then((geojson) => {
        // this.aquifers = L.featureGroup
        let aquifers = L.geoJSON();
        //two shape files, so array
        //might want to just remove "lines" shapefile
        //can break this loop up if affects performance
        geojson[0].features.forEach(aquifer => {

          //convert one point to UTM and check if in bounds (if one point in bounds the aquifer should be internal)
          let sampleCoord = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, aquifer.geometry.coordinates[0][0]);

          if (sampleCoord[0] >= __this.xmin && sampleCoord[0] <= __this.xmin + __this.xrange
            && sampleCoord[1] >= __this.ymin && sampleCoord[1] <= __this.ymin + __this.yrange
            && aquifer.properties.CODE != 0) {

            aquifers.addData(aquifer);
          }


        });
        aquifers.setStyle({
          weight: 3,
          opacity: 1,
          color: 'black',
          fillOpacity: 0
        });
        __this.types.aquifers.layer = aquifers;
        aquifers.addTo(__this.map);
        __this.layers.addOverlay(aquifers, __this.types.aquifers.label);
      }, (e) => {
        console.log(e);
      });

      //load caprock shapes
      shp(MapComponent.caprockFiles.caprockShpFile).then((geojson) => {
        //console.log(geojson);
        // this.aquifers = L.featureGroup
        let caprocks = L.geoJSON();
        //two shape files, so array
        //might want to just remove "lines" shapefile
        //can break this loop up if affects performance
        geojson.features.forEach(caprock => {
          caprocks.addData(caprock);
        });
        //console.log(caprocks);
        caprocks.setStyle({
          weight: 3,
          opacity: 1,
          color: 'black',
          fillOpacity: 0
        });
        __this.types.caprocks.layer = caprocks;
        //caprocks.addTo(__this.map);
        __this.layers.addOverlay(caprocks, __this.types.caprocks.label);
      }, (e) => {
        console.log(e);
      });
    }

    return initializeCurrentData().then((resolveVals) => {
      let workerPromises = [this.webWorker.run(loadDataArrayFromASC, resolveVals[1].text()), this.webWorker.run(loadDataArrayFromASC, resolveVals[2].text())];
      console.log("main load took: " + (new Date().getTime() - startLoad).toString() + "ms");
      setTimeout(() => {
        initializeRemainingScenarios().then(() => {
          //indicate scenario initialization complete
          this.scenariosInitialized = true;
          setTimeout(() => {
            initializeAesthetics();
          }, pause);
        });
      }, pause); 
      return Promise.all(workerPromises).then((data) => {
        this.caprock = data[0];
        this.aquifers = data[1];
        return new Promise((resolve) => {
          this.loadDrawControls();
          this.createMetrics().then((data) => {
            this.metrics = data;
            this.currentDataInitialized = true;
            //can resolve once the current data initialization is complete
            resolve();
          });
        });
      });
    });
  }









/*
  actions format:

  {
    type: <type of action>
    details: {
      ...
    }
  }

  if shape add or remove details will have shape's layer (do inverse action)
  if modify shape will have layer of shape and old geometry
  if change land cover will have dictionary of indices changed to old land covers, use database to get recharge to cut down some memory usage
  if upload have all uploaded shape layers, reference layers, mapping of modified land covers
*/


  //push all actions to undo stack (pop and push to redo stack when action undone)
  undo() {
    let action = this.undoStack.pop();
    this.createAction("undo", {action: action});
    switch(action.type) {
      case "add": {

        break;
      }
      case "remove": {

        break;
      }
      case "modify": {

        break;
      }
      case "update": {
        
        break;
      }
    }
  }


  //redo stack wiped when action performed, when pop off undo stack push to redo stack, when pop from redo push back to undo
  redo() {
    let action = this.redoStack.pop();
    this.createAction("redo", {action: action});
  }


  //used to construct undo and redo stacks from actions
  createAction(actionType: string, details: any) {
    switch(actionType) {
      case "add": {
        //clear redo stack
        this.redoStack = [];
        break;
      }
      case "remove": {
        //clear redo stack
        this.redoStack = [];
        break;
      }
      case "modify": {
        //clear redo stack
        this.redoStack = [];
        break;
      }
      case "update": {
        //clear redo stack
        this.redoStack = [];
        break;
      }
      case "upload": {
        //clear redo stack
        this.redoStack = [];
        break;
      }
      case "undo": {
        let inverseAction = this.createInverseAction(details.action);
        this.redoStack.push(inverseAction);
        break;
      }
      case "redo": {
        let inverseAction = this.createInverseAction(details.action);
        this.undoStack.push(inverseAction);
        break;
      }
      default: {
        console.log("Unrecognized action type.");
      }
    }

    

  }

  //do you really need this? start creating actions then decide
  createInverseAction(action: any): any {
    switch(action.type) {
      case "add": {

        break;
      }
      case "remove": {

        break;
      }
      case "modify": {

        break;
      }
      case "update": {

        break;
      }
      case "upload": {

        break;
      }
      default: {
        console.log("Not an invertible action type.");
      }
    }
  }







  loadRechargeStyle(style: string) {
    let rechargeData = this.types.recharge.data._covjson.ranges.recharge.values;
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
      
    switch(style) {
      case "rate": {
        this.types.recharge.style = "rate";
        let lcVals = this.types.landCover.data._covjson.ranges.cover.values;
        rechargeData[0] = this.paletteType == "usgs" ? MapComponent.USGS_PURPLE_RECHARGE : MapComponent.MAX_RECHARGE;
        for(let i = 1; i < rechargeData.length; i++) {
          if(this.paletteType == "usgs") {
            if(lcVals[i] == 0) {
              rechargeData[i] = -180;
            }
            else {
              rechargeData[i] = this.types.recharge.currentData[this.currentScenario][i] <= MapComponent.USGS_PURPLE_RECHARGE ? Math.min(this.types.recharge.currentData[this.currentScenario][i], MapComponent.MAX_RECHARGE) : MapComponent.USGS_PURPLE_RECHARGE;
            }
          }
          else {
            rechargeData[i] = Math.min(this.types.recharge.currentData[this.currentScenario][i], MapComponent.MAX_RECHARGE);
          }
          //rechargeData[i] = this.types.recharge.currentData[this.currentScenario][i];
          if(rechargeData[i] > max) {
            max = rechargeData[i];
          }
          if(rechargeData[i] < min) {
            min = rechargeData[i];
          }
        }
        //console.log([min, max]);
        //let paletteWindow = this.paletteWindow(this.rcPalette, [min, max], this.paletteExtent, this.rcPalette.length);
        this.types.recharge.palette = C.linearPalette(this.rcPalette);
        break;
      }
      case "pchange": {
        
        this.types.recharge.style = "pchange";
        
        for(let i = 0; i < rechargeData.length; i++) {
          //make sure not dividing by 0 if no recharge in cell
          if(this.types.recharge.baseData[this.baseScenario][i] == 0) {
            rechargeData[i] = this.types.recharge.currentData[this.currentScenario][i] == 0 ? 0 : this.pchangeExtent[1];
          }
          else {
            let diff = this.types.recharge.currentData[this.currentScenario][i] - this.types.recharge.baseData[this.baseScenario][i];
            let pchange = diff / this.types.recharge.baseData[this.baseScenario][i] * 100;
            //lock at max and min values
            rechargeData[i] = Math.max(Math.min(pchange, this.pchangeExtent[1]), this.pchangeExtent[0]);
          }
          if(rechargeData[i] > max) {
            max = rechargeData[i];
          }
          if(rechargeData[i] < min) {
            min = rechargeData[i];
          }
        }
        let paletteWindow = this.paletteWindow(this.rcDivergingPalette, [min, max], this.pchangeExtent, this.rcDivergingPalette.length);
        this.types.recharge.palette = C.linearPalette(paletteWindow);
        rechargeData[0] = 0.0001;
        break;
      }
      case "diff": {
        this.types.recharge.style = "diff";
        for(let i = 0; i < rechargeData.length; i++) {
          let diff = this.types.recharge.currentData[this.currentScenario][i] - this.types.recharge.baseData[this.baseScenario][i];
          //lock at max and min values
          rechargeData[i] = Math.max(Math.min(diff, this.diffExtent[1]), this.diffExtent[0]);
          if(rechargeData[i] > max) {
            max = rechargeData[i];
          }
          if(rechargeData[i] < min) {
            min = rechargeData[i];
          }
        }
        let paletteWindow = this.paletteWindow(this.rcDivergingPalette, [min, max], this.diffExtent, this.rcDivergingPalette.length);
        this.types.recharge.palette = C.linearPalette(paletteWindow);
        rechargeData[0] = 0.0001;
        break;
      }
    }
    this.loadCover(this.types.recharge, true);
  }
















  generateReport(unitSystem: string) {
    let data : any = {
      metrics: this.metrics,
      scenarioLabels: {
        baseline: this.scenarioLabelMap[this.baseScenario].baseline,
        current: this.scenarioLabelMap[this.currentScenario].current
      }
    }
    switch(unitSystem) {
      case "USC": {
        data.unitSystem = {
          system: "USC",
          units: {
            area: "Square Miles",
            volumetric: "Million Gallons Per Day",
            average: "Inches Per Year"
          }
        }
        break;
      }
      case "Metric": {
        data.unitSystem = {
          system: "Metric",
          units: {
            area: "Square Kilometers",
            volumetric: "Megaliters Per Day",
            average: "Millimeters Per Year"
          }
        }
      }
    }
    
    this.report.emit(data);
  }













  /*
  parts:
  get aquifer indices
  compute aquifer metrics
  compute full map metrics
  */

  createMetrics(): Promise<any> {

    let data = {
      customAreas: [],
      aquifers: [],
      specialAquifers: [],
      aquifersNoCaprock: [],
      customAreasTotal: {
        metrics: {},
        roundedMetrics: {}
      },
      total: {
        metrics: {},
        roundedMetrics: {}
      },
      totalNoCaprock: {
        metrics: {},
        roundedMetrics: {}
      }
    };
    
    this.getAquiferAndTotalMetrics(data);

    
    
    let geojsonFeatures = {
      features: []
    };
    
    this.drawnItems.eachLayer((layer) => {
      
      //let intervals = new Date().getTime();
      //any custom layers should have metrics object registered with customAreaMap, use this as a base since same name
      let info = this.customAreaMap[layer._leaflet_id];
      //no guarentee of identical ordering of eachlayer and togeojson feature list, so construct feature list using eachlayer
      geojsonFeatures.features.push(layer.toGeoJSON());
      //let itemMetrics = this.getMetricsSuite(indices, true);
      //info.metrics = itemMetrics;
      //info.roundedMetrics = this.roundMetrics(itemMetrics);

      data.customAreas.push(info);

    });

    let args = {
      host: window.location.host,
      path: window.location.pathname,
      protocol: window.location.protocol,
      data: {
        geojsonObjects: geojsonFeatures,
        xs: this.types.landCover.data._covjson.domain.axes.get("x").values,
        ys: this.types.landCover.data._covjson.domain.axes.get("y").values,
        lcVals: this.types.landCover.data._covjson.ranges.cover.values,
        gridWidthCells: this.gridWidthCells,
        gridHeightCells: this.gridHeightCells,
        longlat: MapComponent.longlat,
        utm: MapComponent.utm,
        options: {
            breakdown: true
        }
      }
    }

    //get
    return this.webWorker.run(workerGetInternalIndices, args).then((indices) => {
      //set individual metrics
      indices.breakdown.forEach((featureIndices, i) => {
        let info = data.customAreas[i];
        let itemMetrics = this.getMetricsSuite(featureIndices.internal, true);
        info.metrics = itemMetrics;
        info.roundedMetrics = this.roundMetrics(itemMetrics);
      });

      //set total metrics
      let customTotal = this.getMetricsSuite(Array.from(indices.internal), true);
      data.customAreasTotal.metrics = customTotal;
      data.customAreasTotal.roundedMetrics = this.roundMetrics(customTotal);

      return data;
    }, (error) => {
      console.log(error);
    });
  }


  getAquiferAndTotalMetrics(data: any) {

    let metrics: any = {}; 

    //initialize metrics objects
    Object.keys(AQUIFER_NAME_MAP).forEach((code) => {
      metrics[code] = {
        caprock: {
          USC: {
            average: {
              original: 0,
              current: 0,
              diff: 0,
              pchange: 0
            },
            volumetric: {
              original: 0,
              current: 0,
              diff: 0,
              pchange: 0
            },
            area: 0
          },
          Metric: {
            average: {
              original: 0,
              current: 0,
              diff: 0,
              pchange: 0
            },
            volumetric: {
              original: 0,
              current: 0,
              diff: 0,
              pchange: 0
            },
            area: 0
          }
        }
      };

      if(!MapComponent.SPECIAL_AQUIFERS.includes(code)) {
        metrics[code].nocaprock = {
          USC: {
            average: {
              original: 0,
              current: 0,
              diff: 0,
              pchange: 0
            },
            volumetric: {
              original: 0,
              current: 0,
              diff: 0,
              pchange: 0
            },
            area: 0
          },
          Metric: {
            average: {
              original: 0,
              current: 0,
              diff: 0,
              pchange: 0
            },
            volumetric: {
              original: 0,
              current: 0,
              diff: 0,
              pchange: 0
            },
            area: 0
          }
        };
      }
    });

    metrics.total = {
      caprock: {
        USC: {
          average: {
            original: 0,
            current: 0,
            diff: 0,
            pchange: 0
          },
          volumetric: {
            original: 0,
            current: 0,
            diff: 0,
            pchange: 0
          },
          area: 0
        },
        Metric: {
          average: {
            original: 0,
            current: 0,
            diff: 0,
            pchange: 0
          },
          volumetric: {
            original: 0,
            current: 0,
            diff: 0,
            pchange: 0
          },
          area: 0
        }
      },
      nocaprock: {
        USC: {
          average: {
            original: 0,
            current: 0,
            diff: 0,
            pchange: 0
          },
          volumetric: {
            original: 0,
            current: 0,
            diff: 0,
            pchange: 0
          },
          area: 0
        },
        Metric: {
          average: {
            original: 0,
            current: 0,
            diff: 0,
            pchange: 0
          },
          volumetric: {
            original: 0,
            current: 0,
            diff: 0,
            pchange: 0
          },
          area: 0
        }
      }
    };

    let rechargeVals = this.types.recharge.currentData[this.currentScenario];
    
    //this.aquifers will be the aquifer id array
    //this.SPECIAL_AQUIFERS
    /*
    return value [0, 3]
    0: background (include never)
    1: special aquifer
    2: caprock
    3: normal (include always)
    */
    let checkInclude = (i: number): number => {
      if(this.aquifers[i] == "0") {
        return 0;
      }
      else if(MapComponent.SPECIAL_AQUIFERS.includes(this.aquifers[i])) {
        return 1;
      }
      else if(this.caprock[i] == 0) {
        return 2;
      }

      return 3;
    };

    for(let i = 0; i < rechargeVals.length; i++) {
      //store number of cells in area variable
      switch(checkInclude(i)) {
        case 0: {
          continue;
        }
        case 1: {
          let aquifer = this.aquifers[i];
          //special aquifers have no nocaprock component and are not included in map total
          metrics[aquifer].caprock.USC.area++;
          metrics[aquifer].caprock.USC.average.current += rechargeVals[i];
          metrics[aquifer].caprock.USC.average.original += this.types.recharge.baseData[this.baseScenario][i];

          break;
        }
        case 2: {
          let aquifer = this.aquifers[i];
          
          metrics[aquifer].caprock.USC.area++;
          metrics[aquifer].caprock.USC.average.current += rechargeVals[i];
          metrics[aquifer].caprock.USC.average.original += this.types.recharge.baseData[this.baseScenario][i];

          metrics.total.caprock.USC.area++;
          metrics.total.caprock.USC.average.current += rechargeVals[i];
          metrics.total.caprock.USC.average.original += this.types.recharge.baseData[this.baseScenario][i];

          break;
        }
        case 3: {
          let aquifer = this.aquifers[i];

          metrics[aquifer].caprock.USC.area++;
          metrics[aquifer].caprock.USC.average.current += rechargeVals[i];
          metrics[aquifer].caprock.USC.average.original += this.types.recharge.baseData[this.baseScenario][i];

          metrics[aquifer].nocaprock.USC.area++;
          metrics[aquifer].nocaprock.USC.average.current += rechargeVals[i];
          metrics[aquifer].nocaprock.USC.average.original += this.types.recharge.baseData[this.baseScenario][i];

          metrics.total.caprock.USC.area++;
          metrics.total.caprock.USC.average.current += rechargeVals[i];
          metrics.total.caprock.USC.average.original += this.types.recharge.baseData[this.baseScenario][i];

          metrics.total.nocaprock.USC.area++;
          metrics.total.nocaprock.USC.average.current += rechargeVals[i];
          metrics.total.nocaprock.USC.average.original += this.types.recharge.baseData[this.baseScenario][i];

          break;
        }
        default: {
          console.log("Invalid value returned by cell categorizer");
        }
      }
    }

    //compute remaining metrics
    Object.keys(metrics).forEach((code) => {
      //currently just number of cells, no need conversion
      metrics[code].caprock.Metric.area = metrics[code].caprock.USC.area;
      //compute metric average recharges
      metrics[code].caprock.Metric.average.current = metrics[code].caprock.USC.average.current * MapComponent.INCH_TO_MILLIMETER_FACTOR;
      metrics[code].caprock.Metric.average.original = metrics[code].caprock.USC.average.original * MapComponent.INCH_TO_MILLIMETER_FACTOR;

      //compute metrics in volumetric
      metrics[code].caprock.USC.volumetric.original = (metrics[code].caprock.USC.average.original * 75 * 75 * 144) / (231 * 0.3048 * 0.3048 * 365 * 1000000);
      metrics[code].caprock.USC.volumetric.current = (metrics[code].caprock.USC.average.current * 75 * 75 * 144) / (231 * 0.3048 * 0.3048 * 365 * 1000000);
      //instead of trying to figure out whole conversion, just convert Mgal to ML
      metrics[code].caprock.Metric.volumetric.original = metrics[code].caprock.USC.volumetric.original * MapComponent.GALLON_TO_LITER_FACTOR;
      metrics[code].caprock.Metric.volumetric.current = metrics[code].caprock.USC.volumetric.current * MapComponent.GALLON_TO_LITER_FACTOR;

      //average summation over cells
      metrics[code].caprock.USC.average.original /= metrics[code].caprock.USC.area;
      metrics[code].caprock.USC.average.current /= metrics[code].caprock.USC.area;

      metrics[code].caprock.Metric.average.original /= metrics[code].caprock.Metric.area;
      metrics[code].caprock.Metric.average.current /= metrics[code].caprock.Metric.area;

      //get difference and percent change
      metrics[code].caprock.USC.volumetric.diff = metrics[code].caprock.USC.volumetric.current - metrics[code].caprock.USC.volumetric.original;
      metrics[code].caprock.USC.average.diff = metrics[code].caprock.USC.average.current - metrics[code].caprock.USC.average.original;
      metrics[code].caprock.Metric.volumetric.diff = metrics[code].caprock.Metric.volumetric.current - metrics[code].caprock.Metric.volumetric.original;
      metrics[code].caprock.Metric.average.diff = metrics[code].caprock.Metric.average.current - metrics[code].caprock.Metric.average.original;
      //make sure not dividing by 0 if no recharge in selected cells
      if(metrics[code].caprock.USC.volumetric.original == 0) {
        //if the current change is also 0 (diff is 0) then pchange is 0, else set to infinity
        metrics[code].caprock.USC.volumetric.pchange = metrics[code].caprock.USC.volumetric.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
        metrics[code].caprock.USC.average.pchange = metrics[code].caprock.USC.average.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
        metrics[code].caprock.Metric.volumetric.pchange = metrics[code].caprock.Metric.volumetric.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
        metrics[code].caprock.Metric.average.pchange = metrics[code].caprock.Metric.average.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
      }
      else {
        metrics[code].caprock.USC.volumetric.pchange = metrics[code].caprock.USC.volumetric.diff / metrics[code].caprock.USC.volumetric.original * 100;
        metrics[code].caprock.USC.average.pchange = metrics[code].caprock.USC.average.diff / metrics[code].caprock.USC.average.original * 100;
        metrics[code].caprock.Metric.volumetric.pchange = metrics[code].caprock.Metric.volumetric.diff / metrics[code].caprock.Metric.volumetric.original * 100;
        metrics[code].caprock.Metric.average.pchange = metrics[code].caprock.Metric.average.diff / metrics[code].caprock.Metric.average.original * 100;
      }
      
      
      //get square miles
      metrics[code].caprock.USC.area *= Math.pow(75 * MapComponent.METER_TO_MILE_FACTOR, 2);
      //square kilometers
      metrics[code].caprock.Metric.area *= Math.pow(75 / 1000, 2);
      
      if(!MapComponent.SPECIAL_AQUIFERS.includes(code)) {
        //nocaprock only if not special aquifers
        //currently just number of cells, no need conversion
        metrics[code].nocaprock.Metric.area = metrics[code].nocaprock.USC.area;
        //compute metric average recharges
        metrics[code].nocaprock.Metric.average.current = metrics[code].nocaprock.USC.average.current * MapComponent.INCH_TO_MILLIMETER_FACTOR;
        metrics[code].nocaprock.Metric.average.original = metrics[code].nocaprock.USC.average.original * MapComponent.INCH_TO_MILLIMETER_FACTOR;

        //compute metrics in volumetric
        metrics[code].nocaprock.USC.volumetric.original = (metrics[code].nocaprock.USC.average.original * 75 * 75 * 144) / (231 * 0.3048 * 0.3048 * 365 * 1000000);
        metrics[code].nocaprock.USC.volumetric.current = (metrics[code].nocaprock.USC.average.current * 75 * 75 * 144) / (231 * 0.3048 * 0.3048 * 365 * 1000000);
        //instead of trying to figure out whole conversion, just convert Mgal to ML
        metrics[code].nocaprock.Metric.volumetric.original = metrics[code].nocaprock.USC.volumetric.original * MapComponent.GALLON_TO_LITER_FACTOR;
        metrics[code].nocaprock.Metric.volumetric.current = metrics[code].nocaprock.USC.volumetric.current * MapComponent.GALLON_TO_LITER_FACTOR;


        //average summation over cells
        metrics[code].nocaprock.USC.average.original /= metrics[code].nocaprock.USC.area;
        metrics[code].nocaprock.USC.average.current /= metrics[code].nocaprock.USC.area;

        metrics[code].nocaprock.Metric.average.original /= metrics[code].nocaprock.Metric.area;
        metrics[code].nocaprock.Metric.average.current /= metrics[code].nocaprock.Metric.area;

        //get difference and percent change
        metrics[code].nocaprock.USC.volumetric.diff = metrics[code].nocaprock.USC.volumetric.current - metrics[code].nocaprock.USC.volumetric.original;
        metrics[code].nocaprock.USC.average.diff = metrics[code].nocaprock.USC.average.current - metrics[code].nocaprock.USC.average.original;
        metrics[code].nocaprock.Metric.volumetric.diff = metrics[code].nocaprock.Metric.volumetric.current - metrics[code].nocaprock.Metric.volumetric.original;
        metrics[code].nocaprock.Metric.average.diff = metrics[code].nocaprock.Metric.average.current - metrics[code].nocaprock.Metric.average.original;
        //make sure not dividing by 0 if no recharge in selected cells
        if(metrics[code].nocaprock.USC.volumetric.original == 0) {
          //if the current change is also 0 (diff is 0) then pchange is 0, else set to infinity
          metrics[code].nocaprock.USC.volumetric.pchange = metrics[code].nocaprock.USC.volumetric.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
          metrics[code].nocaprock.USC.average.pchange = metrics[code].nocaprock.USC.average.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
          metrics[code].nocaprock.Metric.volumetric.pchange = metrics[code].nocaprock.Metric.volumetric.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
          metrics[code].nocaprock.Metric.average.pchange = metrics[code].nocaprock.Metric.average.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
        }
        else {
          metrics[code].nocaprock.USC.volumetric.pchange = metrics[code].nocaprock.USC.volumetric.diff / metrics[code].nocaprock.USC.volumetric.original * 100;
          metrics[code].nocaprock.USC.average.pchange = metrics[code].nocaprock.USC.average.diff / metrics[code].nocaprock.USC.average.original * 100;
          metrics[code].nocaprock.Metric.volumetric.pchange = metrics[code].nocaprock.Metric.volumetric.diff / metrics[code].nocaprock.Metric.volumetric.original * 100;
          metrics[code].nocaprock.Metric.average.pchange = metrics[code].nocaprock.Metric.average.diff / metrics[code].nocaprock.Metric.average.original * 100;
        }
        //get square miles
        metrics[code].nocaprock.USC.area *= Math.pow(75 * MapComponent.METER_TO_MILE_FACTOR, 2);
        //square kilometers
        metrics[code].nocaprock.Metric.area *= Math.pow(75 / 1000, 2);
      }
    });

    

    

    let codes = Object.keys(AQUIFER_NAME_MAP);
    //sort geographically by aquifer code
    codes.sort((c1, c2) => {
      return parseInt(c2) - parseInt(c1);
    });

    codes.forEach((code) => {
      if(MapComponent.SPECIAL_AQUIFERS.includes(code)) {
        let info = {
          name: "",
          metrics: {},
          roundedMetrics: {}
        };

        info.metrics = metrics[code].caprock;
        info.roundedMetrics = this.roundMetrics(metrics[code].caprock);
        info.name = AQUIFER_NAME_MAP[code];
        data.specialAquifers.push(info);
      }
      else {
        let info = {
          name: "",
          metrics: {},
          roundedMetrics: {}
        };
        let infoNoCaprock = {
          name: "",
          metrics: {},
          roundedMetrics: {}
        };

        info.metrics = metrics[code].caprock;
        info.roundedMetrics = this.roundMetrics(metrics[code].caprock);
        info.name = AQUIFER_NAME_MAP[code];
        data.aquifers.push(info);

        infoNoCaprock.metrics = metrics[code].nocaprock;
        infoNoCaprock.roundedMetrics = this.roundMetrics(metrics[code].nocaprock);
        infoNoCaprock.name = AQUIFER_NAME_MAP[code];
        data.aquifersNoCaprock.push(infoNoCaprock);
      }
    });

    //process total metrics
    data.total.metrics = metrics.total.caprock;
    data.total.roundedMetrics = this.roundMetrics(metrics.total.caprock);

    data.totalNoCaprock.metrics = metrics.total.nocaprock;
    data.totalNoCaprock.roundedMetrics = this.roundMetrics(metrics.total.nocaprock);

    //console.log(data);

    return data;
  }



  //could probably refactor to use this for generating and passing metrics to bottombar
  //also could use something similar to report generation for passing name and metric breakdown
  //maybe have subfunctions in generate report for different parts

  //also need to update all full map computations to disclude background cells
  getMetricsSuite(indexes: number[], caprock: boolean) {

    let metrics = {
      USC: {
        average: {
          original: 0,
          current: 0,
          diff: 0,
          pchange: 0
        },
        volumetric: {
          original: 0,
          current: 0,
          diff: 0,
          pchange: 0
        },
        area: 0
      },
      Metric: {
        average: {
          original: 0,
          current: 0,
          diff: 0,
          pchange: 0
        },
        volumetric: {
          original: 0,
          current: 0,
          diff: 0,
          pchange: 0
        },
        area: 0
      }
    };

    let rechargeVals = this.types.recharge.currentData[this.currentScenario];
    let lcVals = this.types.landCover.data._covjson.ranges.cover.values;

    let cells = 0

    let checkInclude = (i: number) => {
      if(lcVals[i] == 0) {
        return false;
      }
      
      if(caprock) {
        return true;
      }
      else {
        if(this.caprock[i] == 0) {
          return false;
        }
        return true;
      }
    };

    //pass in null if want whole map
    if(indexes == null) {
      for(let i = 0; i < rechargeVals.length; i++) {
        //if background value don't count
        if(checkInclude(i)) {
          cells++;
          metrics.USC.average.current += rechargeVals[i];
          metrics.USC.average.original += this.types.recharge.baseData[this.baseScenario][i];
          
          metrics.Metric.average.current += rechargeVals[i] * MapComponent.INCH_TO_MILLIMETER_FACTOR;
          metrics.Metric.average.original += this.types.recharge.baseData[this.baseScenario][i] * MapComponent.INCH_TO_MILLIMETER_FACTOR;
        }
      }

      //cells = rechargeVals.length;
    }
    else {
      //get total average over cells
      indexes.forEach((index) => {
        if(checkInclude(index)) {
          cells++;
          metrics.USC.average.current += rechargeVals[index];
          metrics.USC.average.original += this.types.recharge.baseData[this.baseScenario][index];

          metrics.Metric.average.current += rechargeVals[index] * MapComponent.INCH_TO_MILLIMETER_FACTOR;
          metrics.Metric.average.original += this.types.recharge.baseData[this.baseScenario][index] * MapComponent.INCH_TO_MILLIMETER_FACTOR;
        }
      });
    
    }
    
    //compute metrics in volumetric
    metrics.USC.volumetric.original = (metrics.USC.average.original * 75 * 75 * 144) / (231 * 0.3048 * 0.3048 * 365 * 1000000);
    metrics.USC.volumetric.current = (metrics.USC.average.current * 75 * 75 * 144) / (231 * 0.3048 * 0.3048 * 365 * 1000000);
    //instead of trying to figure out whole conversion, just convert Mgal to ML
    metrics.Metric.volumetric.original = metrics.USC.volumetric.original * MapComponent.GALLON_TO_LITER_FACTOR;
    metrics.Metric.volumetric.current = metrics.USC.volumetric.current * MapComponent.GALLON_TO_LITER_FACTOR;

    //get square miles
    metrics.USC.area = Math.pow(75 * MapComponent.METER_TO_MILE_FACTOR, 2) * cells;
    //square kilometers
    metrics.Metric.area = Math.pow(75 / 1000, 2) * cells;

    //if no cells leave at default value of 0 to avoid dividing by 0
    if(cells > 0) {
      //average average summation over cells
      metrics.USC.average.original /= cells;
      metrics.USC.average.current /= cells;

      metrics.Metric.average.original /= cells;
      metrics.Metric.average.current /= cells;

      //get difference and percent change
      metrics.USC.volumetric.diff = metrics.USC.volumetric.current - metrics.USC.volumetric.original;
      metrics.USC.average.diff = metrics.USC.average.current - metrics.USC.average.original;
      metrics.Metric.volumetric.diff = metrics.Metric.volumetric.current - metrics.Metric.volumetric.original;
      metrics.Metric.average.diff = metrics.Metric.average.current - metrics.Metric.average.original;
      //make sure not dividing by 0 if no recharge in selected cells
      if(metrics.USC.volumetric.original == 0) {
        //if the current change is also 0 (diff is 0) then pchange is 0, else set to infinity
        metrics.USC.volumetric.pchange = metrics.USC.volumetric.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
        metrics.USC.average.pchange = metrics.USC.average.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
        metrics.Metric.volumetric.pchange = metrics.Metric.volumetric.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
        metrics.Metric.average.pchange = metrics.Metric.average.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
      }
      else {
        metrics.USC.volumetric.pchange = metrics.USC.volumetric.diff / metrics.USC.volumetric.original * 100;
        metrics.USC.average.pchange = metrics.USC.average.diff / metrics.USC.average.original * 100;
        metrics.Metric.volumetric.pchange = metrics.Metric.volumetric.diff / metrics.Metric.volumetric.original * 100;
        metrics.Metric.average.pchange = metrics.Metric.average.diff / metrics.Metric.average.original * 100;
      }
    }

    return metrics;
  }


  getSelectedAquiferMetrics(codes: string[], caprock: boolean) {
    let metrics = {
      USC: {
        average: {
          original: 0,
          current: 0,
          diff: 0,
          pchange: 0
        },
        volumetric: {
          original: 0,
          current: 0,
          diff: 0,
          pchange: 0
        },
        area: 0
      },
      Metric: {
        average: {
          original: 0,
          current: 0,
          diff: 0,
          pchange: 0
        },
        volumetric: {
          original: 0,
          current: 0,
          diff: 0,
          pchange: 0
        },
        area: 0
      }
    };

    this.highlightedAquiferIndices = [];
    
    //if empty just return all 0 metrics
    if(codes.length != 0) {
      let rechargeVals = this.types.recharge.currentData[this.currentScenario];

      this.aquifers.forEach((aquifer, i) => {
        //aquifer code 0 (no aquifer), no need to check through code array
        if(aquifer == "0") {
          return;
        }
        if(codes.includes(aquifer)) {
          this.highlightedAquiferIndices.push(i);
          if(caprock || this.caprock[i] == 1) {
            metrics.USC.area++;
            metrics.USC.average.current += rechargeVals[i];
            metrics.USC.average.original += this.types.recharge.baseData[this.baseScenario][i];
          }
        }

      });

      //currently just number of cells, no need conversion
      metrics.Metric.area = metrics.USC.area;
      //compute metric average recharges
      metrics.Metric.average.current = metrics.USC.average.current * MapComponent.INCH_TO_MILLIMETER_FACTOR;
      metrics.Metric.average.original = metrics.USC.average.original * MapComponent.INCH_TO_MILLIMETER_FACTOR;

      //compute metrics in volumetric
      metrics.USC.volumetric.original = (metrics.USC.average.original * 75 * 75 * 144) / (231 * 0.3048 * 0.3048 * 365 * 1000000);
      metrics.USC.volumetric.current = (metrics.USC.average.current * 75 * 75 * 144) / (231 * 0.3048 * 0.3048 * 365 * 1000000);
      //instead of trying to figure out whole conversion, just convert Mgal to ML
      metrics.Metric.volumetric.original = metrics.USC.volumetric.original * MapComponent.GALLON_TO_LITER_FACTOR;
      metrics.Metric.volumetric.current = metrics.USC.volumetric.current * MapComponent.GALLON_TO_LITER_FACTOR;


      //average summation over cells
      metrics.USC.average.original /= metrics.USC.area;
      metrics.USC.average.current /= metrics.USC.area;

      metrics.Metric.average.original /= metrics.Metric.area;
      metrics.Metric.average.current /= metrics.Metric.area;

      //get difference and percent change
      metrics.USC.volumetric.diff = metrics.USC.volumetric.current - metrics.USC.volumetric.original;
      metrics.USC.average.diff = metrics.USC.average.current - metrics.USC.average.original;
      metrics.Metric.volumetric.diff = metrics.Metric.volumetric.current - metrics.Metric.volumetric.original;
      metrics.Metric.average.diff = metrics.Metric.average.current - metrics.Metric.average.original;
      //make sure not dividing by 0 if no recharge in selected cells
      if(metrics.USC.volumetric.original == 0) {
        //if the current change is also 0 (diff is 0) then pchange is 0, else set to infinity
        metrics.USC.volumetric.pchange = metrics.USC.volumetric.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
        metrics.USC.average.pchange = metrics.USC.average.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
        metrics.Metric.volumetric.pchange = metrics.Metric.volumetric.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
        metrics.Metric.average.pchange = metrics.Metric.average.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
      }
      else {
        metrics.USC.volumetric.pchange = metrics.USC.volumetric.diff / metrics.USC.volumetric.original * 100;
        metrics.USC.average.pchange = metrics.USC.average.diff / metrics.USC.average.original * 100;
        metrics.Metric.volumetric.pchange = metrics.Metric.volumetric.diff / metrics.Metric.volumetric.original * 100;
        metrics.Metric.average.pchange = metrics.Metric.average.diff / metrics.Metric.average.original * 100;
      }
      
      //get square miles
      metrics.USC.area *= Math.pow(75 * MapComponent.METER_TO_MILE_FACTOR, 2);
      //square kilometers
      metrics.Metric.area *= Math.pow(75 / 1000, 2);
    }

    return metrics;
  }



  private roundMetrics(metrics: any) {
    let roundedMetrics = {
      USC: {
        average: {
          original: "",
          current: "",
          diff: "",
          pchange: ""
        },
        volumetric: {
          original: "",
          current: "",
          diff: "",
          pchange: ""
        },
        area: ""
      },
      Metric: {
        average: {
          original: "",
          current: "",
          diff: "",
          pchange: ""
        },
        volumetric: {
          original: "",
          current: "",
          diff: "",
          pchange: ""
        },
        area: ""
      }
    };

    let decimalPlaces = 2;

    //convert rounded number string to number then back to string so scientific notation is removed
    roundedMetrics.USC.average.original = this.roundToDecimalPlaces(metrics.USC.average.original, decimalPlaces);
    roundedMetrics.USC.average.current = this.roundToDecimalPlaces(metrics.USC.average.current, decimalPlaces);
    roundedMetrics.USC.volumetric.original = this.roundToDecimalPlaces(metrics.USC.volumetric.original, decimalPlaces);
    roundedMetrics.USC.volumetric.current = this.roundToDecimalPlaces(metrics.USC.volumetric.current, decimalPlaces);
    roundedMetrics.USC.average.diff = this.roundToDecimalPlaces(metrics.USC.average.diff, decimalPlaces);
    roundedMetrics.USC.volumetric.diff = this.roundToDecimalPlaces(metrics.USC.volumetric.diff, decimalPlaces);
    roundedMetrics.USC.average.pchange = this.roundToDecimalPlaces(metrics.USC.average.pchange, decimalPlaces);
    roundedMetrics.USC.volumetric.pchange = this.roundToDecimalPlaces(metrics.USC.volumetric.pchange, decimalPlaces);
    roundedMetrics.USC.area = this.roundToDecimalPlaces(metrics.USC.area, decimalPlaces);

    roundedMetrics.Metric.average.original = this.roundToDecimalPlaces(metrics.Metric.average.original, decimalPlaces);
    roundedMetrics.Metric.average.current = this.roundToDecimalPlaces(metrics.Metric.average.current, decimalPlaces);
    roundedMetrics.Metric.volumetric.original = this.roundToDecimalPlaces(metrics.Metric.volumetric.original, decimalPlaces);
    roundedMetrics.Metric.volumetric.current = this.roundToDecimalPlaces(metrics.Metric.volumetric.current, decimalPlaces);
    roundedMetrics.Metric.average.diff = this.roundToDecimalPlaces(metrics.Metric.average.diff, decimalPlaces);
    roundedMetrics.Metric.volumetric.diff = this.roundToDecimalPlaces(metrics.Metric.volumetric.diff, decimalPlaces);
    roundedMetrics.Metric.average.pchange = this.roundToDecimalPlaces(metrics.Metric.average.pchange, decimalPlaces);
    roundedMetrics.Metric.volumetric.pchange = this.roundToDecimalPlaces(metrics.Metric.volumetric.pchange, decimalPlaces);
    roundedMetrics.Metric.area = this.roundToDecimalPlaces(metrics.Metric.area, decimalPlaces);


    return roundedMetrics;
  }

  roundToDecimalPlaces(value: number, places: number): string {
    let isNegative = value < 0;
    let shift = Math.pow(10, places);
    let abs = Math.abs(value);
    let digits = Math.round(abs * shift).toString();
    while(digits.length < places + 1) {
      digits = "0" + digits;
    }
    if(isNegative) {
      digits = "-" + digits;
    }
    let rounded = digits.slice(0, -2) + "." + digits.slice(-2);
    return rounded;
  }

  numericRoundToDecimalPlaces(value: number, places: number): number {
    let shift = Math.pow(10, places);
    let scaled = value * shift;
    let rounded = Math.round(scaled);
    return rounded / shift;
  }































  //REVAMP THIS TO BE MORE EFFICIENT USING UPDATED POINTS LIST
  updateMetrics(updateObjects: any) {
    // let items;

    // //assuming eachlayer returns same order every time, should correspond
    // let i = 0;
    // this.types.aquifers.layer.eachLayer((layer) => {
    //   items = new L.featureGroup();
    //   this.metrics.aquifers[i++].metrics = this.getMetricsSuite(items.addLayer(layer));
    // })

    // i = 0;
    // this.drawnItems.eachLayer((layer) => {
    //   items = new L.featureGroup();
    //   this.metrics.customAreas[i++].metrics = this.getMetricsSuite(items.addLayer(layer));
    // })

    // this.metrics.customAreasTotal = this.getMetricsSuite(this.drawnItems);

    // this.metrics.total = this.getMetricsSuite(null);

    this.createMetrics().then((data) => {

      this.metrics = data;

      if(this.baseLayer.name == "Recharge Rate") {
        this.includeCaprock ? this.mapService.updateMetrics(this, "full", this.metrics.total.roundedMetrics) : this.mapService.updateMetrics(this, "full", this.metrics.totalNoCaprock.roundedMetrics);
      }
    });
    
  }
































  setWindowId(id: number) {
    this.windowId = id;
  }




  upload(info: any, backoff: number = 1) {
    if(this.currentDataInitialized) {
      
      this.verifyFilesAndGetData(info).then((data) => {

        //console.log(data);
        if(data.notFound.length != 0) {
          let message = ""
          if(data.notFound.includes("shapes")) {
            message += "Could not find valid shapefile:\n\t- Must contain all necessary data objects inside a zip folder.\n\n";
          }
          if(data.notFound.includes("cover")) {
            message += "Could not find a valid land cover file:\n\t- Must be in a valid asc or covjson format."
            + "\n\t\t- asc:"
            + "\n\t\t\tMust have a 6 line header with the values ncols, nrows, xllcorner, yllcorner, cellsize, and NODATA_value"
            + "\n\t\t\tGrid must be a subset of the provided map (e.g. fully contained within a " + this.gridWidthCells + " column by " + this.gridHeightCells + " row grid of 75m resolution starting at x: " + this.xmin + ", y: " + this.ymin + ")"
            + "\n\t\t\tMust contain whole number values on the range [" + this.validLandcoverRange.min.toString() + ", " + this.validLandcoverRange.max.toString() + "]"
            + "\n\t\t- covjson:"
            + "\n\t\t\tGrid must be " + this.gridWidthCells + " columns by " + this.gridHeightCells + " rows grid of 75m resolution starting at x: " + this.xmin + ", y: " + this.ymin + ". Covjson subgrid support will be implemented at a later date"
            + "\n\t\t\tMust contain whole number values on the range [" + this.validLandcoverRange.min.toString() + ", " + this.validLandcoverRange.max.toString() + "]\n\n";
          }
          message += "Files are accepted as uploaded or contained within a zip folder."
          this.dialog.open(MessageDialogComponent, {data: {message: message, type: "Warning"}});
        }
        
        if(info.shapes) {
          if(data.shapes != null) {
            if(info.shapeDetails.format == "custom") {

              //array if multiple shapefiles?
              if(Array.isArray(data.shapes)) {
                data.shapes.forEach(shpset => {
                  this.parseAndAddShapes(shpset, info.shapeDetails.properties.name);
                });
              }
              else {
                //console.log(data.shapes)
                this.parseAndAddShapes(data.shapes, info.shapeDetails.properties.name);
              }
            }
            else if(info.shapeDetails.format == "reference") {
              let refLayer = L.geoJSON();

              //array if multiple shpfiles
              if (Array.isArray(data.shapes)) {
                data.shapes.forEach((shpset) => {
                  shpset.features.forEach(object => {
                    refLayer.addData(object);
                  })
                })
    
              }
              //else single element
              else {
                data.shapes.features.forEach(object => {
                  refLayer.addData(object);
                })
              }
    
              refLayer.setStyle({
                weight: 3,
                opacity: 1,
                color: 'black',
                fillOpacity: 0
              });
              refLayer.addTo(this.map);
              let overlayName = "Custom Overlay " + (++this.numCustomOverlays).toString();

              this.layers.addOverlay(refLayer, overlayName);
            }

            if(info.shapeDetails.includeLC || info.shapeDetails.format=="lcOnly") {
              if(Array.isArray(data.shapes)) {
                data.shapes.forEach(shpset => {
                  this.addUploadedLandcoverByShape(shpset, info.shapeDetails.properties.lc, info.overwrite);
                });
              }
              else {
                //console.log(data.shapes)
                this.addUploadedLandcoverByShape(data.shapes, info.shapeDetails.properties.lc, info.overwrite);
              }
              
            }
            
          }
        }

        if(info.cover) {
          if(data.cover != null) {
            
            let covData = this.types.landCover.data._covjson.ranges.cover.values;

            //backup values to restore on data failure
            let backupData = Array.from(covData);

            // let dbQueryChunkSize = 50;
            // let subarrayCounter = 0;
            //let changedIndexComponents = [[]];
            let changedIndexComponents = [];
            let messageShown = false;
            for(let i = 0; i < covData.length; i++) {

              //don't replace if nodata value or background cell, also check if value the same since don't need to get recharge from db for correct values
              if(data.cover.values[i] != data.cover.nodata && covData[i] != 0 && covData[i] != data.cover.values[i]) {
                covData[i] = data.cover.values[i];

                changedIndexComponents.push(this.getComponents(i));

                //add index to query array chunk
                // if(subarrayCounter <= dbQueryChunkSize) {
                //   changedIndexComponents[changedIndexComponents.length - 1].push(this.getComponents(i));
                //   subarrayCounter++;
                // }
                // else {
                //   changedIndexComponents.push([this.getComponents(i)]);
                //   subarrayCounter = 1;
                // }
                //   subarrayCounter++;
                // }
                // else {
                //   changedIndexComponents.push([this.getComponents(i)])
                //   subarrayCounter = 1;
                // }
                

                //if overwriting base values, set value in baseData array
                if(info.overwrite) {
                  this.types.landCover.baseData[i] = data.cover.values[i];
                }
              }
              else if(data.cover.values[i] != data.cover.nodata && data.cover.values[i] != 0 && covData[i] == 0 && !messageShown) {

                //debugging------------------------------------------------------------------------------------------------

                // let xs = this.types.landCover.data._covjson.domain.axes.get("x").values;
                // let ys = this.types.landCover.data._covjson.domain.axes.get("y").values;
                // let point = this.getComponents(i);

                // let c1 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [xs[point.x] - 37.5, ys[point.y] - 37.5]);
                // let c2 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [xs[point.x] + 37.5, ys[point.y] - 37.5]);
                // let c3 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [xs[point.x] + 37.5, ys[point.y] + 37.5]);
                // let c4 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [xs[point.x] - 37.5, ys[point.y] + 37.5]);
                // let cellBounds = {
                //   "type": "Feature",
                //   "properties": {},
                //   "geometry": {
                //     "type": "Polygon",
                //     "coordinates": [[c1, c2, c3, c4, c1]]
                //   }
                // };
                // L.geoJSON(cellBounds, { interactive: false })
                // .setStyle({
                //   fillColor: 'orange',
                //   weight: 5,
                //   opacity: 1,
                //   color: 'orange',
                //   fillOpacity: 0.2
                // })
                // .addTo(this.map);

                //debugging------------------------------------------------------------------------------------------------

                this.dialog.open(MessageDialogComponent, {data: {message: "Attempted to change background cell.\nPlease note that changes to background cells will not be included.", type: "Warning"}});
                messageShown = true;
              }

              
            }

            //need to slice up array since can only handle certain length, use forkjoin
            //also probably faster since queries slow with many indices
            // Observable.forkJoin(changedIndexComponents.map(indexGroup => {
            //   return this.DBService.indexSearch(indexGroup)
            // }))
            // .subscribe((data) => {
            //   console.log(data);
            // });

            //this 4x4 with fancy shapes seems to work now, so does 8x8...
            let geometries = this.generateGeometriesFromPoints(changedIndexComponents);
            
            //debugging------------------------------------------------------------------------------------------------

            // let returnedIndices = [];
            //let errors = [];
            // let errors = 0;

            //debugging------------------------------------------------------------------------------------------------

            this.updateRecharge(geometries, (update) => {
              update.forEach((area) => {
                //how does it behave if out of coverage range? check db response and modify so doesn't throw an error
                area.forEach((record) => {
                  let recordBase = record.value;
                  let x = recordBase.x;
                  let y = recordBase.y;
                  let index = this.getIndex(x, y);
                  
                  //debugging------------------------------------------------------------------------------------------------

                  // returnedIndices.push({x: x, y: y});

                  //debugging------------------------------------------------------------------------------------------------

                  //coverage reassignment completed first, so use this value (covData[index]) to get index in db results
                  let mappedType = covData[index];

                  Object.keys(this.types.recharge.currentData).forEach((scenario) => {

                    //background is not included in the database so indexes shifted by 1
                    //if background type set recharge rate to 0
                    let recordValue = mappedType == 0 ? 0 : recordBase[scenario][mappedType - 1]

                    //debugging------------------------------------------------------------------------------------------------

                    // if(this.types.landCover.baseData[index] == covData[index] && recordValue != this.types.recharge.baseData[scenario][index]) {
                    //   //console.log("scenario: " + scenario + " Land Cover code: " + covData[index] + "\n" + "x: " + x + " y: " + y + "\n" + "expected: " + this.types.recharge.baseData[scenario][index] + " got: " + recordValue);
                    //   //errors.push();
                    //   errors++;
                    // }

                    //debugging------------------------------------------------------------------------------------------------

                    this.types.recharge.currentData[scenario][index] = recordValue;
                  });

                });
              });

              //debugging------------------------------------------------------------------------------------------------

              // console.log(errors);
              // console.log(update);

              // let xs = this.types.landCover.data._covjson.domain.axes.get("x").values;
              // let ys = this.types.landCover.data._covjson.domain.axes.get("y").values;

              // let missingPoints: any = {};

              // changedIndexComponents.forEach((point) => {
              //   let includes = returnedIndices.some((rp) => {
              //     return rp.x == point.x && rp.y == point.y;
              //   });
                
              //   if(!includes) {
              //     this.DBService.indexSearch([point])
              //     .subscribe((data) => {
              //       console.log(data);
              //     });
              //     // //test different point to ensure query properly constructed
              //     // this.DBService.indexSearch([{x: point.x + 1, y: point.y}])
              //     // .subscribe((data) => {
              //     //   console.log(data);
              //     // });
                  
              //     if(missingPoints[point.x] == undefined) {
              //       missingPoints[point.x] = {
              //         min: point.y,
              //         max: point.y
              //       }
              //     }
              //     else {
              //       if(point.y < missingPoints[point.x].min) {
              //         missingPoints[point.x].min = point.y;
              //       }
              //       if(point.y > missingPoints[point.x].max) {
              //         missingPoints[point.x].max = point.y;
              //       }
              //     }
              //     let c1 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [xs[point.x] - 37.5, ys[point.y] - 37.5]);
              //     let c2 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [xs[point.x] + 37.5, ys[point.y] - 37.5]);
              //     let c3 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [xs[point.x] + 37.5, ys[point.y] + 37.5]);
              //     let c4 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [xs[point.x] - 37.5, ys[point.y] + 37.5]);
              //     let cellBounds = {
              //       "type": "Feature",
              //       "properties": {},
              //       "geometry": {
              //         "type": "Polygon",
              //         "coordinates": [[c1, c2, c3, c4, c1]]
              //       }
              //     };
              //     L.geoJSON(cellBounds, { interactive: false })
              //     .setStyle({
              //       fillColor: 'orange',
              //       weight: 5,
              //       opacity: 1,
              //       color: 'orange',
              //       fillOpacity: 0.2
              //     })
              //     .addTo(this.map);
              //   }
              //   else {
              //     // let c1 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [xs[point.x] - 37.5, ys[point.y] - 37.5]);
              //     // let c2 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [xs[point.x] + 37.5, ys[point.y] - 37.5]);
              //     // let c3 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [xs[point.x] + 37.5, ys[point.y] + 37.5]);
              //     // let c4 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [xs[point.x] - 37.5, ys[point.y] + 37.5]);
              //     // let cellBounds = {
              //     //   "type": "Feature",
              //     //   "properties": {},
              //     //   "geometry": {
              //     //     "type": "Polygon",
              //     //     "coordinates": [[c1, c2, c3, c4, c1]]
              //     //   }
              //     // };
              //     // L.geoJSON(cellBounds, { interactive: false })
              //     // .setStyle({
              //     //   fillColor: 'green',
              //     //   weight: 5,
              //     //   opacity: 1,
              //     //   color: 'green',
              //     //   fillOpacity: 0.2
              //     // })
              //     // .addTo(this.map);
              //   }
              // });

              // console.log(missingPoints);

              //debugging------------------------------------------------------------------------------------------------

              this.updateMetrics(geometries);
              this.loadRechargeStyle(this.types.recharge.style);
            }, (error) => {
              //restore land cover on failure
              backupData.forEach((value, i) => {
                covData[i] = value;
              });
              this.loadCover(this.types.landCover, false);
            });

            this.loadCover(this.types.landCover, false);
          }
        }


        //ignore not found values for now, need to implement error message
        //generate error message based on not found list here


      }, (message) => {
        //fail if already uploading or other issues occured while uploading
        this.dialog.open(MessageDialogComponent, {data: {message: message, type: "Error"}});
      });
    }
    else {
      //ensure current data is initialized before processing upload
      //use exponential backoff
      setTimeout(() => {
        this.upload(info, backoff * 2)
      }, backoff);

    }
  }


  
  generateGeometriesFromPoints(points: {x: number, y: number}[]) {
    let xrange = {
      min: Number.POSITIVE_INFINITY,
      max: Number.NEGATIVE_INFINITY
    }
    let yrange = {
      min: Number.POSITIVE_INFINITY,
      max: Number.NEGATIVE_INFINITY
    }

    //let rowMap: any = {}
    //get max and min values and repackage values to be mapped by row
    points.forEach((point) => {
      if(point.x > xrange.max) {
        xrange.max = point.x;
      }
      if(point.x < xrange.min) {
        xrange.min = point.x;
      }
      if(point.y > yrange.max) {
        yrange.max = point.y;
      }
      if(point.y < yrange.min) {
        yrange.min = point.y;
      }

      //if row already in mapping add x value to mapped array of values
      // if(rowMap[point.y]) {
      //   rowMap[point.y].push(point.x);
      // }
      // //otherwise add mapping
      // else {
      //   rowMap[point.y] = [point.x];
      // }
    });

    //determine divisions based on bounding box dimensions, and ensure maximum potential points in each box less than 10000
    let cellWidth = xrange.max - xrange.min + 1;
    let cellHeight = yrange.max - yrange.min + 1;
    let maxCells = cellWidth * cellHeight;
    let queryCellLimit = 10000;
    //use half of query cell limit because faster for smaller queries
    let imposedCellLimit = queryCellLimit / 2;
    let whRatio = cellWidth / cellHeight;

    let divisions = {
      x: 1,
      y: 1
    };

    while(maxCells > imposedCellLimit) {
      //split proportionally
      if(divisions.x / divisions.y < whRatio) {
        divisions.x++;
      }
      else {
        divisions.y++;
      }
      let subWidth = Math.ceil(cellWidth / divisions.x);
      let subHeight = Math.ceil(cellHeight / divisions.y);
      maxCells = subWidth * subHeight;
    }
    //console.log(divisions);

    let chunkSizeX = Math.ceil((xrange.max - xrange.min + 1) / divisions.x);
    let chunkSizeY = Math.ceil((yrange.max - yrange.min + 1) / divisions.y);

    let xs = this.types.landCover.data._covjson.domain.axes.get("x").values;
    let ys = this.types.landCover.data._covjson.domain.axes.get("y").values;

    let geometries = [];
    

    //rectangles
    //-----------------------------------------------------------------------------------

    let bounds = [];
    for(let i = 0; i < divisions.x; i++) {
      bounds.push([]);
      for(let j = 0; j < divisions.y; j++) {
        bounds[i].push({
          xrange: {
            min: Number.POSITIVE_INFINITY,
            max: Number.NEGATIVE_INFINITY
          },
          yrange: {
            min: Number.POSITIVE_INFINITY,
            max: Number.NEGATIVE_INFINITY
          }
        });
      }
    }
    // console.log(chunkSizeX);
    // console.log(chunkSizeY);
    // console.log(xrange);
    // console.log(yrange);
    points.forEach((point) => {
      let offsetX = point.x - xrange.min;
      let offsetY = point.y - yrange.min;
      //console.log(offsetX);
      //console.log(offsetY);
      let chunkX = Math.floor(offsetX / chunkSizeX);
      let chunkY = Math.floor(offsetY / chunkSizeY);
      //console.log(chunkX);
      //console.log(chunkY);
      if(point.x < bounds[chunkX][chunkY].xrange.min) {
        bounds[chunkX][chunkY].xrange.min = point.x;
      }
      if(point.x > bounds[chunkX][chunkY].xrange.max) {
        bounds[chunkX][chunkY].xrange.max = point.x;
      }
      if(point.y < bounds[chunkX][chunkY].yrange.min) {
        bounds[chunkX][chunkY].yrange.min = point.y;
      }
      if(point.y > bounds[chunkX][chunkY].yrange.max) {
        bounds[chunkX][chunkY].yrange.max = point.y;
      }
    });

    for(let i = 0; i < bounds.length; i++) {
      for(let j = 0; j < bounds[i].length; j++) {
        //if min still infinity then no points in section, ignore this subgrid
        if(bounds[i][j].xrange.min == Number.POSITIVE_INFINITY) {
          continue;
        }

        let shape = [];
        let p1 = [xs[bounds[i][j].xrange.min] - 74, ys[bounds[i][j].yrange.min] + 74];
        let p2 = [xs[bounds[i][j].xrange.min] - 74, ys[bounds[i][j].yrange.max] - 74];
        let p3 = [xs[bounds[i][j].xrange.max] + 74, ys[bounds[i][j].yrange.max] - 74];
        let p4 = [xs[bounds[i][j].xrange.max] + 74, ys[bounds[i][j].yrange.min] + 74];
        let p5 = [xs[bounds[i][j].xrange.min] - 74, ys[bounds[i][j].yrange.min] + 74];

        //wrong order
        // let p1 = [ydivisions[j].min, xdivisions[i].min];
        // let p2 = [ydivisions[j].max, xdivisions[i].min];
        // let p3 = [ydivisions[j].max, xdivisions[i].max];
        // let p4 = [ydivisions[j].min, xdivisions[i].max];
        // let p5 = [ydivisions[j].min, xdivisions[i].min];

        shape.push(MapComponent.proj4(MapComponent.utm, MapComponent.longlat, p1));
        shape.push(MapComponent.proj4(MapComponent.utm, MapComponent.longlat, p2));
        shape.push(MapComponent.proj4(MapComponent.utm, MapComponent.longlat, p3));
        shape.push(MapComponent.proj4(MapComponent.utm, MapComponent.longlat, p4));
        shape.push(MapComponent.proj4(MapComponent.utm, MapComponent.longlat, p5));

        geometries.push({
          "type": "Polygon",
          "coordinates": [shape]
        });

      }
    }

    


    //not rectangles
    //-----------------------------------------------------------------------------------------------------------------------

    // let maxURLLength = 2000;
    
    // let divSizeGood = false;
    //might want to convert meters to lat or long measurement for minDistanceParallelLines
    // while(!divSizeGood) {
    //   divSizeGood = true;

    //   let ySubrange = Math.ceil((yrange.max - yrange.min) / divisions.y);
    //   let xSubrange = Math.ceil((xrange.max - xrange.min) / divisions.x);
    //   let numPoints = 5 + 2 * ySubrange;

    //   if(this.minDistanceParallelLines(xSubrange) < 0.01) {
    //     divSizeGood = false;
    //     divisions.x += 1;
    //   }
    //   else if(this.DBService.maxSpatialQueryLength(numPoints) > maxURLLength) {
    //     divSizeGood = false;
    //     divisions.x += 1;
    //     divisions.y += 1;
    //   }
    // }

    // let xdivisions = [];
    // let ydivisions = [];

    // 
    // for(let i = 0; i < divisions.x - 1; i++) {
    //   xdivisions.push({
    //     min: xrange.min + i * chunkSizeX,
    //     //subtract 1 so upper bound centroid not in bounds (boundary centroids get placed in latter section)
    //     max: xrange.min + (i + 1) * chunkSizeX - 1
    //   });
    // }
    // //add last chunk separately so all included if not evenly divisible
    // xdivisions.push({
    //   min: xrange.min + (divisions.x - 1) * chunkSizeX,
    //   max: xrange.max
    // });

    // 
    // for(let i = 0; i < divisions.y - 1; i++) {
    //   ydivisions.push({
    //     //subtract 1 so centroid within bounds
    //     min: yrange.min + i * chunkSizeY - 1,
    //     //subtract 1 so upper bound centroid not in bounds (boundary centroids get placed in latter section)
    //     max: yrange.min + (i + 1) * chunkSizeY - 1
    //   });
    // }
    // //add last chunk separately so all included if not evenly divisible
    // ydivisions.push({
    //   min: yrange.min + (divisions.y - 1) * chunkSizeY - 1,
    //   max: yrange.max + 1
    // });

    // let yMapping = [];
    // //let xMapping = [];

    // for(let i = 0; i < xdivisions.length; i++) {
    //   yMapping.push([]);
    //   for(let j = 0; j < ydivisions.length; j++) {
    //     yMapping[i].push({});
    //   }
    // }

    // // for(let i = 0; i < xdivisions.length; i++) {
    // //   xMapping.push([]);
    // //   for(let j = 0; j < ydivisions.length; j++) {
    // //     xMapping[i].push({});
    // //   }
    // // }


    // //find which division point falls in and create mapping
    // points.forEach((point) => {
    //   let broken = false;
    //   for(let i = 0; i < xdivisions.length; i++) {
    //     for(let j = 0; j < ydivisions.length; j++) {
    //       if((point.x >= xdivisions[i].min && point.x <= xdivisions[i].max) && (point.y >= ydivisions[j].min && point.y <= ydivisions[j].max)) {
    //         if(yMapping[i][j][point.y]) {
    //           if(point.x < yMapping[i][j][point.y].min) {
    //             yMapping[i][j][point.y].min = point.x;
    //           }
    //           else if(point.x > yMapping[i][j][point.y].max) {
    //             yMapping[i][j][point.y].max = point.x;
    //           }
    //         }
    //         else {
    //           yMapping[i][j][point.y] = {
    //             min: point.x,
    //             max: point.x
    //           }
    //         }

    //         // if(xMapping[i][j][point.x]) {
    //         //   if(point.y < xMapping[i][j][point.x].min) {
    //         //     xMapping[i][j][point.x].min = point.y;
    //         //   }
    //         //   else if(point.y > xMapping[i][j][point.x].max) {
    //         //     xMapping[i][j][point.x].max = point.y;
    //         //   }
    //         // }
    //         // else {
    //         //   xMapping[i][j][point.x] = {
    //         //     min: point.y,
    //         //     max: point.y
    //         //   }
    //         // }
    //         broken = true;
    //         break;
    //       }
    //     }
    //     //if inner loop broke already found division the point belongs in, break out of outer loop as well
    //     if(broken) {
    //       break;
    //     }
    //   }
    // });

    // //console.log(yMapping);
    // //console.log(xMapping);

    

    // //CAN ALSO MIRROR ON X SIDES (FOLLOW Y CONTOURS ON TOP AND BOTTOM) FOR TIGHTER BOUND
    // //only want to cutout in gaps between bottom two points and top two points rather than whole range
    // //can fix this later, just comment out x cutouts for now, bit more complicated

    // for(let i = 0; i < xdivisions.length; i++) {
    //   for(let j = 0; j < ydivisions.length; j++) {
    //     let rightPoints = [];
    //     let leftPoints = [];

    //     //points on line should be considered within the shape using mongodb's geowithin definition
    //     //but maybe they aren't, or it might be rounding errors, whatever the case, need to add buffer zone
    //     //add top corners with offsets to create buffer zone
    //     let topLeftUTM = [xs[xdivisions[i].min] - 74, ys[ydivisions[j].min] + 74];
    //     let topRightUTM = [xs[xdivisions[i].max] + 74, ys[ydivisions[j].min] + 74];
    //     let topLeft = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, topLeftUTM);
    //     let topRight = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, topRightUTM);
    //     leftPoints.push(topLeft);
    //     rightPoints.push(topRight);

    //     // let topPoints = [];
    //     // let bottomPoints = [];

    //     for(let y = ydivisions[j].min; y <= ydivisions[j].max; y++) {
    //       if(yMapping[i][j][y]) {
    //         let yUTM = ys[y];
    //         //subtract/add 74 from min/max to create buffer zone
    //         let xMinUTM = xs[yMapping[i][j][y].min] - 74;
    //         let xMaxUTM = xs[yMapping[i][j][y].max] + 74;

    //         let coordLeft = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [xMinUTM, yUTM]);
    //         let coordRight = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [xMaxUTM, yUTM]);
            
    //         //console.log(coordLeft);

    //         leftPoints.push(coordLeft);
    //         rightPoints.push(coordRight);
    //       }
    //     }

    //     //add bottom corners with offsets to create buffer zone
    //     let bottomLeftUTM = [xs[xdivisions[i].min] - 74, ys[ydivisions[j].max] - 74];
    //     let bottomRightUTM = [xs[xdivisions[i].max] + 74, ys[ydivisions[j].max] - 74];
    //     let bottomLeft = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, bottomLeftUTM);
    //     let bottomRight = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, bottomRightUTM);
    //     leftPoints.push(bottomLeft);
    //     rightPoints.push(bottomRight);

    //     //only want to cutout in gaps between bottom two points and top two points rather than whole range
    //     //can fix this later, just comment out x cutouts for now, bit more complicated

    //     // for(let x = xdivisions[i].min; x <= xdivisions[i].max; x++) {
    //     //   if(xMapping[i][j][x]) {
    //     //     let xUTM = xs[x];
    //     //     //subtract 1 from utm coordinate on min side to make sure that point is actually inside shape rather than on line
    //     //     let yMinUTM = ys[xMapping[i][j][x].min] - 1;
    //     //     //add 1 to max side so inside bounds
    //     //     let yMaxUTM = ys[xMapping[i][j][x].max] + 1;

    //     //     //is x, y the right order?
    //     //     //top has minimum y values since grid upside down
    //     //     let coordTop =  MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [xUTM, yMinUTM]);
    //     //     let coordBottom =  MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [xUTM, yMaxUTM]);

    //     //     //console.log(coordTop);
    //     //     topPoints.push(coordTop);
    //     //     bottomPoints.push(coordBottom);
    //     //   }
    //     // }
    //     //reverse right side points since want from top to bottom which is min to max (put in array max to min)
    //     //rightPoints = rightPoints.reverse();
    //     //reverse bottom points so right to left
    //     rightPoints = rightPoints.reverse();
    //     //console.log(leftPoints);
    //     let shape = rightPoints.concat(leftPoints);
    //     //shape = shape.concat(rightPoints);
    //     // shape = shape.concat(leftPoints);  

    //     //if only 4 points then no internal points
    //     if(shape.length > 4) {
    //       //add first point to end of array to close shape
    //       shape.push(shape[0]);

    //       geometries.push({
    //         type: "Feature",
    //         properties: {},
    //         geometry: {
    //           type: "Polygon",
    //           coordinates: [shape]
    //         }
    //       });
    //     }
    //     //console.log(shape); 
    //   }
    // }

    // // geometries = geometries;
    // // let objects = {
    // //   type: "Feature",
    // //   properties: {},
    // //   geometry: {
    // //       "type": "Polygon",
    // //       "coordinates": geometries
    // //   }
    // // };
    // // console.log(objects)

    //-----------------------------------------------------------------------------

    let objects = L.geoJSON(geometries).toGeoJSON();

    //debug-----------------------------------------------------------------------------
    // console.log(objects);

    // geometries.forEach((geometry) => {
    //   // let geojsonBounds = {
    //   //   "type": "Feature",
    //   //   "properties": {},
    //   //   "geometry": geometry
    //   // };
    //   //console.log(geometry);
    //   let polyCoords = this.swapCoordinates(geometry.coordinates);
    //   this.addDrawnItem(L.polygon(polyCoords, {}));
      
    //   //L.geoJSON(geojsonBounds).addTo(this.map);
    // });
    // let customTotal = this.getMetricsSuite(this.getInternalIndices(this.drawnItems.toGeoJSON(), {}).internal);
    // this.metrics.customAreasTotal.metrics = customTotal;
    // this.metrics.customAreasTotal.roundedMetrics = this.roundMetrics(customTotal);
    
    // console.log(geometries);

    //-------------------------------------------------------------------------------

    return objects;
  }


  // minDistanceParallelLines(cellA: {x: number, y: number}, cellB: {x: number, y: number}, lineBaseSeparation: number = 74 * 2) {
  //   let xs = this.types.landCover.data._covjson.domain.axes.get("x").values;
  //   let ys = this.types.landCover.data._covjson.domain.axes.get("y").values;
  //   let maxCellSeparation = Math.abs(cellA.x - cellB.x);
  //   //height equal to distance between centroids
  //   let outerTriangleHeight = 75;
  //   //get distance between opposing cells
  //   let outerTriangleBase = maxCellSeparation * 75;
  //   //subtract width of buffer zone (base separation on one side of the centroid, assuming base separation centered on centroid)
  //   outerTriangleBase -= lineBaseSeparation / 2;
  //   //angle of triangle formed on outer triangle (geometrically equivalent to inner angle for the parallelogram formed byt the parallel lines)
  //   let theta = Math.atan(outerTriangleHeight / outerTriangleBase);

  //   //lineBaseSeparation is hypotenuse inner triangle (triangle formed with perpendicular line between parallel lines to create triangle at parallelogram base)
  //   //need to find length of theta opposite side (inner triangle height)
  //   //this is the distance between the parallel lines
  //   //wrong, probably actually want to 
  //   let innerTriangleHeight = lineBaseSeparation * Math.sin(theta);
    
    
  // }




  verifyFilesAndGetData(info: any) {

    //console.log(info)

    //auxillary functions

    //-------------------------------------------------------------------------------------------

    //using file name since .asc and .covjson don't have mime types (type listed as "")
    //shouldn't be any advantage to using type field, seems to be based on extension
    let getType = (fname: string) => {
      let split = fname.split('.');
      //no file extension if length less than 2, otherwise extension is last array element
      return split.length < 2 ? "" : split[split.length - 1];
    }


    let verifyAndParse = (zipped: boolean, file: any, format: string) => {

      

      let verification = new Promise((accept, reject) => {


        
        //wait until all previous items in the queue verified
        this.waitForAllComplete(this.fileHandler.working.slice(0, position)).then(() => {

          let test: (data) => void;

          //should be shapefile if zip
          if(format == "zip") {

            let test = (data) => {
              //console.log(data);
              shp(data).then((geojson) => {
                //console.log(geojson);
                //if array validate each element as geojson object, return valid ones if exist, reject if all invalid
                if(Array.isArray(geojson)) {
                  let validGeojson = []
                  geojson.forEach((item) => {
                    if(isGeoJSONObject(item)) {
                      validGeojson.push(item);
                    }
                  });
                  if(validGeojson.length > 0) {
                    accept(validGeojson);
                  }
                  else {
                    reject();
                    return;
                  }
                }
                //if single item just check if valid geojson object
                else {
                  if(isGeoJSONObject(geojson)) {
                    accept(geojson);
                  }
                  else {
                    reject()
                    return;
                  }
                }
              }, (e) => {
                //shp couldn't parse at all, reject
                reject();
                return;
              });
            }
            //need to use jszip async method to read zip files
            if(zipped) {

              file.async('arraybuffer').then((data) => {
                
                test(data);

              });
            }
            else {
              if(this.fileHandler.reader) {

                this.fileHandler.reader.onerror = (e) => {
                  reject();
                  return;
                }
                this.fileHandler.reader.onabort = (e) => {
                  reject();
                  return;
                }

                this.fileHandler.reader.onload = (e) => {
                  test(this.fileHandler.reader.result);
                }
                this.fileHandler.reader.readAsArrayBuffer(file);

              }
              else {
                //if file reader not initilized just reject
                reject()
                return;
              }
            }
          }

          //only land cover allowed, so assumes land cover format desired

          /*
          verify:
            - value range
            - number of values
            - for land covjson the parameter name as well since available (should be cover not recharge)
          */



          else if(format == "covjson") {

            test = (data) => {
              let vals = this.covjsonTemplate.verifyCovjson(data);
              if(vals == null || vals.length != this.gridHeightCells * this.gridWidthCells) {
                reject();
                return;
              }
              else {
                for(let i = 0; i < vals.length; i++) {
                  //values strings, convert to numbers
                  vals[i] = Number(vals[i]);
                  //whole number in valid range or no data value
                  if((vals[i] % 1 != 0 || vals[i] < this.validLandcoverRange.min || vals[i] > this.validLandcoverRange.max)) {
                    //console.log("test2");
                    reject();
                    return;
                  }
                }
                
                accept({
                  //covjson has no nodata value
                  nodata: null,
                  values: vals
                });
              }
            }

            if(zipped) {
              file.async('text').then((data) => {
                test(JSON.parse(data));
              });
            }
            else {
              if (this.fileHandler.reader) {

                this.fileHandler.reader.onerror = (e) => {
                  reject();
                  return;
                }
                this.fileHandler.reader.onabort = (e) => {
                  reject();
                  return;
                }

                this.fileHandler.reader.onload = (e) => {
                  test(JSON.parse(this.fileHandler.reader.result as string));
                }
                this.fileHandler.reader.readAsText(file);
              }
              else {
                reject()
                return;
              }
            }

          }


          else if(format == "asc" || format == "ascii" || format == "txt") {
            test = (data) => {

              let parsedData: {
                nodata: number,
                values: number[]
              };

              //split into elements
              let details = data.split('\n');

              let ncols = Number(details[0].split(/[ \t,]+/)[1]);
              let nrows = Number(details[1].split(/[ \t,]+/)[1]);
              let xCorner = Number(details[2].split(/[ \t,]+/)[1]);
              let yCorner = Number(details[3].split(/[ \t,]+/)[1]);
              let cellSize = Number(details[4].split(/[ \t,]+/)[1]);
              let noData = Number(details[5].split(/[ \t,]+/)[1]);

              //for now, reject different resolutions
              // if(cellSize != 75) {
              //   reject();
              // }

              //ensure noData value is not an otherwise valid value (whole number in value range)
              if(noData % 1 == 0 && noData >= this.validLandcoverRange.min && noData <= this.validLandcoverRange.max) {
                //console.log("?");
                reject();
                return;
              }

              
              let xs = this.types.landCover.data._covjson.domain.axes.get("x").values;
              let ys = this.types.landCover.data._covjson.domain.axes.get("y").values;

              let getCentroidComponentIndices = (x, y) => {
                // console.log(this.xmin);
                // console.log(x);
                let diffx = x - this.xmin;
                let diffy = y - this.ymin;
  

                //round to nearest 75
                diffx = Math.round(diffx / 75) * 75;
                diffy = Math.round(diffy / 75) * 75;
  
                //add to min offset and add 37.5 to get centroid
                let xCellVal = this.xmin + 37.5 + diffx;
                let yCellVal = this.ymin + 37.5 + diffy;
  
                // console.log(xs);
                // console.log(xCellVal);
                
                //find index of cell with coordinates
                return {
                  xIndex: xs.indexOf(xCellVal),
                  yIndex: ys.indexOf(yCellVal)
                };
              };


              
              let minCentroid = getCentroidComponentIndices(xCorner, yCorner);
              //check if corner centroid valid, reject if it isn't
              if(minCentroid.xIndex < 0 || minCentroid.yIndex < 0) {
                reject();
                return;
              }
              //values array might have newlines in it (especially between rows)
              let vals = [];
              //console.log(details.length);
              for(let i = 6; i < details.length; i++) {
                //get data values after first six detail lines
                //split on spaces, tabs, or commas for values
                vals = vals.concat(details[i].split(/[ \t,]+/));
                //console.log(details[i].length)
                
                //if whitespace at the end might reult in whitespace only element, remove these
                if(vals[vals.length - 1].trim() == "") {
                  vals.splice(vals.length - 1, 1);
                }
                //console.log(vals[vals.length - 1]);
              }
              //verify number of values
              if(vals.length != ncols * nrows) {
                //console.log(vals.length);
                //console.log(ncols * nrows)
                reject();
                return;
              }
              //convert values to numbers and ensure valid
              for(let i = 0; i < vals.length; i++) {
                //values strings, convert to numbers
                vals[i] = Number(vals[i]);
                //whole number in valid range or no data value
                if((vals[i] % 1 != 0 || vals[i] < this.validLandcoverRange.min || vals[i] > this.validLandcoverRange.max) && vals[i] != noData) {
                  reject();
                  return;
                }
              }
          
              let getLocalIndex = (x, y) => {
                return y * ncols + x;
              }

                //get range of grid, ensure in bounds
                let maxXOffset = (ncols - 1) * cellSize;
                let maxYOffset = (nrows - 1) * cellSize;
                let maxX = xCorner + maxXOffset;
                let maxY = yCorner + maxYOffset;

                let maxCentroid = getCentroidComponentIndices(maxX, maxY);
                //console.log(maxCentroid);
                //check if max corner centroid valid, reject if it isn't
                if(maxCentroid.xIndex < 0 || maxCentroid.yIndex < 0) {
                  //console.log("fail");
                  reject();
                  return;
                }

          
              //grid exact size, just accept with provided value grid
              if(cellSize == 75 && ncols == this.gridWidthCells && nrows == this.gridHeightCells) {
                parsedData = {
                  nodata: noData,
                  //initialize to full grid size array with all noData values
                  values: vals
                };
              }
              //otherwise need to insert values into full grid
              else { 

                let getLocalComponentIndicesFromGlobalOffset = (globalXOffset, globalYOffset, scale) => {
                  
                  let globalOffsetsFromLocalGrid = {
                    x: globalXOffset - minCentroid.xIndex,
                    //subtract on y axis since bottom to top (minCentroid's y index will be maximum value)
                    y: minCentroid.yIndex - globalYOffset
                  };

                  let localXOffset;
                  let localYOffset;
                  //if scale greater than 1 (local grid smaller cells/higher resolution) take ceiling so use first cell not in last cell
                  if(scale > 1) {
                    localXOffset = Math.ceil(scale * globalOffsetsFromLocalGrid.x);
                    localYOffset = Math.ceil(scale * globalOffsetsFromLocalGrid.y);
                  }
                  //if less than 1 (local grid larger cells/ lower resolution) take floor to ensure uses containing cell (otherwise might round out of containing cell)
                  else {
                    localXOffset = Math.floor(scale * globalOffsetsFromLocalGrid.x);
                    localYOffset = Math.floor(scale * globalOffsetsFromLocalGrid.y);
                  }
                  

                  // //offset from local grid bounds, so compute global indices from this
                  // let globalXIndex = minCentroid.xIndex + globalXOffset;
                  // //subtract on y axis because bottom to top
                  // let globalYIndex = minCentroid.yIndex - globalYOffset;

                  let localXIndex = localXOffset;
                  //y offset from bottom so need to subtract from total number of rows (- 1 because 0 based)
                  let localYIndex = (nrows - 1) - localYOffset;

                  return {
                    xIndex: localXIndex,
                    yIndex: localYIndex
                  };
                };

                parsedData = {
                  nodata: noData,
                  //initialize to full grid size array with all noData values
                  values: new Array(this.gridWidthCells * this.gridHeightCells).fill(noData)
                };

                let scale = 75 / cellSize;

                //debugging
                // console.log(minCentroid);
                // console.log(xs[minCentroid.xIndex]);
                // console.log(ys[minCentroid.yIndex]);
                // console.log(maxCentroid);
                // console.log(xs[maxCentroid.xIndex]);
                // console.log(ys[maxCentroid.yIndex]);
                // console.log(vals.length);
                // console.log(scale);

                
                // let last = 0;
                //debugging

                for(let xOffset = minCentroid.xIndex; xOffset <= maxCentroid.xIndex; xOffset++) {
                  //bottom to top, so max centroid's y axis should be smaller
                  for(let yOffset = maxCentroid.yIndex; yOffset <= minCentroid.yIndex; yOffset++) {
                    //grid goes from lower left (left to right bottom to top)
                    //subtract yOffset since going up
                    let globalIndex = this.getIndex(xOffset, yOffset);

                    let localComponents = getLocalComponentIndicesFromGlobalOffset(xOffset, yOffset, scale)

                    //y offset from bottom so need to subtract from total number of rows
                    let localIndex = getLocalIndex(localComponents.xIndex, localComponents.yIndex);

                    //debugging
                    // if(localIndex > vals.length) {
                    //   console.log(localIndex);
                    // }
                    // last++;
                    //debugging

                    parsedData.values[globalIndex] = vals[localIndex];
                  }
                }
              }

              
              //if everything looks good accept, passing back the value array
              accept(parsedData);
            }


            if(zipped) {
              file.async('text').then((data) => {
                test(data);
              });
            }
            else {
              if (this.fileHandler.reader) {

                this.fileHandler.reader.onerror = (e) => {
                  reject();
                  return;
                }
                this.fileHandler.reader.onabort = (e) => {
                  reject();
                  return;
                }

                this.fileHandler.reader.onload = (e) => {
                  test(this.fileHandler.reader.result);
                }
                this.fileHandler.reader.readAsText(file);
              }
              else {
                reject();
                return;
              }

            }
          }
          //just reject if bad format, should never get here
          else {
            reject();
            return;
          }
        });
        
      });

      //push this functions promise into queue, get position in queue
      let position = this.fileHandler.working.push(verification);

        

      return verification;
    }


    //checks if a valid top level file exists in the provided lists
    //returns valid file and type if exists, else returns null
    //probably need to pass in if zipped for verification (need to know how to read file)
    let checkFiles = (zipped: boolean, acceptFormats: string[], files: any[]) => {
      return new Promise((accept, reject) => {

        let numProcessed = 0;

        for(let i = 0; i < files.length; i++) {
          let type = getType(files[i].name);      
          //check if file extension indicates acceptible format
          if(acceptFormats.includes(type)) {
            //verify the file to be desired format
            verifyAndParse(zipped, files[i], type).then((data) => {

              //accept with returned data if file verified
              accept(data);

            }, (e) => {
              //increment number processed (and failed) and check if all others failed
              //reject if all failed
              if(++numProcessed >= files.length) {
                reject();
                return;
              }

            });
              
            }
            else {
              if(++numProcessed >= files.length) {
                reject();
                return;
              }
            }
          }
          
        });


    }

    //gets list of files in zip folder
    let getZippedFiles = (zip: any) => {

      let zippedFiles = new Promise((accept, reject) => {
        //push this functions promise into queue, get position in queue
        
        //wait until all previous items in the queue verified
        this.waitForAllComplete(this.fileHandler.working.slice(0, position)).then(() => {
          let files = [];

          if (this.fileHandler.reader) {

            this.fileHandler.reader.onerror = (e) => {
              reject();
              return;
            }
            this.fileHandler.reader.onabort = (e) => {
              reject();
              return;
            }

            this.fileHandler.reader.onload = (e) => {
              let zipFiles = new JSZip();

              let data = this.fileHandler.reader.result;

              zipFiles.loadAsync(data).then((contents) => {
                Object.keys(contents.files).forEach((name) => {
                  files.push(contents.files[name]);
                });
                accept(files)
              });
            }

            this.fileHandler.reader.readAsArrayBuffer(zip);
          }
        });
      });
      let position = this.fileHandler.working.push(zippedFiles);
      
      return zippedFiles;
    }


    let process = (type: string) => {
      return new Promise((accept, reject) => {


        let acceptedFormats = type == "cover" ? ["covjson", "asc"] : ["zip"];

        //need to read files in verify, no need to reread, just return desired data

        //check top level files for valid file
        let check = checkFiles(false, acceptedFormats, info.files).then((data) => {
          //valid file found, resolve with the file's data
          accept(data);
        }, (e) => {
          let numProcessed = 0;

          //valid file not found in top level, check zipped files
          for(let i = 0; i < info.files.length; i++) {
            let type = getType(info.files[i].name);
            //find zip files
            if(type == "zip") {
              //get the zipped files and check them
              getZippedFiles(info.files[i]).then((files) => {

                checkFiles(true, acceptedFormats, files as any[]).then((data) => {

                  accept(data)

                }, (e) => {

                  //increment number processed (and failed) and check if all others failed
                  //reject if all failed
                  if(++numProcessed >= info.files.length) {
                    reject();
                    return;
                  }

                });
              }, (e) => {
                if(++numProcessed >= info.files.length) {
                  reject();
                  return;
                }
              });
            }
            else {
              if(++numProcessed >= info.files.length) {
                reject();
                return;
              }
            }
          }
        });



        //set details if found
        // if(check != null) {
        //   breakdown.file = check.file;
        //   breakdown.format = check.type;

        //   resolve(breakdown);
        // }
        //if no match check zip files
        //else {
          
       // }
      });
    }

    //-------------------------------------------------------------------------------------------

    /*
    possibility weird combination of things uploaded, or upload cover and recharge

    process order:
    - check top level files
    - check inside top level zip files
    - signal not found (only accept single level zipped)
    
    processing:
    - read file, verify expected type
      - not expected type, reject and check next file in processing order
      - expected type, accept
    */


    return new Promise<any>((accept, reject) => {
      
      if(this.fileHandler.busy) {
        reject("Upload failed. Another upload is already in progress, please wait until this upload completes.")
      }
      else {

        //timeout after 10 seconds in case something goes wrong
        setTimeout(() => {
          //let pending file operations resolve then reset
          this.waitForAllComplete(this.fileHandler.working).then(() => {
            this.fileHandler.working = [];
            //allow new upload
            this.fileHandler.busy = false;
          }, (e) => {});

          reject("Upload failed. Operation timed out or an error occured while uploading.");
        }, 10000)

        //indicate upload in progress
        this.fileHandler.busy = true;

        //get file details
        let data = {
          notFound: [],
          shapes: null,
          cover: null
        }





        let parsing = []

        if(info.shapes) {
          parsing.push(new Promise((resolve) => {

            process("shapes").then((values) => {

              data.shapes = values;
              resolve();
              
            }, (e) => {
              data.notFound.push("shapes");
              resolve();
            });
          }));


          // data.shapes = {
          //   zipped: false,
          //   file: null
          // }
        }




        if(info.cover) {
          parsing.push(new Promise((resolve) => {

            process("cover").then((values) => {

              data.cover = values;
              resolve();
              
            }, (e) => {
              data.notFound.push("cover");
              resolve();
            });
          }));


        }

        /////////////////////////////////////////////////////////////////////////////////////////////////

        

        Promise.all(parsing).then(() => {
          //reset working queue, don't want to remove inline since using Promise.all for coordination (if remove might mess up function)
          //might still have things working if resolved before all processed, so resolve all in queue before resetting
          this.waitForAllComplete(this.fileHandler.working).then(() => {
            this.fileHandler.working = [];
            //indicate upload complete after state reset finished
            this.fileHandler.busy = false;
          }, (e) => {
            this.fileHandler.working = [];
            //indicate upload complete after state reset finished
            this.fileHandler.busy = false;
          });
          accept(data);
        }, (e) => {
          //should never happen, none of these promises should reject
          reject("Upload failed. An unxpected error has occured");
          return;
        });
      }
    });
  }


  private waitForAllComplete(promises: Promise<any>[]): Promise<any> {
    return new Promise((resolve) => {
      //just in case new promises added to array, otherwise might never resolve
      let numPromises = promises.length;
      let complete = 0;
      if(numPromises == 0) {
        resolve();
      }
      else {
        //increment number complete after each promise in list resolves or rejects, resolve after all complete
        promises.forEach((promise) => {
          promise.then(() => {
            if(++complete >= numPromises) {
              resolve();
            }
          }, (e) => {
            if(++complete >= numPromises) {
              resolve();
            }
          })
        });
      }
      
    });
  }







  //NOTE: WHEN GETTING NEW NODE MODULES PROBABLY WILL NEED TO DOWNLOAD EARLIER VERSION, THEN REDOWNLOAD NEW ONE
  //shpwrite module uses an old version, whereas this uses newer methods
  //is there a workaround to make this work better?

  //default download drawn items
  download(info: any, backoff: number = 1) {
    if(this.currentDataInitialized) {

      //console.log(info)
      let ready = [];
      let index = 0;

      [info.recharge, info.cover].forEach((item) => {
        if(item) {
          ready.push({
            ready: false,
            fname: "",
            type: "",
            data: null
          });
          //projection file
          ready.push({
            ready: false,
            fname: "",
            type: "",
            data: null
          });
        }
      });
      if(info.shapes) {
        ready.push({
          ready: false,
          fname: "",
          type: "",
          data: null
        });
      }


      //get string representation of specified file contents
      let genDataFileContents = (type: string, format: string) => {

        let xs = this.types.landCover.data._covjson.domain.axes.get("x").values;
        let ys = this.types.landCover.data._covjson.domain.axes.get("y").values;
        let vals = type == "recharge" ? this.types.recharge.currentData[this.currentScenario] : this.types.landCover.data._covjson.ranges.cover.values;
        let fcontents;
    
        switch(format) {
          
          case "asc": {
            //generate header lines
            fcontents = "ncols " + this.gridWidthCells + "\n";
            fcontents += "nrows " + this.gridHeightCells + "\n";
            fcontents += "xllcorner " + this.xmin + "\n";
            fcontents += "yllcorner " + this.ymin + "\n";
            fcontents += "cellsize " + 75 + "\n";
            fcontents += "NODATA_value -9999 \n";

            let colCounter = 0;
            //add data
            vals.forEach((val) => {
              let convertedVal = val;
              if(this.unitType == "Metric" && type == "recharge") {
                convertedVal = this.numericRoundToDecimalPlaces(convertedVal * MapComponent.INCH_TO_MILLIMETER_FACTOR, 3);
              }
              fcontents += convertedVal + " "
              
              //should have newline at the end of every row
              if(++colCounter >= this.gridWidthCells) {
                fcontents += "\n";
                colCounter = 0;
              }
            });

            let fname = type == "recharge" ? ((this.unitType == "Metric" ? type + "_millimeters_per_year" : type + "_inches_per_year") + this.scenarioFnames[this.currentScenario] + "." + format) : type + "." + format;
            return {
              data: fcontents,
              name: fname,
              type: 'text/plain;charset=utf-8'
            }
            break;
          }
          
          case "covjson": {
            let fname = type == "recharge" ? ((this.unitType == "Metric" ? type + "_millimeters_per_year" : type + "_inches_per_year") + this.scenarioFnames[this.currentScenario] + "." + format) : type + "." + format;
            return {
              data: JSON.stringify(this.covjsonTemplate.constructCovjson(xs, ys, vals, [this.gridHeightCells, this.gridWidthCells], type == "recharge" ? "recharge" : "cover", this.unitType, this.numericRoundToDecimalPlaces)),
              name: fname,
              type: 'text/plain;charset=utf-8'
            }
            break;
          }

          case "prj": {
            let fname = type == "recharge" ? ((this.unitType == "Metric" ? type + "_millimeters_per_year" : type + "_inches_per_year") + this.scenarioFnames[this.currentScenario] + "." + format) : type + "." + format;
            return {
              data: ModifiedShpwriteService.PROJECTION,
              name: fname,
              type: 'text/plain;charset=utf-8'
            }
          }

          //download as a shapefile
          //not currently available
          case "shp": {

            let cells = [];

            //need to change property label if recharge

            xs.forEach((x, i) => {
              ys.forEach((y, j) => {
                let value = vals[this.getIndex(i, j)];
                if(value == 0) {
                  return;
                }
                //console.log("test");

                let c1 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [x - 37.5, y - 37.5]);
                let c2 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [x - 37.5, y + 37.5]);
                let c3 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [x + 37.5, y + 37.5]);
                let c4 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [x + 37.5, y - 37.5]);

                let cellBounds = {
                  type: "Feature",
                  properties: {},
                  geometry: {
                    type: "Polygon",
                    coordinates: [[c1, c2, c3, c4, c1]]
                  }
                };

                cellBounds.properties = type == "landCover" ? { lcCode: value } : { recharge: value };

                cells.push(cellBounds);
              });
            });

            //console.log("complete");
            
            let shapes = L.geoJSON(cells).toGeoJSON();

            let zip = new JSZip();
            
            this.modShpWrite.writePolygons(shapes, (err, files) => {
              let fileName = "DefinedAreas";
              zip.file(fileName + '.shp', files.shp.buffer, { binary: true });
              zip.file(fileName + '.shx', files.shx.buffer, { binary: true });
              zip.file(fileName + '.dbf', files.dbf.buffer, { binary: true });
              zip.file(fileName + '.prj', shpWritePrj);
            });

            zip.generateAsync({ type: "base64" }).then((file) => {
              return {
                data: this.base64ToArrayBuffer(file),
                name: type + ".zip",
                type: 'data:application/zip'
              }
            });
            break;
          }
        }
      };


      let genAndDownloadPackage = () => {
        let name = "downloadPackage.zip";
        //shouldn't be here if empty, but check equal to 1 just in case (if empty for some reason forEach loop in else will cause nothing to happen)
        //if single item just download file, no need put in zip folder
        if(ready.length == 1) {
          let item = ready[0]
          saveAs(new Blob([item.data], { type: item.type }), item.fname);
        }
        //otherwise zip files together
        else {
          let downloadPackage = new JSZip();
          ready.forEach((item) => {
            downloadPackage.file(item.fname, item.data);
          })

          downloadPackage.generateAsync({ type: "base64" }).then((file) => {
            saveAs(new Blob([this.base64ToArrayBuffer(file)], { type: "data:application/zip" }), name)
          })
        }
      };
      

      //let __this = this;

      if(info.shapes) {

        //get current details object and increment index
        let thisDetails = ready[index++];

        let zip = new JSZip();

        let shapes = this.drawnItems.toGeoJSON();
        //toGeoJSON seems to use eachLayer function, so should be same order, having a hard time finding full source code in readable format, so hopefully won't cause problems
        let i = 0;
        this.drawnItems.eachLayer((layer) => {
          shapes.features[i].properties.name = this.customAreaMap[layer._leaflet_id].name;
          shapes.features[i].properties.scenario = this.scenarioLabelMap[this.currentScenario].current;
          i++;
        });
        //console.log(shapes);
    
        
        //console.log(shapes);
        //let polygons = shpWriteGeojson.polygon(shapes);

        // if(shapes.type.toLowerCase() != "featurecollection") {
        //   throw new Error("Invalid shapefile download");
        // } probably don't need this check, if no feature list will throw error anyway (should never happen regardless)
        
        
        this.modShpWrite.writePolygons(shapes, (err, files) => {
          let fileName = "DefinedAreas";
          zip.file(fileName + '.shp', files.shp.buffer, { binary: true });
          zip.file(fileName + '.shx', files.shx.buffer, { binary: true });
          zip.file(fileName + '.dbf', files.dbf.buffer, { binary: true });
          zip.file(fileName + '.prj', shpWritePrj);
        });

        zip.generateAsync({ type: "base64" }).then((file) => {
          //generate file details
          thisDetails.data = this.base64ToArrayBuffer(file);
          thisDetails.fname = "DefinedAreas.zip";
          thisDetails.type = 'data:application/zip';

          //signal ready
          thisDetails.ready = true;

          //check if all items are ready, and download if they are
          let allReady = true;
          ready.forEach((item) => {
            allReady = item.ready && allReady;
          });
          //don't think the way js works will allow for race conditions here (would need to concede resources right here),
          //but if multiple downloads ever reported then can change ready signal to after this, and check all but the current ready state
          if(allReady) {
            genAndDownloadPackage();
          }
          // saveAs(new Blob([this.base64ToArrayBuffer(file)], { type: "data:application/zip" }), name + ".zip")
        });
      }

      

      if(info.recharge) {

        //get current details object and increment index
        let thisDetails = ready[index++];
        //get projection details
        let prjDetails = ready[index++];

        //generate file details
        let fdetails = genDataFileContents("recharge", info.format);
        thisDetails.data = fdetails.data;
        thisDetails.fname = fdetails.name;
        thisDetails.type = fdetails.type;
        fdetails = genDataFileContents("recharge", "prj");
        prjDetails.data = fdetails.data;
        prjDetails.fname = fdetails.name;
        prjDetails.type = fdetails.type;

        //signal ready
        thisDetails.ready = true;
        prjDetails.ready = true;

        //check if all items are ready, and download if they are
        let allReady = true;
        ready.forEach((item) => {
          allReady = item.ready && allReady;
        });
        if(allReady) {
          genAndDownloadPackage();
        }
      }

      if(info.cover) {

        //get current details object and increment index
        let thisDetails = ready[index++];
        //get projection details
        let prjDetails = ready[index++];

        //generate file details
        let fdetails = genDataFileContents("landCover", info.format);
        thisDetails.data = fdetails.data;
        thisDetails.fname = fdetails.name;
        thisDetails.type = fdetails.type;
        fdetails = genDataFileContents("landCover", "prj");
        prjDetails.data = fdetails.data;
        prjDetails.fname = fdetails.name;
        prjDetails.type = fdetails.type;

        //signal ready
        thisDetails.ready = true;
        prjDetails.ready = true;

        //check if all items are ready, and download if they are
        let allReady = true;
        ready.forEach((item) => {
          allReady = item.ready && allReady;
        });
        if(allReady) {
          genAndDownloadPackage();
        }

      }
      // saveAs(new Blob([fcontents], {type: 'text/plain;charset=utf-8'}), type + "." + format);
    }
    else {
      //ensure current data is initialized before processing download
      //use exponential backoff
      setTimeout(() => {
        this.download(info, backoff * 2);
      }, backoff);
    }

  }

  



  //convert base64 string produced by shp-write to array buffer for conversion to blob
  private base64ToArrayBuffer(base64) {
    let bs = window.atob(base64);
    let len = bs.length;
    let bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = bs.charCodeAt(i);
    }
    return bytes.buffer;
  }





  private loadDrawControls() {
    this.drawnItems = new L.featureGroup();
    this.uneditableItems = new L.featureGroup();
    this.highlightedItems = new L.featureGroup();

    this.map.addLayer(this.drawnItems);
    //this.map.addLayer(this.editableItems);

    L.drawLocal.draw.handlers.marker.tooltip.start = "Click map to select cell";


    //might want to add some kind of undo button
    L.DrawToolbar.include({
      getModeHandlers: function (map) {
        return [
          {
            enabled: true,
            handler: new L.Draw.Polygon(map, {repeatMode: true, allowIntersection: false}),
            title: L.drawLocal.draw.toolbar.buttons.polygon
          },

          {
            enabled: true,
            handler: new L.Draw.Rectangle(map, {repeatMode: true}),
            title: L.drawLocal.draw.toolbar.buttons.rectangle
          },
          {
            enabled: true,
            handler: new L.Draw.Marker(map, {
              repeatMode: true,
              icon: new L.divIcon({
                className: 'leaflet-mouse-marker',
                iconAnchor: [0, 0],
                iconSize: [0, 0]
              }
              )
            }),
            title: 'Select map cell'
          }
        ]
      }
    });

    this.drawControl = new L.Control.Draw({
      edit: {
        featureGroup: this.drawnItems
      }
    });
    this.map.addControl(this.drawControl);

    this.map.on(L.Draw.Event.DELETED, (event) => {
      event.layers.eachLayer((layer) => {
        //remove layers from layers not controled by the draw edit controls
        this.drawnItems.removeLayer(layer)
        this.highlightedItems.removeLayer(layer)
        this.uneditableItems.removeLayer(layer)

        //remove metrics from custom areas array
        let objectMetrics = this.customAreaMap[layer._leaflet_id];
        let index = this.metrics.customAreas.indexOf(objectMetrics);
        this.metrics.customAreas.splice(index, 1);
      });

      //no need recompute customTotal if nothing removed
      if(Object.keys(event.layers._layers).length > 0) {
        let indices = this.getInternalIndices(this.drawnItems.toGeoJSON(), {})
        let customTotal = this.getMetricsSuite(indices.internal, true);
        this.metrics.customAreasTotal.metrics = customTotal;
        this.metrics.customAreasTotal.roundedMetrics = this.roundMetrics(customTotal);
      }
    });

    //remove individual cells from edit control (can be deleted but not edited)
    this.map.on(L.Draw.Event.EDITSTART, (event) => {
      this.uneditableItems.eachLayer((layer) => {
        this.drawnItems.removeLayer(layer);
      })
      //removed from visible layer so add to map temporarily
      this.uneditableItems.addTo(this.map);
    });
    //add back when editing complete
    this.map.on(L.Draw.Event.EDITSTOP, (event) => {
      //remove added shapes from map so not included twice
      this.map.removeLayer(this.uneditableItems);
      //add back shapes to edit control
      this.uneditableItems.eachLayer((layer) => {
        this.drawnItems.addLayer(layer);
      })
    });

    //if anything edited update metrics
    this.map.on(L.Draw.Event.EDITED, (event) => {
      if(Object.keys(event.layers._layers).length > 0) {
        this.updateMetrics(event.layers.toGeoJSON());
      }
    });

    this.map.on(L.Draw.Event.CREATED, (event) => {
      //console.log(event.layer);
      if(event.layerType == "marker") {
        let bounds = this.getCell(event.layer._latlng);
        //check if was out of map boundaries, do nothing if it was
        if(bounds) {
          this.addDrawnItem(new L.Rectangle(bounds), false);
        }
      }
      else {
        this.addDrawnItem(event.layer);
      }

      // //can streamline computation by using set of added shapes' metrics and previous data as base
      // let indices = this.getInternalIndices(this.drawnItems.toGeoJSON(), {})
      // let customTotal = this.getMetricsSuite(indices.internal, true);
      // this.metrics.customAreasTotal.metrics = customTotal;
      // this.metrics.customAreasTotal.roundedMetrics = this.roundMetrics(customTotal);

    });
  }

  //might want to refactor so hover uses this function too
  //though a bit weird since hover function needs more info from computed values
  private getCell(clickLocation: { lat: number, lng: number }): any {
    let convertedMousePoint = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [clickLocation.lng, clickLocation.lat]);

    let cellBounds = null;

    let data = this.types.landCover.data._covjson.ranges.cover.values;
    let xs = this.types.landCover.data._covjson.domain.axes.get("x").values;
    let ys = this.types.landCover.data._covjson.domain.axes.get("y").values;

    //get difference from min to mouse position
    let diffx = convertedMousePoint[0] - this.xmin;
    let diffy = convertedMousePoint[1] - this.ymin;
    //do nothing if out of range of grid
    if (diffx >= 0 && diffy >= 0 && diffx <= this.xrange && diffy <= this.yrange) {

      //round down to nearest 75
      diffx = Math.floor(diffx / 75) * 75;
      diffy = Math.floor(diffy / 75) * 75;

      //get cell boundaries as geojson object to draw on map
      //cell corners
      //only need first and third corners for rectangle object
      let c1 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [this.xmin + diffx, this.ymin + diffy]);
      // let c2 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [this.xmin + diffx + 75, this.ymin + diffy]);
      let c3 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [this.xmin + diffx + 75, this.ymin + diffy + 75]);
      // let c4 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [this.xmin + diffx, this.ymin + diffy + 75]);
      // cellBounds = {
      //   "type": "Feature",
      //   "properties": {},
      //   "geometry": {
      //       "type": "Polygon",
      //       "coordinates": [[c1, c2, c3, c4, c1]]
      //   }
      // };

      //rectangle bounds in lat long order, so swap values
      //returning rectangle bounds since can't easily use geojson layers with edit controls
      cellBounds = [[c1[1], c1[0]], [c3[1], c3[0]]];
    }
    return cellBounds;
  }

  //might want to do something about overlapping layers
  //right now if a shape is drawn over another shape and fully encloses it, there is no way to interact with the first shape (all clicks are caught by newly drawn shape)
  //maybe check if one is contained in another
  private addDrawnItem(layer: any, editable: boolean = true, name?: string, updateCustomTotal: boolean = true, precomputedIndices?: {layer?: number[], total?: number[]}) {
    // console.log(this.types.aquifers.layer);

    //this.downloadShapefile(this.drawnItems)
    //let start = new Date().getTime();
    let __this = this;

    let highlight = {
      fillColor: 'black',
      weight: 3,
      opacity: 1,
      color: 'black',  //Outline color
      fillOpacity: 0.2
    };

    layer.setStyle(highlight);
    layer.highlighted = true;
    this.highlightedItems.addLayer(layer);

    this.drawnItems.addLayer(layer);
    if (!editable) {
      this.uneditableItems.addLayer(layer);
    }
    //this.loadcovJSON("Kiawe", this.map, this.layers);
    //alert(layer.getLatLngs());

    // //set base drawing style for highlight reset
    // if(MapComponent.baseStyle == undefined) {
    //   //clone base options
    //   MapComponent.baseStyle = JSON.parse(JSON.stringify(layer.options));
    // }
    this.addInteractionToLayer(layer, false, this); 

    let info = {
      name: "",
      metrics: {},
      roundedMetrics: {}
    };

    info.name = name == undefined ? "Custom Area " + (__this.customAreasCount++).toString() : name;
    //set to whole metric object so when change name will change in metrics
    this.customAreaMap[layer._leaflet_id] = info;

    // //test
    // let args = {
    //   host: window.location.host,
    //   path: window.location.pathname,
    //   protocol: window.location.protocol,
    //   data: {
    //     geojsonObjects: this.getInternalIndices(this.drawnItems.toGeoJSON(),
    //     xs: this.types.landCover.data._covjson.domain.axes.get("x").values,
    //     ys: this.types.landCover.data._covjson.domain.axes.get("y").values,
    //     lcVals: this.types.landCover.data._covjson.ranges.cover.values,
    //     gridWidthCells: this.gridWidthCells,
    //     gridHeightCells: this.gridHeightCells,
    //     longlat: MapComponent.longlat,
    //     utm: MapComponent.utm,
    //     options: {}
    //   }
    // }
    // this.webWorker.run(workerGetInternalIndices, args).then((indices) => {
    //   

    //   
    // }, (error) => {
    //   console.log(error);
    // });
    // //test

    let indices = precomputedIndices != undefined && precomputedIndices.layer != undefined ? precomputedIndices.layer : this.getInternalIndices({features: [layer.toGeoJSON()]}, {}).internal;
    let itemMetrics = this.getMetricsSuite(indices, true);

    info.metrics = itemMetrics;
    info.roundedMetrics = this.roundMetrics(itemMetrics);
    this.metrics.customAreas.push(info);
    

    

    if(updateCustomTotal) {
      new Promise<number[]>((resolve) => {
        if(precomputedIndices != undefined && precomputedIndices.total != undefined) {
          resolve(precomputedIndices.total);
        }
        else {
          let args = {
            host: window.location.host,
            path: window.location.pathname,
            protocol: window.location.protocol,
            data: {
              geojsonObjects: this.drawnItems.toGeoJSON(),
              xs: this.types.landCover.data._covjson.domain.axes.get("x").values,
              ys: this.types.landCover.data._covjson.domain.axes.get("y").values,
              lcVals: this.types.landCover.data._covjson.ranges.cover.values,
              gridWidthCells: this.gridWidthCells,
              gridHeightCells: this.gridHeightCells,
              longlat: MapComponent.longlat,
              utm: MapComponent.utm,
              options: {}
            }
          }
          return this.webWorker.run(workerGetInternalIndices, args);
        }
      }).then((indices) => {
        let customTotal = this.getMetricsSuite(indices, true);
        this.metrics.customAreasTotal.metrics = customTotal;
        this.metrics.customAreasTotal.roundedMetrics = this.roundMetrics(customTotal);
      });
      
    }
    
  }




  private addInteractionToLayer(layer: any, emitMetrics: boolean, __this) {
    let highlight = {
      fillColor: 'black',
      weight: 3,
      opacity: 1,
      color: 'black',  //Outline color
      fillOpacity: 0.2
    };
    let unhighlight = {
      weight: 3,
      opacity: 0.5,
      color: 'black',  //Outline color
      fillOpacity: 0
    }

    layer.on('click', (e) => {
      if(layer.highlighted) {
        layer.setStyle(unhighlight);
        layer.highlighted = false;
        __this.highlightedItems.removeLayer(layer);
      }
      else {
        layer.setStyle(highlight);
        layer.highlighted = true;
        __this.highlightedItems.addLayer(layer);
      }
      //if indicated that metrics are to be computed, recompute on change
      //check if metrics are locked in event
      if(emitMetrics && (e.lockMetrics == undefined || !e.lockMetrics)) {
        __this.getSelectedShapeMetrics();
      }
      __this.mapService.updateSelect(__this, __this.drawnItems.getLayers().length, __this.highlightedItems.getLayers().length);
    });
    __this.mapService.updateSelect(__this, __this.drawnItems.getLayers().length, __this.highlightedItems.getLayers().length);
  }


  public resize(width: number, height: number) {


    this.mapid.nativeElement.style.height = height - 50 + 'px';
    this.mapid.nativeElement.style.width = width - 20 + 'px';


    this.map.invalidateSize();
  }

  
  private updateRecharge(geojsonObjects: any, dataHandler: any, errorHandler: any) {
    let numItems = geojsonObjects.features.length;
    //console.log(geojsonObjects);
    if (numItems != 0) {
      //recharge value handling requires all scenarios are loaded, so wait until complete
      let dataHandlerReadyCheck = (backoff, data) => {
        return new Promise((resolve) => {
          if(this.scenariosInitialized) {
            dataHandler(data);
            resolve();
          }
          else {
            setTimeout(() => {
              dataHandlerReadyCheck(backoff * 2, data).then(() => {
                resolve();
              });
            }, backoff);
          }
        });
      };

      this.mapService.setLoading(this, true);

      //deal with errors too
      let start = new Date().getTime();
      Observable.forkJoin(geojsonObjects.features.map(element => {
        return this.DBService.spatialSearch(element.geometry);
      }))
      .subscribe((data) => {
        let optime = new Date().getTime()
        console.log("Operation took " + (optime - start).toString() + "ms");
        
        dataHandlerReadyCheck(1, data).then(() => {
          console.log("Data handler took " + (new Date().getTime() - optime).toString() + "ms");
          this.mapService.setLoading(this, false);
        });
      }, (error) => {
        //console.log(error);
        this.dialog.open(MessageDialogComponent, {data: {message: "An error has occurred while retrieving recharge data. Land cover changes have been reverted. Please try again.", type: "Error"}});
        errorHandler(error);
        this.mapService.setLoading(this, false);
      });
    }
  }

  //too many queries, breaks everything
  private letsTryPointsAgain(points: {x: number, y: number}[], dataHandler: any, errorHandler: any) {
    
    //console.log(geojsonObjects);
    if (points.length != 0) {

      let pointsPerChunk = 100;
      let chunks = [];
      for(let i = 0; i < points.length; i += pointsPerChunk) {
        chunks.push(points.slice(i, Math.min(i + pointsPerChunk, points.length)));
      }

      this.mapService.setLoading(this, true);
      //deal with errors too
      let start = new Date().getTime();
      Observable.forkJoin(chunks.map(points => {
        return this.DBService.indexSearch(points);
      }))
      .subscribe((data) => {
        let optime = new Date().getTime()
        console.log("Operation took " + (optime - start).toString() + "ms");
        //console.log(typeof data);
        //use file(s) generated as cover
        dataHandler(data);
        console.log("Data handler took " + (new Date().getTime() - optime).toString() + "ms");
        this.mapService.setLoading(this, false);
      }, (error) => {
        //console.log(error);
        this.dialog.open(MessageDialogComponent, {data: {message: "An error has occurred while retrieving recharge data. Land cover changes have been reverted. Please try again.", type: "Error"}});
        errorHandler(error);
        this.mapService.setLoading(this, false);
      });
    }
  }


  updateCustomAreaCover(type: string) {
    //convert panel parameter to update format
    let options: any = {
      unhighlight: true
    };
    let convertedType = type;
    if(type != "advanced" && type != "base") {
      convertedType = "shape";
      options.code = COVER_ENUM[type];
    }
    // this.highlightedItems.eachLayer((layer) => {

    //   layer.feature = {};
    //   layer.feature.type = "Feature";
    //   layer.feature.properties = {
    //     test: "test"
    //   };
    // });
    // console.log(this.highlightedItems.toGeoJSON())
    this.updateCoverByShape(this.highlightedItems.toGeoJSON(), convertedType, options);
  }
  

  //type should be advanced, base, shape,
  //shape should have options including landcover code
  //also can have overwrite option specifying if want to overwrite default values (false if not included)
  //unhighlight option specifying whether highlighted objects should be unhighlighted, default false (currently all or nothing, might want to add subsets)
  //options {code: number, overwrite: boolean, unhighlight: boolean}
  private updateCoverByShape(geojsonObjects: any, type: string, options: any) {

    //let geojsonObjects = this.highlightedItems.toGeoJSON();

    let covData = this.types.landCover.data._covjson.ranges.cover.values;
    let overwrite = options.overwrite == undefined ? false : options.overwrite;
    switch(type) {
      
      case "shape": {
        let lc = options.code;
        if(lc == undefined) {
          throw new Error("No code option provided for shape update");
        }

        let indices: any = this.getInternalIndices(geojsonObjects, {background: true, breakdown: true});
        let repackage = this.checkRepackageShapes(geojsonObjects, indices.breakdown);
        let internalIndices = indices.internal;

        if(internalIndices.length == 0) {
          this.dialog.open(MessageDialogComponent, {data: {message: "No Cells Selected for Modification.\n\nEither:\n\n- No areas have been created for modification (Use the drawing tools on the left side of the map to define areas, or upload a shapefile containing predefined areas).\n- All areas have been deselected (Click on a defined area to allow modifications).\n- The area(s) selected are too small or contain no valid cells", type: "Info"}});
          return;
        }

        let queryObjects = repackage ? this.repackageIndices(internalIndices) : geojsonObjects;

        // let numIndices = indices.internal.l
        // let hasBackground = featureIndices.some((details) => {
        //   return details.background.length > 0;
        // });
    
        if(indices.background > 0) {
          this.dialog.open(MessageDialogComponent, {data: {message: "Background cells have been selected.\nPlease note that changes to background cells will not be included.", type: "Warning"}});
        }

        //backup values to restore on data failure
        let backupData = Array.from(covData);

        let covRemap = new Promise((resolve) => {
          internalIndices.forEach((index) => {
            if(covData[index] != 0) {
              covData[index] = lc;
              if(overwrite) {
                this.types.landCover.baseData[index] = lc;
              }
            }
          });
          
          //reload layer from changes
          this.loadCover(this.types.landCover, false);
          resolve();
        });

        this.updateRecharge(queryObjects, (update) => {
          covRemap.then(() => {
            update.forEach(area => {
              area.forEach(record => {
                let recordBase = record.value;
                let x = recordBase.x;
                let y = recordBase.y;
                let index = this.getIndex(x, y);
                
                let mappedType = covData[index];
  
                Object.keys(this.types.recharge.currentData).forEach((scenario) => {
                  //background is not included in the database so indexes shifted by 1
                  //if background type set recharge rate to 0
                  let recordValue = mappedType == 0 ? 0 : recordBase[scenario][mappedType - 1]
                  this.types.recharge.currentData[scenario][index] = recordValue;
                  if(overwrite) {
                    this.types.recharge.baseData[scenario][index] = recordValue;
                  }
                });
              });
            });
            this.updateMetrics(geojsonObjects);
            this.loadRechargeStyle(this.types.recharge.style);
          });
        }, (error) => {
          //restore land cover on failure
          backupData.forEach((value, i) => {
            covData[i] = value;
          });
          this.loadCover(this.types.landCover, false);
        });

        // indices.internal.forEach((index) => {
        //   covData[index] = mappedType;
        //   if(overwrite) {
        //     this.types.landCover.baseData[index] = mappedType;
        //   }
        // });
        // console.log(this.types.landCover);
        // //reload layer from changes
        // this.loadCover(this.types.landCover, false);
        
        break;
      }
      case "advanced": {
        //backup values to restore on data failure
        let backupData = Array.from(covData);

        let info: any = {}

        let containedTypes = new Set();

        let indices: any = this.getInternalIndices(geojsonObjects, {background: true, breakdown: true});
        let repackage = this.checkRepackageShapes(geojsonObjects, indices.breakdown);
        let internalIndices = indices.internal;

        internalIndices.forEach((index) => {
          containedTypes.add(COVER_INDEX_DETAILS[covData[index]].type);
        });

        info.sourceTypes = Array.from(containedTypes);

        info.allTypes = Object.keys(COVER_ENUM);

        info.state = this.advancedMappingState;

        this.dialog.open(AdvancedMappingDialogComponent, {data: info, maxHeight: "90vh"}).afterClosed()
        .subscribe((data) => {
          //console.log(data);
          //default closing disabled, data should always exist, still check just in case
          if(data) {
            //check if a mapping was created or if operation canceled
            if(data.mapping) {

              let queryObjects = repackage ? this.repackageIndices(internalIndices) : geojsonObjects;

              let covRemap = new Promise((resolve) => {
                internalIndices.forEach((index) => {
                  //set to default type
                  let mappedType = data.mapping.default;
                  let currentType = COVER_INDEX_DETAILS[covData[index]].type;
                  //if mapping exists assign to mapped type
                  if(data.mapping[currentType]) {
                    mappedType = data.mapping[currentType];
                  }

                  //if mapped type is base assign base value
                  if(mappedType == "base") {
                    covData[index] = this.types.landCover.baseData[index];
                  }
                  //if mapped type isn't "no change" change cover to mapped value
                  else if(mappedType != "No Change") {
                    let mappedCode = COVER_ENUM[mappedType];
                    covData[index] = mappedCode;
                    if(overwrite) {
                      this.types.landCover.baseData[index] = mappedCode;
                    }
                  }
                  else if(overwrite) {
                    this.types.landCover.baseData[index] = covData[index];
                  }
                  
                });
                //reload layer from changes
                this.loadCover(this.types.landCover, false);
                resolve()
              });

              this.updateRecharge(queryObjects, (update) => {
                //ensure coverage remapping complete before processing recharge values
                covRemap.then(() => {
                  update.forEach((area) => {
                    //how does it behave if out of coverage range? check db response and modify so doesn't throw an error
                    area.forEach((record) => {
                      let recordBase = record.value;
                      let x = recordBase.x;
                      let y = recordBase.y;
                      let index = this.getIndex(x, y);
                      //does the array include base? if not have to shift
      
                      //coverage reassignment completed first, so use this value (covData[index]) to get index in db results
                      let mappedType = covData[index];

                      Object.keys(this.types.recharge.currentData).forEach((scenario) => {
                        //background is not included in the database so indexes shifted by 1
                        //if background type set recharge rate to 0
                        let recordValue = mappedType == 0 ? 0 : recordBase[scenario][mappedType - 1]

                        this.types.recharge.currentData[scenario][index] = recordValue;
                        if(overwrite) {
                          this.types.recharge.baseData[scenario][index] = recordValue;
                        }
                      });

                    });
                  });
                  this.updateMetrics(geojsonObjects);
                  this.loadRechargeStyle(this.types.recharge.style);
                });
                
              }, (error) => {
                //restore land cover on failure
                backupData.forEach((value, i) => {
                  covData[i] = value;
                });
                this.loadCover(this.types.landCover, false);
              });
              
            }

            //save state
            this.advancedMappingState = data.state;
          }
        });
        break;
      }
      case "base": {
        //let backgroundIndices = [];
        let indices = this.getInternalIndices(geojsonObjects, {});

        indices.internal.forEach(index => {
          covData[index] = this.types.landCover.baseData[index];
          Object.keys(this.types.recharge.currentData).forEach((scenario) => {
            this.types.recharge.currentData[scenario][index] = this.types.recharge.baseData[scenario][index];
          });
        });
        this.loadCover(this.types.landCover, false);

        this.updateMetrics(geojsonObjects);
        this.loadRechargeStyle(this.types.recharge.style);
        break;
      }
      
      default: {
        throw new Error("Unexpected cover update type");
      }
      
    }

    if(options.unhighlight) {
      let unhighlight = {
        weight: 3,
        opacity: 0.5,
        color: 'black',  //Outline color
        fillOpacity: 0
      };

      this.highlightedItems.eachLayer((layer) => {
        layer.setStyle(unhighlight);
        layer.highlighted = false;
        this.highlightedItems.removeLayer(layer);
      });
    }
      
  }


  //features may have overlapping bounding boxes, generally better to take all or nothing approach (if any feature needs to be repackaged, repackage everything together)
  //optimizations in repackaging algorithm should balance out unoptimal configuarations reasonably well (cases where features are non-overlapping)
  //just return bool in case need indexes for something else before repackaging (advanced mapping...)
  private checkRepackageShapes(geojsonObjects: any, featureIndices: {internal: number[], background: number}[]): boolean {
    
    let repackage = false;

    for(let i = 0; i < featureIndices.length; i++) {
      let shape = geojsonObjects.features[i];
      let feature = featureIndices[i];
      if(feature.internal.length + feature.background > DBConnectService.MAX_POINTS || this.DBService.spatialQueryLength(shape.geometry) > DBConnectService.MAX_URI ) {
        console.log("repack");
        repackage= true;
        //found a feature that needs to be repackaged, no need to keep looking
        break;
      }
    }

    return repackage;
  }


  //only ever need to know how many background indices there are, never need to know their indices, should also never need background for breakdown (just return array of non-background internal indices for each feature)
  private getInternalIndices(geojsonObjects: any, options: {background?: boolean, breakdown?: boolean}): {internal: number [], background?: number, breakdown?: {internal: number[], background?: number}[]} {
    //want indices to be unique
    let indices: any = {};
    let conversions = [];
    let mechanisms: any = {};
    //still need to store background indices in set
    //if single feature indices guaranteed unique, no need to go through set (more efficient to use array directly)
    if(geojsonObjects.features.length < 2) {
      indices.internal = [];
      mechanisms.internal = indices.internal.push.bind(indices.internal);
      if(options.background) {
        indices.background = 0;
        mechanisms.background = () => { indices.background++; };
      }
    }
    else {
      indices.internal = new Set();
      mechanisms.internal = indices.internal.add.bind(indices.internal);
      conversions.push(() => { indices.internal = Array.from(indices.internal); });
      if(options.background) {
        indices.background = new Set();
        mechanisms.background = indices.background.add.bind(indices.background);
        conversions.push(() => { indices.background = indices.background.size; });
      }
    }
    if(options.breakdown) {
      indices.breakdown = [];
    }
    
    geojsonObjects.features.forEach((feature) => {
      if(options.breakdown) {
        let featureIndices: any = {
          internal: [],
        };
        mechanisms.breakdownInternal = featureIndices.internal.push.bind(featureIndices.internal);
        if(options.background) {
          featureIndices.background = 0;
          mechanisms.breakdownBackground = () => { featureIndices.background++; }
        }
        indices.breakdown.push(featureIndices);
        
      }
      //if not a feature return
      if(feature.type.toLowerCase() != "feature") {
        return;
      }
      let geoType = feature.geometry.type.toLowerCase();
      switch(geoType) {
        case "polygon": {
          let coordinates = feature.geometry.coordinates;
          this.getPolygonInternalIndices(coordinates, mechanisms);
          break;
        }
        case "multipolygon": {
          let coordinates = feature.geometry.coordinates;
          coordinates.forEach((polygon) => {
            this.getPolygonInternalIndices(polygon, mechanisms);
          });
          break;
        }
      }
    });
    conversions.forEach((conversion) => {
      conversion();
    });
    
    return indices;
  }

  private getPolygonInternalIndices(coordinates: number[][][], mechanisms: {internal: (val: number) => any, background?: (val: number) => any, breakdownInternal?: (val: number) => any, breakdownBackground?: (val: number) => any}): void {

    let convertedPoints = [];
    let a = [];
    let b = [];
    let xmax = Number.NEGATIVE_INFINITY;
    let xmin = Number.POSITIVE_INFINITY;
    let ymax = Number.NEGATIVE_INFINITY;
    let ymin = Number.POSITIVE_INFINITY;

    //bounding box on first ring because outer ring
    let pointsBase = coordinates[0];

    for(let i = 0; i < pointsBase.length; i++) {
      convertedPoints.push(MapComponent.proj4(MapComponent.longlat, MapComponent.utm, pointsBase[i]));
    }

    for(let i = 0; i < convertedPoints.length - 1; i++) {
      //coordinates are in long lat order (I think)

      //get max and min vals to limit coordinates need to compare
      if(convertedPoints[i][0] > xmax) {
        xmax = convertedPoints[i][0];
      }
      if(convertedPoints[i][0] < xmin) {
        xmin = convertedPoints[i][0];
      }
      if(convertedPoints[i][1] > ymax) {
        ymax = convertedPoints[i][1];
      }
      if(convertedPoints[i][1] < ymin) {
        ymin = convertedPoints[i][1];
      }
      //convert these points, less conversions than trying to convert grid points
      a.push({
        x: convertedPoints[i][0],
        y: convertedPoints[i][1]
      });
      b.push({
        x: convertedPoints[i + 1][0],
        y: convertedPoints[i + 1][1]
      });
    }
    //add segments for inner rings
    for(let i = 1; i < coordinates.length; i++) {
      pointsBase = coordinates[i];
      convertedPoints = [];

      for(let i = 0; i < pointsBase.length; i++) {
        convertedPoints.push(MapComponent.proj4(MapComponent.longlat, MapComponent.utm, pointsBase[i]));
      }

      for(let i = 0; i < convertedPoints.length - 1; i++) {
        a.push({
          x: convertedPoints[i][0],
          y: convertedPoints[i][1]
        });
        b.push({
          x: convertedPoints[i + 1][0],
          y: convertedPoints[i + 1][1]
        });
      }
    }


    //-----------------end pre-processing-------------------

      

    //convert max min values and find range of cells
    //no need to check every single one
    //convert coordinate and get x value
    // let xmaxUTM = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [xmax_x, xmax_y])[0];
    // let xminUTM = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [xmin_x, xmin_y])[0];
    // let ymaxUTM = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [ymax_x, ymax_y])[1];
    // let yminUTM = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [ymin_x, ymin_y])[1];

    let xs = this.types.landCover.data._covjson.domain.axes.get("x").values;
    let ys = this.types.landCover.data._covjson.domain.axes.get("y").values;
    let lcVals = this.types.landCover.data._covjson.ranges.cover.values;

    let minxIndex;
    let maxxIndex;
    let minyIndex;
    let maxyIndex;

    //again, assume values are in order
    //find min and max indexes
    //check if ascending or descending order, findIndex returns first occurance
    if(xs[0] < xs[1]) {
      minxIndex = Math.max(xs.findIndex((val) => { return val >= xmin }), 0);
      //> not >= so returns index after last even if on edge 
      maxxIndex = xs.findIndex((val) => { return val > xmax });
      if(maxxIndex < 0) {
        maxxIndex = this.gridWidthCells;
      }
    }
    else {
      maxxIndex = xs.findIndex((val) => { return val < xmin });
      minxIndex = Math.max(xs.findIndex((val) => { return val <= xmax }), 0);
      if(maxxIndex < 0) {
        maxxIndex = this.gridWidthCells;
      }
    }
    if(ys[0] < ys[1]) {
      minyIndex = Math.max(ys.findIndex((val) => { return val >= ymin }), 0);
      maxyIndex = ys.findIndex((val) => { return val > ymax });
      if(maxyIndex < 0) {
        maxyIndex = this.gridHeightCells;
      }
    }
    else {
      maxyIndex = ys.findIndex((val) => { return val < ymin });
      minyIndex = Math.max(ys.findIndex((val) => { return val <= ymax }), 0);
      if(maxyIndex < 0) {
        maxyIndex = this.gridHeightCells;
      }
    }

    let index;
    //convert cell coords to long lat and raycast
    //max index calculation returns index after last index in range, so only go to index before in loop (< not <=)
    for(let xIndex = minxIndex; xIndex < maxxIndex; xIndex++) {
      for(let yIndex = minyIndex; yIndex < maxyIndex; yIndex++) {
        index = this.getIndex(xIndex, yIndex);
        //don't include if background
        if(lcVals[index] != 0) {
          if(this.isInternal(a, b, { x: xs[xIndex], y: ys[yIndex] })) {
            mechanisms.internal(index)
            if(mechanisms.breakdownInternal) {
              mechanisms.breakdownInternal(index);
            }
          }
        }
        else if(mechanisms.background != undefined) {
          if(this.isInternal(a, b, { x: xs[xIndex], y: ys[yIndex] })) {
            mechanisms.background(index)
            if(mechanisms.breakdownBackground) {
              mechanisms.breakdownBackground(index);
            }
          }
        }
      }
    }
  }


  //can specify origin if 0, 0 is in range, not necessary for cover being used (0,0 not in range)
  private isInternal(a: any[], b: any[], point: any, origin: any = { x: 0, y: 0 }): boolean {
    //raycasting algorithm, point is internal if intersects an odd number of edges
    let internal = false;
    for(let i = 0; i < a.length; i++) {
      //segments intersect iff endpoints of each segment are on opposite sides of the other segment
      //check if angle formed is counterclockwise to determine which side endpoints fall on
      if(this.ccw(a[i], origin, point) != this.ccw(b[i], origin, point) && this.ccw(a[i], b[i], origin) != this.ccw(a[i], b[i], point)) {
        internal = !internal
      }

    }
    return internal;
  }

  //determinant formula yields twice the signed area of triangle formed by 3 points
  //counterclockwise if negative, clockwise if positive, collinear if 0
  private ccw(p1, p2, p3): boolean {
    //if on line counts, both will be 0, probably need to add special value (maybe return -1, 0, or 1)
    return ((p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y)) > 0;
  }


  //raycasting algorithm, point is internal if intersects an odd number of edges
  // isInternal(a: any[], b: any[], point: any, origin: any = { x: 0, y: 0 }): boolean {
  //   //need to convert points to lat long for this to work properly
  //   let convertedOrigin = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [origin.x, origin.y]);
  //   let convertedPoint = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [point.x, point.y]);
  //   let referenceArc = this.getGreatCircleSegment(convertedOrigin, convertedPoint);
  //   let referenceCircle = this.getGreatCircle(convertedOrigin, convertedPoint);
  //   let reference = {
  //     arc: referenceArc,
  //     circle: referenceCircle
  //   };

  //   let internal = false;
  //   for (let i = 0; i < a.length; i++) {
  //     let covertedA = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [a[i].x, a[i].y]);
  //     let convertedB = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [b[i].x, b[i].y]);
  //     let segmentArc = this.getGreatCircleSegment(covertedA, convertedB);
  //     let segmentCircle = this.getGreatCircle(covertedA, convertedB);
  //     let segment = {
  //       arc: segmentArc,
  //       circle: segmentCircle
  //     };

  //     if(this.arcsIntersect(reference, segment)) {
  //       internal = !internal;
  //     }
  //   }
  //   return internal;
  // }

  //great circle segments (arcs), a and b, intersect if a intersects b's great circle and b intersects with a's great circle
  arcsIntersect(a: {arc: any, circle: any}, b: {arc: any, circle: any}) {
    return this.arcIntersectsCircle(a, b.circle) && this.arcIntersectsCircle(b, a.circle);
  }

  //a great circle segment, a, intersects a great circle, b, if
  //vectors c and d are the intersects between a's great circle and b
  //and c or d lies between a.start and a.end
  arcIntersectsCircle(a: {arc: any, circle: any}, b: {x: number, y: number, z: number}) {
    let intersects = this.greatCirclesIntersect(a.circle, b);
    return this.intersectBetween(intersects.intersect1, a.arc) || this.intersectBetween(intersects.intersect2, a.arc);
  }

  //determines if intersect is between the start and end points of the arc
  //vector is between the start and end vectors of the arc if the angle between the start point and the vector and the vector and the end point is equal to the angle between the start and end points
  intersectBetween(intersect: {x: number, y: number, z: number}, arc: {start: any, end: any}) {
    if(this.angleBetween(arc.start, intersect) + this.angleBetween(intersect, arc.end) - this.angleBetween(arc.start, arc.end) < 0.01) {
      console.log("small");
    }
    return this.angleBetween(arc.start, intersect) + this.angleBetween(intersect, arc.end) == this.angleBetween(arc.start, arc.end);
  }

  //dot product of two vectors, a and b, is equal to the magnitude of a times the magnitude of b times cos(theta)
  //rearrange to solve for theta
  angleBetween(a: {x: number, y: number, z: number}, b: {x: number, y: number, z: number}) {
    return Math.acos(this.dot(a, b)) / (this.mag(a) * this.mag(b));
  }

  //magnitude of a vector
  mag(vector: {x: number, y: number, z: number}) {
    return Math.sqrt(Math.pow(vector.x, 2) + Math.pow(vector.y, 2) + Math.pow(vector.z, 2));
  }

  //dot product of two vectors
  dot(a: {x: number, y: number, z: number}, b: {x: number, y: number, z: number}) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  //two great circles intersect at the cross product of their vectors and the antipode of this value
  greatCirclesIntersect(a: {x: number, y: number, z: number}, b: {x: number, y: number, z: number}) {
    let intersect1 = this.cross(a, b);
    let intersect2 = this.getAntipode(intersect1);
    return {
      intersect1: intersect1,
      intersect2: intersect2
    }
  }

  getAntipode(vector: {x: number, y: number, z: number}) {
    return {
      x: -vector.x,
      y: -vector.y,
      z: -vector.z
    }
  }

  //computes a representation of a great circle segment by the projection vectors of its endpoints through the spheres center
  getGreatCircleSegment(a: number[], b: number[]) {
    return {
      start: this.projectThroughUnitSphere(a),
      end: this.projectThroughUnitSphere(b)
    };
  }

  getGreatCircle(a: number[], b: number[]) {
    let va = this.projectThroughUnitSphere(a);
    let vb = this.projectThroughUnitSphere(b);
    return this.cross(va, vb);
  }

  //find vector from point through center of a unit sphere
  //not trying to find distance, so actual radius of the earth is irrelevant (easier to just use a unit sphere)
  projectThroughUnitSphere(point: number[]) {
    //tan(lat) = y/x, tan(long) = z/x
    //get x, y, z where sqrt(x^2 + y^2 + z^2) = mag, mag = 1
    let long = Math.abs(point[0]);
    let lat = Math.abs(point[1]);
    let x = 1 / Math.sqrt(Math.pow(Math.tan(long), 2) + Math.pow(Math.tan(lat), 2) + 1);
    let y = x * Math.tan(lat);
    let z = x * Math.tan(long);

    return {
      x: x,
      y: y,
      z: z
    };
  }

  cross(a: {x: number, y: number, z: number}, b: {x: number, y: number, z: number}) {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    };
  }



  selectAll(select: boolean) {

    let clickLayers = (layers) => {
      layers.forEach((layer, i) => {
        //signal click handler to lock metrics updates unless last item to prevent unnecessary computations
        if(i < layers.length - 1) {
          layer.fire("click", {lockMetrics: true});
        }
        else {
          layer.fire("click", {lockMetrics: false});
        }
      });
    }

    //no need to trigger click events if not proper mode
    let mode = this.interactionType;
    switch(mode) {
      case "aquifer": {
        //filter layers by ones that need to be toggled (need to filter ahead of time so know which layer is the last one being interacted with)
        let layers = this.types.aquifers.layer.getLayers().filter((layer) => {return layer.highlighted != select});
        clickLayers(layers);
      }
      case "custom": {
        let layers = this.drawnItems.getLayers().filter((layer) => {return layer.highlighted != select});
        clickLayers(layers);
      }
    }
    
    
    //this.mapService.updateSelect(this, this.drawnItems.getLayers().length, this.highlightedItems.getLayers().length);
  }





  //prolly need parameter to say whether to start layer toggled on or off, might want to add this to types def
  //update names and make sure works
  private loadCover(coverage: any, legend: boolean) {
    if(coverage.layer != undefined) {
      this.map.removeControl(coverage.layer);
      this.layers.removeLayer(coverage.layer);
    }
    if(coverage == this.types.landCover) {
      // coverage.data._covjson.ranges.cover.values.forEach((value, i) => {
      //   if(value == 0) {
      //     coverage.data._covjson.ranges.cover.values[i] = null;
      //   }
      // });
      coverage.data._covjson.ranges.cover.values[0] = this.validLandcoverRange.max;
    }

    // work with coverage object
    let layer = C.dataLayer(coverage.data, { parameter: coverage.parameter, palette: coverage.palette })
    .on('afterAdd', () => {
      if(this.legend != undefined) {
        this.map.removeControl(this.legend);
      }
      if(legend) {
        this.createLegend(coverage.style);
      }
    })
    .setOpacity(this.opacity);
    //uses base layers now
    // //ensure recharge layer on top (don't want to have to remove covers to view it)
    // if(this.types.recharge.layer != undefined) {
    //   this.types.recharge.layer.bringToFront();
    // }
    //recharge disabled by default

    if(this.baseLayer == undefined && coverage == this.types.landCover) {
      layer.addTo(this.map);
      this.baseLayer = {
        name: "Land Cover",
        layer: layer
      };
    }
    else if(coverage.label == this.baseLayer.name) {
      layer.addTo(this.map);
      this.baseLayer.layer = layer;
    }

    this.layers.addBaseLayer(layer, coverage.label);
    coverage.layer = layer;

  }

  createLegend(style: string) {
    switch(style) {
      case "rate": {
        let upperRaw = this.paletteExtent[1];
        let lowerRaw = this.paletteExtent[0];
        let units = "Inches per Year"
        if(this.unitType == "Metric") {
          upperRaw *= MapComponent.INCH_TO_MILLIMETER_FACTOR;
          lowerRaw *= MapComponent.INCH_TO_MILLIMETER_FACTOR;
          units = "Milimeters per Year";
        }
        let upper = this.roundToDecimalPlaces(upperRaw, 2) + "+";
        let lower = this.roundToDecimalPlaces(lowerRaw, 2);
        this.legend = this.addLegend(this.rcPalette.slice(this.rechargePaletteHeadLength, this.rcPalette.length - this.rechargePaletteTailLength), [lower, upper], "Recharge", units);
        break;
      }
      case "pchange": {
        let upperRaw = this.pchangeExtent[1];
        let lowerRaw = this.pchangeExtent[0];
        let upper = this.roundToDecimalPlaces(upperRaw, 2) + "+";
        let lower = this.roundToDecimalPlaces(lowerRaw, 2) + "-";
        this.legend = this.addLegend(this.rcDivergingPalette, [lower, upper], "Recharge Change", "Percent");
        break;
      }
      case "diff": {
        let upperRaw = this.diffExtent[1];
        let lowerRaw = this.diffExtent[0];
        if(this.unitType == "Metric") {
          upperRaw *= MapComponent.INCH_TO_MILLIMETER_FACTOR
          lowerRaw *= MapComponent.INCH_TO_MILLIMETER_FACTOR
        }
        
        let units = (this.unitType == "Metric" ? "Milimeters per Year" : "Inches per Year")
        let upper = this.roundToDecimalPlaces(upperRaw, 2) + "+";
        let lower = this.roundToDecimalPlaces(lowerRaw, 2) + "-";
        this.legend = this.addLegend(this.rcDivergingPalette, [lower, upper], "Recharge Change", units);
        break;
      }
    }
    //console.log(this.unitType);
    
  }

  addLegend(palette: string[], range: string[], title: string, units: string) {
    let legend = L.control({position: "bottomright"});
    legend.onAdd = (map) => {
      let div = L.DomUtil.create("div", "info legend")

      let html = "<div style='border-radius: 10px; background-color: lightgray; width: 90px; padding: 10px;'>"
      + "<div>"
      + title
      + "</div>";
      if(this.paletteType == "usgs" && this.types.recharge.style == "rate") {
        html += "<div style='align-items: center; display: flex; font-size: 12px;'>"
        + "<div style='padding-right: 5px; padding-top: 5px; padding-bottom: 7px;'>"
        + "<div style='height: 10px; width: 10px; background-color: "
        + this.rcPalette[this.rcPalette.length - 1]
        + "'></div>"
        + "</div>"
        + "<div style='align-items: center; display: flex; font-size: 12px;'>";
        html += this.unitType == "Metric" ? (MapComponent.USGS_PURPLE_RECHARGE * MapComponent.INCH_TO_MILLIMETER_FACTOR).toString() : MapComponent.USGS_PURPLE_RECHARGE.toString();
        html += "+"
        + "</div>"
        + "</div>";
      }
      html += "<div style='align-items: center; display: flex; font-size: 12px;'>"
      + "<div style='padding-right: 5px;'>"
      + "<div style='background-image: linear-gradient(to top, ";
      palette.forEach((color, i) => {
        html += color;
        if(i < palette.length - 1) {
          html += ", ";
        }
      });
      html += "); height: 100px; width: 10px;'></div>"
      + "</div>"
      + "<div style='height: 120px; display: flex; flex-direction: column;'>"
      + "<div style='height: 100%;'>"
      + range[1]
      + "</div>"
      + "<div>"
      + range[0]
      + "</div>"
      + "</div>"
      + "</div>"
      + "<div style='font-size: 10px;'>"
      + units
      + "</div>"
      + "</div>";
      div.innerHTML += html;
      return div;
      
    };
    legend.addTo(this.map);
    return legend;
  }


  // public changeCover(cover: string){
  //   this.loadcovJSON(cover, this.map, this.layers);
  // }

  changeColor(scheme: string) {
    switch(scheme) {
      case "usgs": {
        this.rcPalette = this.USGSStyleRechargePalette();
        break;
      }
      case "blue": {
        this.rcPalette = this.rechargePalette();
        break;
      }
    }
    this.paletteType = scheme;
    if(this.types.recharge.style == "rate") {
      this.loadRechargeStyle("rate");
    }
  }

  public changeScenario(type: string, updateBase: boolean, backoff: number = 1) {
    if(this.scenariosInitialized) {
      this.currentScenario = type;
      this.baseScenario = updateBase ? type : "recharge_scenario0";
  
      this.createMetrics().then((data) => {
        this.metrics = data;
      });
      this.loadRechargeStyle(this.types.recharge.style);
    }
    //if all scenarios have not yet been loaded, pause until complete
    //use exponential backoff
    else {
      //console.log(backoff);
      setTimeout(() => {
        this.changeScenario(type, updateBase, backoff * 2)
      }, backoff);
    }
    
    //this.generatePNG(1000, 1000, this.generateLCColorRaster(3, 3));
  }


  private createColorChain(colors: string[][], chain: string[]) {
    let comb;
    let combinationColors = [];
    let colorEndpoints = [];
    colors.forEach((colorSet, i) => {
      colorSet.forEach((color, j) => {
        colorEndpoints.push(color);
        comb = [];
        colors.forEach((opposingSet, k) => {
          if(k != i) {
            opposingSet.forEach((opposingColor, l) => {
              if(l != j) {
                comb.push(opposingSet[l]);
              }
            });
          }
        });
        combinationColors.push(comb);
      });
    });
    this.combine(0, colorEndpoints, combinationColors, chain);
  }

  private combine(color: number, colors: string[], combinationColors: string[][], chain: string[]) {
    chain.push(colors[color]);
    let cEnd = combinationColors[color].shift();
    if(cEnd == undefined) {
      console.log(combinationColors);
      return;
    }
    let cPos = colors.indexOf(cEnd);
    this.combine(cPos, colors, combinationColors, chain);
  }


  private landCoverPalette(): string[] {

    let maxLCCode = 32;

    //no color (black)
    let nc = "000000";
    //color channels for interpolation
    let r = "ff0000";
    let g = "00ff00";
    let b = "0000ff";

    //set divisions per color
    let rd = 4;
    let gd = 3;
    let bd = 3;

    //create channel divisions using rgb interpolation
    //using rgb instead of lrgb because shifts the scheme logarithmically towards darker colors, which looks nicer
    let rco = (chroma as any).scale([nc, r]).mode('lrgb').colors(rd);
    let gco = (chroma as any).scale([nc, g]).mode('rgb').colors(gd);
    let bco = (chroma as any).scale([nc, b]).mode('rgb').colors(bd);

    //strip out individual channels
    rco = rco.map((color) => {
      return color.substring(1, 3);
    });
    gco = gco.map((color) => {
      return color.substring(3, 5);
    });
    bco = bco.map((color) => {
      return color.substring(5, 7);
    });

    let palette = [];

    for(let i = 0; i < rco.length; i++) {
      for(let j = 0; j < gco.length; j++) {
        for(let k = 0; k < bco.length; k++) {
          if(palette.length > maxLCCode + 1) {
            break;
          }
          palette.push("#" + rco[i] + gco[j] + bco[k]);
        }
      }
    }
    //6, 15
    //console.log(palette);

    palette.shift();
    //palette[0] = "#ffffff";

    //rank warm/coolness by red and blue levels, order lc types by recharge inhibition, assign colors appropriately?

    //let buttonPalette = new Array(30);
    for (let i = 0; i <= maxLCCode; i++) {
      if(COVER_INDEX_DETAILS[i] != undefined) {
        COVER_INDEX_DETAILS[i].color = palette[i];
      }
    }
    this.mapService.setLCButtonPalette(this);

    //palette = this.agitate(palette);
    return palette;
  }


  //generate 31 colors
  // private landCoverPalette(): string[] {

  //   let palette = [];
  //   let range = 255;
  //   let color;
  //   let r;
  //   let g;
  //   let b;
  //   let first = true;
  //   for (let i = 0; i < 4; i++) {
  //     for (let j = 0; j < 3; j++) {
  //       for (let k = 0; k < 3; k++) {
  //         if (palette.length >= 31) {
  //           break;
  //         }
  //         //avoid black so lines stand out more (have 5 extra colors)
  //         if (!first) {
  //           r = (Math.round(range / 3 * i)).toString(16);
  //           g = (Math.round(range / 2 * j)).toString(16);
  //           b = (Math.round(range / 2 * k)).toString(16);
  //           if (r.length < 2) r = "0" + r;
  //           if (g.length < 2) g = "0" + g;
  //           if (b.length < 2) b = "0" + b;
  //           color = "#" + r + g + b;
  //           palette.push(color);
  //         }
  //         else {
  //           first = false;
  //         }
  //       }
  //     }
  //   }

  //   for (let i = 0; i < 30; i++) {
  //     COVER_INDEX_DETAILS[i].color = palette[i];
  //     document.documentElement.style.setProperty("--color" + (LC_TO_BUTTON_INDEX[i + 1]).toString(), palette[i + 1]);
  //   }

  //   //palette = this.agitate(palette);
  //   return palette;
  // }

  //generate 31 colors
  // private landCoverPalette(): string[] {

  //   let palette = [];
    
  //   let r = (chroma as any).scale(["#ff0000", "#000000"]).mode('lab').colors(4);
  //   let g = (chroma as any).scale(["#00ff00", "#000000"]).mode('lab').colors(3);
  //   let b = (chroma as any).scale(["#0000ff", "#000000"]).mode('lab').colors(3);

  //   console.log(r);
  //   console.log(g);
  //   console.log(b);

  //   for (let i = 0; i < 4; i++) {
  //     for (let j = 0; j < 3; j++) {
  //       for (let k = 0; k < 3; k++) {
  //         if (palette.length >= 31) {
  //           break;
  //         }
  //         let rc = r[i];
  //         let gc = g[j];
  //         let bc = g[k]
  //         console.log(rc);
  //         console.log(gc);
  //         console.log(bc);
  //         rc = rc.substring(1, 3);
  //         gc = gc.substring(3, 5);
  //         bc = bc.substring(5, 7);
  //         console.log(rc);
  //         console.log(gc);
  //         console.log(bc);
  //         let color = "#" + rc + gc + gc;
  //         palette.push(color);
  //       }
  //     }
  //   }
  //   console.log(palette)

  //   for (let i = 0; i < 30; i++) {
  //     COVER_INDEX_DETAILS[i].color = palette[i];
  //     document.documentElement.style.setProperty("--color" + (LC_TO_BUTTON_INDEX[i + 1]).toString(), palette[i + 1]);
  //   }

  //   //palette = this.agitate(palette);
  //   return palette;
  // }


  //colorbrewer
  // private rechargePalette(): string[] {
  //   let palette = [];
  //   let colorScale = ["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#08519c", "#08306b"];
  //   for(let i = 0; i < colorScale.length; i++) {
  //     for(let j = 0; j < Math.pow(2, i); j++) {
  //       palette.push(colorScale[i]);
  //     }
  //   }
  //   return palette;
  // }

  // private rechargePalette(): string[] {
  //   console.log((chroma as any).scale(['#f7fbff','#08306b']).mode('lab').colors(200));

  //   let palette = [];
  //   let rgb = [];
  //   let colorScale = [{
  //     r: 222,
  //     g: 235,
  //     b: 247
  //   },
  //   {
  //     r: 8,
  //     g: 48,
  //     b: 107
  //   }];
  //   let range = {
  //     r: colorScale[0].r - colorScale[1].r,
  //     g: colorScale[0].g - colorScale[1].g,
  //     b: colorScale[0].b - colorScale[1].b
  //   };
  //   let divs = 200;
  //   let sizes = {
  //     r: range.r / divs,
  //     g: range.g / divs,
  //     b: range.b / divs
  //   };

  //   for(let i = 0; i < divs; i++) {
  //     rgb.push({
  //       r: Math.ceil(colorScale[0].r - i * sizes.r),
  //       g: Math.ceil(colorScale[0].g - i * sizes.g),
  //       b: Math.ceil(colorScale[0].b - i * sizes.b)
  //     });
  //   }
    
  //   rgb.forEach((color, i) => {
  //     for(let j = 0; j < i + 1; j++) {
  //       palette.push(this.rgbToHex(color));
  //     }
  //   });

  //   let last = palette.length;
  //   for(let i = 0; i < last; i++) {
  //     palette.push(palette[palette.length - 1]);
  //   }
  //   return palette;
  // }

  // rgbToHex(rgb: {r: number, g: number, b: number}) {
  //   let hex = "#";
  //   hex += this.toHex(rgb.r);
  //   hex += this.toHex(rgb.g);
  //   hex += this.toHex(rgb.b);
  //   return hex;
  // }

  // toHex(color: number) {
  //   let hex = color.toString(16);
  //   return hex.length == 1 ? "0" + hex : hex;
  // }

  private USGSStyleRechargePalette() {
    let colors = [[0.758,0.32,0.234],[0.887,0.539,0.117],[0.938,0.691,0.066],
    [0.965,0.828,0.039],[0.984,0.984,0],[0.578,0.938,0],
    [0.27,0.898,0],[0.043,0.855,0],[0.031,0.809,0.148],
    [0.063,0.766,0.273],[0.078,0.719,0.367],[0.098,0.688,0.43],
    [0.105,0.668,0.473],[0.109,0.648,0.496],[0.121,0.629,0.516],
    [0.121,0.609,0.535],[0.125,0.586,0.551],[0.125,0.586,0.57],
    [0.117,0.563,0.578],[0.109,0.523,0.566],[0.102,0.48,0.559],
    [0.094,0.449,0.547],[0.086,0.418,0.539],[0.078,0.395,0.527],
    [0.078,0.379,0.527],[0.074,0.348,0.52],[0.074,0.332,0.52],
    [0.066,0.309,0.508],[0.066,0.293,0.508],[0.059,0.273,0.5],
    [0.059,0.258,0.5],[0.055,0.234,0.488],[0.055,0.227,0.488],
    [0.047,0.207,0.477],[0.047,0.199,0.477],[0.047,0.191,0.477],
    [0.047,0.184,0.477]];

    let purple = [0.48,0.188,0.566];
    let hexColors = [];

    for(let i = 0; i < colors.length; i++) {
      hexColors.push("#ffffff");
    }
    this.rechargePaletteHeadLength = hexColors.length;

    colors.forEach((color) => {
      hexColors.push((chroma as any).gl(color).hex());
    });
    //console.log(hexColors)

    let purpleTailScale = Math.floor((MapComponent.USGS_PURPLE_RECHARGE / MapComponent.MAX_RECHARGE - 1) * colors.length);

    for(let i = 0; i < purpleTailScale; i++) {
      hexColors.push(hexColors[hexColors.length - 1]);
    }
    hexColors.push((chroma as any).gl(purple).hex());
    this.rechargePaletteTailLength = purpleTailScale + 1;

    // console.log(hexColors.length);
    // console.log(colors.length);
    // console.log(hexColors.length / (450 + 180) * 180);

    //console.log(hexColors);
    return hexColors;
  }


  // private rechargePalette(): string[] {
  //   let palette = [];
  //   //linear segments
  //   let colorSegments = (chroma as any).scale(["#f7fbff", "#08306b"]).mode('lab').colors(9);
  //   //colorbrewer segments
  //   //let colorSegments = ["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#08519c", "#08306b"];
  //   let divs = 200;
  //   let exp = 1.5
  //   let scale = Math.pow(exp, colorSegments.length - 1);
  //   let modifier = Math.ceil(divs / scale);
  //   for(let i = 0; i < colorSegments.length - 1; i++) {
  //     let numColors = scale / Math.pow(exp, (colorSegments.length - i)) * modifier;
  //     palette = palette.concat((chroma as any).scale([colorSegments[i], colorSegments[i + 1]]).mode('lab').colors(numColors));
  //   }
  //   //console.log(palette);
      
  //   // let last = palette.length * 1.5;
  //   // for(let i = 0; i < last; i++) {
  //   //   palette.push(palette[palette.length - 1]);
  //   // }

  //   this.rechargePaletteTailLength = 0;

  //   return palette;
  // }

  private rechargePalette(): string[] {
    let palette = [];
    let colors = ["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#08519c", "#08306b"];
    //let colors = ["e2891e", "08306b"];
    //let colors = ["#f7fbff", "#08306b"];
    //let colors = ["#fff7fb", "#ece7f2", "#d0d1e6", "#a6bddb", "#74a9cf", "#3690c0", "#0570b0", "#045a8d", "#023858"];
    //let colors = ["#fff7fb", "#023858"];
    //let colors = ["#a50026", "#313695"];
    
    //linear segments
    let colorSegments = (chroma as any).scale(colors).mode('lab').colors(9);
    //colorbrewer segments
    //let colorSegments = ["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#08519c", "#08306b"];
    let divs = 200;
    let exp = 2;
    let scale = Math.pow(exp, colorSegments.length - 1);
    let modifier = Math.ceil(divs / scale);
    for(let i = 0; i < colorSegments.length - 1; i++) {
      let numColors = scale / Math.pow(exp, (colorSegments.length - i)) * modifier;
      palette = palette.concat((chroma as any).scale([colorSegments[i], colorSegments[i + 1]]).mode('lab').colors(numColors));
    }
    //console.log(palette);
      
    // let last = palette.length * 1.5;
    // for(let i = 0; i < last; i++) {
    //   palette.push(palette[palette.length - 1]);
    // }

    this.rechargePaletteTailLength = 0;
    this.rechargePaletteHeadLength = 0;

    return palette;
  }

  divergingPalette(): string[] {
    let palette = [];
    let colorSegments = ["#a50026", "#ffffff", "#313695"];
    palette = (chroma as any).scale([colorSegments[0], colorSegments[1]]).mode('lab').colors(100);
    palette = palette.concat((chroma as any).scale([colorSegments[1], colorSegments[2]]).mode('lab').colors(100));
    return palette;
  }

  //assumes palette range doesnt't extend past palette extremes
  paletteWindow(palette: string[], paletteRange: number[], paletteExtremes: number[], paletteVals: number) {   
    let cdiff = (paletteExtremes[1] - paletteExtremes[0]) / paletteVals;
    let botdiff = Math.ceil((paletteRange[0] - paletteExtremes[0]) / cdiff);
    let topdiff = Math.ceil((paletteExtremes[1] - paletteRange[1]) / cdiff);

    let minIndex = botdiff;
    let maxIndex = paletteVals - topdiff;
    if(minIndex == maxIndex) {
      return [palette[minIndex], palette[maxIndex]];
    }

    return palette.slice(minIndex, maxIndex);
  }


  private getIndex(x: number, y: number, __this = this): number {
    return y * __this.gridWidthCells + x;
  }

  private getComponents(index: number) {
    return {
      x: index % this.gridWidthCells,
      y: Math.floor(index / this.gridWidthCells)
    };
  }

  private generateLCColorRaster(aquifer?: number, caprock?: number): number[][][] {
    let raster = []
    let row;
    let codes = this.types.landCover.data._covjson.ranges.cover.values;
    codes.forEach((code, i) => {
      if(i % this.gridWidthCells == 0) {
        raster.push([]);
        row = raster[raster.length - 1];
      }
      if(code == 0) {
        row.push([0, 0, 0, 0])
      }
      else {
        let color = chroma(COVER_INDEX_DETAILS[code].color).rgba();
        color[3] *= 255;
        row.push(color);
      }
    });

    if(aquifer != undefined || caprock != undefined) {
      let boundaryMap = new Array(codes.length).fill(0);
      let aquicode = 1;
      let capcode = 2;

      if(caprock != undefined) {
        for(let i = 0; i < this.gridWidthCells - 1; i++) {
          for(let j = 0; j < this.gridHeightCells - 1; j++) {
            //mark left/top of boundary
            let host = this.getIndex(i, j);
            if(this.caprock[host] != this.caprock[this.getIndex(i + 1, j)] || this.caprock[host] != this.caprock[this.getIndex(i, j + 1)] || this.caprock[host] != this.caprock[this.getIndex(i + 1, j + 1)]) {
              boundaryMap[host] = capcode;
            }
          }
        }
      }
      //aquifer takes precedence
      if(aquifer != undefined) {
        console.log(this.aquifers[0] != this.aquifers[this.getIndex(0 + 1, 0)] || this.aquifers[0] != this.aquifers[this.getIndex(0, 0 + 1)] || this.aquifers[0] != this.aquifers[this.getIndex(0 + 1, 0 + 1)]);
        for(let i = 0; i < this.gridWidthCells - 1; i++) {
          for(let j = 0; j < this.gridHeightCells - 1; j++) {
            //mark left/top of boundary
            let host = this.getIndex(i, j);
            if(this.aquifers[host] != this.aquifers[this.getIndex(i + 1, j)] || this.aquifers[host] != this.aquifers[this.getIndex(i, j + 1)] || this.aquifers[host] != this.aquifers[this.getIndex(i + 1, j + 1)]) {
              boundaryMap[host] = aquicode;
            }
          }
        }
      }
      let black = [0, 0, 0, 255];

      let mask = {
        aqui: [],
        cap: []
      };
      if(aquifer != undefined) {
        let radius = aquifer / 2;
        let indexCenter = Math.floor(aquifer / 2);
        //no need make matrix for mask, use set of offsets from cell so more efficient (only cover relevent cells)
        for(let x = 0; x < aquifer; x++) {
          for(let y = 0; y < aquifer; y++) {
            let d = Math.sqrt(Math.pow(x - radius, 2) + Math.pow(y - radius, 2));
            if(d <= radius) {
              mask.aqui.push({
                x: x - indexCenter,
                y: y - indexCenter
              });
            }
          }
        }
      }

      //if same no need to recompute mask
      if(caprock == aquifer) {
        mask.cap = mask.aqui;
      }
      else if(caprock != undefined) {
        let center = caprock / 2;
        let indexCenter = Math.floor(caprock / 2);
        //no need make matrix for mask, use set of offsets from cell so more efficient (only cover relevent cells)
        for(let x = 0; x < caprock; x++) {
          for(let y = 0; y < caprock; y++) {
            let d = Math.sqrt(Math.pow(x - center, 2) + Math.pow(y - center, 2));
            if(d <= caprock) {
              mask.cap.push({
                x: x - indexCenter,
                y: y - indexCenter
              });
            }
          }
        }
      }

      console.log(mask);

      //go over and set index offsets in mask to black
      for(let x = 0; x < this.gridWidthCells - 1; x++) {
        for(let y = 0; y < this.gridHeightCells - 1; y++) {
          let i = this.getIndex(x, y);
          if(boundaryMap[i] == aquicode) {
            for(let maskIndex = 0; maskIndex < mask.aqui.length; maskIndex++) {
              let offset = mask.aqui[maskIndex];
              let targetComponents = {
                x: x + offset.x,
                y: y + offset.y
              };

              //ensure in range
              if(targetComponents.x < 0 || targetComponents.x >= this.gridWidthCells
                || targetComponents.y < 0 || targetComponents.y >= this.gridHeightCells) {
                continue;
              }
              raster[targetComponents.y][targetComponents.x] = black;
            }
          }
          else if(boundaryMap[i] == capcode) {
            for(let maskIndex = 0; maskIndex < mask.cap.length; maskIndex++) {
              let offset = mask.cap[maskIndex];
              let targetComponents = {
                x: x + offset.x,
                y: y + offset.y
              };

              //ensure in range
              if(targetComponents.x < 0 || targetComponents.x >= this.gridWidthCells
                || targetComponents.y < 0 || targetComponents.y >= this.gridHeightCells) {
                continue;
              }
              raster[targetComponents.y][targetComponents.x] = black;
            }
          }
        }
      }
    }
    //console.log(raster);
    return raster;
  }

  //chroma .rgba will convert to color channels
  //maximum of 2 colors blended per cell, if scale < .5 then in between colors are just left out
  //blend left to right, up to down
  private generatePNG(width: number, height: number, raster: number[][][]) {
    
    let rWidth = raster[0].length;
    let rHeight = raster.length;
    
    let wScale = width / rWidth;
    let hScale = height / rHeight;
    //maintain aspect ratio (rest of pixels if one side longer will be background)
    let scale = Math.min(wScale, hScale);

    console.log(rHeight);
    console.log(scale);
    console.log(height);

    //compute extra background on each side (if scale same as respective scaler then 0)
    let extraWidthLeft = Math.floor((width - rWidth * scale) / 2);
    //let extraWidthRight = Math.ceil((rWidth * scale - width) / 2);
    let extraHeightTop = Math.floor((height - rHeight * scale) / 2);
    //let extraHeightBottom = Math.ceil((rHeight * scale - height) / 2);

    let image = new pnglib(width, height, 256);
    //console.log(image.buffer[image.index(0, 0)] == "\x00");

    //if scaling so that cells are less than half a pixel (scale < 0.5), skip in between cells and scale up cells that are used to over 0.5
    let iterator = Math.max(Math.floor(1 / scale), 1);
    scale *= iterator;

    //create objects indicating the colors to be blended/proportions
    let x = extraWidthLeft;
    let y = extraHeightTop;
    // console.log(x);
    // console.log(y);
    let test;
    for(let i = 0; i < rWidth - 1; i += iterator) {
      console.log(test);
      //console.log(y);
      y = extraHeightTop;
      x += scale;
      //console.log(x);
      for(let j = 0; j < rHeight - 1; j += iterator) {
        let xRange = [Math.floor(x), Math.ceil(x + scale)];
        let yRange = [Math.floor(y), Math.ceil(y + scale)];
        //console.log(yRange)
        //blending takes time and is unnessecary, just color as most prominent of the colors
        //much more efficient replacement as well since no ripple effect
        // let xLeft = x % 1;
        // let yLeft = y % 1;
        // if(xLeft != 0) {
        //   //blend
        //   for(let cy = yRange[0]; cy < yRange[1]; cy++) {
        //     //console.log(chroma.scale(image.buffer[image.index(x, cy)], raster[j][i])(xLeft).rgba());
        //     image.buffer[image.index(x, cy)] = chroma.scale(image.buffer[image.index(x, cy)], raster[j][i])(xLeft).rgba();
        //   }
        // }
        // if(yLeft != 0) {
        //   //blend
        //   for(let cx = xRange[0]; cx < xRange[1]; cx++) {
        //     image.buffer[image.index(cx, y)] = chroma.scale(image.buffer[image.index(cx, y)], raster[j][i])(yLeft).rgba();
        //   }
        // }
        // xRange[0] = Math.ceil(x);
        // yRange[0] = Math.ceil(y);

        test = this.complexityTest();

        for(let cx = xRange[0]; cx < xRange[1]; cx++) {
          for(let cy = yRange[0]; cy < yRange[1]; cy++) {
            image.buffer[image.index(cx, cy)] = raster[j][i];
          }
        }
        y += scale;
      }
    }

    for(x = 0; x < width; x++) {
      for(y = 0; y < height; y++) {
        let index = image.index(x, y);
        if(Array.isArray(image.buffer[index])) {
          image.buffer[index] = image.color(...image.buffer[index]);
        }
        
      }
    }

    console.log(image);
    document.write('<img src="data:image/png;base64,' + image.getBase64() + '">');
    //saveAs(new Blob([p.getBase64()], { type: "image/png" }), "test");
  }

  private complexityTest() {
    return {
      x: Math.sqrt((130^2 + 54^2) / 2),
      y: Math.sqrt((43^2 + 123^2) / 2),
      z: Math.sqrt((29^2 + 54^2) / 2)
    }
  }

  // private computeRespectiveIndexProportions(index: number, scale: number) {
  //   let scaledIndex = index * scale;
  //   let scaleEnd = scaledIndex + scale;

  //   let indices = [];
  //   let start
  //   {
  //     sharedWith: 
  //   }
    
  // }
}




