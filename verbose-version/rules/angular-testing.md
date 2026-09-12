---
paths:
  - "**/*.spec.ts"
---

# Angular Testing

## Philosophy

**Every test should justify its existence by what its failure would tell you.** Before writing or keeping a test, ask: *if this fails, what decision changes?* If the answer is "nothing" or "we'd just rerun it," delete it.

Coverage is a byproduct, not a goal. When an invariant can be enforced in the type system, a signal, or template type-checking, prefer that — the test you don't have to write is the strongest one. Flaky tests are bugs in the test, not in the build; delete or fix, never rerun.

### Test the contract, not the construction

A component's contract is its inputs, outputs, and what the user sees and does — everything else is implementation. If a behavior-preserving refactor breaks the test, the test was wrong.

- Assert on emitted outputs, rendered DOM, and visible state — not on internal signals, computed values, private fields, lifecycle hooks that fired, or which RxJS operator ran.
- Mock at injection boundaries (services, tokens) — not internal helpers or private methods.

**Litmus test:** could you swap the implementation (RxJS → signals, extract a helper, restructure the template) without touching any test? If yes, you're testing the contract. If no, the suite will fight every refactor.

Common construction-testing traps:

- **Full-component HTML snapshots** bind every test to exact markup; a layout `<div>` breaks them. Assert on specific user-visible pieces instead.
- **Spying on the component's own methods** tests construction, not behavior. Spy on injected services (a real boundary); assert on the *effect* of an interaction, not that a handler was called.
- **Computed signals** are tested indirectly — if a `computed()` exists, it surfaces somewhere in the DOM, so test that surface. If it doesn't surface, ask why it exists at all.
- **`fixture.detectChanges()` and `whenStable()` are plumbing.** They make the contract observable; they aren't the thing under test.

## Before you write a test

A short checklist worth running through before each new spec. Each item exists because skipping it is the most common cause of a confusing failure later.

- **Drive the component through the DOM** (clicks, inputs, keyboard) rather than calling component methods directly. The template, click bindings, and event flow are part of the contract; bypassing them tests construction and silently misses bugs that only surface through real user input.
- **Query with `data-testid` attributes.** Class names, child component types, and DOM structure shift during refactors — testid is the only surface intentionally stable for tests.
- **`await fixture.whenStable()` after every state change before asserting.** This app is zoneless, so signal updates, effects, and async pipes flush asynchronously — `whenStable()` is what makes the test wait for them. The single most common cause of "expected 3 rows, got 0" is missing this.
- **Set signal inputs via `fixture.componentRef.setInput('name', value)`** rather than direct field assignment — the latter doesn't fire signal reactivity. Required inputs must be set before the first `whenStable()` or Angular throws.
- **Install fake timers before `TestBed.createComponent()`** if the component schedules timers in its constructor or eager effects. `createComponent` runs the constructor and starts effect scheduling immediately; timers installed afterward miss the work you wanted to control.
- **Clear spies in `beforeEach` only when setup itself triggers the call you're asserting on** — otherwise leave counts intact, since some contracts are "this should *not* have fired during setup."
- **Name tests as sentences:** `Component → when [context] → [verb]s [outcome]`. Failure messages then read like docs.

## TestHarness: what to know

**Before writing your first DOM-driven test in a session, read `src/testing/test-harness.ts`** — it's the canonical API surface and the source of truth for method names, signatures, and behavior. Skim it once so you stop guessing; you'll also surface helpers you wouldn't have known to look for.

The harness is fluent and *scoped* — each query returns a new harness scoped to that element's subtree:

```ts
const harness = createTestHarness(fixture.debugElement);
const form = harness.findTestId('login-form');     // scoped to the form's subtree
form.findTestId('email').setInputValue('a@b.com');
form.findTestId('submit').click();
```

A few gotchas the source code alone won't tell you:

