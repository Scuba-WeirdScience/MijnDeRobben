import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocaleDateInputComponent } from './locale-date-input.component';

describe('LocaleDateInputComponent', () => {
  let component: LocaleDateInputComponent;
  let fixture: ComponentFixture<LocaleDateInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocaleDateInputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LocaleDateInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('has a non-empty placeholder', () => {
    expect(component.placeholder).toBeTruthy();
    expect(component.placeholder.length).toBeGreaterThan(0);
  });

  it('displayValue starts empty when no value input', () => {
    expect(component.displayValue()).toBe('');
  });

  it('onFocus() puts component into typing mode (no display update from external value)', () => {
    component.onFocus();
    // After onFocus, external value changes should not overwrite displayValue
    component.onInput('15');
    expect(component.displayValue()).toBe('15');
  });

  it('onInput() updates displayValue', () => {
    component.onInput('01-01-2000');
    expect(component.displayValue()).toBe('01-01-2000');
  });

  it('onBlur() emits empty string for empty input', () => {
    let emitted: string | undefined;
    const sub = component.valueChange.subscribe((v: string) => { emitted = v; });
    component.onBlur('');
    expect(emitted).toBe('');
    sub.unsubscribe();
  });

  it('onBlur() emits empty string for unparseable input', () => {
    let emitted: string | undefined;
    const sub = component.valueChange.subscribe((v: string) => { emitted = v; });
    component.onBlur('not-a-date');
    expect(emitted).toBe('');
    sub.unsubscribe();
  });

  it('onBlur() emits ISO string for a valid ISO input (fallback parsing)', () => {
    let emitted: string | undefined;
    const sub = component.valueChange.subscribe((v: string) => { emitted = v; });
    component.onBlur('1985-03-15');
    expect(emitted).toBe('1985-03-15');
    sub.unsubscribe();
  });

  it('onBlur() emits blur event', () => {
    let blurred = false;
    const sub = component.blur.subscribe(() => { blurred = true; });
    component.onBlur('');
    expect(blurred).toBeTrue();
    sub.unsubscribe();
  });

  it('invalid input defaults to false', () => {
    expect(component.invalid()).toBe(false);
  });

  it('value input defaults to empty string', () => {
    expect(component.value()).toBe('');
  });
});
