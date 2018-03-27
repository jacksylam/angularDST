import { Component, AfterViewInit, Input, ViewChild, Renderer } from '@angular/core';
import { WindowPanel } from './shared/windowPanel';
import { WindowService } from './shared/window.service';

@Component({
  selector: 'app-window',
  templateUrl: './window.component.html',
  styleUrls: ['./window.component.css'],
  providers: []
})
export class WindowComponent implements AfterViewInit {

  static lastClickDiv: any;
  static windowDivs = [];
  static zIndex = 0;

  @ViewChild('dragBar') dragBar;
  @ViewChild('panelDiv') panelDiv;
  @ViewChild('map') mapComponent;
  @ViewChild('glyphSize') glyphSize;
  @ViewChild('resizeCorner') resizeCorner;
  @ViewChild('resizeBot') resizeBot;
  @ViewChild('resizeRight') resizeRight;

  @Input() public title: string;
  @Input() public type: string;
  @Input() windowPanel: WindowPanel;

  mouseWindowLeft: number;
  mouseWindowTop: number;
  maximized = false;

  saveHeight: number;
  saveWidth: number;
  saveTop: number;
  saveLeft: number;

  static lastMouseXPosition: number;
  static lastMouseYPosition:number;

  resizeSelected = false;  
  resizeStartLeft: number;
  resizeStartTop: number;
  resizeStartWidth: number;
  resizeStartHeight: number;

  //divs cover 2 indexes, panelExtendedDiv at divsIndex, panelDiv at divsIndex + 1
  divsIndex: number;

  constructor(private windowService: WindowService, private _renderer: Renderer) { }

  ngAfterViewInit() {
    var __this = this;
    var resizeFunct;

    this.divsIndex = WindowComponent.windowDivs.length;
    WindowComponent.windowDivs.push(this.panelDiv.nativeElement);
    this.panelDiv.nativeElement.style.zIndex = WindowComponent.zIndex;
    WindowComponent.zIndex++;
    //console.log(WindowComponent.windowDivs[this.divsIndex].style.zIndex);
    this.panelDiv.nativeElement.style.width = this.windowPanel.width + 'px';
    this.panelDiv.nativeElement.style.height = this.windowPanel.height + 'px';
    this.panelDiv.nativeElement.style.left = this.windowPanel.left + 'px';
    this.panelDiv.nativeElement.style.top = this.windowPanel.top + 'px';

    this.mapComponent.resize(this.windowPanel.width, this.windowPanel.height);


    this.dragBar.nativeElement.addEventListener('mousedown', (e) => {
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      this.windowPanel.left = parseInt(this.panelDiv.nativeElement.getBoundingClientRect().left, 10);
      this.windowPanel.top = parseInt(this.panelDiv.nativeElement.getBoundingClientRect().top, 10);
      this.mouseWindowLeft = mouseX - this.windowPanel.left;
      this.mouseWindowTop = mouseY - this.windowPanel.top;
      WindowComponent.lastClickDiv = this;
      document.addEventListener('mousemove', this.startDragging);

      this.bringWindowForward();
    })

    document.addEventListener('mouseup', () => { this.stopDragging(); });
    this.panelDiv.nativeElement.addEventListener('mousedown', () => { this.bringWindowForward(); });

    //PanelExtend
    // this.panelExtendDiv.nativeElement.style.width = this.windowPanel.width + 500 + 'px';
    // this.panelExtendDiv.nativeElement.style.height = this.windowPanel.height+ 350  + 'px';
    // this.panelExtendDiv.nativeElement.style.left = this.windowPanel.left + 'px';
    // this.panelExtendDiv.nativeElement.style.top = this.windowPanel.top + 'px';

    //ResizeButon
    this.resizeCorner.nativeElement.addEventListener('mousedown', (e) => {
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      WindowComponent.lastClickDiv = this;

      WindowComponent.lastMouseXPosition = e.clientX;
      WindowComponent.lastMouseYPosition = e.clientY;
      
      //need to pass __this in to function, so save anonymous function call for removal
      document.addEventListener('mousemove', resizeFunct = (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.startResizing(e, "both", __this);
      });
    })

    this.resizeRight.nativeElement.addEventListener('mousedown', (e) => {
      const mouseX = e.clientX;
      WindowComponent.lastClickDiv = this;
      WindowComponent.lastMouseXPosition = e.clientX;
      
      
      //need to pass __this in to function, so save anonymous function call for removal
      document.addEventListener('mousemove', resizeFunct = (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.startResizing(e, "right", __this);
      });
    })

    this.resizeBot.nativeElement.addEventListener('mousedown', (e) => {
      const mouseY = e.clientY;
      WindowComponent.lastClickDiv = this;
      WindowComponent.lastMouseYPosition = e.clientY;
      
      
      //need to pass __this in to function, so save anonymous function call for removal
      document.addEventListener('mousemove', resizeFunct = (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.startResizing(e, "bot", __this);
      });
    })

    document.addEventListener('mouseup', () => {document.removeEventListener('mousemove', resizeFunct)});
    
  }

