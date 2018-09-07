import { Injectable } from '@angular/core';

@Injectable()
export class CovjsonTemplateService {

  static readonly template = {
    "type": "Coverage",
    "domain": {
      "domainType": "Grid",
      "axes": {
        "x": {
          "values": []
        },
        "y": {
          "values": []
        }
      },
      "referencing": [
        {
          "coordinates": ["x", "y"],
          "system": {
            "type": "ProjectedCRS",
            "id": "http://www.opengis.net/def/crs/EPSG/0/32604"
          }
        }
      ]
    },
  }

  static readonly variableComponents = {
    recharge: {
      "parameters": {
        "recharge": {
          "type": "Parameter",
          "description": "recharge",
          "unit": {
            "label": {
              "en": "inches per year"
            }
          },
          "symbol": {
            "value": "inches per year",
            "type": ""
          },
          "observedProperty": {
            "id": null,
            "label": {
              "en": "recharge"
            }
          }
        }
      },
      "ranges": {
        "recharge": {
          "type": "NdArray",
          "dataType": "float",
          "axisNames": ["y","x"],
          "shape": [],
          "values": [] 
        }
      }
    },
    cover: {
      "parameters": {
        "cover": {
          "type": "Parameter",
          "description": "land covers",
          "unit": {
            "label": {
              "en": "cover_type"
            }
          },
          "symbol": {
            "value": "cover_type",
            "type": ""
          },
          "observedProperty": {
            "id": null,
            "label": {
              "en": "cover_type"
            }
          }
        }
      },
      "ranges": {
        "cover": {
          "type": "NdArray",
          "dataType": "float",
          "axisNames": ["y","x"],
          "shape": [],
          "values": []
        }
      }
    }
  }

 

  constructor() { }


  constructCovjson(xs: number[], ys: number[], values: number[], shape: number[], type: "cover" | "recharge"): any {
    let covjsonBase = JSON.parse(JSON.stringify(CovjsonTemplateService.template));
    let varParts = CovjsonTemplateService.variableComponents[type];
    Object.keys(varParts).forEach((key) => {
      covjsonBase[key] = JSON.parse(JSON.stringify(varParts[key]));
    });

    covjsonBase.domain.axes.x.values = xs;
    covjsonBase.domain.axes.y.values = ys;
    covjsonBase.ranges[type].shape = shape;
    covjsonBase.ranges[type].values = values;

    return covjsonBase;
  }

  //should probably do a more stringent check, but should be fine for now
  verifyCovjson(covjson: any): number[] {
    try {
      console.log(covjson);
      let shape = covjson.ranges.cover.shape;
      let numys = shape[0];
      let numxs = shape[1];
      if(covjson.domain.axes.x.values.length != numxs
        || covjson.domain.axes.y.values.length != numys
        || covjson.ranges.cover.values.length != numxs * numys) {
          return null;
      }
      else {
        return covjson.ranges.cover.values;
      }
    }
    catch(error) {
      //console.log(error);
      return null;
    }
  }

}