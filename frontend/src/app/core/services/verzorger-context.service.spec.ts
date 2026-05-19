import { TestBed } from '@angular/core/testing';
import { VerzorgerContextService } from './verzorger-context.service';
import { Member } from '../../features/members/services/member.service';

const mockMember = (id: string): Member => ({
  id,
  userId: 'u-' + id,
  email: `${id}@test.be`,
  firstName: 'Test',
  lastName: 'Lid',
  dateOfBirth: '2010-01-01',
  joinDate: '2020-01-01',
  endOfMembership: null,
  isActive: true,
  isValidated: true,
  avatarUrl: null,
  verzorgerIds: [],
  createdAt: '2020-01-01T00:00:00Z',
  updatedAt: null,
});

describe('VerzorgerContextService', () => {
  let service: VerzorgerContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VerzorgerContextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with null activeKind', () => {
    expect(service.activeKind()).toBeNull();
  });

  it('isActingAsKind should be false initially', () => {
    expect(service.isActingAsKind()).toBeFalse();
  });

  it('should switch to a kind', () => {
    const kind = mockMember('kind-1');
    service.switchToKind(kind);
    expect(service.activeKind()).toEqual(kind);
    expect(service.isActingAsKind()).toBeTrue();
  });

  it('activeMemberId should return own id when no kind is active', () => {
    expect(service.activeMemberId('own-123')).toBe('own-123');
  });

  it('activeMemberId should return kind id when kind is active', () => {
    const kind = mockMember('kind-99');
    service.switchToKind(kind);
    expect(service.activeMemberId('own-123')).toBe('kind-99');
  });

  it('clearKind should reset activeKind to null', () => {
    service.switchToKind(mockMember('kind-1'));
    service.clearKind();
    expect(service.activeKind()).toBeNull();
    expect(service.isActingAsKind()).toBeFalse();
  });

  it('activeMemberId should return own id after clearKind', () => {
    service.switchToKind(mockMember('kind-5'));
    service.clearKind();
    expect(service.activeMemberId('own-123')).toBe('own-123');
  });
});
