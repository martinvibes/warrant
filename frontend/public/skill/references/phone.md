# Phone and SMS

A real number the agent owns, and texts sent from it. Searching is free;
ordering is the paid step.

## Search, free

```
GET /v1/phone/search?country=US&area=816&contains=1100&limit=10
```

```json
{"numbers":[{"phoneNumber":"+12292784473","country":"US","region":"ARLINGTON, GA",
 "monthly":"1.00000","upfront":"1.00000","currency":"USD",
 "features":["sms","voice","mms","fax","hd_voice","emergency"]}],
 "orderAt":"POST /v1/phone/provision"}
```

All four query parameters are optional. `country` defaults to `US`.

## Provision

```
POST /v1/phone/provision        $0.50
x-agent: 0.0.10514332

{"country":"US","phoneNumber":"+18164961100"}
```

Give `phoneNumber` to order a specific number from the search, or omit it and
give only `country` to take the first orderable one. 170+ countries.

```json
{"kind":"phone.provision","result":{"phoneNumber":"+18164961100","country":"US",
 "orderId":"…","agent":"0.0.10514332"}}
```

A number costs money upstream, so this is one of the two purchases checked
*before* payment: if the provider has no spendable credit it answers `409` with
`charged: false`, rather than taking your money and finding out afterwards.

## Send SMS

```
POST /v1/sms                    $0.01
x-agent: 0.0.10514332

{"from":"+18164961100","to":"+14155550123","text":"…"}
```

```json
{"kind":"sms.send","result":{"messageId":"…","to":"+14155550123"}}
```

`from` must be a number this paying account provisioned. The numbers an account
owns are listed in `GET /v1/agents/:agent`.

Inbound SMS is not sold. A provisioned number is SMS capable outbound; there is
no endpoint that reads texts back.
