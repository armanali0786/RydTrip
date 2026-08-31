-- Runs once, only when the postgres container's data volume is freshly
-- created (docker-entrypoint-initdb.d convention). Formalizes the
-- database-per-service split from docs/adr/004-database-per-service.md —
-- these three databases are logically independent even though they share
-- one Postgres instance for local dev.
CREATE DATABASE ridemesh_riders;
CREATE DATABASE ridemesh_drivers;
CREATE DATABASE ridemesh_trips;
