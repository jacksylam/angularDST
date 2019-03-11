import { Injectable } from '@angular/core';
//import * as types from 'shp-write/src/types';
import * as dbf from 'dbf';
//import * as prj from 'shp-write/src/prj';
//import * as ext from 'shp-write/src/extent';
//import * as getFields from 'shp-write/src/fields';
//import * as polyWriter from 'shp-write/src/poly';

//geometries.length * 8?
@Injectable()
export class ModifiedShpwriteService {

  static readonly PROJECTION = 'PROJCS["NAD_1983_UTM_Zone_4N",GEOGCS["GCS_North_American_1983",DATUM["D_North_American_1983",SPHEROID["GRS_1980",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",-159],PARAMETER["scale_factor",0.9996],PARAMETER["false_easting",500000],PARAMETER["false_northing",0],UNIT["Meter",1]]"';
  static readonly POLY_CODE = 5;

  recordHeaderLength = 8;

  constructor() { }

  //rows = properties, geometries = geometries, geometry_type = 5
  writePolygons(geojsonObject, callback) {

    let geometries = [];
    let rings = [];
    let properties = [];
    let bboxes;

    let boundingRings = [];
    geojsonObject.features.forEach((feature) => {
      let featureBoundingRings = [];
      //not a feature, ignore
      if(feature.type.toLowerCase() != "feature") {
        return;
      }
      
      let geoType = feature.geometry.type.toLowerCase();

      let coordbase = feature.geometry.coordinates;
      
      let ringPositions = [];
      let flattenedGeometry;
      if(geoType == "polygon") {
        //get position rings will be after flatten
        let acc = 0;
        coordbase.forEach((ring, i) => {
          //push acc value first (need location of first point)
          ringPositions.push(acc);
          //add number of points in ring to acc
          acc += ring.length;
          //shapes will be bound by outermost rings (inner rings must be fully contained), so push first ring to array for bbox computation
          if(i == 0) {
            featureBoundingRings.push(ring);
          }
        });
        //flatten rings
        flattenedGeometry = coordbase.flat();
      }
      else if(geoType == "multipolygon") {
        //get position rings will be after flatten, 2 layers for multipolygons (outer polygon n, inner ring n)
        let acc = 0;
        coordbase.forEach((poly) => {
          poly.forEach((ring, i) => {
            //push acc value first (need location of first point)
            ringPositions.push(acc);
            //add number of points in ring to acc
            acc += ring.length;
            //shapes will be bound by outermost rings (inner rings must be fully contained), so push first ring to array for bbox computation
            if(i == 0) {
              featureBoundingRings.push(ring);
            }
          });
        }); 
        //flatten rings, 2 layers deep for multipolygons
        flattenedGeometry = coordbase.flat(2);
      }
      //ignore if not polygon or multipolygon
      else {
        return;
      }
      //push ring positions
      rings.push(ringPositions);
      //push properties
      properties.push(feature.properties);
      //push flattened geometry
      geometries.push(flattenedGeometry);
      //push set of outter rings to boundingRings for bbox computation
      boundingRings.push(featureBoundingRings);
    });
    bboxes = this.constructBoundingBoxes(boundingRings);

    //if no valid geometries can just return (will write out empty zip file)
    if(geometries.length < 1) {
      return;
    }

    
    //only polygons
    let type = ModifiedShpwriteService.POLY_CODE;



    //100 byte file header
    let shpLength = 100 + this.shpRecordsLength(geometries, rings);
    let shxLength = 100 + geometries.length * 8;

    let shpBuffer = new ArrayBuffer(shpLength);
    let shpView = new DataView(shpBuffer);
    let shxBuffer = new ArrayBuffer(shxLength);
    let shxView = new DataView(shxBuffer);

    //file lengths in 16-bit words
    let shpFLen = shpLength / 2;
    let shxFLen = shxLength / 2;

    this.writeFileHeader(shpView, type, bboxes, shpFLen);
    //shx file has header identical to shp except for the file length
    this.writeFileHeader(shxView, type, bboxes, shxFLen);

    //console.log("finished header and extents");

    //write records starting at byte 100 (100 byte header)
    this.writePolygonRecords(geometries, rings, bboxes.components, new DataView(shpBuffer, 100), new DataView(shxBuffer, 100), type);

    //console.log("finished records");

    //this actually appears to work correctly
    let dbfBuf = dbf.structure(properties);

    callback(null, {
        shp: shpView,
        shx: shxView,
        dbf: dbfBuf,
        prj: ModifiedShpwriteService.PROJECTION
    });
  }

