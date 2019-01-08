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
  expandHeight = 118 + 25;
  retractHeight = 0;

  constructor(private changeDetector: ChangeDetectorRef) { }

  initHeight() {
    // this.expandHeight = Math.max(window.pageYOffset + this.image.nativeElement.offsetHeight - 75, this.image.nativeElement.offsetHeight + 25);
    // this.changeDetector.detectChanges()
    
  }

  ngOnInit() {
    this.retractHeight = Math.max(window.pageYOffset - 125, 0);

    document.addEventListener('mousedown', () => {
      this.mouseDown = true;
    });

    document.addEventListener('mouseup', () => {
      this.mouseDown = false;
      if(this.scrolled) {
        this.expandHeight = Math.max(window.pageYOffset + this.image.nativeElement.offsetHeight - 75, this.image.nativeElement.offsetHeight + 25);
        this.retractHeight = Math.max(window.pageYOffset - 125, 0);
        this.scrolled = false;
      }
    });

    document.addEventListener('scroll', (e) => {
      if(this.toggleMessage == "Show Image" || !this.mouseDown) {
        this.expandHeight = Math.max(window.pageYOffset + this.image.nativeElement.offsetHeight - 75, this.image.nativeElement.offsetHeight + 25);
        this.retractHeight = Math.max(window.pageYOffset - 125, 0);
      }
      else {
        this.scrolled = true;
      }
    });

    window.addEventListener("resize", () => {
      this.expandHeight = Math.max(window.pageYOffset + this.image.nativeElement.offsetHeight - 75, this.image.nativeElement.offsetHeight + 25);
        this.retractHeight = Math.max(window.pageYOffset - 125, 0);
    });
  }

  hover(src) {
    this.image.nativeElement.setAttribute("src", src);
    this.ref.nativeElement.setAttribute("href", src);
    this.expandHeight = Math.max(window.pageYOffset + this.image.nativeElement.offsetHeight - 75, this.image.nativeElement.offsetHeight + 25);
    this.retractHeight = Math.max(window.pageYOffset - 125, 0);
  }

  toggleImage() {
    if(this.toggleMessage == "Hide Image") {
      this.image.nativeElement.style.visibility = "hidden";
      this.imageContainer.nativeElement.style.position = "absolute";
      this.arrow.nativeElement.innerHTML = "&#187;";
      this.toggleMessage = "Show Image";
    }
    else {
      this.image.nativeElement.style.visibility = "visible";
      this.imageContainer.nativeElement.style.position = "relative";
      this.arrow.nativeElement.innerHTML = "&#171;";
      this.toggleMessage = "Hide Image";
    }
  }

}
