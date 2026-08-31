# RydTrip Frontend

> Production-style ride-booking frontend for the RydTrip distributed ride-hailing platform.

RydTrip Frontend provides two user-facing applications:

1. **Rider Web** — search, book, track, and complete rides.
2. **Driver Web** — go online, receive ride requests, accept/reject rides, share location, and manage trips.

The frontend is designed to exercise and demonstrate the backend distributed system rather than act as a static UI.

---

# 1. Product Goal

The frontend should simulate a real ride-booking product where a rider can:

```text
Login
  ↓
Select pickup
  ↓
Select destination
  ↓
Choose ride
  ↓
Confirm booking
  ↓
Finding driver
  ↓
Driver matched
  ↓
Track driver
  ↓
Driver arrives
  ↓
Trip starts
  ↓
Track trip
  ↓
Trip completes
  ↓
View ride summary
```

At the same time, a driver can:

```text
Login
  ↓
Go Online
  ↓
Share Location
  ↓
Receive Ride Request
  ↓
Accept / Reject
  ↓
Navigate to Rider
  ↓
Arrive
  ↓
Start Trip
  ↓
Complete Trip
```

---

# 2. Frontend Scope

## In Scope

### Rider

* Registration/login
* Rider profile
* Current location
* Pickup selection
* Destination selection
* Map
* Ride options
* Fare estimate
* Ride booking
* Finding-driver screen
* Driver assignment
* Driver information
* Live driver location
* Ride cancellation
* Trip status
* Trip completion
* Ride history
* Error/retry states
* Loading states
* Connection states

### Driver

* Registration/login
* Driver profile
* Online/offline status
* Location sharing
* Ride request
* Accept/reject ride
* Rider information
* Navigation/map
* Arrived state
* Start trip
* Complete trip
* Trip history
* Connection status

---

# 3. Out of Scope

The frontend will initially NOT implement:

* Real payment processing
* Real credit/debit card integration
* Real money transfer
* Driver payouts
* Advanced navigation routing
* Promotions
* Referral system
* Corporate accounts
* Driver fleet management
* Admin management dashboard
* Customer support system
* Complex surge-pricing UI

Payments can initially be represented by:

```text
Cash
Mock Payment
```

The focus is the distributed ride-booking system.

---

# 4. Technology Stack

## Core

```text
React
TypeScript
Vite
```

## Routing

```text
React Router
```

## Server State

```text
TanStack Query
```

## Client State

```text
Zustand
```

## Styling

```text
Tailwind CSS
```

## Maps

```text
MapLibre GL JS
```

## Real-Time Communication

```text
WebSocket
```

## HTTP

```text
Fetch API
```

No Axios is required initially.

## Testing

```text
Vitest
React Testing Library
Playwright
```

## Code Quality

```text
ESLint
Prettier
TypeScript
```

---

# 5. Frontend Architecture

```text
                         FRONTEND
                            |
             ┌──────────────┴──────────────┐
             |                             |
        RIDER WEB                      DRIVER WEB
             |                             |
          React                         React
             |                             |
       React Router                React Router
             |                             |
       UI Components                UI Components
             |                             |
      Feature Modules              Feature Modules
             |                             |
      TanStack Query                TanStack Query
             |                             |
          Zustand                      Zustand
             |                             |
        API Client                   API Client
             |                             |
       WebSocket Client            WebSocket Client
             |                             |
             └──────────────┬──────────────┘
                            |
                     API Gateway
                            |
                       Node.js Backend
```

---

# 6. Repository Structure

