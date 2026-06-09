import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ServiceWorkerModule } from '@angular/service-worker';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        App,
        // Disable the service worker in tests
        ServiceWorkerModule.register('', { enabled: false }),
      ],
      providers: [provideRouter([]), provideHttpClient(withXhr()), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should have isFullscreen false on a non-berichten route', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance.isFullscreen()).toBeFalse();
  });

  it('should have isNavigating false initially', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance.isNavigating()).toBeFalse();
  });
});
