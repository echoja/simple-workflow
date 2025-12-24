# simple-workflow

Rollback이 필요한 복잡한 작업을 단계별로 실행하고, 실패 시 역순으로 복구하는 간단한 Workflow 유틸입니다.

## 설치

```bash
bun install
```

## 사용법

```ts
import { Workflow, createStep } from "./workflow";

interface Ctx {
  userId: string;
  createdResourceIds: string[];
  shouldSkip?: boolean;
}

const createResourceStep = createStep(
  async (ctx: Ctx) => {
    const id = "resource-1"; // 실제 로직으로 대체
    ctx.createdResourceIds.push(id);
    return id; // rollback에서 사용할 값
  },
  async (ctx, id) => {
    ctx.createdResourceIds = ctx.createdResourceIds.filter((x) => x !== id);
  }
);

const checkConditionStep = createStep(async (ctx: Ctx) => {
  if (ctx.shouldSkip) {
    return Workflow.exit("조건이 맞지 않아 종료");
  }
  return null;
});

const workflow = new Workflow<Ctx>([createResourceStep, checkConditionStep]);

await workflow.execute({ userId: "123", createdResourceIds: [] });
```

## 동작 방식

- Step은 순차 실행됩니다.
- 에러 발생 시, 완료된 Step들의 rollback이 **역순**으로 실행됩니다.
- Step이 `Workflow.exit()`를 반환하면 이후 Step을 건너뛰고 정상 종료합니다.
- rollback 실패는 로그만 남기고 무시합니다.

## 테스트

```bash
bun test
```

## 라이선스

MIT
