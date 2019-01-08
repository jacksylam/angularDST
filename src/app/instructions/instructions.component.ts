import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import {animate, transition, state, trigger, style} from '@angular/animations';


@Component({
  selector: 'app-instructions',
  templateUrl: './instructions.component.html',
  styleUrls: ['./instructions.component.css'],
  animations: [
    trigger('toggle', [
      state("Hide Image", style({
        height: "{{expanded}}px",
      }),
      {params: {expanded: "0px"}}),
      state("Show Image", style({
        height: "{{retracted}}px",
      }),
      {params: {retracted: "0px"}}),
      transition("* => *", animate('500ms ease-in-out')),
    ])
  ]
})

export class InstructionsComponent implements OnInit {

  @ViewChild('imageContainer') imageContainer;
  @ViewChild('image') image;
  @ViewChild('ref') ref;
  @ViewChild('arrow') arrow;

  toggleMessage = "Hide Image";

  mouseDown = false;
  scrolled = false;
  expandHeight = 0;
  retractHeight = 0;
  bounce = false;


  constructor(private changeDetector: ChangeDetectorRef) { }

  initHeight() {
    // this.expandHeight = Math.max(window.pageYOffset + this.image.nativeElement.offsetHeight - 75, this.image.nativeElement.offsetHeight + 25);
    // this.changeDetector.detectChanges()
    
  }

  ngOnInit() {
    this.retractHeight = window.pageYOffset;

    // document.addEventListener('mousedown', () => {
    //   this.mouseDown = true;
    // });

    // document.addEventListener('mouseup', () => {
    //   this.mouseDown = false;
    //   if(this.scrolled) {
    //     this.expandHeight = Math.max(window.pageYOffset + this.image.nativeElement.offsetHeight - 75, this.image.nativeElement.offsetHeight + 25);
    //     this.retractHeight = Math.max(window.pageYOffset - 125, 0);
    //     this.scrolled = false;
    //   }
    // });

    document.addEventListener('scroll', (e) => {
      this.expandHeight = Math.max(window.pageYOffset - 75), 0;
      this.retractHeight = window.pageYOffset;
    });

    window.addEventListener("resize", () => {
      this.expandHeight = Math.max(window.pageYOffset + this.image.nativeElement.offsetHeight - 75, this.image.nativeElement.offsetHeight + 25);
      this.retractHeight = window.pageYOffset;
    });
  }

  hover(src) {
    this.image.nativeElement.setAttribute("src", src);
    this.ref.nativeElement.setAttribute("href", src);
    this.expandHeight = Math.max(window.pageYOffset + this.image.nativeElement.offsetHeight - 75, this.image.nativeElement.offsetHeight + 25);
    this.retractHeight = window.pageYOffset;
  }

  toggleImage() {
    if(this.toggleMessage == "Hide Image") {
      this.imageContainer.nativeElement.style.display = "none";
      this.arrow.nativeElement.innerHTML = "&#187;";
      this.toggleMessage = "Show Image";
    }
    else {
      this.imageContainer.nativeElement.style.display = "block";
      this.arrow.nativeElement.innerHTML = "&#171;";
      this.toggleMessage = "Hide Image";
    }
  }

}
