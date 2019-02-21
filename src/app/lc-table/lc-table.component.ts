import { Component, OnInit, Input } from '@angular/core';
import { COVER_ENUM } from '../map/shared/cover_enum';


@Component({
  selector: 'app-lc-table',
  templateUrl: './lc-table.component.html',
  styleUrls: ['./lc-table.component.css']
})
export class LcTableComponent implements OnInit {

  @Input() columns: number;
  @Input() header: string;

  rows = [];
  constructor() { }

  ngOnInit() {
    let rows = Object.keys(COVER_ENUM).map((name) => {
      return {
        name: name,
        code: COVER_ENUM[name]
      };
    })
    .sort((a, b) => {
      let t1 = a.name;
      let t2 = b.name;
      return t1 < t2 ? -1 : 1;
    });

    let colSize = Math.ceil(rows.length / this.columns);
    for(let i = 0; i < this.columns; i++) {
      this.rows = this.rows.concat([rows.slice(i * colSize, Math.min((i + 1) * colSize, rows.length))]);
    }
    
  }

}
