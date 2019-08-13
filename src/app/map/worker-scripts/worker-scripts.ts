//import * as test from '../../../../node_modules/proj4/dist/proj4.js'
declare function importScripts(...urls: string[]): void;
declare const proj4: any;
 
 //only ever need to know how many background indices there are, never need to know their indices, should also never need background for breakdown (just return array of non-background internal indices for each feature)
 export const workerGetInternalIndices = (args: {protocol: string, host: string, data: {geojsonObjects: any, xs: number[], ys: number[], lcVals: number[], gridWidthCells: number, gridHeightCells: number, longlat: string, utm: string, options: {background?: boolean, breakdown?: boolean}}}): {internal: number [], background?: number, breakdown?: {internal: number[], background?: number}[]} => {
    
    //-------------------------------functions---------------------------------------------------



    //determinant formula yields twice the signed area of triangle formed by 3 points
    //counterclockwise if negative, clockwise if positive, collinear if 0
    let ccw = (p1, p2, p3): boolean => {
        //if on line counts, both will be 0, probably need to add special value (maybe return -1, 0, or 1)
        return ((p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y)) > 0;
      }
  
      let getIndex = (x: number, y: number, width) => {
        return y * width + x;
      }
  
      let getPolygonInternalIndices = (coordinates: number[][][], xs: number[], ys: number[], lcVals: number[], gridWidthCells: number, gridHeightCells: number, longlat: string, utm: string, mechanisms: {internal: (val: number) => any, background?: (val: number) => any, breakdownInternal?: (val: number) => any, breakdownBackground?: (val: number) => any}): void => {
  
        let convertedPoints = [];
        let a = [];
        let b = [];
        let xmax = Number.NEGATIVE_INFINITY;
        let xmin = Number.POSITIVE_INFINITY;
        let ymax = Number.NEGATIVE_INFINITY;
        let ymin = Number.POSITIVE_INFINITY;
    
        //bounding box on first ring because outer ring
        let pointsBase = coordinates[0];
    
        for(let i = 0; i < pointsBase.length; i++) {
          convertedPoints.push(proj4(longlat, utm, pointsBase[i]));
        }
    
        for(let i = 0; i < convertedPoints.length - 1; i++) {
          //coordinates are in long lat order (I think)
    
          //get max and min vals to limit coordinates need to compare
          if(convertedPoints[i][0] > xmax) {
            xmax = convertedPoints[i][0];
          }
          if(convertedPoints[i][0] < xmin) {
            xmin = convertedPoints[i][0];
          }
          if(convertedPoints[i][1] > ymax) {
            ymax = convertedPoints[i][1];
          }
          if(convertedPoints[i][1] < ymin) {
            ymin = convertedPoints[i][1];
          }
          //convert these points, less conversions than trying to convert grid points
          a.push({
            x: convertedPoints[i][0],
            y: convertedPoints[i][1]
          });
          b.push({
            x: convertedPoints[i + 1][0],
            y: convertedPoints[i + 1][1]
          });
        }
        //add segments for inner rings
        for(let i = 1; i < coordinates.length; i++) {
          pointsBase = coordinates[i];
          convertedPoints = [];
    
          for(let i = 0; i < pointsBase.length; i++) {
            convertedPoints.push(proj4(longlat, utm, pointsBase[i]));
          }
    
          for(let i = 0; i < convertedPoints.length - 1; i++) {
            a.push({
              x: convertedPoints[i][0],
              y: convertedPoints[i][1]
            });
            b.push({
              x: convertedPoints[i + 1][0],
              y: convertedPoints[i + 1][1]
            });
          }
        }
    
    
        //-----------------end pre-processing-------------------
    
        let minxIndex;
        let maxxIndex;
        let minyIndex;
        let maxyIndex;
    
        //again, assume values are in order
        //find min and max indices
        //check if ascending or descending order, findIndex returns first occurance
        if(xs[0] < xs[1]) {
          minxIndex = Math.max(xs.findIndex((val) => { return val >= xmin }), 0);
          //> not >= so returns index after last even if on edge 
          maxxIndex = xs.findIndex((val) => { return val > xmax });
          if(maxxIndex < 0) {
            maxxIndex = gridWidthCells;
          }
        }
        else {
          maxxIndex = xs.findIndex((val) => { return val < xmin });
          minxIndex = Math.max(xs.findIndex((val) => { return val <= xmax }), 0);
          if(maxxIndex < 0) {
            maxxIndex = gridWidthCells;
          }
        }
        if(ys[0] < ys[1]) {
          minyIndex = Math.max(ys.findIndex((val) => { return val >= ymin }), 0);
          maxyIndex = ys.findIndex((val) => { return val > ymax });
          if(maxyIndex < 0) {
            maxyIndex = gridHeightCells;
          }
        }
        else {
          maxyIndex = ys.findIndex((val) => { return val < ymin });
          minyIndex = Math.max(ys.findIndex((val) => { return val <= ymax }), 0);
          if(maxyIndex < 0) {
            maxyIndex = gridHeightCells;
          }
        }
    
        let index;
        //convert cell coords to long lat and raycast
        //max index calculation returns index after last index in range, so only go to index before in loop (< not <=)
        for(let xIndex = minxIndex; xIndex < maxxIndex; xIndex++) {
          for(let yIndex = minyIndex; yIndex < maxyIndex; yIndex++) {
            index = getIndex(xIndex, yIndex, gridWidthCells);
            //don't include if background
            if(lcVals[index] != 0) {
              if(isInternal(a, b, { x: xs[xIndex], y: ys[yIndex] })) {
                mechanisms.internal(index)
                if(mechanisms.breakdownInternal) {
                  mechanisms.breakdownInternal(index);
                }
              }
            }
            else if(mechanisms.background != undefined) {
              if(isInternal(a, b, { x: xs[xIndex], y: ys[yIndex] })) {
                mechanisms.background(index)
                if(mechanisms.breakdownBackground) {
                  mechanisms.breakdownBackground(index);
                }
              }
            }
          }
        }
      }
    
    
      //can specify origin if 0, 0 is in range, not necessary for cover being used (0,0 not in range)
      let isInternal = (a: any[], b: any[], point: any, origin: any = { x: 0, y: 0 }): boolean => {
        //raycasting algorithm, point is internal if intersects an odd number of edges
        let internal = false;
        for(let i = 0; i < a.length; i++) {
          //segments intersect iff endpoints of each segment are on opposite sides of the other segment
          //check if angle formed is counterclockwise to determine which side endpoints fall on
          if(ccw(a[i], origin, point) != ccw(b[i], origin, point) && ccw(a[i], b[i], origin) != ccw(a[i], b[i], point)) {
            internal = !internal
          }
    
        }
        return internal;
      }

    //-------------------------------functions---------------------------------------------------
    
    if(typeof proj4 == "undefined") {
        importScripts(`${args.protocol}//${args.host}/assets/scripts/proj4.js`);
    }
    
    let geojsonObjects = args.data.geojsonObjects;
    let options = args.data.options;
    let xs = args.data.xs;
    let ys = args.data.ys;
    let lcVals = args.data.lcVals;
    let gridWidthCells = args.data.gridWidthCells;
    let gridHeightCells = args.data.gridHeightCells;
    let longlat = args.data.longlat;
    let utm = args.data.utm;

    if(!geojsonObjects.features) {
      return;
    }
    //want indices to be unique
    let indices: any = {};
    let conversions = [];
    let mechanisms: any = {};
    //still need to store background indices in set
    //if single feature indices guaranteed unique, no need to go through set (more efficient to use array directly)
    if(geojsonObjects.features.length < 2) {
      indices.internal = [];
      mechanisms.internal = indices.internal.push.bind(indices.internal);
      if(options.background) {
        indices.background = 0;
        mechanisms.background = () => { indices.background++; };
      }
    }
    else {
      indices.internal = new Set();
      mechanisms.internal = indices.internal.add.bind(indices.internal);
      conversions.push(() => { indices.internal = Array.from(indices.internal); });
      if(options.background) {
        indices.background = new Set();
        mechanisms.background = indices.background.add.bind(indices.background);
        conversions.push(() => { indices.background = indices.background.size; });
      }
    }
    if(options.breakdown) {
      indices.breakdown = [];
    }
    
    geojsonObjects.features.forEach((feature) => {
      if(options.breakdown) {
        let featureIndices: any = {
          internal: [],
        };
        mechanisms.breakdownInternal = featureIndices.internal.push.bind(featureIndices.internal);
        if(options.background) {
          featureIndices.background = 0;
          mechanisms.breakdownBackground = () => { featureIndices.background++; }
        }
        indices.breakdown.push(featureIndices);
        
      }
      //if not a feature return
      if(feature.type.toLowerCase() != "feature") {
        return;
      }
      let geoType = feature.geometry.type.toLowerCase();
      switch(geoType) {
        case "polygon": {
          let coordinates = feature.geometry.coordinates;
          getPolygonInternalIndices(coordinates, xs, ys, lcVals, gridWidthCells, gridHeightCells, longlat, utm, mechanisms);
          break;
        }
        case "multipolygon": {
          let coordinates = feature.geometry.coordinates;
          coordinates.forEach((polygon) => {
            getPolygonInternalIndices(polygon, xs, ys, lcVals, gridWidthCells, gridHeightCells, longlat, utm, mechanisms);
          });
          break;
        }
      }
    });
    conversions.forEach((conversion) => {
      conversion();
    });
    
    return indices;
  };