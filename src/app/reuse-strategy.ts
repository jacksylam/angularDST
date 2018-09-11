import {ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy} from '@angular/router';

export class CustomReuseStrategy implements RouteReuseStrategy {
  
    readonly cachedRoutes = ["workspace"]
    cachedRouteHandles: any = {}

    shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
        return future.routeConfig === curr.routeConfig;
     }

    shouldDetach(route: ActivatedRouteSnapshot): boolean {
        return this.cachedRoutes.includes(route.routeConfig.path);
    }

    store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
        this.cachedRouteHandles[route.routeConfig.path] = handle;
    }

    shouldAttach(route: ActivatedRouteSnapshot): boolean {
        return this.cachedRouteHandles[route.routeConfig.path] != undefined;
     }
    
     retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle {
        return this.cachedRouteHandles[route.routeConfig.path];
     }
}