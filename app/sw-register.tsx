"use client";

import { useEffect } from "react";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const url = `${BASE_PATH}/sw.js`;
    navigator.serviceWorker
      .register(url, { scope: `${BASE_PATH}/` })
      .catch(() => {
        /* 등록 실패는 무시 (오프라인 캐싱만 못 쓸 뿐 앱은 동작) */
      });
  }, []);

  return null;
}
