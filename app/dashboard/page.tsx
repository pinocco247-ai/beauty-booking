"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

type Studio = {
  id: string;
  name: string;
  slug: string;
};

type Subscription = {
  plan: string;
  status: string;
  expires_at: string | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [studio, setStudio] = useState<Studio | null>(null);
  const [subscription, setSubscription] =
    useState<Subscription | null>(null);

  const [siteOrigin, setSiteOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSiteOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    async function loadDashboard() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: studioData, error: studioError } = await supabase
        .from("studios")
        .select("id, name, slug")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (studioError) {
        console.error(studioError);
        setLoading(false);
        return;
      }

      if (!studioData) {
        router.replace("/onboarding");
        return;
      }

      setStudio(studioData);

      const { data: subscriptionData } = await supabase
        .from("studio_subscriptions")
        .select("plan, status, expires_at")
        .eq("studio_id", studioData.id)
        .maybeSingle();

      setSubscription(subscriptionData);
      setLoading(false);
    }

    loadDashboard();
  }, [router]);

  async function copyBookingUrl() {
    if (!studio || !siteOrigin) return;

    const bookingUrl = `${siteOrigin}/${studio.slug}`;

    await navigator.clipboard.writeText(bookingUrl);

    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1800);
  }

  if (loading || !studio) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#F7F7F5",
          color: "#171717",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            letterSpacing: "0.14em",
          }}
        >
          LOADING...
        </span>
      </main>
    );
  }

  const bookingUrl = siteOrigin
    ? `${siteOrigin}/${studio.slug}`
    : `/${studio.slug}`;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F7F7F5",
        color: "#171717",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <header
        style={{
          height: "76px",
          padding: "0 42px",
          borderBottom: "1px solid #DADAD5",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "10px",
              color: "#999",
              letterSpacing: "0.14em",
              marginBottom: "5px",
            }}
          >
            OVERVIEW
          </div>

          <div
            style={{
              fontSize: "17px",
            }}
          >
            {studio.name}
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/dashboard/studio")}
          style={{
            border: "none",
            background: "transparent",
            color: "#171717",
            fontSize: "11px",
            letterSpacing: "0.1em",
            cursor: "pointer",
          }}
        >
          STUDIO SETTINGS
        </button>
      </header>

      <section
        style={{
          padding: "62px 64px 90px",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            letterSpacing: "0.18em",
            color: "#888",
            marginBottom: "18px",
          }}
        >
          TODAY
        </div>

        <h1
          style={{
            fontSize: "52px",
            fontWeight: 500,
            letterSpacing: "-0.04em",
            margin: 0,
          }}
        >
          {studio.name}
        </h1>

        <div
          style={{
            marginTop: "60px",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            borderTop: "1px solid #CFCFCA",
            borderBottom: "1px solid #CFCFCA",
          }}
        >
          <Metric
            label="TODAY"
            value="0"
            text="今日預約"
          />

          <Metric
            label="THIS WEEK"
            value="0"
            text="本週預約"
          />

          <Metric
            label="DEPOSIT"
            value="0"
            text="待確認訂金"
          />

          <Metric
            label="PLAN"
            value={(subscription?.plan || "free").toUpperCase()}
            text={
              subscription?.status === "active"
                ? "目前方案"
                : "方案狀態異常"
            }
          />
        </div>

        <div
          style={{
            marginTop: "72px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "70px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "11px",
                color: "#888",
                letterSpacing: "0.16em",
                marginBottom: "24px",
              }}
            >
              GET STARTED
            </div>

            <h2
              style={{
                fontSize: "30px",
                fontWeight: 500,
                letterSpacing: "-0.03em",
                margin: "0 0 28px",
              }}
            >
              完成工作室設定
            </h2>

            {[
              ["01", "新增第一個服務"],
              ["02", "新增第一位服務人員"],
              ["03", "設定營業時間"],
            ].map(([number, text]) => (
              <div
                key={number}
                style={{
                  display: "flex",
                  gap: "22px",
                  padding: "18px 0",
                  borderTop: "1px solid #D8D8D3",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: "#999",
                  }}
                >
                  {number}
                </span>

                <span
                  style={{
                    fontSize: "14px",
                  }}
                >
                  {text}
                </span>
              </div>
            ))}
          </div>

          <div>
            <div
              style={{
                fontSize: "11px",
                color: "#888",
                letterSpacing: "0.16em",
                marginBottom: "24px",
              }}
            >
              YOUR BOOKING PAGE
            </div>

            <h2
              style={{
                fontSize: "30px",
                fontWeight: 500,
                letterSpacing: "-0.03em",
                margin: "0 0 28px",
              }}
            >
              公開預約網址
            </h2>

            <div
              style={{
                borderTop: "1px solid #D8D8D3",
                borderBottom: "1px solid #D8D8D3",
                padding: "22px 0",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  lineHeight: 1.7,
                  wordBreak: "break-all",
                }}
              >
                {bookingUrl}
              </div>

              <div
                style={{
                  marginTop: "18px",
                  display: "flex",
                  alignItems: "center",
                  gap: "18px",
                }}
              >
                <button
                  type="button"
                  onClick={copyBookingUrl}
                  style={{
                    border: "1px solid #BEBEB9",
                    background: "transparent",
                    color: "#171717",
                    padding: "10px 16px",
                    fontSize: "11px",
                    letterSpacing: "0.1em",
                    cursor: "pointer",
                  }}
                >
                  {copied ? "COPIED" : "COPY URL"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  text,
}: {
  label: string;
  value: string;
  text: string;
}) {
  return (
    <div
      style={{
        minHeight: "170px",
        padding: "28px",
        borderRight: "1px solid #D5D5D0",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          color: "#888",
          letterSpacing: "0.15em",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: value.length > 4 ? "30px" : "48px",
          marginTop: "24px",
          letterSpacing: "-0.04em",
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: "13px",
          color: "#777",
          marginTop: "10px",
        }}
      >
        {text}
      </div>
    </div>
  );
}
