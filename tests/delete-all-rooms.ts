import { JokRoomApi } from "../room.api.ts";

const authToken = Deno.env.get("AUTH_TOKEN")!;

console.log("authToken", authToken);
const roomApi = new JokRoomApi({
  // apiUrl: "https://room.jok.io",
  apiUrl: "http://localhost:8000",
  authToken,
});

const { roomIds } = await roomApi.rooms("joker");

console.log(roomIds);

const res = await roomApi.deleteRooms("joker", roomIds);

console.log({ res });
