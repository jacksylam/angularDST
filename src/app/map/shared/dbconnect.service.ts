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

  spatialSearch(geometry: any): Observable<Cover[]> {
    //this will use the 0 indexed feature from the leaflet map, which should be a GeoJSON polygon, for the spatial search boundry
    //for(let i = 0; i < size; i++) {
    //alert(JSON.stringify(drawnItems.toGeoJSON().features[i].geometry));
    //console.log(geometry)
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
      return data.result as Cover[]
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