- **Three flavors of test ID query.** `findTestId` throws if missing, `findTestIds` returns an array (no throw), `existsTestId` returns boolean. Match flavor to intent: `existsTestId` for "the loader should be gone" assertions; `findTestId` when the next step is to interact.
- **`findDirective(Type)` is the bridge to stubbed children.** Returns a scoped harness with a typed `componentInstance` — that's how you assert on what got passed to a stub or simulate its outputs.
- **Overlays live outside the fixture tree.** Dialogs, menus, and autocomplete render in the CDK overlay container — reach them via `harness.getOverlayContainer()?.findTestId(...)`. Returns `null` if nothing's opened an overlay yet, hence the `?`.
- **Material is transparent.** `check`/`uncheck` work on `mat-checkbox`; `setInputValue` works on `mat-select` without any panel-opening dance; `isDisabled` works on Material buttons. You generally don't need to reach for CDK harnesses for the common cases — see "Material CDK harnesses" below for when you do.
- **`querySelector` is the escape hatch.** Brittle by design — reach for it only when nothing testid-based fits, and consider whether the component should grow a testid instead.
- **`prettyPrintHtml()` for debugging.** Drop in `console.log(harness.prettyPrintHtml())` when a test fails and you want to see what actually rendered. Never commit it.

## Setup pattern

Standard zoneless setup:

```ts
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { vi } from 'vitest';
import { of } from 'rxjs';
import { createTestHarness, TestHarness } from '@testing/test-harness';

describe('MyComponent', () => {
  let fixture: ComponentFixture<MyComponent>;
  let component: MyComponent;
  let harness: TestHarness;
  let mockDataService: { getData: ReturnType<typeof vi.fn>; saveData: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockDataService = {
      getData: vi.fn().mockReturnValue(of([])),
      saveData: vi.fn()
    };
    TestBed.configureTestingModule({
      imports: [MyComponent],
      providers: [
        { provide: DataService, useValue: mockDataService }
      ]
    });
    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
    harness = createTestHarness(fixture.debugElement);
  });

  it('creates', async () => {
    await fixture.whenStable();
    expect(component).toBeTruthy();
  });
});
```

Worth knowing before you start:

- The component's **constructor and field initializers** run inside `createComponent` — anything they call (e.g. `inject(SomeService).load()`) fires synchronously, so mocks for those must be configured *before* `createComponent`. **`ngOnInit` and effects** don't run until the first change detection, which happens during your first `await fixture.whenStable()` — so mocks for those can be set up after `createComponent` and before `whenStable()`.
- Standalone components are imported, not declared. No `compileComponents()` call needed for inline templates.

## Core patterns

### Render output from inputs

```ts
it('renders all items from service', async () => {
  mockDataService.getData.mockReturnValue(of([
    { id: '1', name: 'Alpha' },
    { id: '2', name: 'Beta' }
  ]));
  fixture.componentRef.setInput('categoryId', 'test');
  await fixture.whenStable();

  const items = harness.findTestIds('item-row');
  expect(items.length).toBe(2);
  expect(items[0].getTextContent()).toContain('Alpha');
});
```

### User interaction → state change

```ts
it('adds item to list when add button clicked', async () => {
  expect(harness.findTestIds('list-item').length).toBe(0);

  harness.findTestId('add-button').click();
  await fixture.whenStable();

  expect(harness.findTestIds('list-item').length).toBe(1);
});
```

### User interaction → service call

```ts
it('calls search service when user types in search box', async () => {
  harness.findTestId('search-input').setInputValue('test query');
  await fixture.whenStable();

  expect(mockSearchService.search).toHaveBeenCalledWith('test query');
});
```

### User interaction → output event

Two styles. Use spy when you're checking a single emission; use capture when you need to assert on count, order, or sequence.

```ts
// Spy style — terse, fine for single emissions
it('emits selection when row clicked', async () => {
  mockDataService.getData.mockReturnValue(of([{ id: '1' }, { id: '2' }]));
  await fixture.whenStable();
  vi.spyOn(component.rowSelected, 'emit');

  harness.findTestIds('data-row')[1].click();
  await fixture.whenStable();

  expect(component.rowSelected.emit).toHaveBeenCalledWith(
    expect.objectContaining({ id: '2' })
  );
});

// Capture style — better when asserting on emission count, order, or sequences
it('emits each row click in order', async () => {
  mockDataService.getData.mockReturnValue(of([{ id: '1' }, { id: '2' }]));
  await fixture.whenStable();

  const emissions: { id: string }[] = [];
  component.rowSelected.subscribe(e => emissions.push(e));

  harness.findTestIds('data-row')[0].click();
  harness.findTestIds('data-row')[1].click();
  await fixture.whenStable();

  expect(emissions).toEqual([{ id: '1' }, { id: '2' }]);
});
```

