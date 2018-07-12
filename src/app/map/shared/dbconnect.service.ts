import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Cover } from './cover';

@Injectable()
export class DBConnectService {


  oAuthAccessToken = "token";

  constructor(private http: HttpClient) { }

  spatialSearch(geometry: any): Observable<Cover[]> {
    //this will use the 0 indexed feature from the leaflet map, which should be a GeoJSON polygon, for the spatial search boundry
    //for(let i = 0; i < size; i++) {
    //alert(JSON.stringify(drawnItems.toGeoJSON().features[i].geometry));
    //console.log(geometry)
    var query = "{'$and':[{'name':'Landuse'},{'value.name':'testset8'},{'value.loc': {$geoWithin: {'$geometry':"+JSON.stringify(geometry).replace(/"/g,'\'')+"}}}]}";

    var url = "https://agaveauth.its.hawaii.edu:443/meta/v2/data?q="+encodeURI(query)+"&limit=10000&offset=0";
    var head = new HttpHeaders()
    .set("Authorization", "Bearer " + this.oAuthAccessToken)
    .set("Content-Type", "application/x-www-form-urlencoded");
    var options = {
      headers: head
    };

    var response = this.http.get<ResponseResults>(url, options)
    .map((data) => {
      return data.result as Cover[]
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
    var query = "{$and:[{'name':'Landuse','value.name':'testunit3','$or':[";
    indexes.forEach((index) => {
      query += "{'value.x':" + index.x + ", 'value.y':" + index.y + "},";
    });
    //remove last comma
    query = query.slice(0, -1);
    query += "]}]}";

    var url = "https://agaveauth.its.hawaii.edu:443/meta/v2/data?q="+encodeURI(query)+"&limit=10000&offset=0";
    var head = new HttpHeaders()
    .set("Authorization", "Bearer " + this.oAuthAccessToken)
    .set("Content-Type", "application/x-www-form-urlencoded");
    var options = {
      headers: head
    };

    var response = this.http.get<ResponseResults>(url, options)
    .map((data) => {
      return data.result as Cover[]
    });
    return response;
   // }

    interface ResponseResults {
      result: any
    }
  }
}