```text
apps/
│
├── rider-web/
│   │
│   ├── src/
│   │   ├── app/
│   │   │   ├── router/
│   │   │   ├── providers/
│   │   │   └── config/
│   │   │
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── map/
│   │   │   ├── layout/
│   │   │   └── feedback/
│   │   │
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── booking/
│   │   │   ├── ride/
│   │   │   ├── map/
│   │   │   ├── profile/
│   │   │   └── history/
│   │   │
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   ├── riders.ts
│   │   │   └── rides.ts
│   │   │
│   │   ├── websocket/
│   │   │   ├── client.ts
│   │   │   ├── events.ts
│   │   │   └── reconnect.ts
│   │   │
│   │   ├── stores/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── main.tsx
│   │
│   └── package.json
│
└── driver-web/
    │
    ├── src/
    │   ├── app/
    │   ├── components/
    │   ├── features/
    │   │   ├── auth/
    │   │   ├── availability/
    │   │   ├── ride-requests/
    │   │   ├── navigation/
    │   │   ├── trip/
    │   │   └── history/
    │   ├── api/
    │   ├── websocket/
    │   ├── stores/
    │   ├── hooks/
    │   ├── types/
    │   └── main.tsx
    │
    └── package.json
```

---

# 7. Design Principles

The frontend must follow these principles:

### 7.1 Feature-Based Architecture

Avoid:

```text
components/
services/
utils/
everything/
```

Instead:

```text
features/
├── booking/
├── ride/
├── map/
└── auth/
```

Each feature owns its UI, hooks, API calls, and types where practical.

---

### 7.2 Server State ≠ UI State

Use **TanStack Query** for server data:

```text
Ride
Rider
Driver
Ride History
```

Use **Zustand** for client/UI state:

```text
Selected pickup
Selected destination
Map state
Booking flow state
Modal state
```

Do not put every API response into Zustand.

---

# 8. Rider Application

## Main Screens

```text
/auth/login
/auth/register

/
/booking
/booking/confirm

/ride/searching
/ride/:rideId
/ride/:rideId/driver
/ride/:rideId/trip
/ride/:rideId/completed

/history
/profile
```

---

# 9. Rider Home Screen

The main screen contains:

```text
┌─────────────────────────────────────────────┐
│ RydTrip                              👤    │
├─────────────────────────────────────────────┤
│                                             │
│                                             │
│                    MAP                      │
│                                             │
│                 📍 Pickup                   │
│                                             │
│                       🚗                    │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│ Where are you going?                        │
│                                             │
│ 📍 Current location                          │
│                                             │
│ 🔎 Search destination                       │
│                                             │
│              [ Book a Ride ]                │
│                                             │
└─────────────────────────────────────────────┘
```

---

# 10. Pickup Selection

The rider should be able to:

* Use current location
* Search location
* Select map location
* Confirm pickup

State:

```text
pickup = {
  latitude,
  longitude,
  address
}
```

---

# 11. Destination Selection

Destination:

```text
destination = {
  latitude,
  longitude,
  address
}
```

The booking flow must prevent booking when:

```text
pickup == null
destination == null
```

---

# 12. Ride Selection Screen

After pickup and destination:

```text
┌─────────────────────────────────────────────┐
│ Select your ride                            │
├─────────────────────────────────────────────┤
│                                             │
│                    MAP                      │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│ 🚗 Economy                                  │
│ 4 seats                     ₹240            │
│ ~5 min                                      │
│                                             │
│ 🚘 Premium                                  │
│ 4 seats                     ₹390            │
│ ~7 min                                      │
│                                             │
│ 🛺 Auto                                     │
│ 3 seats                     ₹180            │
│ ~4 min                                      │
│                                             │
│            [ Confirm Ride ]                 │
└─────────────────────────────────────────────┘
```

Initially these prices can be mocked or calculated by the backend.

---

# 13. Booking Request

The frontend sends:

```http
POST /rides
```

Example:

```json
{
  "pickup": {
    "latitude": 17.385,
    "longitude": 78.4867
  },
  "destination": {
    "latitude": 17.4,
    "longitude": 78.48
  },
  "vehicleType": "ECONOMY"
}
```

The backend returns:

```json
{
  "rideId": "ride-123",
  "status": "REQUESTED"
}
```

The frontend then transitions to:

```text
REQUESTED
    ↓
SEARCHING
```

---

# 14. Finding Driver Screen

