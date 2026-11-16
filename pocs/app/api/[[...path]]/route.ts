// Any /api path no route matches: a JSON 404 instead of the HTML not-found page.
const notFound = () => Response.json({ error: "없는 API 주소예요." }, { status: 404 });

export { notFound as GET, notFound as POST, notFound as PUT, notFound as PATCH, notFound as DELETE };
