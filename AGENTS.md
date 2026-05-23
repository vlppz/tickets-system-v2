# Tickets System V2 Agent Guide

## Project Snapshot

Tickets System V2 is a Ruby on Rails monolith with a React SPA frontend. The product goal is an event request/ticket application where users register, sign in, view available forms, submit or update their answers, and admins create forms and review/filter submitted answers.

Primary stack:

- Ruby `3.4.8`, Rails `8.1.2`, Puma, Propshaft, jsbundling with esbuild.
- React `19`, `react-dom`, `react-hot-toast`, `lucide-react` in `app/javascript`.
- PostgreSQL through Active Record, with JSON/JSONB fields for form definitions and answers.
- Redis-backed Rails sessions via `redis-session-store`.
- `bcrypt` through `has_secure_password` for password hashing.
- Dockerfile and Kamal config exist, but docker-compose and `.env.example` are currently missing.

## Important Paths

- `app/controllers/application_controller.rb` contains `current_user`, `require_login`, and `require_admin`.
- `app/controllers/auth_controller.rb` handles register, login, logout, and current-user API.
- `app/controllers/forms_controller.rb` handles form CRUD, answer submission, answer listing, filtering, and answer details.
- `app/models/user.rb`, `app/models/form.rb`, and `app/models/answer.rb` are the core ORM models.
- `app/javascript/components/App.jsx` is the simple path-based SPA router.
- `app/javascript/components/LoginPage.jsx` handles auth UI.
- `app/javascript/components/MainPage.jsx` shows available and submitted user forms.
- `app/javascript/components/FormBuilderPage.jsx` is the admin form builder.
- `app/javascript/components/AdminFormsPage.jsx` lists admin forms.
- `app/javascript/components/AdminAnswersPage.jsx` lists, searches, filters, and paginates answers.
- `app/javascript/components/AdminAnswerDetailsPage.jsx` displays one answer.
- `app/javascript/components/FormRenderer.jsx` renders a form and submits answers.
- `config/routes.rb` defines page routes and `/api/...` endpoints.
- `db/schema.rb` shows the current schema; change schema through migrations in `db/migrate` only.
- `config/database.yml`, `config/initializers/session_store.rb`, and `config/environments/*.rb` are key runtime config files.
- `README.md` is currently minimal and must be updated when changing setup, deployment, or major features.

## Current Core User Scenarios

Keep these scenarios working end-to-end:

- A new user registers with surname, name, second name, email, and password.
- A user logs in, sees available forms, opens a form, fills required fields, submits it, and later edits their own answer.
- A user sees submitted forms and answer review status: `waiting`, `approved`, `edits_required`, or `declined`.
- An admin logs in and opens the admin forms page.
- An admin creates a form with text, textarea, number, select, checkbox, required fields, and conditional required fields.
- An admin edits an existing form.
- An admin views answers by form, uses pagination, search, date/status filters, and field filters.
- An admin opens one answer detail page and sees user metadata, answer values, and status.
- Unauthorized users are redirected in the UI and receive `401` or `403` from protected APIs.

## Local Development Commands

Use these commands unless a task requires a more specific command:

- Install Ruby gems: `bundle install`.
- Install JS packages: `pnpm install`.
- Prepare DB: `bin/rails db:prepare`.
- Run migrations: `bin/rails db:migrate`.
- Seed DB when seeds exist: `bin/rails db:seed`.
- Build JS once: `pnpm build`.
- Watch JS during development: `pnpm build --watch`.
- Start Rails server: `bin/rails server -p 3000`.
- Run Rails tests: `bin/rails test`.
- Run Ruby style checks: `bundle exec rubocop`.
- Run Rails security scan: `bundle exec brakeman`.
- Run dependency security audit: `bundle exec bundler-audit check --update`.
- Production-like asset check: `SECRET_KEY_BASE_DUMMY=1 bin/rails assets:precompile`.

Local services expected by the current config:

