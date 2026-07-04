# M-Pesa Integration (Backend)

This project now supports real M-Pesa charge initiation, async webhook confirmation, and payment reconciliation.

## Environment Variables

Set these variables on the backend runtime:

- `MPESA_API_BASE_URL` (required)
- `MPESA_CHECKOUT_PATH` (optional, default `/payments/charge`)
- `MPESA_STATUS_PATH` (optional, default `/payments/status`)
- `MPESA_API_KEY` (optional, provider-specific)
- `MPESA_BEARER_TOKEN` (optional, provider-specific)
- `MPESA_SERVICE_PROVIDER_CODE` (optional, provider-specific)
- `MPESA_ASYNC_RESPONSE_URL` (optional, enables async callback mode)
- `MPESA_WEBHOOK_TOKEN` (recommended, secures incoming webhook)
- `MPESA_DESTINATION_MSISDN` (optional, default target uses `844365114`)

## Secure Endpoints

### 1) Subscription Checkout (authenticated)

`POST /company/subscription/checkout`

Headers:
- `Authorization: Bearer <access_token>`

Body (request parameters):

```json
{
  "selectedPlan": "monthly",
  "provider": "mpesa",
  "currency": "MZN",
  "phone": "84xxxxxxx",
  "destinationPhone": "844365114"
}
```

Response printout (example):

```json
{
  "ok": true,
  "payment": {
    "id": "...",
    "provider": "mpesa",
    "status": "pending",
    "externalReference": "mpesa_..."
  },
  "checkoutUrl": null,
  "message": "checkout-created"
}
```

### 2) Wallet Topup Checkout (authenticated)

`POST /company/payments/checkout`

Headers:
- `Authorization: Bearer <access_token>`

Body:

```json
{
  "provider": "mpesa",
  "amount": 3500,
  "currency": "MZN",
  "phone": "84xxxxxxx",
  "destinationPhone": "844365114"
}
```

Response printout (example):

```json
{
  "ok": true,
  "payment": {
    "id": "...",
    "provider": "mpesa",
    "status": "pending",
    "externalReference": "mpesa_..."
  },
  "checkoutUrl": null,
  "message": "checkout-created"
}
```

## Webhook Confirmation

Endpoint:

`POST /webhooks/payments/mpesa`

Security:
- Send `x-webhook-token: <MPESA_WEBHOOK_TOKEN>`
- Or `Authorization: Bearer <MPESA_WEBHOOK_TOKEN>`

Request parameters (expected keys):
- `externalReference` or `tx_ref` or `id`
- `status` (`success`, `successful`, `failed`, etc.)
- optional provider metadata

Response printout:

```json
{
  "ok": true,
  "paymentStatus": "succeeded",
  "balance": 12345,
  "externalReference": "mpesa_..."
}
```

## Reconciliation

### Admin bulk reconciliation

`POST /admin/payments/reconcile`

Headers:
- `x-admin-token: <VERIFY_ADMIN_TOKEN>`

Body:

```json
{
  "provider": "mpesa",
  "maxItems": 50
}
```

Response printout:

```json
{
  "ok": true,
  "provider": "mpesa",
  "processed": 2,
  "results": [
    { "paymentId": "...", "externalReference": "...", "status": "succeeded" }
  ]
}
```

### Company single reconciliation

`POST /company/payments/:paymentId/reconcile`

Headers:
- `Authorization: Bearer <access_token>`

Response printout:

```json
{
  "ok": true,
  "payment": {
    "id": "...",
    "provider": "mpesa",
    "status": "succeeded",
    "externalReference": "...",
    "updatedAt": "..."
  },
  "reconciliationStatus": "succeeded"
}
```

## Asynchronous Transactions

By default, APIs can work in synchronous mode if the provider returns immediate success.
To force asynchronous handling, configure `MPESA_ASYNC_RESPONSE_URL` in backend settings.

When async mode is enabled:
- checkout creates a `pending` payment
- webhook updates final status to `succeeded` or `failed`
- reconciliation can recover missed webhook deliveries
