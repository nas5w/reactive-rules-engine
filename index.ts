type RuleFn<T> = (deps: Record<string, any>) => T;
type RuleMap = Record<string, RuleFn<any>>;
type ValueMap<R extends RuleMap> = {
  [K in keyof R]: ReturnType<R[K]>;
};

type Listener<T> = (value: T) => void;

export function createReactiveRulesEngine<R extends RuleMap>(rules: R) {
  const values: Partial<ValueMap<R>> = {};
  const manualValues: Partial<ValueMap<R>> = {};
  const dependents: Record<keyof R, Set<keyof R>> = {} as any;
  const watchers: Partial<Record<keyof R, () => void>> = {};
  const listeners: Partial<Record<keyof R, Listener<any>[]>> = {};

  function notify<K extends keyof R>(key: K) {
    (listeners[key] || []).forEach((fn) => fn(values[key]!));
    (dependents[key] || new Set()).forEach((dep) => {
      watchers[dep]?.();
    });
  }

  function defineReactive<K extends keyof R>(
    key: K,
    fn: RuleFn<ReturnType<R[K]>>
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

  (Object.entries(rules) as [keyof R, RuleFn<any>][]).forEach(([key, fn]) => {
    defineReactive(key, fn);
  });

  return {
    get<K extends keyof R>(key: K): ValueMap<R>[K] {
      return values[key]!;
    },
    set<K extends keyof R>(key: K, val: ValueMap<R>[K]) {
      manualValues[key] = val;
      values[key] = val;
      notify(key);
    },
    onChange<K extends keyof R>(key: K, callback: Listener<ValueMap<R>[K]>) {
      if (!listeners[key]) listeners[key] = [];
      listeners[key]!.push(callback);
    },
    snapshot(): ValueMap<R> {
      return { ...values } as ValueMap<R>;
    },
  };
}

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
