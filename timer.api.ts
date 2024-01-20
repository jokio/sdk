type Options = {
  apiUrl: string;
  authToken: string;
  maxTryCount?: number;
};

type SetTimeoutProps = {
  id?: string;
  runInMs: number;
  url: string;
  headers?: object;
};

export class JokTimerApi {
  constructor(private options: Options) {}

  setTimeout({ id, runInMs, url, headers }: SetTimeoutProps) {
    let tryCount = 0;
    const maxTryCount = this.options.maxTryCount ?? 10;

    const call: () => Promise<string> = () =>
      fetch(this.options.apiUrl, {
        method: "POST",
        body: JSON.stringify({
          id,
          runAt: Date.now() + runInMs,
          url,
          headers,
        }),
        headers: {
          Authorization: "Bearer TopSecret",
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

  clearTimeout(...ids: string[]) {
    let tryCount = 0;

    const idString = ids.join(",");
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
          if (tryCount > 10) {
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
