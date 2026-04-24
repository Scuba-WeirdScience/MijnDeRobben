# Copilot Instructions — Scuba Club De Robben

## Project Overview

Full-stack application for managing a scuba diving club: member management, material lending (materialen/leningen), specialties (specialiteiten/brevetten), and admin tools.

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 21, standalone components, Tailwind CSS v3 (`darkMode: 'class'`) |
| Backend | .NET 9, EF Core, SQL Server |
| Auth | JWT via API Gateway; member-api trusts `X-User-*` headers |
| Ports | Angular `:4300`, Gateway `:5238`, Member API `:5107` |

### Key Conventions

- **Angular 21 standalone components** — no NgModules
- **Dark mode** via `dark:` Tailwind classes; `darkMode: 'class'` in tailwind.config
- **Mobile-first** — design for small screens first, enhance upward with `sm:`, `lg:` breakpoints
- **No `cd` in bash commands** — always use `workdir` parameter
- **No APIs in frontend** — all API calls go through the Angular service layer
- **Backend DB commands only via `sqlcmd`** — DO NOT use `dotnet ef database update` or migrations

---

## UI Patterns

### Side Panels (Primary Pattern)

All forms, detail views, and full-page interactions must use **right-side slide-over panels**, NOT centered modals.

**Canonical reference**: `frontend/src/app/features/admin/role-management/user-detail-panel/user-detail-panel.component.html` (template extracted to `.html`)

#### Structure

```
@if (showPanel()) {
  <!-- Backdrop -->
  <div class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" (click)="closePanel()"></div>

  <!-- Panel -->
  <div class="fixed inset-y-0 right-0 z-50 flex w-full max-w-{width} flex-col bg-white dark:bg-gray-900 shadow-2xl">

    <!-- Header: border-bottom, title + subtitle, × close button -->
    <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0">
      <div>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{Title}</h2>
        <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">{Subtitle}</p>
      </div>
      <button (click)="closePanel()" class="rounded-lg p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Sluiten">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto px-6 py-6 space-y-5">
      ... form fields ...
    </div>
  </div>
}
```

#### Widths by complexity

| Width | Use case |
|---|---|
| `max-w-md` (~448px) | Simple forms (1-3 fields) |
| `max-w-lg` (~512px) | Standard forms (4-8 fields) |
| `max-w-xl` (~576px) | Complex forms with sections |
| `max-w-2xl` (~672px) | Full detail views |

#### Key rules

- **NO `max-h-[90vh]`** on the panel — full height from top of viewport
- **NO centering classes** (`items-center justify-center`) on the panel — it slides in from the right
- **Header** uses `flex-shrink-0` to prevent shrinking when content is tall
- **Content** uses `flex-1 overflow-y-auto` to make only the content area scrollable
- **Backdrop** uses `z-40`, panel uses `z-50` — backdrop sits between page and panel
- Clicking the backdrop closes the panel

### Delete Confirmation Dialogs

Delete confirmations are the **ONLY** exception to the side panel rule. Keep these as centered small modals — they're fast and users expect a quick dismiss:

```html
@if (itemToDelete()) {
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div class="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Item verwijderen</h2>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        Weet je zeker dat je <strong>{{ itemToDelete()!.name }}</strong> wilt verwijderen?
      </p>
      <div class="flex justify-end gap-3">
        <button (click)="itemToDelete.set(null)">Annuleren</button>
        <button class="bg-red-600 text-white hover:bg-red-700">Verwijderen</button>
      </div>
    </div>
  </div>
}
```

### Colors — Scuba Theme

Use the `scuba-*` custom colors defined in tailwind.config:

