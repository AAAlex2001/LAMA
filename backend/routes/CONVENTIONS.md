# Route and Schema Conventions

This backend keeps route modules aligned with API features.

## Routes

- One route file owns one external API feature.
- Route files live under `backend/routes/<domain>/<feature>.py`.
- Feature filenames use product/domain language, not technical buckets like `crud`.
- Domain `__init__.py` is the only place that composes feature routers.
- Handlers receive only request data, `db: AsyncSession = Depends(get_db)`, and `current_user`.
- Handlers instantiate use-cases directly as `UseCase(db).execute(...)`.
- Access checks stay in use-cases or lookup helpers, not duplicated in route handlers.
- Nested resources must be scoped by both parent id and owner id.

## Schemas

- Schema files mirror route feature names where possible.
- Route and service code imports schemas from the feature schema file directly.
- Old compatibility modules are not kept after a feature is migrated.
