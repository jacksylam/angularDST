import { animate, transition, state, trigger, style, Component, AfterViewInit, Input, ViewChild, Renderer } from '@angular/core';


declare let jsPDF: any;

@Component({
  selector: 'app-vis-window',
  templateUrl: './vis-window.component.html',
  styleUrls: ['./vis-window.component.css'],
  providers: []
})

export class VisWindowComponent implements AfterViewInit {
  static zIndex = 0;

  @ViewChild('dragBar') dragBar;
  @ViewChild('panelDiv') panelDiv;
  @ViewChild('map') mapComponent;
  @ViewChild('controls') controlPanel;
  @ViewChild('glyphSize') glyphSize;
  @ViewChild('resizeCorner') resizeCorner;
  @ViewChild('resizeBot') resizeBot;
  @ViewChild('resizeRight') resizeRight;



  @ViewChild('phantomScrollLock') phantomScrollLock;
  @ViewChild('phantomScrollSmooth') phantomScrollSmooth;


  scrollLock: boolean;


  mouseCornerOffset: {
    left: number,
    top: number
  }
  scrollPos: {
    left: number,
    top: number
  }
  maximized = false;

  saveHeight: number;
  saveWidth: number;
  saveTop: number;
  saveLeft: number;

  lastMouseXPosition: number;
  lastMouseYPosition: number;

  resizeSelected = false;  
  resizeStartLeft: number;
  resizeStartTop: number;
  resizeStartWidth: number;
  resizeStartHeight: number;

  divsIndex: number;

  constructor() { }

  ngAfterViewInit() {
    let __this = this;
    let resizeFunct;
    let scrollDragFunct;
    let dragFunct;
    this.scrollLock = false;


    this.bringWindowForward();
    //console.log(WindowComponent.windowDivs[this.divsIndex].style.zIndex);
    this.panelDiv.nativeElement.style.width = 500 + 'px';
    this.panelDiv.nativeElement.style.height = 500 + 'px';
    this.panelDiv.nativeElement.style.left = 100 + 'px';
    this.panelDiv.nativeElement.style.top = 100+ 'px';


    this.mapComponent.resize(parseInt(this.panelDiv.nativeElement.offsetWidth), parseInt(this.panelDiv.nativeElement.offsetHeight));
    this.mapComponent.setWindowId(1);
    this.controlPanel.setWindowId(1);

    this.dragBar.nativeElement.addEventListener('mousedown', (e) => {
      // const mouseX = e.pageX;
      // const mouseY = e.pageY;
      //transition = false;

      // this.mouseWindowLeft = this.panelDiv.nativeElement.offsetLeft;
      // this.mouseWindowTop = this.panelDiv.nativeElement.offsetTop;
      this.mouseCornerOffset = {
        left: e.pageX - this.panelDiv.nativeElement.offsetLeft,
        top: e.pageY - this.panelDiv.nativeElement.offsetTop
      }

      this.scrollPos = {
        left: window.pageXOffset,
        top: window.pageYOffset
      }
      //console.log(this.scrollPos);

      e.stopPropagation();
      e.preventDefault();
      this.phantomScrollLock.nativeElement.style.top = window.pageYOffset == 0 ? '0px' : window.pageYOffset + window.innerHeight + 'px';
      this.phantomScrollLock.nativeElement.style.left = window.pageXOffset == 0 ? '0px' : window.pageXOffset + window.innerWidth + 'px';

      this.phantomScrollSmooth.nativeElement.style.top = this.phantomScrollLock.nativeElement.style.top;
      this.phantomScrollSmooth.nativeElement.style.left = this.phantomScrollLock.nativeElement.style.left;

      //console.log(WindowComponent.lastClickDiv.scrollPos);
      document.addEventListener('mousemove', dragFunct = (e) => {
        this.startDragging(e, __this);
      });
      document.addEventListener('scroll', scrollDragFunct = (e) => {
        this.scrollDrag(e, __this);
      });
      this.bringWindowForward();
    });


    this.panelDiv.nativeElement.addEventListener('mousedown', () => { this.bringWindowForward(); });








    //PanelExtend
    // this.panelExtendDiv.nativeElement.style.width = this.windowPanel.width + 500 + 'px';
    // this.panelExtendDiv.nativeElement.style.height = this.windowPanel.height+ 350  + 'px';
    // this.panelExtendDiv.nativeElement.style.left = this.windowPanel.left + 'px';
    // this.panelExtendDiv.nativeElement.style.top = this.windowPanel.top + 'px';

    
    this.resizeCorner.nativeElement.addEventListener('mousedown', (e) => {
      this.lastMouseXPosition = e.pageX;
      this.lastMouseYPosition = e.pageY;
      
      //need to pass __this in to function, so save anonymous function call for removal
      document.addEventListener('mousemove', resizeFunct = (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.startResizing(e, "both", __this);
      });
    });

    this.resizeRight.nativeElement.addEventListener('mousedown', (e) => {
      this.lastMouseXPosition = e.pageX;
      
      
      //need to pass __this in to function, so save anonymous function call for removal
      document.addEventListener('mousemove', resizeFunct = (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.startResizing(e, "right", __this);
      });
    })

    this.resizeBot.nativeElement.addEventListener('mousedown', (e) => {
      const mouseY = e.pageY;
      this.lastMouseYPosition = e.pageY;
      
      
      //need to pass __this in to function, so save anonymous function call for removal
      document.addEventListener('mousemove', resizeFunct = (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.startResizing(e, "bot", __this);
      });
    })

    document.addEventListener('mouseup', () => {
      document.removeEventListener('mousemove', resizeFunct);
      document.removeEventListener('mousemove', dragFunct);
      document.removeEventListener('scroll', scrollDragFunct);
    });
    
  }


