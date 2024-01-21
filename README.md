# Jok SDK

This SDK covers following service:

- Room
- Timer

## Room

Api:

- `sendEvents` - send list of events
- `send` - send list of events, action, state

```ts
const roomApi = new JokRoomApi({
  apiUrl: "https://room.jok.io",
  authToken: "[AUTH_TOKEN]",
});

const res = await room.sendEvents("tenant", "room1", [
  {
    data: {
      hello: "there",
    },
  },
]);
```

## Timer

Api:

- `setTimeout`
- `clearTimeout`
- `getTimeout`

```ts
const timerApi = new JokTimerApi({
  apiUrl: "https://timer.jok.io",
  authToken: "[AUTH_TOKEN]",
});
```
