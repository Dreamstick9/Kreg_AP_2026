# Kreg Lite — CP2 Entity–Relationship Diagram

The diagram follows `prisma/migrations/20261113181735_init/migration.sql` and the additional constraints in `dbms/03_schema.sql`.

```mermaid
erDiagram
    users ||--o{ monitors : owns
    monitors ||--o{ check_results : records
    monitors ||--o{ incidents : experiences

    users {
        SERIAL id PK
        TEXT name
        TEXT email UK
        TEXT password_hash
        TIMESTAMP_3 created_at
    }
    monitors {
        SERIAL id PK
        INTEGER user_id FK
        TEXT name
        TEXT url
        INTEGER interval_sec
        BOOLEAN is_active
        BOOLEAN is_public
        MonitorStatus status
        INTEGER consecutive_failures
        TIMESTAMP_3 last_checked_at
        TIMESTAMP_3 created_at
    }
    check_results {
        SERIAL id PK
        INTEGER monitor_id FK
        BOOLEAN is_up
        INTEGER status_code
        INTEGER response_time_ms
        TEXT error
        TIMESTAMP_3 checked_at
    }
    incidents {
        SERIAL id PK
        INTEGER monitor_id FK
        TEXT reason
        TIMESTAMP_3 started_at
        TIMESTAMP_3 resolved_at
    }
```

**Legend:** PK = primary key; FK = foreign key; UK = unique key; `TIMESTAMP_3` = PostgreSQL `TIMESTAMP(3)`. The `MonitorStatus` enum contains `UP`, `DOWN`, and `UNKNOWN`. All relationship foreign keys use `ON DELETE CASCADE ON UPDATE CASCADE`. Fields without a key marker are ordinary attributes; nullability and defaults follow `03_schema.sql`.

**Composite candidate keys:** `check_results (monitor_id, checked_at)` and `incidents (monitor_id, started_at)` are unique pairs. They are not separate single-column UNIQUE constraints. A partial unique index additionally enforces at most one incident per monitor with `resolved_at IS NULL`.

**Cardinalities:** users (1) → (0..N) monitors; monitors (1) → (0..N) check_results; monitors (1) → (0..N) incidents. Every child record belongs to exactly one parent.
