import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import {MapService} from '../map/shared/map.service';

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

  constructor( private mapService: MapService) { }

  ngOnInit() {
    this.shpfileString = './assets/shpfile/dlnr_aquifers_poly';
    this.toggleShapeFile = true;


  }


  ngAfterViewInit() {

    this.mymap = L.map(this.mapid.nativeElement).setView([21.50414, -157.96664], 103);

    var layer = L.esri.basemapLayer('Imagery').addTo(this.mymap);
    this.mymap.setZoom(10);


    this.loadShapeFile();


    this.popup = L.popup();
    this.mymap.on('click', this.onMapClick);

    console.log(this.mapid.nativeElement.style.width);
    this.mapService.setMap(this);
    
  }

  onMapClick(e) {

    var popup = L.popup();

    console.log(popup);
    console.log(this);

    popup
      .setLatLng(e.latlng)
      .setContent("You clicked the map at " + e.latlng.toString())
      .openOn(this);
  }


  public resize(width: number, height: number) {

    // this.scrollableMenu.nativeElement.style.maxHeight = height - 60 + 'px';
    

    this.mapid.nativeElement.style.height = height-60 + 'px';
    // this.mapid.nativeElement.style.width = width - this.scrollableMenu.nativeElement.width + 'px';
    this.mapid.nativeElement.style.width = width;

    // this.scrollableMenu.nativeElement.style.maxHeight = height - 60 + 'px';


    this.mymap.invalidateSize();
  }


  public changeShapeFile() {
    this.shpfile.remove();
    this.toggleShapeFile = !this.toggleShapeFile;
    if (this.toggleShapeFile) {
      this.shpfileString = './assets/shpfile/dlnr_aquifers_poly';
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
}
