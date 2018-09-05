export class WindowPanel {
  id: number;
  title: string;
  left: number;
  top: number;
  width: number;
  height: number;
  backgroundAlpha: number;
  zindex: number;
  tag: number;
  bodyType: string;
  data: any;
  // components: {
  //   map: MapComponent,
  //   controls: SidebarControlsComponent,
  //   menu: SidebarPanelComponent,
  //   details: BottombarPanelComponent,
  // };

  constructor(title: string, bodyType: string, data: any) {
    this.title = title;
    this.left = 300;
    // this.top = 200;
    this.width = 750;
    this.height = 540;
    this.backgroundAlpha = 1.0;
    this.zindex = 0;

    this.bodyType = bodyType;
    this.data = data;
  }
}