## Timing & async patterns

### Fake timers

If any test in a describe block uses fake timers, install them in `beforeEach` before `createComponent` — that way constructor/effect timers are caught from the start:

```ts
describe('time-dependent logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fixture = TestBed.createComponent(MyComponent);
    harness = createTestHarness(fixture.debugElement);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows loader until timer fires and data loads', async () => {
    await fixture.whenStable();
    expect(harness.existsTestId('loader')).toBe(true);

    vi.advanceTimersByTime(500);
    await fixture.whenStable();

    expect(harness.existsTestId('loader')).toBe(false);
    expect(harness.existsTestId('data-table')).toBe(true);
  });
});
```

For tests that mix fake timers with awaited promises (the timer triggers a `firstValueFrom` or similar), use `vi.runAllTimersAsync()` — it advances timers *and* yields the microtask queue, which `vi.advanceTimersByTime` does not.

### Subject-controlled async (loading states)

When you want to assert on a transient loading state, drive the observable manually with a `Subject`:

```ts
it('shows loader while data is loading', async () => {
  const dataSubject = new Subject<Item[]>();
  mockDataService.getData.mockReturnValue(dataSubject);

  fixture.componentRef.setInput('id', '123');
  await fixture.whenStable();

  expect(harness.existsTestId('loader')).toBe(true);
  expect(harness.existsTestId('data-table')).toBe(false);

  dataSubject.next([{ id: '1', name: 'Test' }]);
  dataSubject.complete();
  await fixture.whenStable();

  expect(harness.existsTestId('loader')).toBe(false);
  expect(harness.existsTestId('data-table')).toBe(true);
});
```

## Error handling

```ts
it('displays error message when service fails', async () => {
  mockDataService.getData.mockReturnValue(throwError(() => new Error('Network error')));
  fixture.componentRef.setInput('id', '123');
  await fixture.whenStable();

  expect(harness.existsTestId('error-message')).toBe(true);
  expect(harness.findTestId('error-message').getTextContent()).toContain('Failed to load');
});

it('hides error and shows data on retry success', async () => {
  mockDataService.getData.mockReturnValue(throwError(() => new Error('Network error')));
  fixture.componentRef.setInput('id', '123');
  await fixture.whenStable();
  expect(harness.existsTestId('error-message')).toBe(true);

  mockDataService.getData.mockReturnValue(of([{ id: '1', name: 'Test' }]));
  harness.findTestId('retry-button').click();
  await fixture.whenStable();

  expect(harness.existsTestId('error-message')).toBe(false);
  expect(harness.existsTestId('data-table')).toBe(true);
});
```

## Anti-patterns

### ❌ Asserting on internal state instead of rendered output
```ts
// Bad: testing construction
expect(component.loading()).toBe(false);
// Good: testing what the user sees
expect(harness.existsTestId('loader')).toBe(false);
```

### ❌ Calling component methods directly
```ts
// Bad: bypasses template binding, click handlers, the whole interaction surface
component.handleSave();
// Good: tests the full flow
harness.findTestId('save-button').click();
await fixture.whenStable();
```

### ❌ Forgetting `await fixture.whenStable()`
```ts
it('shows data', () => {
  mockService.getData.mockReturnValue(of(data));
  fixture.componentRef.setInput('id', '1');
  // Missing await fixture.whenStable() — signals/effects haven't flushed
  expect(harness.findTestIds('row').length).toBe(3); // Likely fails
});
```

### ❌ Not resetting spy calls when setup itself fires them
```ts
// Bad: setup call pollutes count
beforeEach(async () => {
  mockService.getData.mockReturnValue(of(data));
  await fixture.whenStable(); // getData called once during init
});

it('refetches on refresh', async () => {
  harness.findTestId('refresh').click();
  await fixture.whenStable();
  expect(mockService.getData).toHaveBeenCalledTimes(1); // Fails: count is 2
});

// Good: clear after the setup-triggered call so the test starts at zero
beforeEach(async () => {
  mockService.getData.mockReturnValue(of(data));
  await fixture.whenStable();
  mockService.getData.mockClear();
});
```

