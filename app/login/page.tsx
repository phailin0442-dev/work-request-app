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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_code: employeeCode, pincode }),
      });

      const data = await res.json();

      if (!data.ok) {
        setMessage(data.message || "เข้าสู่ระบบไม่สำเร็จ");
        return;
      }

      window.location.href = "/dashboard";
    } catch (error) {
      setMessage((error as Error)?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-main">
      <div className="login-card">
        {/* Left panel */}
        <div className="left-panel">
          <div className="badge">HR APPROVAL WORKFLOW</div>

          <h1 className="title">เข้าสู่ระบบ</h1>

          <p className="subtitle">ระบบบันทึกเวลาการทำงานของพนักงาน ADECCO</p>

          {/* Feature boxes — full version on desktop */}
          <div className="feature-list feature-list-desktop">
            <div className="feature-box">[OK] ยื่น OT / ลา / เปลี่ยนกะ</div>
            <div className="feature-box">[OK] Export Excel และจัดการพนักงาน</div>
          </div>

          {/* Compact pill version on mobile */}
          <div className="feature-list feature-list-mobile">
            <span className="feature-pill">OT / ลา / เปลี่ยนกะ</span>
            <span className="feature-pill">Export Excel</span>
          </div>
        </div>

        {/* Right form panel */}
        <form onSubmit={handleLogin} className="right-form">
          <div>
            <div className="logo-box">HR</div>
            <h2 className="welcome">Welcome Back</h2>
            <p className="welcome-sub">กรอกรหัสพนักงานและ PIN เพื่อเข้าใช้งาน</p>
          </div>

          <div className="field">
            <label className="field-label">รหัสพนักงาน</label>
            <input
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              placeholder="เช่น AD123456"
              className="field-input"
            />
          </div>

          <div className="field">
            <label className="field-label">PIN</label>
            <input
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              placeholder="PIN 4 ตัวท้าย"
              type="password"
              maxLength={4}
              inputMode="numeric"
              className="field-input"
            />
          </div>

          {message && <div className="error-box">{message}</div>}

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>

          <p className="footer-text">HR Approval Workflow System</p>
        </form>
      </div>

      <style jsx>{`
        .login-main {
          min-height: 100vh;
          background: linear-gradient(
            135deg,
            #7f1d1d 0%,
            #dc2626 45%,
            #fff1f2 45%,
            #ffffff 100%
          );
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 24px;
          font-family: "Sarabun", Arial, Helvetica, sans-serif;
          box-sizing: border-box;
        }

        .login-card {
          width: 100%;
          max-width: 1050px;
          background: #fff;
          border-radius: 32px;
          overflow: hidden;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          min-height: 620px;
          box-shadow: 0 30px 70px rgba(127, 29, 29, 0.35);
        }

        .left-panel {
          background: linear-gradient(135deg, #991b1b, #dc2626);
          color: #fff;
          padding: 56px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .badge {
          display: inline-block;
          width: fit-content;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.16);
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .title {
          margin-top: 28px;
          font-size: 48px;
          font-weight: 900;
          line-height: 1.1;
        }

        .subtitle {
          margin-top: 14px;
          font-size: 18px;
          line-height: 1.8;
          color: #fee2e2;
        }

        .feature-list {
          margin-top: 36px;
          display: flex;
          gap: 14px;
        }

        .feature-list-desktop {
          flex-direction: column;
        }

        .feature-list-mobile {
          display: none;
          flex-wrap: wrap;
        }

        .feature-box {
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.14);
          padding: 14px 16px;
          font-size: 15px;
          font-weight: 700;
        }

        .feature-pill {
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.18);
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 700;
        }

        .right-form {
          padding: 56px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 22px;
        }

        .logo-box {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: #fee2e2;
          color: #b91c1c;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 900;
        }

        .welcome {
          margin-top: 16px;
          font-size: 32px;
          font-weight: 900;
          color: #111827;
        }

        .welcome-sub {
          margin-top: 6px;
          color: #64748b;
          font-size: 14px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field-label {
          font-size: 14px;
          font-weight: 800;
          color: #334155;
        }

        .field-input {
          width: 100%;
          border: 1.5px solid #fecaca;
          border-radius: 14px;
          padding: 14px 16px;
          font-size: 16px;
          outline: none;
          background: #fff;
          box-sizing: border-box;
        }

        .error-box {
          border-radius: 14px;
          background: #fee2e2;
          color: #991b1b;
          padding: 14px 16px;
          font-size: 14px;
          font-weight: 700;
        }

        .submit-btn {
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, #b91c1c, #ef4444);
          color: #fff;
          padding: 16px;
          font-size: 16px;
          font-weight: 900;
          cursor: pointer;
          width: 100%;
          box-shadow: 0 10px 24px rgba(220, 38, 38, 0.28);
          transition: opacity 0.2s;
        }

        .submit-btn:disabled {
          background: #f87171;
          cursor: not-allowed;
        }

        .footer-text {
          text-align: center;
          color: #94a3b8;
          font-size: 12px;
          margin-top: 4px;
        }

        /* ===== Mobile layout (pure CSS, no JS => no layout jump) ===== */
        @media (max-width: 768px) {
          .login-main {
            padding: 0;
            align-items: flex-start;
            background: linear-gradient(
              180deg,
              #991b1b 0%,
              #dc2626 40%,
              #fff1f2 40%,
              #ffffff 100%
            );
          }

          .login-card {
            max-width: 100%;
            border-radius: 0 0 32px 32px;
            grid-template-columns: 1fr;
            grid-template-rows: auto auto;
            min-height: unset;
            box-shadow: 0 12px 40px rgba(127, 29, 29, 0.25);
          }

          .left-panel {
            padding: 36px 28px 32px;
          }

          .badge {
            font-size: 11px;
          }

          .title {
            margin-top: 16px;
            font-size: 32px;
          }

          .subtitle {
            font-size: 15px;
          }

          .feature-list-desktop {
            display: none;
          }

          .feature-list-mobile {
            display: flex;
            margin-top: 16px;
          }

          .right-form {
            padding: 32px 28px 40px;
            gap: 18px;
          }

          .welcome {
            font-size: 26px;
          }
        }
      `}</style>
    </main>
  );
}
