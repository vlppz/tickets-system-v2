# Tickets System V2

## Система заявок на мероприятия

Tickets System V2 - веб-сервис для приема, редактирования и проверки заявок на мероприятия. Пользователь регистрируется, выбирает доступную форму, заполняет заявку и отслеживает ее статус. Администратор создает формы, просматривает ответы, фильтрует заявки, принимает решение и ведет переписку с пользователем.

Публичная ссылка на развернутую версию: пока не указана в репозитории.

## Основные возможности

- Регистрация пользователя по фамилии, имени, отчеству, email и паролю.
- Вход, выход и проверка текущей сессии через Redis-backed Rails sessions.
- Просмотр доступных форм заявок после авторизации.
- Заполнение заявки по форме с полями `text`, `textarea`, `number`, `select`, `checkbox`.
- Серверная проверка структуры ответа, типов полей, обязательных полей и условно обязательных полей.
- Повторное открытие и редактирование собственной заявки.
- Просмотр статуса своей заявки: `waiting`, `approved`, `edits_required`, `declined`.
- Обсуждение заявки: администратор оставляет комментарии, пользователь отвечает из карточки своей заявки.
- Email-уведомления пользователю при изменении статуса заявки или новом комментарии администратора.
- Админ-панель со списком форм, поиском по названию, созданием и редактированием форм.
- Конструктор форм с drag-and-drop на desktop и отдельным мобильным режимом.
- Админский список ответов по форме с пагинацией, поиском, фильтром по статусу, датам и значениям полей.
- Детальная страница ответа для администратора с данными пользователя, ответами, статусом и историей комментариев.
- Админское изменение статуса заявки с комментарием.
- Backend-эндпоинт для удаления формы: `DELETE /api/forms/delete`.

## Роли и сценарии

Пользователь:

- Регистрируется или входит в существующий аккаунт.
- Видит доступные заявки на главной странице.
- Открывает форму, заполняет обязательные поля и отправляет заявку.
- Видит отправленную заявку в разделе заполненных заявок.
- Редактирует свою заявку, если нужно обновить данные.
- Следит за статусом проверки и отвечает на комментарии администратора.

Администратор:

- Входит в аккаунт с `is_admin: true`.
- Открывает `/admin/forms` и видит список форм.
- Создает форму на `/forms/builder` или редактирует существующую форму.
- Настраивает поля, варианты выбора, обязательность и условную обязательность.
- Открывает `/admin/answers`, выбирает форму и фильтрует заявки.
- Открывает детальную страницу ответа, меняет статус и оставляет комментарий.
- Проверяет, что пользователь получает понятный статус и может продолжить переписку.

## Статусы заявки

| Статус | Значение |
| --- | --- |
| `waiting` | Заявка ожидает проверки администратором. |
| `approved` | Заявка принята. |
| `edits_required` | Администратор запросил исправления. |
| `declined` | Заявка отклонена. |

## Технологический стек

| Слой | Технологии |
| --- | --- |
| Backend | Ruby `3.4.8`, Rails `8.1.2`, Puma, Active Record |
| Frontend | React `19`, `react-dom`, `lucide-react`, `react-hot-toast` |
| Сборка JS | `jsbundling-rails`, esbuild, pnpm |
| База данных | PostgreSQL, JSON/JSONB поля, Active Record ORM |
| Сессии | Redis через `redis-session-store` |
| Очереди и email | Active Job, Solid Queue, Action Mailer |
| Безопасность паролей | `has_secure_password`, bcrypt, `password_digest` |
| Деплой | Dockerfile, Docker Compose |

## Архитектура

- Rails-монолит отдает HTML-страницу и JSON API.
- React SPA находится в `app/javascript/components` и выбирает страницу по `window.location.pathname`.
- Backend-контроллеры находятся в `app/controllers`.
- Модели Active Record находятся в `app/models`.
- Миграции и схема базы данных находятся в `db/migrate` и `db/schema.rb`.
- Маршруты страниц и API описаны в `config/routes.rb`.
- Сессии хранятся в Redis, cookie настроены как `httponly`, `same_site: :lax`, `secure` включается в production.
- Email-уведомления отправляет `TicketStatusMailer` через Active Job.
- Конфигурация окружения хранится в переменных окружения и безопасном примере `.env.example`.

## Важные файлы

