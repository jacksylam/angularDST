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

  @ViewChild('dragBar') dragBar;
  @ViewChild('panelDiv') panelDiv;
  @ViewChild('child') childComponent;
  @ViewChild('glyphSize') glyphSize;

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

  constructor(private windowService: WindowService, private _renderer: Renderer) { }

  ngAfterViewInit() {

    WindowComponent.windowDivs.push(this.panelDiv.nativeElement);

    this.panelDiv.nativeElement.style.width = this.windowPanel.width + 'px';
    this.panelDiv.nativeElement.style.height = this.windowPanel.height + 'px';
    this.panelDiv.nativeElement.style.left = this.windowPanel.left + 'px';
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
      this.mouseWindowLeft = mouseX - this.windowPanel.left;
      this.mouseWindowTop = mouseY - this.windowPanel.top;
      WindowComponent.lastClickDiv = this;
      document.addEventListener('mousemove', this.startDragging);

      this.bringWindowForward();

    })

    document.addEventListener('mouseup', () => { this.stopDragging(); });
    window.addEventListener('resize', () => { this.windowResize() });
    this.panelDiv.nativeElement.addEventListener('mousedown', () => { this.bringWindowForward(); });

  }

  startDragging(e) {
    const container = WindowComponent.lastClickDiv;
    let left = e.clientX - container.mouseWindowLeft;
    let top = e.clientY - container.mouseWindowTop;

    if (top < 30) { top = 30; }
    if (top > (window.innerHeight - 70)) { top = window.innerHeight - 70; }
    if (left < 0) { left = 0; }
    if (left > (window.innerWidth - 70)) { left = window.innerWidth - 70; }

    container.windowPanel.left = left
    container.windowPanel.top = top;
    container.panelDiv.nativeElement.style.left = left + 'px';
    container.panelDiv.nativeElement.style.top = top + 'px';
    window.getSelection().removeAllRanges();
  }

  stopDragging() {
    document.removeEventListener('mousemove', this.startDragging);
  }

  bringWindowForward() {
    WindowComponent.windowDivs.push(
      WindowComponent.windowDivs.splice(
        WindowComponent.windowDivs.indexOf(this.panelDiv.nativeElement), 1)[0]);

    for (let i = 0; i < WindowComponent.windowDivs.length; i++) {
      WindowComponent.windowDivs[i].style.zIndex = i;
    }
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

  resize() {
    if (this.windowPanel.width !== this.panelDiv.nativeElement.getBoundingClientRect().width ||
      this.windowPanel.height !== this.panelDiv.nativeElement.getBoundingClientRect().height) {

      this.windowPanel.width = this.panelDiv.nativeElement.getBoundingClientRect().width;
      this.windowPanel.height = this.panelDiv.nativeElement.getBoundingClientRect().height;
      this.childComponent.resize(this.windowPanel.width, this.windowPanel.height);
    }
  }

  windowResize() {
    let winX = parseInt(this.panelDiv.nativeElement.getBoundingClientRect().left, 10);
    let winY = parseInt(this.panelDiv.nativeElement.getBoundingClientRect().top, 10);

    if (winY > (window.innerHeight - 70)) { winY = window.innerHeight - 70; }
    if (winX > (window.innerWidth - 70)) { winX = window.innerWidth - 70; }

    this.windowPanel.left = winX;
    this.windowPanel.top = winY;
    this.panelDiv.nativeElement.style.left = winX + 'px';
    this.panelDiv.nativeElement.style.top = winY + 'px';

    window.getSelection().removeAllRanges();
  }

  incAlpha() {
    this.windowPanel.backgroundAlpha += 0.05;
    this.windowPanel.backgroundAlpha = Math.min(this.windowPanel.backgroundAlpha, 1.0);
    this._renderer.setElementStyle(
      this.panelDiv.nativeElement, 'background-color', 'rgba(255, 255, 255,' + this.windowPanel.backgroundAlpha + ')');
  }

  decAlpha() {
    this.windowPanel.backgroundAlpha -= 0.05;
    this.windowPanel.backgroundAlpha = Math.max(this.windowPanel.backgroundAlpha, 0.0);
    this._renderer.setElementStyle(
      this.panelDiv.nativeElement, 'background-color', 'rgba(255, 255, 255,' + this.windowPanel.backgroundAlpha + ')');
  }

  getView() {
    return [this.windowPanel.width, this.windowPanel.height];
  }

}
