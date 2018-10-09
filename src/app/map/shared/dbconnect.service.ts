import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Cover } from './cover';

@Injectable()
export class DBConnectService {

  static readonly TOKEN_FILE = "/assets/APIToken.txt"

  tokenReader: FileReader;

  oAuthAccessToken = "token";

  constructor(private http: HttpClient) {
    this.http.get(DBConnectService.TOKEN_FILE, { responseType: "text" }).subscribe(data => {
      this.oAuthAccessToken = data;
    });
  }

  maxSpatialQueryLength(numPoints: number): number {

    //js numbers use IEEE-754, so should have max decimal length of 16 digits
    let maxFloatingPointPrecision = 16;
    //maximum length of the whole number value part (includes -)
    let maxLatWhole = 3;
    let maxLongWhole = 4;
    let basicGeoJSON = {
      type: "Polygon",
      coordinates: []
    };
    let maxLengthDummyLat = 0;
    let maxLengthDummyLong = 0;
    //construct dummy values and add into url
    for(let i = 1; i < maxLatWhole; i++) {
      maxLengthDummyLat += Math.pow(10, i);
    }
    for(let i = 1; i < maxLongWhole; i++) {
      maxLengthDummyLong += Math.pow(10, i);
    }
    for(let i = 1; i < maxFloatingPointPrecision; i++) {
      maxLengthDummyLat += 1 / Math.pow(10, i);
      maxLengthDummyLong += 1 / Math.pow(10, i);
    }
    for(let i = 0; i < numPoints; i++) {
      basicGeoJSON.coordinates.push([maxLengthDummyLat, maxLengthDummyLong]);
    }
    let query = "{'$and':[{'name':'Landuse'},{'value.name':'testset09142018'},{'value.loc': {$geoWithin: {'$geometry':"+JSON.stringify(basicGeoJSON).replace(/"/g,'\'')+"}}}]}";
    let url = "https://agaveauth.its.hawaii.edu:443/meta/v2/data?q="+encodeURI(query)+"&limit=10000&offset=0";
    return url.length;
  }

  spatialSearch(geometry: any): Observable<Cover[]> {
    //this will use the 0 indexed feature from the leaflet map, which should be a GeoJSON polygon, for the spatial search boundry
    //for(let i = 0; i < size; i++) {
    //alert(JSON.stringify(drawnItems.toGeoJSON().features[i].geometry));
    console.log(geometry);
    let query = "{'$and':[{'name':'Landuse'},{'value.name':'testset09142018'},{'value.loc': {$geoWithin: {'$geometry':"+JSON.stringify(geometry).replace(/"/g,'\'')+"}}}]}";

    let url = "https://agaveauth.its.hawaii.edu:443/meta/v2/data?q="+encodeURI(query)+"&limit=10000&offset=0";
    let head = new HttpHeaders()
    .set("Authorization", "Bearer " + this.oAuthAccessToken)
    .set("Content-Type", "application/x-www-form-urlencoded");
    let options = {
      headers: head
    };

    let response = this.http.get<ResponseResults>(url, options)
    .retry(3)
    .map((data) => {
      return data.result as Cover[];
    }).catch((e) => {
      return Observable.throw(new Error(e.message));
    });
    return response;
    // }

    interface ResponseResults {
      result: any
    }
  }


  indexSearch(indexes: {x: number, y: number}[]): Observable<Cover[]> {
    //this will use the 0 indexed feature from the leaflet map, which should be a GeoJSON polygon, for the spatial search boundry
    //for(let i = 0; i < size; i++) {
    //alert(JSON.stringify(drawnItems.toGeoJSON().features[i].geometry));

    //build query
    let query = "{$and:[{'name':'Landuse','value.name':'testset09142018','$or':[";
    indexes.forEach((index) => {
      query += "{'value.x':" + index.x + ", 'value.y':" + index.y + "},";
    });
    //remove last comma
    query = query.slice(0, -1);
    query += "]}]}";

    let url = "https://agaveauth.its.hawaii.edu:443/meta/v2/data?q="+encodeURI(query)+"&limit=10000&offset=0";
    let head = new HttpHeaders()
    .set("Authorization", "Bearer " + this.oAuthAccessToken)
    .set("Content-Type", "application/x-www-form-urlencoded");
    let options = {
      headers: head
    };

    let response = this.http.get<ResponseResults>(url, options)
    .map((data) => {
      return data.result as Cover[]
    }).catch((e) => {
      return Observable.throw(new Error(e.message));
    });
    
    return response;
    

    interface ResponseResults {
      result: any
    }
  }
}