- PostgreSQL on `localhost:5432` with development database/user/password currently set to `postgres`/`postgres`.
- Redis on `redis://localhost:6379/0` unless `REDIS_URL` is set.

## Code Style And Change Strategy

- Make the smallest correct change that preserves the existing Rails + React structure.
- Do not move large UI or controller code without a concrete reason.
- Add new dependencies only when the feature clearly needs them.
- Keep backend, frontend, database, and deployment concerns separated.
- Keep API behavior stable unless the task explicitly asks for a breaking API refactor.
- Prefer clear validations and explicit error responses over silent failures.
- Do not add unused files, dead code, fake placeholders, or commented-out implementation blocks.
- Keep user-facing copy consistent with the current Russian UI unless a task asks otherwise.

## Backend And API Guidelines

- Use Rails controllers for API behavior and Active Record models for database access.
- Put reusable authorization/authentication helpers in `ApplicationController` or a small concern, not duplicated in every action.
- Protect every private API endpoint with `before_action :require_login`.
- Protect admin-only endpoints with `before_action :require_admin`.
- Do not trust frontend checks as authorization. Repeat access control checks on the backend.
- Return meaningful HTTP statuses: `400` for malformed input, `401` for not logged in, `403` for non-admin or forbidden access, `404` for missing records, `422` for validation failures, and `200` or `201` for success.
- Keep JSON response shapes consistent. Existing endpoints often use `{ status: "ok" }` and `{ status: "error", detail: "..." }`; if touching an endpoint, keep or deliberately normalize this pattern.
- Validate required parameters server-side even when HTML `required` is present.
- Use `find_by` plus explicit `404`/error handling when records can be missing.
- Use Active Record parameter binding or hash conditions. Never interpolate request parameters into SQL strings.
- For answer filtering, keep filtering, sorting, limits, and offsets in SQL/Active Record relations before loading records.
- Avoid N+1 queries. Use `includes(:user)`, `joins(:user)`, or explicit preloading when serializing associated users or forms.
- Add integration tests for auth, form CRUD, answer submission, filters, pagination, and access control when modifying those endpoints.

## Current API Map

Existing routes in `config/routes.rb`:

- `POST /api/auth/register` creates a user.
- `POST /api/auth/login` creates the session.
- `GET /api/auth/logout` clears the session.
- `GET /api/auth/me` returns the current user or `nil`.
- `POST /api/forms/create` creates a form; admin only.
- `GET /api/forms/all` lists forms; login required.
- `GET /api/forms/one?id=...` returns one form; login required.
- `POST /api/forms/update` updates a form; admin only.
- `DELETE /api/forms/delete` deletes a form; admin only.
- `POST /api/forms/answer` creates or updates the current user's answer.
- `POST /api/forms/answers` lists answers with filters and pagination; admin only.
- `GET /api/forms/answers/one?answer_id=...` returns one answer; admin only.
- `GET /api/forms/answers/my?form_id=...` returns the current user's answer for a form.
- `GET /api/state` and `GET /api/version` are app health/config endpoints.

If adding new API routes, prefer a consistent REST-style shape under `/api` with nouns, correct HTTP methods, and correct statuses. Avoid adding more action words such as `/create` or `/delete` unless preserving existing compatibility is required.

## Database And ORM Guidelines

- Core entities are `User`, `Form`, and `Answer`.
- `Answer` belongs to `User` and `Form`; `Form` has many `answers`.
- `User` uses `has_secure_password`; never store or expose raw passwords.
- Keep schema changes in migrations and verify `db/schema.rb` updates.
- Prefer database constraints and model validations for required fields, uniqueness, allowed enum values, and ownership rules.
- Keep `forms.content` and `answers.answer` JSON structures validated at the controller/model boundary.
- Existing performance indexes include GIN/trigram indexes on answers and user-search fields. Add indexes when introducing new common filters or sorts.
- If deleting forms, consider dependent answers deliberately. Avoid orphan data; use `dependent: :destroy` only if deleting answers with forms is intended.
- Add or update `db/seeds.rb` when reviewers need predictable demo/admin data.

