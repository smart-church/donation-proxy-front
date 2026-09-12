# Деплой UI и backend на REG.RU с ISPmanager

Инструкция описывает проверенную 12 сентября 2026 года схему для
`https://dev.evman.ru`: React, Django, MySQL и Django-Q на одном хостинге.
Используется Passenger из панели, без Gunicorn, systemd и отдельного Node.js-сервера.
Python 3.9.0 — версия фактически настроенного окружения, а не рекомендация для нового сервера.
Обновление Python и зависимостей нужно проверять отдельно.

Основа: [инструкция REG.RU по Django](https://help.reg.ru/support/hosting/php-asp-net-i-skripty/kak-ustanovit-django-na-hosting).
Не выполняйте из неё удаление каталога сайта или `startproject`: проект уже существует.

## 1. Пути и схема запуска

В примерах используется пользователь `u1751162`. Для другого аккаунта замените
его имя и домен во всех путях, настройках и командах.

```text
/var/www/u1751162/data/
├── venv/                         # окружение Python 3.9.0
├── run-dev-evman-worker.sh
├── logs/dev-evman-worker.log
├── deploy-backups/
└── www/dev.evman.ru/
    ├── requirements.txt
    ├── src/
    │   ├── .env                  # существующие секреты; сохранить!
    │   ├── manage.py
    │   ├── config/
    │   │   ├── settings.py
    │   │   ├── settings_hosting.py
    │   │   └── urls_hosting.py
    │   └── proxy/
    └── public/                   # DocumentRoot и PassengerAppRoot в ISPmanager
        ├── index.html
        ├── asset-manifest.json
        ├── static/               # сборка React
        ├── django-static/        # collectstatic Django
        ├── passenger_wsgi.py     # точка входа именно внутри public/
        └── tmp/restart.txt
```

Nginx обслуживает HTTPS и статику, Apache/Passenger запускает Django.
Страницы интерфейса получают React `index.html`. Запросы `/api/*` и
`/form/<id>/submit` обрабатывает Django. Django-Q читает очередь из той же MySQL-базы.

## 2. Подготовка ISPmanager

1. Направьте DNS домена на хостинг и создайте отдельный сайт `dev.evman.ru`.
2. Установите корневой каталог сайта `www/dev.evman.ru/public`.
3. В настройках сайта включите Python и CGI, выберите Python **3.9.0**.
4. Выпустите и подключите Let's Encrypt, включите перенаправление HTTP → HTTPS.
5. Создайте MySQL-базу и пользователя с правами на неё. Сохраните точные имена из панели.

На этом хостинге панель устанавливает `PassengerAppRoot` равным `DocumentRoot`.
Поэтому `passenger_wsgi.py` только в `www/dev.evman.ru/` недостаточно:
он должен находиться в `www/dev.evman.ru/public/`.

Не заменяйте автоматически созданные конфиги Nginx/Apache вручную.
На обычном хостинге изменение этих параметров выполняется через панель.

## 3. Сборка и загрузка UI

На локальном компьютере, из репозитория `donation-proxy-front`:

```bash
cd frontend
npm ci
REACT_APP_API_URL= npm run build
```

Пустой `REACT_APP_API_URL` означает запросы к тому же домену, где открыт UI.
Например, `/api/v1/events` отправится на `https://dev.evman.ru/api/v1/events`.
Значение встраивается при сборке. Настройка `proxy` в `package.json` работает
только в режиме разработки.

Загрузите **содержимое** `build/` в `www/dev.evman.ru/public/` через SFTP
или архив и файловый менеджер. `index.html` должен лежать прямо в `public/`,
без вложенной папки `build`.

При обновлении сначала загрузите новые файлы `static/`, затем `index.html`
и `asset-manifest.json`. Старые файлы с хешами можно временно оставить для
уже открытых вкладок. Не очищайте `public/` целиком: там находятся
`passenger_wsgi.py`, статика Django и служебные файлы хостинга.

## 4. Backend и окружение

Подключение с локального компьютера:

```bash
ssh -o ConnectTimeout=180 u1751162@31.31.198.35
```

Загрузите содержимое репозитория backend `donation-proxy` в
`~/www/dev.evman.ru/`. Не переносите локальные `venv`, `.git`, кеши Python
и локальный `.env`. **Не удаляйте и не перезаписывайте серверный `src/.env`.**

Если окружения ещё нет, на сервере:

```bash
/opt/python/python-3.9.0/bin/python -m venv ~/venv
~/venv/bin/python -m pip install -r ~/www/dev.evman.ru/requirements.txt
```

Если `~/venv` уже существует, сначала проверьте `~/venv/bin/python --version`.
Не пересоздавайте окружение, используемое другими сайтами. Версия Python
в панели и окружении должна совпадать.

В существующем `.env` должны быть `SECRET_KEY`, реквизиты MySQL и SMTP.
Для новой установки используйте `src/example.env`, заполните реальные значения
и установите права:

```bash
chmod 600 ~/www/dev.evman.ru/src/.env
```

На настроенном сайте содержимое `.env` оставлено без изменений. Отличающиеся
параметры хостинга вынесены в отдельный файл ниже.

## 5. Настройки Django для хостинга

Создайте `src/config/settings_hosting.py`:

```python
from .settings import *

DEBUG = False
SITE_URL = "https://dev.evman.ru"
ALLOWED_HOSTS = ["dev.evman.ru", "www.dev.evman.ru"]

# На этом хостинге localhost использует локальный Unix-сокет MySQL.
# Через 127.0.0.1 возникала ошибка caching_sha2_password (2061).
if DATABASES["default"]["HOST"] == "127.0.0.1":
    DATABASES["default"]["HOST"] = "localhost"
DATABASES["default"].setdefault("OPTIONS", {})["init_command"] = (
    "SET sql_mode='STRICT_TRANS_TABLES'"
)

ROOT_URLCONF = "config.urls_hosting"
STATIC_URL = "/django-static/"
STATIC_ROOT = BASE_DIR.parent / "public" / "django-static"
CSRF_TRUSTED_ORIGINS = ["https://dev.evman.ru"]

# Проверено в конфиге этого сайта: Nginx перезаписывает заголовок,
# затем передаёт запрос Apache/Passenger.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

Q_CLUSTER = dict(Q_CLUSTER)
Q_CLUSTER["workers"] = 1
Q_CLUSTER.pop("cpu_affinity", None)
```

Не применяйте замену адреса базы на `localhost`, если MySQL находится на другом
сервере. Доверять `X-Forwarded-Proto` можно только при его перезаписи доверенным
прокси — для другого хостинга это нужно проверить.

Создайте `src/config/urls_hosting.py`:

```python
from django.conf import settings
from django.http import FileResponse
from django.urls import re_path
from .urls import urlpatterns as api_patterns


def frontend(request, **kwargs):
    response = FileResponse(
        open(settings.BASE_DIR.parent / "public" / "index.html", "rb"),
        content_type="text/html",
    )
    response["Cache-Control"] = "no-cache"
    return response


urlpatterns = [
    re_path(r"^form/[0-9]+(?:/(?:success|fail))?/?$", frontend),
] + api_patterns + [
    re_path(
        r"^(?:(?:login|reset-password|events|profile|participant|organizers|admins)(?:/.*)?)?$",
        frontend,
    ),
]
```

Порядок важен: страницы `/form/<id>` и `/form/<id>/success` должны открывать
React, а `/form/<id>/submit` — попадать в существующий обработчик Django.
При добавлении новых корневых маршрутов UI расширьте список в последнем выражении.

## 6. Точка входа Passenger

Создайте **`public/passenger_wsgi.py`**:

```python
import os
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root / "src"))
sys.path.insert(1, "/var/www/u1751162/data/venv/lib/python3.9/site-packages")
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings_hosting"

from django.core.wsgi import get_wsgi_application

application = get_wsgi_application()
```

## 7. Миграции, статика и администратор

На сервере:

```bash
cd ~/www/dev.evman.ru
~/venv/bin/python src/manage.py check --settings=config.settings_hosting
~/venv/bin/python src/manage.py migrate --settings=config.settings_hosting --noinput
~/venv/bin/python src/manage.py collectstatic --settings=config.settings_hosting --noinput
~/venv/bin/python src/manage.py createsuperuser --settings=config.settings_hosting
```

`createsuperuser` нужен при первом запуске. Email и пароль задайте интерактивно;
не помещайте пароль в команды, документацию или Git.

Не запускайте `makemigrations` при деплое: применяйте миграции из репозитория.
`collectstatic` собирает статику Django в `public/django-static/` и не заменяет
`npm run build`.

На настроенном сервере `manage.py` также использует `config.settings_hosting`
по умолчанию. Команды выше указывают настройки явно, поэтому работают и после
загрузки обычного `manage.py` из репозитория.

## 8. Фоновый обработчик Django-Q

Создайте `~/run-dev-evman-worker.sh`:

```sh
#!/bin/sh
umask 077
exec 9>/var/www/u1751162/data/dev-evman-worker.lock
flock -n 9 || exit 0
cd /var/www/u1751162/data/www/dev.evman.ru/src || exit 1
exec /var/www/u1751162/data/venv/bin/python manage.py qcluster --settings=config.settings_hosting >> /var/www/u1751162/data/logs/dev-evman-worker.log 2>&1
```

```bash
chmod 700 ~/run-dev-evman-worker.sh
mkdir -p ~/logs
```

В планировщике ISPmanager или через `crontab -e` добавьте одну строку,
**сохранив существующие задания других сайтов**:

```cron
* * * * * /var/www/u1751162/data/run-dev-evman-worker.sh
```

Первый запуск:

```bash
nohup ~/run-dev-evman-worker.sh </dev/null >/dev/null 2>&1 &
```

`flock` предотвращает одновременный запуск нескольких экземпляров. Если процесс
завершится, cron запустит его снова в следующую минуту. Redis не нужен:
в `Q_CLUSTER` используется MySQL (`orm: default`). Возможность долгоживущих
процессов и cron зависит от тарифа; на данном аккаунте запуск проверен.

Проверяйте размер журнала и настройте его ротацию при регулярной эксплуатации.
После изменения кода задач или настроек перезапустите и worker: найдите его PID
через `ps -u "$USER" -o pid,args`, проверьте путь и аргумент
`qcluster --settings=config.settings_hosting`, затем отправьте `kill -TERM PID`
именно родительскому процессу этого кластера. Cron восстановит его запуск.
Не используйте `pkill python`: на аккаунте могут работать другие приложения.

## 9. Перезапуск и проверки

После изменения Python-кода:

```bash
mkdir -p ~/www/dev.evman.ru/public/tmp
touch ~/www/dev.evman.ru/public/tmp/restart.txt
```

REG.RU также документирует перезапуск через файл `.restart-app` в корневом
каталоге сайта, то есть для этой конфигурации `public/.restart-app`.

```bash
curl -I https://dev.evman.ru/
curl -I https://dev.evman.ru/events
curl -i https://dev.evman.ru/api/v1/events
```

Ожидается: страницы UI — `200`, API без входа — `401` и JSON с требованием
авторизации. TLS должен проверяться без `curl -k`. В браузере проверьте вход,
обновление страницы `/events`, создание мероприятия и отправку публичной формы.
Отправку писем проверяйте отдельно на согласованный тестовый адрес.

Журналы:

```bash
tail -n 50 ~/logs/dev.evman.ru.error.log
tail -n 50 ~/logs/dev-evman-worker.log
```

## 10. Обновление и резервные копии

1. Сохраните резервную копию базы через панель и копию изменяемых файлов вне `public/`.
2. Загрузите backend, сохранив `src/.env`, `settings_hosting.py`, `urls_hosting.py`
   и `public/passenger_wsgi.py`. Не используйте синхронизацию с удалением этих файлов.
3. Если изменились зависимости, установите их в правильное окружение.
4. Выполните `check`, `migrate` и `collectstatic` с `--settings=config.settings_hosting`.
5. Загрузите новую сборку UI, перезапустите Passenger и worker, выполните проверки.

Откат Python-файлов сам по себе не откатывает схему базы. Перед откатом оцените
совместимость миграций; восстановление базы из копии может потерять новые записи.
Временный SSH-доступ после завершения работ отзывается удалением только строки
соответствующего ключа из `~/.ssh/authorized_keys`.

## Частые ошибки

| Симптом | Проверка и исправление |
| --- | --- |
| `serializers.BigIntegerField` отсутствует | Загрузите актуальный backend: сериализаторы используют `serializers.IntegerField`. `models.BigIntegerField` и миграции менять не нужно. |
| MySQL `2061`, `Authentication requires secure connection` | Для локальной базы данного хостинга проверен `localhost` вместо `127.0.0.1`. Используйте hosting-настройки. |
| UI открывается, API получает HTML 404 | Проверьте включение Python, `PassengerAppRoot` и наличие `public/passenger_wsgi.py`. |
| После обновления `/events` появляется 404 | Проверьте `ROOT_URLCONF = "config.urls_hosting"` и маршруты React. |
| Циклический HTTPS-редирект | Проверьте передачу и доверие `X-Forwarded-Proto` в конфигурации прокси. |
| `collectstatic` требует `STATIC_ROOT` | Запускайте с `--settings=config.settings_hosting`. |
| Письма остаются в очереди | Проверьте worker, cron, журнал задач и SMTP-реквизиты. |
| SSH долго не отвечает | Используйте `ConnectTimeout=180`; закрытие соединения сервером этот параметр не исправляет. |
