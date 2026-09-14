# donation-proxy-front

[Деплой UI и backend на REG.RU / ISPmanager](docs/wiki/deploy.md).

## Локальный запуск вместе с API

Сначала запустите MySQL и Django из соседнего репозитория:

```bash
cd ../donation-proxy
docker compose -f docker/docker-compose.yaml up -d db
PYTHONPATH=src ./venv/bin/python src/manage.py migrate
PYTHONPATH=src DEBUG=true ALLOWED_HOSTS=127.0.0.1,localhost ./venv/bin/python src/manage.py runserver 127.0.0.1:8000
```

Во втором терминале запустите React:

```bash
cd frontend
npm install
npm start
```

Frontend будет доступен на http://localhost:3000 и проксирует относительные
API-запросы в Django на http://127.0.0.1:8000. Для отдельного API-хоста задайте
`REACT_APP_API_URL` перед запуском frontend.

Общая загрузка файлов для этапов B–D подготовлена в `frontend/src/components/FileUploader.jsx`: допустимые расширения (включая `.doc`/`.docx`) и лимиты загружаются из API. В этапе B компонент подключён к письмам и шаблонам: загрузка, отмена, повтор, защищённое скачивание и статусы исходящих.

Материалы вопросов (этап C): файлы и ссылки добавляются в редакторе анкеты, включая разделители. Автосохранение учитывает загрузку и порядок вопросов; публичные материалы доступны только во время открытой регистрации.
