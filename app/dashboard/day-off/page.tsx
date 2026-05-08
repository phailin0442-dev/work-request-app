"use client";

import Link from "next/link";
import { useState } from "react";

export default function DayOffPage() {
  const [oldDayOff, setOldDayOff] = useState("");
  const [newDayOff, setNewDayOff] = useState("");
  const [reason, setReason] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/day-off-change-request", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          old_day_off: oldDayOff,
          new_day_off: newDayOff,
          reason,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setMessage(data.message || "บันทึกไม่สำเร็จ");
        return;
      }

      setMessage("ส่งคำขอเปลี่ยนวันหยุดสำเร็จแล้ว");
      setOldDayOff("");
      setNewDayOff("");
      setReason("");
    } catch (error: any) {
      setMessage(error?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold">ขอเปลี่ยนวันหยุด</h1>
        <p className="mt-2 text-slate-600">
          กรอกข้อมูลคำขอเปลี่ยนวันหยุดแล้วกดส่ง
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">วันหยุดเดิม</label>
              <input
                value={oldDayOff}
                onChange={(e) => setOldDayOff(e.target.value)}
                placeholder="เช่น 2026-05-01"
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">วันหยุดใหม่</label>
              <input
                value={newDayOff}
                onChange={(e) => setNewDayOff(e.target.value)}
                placeholder="เช่น 2026-05-03"
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">เหตุผล</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="กรอกเหตุผลการขอเปลี่ยนวันหยุด"
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          {message && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
              {message}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              {loading ? "กำลังบันทึก..." : "ส่งคำขอเปลี่ยนวันหยุด"}
            </button>

            <Link
              href="/dashboard"
              className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white"
            >
              กลับ Dashboard
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}