```text
┌─────────────────────────────────────────────┐
│                                             │
│                    MAP                      │
│                                             │
│                     📍                      │
│                                             │
│                                             │
│                     ⟳                       │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│        Finding your driver...               │
│                                             │
│     Searching nearby drivers                │
│                                             │
│     This usually takes a few seconds        │
│                                             │
│             [ Cancel Ride ]                 │
└─────────────────────────────────────────────┘
```

The UI should NOT continuously poll aggressively.

Preferred flow:

```text
POST /rides
      ↓
WebSocket connection
      ↓
ride.status.changed
      ↓
MATCHED
```

---

# 15. Driver Assigned Screen

```text
┌─────────────────────────────────────────────┐
│                                             │
│                    MAP                      │
│                                             │
│                       🚗                    │
│                         ↘                   │
│                           📍                │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│ Driver arriving                             │
│                                             │
│ 👨 Rahul                                    │
│ ⭐ 4.9                                      │
│ 🚗 Toyota                                   │
│ ABC 1234                                    │
│                                             │
│ ETA: 4 min                                  │
│                                             │
│             [ Cancel Ride ]                 │
└─────────────────────────────────────────────┘
```

---

# 16. Live Driver Tracking

The frontend receives:

```json
{
  "eventType": "driver.location.updated",
  "payload": {
    "rideId": "ride-123",
    "driverId": "driver-42",
    "latitude": 17.39,
    "longitude": 78.48,
    "timestamp": "..."
  }
}
```

The UI updates the driver marker.

Architecture:

```text
Driver
   ↓
Location Service
   ↓
Kafka
   ↓
WebSocket Gateway
   ↓
Rider Browser
   ↓
Map Marker
```

The frontend should smoothly animate marker movement rather than abruptly jumping between coordinates.

---

# 17. Ride State Machine

The frontend must understand the backend ride states.

```text
REQUESTED
    ↓
MATCHING
    ↓
MATCHED
    ↓
DRIVER_ARRIVING
    ↓
DRIVER_ARRIVED
    ↓
IN_PROGRESS
    ↓
COMPLETED
```

Cancellation:

```text
REQUESTED ─────→ CANCELLED
MATCHING  ─────→ CANCELLED
MATCHED   ─────→ CANCELLED
```

The UI must never invent invalid transitions.

For example:

```text
COMPLETED
   ↓
MATCHING
```

must never happen.

---

# 18. Driver Application

## Driver Dashboard

```text
┌─────────────────────────────────────────────┐
│ RydTrip Driver                  🟢 ONLINE │
├─────────────────────────────────────────────┤
│                                             │
│                    MAP                      │
│                                             │
│                     🚗                      │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│ Current status                              │
│                                             │
│             🟢 ONLINE                       │
│                                             │
│ Today's trips: 8                            │
│                                             │
│         [ Go Offline ]                      │
└─────────────────────────────────────────────┘
```

---

# 19. Driver Location Sharing

When online:

```text
Browser
   ↓
Geolocation API
   ↓
Location Update
   ↓
POST /drivers/:id/location
```

The frontend should throttle location updates.

Do NOT send hundreds of requests per second.

Example initial target:

```text
1 update / 2-5 seconds
```

The exact production frequency should be determined by measured requirements.

---

# 20. Ride Request Screen

```text
┌─────────────────────────────────────────────┐
│ New Ride Request                            │
├─────────────────────────────────────────────┤
│                                             │
│ 📍 Pickup                                   │
│ 2.4 km away                                 │
│                                             │
│ 📍 Destination                              │
│ 6.8 km                                      │
│                                             │
│ Estimated Fare                              │
│ ₹240                                        │
│                                             │
│       [ Reject ]    [ Accept ]              │
└─────────────────────────────────────────────┘
```

The request should have an expiration timer.

Example:

```text
Accept within 15 seconds
```

When expired:

```text
REQUEST_EXPIRED
```

---

# 21. Driver Trip Screen

After accepting:

```text
┌─────────────────────────────────────────────┐
│ Trip                                         │
├─────────────────────────────────────────────┤
│                                             │
│                    MAP                      │
│                                             │
│                  📍 Rider                   │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│ Rider: Rahul                                │
│                                             │
│ Pickup location                             │
│                                             │
│ ETA: 5 min                                  │
│                                             │
│             [ I've Arrived ]                │
└─────────────────────────────────────────────┘
```

