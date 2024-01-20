type Options = {
  apiUrl: string;
  authToken: string;
};

type SendProps = {
  tenantKey: string;
  roomId: string;
  action?: {
    userId: string;
    sessionId: string;
    data: unknown;
    timestamp: Date;
  };
  events: {
    userId?: string;
    sessionId?: string;
    data: unknown;
  }[];
  state?: unknown;
};

export class JokRoomApi {
  constructor(private options: Options) {}

  async sendAction(props: SendProps) {
    const { tenantKey, roomId, ...data } = props;

    const url = `${this.options.apiUrl}/${tenantKey}/${roomId}/send`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `bearer ${this.options.authToken}`,
      },
      body: JSON.stringify(data),
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