```html
<!-- Primary actions -->
<button class="bg-scuba-600 hover:bg-scuba-700 text-white ... rounded-lg">
  Opslaan
</button>

<!-- Secondary actions / links -->
<button class="text-scuba-600 hover:text-scuba-800 dark:text-scuba-400 dark:hover:text-scuba-200">
  Bewerken
</button>

<!-- Danger -->
<button class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200">
  Verwijderen
</button>

<!-- Badges / tags -->
<span class="bg-scuba-100 dark:bg-scuba-900/30 text-scuba-700 dark:text-scuba-300 px-3 py-1 text-xs font-medium rounded-full">
  Badge
</span>
```

### Avatars — Use UserDisplayComponent

Never build avatar/name blocks inline. Always use `<app-user-display>`:

```html
<!-- Minimal (xs) -->
<app-user-display [member]="member" />

<!-- Small (sm) — for lists -->
<app-user-display [member]="member" size="sm" />

<!-- Medium (md) — for detail views -->
<app-user-display [member]="member" size="md" />

<!-- Large (lg) — for profile views -->
<app-user-display [member]="member" size="lg" />
```

The component (`frontend/src/app/shared/components/user-display/user-display.component.ts`) handles:
- Avatar image with fallback to colored initials
- Deterministic background color from member GUID
- Full name display
- All dark mode variants

### Loading States

Always show `<app-spinner />` for async operations. Use `signal(false)` for loading state:

```typescript
readonly loading = signal(false);

ngOnInit(): void {
  this.loading.set(true);
  this.service.getAll().subscribe({
    next: data => { this.data.set(data); this.loading.set(false); },
    error: () => { this.loading.set(false); this.toast.error('Kon niet laden.'); }
  });
}
```

### Toast Notifications

Use `ToastService` for feedback — never use `alert()`:

```typescript
private readonly toast = inject(ToastService);

this.toast.success('Item opgeslagen.');
this.toast.error('Opslaan mislukt. Probeer opnieuw.');
this.toast.info('Wijzigingen opgeslagen.');
```

### Forms — Angular Signal Forms + Zod

**Preferred approach**: Angular signal forms (`@angular/forms/signals`) with Zod v4 validation.

#### Signal form setup

```typescript
import { form } from '@angular/forms/signals';
import { z } from 'zod';
import { field } from '@angular/forms/signals';

// Zod schema
const myFormSchema = z.object({
  naam: z.string().min(1, 'Naam is verplicht.').max(100),
  beschrijving: z.string().max(500).optional(),
  volgorde: z.coerce.number().int().min(0).default(0),
});

// Form type
type MyForm = z.infer<typeof myFormSchema>;

// In component — use lazy getter pattern to avoid rebuilding form on every change:
readonly formModel = signal<MyForm>({ naam: '', beschrijving: '', volgorde: 0 });
private _formState: FieldTree<MyForm> | null = null;
get formState(): FieldTree<MyForm> {
  if (!this._formState) {
    this._formState = form<MyForm>(this.formModel, myFormSchema as any);
  }
  return this._formState;
}
```

**Important**: The `as any` cast is required because Zod's `z.coerce.number()` produces `ZodCoercedNumber` which is incompatible with Angular's `Schema<T>` type.

#### Typed getters/setters for optional fields

Use class getter/setter to avoid `FieldTree<T>` index access returning `Field<TValue> | undefined`:

```typescript
// For optional string fields — use typed getters/setters
get beschrijving(): string { return this.formModel().beschrijving ?? ''; }
set beschrijving(v: string) { this.formModel.update(m => ({ ...m, beschrijving: v })); }

// For numeric display fields — use computed + handler
readonly volgordeAsString = computed(() => String(this.formModel().volgorde ?? 0));
onVolgordeInput(value: string): void {
  this.formModel.update(m => ({ ...m, volgorde: Number(value) || 0 }));
}
```

#### Template usage with app-form-field

```html
<app-form-field label="Naam *" [error]="firstError(formState.naam())">
  <app-input [(value)]="formState.naam().value" placeholder="Naam" [attr.maxlength]="100" />
</app-form-field>
```

The `[(value)]` is two-way binding on the design system's `model<string>()` signal.