| Файл | Назначение |
| --- | --- |
| `app/controllers/application_controller.rb` | `current_user`, `require_login`, `require_admin`. |
| `app/controllers/auth_controller.rb` | Регистрация, вход, выход, текущий пользователь. |
| `app/controllers/forms_controller.rb` | Формы, ответы, фильтры, статусы, комментарии. |
| `app/models/user.rb` | Пользователь, `has_secure_password`. |
| `app/models/form.rb` | Форма заявки. |
| `app/models/answer.rb` | Ответ пользователя, статусы и комментарии. |
| `app/javascript/components/App.jsx` | Простой SPA-роутер. |
| `app/javascript/components/LoginPage.jsx` | Вход и регистрация. |
| `app/javascript/components/MainPage.jsx` | Главная страница пользователя. |
| `app/javascript/components/FormBuilderPage.jsx` | Админский конструктор форм. |
| `app/javascript/components/AdminFormsPage.jsx` | Список форм администратора. |
| `app/javascript/components/AdminAnswersPage.jsx` | Список, поиск, фильтры и пагинация ответов. |
| `app/javascript/components/AdminAnswerDetailsPage.jsx` | Детальная проверка заявки. |
| `app/javascript/components/FormRenderer.jsx` | Отрисовка формы и отправка ответа. |
| `app/javascript/lib/ticketWorkflow.js` | Подписи статусов и форматирование комментариев. |
| `config/database.yml` | Настройки подключения к БД. |
| `config/initializers/session_store.rb` | Redis session store. |
| `docker-compose.yml` | Запуск app, PostgreSQL и Redis одной командой. |
| `.env.example` | Безопасный пример переменных окружения. |

## База данных и ORM

| Сущность | Назначение | Связи |
| --- | --- | --- |
| `User` | Пользователь или администратор. | Имеет много `answers` через `Answer.user_id`. |
| `Form` | Описание формы заявки. | Имеет много `answers` через `Answer.form_id`. |
| `Answer` | Заявка пользователя по конкретной форме. | Принадлежит `User` и `Form`. |

- `users.password_digest` хранит bcrypt-хеш пароля, исходный пароль в базу не записывается.
- `forms.content` хранит структуру формы в JSON.
- `answers.answer` хранит ответы пользователя в JSONB.
- `answers.comments` хранит историю обсуждения заявки.
- `answers.status` хранит статус проверки и ограничен enum-значениями.
- В схеме есть внешние ключи `answers.user_id -> users.id` и `answers.form_id -> forms.id`.
- Для поиска и фильтрации используются индексы PostgreSQL: GIN по ответам, trigram-индексы по тексту ответов и данным пользователя, индексы по `form_id`, `user_id`, `status`.

## API

| Метод | URL | Доступ | Назначение |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Гость | Регистрация пользователя. |
| `POST` | `/api/auth/login` | Гость | Вход и создание сессии. |
| `DELETE` | `/api/auth/logout` | Пользователь | Сброс сессии. |
| `GET` | `/api/auth/me` | Любой | Текущий пользователь или `nil`. |
| `POST` | `/api/forms/create` | Администратор | Создание формы. |
| `GET` | `/api/forms/all` | Пользователь | Список форм. |
| `GET` | `/api/forms/one?id=...` | Пользователь | Получение одной формы. |
| `POST` | `/api/forms/update` | Администратор | Обновление формы. |
| `DELETE` | `/api/forms/delete` | Администратор | Удаление формы. |
| `POST` | `/api/forms/answer` | Пользователь | Создание или обновление своей заявки. |
| `GET` | `/api/forms/answers/my?form_id=...` | Пользователь | Получение своей заявки по форме. |
| `POST` | `/api/forms/answers` | Администратор | Список ответов с фильтрами и пагинацией. |
| `GET` | `/api/forms/answers/one?answer_id=...` | Администратор | Детальная информация по ответу. |
| `PATCH` | `/api/forms/answers/status` | Администратор | Изменение статуса и добавление комментария. |
| `POST` | `/api/forms/answers/reply` | Владелец заявки | Ответ пользователя в обсуждении заявки. |
| `GET` | `/api/state` | Любой | Состояние приложения. |
| `GET` | `/api/version` | Любой | Версия приложения. |

## Локальный запуск

Требования:

- Ruby `3.4.8`.
- PostgreSQL на `localhost:5432`.
- Redis на `redis://localhost:6379/0`.
- pnpm для установки JavaScript-зависимостей.
- Bundler для Ruby-зависимостей.

Подготовка окружения:

```bash
cp .env.example .env
bundle install
pnpm install
bin/rails db:prepare
pnpm build
bin/rails server -p 3000
```

Во время разработки удобно держать сборку JavaScript в watch-режиме:

```bash
pnpm build --watch
```

В отдельном терминале запускается Rails:

```bash
bin/rails server -p 3000
```

После запуска приложение доступно локально по адресу `http://localhost:3000`.

## Переменные окружения

Пример находится в `.env.example`.

