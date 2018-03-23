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
  @ViewChild('child') childComponent;
  @ViewChild('glyphSize') glyphSize;
  @ViewChild('resizeButton') resizeButton;

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

  constructor(private windowService: WindowService, private _renderer: Renderer) {

    
   }

  ngAfterViewInit() {
    this.divsIndex = WindowComponent.windowDivs.length;
    WindowComponent.windowDivs.push(this.panelDiv.nativeElement);
    WindowComponent.windowDivs[this.divsIndex].style.zIndex = WindowComponent.zIndex;
    WindowComponent.zIndex++;
    //console.log(WindowComponent.windowDivs[this.divsIndex].style.zIndex);
    this.panelDiv.nativeElement.style.width = this.windowPanel.width + 'px';
    this.panelDiv.nativeElement.style.height = this.windowPanel.height + 'px';
    this.panelDiv.nativeElement.style.left = this.windowPanel.left + 100 + 'px';
    this.panelDiv.nativeElement.style.top = this.windowPanel.top + 'px';

    this.childComponent.resize(this.windowPanel.width, this.windowPanel.height);

    if (this.childComponent !== undefined) {
      const mutObs = new MutationObserver(() => this.resize());
      mutObs.observe(this.panelDiv.nativeElement, { attributes: true });
    }

    this.dragBar.nativeElement.addEventListener('mousedown', (e) => {
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      this.windowPanel.left = parseInt(this.panelDiv.nativeElement.getBoundingClientRect().left, 10);
      this.windowPanel.top = parseInt(this.panelDiv.nativeElement.getBoundingClientRect().top, 10);
      this.mouseWindowLeft = mouseX - this.windowPanel.left + 300;
      this.mouseWindowTop = mouseY - this.windowPanel.top;
      WindowComponent.lastClickDiv = this;
      document.addEventListener('mousemove', this.startDragging);

      this.bringWindowForward();
    })

    document.addEventListener('mouseup', () => { this.stopDragging(); });
    window.addEventListener('resize', () => { this.windowResize() });
    this.panelDiv.nativeElement.addEventListener('mousedown', () => { this.bringWindowForward(); });

    //PanelExtend
    // this.panelExtendDiv.nativeElement.style.width = this.windowPanel.width + 500 + 'px';
    // this.panelExtendDiv.nativeElement.style.height = this.windowPanel.height+ 350  + 'px';
    // this.panelExtendDiv.nativeElement.style.left = this.windowPanel.left + 'px';
    // this.panelExtendDiv.nativeElement.style.top = this.windowPanel.top + 'px';

    //ResizeButon
    this.resizeButton.nativeElement.addEventListener('mousedown', (e) => {
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      WindowComponent.lastClickDiv = this;

      WindowComponent.lastMouseXPosition = e.clientX;
      WindowComponent.lastMouseYPosition = e.clientY;
      
      
      document.addEventListener('mousemove', this.startResizing);
    }) 

    document.addEventListener('mouseup', () => {this.stopResizing();});
    
  }

  startResizing(e){
    const container = WindowComponent.lastClickDiv;
    let mouseX = e.clientX;
    let mouseY = e.clientY;

        // console.log(parseInt(container.panelExtendDiv.nativeElement.style.width));
    
    let newWidth = (mouseX - WindowComponent.lastMouseXPosition) + parseInt(container.panelDiv.nativeElement.style.width);
    let newHeight = (mouseY - WindowComponent.lastMouseYPosition) + parseInt(container.panelDiv.nativeElement.style.height);
    
    console.log(container.mouseWindowLeft);

    console.log("mousex = " + mouseX + " windowcomponent " + WindowComponent.lastMouseXPosition + " newwidth " + newWidth);

    
    // container.panelExtendDiv.nativeElement.style.width = left + 'px';
    // container.panelExtendDiv.nativeElement.style.height =  top + 'px';


    
   // container.panelExtendDiv.nativeElement.style.width =  (newWidth) + 'px';
    //container.panelExtendDiv.nativeElement.style.height =  (newHeight) + 'px';
    container.panelDiv.nativeElement.style.width =  (newWidth) + 'px';
    container.panelDiv.nativeElement.style.height =  (newHeight) + 'px';

    WindowComponent.lastMouseXPosition = mouseX;
    WindowComponent.lastMouseYPosition = mouseY;
    
    

  }

  stopResizing(){
    document.removeEventListener('mousemove', this.startResizing);
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

  maximize() {
    if (!this.maximized) {
      this.saveLeft = this.windowPanel.left;
      this.saveTop = this.windowPanel.top;
      this.saveHeight = this.windowPanel.height;
      this.saveWidth = this.windowPanel.width;

      this.windowPanel.left = 0;
      this.windowPanel.top = 30;

      this.panelDiv.nativeElement.style.left = 0 + 'px';
      this.panelDiv.nativeElement.style.top = 30 + 'px';
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


  //not sure what these were supposed to do, they just break everything, seems to be ok without any adjustments
  //maybe trying to adjust map size to take up a certain portion of the page? Come back to this later
  resize() {
    // if (this.windowPanel.width !== this.panelDiv.nativeElement.getBoundingClientRect().width ||
    //   this.windowPanel.height !== this.panelDiv.nativeElement.getBoundingClientRect().height) {

    //   this.windowPanel.width = this.panelDiv.nativeElement.getBoundingClientRect().width;
    //   this.windowPanel.height = this.panelDiv.nativeElement.getBoundingClientRect().height;



    //   this.childComponent.resize(this.windowPanel.width, this.windowPanel.height);

    //         //PanelExtend
    //         this.windowPanel.width = this.panelExtendDiv.nativeElement.getBoundingClientRect().width;
    //         this.windowPanel.height = this.panelExtendDiv.nativeElement.getBoundingClientRect().height;
    // }
  }

  windowResize() {
    // let winX = parseInt(this.panelDiv.nativeElement.getBoundingClientRect().left, 10);
    // let winY = parseInt(this.panelDiv.nativeElement.getBoundingClientRect().top, 10);

    // if (winY > (window.innerHeight - 70)) { winY = window.innerHeight - 70; }
    // if (winX > (window.innerWidth - 70)) { winX = window.innerWidth - 70; }

    // this.windowPanel.left = winX;
    // this.windowPanel.top = winY;
    // this.panelDiv.nativeElement.style.left = winX + 'px';
    // this.panelDiv.nativeElement.style.top = winY + 'px';


    // //PanelExtend
    // this.panelExtendDiv.nativeElement.style.left = winX + 'px';
    // this.panelExtendDiv.nativeElement.style.top = winY + 'px';

    // window.getSelection().removeAllRanges();
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