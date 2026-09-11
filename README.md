# donation-proxy-front

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
