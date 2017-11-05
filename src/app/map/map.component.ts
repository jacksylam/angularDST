import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import {MapService} from '../map/shared/map.service';
import { PapaParseService } from 'ngx-papaparse';
import {Http} from '@angular/http';
import 'rxjs/add/operator/map'

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
    this.mymap.setZoom(10);


    // this.loadShapeFile();

    this.loadCSVFile();

    this.popup = L.popup();
    this.mymap.on('click', this.onMapClick);

    console.log(this.mapid.nativeElement.style.width);
    this.mapService.setMap(this);
    


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

  private loadCSVFile(){

    this.http.get('./assets/latlng1.csv' ).subscribe(data => {this.csvData = data;this.loadCsvToLayer()});
    
    // this.papa.parse(csvData,{
    //     complete: (results, file) => {
    //         console.log('Parsed: ', results, file);
    //     }
    // });
  }

  private loadCsvToLayer(){

    this.papa.parse(this.csvData._body, {
      complete: (results, file) => {
       

                for(let i = 1; i < results.data.length-1; i++){
                  L.marker([results.data[i][0], results.data[i][1]]).bindPopup(results.data[i][2]).openPopup().addTo(this.mymap);
                }
            }
    })
  }
}
