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
import * as shpwrite from 'shp-write';
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

  mymap: any;
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

  aquifers: any;

  highlightedCell: any;

  selectedCell: any;

  opacity = 1;

  interactionType: string;
  shapeMetricsEnabled: boolean;

  windowId: number;

  advancedMappingState: any;

  customAreasCount = 1;

  metrics: {
    customAreas: any[],
    aquifers: any[],
    customAreasTotal: any,
    total: any
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
  static readonly rechargeFile = "../assets/covjson/testfiles_sc0_0-fin.covjson"
  static readonly aquifersFile = "../assets/dlnr_aquifers.zip";

  types = {
    landCover: {
      parameter: 'cover',
      label: 'Land Cover',
      palette: C.directPalette(this.colorPalette()),
      data: null,
      baseData: null,
      layer: null
    },
    recharge: {
      parameter: 'recharge',
      label: 'Recharge Rate',
      //update with scheme sent by Kolja
      palette: C.linearPalette(["#ffffbf", "#a6d96a", "#92c5de", "#4393c3", "#4393c3", "#4393c3", "#4393c3", "#4393c3", "#4393c3", "#2166ac", "#2166ac", "#2166ac", "#2166ac", "#2166ac"]),
      data: null,
      baseData: null,
      layer: null
    },
    aquifers: {
      label: 'Aquifers',
      layer: null
    }
  };

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


  constructor(private DBService: DBConnectService, private mapService: MapService, private windowService: WindowService, private http: Http, private dialog: MatDialog) {
    //should put all these in constructors to ensure initialized before use
    this.mapService.setMap(this);
  }

  ngOnInit() {

  }

  ngAfterViewInit() {

    this.mymap = L.map(this.mapid.nativeElement).setView([21.512, -157.96664], 15);

    let mapLayer = L.esri.basemapLayer('Imagery').addTo(this.mymap);
    //create empty layer for displaying base map
    let empty = L.featureGroup();

    this.loadDrawControls();

    this.popup = L.popup();

    //thinking I like the collapsed version with this stuff
    this.layers = L.control.layers({ "Base Map": empty }, null/*, {collapsed: false}*/).addTo(this.mymap)

    this.initializeLayers();

    this.undoStack = [];
    this.redoStack = [];

    this.fileHandler = {
      reader: new FileReader(),
      working: [],
      busy: false
    };

    this.defaultMetrics = {
      IPY: {
        original: "0",
        current: "0",
        diff: "0",
        pchange: "0"
      },
      MGPD: {
        original: "0",
        current: "0",
        diff: "0",
        pchange: "0"
      },
      cells: "0"
    };

    //think there's a value in the middle that's invalid, may need to give valid values if issue, probably ok and more efficient like this though
    this.validLandcoverRange = {
      min: 0,
      max: 30
    };

    this.mymap.on('movestart', () => {
      L.DomUtil.removeClass(this.mymap._container, 'crosshair-cursor-enabled');
      L.DomUtil.addClass(this.mymap._container, 'leaflet-grab');
    });
    this.mymap.on('moveend', () => {
      L.DomUtil.removeClass(this.mymap._container, 'leaflet-grab');
      L.DomUtil.addClass(this.mymap._container, 'crosshair-cursor-enabled');
    });

    //need to add a way to store initial layer, just need layer and name probably, so manually add name at init
    this.mymap.on('baselayerchange', (e) => {
      //store current layer details
      this.baseLayer = e;

      switch (e.name) {
        case "Land Cover":
          this.mapService.changeLayer(this, "landcover");
          this.enableShapeInteraction(false);
          this.drawControl.addTo(this.mymap);
          this.mapService.baseDetails(this);
          //throws an error for some reason if run immediately (though it still works...)
          //possible that event goes through before layer fully swapped, so run on a delay
          setTimeout(() => {
            this.baseLayer.layer.setOpacity(this.opacity);
          }, 400);

          break;
        //need to figure out how you want to handle this, should modifications be disabled?
        case "Base Map":
          this.mapService.changeLayer(this, "base");
          this.enableShapeInteraction(false);
          this.drawControl.remove();
          this.mapService.baseDetails(this);
          break;
        case "Recharge Rate":
          this.mapService.changeLayer(this, "recharge");
          this.drawControl.remove();
          console.log(this.metrics.total);
          this.mapService.updateMetrics(this, "full", this.metrics.total.roundedMetrics);
          this.disableShapeInteraction();
          //throws an error for some reason if run immediately (though it still works...)
          //possible that event goes through before layer fully swapped, so run on a delay
          setTimeout(() => {
            this.baseLayer.layer.setOpacity(this.opacity);
          }, 400);
          break;
      }
    });


    //possibly change if on recharge
    this.mymap.on('mouseover', () => {
      L.DomUtil.addClass(this.mymap._container, 'crosshair-cursor-enabled');
      this.mymap.on('mousemove', (e) => {
        if (this.highlightedCell) {
          this.mymap.removeLayer(this.highlightedCell);
          this.highlightedCell = null;
        }
        this.mymap.closePopup();
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
              .addTo(this.mymap)

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
            popup.openOn(this.mymap);
          }

        }, 1000)
      });

    });

    this.mymap.on('mouseout', () => {
      L.DomUtil.removeClass(this.mymap._container, 'crosshair-cursor-enabled');
      this.mymap.off('mousemove');
      clearTimeout(this.popupTimer);
      this.mymap.closePopup();
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
  //           weight: 5,
  //           opacity: 1,
  //           color: 'black',
  //           fillOpacity: 0
  //         });
  //         refLayer.addTo(this.mymap);
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
  private swapCoordinates(arrLevel: any[]) {
    //base case, values are not arrays
    if (!Array.isArray(arrLevel[0])) {
      let temp = arrLevel[0];
      arrLevel[0] = arrLevel[1];
      arrLevel[1] = temp;
      return;
    }
    arrLevel.forEach(arr => {
      this.swapCoordinates(arr);
    });
  }

  private parseAndAddShapes(shapes: any) {
    shapes.features.forEach(shape => {
      let coordsBase = shape.geometry.coordinates;

      //swap coordinates, who wants consistent standards anyway?
      //different formats have different numbers of nested arrays, recursively swap values in bottom level arrays
      this.swapCoordinates(coordsBase);

      //multipolygons separated due to how shp-write package creates shapefiles, if problematic might have to heavily modify shp-write
      //also appears to be a bug where sometimes it packs multiple shapes as just a polygon, might need to chack where bottom level shape is and separate next level up
      if (shape.geometry.type == "MultiPolygon") {
        for (let i = 0; i < coordsBase.length; i++) {
          this.addDrawnItem(L.polygon(coordsBase[i], {}));
        }
      }
      else {
        this.addDrawnItem(L.polygon(coordsBase, {}));
      }
    });
  }

  showHideObjects(showOrHide: string) {
    if (showOrHide == "Show") {
      this.drawnItems.addTo(this.mymap);
    }
    else {
      this.mymap.removeLayer(this.drawnItems);
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
        this.enableShapeInteraction(true);
        //get initial metrics for already selected shapes
        this.getSelectedShapeMetrics();
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
      weight: 5,
      opacity: 1,
      color: 'black',  //Outline color
      fillOpacity: 0.2
    };
    let unhighlight = {
      weight: 5,
      opacity: 1,
      color: 'black',  //Outline color
      fillOpacity: 0
    }

    //make sure aquifers aren't hidden
    if (!this.mymap.hasLayer(this.types.aquifers.layer)) {
      this.types.aquifers.layer.addTo(this.mymap);
    }

    this.types.aquifers.layer.eachLayer((layer) => {
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


        //THIS CAN BE SPED UP BY USING ALREADY COMPUTED METRICS, CREATE IMPROVED METRICS COMBINING FUNCTION

        //get rounded metrics from indexes and send to bottom panel
        let metrics = this.roundMetrics(this.getMetricsSuite(indexes));
        //console.log(indexes);
        this.mapService.updateMetrics(this, "aquifer", metrics);
      });
    })

    this.mapService.updateMetrics(this, "aquifer", this.defaultMetrics);

  }

  private disableAquiferInteraction() {
    let hidden = false;
    L.DomUtil.addClass(this.mymap._container, 'crosshair-cursor-enabled');
    //if hidden add to map to remove event listeners
    if (!this.mymap.hasLayer(this.types.aquifers.layer)) {
      this.types.aquifers.layer.addTo(this.mymap);
      hidden = true;
    }
    this.types.aquifers.layer.eachLayer((layer) => {
      layer.off('click')
      layer.bringToBack();
      layer.setStyle({
        weight: 5,
        opacity: 1,
        color: 'black',
        fillOpacity: 0
      });
    })
    //remove again if was hidden
    if (hidden) {
      this.mymap.removeLayer(this.types.aquifers.layer);
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
    this.mymap.on('click', (e) => {
      if (this.selectedCell) {
        this.mymap.removeLayer(this.selectedCell);
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
          .addTo(this.mymap)

        //add back 37.5 and rounded difference value to get cell coordinate
        let xCellVal = this.xmin + 37.5 + diffx;
        let yCellVal = this.ymin + 37.5 + diffy;

        //find index of cell with coordinates
        let xIndex = xs.indexOf(xCellVal);
        let yIndex = ys.indexOf(yCellVal);

        //convert to data cell index
        let index = this.getIndex(xIndex, yIndex);

        //send get rounded metrics and send to bottom panel
        let metrics = this.roundMetrics(this.getMetricsSuite([index]));
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
      //already in cell mode and same metric type
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
      this.mymap.removeLayer(this.selectedCell);
    }
    this.mymap.off('click');
  }

  // private getSelectedCellMetrics(index: number) {
    
  // }

  private getSelectedShapeMetrics() {
    let indexes = this.getInternalIndexes(this.highlightedItems.toGeoJSON());

    //THIS CAN BE SPED UP BY USING ALREADY COMPUTED METRICS, CREATE IMPROVED METRICS COMBINING FUNCTION

    //get rounded metrics for highlighted sshapes and send to bottom panel
    let metrics = this.roundMetrics(this.getMetricsSuite(indexes))
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

    this.mapService.updateMetrics(this, "full", this.metrics.total.roundedMetrics);
  }












  private initializeLayers() {
    let __this = this;

    this.metrics = {
      customAreas: [],
      aquifers: [],
      customAreasTotal: {},
      total: {}
    }

    let metricCoordination = {
      rechargeVals: false,
      aquifers: false
    };

    
    CovJSON.read(MapComponent.landCoverFile).then(function (coverage) {
      let xs = coverage._covjson.domain.axes.x.values;
      let ys = coverage._covjson.domain.axes.y.values;

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


        })
        aquifers.setStyle({
          weight: 5,
          opacity: 1,
          color: 'black',
          fillOpacity: 0
        });
        __this.types.aquifers.layer = aquifers;
        aquifers.addTo(__this.mymap);
        __this.layers.addOverlay(aquifers, __this.types.aquifers.label);
        
        //can't compute metrics until recharge vals and aquifers are set
        if(metricCoordination.rechargeVals) {
          //document.body.style.cursor='wait';
          __this.metrics = __this.createMetrics();
          //document.body.style.cursor='default';
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
      // //L.marker(__this.lowerRightLatLng).addTo(__this.mymap);
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



    CovJSON.read(MapComponent.rechargeFile).then(function (coverage) {
      __this.types.recharge.data = coverage;
      //deepcopy values for comparisons with modified types
      __this.types.recharge.baseData = Array.from(coverage._covjson.ranges.recharge.values);
      //console.log(__this.currentCover._covjson.domain.axes);
      //change this

      __this.loadCover(__this.types.recharge, true);
      let rechargeVals = __this.types.recharge.data._covjson.ranges.recharge.values;

      //Race conditions? Don't think js can have race conditions since single threaded, should complete conditional before allowing other things to run
      //can't set metrics until aquifers in place and recharge values set
      if(metricCoordination.aquifers) {
        //document.body.style.cursor='wait';
        __this.metrics = __this.createMetrics();
      }
      else {
        //indicate recharge vals are set
        metricCoordination.rechargeVals = true;
      }
      
    });



    this.shapeMetricsEnabled = false;
    this.interactionType = "custom";
    this.currentScenario = "recharge_scenario0"

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
























  generateReport() {
    let data = this.metrics;
    console.log(data);
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
      customAreasTotal: {
        metrics: {},
        roundedMetrics: {}
      },
      total: {
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

        let capName = layer.feature.properties.SYSTEM;
        //switch from all upper case to capitalize first letter
        capName.split(/([\s \-])/).forEach((substr) => {
          info.name += (substr == "\s" || substr == "-") ? substr : substr.charAt(0).toUpperCase() + substr.substr(1).toLowerCase();
        });

        let aquiferMetrics = this.getMetricsSuite(MapComponent.aquiferIndices[capName]);
        
         info.metrics = aquiferMetrics;
         info.roundedMetrics = this.roundMetrics(aquiferMetrics);
        
         data.aquifers.push(info);
      });
    }

    //if already computed no need to recompute
    //static since aquifers are always the same
    if(!MapComponent.aquiferIndices) {

      MapComponent.aquiferIndices = {};
      //store promise so if method called again knows to wait for completion
      this.getAquiferIndices(this.types.aquifers).then(() => {

        console.log("complete");

        //indicate indexing has been completed
        MapComponent.aquiferIndexingComplete = true;

        getAquiferMetrics();

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


    let total = this.getMetricsSuite(null);
    data.total.metrics = total;
    data.total.roundedMetrics = this.roundMetrics(total);
    

    let items = new L.featureGroup();
    this.drawnItems.eachLayer((layer) => {
      let info = {
        name: "",
        metrics: {},
        roundedMetrics: {}
      };
      //add custom naming options later, for now just name by number
      info.name = "Custom Area " + (__this.customAreasCount++).toString();
      //console.log(layer.toGeoJSON())
      let itemMetrics = this.getMetricsSuite(this.getInternalIndexes(items.addLayer(layer).toGeoJSON()));
      info.metrics = itemMetrics;
      info.roundedMetrics = this.roundMetrics(itemMetrics);


      data.customAreas.push(info);
    });

    //can make more efficient by computing individual shape metrics and full metrics at the same time
    //figure out how to generalize as much as possible without adding too much extra overhead and use same function for everything
    let customTotal = this.getMetricsSuite(this.getInternalIndexes(this.drawnItems.toGeoJSON()));
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
        }
      }
    });

    
    //return indexes;
  }





  //could probably refactor to use this for generating and passing metrics to bottombar
  //also could use something similar to report generation for passing name and metric breakdown
  //maybe have subfunctions in generate report for different parts

  //also need to update all full map computations to disclude background cells
  getMetricsSuite(indexes: number[]) {
    let metrics = {
      IPY: {
        original: 0,
        current: 0,
        diff: 0,
        pchange: 0
      },
      MGPD: {
        original: 0,
        current: 0,
        diff: 0,
        pchange: 0
      },
      area: 0
    }

    let rechargeVals = this.types.recharge.data._covjson.ranges.recharge.values;
    let lcVals = this.types.landCover.data._covjson.ranges.cover.values;

    let cells = 0

    //pass in null if want whole map
    if (indexes == null) {
      for (let i = 0; i < rechargeVals.length; i++) {
        //if background value don't count
        if(lcVals[i] != 0) {
          cells++;
          metrics.IPY.current += rechargeVals[i];
          metrics.IPY.original += this.types.recharge.baseData[i];   
        }
      }

      cells = rechargeVals.length;
    }
    else {
      //get total IPY over cells
      indexes.forEach((index) => {
        if(lcVals[index]) {
          cells++;
          metrics.IPY.current += rechargeVals[index];
          metrics.IPY.original += this.types.recharge.baseData[index];
        }
      });
    
    }
    
    //compute metrics in MGPD
    metrics.MGPD.original = (metrics.IPY.original * 75 * 75 * 144) / (231 * 0.3048 * 0.3048 * 365 * 1000000);
    metrics.MGPD.current = (metrics.IPY.current * 75 * 75 * 144) / (231 * 0.3048 * 0.3048 * 365 * 1000000);

    //get square miles
    metrics.area = Math.pow(75 * MapComponent.METER_TO_MILE_FACTOR, 2) * cells;

    //if no cells leave at default value of 0 to avoid dividing by 0
    if (cells > 0) {
      //average IPY summation over cells
      metrics.IPY.original /= cells;
      metrics.IPY.current /= cells;

      //get difference and percent change
      metrics.MGPD.diff = metrics.MGPD.current - metrics.MGPD.original;
      metrics.IPY.diff = metrics.IPY.current - metrics.IPY.original;
      //make sure not dividing by 0 if no recharge in selected cells
      metrics.MGPD.pchange = metrics.MGPD.original == 0 ? 0 : metrics.MGPD.diff / metrics.MGPD.original * 100;
      metrics.IPY.pchange = metrics.IPY.original == 0 ? 0 : metrics.IPY.diff / metrics.IPY.original * 100;
    }

    return metrics;
      
  }


  private roundMetrics(metrics: any) {
    let roundedMetrics = {
      IPY: {
        original: "",
        current: "",
        diff: "",
        pchange: ""
      },
      MGPD: {
        original: "",
        current: "",
        diff: "",
        pchange: ""
      },
      area: ""
    };

    let precision = 3;

    roundedMetrics.IPY.original = metrics.IPY.original.toPrecision(precision);
    roundedMetrics.IPY.current = metrics.IPY.current.toPrecision(precision);
    roundedMetrics.MGPD.original = metrics.MGPD.original.toPrecision(precision);
    roundedMetrics.MGPD.current = metrics.MGPD.current.toPrecision(precision);
    roundedMetrics.IPY.diff = metrics.IPY.diff.toPrecision(precision);
    roundedMetrics.MGPD.diff = metrics.MGPD.diff.toPrecision(precision);
    roundedMetrics.IPY.pchange = metrics.IPY.pchange.toPrecision(precision) + "%";
    roundedMetrics.MGPD.pchange = metrics.MGPD.pchange.toPrecision(precision) + "%";
    roundedMetrics.area = metrics.area.toPrecision(precision);


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

      console.log(data);
      if(data.notFound.length != 0) {
        let message = ""
        if(data.notFound.includes("shapes")) {
          message += "Could not find valid shapefile:\n\t- Must contain all necessary data objects inside a zip folder.\n\n";
        }
        if(data.notFound.includes("cover")) {
          message += "Could not find a valid land cover file:\n\t- Must be in a valid covjson or asc format.\n\t- Must contain "
            + (this.gridWidthCells * this.gridHeightCells).toString()
            + " whole number values on the range [" + this.validLandcoverRange.min.toString() + ", " + this.validLandcoverRange.max.toString() + "].\n\n";
        }
        message += "Files are accepted as uploaded or contained within a zip folder."
        this.dialog.open(MessageDialogComponent, {data: {message: message, type: "Warning"}});
      }
      
      if(info.shapes) {
        if(data.shapes != null) {
          if(info.format == "custom") {
            if(Array.isArray(data.shapes)) {
              data.shapes.forEach(shpset => {
                this.parseAndAddShapes(shpset);
              });
            }
            else {
              this.parseAndAddShapes(data.shapes);
            }
          }
          else {
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
              weight: 5,
              opacity: 1,
              color: 'black',
              fillOpacity: 0
            });
            refLayer.addTo(this.mymap);

            let overlayName = "Custom Overlay " + (++this.numCustomOverlays).toString();

            this.layers.addOverlay(refLayer, overlayName);
          }
        }
      }

      if(info.cover) {
        if(data.cover != null) {
          
          let base = this.types.landCover.data._covjson.ranges.cover.values;

          

          
          for(let i = 0; i < base.length; i++) {
            //don't replace if nodata value
            if(data.cover.values[i] != data.cover.nodata) {
              base[i] = data.cover.values[i];

              //if overwriting base values, set value in baseData array
              if(info.overwrite) {
                this.types.landCover.baseData[i] = data.cover.values[i];
              }
            }

            
          }

          this.loadCover(this.types.landCover, false);

          //NEED TO UPDATE RECHARGE AS WELL, ASK SEAN ABOUT FORMAT OF QUERY
        }
      }


      //ignore not found values for now, need to implement error message
      //generate error message based on not found list here


    }, (message) => {
      //fail if already uploading or other issues occured while uploading
      this.dialog.open(MessageDialogComponent, {data: {message: message, type: "Error"}});
    });
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
              shp(data).then((geojson) => {
                
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
                  }
                }
                //if single item just check if valid geojson object
                else {
                  if(isGeoJSONObject(geojson)) {
                    accept(geojson);
                  }
                  else {
                    reject()
                  }
                }
              }, (e) => {
                //shp couldn't parse at all, reject
                reject();
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
                }
                this.fileHandler.reader.onabort = (e) => {
                  reject();
                }

                this.fileHandler.reader.onload = (e) => {
                  test(this.fileHandler.reader.result);
                }
                this.fileHandler.reader.readAsArrayBuffer(file);

              }
              else {
                //if file reader not initilized just reject
                reject()
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
                }
                this.fileHandler.reader.onabort = (e) => {
                  reject();
                }

                this.fileHandler.reader.onload = (e) => {
                  test(JSON.parse(this.fileHandler.reader.result));
                }
                this.fileHandler.reader.readAsText(file);
              }
              else {
                reject()
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
                reject();
              }

              


              //all of these weird mapping things need to change when fix covjson
              let xs = this.types.landCover.data._covjson.domain.axes.get("x").values;
              let ys = this.types.landCover.data._covjson.domain.axes.get("y").values;

              let getCentroidComponentIndices = (x, y) => {
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
  
                
                //find index of cell with coordinates
                return {
                  xIndex: xs.indexOf(xCellVal),
                  yIndex: ys.indexOf(yCellVal)
                };
              }


              
              let minCentroid = getCentroidComponentIndices(xCorner, yCorner);

              //check if corner centroid valid, reject if it isn't
              if(minCentroid.xIndex < 0 || minCentroid.yIndex < 0) {
                reject();
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
                console.log(vals.length);
                console.log(ncols * nrows)
                reject();
              }
          
              //convert values to numbers and ensure valid
              for(let i = 0; i < vals.length; i++) {
                //values strings, convert to numbers
                vals[i] = Number(vals[i]);
                //whole number in valid range or no data value
                if((vals[i] % 1 != 0 || vals[i] < this.validLandcoverRange.min || vals[i] > this.validLandcoverRange.max) && vals[i] != noData) {
                  console.log("test2");
                  reject();
                }
              }
          
              let getLocalIndex = (x, y) => {
                //grid goes from lower left (left to right bottom to top)
                //global indices are offset from min value, these are raw so need to offset from bottom on y axis
                return (y - minCentroid.yIndex) * ncols + (x - minCentroid.xIndex);
              }

              //if proper resolution just fill in grid sequentially
              if(cellSize == 75) {

                //if standard cell size only need to add indexes, since will align to grid once shifted
                let maxXIndex = minCentroid.xIndex + ncols;
                let maxYIndex = minCentroid.yIndex - nrows;
                //reject if grid goes out of range
                if(maxXIndex > this.gridWidthCells || maxYIndex > this.gridHeightCells) {
                  console.log(maxXIndex);
                  console.log(maxYIndex);
                  console.log(this.gridWidthCells);
                  console.log(this.gridHeightCells);
                  reject();
                }
            
                //grid exact size, just accept with provided value grid
                if(ncols == this.gridWidthCells && nrows == this.gridHeightCells) {
                  parsedData = {
                    nodata: noData,
                    //initialize to full grid size array with all noData values
                    values: vals
                  };
                }
                //otherwise need to insert values into full grid
                else {
                  parsedData = {
                    nodata: noData,
                    //initialize to full grid size array with all noData values
                    values: new Array(this.gridWidthCells * this.gridHeightCells).fill(noData)
                  };

                  for(let localX = 0; localX < ncols; localX++) {
                    for(let localY = 0; localY < nrows; localY++) {
                      let globalIndex = this.getIndex(minCentroid.xIndex + localX, minCentroid.yIndex - localY);
                      let localIndex = getLocalIndex(localX, localY);
                      parsedData.values[globalIndex] = vals[localIndex];
                    }
                  }
                }

                
              }
              
              else {
                //get range of grid, ensure in bounds
                let maxXOffset = ncols * cellSize;
                let maxYOffset = nrows * cellSize;
                let maxX = xCorner + maxXOffset;
                let maxY = yCorner + maxYOffset;

                let maxCentroid = getCentroidComponentIndices(maxX, maxY);
                //check if max corner centroid valid, reject if it isn't
                if(maxCentroid.xIndex < 0 || maxCentroid.yIndex < 0) {
                  reject();
                }

                parsedData = {
                  nodata: noData,
                  //initialize to full grid size array with all noData values
                  values: new Array(this.gridWidthCells * this.gridHeightCells).fill(noData)
                };

                //DO OTHER THINGS

                //need to get cells of all values since won't align even after shifted
                //higher resolution, overlap and overwrite
                if(cellSize < 75) {
                  for(let i = 0; i < ncols; i++) {
                    for(let j = 0; j < nrows; j++) {
                      //get containing cell
                      let xOffset = cellSize * i;
                      let yOffset = cellSize * j;
                      let x = xCorner + xOffset;
                      let y = yCorner + yOffset;
                      //find centroid coordinates
                      let centroid = getCentroidComponentIndices(x, y);
                      //put values in grid
                      let globalIndex = this.getIndex(centroid.xIndex, centroid.yIndex);
                      let localIndex = getLocalIndex(centroid.xIndex, centroid.yIndex);
                      parsedData.values[globalIndex] = vals[localIndex];
                    }
                  }
                  
                }
                //lower resolution, will have cells no covered, need to go back over and blend values
                else {
                  let lastCentroid: {xIndex: number, yIndex: number};
                  //put in all specified grid values
                  for(let i = 0; i < ncols; i++) {
                    for(let j = 0; j < nrows; j++) {
                      //get containing cell
                      let xOffset = cellSize * i;
                      let yOffset = cellSize * j;
                      let x = xCorner + xOffset;
                      let y = yCorner + yOffset;
                      //find centroid coordinates
                      let centroid = getCentroidComponentIndices(x, y);
                      //put values in grid
                      let globalIndex = this.getIndex(centroid.xIndex, centroid.yIndex);
                      let localIndex = getLocalIndex(centroid.xIndex, centroid.yIndex);
                      parsedData.values[globalIndex] = vals[localIndex];

                      if(centroid.xIndex == lastCentroid.xIndex) {
                        for(let betweenX = lastCentroid.xIndex + 1; betweenX < centroid.xIndex; betweenX++) {
                          globalIndex = this.getIndex(betweenX, centroid.yIndex);
                          localIndex = getLocalIndex(lastCentroid.xIndex, lastCentroid.yIndex);
                          parsedData.values[globalIndex] = vals[localIndex];
                        }
                      }
                      else {
                        for(let betweenX = lastCentroid.xIndex + 1; betweenX <= maxX; betweenX++) {
                          globalIndex = this.getIndex(betweenX, lastCentroid.yIndex);
                          localIndex = getLocalIndex(lastCentroid.xIndex, lastCentroid.yIndex);
                          parsedData.values[globalIndex] = vals[localIndex];
                        }
                        for(let betweenX = xCorner; betweenX < centroid.xIndex; betweenX++) {
                          globalIndex = this.getIndex(betweenX, centroid.yIndex);
                          localIndex = getLocalIndex(lastCentroid.xIndex, lastCentroid.yIndex);
                          parsedData.values[globalIndex] = vals[localIndex];
                        }
                      }
                      lastCentroid = centroid;
                    }
                  }

                  //go back over and fill in gaps
                  //can't do this... might have nodata values in provided grid, don't want to shove junk values in these

                  // let lastValue = 
                  // for(let localX = 0; localX < ncols; localX++) {
                  //   for(let localY = 0; localY < nrows; localY++) {
                  //     let globalIndex = this.getIndex(minCentroid.xIndex + localX, minCentroid.yIndex - localY);
                  //     if(parsedData.values[globalIndex] == noData) {
                  //       parsedData.values[globalIndex] = lastValue;
                  //     }
                  //     else {
                  //       lastValue = parsedData.values[globalIndex];
                  //     }
                  //   }
                  // }

                  //for now just leave like this (same as higher resolution), probably want to figure out a good way to fill out gaps
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
                }
                this.fileHandler.reader.onabort = (e) => {
                  reject();
                }

                this.fileHandler.reader.onload = (e) => {
                  test(this.fileHandler.reader.result);
                }
                this.fileHandler.reader.readAsText(file);
              }
              else {
                reject();
              }

            }
          }
          //just reject if bad format, should never get here
          else {
            reject();
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
              }

            });
              
            }
            else {
              if(++numProcessed >= files.length) {
                reject();
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
            }
            this.fileHandler.reader.onabort = (e) => {
              reject();
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
                  }

                });
              }, (e) => {
                if(++numProcessed >= info.files.length) {
                  reject();
                }
              });
            }
            else {
              if(++numProcessed >= info.files.length) {
                reject();
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

    console.log(info)
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
        })
      }
      else if(format == "covjson") {
        fcontents = JSON.stringify(data);
      }
  
      return fcontents
    }


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
    }

    

    let __this = this;

    if(info.shapes) {

      //get current details object and increment index
      let thisDetails = ready[index++];

      let zip = new JSZip();

      let shapes = this.drawnItems.toGeoJSON();
      // let name = "DefinedAreas";
  
      
      
      //redefine shp-write zip feature with desired file hierarchy
      //do you want to include lines or points? Don't actually do anything, maybe just remove these
      [shpWriteGeojson.point(shapes), shpWriteGeojson.line(shapes), shpWriteGeojson.polygon(shapes)].forEach(function (l) {
        console.log(l.type);
        if (l.geometries.length && l.geometries[0].length) {
          shpwrite.write(
            // field definitions
            l.properties,
            // geometry type
            l.type,
            // geometries
            l.geometries,
            function (err, files) {
              let fileName = "DefinedAreas";
              zip.file(fileName + '.shp', files.shp.buffer, { binary: true });
              zip.file(fileName + '.shx', files.shx.buffer, { binary: true });
              zip.file(fileName + '.dbf', files.dbf.buffer, { binary: true });
              zip.file(fileName + '.prj', shpWritePrj);
            }
          );
        }
      });

      //CHANGE
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
      })
    }

    

    if(info.recharge) {

      //get current details object and increment index
      let thisDetails = ready[index++];

      //generate file details
      thisDetails.data = genDataFileContents("recharge", info.format);
      thisDetails.fname = "recharge." + info.format;
      thisDetails.type = 'text/plain;charset=utf-8';

      //signal ready
      thisDetails.ready = true;
    }

    if(info.cover) {

      //get current details object and increment index
      let thisDetails = ready[index++];

      //generate file details
      thisDetails.data = genDataFileContents("landCover", info.format);
      thisDetails.fname = "cover." + info.format;
      thisDetails.type = 'text/plain;charset=utf-8';

      //signal ready
      thisDetails.ready = true;

    }
    

    //check if all items are ready, and download if they are
    let allReady = true;
    ready.forEach((item) => {
      allReady = item.ready && allReady;
    });
    if(allReady) {
      genAndDownloadPackage();
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

    this.mymap.addLayer(this.drawnItems);
    //this.mymap.addLayer(this.editableItems);

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
    this.mymap.addControl(this.drawControl);

    this.mymap.on(L.Draw.Event.DELETED, (event) => {
      event.layers.eachLayer((layer) => {
        //remove layers from layers not controled by the draw edit controls
        this.drawnItems.removeLayer(layer)
        this.highlightedItems.removeLayer(layer)
        this.uneditableItems.removeLayer(layer)
      });
      
      if(Object.keys(event.layers._layers).length > 0) {
        //NEED TO CHANGE THIS WHEN CREATE IMPROVED METRICS UPDATE
        //RIGHT NOW RECOMPUTES EVERYTHING SO FINE, BUT NEED TO CREATE REFERENCE TO METRIC OBJECTS TO JUST REMOVE
        this.updateMetrics(event.layers.toGeoJSON());
      }
    });

    //remove individual cells from edit control (can be deleted but not edited)
    this.mymap.on(L.Draw.Event.EDITSTART, (event) => {
      this.uneditableItems.eachLayer((layer) => {
        this.drawnItems.removeLayer(layer);
      })
      //removed from visible layer so add to map temporarily
      this.uneditableItems.addTo(this.mymap);
    });
    //add back when editing complete
    this.mymap.on(L.Draw.Event.EDITSTOP, (event) => {
      //remove added shapes from map so not included twice
      this.mymap.removeLayer(this.uneditableItems);
      //add back shapes to edit control
      this.uneditableItems.eachLayer((layer) => {
        this.drawnItems.addLayer(layer);
      })
    });

    //if anything edited update metrics
    this.mymap.on(L.Draw.Event.EDITED, (event) => {
      if(Object.keys(event.layers._layers).length > 0) {
        this.updateMetrics(event.layers.toGeoJSON());
      }
    });

    this.mymap.on(L.Draw.Event.CREATED, (event) => {
      //console.log(event.layer);
      if (event.layerType == "marker") {
        let bounds = this.getCell(event.layer._latlng);
        //check if was out of map boundaries, do nothing if it was
        if (bounds) {
          this.addDrawnItem(new L.Rectangle(bounds), false);
        }
      }
      else {
        this.addDrawnItem(event.layer)
      }

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
  private addDrawnItem(layer, editable: boolean = true) {

    //this.downloadShapefile(this.drawnItems)

    let __this = this;

    let highlight = {
      fillColor: 'black',
      weight: 5,
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
    //this.loadcovJSON("Kiawe", this.mymap, this.layers);
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
    //add custom naming options later, for now just name by number
    info.name = "Custom Area " + (__this.customAreasCount++).toString();
    let itemMetrics = this.getMetricsSuite(this.getInternalIndexes(items.addLayer(layer).toGeoJSON()));

    info.metrics = itemMetrics;
    info.roundedMetrics = this.roundMetrics(itemMetrics);

    this.metrics.customAreas.push(info);

    //update custom areas total
    //can definately improve upon this
    let customTotal = this.getMetricsSuite(this.getInternalIndexes(this.drawnItems.toGeoJSON()));
    this.metrics.customAreasTotal.metrics = customTotal;
    this.metrics.customAreasTotal.roundedMetrics = this.roundMetrics(customTotal);
  }




  private addInteractionToLayer(layer: any, emitMetrics: boolean, __this) {
    let highlight = {
      fillColor: 'black',
      weight: 5,
      opacity: 1,
      color: 'black',  //Outline color
      fillOpacity: 0.2
    };
    let unhighlight = {
      weight: 5,
      opacity: 0.5,
      color: 'black',  //Outline color
      fillOpacity: 0
    }

    layer.on('click', function () {
      if (this.highlighted) {
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


    this.mymap.invalidateSize();
  }

  //can update recharge on select, all handled async, so shouldn't be an issue as long as landcover update handled in app
  //speaking of which, need to know how indexing works and write in-app computation of grid cells to change from that
  private updateRecharge(geojsonObjects: any, handler: any) {

    let numItems = this.highlightedItems.getLayers().length;

    if (numItems != 0) {
      //deal with errors too

      Observable.forkJoin(geojsonObjects.features.map(element => {
        return this.DBService.spatialSearch(element.geometry)
      }))
        .subscribe((data) => {
          //console.log(typeof data);
          //use file(s) generated as cover
          handler(data);
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
      
      if(type == "advanced") {

        //NEED TO ASK IF TYPE 0 (BACKGROUND) VALID LAND COVER IN DATA SET (IS INDEX 0 BACKGROUND IN DB?)
        //it is

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
                      rechargeData[index] = recordBase[this.currentScenario][mappedType];
                    });
                  });
                  //reload recharge cover
                  this.loadCover(this.types.recharge, true)
          
                  this.updateMetrics(geojsonObjects);
                  //reenable report generation
                })
                
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
          rechargeData[index] = this.types.recharge.baseData[index];
        });
        this.loadCover(this.types.landCover, false);
        this.loadCover(this.types.recharge, false);


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
              //does the array include base? if not have to shift
              rechargeData[index] = recordBase[this.currentScenario][COVER_ENUM[type]];
            });
          });
          //reload recharge cover
          this.loadCover(this.types.recharge, true)

          this.updateMetrics(geojsonObjects);
          //reenable report generation
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
      //array due to potential cutouts, shouldn't have any cutouts
      let pointsBase = shape.geometry.coordinates[0];
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
      this.mymap.removeControl(coverage.layer);
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
      if (legend) {
        C.legend(layer).addTo(this.mymap);
      }
    })
    .setOpacity(this.opacity);
    //uses base layers now
    // //ensure recharge layer on top (don't want to have to remove covers to view it)
    // if(this.types.recharge.layer != undefined) {
    //   this.types.recharge.layer.bringToFront();
    // }
    //recharge disabled by default

    //a bit sketchy, might want to change to keep current layer, though might not ever happen if can't update in recharge (should still change it)
    if(coverage != this.types.recharge) {
      layer.addTo(this.mymap);
      this.baseLayer = {
        name: "Land Cover",
        layer: layer
      };
    }

    this.layers.addBaseLayer(layer, coverage.label);
    coverage.layer = layer;

  }


  // public changeCover(cover: string){
  //   this.loadcovJSON(cover, this.mymap, this.layers);
  // }

  public changeScenario(type: string) {
    this.currentScenario = type;
  }

  //generate 31 colors
  private colorPalette(): string[] {
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

  private getIndex(x: number, y: number, __this = this): number {
    return y * __this.gridWidthCells + x;
  }
}


