import { Component, ViewChild, AfterViewInit } from '@angular/core';
import {MapService} from './map/shared/map.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements AfterViewInit {

  @ViewChild('nav') nav;
  
  title = 'app';

  constructor (private mapService: MapService) {
    mapService.init();
    

    
  }

  ngAfterViewInit() {
    var __this = this;
    document.addEventListener('scroll', (e) => {
      __this.nav.nativeElement.style.left = window.pageXOffset + 'px';
    });
  }
}
