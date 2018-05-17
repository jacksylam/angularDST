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

  r: FileReader;


  constructor(private DBService: DBConnectService, private mapService: MapService, private windowService: WindowService, private http: Http) {
    //should put all these in constructors to ensure initialized before use
    this.mapService.setMap(this);
  }

  ngOnInit() {

  }

  ngAfterViewInit() {

    this.mymap = L.map(this.mapid.nativeElement).setView([21.512, -157.96664], 15);

    var mapLayer = L.esri.basemapLayer('Imagery').addTo(this.mymap);
    //create empty layer for displaying base map
    var empty = L.featureGroup();

    this.loadDrawControls();

    this.popup = L.popup();

    //thinking I like the collapsed version with this stuff
    this.layers = L.control.layers({ "Base Map": empty }, null/*, {collapsed: false}*/).addTo(this.mymap)

    this.initializeLayers();

    this.r = new FileReader();

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
          var convertedMousePoint = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [e.latlng.lng, e.latlng.lat]);
          //round x and y values to nearest multiple of 75 offset from first x/y value, then find position of grid cell that corresponds to this value from stored cover file
          var data = this.types.landCover.data._covjson.ranges.cover.values;
          var xs = this.types.landCover.data._covjson.domain.axes.get("x").values;
          var ys = this.types.landCover.data._covjson.domain.axes.get("y").values;

          //get difference from min to mouse position
          var diffx = convertedMousePoint[0] - this.xmin;
          var diffy = convertedMousePoint[1] - this.ymin;
          //do nothing if out of range of grid
          if (diffx >= 0 && diffy >= 0 && diffx <= this.xrange && diffy <= this.yrange) {

            //round down to nearest 75
            diffx = diffx == 0 ? 0 : Math.floor(diffx / 75) * 75
            diffy = diffy == 0 ? 0 : Math.floor(diffy / 75) * 75

            //get cell boundaries as geojson object to draw on map
            //cell corners
            var c1 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [this.xmin + diffx, this.ymin + diffy]);
            var c2 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [this.xmin + diffx + 75, this.ymin + diffy]);
            var c3 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [this.xmin + diffx + 75, this.ymin + diffy + 75]);
            var c4 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [this.xmin + diffx, this.ymin + diffy + 75]);
            var cellBounds = {
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
            var xCellVal = this.xmin + 37.5 + diffx;
            var yCellVal = this.ymin + 37.5 + diffy;

            //find index of cell with coordinates
            var xIndex = xs.indexOf(xCellVal);
            var yIndex = ys.indexOf(yCellVal);

            //convert to data cell index
            var index = this.getIndex(xIndex, yIndex);

            //popup cell value
            var popup = L.popup({ autoPan: false })
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
    this.uploadShapefileAsCustom(e.dataTransfer.files);
    //console.log(e.dataTransfer.files);

  }

  uploadShapefileAsCustom(files: any[]) {
    //ensure reader initialized
    if (this.r) {
      //think can redefine onload function, if not working might have to reinitialize file reader
      this.r.onload = (e) => {
        //console.log(this.r.result);
        shp(this.r.result).then((geojson) => {
          //console.log(geojson);
          //array if multiple shapefiles, else single object
          if (Array.isArray(geojson)) {
            geojson.forEach(shpset => {
              this.parseAndAddShapes(shpset);
            });
          }
          else {
            this.parseAndAddShapes(geojson);
          }
        });
      }

      for (var i = 0; i < files.length; i++) {
        this.r.readAsArrayBuffer(files[i]);
      }
    }
  }


  uploadShapefileAsReference(files: any[]) {

    //name layer name of first file
    var fname = files[0].name;
    //strip extension
    fname = fname.substr(0, fname.lastIndexOf('.'));

    //ensure reader initialized
    if (this.r) {
      //think can redefine onload function, if not working might have to reinitialize file reader
      this.r.onload = (e) => {
        //console.log(this.r.result);
        shp(this.r.result).then((geojson) => {

          var refLayer = L.geoJSON();

          //array if multiple shpfiles
          if (Array.isArray(geojson)) {
            geojson.forEach((shpset) => {
              shpset.features.forEach(object => {
                refLayer.addData(object);
              })
            })

          }
          //else single element
          else {
            geojson.features.forEach(object => {
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
          this.layers.addOverlay(refLayer, fname);

        });
      }

      for (var i = 0; i < files.length; i++) {
        this.r.readAsArrayBuffer(files[i]);
      }
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
  private swapCoordinates(arrLevel: any[]) {
    //base case, values are not arrays
    if (!Array.isArray(arrLevel[0])) {
      var temp = arrLevel[0];
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
      var coordsBase = shape.geometry.coordinates;

      //swap coordinates, who wants consistent standards anyway?
      //different formats have different numbers of nested arrays, recursively swap values in bottom level arrays
      this.swapCoordinates(coordsBase);

      //multipolygons separated due to how shp-write package creates shapefiles, if problematic might have to heavily modify shp-write
      //also appears to be a bug where sometimes it packs multiple shapes as just a polygon, might need to chack where bottom level shape is and separate next level up
      if (shape.geometry.type == "MultiPolygon") {
        for (var i = 0; i < coordsBase.length; i++) {
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

    var highlightedAquifers = L.featureGroup();

    var highlight = {
      fillColor: 'black',
      weight: 5,
      opacity: 1,
      color: 'black',  //Outline color
      fillOpacity: 0.2
    };
    var unhighlight = {
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

        var originalRecharge = 0;
        var currentRecharge = 0;
        var rechargeVals = this.types.recharge.data._covjson.ranges.recharge.values;
        var indexes = this.getInternalIndexes(highlightedAquifers.toGeoJSON());
        var cells = indexes.length;
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
    var hidden = false;
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
      var convertedMousePoint = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [e.latlng.lng, e.latlng.lat]);
      //round x and y values to nearest multiple of 75 offset from first x/y value, then find position of grid cell that corresponds to this value from stored cover file
      var data = this.types.landCover.data._covjson.ranges.cover.values;
      var xs = this.types.landCover.data._covjson.domain.axes.get("x").values;
      var ys = this.types.landCover.data._covjson.domain.axes.get("y").values;

      //get difference from min to mouse position
      var diffx = convertedMousePoint[0] - this.xmin;
      var diffy = convertedMousePoint[1] - this.ymin;
      //do nothing if out of range of grid
      if (diffx >= 0 && diffy >= 0 && diffx <= this.xrange && diffy <= this.yrange) {

        //round down to nearest 75
        diffx = diffx == 0 ? 0 : Math.floor(diffx / 75) * 75
        diffy = diffy == 0 ? 0 : Math.floor(diffy / 75) * 75

        //get cell boundaries as geojson object to draw on map
        //cell corners
        var c1 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [this.xmin + diffx, this.ymin + diffy]);
        var c2 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [this.xmin + diffx + 75, this.ymin + diffy]);
        var c3 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [this.xmin + diffx + 75, this.ymin + diffy + 75]);
        var c4 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [this.xmin + diffx, this.ymin + diffy + 75]);
        var cellBounds = {
          "type": "Feature",
          "properties": {},
          "geometry": {
            "type": "Polygon",
            "coordinates": [[c1, c2, c3, c4, c1]]
          }
        };
        //should also make highlight styles global variables since used a lot
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
        var xCellVal = this.xmin + 37.5 + diffx;
        var yCellVal = this.ymin + 37.5 + diffy;

        //find index of cell with coordinates
        var xIndex = xs.indexOf(xCellVal);
        var yIndex = ys.indexOf(yCellVal);

        //convert to data cell index
        var index = this.getIndex(xIndex, yIndex);
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
    var rechargeVals = this.types.recharge.data._covjson.ranges.recharge.values;
    this.mapService.updateMetrics(this, this.types.recharge.baseData[index], rechargeVals[index], "cell", 1);
  }

  private getSelectedShapeMetrics() {
    var originalRecharge = 0;
    var currentRecharge = 0;
    var rechargeVals = this.types.recharge.data._covjson.ranges.recharge.values;
    var indexes = this.getInternalIndexes(this.highlightedItems.toGeoJSON());
    var cells = indexes.length;
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
    var __this = this;

    this.metrics = {
      customAreas: [],
      aquifers: [],
      customAreasTotal: {},
      total: {}
    }

    var metricCoordination = {
      rechargeVals: false,
      aquifers: false
    };

    
    CovJSON.read(MapComponent.landCoverFile).then(function (coverage) {
      var xs = coverage._covjson.domain.axes.x.values;
      var ys = coverage._covjson.domain.axes.y.values;

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

        var aquifers = L.geoJSON();
        //two shape files, so array
        //might want to just remove "lines" shapefile
        geojson[0].features.forEach(aquifer => {

          //convert one point to UTM and check if in bounds (if one point in bounds the aquifer should be internal)
          var sampleCoord = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, aquifer.geometry.coordinates[0][0]);

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
      var rechargeVals = __this.types.recharge.data._covjson.ranges.recharge.values;

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






  downloadRaster(type: string, format: string) {

    var data = this.types[type].data._covjson;
    var fcontents;

    if(format == "asc") {
      var vals = type == "recharge" ? data.ranges.recharge.values :  data.ranges.cover.values;
      
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
    

    saveAs(new Blob([fcontents], {type: 'text/plain;charset=utf-8'}), type + "." + format);
  }


  uploadLandCoverRaster(format: string, setDefault: boolean, file: any) {
      var __this = this;
  
      this.metrics = {
        customAreas: [],
        aquifers: [],
        customAreasTotal: {},
        total: {}
      }
  
      var metricCoordination = {
        rechargeVals: false,
        aquifers: false
      };
  
      if(format = "asc") {
        if (this.r) {
          //think can redefine onload function, if not working might have to reinitialize file reader
          this.r.onload = (e) => {
            //get data values after first six detail lines
            var data = this.r.result.split('\n')[6];
            //split on spaces, tabs, or commas for values
            var vals = data.split(/[ \t,]+/);

            this.types.landCover.data._covjson.ranges.cover.values = vals;
            if(setDefault) {
              //array of primitives, can deep copy with array.from
              this.types.landCover.baseData = Array.from(vals);
            }
          }
    
          
          this.r.readAsText(file);
          
        }
      }
      else {
        //PROBABLY NEED TO LOAD FROM 
        CovJSON.read(file).then(function (coverage) {
  
          __this.types.landCover.data = coverage;
          
          if(setDefault) {
            __this.types.landCover.baseData = Array.from(coverage._covjson.ranges.cover.values);
          }
    
          __this.loadCover(__this.types.landCover, false);
    
    
        });
      }
      
  }
















  generateReport() {
    var data = this.metrics;
    var reportWindow = new WindowPanel("Report", "report", data);
    this.windowService.addWindow(reportWindow, this.windowId);
  }













  /*
  parts:
  get aquifer indices
  compute aquifer metrics
  compute full map metrics
  */

  createMetrics() {
    var data = {
      customAreas: [],
      aquifers: [],
      customAreasTotal: {},
      total: {}
    };

    var items;

    var __this = this;

    if(!MapComponent.aquiferIndices) {
      MapComponent.aquiferIndices = [];
      this.getAquiferIndices(this.types.aquifers);
      
      // var layer;
      // for(var key in this.types.aquifers.layer._layers) {
      //   layer = this.types.aquifers.layer._layers[key];
      //   break;
      // }
      //   items = new L.featureGroup();
      //   var indexes = this.getInternalIndexes(items.addLayer(layer).toGeoJSON());
      // console.log(indexes.length);
      
      //COMPLETE THIS

    }
    return;

    //this.types.aquifers.layer.eachLayer((layer) => {
      var layer;
      for(var key in this.types.aquifers.layer._layers) {
        layer = this.types.aquifers.layer._layers[key];
        break;
      }
      console.log(layer);
      

      var info = {
        name: "",
        metrics: {}
      };
      items = new L.featureGroup();

      var capName = layer.feature.properties.SYSTEM;
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
      var info = {
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
    //data.total = this.getMetricsSuite(null);


    return data;
  }






  private getAquiferIndices(aquifers: any): number[] {
    var aquiferIndexes: any;

    //var layers = []

    for(var key in aquifers.layer._layers) {
      var indexes = [];
      aquiferIndexes.key = indexes;

      // //console.log(aquifers.layer._layers[id])
      // var items = new L.featureGroup();
      // var test = this.getInternalIndexes(items.addLayer(aquifers.layer._layers[id]).toGeoJSON());
      // console.log(test.length);

      //var shape = aquifers;
      //array due to potential cutouts, shouldn't have any cutouts
      var pointsBase = aquifers.layer._layers[key].feature.geometry.coordinates[0];
      var convertedPoints = [];
      var a = [];
      var b = [];
      var xmax = Number.NEGATIVE_INFINITY;
      var xmin = Number.POSITIVE_INFINITY;
      var ymax = Number.NEGATIVE_INFINITY;
      var ymin = Number.POSITIVE_INFINITY;

      for (var i = 0; i < pointsBase.length; i++) {
        convertedPoints.push(MapComponent.proj4(MapComponent.longlat, MapComponent.utm, pointsBase[i]));
      }

      for (var i = 0; i < convertedPoints.length - 1; i++) {
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
      // var xmaxUTM = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [xmax_x, xmax_y])[0];
      // var xminUTM = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [xmin_x, xmin_y])[0];
      // var ymaxUTM = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [ymax_x, ymax_y])[1];
      // var yminUTM = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [ymin_x, ymin_y])[1];

      var xs = this.types.landCover.data._covjson.domain.axes.get("x").values;
      var ys = this.types.landCover.data._covjson.domain.axes.get("y").values;

      var minxIndex: number;
      var maxxIndex: number;
      var minyIndex: number;
      var maxyIndex: number;

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



      //var recursiveDepth = 10;

      var checkIndices = []

      //check if shape boundaries out of coverage range
      if (minxIndex != -1 && maxxIndex != -1 && minyIndex != -1 && maxyIndex != -1) {
        //convert cell coords to long lat and raycast
        //max index calculation returns index after last index in range, so only go to index before in loop (< not <=)
        // for (var xIndex = minxIndex; xIndex < maxxIndex; xIndex++) {
        //   for (var yIndex = minyIndex; yIndex < maxyIndex; yIndex++) {
        //     // if (this.isInternal(a, b, { x: xs[xIndex], y: ys[yIndex] })) {
        //     //   indexes.push(this.getIndex(xIndex, yIndex))
        //     // }
        //     checkIndices.push(this.getIndex(xIndex, yIndex));
        //   }
          
        // }


        //also recursive depth and should be approximate speedup factor for single action
        //need to balance this with total time taken though, speed will be about numChunks * timeoutInterval (depending on how long chunk processing takes)
        var numChunks = 100
        var timeoutInterval = 100;

        //compute chunk size
        var xrange = maxxIndex - minxIndex;
        var yrange = maxyIndex - minyIndex;
        var totalSize = xrange * yrange
        var chunkSize = Math.floor(totalSize / numChunks);
        //final chunk size may need to be larger if not divisible
        var finalChunkSize = chunkSize + (totalSize - chunkSize * numChunks)

        // console.log(minyIndex)
        // console.log(minxIndex)
        // console.log(yrange)
        // console.log(xrange)

        var chunkIndices = (chunk: number) => {
          var indices = {
            minx: 0,
            maxx: 0,
            miny: 0,
            maxy: 0
          };

          var thisChunkSize = chunk == numChunks - 1 ? finalChunkSize : chunkSize;
          
          var minOffset = chunk * chunkSize;
          var maxOffset = minOffset + thisChunkSize;
          indices.minx = minxIndex + Math.floor(minOffset / yrange);
          indices.miny = minyIndex + minOffset % yrange;
          indices.maxx = minxIndex + Math.floor(maxOffset / yrange);
          indices.maxy = minyIndex + maxOffset % yrange;

          //console.log(minOffset);
          //console.log(maxOffset);

          return indices;
        }

        var task = (chunk: number) => {
          //console.log(totalSize);
          if(chunk >= numChunks) {
            console.log(indexes);
            return;
          }
          else {
            var range = chunkIndices(chunk);
            //console.log(range);

            /*
            2 cases:
            ranges minx == maxx, go from miny to maxy, end
            ranges minx != maxx, go from miny to maxyindex, if theres more than 2 x indexes, center cases go full range, last x index go from minyindex to ranges miny
            */

            if(range.minx == range.maxx) {
              var xIndex = range.minx;
              for (var yIndex = range.miny; yIndex < range.maxy; yIndex++) {
                if(this.isInternal(a, b, { x: xs[xIndex], y: ys[yIndex] })) {
                  //console.log("push");
                  indexes.push(this.getIndex(xIndex, yIndex));
                }
              }
            }
            

            else {
              var xIndex = range.minx;
              //start point to end of range for first index
              for (var yIndex = range.miny; yIndex < maxyIndex; yIndex++) {
                if(this.isInternal(a, b, { x: xs[xIndex], y: ys[yIndex] })) {
                  //console.log("push");
                  indexes.push(this.getIndex(xIndex, yIndex));
                }
              }

              //if center x indices go full y range
              for (var xIndex = range.minx + 1; xIndex < range.maxx; xIndex++) {
                for (var yIndex = minyIndex; yIndex < maxyIndex; yIndex++) {
                  //console.log(xIndex * chunk + yIndex);
                  if(this.isInternal(a, b, { x: xs[xIndex], y: ys[yIndex] })) {
                    //console.log("push");
                    indexes.push(this.getIndex(xIndex, yIndex));
                    
                  }
                }
              }

              xIndex = range.maxx;
              //start of y range up to end point for final index
              for (var yIndex = minyIndex; yIndex < range.maxy; yIndex++) {
                if(this.isInternal(a, b, { x: xs[xIndex], y: ys[yIndex] })) {
                  //console.log("push");
                  indexes.push(this.getIndex(xIndex, yIndex));
                }
              }
            }
            

            // for (var xIndex = range.minx; xIndex < range.maxx; xIndex++) {
            //   for (var yIndex = range.miny; yIndex < range.maxy; yIndex++) {
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

        // var task = setInterval(() => {
          
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

    
    return indexes;
  }





  //could probably refactor to use this for generating and passing metrics to bottombar
  //also could use something similar to report generation for passing name and metric breakdown
  //maybe have subfunctions in generate report for different parts

  //also need to update all full map computations to disclude background cells
  getMetricsSuite(items: any) {
    var metrics = {
      originalIPY: 0,
      currentIPY: 0,
      originalMGPY: 0,
      currentMGPY: 0,
      cells: 0,
      difference: 0,
      pchange: 0
    }

    var roundedMetrics = {
      originalIPY: "",
      currentIPY: "",
      originalMGPY: "",
      currentMGPY: "",
      cells: "",
      difference: "",
      pchange: ""
    }

    var rechargeVals = this.types.recharge.data._covjson.ranges.recharge.values;
    

    var precision = 3;

    //pass in null if want whole map (just use arrays rather than shape)
    if (items == null) {

     
      setTimeout(() => {
      for (var i = 0; i < rechargeVals.length; i++) {

        //var task = () => {
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
        
      }, 1000);

      metrics.cells = rechargeVals.length;
    }
    else {
      var indexes = this.getInternalIndexes(items.toGeoJSON());

      //number of cells enclosed
      metrics.cells = indexes.length;

      
      setTimeout(() => {
      //get total IPY over cells
      indexes.forEach((index) => {

        //var task = () => {
          metrics.originalIPY += this.types.recharge.baseData[index];
          metrics.currentIPY += rechargeVals[index];
        //}
//BREAK UP
        //(window as any).requestIdleCallback(() => {

          

        //setTimeout(() => {task();}, 10000);
        //}, {timeout: 1000});
      });
    }, 1000);
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

    

    console.log("test");
    return roundedMetrics;
  }
































  updateMetrics(updatedPoints) {
    var items;

    //assuming eachlayer returns same order every time, should correspond
    var i = 0;
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
















  //NOTE: WHEN GETTING NEW NODE MODULES PROBABLY WILL NEED TO DOWNLOAD EARLIER VERSION, THEN REDOWNLOAD NEW ONE
  //shpwrite module uses an old version, whereas this uses newer methods
  //is there a workaround to make this work better?

  //default download drawn items
  downloadShapefile(shapes = this.drawnItems.toGeoJSON(), name = "DefinedAreas") {
    var __this = this;
    var zip = new JSZip();
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
            var fileName = "DefinedAreas";
            zip.file(fileName + '.shp', files.shp.buffer, { binary: true });
            zip.file(fileName + '.shx', files.shx.buffer, { binary: true });
            zip.file(fileName + '.dbf', files.dbf.buffer, { binary: true });
            zip.file(fileName + '.prj', shpWritePrj);
          }
        );
      }
    });


    zip.generateAsync({ type: "base64" }).then((file) => {
      saveAs(new Blob([this.base64ToArrayBuffer(file)], { type: "data:application/zip" }), name + ".zip")
    })


  }

  //convert base64 string produced by shp-write to array buffer for conversion to blob
  private base64ToArrayBuffer(base64) {
    var bs = window.atob(base64);
    var len = bs.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
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
        var bounds = this.getCell(event.layer._latlng);
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
    var convertedMousePoint = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [clickLocation.lng, clickLocation.lat]);

    var cellBounds = null;

    var data = this.types.landCover.data._covjson.ranges.cover.values;
    var xs = this.types.landCover.data._covjson.domain.axes.get("x").values;
    var ys = this.types.landCover.data._covjson.domain.axes.get("y").values;

    //get difference from min to mouse position
    var diffx = convertedMousePoint[0] - this.xmin;
    var diffy = convertedMousePoint[1] - this.ymin;
    //do nothing if out of range of grid
    if (diffx >= 0 && diffy >= 0 && diffx <= this.xrange && diffy <= this.yrange) {

      //round down to nearest 75
      diffx = diffx == 0 ? 0 : Math.floor(diffx / 75) * 75
      diffy = diffy == 0 ? 0 : Math.floor(diffy / 75) * 75

      //get cell boundaries as geojson object to draw on map
      //cell corners
      //only need first and third corners for rectangle object
      var c1 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [this.xmin + diffx, this.ymin + diffy]);
      // var c2 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [this.xmin + diffx + 75, this.ymin + diffy]);
      var c3 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [this.xmin + diffx + 75, this.ymin + diffy + 75]);
      // var c4 = MapComponent.proj4(MapComponent.utm, MapComponent.longlat, [this.xmin + diffx, this.ymin + diffy + 75]);
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

    var __this = this;

    var highlight = {
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


    var info = {
      name: "",
      metrics: {}
    };
    var items = new L.featureGroup();
    //add custom naming options later, for now just name by number
    info.name = "Custom Area " + (__this.customAreasCount++).toString();
    info.metrics = this.getMetricsSuite(items.addLayer(layer));

    this.metrics.customAreas.push(info);
  }




  private addInteractionToLayer(layer: any, emitMetrics: boolean, __this) {
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

    var numItems = this.highlightedItems.getLayers().length;

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
      var covData = this.types.landCover.data._covjson.ranges.cover.values;
      var rechargeData = this.types.recharge.data._covjson.ranges.recharge.values;
      var indexes = this.getInternalIndexes(this.highlightedItems.toGeoJSON());
      indexes.forEach(index => {
        covData[index] = this.types.landCover.baseData[index];
        rechargeData[index] = this.types.recharge.baseData[index];
      });
      this.loadCover(this.types.landCover, false);
      this.loadCover(this.types.recharge, false);
    }
    else {
      //var __this = this;
      //might as well update recharge as well, async so shouldnt affect performance of core app

      //also may need to add some sort of block that releases when finished (eg a boolean switch) to ensure reports generated include all changes (wait until async actions completed)

      //should grey out report generation button while this is going
      //might also want to add some sort of loading indicator
      var rechargeVals = this.types.recharge.data._covjson.ranges.recharge.values;

      this.updateRecharge(type, (update) => {
        update.forEach(area => {
          //how does it behave if out of coverage range? chack db response and modify so doesn't throw an error
          area.forEach(record => {
            var recordBase = record.value;
            var x = recordBase.x;
            var y = recordBase.y;
            var index = this.getIndex(x, y);
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

      var data = this.types.landCover.data._covjson.ranges.cover.values;
      var indexes = this.getInternalIndexes(this.highlightedItems.toGeoJSON());
      indexes.forEach(index => {
        data[index] = COVER_ENUM[type];
      });

      //reload layer from changes
      this.loadCover(this.types.landCover, false);
    }


  }

  private getInternalIndexes(geojsonFeatures: any): number[] {
    var indexes = [];
    geojsonFeatures.features.forEach(shape => {
      //array due to potential cutouts, shouldn't have any cutouts
      var pointsBase = shape.geometry.coordinates[0];
      var convertedPoints = [];
      var a = [];
      var b = [];
      var xmax = Number.NEGATIVE_INFINITY;
      var xmin = Number.POSITIVE_INFINITY;
      var ymax = Number.NEGATIVE_INFINITY;
      var ymin = Number.POSITIVE_INFINITY;

      for (var i = 0; i < pointsBase.length; i++) {
        convertedPoints.push(MapComponent.proj4(MapComponent.longlat, MapComponent.utm, pointsBase[i]));
      }

      for (var i = 0; i < convertedPoints.length - 1; i++) {
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
      // var xmaxUTM = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [xmax_x, xmax_y])[0];
      // var xminUTM = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [xmin_x, xmin_y])[0];
      // var ymaxUTM = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [ymax_x, ymax_y])[1];
      // var yminUTM = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [ymin_x, ymin_y])[1];

      var xs = this.types.landCover.data._covjson.domain.axes.get("x").values;
      var ys = this.types.landCover.data._covjson.domain.axes.get("y").values;

      var minxIndex;
      var maxxIndex;
      var minyIndex;
      var maxyIndex;

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
        for (var xIndex = minxIndex; xIndex < maxxIndex; xIndex++) {
          for (var yIndex = minyIndex; yIndex < maxyIndex; yIndex++) {
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
    var internal = false;
    for (var i = 0; i < a.length; i++) {
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

    //var xaxis = coverage._covjson.domain.axes.x.values;
    //var yaxis = coverage._covjson.domain.axes.y.values;

    // var test = [];
    // for(var i = 0; i < 100000; i++) {
    //   test.push(null);
    // }

    // rechargeVals.splice(100000, 100000, ...test);
    //console.log(coverage);
    // work with Coverage object
    var layer = C.dataLayer(coverage.data, { parameter: coverage.parameter, palette: coverage.palette })
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
    var palette = []
    var range = 255;
    var color;
    var r;
    var g;
    var b;
    var first = true;
    for (var i = 0; i < 4; i++) {
      for (var j = 0; j < 3; j++) {
        for (var k = 0; k < 3; k++) {
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

    for (i = 0; i < 30; i++) {
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


