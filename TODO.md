# Frontend Implementation TODOs & Decisions

This document tracks the architectural decisions made during the "Grill Me" stress-test regarding how the frontend will integrate with the backend API to meet the challenge requirements.

## 1. Real-Time Data Streaming
**Decision:** We will use aggressive client-side polling (every 2 seconds) instead of WebSockets or SSE.
**Why:** The `problem_statement.md` explicitly mandates building specific `GET` endpoints (`GET /stores/{id}/metrics`, etc.). Using a `setInterval` or React Query to poll these `GET` endpoints strictly adheres to the requested API contract while still fulfilling the Part E requirement to "Show at least one metric updating in real time".

## 2. Graceful Degradation (Zero-Traffic Handling)
**Decision:** The UI must safely handle empty arrays and API drops.
**Why:** Section 3.3 warns that clips contain "5-10 minute windows with no customers". The API will return empty data.
**Implementation Steps:**
- **Metrics:** Render explicit `0` values (do not hide the cards) to prove the system is active but detecting nothing.
- **Feeds/Tables:** If `events` or `anomalies` arrays are empty, render an explicit empty state component: `[SYSTEM ONLINE: NO ACTIVE EVENTS DETECTED]`.
- **API Drops (503s):** Wrap all polling calls in `try/catch`. If the fetch fails, do not crash React. Instead, change the top-right header status indicator to a red `CONNECTION LOST - RETRYING...` while retaining the last known data on screen.