  startResizing(e, type, __this){
    const container = WindowComponent.lastClickDiv;

    if(type == "bot" || type == "both") {
      let mouseY = e.clientY;
      let newHeight = (mouseY - WindowComponent.lastMouseYPosition) + parseInt(container.panelDiv.nativeElement.style.height);

      //minimum size
      if(newHeight >= 400) {
        WindowComponent.lastMouseYPosition = mouseY;
        container.panelDiv.nativeElement.style.height =  (newHeight) + 'px';
        //for some reason percent size allows map to change width but not height, so change manually
        __this.mapComponent.resize(__this.mapComponent.width, newHeight);
      }
      
    }
    if(type == "right" || type == "both") {
      let mouseX = e.clientX;
      let newWidth = (mouseX - WindowComponent.lastMouseXPosition) + parseInt(container.panelDiv.nativeElement.style.width);
      //minimum size
      if(newWidth >= 400) {
        WindowComponent.lastMouseXPosition = mouseX;
        container.panelDiv.nativeElement.style.width =  (newWidth) + 'px';
        //for some reason percent size allows map to change width but not height, so change manually
        __this.mapComponent.resize(newWidth, __this.mapComponent.height);
      }
    }

  }



  startDragging(e) {
    const container = WindowComponent.lastClickDiv;
    let left = e.clientX - container.mouseWindowLeft;
    let top = e.clientY - container.mouseWindowTop;

    // if (top < 30) { top = 30; }
    // if (top > (window.innerHeight - 70)) { top = window.innerHeight - 70; }
    // if (left < 0) { left = 0; }
    // if (left > (window.innerWidth - 70)) { left = window.innerWidth - 70; }

    container.windowPanel.left = left
    container.windowPanel.top = top;
    container.panelDiv.nativeElement.style.left = left + 'px';
    container.panelDiv.nativeElement.style.top = top + 'px';

      //PanelExtend
      // container.panelExtendDiv.nativeElement.style.left = left  + 'px';
      // container.panelExtendDiv.nativeElement.style.top = top + 'px'; 
    window.getSelection().removeAllRanges();
   }

  stopDragging() {
    document.removeEventListener('mousemove', this.startDragging);
  }

  bringWindowForward() {
    //place window at highest z index
    //may go over menu at very high values, unlikely to be problemactic though
    WindowComponent.windowDivs[this.divsIndex].style.zIndex = WindowComponent.zIndex++;
  }

  removeWindow() {
    this.windowService.removeWindow(this.windowPanel.id);
  }

  //still very broken, should remove event listeners for move and resize while active, lock in place
  maximize() {
    if (!this.maximized) {
      this.saveLeft = this.windowPanel.left;
      this.saveTop = this.windowPanel.top;
      this.saveHeight = this.windowPanel.height;
      this.saveWidth = this.windowPanel.width;

      this.windowPanel.left = 0;
      this.windowPanel.top = 50;

      this.panelDiv.nativeElement.style.left = 100 + '%';
      this.panelDiv.nativeElement.style.top = 50 + 'px';
      this.panelDiv.nativeElement.style.width = window.innerWidth + 'px';
      this.panelDiv.nativeElement.style.height = window.innerHeight - 60 + 'px';
      this._renderer.setElementStyle(this.panelDiv.nativeElement, 'background-color', 'rgba(255, 255, 255,' + 1.0 + ')');
      this.maximized = true;
      this.glyphSize.nativeElement.class = 'glyphicon glyphicon-resize-small';

    } else {
      this.panelDiv.nativeElement.style.left = this.saveLeft + 'px';
      this.panelDiv.nativeElement.style.top = this.saveTop + 'px';
      this.panelDiv.nativeElement.style.width = this.saveWidth + 'px';
      this.panelDiv.nativeElement.style.height = this.saveHeight + 'px';

      this.windowPanel.left = this.saveLeft;
      this.windowPanel.top = this.saveTop;

      this._renderer.setElementStyle(
        this.panelDiv.nativeElement, 'background-color', 'rgba(255, 255, 255,' + this.windowPanel.backgroundAlpha + ')');
      this.maximized = false;
      this.glyphSize.nativeElement.class = 'glyphicon glyphicon-resize-full';
    }
  }


  incAlpha() {
    this.windowPanel.backgroundAlpha += 0.05;
    this.windowPanel.backgroundAlpha = Math.min(this.windowPanel.backgroundAlpha, 1.0);
    this._renderer.setElementStyle(this.panelDiv.nativeElement, 'background-color', 'rgba(255, 255, 255,' + this.windowPanel.backgroundAlpha + ')');
    //this._renderer.setElementStyle(this.childComponent.nativeElement, 'background-color', 'rgba(255, 255, 255,' + this.windowPanel.backgroundAlpha + ')');
      
  }

  decAlpha() {
    this.windowPanel.backgroundAlpha -= 0.05;
    this.windowPanel.backgroundAlpha = Math.max(this.windowPanel.backgroundAlpha, 0.0);
    this._renderer.setElementStyle(this.panelDiv.nativeElement, 'background-color', 'rgba(255, 255, 255,' + this.windowPanel.backgroundAlpha + ')');
    //this._renderer.setElementStyle(this.childComponent.nativeElement, 'background-color', 'rgba(255, 255, 255,' + this.windowPanel.backgroundAlpha + ')');
  }

  getView() {
    return [this.windowPanel.width, this.windowPanel.height];
  }

}