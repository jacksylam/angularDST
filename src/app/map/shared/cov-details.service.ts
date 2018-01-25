import { Injectable } from '@angular/core';
import { EventEmitter } from '@angular/core/';


//not actually using this, remove
@Injectable()
export class CovDetailsService {


  
  totalRecharge;
  scenario;
  baseLandcover;
  rechargeUpdate: EventEmitter<any> = new EventEmitter();
  scenarioUpdate: EventEmitter<any> = new EventEmitter();
  baseLandcoverUpdate: EventEmitter<any> = new EventEmitter();


  constructor() { }

  updateRechargeSum(rechargeArr) {
    this.totalRecharge = 0;
    rechargeArr.forEach(element => {
      this.totalRecharge += element;
    });

    this.rechargeUpdate.emit();
  }

  updateScenario(scenario: string) {
    this.scenario = scenario;

    this.scenarioUpdate.emit();
  }

  updateBaseLandcover(type: string) {
    this.baseLandcover = type;

    this.baseLandcoverUpdate.emit();
  }

}