  startResizing(e, type, __this){
    if(type == "bot" || type == "both") {
      let mouseY = e.pageY;
      let newHeight = (mouseY - __this.lastMouseYPosition) + parseInt(__this.panelDiv.nativeElement.style.height);

      //minimum size
      if(newHeight >= 400) {
        this.lastMouseYPosition = mouseY;
        __this.panelDiv.nativeElement.style.height =  (newHeight) + 'px';
        if(this.mapComponent) {
          //for some reason percent size allows map to change width but not height, so change manually
          __this.mapComponent.resize(__this.mapComponent.width, newHeight);
        }
      }
      
    }
    if(type == "right" || type == "both") {
      let mouseX = e.pageX;
      let newWidth = (mouseX - this.lastMouseXPosition) + parseInt(__this.panelDiv.nativeElement.style.width);
      //minimum size
      if(newWidth >= 400) {
        this.lastMouseXPosition = mouseX;
        __this.panelDiv.nativeElement.style.width =  (newWidth) + 'px';
        if(this.mapComponent) {
          //for some reason percent size allows map to change width but not height, so change manually
          __this.mapComponent.resize(newWidth, __this.mapComponent.height);
        }
      }
    }

  }

  startDragging(e, __this) {
    let left = e.pageX - __this.mouseCornerOffset.left;
    let top = e.pageY - __this.mouseCornerOffset.top;


    if(left < -parseInt(__this.panelDiv.nativeElement.style.width) + 20) {
      left = -parseInt(__this.panelDiv.nativeElement.style.width) + 20;
      
    }
    
    if(top < 50) {
      top = 50;
      
    }

    
    
    __this.panelDiv.nativeElement.style.left = left + 'px';
    __this.panelDiv.nativeElement.style.top = top + 'px';
   }

  scrollDrag(e, __this) {
    e.stopPropagation();
    e.preventDefault();
    //console.log(container)
    let left = window.pageXOffset - __this.scrollPos.left + __this.panelDiv.nativeElement.offsetLeft;
    let top = window.pageYOffset - __this.scrollPos.top + __this.panelDiv.nativeElement.offsetTop;

    //console.log(e);
    //console.log(top);

    __this.scrollPos.left = window.pageXOffset;
    __this.scrollPos.top = window.pageYOffset;

    if(left < -parseInt(__this.panelDiv.nativeElement.style.width) + 20) {
      left = -parseInt(__this.panelDiv.nativeElement.style.width) + 20;
      
    }
    
    if(top < 50) {
      top = 50;
    }
    
    __this.panelDiv.nativeElement.style.left = left + 'px';
    __this.panelDiv.nativeElement.style.top = top + 'px';
  }

  bringWindowForward(__this = this) {
    //place window at highest z index
    //may go over menu at very high values, unlikely to be problemactic though
    __this.panelDiv.nativeElement.style.zIndex = VisWindowComponent.zIndex++;
  }

  removeWindow() {
    
  }
}