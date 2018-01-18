import { AngularDSTPage } from './app.po';

describe('angular-dst App', () => {
  let page: AngularDSTPage;

  beforeEach(() => {
    page = new AngularDSTPage();
  });

  it('should display welcome message', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('Welcome to app!!');
  });
});