Then:

```text
DRIVER_ARRIVED
      ↓
[ Start Trip ]
      ↓
IN_PROGRESS
      ↓
[ Complete Trip ]
      ↓
COMPLETED
```

---

# 22. WebSocket Architecture

Create a dedicated WebSocket client.

```text
src/websocket/
├── client.ts
├── events.ts
├── reconnect.ts
└── connection-manager.ts
```

Connection lifecycle:

```text
CONNECTING
    ↓
CONNECTED
    ↓
DISCONNECTED
    ↓
RECONNECTING
    ↓
CONNECTED
```

The UI should display connection state where it matters.

Example:

```text
🟢 Live
🟡 Reconnecting...
🔴 Offline
```

---

# 23. WebSocket Events

Frontend event types:

```text
ride.status.changed
driver.assigned
driver.location.updated
trip.started
trip.completed
ride.cancelled
```

Example:

```typescript
type RideStatusChangedEvent = {
  eventType: "ride.status.changed";
  eventId: string;
  version: number;
  timestamp: string;
  correlationId: string;

  payload: {
    rideId: string;
    status: RideStatus;
  };
};
```

---

# 24. WebSocket Reconnection

The client must handle:

```text
Internet disconnect
Browser sleep
Server restart
Kubernetes pod restart
Network change
```

Reconnect strategy:

```text
1 sec
 ↓
2 sec
 ↓
4 sec
 ↓
8 sec
 ↓
15 sec
```

with jitter.

Do not reconnect infinitely at a fixed aggressive interval.

---

# 25. API Layer

Create one centralized API client.

```text
src/api/
├── client.ts
├── auth.ts
├── riders.ts
├── drivers.ts
├── rides.ts
└── trips.ts
```

Example:

```typescript
export async function createRide(
  request: CreateRideRequest
): Promise<Ride> {
  const response = await fetch("/api/v1/rides", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new ApiError(response.status);
  }

  return response.json();
}
```

---

# 26. Server State

TanStack Query handles:

```text
Current Rider
Current Driver
Ride
Ride History
Trip
```

Example:

```text
useQuery({
  queryKey: ["ride", rideId],
  queryFn: () => getRide(rideId)
})
```

When a WebSocket event arrives:

```text
WebSocket Event
      ↓
Update / invalidate Query
      ↓
UI re-renders
```

---

# 27. Client State

Zustand handles:

```text
bookingDraft
selectedPickup
selectedDestination
selectedVehicle
mapViewport
activeRideId
uiState
```

Example:

```text
bookingStore
├── pickup
├── destination
├── vehicleType
└── reset()
```

Avoid storing the entire backend database in Zustand.

---

# 28. Map Architecture

Map component:

```text
components/map/
├── RideMap.tsx
├── PickupMarker.tsx
├── DestinationMarker.tsx
├── DriverMarker.tsx
└── RouteLayer.tsx
```

Map state:

```text
Pickup
Destination
Driver
```

During an active ride:

```text
                    Driver
                      🚗
                       \
                        \
                         📍 Rider
```

---

# 29. Location Permissions

On the driver application:

```text
Browser
  ↓
Request geolocation permission
  ↓
Permission granted?
  ├── YES → Start location tracking
  └── NO  → Show actionable error
```

The application should never silently assume location access.

---

# 30. Authentication

Frontend authentication flow:

```text
Login
  ↓
API Gateway
  ↓
Authentication
  ↓
Token
  ↓
Frontend Session
```

Protected routes:

```text
/rider/*
/driver/*
```

must require authentication.

---

# 31. Authorization

Rider should not access:

```text
/driver/*
```

Driver should not access:

```text
/rider/*
```

Use role-aware route guards:

```text
RIDER
DRIVER
```

The backend remains the final authority for authorization.

Frontend route protection is only a UX/security layer, not a substitute for backend authorization.

---

# 32. Error Handling

Every major operation needs:

