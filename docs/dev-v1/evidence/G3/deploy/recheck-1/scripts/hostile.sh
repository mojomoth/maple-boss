#!/bin/bash
# D-5/D-7 hostile requests + file probes on production (curl --http1.1). Prints status, content-type, body (first 160 chars).
B=https://maple-boss-livid.vercel.app
big=/tmp/recheck1/big.json; [ -f $big ] || node -e 'process.stdout.write(JSON.stringify({x:"a".repeat(1100000)}))' > $big
r() { local label="$1"; shift; local out; out=$(curl --http1.1 -s -m 60 -o /tmp/recheck1/h.body -w '%{http_code} ct=%{content_type}' "$@"); echo "$label -> $out | $(head -c 160 /tmp/recheck1/h.body | tr '\n' ' ')"; }
echo "# hostile requests $(date -u +%FT%TZ) on $B"
r "POST /api/character/import bad JSON" -X POST -H 'content-type: application/json' --data '{nope' $B/api/character/import
r "POST /api/party/requests bad JSON" -X POST -H 'content-type: application/json' --data '{nope' $B/api/party/requests
r "POST /api/party bad JSON" -X POST -H 'content-type: application/json' --data '{nope' $B/api/party
r "POST /api/character bad JSON" -X POST -H 'content-type: application/json' --data '{nope' $B/api/character
r "POST /api/character/import 1.1MB" -X POST -H 'content-type: application/json' --data-binary @$big $B/api/character/import
r "POST /api/party 1.1MB" -X POST -H 'content-type: application/json' --data-binary @$big $B/api/party
r "GET /api/nope" $B/api/nope
r "GET /api/character/x/y/z" $B/api/character/x/y/z
r "DELETE /api/nope" -X DELETE $B/api/nope
r "PUT /api/character" -X PUT $B/api/character
r "PATCH /api/party/1" -X PATCH $B/api/party/1
r "DELETE /api/boss" -X DELETE $B/api/boss
r "GET /api/character/import" $B/api/character/import
r "GET /api/party/1" $B/api/party/1
r "cross-site POST import (Origin evil)" -X POST -H 'origin: https://evil.example' -H 'content-type: application/json' --data '{}' $B/api/character/import
r "cross-site POST party/requests (Sec-Fetch-Site cross-site)" -X POST -H 'sec-fetch-site: cross-site' -H 'content-type: application/json' --data '{}' $B/api/party/requests
r "cross-site DELETE seed (Origin evil)" -X DELETE -H 'origin: https://evil.example' "$B/api/character/%EA%B0%95%EC%9D%80%ED%98%B8"
r "cross-site DELETE seed (Sec-Fetch-Site same-site)" -X DELETE -H 'sec-fetch-site: same-site' "$B/api/character/%EA%B0%95%EC%9D%80%ED%98%B8"
r "Origin lookalike host" -X POST -H 'origin: https://maple-boss-livid.vercel.app.evil.example' -H 'content-type: application/json' --data '{}' $B/api/party
r "Origin null DELETE party" -X DELETE -H 'origin: null' $B/api/party/1
r "DELETE /api/character/%E0%A4%A bad enc" -X DELETE "$B/api/character/%E0%A4%A"
r "GET /no-such-page" $B/no-such-page
for p in /.env /pocs/.env /.env.local /pocs/.env.local /.vercel/project.json /.git/config /package.json /pocs/package.json /docs/dev-v1/flow.json /.vercelignore; do r "GET $p" $B$p; done
echo "# seeds after (must be 3): $(curl -s $B/api/character | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).map(c=>c.name).join(",")))')"
