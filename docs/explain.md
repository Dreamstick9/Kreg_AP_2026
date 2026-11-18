# KL-23 — Check results index benchmark

The benchmark ran on PostgreSQL 18.7 in a local container with the repository's Prisma migration and KL-06 seed. The seeded monitors had IDs 1–5, and [seed-100k.sql](seed-100k.sql) populated `check_results` with 100,000 rows, 20,000 per monitor. The load produced 5,008 failures (5.01%), and response times ranged from 50 to 450 ms.

```sql
EXPLAIN ANALYZE SELECT * FROM check_results
WHERE monitor_id = 1 AND checked_at > NOW() - INTERVAL '24 hours';
```

| Index state | Scan | Execution time | Rows returned |
| --- | --- | ---: | ---: |
| [Before](explain-before.png) | Seq Scan | 6.595 ms | 576 |
| [After](explain-after.png) | Bitmap Index Scan + Bitmap Heap Scan | 0.172 ms | 576 |

The index lets PostgreSQL find matching entries for one monitor and its recent time range, then fetch those rows without scanning the entire table.

The table was analyzed after loading the data. Both plans were captured in one transaction so `NOW()` used the same cutoff. After commit, `\d check_results` confirmed that `check_results_monitor_id_checked_at_idx` was present as a B-tree on `(monitor_id, checked_at)`. The PNGs are rendered from the captured `psql` output.
