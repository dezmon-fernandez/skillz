# Walkthrough: repeat-order-discount

A format sample for an invented plan in an invented shop. It shows the level of
detail each section takes. Its code is Python and SQL; write a real walkthrough
in the plan's own language.

Size: 2 entry points, 1 table, 6 functions, 2 models

## What gets built

A shopper who has ordered before gets a discount when their cart is priced. A
price quote now stops being honored 30 minutes after it is issued.

## Surface

```
NEW  POST /carts/{cart_id}/quote

  Reach     Writes one quote. No outside call.

  Inputs    cart_id     the cart to price

  Answers   200         the quote, with its total and expiry
            404         no such cart
            409         an item is out of stock; names the first one


CHANGED  GET /quotes/{quote_id}

  Now       answers 410 once the quote has expired; today, 200 forever
```

## Data

```
Migration   quote.expires_at    new column, nullable
Writes      quote               one row per priced cart
Reads       cart_item           what is in the cart, with unit prices
            inventory           what is in stock
            customer_order      the customer's earlier orders this year
Relies on   the customer_order index (customer_id, placed_at)
```

## What else changes

- A quote issued before this change has no expiry and reads as expired, so a
  client holding one must ask again.
- The web client shows the discount line and the time left on a quote. It
  ships after the API.
- The API schema file is regenerated, and one decision record is written.

## Decisions

- **Discount by orders this year**, not by lifetime spend. A count is one
  indexed read, and spend needs a sum over every order.
- **The expiry is stored on the quote**, not worked out from when it was
  made. Changing the 30 minutes later must not move quotes already issued.
- **Out of stock refuses the whole quote**, not a partial one. A shopper
  never pays for a cart they cannot receive.

## The path

```
POST /carts/{cart_id}/quote

1. count_orders_this_year   the customer's earlier orders      → order_count
2. price_cart               stock check, subtotal, discount    → quote
3. insert_quote             stores it with its expiry          → quote id

→ QuoteResponse
Reuses: fetch_cart_items, fetch_inventory
```

```
GET /quotes/{quote_id}

1. read_quote   refuses a quote past its expiry   → QuoteResponse, or 410

→ QuoteResponse
Reuses: fetch_quote
```

## Functions

```python
# ── POST /carts/{cart_id}/quote, in order ──

# Route handler. Loads the cart, runs the three steps below, and returns
# the quote.
def create_cart_quote(...) -> QuoteResponse

# One SQL statement. Counts the customer's orders placed since January 1.
def count_orders_this_year(...) -> int

# Refuses when an item is out of stock. Otherwise sums the lines, applies
# the repeat discount, and stamps the expiry.
def price_cart(...) -> Quote

# Existing, changed. Stores the quote with its expiry.
# Today: stores the quote with no expiry.
def insert_quote(...) -> int

# ── GET /quotes/{quote_id}, in order ──

# Existing, changed. Answers 410 when the quote has expired or has no
# expiry.
# Today: returns any stored quote.
def read_quote(...) -> QuoteResponse

# ── helpers the steps call ──

# The percent off for a customer's Nth order this year.
def repeat_discount_percent(...) -> int

# ── existing, changed ──

# none
```

## Models

Served, what a caller receives:

```python
# Returned by create_cart_quote and read_quote.
class QuoteResponse(BaseModel):
    quote_id: int
    subtotal_cents: int
    discount_percent: int   # 0, 5, or 10
    total_cents: int
    expires_at: datetime    # when this quote stops being honored
```

Stored, tables added or changed:

```sql
ALTER TABLE quote ADD COLUMN expires_at timestamptz;
-- Row model: Quote, gains expires_at.
```

Internal, what moves between the steps:

```python
# Existing, gains 1 field. Built by price_cart, stored by insert_quote.
class Quote(BaseModel):
    ...
    # None on a quote issued before this change.
    expires_at: datetime | None
```

## Rules

Traced on one value: the total on Thad's quote, asked at 10:00.

```
Thad's cart                       unit price
  2 x notebook                      $30.00
  1 x desk lamp                     $40.00
Thad's earlier orders this year   4

subtotal   2 x 30.00 + 40.00                         → $100.00
discount   this is their 5th order this year         → 10%
           their 2nd, 3rd, or 4th would get 5%; their 1st, 0%
total      100.00 less 10%                           → $90.00
expires    10:00 plus 30 minutes                     → 10:30
```

Also:

- An order placed last year does not count toward the discount.
- If the lamp is out of stock, no quote is stored and the reply names the
  lamp.
- A quote read at 10:30 or later answers 410.
- A total is whole cents. A fraction of a cent rounds down.

## When it can't answer

- No such cart: 404.
- An item out of stock: 409 naming the first one, and nothing is stored.
- A cart with no items: a quote of $0.00.
- An expired quote: 410, and the client asks for a new one.

## Cost and proof

- Cost: one more indexed read per quote and no outside call. Measured time:
  `not stated in the plan`.
- Proof: the discount is unit-tested at each boundary, and the route test
  checks the $90.00 above against hand-computed cents.