| Переменная | Назначение |
| --- | --- |
| `DATABASE_URL` | Подключение к PostgreSQL. |
| `REDIS_URL` | Подключение к Redis для сессий. |
| `SECRET_KEY_BASE` | Секрет Rails для production-like окружения. |
| `MAIL_FROM` | Отправитель email-уведомлений. |
| `SMTP_ADDRESS` | SMTP-хост. |
| `SMTP_PORT` | SMTP-порт. |
| `SMTP_DOMAIN` | SMTP-домен. |
| `SMTP_USERNAME` | SMTP-пользователь. |
| `SMTP_PASSWORD` | SMTP-пароль. |
| `SMTP_AUTHENTICATION` | Метод SMTP-аутентификации. |
| `SMTP_ENABLE_STARTTLS_AUTO` | Включение STARTTLS. |

Реальные `.env`, `.env.development` и `.env.production` не должны попадать в git.

## Создание администратора для демонстрации

Автоматические demo-seeds пока не добавлены. Для локальной демонстрации можно создать пользователя через интерфейс регистрации, затем выдать ему права администратора в Rails console:

```bash
bin/rails console
```

```ruby
User.find_by!(email: "admin@example.com").update!(is_admin: true)
```

Также можно создать администратора сразу из консоли:

```ruby
User.create!(surname: "Admin", name: "Admin", second_name: "Admin", email: "admin@example.com", password: "password", is_admin: true)
```

## Email-уведомления

- При изменении статуса заявки отправляется `TicketStatusMailer#status_changed`.
- Если администратор добавил только комментарий без смены статуса, пользователю тоже отправляется email.
- SMTP настраивается через переменные `MAIL_FROM`, `SMTP_ADDRESS`, `SMTP_PORT`, `SMTP_DOMAIN`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_AUTHENTICATION`, `SMTP_ENABLE_STARTTLS_AUTO`.
- Отправка идет через Active Job, поэтому в production нужен worker Solid Queue или `SOLID_QUEUE_IN_PUMA=1`.

## Проверка качества

Основные команды:

```bash
bin/rails test
bundle exec rubocop
bundle exec brakeman
bundle exec bundler-audit check --update
pnpm build
SECRET_KEY_BASE_DUMMY=1 bin/rails assets:precompile
```

## Docker и развертывание

- В проекте есть `Dockerfile` для сборки Rails-приложения.
- В проекте есть `docker-compose.yml` для запуска приложения, PostgreSQL и Redis одной командой.
- В проекте есть `.env.example` с безопасными placeholder-значениями.
- Compose запускает production-like контейнер Rails на `http://localhost:3000`, PostgreSQL и Redis с отдельными volumes.
- Перед реальным production-деплоем нужно заменить demo-секреты, проверить host-настройки и указать реальную публичную ссылку.

Запуск через Docker Compose:

```bash
docker compose up --build
```

Остановка контейнеров:

```bash
docker compose down
```

Остановка с удалением volumes PostgreSQL и Redis:

```bash
docker compose down -v
```

Сборка Docker-образа:

```bash
docker build -t tickets_system_v2 .
```

Production-like проверка assets без реального master key:

```bash
SECRET_KEY_BASE_DUMMY=1 bin/rails assets:precompile
```

## Безопасность

Что в проекте:

- Пароли хранятся через `has_secure_password` и bcrypt в поле `password_digest`.
- API-ответы с пользователем исключают `password_digest`.
- Закрытые API используют `before_action :require_login`.
- Админские API используют `before_action :require_admin`.
- Пользователь получает свою заявку через `user_id: current_user.id`, а ответ в обсуждении разрешен только владельцу заявки.
- SQL-запросы с пользовательским вводом используют Active Record, hash-условия или параметризованные placeholders.
- Ответы администратора загружаются через `includes(:user)`, чтобы не создавать N+1 при сериализации пользователей.
- Пользовательские значения в React выводятся как текст, без ручной вставки HTML в исходных компонентах.
- CSRF protection включен в Rails; state-changing React-запросы отправляют `X-CSRF-Token` из meta-тега `csrf-token`.
- Logout выполняется через `DELETE /api/auth/logout`, а не через `GET`, поэтому сторонняя страница не может выполнить его простой ссылкой или картинкой.
- Сессии хранятся в Redis, cookie `httponly`, `same_site: :lax`, `secure` включается в production.
- Реальные секреты должны храниться в `.env` или production secret store, в git остается только `.env.example`.

## Производительность

- Список админских ответов использует пагинацию через `page`, `limit`, `offset` и ограничивает `limit <= 100`.
- Поиск, статус, даты, пользователь и фильтры по полям применяются на уровне SQL/Active Record relation до загрузки записей.
- Для сериализации ответов вместе с пользователями используется `includes(:user)`.
- Для JSONB-ответов, trigram-поиска, статуса и внешних ключей есть индексы PostgreSQL.
- Redis используется для хранения сессий, что отделяет session storage от процесса Rails.
