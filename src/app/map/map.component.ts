import { Component, OnInit, ViewChild, ElementRef, EventEmitter } from '@angular/core';
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
import { COVER_ENUM, COVER_INDEX_DETAILS, LC_TO_BUTTON_INDEX } from './shared/cover_enum';
import * as proj4x from 'proj4';
import * as shp from 'shpjs';
//import * as shpwrite from 'shp-write';
import * as JSZip from 'jszip'
import * as shpWriteGeojson from '../../../node_modules/shp-write/src/geojson'
import * as shpWritePrj from '../../../node_modules/shp-write/src/prj';
import { saveAs } from 'file-saver';
import { WindowService } from '../window/shared/window.service';
import { WindowPanel } from '../window/shared/windowPanel';
import { isGeoJSONObject } from 'geojson-validation'
import { MessageDialogComponent } from "../message-dialog/message-dialog.component"
import {MatDialog} from "@angular/material";
import { AdvancedMappingDialogComponent } from '../advanced-mapping-dialog/advanced-mapping-dialog.component';
import { ModifiedShpwriteService } from './shared/modified-shpwrite.service';



declare let L: any;
declare let CovJSON: any;
declare let C: any;
declare let require: any;


@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
})
export class MapComponent implements OnInit {

  @ViewChild('mapid') mapid;

  static aquiferIndices: any;
  static aquiferIndexingComplete = false;
  static readonly METER_TO_MILE_FACTOR = 0.000621371;
  static readonly INCH_TO_MILIMETER_FACTOR = 25.4;
  static readonly GALLON_TO_LITER_FACTOR = 3.78541;



  map: any;
  popup: any;
  shpfile: any;
  shpfileString: string;
  toggleShapeFile: boolean;

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

  aquifers: any;

  highlightedCell: any;

  selectedCell: any;

  opacity = 1;

  interactionType: string;

  nameModeDetails: {
    oldInteractionType: string,
    selectedShape: any
  }

  shapeMetricsEnabled: boolean;

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

  defaultMetrics: any;

  // landCover: any;
  // landCoverLayer: any;
  // recharge: any;
  // rechargeLayer: any;
  // aquiferLayer: any;

  currentScenario: string;
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
  static readonly aquifersFile = "../assets/dlnr_aquifers.zip";
  static readonly caprockFile = "../assets/Oahu__75m__caprock.asc";

  types = {
    landCover: {
      parameter: 'cover',
      label: 'Land Cover',
      palette: C.directPalette(this.landCoverPalette()),
      data: null,
      baseData: null,
      layer: null
    },
    recharge: {
      parameter: 'recharge',
      label: 'Recharge Rate',
      //update with scheme sent by Kolja
      palette: C.linearPalette(this.rechargePalette()),
      data: null,
      baseData: {
        recharge_scenario0: null,
        recharge_scenario1: null
      },
      currentData: {
        recharge_scenario0: null,
        recharge_scenario1: null
      },
      layer: null
    },
    aquifers: {
      label: 'Aquifers',
      layer: null
    }
  };

  caprock = [];
  includeCaprock = true;

  highlightedAquiferIndices = [];

  //???, can probably just remove
  readonly layerOrdering = [this.types.landCover, this.types.recharge, this.types.aquifers];

  static readonly utm = "+proj=utm +zone=4 +datum=NAD83 +units=m";
  static readonly longlat = "+proj=longlat";
  static readonly proj4 = (proj4x as any).default;

  fileHandler: {
    reader: FileReader,
    working: Promise<any>[],
    busy: boolean
  };


  constructor(private DBService: DBConnectService, private mapService: MapService, private windowService: WindowService, private http: Http, private dialog: MatDialog, private modShpWrite: ModifiedShpwriteService) {
    //should put all these in constructors to ensure initialized before use
    this.mapService.setMap(this);
  }

  ngOnInit() {

  }