#### `$any()` limitation

`$any()` in templates only works for DOM events (e.g., `$any($event.target).value`). It does NOT work inside TypeScript class methods — use type assertions in `.ts` files instead.

#### OnChanges → effect() migration

When converting `@Input()` to `input()`:

```typescript
// BEFORE (Angular < 21):
@Input() memberId!: string;
ngOnChanges(changes: SimpleChanges): void {
  if (changes['memberId']) { this.load(); }
}

// AFTER (Angular 21):
readonly memberId = input.required<string>();
constructor() {
  effect(() => {
    const id = this.memberId();
    this.load();
  });
}
```

When the effect writes signals, add `{ allowSignalWrites: true }`:

```typescript
constructor() {
  effect(() => {
    const t = this.type();
    this._formState = null; // signal write
    this.formModel.set({ /* ... */ }); // signal write
  }, { allowSignalWrites: true });
}
```

#### input() alias pattern

Use `input(alias, { alias: 'legacyName' })` to support both new and legacy binding names:

```typescript
readonly readonlyInput = input(false, { alias: 'readonly' });
```

#### Partial Record for custom property maps

When storing dynamic key-value pairs (e.g., custom properties on materialen):

```typescript
readonly materiaalFormCustomProperties = signal<Partial<Record<string, string>>>({});

setCustomProp(key: string, value: string): void {
  this.materiaalFormCustomProperties.update(m => ({ ...m, [key]: value }));
}

// In template — plain inputs for custom property fields:
<input type="text"
  [value]="materiaalFormCustomProperties()[field.key] ?? ''"
  (input)="setCustomProp(field.key, $any($event.target).value)"
  ... />
```

#### class binding — use [ngClass], not [class]

`[class]` does not reliably apply Tailwind utility classes. Always use `[ngClass]`:

```html
<!-- WRONG — may not apply Tailwind classes reliably -->
<div [class]="active() ? 'bg-scuba-100' : 'bg-gray-100'">

<!-- CORRECT -->
<div [ngClass]="active() ? 'bg-scuba-100' : 'bg-gray-100'">
```

### Form Design System

Use the design system components from `frontend/src/app/shared/components/design-system.ts`. Never write raw `<input>`, `<select>`, or `<textarea>` elements — always wrap them in `app-form-field`.

**Location**: `frontend/src/app/shared/components/form-field/`

#### Components

| Component | Description |
|---|---|
| `FormFieldComponent` | Label wrapper — projects content, shows label, hint, error |
| `InputComponent` | Styled `<input>` with CVA (works with `ngModel`) |
| `SelectComponent` | Styled `<select>` with CVA |
| `TextareaComponent` | Styled `<textarea>` with CVA |

#### Basic pattern

```typescript
import { FormFieldComponent, InputComponent, SelectComponent, TextareaComponent }
  from '.../design-system';
```

```html
<!-- Input field -->
<app-form-field label="Naam *" hint="Je volledige naam" [error]="nameError()">
  <app-input [(ngModel)]="name" placeholder="Jan Janssens" />
</app-form-field>

<!-- Select field -->
<app-form-field label="Organisatie *">
  <app-select [(ngModel)]="org">
    <option value="">— Kies —</option>
    @for (org of organisaties; track org) {
      <option [value]="org">{{ org }}</option>
    }
  </app-select>
</app-form-field>

<!-- Textarea field -->
<app-form-field label="Beschrijving">
  <app-textarea [(ngModel)]="description" rows="3" placeholder="Beschrijving…" />
</app-form-field>
```

#### FormFieldComponent API

| Input | Type | Description |
|---|---|---|
| `label` | `string` | Label text shown above the input |
| `required` | `boolean` | Shows a `*` indicator (default: false) |
| `hint` | `string` | Hint text shown below the label |
| `error` | `string` | Error message; if set, the field is visually invalid |

#### InputComponent API

