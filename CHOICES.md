# OpticRetail: Architectural Choices & AI Rationale

This document outlines the three critical design decisions for the AI-Powered Store Intelligence System, comparing alternatives, detailing AI-suggested directions, and providing the final rationale.

## 1. Object Detection Model (Detection Layer)

### Options Considered
- **RT-DETR**: High accuracy, especially in crowded scenes, but heavier on compute.
- **MediaPipe**: Fast, great for pose estimation, but less robust for dense, multi-person tracking in complex retail environments.
- **YOLOv8**: State-of-the-art balance of speed and accuracy, with excellent out-of-the-box tracking integrations.

### AI Suggestion
The AI recommended **YOLOv8** due to the requirement to process 15fps 1080p footage across multiple camera angles in near real-time, especially for the bonus Live Dashboard. It emphasized that YOLO's native integrations with ByteTrack/BoT-SORT would save significant time on bounding box association.

### Final Choice & Rationale
**Selected: YOLOv8 (with OSNet/Torchreid planned for future scaling)**
I agreed with the AI's core suggestion. Speed and ease of integration with a tracking pipeline are paramount, so YOLOv8 combined with BoT-SORT currently handles the core tracking efficiently. 

**Handling Re-Entry (Future Scaling):** Due to strict time constraints, the current implementation relies on spatial bounding-box continuity, meaning if a customer steps out of the frame and returns, they receive a new `visitor_id`. However, the *planned architecture* to perfectly solve Re-Entry relies on appearance embeddings extracted via a lightweight Re-ID model like **OSNet or Torchreid**. By extracting a mathematical feature vector (fingerprint) of the customer's clothing and color profile, we can use cosine similarity to match vectors across time. When a person re-enters 5 minutes later, their Re-ID vector matches the database, allowing us to emit a `REENTRY` event instead of a new `ENTRY`, completely solving the inflation of conversion denominators.

## 2. Event Schema Design

### Options Considered
- **Minimalist/Raw Schema**: Emit raw coordinate data and let the backend compute everything (zone overlaps, queue depths, session ordering).
- **Denormalized/Stateful Schema**: Compute state (like queue depth and session sequence) at the edge (Detection layer) and embed it directly into the event payload.

### AI Suggestion
The AI suggested the **Denormalized/Stateful Schema**, pointing out that shifting state-heavy computations to the detection layer keeps the backend API lightweight and fast, especially for the real-time `/funnel` and `/metrics` endpoints.

### Final Choice & Rationale
**Selected: Denormalized/Stateful Schema**
I agreed with the AI. By injecting fields like `queue_depth` directly into the `BILLING_QUEUE_JOIN` metadata, the API doesn't have to scan past events to reconstruct live queue states. Including a `session_seq` (the ordinal position of the event in a visitor's journey) makes funnel computation trivial via SQL window functions. This separation of concerns ensures the API remains ultra-fast, focusing purely on aggregation rather than raw state reconstruction.

## 3. API Architecture Choice

### Options Considered
- **Go + SQLite**: Extremely fast execution, simple containerization (no separate DB container), but less robust for complex analytical window functions on concurrent inserts.
- **FastAPI (Python) + PostgreSQL**: Slightly heavier footprint, but native Pydantic validation, excellent async IO handling, and enterprise-grade relational features.

### AI Suggestion
The AI recommended **FastAPI + PostgreSQL**. It highlighted that FastAPI's Pydantic integration drastically reduces boilerplate for validating complex nested JSON events. For the database, it noted that idempotency could be cleanly handled at the database level using `ON CONFLICT DO NOTHING` with PostgreSQL, which handles high-concurrency batch inserts much better than SQLite.

### Final Choice & Rationale
**Selected: FastAPI + PostgreSQL**
I agreed with the AI's recommendation and incorporated further system design considerations. FastAPI provides the necessary speed and schema enforcement for the ingestion pipeline. PostgreSQL was chosen not just for its concurrency handling and advanced Window functions (essential for the `/funnel` endpoint), but also for its reliability and extensibility. Features like WAL (Write-Ahead Logging) ensure data durability, and PostgreSQL sets a strong foundation should we decide to implement CQRS (Command Query Responsibility Segregation) to separate the heavy read analytics from the write-heavy event stream in the future.