  ngAfterViewInit() {

    this.map = L.map(this.mapid.nativeElement).setView([21.512, -157.96664], 15);

    let mapLayer = L.esri.basemapLayer('Imagery').addTo(this.map);
    //create empty layer for displaying base map
    let empty = L.featureGroup();

    this.popup = L.popup();

    //thinking I like the collapsed version with this stuff
    this.layers = L.control.layers({ "Base Map": empty }, null/*, {collapsed: false}*/).addTo(this.map)

    this.initializeLayers();

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
          original: "0",
          current: "0",
          diff: "0",
          pchange: "0"
        },
        volumetric: {
          original: "0",
          current: "0",
          diff: "0",
          pchange: "0"
        },
        area: "0"
      },
      Metric: {
        average: {
          original: "0",
          current: "0",
          diff: "0",
          pchange: "0"
        },
        volumetric: {
          original: "0",
          current: "0",
          diff: "0",
          pchange: "0"
        },
        area: "0"
      }
    };

    //think there's a value in the middle that's invalid, may need to give valid values if issue, probably ok and more efficient like this though
    this.validLandcoverRange = {
      min: 0,
      max: 30
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
      //store current layer details
      this.baseLayer = e;

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
        case "Base Map":
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
        case "Recharge Rate":
          //default caprock to true
          //this.includeCaprock = true;
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
          
          //throws an error for some reason if run immediately (though it still works...)
          //possible that event goes through before layer fully swapped, so run on a delay
          setTimeout(() => {
            this.baseLayer.layer.setOpacity(this.opacity);
          }, 0);
          break;
      }
    });


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

        }, 1000)
      });

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

  private repackageShapes(shapes: any, divisions: {x: number, y: number}): any {
    let componentIndices = []
    let indices = this.getInternalIndexes(shapes.toGeoJSON());
    indices.forEach((index) => {
      componentIndices.push(this.getComponents(index));
    });
    return this.generateGeometriesFromPoints(componentIndices, divisions);
  }

  
  private parseAndAddShapes(shapes: any, nameProperty: string) {

    shapes.features.forEach(shape => {
      //deepcopy so don't mess up original object when swapping coordinates
      let coordsBase = shape.geometry.coordinates;

      //allow for custom property to be defined
      //default is name
      let name = shape.properties[nameProperty];

      //swap coordinates, who wants consistent standards anyway?
      //different formats have different numbers of nested arrays, recursively swap values in bottom level arrays
      let polyCoords = this.swapCoordinates(coordsBase);
      // console.log(coordsBase);
      // console.log(polyCoords);

      //can we handle multiploygons now?
      //there are 2 different types:
      //1. multiple outer rings as one object, represented as multiple shapes inside coordinates array
      //2. items in the coordinates array can be arrays where the fist is an outer ring and the rest are holes
      //DEAL WITH ALL THIS LATER, FOR NOW LET'S JUST ASSUME SIMPLE SHAPES FOR PURPOSES OF USE AS LANDCOVER AREAS
      //i think mongodb can handle rings and things
      //just remove this part for now
      // if (shape.geometry.type == "MultiPolygon") {
      //   for (let i = 0; i < coordsBase.length; i++) {
      //     this.addDrawnItem(L.polygon(coordsBase[i], {}), true, name);
      //   }
      // }
      // else {

      //this should handle multipolygons fine, actually
      this.addDrawnItem(L.polygon(polyCoords, {}), true, name);
      // }
    });
    
    let customTotal = this.getMetricsSuite(this.getInternalIndexes(this.drawnItems.toGeoJSON()), true);
    this.metrics.customAreasTotal.metrics = customTotal;
    this.metrics.customAreasTotal.roundedMetrics = this.roundMetrics(customTotal);
  }

  //need to add overwriting if indicated
  //need to check if shapes have valid property (moved so have to check here)
  addUploadedLandcoverByShape(shapes: any, lcProperty: string, overwrite: boolean) {
    //create new geojson set with only items that have landcover property
    let lcShapes = L.geoJSON(shapes.features.filter(shape => shape.properties[lcProperty])).toGeoJSON();
    //shapes.features = shapes.features.filter(shape => shape.properties[lcProperty]);

    if(lcShapes.features.length < 1) {
      return;
    }
    let queryShapes = lcShapes;
    let covData = this.types.landCover.data._covjson.ranges.cover.values;
    let rechargeData = this.types.recharge.data._covjson.ranges.recharge.values;

    //backup values to restore on data failure
    let backupData = Array.from(covData);

    let covRemap = new Promise((resolve) => {   

      //probably need to check size of shapes and repackage if too large or too many()

      // if(shapes.length > ?) {
      //   //repackage using 2x2 grid (may want to make smaller divisions)
      //   //only returns geometries, need to put in a geojson set 
      //   queryShapes = this.repackageShapes(queryShapes, {x: 2, y: 2});
      // }

      lcShapes.features.forEach((shape) => {
        let geoJSONShape = L.geoJSON(shape).toGeoJSON();
        //default property is lcCode, add advanced option to upload where can specify
        let lc = shape.properties[lcProperty];

        let internal = this.getInternalIndexes(geoJSONShape);

        //here need to also check if overwrite base values
        internal.forEach((index) => {
          covData[index] = lc;
          if(overwrite) {
            this.types.landCover.baseData[index] = lc;
          }
        });

      });
      
      //reload layer from changes
      this.loadCover(this.types.landCover, false);
      resolve()
    });

    this.updateRecharge(queryShapes, (update) => {
      //console.log(update);
      //ensure coverage remapping complete before processing recharge values
      covRemap.then(() => {
        update.forEach(area => {
          //how does it behave if out of coverage range? check db response and modify so doesn't throw an error
          area.forEach(record => {
            let recordBase = record.value;
            let x = recordBase.x;
            let y = recordBase.y;
            let index = this.getIndex(x, y);
            //does the array include base? if not have to shift

            //might contain points not changed, 
            //coverage reassignment completed first, so use this value (covData[index]) to get index in db results
            let mappedType = covData[index];

            Object.keys(this.types.recharge.currentData).forEach((scenario) => {
              //background is not included in the database so indexes shifted by 1
              //if background type set recharge rate to 0
              let recordValue = mappedType == 0 ? 0 : recordBase[scenario][mappedType - 1]

              this.types.recharge.currentData[scenario] = recordValue;
              if(overwrite) {
                this.types.recharge.baseData[scenario] = recordValue;
              }
              if(scenario == this.currentScenario) {
                rechargeData[index] = recordValue;
              }
            });

          });
        });
        //reload recharge cover
        this.loadCover(this.types.recharge, true)

        this.updateMetrics(lcShapes);
        //reenable report generation
      });
      
    }, (error) => {
      //restore land cover on failure
      backupData.forEach((value, i) => {
        covData[i] = value;
      });
      this.loadCover(this.types.landCover, false);
    });

    
    
  }

  showHideObjects(showOrHide: string) {
    if (showOrHide == "Show") {
      this.drawnItems.addTo(this.map);
      this.drawControl.addTo(this.map);
    }
    else {
      this.drawControl.remove();
      this.map.removeLayer(this.drawnItems);
    }
  }

  private changeLayerOpacity(opacity: number) {
    //shouldn't change base map opacity
    if (this.baseLayer.name != "Base Map") {
      this.baseLayer.layer.setOpacity(opacity);
    }
    this.opacity = opacity;
  }

  public setMode(mode: string) {
    switch (mode) {
      case "cell":
        this.addCellInteraction();
        break;
      case "custom":
        if(this.baseLayer.name == "Recharge Rate") {
          this.enableShapeInteraction(true);
          //get initial metrics for already selected shapes
          this.getSelectedShapeMetrics();
        }
        else {
          this.enableShapeInteraction(false);
        }
        break;
      case "aquifer":
        this.addAquiferInteractions();
        break;
      case "full":
        //just get metrics, not interactive
        this.getWholeMapMetrics();
        break;
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
    if (!this.map.hasLayer(this.types.aquifers.layer)) {
      this.types.aquifers.layer.addTo(this.map);
    }

    this.types.aquifers.layer.eachLayer((layer) => {
      //console.log(layer)
      layer.higlighted = false;
      //clicks intercepted by drawn shapes if behind
      layer.bringToFront();
      layer.on('click', (e) => {
        if (layer.highlighted) {
          layer.setStyle(unhighlight)
          layer.highlighted = false;
          //remove aquifer name from highlighted list
          highlightedAquifers.splice(highlightedAquifers.indexOf(layer.feature.properties.SYSTEM), 1);
        }
        else {
          layer.setStyle(highlight)
          layer.highlighted = true;
          //add highlighted aquifer name to list
          highlightedAquifers.push(layer.feature.properties.SYSTEM);
        }

        //let originalRecharge = 0;
        //let currentRecharge = 0;
        //let rechargeVals = this.types.recharge.data._covjson.ranges.recharge.values;
        let indexes = [];
        highlightedAquifers.forEach((name) => {
          indexes = indexes.concat(MapComponent.aquiferIndices[name]);
          //console.log(MapComponent.aquiferIndices[name])
        });
        
        this.highlightedAquiferIndices = indexes;


        //THIS CAN BE SPED UP BY USING ALREADY COMPUTED METRICS, CREATE IMPROVED METRICS COMBINING FUNCTION

        //get rounded metrics from indexes and send to bottom panel
        let metrics = this.roundMetrics(this.getMetricsSuite(indexes, this.includeCaprock));
        //console.log(indexes);
        this.mapService.updateMetrics(this, "aquifer", metrics);
      });
    })

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
    });
    this.highlightedAquiferIndices = [];
    //remove again if was hidden
    if (hidden) {
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
    let indexes = this.getInternalIndexes(this.highlightedItems.toGeoJSON());

    //THIS CAN BE SPED UP BY USING ALREADY COMPUTED METRICS, CREATE IMPROVED METRICS COMBINING FUNCTION

    //get rounded metrics for highlighted sshapes and send to bottom panel
    let metrics = this.roundMetrics(this.getMetricsSuite(indexes, true));
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











  private initializeLayers() {
    setTimeout(() => {
      this.mapService.setLoading(this, true);
    }, 0);
    
    let __this = this;

    this.metrics = {
      customAreas: [],
      aquifers: [],
      aquifersNoCaprock: [],
      customAreasTotal: {},
      total: {},
      totalNoCaprock: {}
    }

    let metricCoordination = {
      rechargeVals: false,
      aquifers: false,
      caprock: false
    };

    this.currentScenario = "recharge_scenario0"

    
    CovJSON.read(MapComponent.landCoverFile).then(function (coverage) {
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


      //load aquifers after boundaries found so can filter out external aquifers
      shp(MapComponent.aquifersFile).then((geojson) => {
        // this.aquifers = L.featureGroup
        let aquifers = L.geoJSON();
        //two shape files, so array
        //might want to just remove "lines" shapefile
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
        
        //can't compute metrics until recharge vals and aquifers are set
        if(metricCoordination.rechargeVals && metricCoordination.caprock) {
          //document.body.style.cursor='wait';
          //draw control usage requires ability to create metrics
          __this.loadDrawControls();
          __this.metrics = __this.createMetrics();
          //document.body.style.cursor='default';
          __this.mapService.setLoading(__this, false);
        }
        else {
          //indicate aquifers are set
          metricCoordination.aquifers = true;
        }
      });

      // let xutm = coverage._covjson.domain.axes.x.values;
      // let yutm = coverage._covjson.domain.axes.y.values;
      // let convertUpperLeft = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [xutm[0] - 37.5, yutm[0] + 37.5]);
      // let convertLowerRight = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [xutm[xutm.length - 1] + 37.5, yutm[yutm.length - 1] - 37.5]);
      // //coordinate standards are dumb and inconsistent, need to swap
      // __this.upperLeftLatLng = [convertUpperLeft[1], convertUpperLeft[0]];
      // __this.lowerRightLatLng = [convertLowerRight[1], convertLowerRight[0]];
      // //test conversion
      // //L.marker(__this.lowerRightLatLng).addTo(__this.map);
      __this.gridWidthCells = xs.length;
      __this.gridHeightCells = ys.length;
      // //height lat, width long, should be long lat order in conversion (this is why standardizations exist...)
      // __this.gridHeightLat = Math.abs(convertUpperLeft[1] - convertLowerRight[1]);
      // __this.gridWidthLong = Math.abs(convertUpperLeft[0] - convertLowerRight[0]);
      // __this.coverBase = coverage;

      __this.types.landCover.data = coverage;
      //deepcopy values for comparisons with modified types, array of primitives, so can use array.from
      __this.types.landCover.baseData = Array.from(coverage._covjson.ranges.cover.values);
      //console.log(__this.currentCover._covjson.domain.axes);
      __this.loadCover(__this.types.landCover, false);
    });


    Object.keys(MapComponent.rechargeFiles).forEach((scenario) => {
      CovJSON.read(MapComponent.rechargeFiles[scenario]).then(function (coverage) {
        //deepcopy values for comparisons with modified types
        __this.types.recharge.baseData[scenario] = Array.from(coverage._covjson.ranges.recharge.values);
        //deepcopy so not messed up when data swapped
        __this.types.recharge.currentData[scenario] = Array.from(coverage._covjson.ranges.recharge.values);
        //console.log(__this.currentCover._covjson.domain.axes);
        //change this
  
        //if file represents current scenario set up data, recharge layer, and metrics based on these values
        if(scenario == __this.currentScenario) {
          __this.types.recharge.data = coverage;

          __this.loadCover(__this.types.recharge, true);
          let rechargeVals = __this.types.recharge.data._covjson.ranges.recharge.values;
    
          //Race conditions? Don't think js can have race conditions since single threaded, should complete conditional before allowing other things to run
          //can't set metrics until aquifers in place and recharge values set
          if(metricCoordination.aquifers && metricCoordination.caprock) {
            //document.body.style.cursor='wait';
            //draw control usage requires ability to create metrics
            __this.loadDrawControls();
            __this.metrics = __this.createMetrics();
            __this.mapService.setLoading(__this, false);
          }
          else {
            //indicate recharge vals are set
            metricCoordination.rechargeVals = true;
          }
        }
        
      });
    
    });

    





    this.http.get(MapComponent.caprockFile).subscribe(data => {
      let details = data.text().split('\n');
      //console.log(details.length);
      for(let i = 6; i < details.length; i++) {
        //get data values after first six detail lines
        //split on spaces, tabs, or commas for values
        this.caprock = this.caprock.concat(details[i].split(/[ \t,]+/));
        //console.log(details[i].length)
        
        //if whitespace at the end might reult in whitespace only element, remove these
        if(this.caprock[this.caprock.length - 1].trim() == "") {
          this.caprock.splice(this.caprock.length - 1, 1);
        }
      }

      if(metricCoordination.aquifers && metricCoordination.rechargeVals) {
        //document.body.style.cursor='wait';
        //draw control usage requires ability to create metrics
        __this.loadDrawControls();
        __this.metrics = __this.createMetrics();
        __this.mapService.setLoading(__this, false);
      }
      else {
        //indicate recharge vals are set
        metricCoordination.caprock = true;
      }
    });



    this.shapeMetricsEnabled = false;
    this.interactionType = "custom";

    // //initialize metrics
    // Promise.all([init1, init2]).then(() => {
    //   //__this.metrics = this.createMetrics();
    //     console.log(__this.metrics)
    // })
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
























  generateReport(unitSystem: string) {
    let data : any = {
      metrics: this.metrics
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
            average: "Milimeters Per Year"
          }
        }
      }
    }
    let reportWindow = new WindowPanel("Report", "report", data);
    this.windowService.addWindow(reportWindow, this.windowId);
  }













  /*
  parts:
  get aquifer indices
  compute aquifer metrics
  compute full map metrics
  */

  createMetrics() {
    let data = {
      customAreas: [],
      aquifers: [],
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

    let __this = this;

    //used twice, so set function
    let getAquiferMetrics = () => {
      this.types.aquifers.layer.eachLayer((layer) => {
    
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

        let capName = layer.feature.properties.SYSTEM;
        //switch from all upper case to capitalize first letter
        capName.split(/([\s \-])/).forEach((substr) => {
          info.name += (substr == "\s" || substr == "-") ? substr : substr.charAt(0).toUpperCase() + substr.substr(1).toLowerCase();
        });
        infoNoCaprock.name = info.name;

        let aquiferMetrics = this.getMetricsSuite(MapComponent.aquiferIndices[capName], true);
        let aquiferMetricsNoCaprock = this.getMetricsSuite(MapComponent.aquiferIndices[capName], false);
        
         info.metrics = aquiferMetrics;
         infoNoCaprock.metrics = aquiferMetricsNoCaprock;
         info.roundedMetrics = this.roundMetrics(aquiferMetrics);
         infoNoCaprock.roundedMetrics = this.roundMetrics(aquiferMetricsNoCaprock);
        
         data.aquifers.push(info);
         data.aquifersNoCaprock.push(infoNoCaprock);
      });
    }

    //if already computed no need to recompute
    //static since aquifers are always the same
    if(!MapComponent.aquiferIndices) {
      this.mapService.setLoading(this, true);

      MapComponent.aquiferIndices = {};
      //store promise so if method called again knows to wait for completion
      this.getAquiferIndices(this.types.aquifers).then(() => {

        console.log("complete");

        //indicate indexing has been completed
        MapComponent.aquiferIndexingComplete = true;

        getAquiferMetrics();
        this.mapService.setLoading(this, false);

      }, () => {
        //should never reject, only if an aquifer is out of range, that would be strange
        this.dialog.open(MessageDialogComponent, {data: {message: "An error has occured in aquifer resource. Please refresh the page or submit a bug report if this error persists", type: "Error"}});
      });
    }
    //if already triggered getAquiferIndices but not yet complete don't do anything, the metrics computed on completion will have current values
    //otherwise just compute aquifer metrics
    else if(MapComponent.aquiferIndexingComplete) {
      getAquiferMetrics();
    }


    let total = this.getMetricsSuite(null, true);
    data.total.metrics = total;
    data.total.roundedMetrics = this.roundMetrics(total);

    let totalNoCaprock = this.getMetricsSuite(null, false);
    data.totalNoCaprock.metrics = totalNoCaprock;
    data.totalNoCaprock.roundedMetrics = this.roundMetrics(totalNoCaprock);
    

    let items = new L.featureGroup();
    
    this.drawnItems.eachLayer((layer) => {
      items = new L.featureGroup();
      //let intervals = new Date().getTime();
      //any custom layers should have metrics object registered with customAreaMap, use this as a base since same name
      let info = this.customAreaMap[layer._leaflet_id];
      //console.log(layer.toGeoJSON())
      let itemMetrics = this.getMetricsSuite(this.getInternalIndexes(items.addLayer(layer).toGeoJSON()), true);
      info.metrics = itemMetrics;
      info.roundedMetrics = this.roundMetrics(itemMetrics);


      data.customAreas.push(info);
    });

    //can make more efficient by computing individual shape metrics and full metrics at the same time
    //figure out how to generalize as much as possible without adding too much extra overhead and use same function for everything
    let customTotal = this.getMetricsSuite(this.getInternalIndexes(this.drawnItems.toGeoJSON()), true);
    data.customAreasTotal.metrics = customTotal;
    data.customAreasTotal.roundedMetrics = this.roundMetrics(customTotal);

    return data;
  }






  private getAquiferIndices(aquifers: any): any {
    //let aquiferIndexes: any;

    console.log(aquifers)
    
    //let layers = []
    return new Promise((resolve, reject) => {

      let complete = 0;
      let numAquifers = Object.keys(aquifers.layer._layers).length;

      for(let key in aquifers.layer._layers) {
        let indexes = [];

        //index aquifers by name
        let aquiferCode = aquifers.layer._layers[key].feature.properties.SYSTEM;
        
        //aquiferIndexes.key = indexes;

        // //console.log(aquifers.layer._layers[id])
        // let items = new L.featureGroup();
        // let test = this.getInternalIndexes(items.addLayer(aquifers.layer._layers[id]).toGeoJSON());
        // console.log(test.length);

        //let shape = aquifers;
        //array due to potential cutouts, shouldn't have any cutouts
        let pointsBase = aquifers.layer._layers[key].feature.geometry.coordinates[0];
        let convertedPoints = [];
        let a = [];
        let b = [];
        let xmax = Number.NEGATIVE_INFINITY;
        let xmin = Number.POSITIVE_INFINITY;
        let ymax = Number.NEGATIVE_INFINITY;
        let ymin = Number.POSITIVE_INFINITY;

        for (let i = 0; i < pointsBase.length; i++) {
          convertedPoints.push(MapComponent.proj4(MapComponent.longlat, MapComponent.utm, pointsBase[i]));
        }

        for (let i = 0; i < convertedPoints.length - 1; i++) {
          //coordinates are in long lat order (I think)

          //get max and min vals to limit coordinates need to compare
          if (convertedPoints[i][0] > xmax) {
            xmax = convertedPoints[i][0];
          }
          if (convertedPoints[i][0] < xmin) {
            xmin = convertedPoints[i][0];
          }
          if (convertedPoints[i][1] > ymax) {
            ymax = convertedPoints[i][1];
          }
          if (convertedPoints[i][1] < ymin) {
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

        //convert max min values and find range of cells
        //no need to check every single one
        //convert coordinate and get x value
        // let xmaxUTM = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [xmax_x, xmax_y])[0];
        // let xminUTM = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [xmin_x, xmin_y])[0];
        // let ymaxUTM = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [ymax_x, ymax_y])[1];
        // let yminUTM = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [ymin_x, ymin_y])[1];

        let xs = this.types.landCover.data._covjson.domain.axes.get("x").values;
        let ys = this.types.landCover.data._covjson.domain.axes.get("y").values;

        let minxIndex: number;
        let maxxIndex: number;
        let minyIndex: number;
        let maxyIndex: number;

        //again, assume values are in order
        //find min and max indexes
        //check if ascending or descending order, findIndex returns first occurance
        if (xs[0] < xs[1]) {
          minxIndex = xs.findIndex(function (val) { return val >= xmin });
          //> not >= so returns index after last even if on edge 
          maxxIndex = xs.findIndex(function (val) { return val > xmax });
        }
        else {
          maxxIndex = xs.findIndex(function (val) { return val < xmin });
          minxIndex = xs.findIndex(function (val) { return val <= xmax });
        }
        if (ys[0] < ys[1]) {
          minyIndex = ys.findIndex(function (val) { return val >= ymin });
          maxyIndex = ys.findIndex(function (val) { return val > ymax });
        }
        else {
          maxyIndex = ys.findIndex(function (val) { return val < ymin });
          minyIndex = ys.findIndex(function (val) { return val <= ymax });
        }



        //let recursiveDepth = 10;

        let checkIndices = []

        //check if shape boundaries out of coverage range
        if (minxIndex != -1 && maxxIndex != -1 && minyIndex != -1 && maxyIndex != -1) {
          //convert cell coords to long lat and raycast
          //max index calculation returns index after last index in range, so only go to index before in loop (< not <=)
          // for (let xIndex = minxIndex; xIndex < maxxIndex; xIndex++) {
          //   for (let yIndex = minyIndex; yIndex < maxyIndex; yIndex++) {
          //     // if (this.isInternal(a, b, { x: xs[xIndex], y: ys[yIndex] })) {
          //     //   indexes.push(this.getIndex(xIndex, yIndex))
          //     // }
          //     checkIndices.push(this.getIndex(xIndex, yIndex));
          //   }
            
          // }


          //also recursive depth and should be approximate speedup factor for single action
          //need to balance this with total time taken though, speed will be about numChunks * timeoutInterval (depending on how long chunk processing takes)
          let numChunks = 100
          let timeoutInterval = 100;

          //compute chunk size
          let xrange = maxxIndex - minxIndex;
          let yrange = maxyIndex - minyIndex;
          let totalSize = xrange * yrange
          let chunkSize = Math.floor(totalSize / numChunks);
          //final chunk size may need to be larger if not divisible
          let finalChunkSize = chunkSize + (totalSize - chunkSize * numChunks)

          // console.log(minyIndex)
          // console.log(minxIndex)
          // console.log(yrange)
          // console.log(xrange)

          let chunkIndices = (chunk: number) => {
            let indices = {
              minx: 0,
              maxx: 0,
              miny: 0,
              maxy: 0
            };

            let thisChunkSize = chunk == numChunks - 1 ? finalChunkSize : chunkSize;
            
            let minOffset = chunk * chunkSize;
            let maxOffset = minOffset + thisChunkSize;
            indices.minx = minxIndex + Math.floor(minOffset / yrange);
            indices.miny = minyIndex + minOffset % yrange;
            indices.maxx = minxIndex + Math.floor(maxOffset / yrange);
            indices.maxy = minyIndex + maxOffset % yrange;

            return indices;
          }

          let task = (chunk: number) => {
            if(chunk >= numChunks) {
              //finished, map this aquifer's code to its internal indices
              MapComponent.aquiferIndices[aquiferCode] = indexes;
              //resolve promise if all complete
              if(++complete >= numAquifers) {
                resolve();
              }
              return;
            }
            else {
              let range = chunkIndices(chunk);


              /*
              2 cases:
              ranges minx == maxx, go from miny to maxy, end
              ranges minx != maxx, go from miny to maxyindex, if theres more than 2 x indexes, center cases go full range, last x index go from minyindex to ranges miny
              */

              if(range.minx == range.maxx) {
                let xIndex = range.minx;
                for (let yIndex = range.miny; yIndex < range.maxy; yIndex++) {
                  if(this.isInternal(a, b, { x: xs[xIndex], y: ys[yIndex] })) {
                    indexes.push(this.getIndex(xIndex, yIndex));
                  }
                }
              }
              

              else {
                let xIndex = range.minx;
                //start point to end of range for first index
                for (let yIndex = range.miny; yIndex < maxyIndex; yIndex++) {
                  if(this.isInternal(a, b, { x: xs[xIndex], y: ys[yIndex] })) {
                    indexes.push(this.getIndex(xIndex, yIndex));
                  }
                }

                //if center x indices go full y range
                for (let xIndex = range.minx + 1; xIndex < range.maxx; xIndex++) {
                  for (let yIndex = minyIndex; yIndex < maxyIndex; yIndex++) {
                    if(this.isInternal(a, b, { x: xs[xIndex], y: ys[yIndex] })) {
                      indexes.push(this.getIndex(xIndex, yIndex));
                      
                    }
                  }
                }

                xIndex = range.maxx;
                //start of y range up to end point for final index
                for (let yIndex = minyIndex; yIndex < range.maxy; yIndex++) {
                  if(this.isInternal(a, b, { x: xs[xIndex], y: ys[yIndex] })) {
                    indexes.push(this.getIndex(xIndex, yIndex));
                  }
                }
              }
              
              
              setTimeout(() => {
                return task(chunk + 1);
              }, timeoutInterval);
              
            }
          }

          task(0);

          // let task = setInterval(() => {
            
          //   if(chunk >= numChunks) {
          //     clearInterval(task);
          //     console.log(indexes);
          //     return;
          //   }

            
          //   if(this.isInternal(a, b, xs[xIndex], ys[yIndex])) {
          //     indexes.push(this.getIndex(xIndex, yIndex));
          //     console.log("?");
          //   }
            
          // }, 100)

        }
        else {
          reject();
          return;
        }
      }
    });

    
    //return indexes;
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

    let rechargeVals = this.types.recharge.data._covjson.ranges.recharge.values;
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
    if (indexes == null) {
      for (let i = 0; i < rechargeVals.length; i++) {
        //if background value don't count
        if(checkInclude(i)) {
          cells++;
          metrics.USC.average.current += rechargeVals[i];
          metrics.USC.average.original += this.types.recharge.baseData[this.currentScenario][i];
          
          metrics.Metric.average.current += rechargeVals[i] * MapComponent.INCH_TO_MILIMETER_FACTOR;
          metrics.Metric.average.original += this.types.recharge.baseData[this.currentScenario][i] * MapComponent.INCH_TO_MILIMETER_FACTOR;
        }
      }

      cells = rechargeVals.length;
    }
    else {
      //get total average over cells
      indexes.forEach((index) => {
        if(checkInclude(index)) {
          cells++;
          metrics.USC.average.current += rechargeVals[index];
          metrics.USC.average.original += this.types.recharge.baseData[this.currentScenario][index];

          metrics.Metric.average.current += rechargeVals[index] * MapComponent.INCH_TO_MILIMETER_FACTOR;
          metrics.Metric.average.original += this.types.recharge.baseData[this.currentScenario][index] * MapComponent.INCH_TO_MILIMETER_FACTOR;
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
    if (cells > 0) {
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
      metrics.USC.volumetric.pchange = metrics.USC.volumetric.original == 0 ? 0 : metrics.USC.volumetric.diff / metrics.USC.volumetric.original * 100;
      metrics.USC.average.pchange = metrics.USC.average.original == 0 ? 0 : metrics.USC.average.diff / metrics.USC.average.original * 100;
      metrics.Metric.volumetric.pchange = metrics.Metric.volumetric.original == 0 ? 0 : metrics.Metric.volumetric.diff / metrics.Metric.volumetric.original * 100;
      metrics.Metric.average.pchange = metrics.Metric.average.original == 0 ? 0 : metrics.Metric.average.diff / metrics.Metric.average.original * 100;
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

    let precision = 3;

    //convert rounded number string to number then back to string so scientific notation is removed
    roundedMetrics.USC.average.original = Number(metrics.USC.average.original) >= Math.pow(10, precision) ? Number(metrics.USC.average.original.toPrecision(precision)).toString() : metrics.USC.average.original.toPrecision(precision);
    roundedMetrics.USC.average.current = Number(metrics.USC.average.current) >= Math.pow(10, precision) ? Number(metrics.USC.average.current.toPrecision(precision)).toString() : metrics.USC.average.current.toPrecision(precision);
    roundedMetrics.USC.volumetric.original = Number(metrics.USC.volumetric.original) >= Math.pow(10, precision) ? Number(metrics.USC.volumetric.original.toPrecision(precision)).toString() : metrics.USC.volumetric.original.toPrecision(precision);
    roundedMetrics.USC.volumetric.current = Number(metrics.USC.volumetric.current) >= Math.pow(10, precision) ? Number(metrics.USC.volumetric.current.toPrecision(precision)).toString() : metrics.USC.volumetric.current.toPrecision(precision);
    roundedMetrics.USC.average.diff = Number(metrics.USC.average.diff) >= Math.pow(10, precision) ? Number(metrics.USC.average.diff.toPrecision(precision)).toString() : metrics.USC.average.diff.toPrecision(precision);
    roundedMetrics.USC.volumetric.diff = Number(metrics.USC.volumetric.diff) >= Math.pow(10, precision) ? Number(metrics.USC.volumetric.diff.toPrecision(precision)).toString() : metrics.USC.volumetric.diff.toPrecision(precision);
    roundedMetrics.USC.average.pchange = Number(metrics.USC.average.pchange) >= Math.pow(10, precision) ? Number(metrics.USC.average.pchange.toPrecision(precision)).toString() : metrics.USC.average.pchange.toPrecision(precision);
    roundedMetrics.USC.volumetric.pchange = Number(metrics.USC.volumetric.pchange) >= Math.pow(10, precision) ? Number(metrics.USC.volumetric.pchange.toPrecision(precision)).toString() : metrics.USC.volumetric.pchange.toPrecision(precision);
    roundedMetrics.USC.area = Number(metrics.USC.area) >= Math.pow(10, precision) ? Number(metrics.USC.area.toPrecision(precision)).toString() : metrics.USC.area.toPrecision(precision);

    roundedMetrics.Metric.average.original = Number(metrics.Metric.average.original) >= Math.pow(10, precision) ? Number(metrics.Metric.average.original.toPrecision(precision)).toString() : metrics.Metric.average.original.toPrecision(precision);
    roundedMetrics.Metric.average.current = Number(metrics.Metric.average.current) >= Math.pow(10, precision) ? Number(metrics.Metric.average.current.toPrecision(precision)).toString() : metrics.Metric.average.current.toPrecision(precision);
    roundedMetrics.Metric.volumetric.original = Number(metrics.Metric.volumetric.original) >= Math.pow(10, precision) ? Number(metrics.Metric.volumetric.original.toPrecision(precision)).toString() : metrics.Metric.volumetric.original.toPrecision(precision);
    roundedMetrics.Metric.volumetric.current = Number(metrics.Metric.volumetric.current) >= Math.pow(10, precision) ? Number(metrics.Metric.volumetric.current.toPrecision(precision)).toString() : metrics.Metric.volumetric.current.toPrecision(precision);
    roundedMetrics.Metric.average.diff = Number(metrics.Metric.average.diff) >= Math.pow(10, precision) ? Number(metrics.Metric.average.diff.toPrecision(precision)).toString() : metrics.Metric.average.diff.toPrecision(precision);
    roundedMetrics.Metric.volumetric.diff = Number(metrics.Metric.volumetric.diff) >= Math.pow(10, precision) ? Number(metrics.Metric.volumetric.diff.toPrecision(precision)).toString() : metrics.Metric.volumetric.diff.toPrecision(precision);
    roundedMetrics.Metric.average.pchange = Number(metrics.Metric.average.pchange) >= Math.pow(10, precision) ? Number(metrics.Metric.average.pchange.toPrecision(precision)).toString() : metrics.Metric.average.pchange.toPrecision(precision);
    roundedMetrics.Metric.volumetric.pchange = Number(metrics.Metric.volumetric.pchange) >= Math.pow(10, precision) ? Number(metrics.Metric.volumetric.pchange.toPrecision(precision)).toString() : metrics.Metric.volumetric.pchange.toPrecision(precision);
    roundedMetrics.Metric.area = Number(metrics.Metric.area) >= Math.pow(10, precision) ? Number(metrics.Metric.area.toPrecision(precision)).toString() : metrics.Metric.area.toPrecision(precision);


    return roundedMetrics;
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

    this.metrics = this.createMetrics();

  }
































  setWindowId(id: number) {
    this.windowId = id;
  }




  upload(info: any) {
    this.verifyFilesAndGetData(info).then((data) => {

      //console.log(data);
      if(data.notFound.length != 0) {
        let message = ""
        if(data.notFound.includes("shapes")) {
          message += "Could not find valid shapefile:\n\t- Must contain all necessary data objects inside a zip folder.\n\n";
        }
        if(data.notFound.includes("cover")) {
          message += "Could not find a valid land cover file:\n\t- Must be in a valid asc format."
          + "\n\t- Must have a 6 line header with the values ncols, nrows, xllcorner, yllcorner, cellsize, and NODATA_value"
          + "\n\t- Grid must be a subset of the provided map (e.g. fully contained within a " + this.gridWidthCells + " column by " + this.gridHeightCells + " row grid of 75m resolution starting at x: " + this.xmin + ", y: " + this.ymin + ")"
          + "\n\t- Must contain whole number values on the range [" + this.validLandcoverRange.min.toString() + ", " + this.validLandcoverRange.max.toString() + "].\n\n";
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
          let rechargeData = this.types.recharge.data._covjson.ranges.recharge.values;

          //backup values to restore on data failure
          let backupData = Array.from(covData);

          // let dbQueryChunkSize = 50;
          // let subarrayCounter = 0;
          //let changedIndexComponents = [[]];
          let changedIndexComponents = [];
          
          for(let i = 0; i < covData.length; i++) {

            //don't replace if nodata value, also check if value the same since don't need to get recharge from db for correct values
            if(data.cover.values[i] != data.cover.nodata && covData[i] != data.cover.values[i]) {
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
          let geometries = this.generateGeometriesFromPoints(changedIndexComponents, {x: 8, y: 8});
          // let start = new Date().getTime();
          // Observable.forkJoin(geometries.map(geometry => {
          //   return this.DBService.spatialSearch(geometry);
          // }))
          // .subscribe((data) => {
          //   console.log("Operation took " + (new Date().getTime() - start).toString() + "ms");
          //   console.log(data);
          // });
          //console.log(geometries);
          this.updateRecharge(geometries, (update) => {
            update.forEach(area => {
              //how does it behave if out of coverage range? check db response and modify so doesn't throw an error
              area.forEach(record => {
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

                  this.types.recharge.currentData[scenario] = recordValue;
                  if(scenario == this.currentScenario) {
                    rechargeData[index] = recordValue;
                  }
                });

              });
              this.updateMetrics(geometries);
            });
            //reload recharge cover
            this.loadCover(this.types.recharge, true)
          }, (error) => {
            //restore land cover on failure
            backupData.forEach((value, i) => {
              covData[i] = value;
            });
            this.loadCover(this.types.landCover, false);
          });

          //console.log(geometries);
          // console.log("Sending " + changedIndexComponents.length.toString() + " queries of " + dbQueryChunkSize.toString() + " points.");
          // let start = new Date().getTime();
          // Observable.forkJoin(changedIndexComponents.map(indexGroup => {
          //   return this.DBService.indexSearch(indexGroup);
          // }))
          // //this.DBService.indexSearch(changedIndexComponents[0])
          // //this.DBService.spatialSearch(element);
          // .subscribe((data) => {
          //   console.log("Operation took " + (new Date().getTime() - start).toString() + "ms");
          //   console.log(data);
          // });

          // changedIndexComponents.forEach((indexGroup) => {
          //   this.DBService.indexSearch(indexGroup)
          //   .subscribe((data) => {
          //     console.log(data);
          //   });
          // });

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


  //for now just use squares until figure out other problems
  generateGeometriesFromPoints(points: {x: number, y: number}[], divisions: {x: number, y: number}) {
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

    let xdivisions = [];
    let ydivisions = [];

    let chunkSize = Math.ceil((xrange.max - xrange.min) / divisions.x);
    for(let i = 0; i < divisions.x - 1; i++) {
      xdivisions.push({
        min: xrange.min + i * chunkSize,
        //subtract 1 so upper bound centroid not in bounds (boundary centroids get placed in latter section)
        max: xrange.min + (i + 1) * chunkSize - 1
      });
    }
    //add last chunk separately so all included if not evenly divisible
    xdivisions.push({
      min: xrange.min + (divisions.x - 1) * chunkSize,
      max: xrange.max
    });

    chunkSize = Math.ceil((yrange.max - yrange.min) / divisions.y);
    for(let i = 0; i < divisions.y - 1; i++) {
      ydivisions.push({
        //subtract 1 so centroid within bounds
        min: yrange.min + i * chunkSize - 1,
        //subtract 1 so upper bound centroid not in bounds (boundary centroids get placed in latter section)
        max: yrange.min + (i + 1) * chunkSize - 1
      });
    }
    //add last chunk separately so all included if not evenly divisible
    ydivisions.push({
      min: yrange.min + (divisions.y - 1) * chunkSize - 1,
      max: yrange.max + 1
    });

    let xs = this.types.landCover.data._covjson.domain.axes.get("x").values;
    let ys = this.types.landCover.data._covjson.domain.axes.get("y").values;

    let geometries = [];

    //squares
    //-----------------------------------------------------------------------------------



    // for(let i = 0; i < xdivisions.length; i++) {
    //   for(let j = 0; j < ydivisions.length; j++) {

    //     let shape = [];
    //     let p1 = [xs[xdivisions[i].min], ys[ydivisions[j].min]];
    //     let p2 = [xs[xdivisions[i].min], ys[ydivisions[j].max]];
    //     let p3 = [xs[xdivisions[i].max], ys[ydivisions[j].max]];
    //     let p4 = [xs[xdivisions[i].max], ys[ydivisions[j].min]];
    //     let p5 = [xs[xdivisions[i].min], ys[ydivisions[j].min]];

    //     //wrong order
    //     // let p1 = [ydivisions[j].min, xdivisions[i].min];
    //     // let p2 = [ydivisions[j].max, xdivisions[i].min];
    //     // let p3 = [ydivisions[j].max, xdivisions[i].max];
    //     // let p4 = [ydivisions[j].min, xdivisions[i].max];
    //     // let p5 = [ydivisions[j].min, xdivisions[i].min];

    //     shape.push(MapComponent.proj4(MapComponent.utm, MapComponent.longlat, p1));
    //     shape.push(MapComponent.proj4(MapComponent.utm, MapComponent.longlat, p2));
    //     shape.push(MapComponent.proj4(MapComponent.utm, MapComponent.longlat, p3));
    //     shape.push(MapComponent.proj4(MapComponent.utm, MapComponent.longlat, p4));
    //     shape.push(MapComponent.proj4(MapComponent.utm, MapComponent.longlat, p5));

    //     geometries.push({
    //       "type": "Polygon",
    //       "coordinates": [shape]
    //     });

    //   }
    // }

    


    //not squares
    //-----------------------------------------------------------------------------------------------------------------------

    let yMapping = [];
    //let xMapping = [];

    for(let i = 0; i < xdivisions.length; i++) {
      yMapping.push([]);
      for(let j = 0; j < ydivisions.length; j++) {
        yMapping[i].push({});
      }
    }

    // for(let i = 0; i < xdivisions.length; i++) {
    //   xMapping.push([]);
    //   for(let j = 0; j < ydivisions.length; j++) {
    //     xMapping[i].push({});
    //   }
    // }


    //find which division point falls in and create mapping
    points.forEach((point) => {
      let broken = false;
      for(let i = 0; i < xdivisions.length; i++) {
        for(let j = 0; j < ydivisions.length; j++) {
          if((point.x >= xdivisions[i].min && point.x <= xdivisions[i].max) && (point.y >= ydivisions[j].min && point.y <= ydivisions[j].max)) {
            if(yMapping[i][j][point.y]) {
              if(point.x < yMapping[i][j][point.y].min) {
                yMapping[i][j][point.y].min = point.x;
              }
              else if(point.x > yMapping[i][j][point.y].max) {
                yMapping[i][j][point.y].max = point.x;
              }
            }
            else {
              yMapping[i][j][point.y] = {
                min: point.x,
                max: point.x
              }
            }

            // if(xMapping[i][j][point.x]) {
            //   if(point.y < xMapping[i][j][point.x].min) {
            //     xMapping[i][j][point.x].min = point.y;
            //   }
            //   else if(point.y > xMapping[i][j][point.x].max) {
            //     xMapping[i][j][point.x].max = point.y;
            //   }
            // }
            // else {
            //   xMapping[i][j][point.x] = {
            //     min: point.y,
            //     max: point.y
            //   }
            // }
            broken = true;
            break;
          }
        }
        //if inner loop broke already found division the point belongs in, break out of outer loop as well
        if(broken) {
          break;
        }
      }
    });

    //console.log(yMapping);
    //console.log(xMapping);

    

    //CAN ALSO MIRROR ON X SIDES (FOLLOW Y CONTOURS ON TOP AND BOTTOM) FOR TIGHTER BOUND
    //only want to cutout in gaps between bottom two points and top two points rather than whole range
    //can fix this later, just comment out x cutouts for now, bit more complicated

    for(let i = 0; i < xdivisions.length; i++) {
      for(let j = 0; j < ydivisions.length; j++) {
        let rightPoints = [];
        let leftPoints = [];
        // let topPoints = [];
        // let bottomPoints = [];

        let first = true;
        for(let y = ydivisions[j].min; y <= ydivisions[j].max; y++) {
          if(yMapping[i][j][y]) {
            let yUTM = ys[y];
            //subtract/add 1 from min/max to make sure that rows with one point have a gap between sides
            let xMinUTM = xs[yMapping[i][j][y].min] - 1;
            let xMaxUTM = xs[yMapping[i][j][y].max] + 1;

            //is x, y the right order?
            let coordLeft =  MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [xMinUTM, yUTM]);
            let coordRight =  MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [xMaxUTM, yUTM]);
            
            //console.log(coordLeft);

            leftPoints.push(coordLeft);
            rightPoints.push(coordRight);
          }
        }

        //only want to cutout in gaps between bottom two points and top two points rather than whole range
        //can fix this later, just comment out x cutouts for now, bit more complicated

        // for(let x = xdivisions[i].min; x <= xdivisions[i].max; x++) {
        //   if(xMapping[i][j][x]) {
        //     let xUTM = xs[x];
        //     //subtract 1 from utm coordinate on min side to make sure that point is actually inside shape rather than on line
        //     let yMinUTM = ys[xMapping[i][j][x].min] - 1;
        //     //add 1 to max side so inside bounds
        //     let yMaxUTM = ys[xMapping[i][j][x].max] + 1;

        //     //is x, y the right order?
        //     //top has minimum y values since grid upside down
        //     let coordTop =  MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [xUTM, yMinUTM]);
        //     let coordBottom =  MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [xUTM, yMaxUTM]);

        //     //console.log(coordTop);
        //     topPoints.push(coordTop);
        //     bottomPoints.push(coordBottom);
        //   }
        // }
        //reverse right side points since want from top to bottom which is min to max (put in array max to min)
        //rightPoints = rightPoints.reverse();
        //reverse bottom points so right to left
        leftPoints = leftPoints.reverse();
        //console.log(leftPoints);
        let shape = rightPoints.concat(leftPoints);
        //shape = shape.concat(rightPoints);
        // shape = shape.concat(leftPoints);  

        //points on line should be considered within the shape using mongodb's geowithin definition
        if(shape.length > 0) {
          //if only one set of points add a third point offset by 10 meters from the first point ot make a triangle (instead of a line)
          if(shape.length < 3) {
            //~1/111111 degrees of longtitude per meter
            shape.push([shape[0][0], shape[0][1] + 10/111111])
          }
          //add first point to end of array to close shape
          shape.push(shape[0]);

          geometries.push({
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [shape]
            }
          });
        }
        //console.log(shape); 
      }
    }

    // geometries = geometries;
    // let objects = {
    //   type: "Feature",
    //   properties: {},
    //   geometry: {
    //       "type": "Polygon",
    //       "coordinates": geometries
    //   }
    // };
    // console.log(objects)

    let objects = L.geoJSON(geometries).toGeoJSON();
    // console.log(objects);

    // geometries.forEach((geometry) => {
    //   // let geojsonBounds = {
    //   //   "type": "Feature",
    //   //   "properties": {},
    //   //   "geometry": geometry
    //   // };
    //   //console.log(geometry);
    //   let polyCoords = this.swapCoordinates(geometry.geometry.coordinates);
    //   this.addDrawnItem(L.polygon(polyCoords, {}));
      
    //   //L.geoJSON(geojsonBounds).addTo(this.map);
    // });
    let customTotal = this.getMetricsSuite(this.getInternalIndexes(this.drawnItems.toGeoJSON()), true);
    this.metrics.customAreasTotal.metrics = customTotal;
    this.metrics.customAreasTotal.roundedMetrics = this.roundMetrics(customTotal);
    
    // // console.log(geometries);


    //-----------------------------------------------------------------------------

    return objects;


  }




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
              //landcover formatting still messed up for some weird reason
              //just reject for now and implement later
              reject();
              return;
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
                  test(JSON.parse(this.fileHandler.reader.result));
                }
                this.fileHandler.reader.readAsText(file);
              }
              else {
                reject()
                return;
              }
            }

          }


          else if(format == "asc") {
            test = (data) => {

              //INSTEAD OF THIS, LETS JUST CONSTRUCT A FULL DATA GRID, FILL IN MISSING VALUES WITH NO DATA VALUE
              //ONLY NEED TO PASS BACK VALUE GRID AND NO DATA VALUE
              // let parsedData = {
              //   ncols: 0,
              //   nrows: 0,
              //   xStart: 0,
              //   yStart: 0,
              //   nodata: 0,
              //   values: []
              // };
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

              
              //console.log("?");

              //all of these weird mapping things need to change when fix covjson
              let xs = this.types.landCover.data._covjson.domain.axes.get("x").values;
              let ys = this.types.landCover.data._covjson.domain.axes.get("y").values;

              let getCentroidComponentIndices = (x, y) => {
                // console.log(this.xmin);
                // console.log(x);
                let diffx = x - this.xmin;
                let diffy = y - this.ymin;
  
                //don't need this, just check indexOf
                //reject if out of range of grid
                // if (!(diffx >= 0 && diffy >= 0 && diffx <= this.xrange && diffy <= this.yrange)) {
                //   reject();
                // }
  
                //round down to nearest 75 (get cell leading edge)
                diffx = Math.floor(diffx / 75) * 75;
                diffy = Math.floor(diffy / 75) * 75;
  
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
              //console.log("?");
              //check if corner centroid valid, reject if it isn't
              if(minCentroid.xIndex < 0 || minCentroid.yIndex < 0) {
                //console.log("test2");
                reject();
                return;
              }
              //console.log("?");
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
              //console.log("?");
              //verify number of values
              if(vals.length != ncols * nrows) {
                //console.log(vals.length);
                //console.log(ncols * nrows)
                reject();
                return;
              }
              //console.log("?");
              //convert values to numbers and ensure valid
              for(let i = 0; i < vals.length; i++) {
                //values strings, convert to numbers
                vals[i] = Number(vals[i]);
                //whole number in valid range or no data value
                if((vals[i] % 1 != 0 || vals[i] < this.validLandcoverRange.min || vals[i] > this.validLandcoverRange.max) && vals[i] != noData) {
                  //console.log("test2");
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
                  

                  //offset from local grid bounds, so compute global indices from this
                  let globalXIndex = minCentroid.xIndex + globalXOffset;
                  //subtract on y axis because bottom to top
                  let globalYIndex = minCentroid.yIndex - globalYOffset;

                  let localXIndex = localXOffset;
                  //y offset from bottom so need to subtract from total number of rows
                  let localYIndex = nrows - localYOffset

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

                for(let xOffset = minCentroid.xIndex; xOffset < maxCentroid.xIndex; xOffset++) {
                  //bottom to top, so max centroid's y axis should be smaller
                  for(let yOffset = maxCentroid.yIndex; yOffset < minCentroid.yIndex; yOffset++) {
                    //grid goes from lower left (left to right bottom to top)
                    //subtract yOffset since going up
                    let globalIndex = this.getIndex(xOffset, yOffset);

                    let localComponents = getLocalComponentIndicesFromGlobalOffset(xOffset, yOffset, scale)

                    //y offset from bottom so need to subtract from total number of rows
                    let localIndex = getLocalIndex(localComponents.xIndex, localComponents.yIndex);
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

        //MAKE FILE VERIFICATION RESOLVE WITH DESIRED DATA IF FILE FOUND, AND REJECT OTHERWISE
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
  download(info: any) {

    //console.log(info)
    let ready = [];
    let index = 0;

    [info.shapes, info.recharge, info.cover].forEach((item) => {
      if(item) {
        ready.push({
          ready: false,
          fname: "",
          type: "",
          data: null
        });
      }
    });


    //get string representation of specified file contents
    let genDataFileContents = (type: string, format: string) => {

      let data = this.types[type].data._covjson;
      let fcontents;
  
      if(format == "asc") {
        let vals = type == "recharge" ? data.ranges.recharge.values :  data.ranges.cover.values;
        
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
          fcontents += val + " "
          //should have newline at the end of every row
          if(++colCounter >= this.gridWidthCells) {
            fcontents += "\n";
            colCounter = 0;
          }
        });
        return {
          data: fcontents,
          name: type + "." + format,
          type: 'text/plain;charset=utf-8'
        }
        
      }
      else if(format == "covjson") {
        return {
          data: JSON.stringify(data),
          name: type + "." + format,
          type: 'text/plain;charset=utf-8'
        }
        
      }
      //download as a shapefile
      else {
        let cells = [];

        //need to change property label if recharge
        let data = type == "landCover" ? this.types.landCover.data._covjson.ranges.cover.values : this.types.recharge.data._covjson.ranges.recharge.values;
        let xs = this.types.landCover.data._covjson.domain.axes.get("x").values;
        let ys = this.types.landCover.data._covjson.domain.axes.get("y").values;

        xs.forEach((x, i) => {
          ys.forEach((y, j) => {
            let value = data[this.getIndex(i, j)];
            if(value == 0) {
              return;
            }
            console.log("test");

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

        console.log("complete");
        
        let shapes = L.geoJSON(cells).toGeoJSON();

        let zip = new JSZip();

        //redefine shp-write zip feature with desired file hierarchy
        let polygons = shpWriteGeojson.polygon(shapes);
        polygons.geometries = polygons.geometries[0];
        if (polygons.geometries.length && polygons.geometries[0].length) {
          this.modShpWrite.write(
            // field definitions
            polygons.properties,
            // geometry type
            polygons.type,
            // geometries
            polygons.geometries,
            function (err, files) {
              let fileName = type;
              zip.file(fileName + '.shp', files.shp.buffer, { binary: true });
              zip.file(fileName + '.shx', files.shx.buffer, { binary: true });
              zip.file(fileName + '.dbf', files.dbf.buffer, { binary: true });
              zip.file(fileName + '.prj', shpWritePrj);
            }
          );
        }
        
        zip.generateAsync({ type: "base64" }).then((file) => {
          return {
            data: this.base64ToArrayBuffer(file),
            name: type + ".zip",
            type: 'data:application/zip'
          }
        });
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
    

    let __this = this;

    if(info.shapes) {

      //get current details object and increment index
      let thisDetails = ready[index++];

      let zip = new JSZip();

      let shapes = this.drawnItems.toGeoJSON();
      //toGeoJSON seems to use eachLayer function, so should be same order, having a hard time finding full source code in readable format, so hopefully won't cause problems
      let i = 0;
      this.drawnItems.eachLayer((layer) => {
        shapes.features[i++].properties.name = this.customAreaMap[layer._leaflet_id].name;
      });
      //shapes.features[0].properties = {name: "test"};
      // let name = "DefinedAreas";
  
      
      //redefine shp-write zip feature with desired file hierarchy
      let polygons = shpWriteGeojson.polygon(shapes);
      polygons.geometries = polygons.geometries[0];
      if (polygons.geometries.length && polygons.geometries[0].length) {
        this.modShpWrite.write(
          // field definitions
          polygons.properties,
          // geometry type
          polygons.type,
          // geometries
          polygons.geometries,
          function (err, files) {
            let fileName = "DefinedAreas";
            zip.file(fileName + '.shp', files.shp.buffer, { binary: true });
            zip.file(fileName + '.shx', files.shx.buffer, { binary: true });
            zip.file(fileName + '.dbf', files.dbf.buffer, { binary: true });
            zip.file(fileName + '.prj', shpWritePrj);
          }
        );
      }

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

      //generate file details
      let fdetails = genDataFileContents("recharge", info.format);
      thisDetails.data = fdetails.data;
      thisDetails.fname = fdetails.name;
      thisDetails.type = fdetails.type;

      //signal ready
      thisDetails.ready = true;

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

      //generate file details
      let fdetails = genDataFileContents("landCover", info.format);
      thisDetails.data = fdetails.data;
      thisDetails.fname = fdetails.name;
      thisDetails.type = fdetails.type;

      //signal ready
      thisDetails.ready = true;

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

    L.drawLocal.draw.handlers.marker.tooltip.start = "Click map to select cell"


    //might want to add some kind of undo button
    L.DrawToolbar.include({
      getModeHandlers: function (map) {
        return [
          {
            enabled: true,
            handler: new L.Draw.Polygon(map, {}),
            title: L.drawLocal.draw.toolbar.buttons.polygon,
          },

          {
            enabled: true,
            handler: new L.Draw.Rectangle(map, {}),
            title: L.drawLocal.draw.toolbar.buttons.rectangle
          },
          {
            enabled: true,
            handler: new L.Draw.Marker(map, {
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
        let customTotal = this.getMetricsSuite(this.getInternalIndexes(this.drawnItems.toGeoJSON()), true);
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
      if (event.layerType == "marker") {
        let bounds = this.getCell(event.layer._latlng);
        //check if was out of map boundaries, do nothing if it was
        if (bounds) {
          this.addDrawnItem(new L.Rectangle(bounds), false);
        }
      }
      else {
        this.addDrawnItem(event.layer);
      }

      //can streamline computation by using set of added shapes' metrics and previous data as base

      let customTotal = this.getMetricsSuite(this.getInternalIndexes(this.drawnItems.toGeoJSON()), true);
      this.metrics.customAreasTotal.metrics = customTotal;
      this.metrics.customAreasTotal.roundedMetrics = this.roundMetrics(customTotal);

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
  private addDrawnItem(layer, editable: boolean = true, name: string = undefined) {
    // console.log(this.types.aquifers.layer);

    //this.downloadShapefile(this.drawnItems)

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
    let items = new L.featureGroup();

    info.name = name == undefined ? "Custom Area " + (__this.customAreasCount++).toString() : name;
    //set to whole metric object so when change name will change in metrics
    this.customAreaMap[layer._leaflet_id] = info;

    let itemMetrics = this.getMetricsSuite(this.getInternalIndexes(items.addLayer(layer).toGeoJSON()), true);

    info.metrics = itemMetrics;
    info.roundedMetrics = this.roundMetrics(itemMetrics);

    this.metrics.customAreas.push(info);

    //ADD BATCH DEFERENCE, THEN CAN ALLOW MANY CUSTOM AREAS
    //update custom areas total
    //can definately improve upon this
    // let customTotal = this.getMetricsSuite(this.getInternalIndexes(this.drawnItems.toGeoJSON()), true);
    // this.metrics.customAreasTotal.metrics = customTotal;
    // this.metrics.customAreasTotal.roundedMetrics = this.roundMetrics(customTotal);
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

    layer.on('click', function () {
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
      //if indicated that metrics are to be computed, recompute on change
      if (emitMetrics) {
        __this.getSelectedShapeMetrics();
      }
    })
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
      this.mapService.setLoading(this, true);
      //deal with errors too
      let start = new Date().getTime();
      Observable.forkJoin(geojsonObjects.features.map(element => {
        return this.DBService.spatialSearch(element.geometry);
      }))
      .subscribe((data) => {
        console.log("Operation took " + (new Date().getTime() - start).toString() + "ms");
        //console.log(typeof data);
        //use file(s) generated as cover
        dataHandler(data);
        this.mapService.setLoading(this, false);
      }, (error) => {
        //console.log(error);
        this.dialog.open(MessageDialogComponent, {data: {message: "An error has occurred while retrieving recharge data. Land cover changes have been reverted. Please try again:\n\n" + error.message, type: "Error"}});
        errorHandler(error);
        this.mapService.setLoading(this, false);
      });
    }
  }


  

  private updateCover(type: string) {

    //test download
    //this.downloadShapefile(this.highlightedItems.toGeoJSON());

    let geojsonObjects = this.highlightedItems.toGeoJSON();
    let indexes = this.getInternalIndexes(geojsonObjects);

    if(indexes.length == 0) {
      this.dialog.open(MessageDialogComponent, {data: {message: "No Cells Selected for Modification.\n\nEither:\n\n- No areas have been created for modification (Use the drawing tools on the left side of the map to define areas, or upload a shapefile containing predefined areas).\n- All areas have been deselected (Click on a defined area to allow modifications).\n- The area(s) selected are too small", type: "Info"}});
    }
    else {

      let covData = this.types.landCover.data._covjson.ranges.cover.values;
      let rechargeData = this.types.recharge.data._covjson.ranges.recharge.values;

      //backup values to restore on data failure
      let backupData = Array.from(covData);
      
      if(type == "advanced") {

        let info: any = {}

        let containedTypes = new Set();

        indexes.forEach(index => {
          containedTypes.add(COVER_INDEX_DETAILS[covData[index]].type);
        });

        info.sourceTypes = Array.from(containedTypes);

        info.allTypes = Object.keys(COVER_ENUM);

        info.state = this.advancedMappingState;

        this.dialog.open(AdvancedMappingDialogComponent, {data: info}).afterClosed()
        .subscribe((data) => {
          //console.log(data);
          //default closing disabled, data should always exist, still check just in case
          if(data) {
            //check if a mapping was created or if operation canceled
            if(data.mapping) {

              let covRemap = new Promise((resolve) => {
                indexes.forEach(index => {
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
                    covData[index] = COVER_ENUM[mappedType];
                  }
      
                });
                //reload layer from changes
                this.loadCover(this.types.landCover, false);
                resolve()
              });

              this.updateRecharge(geojsonObjects, (update) => {
                //ensure coverage remapping complete before processing recharge values
                covRemap.then(() => {
                  update.forEach(area => {
                    //how does it behave if out of coverage range? check db response and modify so doesn't throw an error
                    area.forEach(record => {
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

                        this.types.recharge.currentData[scenario] = recordValue;
                        if(scenario == this.currentScenario) {
                          rechargeData[index] = recordValue;
                        }
                      });

                    });
                    this.updateMetrics(geojsonObjects);
                  });
                  //reload recharge cover
                  this.loadCover(this.types.recharge, true)
                  //reenable report generation
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

        // this.updateRecharge(type, geojsonObjects, (update) => {
        //   update.forEach(area => {
        //     //how does it behave if out of coverage range? check db response and modify so doesn't throw an error
        //     area.forEach(record => {
        //       let recordBase = record.value;
        //       let x = recordBase.x;
        //       let y = recordBase.y;
        //       let index = this.getIndex(x, y);
        //       //does the array include base? if not have to shift
        //       rechargeVals[index] = recordBase[this.currentScenario][COVER_ENUM[type]];
        //     });
        //   });
        //   //reload recharge cover
        //   this.loadCover(this.types.recharge, true)

        //   this.updateMetrics(geojsonObjects);
        //   //reenable report generation
        // });
        //get enclosed land cover types and pass to dialog
        //asynchronously submit database request since need same areas regardless of landcover values
        //get mapping back from dialog
        /*
        use format: 
          {
            <source land cover>: <destination land cover>
            ...
          }
          create full mapping for all contained land covers for efficiency
          if default value selected mapping should have all non-selected land covers mapped to this values
          if default value is "no change" should be mapped to themselves
        */
      }
      //type base indicates should be changed back to base values
      else if (type == "base") {
        indexes.forEach(index => {
          covData[index] = this.types.landCover.baseData[index];
          rechargeData[index] = this.types.recharge.baseData[this.currentScenario][index];
        });
        this.loadCover(this.types.landCover, false);
        this.loadCover(this.types.recharge, true);


        this.updateMetrics(geojsonObjects);
      }
      else {
        //let __this = this;
        //might as well update recharge as well, async so shouldnt affect performance of core app

        //also may need to add some sort of block that releases when finished (eg a boolean switch) to ensure reports generated include all changes (wait until async actions completed)

        //should grey out report generation button while this is going
        //might also want to add some sort of loading indicator
        

        

        this.updateRecharge(geojsonObjects, (update) => {
          update.forEach(area => {
            //how does it behave if out of coverage range? check db response and modify so doesn't throw an error
            area.forEach(record => {
              let recordBase = record.value;
              let x = recordBase.x;
              let y = recordBase.y;
              let index = this.getIndex(x, y);
              
              let mappedType = COVER_ENUM[type];

              Object.keys(this.types.recharge.currentData).forEach((scenario) => {
                //background is not included in the database so indexes shifted by 1
                //if background type set recharge rate to 0
                let recordValue = mappedType == 0 ? 0 : recordBase[scenario][mappedType - 1]

                this.types.recharge.currentData[scenario] = recordValue;
                if(scenario == this.currentScenario) {
                  rechargeData[index] = recordValue;
                }
              });
            });
            this.updateMetrics(geojsonObjects);
          });
          //reload recharge cover
          this.loadCover(this.types.recharge, true)
          //reenable report generation
        }, (error) => {
          //restore land cover on failure
          backupData.forEach((value, i) => {
            covData[i] = value;
          });
          this.loadCover(this.types.landCover, false);
        });

        indexes.forEach(index => {
          covData[index] = COVER_ENUM[type];
        });

        //reload layer from changes
        this.loadCover(this.types.landCover, false);
      }

    }
  }

  private getInternalIndexes(geojsonFeatures: any): number[] {
    let indexes = [];
    geojsonFeatures.features.forEach(shape => {
      //console.log(shape);
      //can handle multipolygons i think
      //array due to potential cutouts, shouldn't have any cutouts
      shape.geometry.coordinates.forEach((pointsBase) => {

        //let pointsBase = shape.geometry.coordinates[0];
        let convertedPoints = [];
        let a = [];
        let b = [];
        let xmax = Number.NEGATIVE_INFINITY;
        let xmin = Number.POSITIVE_INFINITY;
        let ymax = Number.NEGATIVE_INFINITY;
        let ymin = Number.POSITIVE_INFINITY;

        //if multiple rings add each ring
        if(Array.isArray(pointsBase[0][0])) {
          pointsBase.forEach((ring) => {
            convertedPoints = [];

            for (let i = 0; i < ring.length; i++) {
              convertedPoints.push(MapComponent.proj4(MapComponent.longlat, MapComponent.utm, ring[i]));
            }
    
            for (let i = 0; i < convertedPoints.length - 1; i++) {
              //coordinates are in long lat order (I think)
    
              //get max and min vals to limit coordinates need to compare
              if (convertedPoints[i][0] > xmax) {
                xmax = convertedPoints[i][0];
              }
              if (convertedPoints[i][0] < xmin) {
                xmin = convertedPoints[i][0];
              }
              if (convertedPoints[i][1] > ymax) {
                ymax = convertedPoints[i][1];
              }
              if (convertedPoints[i][1] < ymin) {
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
          });
        }
        else {
          for (let i = 0; i < pointsBase.length; i++) {
            convertedPoints.push(MapComponent.proj4(MapComponent.longlat, MapComponent.utm, pointsBase[i]));
          }
  
          for (let i = 0; i < convertedPoints.length - 1; i++) {
            //coordinates are in long lat order (I think)
  
            //get max and min vals to limit coordinates need to compare
            if (convertedPoints[i][0] > xmax) {
              xmax = convertedPoints[i][0];
            }
            if (convertedPoints[i][0] < xmin) {
              xmin = convertedPoints[i][0];
            }
            if (convertedPoints[i][1] > ymax) {
              ymax = convertedPoints[i][1];
            }
            if (convertedPoints[i][1] < ymin) {
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
        }
        

        //convert max min values and find range of cells
        //no need to check every single one
        //convert coordinate and get x value
        // let xmaxUTM = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [xmax_x, xmax_y])[0];
        // let xminUTM = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [xmin_x, xmin_y])[0];
        // let ymaxUTM = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [ymax_x, ymax_y])[1];
        // let yminUTM = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [ymin_x, ymin_y])[1];

        let xs = this.types.landCover.data._covjson.domain.axes.get("x").values;
        let ys = this.types.landCover.data._covjson.domain.axes.get("y").values;

        let minxIndex;
        let maxxIndex;
        let minyIndex;
        let maxyIndex;

        //again, assume values are in order
        //find min and max indexes
        //check if ascending or descending order, findIndex returns first occurance
        if (xs[0] < xs[1]) {
          minxIndex = xs.findIndex(function (val) { return val >= xmin });
          //> not >= so returns index after last even if on edge 
          maxxIndex = xs.findIndex(function (val) { return val > xmax });
        }
        else {
          maxxIndex = xs.findIndex(function (val) { return val < xmin });
          minxIndex = xs.findIndex(function (val) { return val <= xmax });
        }
        if (ys[0] < ys[1]) {
          minyIndex = ys.findIndex(function (val) { return val >= ymin });
          maxyIndex = ys.findIndex(function (val) { return val > ymax });
        }
        else {
          maxyIndex = ys.findIndex(function (val) { return val < ymin });
          minyIndex = ys.findIndex(function (val) { return val <= ymax });
        }

        //check if shape boundaries out of coverage range
        if (minxIndex != -1 && maxxIndex != -1 && minyIndex != -1 && maxyIndex != -1) {
          //convert cell coords to long lat and raycast
          //max index calculation returns index after last index in range, so only go to index before in loop (< not <=)
          for (let xIndex = minxIndex; xIndex < maxxIndex; xIndex++) {
            for (let yIndex = minyIndex; yIndex < maxyIndex; yIndex++) {
              if (this.isInternal(a, b, { x: xs[xIndex], y: ys[yIndex] })) {
                indexes.push(this.getIndex(xIndex, yIndex))
              }
            }
          }
        }
      });
    });

    return indexes;
  }

  //can specify origin if 0, 0 is in range, not necessary for cover being used (0,0 not in range)
  private isInternal(a: any[], b: any[], point: any, origin: any = { x: 0, y: 0 }): boolean {
    //raycasting algorithm, point is internal if intersects an odd number of edges
    let internal = false;
    for (let i = 0; i < a.length; i++) {
      //segments intersect iff endpoints of each segment are on opposite sides of the other segment
      //check if angle formed is counterclockwise to determine which side endpoints fall on
      if (this.ccw(a[i], origin, point) != this.ccw(b[i], origin, point) && this.ccw(a[i], b[i], origin) != this.ccw(a[i], b[i], point)) {
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


  //prolly need parameter to say whether to start layer toggled on or off, might want to add this to types def
  //update names and make sure works
  private loadCover(coverage, legend: boolean) {
    if (coverage.layer != undefined) {
      this.map.removeControl(coverage.layer);
      this.layers.removeLayer(coverage.layer);
    }
    //remove old layer from map and control
    //__this.currentCover = coverages;

    //let xaxis = coverage._covjson.domain.axes.x.values;
    //let yaxis = coverage._covjson.domain.axes.y.values;

    // let test = [];
    // for(let i = 0; i < 100000; i++) {
    //   test.push(null);
    // }

    // rechargeVals.splice(100000, 100000, ...test);
    //console.log(coverage);
    // work with Coverage object
    let layer = C.dataLayer(coverage.data, { parameter: coverage.parameter, palette: coverage.palette })
    .on('afterAdd', () => {
      if(legend) {
        C.legend(layer).addTo(this.map);
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
    }

    this.layers.addBaseLayer(layer, coverage.label);
    coverage.layer = layer;

  }


  // public changeCover(cover: string){
  //   this.loadcovJSON(cover, this.map, this.layers);
  // }

  public changeScenario(type: string) {
    this.currentScenario = type;

    let swapData = this.types.recharge.currentData[type]
    let data = this.types.recharge.data._covjson.ranges.recharge.values;

    for(let i = 0; i < swapData.length; i++) {
      data[i] = swapData[i];
    }

    this.createMetrics();
    this.loadCover(this.types.recharge, true);
  }

  //generate 31 colors
  private landCoverPalette(): string[] {
    let palette = [];
    let range = 255;
    let color;
    let r;
    let g;
    let b;
    let first = true;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        for (let k = 0; k < 3; k++) {
          if (palette.length >= 31) {
            break;
          }
          //avoid black so lines stand out more (have 5 extra colors)
          if (!first) {
            r = (Math.round(range / 3 * i)).toString(16);
            g = (Math.round(range / 2 * j)).toString(16);
            b = (Math.round(range / 2 * k)).toString(16);
            if (r.length < 2) r = "0" + r;
            if (g.length < 2) g = "0" + g;
            if (b.length < 2) b = "0" + b;
            color = "#" + r + g + b;
            palette.push(color);
          }
          else {
            first = false;
          }
        }
      }
    }

    for (let i = 0; i < 30; i++) {
      COVER_INDEX_DETAILS[i].color = palette[i];
      document.documentElement.style.setProperty("--color" + (LC_TO_BUTTON_INDEX[i + 1]).toString(), palette[i + 1]);
    }

    //palette = this.agitate(palette);
    return palette;
  }


  private rechargePalette(): string[] {
    let palette = [];
    let colorScale = ["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#08519c", "#08306b"];
    for(let i = 0; i < colorScale.length; i++) {
      for(let j = 0; j < Math.pow(2, i); j++) {
        palette.push(colorScale[i]);
      }
    }
    return palette;
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
}




