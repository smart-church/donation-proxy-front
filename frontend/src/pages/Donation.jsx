import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as api from "../mock/api";
import { PublicShell } from "./PublicForm";
import { redirectToNspk } from "../lib/donationNavigation";

export default function Donation({ resultOnly = false }) {
  const { regId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let alive = true, timer;
    const load = async (poll = false, count = 0) => {
      setBusy(true);
      try {
        const response = await api.getDonation(regId, resultOnly || poll);
        if (!alive) return;
        setError("");
        setResult(response);
        if (response.success_url) { navigate(response.success_url, { replace: true }); return; }
        if (!resultOnly && response.payment_url) { redirectToNspk(response.payment_url); return; }
        if ((response.status === "creating" || (resultOnly && response.status === "pending" && !response.code)) && count < 10) {
          timer = setTimeout(() => load(true, count + 1), 6000);
        }
      } catch (err) {
        if (alive) setError(err.message_ru || "Не удалось проверить поступление. Попробуйте позже.");
      } finally {
        if (alive) setBusy(false);
      }
    };
    load();
    return () => { alive = false; clearTimeout(timer); };
  }, [regId, resultOnly, navigate, revision]);

  const uncertain = result?.status === "creation_unknown" || result?.status === "review";
  return <PublicShell title="Пожертвование" hint="">
    <h1 className="text-2xl font-bold mb-4">{busy && !result ? "Проверяем поступление…" : "Пожертвование"}</h1>
    {error && <p role="alert" className="mb-4" style={{ color: "var(--danger)" }}>{error}</p>}
    {result && <div className="space-y-4 mb-5">
      <p>{uncertain ? "Поступление уточняется. Не совершайте повторное пожертвование, пока проверка не завершится." :
        result.status === "creating" ? "Готовим ссылку для пожертвования…" :
        result.status === "not_required" ? "Для этой регистрации пожертвование не предусмотрено." :
        result.status === "refunded" ? "Пожертвование возвращено." :
        result.status === "partially_refunded" ? "Пожертвование частично возвращено." :
        "Поступление пожертвования пока не подтверждено."}</p>
      {result.code === "VTB_NOT_CONFIGURED" && <p>Возможность совершить пожертвование пока не настроена. Попробуйте позже.</p>}
    </div>}
    <button className="btn btn-primary" disabled={busy} onClick={() => setRevision((n) => n + 1)}>
      {busy ? "Проверяем…" : resultOnly || uncertain ? "Проверить поступление" : "Продолжить пожертвование"}
    </button>
  </PublicShell>;
}
