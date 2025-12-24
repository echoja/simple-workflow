import { describe, expect, test } from "bun:test";
import { createStep, Workflow } from "./workflow";

describe("Workflow", () => {
  test("executes steps in order and shares context", async () => {
    interface Ctx {
      log: string[];
      value?: number;
    }

    const step1 = createStep((ctx: Ctx) => {
      ctx.log.push("step1");
      ctx.value = 42;
      return "arg1";
    });

    const step2 = createStep((ctx: Ctx) => {
      ctx.log.push(`step2:${ctx.value}`);
      return "arg2";
    });

    const workflow = new Workflow<Ctx>([step1, step2]);
    const ctx: Ctx = { log: [] };

    await workflow.execute(ctx);

    expect(ctx.log).toEqual(["step1", "step2:42"]);
  });

  test("rolls back completed steps in reverse order on failure", async () => {
    interface Ctx {
      events: string[];
    }

    const events: string[] = [];

    const step1 = createStep(
      (ctx: Ctx) => {
        ctx.events.push("action1");
        return "r1";
      },
      async (ctx, arg) => {
        ctx.events.push(`rollback1:${arg}`);
      }
    );

    const step2 = createStep(
      (ctx: Ctx) => {
        ctx.events.push("action2");
        return "r2";
      },
      async (ctx, arg) => {
        ctx.events.push(`rollback2:${arg}`);
      }
    );

    const step3 = createStep((_ctx: Ctx) => {
      events.push("action3");
      throw new Error("boom");
    });

    const workflow = new Workflow<Ctx>([step1, step2, step3]);
    const ctx: Ctx = { events };

    await expect(workflow.execute(ctx)).rejects.toThrow("boom");

    expect(events).toEqual([
      "action1",
      "action2",
      "action3",
      "rollback2:r2",
      "rollback1:r1",
    ]);
  });

  test("stops early when Workflow.exit is returned", async () => {
    interface Ctx {
      events: string[];
    }

    const events: string[] = [];

    const step1 = createStep(
      (ctx: Ctx) => {
        ctx.events.push("action1");
        return "r1";
      },
      async (ctx, arg) => {
        ctx.events.push(`rollback1:${arg}`);
      }
    );

    const step2 = createStep((ctx: Ctx) => {
      ctx.events.push("action2");
      return Workflow.exit("stop");
    });

    const step3 = createStep((ctx: Ctx) => {
      ctx.events.push("action3");
      return "r3";
    });

    const workflow = new Workflow<Ctx>([step1, step2, step3]);
    const ctx: Ctx = { events };

    await workflow.execute(ctx);

    expect(events).toEqual(["action1", "action2"]);
  });
});
