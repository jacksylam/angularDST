export class WindowPanel {
  id: number;
  title: string;
  left: number;
  top: number;
  width: number;
  height: number;
  backgroundAlpha: number;
  zindex: number;

  bodyType: string;
  dbQuery: string;

  constructor(title: string, bodyType: string, dbquery: string) {
    this.title = title;
    this.left = 200;
    this.top = 200;
    this.width = 1100;
    this.height = 700;
    this.backgroundAlpha = 1.0;
    this.zindex = 0;

    this.bodyType = bodyType;
    this.dbQuery = dbquery;
  }
}
