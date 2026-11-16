// Next answers a method a route does not export with an empty 405. Routes export this for the rest, so every
// /api failure is { error } like the others. `allow` lists the methods the route has.
export const notAllowed = (allow: string) => (req: Request) =>
  Response.json({ error: `이 주소는 ${req.method} 요청을 받지 않아요.` }, { status: 405, headers: { allow } });
