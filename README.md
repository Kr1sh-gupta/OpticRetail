# OpticRetail Deployment Infrastructure

Welcome to the `infra/deployment` branch of OpticRetail. This branch contains the master Docker orchestration files to run the entire end-to-end Store Intelligence System.

## Architecture Overview
This system is composed of decoupled microservices, each residing in their own branch. Running the orchestration file pulls the following automatically:
1. **Frontend (`frontend` branch):** A React/Vite dashboard serving live UI.
2. **Backend (`backend` branch):** A FastAPI intelligence layer orchestrating events and POS streaming. The backend container autonomously clones the `pipeline` branch to seamlessly execute the CCTV engine.
3. **Database:** A PostgreSQL instance handling CQRS-style data persistence with Write-Ahead Logging (WAL) for durability.

## How to Run

Running the entire OpticRetail system requires zero manual configuration beyond `git clone` and `docker`.

1. Ensure you are on the `infra/deployment` branch.
2. Run the following command:
```bash
docker compose up --build
```
3. Navigate to `http://localhost` in your browser.
4. Click the **"Start Simulation"** button in the top yellow banner to begin the real-time CCTV and POS data stream.