```text
Loading
Success
Error
Empty
Retry
Offline
```

Example:

```text
Finding driver...

Loading:
  ⟳ Searching

Error:
  Unable to find a driver

Actions:
  [ Try Again ]
  [ Cancel ]
```

---

# 33. Important Failure Scenarios

The frontend must handle backend failures.

### API timeout

```text
Request
  ↓
Timeout
  ↓
Retry / Error UI
```

### WebSocket disconnect

```text
🟡 Reconnecting...
```

### Driver cancellation

```text
Driver cancelled the ride.

[ Find Another Driver ]
```

### Ride cancellation

```text
Ride cancelled
```

### Backend unavailable

```text
RydTrip is temporarily unavailable.

[ Retry ]
```

---

# 34. Security Requirements

## Never store secrets in frontend code.

Never:

```text
AWS credentials
Database password
Kafka credentials
Redis password
Private API keys
```

inside the frontend bundle.

---

## Environment Variables

Only expose values that are intentionally public.

Example:

```text
VITE_API_BASE_URL
VITE_WS_URL
VITE_MAP_STYLE_URL
```

Remember that Vite environment variables are bundled into client-side code.

Therefore:

```text
VITE_*
```

must never contain secrets.

---

# 35. XSS Protection

React escapes normal rendered content by default.

Avoid unnecessary:

```text
dangerouslySetInnerHTML
```

If HTML rendering becomes necessary, sanitize it before rendering.

---

# 36. Token Security

Prefer secure session/token architecture.

If tokens are stored in cookies, use appropriate:

```text
HttpOnly
Secure
SameSite
```

configuration.

Never expose sensitive authentication tokens unnecessarily to JavaScript.

The exact authentication mechanism must match the backend implementation.

---

# 37. Frontend Performance

Important targets to monitor:

```text
Initial load
Largest Contentful Paint
Interaction latency
JavaScript bundle size
Map rendering performance
WebSocket update rate
Driver marker rendering
```

Avoid rendering the entire application whenever a driver location changes.

Only update the relevant map state.

---

# 38. Driver Location Optimization

Bad:

```text
Every location event
      ↓
Entire React application re-render
```

Good:

```text
Location event
      ↓
Driver location state
      ↓
DriverMarker
      ↓
Marker position update
```

This becomes important when many drivers are visible.

---

# 39. Responsive Design

Rider UI:

```text
Mobile-first
Tablet
Desktop
```

Driver UI:

```text
Mobile-first
Tablet
Desktop
```

The UI should remain usable on small screens.

---

# 40. Accessibility

Implement:

```text
Keyboard navigation
ARIA labels
Focus management
Color-independent status indicators
Readable contrast
Accessible buttons
Screen-reader-friendly errors
```

Example:

Do not communicate only:

```text
🔴
```

Use:

```text
🔴 Offline
```

---

# 41. Testing Strategy

## Unit Tests

Test:

```text
Booking calculations
State transitions
Validation
Store behavior
WebSocket event handling
Location throttling
```

Use:

```text
Vitest
```

---

# 42. Component Tests

Use:

```text
React Testing Library
```

Test:

```text
Booking form
Ride selection
Driver card
Ride status
Error states
Loading states
```

---

# 43. End-to-End Tests

Use:

```text
Playwright
```

Critical flow:

```text
Rider Login
    ↓
Select Pickup
    ↓
Select Destination
    ↓
Select Ride
    ↓
Confirm
    ↓
Finding Driver
    ↓
Driver Accepts
    ↓
Driver Arrives
    ↓
Trip Starts
    ↓
Trip Completes
```

This is the most important frontend E2E test.

---

# 44. Frontend Development Phases

## Phase F0 — Frontend Foundation

### Build

```text
React
TypeScript
Vite
ESLint
Prettier
Tailwind
```

### Deliverable

Both applications boot:

```text
rider-web
driver-web
```

---

# Phase F1 — Application Shell

Build:

```text
Routing
Layouts
Navigation
Loading
Error boundaries
Environment configuration
```

Deliverable:

