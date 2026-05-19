import { TestBed } from '@angular/core/testing';
import { AvatarStateService } from './avatar-state.service';

describe('AvatarStateService', () => {
  let service: AvatarStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AvatarStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with null avatarUrl', () => {
    expect(service.avatarUrl()).toBeNull();
  });

  it('should update avatarUrl via setAvatarUrl()', () => {
    service.setAvatarUrl('https://example.com/avatar.png');
    expect(service.avatarUrl()).toBe('https://example.com/avatar.png');
  });

  it('should clear avatarUrl to null', () => {
    service.setAvatarUrl('https://example.com/avatar.png');
    service.setAvatarUrl(null);
    expect(service.avatarUrl()).toBeNull();
  });

  it('should reflect the latest value after multiple updates', () => {
    service.setAvatarUrl('first.jpg');
    service.setAvatarUrl('second.jpg');
    expect(service.avatarUrl()).toBe('second.jpg');
  });
});