## Frontend Guidelines

- Keep React code in `app/javascript/components` and shared helpers in `app/javascript/lib`.
- `App.jsx` routes based on `window.location.pathname`; add new page routes in both `config/routes.rb` and `App.jsx`.
- Use `fetch(..., { credentials: 'include' })` for session-backed API calls.
- Always handle loading, empty, error, unauthorized, and forbidden states in UI flows.
- Do not use `dangerouslySetInnerHTML`, `innerHTML`, or raw HTML injection for user-supplied form/answer values. React text rendering is the safe default.
- Preserve responsive behavior. Test important pages at desktop width and mobile width.
- Keep forms accessible enough for grading: labels, clear validation messages, disabled submitting states, and readable errors.
- Split very large components only when a change becomes hard to maintain; avoid broad rewrites.
- Keep visual language consistent with the current UI unless the task is a redesign.

## Security Checklist For Grading

Before considering security-related work done, check these items:

- SQL Injection: all queries that include user input use Active Record hashes or bound parameters. No string interpolation with params.
- XSS: user-provided names, form labels, options, descriptions, and answer values are rendered as text, not HTML.
- CSRF: state-changing session-cookie API requests must have CSRF protection. Current controllers call `skip_before_action :verify_authenticity_token`; do not add more skips. If working on security, restore Rails CSRF protection and send the token from React using the `csrf-token` meta tag and `X-CSRF-Token` header.
- Passwords: keep `has_secure_password` and `password_digest`; never return `password_digest` from API responses.
- Authentication: private pages and APIs must require login.
- Authorization: users can create/update/read only their own answers; admins can manage forms and review all answers. Direct ID changes in requests must not bypass ownership/admin checks.
- Secrets: do not commit real tokens, passwords, API keys, `config/master.key`, production credentials, or real `.env` files. Keep config in environment variables and provide safe examples in `.env.example`.
- Sessions: keep cookies `httponly`; production cookies should be `secure` behind HTTPS.
- Logs: do not log passwords, tokens, session values, or raw credentials.

## Performance Checklist For Grading

- Avoid N+1 queries when loading answers with users or forms.
- Use pagination for potentially large lists. `POST /api/forms/answers` already supports `page` and `limit`; keep or extend this pattern.
- Keep filtering and sorting in the database, not after loading all rows into Ruby or JavaScript.
- Add indexes for new filters/sorts. Current schema has indexes on answer JSONB, answer trigram search, answer `form_id`, answer `user_id`, and user trigram search.
- Keep limits bounded. Existing answer listing rejects `limit > 100`; preserve this or an equivalent bound.
- For expensive features, prefer a measurable optimization such as an index, SQL-level filtering, caching through Rails cache/Redis/Solid Cache, or a background job through Solid Queue.

## Deployment And Environment Guidelines

- `Dockerfile` exists for the Rails app, but the grading rubric also expects all services to run with one `docker-compose` command. Add `docker-compose.yml` if deployment work is requested.
- A good compose setup should include app, PostgreSQL, and Redis services, with volumes and health checks where practical.
- Add `.env.example` with safe placeholder values for `DATABASE_URL`, `REDIS_URL`, `RAILS_MASTER_KEY` or `SECRET_KEY_BASE`, and any deployed host settings.
- Never require manual code edits for local or deployed config; use environment variables.
- If a deployed URL exists, put it in `README.md`. Do not invent a deployment URL.
- Keep production config consistent with the actual database adapter. If using PostgreSQL in production, make `config/database.yml` and Docker/Kamal settings match PostgreSQL.

## Documentation Guidelines

Update `README.md` when changes affect setup, architecture, deployment, or user-visible behavior. README should include:

