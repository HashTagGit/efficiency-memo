# release-0.0.1: CI Fix Issues

## NODE_ENV readonly error workaround

The  + "" + process.env.NODE_ENV + "" +  property is declared as readonly in @types/node. Bracket notation (process.env["NODE_ENV"]) does NOT bypass this — the compiler still tracks the literal index type.

Solution: Cast process.env to Record<string, string | undefined> via a helper:
  const setNodeEnv = (val: string | undefined) => {
    (process.env as Record<string, string | undefined>).NODE_ENV = val;
  };

This is preferable to vi.stubEnv because it doesn't require restructuring beforeEach/afterEach hooks.

## vi.fn 0-argument typing

vi.fn(() => "...") called later with arguments triggers TS2554. Fix: add optional param: vi.fn((_pathname?: string) => "...")

## vi.importActual returns Promise

vi.importActual(...) returns Promise<ESModuleExports>, not the module synchronously. When top-level import already brings in the needed function, the wrapper is unnecessary and causes type errors.

## Record<string, unknown> generic constraint

Session/Tag/CheckIn/SessionTag lack index signatures so they fail extends Record<string, unknown>. Fix: remove constraint entirely.
