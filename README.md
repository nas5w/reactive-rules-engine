# Reactive rules engine

Example usage:

```ts
const engine = createReactiveRulesEngine({
  a: () => 2,
  b: () => 3,
  sum: ({ a, b }) => a + b,
  product: ({ a, b }) => a * b,
  doubleSum: ({ sum }) => sum * 2,
});

// Use strongly typed methods
engine.onChange("doubleSum", (val) =>
  console.log("doubleSum changed to:", val)
);
console.log(engine.snapshot()); // { a: 2, b: 3, sum: 5, product: 6, doubleSum: 10 }

engine.set("a", 10); // doubleSum changed to: 26
```
