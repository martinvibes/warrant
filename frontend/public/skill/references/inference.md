# Inference

One language model call, paid per call, returned in OpenAI shape.

```
POST /v1/inference              $0.02
x-agent: 0.0.10514332

{"prompt":"summarise this in one line: …","model":"gpt-4o-mini","maxTokens":256}
```

Only `prompt` is required. `model` defaults to `gpt-4o-mini`.

```json
{"kind":"inference","result":{"model":"gpt-4o-mini","text":"…",
 "usage":{"prompt":8,"completion":41}}}
```

The price is flat per call, not per token, so a long prompt and a short one cost
the same $0.02. `maxTokens` bounds the answer, not the bill.

Because settlement happens before the call runs, an upstream failure answers
`502` with `settled: true`. You paid for the attempt. Do not retry without
reading that flag.
