 GET /play 200 in 30ms (next.js: 3ms, application-code: 27ms)
 GET /play 200 in 25ms (next.js: 1299µs, application-code: 24ms)
 GET /play 200 in 13ms (next.js: 1663µs, application-code: 12ms)
 GET /play 200 in 43ms (next.js: 4ms, application-code: 39ms)
 GET /play 200 in 39ms (next.js: 1516µs, application-code: 38ms)
 GET /play 200 in 16ms (next.js: 1443µs, application-code: 14ms)
 GET /play 200 in 78ms (next.js: 3ms, application-code: 74ms)
 POST /play 200 in 11ms (next.js: 1919µs, application-code: 9ms)
  └─ ƒ prefetchEvents("ed625eb8-0693-44f1-a666-2417e63db425") in 1ms lib/actions/game.ts
 GET / 200 in 34ms (next.js: 5ms, application-code: 29ms)
 GET /create 200 in 16ms (next.js: 5ms, application-code: 11ms)
{"event":"supabase.persistence_fallback","operation":"create_save","memoryFallbackEnabled":true,"error":{"code":"","message":"TypeError: fetch failed","details":"TypeError: fetch failed\n\nCaused by: Error: connect ECONNREFUSED 127.0.0.1:54321 (ECONNREFUSED)\nError: connect ECONNREFUSED 127.0.0.1:54321\n    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1637:16)\n    at TCPConnectWrap.callbackTrampoline (node:internal/async_hooks:130:17)","hint":""},"expectedColumns":["id"]}
 POST /create 200 in 13ms (next.js: 1531µs, application-code: 11ms)
  └─ ƒ newGame("张", "humble_scholar", undefined) in 7ms lib/actions/game.ts
 GET /play 200 in 11ms (next.js: 1846µs, application-code: 10ms)
{"ts":"2026-06-04T06:39:44.011Z","level":"info","event":"ai.call","contract":"V1","provider":"deepseek","model":"deepseek-v4-flash","tier":"low","latencyMs":5548,"fallbackUsed":false,"inputTokens":787,"outputTokens":459}
{"ts":"2026-06-04T06:39:44.011Z","level":"warn","event":"ai.slow","contract":"V1","provider":"deepseek","model":"deepseek-v4-flash","latencyMs":5548,"budgetMs":1500}
{"ts":"2026-06-04T06:39:44.252Z","level":"info","event":"ai.call","contract":"V1","provider":"deepseek","model":"deepseek-v4-flash","tier":"low","latencyMs":5790,"fallbackUsed":false,"inputTokens":787,"outputTokens":443}
{"ts":"2026-06-04T06:39:44.252Z","level":"warn","event":"ai.slow","contract":"V1","provider":"deepseek","model":"deepseek-v4-flash","latencyMs":5790,"budgetMs":1500}
{"ts":"2026-06-04T06:39:45.346Z","level":"info","event":"ai.call","contract":"V1","provider":"deepseek","model":"deepseek-v4-flash","tier":"low","latencyMs":6884,"fallbackUsed":false,"inputTokens":787,"outputTokens":679}
{"ts":"2026-06-04T06:39:45.346Z","level":"warn","event":"ai.slow","contract":"V1","provider":"deepseek","model":"deepseek-v4-flash","latencyMs":6884,"budgetMs":1500}
{"ts":"2026-06-04T06:39:45.348Z","level":"info","event":"v1.prefetch","actions":["study","socialize","earn"],"skippedActions":[],"events":["social","social","social"]}
 POST /play 200 in 6.9s (next.js: 1408µs, application-code: 6.9s)
  └─ ƒ prefetchEvents("98e4fb72-b19d-4ee4-b9f3-e0714e51539c") in 6887ms lib/actions/game.ts
 POST /play 200 in 6ms (next.js: 1850µs, application-code: 4ms)
  └─ ƒ advanceTurn("98e4fb72-b19d-4ee4-b9f3-e0714e51539c", "study") in 1ms lib/actions/game.ts
{"ts":"2026-06-04T06:39:45.384Z","level":"info","event":"v1.serve","source":"cache","actionId":"study","eventType":"social"}
 POST /play 200 in 7ms (next.js: 1377µs, application-code: 5ms)
  └─ ƒ generateEventForTurn("98e4fb72-b19d-4ee4-b9f3-e0714e51539c") in 1ms lib/actions/game.ts
 POST /play 200 in 7ms (next.js: 1345µs, application-code: 5ms)
  └─ ƒ submitEventChoice("98e4fb72-b19d-4ee4-b9f3-e0714e51539c", "a") in 2ms lib/actions/game.ts
 POST /play 200 in 6ms (next.js: 1334µs, application-code: 5ms)
  └─ ƒ prefetchEvents("98e4fb72-b19d-4ee4-b9f3-e0714e51539c") in 1ms lib/actions/game.ts
 POST /play 200 in 6ms (next.js: 1286µs, application-code: 5ms)
  └─ ƒ advanceTurn("98e4fb72-b19d-4ee4-b9f3-e0714e51539c", "socialize") in 1ms lib/actions/game.ts
 POST /play 200 in 12ms (next.js: 7ms, application-code: 5ms)
  └─ ƒ prefetchEvents("98e4fb72-b19d-4ee4-b9f3-e0714e51539c") in 1ms lib/actions/game.ts
 POST /play 200 in 6ms (next.js: 1295µs, application-code: 5ms)
  └─ ƒ advanceTurn("98e4fb72-b19d-4ee4-b9f3-e0714e51539c", "study") in 1ms lib/actions/game.ts
 POST /play 200 in 6ms (next.js: 1500µs, application-code: 5ms)
  └─ ƒ prefetchEvents("98e4fb72-b19d-4ee4-b9f3-e0714e51539c") in 1ms lib/actions/game.ts
 POST /play 200 in 6ms (next.js: 1338µs, application-code: 5ms)
  └─ ƒ advanceTurn("98e4fb72-b19d-4ee4-b9f3-e0714e51539c", "study") in 1ms lib/actions/game.ts
{"ts":"2026-06-04T06:40:08.566Z","level":"info","event":"ai.call","contract":"V1","provider":"deepseek","model":"deepseek-v4-flash","tier":"low","latencyMs":5713,"fallbackUsed":false,"inputTokens":794,"outputTokens":515}
{"ts":"2026-06-04T06:40:08.566Z","level":"warn","event":"ai.slow","contract":"V1","provider":"deepseek","model":"deepseek-v4-flash","latencyMs":5713,"budgetMs":1500}
{"ts":"2026-06-04T06:40:08.566Z","level":"info","event":"v1.prefetch","actions":["scheme"],"skippedActions":[],"events":["misfortune"]}
 POST /play 200 in 5.7s (next.js: 1380µs, application-code: 5.7s)
  └─ ƒ prefetchEvents("98e4fb72-b19d-4ee4-b9f3-e0714e51539c") in 5714ms lib/actions/game.ts
 POST /play 200 in 7ms (next.js: 1202µs, application-code: 5ms)
  └─ ƒ advanceTurn("98e4fb72-b19d-4ee4-b9f3-e0714e51539c", "study") in 2ms lib/actions/game.ts
{"ts":"2026-06-04T06:40:14.629Z","level":"info","event":"ai.call","contract":"V1","provider":"deepseek","model":"deepseek-v4-flash","tier":"low","latencyMs":6042,"fallbackUsed":false,"inputTokens":792,"outputTokens":572}
{"ts":"2026-06-04T06:40:14.629Z","level":"warn","event":"ai.slow","contract":"V1","provider":"deepseek","model":"deepseek-v4-flash","latencyMs":6042,"budgetMs":1500}
{"ts":"2026-06-04T06:40:14.631Z","level":"info","event":"v1.prefetch","actions":["rest"],"skippedActions":[],"events":["opportunity"]}
 POST /play 200 in 6.1s (next.js: 1325µs, application-code: 6.0s)
  └─ ƒ prefetchEvents("98e4fb72-b19d-4ee4-b9f3-e0714e51539c") in 6046ms lib/actions/game.ts
 POST /play 200 in 9ms (next.js: 1718µs, application-code: 7ms)
  └─ ƒ advanceTurn("98e4fb72-b19d-4ee4-b9f3-e0714e51539c", "socialize") in 3ms lib/actions/game.ts
 POST /play 200 in 7ms (next.js: 1327µs, application-code: 5ms)
  └─ ƒ chooseRelicDraft("98e4fb72-b19d-4ee4-b9f3-e0714e51539c", "patron_letter") in 1ms lib/actions/game.ts
 POST /play 200 in 7ms (next.js: 1416µs, application-code: 5ms)
  └─ ƒ advanceTurn("98e4fb72-b19d-4ee4-b9f3-e0714e51539c", "study") in 1ms lib/actions/game.ts
{"ts":"2026-06-04T06:40:23.684Z","level":"info","event":"ai.call","contract":"V1","provider":"deepseek","model":"deepseek-v4-flash","tier":"low","latencyMs":5944,"fallbackUsed":false,"inputTokens":796,"outputTokens":685}
{"ts":"2026-06-04T06:40:23.684Z","level":"warn","event":"ai.slow","contract":"V1","provider":"deepseek","model":"deepseek-v4-flash","latencyMs":5944,"budgetMs":1500}
{"ts":"2026-06-04T06:40:23.686Z","level":"info","event":"v1.prefetch","actions":["rest"],"skippedActions":[],"events":["social"]}
 POST /play 200 in 6.0s (next.js: 1516µs, application-code: 6.0s)
  └─ ƒ prefetchEvents("98e4fb72-b19d-4ee4-b9f3-e0714e51539c") in 5948ms lib/actions/game.ts
 POST /play 200 in 7ms (next.js: 1227µs, application-code: 6ms)
  └─ ƒ advanceTurn("98e4fb72-b19d-4ee4-b9f3-e0714e51539c", "study") in 2ms lib/actions/game.ts
{"ts":"2026-06-04T06:40:28.791Z","level":"info","event":"ai.call","contract":"V1","provider":"deepseek","model":"deepseek-v4-flash","tier":"low","latencyMs":5082,"fallbackUsed":false,"inputTokens":796,"outputTokens":414}
{"ts":"2026-06-04T06:40:28.791Z","level":"warn","event":"ai.slow","contract":"V1","provider":"deepseek","model":"deepseek-v4-flash","latencyMs":5082,"budgetMs":1500}
{"ts":"2026-06-04T06:40:29.135Z","level":"info","event":"ai.call","contract":"V1","provider":"deepseek","model":"deepseek-v4-flash","tier":"low","latencyMs":5426,"fallbackUsed":false,"inputTokens":796,"outputTokens":429}
{"ts":"2026-06-04T06:40:29.135Z","level":"warn","event":"ai.slow","contract":"V1","provider":"deepseek","model":"deepseek-v4-flash","latencyMs":5426,"budgetMs":1500}
{"ts":"2026-06-04T06:40:29.197Z","level":"info","event":"ai.call","contract":"V1","provider":"deepseek","model":"deepseek-v4-flash","tier":"low","latencyMs":5488,"fallbackUsed":false,"inputTokens":796,"outputTokens":477}
{"ts":"2026-06-04T06:40:29.197Z","level":"warn","event":"ai.slow","contract":"V1","provider":"deepseek","model":"deepseek-v4-flash","latencyMs":5488,"budgetMs":1500}
{"ts":"2026-06-04T06:40:29.199Z","level":"info","event":"v1.prefetch","actions":["study","socialize","earn"],"skippedActions":[],"events":["social","social","social"]}
 POST /play 200 in 5.5s (next.js: 1634µs, application-code: 5.5s)
  └─ ƒ prefetchEvents("98e4fb72-b19d-4ee4-b9f3-e0714e51539c") in 5491ms lib/actions/game.ts
 GET /play/exam 200 in 15ms (next.js: 4ms, application-code: 10ms)
{"ts":"2026-06-04T06:40:37.315Z","level":"info","event":"ai.call","contract":"E1","provider":"gemini","model":"gemini-3.5-flash","tier":"mid","latencyMs":5214,"fallbackUsed":false,"inputTokens":618,"outputTokens":505}
{"ts":"2026-06-04T06:40:37.315Z","level":"warn","event":"ai.slow","contract":"E1","provider":"gemini","model":"gemini-3.5-flash","latencyMs":5214,"budgetMs":3000}
 POST /play/exam 200 in 5.2s (next.js: 2ms, application-code: 5.2s)
  └─ ƒ getExamQuestion("98e4fb72-b19d-4ee4-b9f3-e0714e51539c", "county") in 5214ms lib/actions/game.ts
{"ts":"2026-06-04T06:40:53.701Z","level":"info","event":"ai.call","contract":"E2","provider":"gemini","model":"gemini-3.5-flash","tier":"high","latencyMs":5159,"fallbackUsed":false,"inputTokens":519,"outputTokens":163}
{"ts":"2026-06-04T06:40:53.701Z","level":"warn","event":"ai.slow","contract":"E2","provider":"gemini","model":"gemini-3.5-flash","latencyMs":5159,"budgetMs":5000}
{"ts":"2026-06-04T06:40:56.812Z","level":"info","event":"ai.call","contract":"R1","provider":"deepseek","model":"deepseek-v4-flash","tier":"low","latencyMs":3110,"fallbackUsed":false,"inputTokens":339,"outputTokens":62}
{"ts":"2026-06-04T06:40:56.813Z","level":"warn","event":"ai.slow","contract":"R1","provider":"deepseek","model":"deepseek-v4-flash","latencyMs":3110,"budgetMs":1500}
 POST /play/exam 200 in 8.3s (next.js: 1409µs, application-code: 8.3s)
  └─ ƒ submitExamAnswer("98e4fb72-b19d-4ee4-b9f3-e0714e51539c", "county", {"choices":["[Object]","[Object]","[Object]"],"difficulty_hint":"此题虽设于童试，然意在考查治国之大体，需兼顾当今圣上之雄心与朝廷重文之风。","free_input_hint":"可从“崇文抑武”与“圣上雄图”之平衡处着笔，既显文华，又露锋芒。","...":"2 items not stringified"}, null, "崇文抑武", false) in 8274ms lib/actions/game.ts
