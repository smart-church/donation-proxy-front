## Инструкция для запуска проекта

### 1. Требования
- Python 3.10+
- Node.js 18+
- MongoDB запущен локально или доступен удалённо

---

## Backend

```powershell
cd backend
python -m venv venv
venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Создайте файл `backend\.env` со следующим содержимым:

```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=evman
```

Запуск backend:

```powershell
venv\Scripts\python.exe -m uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

Проверка:
```powershell
curl -s http://127.0.0.1:8000/api/health
```

Ожидаемый ответ:
```json
{"status":"ok","service":"evman"}
```

---

## Frontend

В этой среде `yarn` не установлен, поэтому используем `npm`.

```powershell
cd frontend
npm install
npm start
```

Проверка:
- Откройте `http://localhost:3000`

---

## Итоговые рабочие команды

### Backend (PowerShell или Bash)

**Первый запуск (установка зависимостей):**
```powershell
cd c:\Users\Георгий\donation-proxy-front-\backend
python -m venv venv
venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn server:app --reload --host 127.0.0.1 --port 8000
```

**Последующие запуски:**
```powershell
cd c:\Users\Георгий\donation-proxy-front-\backend
python -m uvicorn server:app --reload --host 127.0.0.1 --port 8000
```

**Или в Bash:**
```bash
cd c:/Users/Георгий/donation-proxy-front-/backend
python.exe -m uvicorn server:app --reload --host 127.0.0.1 --port 8000
```

### Frontend (в отдельном терминале)

**Первый запуск:**
```bash
cd c:/Users/Георгий/donation-proxy-front-/frontend
npm install
npm start
```

**Последующие запуски:**
```bash
cd c:/Users/Георгий/donation-proxy-front-/frontend
npm start
```

### Проверка статуса
- Backend: `curl http://127.0.0.1:8000/api/health`
- Frontend: http://localhost:3000