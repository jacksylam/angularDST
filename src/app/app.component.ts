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
  isCollapsed = false;

  constructor (private mapService: MapService) {
    //mapService.init();
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
  }

  ngAfterViewInit() {
    let __this = this;
    document.addEventListener('scroll', (e) => {
      __this.nav.nativeElement.style.left = window.pageXOffset + 'px';
    });
  }
}