  private writeFileHeader(view, type, bboxes, flen) {
    view.setInt32(0, 9994);
    view.setInt32(24, flen);
    view.setInt32(28, 1000, true);
    view.setInt32(32, type, true);
    view.setFloat64(36, bboxes.xmin, true);
    view.setFloat64(44, bboxes.ymin, true);
    view.setFloat64(52, bboxes.xmax, true);
    view.setFloat64(60, bboxes.ymax, true);
  }

  private shpRecordsLength(geometries, rings) {
    let recordsLength = 0;
    geometries.forEach((coords, i) => {
      let parts = rings[i].length;
      recordsLength += 8 + 44 + parts * 4 + coords.length * 16;
    });
    return recordsLength;
  }


  private writePolygonRecords(geometries, rings, bboxes, shpView, shxView, type) {

    let shpI = 0;
    let shxI = 0;
    let shxOffset = 100;

    geometries.forEach((coords, i) => {
      let bbox = bboxes[i];
      let ringPositions = rings[i];
      let parts = ringPositions.length;

      let contentLength = 44 + parts * 4 + coords.length * 16;

      shxView.setInt32(shxI, shxOffset / 2);
      shxView.setInt32(shxI + 4, contentLength / 2);

      shxI += 8;
      //offset content length + 8 byte polygon header
      shxOffset += contentLength + 8;

      //record header
      shpView.setInt32(shpI, i + 1); // record number
      shpView.setInt32(shpI + 4, contentLength / 2); // length

      shpI += 8;

      //record contents
      shpView.setInt32(shpI + 0, type, true);
      shpView.setFloat64(shpI + 4, bbox.xmin, true);
      shpView.setFloat64(shpI + 12, bbox.ymin, true);
      shpView.setFloat64(shpI + 20, bbox.xmax, true);
      shpView.setFloat64(shpI + 28, bbox.ymax, true);
      shpView.setInt32(shpI + 36, parts, true);
      shpView.setInt32(shpI + 40, coords.length, true);

      ringPositions.forEach((ring, j) => {
        shpView.setInt32(shpI + 44 + (j * 4), ring, true);
      });

      let x = 44 + 4 * parts;
      coords.forEach(function writeLine(coord, j) {
        shpView.setFloat64(shpI + x + (j * 16), coord[0], true);
        shpView.setFloat64(shpI + x + (j * 16) + 8, coord[1], true);
      });

      shpI += contentLength;
    });
  };

  constructBoundingBoxes(coordinates: number[][][][]): any {
    let bounds = {
      xmax: Number.NEGATIVE_INFINITY,
      xmin: Number.POSITIVE_INFINITY,
      ymax: Number.NEGATIVE_INFINITY,
      ymin: Number.POSITIVE_INFINITY,
      components: []
    };
    coordinates.forEach((component) => {
      let componentBounds = this.getComponentBoundingBox(component);
      bounds.components.push(componentBounds);
      if(componentBounds.xmax > bounds.xmax) {
        bounds.xmax = componentBounds.xmax ;
      }
      if(componentBounds.xmin < bounds.xmin) {
        bounds.xmin = componentBounds.xmin;
      }
      if(componentBounds.ymax > bounds.ymax) {
        bounds.ymax = componentBounds.ymax;
      }
      if(componentBounds.ymin < bounds.ymin) {
        bounds.ymin = componentBounds.ymin;
      }
    });
    return bounds;
  }

  getComponentBoundingBox(coordinates: number[][][]): any {
    let bounds = {
      xmax: Number.NEGATIVE_INFINITY,
      xmin: Number.POSITIVE_INFINITY,
      ymax: Number.NEGATIVE_INFINITY,
      ymin: Number.POSITIVE_INFINITY
    };
    coordinates.forEach((ring) => {
      ring.forEach((point) => {
        if(point[0] > bounds.xmax) {
          bounds.xmax = point[0];
        }
        if(point[0] < bounds.xmin) {
          bounds.xmin = point[0];
        }
        if(point[1] > bounds.ymax) {
          bounds.ymax = point[1];
        }
        if(point[1] < bounds.ymin) {
          bounds.ymin = point[1];
        }
      });
    });
    return bounds;
  }

}