```text
/login
/
/profile
/history
```

---

# Phase F2 — Authentication

Build:

```text
Login
Registration
Logout
Protected routes
Role-based routes
```

Deliverable:

```text
Rider → Rider UI
Driver → Driver UI
```

---

# Phase F3 — Rider Booking

Build:

```text
Pickup
Destination
Map
Ride options
Fare estimate
Confirm ride
```

Deliverable:

```text
Rider can submit a ride request.
```

---

# Phase F4 — Driver Application

Build:

```text
Online/offline
Location permissions
Location updates
Ride requests
Accept/reject
```

Deliverable:

```text
Driver can receive and accept a ride.
```

---

# Phase F5 — Real-Time Ride

Build:

```text
WebSocket
Connection management
Ride state updates
Driver assignment
Live location
```

Deliverable:

```text
Rider sees driver moving on map.
```

---

# Phase F6 — Complete Trip

Build:

```text
Driver arrived
Start trip
Trip in progress
Complete trip
Ride summary
```

Deliverable:

```text
Full ride lifecycle works through the UI.
```

---

# Phase F7 — Failure Handling

Test:

```text
API timeout
WebSocket disconnect
Driver cancellation
Ride cancellation
Backend restart
Reconnect
Duplicate events
```

Deliverable:

```text
No broken UI state after expected failures.
```

---

# Phase F8 — Testing

Build:

```text
Unit tests
Component tests
E2E tests
```

Critical E2E:

```text
Rider + Driver
       ↓
Book
       ↓
Match
       ↓
Accept
       ↓
Arrive
       ↓
Start
       ↓
Complete
```

---

# Phase F9 — Performance

Measure:

```text
Bundle size
Initial load
Map rendering
WebSocket performance
Location update performance
React render frequency
```

Optimize only based on measurements.

---

# Phase F10 — Production Build

Build:

```text
npm run build
```

Generate:

```text
dist/
```

The frontend becomes static assets.

---

# 45. Local Architecture

During development:

```text
                  Browser
                 /       \
                /         \
         Rider Web       Driver Web
              |              |
              +------┬-------+
                     |
                API Gateway
                     |
                  Node.js
                     |
          ┌──────────┼──────────┐
          |          |          |
       Rider       Driver      Trip
       Service     Service     Service
```

Run everything locally.

AWS is not required for frontend development.

---

# 46. Docker

Each frontend can have a multi-stage Docker build:

```text
Node.js Build
     ↓
npm install
     ↓
npm run build
     ↓
dist/
     ↓
Static Web Server
```

The production container should not need Node.js to serve static assets if we use a dedicated static web server.

---

# 47. AWS Deployment

For the frontend, don't put unnecessary frontend workloads inside EKS.

Preferred architecture:

```text
React
  ↓
Build
  ↓
Static Assets
  ↓
S3
  ↓
CloudFront
  ↓
Internet
```

Backend:

```text
CloudFront
    ↓
API Gateway / ALB
    ↓
EKS
```

So:

```text
                         INTERNET
                            |
                     ┌──────┴──────┐
                     |             |
                 CloudFront      API
                     |             |
                     ▼             ▼
                     S3           ALB
                                   |
                                  EKS
                                   |
                              Node.js APIs
```

This keeps frontend hosting simple and avoids wasting EKS resources on static files.

---

# 48. CI/CD

Frontend pipeline:

```text
Git Push
   ↓
GitHub Actions
   ↓
npm ci
   ↓
Lint
   ↓
Type Check
   ↓
Unit Tests
   ↓
Component Tests
   ↓
Build
   ↓
E2E Tests
   ↓
Deploy
```

For AWS:

```text
Build
  ↓
S3
  ↓
CloudFront
```

---

# 49. Frontend Environment Strategy

## Development

