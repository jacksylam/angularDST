import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import {animate, transition, state, trigger, style} from '@angular/animations';


@Component({
  selector: 'app-instructions',
  templateUrl: './instructions.component.html',
  styleUrls: ['./instructions.component.css'],
  animations: [
    trigger('toggleButton', [
      state("Hide Image", style({
        top: "{{expanded}}px",
      }),
      {params: {expanded: "0px"}}),
      state("Show Image", style({
        top: "{{retracted}}px",
      }),
      {params: {retracted: "0px"}}),
      transition("* => *", animate('500ms ease-in-out')),
    ]),
    trigger('toggleImage', [
      state("Hide Image", style({
        transform: "translateY(0px)",
      })),
      state("Show Image", style({
        transform: "translateY(-{{retracted}}px)",
      }),
      {params: {retracted: "0px"}}),
      transition("* => *", animate('500ms ease-in-out')),
    ])
  ]
})

export class InstructionsComponent implements OnInit {

  @ViewChild('imageContainer') imageContainer;
  @ViewChild('image') image;
  @ViewChild('heightBalancer') heightBalancer;
  @ViewChild('ref') ref;
  @ViewChild('arrow') arrow;

  toggleMessage = "Hide Image";

  mouseDown = false;
  scrolled = false;

  buttonExpand: number;
  buttonRetract: number;
  imgHeight: number;


  constructor(private changeDetector: ChangeDetectorRef) { }

  initHeight() {
    // this.expandHeight = Math.max(window.pageYOffset + this.image.nativeElement.offsetHeight - 75, this.image.nativeElement.offsetHeight + 25);
    // this.changeDetector.detectChanges()
    
  }

  ngOnInit() {
    this.buttonRetract = 0;
    this.buttonExpand = 182;
    this.imgHeight = 182;


    document.addEventListener('scroll', (e) => {
      let height = Math.max(window.pageYOffset - 145, 0);
      this.heightBalancer.nativeElement.style.height = height + 'px';
      this.buttonExpand = height + this.imgHeight - 15;
      // console.log(this.imgHeight);
      // console.log(this.buttonExpand);
      this.buttonRetract = height;
    });

    window.addEventListener("resize", () => {
      let height = Math.max(window.pageYOffset - 145, 0);
      this.heightBalancer.nativeElement.style.height = height + 'px';
      this.buttonExpand = height + this.imgHeight - 15;
      this.buttonRetract = height;
    });
  }

  hover(src) {
    this.image.nativeElement.setAttribute("src", src);
    this.ref.nativeElement.setAttribute("href", src);
    this.imgHeight = this.image.nativeElement.offsetHeight;
    this.buttonExpand = Math.max(window.pageYOffset - 145, 0) + this.imgHeight - 15;
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
      this.imgHeight = this.image.nativeElement.offsetHeight;
      this.buttonExpand = Math.max(window.pageYOffset - 145, 0) + this.imgHeight - 15;
    }
  }

}
