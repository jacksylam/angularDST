import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable()
export class DBConnectService {



  constructor(private http: HttpClient) { }

  generateCover(cover: string, data) {
    //modify cover file
    //might want to create multiples to have variable color hues
    //have empty space by only including coordinates containing data for that landcover, then load multiple layers with different hues
    //that is, return collection of files from this method
  }


  spatialSearch(drawnItems, size: number) {
    var oAuthAccessToken = "token";
    //this will use the 0 indexed feature from the leaflet map, which should be a GeoJSON polygon, for the spatial search boundry
    for(let i = 0; i < size; i++) {
      var query = "{'$and':[{'name':'Landuse'},{'value.name':'testunit3'},{'value.loc': {$geoWithin: {'$geometry':"+JSON.stringify(drawnItems.toGeoJSON().features[0].geometry).replace(/"/g,'\'')+"}}}]}";

      var url = "https://agaveauth.its.hawaii.edu:443/meta/v2/data?q="+encodeURI(query)+"&limit=10000&offset=0";
      var head = new HttpHeaders()
      .set("Authorization", "Bearer " + oAuthAccessToken)
      .set("Content-Type", "application/x-www-form-urlencoded");
      var options = {
        headers: head
      };
      this.http.get(url, options).subscribe((data) => {
        //alert(JSON.stringify(data));
      },
      (err) => {
          //alert("fail")
      });
    }


    // $.ajax({
    //   type: "GET",
    //   url: "https://agaveauth.its.hawaii.edu:443/meta/v2/data?q="+encodeURI(query)+"&limit=10000&offset=0",
    //   dataType: 'json',
    //   async: false,
    //   headers: {
    //     "Authorization": "Bearer " + oAuthAccessToken,
    //     "Content-Type":"application/x-www-form-urlencoded"
    //   },
    //   data: {},
    //   success: function (response){
    //     $scope.landuse = response.result;
    //     console.log("Count:" + $scope.landuse.length.toString())
    //     $scope.calculate_new_recharge()
    //   }
    // });
  }
}
