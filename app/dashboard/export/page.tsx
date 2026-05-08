"use client";

import Link from "next/link";
import { useState } from "react";

export default function ExportPage() {
  const [type, setType] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function handleExport() {
    const params = new URLSearchParams();

    params.set("type", type);

    if (from) {
      params.set("from", from);
    }

    if (to) {
      params.set("to", to);
    }

    window.location.href = `/api/export-requests?${params.toString()}`;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold">Export Excel</h1>

        <p className="mt-2 text-slate-600">
          เลือกประเภทรายการและช่วงวันที่ที่ต้องการ export
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              ประเภทรายการ
            </label>

            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="all">ทั้งหมด</option>
              <option value="ot">OT</option>
              <option value="shift">เปลี่ยนกะ</option>
              <option value="dayoff">เปลี่ยนวันหยุด</option>
              <option value="leave">ขอลา</option>
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                วันที่เริ่มต้น
              </label>

              <input
                type="text"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="เช่น 2026-05-01"
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                วันที่สิ้นสุด
              </label>

              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="เช่น 2026-05-31"
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white"
            >
              Export Excel
            </button>

            <Link
              href="/dashboard"
              className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white"
            >
              กลับ Dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}