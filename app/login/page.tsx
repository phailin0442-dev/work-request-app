"use client";

import { useState } from "react";

export default function LoginPage() {
  const [employeeCode, setEmployeeCode] = useState("");
  const [pincode, setPincode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee_code: employeeCode,
          pincode,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setMessage(data.message || "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }

      window.location.href = "/dashboard";
    } catch (error: any) {
      setMessage(error?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <div style={styles.left}>
          <div style={styles.badge}>HR APPROVAL WORKFLOW</div>

          <h1 style={styles.title}>เข้าสู่ระบบ</h1>

          <p style={styles.subtitle}>
            ระบบบันทึกเวลาการทำงานของพนักงาน ADECCO
          </p>

          <div style={styles.featureBox}>
            <div style={styles.feature}>✅ ยื่น OT / ลา / เปลี่ยนกะ</div>
            <div style={styles.feature}>✅ Export Excel และจัดการพนักงาน</div>
          </div>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          <div>
            <div style={styles.logoCircle}>HR</div>
            <h2 style={styles.formTitle}>Welcome Back</h2>
            <p style={styles.formSubtitle}>กรอกรหัสพนักงานและ PIN เพื่อเข้าใช้งาน</p>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>รหัสพนักงาน</label>
            <input
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              placeholder="เช่น AD123456"
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>PIN</label>
            <input
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              placeholder="PIN 4 ตัวท้าย"
              type="password"
              maxLength={4}
              style={styles.input}
            />
          </div>

          {message && <div style={styles.errorBox}>{message}</div>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>

          <p style={styles.footerText}>© HR Approval Workflow System</p>
        </form>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #7f1d1d 0%, #dc2626 45%, #fff1f2 45%, #ffffff 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "1050px",
    minHeight: "620px",
    background: "white",
    borderRadius: "32px",
    overflow: "hidden",
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    boxShadow: "0 30px 70px rgba(127, 29, 29, 0.35)",
  },
  left: {
    background: "linear-gradient(135deg, #991b1b, #dc2626)",
    color: "white",
    padding: "56px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  badge: {
    display: "inline-block",
    width: "fit-content",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.16)",
    padding: "10px 16px",
    fontSize: "13px",
    fontWeight: 800,
    letterSpacing: "0.08em",
  },
  title: {
    marginTop: "28px",
    fontSize: "48px",
    fontWeight: 900,
    lineHeight: 1.1,
  },
  subtitle: {
    marginTop: "18px",
    maxWidth: "520px",
    fontSize: "18px",
    lineHeight: 1.8,
    color: "#fee2e2",
  },
  featureBox: {
    marginTop: "36px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  feature: {
    borderRadius: "18px",
    background: "rgba(255,255,255,0.14)",
    padding: "14px 16px",
    fontSize: "15px",
    fontWeight: 700,
  },
  form: {
    padding: "56px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: "22px",
  },
  logoCircle: {
    width: "66px",
    height: "66px",
    borderRadius: "22px",
    background: "#fee2e2",
    color: "#b91c1c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    fontWeight: 900,
  },
  formTitle: {
    marginTop: "20px",
    fontSize: "32px",
    fontWeight: 900,
    color: "#111827",
  },
  formSubtitle: {
    marginTop: "8px",
    color: "#64748b",
    fontSize: "15px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "14px",
    fontWeight: 800,
    color: "#334155",
  },
  input: {
    width: "100%",
    border: "1px solid #fecaca",
    borderRadius: "16px",
    padding: "14px 16px",
    fontSize: "16px",
    outline: "none",
    background: "#fff",
  },
  errorBox: {
    borderRadius: "16px",
    background: "#fee2e2",
    color: "#991b1b",
    padding: "14px 16px",
    fontSize: "14px",
    fontWeight: 700,
  },
  button: {
    border: "none",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #b91c1c, #ef4444)",
    color: "white",
    padding: "15px 18px",
    fontSize: "16px",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 14px 24px rgba(220, 38, 38, 0.25)",
  },
  footerText: {
    marginTop: "8px",
    textAlign: "center",
    color: "#94a3b8",
    fontSize: "13px",
  },
};