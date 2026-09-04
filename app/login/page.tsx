"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F7F7F5",
        color: "#161616",
        display: "grid",
        gridTemplateColumns: "1.1fr 0.9fr",
      }}
    >
      <section
        style={{
          padding: "56px 64px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          borderRight: "1px solid #DADAD6",
          minHeight: "100vh",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "13px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: "72px",
            }}
          >
            BEAUTY BOOKING
          </div>

          <div style={{ maxWidth: "620px" }}>
            <div
              style={{
                fontSize: "12px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#777",
                marginBottom: "18px",
              }}
            >
              Your studio, one place
            </div>

            <h1
              style={{
                fontSize: "64px",
                lineHeight: 1.02,
                fontWeight: 500,
                letterSpacing: "-0.04em",
                margin: 0,
              }}
            >
              Manage bookings
              <br />
              without losing
              <br />
              your brand.
            </h1>

            <p
              style={{
                marginTop: "28px",
                maxWidth: "470px",
                color: "#666",
                fontSize: "16px",
                lineHeight: 1.8,
              }}
            >
              預約、服務、人員、班表與訂金，集中在同一個工作室後台。
            </p>
          </div>
        </div>

        <div
          style={{
            fontSize: "12px",
            color: "#888",
            letterSpacing: "0.04em",
          }}
        >
          BEAUTY BOOKING · 2026
        </div>
      </section>

      <section
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
          background: "#FFFFFF",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#7B7B77",
              marginBottom: "18px",
            }}
          >
            Welcome back
          </div>

          <h2
            style={{
              fontSize: "34px",
              fontWeight: 500,
              letterSpacing: "-0.03em",
              margin: "0 0 10px",
            }}
          >
            登入工作室
          </h2>

          <p
            style={{
              color: "#777",
              margin: "0 0 36px",
              lineHeight: 1.7,
              fontSize: "14px",
            }}
          >
            登入後繼續管理你的預約與工作室設定。
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  letterSpacing: "0.08em",
                  marginBottom: "10px",
                }}
              >
                EMAIL
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@example.com"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  border: "none",
                  borderBottom: "1px solid #BEBEB8",
                  padding: "13px 0",
                  fontSize: "15px",
                  outline: "none",
                  background: "transparent",
                }}
              />
            </div>

            <div style={{ marginBottom: "32px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  letterSpacing: "0.08em",
                  marginBottom: "10px",
                }}
              >
                PASSWORD
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="輸入密碼"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  border: "none",
                  borderBottom: "1px solid #BEBEB8",
                  padding: "13px 0",
                  fontSize: "15px",
                  outline: "none",
                  background: "transparent",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                border: "none",
                background: "#151515",
                color: "#FFFFFF",
                padding: "15px 18px",
                fontSize: "14px",
                letterSpacing: "0.05em",
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "SIGNING IN..." : "SIGN IN"}
            </button>
          </form>

          {message && (
            <div
              style={{
                marginTop: "20px",
                paddingTop: "16px",
                borderTop: "1px solid #E1E1DD",
                color: "#555",
                fontSize: "14px",
              }}
            >
              {message}
            </div>
          )}

          <div
            style={{
              marginTop: "30px",
              fontSize: "14px",
              color: "#777",
            }}
          >
            還沒有帳號？{" "}
            <Link
              href="/register"
              style={{
                color: "#111",
                textDecoration: "none",
                borderBottom: "1px solid #111",
                paddingBottom: "2px",
              }}
            >
              免費建立
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
