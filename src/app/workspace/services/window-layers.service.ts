import { Injectable } from '@angular/core';

@Injectable()
export class WindowLayersService {

  constructor() {
  }

  private zIndex = 0;
  
  getTopZIndex() {
    return this.zIndex++;
  }

}