| Input | Type | Default | Description |
|---|---|---|---|
| `type` | `'text'\|'email'\|'password'\|'number'\|...` | `'text'` | Input type |
| `placeholder` | `string` | `''` | Placeholder text |
| `autocomplete` | `string` | `'off'` | Autocomplete attribute |
| `maxlength` | `number` | — | Max character length |
| `min` / `max` | `number` | — | For `type="number"` |
| `isDisabled` | `boolean` | `false` | Disables the input |

#### TextareaComponent API

| Input | Type | Default | Description |
|---|---|---|---|
| `placeholder` | `string` | `''` | Placeholder text |
| `rows` | `number` | `3` | Visible lines |
| `maxlength` | `number` | — | Max character length |
| `isDisabled` | `boolean` | `false` | Disables the textarea |

### Signal-based State

Use Angular signals for all component state. Pattern:

```typescript
// Reactive state
readonly loading = signal(false);
readonly items = signal<Item[]>([]);

// Computed
readonly count = computed(() => this.items().length);
```

### input() / output() — Angular 21 Signal API

**NEVER use `@Input()` or `@Output()`** — use Angular 21's signal-based alternatives:

```typescript
// Required input
readonly member = input.required<Member>();

// Optional input with default
readonly readonly = input(false, { alias: 'readonly' });  // supports both [readonly] and [readonlyInput]

// Output (replaces new EventEmitter)
readonly saved = output<void>();
readonly itemChanged = output<{ id: string; name: string }>();

// In templates — use (event)="handler()" NOT (event)="handler.emit($event)"
<button (click)="cancelled.emit()">Annuleren</button>
<button (click)="onSelect(item.id)">Select</button>
```

---

## Backend Patterns

### Service Layer

All business logic lives in services in `member-api/Services/`. Services are injected via `inject()`:

```csharp
public class MyService
{
    private readonly AppDbContext _db;
    private readonly ILogger<MyService> _logger;

    public MyService(AppDbContext db, ILogger<MyService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<List<MyDto>> GetAllAsync()
    {
        return await _db.MyEntities
            .ProjectTo<MyDto>(_mapper.ConfigurationProvider)
            .ToListAsync();
    }
}
```

### DTOs

