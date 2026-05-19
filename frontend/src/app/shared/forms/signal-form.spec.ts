import { createSignalForm } from './signal-form';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2, 'Naam is verplicht'),
  age:  z.number().min(0, 'Leeftijd moet positief zijn'),
});

type TestForm = { name: string; age: number };

describe('createSignalForm', () => {
  it('creates fields for each schema key', () => {
    const form = createSignalForm(schema, { name: '', age: 0 });
    expect(form.fields.name).toBeDefined();
    expect(form.fields.age).toBeDefined();
  });

  it('initialises field values from initialValues', () => {
    const form = createSignalForm(schema, { name: 'Jan', age: 25 });
    expect(form.fields.name.value()).toBe('Jan');
    expect(form.fields.age.value()).toBe(25);
  });

  it('is invalid initially when fields are empty', () => {
    const form = createSignalForm(schema, { name: '', age: 0 });
    expect(form.valid()).toBeFalse();
  });

  it('is valid when all fields pass schema', () => {
    const form = createSignalForm(schema, { name: 'Jan', age: 25 });
    expect(form.valid()).toBeTrue();
  });

  it('errors are empty before touching', () => {
    const form = createSignalForm(schema, { name: '', age: 0 });
    expect(form.fields.name.errors()).toEqual([]);
    expect(form.fields.name.invalid()).toBeFalse();
  });

  it('shows errors after touching', () => {
    const form = createSignalForm(schema, { name: '', age: 0 });
    form.fields.name.touched.set(true);
    expect(form.fields.name.errors().length).toBeGreaterThan(0);
    expect(form.fields.name.invalid()).toBeTrue();
  });

  it('clears errors when value becomes valid after touch', () => {
    const form = createSignalForm(schema, { name: '', age: 0 });
    form.fields.name.touched.set(true);
    form.fields.name.value.set('Jan');
    expect(form.fields.name.errors()).toEqual([]);
    expect(form.fields.name.invalid()).toBeFalse();
  });

  it('markAllTouched marks every field as touched', () => {
    const form = createSignalForm(schema, { name: '', age: -1 });
    form.markAllTouched();
    expect(form.fields.name.touched()).toBeTrue();
    expect(form.fields.age.touched()).toBeTrue();
  });

  it('getValue returns null when form is invalid', () => {
    const form = createSignalForm(schema, { name: '', age: 0 });
    expect(form.getValue()).toBeNull();
  });

  it('getValue returns typed value when form is valid', () => {
    const form = createSignalForm(schema, { name: 'Jan', age: 25 });
    const value = form.getValue() as TestForm;
    expect(value.name).toBe('Jan');
    expect(value.age).toBe(25);
  });

  it('reset restores initial values and clears touched', () => {
    const form = createSignalForm(schema, { name: 'Jan', age: 25 });
    form.fields.name.value.set('Piet');
    form.fields.name.touched.set(true);
    form.reset();
    expect(form.fields.name.value()).toBe('Jan');
    expect(form.fields.name.touched()).toBeFalse();
  });

  it('reset with partial values merges with initial values', () => {
    const form = createSignalForm(schema, { name: 'Jan', age: 25 });
    form.reset({ name: 'Piet' });
    expect(form.fields.name.value()).toBe('Piet');
    expect(form.fields.age.value()).toBe(25);
  });
});
