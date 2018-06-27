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
  @ViewChild('customGraph') customGraph;
  @ViewChild('customTotalGraph') customTotalGraph;
  @ViewChild('fullGraph') fullGraph;
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
    custom: null,
    customTotal: null,
    total: null
  };
  graphOrder = ["aquifers", "custom", "customTotal", "total"];

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
      {title: "Island", dataKey: "total"}
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
    let disclaimerSize = 9;

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
    this.pdf.text(50, y, "Aquifer Systems");
    this.pdf.setFontSize(descriptionSize);
    this.pdf.text(220, y - 5, "Hydrological units established by the Hawaii State Comission on Water Resource");
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
    
    this.pdf.setFontSize(titleSize);
    this.pdf.text(50, y, "User Defined Areas");
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

    y = this.pdf.autoTable.previous.finalY + 50

    if(y + 50 >= height) {
      this.pdf.addPage();
      y = 50;
    }


    this.pdf.setFontSize(titleSize);
    this.pdf.text(50, y, "Summary");

    rows = [];
    let total = this.windowPanel.data.metrics.total
    let customAreasTotal = this.windowPanel.data.metrics.customAreasTotal;

    rows.push({
      type: "Area Total (" + this.windowPanel.data.unitSystem.units.area + ")",
      uda: customAreasTotal.roundedMetrics[this.windowPanel.data.unitSystem.system].area,
      total: total.roundedMetrics[this.windowPanel.data.unitSystem.system].area
    });
    rows.push({
      type: "Total Recharge, Baseline (" + this.windowPanel.data.unitSystem.units.volumetric + ")",
      uda: customAreasTotal.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.original,
      total: total.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.original
    });
    rows.push({
      type: "Total Recharge, This Analysis (" + this.windowPanel.data.unitSystem.units.volumetric + ")",
      uda: customAreasTotal.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.current,
      total: total.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.current
    });
    rows.push({
      type: "Average Recharge, Baseline (" + this.windowPanel.data.unitSystem.units.average + ")",
      uda: customAreasTotal.roundedMetrics[this.windowPanel.data.unitSystem.system].average.original,
      total: total.roundedMetrics[this.windowPanel.data.unitSystem.system].average.original
    });
    rows.push({
      type: "Average Recharge, This Analysis (" + this.windowPanel.data.unitSystem.units.average + ")",
      uda: customAreasTotal.roundedMetrics[this.windowPanel.data.unitSystem.system].average.current,
      total: total.roundedMetrics[this.windowPanel.data.unitSystem.system].average.current
    });
    rows.push({
      type: "Volumetric Difference (" + this.windowPanel.data.unitSystem.units.volumetric + ")",
      uda: customAreasTotal.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.diff,
      total: total.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.diff
    });
    rows.push({
      type: "Volumetric Percent Change",
      uda: customAreasTotal.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.pchange,
      total: total.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.pchange
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

    this.pdf.text(50, y, "Graphs");

    y += 10;

    for(let i = 0; i < this.graphOrder.length; i++) {
      if(y + 275 >= height) {
        this.pdf.addPage();
        y = 50;
      }
      if(this.graphImageData[this.graphOrder[i]]) {
        this.pdf.addImage(this.graphImageData[this.graphOrder[i]], 'PNG', 10, y, 550, 275);
        y += 275;
      }

    }


    //the joys of formatting

    //extra space since whitespace doesn't seem to be accounted for in width computation
    let h1 = "Disclaimer:   ";
    let t1 = "The website authors, webmasters, the USGS, the United States Government, and the University of Hawai‘i make no warranty as to accuracy or completeness and are not obligated to provide any support, consulting, training or assistance with regard to the use, operation, and performance of this website. The user assumes all risks for any damages whatsoever resulting from loss of use, data, or profits arising in connection with the access, use, quality, or performance of this website."
    let h2 = "Limitations:  ";
    let t2 = "The user is responsible for understanding the limitations of this website, assumptions of the website’s methods, and the implications of these limitations and assumptions for any analysis done using this website. This website has limited ability to (1) assess differences in runoff related to different land cover types, such as urban vs. vegetated surfaces, (2) assess groundwater/surface-water interaction, (3) surface flow between model cells, or (4) differences between native and non-native forests. Some data used in the models, such as future climate and runoff from ungaged basins, are highly uncertain. The website does not distinguish between what is plausible and what is unrealistic; the user is responsible for knowing the plausibility of scenarios they test.";
    //first line offsets after header
    let offset1 = this.pdf.getStringUnitWidth(h1) * 9;
    let offset2 = this.pdf.getStringUnitWidth(h2) * 9;
    //width of page with 50 padding on either end
    let pwidth = this.pdf.internal.pageSize.width;
    //width of line after header
    let firstLineWidth1 = pwidth - offset1;
    //get first line (different from other lines since bolded header)
    let firstLineText1 = this.pdf.splitTextToSize(t1, firstLineWidth1)[0]
    //remaining text after first line (remove one extra character to get rid of space)
    let remainingText1 = t1.substring(firstLineText1.length + 1, t1.length);
    //get the rest of the lines of text, split at page width
    let restLinesText1 = this.pdf.splitTextToSize(remainingText1, pwidth);

    //width of line after header
    let firstLineWidth2 = pwidth - offset1;
    //get first line (different from other lines since bolded header)
    let firstLineText2 = this.pdf.splitTextToSize(t2, firstLineWidth2)[0]
    //remaining text after first line (remove one extra character to get rid of space)
    let remainingText2 = t1.substring(firstLineText2.length + 1, t2.length);
    //get the rest of the lines of text, split at page width
    let restLinesText2 = this.pdf.splitTextToSize(remainingText2, pwidth);

    this.pdf.setFontSize(disclaimerSize);
    
    this.pdf.setFontType("bold");
    this.pdf.text(50, y, h1);
    this.pdf.setFontType("normal");
    this.pdf.text(50 + offset1, y, firstLineText1);
    this.pdf.text(50, y + 10, restLinesText1);

    //add 10 space for each line plus 10 for buffer
    y += (restLinesText1.length + 1) * 10 + 10
    
    if(y >= height) {
      this.pdf.addPage();
      y = 50;
    }

    this.pdf.setFontType("bold");
    this.pdf.text(50, y, h2);
    this.pdf.setFontType("normal");
    this.pdf.text(50 + offset1, y, firstLineText2);
    this.pdf.text(50, y + 10, restLinesText2);

    //default font size 16
    //this.pdf.text(50, y, );

    //Limitations (DRAFT)—
    

    this.pdf.save("Report.pdf");
  }

















  //graphs in Mgal/year, might want to add methods to change
  generateReportGraphs() {

    let graphData = {
      aquifers: {
        data: [{
          x: [],
          y: [],
          name: 'Original',
          type: 'bar'
        },
        {
          x: [],
          y: [],
          name: 'Current',
          type: 'bar'
        }],
        layout: {}
      },
      custom: {
        data: [{
          x: [],
          y: [],
          name: 'Original',
          type: 'bar'
        },
        {
          x: [],
          y: [],
          name: 'Current',
          type: 'bar'
        }],
        layout: {}
      },
      customTotal: {
        data: [{
          x: [],
          y: [],
          name: 'Original',
          type: 'bar'
        },
        {
          x: [],
          y: [],
          name: 'Current',
          type: 'bar'
        }],
        layout: {}
      },
      full: {
        data: [{
          x: [],
          y: [],
          name: 'Original',
          type: 'bar'
        },
        {
          x: [],
          y: [],
          name: 'Current',
          type: 'bar'
        }],
        layout: {}
      }
    }

    
    this.windowPanel.data.metrics.aquifers.forEach((aquifer) => {
      graphData.aquifers.data[0].x.push(aquifer.name);
      graphData.aquifers.data[1].x.push(aquifer.name);

      graphData.aquifers.data[0].y.push(aquifer.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.original);
      graphData.aquifers.data[1].y.push(aquifer.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.current);
    })
    graphData.aquifers.layout = {
      barmode: 'group',
      margin: {
        b: 125,
        t: 20
      }
    }

    graphData.full.data[0].x.push("Map Total");
    graphData.full.data[1].x.push("Map Total");

console.log(this.windowPanel.data.metrics.total.roundedMetrics[this.windowPanel.data.unitSystem.system]);

    graphData.full.data[0].y.push(this.windowPanel.data.metrics.total.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.original);
    graphData.full.data[1].y.push(this.windowPanel.data.metrics.total.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.current);

    graphData.full.layout = {
      barmode: 'group',
      margin: {
        t: 20
      }
    }

    
    Plotly.plot(this.aquiferGraph.nativeElement, graphData.aquifers.data, graphData.aquifers.layout)
    .then((graph) => {
      Plotly.toImage(graph, {format: "png", height: 450, width: 900})
      .then((image) => {   
        this.graphImageData.aquifers = image;
      });
    });

    Plotly.plot(this.fullGraph.nativeElement, graphData.full.data, graphData.full.layout)
    .then((graph) => {
      Plotly.toImage(graph, {format: "png", height: 450, width: 900})
      .then((image) => {   
        this.graphImageData.total = image;
      });
    });


    //only plot custom area graphs if user had defined areas
    if(this.windowPanel.data.metrics.customAreas.length > 0) {
      this.windowPanel.data.metrics.customAreas.forEach((area) => {
        graphData.custom.data[0].x.push(area.name);
        graphData.custom.data[1].x.push(area.name);
  
        graphData.custom.data[0].y.push(area.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.original);
        graphData.custom.data[1].y.push(area.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.current);
      })
      graphData.custom.layout = {
        barmode: 'group',
        margin: {
          t: 20
        }
      }
  
  
      graphData.customTotal.data[0].x.push("Custom Area Total");
      graphData.customTotal.data[1].x.push("Custom Area Total");
  
      graphData.customTotal.data[0].y.push(this.windowPanel.data.metrics.customAreasTotal.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.original)
      graphData.customTotal.data[1].y.push(this.windowPanel.data.metrics.customAreasTotal.roundedMetrics[this.windowPanel.data.unitSystem.system].volumetric.current);
  
      graphData.customTotal.layout = {
        barmode: 'group',
        margin: {
          t: 20
        }
      }

      Plotly.plot(this.customGraph.nativeElement, graphData.custom.data, graphData.custom.layout)
      .then((graph) => {
        Plotly.toImage(graph, {format: "png", height: 450, width: 900})
        .then((image) => {   
          this.graphImageData.custom = image;
        });
      });

      Plotly.plot(this.customTotalGraph.nativeElement, graphData.customTotal.data, graphData.customTotal.layout)
      .then((graph) => {
        Plotly.toImage(graph, {format: "png", height: 450, width: 900})
        .then((image) => {   
          this.graphImageData.customTotal = image;
        });
      });
    }
    

    // let current = {
    //   x: ['Recharge'],
    //   y: [currentRecharge],
    //   name: 'Current',
    //   type: 'bar'
    // };
    
    

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