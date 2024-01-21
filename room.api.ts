type Options = {
  apiUrl: string;
  authToken: string;
};

type SendProps = {
  events: {
    data: unknown;
    toUserId?: string;
    toSessionId?: string;
    timestamp?: Date;
  }[];
  action?: {
    userId?: string;
    sessionId?: string;
    data: unknown;
    timestamp?: Date;
  };
  state?: unknown;
};

export class JokRoomApi {
  constructor(private options: Options) {}

  async sendEvents(
    tenantKey: string,
    roomId: string,
    props: SendProps
  ): Promise<true> {
    const url = `${this.options.apiUrl}/${tenantKey}/${roomId}/send`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `bearer ${this.options.authToken}`,
      },
      body: JSON.stringify(props),
    }).then((x) => x.json());

    return res;
  }

  async rooms(tenantKey: string): Promise<{ roomIds: string[] }> {
    const url = `${this.options.apiUrl}/${tenantKey}/rooms`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `bearer ${this.options.authToken}`,
      },
    }).then((x) => x.json());

    return res;
  }

  async deleteRooms(tenantKey: string, roomIds: string[]): Promise<number> {
    const url = `${this.options.apiUrl}/${tenantKey}/rooms/${roomIds.join(
      ","
    )}`;

    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `bearer ${this.options.authToken}`,
      },
    }).then((x) => x.json());

    return res;
  }

  async users(tenantKey: string, roomId: string) {
    const url = `${this.options.apiUrl}/${tenantKey}/${roomId}/users`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }).then((x) => x.json());

    return res;
  }
}
