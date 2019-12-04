import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, Route } from '@angular/router';
import * as Platform from "platform";

@Injectable({
  providedIn: 'root'
})
export class BrowserGuard implements CanActivate {

  constructor(private router: Router) { }

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    let compatible: boolean = true;
    if(!this.getBrowserCompatible()) {
      this.router.navigate(["/browser_error"]);
      compatible = false;
    }
    return compatible;
  }

  getBrowserCompatible(): boolean {
    let isCompatible = false;
    let compatibleBrowsers = ["chrome", "firefox", "safari"];
    let name = Platform.name.toLowerCase();
    if(name == undefined) {
      name = "other";
    }
    for(let i = 0; i < compatibleBrowsers.length; i++) {
      if(compatibleBrowsers[i] == name) {
        isCompatible = true;
        break;
      }
    }
    return isCompatible;
  }
}
