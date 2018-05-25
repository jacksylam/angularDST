import { Component, OnInit, Inject } from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material";

@Component({
  selector: 'app-download-dialog',
  templateUrl: './download-dialog.component.html',
  styleUrls: ['./download-dialog.component.css']
})
export class DownloadDialogComponent implements OnInit {

  options: any;
  id: number

  constructor(private dialogRef: MatDialogRef<DownloadDialogComponent>, @Inject(MAT_DIALOG_DATA) data) {
    this.options = {
      shapes: false,
      recharge: false,
      cover: false,
      format: 'covjson'
    };

  }

  ngOnInit() {
  }

  updateValue(field: string, value: any) {
    this.options[field] = value;
  }
  
  
  public close(submit: any = null) {
    //check if operation canceled or if no downloads were selected
    submit == null || (!(this.options.shapes || this.options.cover || this.options.recharge)) ? this.dialogRef.close() : this.dialogRef.close(this.options);
  }
  

}