### ❌ Brittle selectors
```ts
// Bad: breaks if classes or structure change
harness.querySelector('.mat-row:nth-child(2) .action-btn');
// Good: semantic test IDs
harness.findTestId('row-action-button');
```

## Material CDK harnesses

For Material components whose internals you can't reach with `data-testid` (`mat-paginator`, `mat-menu`, dialog content, autocomplete panels), fall back to `@angular/cdk/testing` — but only after confirming `TestHarness` doesn't already cover it.

```ts
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HarnessLoader } from '@angular/cdk/testing';
import { MatPaginatorHarness } from '@angular/material/paginator/testing';
import { MatMenuHarness } from '@angular/material/menu/testing';

let loader: HarnessLoader;

beforeEach(async () => {
  await fixture.whenStable();
  loader = TestbedHarnessEnvironment.loader(fixture);
});

it('fetches next page when paginator advanced', async () => {
  const paginator = await loader.getHarness(MatPaginatorHarness);
  await paginator.goToNextPage();
  await fixture.whenStable();

  expect(mockDataService.getData).toHaveBeenCalledWith(
    expect.objectContaining({ page: 1 })
  );
});

it('deletes item via menu action', async () => {
  harness.findTestId('row-menu-trigger').click();
  await fixture.whenStable();

  const menu = await loader.getHarness(MatMenuHarness);
  await menu.clickItem({ text: 'Delete' });
  await fixture.whenStable();

  expect(mockDataService.deleteItem).toHaveBeenCalledWith('1');
});
```

## Stubbing child components

Use sparingly — prefer integration tests when practical. Reach for a stub only when a child is too slow or complex to render in the parent's spec.

Hand-roll a small standalone component with the same `selector` and mirrored `input()`/`output()` signatures, then swap it in via `TestBed.overrideComponent`:

```ts
@Component({
  selector: 'app-complex-chart',
  template: ''
})
class ComplexChartStubComponent {
  data = input<unknown[]>();
  config = input<unknown>();
  pointSelected = output<{ id: string }>();
}

beforeEach(() => {
  TestBed.configureTestingModule({
    imports: [ParentComponent],
    providers: [/* ... */]
  }).overrideComponent(ParentComponent, {
    remove: { imports: [ComplexChartComponent] },
    add: { imports: [ComplexChartStubComponent] }
  });
});

it('passes data to chart component', async () => {
  mockDataService.getChartData.mockReturnValue(of([{ x: 1, y: 2 }]));
  await fixture.whenStable();

  const chart = harness.findDirective(ComplexChartStubComponent);
  expect(chart.componentInstance.data()).toEqual([{ x: 1, y: 2 }]);
});

it('handles chart point selection', async () => {
  await fixture.whenStable();

  const chart = harness.findDirective(ComplexChartStubComponent);
  chart.componentInstance.pointSelected.emit({ id: 'point-1' });
  await fixture.whenStable();

  expect(harness.findTestId('selected-point').getTextContent()).toContain('point-1');
});
```

## When tests fail unexpectedly

When a test fails for a reason that isn't obvious, work through these in order — they're listed by how often each turns out to be the cause:

1. **Did you `await fixture.whenStable()` after the last state change?** This is the single most common cause of "element not found" or "expected 3 rows, got 0".
2. **Print the actual DOM:** `console.log(harness.prettyPrintHtml())`. Often the element you expected was never rendered, has a different testid, or is inside an overlay.
3. **Was the input set with `setInput()`?** Direct assignment to a signal input field doesn't fire reactivity.
4. **Is the element in an overlay?** Dialogs, menus, and autocomplete panels render outside the fixture tree. Reach for them via `harness.getOverlayContainer()?.findTestId(...)`.
5. **Are eager effects running before your mocks are set?** If a constructor-time effect calls a service, set the mock return value *before* `TestBed.createComponent`, not after.
6. **Are you mixing fake timers with awaited promises?** Use `vi.runAllTimersAsync()` instead of `advanceTimersByTime`.