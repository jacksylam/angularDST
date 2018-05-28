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

  static aquiferIndices: number[]

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

  customAreasCount = 1;

  metrics: {
    customAreas: any[],
    aquifers: any[],
    customAreasTotal: any,
    total: any
  }

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
  }

  numCustomOverlays = 0;

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


  constructor(private DBService: DBConnectService, private mapService: MapService, private windowService: WindowService, private http: Http) {
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

    this.fileHandler = {
      reader: new FileReader(),
      working: [],
      busy: false
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
          this.mapService.updateMetrics(this, null, null, "full", this.types.recharge.baseData.length);
          this.disableShapeInteraction();
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
            diffx = diffx == 0 ? 0 : Math.floor(diffx / 75) * 75
            diffy = diffy == 0 ? 0 : Math.floor(diffy / 75) * 75

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

    let highlightedAquifers = L.featureGroup();

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
          highlightedAquifers.removeLayer(layer);
        }
        else {
          layer.setStyle(highlight)
          layer.highlighted = true;
          highlightedAquifers.addLayer(layer);
        }

        let originalRecharge = 0;
        let currentRecharge = 0;
        let rechargeVals = this.types.recharge.data._covjson.ranges.recharge.values;
        let indexes = this.getInternalIndexes(highlightedAquifers.toGeoJSON());
        let cells = indexes.length;
        indexes.forEach((index) => {
          originalRecharge += this.types.recharge.baseData[index];
          currentRecharge += rechargeVals[index];
        })
        this.mapService.updateMetrics(this, originalRecharge, currentRecharge, "aquifer", cells);
      });
    })

    this.mapService.updateMetrics(this, 0, 0, "aquifer", 0);

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
        diffx = diffx == 0 ? 0 : Math.floor(diffx / 75) * 75
        diffy = diffy == 0 ? 0 : Math.floor(diffy / 75) * 75

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
        this.getSelectedCellMetrics(index);
      }
    });

    this.mapService.updateMetrics(this, 0, 0, "cell", 0);
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

  private getSelectedCellMetrics(index: number) {
    let rechargeVals = this.types.recharge.data._covjson.ranges.recharge.values;
    this.mapService.updateMetrics(this, this.types.recharge.baseData[index], rechargeVals[index], "cell", 1);
  }

  private getSelectedShapeMetrics() {
    let originalRecharge = 0;
    let currentRecharge = 0;
    let rechargeVals = this.types.recharge.data._covjson.ranges.recharge.values;
    let indexes = this.getInternalIndexes(this.highlightedItems.toGeoJSON());
    let cells = indexes.length;
    indexes.forEach((index) => {
      originalRecharge += this.types.recharge.baseData[index];
      currentRecharge += rechargeVals[index];
    })
    this.mapService.updateMetrics(this, originalRecharge, currentRecharge, "custom", cells);
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

    this.mapService.updateMetrics(this, null, null, "full", this.types.recharge.baseData.length);
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
      __this.mapService.setTotalAndCurrentRecharge(__this, __this.types.recharge.baseData);
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






  


  // uploadLandCoverRaster(format: string, setDefault: boolean, file: any) {
  //     let __this = this;
  
  //     this.metrics = {
  //       customAreas: [],
  //       aquifers: [],
  //       customAreasTotal: {},
  //       total: {}
  //     }
  
  //     let metricCoordination = {
  //       rechargeVals: false,
  //       aquifers: false
  //     };
  
  //     if(format = "asc") {
  //       if (this.r) {
  //         //think can redefine onload function, if not working might have to reinitialize file reader
  //         this.r.onload = (e) => {
  //           //get data values after first six detail lines
  //           let data = this.r.result.split('\n')[6];
  //           //split on spaces, tabs, or commas for values
  //           let vals = data.split(/[ \t,]+/);

  //           this.types.landCover.data._covjson.ranges.cover.values = vals;
  //           if(setDefault) {
  //             //array of primitives, can deep copy with array.from
  //             this.types.landCover.baseData = Array.from(vals);
  //           }
  //         }
    
          
  //         this.r.readAsText(file);
          
  //       }
  //     }
  //     else {
  //       //PROBABLY NEED TO LOAD FROM 
  //       CovJSON.read(file).then(function (coverage) {
  
  //         __this.types.landCover.data = coverage;
          
  //         if(setDefault) {
  //           __this.types.landCover.baseData = Array.from(coverage._covjson.ranges.cover.values);
  //         }
    
  //         __this.loadCover(__this.types.landCover, false);
    
    
  //       });
  //     }
      
  // }
















  generateReport() {
    let data = this.metrics;
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
      customAreasTotal: {},
      total: {}
    };

    let items;

    let __this = this;
    
    let test = true;

    if(!MapComponent.aquiferIndices) {
      MapComponent.aquiferIndices = [];
      this.getAquiferIndices(this.types.aquifers);
      
      // let layer;
      // for(let key in this.types.aquifers.layer._layers) {
      //   layer = this.types.aquifers.layer._layers[key];
      //   break;
      // }
      //   items = new L.featureGroup();
      //   let indexes = this.getInternalIndexes(items.addLayer(layer).toGeoJSON());
      // console.log(indexes.length);
      
      //COMPLETE THIS

    }
    //again, make sure to go back and modify all full map metrics to disclude background cells
    data.total = this.getMetricsSuite(null);

    if(test) {
      return data;
    }
    

    //this.types.aquifers.layer.eachLayer((layer) => {
      let layer;
      for(let key in this.types.aquifers.layer._layers) {
        layer = this.types.aquifers.layer._layers[key];
        break;
      }
      console.log(layer);
      

      let info = {
        name: "",
        metrics: {}
      };
      items = new L.featureGroup();

      let capName = layer.feature.properties.SYSTEM;
      //switch from all upper case to capitalize first letter
      capName.split(/([\s \-])/).forEach((substr) => {
        info.name += (substr == "\s" || substr == "-") ? substr : substr.charAt(0).toUpperCase() + substr.substr(1).toLowerCase();
      });
      // setTimeout(() => {
      //   info.metrics = this.getMetricsSuite(items.addLayer(layer));
      //   data.aquifers.push(info);
      // }, 1000)
      
    //});
    
    this.drawnItems.eachLayer((layer) => {
      let info = {
        name: "",
        metrics: {}
      };
      items = new L.featureGroup();
      //add custom naming options later, for now just name by number
      info.name = "Custom Area " + (__this.customAreasCount++).toString();
      //info.metrics = this.getMetricsSuite(items.addLayer(layer));

      data.customAreas.push(info);
    });

    //can make more efficient by computing individual shape metrics and full metrics at the same time
    //figure out how to generalize as much as possible without adding too much extra overhead and use same function for everything
   // data.customAreasTotal = this.getMetricsSuite(this.drawnItems);

    //again, make sure to go back and modify all full map metrics to disclude background cells
    data.total = this.getMetricsSuite(null);


    return data;
  }






  private getAquiferIndices(aquifers: any): any {
    //let aquiferIndexes: any;

    
    
    //let layers = []

    for(let key in aquifers.layer._layers) {
      let indexes = [];
      
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

          //console.log(minOffset);
          //console.log(maxOffset);

          return indices;
        }

        let task = (chunk: number) => {
          //console.log(totalSize);
          if(chunk >= numChunks) {
            //console.log(indexes);
            return;
          }
          else {
            let range = chunkIndices(chunk);
            //console.log(range);

            /*
            2 cases:
            ranges minx == maxx, go from miny to maxy, end
            ranges minx != maxx, go from miny to maxyindex, if theres more than 2 x indexes, center cases go full range, last x index go from minyindex to ranges miny
            */

            if(range.minx == range.maxx) {
              let xIndex = range.minx;
              for (let yIndex = range.miny; yIndex < range.maxy; yIndex++) {
                if(this.isInternal(a, b, { x: xs[xIndex], y: ys[yIndex] })) {
                  //console.log("push");
                  indexes.push(this.getIndex(xIndex, yIndex));
                }
              }
            }
            

            else {
              let xIndex = range.minx;
              //start point to end of range for first index
              for (let yIndex = range.miny; yIndex < maxyIndex; yIndex++) {
                if(this.isInternal(a, b, { x: xs[xIndex], y: ys[yIndex] })) {
                  //console.log("push");
                  indexes.push(this.getIndex(xIndex, yIndex));
                }
              }

              //if center x indices go full y range
              for (let xIndex = range.minx + 1; xIndex < range.maxx; xIndex++) {
                for (let yIndex = minyIndex; yIndex < maxyIndex; yIndex++) {
                  //console.log(xIndex * chunk + yIndex);
                  if(this.isInternal(a, b, { x: xs[xIndex], y: ys[yIndex] })) {
                    //console.log("push");
                    indexes.push(this.getIndex(xIndex, yIndex));
                    
                  }
                }
              }

              xIndex = range.maxx;
              //start of y range up to end point for final index
              for (let yIndex = minyIndex; yIndex < range.maxy; yIndex++) {
                if(this.isInternal(a, b, { x: xs[xIndex], y: ys[yIndex] })) {
                  //console.log("push");
                  indexes.push(this.getIndex(xIndex, yIndex));
                }
              }
            }
            

            // for (let xIndex = range.minx; xIndex < range.maxx; xIndex++) {
            //   for (let yIndex = range.miny; yIndex < range.maxy; yIndex++) {
            //     //console.log(xIndex * chunk + yIndex);
            //     if(this.isInternal(a, b, { x: xs[xIndex], y: ys[yIndex] })) {
            //       console.log("push");
            //       indexes.push(this.getIndex(xIndex, yIndex));
                  
            //     }
            //   }
            // }
            
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
    }
    //});

    
    //return indexes;
  }





  //could probably refactor to use this for generating and passing metrics to bottombar
  //also could use something similar to report generation for passing name and metric breakdown
  //maybe have subfunctions in generate report for different parts

  //also need to update all full map computations to disclude background cells
  getMetricsSuite(items: any) {
    let metrics = {
      originalIPY: 0,
      currentIPY: 0,
      originalMGPY: 0,
      currentMGPY: 0,
      cells: 0,
      difference: 0,
      pchange: 0
    }

    let roundedMetrics = {
      originalIPY: "",
      currentIPY: "",
      originalMGPY: "",
      currentMGPY: "",
      cells: "",
      difference: "",
      pchange: ""
    }

    let rechargeVals = this.types.recharge.data._covjson.ranges.recharge.values;
    

    let precision = 3;

    //pass in null if want whole map (just use arrays rather than shape)
    if (items == null) {

     
      
      for (let i = 0; i < rechargeVals.length; i++) {

        //let task = () => {
          metrics.currentIPY += rechargeVals[i];
          metrics.originalIPY += this.types.recharge.baseData[i];
        //}

//BREAK UP
        //requestidlecallback not working properly, try manual concession on events
        // if(this.concede) {
        //   while(this.concede) {
        //     setTimeout(() => {}, 100);
        //   }
          
        // }
        
        
      }
          
        //}, {timeout: 1000});
        
      

      metrics.cells = rechargeVals.length;
    }
    else {
      let indexes = this.getInternalIndexes(items.toGeoJSON());

      //number of cells enclosed
      metrics.cells = indexes.length;

      
      
      //get total IPY over cells
      indexes.forEach((index) => {

        //let task = () => {
          metrics.originalIPY += this.types.recharge.baseData[index];
          metrics.currentIPY += rechargeVals[index];
        //}
//BREAK UP
        //(window as any).requestIdleCallback(() => {

          

        //setTimeout(() => {task();}, 10000);
        //}, {timeout: 1000});
      });
    
    }

//PUT IN CALLBACK
    
      //compute metrics in MGPY
      metrics.originalMGPY = (metrics.originalIPY * 75 * 75 * 144) / (231 * 0.3048 * 0.3048 * 365 * 1000000);
      metrics.currentMGPY = (metrics.currentIPY * 75 * 75 * 144) / (231 * 0.3048 * 0.3048 * 365 * 1000000);

      //if no cells leave at default value of 0 to avoid dividing by 0
      if (metrics.cells > 0) {
        //average IPY summation over cells
        metrics.originalIPY /= metrics.cells;
        metrics.currentIPY /= metrics.cells;

        //get difference and percent change
        metrics.difference = metrics.currentMGPY - metrics.originalMGPY;
        //make sure not dividing by 0 if no recharge in selected cells
        metrics.pchange = metrics.originalMGPY == 0 ? 0 : metrics.difference / metrics.originalMGPY * 100;
      }

      roundedMetrics.originalIPY = metrics.originalIPY.toPrecision(precision);
      roundedMetrics.currentIPY = metrics.currentIPY.toPrecision(precision);
      roundedMetrics.originalMGPY = metrics.originalMGPY.toPrecision(precision);
      roundedMetrics.currentMGPY = metrics.currentMGPY.toPrecision(precision);
      roundedMetrics.cells = metrics.cells.toString();
      roundedMetrics.difference = metrics.difference.toPrecision(precision);
      roundedMetrics.pchange = metrics.pchange.toPrecision(precision);

    

    //console.log("test");
    return roundedMetrics;
  }
































  updateMetrics(updatedPoints) {
    let items;

    //assuming eachlayer returns same order every time, should correspond
    let i = 0;
    this.types.aquifers.layer.eachLayer((layer) => {
      items = new L.featureGroup();
      this.metrics.aquifers[i++].metrics = this.getMetricsSuite(items.addLayer(layer));
    })

    i = 0;
    this.drawnItems.eachLayer((layer) => {
      items = new L.featureGroup();
      this.metrics.customAreas[i++].metrics = this.getMetricsSuite(items.addLayer(layer));
    })

    this.metrics.customAreasTotal = this.getMetricsSuite(this.drawnItems);

    //again, make sure to go back and modify all full map metrics to disclude background cells
    this.metrics.total = this.getMetricsSuite(null);

  }
































  setWindowId(id: number) {
    this.windowId = id;
  }




  upload(info: any) {
    this.verifyFilesAndGetData(info).then((data) => {
      console.log(data);
      console.log(info);

      if(info.shapes) {
        if(data.shapes != null) {
          if(info.format == "custom") {
            if(data.shapes.isArray()) {
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
          this.types.landCover.data._covjson.ranges.cover.values = data.cover;
          if(info.overwrite) {
            //array of primitives, can deep copy with array.from
            this.types.landCover.baseData = Array.from([]);
          }
          this.loadCover(this.types.landCover, false);

          //NEED TO UPDATE RECHARGE AS WELL, ASK SEAN ABOUT FORMAT OF QUERY
        }
      }


      //ignore not found values for now, need to implement error message
      //generate error message based on not found list here


    }, (message) => {
      //fail if already uploading
      //give error asking user to wait for current upload to finish

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


    let verify = (zipped: boolean, file: any, format: string) => {
      console.log(format);

      

      let verification = new Promise((accept, reject) => {


        
        //wait until all previous items in the queue verified
        Promise.all(this.fileHandler.working.slice(0, position - 1)).then(() => {

          let test: (data) => void;

          //should be shapefile if zip
          if(format == "zip") {

            let test = (data) => {
              shp(data).then((geojson) => {
                console.log("im also not a failure")
                
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
              }, () => {
                //shp couldn't parse at all, reject
                reject();
              });
            }

            console.log("test");
            //need to use jszip async method to read zip files
            if(zipped) {
              console.log("in here")
              file.async('arraybuffer').then((data) => {
                console.log("im not a failure")
                console.log(data);
                
                test(data);

              });
            }
            else {
              console.log("???");
              if(this.fileHandler.reader) {
                //think can redefine onload function, if not working might have to reinitialize file reader
                this.fileHandler.reader.onload = (e) => {
                  //console.log(this.r.result);
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

            console.log("test");
            if(zipped) {
              file.async('text').then((data) => {
                test(JSON.parse(data));
              });
            }
            else {
              if (this.fileHandler.reader) {
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
              //get data values after first six detail lines
              let valChunk = data.split('\n')[6];
              //split on spaces, tabs, or commas for values
              let vals = valChunk.split(/[ \t,]+/);

              //verify number of values
              if(vals.length != this.gridWidthCells * this.gridHeightCells) {
                reject();
              }
              //ensure values valid
              vals.forEach((value) => {
                if(!value.isInteger || value < this.validLandcoverRange.min || value > this.validLandcoverRange.max) {
                  reject()
                }
              });
              //if everything looks good accept, passing back the value array
              accept(vals);
            }


            if(zipped) {
              file.async('text').then((data) => {
                test(data)
              });
            }
            else {
              if (this.fileHandler.reader) {
                this.fileHandler.reader.onload = (e) => {
                  test(this.fileHandler.reader.result);
                }
                this.fileHandler.reader.readAsText(file);
              }
              else {
                reject()
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
      console.log(acceptFormats)
      return new Promise((accept, reject) => {

        let numProcessed = 0;

        for(let i = 0; i < files.length; i++) {
          let type = getType(files[i].name); 
          console.log(type);       
          //console.log(type);
          //check if file extension indicates acceptible format
          if(acceptFormats.includes(type)) {
            console.log(type);
            //verify the file to be desired format
            verify(zipped, files[i], type).then((data) => {

              console.log("verified");
              //accept with returned data if file verified
              accept(data);

            }, () => {
              //increment number processed (and failed) and check if all others failed
              //reject if all failed
              if(++numProcessed >= files.length) {
                console.log(files.length)
                reject();
              }
              console.log(numProcessed)

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

      let zippedFiles = new Promise((resolve) => {
        //push this functions promise into queue, get position in queue
        
        //wait until all previous items in the queue verified
        console.log();
        Promise.all(this.fileHandler.working.slice(0, position - 1)).then(() => {
          let files = []
          console.log(this.fileHandler.working);

          if (this.fileHandler.reader) {
            this.fileHandler.reader.onload = (e) => {
              let zipFiles = new JSZip();

              let data = this.fileHandler.reader.result;

              console.log("before read");

              zipFiles.loadAsync(data).then((contents) => {
                console.log("after read");
                Object.keys(contents.files).forEach((name) => {
                  files.push(contents.files[name]);
                });
                resolve(files)
              });
            }

            this.fileHandler.reader.readAsArrayBuffer(zip);
          }
        });
      });
      let position = this.fileHandler.working.push(zippedFiles);
      console.log(position);
      console.log(this.fileHandler.working.slice(0, position))
      return zippedFiles;
    }


    let process = (type: string) => {
      console.log(type)
      return new Promise((accept, reject) => {


        let acceptedFormats = type == "cover" ? ["covjson", "asc"] : ["zip"];

        //need to read files in verify, no need to reread, just return desired data

        //check top level files for valid file

        //MAKE FILE VERIFICATION RESOLVE WITH DESIRED DATA IF FILE FOUND, AND REJECT OTHERWISE
        let check = checkFiles(false, acceptedFormats, info.files).then((data) => {
          //valid file found, resolve with the file's data
          accept(data);
        }, () => {
          console.log("check rejected")
          let numProcessed = 0;

          //valid file not found in top level, check zipped files
          for(let i = 0; i < info.files.length; i++) {
            let type = getType(info.files[i].name);
            //find zip files
            if(type == "zip") {
              console.log("get zip");
              //get the zipped files and check them
              getZippedFiles(info.files[i]).then((files) => {

                console.log("got zip");

                checkFiles(true, acceptedFormats, files as any[]).then((data) => {

                  accept(data)

                }, () => {

                  //increment number processed (and failed) and check if all others failed
                  //reject if all failed
                  if(++numProcessed >= info.files.length) {
                    reject();
                  }

                });
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
      //
      if(this.fileHandler.busy) {
        reject("Upload failed. Another upload is already in progress, please wait until this upload completes.\nIf this error message is persistent please refresh the page and try again")
      }

      else {
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

              console.log(values);

              data.shapes = values;
              resolve();
              
            }, () => {
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

              console.log(values);

              data.cover = values;
              resolve();
              
            }, () => {
              data.notFound.push("cover");
              resolve();
            });
          }));




        /////////////////////////////////////////////////////////////////////////////////////////////////



          // //if valid file never found indicate cover could not be found
          // if(check == null) {
          //   details.notFound.push("cover");
          // }
          // else {
          //   console.log(check);
          // }

        }

        Promise.all(parsing).then(() => {
          //reset working queue, don't want to remove inline since using Promise.all for coordination (if remove might mess up function)
          this.fileHandler.working = []
          //indicate upload complete
          this.fileHandler.busy = false;
          accept(data);
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
    
        //add data
        vals.forEach((val) => {
          fcontents += val + " "
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
      })
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
      diffx = diffx == 0 ? 0 : Math.floor(diffx / 75) * 75
      diffy = diffy == 0 ? 0 : Math.floor(diffy / 75) * 75

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
      metrics: {}
    };
    let items = new L.featureGroup();
    //add custom naming options later, for now just name by number
    info.name = "Custom Area " + (__this.customAreasCount++).toString();
    info.metrics = this.getMetricsSuite(items.addLayer(layer));

    this.metrics.customAreas.push(info);
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
  private updateRecharge(cover: string, handler) {

    let numItems = this.highlightedItems.getLayers().length;

    if (numItems != 0) {
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
  }


  private updateCover(type: string) {

    //test download
    //this.downloadShapefile(this.highlightedItems.toGeoJSON());


    //type base indicates should be changed back to base values
    if (type == "base") {
      let covData = this.types.landCover.data._covjson.ranges.cover.values;
      let rechargeData = this.types.recharge.data._covjson.ranges.recharge.values;
      let indexes = this.getInternalIndexes(this.highlightedItems.toGeoJSON());
      indexes.forEach(index => {
        covData[index] = this.types.landCover.baseData[index];
        rechargeData[index] = this.types.recharge.baseData[index];
      });
      this.loadCover(this.types.landCover, false);
      this.loadCover(this.types.recharge, false);
    }
    else {
      //let __this = this;
      //might as well update recharge as well, async so shouldnt affect performance of core app

      //also may need to add some sort of block that releases when finished (eg a boolean switch) to ensure reports generated include all changes (wait until async actions completed)

      //should grey out report generation button while this is going
      //might also want to add some sort of loading indicator
      let rechargeVals = this.types.recharge.data._covjson.ranges.recharge.values;

      this.updateRecharge(type, (update) => {
        update.forEach(area => {
          //how does it behave if out of coverage range? chack db response and modify so doesn't throw an error
          area.forEach(record => {
            let recordBase = record.value;
            let x = recordBase.x;
            let y = recordBase.y;
            let index = this.getIndex(x, y);
            //does the array include base? if not have to shift
            rechargeVals[index] = recordBase[this.currentScenario][COVER_ENUM[type]];
          });
        });
        //reload recharge cover
        this.loadCover(this.types.recharge, true)

        //handle recharge sums (aquifers and total) here
        this.mapService.updateRechargeSum(this, rechargeVals);


        this.updateMetrics(null);
        //reenable report generation
      });

      let data = this.types.landCover.data._covjson.ranges.cover.values;
      let indexes = this.getInternalIndexes(this.highlightedItems.toGeoJSON());
      indexes.forEach(index => {
        data[index] = COVER_ENUM[type];
      });

      //reload layer from changes
      this.loadCover(this.types.landCover, false);
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
          //see how behaves, probably need this back
          // this.legend = C.legend(layer);
          // this.legend.addTo(this.mymap);
          C.legend(layer)
            .addTo(this.mymap);
        }
      })
      .setOpacity(this.opacity)
    //uses base layers now
    // //ensure recharge layer on top (don't want to have to remove covers to view it)
    // if(this.types.recharge.layer != undefined) {
    //   this.types.recharge.layer.bringToFront();
    // }
    //recharge disabled by default

    //a bit sketchy, might want to change to keep current layer, though might not ever happen if can't update in recharge (should still change it)
    if (coverage != this.types.recharge) {
      layer.addTo(this.mymap);
      this.baseLayer = {
        name: "Land Cover",
        layer: layer
      }
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
    let palette = []
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


