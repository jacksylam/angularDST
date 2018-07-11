import { animate, transition, state, trigger, style, Component, AfterViewInit, Input, ViewChild, Renderer } from '@angular/core';
import { WindowPanel } from './shared/windowPanel';
import { WindowService } from './shared/window.service';

declare let jsPDF: any;

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
  @ViewChild('controls') controlPanel;
  @ViewChild('glyphSize') glyphSize;
  @ViewChild('resizeCorner') resizeCorner;
  @ViewChild('resizeBot') resizeBot;
  @ViewChild('resizeRight') resizeRight;

  @ViewChild('aquiferGraph') aquiferGraph;
  @ViewChild('aquiferGraphNoCaprock') aquiferGraphNoCaprock;
  @ViewChild('customGraph') customGraph;
  @ViewChild('customTotalGraph') customTotalGraph;
  @ViewChild('fullGraph') fullGraph;
  @ViewChild('fullGraphNoCaprock') fullGraphNoCaprock;

  @ViewChild('phantomScrollLock') phantomScrollLock;
  @ViewChild('phantomScrollSmooth') phantomScrollSmooth;

  // @ViewChild('aquiferTable') aquiferTable;
  // @ViewChild('customTable') customTable;
  // @ViewChild('customTotalTable') customTotalTable;
  // @ViewChild('fullTable') fullTable;

  @Input() public title: string;
  @Input() public type: string;
  @Input() windowPanel: WindowPanel;




  aquiferGraphImage: any;
  customGraphImage: any;
  customTotalGraphImage: any;
  fullGraphImage: any;
  scrollLock: boolean;

  pdf: any;
  graphImageData = {
    aquifers: null,
    aquifersNoCaprock: null,
    custom: null,
    customTotal: null,
    total: null,
    totalNoCaprock: null
  };
  graphOrder = ["aquifers", "aquifersNoCaprock", "custom", "customTotal", "total", "totalNoCaprock"];

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

  static lastMouseXPosition: number;
  static lastMouseYPosition:number;

  resizeSelected = false;  
  resizeStartLeft: number;
  resizeStartTop: number;
  resizeStartWidth: number;
  resizeStartHeight: number;

  divsIndex: number;

  constructor(private windowService: WindowService, private _renderer: Renderer) { }

  ngAfterViewInit() {
    let __this = this;
    let resizeFunct;
    this.scrollLock = false;

    this.divsIndex = WindowComponent.windowDivs.length;
    WindowComponent.windowDivs.push(this.panelDiv.nativeElement);
    this.panelDiv.nativeElement.style.zIndex = WindowComponent.zIndex;
    WindowComponent.zIndex++;
    //console.log(WindowComponent.windowDivs[this.divsIndex].style.zIndex);
    this.panelDiv.nativeElement.style.width = this.windowPanel.width + 'px';
    this.panelDiv.nativeElement.style.height = this.windowPanel.height + 'px';
    this.panelDiv.nativeElement.style.left = this.windowPanel.left + 'px';
    this.panelDiv.nativeElement.style.top = this.windowPanel.top + 'px';

    if(this.mapComponent) {
      this.mapComponent.resize(this.windowPanel.width, this.windowPanel.height);
      this.mapComponent.setWindowId(this.windowPanel.tag);
      this.controlPanel.setWindowId(this.windowPanel.tag);
    }
    else {
      this.generateReportGraphs();
    }

    














    

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
      
      WindowComponent.lastClickDiv = this;
      //console.log(WindowComponent.lastClickDiv.scrollPos);
      document.addEventListener('mousemove', this.startDragging);
      document.addEventListener('scroll', this.scrollDrag);
      this.bringWindowForward();
    })

    document.addEventListener('mouseup', () => { this.stopDragging(); });
    this.panelDiv.nativeElement.addEventListener('mousedown', () => { this.bringWindowForward(); });

    //PanelExtend
    // this.panelExtendDiv.nativeElement.style.width = this.windowPanel.width + 500 + 'px';
    // this.panelExtendDiv.nativeElement.style.height = this.windowPanel.height+ 350  + 'px';
    // this.panelExtendDiv.nativeElement.style.left = this.windowPanel.left + 'px';
    // this.panelExtendDiv.nativeElement.style.top = this.windowPanel.top + 'px';

    
    this.resizeCorner.nativeElement.addEventListener('mousedown', (e) => {
      const mouseX = e.pageX;
      const mouseY = e.pageY;
      WindowComponent.lastClickDiv = this;

      WindowComponent.lastMouseXPosition = e.pageX;
      WindowComponent.lastMouseYPosition = e.pageY;
      
      //need to pass __this in to function, so save anonymous function call for removal
      document.addEventListener('mousemove', resizeFunct = (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.startResizing(e, "both", __this);
      });
    })

    this.resizeRight.nativeElement.addEventListener('mousedown', (e) => {
      const mouseX = e.pageX;
      WindowComponent.lastClickDiv = this;
      WindowComponent.lastMouseXPosition = e.pageX;
      
      
      //need to pass __this in to function, so save anonymous function call for removal
      document.addEventListener('mousemove', resizeFunct = (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.startResizing(e, "right", __this);
      });
    })

    this.resizeBot.nativeElement.addEventListener('mousedown', (e) => {
      const mouseY = e.pageY;
      WindowComponent.lastClickDiv = this;
      WindowComponent.lastMouseYPosition = e.pageY;
      
      
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

    if(type == "bot" || type == "both") {
      let mouseY = e.pageY;
      let newHeight = (mouseY - WindowComponent.lastMouseYPosition) + parseInt(__this.panelDiv.nativeElement.style.height);

      //minimum size
      if(newHeight >= 400) {
        WindowComponent.lastMouseYPosition = mouseY;
        __this.panelDiv.nativeElement.style.height =  (newHeight) + 'px';
        if(this.mapComponent) {
          //for some reason percent size allows map to change width but not height, so change manually
          __this.mapComponent.resize(__this.mapComponent.width, newHeight);
        }
      }
      
    }
    if(type == "right" || type == "both") {
      let mouseX = e.pageX;
      let newWidth = (mouseX - WindowComponent.lastMouseXPosition) + parseInt(__this.panelDiv.nativeElement.style.width);
      //minimum size
      if(newWidth >= 400) {
        WindowComponent.lastMouseXPosition = mouseX;
        __this.panelDiv.nativeElement.style.width =  (newWidth) + 'px';
        if(this.mapComponent) {
          //for some reason percent size allows map to change width but not height, so change manually
          __this.mapComponent.resize(newWidth, __this.mapComponent.height);
        }
      }
    }

  }

  startDragging(e) {
    const container = WindowComponent.lastClickDiv;
    let left = e.pageX - container.mouseCornerOffset.left;
    let top = e.pageY - container.mouseCornerOffset.top;


    if(left < -parseInt(container.panelDiv.nativeElement.style.width) + 20) {
      left = -parseInt(container.panelDiv.nativeElement.style.width) + 20;
      
    }
    
    if(top < 50) {
      top = 50;
      
    }
    
    container.panelDiv.nativeElement.style.left = left + 'px';
    container.panelDiv.nativeElement.style.top = top + 'px';

      //PanelExtend
      // container.panelExtendDiv.nativeElement.style.left = left  + 'px';
      // container.panelExtendDiv.nativeElement.style.top = top + 'px'; 
    //window.getSelection().removeAllRanges();
   }

  stopDragging() {
    //WindowComponent.lastClickDiv.phantomScrollLock.nativeElement.style.top = '0px';
    //WindowComponent.lastClickDiv.phantomScrollLock.nativeElement.style.left =  '0px';
    document.removeEventListener('mousemove', this.startDragging);
    document.removeEventListener('scroll', this.scrollDrag);
  }

  scrollDrag(e) {
    e.stopPropagation();
    e.preventDefault();
    const container = WindowComponent.lastClickDiv;
    //console.log(container)
    let left = window.pageXOffset - container.scrollPos.left + container.panelDiv.nativeElement.offsetLeft;
    let top = window.pageYOffset - container.scrollPos.top + container.panelDiv.nativeElement.offsetTop;

    //console.log(e);
    //console.log(top);

    container.scrollPos.left = window.pageXOffset;
    container.scrollPos.top = window.pageYOffset;

    if(left < -parseInt(container.panelDiv.nativeElement.style.width) + 20) {
      left = -parseInt(container.panelDiv.nativeElement.style.width) + 20;
      
    }
    
    if(top < 50) {
      top = 50;
    }
    
    container.panelDiv.nativeElement.style.left = left + 'px';
    container.panelDiv.nativeElement.style.top = top + 'px';
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



















  //later should have different types, ignore parameter for now
  download(type: string) {
    let columnsName = [
      {title: "Name", dataKey: "name"},
      {title: "Area (" + this.windowPanel.data.unitSystem.units.area + ")", dataKey: "area"}, 
      {title: "Baseline", dataKey: "oriny"}, 
      {title: "This Analysis", dataKey: "criny"}, 
      {title: "Baseline", dataKey: "ormgd"}, 
      {title: "This Analysis", dataKey: "crmgd"},
      {title: this.windowPanel.data.unitSystem.units.volumetric, dataKey: "diff"},
      {title: "Percent Change", dataKey: "pchange"}
    ];
    let columnsSummary = [
      {title: "", dataKey: "type"}, 
      {title: "User Defined Areas", dataKey: "uda"}, 
      {title: "Island", dataKey: "total"},
      {title: "Island Excluding Caprock", dataKey: "totalNoCaprock"}
    ];
    let infoHeaders = [
      {title: "", dataKey: "blank"},
      {title: "Total Recharge\n(" + this.windowPanel.data.unitSystem.units.volumetric + ")", dataKey: "cat1"},
      {title: "Average Recharge\n(" + this.windowPanel.data.unitSystem.units.average + ")", dataKey: "cat2"},
      {title: "Volumetric Difference", dataKey: "cat3"}
    ];

    
  
    let y = 50;
    
    this.pdf = new jsPDF('p', 'pt');

    let width = this.pdf.internal.pageSize.width;    
    let height = this.pdf.internal.pageSize.height;

    let titleSize = 18;
    let descriptionSize = 8;
    let disclaimerSize = 10;

    let nameWidth = 90;
    //subtract 80 from width, 40 buffer on each side
    let remainingWidth = width - 80 - nameWidth;
    let normalWidth = remainingWidth / 7;
    let blankWidth = nameWidth + normalWidth;

    let rows = [];
    
    this.pdf.autoTable(infoHeaders, rows, {
      startY: y + 20,
      styles: {
        overflow: 'linebreak', font: 'arial', fontSize: 9, cellPadding: 4, halign: "center"},
      columnStyles: {
        blank: {columnWidth: blankWidth},
        cat1: {columnWidth: normalWidth * 2},
        cat2: {columnWidth: normalWidth * 2},
        cat3: {columnWidth: normalWidth * 2}
      },
      margin: {top: 60}
    });

    //rows = [];

    this.windowPanel.data.metrics.aquifers.forEach((aquifer) => {
      rows.push({
        name: aquifer.name,
        area: aquifer.roundedMetrics[this.windowPanel.data.unitSystem.system].area,
        oriny: aquifer.roundedMetrics[this.windowPanel.data.unitSystem.system].average.original,
        criny: aquifer.roundedMetrics[this.windowPanel.data.unitSystem.system].average.current,
        ormgd: aquifer.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.original,
        crmgd: aquifer.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.current,
        diff: aquifer.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.diff,
        pchange: aquifer.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.pchange,
      })
    })

    this.pdf.setFontSize(titleSize);
    this.pdf.text(50, y, "Aquifer Systems*");
    this.pdf.setFontSize(descriptionSize);
    this.pdf.text(220, y - 5, "Hydrological units established by the Hawaii State Commission on Water Resource");
    this.pdf.text(220, y + 5, "Management to manage groundwater resources");
    this.pdf.autoTable(columnsName, rows, {
      startY: y + 50,
      styles: {
        overflow: 'linebreak', font: 'arial', fontSize: 9, cellPadding: 4},
      columnStyles: {
        name: {columnWidth: nameWidth},
        area: {columnWidth: normalWidth},
        oriny: {columnWidth: normalWidth},
        criny: {columnWidth: normalWidth},
        ormgd: {columnWidth: normalWidth},
        crmgd: {columnWidth: normalWidth},
        diff: {columnWidth: normalWidth},
        pchange: {columnWidth: normalWidth}
      },
      margin: {top: 60}
    });

    y = this.pdf.autoTable.previous.finalY + 50;

    if(y + 50 >= height) {
      this.pdf.addPage();
      y = 50;
    }

    rows = [];

    this.pdf.autoTable(infoHeaders, rows, {
      startY: y + 20,
      styles: {
        overflow: 'linebreak', font: 'arial', fontSize: 9, cellPadding: 4, halign: "center"},
      columnStyles: {
        blank: {columnWidth: blankWidth},
        cat1: {columnWidth: normalWidth * 2},
        cat2: {columnWidth: normalWidth * 2},
        cat3: {columnWidth: normalWidth * 2}
      },
      margin: {top: 60}
    });

    this.windowPanel.data.metrics.aquifersNoCaprock.forEach((aquifer) => {
      rows.push({
        name: aquifer.name,
        area: aquifer.roundedMetrics[this.windowPanel.data.unitSystem.system].area,
        oriny: aquifer.roundedMetrics[this.windowPanel.data.unitSystem.system].average.original,
        criny: aquifer.roundedMetrics[this.windowPanel.data.unitSystem.system].average.current,
        ormgd: aquifer.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.original,
        crmgd: aquifer.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.current,
        diff: aquifer.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.diff,
        pchange: aquifer.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.pchange,
      })
    })

    this.pdf.setFontSize(titleSize);
    this.pdf.text(50, y - 10, "Aquifer Systems\nExcluding Caprock*");
    this.pdf.setFontSize(descriptionSize);
    this.pdf.text(220, y - 5, "Aquifer systems minus the area covered by caprock (semi-confining, mostly sedimentary unit");
    this.pdf.text(220, y + 5, "that partly overlies coastal areas of some aquifer systems)");
    this.pdf.autoTable(columnsName, rows, {
      startY: y + 50,
      styles: {
        overflow: 'linebreak', font: 'arial', fontSize: 9, cellPadding: 4},
      columnStyles: {
        name: {columnWidth: nameWidth},
        area: {columnWidth: normalWidth},
        oriny: {columnWidth: normalWidth},
        criny: {columnWidth: normalWidth},
        ormgd: {columnWidth: normalWidth},
        crmgd: {columnWidth: normalWidth},
        diff: {columnWidth: normalWidth},
        pchange: {columnWidth: normalWidth}
      },
      margin: {top: 60}
    });

    y = this.pdf.autoTable.previous.finalY + 50;

    if(y + 50 >= height) {
      this.pdf.addPage();
      y = 50;
    }
    
    this.pdf.setFontSize(titleSize);
    this.pdf.text(50, y, "User Defined Areas*");
    this.pdf.setFontSize(descriptionSize);
    this.pdf.text(220, y, "Areas of land cover change designated by the user for this analysis");

    rows = [];

    this.pdf.autoTable(infoHeaders, rows, {
      startY: y + 20,
      styles: {
        overflow: 'linebreak', font: 'arial', fontSize: 9, cellPadding: 4, halign: "center"},
      columnStyles: {
        blank: {columnWidth: blankWidth},
        cat1: {columnWidth: normalWidth * 2},
        cat2: {columnWidth: normalWidth * 2},
        cat3: {columnWidth: normalWidth * 2}
      },
      margin: {top: 60}
    });

    this.windowPanel.data.metrics.customAreas.forEach((customArea) => {
      rows.push({
        name: customArea.name,
        area: customArea.roundedMetrics[this.windowPanel.data.unitSystem.system].area,
        oriny: customArea.roundedMetrics[this.windowPanel.data.unitSystem.system].average.original,
        criny: customArea.roundedMetrics[this.windowPanel.data.unitSystem.system].average.current,
        ormgd: customArea.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.original,
        crmgd: customArea.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.current,
        diff: customArea.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.diff,
        pchange: customArea.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.pchange,
      });
    });

    this.pdf.autoTable(columnsName, rows, {
      startY: y + 50,
      styles: {
        overflow: 'linebreak', font: 'arial', fontSize: 9, cellPadding: 4},
      columnStyles: {
        name: {columnWidth: nameWidth},
        area: {columnWidth: normalWidth},
        oriny: {columnWidth: normalWidth},
        criny: {columnWidth: normalWidth},
        ormgd: {columnWidth: normalWidth},
        crmgd: {columnWidth: normalWidth},
        diff: {columnWidth: normalWidth},
        pchange: {columnWidth: normalWidth}
      },
      margin: {top: 60}
    });

    y = this.pdf.autoTable.previous.finalY + 50;

    if(y + 50 >= height) {
      this.pdf.addPage();
      y = 50;
    }


    this.pdf.setFontSize(titleSize);
    this.pdf.text(50, y, "Summary*");

    rows = [];
    let total = this.windowPanel.data.metrics.total
    let totalNoCaprock = this.windowPanel.data.metrics.totalNoCaprock
    let customAreasTotal = this.windowPanel.data.metrics.customAreasTotal;

    rows.push({
      type: "Area Total (" + this.windowPanel.data.unitSystem.units.area + ")",
      uda: customAreasTotal.roundedMetrics[this.windowPanel.data.unitSystem.system].area,
      total: total.roundedMetrics[this.windowPanel.data.unitSystem.system].area,
      totalNoCaprock: totalNoCaprock.roundedMetrics[this.windowPanel.data.unitSystem.system].area
    });
    rows.push({
      type: "Total Recharge, Baseline (" + this.windowPanel.data.unitSystem.units.volumetric + ")",
      uda: customAreasTotal.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.original,
      total: total.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.original,
      totalNoCaprock: totalNoCaprock.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.original
    });
    rows.push({
      type: "Total Recharge, This Analysis (" + this.windowPanel.data.unitSystem.units.volumetric + ")",
      uda: customAreasTotal.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.current,
      total: total.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.current,
      totalNoCaprock: totalNoCaprock.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.current
    });
    rows.push({
      type: "Average Recharge, Baseline (" + this.windowPanel.data.unitSystem.units.average + ")",
      uda: customAreasTotal.roundedMetrics[this.windowPanel.data.unitSystem.system].average.original,
      total: total.roundedMetrics[this.windowPanel.data.unitSystem.system].average.original,
      totalNoCaprock: totalNoCaprock.roundedMetrics[this.windowPanel.data.unitSystem.system].average.original
    });
    rows.push({
      type: "Average Recharge, This Analysis (" + this.windowPanel.data.unitSystem.units.average + ")",
      uda: customAreasTotal.roundedMetrics[this.windowPanel.data.unitSystem.system].average.current,
      total: total.roundedMetrics[this.windowPanel.data.unitSystem.system].average.current,
      totalNoCaprock: totalNoCaprock.roundedMetrics[this.windowPanel.data.unitSystem.system].average.current
    });
    rows.push({
      type: "Volumetric Difference (" + this.windowPanel.data.unitSystem.units.volumetric + ")",
      uda: customAreasTotal.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.diff,
      total: total.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.diff,
      totalNoCaprock: totalNoCaprock.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.diff
    });
    rows.push({
      type: "Volumetric Percent Change",
      uda: customAreasTotal.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.pchange,
      total: total.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.pchange,
      totalNoCaprock: totalNoCaprock.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.pchange
    });

    this.pdf.autoTable(columnsSummary, rows, {
      startY: y + 20,
      styles: {
        overflow: 'linebreak', font: 'arial', fontSize: 9, cellPadding: 4},
      columnStyles: {
        name: {columnWidth: 90},
      },
      margin: {top: 60}
    });


  //   y = this.pdf.autoTable.previous.finalY + 50

  //   if(y + 50 >= height) {
  //     this.pdf.addPage();
  //     y = 50;
  //   }

  //  // this.pdf.addImage(this.graphImageData[2], 'PNG', 15, y, 550, 250);


  //   this.pdf.text(50, y, "Map Total");

  //   rows = [];

    
  //   rows.push({
  //     oriny: total.roundedMetrics[this.windowPanel.data.unitSystem.system].average.original,
  //     criny: total.roundedMetrics[this.windowPanel.data.unitSystem.system].average.current,
  //     ormgd: total.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.original,
  //     crmgd: total.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.current,
  //     numcells: total.roundedMetrics[this.windowPanel.data.unitSystem.system].area,
  //     diff: total.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.diff,
  //     pchange: total.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.pchange,
  //   })
    

  //   this.pdf.autoTable(columnsNameless, rows, {
  //     startY: y + 20,
  //     styles: {
  //       overflow: 'linebreak', font: 'arial', fontSize: 9, cellPadding: 4},
  //     columnStyles: {
  //       name: {columnWidth: 90},
  //     },
  //     margin: {top: 60}
  //   });

    y = this.pdf.autoTable.previous.finalY + 50;

    if(y + 50 >= height) {
      this.pdf.addPage();
      y = 50;
    }

    this.pdf.text(50, y, "Graphs*");

    y += 10;

    for(let i = 0; i < this.graphOrder.length; i++) {
      if(y + (width - 20) / 2 + 50 >= height) {
        this.pdf.addPage();
        y = 50;
      }
      if(this.graphImageData[this.graphOrder[i]]) {
        this.pdf.addImage(this.graphImageData[this.graphOrder[i]], 'PNG', 10, y, width - 20, (width - 20) / 2);
        y += (width - 20) / 2;
      }

    }


    //the joys of formatting

    //just put this on its own page
    this.pdf.addPage();
    y = 50;

    //extra space since whitespace doesn't seem to be accounted for in width computation
    let h1 = "Limitations";
    //first part of text
    let t1_1 = "Accuracy and relevance of the results generated by this web interface for certain applications is limited by the assumptions of the soil-water budget approach and the quality of the various input data sets available for O‘ahu. A review of the limitations appears below, but more complete descriptions of limitations are given by ";
    //first link
    let l1_1 = {
      text: "Engott and others (2017)",
      link: "https://pubs.er.usgs.gov/publication/sir20155010"
    }
    //second part of text
    let t1_2 = " and ";
    //second link
    let l1_2 = {
      text: "Westenbroek and others (201-)",
      link: "http://www.google.com"
    };
    let t1_3 = ".";
    //bulleted list
    let b1_1 = [
      "Difference in the evapotranspiration rates of native and non-native forests is poorly known.",
      "Projections of future precipitation are highly uncertain, particularly for the Hawaiian Islands; alternative projections exist besides the one offered by this website. In addition, the only climate-change parameter that can be changed with the web interface is rainfall; changes to other climate parameters, such as evapotranspiration and the extent of fog contribution, cannot be simulated with the current web interface.",
      "Results from this website are based on simulations using long-term average input data, and may not accurately simulate recharge for a short period",
      "Land-cover types may exist that are not among the ones included in this website.",
      "If the user changes a baseline non-urban area to urban, leaks from septic systems, cesspools, and water mains are not extended to the new urban areas; only areas that are urban in the baseline land-cover will continue to have these leaks. However, if a baseline urban area is converted to non-urban, the leaks will not be applied in the new non-urban area.",
      "The ability to assess changes in runoff related to changes in land cover, such as urban vs. vegetated surfaces, is limited.",
      "Estimates of runoff in basins that have no stream-gage data have high uncertainty.",
      "The process of groundwater discharge to the surface, and its potential effect on recharge, are not simulated.",
      "The possibility that water flows into a cell from adjacent cells—either in the surface or subsurface—is not included in the water balance.",
      "The web interface does not distinguish between scenarios that are plausible and those that are unrealistic. the user is responsible for assessing the plausibility of scenarios they test."
    ]
    let h2 = "Disclaimer";
    let t2 = "This information is preliminary or provisional and is subject to revision. It is being provided to meet the need for timely best science. The information has not received final approval by the U.S. Geological Survey (USGS) and is provided on the condition that neither the USGS nor the U.S. Government shall be held liable for any damages resulting from the authorized or unauthorized use of the information.";
    

    this.pdf.setFontSize(titleSize);
    this.pdf.text(50, y, h1);

    y += titleSize;

    //use width - 100 so 50px buffer on each side
    let lineWidth = width - 100;

    this.pdf.setFontSize(disclaimerSize);
    let lines = this.pdf.splitTextToSize(t1_1, lineWidth);
    lines.forEach((line) => {
      this.pdf.text(50, y, line);
      y += disclaimerSize;
    });

    //might still have space on this line for next part
    y -= disclaimerSize;

    
    //only need x in handler, y value tracked by full function
    let appendToText = (textToAdd: string, currentLineText: string, textHandler: (text: string, x: number) => void): string => {
      //get offset from start of line for last chunk
      let offset = this.pdf.getStringUnitWidth(currentLineText) * disclaimerSize;
      let remainingLineSpace = lineWidth - offset;
      
      //check if no words fit on line, otherwise when split might end up with something weird since never fits
      let firstWordWidth = this.pdf.getStringUnitWidth(textToAdd.split(" ")[0]) * disclaimerSize;
      let linkWidth = this.pdf.getStringUnitWidth(textToAdd) * disclaimerSize;
      //if no space remaining on last line just place at start of new line (already spaced on y axis)
      if(firstWordWidth > remainingLineSpace) {
        y += disclaimerSize;
        textHandler(textToAdd, 50);
        currentLineText = textToAdd;
      }
      else if(linkWidth <= remainingLineSpace) {

        textHandler(textToAdd, offset + 50);
        currentLineText += textToAdd;
      }
      else {
        lines = this.pdf.splitTextToSize(textToAdd, remainingLineSpace);
        textHandler(lines[0], offset + 50);

        let remaining = "";
        //get remaining string from leftover text
        for(let i = 1; i < lines.length; i++) {
          remaining += lines[i] + " ";
        }
        y += disclaimerSize;

        //split into lines and print normally from start of lines
        this.pdf.splitTextToSize(remaining, lineWidth).forEach((line) => {
          textHandler(remaining, 50);
          y += disclaimerSize;
          currentLineText = line;
        });

        //might still have space on this line for next part
        y -= disclaimerSize;
        
        
      }
      return currentLineText;
    }

    //curried function, applies url of link to printing handler
    let linkHandler = (link: string): any => {
      return (text: string, x: number) => {
        //make link blue and underline
        this.pdf.setTextColor(0, 0, 255);
        this.pdf.setDrawColor(0, 0, 255);
        let underlineLength = this.pdf.getStringUnitWidth(text) * disclaimerSize;
        this.pdf.line(x, y + 2, x + underlineLength, y + 2);
        this.pdf.textWithLink(text, x, y, { url: link });
        this.pdf.setTextColor(0, 0, 0);
        this.pdf.setDrawColor(0, 0, 0);
      }
    }

    let plaintextHandler = (text: string, x: number): any => {
      this.pdf.text(x, y, text);
    }

    //appears to cut off trailing whitespace, so add back in
    let currentLineText = lines[lines.length - 1] + " ";

    currentLineText = appendToText(l1_1.text, currentLineText, linkHandler(l1_1.link));
    currentLineText = appendToText(t1_2, currentLineText, plaintextHandler);
    currentLineText = appendToText(l1_2.text, currentLineText, linkHandler(l1_2.link));
    
    //the last chunk of text is just a period, don't want this on a new line so just append to the end
    let offset = this.pdf.getStringUnitWidth(currentLineText) * disclaimerSize;
    //period gets placed strangely close to last letter, so just add 1 to x axis
    this.pdf.text(offset + 50 + 1, y, t1_3);

    y += disclaimerSize;

    



    let bulletIndent = 60;
    let bulletTextIndent = 70;
    let bulletTextWidth = width - bulletTextIndent - 50;
    let bullet = "\u2022"

    //add half line space
    y += disclaimerSize / 2;

    b1_1.forEach((item) => {
      this.pdf.text(bulletIndent, y, bullet);
      lines = this.pdf.splitTextToSize(item, bulletTextWidth);
      lines.forEach((line) => {
        this.pdf.text(bulletTextIndent, y, line);
        y += disclaimerSize;
      });
    });

    y += 50;

    this.pdf.setFontSize(titleSize);
    this.pdf.text(50, y, h2);

    y += titleSize;

    this.pdf.setFontSize(disclaimerSize);
    lines = this.pdf.splitTextToSize(t2, lineWidth);
    lines.forEach((line) => {
      this.pdf.text(50, y, line);
      y += disclaimerSize;
    });






    //using new format as in example document, leave this for now in case want to revert to old style

    // //first line offsets after header
    // let offset1 = this.pdf.getStringUnitWidth(h1) * 9;
    // let offset2 = this.pdf.getStringUnitWidth(h2) * 9;
    // //width of page with 50 padding on either end
    // let pwidth = this.pdf.internal.pageSize.width;
    // //width of line after header
    // let firstLineWidth1 = pwidth - offset1;
    // //get first line (different from other lines since bolded header)
    // let firstLineText1 = this.pdf.splitTextToSize(t1, firstLineWidth1)[0]
    // //remaining text after first line (remove one extra character to get rid of space)
    // let remainingText1 = t1.substring(firstLineText1.length + 1, t1.length);
    // //get the rest of the lines of text, split at page width
    // let restLinesText1 = this.pdf.splitTextToSize(remainingText1, pwidth);

    // //width of line after header
    // let firstLineWidth2 = pwidth - offset1;
    // //get first line (different from other lines since bolded header)
    // let firstLineText2 = this.pdf.splitTextToSize(t2, firstLineWidth2)[0]
    // //remaining text after first line (remove one extra character to get rid of space)
    // let remainingText2 = t1.substring(firstLineText2.length + 1, t2.length);
    // //get the rest of the lines of text, split at page width
    // let restLinesText2 = this.pdf.splitTextToSize(remainingText2, pwidth);

    // // if(y + 50 >= height) {
    // //   this.pdf.addPage();
    // //   y = 50;
    // // }

    // this.pdf.setFontSize(disclaimerSize);
    
    // this.pdf.setFontType("bold");
    // this.pdf.text(50, y, h1);
    // this.pdf.setFontType("normal");
    // this.pdf.text(50 + offset1, y, firstLineText1);
    // this.pdf.text(50, y + 10, restLinesText1);

    // //add 10 space for each line plus 10 for buffer
    // y += (restLinesText1.length + 1) * 10 + 10
    
    // // if(y + 50 >= height) {
    // //   this.pdf.addPage();
    // //   y = 50;
    // // }

    // this.pdf.setFontType("bold");
    // this.pdf.text(50, y, h2);
    // this.pdf.setFontType("normal");
    // this.pdf.text(50 + offset1, y, firstLineText2);
    // this.pdf.text(50, y + 10, restLinesText2);

    //default font size 16
    //this.pdf.text(50, y, );

    //Limitations (DRAFT)—

    //1 based indexing, array has an empty element at 0 so already handled, also subtract 1 so not printed on disclaimer page
    let numberOfPages = this.pdf.internal.pages.length - 1;
    let linePos = height - 30;
    let footerPos = height - 15;
    this.pdf.setFontSize(descriptionSize);
    for(let i = 1; i < numberOfPages; i++) {
      this.pdf.setPage(i);
      this.pdf.line(50, linePos, width - 50, linePos);
      this.pdf.text(50, footerPos, "*Values rounded to 3 significant figures")
    }
    
    

    this.pdf.save("Report.pdf");
  }

















  //graphs in Mgal/year, might want to add methods to change
  generateReportGraphs() {

    let graphData = {
      aquifers: {
        data: [{
          x: [],
          y: [],
          name: 'Baseline',
          type: 'bar'
        },
        {
          x: [],
          y: [],
          name: 'This Analysis',
          type: 'bar'
        }],
        layout: {}
      },
      aquifersNoCaprock: {
        data: [{
          x: [],
          y: [],
          name: 'Baseline<br>(No Caprock)',
          type: 'bar'
        },
        {
          x: [],
          y: [],
          name: 'This Analysis<br>(No Caprock)',
          type: 'bar'
        }],
        layout: {}
      },
      custom: {
        data: [{
          x: [],
          y: [],
          name: 'Baseline',
          type: 'bar'
        },
        {
          x: [],
          y: [],
          name: 'This Analysis',
          type: 'bar'
        }],
        layout: {}
      },
      customTotal: {
        data: [{
          x: [],
          y: [],
          name: 'Baseline',
          type: 'bar'
        },
        {
          x: [],
          y: [],
          name: 'This Analysis',
          type: 'bar'
        }],
        layout: {}
      },
      full: {
        data: [{
          x: [],
          y: [],
          name: 'Baseline',
          type: 'bar'
        },
        {
          x: [],
          y: [],
          name: 'This Analysis',
          type: 'bar'
        }],
        layout: {}
      },
      fullNoCaprock: {
        data: [{
          x: [],
          y: [],
          name: 'Baseline<br>(No Caprock)',
          type: 'bar'
        },
        {
          x: [],
          y: [],
          name: 'This Analysis<br>(No Caprock)',
          type: 'bar'
        }],
        layout: {}
      }
    }

    let aquiferAnnotations = []
    let x = 0;
    let original;
    let current;
    this.windowPanel.data.metrics.aquifers.forEach((aquifer) => {
      graphData.aquifers.data[0].x.push(aquifer.name);
      graphData.aquifers.data[1].x.push(aquifer.name);

      original = aquifer.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.original;
      current = aquifer.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.current;
      
      graphData.aquifers.data[0].y.push(original);
      graphData.aquifers.data[1].y.push(current);
      aquiferAnnotations.push({
        x: x - 0.2,
        y: original,
        xanchor: 'auto',
        yanchor: 'bottom',
        textangle: -90,
        text: original,
        font: {
          size: 9
        },
        showarrow: false
      });
      aquiferAnnotations.push({
        x: x + 0.2,
        y: current,
        xanchor: 'auto',
        yanchor: 'bottom',
        textangle: -90,
        text: current,
        font: {
          size: 9
        },
        showarrow: false
      });
      x++;
    });
    graphData.aquifers.layout = {
      barmode: 'group',
      margin: {
        b: 125,
        t: 20
      },
      // font: {
      //   family: 'Times New Roman',
      // },
      annotations: aquiferAnnotations
    }

    let aquiferNoCaprockAnnotations = [];
    x = 0;
    this.windowPanel.data.metrics.aquifersNoCaprock.forEach((aquifer) => {
      graphData.aquifersNoCaprock.data[0].x.push(aquifer.name);
      graphData.aquifersNoCaprock.data[1].x.push(aquifer.name);

      original = aquifer.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.original;
      current = aquifer.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.current;

      graphData.aquifersNoCaprock.data[0].y.push(original);
      graphData.aquifersNoCaprock.data[1].y.push(current);

      aquiferNoCaprockAnnotations.push({
        x: x - 0.2,
        y: original,
        xanchor: 'auto',
        yanchor: 'bottom',
        textangle: -90,
        text: original,
        font: {
          size: 9
        },
        showarrow: false
      });
      aquiferNoCaprockAnnotations.push({
        x: x + 0.2,
        y: current,
        xanchor: 'auto',
        yanchor: 'bottom',
        textangle: -90,
        text: current,
        font: {
          size: 9
        },
        showarrow: false
      });
      x++;
    });
    graphData.aquifersNoCaprock.layout = {
      barmode: 'group',
      margin: {
        b: 125,
        t: 20
      },
      annotations: aquiferNoCaprockAnnotations
    }

    graphData.full.data[0].x.push("Map Total");
    graphData.full.data[1].x.push("Map Total");

    //console.log(this.windowPanel.data.metrics.total.roundedMetrics[this.windowPanel.data.unitSystem.system]);

    original = this.windowPanel.data.metrics.total.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.original;
    current = this.windowPanel.data.metrics.total.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.current;

    graphData.full.data[0].y.push(original);
    graphData.full.data[1].y.push(current);

    graphData.full.layout = {
      barmode: 'group',
      margin: {
        t: 20
      },
      annotations: [{
        x: -0.2,
        y: original,
        xanchor: 'auto',
        yanchor: 'bottom',
        text: original,
        showarrow: false
      },
      {
        x: 0.2,
        y: current,
        xanchor: 'auto',
        yanchor: 'bottom',
        text: current,
        showarrow: false
      }]
    }

    graphData.fullNoCaprock.data[0].x.push("Map Total Excluding Caprock");
    graphData.fullNoCaprock.data[1].x.push("Map Total Excluding Caprock");

    original = this.windowPanel.data.metrics.totalNoCaprock.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.original;
    current = this.windowPanel.data.metrics.totalNoCaprock.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.current;

    graphData.fullNoCaprock.data[0].y.push(original);
    graphData.fullNoCaprock.data[1].y.push(current);

    graphData.fullNoCaprock.layout = {
      barmode: 'group',
      margin: {
        t: 20
      },
      annotations: [{
        x: -0.2,
        y: original,
        xanchor: 'auto',
        yanchor: 'bottom',
        text: original,
        showarrow: false
      },
      {
        x: 0.2,
        y: current,
        xanchor: 'auto',
        yanchor: 'bottom',
        text: current,
        showarrow: false
      }]
    }



    Plotly.plot(this.aquiferGraph.nativeElement, graphData.aquifers.data, graphData.aquifers.layout)
    .then((graph) => {
      Plotly.toImage(graph, {format: "png", height: 495, width: 990})
      .then((image) => {   
        this.graphImageData.aquifers = image;
      });
    });

    Plotly.plot(this.aquiferGraphNoCaprock.nativeElement, graphData.aquifersNoCaprock.data, graphData.aquifersNoCaprock.layout)
    .then((graph) => {
      Plotly.toImage(graph, {format: "png", height: 495, width: 990})
      .then((image) => {   
        this.graphImageData.aquifersNoCaprock = image;
      });
    });

    Plotly.plot(this.fullGraph.nativeElement, graphData.full.data, graphData.full.layout)
    .then((graph) => {
      Plotly.toImage(graph, {format: "png", height: 495, width: 990})
      .then((image) => {   
        this.graphImageData.total = image;
      });
    });

    Plotly.plot(this.fullGraphNoCaprock.nativeElement, graphData.fullNoCaprock.data, graphData.fullNoCaprock.layout)
    .then((graph) => {
      Plotly.toImage(graph, {format: "png", height: 495, width: 990})
      .then((image) => {   
        this.graphImageData.totalNoCaprock = image;
      });
    });


    //only plot custom area graphs if user had defined areas
    if(this.windowPanel.data.metrics.customAreas.length > 0) {
      let customAnnotations = []
      x = 0;
      //might want to break into multiple charts if over a certain number of items
      this.windowPanel.data.metrics.customAreas.forEach((area) => {
        graphData.custom.data[0].x.push(area.name);
        graphData.custom.data[1].x.push(area.name);

        original = area.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.original;
        current = area.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.current;
  
        graphData.custom.data[0].y.push(original);
        graphData.custom.data[1].y.push(current);

        //probably need to check how many items there are in case you need to reduce text size or rotate
        customAnnotations.push({
          x: x - 0.2,
          y: original,
          xanchor: 'auto',
          yanchor: 'bottom',
          text: original,
          showarrow: false
        });
        customAnnotations.push({
          x: x + 0.2,
          y: current,
          xanchor: 'auto',
          yanchor: 'bottom',
          text: current,
          showarrow: false
        });
        x++;
      });
      graphData.custom.layout = {
        barmode: 'group',
        margin: {
          t: 20
        },
        annotations: customAnnotations
      }
  
  
      graphData.customTotal.data[0].x.push("Custom Area Total");
      graphData.customTotal.data[1].x.push("Custom Area Total");

      original = this.windowPanel.data.metrics.customAreasTotal.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.original;
      current = this.windowPanel.data.metrics.customAreasTotal.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.current;
  
      graphData.customTotal.data[0].y.push(original)
      graphData.customTotal.data[1].y.push(current);
  
      graphData.customTotal.layout = {
        barmode: 'group',
        margin: {
          t: 20
        },
        annotations: [{
          x: -0.2,
          y: original,
          xanchor: 'auto',
          yanchor: 'bottom',
          text: original,
          showarrow: false
        },
        {
          x: 0.2,
          y: current,
          xanchor: 'auto',
          yanchor: 'bottom',
          text: current,
          showarrow: false
        }]
      }

      Plotly.plot(this.customGraph.nativeElement, graphData.custom.data, graphData.custom.layout)
      .then((graph) => {
        Plotly.toImage(graph, {format: "png", height: 495, width: 990})
        .then((image) => {   
          this.graphImageData.custom = image;
        });
      });

      Plotly.plot(this.customTotalGraph.nativeElement, graphData.customTotal.data, graphData.customTotal.layout)
      .then((graph) => {
        Plotly.toImage(graph, {format: "png", height: 495, width: 990})
        .then((image) => {   
          this.graphImageData.customTotal = image;
        });
      });
    }
    


    
    

    //start display 10 units below min value, but not less than 0
    // let minScale = Math.max(Math.min(originalRecharge, currentRecharge) - 10, 0);
    // //max recharge 75% of graph height
    // let maxRecharge = Math.max(originalRecharge, currentRecharge);
    // let maxScale = maxRecharge + .75 * (maxRecharge - minScale);
    // //if both values are 0 just set it to 1
    // if(maxScale == 0) {
    //   maxScale = 1;
    // }
  }

}