import { Component, OnInit, Inject, ViewChild } from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material";

@Component({
  selector: 'app-upload-dialog',
  templateUrl: './upload-dialog.component.html',
  styleUrls: ['./upload-dialog.component.css']
})

export class UploadDialogComponent implements OnInit {

  @ViewChild("namePropertyInput") namePropertyInput;
  @ViewChild("lcPropertyInput") lcPropertyInput;
  @ViewChild("fileSelect") fileSelect;
  
  info: any;
  id: number;

  advanced = false;

  constructor(private dialogRef: MatDialogRef<UploadDialogComponent>, @Inject(MAT_DIALOG_DATA) data) {
    
    this.id = data.id;

    this.info = {
      shapes: false,
      cover: false,
      overwrite: false,
      shapeDetails: {
        format: 'custom',
        includeLC: true,
        properties: {
          name: "name",
          lc: "lcCode"
        }
      },    
      files: null
    };

  }

  ngOnInit() {
  }

  updateValue(field: string, value: any) {
    this.info[field] = value;
  }

  updateShapeDetails(field: string, value: any) {
    this.info.shapeDetails[field] = value;
  }

  updatePropertiesName(property: string, value: string) {
    this.info.shapeDetails.properties[property] = value;
  }

  public close(upload: any = null) {
    console.log(this.info);
    if(upload == null) {
      this.dialogRef.close()
    }
    else {
      this.info.files = upload.target.files;
      this.dialogRef.close(this.info);
    }
  }

  toggleAdvanced() {
    this.advanced = !this.advanced;
  }

}