```text
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

## Production

```text
VITE_API_BASE_URL=https://api.example.com
VITE_WS_URL=wss://api.example.com
```

Never hardcode production URLs throughout components.

---

# 50. Frontend Observability

Track:

```text
JavaScript errors
API failures
WebSocket disconnects
Page load performance
Booking failures
Ride flow failures
```

Frontend events should include:

```text
rideId
userId where appropriate
correlationId where available
timestamp
```

Never log:

```text
password
authentication secrets
sensitive tokens
```

---

# 51. Frontend + Backend Integration

The frontend is not a separate demo.

The goal is:

```text
Rider UI
   ↓
POST /rides
   ↓
Rider Service
   ↓
Kafka
   ↓
Dispatch Service
   ↓
Redis GEO
   ↓
Driver Service
   ↓
WebSocket
   ↓
Driver UI
   ↓
Accept
   ↓
Kafka
   ↓
Trip Service
   ↓
WebSocket
   ↓
Rider UI
```

This is the primary end-to-end product flow.

---

# 52. Final Frontend Architecture

```text
                           USERS
                         /       \
                        /         \
                       ▼           ▼
                 RIDER WEB      DRIVER WEB
                    React          React
                      |              |
                 TypeScript      TypeScript
                      |              |
                    Vite           Vite
                      |              |
               TanStack Query  TanStack Query
                      |              |
                   Zustand        Zustand
                      |              |
                    MapLibre      MapLibre
                      |              |
                 WebSocket       WebSocket
                      |              |
                       \            /
                        \          /
                         ▼        ▼
                        API GATEWAY
                            |
                        Node.js
                            |
                  ┌─────────┼─────────┐
                  ▼         ▼         ▼
                Rider     Driver     Trip
               Service   Service    Service
```

---

# 53. Final Rider Experience

The final demo should be:

```text
1. Open Rider Web
        ↓
2. Login
        ↓
3. Select pickup
        ↓
4. Select destination
        ↓
5. Choose Economy
        ↓
6. Confirm Ride
        ↓
7. "Finding driver..."
        ↓
8. Open Driver Web
        ↓
9. Driver goes online
        ↓
10. Driver receives request
        ↓
11. Driver accepts
        ↓
12. Rider sees driver assigned
        ↓
13. Driver location moves
        ↓
14. Driver arrives
        ↓
15. Driver starts trip
        ↓
16. Rider sees "Trip in progress"
        ↓
17. Driver completes trip
        ↓
18. Rider sees completed ride
```

This should be the **golden frontend demo**.

---

# 54. Definition of Done

The frontend is considered complete only when:

* [ ] Rider can register/login
* [ ] Driver can register/login
* [ ] Rider can select pickup
* [ ] Rider can select destination
* [ ] Rider can see map
* [ ] Rider can choose ride type
* [ ] Rider can create a ride
* [ ] Driver receives ride request
* [ ] Driver can accept/reject
* [ ] Rider receives assignment
* [ ] Driver location is displayed
* [ ] Driver location updates in real time
* [ ] Driver can mark arrived
* [ ] Driver can start trip
* [ ] Rider sees trip progress
* [ ] Driver can complete trip
* [ ] Rider sees completion
* [ ] Cancellation works
* [ ] WebSocket reconnect works
* [ ] API errors have proper UI
* [ ] Loading states exist
* [ ] Mobile layout works
* [ ] Authentication is protected
* [ ] Unit tests pass
* [ ] Component tests pass
* [ ] Critical Playwright E2E passes
* [ ] Production build succeeds
* [ ] Frontend can be deployed independently

---

# 55. The Most Important Principle

The frontend should **prove the backend architecture visually**.

Don't build a beautiful UI that only calls CRUD APIs.

The impressive demo is:

```text
                RIDER
                  |
             "Book Ride"
                  |
                  ▼
             Node.js API
                  |
                  ▼
                Kafka
                  |
                  ▼
              Dispatch
                  |
                  ▼
              Redis GEO
                  |
                  ▼
               DRIVER
                  |
             "Accept Ride"
                  |
                  ▼
                Kafka
                  |
                  ▼
             Trip Service
                  |
                  ▼
             WebSocket
                  |
                  ▼
                RIDER
                  |
          Live Driver Movement
```

That is what makes the frontend an integral part of **RydTrip**, rather than just a UI attached to a backend.
