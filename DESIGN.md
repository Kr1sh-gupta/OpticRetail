# OpticRetail — System Architecture & Design

**OpticRetail** is an end-to-end AI-powered Store Intelligence System. It is designed to transform raw, anonymized CCTV footage into real-time actionable business metrics, including conversion funnels, zone heatmaps, and operational anomaly detection.

## 1. High-Level Architecture

OpticRetail is decoupled into three primary macro-components, communicating asynchronously to ensure production-grade scalability:

1. **Detection Edge Node (CV Pipeline):** A Python-based worker running YOLOv8 for object detection and tracking. It parses the video, extracts stateful metadata, and streams the data to the API.
2. **Intelligence API (Backend):** A FastAPI service orchestrates the ingestion pipeline. It validates payloads using Pydantic and seamlessly handles idempotent inserts into PostgreSQL. It exposes RESTful endpoints (`/metrics`, `/funnel`, `/anomalies`, `/pipeline/start`) that query PostgreSQL to serve real-time analytics to the dashboard.
3. **Live Command & Control (Dashboard):** A React frontend built for enterprise observability. It provides a synchronized simulation clock that orchestrates historical POS data alongside simulated CCTV feeds to prove real-time data correlation.

## 2. AI-Assisted Decisions

During the design and implementation of OpticRetail, AI tools were leveraged to accelerate development and solve complex edge cases:

1. **Time-Synchronized Simulation Architecture:**
   - **The Problem:** Correlating historical POS CSV transactions (e.g., 2026-04-10 19:21) with real-time running CCTV footage simulations without breaking the dashboard experience.
   - **AI Suggestion & Implementation:** The AI suggested decoupling the frontend clock from the user's system time. Instead of using `Date.now()`, the AI implemented a `localStorage` persisted simulation clock starting at `2026-04-10T20:10:30`.
   - **Conclusion:** I agreed with this approach. It allowed the POS ingestion worker to instantly pre-load historical transactions while accurately streaming future transactions in lock-step with the CCTV video progress.

2. **Unified Docker Orchestration (Acceptance Gate):**
   - **The Problem:** The `Start Simulation` button relies on the backend running a `subprocess` to start the pipeline. Running them in separate Docker containers breaks the local paths.
   - **AI Suggestion:** The AI architected a unified `Dockerfile` that dynamically `git clone`s the `pipeline` branch directly into the backend container during build.
   - **Conclusion:** I agreed. This bridged the gap flawlessly, allowing `docker compose up` to spin up a fully decoupled git structure while preserving the ability for the backend to natively spawn the CV pipeline.

2. **Schema Statefulness:**
   - **The Problem:** Deciding where to compute complex business state like `queue_depth`.
   - **AI Suggestion:** The AI strongly advocated for a denormalized schema where the Detection node computes the state and injects it into the event metadata before publishing to Kafka.
   - **Conclusion:** I agreed. This offloaded heavy historical queries from PostgreSQL, allowing the FastAPI endpoints to remain ultra-fast and focus solely on aggregations.
