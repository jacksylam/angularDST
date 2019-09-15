import { Component, AfterViewInit, Input, ViewChild, Output, EventEmitter } from '@angular/core';
import { WindowLayersService } from '../../../services/window-layers.service';

declare let jsPDF: any;

@Component({
  selector: 'app-report-window',
  templateUrl: './report-window.component.html',
  styleUrls: ['./report-window.component.css']
})
export class ReportWindowComponent implements AfterViewInit {

  @ViewChild('dragBar') dragBar;
  @ViewChild('panelDiv') panelDiv;

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

  @Input() public id: number;
  @Input() public position: {
    top: number,
    left: number,
    width: number,
    height: number
  };
  @Input() data: any;

  @Output("close") close = new EventEmitter();

  

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

  lastMouseXPosition: number;
  lastMouseYPosition: number;

  constructor(private windowLayers: WindowLayersService) { }

  ngAfterViewInit() {
    let __this = this;
    let resizeFunct;
    let scrollDragFunct;
    let dragFunct;

    this.panelDiv.nativeElement.style.width = this.position.width + 'px';
    this.panelDiv.nativeElement.style.height = this.position.height + 'px';
    this.panelDiv.nativeElement.style.left = this.position.left + 'px';
    this.panelDiv.nativeElement.style.top = this.position.top + 'px';

    this.bringWindowForward();

    this.dragBar.nativeElement.addEventListener('mousedown', (e) => {

      e.stopPropagation();
      e.preventDefault();

      //ensure left click, if right click just return
      if(e.which != 1) {
        return;
      }
 
      this.mouseCornerOffset = {
        left: e.pageX - this.panelDiv.nativeElement.offsetLeft,
        top: e.pageY - this.panelDiv.nativeElement.offsetTop
      }

      this.scrollPos = {
        left: window.pageXOffset,
        top: window.pageYOffset
      }
      
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

    
    this.resizeCorner.nativeElement.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();

      //ensure left click, if right click just return
      if(e.which != 1) {
        return;
      }

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
      e.stopPropagation();
      e.preventDefault();

      //ensure left click, if right click just return
      if(e.which != 1) {
        return;
      }

      this.lastMouseXPosition = e.pageX;
      
      
      //need to pass __this in to function, so save anonymous function call for removal
      document.addEventListener('mousemove', resizeFunct = (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.startResizing(e, "right", __this);
      });
    })

    this.resizeBot.nativeElement.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();

      //ensure left click, if right click just return
      if(e.which != 1) {
        return;
      }

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
    
    this.generateReportGraphs();
  }


