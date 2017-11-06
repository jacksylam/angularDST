import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import {MapService} from '../map/shared/map.service';
import { PapaParseService } from 'ngx-papaparse';
import {Http} from '@angular/http';
import 'rxjs/add/operator/map';
import {Grid} from './shared/grid';

declare var L: any;


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

  constructor( private mapService: MapService, private papa: PapaParseService, private http: Http) { }

  ngOnInit() {
    this.shpfileString = './assets/shpfile/doh_aquifers';
    this.toggleShapeFile = true;


  }


  ngAfterViewInit() {

    this.mymap = L.map(this.mapid.nativeElement).setView([21.50414, -157.96664], 103);

    var layer = L.esri.basemapLayer('Imagery').addTo(this.mymap);
    this.mymap.setZoom(16);

    this.mymap.invalidateSize();


    this.loadShapeFile();


    this.popup = L.popup();
    this.mymap.on('click', this.onMapClick);


    this.mapService.setMap(this);
    

    this.loadMarkers();
  }

  onMapClick(e) {

    var popup = L.popup();

    popup
      .setLatLng(e.latlng)
      .setContent("You clicked the map at " + e.latlng.toString())
      .openOn(this);
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

  private loadMarkers(){
    let temp = this.mymap.getBounds();
    console.log(temp);
    console.log(this.mymap.getZoom());
    let markers: Grid[];
    
    // if(this.mymap.getZoom() >15){
      //load the markers
      // L.marker([results.data[i][0], results.data[i][1]]).bindPopup(results.data[i][2]).openPopup().addTo(this.mymap);
       markers = this.mapService.getMarkers(temp._southWest.lat, temp._southWest.lng, temp._northEast.lat, temp._northEast.lng);
     
      for(let i = 0; i < markers.length; i++){
        L.marker([markers[i].lat, markers[i].lng]).addTo(this.mymap);
      }
  }
}
