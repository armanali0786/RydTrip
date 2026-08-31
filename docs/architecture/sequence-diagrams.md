# Sequence Diagrams

These trace the flows referenced in [overview.md](overview.md) and
[state-machines.md](state-machines.md) end to end, including the non-happy paths.

## 1. Ride request → dispatch → reservation (happy path)

```mermaid
sequenceDiagram
    participant R as Rider (client)
    participant GW as API Gateway
    participant RS as Rider Service
    participant K as Kafka
    participant TS as Trip Service
    participant DS as Dispatch Service
    participant RD as Redis (GEO + state)

    R->>GW: POST /rides
    GW->>RS: POST /rides
    RS->>RS: persist ride (status=REQUESTED)
    RS->>K: publish ride.requested
    RS-->>GW: 202 { rideId, status: MATCHING }
    GW-->>R: 202 { rideId, status: MATCHING }

    K->>TS: ride.requested
    TS->>TS: ride.status = MATCHING

    K->>DS: ride.requested
    DS->>RD: GEOSEARCH nearby drivers
    RD-->>DS: ranked candidates
    DS->>RD: atomic AVAILABLE -> RESERVED (top candidate)
    RD-->>DS: reservation success
    DS->>K: publish driver.reserved
```

## 2. Driver rejects → dispatch retries next candidate

```mermaid
sequenceDiagram
    participant DS as Dispatch Service
    participant D1 as Driver A (candidate 1)
    participant RD as Redis
    participant D2 as Driver B (candidate 2)
    participant K as Kafka

    DS->>RD: reserve Driver A (AVAILABLE -> RESERVED)
    RD-->>DS: success
    DS->>D1: notify reservation
    D1-->>DS: reject (or timeout after 15s)
    DS->>RD: release Driver A (RESERVED -> AVAILABLE)
    DS->>RD: reserve Driver B (AVAILABLE -> RESERVED)
    RD-->>DS: success
    DS->>D2: notify reservation
    D2-->>DS: accept
    DS->>K: publish driver.accepted
    note over DS,K: Ride state stays MATCHING throughout this retry loop —<br/>only the final acceptance moves the ride to MATCHED.
```

## 3. Driver accepts → trip lifecycle to completion

```mermaid
sequenceDiagram
    participant DS as Dispatch Service
    participant K as Kafka
    participant TS as Trip Service
    participant Dr as Driver (client)
    participant Ri as Rider (client)

    DS->>K: publish driver.accepted
    K->>TS: driver.accepted
    TS->>TS: status: MATCHED -> DRIVER_ARRIVING

    Dr->>TS: POST /trips/{rideId}/driver-arrived
    TS->>TS: status -> DRIVER_ARRIVED

    Ri->>TS: (rider boards) POST /trips/{rideId}/start
    TS->>TS: status -> IN_PROGRESS
    TS->>K: publish trip.started

    Dr->>TS: POST /trips/{rideId}/complete
    TS->>TS: status -> COMPLETED
    TS->>K: publish trip.completed
```

## 4. Rider cancels mid-flow

```mermaid
sequenceDiagram
    participant Ri as Rider (client)
    participant RS as Rider Service
    participant TS as Trip Service
    participant DS as Dispatch Service
    participant RD as Redis

    Ri->>RS: POST /rides/{rideId}/cancel
    RS->>RS: validate current status via Trip Service

    alt status is MATCHING
        RS->>TS: cancel (reason=RIDER_CANCELLED)
        TS->>TS: status -> CANCELLED
        TS-->>DS: (event) stop matching attempts for this ride
    else status is DRIVER_ARRIVING or DRIVER_ARRIVED
        RS->>TS: cancel (reason=RIDER_CANCELLED)
        TS->>TS: status -> CANCELLED
        TS->>DS: release reserved driver
        DS->>RD: RESERVED -> AVAILABLE
    else status is IN_PROGRESS or terminal
        RS-->>Ri: 409 Conflict — cannot cancel
    end
```
