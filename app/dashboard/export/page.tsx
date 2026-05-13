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

    if (from) params.set("from", from);
    if (to) params.set("to", to);

    window.location.href = `/api/export-requests?${params.toString()}`;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-100 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl bg-gradient-to-r from-red-700 via-red-600 to-rose-600 p-8 text-white shadow-2xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black tracking-[0.2em] text-red-100">
                EXPORT CENTER
              </p>

              <h1 className="mt-3 text-4xl font-black">Export Report</h1>

              <p className="mt-2 text-red-100">
                เลือกประเภทรายการและช่วงวันที่ เพื่อดาวน์โหลดไฟล์รายงาน
              </p>
            </div>

            <Link
              href="/dashboard"
              className="w-fit rounded-2xl border border-white/30 bg-white px-5 py-3 font-bold text-red-700 shadow transition hover:bg-red-50"
            >
              กลับ Dashboard
            </Link>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          <InfoCard title="เลือกรายการ" value="OT / ลา / เปลี่ยนกะ" icon="📋" />
          <InfoCard title="เลือกช่วงวันที่" value="กรองตามวันที่สร้าง" icon="📅" />
          <InfoCard title="ดาวน์โหลดไฟล์" value="CSV เปิดด้วย Excel ได้" icon="📤" />
        </section>

        <section className="overflow-hidden rounded-3xl border border-red-100 bg-white/95 shadow-xl">
          <div className="border-b border-red-100 bg-red-50 px-6 py-5">
            <h2 className="text-2xl font-black text-slate-900">
              ตั้งค่าการ Export
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              กรอกเงื่อนไขด้านล่าง แล้วกดปุ่มดาวน์โหลดรายงาน
            </p>
          </div>

          <div className="space-y-6 p-6">
            <div className="rounded-3xl border border-red-100 bg-white p-5">
              <label className="mb-2 block text-sm font-bold text-slate-700">
                ประเภทรายการ
              </label>

              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-2xl border border-red-100 px-4 py-3 text-sm outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
              >
                <option value="all">ทั้งหมด</option>
                <option value="ot">OT</option>
                <option value="shift">เปลี่ยนกะ</option>
                <option value="dayoff">เปลี่ยนวันหยุด</option>
                <option value="leave">ขอลา</option>
              </select>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="rounded-3xl border border-red-100 bg-white p-5">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  วันที่เริ่มต้น
                </label>

                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full rounded-2xl border border-red-100 px-4 py-3 text-sm outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
                />
              </div>

              <div className="rounded-3xl border border-red-100 bg-white p-5">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  วันที่สิ้นสุด
                </label>

                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full rounded-2xl border border-red-100 px-4 py-3 text-sm outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
                />
              </div>
            </div>

            <div className="rounded-3xl bg-red-50 p-5">
              <p className="text-sm font-bold text-red-700">
                ไฟล์ที่ได้จะเป็น CSV สามารถเปิดด้วย Excel ได้ทันที
              </p>
              <p className="mt-1 text-sm text-slate-600">
                ถ้าไม่เลือกวันที่ ระบบจะ export รายการทั้งหมดตามประเภทที่เลือก
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleExport}
                className="rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 px-6 py-3 font-bold text-white shadow-lg shadow-red-200 transition hover:scale-[1.02] hover:from-red-700 hover:to-rose-700"
              >
                📤 Export Excel
              </button>

              <button
                type="button"
                onClick={() => {
                  setType("all");
                  setFrom("");
                  setTo("");
                }}
                className="rounded-2xl border border-red-200 bg-white px-6 py-3 font-bold text-red-700 shadow-sm transition hover:bg-red-50"
              >
                ล้างตัวกรอง
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="rounded-3xl border border-red-100 bg-white/90 p-5 shadow-xl">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-2xl">
        {icon}
      </div>

      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-1 text-lg font-black text-slate-900">{value}</p>
    </div>
  );
}