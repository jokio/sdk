import { handleCommonErrors } from "./utils.ts";

type Options = {
  apiUrl: string;
  authToken: string;
  maxTryCount?: number;
};

type SetTimeoutProps = {
  id?: string;
  runInMs: number;
  url: string;
  method?: string;
  headers?: object;
  body?: unknown;
};

const DEFAULT_MAX_TRY_COUNT = 10;

export class JokTimerApi {
  constructor(private options: Options) {}

  getTimeout(id: string): Promise<{
    runAt: Date;
    exec: {
      type: "CURL";
      url: string;
      headers: Record<string, string>;
      method: "GET" | "POST";
      body: unknown | null;
    };
    lastAttempt?: {
      errorMessage: string;
      count: number;
      attemptAt: Date;
    };
    completedAt?: Date;
  }> {
    const url = `${this.options.apiUrl}/${id}`;

    return fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.options.authToken}`,
      },
    })
      .then((x) => {
        if (x.ok) {
          return x.json();
        }

        return handleCommonErrors(x);
      })
      .then((x) => ({
        runAt: new Date(x.timer.runAt),
        exec: x.timer.exec,
        ...{
          lastAttempt: x.timer.lastAttempt
            ? {
                errorMessage: x.timer.lastAttempt.errorMessage,
                count: x.timer.lastAttempt.count,
                attemptAt: new Date(x.timer.lastAttempt.attemptAt),
              }
            : undefined,
        },
        ...{
          completedAt: x.timer.completedAt
            ? new Date(x.timer.completedAt)
            : undefined,
        },
      }));
  }

  setTimeout(
    { id, runInMs, url, headers, body, method }: SetTimeoutProps,
    overrides?: { maxTryCount: number }
  ) {
    let tryCount = 0;
    const maxTryCount =
      overrides?.maxTryCount ??
      this.options.maxTryCount ??
      DEFAULT_MAX_TRY_COUNT;

    const call: () => Promise<string> = () =>
      fetch(this.options.apiUrl, {
        method: "POST",
        body: JSON.stringify({
          id,
          runAt: Date.now() + runInMs,
          url,
          method,
          headers,
          body,
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.options.authToken}`,
        },
      })
        .then((x) => x.json())
        .then((x) => x.timerId)
        .catch(async (err) => {
          if (tryCount > maxTryCount) {
            console.error("error", err.message);
            return;
          }

          tryCount++;

          await new Promise((resolve) => setTimeout(resolve, 1000 * tryCount));

          return call();
        });

    return call();
  }

  clearTimeout(ids: string | string[], overrides?: { maxTryCount: number }) {
    let tryCount = 0;
    const maxTryCount =
      overrides?.maxTryCount ??
      this.options.maxTryCount ??
      DEFAULT_MAX_TRY_COUNT;

    const idString = Array.isArray(ids) ? ids.join(",") : ids;
    const itemsCount = ids.length;

    const call: () => Promise<boolean> = () =>
      fetch(`${this.options.apiUrl}/${idString}`, {
        method: "DELETE",
        headers: {
          Authorization: "Bearer TopSecret",
        },
      })
        .then((x) => x.json())
        .then((x) => (x.deletedCount == itemsCount) as any)
        .catch(async (err) => {
          if (tryCount > maxTryCount) {
            console.error("error", err.message);
            return;
          }

          tryCount++;

          await new Promise((resolve) => setTimeout(resolve, 1000 * tryCount));

          return call();
        });

    return call();
  }
}
