import { Component, AfterViewInit, Input, ViewChild, Renderer } from '@angular/core';
import { WindowPanel } from './shared/windowPanel';
import { WindowService } from './shared/window.service';

declare var jsPDF: any;

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

  @ViewChild('aquiferGraph') aquiferGraph;
  @ViewChild('customGraph') customGraph;
  @ViewChild('customTotalGraph') customTotalGraph;
  @ViewChild('fullGraph') fullGraph;

  @ViewChild('aquiferTable') aquiferTable;
  @ViewChild('customTable') customTable;
  @ViewChild('customTotalTable') customTotalTable;
  @ViewChild('fullTable') fullTable;

  @Input() public title: string;
  @Input() public type: string;
  @Input() windowPanel: WindowPanel;


  aquiferGraphImage: any;
  customGraphImage: any;
  customTotalGraphImage: any;
  fullGraphImage: any;

  pdf: any;

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

    if(this.mapComponent) {
      this.mapComponent.resize(this.windowPanel.width, this.windowPanel.height);
      this.mapComponent.setWindowId(this.windowPanel.tag);
    }
    else {

      var columns = [
        {title: "ID", dataKey: "id"},
        {title: "Name", dataKey: "name"}, 
        {title: "Country", dataKey: "country"} 
        
    ];
    var rows = [
        {"id": 1, "name": "Shaw", "country": "Tanzania"},
        {"id": 2, "name": "Nelson", "country": "Kazakhstan"},
        {"id": 3, "name": "Garcia", "country": "Madagascar"}
    ];
    
    // Only pt supported (not mm or in)
    var doc = new jsPDF('p', 'pt');
    doc.autoTable(columns, rows, {
        styles: {fillColor: [100, 255, 255]},
        columnStyles: {
          id: {fillColor: 255}
        },
        margin: {top: 60},
        addPageContent: function(data) {
          doc.text("Header", 40, 30);
        }
    });
    doc.save('table.pdf');

      // this.pdf = new jsPDF('p', 'pt', 'letter');
      // //this.pdf.fromHTML(this.aquiferTable.nativeElement);
      // html2canvas(this.aquiferTable.nativeElement).then(canvas => {
      //   var imgData = canvas.toDataURL('image/png');
      //   this.pdf.canvas.height = 72 * 11;
      //   this.pdf.canvas.width = 72 * 8.5;
      //   this.pdf.addImage(imgData, 'PNG', 10, 10);
      //   this.pdf.addPage();
      //   html2canvas(this.customTable.nativeElement).then(canvas2 => {
      //     var imgData = canvas2.toDataURL('image/png');
      //     this.pdf.addImage(imgData, 'PNG', 10, 10);
      //     //this.pdf.save('test.pdf');
      //   });
        
      //});
    //   var options = {
    //     background: '#ffffff',
    //     pagesplit: true
    // };
    
    // var doc = new jsPDF('p', 'pt', 'letter');
    // doc.addHTML(this.aquiferTable.nativeElement, 0, 0, options, function () {
    //         doc.save("test.pdf");
            
    // });
      
      this.generateReportGraphs();

      // var graphHandler = {
      //   "#graph": (element, renderer) => { return true; }
      // }

      
      // setTimeout(() => {
        
      // }, 500);
      

      









      // var pdf = new jsPDF('p', 'pt', 'letter');

      // var margins = {
      //   top: 80,
      //   bottom: 60,
      //   left: 40,
      //   width: 522
      // };

      // setTimeout(() => {
      //   console.log(this.report.nativeElement);
      //   pdf.fromHTML(this.report.nativeElement);
      //   pdf.canvas.height = 72 * 11;
      //   pdf.canvas.width = 72 * 8.5;
      //   pdf.save("test.pdf");
        
      // }, 500); 
      









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
        if(this.mapComponent) {
          //for some reason percent size allows map to change width but not height, so change manually
          __this.mapComponent.resize(__this.mapComponent.width, newHeight);
        }
      }
      
    }
    if(type == "right" || type == "both") {
      let mouseX = e.clientX;
      let newWidth = (mouseX - WindowComponent.lastMouseXPosition) + parseInt(container.panelDiv.nativeElement.style.width);
      //minimum size
      if(newWidth >= 400) {
        WindowComponent.lastMouseXPosition = mouseX;
        container.panelDiv.nativeElement.style.width =  (newWidth) + 'px';
        if(this.mapComponent) {
          //for some reason percent size allows map to change width but not height, so change manually
          __this.mapComponent.resize(newWidth, __this.mapComponent.height);
        }
      }
    }

  }



  //acts weird if grab after scroll, think the coordinates get messed up somehow if off initial screen
  startDragging(e) {
    const container = WindowComponent.lastClickDiv;

    let left = e.clientX - container.mouseWindowLeft;
    let top = e.clientY - container.mouseWindowTop;


    if(left < -parseInt(container.panelDiv.nativeElement.style.width) + 10) {
      left = -parseInt(container.panelDiv.nativeElement.style.width) + 10;
    }
    if(top < 50) {
      top = 50;
    }

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


  //graphs in Mgal/year, might want to add methods to change
  generateReportGraphs() {

    var graphData = {
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

    
    this.windowPanel.data.aquifers.forEach((aquifer) => {
      graphData.aquifers.data[0].x.push(aquifer.name);
      graphData.aquifers.data[1].x.push(aquifer.name);

      graphData.aquifers.data[0].y.push(aquifer.metrics.originalMGPY);
      graphData.aquifers.data[1].y.push(aquifer.metrics.currentMGPY);
    })
    graphData.aquifers.layout = {
      barmode: 'group'
    }

    graphData.full.data[0].x.push("Map Total");
    graphData.full.data[1].x.push("Map Total");

    graphData.full.data[0].y.push(this.windowPanel.data.total.originalMGPY);
    graphData.full.data[1].y.push(this.windowPanel.data.total.currentMGPY);

    graphData.full.layout = {
      barmode: 'group'
    }

    Plotly.plot(this.aquiferGraph.nativeElement, graphData.aquifers.data, graphData.aquifers.layout)
    .then((graph) => {
      Plotly.toImage(graph, {format: "jpeg", height:300,width:1000})
      .then((image) => {
        //this.pdf.addImage(image, 'JPEG', 0, 0, 600, 300);
        //this.pdf.addHTML(this.customTable.nativeElement, () => {
          
       // });
        
        
      });
      // console.log(aquiferGraphImage.__zone_symbol__value);
      // this.pdf.addImage(aquiferGraphImage, 'JPEG', 15, 40, 300, 1000);
        
      //   this.pdf.save("test.pdf");
      // console.log(this.aquiferGraphImage);
    })

    Plotly.plot(this.fullGraph.nativeElement, graphData.full.data, graphData.full.layout);


    //only plot custom area graphs if user had defined areas
    if(this.windowPanel.data.customAreas.length > 0) {
      this.windowPanel.data.customAreas.forEach((area) => {
        graphData.custom.data[0].x.push(area.name);
        graphData.custom.data[1].x.push(area.name);
  
        graphData.custom.data[0].y.push(area.metrics.originalMGPY);
        graphData.custom.data[1].y.push(area.metrics.currentMGPY);
      })
      graphData.custom.layout = {
        barmode: 'group'
      }
  
  
      graphData.customTotal.data[0].x.push("Custom Area Total");
      graphData.customTotal.data[1].x.push("Custom Area Total");
  
      graphData.customTotal.data[0].y.push(this.windowPanel.data.customAreasTotal.originalMGPY);
      graphData.customTotal.data[1].y.push(this.windowPanel.data.customAreasTotal.currentMGPY);
  
      graphData.customTotal.layout = {
        barmode: 'group'
      }

      Plotly.plot(this.customGraph.nativeElement, graphData.custom.data, graphData.custom.layout);
      Plotly.plot(this.customTotalGraph.nativeElement, graphData.customTotal.data, graphData.customTotal.layout);
    }
    

    // var current = {
    //   x: ['Recharge'],
    //   y: [currentRecharge],
    //   name: 'Current',
    //   type: 'bar'
    // };
    
    

    //start display 10 units below min value, but not less than 0
    // var minScale = Math.max(Math.min(originalRecharge, currentRecharge) - 10, 0);
    // //max recharge 75% of graph height
    // var maxRecharge = Math.max(originalRecharge, currentRecharge);
    // var maxScale = maxRecharge + .75 * (maxRecharge - minScale);
    // //if both values are 0 just set it to 1
    // if(maxScale == 0) {
    //   maxScale = 1;
    // }
    
    
  }

}