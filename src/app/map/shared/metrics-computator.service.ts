import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MetricsComputatorService {

  //what are we tracking?
  /*
  //if cell not tracked in state then background cell
  state = {
    cell_index_n: {
      baseline_state: {
        lc: number
        recharge: {
          scenario_0: number
          ...
          scenario_x: number
        }
      }
      update_state: {
        lc: number
        recharge: {
          scenario_0: number
          ...
          scenario_x: number
        }
      } || null (no change, save memory)

      internal_to: {
        custom_areas: []
      }
    }
    ...
    cell_index_m: {...}
  }

  updated_cells_index: number[]

  dirty_objects: []

  object_map: {
    aquifers: {
      layer_id: {
        make object in case determine need other things so no need change schema
        internal_indices: number[]
      }
    }
    custom_areas: {
      layer_id: cell_indices[]
    }
  }


  what do we typically have when we click on something? a layer id

  
  */

  constructor() { }

  // createMetrics() {
  //   //if still initializing just ignore, metrics will be computed after initialization completed, shouldn't ever happen, but might as well include as a failsafe
  //   // if(!this.currentDataInitialized) {
  //   //   return null;
  //   // }

  //   let data = {
  //     customAreas: [],
  //     aquifers: [],
  //     specialAquifers: [],
  //     aquifersNoCaprock: [],
  //     customAreasTotal: {
  //       metrics: {},
  //       roundedMetrics: {}
  //     },
  //     total: {
  //       metrics: {},
  //       roundedMetrics: {}
  //     },
  //     totalNoCaprock: {
  //       metrics: {},
  //       roundedMetrics: {}
  //     }
  //   };
    
  //   this.getAquiferAndTotalMetrics(data);

  //   let customTotalIndices = []
  //   this.drawnItems.eachLayer((layer) => {
  //     //let intervals = new Date().getTime();
  //     //any custom layers should have metrics object registered with customAreaMap, use this as a base since same name
  //     let info = this.customAreaMap[layer._leaflet_id];
  //     let indices = this.getInternalIndices({features: [layer.toGeoJSON()]});
  //     let itemMetrics = this.getMetricsSuite(indices, true);
  //     info.metrics = itemMetrics;
  //     info.roundedMetrics = this.roundMetrics(itemMetrics);
  //     customTotalIndices = customTotalIndices.concat(indices);

  //     data.customAreas.push(info);
  //   });

  //   //can make more efficient by computing individual shape metrics and full metrics at the same time
  //   //figure out how to generalize as much as possible without adding too much extra overhead and use same function for everything
  //   let customTotal = this.getMetricsSuite(customTotalIndices, true);
  //   data.customAreasTotal.metrics = customTotal;
  //   data.customAreasTotal.roundedMetrics = this.roundMetrics(customTotal);

  //   return data;
  // }


  // getAquiferAndTotalMetrics(data: any) {

  //   let metrics: any = {}; 

  //   //initialize metrics objects
  //   Object.keys(AQUIFER_NAME_MAP).forEach((code) => {
  //     metrics[code] = {
  //       caprock: {
  //         USC: {
  //           average: {
  //             original: 0,
  //             current: 0,
  //             diff: 0,
  //             pchange: 0
  //           },
  //           volumetric: {
  //             original: 0,
  //             current: 0,
  //             diff: 0,
  //             pchange: 0
  //           },
  //           area: 0
  //         },
  //         Metric: {
  //           average: {
  //             original: 0,
  //             current: 0,
  //             diff: 0,
  //             pchange: 0
  //           },
  //           volumetric: {
  //             original: 0,
  //             current: 0,
  //             diff: 0,
  //             pchange: 0
  //           },
  //           area: 0
  //         }
  //       }
  //     };

  //     if(!MapComponent.SPECIAL_AQUIFERS.includes(code)) {
  //       metrics[code].nocaprock = {
  //         USC: {
  //           average: {
  //             original: 0,
  //             current: 0,
  //             diff: 0,
  //             pchange: 0
  //           },
  //           volumetric: {
  //             original: 0,
  //             current: 0,
  //             diff: 0,
  //             pchange: 0
  //           },
  //           area: 0
  //         },
  //         Metric: {
  //           average: {
  //             original: 0,
  //             current: 0,
  //             diff: 0,
  //             pchange: 0
  //           },
  //           volumetric: {
  //             original: 0,
  //             current: 0,
  //             diff: 0,
  //             pchange: 0
  //           },
  //           area: 0
  //         }
  //       };
  //     }
  //   });

  //   metrics.total = {
  //     caprock: {
  //       USC: {
  //         average: {
  //           original: 0,
  //           current: 0,
  //           diff: 0,
  //           pchange: 0
  //         },
  //         volumetric: {
  //           original: 0,
  //           current: 0,
  //           diff: 0,
  //           pchange: 0
  //         },
  //         area: 0
  //       },
  //       Metric: {
  //         average: {
  //           original: 0,
  //           current: 0,
  //           diff: 0,
  //           pchange: 0
  //         },
  //         volumetric: {
  //           original: 0,
  //           current: 0,
  //           diff: 0,
  //           pchange: 0
  //         },
  //         area: 0
  //       }
  //     },
  //     nocaprock: {
  //       USC: {
  //         average: {
  //           original: 0,
  //           current: 0,
  //           diff: 0,
  //           pchange: 0
  //         },
  //         volumetric: {
  //           original: 0,
  //           current: 0,
  //           diff: 0,
  //           pchange: 0
  //         },
  //         area: 0
  //       },
  //       Metric: {
  //         average: {
  //           original: 0,
  //           current: 0,
  //           diff: 0,
  //           pchange: 0
  //         },
  //         volumetric: {
  //           original: 0,
  //           current: 0,
  //           diff: 0,
  //           pchange: 0
  //         },
  //         area: 0
  //       }
  //     }
  //   };

  //   let rechargeVals = this.types.recharge.currentData[this.currentScenario];
    
  //   //this.aquifers will be the aquifer id array
  //   //this.SPECIAL_AQUIFERS
  //   /*
  //   return value [0, 3]
  //   0: background (include never)
  //   1: special aquifer
  //   2: caprock
  //   3: normal (include always)
  //   */
  //   let checkInclude = (i: number): number => {
  //     if(this.aquifers[i] == "0") {
  //       return 0;
  //     }
  //     else if(MapComponent.SPECIAL_AQUIFERS.includes(this.aquifers[i])) {
  //       return 1;
  //     }
  //     else if(this.caprock[i] == 0) {
  //       return 2;
  //     }

  //     return 3;
  //   };

  //   for(let i = 0; i < rechargeVals.length; i++) {
  //     //store number of cells in area variable
  //     switch(checkInclude(i)) {
  //       case 0: {
  //         continue;
  //       }
  //       case 1: {
  //         let aquifer = this.aquifers[i];
  //         //special aquifers have no nocaprock component and are not included in map total
  //         metrics[aquifer].caprock.USC.area++;
  //         metrics[aquifer].caprock.USC.average.current += rechargeVals[i];
  //         metrics[aquifer].caprock.USC.average.original += this.types.recharge.baseData[this.baseScenario][i];

  //         break;
  //       }
  //       case 2: {
  //         let aquifer = this.aquifers[i];
          
  //         metrics[aquifer].caprock.USC.area++;
  //         metrics[aquifer].caprock.USC.average.current += rechargeVals[i];
  //         metrics[aquifer].caprock.USC.average.original += this.types.recharge.baseData[this.baseScenario][i];

  //         metrics.total.caprock.USC.area++;
  //         metrics.total.caprock.USC.average.current += rechargeVals[i];
  //         metrics.total.caprock.USC.average.original += this.types.recharge.baseData[this.baseScenario][i];

  //         break;
  //       }
  //       case 3: {
  //         let aquifer = this.aquifers[i];

  //         metrics[aquifer].caprock.USC.area++;
  //         metrics[aquifer].caprock.USC.average.current += rechargeVals[i];
  //         metrics[aquifer].caprock.USC.average.original += this.types.recharge.baseData[this.baseScenario][i];

  //         metrics[aquifer].nocaprock.USC.area++;
  //         metrics[aquifer].nocaprock.USC.average.current += rechargeVals[i];
  //         metrics[aquifer].nocaprock.USC.average.original += this.types.recharge.baseData[this.baseScenario][i];

  //         metrics.total.caprock.USC.area++;
  //         metrics.total.caprock.USC.average.current += rechargeVals[i];
  //         metrics.total.caprock.USC.average.original += this.types.recharge.baseData[this.baseScenario][i];

  //         metrics.total.nocaprock.USC.area++;
  //         metrics.total.nocaprock.USC.average.current += rechargeVals[i];
  //         metrics.total.nocaprock.USC.average.original += this.types.recharge.baseData[this.baseScenario][i];

  //         break;
  //       }
  //       default: {
  //         console.log("Invalid value returned by cell categorizer");
  //       }
  //     }
  //   }

  //   //compute remaining metrics
  //   Object.keys(metrics).forEach((code) => {
  //     //currently just number of cells, no need conversion
  //     metrics[code].caprock.Metric.area = metrics[code].caprock.USC.area;
  //     //compute metric average recharges
  //     metrics[code].caprock.Metric.average.current = metrics[code].caprock.USC.average.current * MapComponent.INCH_TO_MILLIMETER_FACTOR;
  //     metrics[code].caprock.Metric.average.original = metrics[code].caprock.USC.average.original * MapComponent.INCH_TO_MILLIMETER_FACTOR;

  //     //compute metrics in volumetric
  //     metrics[code].caprock.USC.volumetric.original = (metrics[code].caprock.USC.average.original * 75 * 75 * 144) / (231 * 0.3048 * 0.3048 * 365 * 1000000);
  //     metrics[code].caprock.USC.volumetric.current = (metrics[code].caprock.USC.average.current * 75 * 75 * 144) / (231 * 0.3048 * 0.3048 * 365 * 1000000);
  //     //instead of trying to figure out whole conversion, just convert Mgal to ML
  //     metrics[code].caprock.Metric.volumetric.original = metrics[code].caprock.USC.volumetric.original * MapComponent.GALLON_TO_LITER_FACTOR;
  //     metrics[code].caprock.Metric.volumetric.current = metrics[code].caprock.USC.volumetric.current * MapComponent.GALLON_TO_LITER_FACTOR;

  //     //average summation over cells
  //     metrics[code].caprock.USC.average.original /= metrics[code].caprock.USC.area;
  //     metrics[code].caprock.USC.average.current /= metrics[code].caprock.USC.area;

  //     metrics[code].caprock.Metric.average.original /= metrics[code].caprock.Metric.area;
  //     metrics[code].caprock.Metric.average.current /= metrics[code].caprock.Metric.area;

  //     //get difference and percent change
  //     metrics[code].caprock.USC.volumetric.diff = metrics[code].caprock.USC.volumetric.current - metrics[code].caprock.USC.volumetric.original;
  //     metrics[code].caprock.USC.average.diff = metrics[code].caprock.USC.average.current - metrics[code].caprock.USC.average.original;
  //     metrics[code].caprock.Metric.volumetric.diff = metrics[code].caprock.Metric.volumetric.current - metrics[code].caprock.Metric.volumetric.original;
  //     metrics[code].caprock.Metric.average.diff = metrics[code].caprock.Metric.average.current - metrics[code].caprock.Metric.average.original;
  //     //make sure not dividing by 0 if no recharge in selected cells
  //     if(metrics[code].caprock.USC.volumetric.original == 0) {
  //       //if the current change is also 0 (diff is 0) then pchange is 0, else set to infinity
  //       metrics[code].caprock.USC.volumetric.pchange = metrics[code].caprock.USC.volumetric.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
  //       metrics[code].caprock.USC.average.pchange = metrics[code].caprock.USC.average.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
  //       metrics[code].caprock.Metric.volumetric.pchange = metrics[code].caprock.Metric.volumetric.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
  //       metrics[code].caprock.Metric.average.pchange = metrics[code].caprock.Metric.average.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
  //     }
  //     else {
  //       metrics[code].caprock.USC.volumetric.pchange = metrics[code].caprock.USC.volumetric.diff / metrics[code].caprock.USC.volumetric.original * 100;
  //       metrics[code].caprock.USC.average.pchange = metrics[code].caprock.USC.average.diff / metrics[code].caprock.USC.average.original * 100;
  //       metrics[code].caprock.Metric.volumetric.pchange = metrics[code].caprock.Metric.volumetric.diff / metrics[code].caprock.Metric.volumetric.original * 100;
  //       metrics[code].caprock.Metric.average.pchange = metrics[code].caprock.Metric.average.diff / metrics[code].caprock.Metric.average.original * 100;
  //     }
      
      
  //     //get square miles
  //     metrics[code].caprock.USC.area *= Math.pow(75 * MapComponent.METER_TO_MILE_FACTOR, 2);
  //     //square kilometers
  //     metrics[code].caprock.Metric.area *= Math.pow(75 / 1000, 2);
      
  //     if(!MapComponent.SPECIAL_AQUIFERS.includes(code)) {
  //       //nocaprock only if not special aquifers
  //       //currently just number of cells, no need conversion
  //       metrics[code].nocaprock.Metric.area = metrics[code].nocaprock.USC.area;
  //       //compute metric average recharges
  //       metrics[code].nocaprock.Metric.average.current = metrics[code].nocaprock.USC.average.current * MapComponent.INCH_TO_MILLIMETER_FACTOR;
  //       metrics[code].nocaprock.Metric.average.original = metrics[code].nocaprock.USC.average.original * MapComponent.INCH_TO_MILLIMETER_FACTOR;

  //       //compute metrics in volumetric
  //       metrics[code].nocaprock.USC.volumetric.original = (metrics[code].nocaprock.USC.average.original * 75 * 75 * 144) / (231 * 0.3048 * 0.3048 * 365 * 1000000);
  //       metrics[code].nocaprock.USC.volumetric.current = (metrics[code].nocaprock.USC.average.current * 75 * 75 * 144) / (231 * 0.3048 * 0.3048 * 365 * 1000000);
  //       //instead of trying to figure out whole conversion, just convert Mgal to ML
  //       metrics[code].nocaprock.Metric.volumetric.original = metrics[code].nocaprock.USC.volumetric.original * MapComponent.GALLON_TO_LITER_FACTOR;
  //       metrics[code].nocaprock.Metric.volumetric.current = metrics[code].nocaprock.USC.volumetric.current * MapComponent.GALLON_TO_LITER_FACTOR;


  //       //average summation over cells
  //       metrics[code].nocaprock.USC.average.original /= metrics[code].nocaprock.USC.area;
  //       metrics[code].nocaprock.USC.average.current /= metrics[code].nocaprock.USC.area;

  //       metrics[code].nocaprock.Metric.average.original /= metrics[code].nocaprock.Metric.area;
  //       metrics[code].nocaprock.Metric.average.current /= metrics[code].nocaprock.Metric.area;

  //       //get difference and percent change
  //       metrics[code].nocaprock.USC.volumetric.diff = metrics[code].nocaprock.USC.volumetric.current - metrics[code].nocaprock.USC.volumetric.original;
  //       metrics[code].nocaprock.USC.average.diff = metrics[code].nocaprock.USC.average.current - metrics[code].nocaprock.USC.average.original;
  //       metrics[code].nocaprock.Metric.volumetric.diff = metrics[code].nocaprock.Metric.volumetric.current - metrics[code].nocaprock.Metric.volumetric.original;
  //       metrics[code].nocaprock.Metric.average.diff = metrics[code].nocaprock.Metric.average.current - metrics[code].nocaprock.Metric.average.original;
  //       //make sure not dividing by 0 if no recharge in selected cells
  //       if(metrics[code].nocaprock.USC.volumetric.original == 0) {
  //         //if the current change is also 0 (diff is 0) then pchange is 0, else set to infinity
  //         metrics[code].nocaprock.USC.volumetric.pchange = metrics[code].nocaprock.USC.volumetric.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
  //         metrics[code].nocaprock.USC.average.pchange = metrics[code].nocaprock.USC.average.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
  //         metrics[code].nocaprock.Metric.volumetric.pchange = metrics[code].nocaprock.Metric.volumetric.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
  //         metrics[code].nocaprock.Metric.average.pchange = metrics[code].nocaprock.Metric.average.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
  //       }
  //       else {
  //         metrics[code].nocaprock.USC.volumetric.pchange = metrics[code].nocaprock.USC.volumetric.diff / metrics[code].nocaprock.USC.volumetric.original * 100;
  //         metrics[code].nocaprock.USC.average.pchange = metrics[code].nocaprock.USC.average.diff / metrics[code].nocaprock.USC.average.original * 100;
  //         metrics[code].nocaprock.Metric.volumetric.pchange = metrics[code].nocaprock.Metric.volumetric.diff / metrics[code].nocaprock.Metric.volumetric.original * 100;
  //         metrics[code].nocaprock.Metric.average.pchange = metrics[code].nocaprock.Metric.average.diff / metrics[code].nocaprock.Metric.average.original * 100;
  //       }
  //       //get square miles
  //       metrics[code].nocaprock.USC.area *= Math.pow(75 * MapComponent.METER_TO_MILE_FACTOR, 2);
  //       //square kilometers
  //       metrics[code].nocaprock.Metric.area *= Math.pow(75 / 1000, 2);
  //     }
  //   });

    

    

  //   let codes = Object.keys(AQUIFER_NAME_MAP);
  //   //sort geographically by aquifer code
  //   codes.sort((c1, c2) => {
  //     return parseInt(c2) - parseInt(c1);
  //   });

  //   codes.forEach((code) => {
  //     if(MapComponent.SPECIAL_AQUIFERS.includes(code)) {
  //       let info = {
  //         name: "",
  //         metrics: {},
  //         roundedMetrics: {}
  //       };

  //       info.metrics = metrics[code].caprock;
  //       info.roundedMetrics = this.roundMetrics(metrics[code].caprock);
  //       info.name = AQUIFER_NAME_MAP[code];
  //       data.specialAquifers.push(info);
  //     }
  //     else {
  //       let info = {
  //         name: "",
  //         metrics: {},
  //         roundedMetrics: {}
  //       };
  //       let infoNoCaprock = {
  //         name: "",
  //         metrics: {},
  //         roundedMetrics: {}
  //       };

  //       info.metrics = metrics[code].caprock;
  //       info.roundedMetrics = this.roundMetrics(metrics[code].caprock);
  //       info.name = AQUIFER_NAME_MAP[code];
  //       data.aquifers.push(info);

  //       infoNoCaprock.metrics = metrics[code].nocaprock;
  //       infoNoCaprock.roundedMetrics = this.roundMetrics(metrics[code].nocaprock);
  //       infoNoCaprock.name = AQUIFER_NAME_MAP[code];
  //       data.aquifersNoCaprock.push(infoNoCaprock);
  //     }
  //   });

  //   //process total metrics
  //   data.total.metrics = metrics.total.caprock;
  //   data.total.roundedMetrics = this.roundMetrics(metrics.total.caprock);

  //   data.totalNoCaprock.metrics = metrics.total.nocaprock;
  //   data.totalNoCaprock.roundedMetrics = this.roundMetrics(metrics.total.nocaprock);

  //   //console.log(data);

  //   return data;
  // }



  // //could probably refactor to use this for generating and passing metrics to bottombar
  // //also could use something similar to report generation for passing name and metric breakdown
  // //maybe have subfunctions in generate report for different parts

  // //also need to update all full map computations to disclude background cells
  // getMetricsSuite(indexes: number[], caprock: boolean) {

  //   let metrics = {
  //     USC: {
  //       average: {
  //         original: 0,
  //         current: 0,
  //         diff: 0,
  //         pchange: 0
  //       },
  //       volumetric: {
  //         original: 0,
  //         current: 0,
  //         diff: 0,
  //         pchange: 0
  //       },
  //       area: 0
  //     },
  //     Metric: {
  //       average: {
  //         original: 0,
  //         current: 0,
  //         diff: 0,
  //         pchange: 0
  //       },
  //       volumetric: {
  //         original: 0,
  //         current: 0,
  //         diff: 0,
  //         pchange: 0
  //       },
  //       area: 0
  //     }
  //   };

  //   let rechargeVals = this.types.recharge.currentData[this.currentScenario];
  //   let lcVals = this.types.landCover.data._covjson.ranges.cover.values;

  //   let cells = 0

  //   let checkInclude = (i: number) => {
  //     if(lcVals[i] == 0) {
  //       return false;
  //     }
      
  //     if(caprock) {
  //       return true;
  //     }
  //     else {
  //       if(this.caprock[i] == 0) {
  //         return false;
  //       }
  //       return true;
  //     }
  //   };

  //   //pass in null if want whole map
  //   if(indexes == null) {
  //     for(let i = 0; i < rechargeVals.length; i++) {
  //       //if background value don't count
  //       if(checkInclude(i)) {
  //         cells++;
  //         metrics.USC.average.current += rechargeVals[i];
  //         metrics.USC.average.original += this.types.recharge.baseData[this.baseScenario][i];
          
  //         metrics.Metric.average.current += rechargeVals[i] * MapComponent.INCH_TO_MILLIMETER_FACTOR;
  //         metrics.Metric.average.original += this.types.recharge.baseData[this.baseScenario][i] * MapComponent.INCH_TO_MILLIMETER_FACTOR;
  //       }
  //     }

  //     //cells = rechargeVals.length;
  //   }
  //   else {
  //     //get total average over cells
  //     indexes.forEach((index) => {
  //       if(checkInclude(index)) {
  //         cells++;
  //         metrics.USC.average.current += rechargeVals[index];
  //         metrics.USC.average.original += this.types.recharge.baseData[this.baseScenario][index];

  //         metrics.Metric.average.current += rechargeVals[index] * MapComponent.INCH_TO_MILLIMETER_FACTOR;
  //         metrics.Metric.average.original += this.types.recharge.baseData[this.baseScenario][index] * MapComponent.INCH_TO_MILLIMETER_FACTOR;
  //       }
  //     });
    
  //   }
    
  //   //compute metrics in volumetric
  //   metrics.USC.volumetric.original = (metrics.USC.average.original * 75 * 75 * 144) / (231 * 0.3048 * 0.3048 * 365 * 1000000);
  //   metrics.USC.volumetric.current = (metrics.USC.average.current * 75 * 75 * 144) / (231 * 0.3048 * 0.3048 * 365 * 1000000);
  //   //instead of trying to figure out whole conversion, just convert Mgal to ML
  //   metrics.Metric.volumetric.original = metrics.USC.volumetric.original * MapComponent.GALLON_TO_LITER_FACTOR;
  //   metrics.Metric.volumetric.current = metrics.USC.volumetric.current * MapComponent.GALLON_TO_LITER_FACTOR;

  //   //get square miles
  //   metrics.USC.area = Math.pow(75 * MapComponent.METER_TO_MILE_FACTOR, 2) * cells;
  //   //square kilometers
  //   metrics.Metric.area = Math.pow(75 / 1000, 2) * cells;

  //   //if no cells leave at default value of 0 to avoid dividing by 0
  //   if(cells > 0) {
  //     //average average summation over cells
  //     metrics.USC.average.original /= cells;
  //     metrics.USC.average.current /= cells;

  //     metrics.Metric.average.original /= cells;
  //     metrics.Metric.average.current /= cells;

  //     //get difference and percent change
  //     metrics.USC.volumetric.diff = metrics.USC.volumetric.current - metrics.USC.volumetric.original;
  //     metrics.USC.average.diff = metrics.USC.average.current - metrics.USC.average.original;
  //     metrics.Metric.volumetric.diff = metrics.Metric.volumetric.current - metrics.Metric.volumetric.original;
  //     metrics.Metric.average.diff = metrics.Metric.average.current - metrics.Metric.average.original;
  //     //make sure not dividing by 0 if no recharge in selected cells
  //     if(metrics.USC.volumetric.original == 0) {
  //       //if the current change is also 0 (diff is 0) then pchange is 0, else set to infinity
  //       metrics.USC.volumetric.pchange = metrics.USC.volumetric.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
  //       metrics.USC.average.pchange = metrics.USC.average.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
  //       metrics.Metric.volumetric.pchange = metrics.Metric.volumetric.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
  //       metrics.Metric.average.pchange = metrics.Metric.average.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
  //     }
  //     else {
  //       metrics.USC.volumetric.pchange = metrics.USC.volumetric.diff / metrics.USC.volumetric.original * 100;
  //       metrics.USC.average.pchange = metrics.USC.average.diff / metrics.USC.average.original * 100;
  //       metrics.Metric.volumetric.pchange = metrics.Metric.volumetric.diff / metrics.Metric.volumetric.original * 100;
  //       metrics.Metric.average.pchange = metrics.Metric.average.diff / metrics.Metric.average.original * 100;
  //     }
  //   }

  //   return metrics;
  // }

  // getSelectedAquiferMetrics(codes: string[], caprock: boolean) {
  //   let metrics = {
  //     USC: {
  //       average: {
  //         original: 0,
  //         current: 0,
  //         diff: 0,
  //         pchange: 0
  //       },
  //       volumetric: {
  //         original: 0,
  //         current: 0,
  //         diff: 0,
  //         pchange: 0
  //       },
  //       area: 0
  //     },
  //     Metric: {
  //       average: {
  //         original: 0,
  //         current: 0,
  //         diff: 0,
  //         pchange: 0
  //       },
  //       volumetric: {
  //         original: 0,
  //         current: 0,
  //         diff: 0,
  //         pchange: 0
  //       },
  //       area: 0
  //     }
  //   };
  
  //   this.highlightedAquiferIndices = [];
    
  //   //if empty just return all 0 metrics
  //   if(codes.length != 0) {
  //     let rechargeVals = this.types.recharge.currentData[this.currentScenario];
  
  //     this.aquifers.forEach((aquifer, i) => {
  //       //aquifer code 0 (no aquifer), no need to check through code array
  //       if(aquifer == "0") {
  //         return;
  //       }
  //       if(codes.includes(aquifer)) {
  //         this.highlightedAquiferIndices.push(i);
  //         if(caprock || this.caprock[i] == 1) {
  //           metrics.USC.area++;
  //           metrics.USC.average.current += rechargeVals[i];
  //           metrics.USC.average.original += this.types.recharge.baseData[this.baseScenario][i];
  //         }
  //       }
  
  //     });
  
  //     //currently just number of cells, no need conversion
  //     metrics.Metric.area = metrics.USC.area;
  //     //compute metric average recharges
  //     metrics.Metric.average.current = metrics.USC.average.current * MapComponent.INCH_TO_MILLIMETER_FACTOR;
  //     metrics.Metric.average.original = metrics.USC.average.original * MapComponent.INCH_TO_MILLIMETER_FACTOR;
  
  //     //compute metrics in volumetric
  //     metrics.USC.volumetric.original = (metrics.USC.average.original * 75 * 75 * 144) / (231 * 0.3048 * 0.3048 * 365 * 1000000);
  //     metrics.USC.volumetric.current = (metrics.USC.average.current * 75 * 75 * 144) / (231 * 0.3048 * 0.3048 * 365 * 1000000);
  //     //instead of trying to figure out whole conversion, just convert Mgal to ML
  //     metrics.Metric.volumetric.original = metrics.USC.volumetric.original * MapComponent.GALLON_TO_LITER_FACTOR;
  //     metrics.Metric.volumetric.current = metrics.USC.volumetric.current * MapComponent.GALLON_TO_LITER_FACTOR;
  
  
  //     //average summation over cells
  //     metrics.USC.average.original /= metrics.USC.area;
  //     metrics.USC.average.current /= metrics.USC.area;
  
  //     metrics.Metric.average.original /= metrics.Metric.area;
  //     metrics.Metric.average.current /= metrics.Metric.area;
  
  //     //get difference and percent change
  //     metrics.USC.volumetric.diff = metrics.USC.volumetric.current - metrics.USC.volumetric.original;
  //     metrics.USC.average.diff = metrics.USC.average.current - metrics.USC.average.original;
  //     metrics.Metric.volumetric.diff = metrics.Metric.volumetric.current - metrics.Metric.volumetric.original;
  //     metrics.Metric.average.diff = metrics.Metric.average.current - metrics.Metric.average.original;
  //     //make sure not dividing by 0 if no recharge in selected cells
  //     if(metrics.USC.volumetric.original == 0) {
  //       //if the current change is also 0 (diff is 0) then pchange is 0, else set to infinity
  //       metrics.USC.volumetric.pchange = metrics.USC.volumetric.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
  //       metrics.USC.average.pchange = metrics.USC.average.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
  //       metrics.Metric.volumetric.pchange = metrics.Metric.volumetric.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
  //       metrics.Metric.average.pchange = metrics.Metric.average.diff == 0 ? 0 : Number.POSITIVE_INFINITY;
  //     }
  //     else {
  //       metrics.USC.volumetric.pchange = metrics.USC.volumetric.diff / metrics.USC.volumetric.original * 100;
  //       metrics.USC.average.pchange = metrics.USC.average.diff / metrics.USC.average.original * 100;
  //       metrics.Metric.volumetric.pchange = metrics.Metric.volumetric.diff / metrics.Metric.volumetric.original * 100;
  //       metrics.Metric.average.pchange = metrics.Metric.average.diff / metrics.Metric.average.original * 100;
  //     }
      
  //     //get square miles
  //     metrics.USC.area *= Math.pow(75 * MapComponent.METER_TO_MILE_FACTOR, 2);
  //     //square kilometers
  //     metrics.Metric.area *= Math.pow(75 / 1000, 2);
  //   }
  
  //   return metrics;
  // }
  
  
  
  // roundMetrics(metrics: any) {
  //   let roundedMetrics = {
  //     USC: {
  //       average: {
  //         original: "",
  //         current: "",
  //         diff: "",
  //         pchange: ""
  //       },
  //       volumetric: {
  //         original: "",
  //         current: "",
  //         diff: "",
  //         pchange: ""
  //       },
  //       area: ""
  //     },
  //     Metric: {
  //       average: {
  //         original: "",
  //         current: "",
  //         diff: "",
  //         pchange: ""
  //       },
  //       volumetric: {
  //         original: "",
  //         current: "",
  //         diff: "",
  //         pchange: ""
  //       },
  //       area: ""
  //     }
  //   };
  
  //   let decimalPlaces = 2;
  
  //   //convert rounded number string to number then back to string so scientific notation is removed
  //   roundedMetrics.USC.average.original = this.roundToDecimalPlaces(metrics.USC.average.original, decimalPlaces);
  //   roundedMetrics.USC.average.current = this.roundToDecimalPlaces(metrics.USC.average.current, decimalPlaces);
  //   roundedMetrics.USC.volumetric.original = this.roundToDecimalPlaces(metrics.USC.volumetric.original, decimalPlaces);
  //   roundedMetrics.USC.volumetric.current = this.roundToDecimalPlaces(metrics.USC.volumetric.current, decimalPlaces);
  //   roundedMetrics.USC.average.diff = this.roundToDecimalPlaces(metrics.USC.average.diff, decimalPlaces);
  //   roundedMetrics.USC.volumetric.diff = this.roundToDecimalPlaces(metrics.USC.volumetric.diff, decimalPlaces);
  //   roundedMetrics.USC.average.pchange = this.roundToDecimalPlaces(metrics.USC.average.pchange, decimalPlaces);
  //   roundedMetrics.USC.volumetric.pchange = this.roundToDecimalPlaces(metrics.USC.volumetric.pchange, decimalPlaces);
  //   roundedMetrics.USC.area = this.roundToDecimalPlaces(metrics.USC.area, decimalPlaces);
  
  //   roundedMetrics.Metric.average.original = this.roundToDecimalPlaces(metrics.Metric.average.original, decimalPlaces);
  //   roundedMetrics.Metric.average.current = this.roundToDecimalPlaces(metrics.Metric.average.current, decimalPlaces);
  //   roundedMetrics.Metric.volumetric.original = this.roundToDecimalPlaces(metrics.Metric.volumetric.original, decimalPlaces);
  //   roundedMetrics.Metric.volumetric.current = this.roundToDecimalPlaces(metrics.Metric.volumetric.current, decimalPlaces);
  //   roundedMetrics.Metric.average.diff = this.roundToDecimalPlaces(metrics.Metric.average.diff, decimalPlaces);
  //   roundedMetrics.Metric.volumetric.diff = this.roundToDecimalPlaces(metrics.Metric.volumetric.diff, decimalPlaces);
  //   roundedMetrics.Metric.average.pchange = this.roundToDecimalPlaces(metrics.Metric.average.pchange, decimalPlaces);
  //   roundedMetrics.Metric.volumetric.pchange = this.roundToDecimalPlaces(metrics.Metric.volumetric.pchange, decimalPlaces);
  //   roundedMetrics.Metric.area = this.roundToDecimalPlaces(metrics.Metric.area, decimalPlaces);
  
  
  //   return roundedMetrics;
  // }
  
  // roundToDecimalPlaces(value: number, places: number): string {
  //   let isNegative = value < 0;
  //   let shift = Math.pow(10, places);
  //   let abs = Math.abs(value);
  //   let digits = Math.round(abs * shift).toString();
  //   while(digits.length < places + 1) {
  //     digits = "0" + digits;
  //   }
  //   if(isNegative) {
  //     digits = "-" + digits;
  //   }
  //   let rounded = digits.slice(0, -2) + "." + digits.slice(-2);
  //   return rounded;
  // }
  
  // numericRoundToDecimalPlaces(value: number, places: number): number {
  //   let shift = Math.pow(10, places);
  //   let scaled = value * shift;
  //   let rounded = Math.round(scaled);
  //   return rounded / shift;
  // }
  
  
  
  
  
  
  // //REVAMP THIS TO BE MORE EFFICIENT USING UPDATED POINTS LIST
  // updateMetrics(updateObjects: any) {
  //   // let items;
  
  //   // //assuming eachlayer returns same order every time, should correspond
  //   // let i = 0;
  //   // this.types.aquifers.layer.eachLayer((layer) => {
  //   //   items = new L.featureGroup();
  //   //   this.metrics.aquifers[i++].metrics = this.getMetricsSuite(items.addLayer(layer));
  //   // })
  
  //   // i = 0;
  //   // this.drawnItems.eachLayer((layer) => {
  //   //   items = new L.featureGroup();
  //   //   this.metrics.customAreas[i++].metrics = this.getMetricsSuite(items.addLayer(layer));
  //   // })
  
  //   // this.metrics.customAreasTotal = this.getMetricsSuite(this.drawnItems);
  
  //   // this.metrics.total = this.getMetricsSuite(null);
  
  //   this.metrics = this.createMetrics();
  //   if(this.baseLayer.name == "Recharge Rate") {
  //     this.includeCaprock ? this.mapService.updateMetrics(this, "full", this.metrics.total.roundedMetrics) : this.mapService.updateMetrics(this, "full", this.metrics.totalNoCaprock.roundedMetrics);
  //   }
  // }

  // private getInternalIndices(geojsonObjects: any, backgroundIndices?: number[]): number[] {
  //   let indices = [];

  //   geojsonObjects.features.forEach((feature) => {
  //     //if not a feature return
  //     if(feature.type.toLowerCase() != "feature") {
  //       return;
  //     }
  //     let geoType = feature.geometry.type.toLowerCase();
  //     switch(geoType) {
  //       case "polygon": {
  //         let coordinates = feature.geometry.coordinates;
  //         indices = indices.concat(this.getPolygonInternalIndices(coordinates, backgroundIndices));
  //         break;
  //       }
  //       case "multipolygon": {
  //         let coordinates = feature.geometry.coordinates;
  //         coordinates.forEach((polygon) => {
  //           indices = indices.concat(this.getPolygonInternalIndices(polygon, backgroundIndices));
  //         });
  //         break;
  //       }
  //     }
  //   });
    
  //   return indices;
  // }

  // private getPolygonInternalIndices(coordinates: number[][][], backgroundIndices: number[]) {
  //   let indices = [];
  //   let convertedPoints = [];
  //   let a = [];
  //   let b = [];
  //   let xmax = Number.NEGATIVE_INFINITY;
  //   let xmin = Number.POSITIVE_INFINITY;
  //   let ymax = Number.NEGATIVE_INFINITY;
  //   let ymin = Number.POSITIVE_INFINITY;

  //   //bounding box on first ring because outer ring
  //   let pointsBase = coordinates[0];

  //   for(let i = 0; i < pointsBase.length; i++) {
  //     convertedPoints.push(MapComponent.proj4(MapComponent.longlat, MapComponent.utm, pointsBase[i]));
  //   }

  //   for(let i = 0; i < convertedPoints.length - 1; i++) {
  //     //coordinates are in long lat order (I think)

  //     //get max and min vals to limit coordinates need to compare
  //     if(convertedPoints[i][0] > xmax) {
  //       xmax = convertedPoints[i][0];
  //     }
  //     if(convertedPoints[i][0] < xmin) {
  //       xmin = convertedPoints[i][0];
  //     }
  //     if(convertedPoints[i][1] > ymax) {
  //       ymax = convertedPoints[i][1];
  //     }
  //     if(convertedPoints[i][1] < ymin) {
  //       ymin = convertedPoints[i][1];
  //     }
  //     //convert these points, less conversions than trying to convert grid points
  //     a.push({
  //       x: convertedPoints[i][0],
  //       y: convertedPoints[i][1]
  //     });
  //     b.push({
  //       x: convertedPoints[i + 1][0],
  //       y: convertedPoints[i + 1][1]
  //     });
  //   }
  //   //add segments for inner rings
  //   for(let i = 1; i < coordinates.length; i++) {
  //     pointsBase = coordinates[i];
  //     convertedPoints = [];

  //     for(let i = 0; i < pointsBase.length; i++) {
  //       convertedPoints.push(MapComponent.proj4(MapComponent.longlat, MapComponent.utm, pointsBase[i]));
  //     }

  //     for(let i = 0; i < convertedPoints.length - 1; i++) {
  //       a.push({
  //         x: convertedPoints[i][0],
  //         y: convertedPoints[i][1]
  //       });
  //       b.push({
  //         x: convertedPoints[i + 1][0],
  //         y: convertedPoints[i + 1][1]
  //       });
  //     }
  //   }


  //   //-----------------end pre-processing-------------------

      

  //   //convert max min values and find range of cells
  //   //no need to check every single one
  //   //convert coordinate and get x value
  //   // let xmaxUTM = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [xmax_x, xmax_y])[0];
  //   // let xminUTM = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [xmin_x, xmin_y])[0];
  //   // let ymaxUTM = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [ymax_x, ymax_y])[1];
  //   // let yminUTM = MapComponent.proj4(MapComponent.longlat, MapComponent.utm, [ymin_x, ymin_y])[1];

  //   let xs = this.types.landCover.data._covjson.domain.axes.get("x").values;
  //   let ys = this.types.landCover.data._covjson.domain.axes.get("y").values;
  //   let lcVals = this.types.landCover.data._covjson.ranges.cover.values;

  //   let minxIndex;
  //   let maxxIndex;
  //   let minyIndex;
  //   let maxyIndex;

  //   //again, assume values are in order
  //   //find min and max indexes
  //   //check if ascending or descending order, findIndex returns first occurance
  //   if(xs[0] < xs[1]) {
  //     minxIndex = Math.max(xs.findIndex((val) => { return val >= xmin }), 0);
  //     //> not >= so returns index after last even if on edge 
  //     maxxIndex = xs.findIndex((val) => { return val > xmax });
  //     if(maxxIndex < 0) {
  //       maxxIndex = this.gridWidthCells;
  //     }
  //   }
  //   else {
  //     maxxIndex = xs.findIndex((val) => { return val < xmin });
  //     minxIndex = Math.max(xs.findIndex((val) => { return val <= xmax }), 0);
  //     if(maxxIndex < 0) {
  //       maxxIndex = this.gridWidthCells;
  //     }
  //   }
  //   if(ys[0] < ys[1]) {
  //     minyIndex = Math.max(ys.findIndex((val) => { return val >= ymin }), 0);
  //     maxyIndex = ys.findIndex((val) => { return val > ymax });
  //     if(maxyIndex < 0) {
  //       maxyIndex = this.gridHeightCells;
  //     }
  //   }
  //   else {
  //     maxyIndex = ys.findIndex((val) => { return val < ymin });
  //     minyIndex = Math.max(ys.findIndex((val) => { return val <= ymax }), 0);
  //     if(maxyIndex < 0) {
  //       maxyIndex = this.gridHeightCells;
  //     }
  //   }

  //   let index;
  //   //convert cell coords to long lat and raycast
  //   //max index calculation returns index after last index in range, so only go to index before in loop (< not <=)
  //   for(let xIndex = minxIndex; xIndex < maxxIndex; xIndex++) {
  //     for(let yIndex = minyIndex; yIndex < maxyIndex; yIndex++) {
  //       index = this.getIndex(xIndex, yIndex);
  //       //don't include if background
  //       if(lcVals[index] != 0) {
  //         if(this.isInternal(a, b, { x: xs[xIndex], y: ys[yIndex] })) {
  //           indices.push(index)
  //         }
  //       }
  //       else if(backgroundIndices != undefined) {
  //         if(this.isInternal(a, b, { x: xs[xIndex], y: ys[yIndex] })) {
  //           backgroundIndices.push(index)
  //         }
  //       }
  //     }
  //   }

  //   return indices;
  // }


  // //can specify origin if 0, 0 is in range, not necessary for cover being used (0,0 not in range)
  // private isInternal(a: any[], b: any[], point: any, origin: any = { x: 0, y: 0 }): boolean {
  //   //raycasting algorithm, point is internal if intersects an odd number of edges
  //   let internal = false;
  //   for(let i = 0; i < a.length; i++) {
  //     //segments intersect iff endpoints of each segment are on opposite sides of the other segment
  //     //check if angle formed is counterclockwise to determine which side endpoints fall on
  //     if(this.ccw(a[i], origin, point) != this.ccw(b[i], origin, point) && this.ccw(a[i], b[i], origin) != this.ccw(a[i], b[i], point)) {
  //       internal = !internal
  //     }

  //   }
  //   return internal;
  // }

  // //determinant formula yields twice the signed area of triangle formed by 3 points
  // //counterclockwise if negative, clockwise if positive, collinear if 0
  // private ccw(p1, p2, p3): boolean {
  //   //if on line counts, both will be 0, probably need to add special value (maybe return -1, 0, or 1)
  //   return ((p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y)) > 0;
  // }
}


