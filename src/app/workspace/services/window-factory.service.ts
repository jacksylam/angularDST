import { Injectable } from '@angular/core';
import { DisplayUnitComponent } from '../components/window-display-components/display-unit/display-unit.component'

@Injectable()
export class WindowFactoryService {

   //put this in service instead, have foreach method to get details
  //WindowComponent interface, implemented by VisWindowComponent and ReportWindowComponent with all positional data, titles, etc.
  //have superclass displayUnit, provides window-specific services, ID/displayNumber, and contains an object with constituent VisWindow and ReportWindow (can be null, displays when not null)
  
  //For display unit in the array, generate a DisplayWrapperComponent
  //DisplayWrapperComponent only creates a DisplayUnit (wrapper avoids complexity of having to store all DisplayUnit properties)
  //has @Input accepting a DisplayUnit, and sets its DisplayUnit to this if provided an input, otherwise creates a new one
  static DISPLAY_UNITS: DisplayUnitComponent[] = [];
  //also add methods for adding and removing displayunits from this array in service

  constructor() { }

  foreach(duHandler: (unit: DisplayUnitComponent) => void) {
    WindowFactoryService.DISPLAY_UNITS.forEach(unit => {
      duHandler(unit);
    });
  }

  addUnit(unit: DisplayUnitComponent) {
    WindowFactoryService.DISPLAY_UNITS.push(unit);
  }

  

}
