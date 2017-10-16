import { SingleData } from './singledata';

export class MultiData {
  name: string;
  series: SingleData[];

  constructor(name: string) {
    this.name = name;
    this.series = [];
  }
}
