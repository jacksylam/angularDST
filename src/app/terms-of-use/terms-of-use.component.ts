import { Component, OnInit, Inject } from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material";

@Component({
  selector: 'app-terms-of-use',
  templateUrl: './terms-of-use.component.html',
  styleUrls: ['./terms-of-use.component.css']
})
export class TermsOfUseComponent implements OnInit {

  accepted = false;
  tooltip = "Please accept the conditions of use to continue";
  position = "after";

  constructor(private dialogRef: MatDialogRef<TermsOfUseComponent>, @Inject(MAT_DIALOG_DATA) data) {
    dialogRef.disableClose = true;
  }

  ngOnInit() {
  }

  setAccepted(value: boolean) {
    this.accepted = value;
    this.tooltip = value == true ? "" : "Please accept the terms of use to continue";
  }

}
