import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import {MapService} from '../map/shared/map.service';
import { PapaParseService } from 'ngx-papaparse';
import {Http} from '@angular/http';
import 'rxjs/add/operator/map';
import {Grid} from './shared/grid';



declare var L: any;
declare var CovJSON: any;
declare var C: any;


@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
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

  constructor( private mapService: MapService, private papa: PapaParseService, private http: Http) { }

  ngOnInit() {
    this.shpfileString = './assets/shpfile/doh_aquifers';
    this.toggleShapeFile = true;


  }


  ngAfterViewInit() {

    this.mymap = L.map(this.mapid.nativeElement).setView([21.512, -157.96664],15);

    var mapLayer = L.esri.basemapLayer('Imagery').addTo(this.mymap);
    // this.mymap.setZoom(20);
    this.mymap.setZoom(15);

    this.mymap.invalidateSize();


    // this.loadShapeFile();


    this.popup = L.popup();
    this.mymap.on('click', this.onMapClick);

    // this.mymap.on('zoomend', this.loadMarkers.bind(this));
    // this.mymap.on('moveend', this.loadMarkers.bind(this));

    this.mapService.setMap(this);

    this.layers = L.control.layers(null, null, {collapsed: false}).addTo(this.mymap)
    
    this.loadcovJSON("AlienForest", this.mymap, this.layer, this.layers);
    
  }



  private onMapClick(e) {

    // var popup = L.popup();

    // popup
    //   .setLatLng(e.latlng)
    //   .setContent("You clicked the map at " + e.latlng.toString())
    //   .openOn(this);

      
    //for coverjson
      new C.DraggableValuePopup({
        layers: [this.layer]
      }).setLatLng(e.latlng).openOn(this)
  }


  public resize(width: number, height: number) {

    
    this.mapid.nativeElement.style.height = height-60 + 'px';
    this.mapid.nativeElement.style.width = width;


    this.mymap.invalidateSize();
  }


  public changeShapeFile() {
    this.shpfile.remove();
    this.toggleShapeFile = !this.toggleShapeFile;
    if (this.toggleShapeFile) {
      this.shpfileString = './assets/shpfile/doh_aquifers';
    }
    if (!this.toggleShapeFile) {
      this.shpfileString = './assets/shpfile/doh_aquifers';

    }

    this.loadShapeFile();
  }




  private loadShapeFile() {
    this.shpfile = new L.Shapefile(this.shpfileString, {
      onEachFeature: function (feature, layer) {
        if (feature.properties) {
          layer.bindPopup(Object.keys(feature.properties).map(function (k) {
            return k + ": " + feature.properties[k];
          }).join("<br />"), {
              maxHeight: 200
            });
        }
      }
    });
    this.shpfile.addTo(this.mymap);

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

  private loadcovJSON(cover: string, mymap, layer, layers){

    let coverFile = this.getCoverFile(cover);
    
    CovJSON.read('./assets/covjson/'+coverFile).then(function(coverage) {
      // work with Coverage object
      layer = C.dataLayer(coverage, {parameter: 'recharge'})
      .on('afterAdd', function () {
        C.legend(layer).addTo(mymap)
      })
      .setOpacity(0.8)
      .addTo(mymap)
      layers.addOverlay(layer, 'Recharge');
    })
  }

  public changeCover(cover: string){
 
    //how to remove cover layer?

    this.loadcovJSON(cover, this.mymap, this.layer, this.layers);
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
    else if (cover === "Kiawae"){
      return "testfiles_sc0_4-fin.covjson";
    }
    else if(cover === "LowIntensity"){
      return "testfiles_sc0_5-fin.covjson";
    }
    else if(cover === "Native"){
      return "testfiles_sc0_6fin.covjson"
    }
  
  }
}
