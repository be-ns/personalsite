# Service request state - written rationale

The four complaints arrived as four projects: duplicate tickets, status calls, priority
blindness, and API load. They are one problem. Nothing holds an authoritative, visible state
for a request, so every party rebuilds it by hand. The supervisor rebuilds it by filing
again. The driver rebuilds it by calling. The dispatcher rebuilds it from memory. The
integration rebuilds it by polling. Give the request a state machine that all four can see,
and all four symptoms lose their reason to exist.

## API design

**Idempotent intake.** `POST /v1/requests` carries a key of
`sha256(vehicle_id | issue_category | 24h_bucket)`. The second report of the same fault
returns `409` with the canonical request id and a merge suggestion instead of a second
ticket. A duplicate stops being a cleanup job and becomes an intake decision, made once,
while someone is still looking at it.

**One transition endpoint, one log.** `POST /v1/requests/{id}/transitions {to, actor, reason}`
is the only way state moves: reported, triaged, scheduled, in_service, completed, closed,
plus merged. Every transition appends to an immutable event log. The log is not a debugging
feature. It is the substrate. Webhooks, metrics, and the end-of-day view are all reads of the
same stream, which is why they cannot quietly disagree with each other.

**Push, not poll.** `POST /v1/webhooks` subscribes to `request.*`. In the simulation, agent
and integration traffic climbs to 140 calls a minute asking for state that never changes,
then falls to 8 once state changes announce themselves. That cliff is not a performance win
we engineered. Polling exists because state is not trustworthy. Make it trustworthy and the
polling has nothing left to do.

**Scoped principals.** Driver: create, read own. Shop: transitions to in_service and
completed, through a scoped token that needs no seat and no login. Agent: create, read,
raise severity, suggest merge. Dispatcher: everything. The shop's one-tap complete is the
whole reason the 08:50 failure closes at all, because it costs the shop nothing, so it
actually happens.

What a third party or an agent can build on this: create requests without doubling them,
subscribe instead of polling, and reconstruct any request's history without asking us. A
telematics vendor filing fault codes, a shop's own scheduler, and a customer's internal
dashboard all become the same shape of client.

## The agent and human boundary

The agent may raise severity and may suggest a merge. It may not lower severity and may not
confirm a merge. The asymmetry is the design, and it comes from what being wrong costs in
each direction.

Wrong high: a dent gets a person's attention for thirty seconds and then files below the
fold. Wrong low: a soft brake pedal sits for 325 minutes and comes back on a flatbed, and the
bill is $5,900 with a driver on the shoulder of I-80. Those two mistakes are not the same
size, so they do not get the same permissions.

Merges work the same way. A missed merge costs a duplicate ticket. A wrong merge hides a real
second issue inside a closed one, which is the original problem wearing a better dashboard.
So merges are suggested with a confidence value, confirmed by a person, reversible, and
counted.

## Metrics

Three primaries, measured at 90 days:

- Safety-critical report to severity confirmed: median under 30 minutes. Today the honest
  number is "never," and 325 minutes is what never looked like on the day it mattered.
- Inbound status contacts per open request: down 60%.
- Duplicates caught and merged at intake: at least 80% of incoming.

API traffic and cost of delay sit underneath those as supporting evidence, not targets. The
cost model is assumptions with a shape (planned brake job $800, emergency roadside at 4x,
downtime $750/day, missed delivery $1,200), and it stays labelled that way until it is
checked against customer-reported emergency-repair frequency.

One side-effect metric, committed to now rather than after the primaries start looking good:
**unmerge rate, under 5%.** The failure mode of this design is over-merging. Duplicates go to
zero, the chart is excellent, and a real second issue is asleep inside a merged ticket. I
have shipped a metric that could only improve before. It stops measuring long before anyone
notices it stopped.

Retention comes from the state machine. Growth comes from what you can build on one.
