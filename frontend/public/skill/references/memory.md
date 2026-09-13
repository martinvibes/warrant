# Memory

Something the agent wants to still know after the process dies, written to the
Hedera File Service. Writing is paid; reading is free forever.

## Write

```
POST /v1/memory                 $0.05
x-agent: 0.0.10514332

{"content":"the peer at 0x7510 answers on scout@0gent.xyz; introduced 2026-09-13"}
```

```json
{"kind":"memory.write","result":{"fileId":"0.0.6841923","bytes":72,
 "writtenAt":"2026-09-13T02:04:11.000Z","immutable":true,
 "explorer":"https://hashscan.io/testnet/file/0.0.6841923"}}
```

**Immutable means immutable.** The file is written with no admin key, so nobody
can edit it or delete it, this service included. Write it wrong and the only
remedy is to write another one.

## The 4096-byte limit

A permanent file is written in one transaction, and one transaction holds 4096
bytes. Longer content has to be split by the caller and the pieces linked, by
writing the previous `fileId` into the next chunk. The service will not chunk it
for you, because a memory silently spread across files the agent was not told
about is a memory it cannot find again.

## Read

```
GET /v1/memory/0.0.6841923       free
```

```json
{"fileId":"0.0.6841923","content":"…","bytes":72}
```

Reading a Hedera file is a query, not a transaction, so it costs nothing and
needs no payment, no header and no relationship with this service. An unreadable
or unknown file id answers `404`.
