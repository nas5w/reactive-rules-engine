# Reactive rules engine

Example usage:

```ts
const engine = new RuleEngineBuilder({})
  .addRule("a", () => 2)
  .addRule("b", () => 3)
  .addRule("sum", ({ a, b }) => a + b)
  .addRule("doubleSum", ({ sum }) => sum * 2)
  .build();

// Listen for changes to value
engine.onChange("doubleSum", (v) => console.log("doubleSum changed to", v));

// Entire snapshot
console.log(engine.snapshot()); // { a: 2, b: 3, sum: 5, doubleSum: 10 }

// Changing values
engine.set("a", 10); // doubleSum changed to 26
```
