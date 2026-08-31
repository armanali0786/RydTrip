-- Runs once, only when the postgres container's data volume is freshly
-- created (docker-entrypoint-initdb.d convention). Formalizes the
-- database-per-service split from docs/adr/004-database-per-service.md —
-- these three databases are logically independent even though they share
-- one Postgres instance for local dev.
CREATE DATABASE rydtrip_riders;
CREATE DATABASE rydtrip_drivers;
CREATE DATABASE rydtrip_trips;