- Project idea in Russian or English: an event request/ticket form system.
- Main user and admin capabilities.
- Tech stack and high-level architecture: Rails backend/API, React frontend, PostgreSQL, Redis sessions.
- Local setup commands, required services, DB initialization, and how to create demo/admin data.
- Test/build/security commands.
- Docker/docker-compose instructions once compose exists.
- Deployed link if available.
- A short 5-minute demo script: register/login, submit a form, admin creates/edits form, admin filters answers, admin opens answer details, architecture and security explanation.

## Grading Rubric Guardrails

Use this project-specific checklist to maximize the requested rubric score.

### Функциональность

- Keep all main scenarios complete: registration, login, form listing, form creation/editing, answer submission/editing, answer review/list/detail.
- Ensure create, read, update, and delete-like actions work where meaningful: users register/login/logout, admins create/edit/delete forms, users create/update answers, admins view/filter answers.
- Handle user errors in UI and API: empty fields, invalid formats, invalid dates, missing records, closed forms, duplicate emails, invalid credentials, unauthorized access.
- Keep the app feeling like one service: React pages should share navigation, state handling, visual style, and clear transitions.
- Align every feature with the product idea: event request forms and review workflow.

### Архитектура И Качество Кода

- Keep backend controllers/models/config separated from frontend components and database migrations.
- Organize backend logic into controllers, models, helpers/concerns, and config instead of one large action when logic grows.
- Keep frontend split by page/component. Do not put all new UI logic into one huge component if it clearly belongs in reusable child components.
- Keep API URLs, methods, response statuses, and response shapes consistent.
- Remove gross duplication and unused code when it is part of the touched area.

### База Данных И ORM

- Use PostgreSQL and Active Record models, not ad-hoc files or raw persistence.
- Preserve and strengthen relationships between users, forms, and answers.
- Provide clear DB setup instructions through `bin/rails db:prepare`, migrations, and seeds/demo data.

### Безопасность

- Test SQL injection attempts in URL params, JSON bodies, and text fields.
- Test XSS payloads in form names, field labels/options/descriptions, and answer values.
- Fix CSRF for cookie-authenticated state-changing endpoints before claiming full security points.
- Verify password hashes only; no raw passwords in DB, logs, API, fixtures, or seeds.
- Verify protected pages/API endpoints fail without login.
- Verify normal users cannot access admin APIs or other users' answers by changing IDs.
- Check `git status` before finalizing and make sure no real secrets or production config are added.

### Оптимизация И Производительность

- Use `includes`/preloading for answer serializers that access users.
- Use `limit`, `offset`, and bounded pagination for large answer lists.
- Keep search/filter/sort in SQL/Active Record relations.
- Preserve or add indexes for JSONB, trigram search, foreign keys, status, and date filters as needed.

### Развертывание

- Add and maintain `docker-compose.yml` for app + PostgreSQL + Redis if deployment criteria are in scope.
- Add `.env.example` and keep real `.env` ignored.
- Document the deployed URL if one exists.
- Ensure app startup does not require source-code edits.

### Документация И Презентация

- README must explain the idea, features, stack, setup, DB init, tests, Docker, and deployment.
- Include a short demo/admin credential strategy through safe seeds or instructions.
- Keep a defense/demo checklist ready: user flow, admin flow, architecture, database schema, security protections, performance choices.

## Known Gaps To Prioritize Before Final Grading

- `AGENTS.md` was previously empty; keep it updated when architecture changes.
- Controller tests are currently placeholders; add meaningful integration tests for important flows.
- README is currently too short for the documentation rubric.
- No `docker-compose.yml` or `.env.example` exists yet.
- CSRF protection is currently skipped in `AuthController` and `FormsController`; this is a direct security-rubric risk.
- API routes are functional but not fully REST-style; if refactoring, do it consistently and keep the frontend in sync.
- `config/database.yml` should be reviewed before deployment to ensure environment database settings match the intended PostgreSQL setup.
