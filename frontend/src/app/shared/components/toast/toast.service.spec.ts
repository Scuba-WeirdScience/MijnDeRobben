import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
    jasmine.clock().install();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with no toasts', () => {
    expect(service.toasts()).toEqual([]);
  });

  it('should add a toast via show()', () => {
    service.show('Hello world', 'info');
    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].message).toBe('Hello world');
    expect(service.toasts()[0].type).toBe('info');
  });

  it('should default type to info', () => {
    service.show('Default type');
    expect(service.toasts()[0].type).toBe('info');
  });

  it('should auto-dismiss after duration', fakeAsync(() => {
    service.show('Temp', 'info', 3000);
    expect(service.toasts().length).toBe(1);
    tick(3000);
    expect(service.toasts().length).toBe(0);
  }));

  it('should dismiss a toast by id', () => {
    service.show('First', 'success');
    service.show('Second', 'error');
    const id = service.toasts()[0].id;
    service.dismiss(id);
    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].message).toBe('Second');
  });

  it('should add success toast', () => {
    service.success('Done!');
    expect(service.toasts()[0].type).toBe('success');
    expect(service.toasts()[0].message).toBe('Done!');
  });

  it('should add error toast', () => {
    service.error('Oops');
    expect(service.toasts()[0].type).toBe('error');
  });

  it('should add warning toast', () => {
    service.warning('Careful');
    expect(service.toasts()[0].type).toBe('warning');
  });

  it('should add info toast', () => {
    service.info('FYI');
    expect(service.toasts()[0].type).toBe('info');
  });

  it('should assign unique ids to multiple toasts', () => {
    service.show('A', 'info');
    service.show('B', 'info');
    const ids = service.toasts().map(t => t.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('should not remove other toasts on dismiss', () => {
    service.show('Keep', 'success');
    service.show('Remove', 'error');
    const removeId = service.toasts()[1].id;
    service.dismiss(removeId);
    expect(service.toasts()[0].message).toBe('Keep');
  });

  it('should handle dismissing a non-existent id gracefully', () => {
    service.show('Existing', 'info');
    service.dismiss(9999);
    expect(service.toasts().length).toBe(1);
  });
});
