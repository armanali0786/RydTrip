# Product Requirements

## Actors

### Rider

Can: register, request a ride, view a ride's status, cancel a ride, view ride history.

### Driver

Can: register, go online, go offline, send location, accept a ride, reject a ride,
mark arrival, start a trip, complete a trip.

### Operator

Can: monitor services, monitor Kafka, monitor Redis, monitor dispatch latency, monitor
errors, investigate failures (suspend/reinstate a driver as a moderation action).

## Functional requirements

| ID | Requirement |
|---|---|
| FR-001 | Create rider |
| FR-002 | Create driver |
| FR-003 | Driver can change availability |
| FR-004 | Driver can send location |
| FR-005 | Rider can request a ride |
| FR-006 | System finds nearby available drivers |
| FR-007 | System prevents double assignment of a driver to two rides |
| FR-008 | Driver can accept/reject a ride |
| FR-009 | Trip state transitions are validated against the state machine |
| FR-010 | A ride can be cancelled (subject to state machine rules — not from `IN_PROGRESS`) |
| FR-011 | Important operations produce Kafka events |
| FR-012 | Consumers are idempotent |
| FR-013 | Transient failures are retried |
| FR-014 | Poison events are moved to a Dead Letter Topic |

## Non-functional requirements

These give later phases concrete targets to design and measure against, rather than
vague aspirations. Numbers are initial targets — revisit once Phase 15 produces real
load-test data.

| Category | Target |
|---|---|
| Dispatch latency | P95 end-to-end (ride request → driver reserved) under 3s for a single-node local Redis GEO lookup |
| Location ingestion throughput | Location Service must sustain the driver-count targets in the spec's load-testing section (1,000 → 50,000 simulated drivers) without unbounded queue growth |
| Event delivery | At-least-once; every consumer must be idempotent (FR-012) — no exactly-once assumption anywhere |
| Consistency | Driver reservation and ride state transitions are strongly consistent (single atomic operation, no lost updates under concurrency); everything else may be eventually consistent |
| Availability (dispatch path) | A single pod/consumer failure must not cause a dropped ride request — retried or picked up by another consumer in the group |
| Data durability | No ride or driver-state data loss on a service restart once Phase 3 (PostgreSQL) lands |

## Out of scope for the MVP

Explicitly not modeled, so scope doesn't creep into later phases without a deliberate
decision:

- Payments and fare calculation
- Ratings and reviews
- Ride pooling / shared rides
- Surge pricing
- Multi-region / multi-datacenter deployment
- Abandoning a trip mid-route (`IN_PROGRESS → CANCELLED`) — see
  [state-machines.md](state-machines.md)

## Related documents

- [overview.md](overview.md) — architecture and service responsibilities
- [state-machines.md](state-machines.md) — full driver and ride state machines
- [data-model.md](data-model.md) — schema backing these requirements
- [api-contracts.md](api-contracts.md) — REST surface implementing FR-001–FR-010