  startResizing(e, type, __this){
    if(type == "bot" || type == "both") {
      let mouseY = e.pageY;
      let newHeight = (mouseY - __this.lastMouseYPosition) + parseInt(__this.panelDiv.nativeElement.style.height);

      //minimum size
      if(newHeight >= 400) {
        this.lastMouseYPosition = mouseY;
        __this.panelDiv.nativeElement.style.height =  (newHeight) + 'px';
      }
      
    }
    if(type == "right" || type == "both") {
      let mouseX = e.pageX;
      let newWidth = (mouseX - this.lastMouseXPosition) + parseInt(__this.panelDiv.nativeElement.style.width);
      //minimum size
      if(newWidth >= 400) {
        this.lastMouseXPosition = mouseX;
        __this.panelDiv.nativeElement.style.width =  (newWidth) + 'px';
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
    let left = window.pageXOffset - __this.scrollPos.left + __this.panelDiv.nativeElement.offsetLeft;
    let top = window.pageYOffset - __this.scrollPos.top + __this.panelDiv.nativeElement.offsetTop;

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
    __this.panelDiv.nativeElement.style.zIndex = this.windowLayers.getTopZIndex();
  }

  removeWindow() {
    this.close.emit("report");
  }



















  //later should have different types, ignore parameter for now
  download(type: string) {
    let columnsName = [
      {title: "Name", dataKey: "name"},
      {title: "Area (" + this.data.unitSystem.units.area + ")", dataKey: "area"},  
      {title: this.data.scenarioLabels.baseline, dataKey: "ormgd"}, 
      {title: "This Analysis", dataKey: "crmgd"},
      {title: this.data.scenarioLabels.baseline, dataKey: "oriny"}, 
      {title: "This Analysis", dataKey: "criny"},
      {title: this.data.unitSystem.units.volumetric, dataKey: "diff"},
      {title: "Percent Change", dataKey: "pchange"}
    ];
    let columnsSummary = [
      {title: "", dataKey: "type"}, 
      {title: "User-Defined Areas", dataKey: "uda"}, 
      {title: "Island", dataKey: "total"},
      {title: "Island Excluding Caprock", dataKey: "totalNoCaprock"},
      {title: this.data.metrics.specialAquifers[0].name, dataKey: "sp1"},
      {title: this.data.metrics.specialAquifers[1].name, dataKey: "sp2"}
    ];
    let infoHeaders = [
      {title: "", dataKey: "blank"},
      {title: "Total Recharge\n(" + this.data.unitSystem.units.volumetric + ")", dataKey: "cat1"},
      {title: "Average Recharge\n(" + this.data.unitSystem.units.average + ")", dataKey: "cat2"},
      {title: "Volumetric Difference", dataKey: "cat3"}
    ];

    let precision = 3;
    let decimalAlign = (value: string): string => {
      let wholeDigits = value.split(".")[0];
      let digits = precision + 1;
      let spacedValue = value;
      for(let i = 0; i < digits - wholeDigits.length; i++) {
        spacedValue = " " + spacedValue;
      }
      return spacedValue;
    }
  
    let y = 70;
    
    this.pdf = new jsPDF('p', 'pt');

    let width = this.pdf.internal.pageSize.width;    
    let height = this.pdf.internal.pageSize.height;

    let titleSize = 18;
    let descriptionSize = 8;
    let disclaimerSize = 10;
    let graphTitleSize = 12;

    let nameWidth = 90;
    //subtract 80 from width, 40 buffer on each side
    let remainingWidth = width - 80 - nameWidth;
    let normalWidth = remainingWidth / 7;
    let blankWidth = nameWidth + normalWidth;

    let rows = [];

    this.pdf.setFontSize(22);
    this.pdf.text(50, y, "Groundwater Recharge Analysis Report");

    y += 25;

    this.pdf.setFontSize(graphTitleSize);
    this.pdf.setFont('arial');
    this.pdf.text(50, y, "This Analysis Rainfall Scenario: " + this.data.scenarioLabels.current);

    y += 50;

    this.pdf.setFontSize(titleSize);
    this.pdf.text(50, y, "Aquifer Systems*");
    this.pdf.setFontSize(descriptionSize);
    this.pdf.text(220, y - 5, "Hydrological units established by the Hawaii State Commission on Water Resource");
    this.pdf.text(220, y + 5, "Management to manage groundwater resources");
    
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

    this.data.metrics.aquifers.forEach((aquifer) => {
      rows.push({
        name: aquifer.name,
        area: decimalAlign(aquifer.roundedMetrics[this.data.unitSystem.system].area),
        oriny: decimalAlign(aquifer.roundedMetrics[this.data.unitSystem.system].average.original),
        criny: decimalAlign(aquifer.roundedMetrics[this.data.unitSystem.system].average.current),
        ormgd: decimalAlign(aquifer.roundedMetrics[this.data.unitSystem.system].volumetric.original),
        crmgd: decimalAlign(aquifer.roundedMetrics[this.data.unitSystem.system].volumetric.current),
        diff: decimalAlign(aquifer.roundedMetrics[this.data.unitSystem.system].volumetric.diff),
        pchange: decimalAlign(aquifer.roundedMetrics[this.data.unitSystem.system].volumetric.pchange),
      });
    });
    this.data.metrics.specialAquifers.forEach((aquifer) => {
      rows.push({
        name: aquifer.name,
        area: decimalAlign(aquifer.roundedMetrics[this.data.unitSystem.system].area),
        oriny: decimalAlign(aquifer.roundedMetrics[this.data.unitSystem.system].average.original),
        criny: decimalAlign(aquifer.roundedMetrics[this.data.unitSystem.system].average.current),
        ormgd: decimalAlign(aquifer.roundedMetrics[this.data.unitSystem.system].volumetric.original),
        crmgd: decimalAlign(aquifer.roundedMetrics[this.data.unitSystem.system].volumetric.current),
        diff: decimalAlign(aquifer.roundedMetrics[this.data.unitSystem.system].volumetric.diff),
        pchange: decimalAlign(aquifer.roundedMetrics[this.data.unitSystem.system].volumetric.pchange),
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
      drawHeaderRow: (row, data) => {
        row.cells.area.styles.halign = "center";
        row.cells.oriny.styles.halign = "center";
        row.cells.criny.styles.halign = "center";
        row.cells.ormgd.styles.halign = "center";
        row.cells.crmgd.styles.halign = "center";
        row.cells.diff.styles.halign = "center";
        row.cells.pchange.styles.halign = "center";
      },
      drawRow: (row, data) => {
        row.cells.area.styles.font = "courier"
        row.cells.oriny.styles.font = "courier";
        row.cells.criny.styles.font = "courier";
        row.cells.ormgd.styles.font = "courier";
        row.cells.crmgd.styles.font = "courier";
        row.cells.diff.styles.font = "courier";
        row.cells.pchange.styles.font = "courier";
      },
      margin: {top: 60}
    });

    rows = [];

    y = this.pdf.autoTable.previous.finalY + 50;

    if(y + 100 >= height) {
      this.pdf.addPage();
      y = 50;
    }
    this.pdf.setFontSize(titleSize);
    this.pdf.setFont('arial');
    this.pdf.text(50, y - 10, "Aquifer Systems\nExcluding Caprock*");
    this.pdf.setFontSize(descriptionSize);
    this.pdf.text(220, y - 5, "Aquifer systems minus the area covered by caprock (semi-confining, mostly sedimentary unit");
    this.pdf.text(220, y + 5, "that partly overlies coastal areas of some aquifer systems)");

    y += 20;
    if(y + 100 >= height) {
      this.pdf.addPage();
      y = 50;
    }

    this.pdf.autoTable(infoHeaders, rows, {
      startY: y,
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

    this.data.metrics.aquifersNoCaprock.forEach((aquifer) => {
      rows.push({
        name: aquifer.name,
        area: decimalAlign(aquifer.roundedMetrics[this.data.unitSystem.system].area),
        oriny: decimalAlign(aquifer.roundedMetrics[this.data.unitSystem.system].average.original),
        criny: decimalAlign(aquifer.roundedMetrics[this.data.unitSystem.system].average.current),
        ormgd: decimalAlign(aquifer.roundedMetrics[this.data.unitSystem.system].volumetric.original),
        crmgd: decimalAlign(aquifer.roundedMetrics[this.data.unitSystem.system].volumetric.current),
        diff: decimalAlign(aquifer.roundedMetrics[this.data.unitSystem.system].volumetric.diff),
        pchange: decimalAlign(aquifer.roundedMetrics[this.data.unitSystem.system].volumetric.pchange),
      })
    })

    this.pdf.autoTable(columnsName, rows, {
      startY: y + 30,
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
      drawHeaderRow: (row, data) => {
        row.cells.area.styles.halign = "center";
        row.cells.oriny.styles.halign = "center";
        row.cells.criny.styles.halign = "center";
        row.cells.ormgd.styles.halign = "center";
        row.cells.crmgd.styles.halign = "center";
        row.cells.diff.styles.halign = "center";
        row.cells.pchange.styles.halign = "center";
      },
      drawRow: (row, data) => {
        row.cells.area.styles.font = "courier"
        row.cells.oriny.styles.font = "courier";
        row.cells.criny.styles.font = "courier";
        row.cells.ormgd.styles.font = "courier";
        row.cells.crmgd.styles.font = "courier";
        row.cells.diff.styles.font = "courier";
        row.cells.pchange.styles.font = "courier";
      },
      margin: {top: 60}
    });

    

    rows = [];

    y = this.pdf.autoTable.previous.finalY + 50;

    if(y + 50 >= height) {
      this.pdf.addPage();
      y = 50;
    }
    
    this.pdf.setFontSize(titleSize);
    this.pdf.setFont('arial');
    this.pdf.text(50, y, "User-Defined Areas*");
    this.pdf.setFontSize(descriptionSize);
    this.pdf.text(220, y, "Areas of land cover change designated by the user for this analysis");

    y += 20;
    if(y + 100 >= height) {
      this.pdf.addPage();
      y = 50;
    }

    this.pdf.autoTable(infoHeaders, rows, {
      startY: y,
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

    this.data.metrics.customAreas.forEach((customArea) => {
      rows.push({
        name: customArea.name,
        area: decimalAlign(customArea.roundedMetrics[this.data.unitSystem.system].area),
        oriny: decimalAlign(customArea.roundedMetrics[this.data.unitSystem.system].average.original),
        criny: decimalAlign(customArea.roundedMetrics[this.data.unitSystem.system].average.current),
        ormgd: decimalAlign(customArea.roundedMetrics[this.data.unitSystem.system].volumetric.original),
        crmgd: decimalAlign(customArea.roundedMetrics[this.data.unitSystem.system].volumetric.current),
        diff: decimalAlign(customArea.roundedMetrics[this.data.unitSystem.system].volumetric.diff),
        pchange: decimalAlign(customArea.roundedMetrics[this.data.unitSystem.system].volumetric.pchange),
      });
    });

    this.pdf.autoTable(columnsName, rows, {
      startY: y + 30,
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
      drawHeaderRow: (row, data) => {
        row.cells.area.styles.halign = "center";
        row.cells.oriny.styles.halign = "center";
        row.cells.criny.styles.halign = "center";
        row.cells.ormgd.styles.halign = "center";
        row.cells.crmgd.styles.halign = "center";
        row.cells.diff.styles.halign = "center";
        row.cells.pchange.styles.halign = "center";
      },
      drawRow: (row, data) => {
        row.cells.area.styles.font = "courier"
        row.cells.oriny.styles.font = "courier";
        row.cells.criny.styles.font = "courier";
        row.cells.ormgd.styles.font = "courier";
        row.cells.crmgd.styles.font = "courier";
        row.cells.diff.styles.font = "courier";
        row.cells.pchange.styles.font = "courier";
      },
      margin: {top: 60}
    });

    rows = [];

    y = this.pdf.autoTable.previous.finalY + 50;

    if(y + 50 >= height) {
      this.pdf.addPage();
      y = 50;
    }


    this.pdf.setFontSize(titleSize);
    this.pdf.setFont('arial');
    this.pdf.text(50, y, "Summary*");

    y += 20;
    if(y + 75 >= height) {
      this.pdf.addPage();
      y = 50;
    }

    let total = this.data.metrics.total
    let totalNoCaprock = this.data.metrics.totalNoCaprock
    let customAreasTotal = this.data.metrics.customAreasTotal;
    let sp1 = this.data.metrics.specialAquifers[0];
    let sp2 = this.data.metrics.specialAquifers[1];


    rows.push({
      type: "Area Total (" + this.data.unitSystem.units.area + ")",
      uda: decimalAlign(customAreasTotal.roundedMetrics[this.data.unitSystem.system].area),
      total: decimalAlign(total.roundedMetrics[this.data.unitSystem.system].area),
      totalNoCaprock: decimalAlign(totalNoCaprock.roundedMetrics[this.data.unitSystem.system].area),
      sp1: decimalAlign(sp1.roundedMetrics[this.data.unitSystem.system].area),
      sp2: decimalAlign(sp2.roundedMetrics[this.data.unitSystem.system].area)
    });
    rows.push({
      type: "Total Recharge, " + this.data.scenarioLabels.baseline + " (" + this.data.unitSystem.units.volumetric + ")",
      uda: decimalAlign(customAreasTotal.roundedMetrics[this.data.unitSystem.system].volumetric.original),
      total: decimalAlign(total.roundedMetrics[this.data.unitSystem.system].volumetric.original),
      totalNoCaprock: decimalAlign(totalNoCaprock.roundedMetrics[this.data.unitSystem.system].volumetric.original),
      sp1: decimalAlign(sp1.roundedMetrics[this.data.unitSystem.system].volumetric.original),
      sp2: decimalAlign(sp2.roundedMetrics[this.data.unitSystem.system].volumetric.original)
    });
    rows.push({
      type: "Total Recharge, This Analysis (" + this.data.unitSystem.units.volumetric + ")",
      uda: decimalAlign(customAreasTotal.roundedMetrics[this.data.unitSystem.system].volumetric.current),
      total: decimalAlign(total.roundedMetrics[this.data.unitSystem.system].volumetric.current),
      totalNoCaprock: decimalAlign(totalNoCaprock.roundedMetrics[this.data.unitSystem.system].volumetric.current),
      sp1: decimalAlign(sp1.roundedMetrics[this.data.unitSystem.system].volumetric.current),
      sp2: decimalAlign(sp2.roundedMetrics[this.data.unitSystem.system].volumetric.current)
    });
    rows.push({
      type: "Average Recharge, " + this.data.scenarioLabels.baseline + " (" + this.data.unitSystem.units.average + ")",
      uda: decimalAlign(customAreasTotal.roundedMetrics[this.data.unitSystem.system].average.original),
      total: decimalAlign(total.roundedMetrics[this.data.unitSystem.system].average.original),
      totalNoCaprock: decimalAlign(totalNoCaprock.roundedMetrics[this.data.unitSystem.system].average.original),
      sp1: decimalAlign(sp1.roundedMetrics[this.data.unitSystem.system].average.original),
      sp2: decimalAlign(sp2.roundedMetrics[this.data.unitSystem.system].average.original)
    });
    rows.push({
      type: "Average Recharge, This Analysis (" + this.data.unitSystem.units.average + ")",
      uda: decimalAlign(customAreasTotal.roundedMetrics[this.data.unitSystem.system].average.current),
      total: decimalAlign(total.roundedMetrics[this.data.unitSystem.system].average.current),
      totalNoCaprock: decimalAlign(totalNoCaprock.roundedMetrics[this.data.unitSystem.system].average.current),
      sp1: decimalAlign(sp1.roundedMetrics[this.data.unitSystem.system].average.current),
      sp2: decimalAlign(sp2.roundedMetrics[this.data.unitSystem.system].average.current)
    });
    rows.push({
      type: "Volumetric Difference (" + this.data.unitSystem.units.volumetric + ")",
      uda: decimalAlign(customAreasTotal.roundedMetrics[this.data.unitSystem.system].volumetric.diff),
      total: decimalAlign(total.roundedMetrics[this.data.unitSystem.system].volumetric.diff),
      totalNoCaprock: decimalAlign(totalNoCaprock.roundedMetrics[this.data.unitSystem.system].volumetric.diff),
      sp1: decimalAlign(sp1.roundedMetrics[this.data.unitSystem.system].volumetric.diff),
      sp2: decimalAlign(sp2.roundedMetrics[this.data.unitSystem.system].volumetric.diff)
    });
    rows.push({
      type: "Volumetric Percent Change",
      uda: decimalAlign(customAreasTotal.roundedMetrics[this.data.unitSystem.system].volumetric.pchange),
      total: decimalAlign(total.roundedMetrics[this.data.unitSystem.system].volumetric.pchange),
      totalNoCaprock: decimalAlign(totalNoCaprock.roundedMetrics[this.data.unitSystem.system].volumetric.pchange),
      sp1: decimalAlign(sp1.roundedMetrics[this.data.unitSystem.system].volumetric.pchange),
      sp2: decimalAlign(sp2.roundedMetrics[this.data.unitSystem.system].volumetric.pchange)
    });

    this.pdf.autoTable(columnsSummary, rows, {
      startY: y,
      styles: {
        overflow: 'linebreak', font: 'arial', fontSize: 9, cellPadding: 4},
      columnStyles: {
        total: {columnWidth: 50, halign: "center"},
        uda: {halign: "center"},
        totalNoCaprock: {halign: "center"},
        sp1: {halign: "center"},
        sp2: {halign: "center"},
        type: {columnWidth: 190, overflow: "visible"}
      },
      drawHeaderRow: (row, data) => {
        row.cells.type.styles.halign = "center";
        row.cells.uda.styles.halign = "center";
        row.cells.total.styles.halign = "center";
        row.cells.totalNoCaprock.styles.halign = "center";
        row.cells.sp1.styles.halign = "center";
        row.cells.sp2.styles.halign = "center";
      },
      drawRow: (row, data) => {
        row.cells.type.styles.fontSize = 7;
        row.cells.uda.styles.font = "courier";
        row.cells.total.styles.font = "courier";
        row.cells.totalNoCaprock.styles.font = "courier";
        row.cells.sp1.styles.font = "courier";
        row.cells.sp2.styles.font = "courier";
      },
      margin: {top: 60}
    });


    y = this.pdf.autoTable.previous.finalY + 50;

    if(y + 50 >= height) {
      this.pdf.addPage();
      y = 50;
    }

    this.pdf.setFont('arial');
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

    //just put this on its own page
    this.pdf.addPage();
    y = 50;

    //extra space since whitespace doesn't seem to be accounted for in width computation
    let h1 = "Limitations";
    //first part of text
    let t1_1 = "Accuracy of the results generated by the Hawai‘i Groundwater Recharge Tool and their applicability for certain studies is limited by the assumptions of the soil-water budget approach and the quality of the various input datasets available for O‘ahu. A review of the limitations appears below, but more complete descriptions of limitations are given by ";
    //first link
    let l1_1 = {
      text: "Engott and others (2017)",
      link: "https://pubs.er.usgs.gov/publication/sir20155010"
    }
    //second part of text
    let t1_2 = " and ";
    //second link
    let l1_2 = {
      text: "Westenbroek and others (2018)",
      link: "https://pubs.er.usgs.gov/publication/tm6A59"
    };
    let t1_3 = " .";
    //bulleted list
    let bullets: any[][] = [
      [{
        type: "text",
        content: "The Hawai‘i Groundwater Recharge Tool does not distinguish between user-defined scenarios that are plausible and those that are unrealistic. Some land-cover types (and their parameter values) may not be applicable in all areas of the island (for example, evapotranspiration coefficients for native forests, which typically are in high-rainfall areas, may not be applicable in dry areas). Users are responsible for assessing the plausibility of scenarios they test."
      }],
      [{
        type: "text",
        content: "When designating an area as developed, high-intensity or developed, medium-intensity, users have the option of including storms drains (codes 9 and 10) or not including storm drains (codes 31 and 32). Users are responsible for understanding the implications of these options for their application; selection of the inappropriate option can have unintended results. In the 2010 baseline landcover, storm drains are applied to medium- and high-intensity developed land covers only in selected aquifer systems ("
      }, {
        type: "link",
        content: {
          text: "State of Hawaii, 2008",
          link: "http://files.hawaii.gov/dlnr/cwrm/planning/wrpp2008update/FINAL_WRPP_20080828.pdf"
        }
      }, {
        type: "text",
        content: "), which is consistent with the procedure described by "
      }, {
        type: "link",
        content: {
          text: "Engott and others (2017)",
          link: "https://pubs.er.usgs.gov/publication/sir20155010"
        }
      }, {
        type: "text",
        content: ". For most of O‘ahu, medium- and high-intensity developed land covers have storm drains (codes 9 and 10). In more rural northern O‘ahu (aquifer systems 30401, 30402, 30403, 30601, and 30602), medium- and high-intensity developed land covers have no storm drains (codes 31 and 32). See "
      }, {
        type: "link",
        content: {
          text: "Engott and others (2017)",
          link: "https://pubs.er.usgs.gov/publication/sir20155010"
        }
      }, {
        type: "text",
        content: " for more information."
      }],
      [{
        type: "text",
        content: "Changing land cover to taro (code 26), water body (code 13), or reservoir (code 14) in areas that don’t already have them in the baseline land cover can lead to gross errors. Recharge rates for these land covers are fixed values that were not computed by the soil water-budget analysis, but were based on simplifying assumptions ("
      }, {
        type: "link",
        content: {
          text: "Engott and others, 2017",
          link: "https://pubs.er.usgs.gov/publication/sir20155010"
        }
      }, {
        type: "text",
        content: ") that may not be transferrable to other locations."
      }],
      [{
        type: "text",
        content: "The Hawai‘i Groundwater Recharge Tool results are long-term average recharge rates, and may not accurately simulate recharge over a short period."
      }],
      [{
        type: "text",
        content: "Land-cover types may exist that are not among the ones included in the Hawai‘i Groundwater Recharge Tool."
      }],
      [{
        type: "text",
        content: "Estimates of runoff used in the SWB simulations have high uncertainty. Runoff is computed on the basis of runoff-to-rainfall ratios which are based on basin-integrated stream-gage data. Runoff-to-rainfall ratios are not computed for specific land-cover types and do not change when a user changes land cover. As a result, the Hawai‘i Groundwater Recharge Tool is not able to assess changes in recharge related to differences in runoff for different land-cover types."
      }],
      [{
        type: "text",
        content: "Differences in the evapotranspiration rates of native and non-native forests are not well known."
      }],
      [{
        type: "text",
        content: "Projections of future precipitation are uncertain, particularly for the Hawaiian Islands ("
      }, {
        type: "link",
        content: {
          text: "Keener and others, 2012",
          link: "https://pirca.org/2012/12/04/2012-pirca-full-report/"
        }
      }, {
        type: "text",
        content: "); alternative projections exist besides the one offered by the Hawai‘i Groundwater Recharge Tool. In addition, the only climate-change parameter that can be changed with the web interface is rainfall; changes to other climate parameters, such as temperature, reference evapotranspiration, and the spatial extent of fog contribution, cannot be simulated with the current Hawai‘i Groundwater Recharge Tool."
      }],
      [{
        type: "text",
        content: "The process of groundwater discharge to the surface, and its potential effect of rejecting recharge, were not part of the SWB simulations. The process of groundwater recharge from streams that lose water along their reaches due to seepage was also not directly part of the SWB simulations, but was potentially accounted for by the basin-wide runoff integration of the runoff-to-rainfall ratio method used by "
      }, {
        type: "link",
        content: {
          text: "Engott and others (2017)",
          link: "https://pubs.er.usgs.gov/publication/sir20155010"
        }
      }, {
        type: "text",
        content: " and "
      }, {
        type: "link",
        content: {
          text: "Izuka and others (2018)",
          link: "https://pubs.er.usgs.gov/publication/sir20155164"
        }
      }, {
        type: "text",
        content: "."
      }],
      [{
        type: "text",
        content: "The possibility that water flows into a cell from adjacent cells—either in the surface or subsurface—was not part of the SWB simulations."
      }],
      [{
        type: "text",
        content: "If the user changes a baseline non-developed area to developed (codes 8, 9, 10, 31, and 32), contributions from septic systems, cesspools, and water mains are not extended to the new developed areas; only areas that are developed in the baseline land cover will continue to have these contributions. However, if a baseline developed area is converted to non-developed, these contributions will not be applied in the new non-developed area."
      }],
      [{
        type: "text",
        content: "The users’ ability to change land cover and climate in the Hawai‘i Groundwater Recharge Tool is limited by the grid-cell dimensions. Only cells whose center is within the users’ change shape will be converted according to users’ designation. Shapes that are smaller than the 75-meter square cells or highly complicated may not produce the changes intended by the user."
      }],
      [{
        type: "text",
        content: "Conversion from the irregular-polygon environment of the source publications ("
      }, {
        type: "link",
        content: {
          text: "Engott and others (2017)",
          link: "https://pubs.er.usgs.gov/publication/sir20155010"
        }
      }, {
        type: "text",
        content: " and "
      }, {
        type: "link",
        content: {
          text: "Izuka and others (2018)",
          link: "https://pubs.er.usgs.gov/publication/sir20155164"
        }
      }, {
        type: "text",
        content: ") to the rectangular-grid environment of SWB can result in slight differences between the results in the source publication and the Hawai‘i Groundwater Recharge Tool’s baseline land cover."
      }],
      [{
        type: "text",
        content: "Some land-cover types use simplifying assumptions that differ from published conditions for 2010 land cover by "
      }, {
        type: "link",
        content: {
          text: "Engott and others (2017)",
          link: "https://pubs.er.usgs.gov/publication/sir20155010"
        }
      }, {
        type: "text",
        content: " and "
      }, {
        type: "link",
        content: {
          text: "Izuka and others (2018)",
          link: "https://pubs.er.usgs.gov/publication/sir20155164"
        }
      }, {
        type: "text",
        content: ". For example, percentage pervious area for developed land-cover types and canopy cover for forested land-cover types are area-weighted average values for each land cover based on estimated values for 2010 land-cover conditions."
      }]
    ]
    let h2 = "Disclaimer";
    let t2 = "This information is preliminary or provisional and is subject to revision. It is being provided to meet the need for timely best science. The information has not received final approval by the U.S. Geological Survey (USGS) and is provided on the condition that neither the USGS nor the U.S. Government shall be held liable for any damages resulting from the authorized or unauthorized use of the information.";
    

    this.pdf.setFontSize(titleSize);
    this.pdf.setFont('arial');
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
    let appendToText = (textToAdd: string, currentLineText: string, indent: number, lineWidth: number, textHandler: (text: string, x: number) => void): string => {
      if(y >= height) {
        this.pdf.addPage();
        y = 50;
      }
      //get offset from start of line for last chunk
      let offset = this.pdf.getStringUnitWidth(currentLineText) * disclaimerSize;
      if(offset != 0) {
        offset += 2;
      }
      let remainingLineSpace = lineWidth - offset;
      
      let firstWord = textToAdd.trim().split(" ")[0];
      //check if no words fit on line, otherwise when split might end up with something weird since never fits
      let firstWordWidth = this.pdf.getStringUnitWidth(firstWord) * disclaimerSize;
      let linkWidth = this.pdf.getStringUnitWidth(textToAdd) * disclaimerSize;
      // console.log(textToAdd);
      // console.log(firstWord);
      //if no space remaining on last line just place at start of new line (already spaced on y axis)
      if(firstWordWidth > remainingLineSpace) {
        //if first word too long for whole line (no text already on line) just print it to prevent infinite recursion
        if(currentLineText == "") {
          textHandler(firstWord, offset + indent);
          let remainingText = textToAdd.slice(firstWord.length + 1);
          y += disclaimerSize;
          appendToText(remainingText, "", indent, lineWidth, textHandler);
        }
        else {
          y += disclaimerSize;
          //trim leading whitespace if exist
          let trimmedText = textToAdd;
          while(trimmedText[0] == " ") {
            trimmedText = trimmedText.slice(1);
          }
          currentLineText = appendToText(trimmedText, "", indent, lineWidth, textHandler);
        }
      }
      else if(linkWidth <= remainingLineSpace) {
        textHandler(textToAdd, offset + indent);
        currentLineText += textToAdd;
      }
      else {
        lines = this.pdf.splitTextToSize(textToAdd, remainingLineSpace);
        textHandler(lines[0], offset + indent);

        let remaining = "";
        //get remaining string from leftover text
        for(let i = 1; i < lines.length; i++) {
          remaining += lines[i] + " ";
        }
        remaining = remaining.slice(0, -1);
        y += disclaimerSize;

        //split into lines and print normally from start of lines
        this.pdf.splitTextToSize(remaining, lineWidth).forEach((line) => {
          if(y + 50 >= height) {
            this.pdf.addPage();
            y = 50;
          }
          textHandler(line, indent);
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

    currentLineText = appendToText(l1_1.text, currentLineText, 50, lineWidth, linkHandler(l1_1.link));
    currentLineText = appendToText(t1_2, currentLineText, 50, lineWidth, plaintextHandler);
    currentLineText = appendToText(l1_2.text, currentLineText, 50, lineWidth, linkHandler(l1_2.link));
    
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

    // b1_1.forEach((item) => {
    //   this.pdf.text(bulletIndent, y, bullet);
    //   lines = this.pdf.splitTextToSize(item, bulletTextWidth);
    //   lines.forEach((line) => {
    //     this.pdf.text(bulletTextIndent, y, line);
    //     y += disclaimerSize;
    //   });
    // });

    bullets.forEach((item) => {
      currentLineText = "";
      this.pdf.text(bulletIndent, y, bullet);

      item.forEach((part) => {
        let handler = null;
        let text = null;
        switch(part.type) {
          case "text": {
            handler = plaintextHandler;
            text = part.content;
            break;
          }
          case "link": {
            handler = linkHandler(part.content.link);
            text = part.content.text;
            break;
          }
          default: {
            throw new Error("Invalid text type.");
          }
        }
        
        currentLineText = appendToText(text, currentLineText, bulletTextIndent, bulletTextWidth, handler);
      });
      
      y += disclaimerSize * 1.5;
    });

    y += 50;

    console.log(height, y);
    if(y + 50 >= height) {
      this.pdf.addPage();
      y = 50;
    }

    this.pdf.setFontSize(titleSize);
    this.pdf.text(50, y, h2);

    y += titleSize;

    this.pdf.setFontSize(disclaimerSize);
    appendToText(t2, "", 50, lineWidth, plaintextHandler);
    // lines = this.pdf.splitTextToSize(t2, lineWidth);
    // lines.forEach((line) => {
    //   if(y >= height) {
    //     this.pdf.addPage();
    //     y = 50;
    //   }
    //   this.pdf.text(50, y, line);
    //   y += disclaimerSize;
    // });


    //1 based indexing, array has an empty element at 0 so already handled, also subtract 1 so not printed on disclaimer page
    let numberOfPages = this.pdf.internal.pages.length - 1;
    let linePos = height - 30;
    let footerPos = height - 15;
    this.pdf.setFontSize(descriptionSize);
    for(let i = 1; i < numberOfPages - 1; i++) {
      this.pdf.setPage(i);
      this.pdf.line(50, linePos, width - 50, linePos);
      this.pdf.text(50, footerPos, "*Values rounded to two decimal places")
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
          name: this.data.scenarioLabels.baseline,
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
          name: this.data.scenarioLabels.baseline,
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
      custom: {
        data: [{
          x: [],
          y: [],
          name: this.data.scenarioLabels.baseline,
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
          name: this.data.scenarioLabels.baseline,
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
          name: this.data.scenarioLabels.baseline,
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
          name: this.data.scenarioLabels.baseline,
          type: 'bar'
        },
        {
          x: [],
          y: [],
          name: 'This Analysis',
          type: 'bar'
        }],
        layout: {}
      }
    }

    let aquiferAnnotations = []
    let xPos = 0;
    let original;
    let current;
    this.data.metrics.aquifers.forEach((aquifer) => {
      graphData.aquifers.data[0].x.push(aquifer.name);
      graphData.aquifers.data[1].x.push(aquifer.name);

      original = aquifer.roundedMetrics[this.data.unitSystem.system].volumetric.original;
      current = aquifer.roundedMetrics[this.data.unitSystem.system].volumetric.current;
      
      graphData.aquifers.data[0].y.push(original);
      graphData.aquifers.data[1].y.push(current);
      aquiferAnnotations.push({
        x: xPos - 0.2,
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
        x: xPos + 0.2,
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
      xPos++;
    });
    graphData.aquifers.layout = {
      title: "Aquifer Recharge",
      yaxis: {
        title: "Total Recharge (" + this.data.unitSystem.units.volumetric + ")"
      },
      // xaxis: {
      //   tickangle: 45
      // },
      barmode: 'group',
      margin: {
        b: 125,
        t: 30
      },
      // font: {
      //   family: 'Times New Roman',
      // },
      annotations: aquiferAnnotations
    }

    let aquiferNoCaprockAnnotations = [];
    xPos = 0;
    this.data.metrics.aquifersNoCaprock.forEach((aquifer) => {
      graphData.aquifersNoCaprock.data[0].x.push(aquifer.name);
      graphData.aquifersNoCaprock.data[1].x.push(aquifer.name);

      original = aquifer.roundedMetrics[this.data.unitSystem.system].volumetric.original;
      current = aquifer.roundedMetrics[this.data.unitSystem.system].volumetric.current;

      graphData.aquifersNoCaprock.data[0].y.push(original);
      graphData.aquifersNoCaprock.data[1].y.push(current);

      aquiferNoCaprockAnnotations.push({
        x: xPos - 0.2,
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
        x: xPos + 0.2,
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
      xPos++;
    });
    graphData.aquifersNoCaprock.layout = {
      title: "Aquifer Recharge Excluding Caprock",
      yaxis: {
        title: "Total Recharge (" + this.data.unitSystem.units.volumetric + ")"
      },
      // xaxis: {
      //   tickangle: 45
      // },
      barmode: 'group',
      margin: {
        b: 125,
        t: 30
      },
      annotations: aquiferNoCaprockAnnotations
    }

    graphData.full.data[0].x.push("Map Total");
    graphData.full.data[1].x.push("Map Total");

    //console.log(this.data.metrics.total.roundedMetrics[this.data.unitSystem.system]);

    original = this.data.metrics.total.roundedMetrics[this.data.unitSystem.system].volumetric.original;
    current = this.data.metrics.total.roundedMetrics[this.data.unitSystem.system].volumetric.current;

    graphData.full.data[0].y.push(original);
    graphData.full.data[1].y.push(current);

    graphData.full.layout = {
      title: "Island Total Recharge",
      yaxis: {
        title: "Total Recharge (" + this.data.unitSystem.units.volumetric + ")"
      },
      barmode: 'group',
      margin: {
        t: 30
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

    original = this.data.metrics.totalNoCaprock.roundedMetrics[this.data.unitSystem.system].volumetric.original;
    current = this.data.metrics.totalNoCaprock.roundedMetrics[this.data.unitSystem.system].volumetric.current;

    graphData.fullNoCaprock.data[0].y.push(original);
    graphData.fullNoCaprock.data[1].y.push(current);

    graphData.fullNoCaprock.layout = {
      title: "Island Total Recharge Excluding Caprock",
      yaxis: {
        title: "Total Recharge (" + this.data.unitSystem.units.volumetric + ")"
      },
      barmode: 'group',
      margin: {
        t: 30
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
    if(this.data.metrics.customAreas.length > 0) {
      let customAreasToGraph = this.data.metrics.customAreas;
      let graphTitle = "User-Defined Areas Recharge";
      if(this.data.metrics.customAreas.length > 20) {
        //comparison function for area sizes (largest area first)
        let areaCompare = (areaA, areaB) => {
          //console.log(areaA.metrics[this.data.unitSystem.system].area);
          if(areaA.metrics[this.data.unitSystem.system].area > areaB.metrics[this.data.unitSystem.system].area) {
            return -1;
          }
          else if(areaA.metrics[this.data.unitSystem.system].area < areaB.metrics[this.data.unitSystem.system].area) {
            return 1;
          }
          else {
            return 0;
          }
        };

        customAreasToGraph.sort(areaCompare);
        customAreasToGraph = customAreasToGraph.slice(0, 20);
        graphTitle += " (20 Largest Areas)";
      }

      let customAnnotations = []
      xPos = 0;
      //might want to break into multiple charts if over a certain number of items
      customAreasToGraph.forEach((area) => {
        //if name is a number it uses this as the x position? If number add grave to deal with what appears to be a weird bug in plot.ly
        let areaName = area.name;
        if(!isNaN(areaName)) areaName += "`";
        graphData.custom.data[0].x.push(areaName);
        graphData.custom.data[1].x.push(areaName);

        original = area.roundedMetrics[this.data.unitSystem.system].volumetric.original;
        current = area.roundedMetrics[this.data.unitSystem.system].volumetric.current;
  
        graphData.custom.data[0].y.push(original);
        graphData.custom.data[1].y.push(current);

        //probably need to check how many items there are in case you need to reduce text size or rotate
        customAnnotations.push({
          x: xPos - 0.2,
          y: original,
          textangle: customAreasToGraph.length < 5 ? 0: -90,
          xanchor: 'auto',
          yanchor: 'bottom',
          text: original,
          showarrow: false
        });
        customAnnotations.push({
          x: xPos + 0.2,
          y: current,
          textangle: customAreasToGraph.length < 5 ? 0: -90,
          xanchor: 'auto',
          yanchor: 'bottom',
          text: current,
          showarrow: false
        });
        xPos++;
      });
      graphData.custom.layout = {
        title: graphTitle,
        yaxis: {
          title: "Total Recharge (" + this.data.unitSystem.units.volumetric + ")"
        },
        // xaxis: {
        //   tickangle: 45
        // },
        barmode: 'group',
        margin: {
          t: 30,
          b: 125
        },
        annotations: customAnnotations
      }
  
  
      graphData.customTotal.data[0].x.push("User-Defined Total");
      graphData.customTotal.data[1].x.push("User-Defined Total");

      original = this.data.metrics.customAreasTotal.roundedMetrics[this.data.unitSystem.system].volumetric.original;
      current = this.data.metrics.customAreasTotal.roundedMetrics[this.data.unitSystem.system].volumetric.current;
  
      graphData.customTotal.data[0].y.push(original)
      graphData.customTotal.data[1].y.push(current);
  
      graphData.customTotal.layout = {
        title: "User-Defined Areas Total Recharge",
        yaxis: {
          title: "Total Recharge (" + this.data.unitSystem.units.volumetric + ")"
        },
        barmode: 'group',
        margin: {
          t: 30
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
  }

}