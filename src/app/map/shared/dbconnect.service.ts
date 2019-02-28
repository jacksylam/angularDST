import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, merge, of } from 'rxjs';
import { Cover } from './cover';
import { map, retry, catchError, mergeMap } from 'rxjs/operators';

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

  spatialQueryLength(geometry: any): number {
    let query = "{'$and':[{'name':'Landuse'},{'value.name':'dataset02172019'},{'value.loc': {$geoWithin: {'$geometry':"+JSON.stringify(geometry).replace(/"/g,'\'')+"}}}]}";
    let url = "https://agaveauth.its.hawaii.edu:443/meta/v2/data?q="+encodeURI(query)+"&limit=10000&offset=0";
    return url.length;
  }

  debugQuery() {
    console.log("called debug query");
    let sampleQuery = "{'$and':[{'name':'Landuse'},{'value.name':'dataset02172019'},{'value.loc': {$geoWithin: {'$geometry':{'type':'Polygon','coordinates':[[[-158.068537,21.465326],[-158.068537,21.54625],[-157.926289,21.54625],[-157.926289,21.465326],[-158.068537,21.465326]]]}}}}]}";
    let url = "https://agaveauth.its.hawaii.edu:443/meta/v2/data?q="+encodeURI(sampleQuery)+"&limit=10000&offset=0";
    let head = new HttpHeaders()
    .set("Authorization", "Bearer " + this.oAuthAccessToken)
    .set("Content-Type", "application/x-www-form-urlencoded");
    let options = {
      headers: head
    };

    this.http.get<ResponseResults>(url, options)
    .pipe(
      retry(3),
      map((data) => {
        data.result.forEach((record) => {
          this.sanityCheck(record);
        });
        console.log("debug query complete");
      })
    ).subscribe();

    interface ResponseResults {
      result: any
    }
  }

  sanityCheck(record: any) {
    let base = record.value;
    let scenarios = ["recharge_scenario0", "recharge_scenario1"];
    let dne = [1, 3, 19];
    let large = [13, 25]

    scenarios.forEach((scenario) => {
      base[scenario].forEach((value, i) => {
        if(value == null && !dne.includes(i)) {
          console.log("Null value found:\n"
          + "Scenario: " + scenario + "\n"
          + "Land Cover Index: " + i.toString() + "\n"
          + "Cell Index: {" + base.x.toString() + "," + base.y.toString() + "}");
        }
        if(value > 400 && !large.includes(i)) {
          console.log("Large value found:\n"
          + "Scenario: " + scenario + "\n"
          + "Land Cover Index: " + i.toString() + "\n"
          + "Cell Index: (" + base.x.toString() + "," + base.y.toString() + ")");
        }
      });
    });
  }

  spatialSearch(geometry: any, offset: number = 0, resultSet = []): Observable<Cover[]> {
    let query = "{'$and':[{'name':'Landuse'},{'value.name':'dataset02172019'},{'value.loc': {$geoWithin: {'$geometry':"+JSON.stringify(geometry).replace(/"/g,'\'')+"}}}]}";
    let url = "https://agaveauth.its.hawaii.edu:443/meta/v2/data?q="+encodeURI(query)+"&limit=10000&offset=" + offset.toString();
    let head = new HttpHeaders()
    .set("Authorization", "Bearer " + this.oAuthAccessToken)
    .set("Content-Type", "application/x-www-form-urlencoded");
    let options = {
      headers: head
    };

    let response = this.http.get<ResponseResults>(url, options)
    .pipe(
      retry(3),
      mergeMap((data) => {
        let localResult = data.result as Cover[]
        let result = resultSet.concat(localResult);
        //console.log(localResult);
        if(localResult.length >= 10000) {
          //console.log("next");
          return this.spatialSearch(geometry, offset + 10000, result);
        }
        else {
          //console.log("done");
          return of(result);
        }
        //return this.spatialSearch(geometry, 10000);
      }),
      catchError((e) => {
        return Observable.throw(new Error(e.message));
      })
    );

    return response;

    interface ResponseResults {
      result: any
    }
  }

  // spatialSearch(geometry: any): Observable<Cover[]> {
  //   //console.log(JSON.stringify(JSON.stringify(geometry.coordinates[0].slice(0, geometry.coordinates[0].length - 1)).replace(/"/g,'\'')));
  //   let query = "{'$and':[{'name':'Landuse'},{'value.name':'testset10092018'},{'value.loc': {$geoWithin: {'$polygon':"+JSON.stringify(geometry.coordinates[0].slice(0, geometry.coordinates[0].length - 1)).replace(/"/g,'\'')+"}}}]}";
  //   //console.log(query);
  //   let url = "https://agaveauth.its.hawaii.edu:443/meta/v2/data?q="+encodeURI(query)+"&limit=10000&offset=0";
  //   let head = new HttpHeaders()
  //   .set("Authorization", "Bearer " + this.oAuthAccessToken)
  //   .set("Content-Type", "application/x-www-form-urlencoded");
  //   let options = {
  //     headers: head
  //   };

  //   let response = this.http.get<ResponseResults>(url, options)
  //   .retry(3)
  //   .map((data) => {
  //     return data.result as Cover[];
  //   }).catch((e) => {
  //     return Observable.throw(new Error(e.message));
  //   });
  //   return response;
  //   // }

  //   interface ResponseResults {
  //     result: any
  //   }
  // }


  indexSearch(indexes: {x: number, y: number}[]): Observable<Cover[]> {
    //this will use the 0 indexed feature from the leaflet map, which should be a GeoJSON polygon, for the spatial search boundry
    //for(let i = 0; i < size; i++) {
    //alert(JSON.stringify(drawnItems.toGeoJSON().features[i].geometry));

    //build query
    let query = "{$and:[{'name':'Landuse','value.name':'dataset02172019','$or':[";
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
    .pipe(
      retry(3),
      map((data) => {
        return data.result as Cover[];
      }),
      catchError((e) => {
        return Observable.throw(new Error(e.message));
      })
    );
    
    return response;
    

    interface ResponseResults {
      result: any
    }
  }
}
