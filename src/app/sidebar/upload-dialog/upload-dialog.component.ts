import { Component, OnInit, Inject } from '@angular/core';
// import {FormBuilder, FormGroup, FormControl, FormGroupDirective} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material";

@Component({
  selector: 'app-upload-dialog',
  templateUrl: './upload-dialog.component.html',
  styleUrls: ['./upload-dialog.component.css']
})

export class UploadDialogComponent implements OnInit {

  info: any;
  id: number;

  constructor(private dialogRef: MatDialogRef<UploadDialogComponent>, @Inject(MAT_DIALOG_DATA) data) {
    
    this.id = data.id;

    this.info = {
      shapes: false,
      cover: false,
      overwrite: false,
      format: 'custom',
      files: null
    };

  }

  ngOnInit() {
  }

  updateValue(field: string, value: any) {
    this.info[field] = value;
  }

  public close(upload: any = null) {
    console.log(this.info);
    if(upload == null || (!(this.info.shapes || this.info.cover))) {
      this.dialogRef.close()
    }
    else {
      this.info.files = upload.target.files;
      this.dialogRef.close(this.info);
    }
  }

}
