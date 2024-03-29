import { JokRoomApi } from "../room.api.ts";

const authToken = Deno.env.get("AUTH_TOKEN")!;

console.log("authToken", authToken);
const room = new JokRoomApi({
  apiUrl: "https://room.jok.io",
  authToken,
});

const res = await room.sendEvents("joker", "r1", [
  {
    data: {
      hello: "there",
    },
  },
]);

console.log({ res });
