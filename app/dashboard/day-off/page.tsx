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
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-100 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 to-rose-600 p-8 text-white shadow-2xl">
          <h1 className="text-3xl font-bold">
            แบบฟอร์มขอเปลี่ยนวันหยุด
          </h1>

          <p className="mt-2 text-red-100">
            เลือกวันหยุดเดิมและวันที่ต้องการเปลี่ยนใหม่
          </p>
        </div>

        <div className="rounded-3xl border border-white/50 bg-white/90 p-8 shadow-xl backdrop-blur">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl border border-red-100 bg-red-50/60 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                    📅
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      วันหยุดเดิม
                    </h2>

                    <p className="text-sm text-slate-500">
                      วันที่หยุดเดิมในระบบ
                    </p>
                  </div>
                </div>

                <input
                  type="date"
                  value={oldDayOff}
                  onChange={(e) => setOldDayOff(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
                />
              </div>

              <div className="rounded-3xl border border-red-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-100 text-xl shadow-sm">
                    🔁
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      วันหยุดใหม่
                    </h2>

                    <p className="text-sm text-slate-500">
                      วันที่ต้องการเปลี่ยน
                    </p>
                  </div>
                </div>

                <input
                  type="date"
                  value={newDayOff}
                  onChange={(e) => setNewDayOff(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                เหตุผล
              </label>

              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={5}
                placeholder="กรอกรายละเอียดเหตุผลการเปลี่ยนวันหยุด..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
              />
            </div>

            {message && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {message}
              </div>
            )}

            <div className="flex flex-wrap gap-4 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 px-6 py-3 font-semibold text-white shadow-lg shadow-red-200 transition-all duration-200 hover:scale-[1.02] hover:from-red-700 hover:to-rose-700 disabled:opacity-50"
              >
                {loading
                  ? "กำลังบันทึก..."
                  : "ส่งคำขอเปลี่ยนวันหยุด"}
              </button>

              <Link
                href="/dashboard"
                className="rounded-2xl border border-red-200 bg-white px-6 py-3 font-semibold text-red-600 shadow-sm transition-all duration-200 hover:bg-red-50"
              >
                กลับ Dashboard
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}