- Stored in `member-api/DTOs/`
- Named `{Entity}Dto.cs` for single entity, `{Entity}ListDto.cs` for list results
- Use `Record` types (C# 9+) for immutable DTOs
- Maps go in `{Entity}Mapper.cs` using AutoMapper

### Database Changes

**NEVER run `dotnet ef migrations add`** or `dotnet ef database update`.

Use `sqlcmd` directly for all DB changes:

```bash
sqlcmd -S localhost -d DeRobben -U sa -P YourPassword -Q "CREATE TABLE ..."
```

If a new table or column is needed, write the `CREATE TABLE` / `ALTER TABLE` SQL manually and execute it.

### EF Core Configuration

Entity configurations go in `member-api/Data/Configurations/`. Always specify the full relationship (both directions) to prevent duplicate shadow FKs:

```csharp
// WRONG — may create duplicate FK column (e.g., MateriaalTypeId1)
builder.HasMany(m => m.Materialen);

// CORRECT — explicit both sides of the relationship
builder.HasMany(m => m.Materialen)
    .WithOne(mat => mat.MateriaalType)
    .HasForeignKey(mat => mat.MateriaalTypeId)
    .OnDelete(DeleteBehavior.Cascade);
```

### Auth — X-User Headers

The member-api trusts `X-User-Id` and `X-User-Email` headers forwarded by the Gateway. Extract in services:

```csharp
var userId = httpContextAccessor.HttpContext?.Request.Headers["X-User-Id"].FirstOrDefault();
```

---

## Generated Files

The `frontend/src/generated/` folder contains auto-generated files from OpenAPI. These are the canonical source of truth for API types and services.

**DO NOT edit files in `frontend/src/generated/` manually** — they are overwritten on regenerate.

If the generated types are missing a field:

1. Check if the backend DTO has the field
2. Check if the controller returns the field
3. Regenerate: `cd frontend && npx @openapitools/openapi-generator-cli generate`

To add a field to the schema, edit the backend DTO and regenerate.

---

## Common Fixes Reference

| Issue | Fix |
|---|---|
| `500` from `MateriaalTypeService.GetAllWithMaterialenAsync` | Add `ToMateriaalDto` and `DeserializeMateriaalCustomProperties` methods directly to `MateriaalTypeService.cs` |
| Nieuwe kolom toevoegen aan `MateriaalType` | Voeg toe aan: entity model, alle DTOs (incl. `Create`/`Update`), EF config (`.HasPrecision`), service (create/update/ToDto) |
| EF generates duplicate FK column (e.g., `MateriaalTypeId1`) | Add `HasMany/WithOne` to the `*Configuration.cs` for both sides of the relationship |
| `Leningen` table missing | Create via `sqlcmd` with PK, FK to Materialen, indexes |
| Member name empty in lening history | Use `GetMemberDisplayName` helper in `LeningService.GetAllAsync` that falls back to `UserId` |
| `[class]` binding not applying Tailwind | Replace with `[ngClass]` |
| `Object.entries()` values are `undefined` | Use explicit `value &&` guard even with `Partial<Record<...>>` |
| QR code / label printing | Use `window.open()` with inline HTML/CSS, no external dependencies |
| `@Input()` not reactive after migration | Replace with `input()` + `effect()` with `allowSignalWrites: true` |
| `$any()` not working in class method | Use type assertions in `.ts` files — `$any()` only works in templates for DOM events |

---

## File Locations

### Backend
```
C:\Projects\DeRobben\member-api\
├── DTOs\                   # Request/response DTOs
├── Data\Configurations\   # EF Core entity configs
├── Models\                 # Domain models
└── Services\              # Business logic
```

### Frontend

All Angular components use `templateUrl:` pointing to a separate `.component.html` file. No inline `template:` strings.

```
C:\Projects\DeRobben\frontend\src\app\
├── shared\
│   └── components\
│       ├── badge\
│       ├── locale-date-input\          # All have .component.html
│       ├── navbar\
│       ├── spinner\
│       ├── toast\
│       ├── user-display\
│       └── form-field\
│           ├── form-field.component.ts + .component.html
│           ├── input\input.component.ts + .component.html
│           ├── select\select.component.ts + .component.html
│           └── textarea\textarea.component.ts + .component.html
├── features\
│   ├── admin\
│   │   ├── materiaal-beheer\          # Sub-components: type + item forms
│   │   │   ├── materiaal-type-form.component.{ts,html}
│   │   │   ├── materiaal-item-form.component.{ts,html}
│   │   │   └── materiaal-beheer.component.{ts,html}
│   │   ├── specialty-type-management\
│   │   ├── member-management\
│   │   │   ├── member-form\
│   │   │   ├── member-delete-dialog\
│   │   │   └── member-management.component.{ts,html}
│   │   ├── brevet-management\
│   │   │   ├── brevet-management.component.{ts,html}
│   │   │   └── member-brevet-panel\
│   │   │       └── member-brevet-panel.component.{ts,html}
│   │   ├── role-management\
│   │   │   ├── role-management.component.{ts,html}
│   │   │   └── user-detail-panel\
│   │   └── lening-history\
│   ├── auth\login\
│   ├── profile\
│   ├── lening\
│   ├── member\
│   └── members\
└── shared\
    ├── form-schemas.ts
    └── design-system.ts
```

### Template Extraction (Rule)

**ALL** Angular components must use `templateUrl:` pointing to a separate `.component.html` file. Inline `template:` strings are not allowed.

```typescript
// WRONG — never use inline templates
@Component({ template: `<div>...</div>` })

// CORRECT — always use external template
@Component({ templateUrl: './my-component.component.html' })
```
