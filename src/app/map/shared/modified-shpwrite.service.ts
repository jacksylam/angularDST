import { Injectable } from '@angular/core';
import * as types from 'shp-write/src/types';
import * as dbf from 'dbf';
import * as prj from 'shp-write/src/prj';
import * as ext from 'shp-write/src/extent';
import * as getFields from 'shp-write/src/fields';
import * as polyWriter from 'shp-write/src/poly';


@Injectable()
export class ModifiedShpwriteService {

  recordHeaderLength = 8;

  constructor() { }


  write(rows, geometry_type, geometries, callback) {
    //console.log("start write");

    let TYPE = types.geometries[geometry_type]
    let writer = polyWriter;
    //should never have multi-part polygons, so just use 1
    //wrong, might have multipolygons, fix
    let parts = 1;
    let shpLength = 100;
    //this is provided correctly as geometries.length * 8 (number of records * 8 bytes)
    let shxLength = 100 + writer.shxLength(geometries);

    

    //polyWriter shpLength function makes no sense (how drunk was the person that wrote this?)
    //polygon record has 8 byte header, then 44 bytes, followed by 4 * number of parts, then points in geometry
    //point is 16 bytes (2 double precision numbers)
    //so
    //console.log(geometries);
    let revisedPolyShpLength = (geometries) => {
      let length = 0;
      geometries.forEach((geometry) => {
        length += 8 + 44;
        length += parts * 4;
        length += geometry.length * 16;
        //doesn't work without 8 byte gap between records (WHY???)
        length += 8
      });
      return length;
    };

    shpLength += revisedPolyShpLength(geometries);

    let shpBuffer = new ArrayBuffer(shpLength);
    let shpView = new DataView(shpBuffer);
    let shxBuffer = new ArrayBuffer(shxLength);
    let shxView = new DataView(shxBuffer);
    let extent = writer.extent(geometries);

    this.writeHeader(shpView, TYPE);
    this.writeHeader(shxView, TYPE);
    this.writeExtent(extent, shpView);
    this.writeExtent(extent, shxView);

    //console.log("finished header and extents");

    this.writeRecords(geometries, extent,
        new DataView(shpBuffer, 100),
        new DataView(shxBuffer, 100),
        TYPE);

    //console.log("finished records");

    shpView.setInt32(24, shpLength / 2);
    shxView.setInt32(24, (50 + geometries.length * 4));

    var dbfBuf = dbf.structure(rows);

    callback(null, {
        shp: shpView,
        shx: shxView,
        dbf: dbfBuf,
        prj: prj
    });
  }

  writeHeader(view, TYPE) {
    view.setInt32(0, 9994);
    view.setInt32(28, 1000, true);
    view.setInt32(32, TYPE, true);
  }

  writeExtent(extent, view) {
    view.setFloat64(36, extent.xmin, true);
    view.setFloat64(44, extent.ymin, true);
    view.setFloat64(52, extent.xmax, true);
    view.setFloat64(60, extent.ymax, true);
  }


  //uses the broken part number calculation function, so need to use revised version of this too
  writeRecords(geometries, extent, shpView, shxView, TYPE) {

    let shpI = 0;
    let shxI = 0;
    let shxOffset = 100;
    //console.log(geometries.length);
    geometries.forEach((coordinates, i) => {
      //console.log("test2");
      let flattened = this.justCoords(coordinates, []);
      //never going to have multiple parts, so no need write code for that
      let noParts = 1;
      let contentLength = (flattened.length * 16) + 52 + (noParts) * 4;

      //seems like a convoluted way of doing this, but hey it seems to work
      let featureExtent = flattened.reduce(function(extent, c) {
          return ext.enlarge(extent, c);
      }, ext.blank());


      // INDEX
      //think this is wrong
      shxView.setInt32(shxI, shxOffset / 2); // offset
      shxView.setInt32(shxI + 4, contentLength / 2); // offset length

      shxI += 8;
      //doesn't work without 8 byte gap between records (WHY???)
      shxOffset += contentLength + 8;

      //record header
      shpView.setInt32(shpI, i + 1); // record number
      shpView.setInt32(shpI + 4, contentLength / 2); // length

      //record contents
      shpView.setInt32(shpI + 8, TYPE, true);
      shpView.setFloat64(shpI + 12, featureExtent.xmin, true);
      shpView.setFloat64(shpI + 20, featureExtent.ymin, true);
      shpView.setFloat64(shpI + 28, featureExtent.xmax, true);
      shpView.setFloat64(shpI + 36, featureExtent.ymax, true);
      shpView.setInt32(shpI + 44, noParts, true);
      shpView.setInt32(shpI + 48, flattened.length, true);
      //only one part, so just put single index
      shpView.setInt32(shpI + 52, 0, true);

      flattened.forEach(function writeLine(coords, i) {
          shpView.setFloat64(shpI + 56 + (i * 16), coords[0], true); // X
          shpView.setFloat64(shpI + 56 + (i * 16) + 8, coords[1], true); // Y
      });

      //doesn't work without 8 byte gap between records (WHY???)
      shpI += contentLength + 8;
    });

       
  };

  //not exported, so define here
  justCoords(coords, l) {
    if (l === undefined) l = [];
    if (typeof coords[0][0] == 'object') {
        return coords.reduce(function(memo, c) {
            return memo.concat(this.justCoords(c));
        }, l);
    } else {
        return coords;
    }
}

}
