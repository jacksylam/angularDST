import { Component, OnInit, Inject, HostListener } from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material";

@Component({
  selector: 'app-advanced-mapping-dialog',
  templateUrl: './advanced-mapping-dialog.component.html',
  styleUrls: ['./advanced-mapping-dialog.component.css']
})

export class AdvancedMappingDialogComponent implements OnInit {

  sourceTypes: string[];
  assigned: string[];
  allTypes: string[];
  canAdd = true;
  //readonly KEY_ACCESSOR = Object.keys;
  // sourceLC: any;
  // targetLC: any;
  // defaultTransform: any;


  formState: {source: string, target: string, oldSource: string}[];
  defaultType: string;

  //catch escape key, run cancel function
  @HostListener('document:keydown.escape', ['$event']) onKeydownHandler(evt: KeyboardEvent) {
    this.cancel();
  }

  constructor(private dialogRef: MatDialogRef<AdvancedMappingDialogComponent>, @Inject(MAT_DIALOG_DATA) info) {
    this.sourceTypes = info.sourceTypes;
    this.allTypes = info.allTypes;

    //put background type at end and rename
    let backgroundIndex = this.allTypes.indexOf("Background");
    //make sure exists
    if(backgroundIndex >= 0) {
      this.allTypes.splice(backgroundIndex, 1);
      this.allTypes.push("Background (No Recharge)");
    }


    this.formState = [];
    this.assigned = [];
    if(info.state) {
      // Object.keys(info.state).forEach((key) => {
      //   //if default key set default type
      //   if(key == "default") {
      //     this.defaultType = info.state[key];
      //   }
      //   //otherwise construct representative form fields
      //   else {
      //     //check if this source type is available in current set
      //     let sourceCoverIndex = this.sourceTypes.indexOf(key);
      //     //disclude options with invalid source type
      //     if(sourceCoverIndex >= 0) {
      //       this.formState.push({source: key, target: info.state[key], oldSource: key});
      //       //remove pre-mapped sources from available source types list
      //       this.assigned.push(key);
      //     }
      //   }      
        
      // });

      //CHANGE SO SWAPS BACK TO BACKGROUND LABEL TEXT

      this.defaultType = info.state.default == "Background" ? "Background (No Recharge)" : info.state.default;
      info.state.formState.forEach((field) => {
        if(field.target == "Background") {
          field.target = "Background (No Recharge)";
        }
        //if source is null (partially filled out) allow, but nothing added to assigned
        if(field.source == null) {
          this.formState.push(field);
        }
        //if not null and valid source type for current available source type pool add field and push to assigned values
        //if source type not avaialable in current pool just ignore
        else if(this.sourceTypes.includes(field.source)) {
          this.formState.push(field);
          this.assigned.push(field.source);
        }
      });

      //if all fields taken disable add option
      if(this.formState.length == this.sourceTypes.length) {
        this.canAdd = false;
      }
      //if more than the allowed number of fields, must have some partial fields
      //first remove any fields with both values null until sufficient length
      //if still too many, remove fields with null source, starting from last field, until sufficient length
      else if(this.formState.length > this.sourceTypes.length) {
        //will be set to exact length, so disable add
        this.canAdd = false;


        for(let i = this.formState.length - 1; i >= 0; i--) {
          if(this.formState[i].source == null && this.formState[i].target == null) {
            //can remove elements in loop since going backwards (shifted elements have already been processed)
            this.formState.splice(i, 1);
            //check if enough indexes 
            if(this.formState.length <= this.sourceTypes.length) {
              break;
            }
          }
        }


        //check if both null loop trimmed enough, otherwise start removing items with only null source
        if(this.formState.length > this.sourceTypes.length) {
          for(let i = this.formState.length - 1; i >= 0; i--) {
            if(this.formState[i].source == null) {
              this.formState.splice(i, 1);
              if(this.formState.length <= this.sourceTypes.length) {
                break;
              }
            }
          }
        }
      }
      //should have at least one item
      if(this.formState.length == 0) {
        this.addOption();
      }
    }
    else {
      //set default default type
      this.defaultType = "No Change";
      //push new option as well
      this.addOption();
    }

    

    /*
    here going to need to use format:
    [{source: <sourceLC>, target: <targetLC>}, ...]
    will make dealing with html element indexing easier
    */

  //disable default close operation
   this.dialogRef.disableClose = true;
   //when backdrop clicked pass to cancel function to save state
   this.dialogRef.backdropClick().subscribe(result => {
     this.cancel();
   });
  }

  ngOnInit() {
    
  }


  addOption() {
    //push empty option
    this.formState.push({source: null, target: null, oldSource: null});
    if(this.formState.length >= this.sourceTypes.length) {
      this.canAdd = false;
    }
  }

  removeOption(value: {source: string, target: string, oldSource: string}) {
    //add source type back to pool available for mapping
    let removedIndex = this.assigned.indexOf(value.source);
    this.assigned.splice(removedIndex, 1);

    //remove field from form state
    removedIndex = this.formState.indexOf(value);
    this.formState.splice(removedIndex, 1);

    //if one removed should always be able to add another
    this.canAdd = true;

    //if removed last item add a blank item
    if(this.formState.length == 0) {
      this.addOption();
    }

  }

  clear() {
    this.assigned = [];
    //indicate can add items in case locked
    this.canAdd = true;
    //set form state to single empty option
    this.formState = [];
    //add initial item, use this so checks length for canAdd
    this.addOption();

    //set default default type
    this.defaultType = "No Change";
  }

  sourceChange(event: any, changedField: {source: string, target: string, oldSource: string}) {
    // console.log(event);
    // //add old value back to pool of available source types
    // this.sourceTypes.push(changedField.oldSource);
    // //set oldSource reference to the new value

    //get index of old value and remove from assigned source type list
    if(changedField.oldSource != null) {
      let oldSourceIndex = this.assigned.indexOf(changedField.oldSource);
      this.assigned.splice(oldSourceIndex, 1);
    }
    

    this.assigned.push(event.value);

    changedField.oldSource = event.value;
    console.log(this.assigned);
  }

  submit() {
    let data = {
      mapping: {},
      state: {
        formState: this.formState,
        //convert back to "Background" keyword if "Background (No Recharge)" selected
        default: this.defaultType == "Background (No Recharge)" ? "Background" : this.defaultType
      }
    };
    

    this.formState.forEach((field) => {
      //only create mapping if field complete
      if(field.source != null && field.target != null) {
        //convert back to "Background" keyword if "Background (No Recharge)" selected
        let target = field.target == "Background (No Recharge)" ? "Background" : field.target;
        //map source to target
        (data.mapping as any)[field.source] = target;
      }
    });

    //set default value
    (data.mapping as any).default = data.state.default;

    //submit with mapping
    this.dialogRef.close(data);
  }

  
  cancel() {
    let data = {
      mapping: null,
      state: {
        formState: this.formState,
        default: this.defaultType
      }
    }
    this.dialogRef.close(data);
  }

}
