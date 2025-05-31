// ===== Type Utilities =====
type RuleFn<Deps, Result> = (deps: Deps) => Result;

type RulesAccumulator = Record<string, RuleFn<any, any>>;

type ExtractValues<R extends RulesAccumulator> = {
  [K in keyof R]: R[K] extends RuleFn<any, infer Out> ? Out : never;
};

type Listener<T> = (value: T) => void;

// ===== Engine Core =====
function createReactiveRulesEngine<R extends RulesAccumulator>(rules: R) {
  const values: Partial<ExtractValues<R>> = {};
  const dependents: Record<keyof R, Set<keyof R>> = {} as any;
  const watchers: Partial<Record<keyof R, () => void>> = {};
  const listeners: Partial<Record<keyof R, Listener<any>[]>> = {};
  const manualValues: Partial<ExtractValues<R>> = {};

  function notify<K extends keyof R>(key: K) {
    (listeners[key] || []).forEach((fn) => fn(values[key]!));
    (dependents[key] || new Set()).forEach((dep) => {
      watchers[dep]?.();
    });
  }

  function defineReactive<K extends keyof R>(
    key: K,
    fn: RuleFn<any, ExtractValues<R>[K]>
  ) {
    const depsUsed = new Set<keyof R>();

    function computeWithTracking() {
      const deps = new Proxy({} as Record<string, any>, {
        get(_, prop: string | symbol) {
          if (typeof prop === "string" && prop in rules) {
            depsUsed.add(prop as keyof R);
            return values[prop as keyof R];
          }
          return undefined;
        },
      });

      const newVal = fn(deps);
      if (values[key] !== newVal) {
        values[key] = newVal;
        notify(key);
      }

      depsUsed.forEach((dep) => {
        if (!dependents[dep]) dependents[dep] = new Set();
        dependents[dep].add(key);
      });
    }

    watchers[key] = computeWithTracking;
    computeWithTracking();
  }

  (Object.entries(rules) as [keyof R, RuleFn<any, any>][]).forEach(
    ([key, fn]) => {
      defineReactive(key, fn);
    }
  );

  return {
    get<K extends keyof R>(key: K): ExtractValues<R>[K] {
      return values[key]!;
    },
    set<K extends keyof R>(key: K, val: ExtractValues<R>[K]) {
      manualValues[key] = val;
      values[key] = val;
      notify(key);
    },
    onChange<K extends keyof R>(
      key: K,
      callback: Listener<ExtractValues<R>[K]>
    ) {
      if (!listeners[key]) listeners[key] = [];
      listeners[key]!.push(callback);
    },
    snapshot(): ExtractValues<R> {
      return { ...values } as ExtractValues<R>;
    },
  };
}

// ===== Fluent Builder =====
class RuleEngineBuilder<R extends RulesAccumulator> {
  private rules: R;

  constructor(rules: R) {
    this.rules = rules;
  }

  addRule<K extends string, Deps extends keyof ExtractValues<R>, Out>(
    key: K,
    fn: RuleFn<Pick<ExtractValues<R>, Deps>, Out>
  ): RuleEngineBuilder<
    R & { [P in K]: RuleFn<Pick<ExtractValues<R>, Deps>, Out> }
  > {
    return new RuleEngineBuilder({
      ...this.rules,
      [key]: fn,
    }) as any;
  }

  build() {
    return createReactiveRulesEngine(this.rules);
  }
}

const engine = new RuleEngineBuilder({})
  .addRule("a", () => 2)
  .addRule("b", () => 3)
  .addRule("sum", ({ a, b }) => a + b) // ✅ OK
  .addRule("doubleSum", ({ sum }) => sum * 2) // ✅ OK
  .build();

// Reactive change
engine.onChange("doubleSum", (v) => console.log("doubleSum changed to", v));

console.log(engine.snapshot()); // { a: 2, b: 3, sum: 5, doubleSum: 10 }

engine.set("a", 10); // doubleSum changed to 26
