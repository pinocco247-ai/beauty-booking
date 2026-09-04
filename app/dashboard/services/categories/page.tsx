"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";

type Category = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export default function ServiceCategoriesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [studioId, setStudioId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: studio, error: studioError } = await supabase
        .from("studios")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (studioError) {
        setMessage(`讀取工作室失敗：${studioError.message}`);
        setLoading(false);
        return;
      }

      if (!studio) {
        router.replace("/onboarding");
        return;
      }

      setStudioId(studio.id);

      const { data, error } = await supabase
        .from("service_categories")
        .select("id, name, sort_order, is_active")
        .eq("studio_id", studio.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        setMessage(`讀取分類失敗：${error.message}`);
        setLoading(false);
        return;
      }

      setCategories(data || []);
      setLoading(false);
    }

    loadData();
  }, [router]);

  async function reloadCategories() {
    if (!studioId) return;

    const { data, error } = await supabase
      .from("service_categories")
      .select("id, name, sort_order, is_active")
      .eq("studio_id", studioId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      setMessage(`更新失敗：${error.message}`);
      return;
    }

    setCategories(data || []);
  }

  async function addCategory() {
    setMessage("");

    const name = newName.trim();

    if (!name) {
      setMessage("請輸入分類名稱。");
      return;
    }

    setSaving(true);

    const nextSortOrder =
      categories.length === 0
        ? 0
        : Math.max(...categories.map((item) => item.sort_order)) + 1;

    const { error } = await supabase
      .from("service_categories")
      .insert({
        studio_id: studioId,
        name,
        sort_order: nextSortOrder,
        is_active: true,
      });

    if (error) {
      if (error.code === "23505") {
        setMessage("這個分類已經存在。");
      } else {
        setMessage(`新增失敗：${error.message}`);
      }

      setSaving(false);
      return;
    }

    setNewName("");
    await reloadCategories();
    setSaving(false);
  }

  function startEditing(category: Category) {
    setEditingId(category.id);
    setEditingName(category.name);
    setMessage("");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingName("");
  }

  async function saveEditing() {
    if (!editingId) return;

    const name = editingName.trim();

    if (!name) {
      setMessage("分類名稱不能是空白。");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("service_categories")
      .update({
        name,
      })
      .eq("id", editingId);

    if (error) {
      if (error.code === "23505") {
        setMessage("這個分類名稱已經存在。");
      } else {
        setMessage(`修改失敗：${error.message}`);
      }

      setSaving(false);
      return;
    }

    setEditingId(null);
    setEditingName("");
    await reloadCategories();
    setSaving(false);
  }

  async function toggleActive(category: Category) {
    setMessage("");

    const { error } = await supabase
      .from("service_categories")
      .update({
        is_active: !category.is_active,
      })
      .eq("id", category.id);

    if (error) {
      setMessage(`更新失敗：${error.message}`);
      return;
    }

    await reloadCategories();
  }

  async function moveCategory(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= categories.length) {
      return;
    }

    const current = categories[index];
    const target = categories[targetIndex];

    const currentOrder = current.sort_order;
    const targetOrder = target.sort_order;

    const { error: firstError } = await supabase
      .from("service_categories")
      .update({
        sort_order: targetOrder,
      })
      .eq("id", current.id);

    if (firstError) {
      setMessage(`排序失敗：${firstError.message}`);
      return;
    }

    const { error: secondError } = await supabase
      .from("service_categories")
      .update({
        sort_order: currentOrder,
      })
      .eq("id", target.id);

    if (secondError) {
      setMessage(`排序失敗：${secondError.message}`);
      return;
    }

    await reloadCategories();
  }

  async function deleteCategory(category: Category) {
    const confirmed = window.confirm(
      `確定要刪除「${category.name}」嗎？`
    );

    if (!confirmed) return;

    setMessage("");

    const { error } = await supabase
      .from("service_categories")
      .delete()
      .eq("id", category.id);

    if (error) {
      setMessage(`刪除失敗：${error.message}`);
      return;
    }

    await reloadCategories();
  }

  if (loading) {
    return (
      <main style={loadingStyle}>
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
        <div
          style={{
            fontSize: "13px",
            letterSpacing: "0.18em",
          }}
        >
          BEAUTY BOOKING
        </div>

        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          style={headerButton}
        >
          BACK TO DASHBOARD
        </button>
      </header>

      <div
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
          padding: "68px 48px 90px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "300px 1fr",
            gap: "72px",
          }}
        >
          <aside>
            <div style={eyebrow}>
              SERVICE STRUCTURE
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "42px",
                fontWeight: 500,
                letterSpacing: "-0.04em",
                lineHeight: 1.08,
              }}
            >
              服務分類
            </h1>

            <p
              style={{
                marginTop: "18px",
                color: "#777",
                fontSize: "14px",
                lineHeight: 1.8,
              }}
            >
              先建立服務分類，下一步新增服務時就可以放進對應分類。
            </p>
          </aside>

          <section>
            <div
              style={{
                borderTop: "1px solid #CACAC5",
                paddingTop: "28px",
              }}
            >
              <div style={eyebrow}>
                ADD CATEGORY
              </div>

              <h2
                style={{
                  margin: 0,
                  fontSize: "28px",
                  fontWeight: 500,
                  letterSpacing: "-0.03em",
                }}
              >
                新增分類
              </h2>

              <div
                style={{
                  marginTop: "28px",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: "18px",
                  alignItems: "end",
                }}
              >
                <div>
                  <label style={labelStyle}>
                    分類名稱
                  </label>

                  <input
                    value={newName}
                    onChange={(e) =>
                      setNewName(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        addCategory();
                      }
                    }}
                    placeholder="例如：凝膠、染髮、臉部保養"
                    style={inputStyle}
                  />
                </div>

                <button
                  type="button"
                  onClick={addCategory}
                  disabled={saving}
                  style={{
                    ...primaryButton,
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  ADD
                </button>
              </div>
            </div>

            <div
              style={{
                marginTop: "72px",
              }}
            >
              <div style={eyebrow}>
                CATEGORIES
              </div>

              <h2
                style={{
                  margin: 0,
                  fontSize: "28px",
                  fontWeight: 500,
                  letterSpacing: "-0.03em",
                }}
              >
                目前分類
              </h2>

              {categories.length === 0 ? (
                <div
                  style={{
                    marginTop: "28px",
                    padding: "36px 0",
                    borderTop: "1px solid #D4D4CF",
                    borderBottom: "1px solid #D4D4CF",
                    color: "#888",
                    fontSize: "14px",
                  }}
                >
                  還沒有分類。
                </div>
              ) : (
                <div
                  style={{
                    marginTop: "28px",
                    borderTop: "1px solid #CFCFCA",
                  }}
                >
                  {categories.map((category, index) => (
                    <div
                      key={category.id}
                      style={{
                        minHeight: "76px",
                        borderBottom: "1px solid #DADAD5",
                        display: "grid",
                        gridTemplateColumns:
                          "44px minmax(200px, 1fr) 120px 220px",
                        gap: "18px",
                        alignItems: "center",
                        opacity: category.is_active
                          ? 1
                          : 0.45,
                      }}
                    >
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#999",
                        }}
                      >
                        {String(index + 1).padStart(
                          2,
                          "0"
                        )}
                      </div>

                      <div>
                        {editingId ===
                        category.id ? (
                          <input
                            autoFocus
                            value={editingName}
                            onChange={(e) =>
                              setEditingName(
                                e.target.value
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                saveEditing();
                              }

                              if (e.key === "Escape") {
                                cancelEditing();
                              }
                            }}
                            style={{
                              ...inputStyle,
                              fontSize: "15px",
                            }}
                          />
                        ) : (
                          <span
                            style={{
                              fontSize: "15px",
                            }}
                          >
                            {category.name}
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: "11px",
                          letterSpacing: "0.08em",
                          color: category.is_active
                            ? "#477255"
                            : "#999",
                        }}
                      >
                        {category.is_active
                          ? "ACTIVE"
                          : "HIDDEN"}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          alignItems: "center",
                          gap: "12px",
                          flexWrap: "wrap",
                        }}
                      >
                        {editingId ===
                        category.id ? (
                          <>
                            <button
                              type="button"
                              onClick={saveEditing}
                              style={smallButton}
                            >
                              SAVE
                            </button>

                            <button
                              type="button"
                              onClick={cancelEditing}
                              style={smallButton}
                            >
                              CANCEL
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                moveCategory(
                                  index,
                                  "up"
                                )
                              }
                              disabled={index === 0}
                              style={{
                                ...smallButton,
                                opacity:
                                  index === 0
                                    ? 0.3
                                    : 1,
                              }}
                            >
                              ↑
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                moveCategory(
                                  index,
                                  "down"
                                )
                              }
                              disabled={
                                index ===
                                categories.length -
                                  1
                              }
                              style={{
                                ...smallButton,
                                opacity:
                                  index ===
                                  categories.length -
                                    1
                                    ? 0.3
                                    : 1,
                              }}
                            >
                              ↓
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                startEditing(
                                  category
                                )
                              }
                              style={smallButton}
                            >
                              EDIT
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                toggleActive(
                                  category
                                )
                              }
                              style={smallButton}
                            >
                              {category.is_active
                                ? "HIDE"
                                : "SHOW"}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                deleteCategory(
                                  category
                                )
                              }
                              style={{
                                ...smallButton,
                                color: "#9A3D37",
                              }}
                            >
                              DELETE
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {message && (
              <div
                style={{
                  marginTop: "30px",
                  borderTop:
                    "1px solid #D0D0CB",
                  paddingTop: "16px",
                  color: "#9A3D37",
                  fontSize: "14px",
                }}
              >
                {message}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

const loadingStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#F7F7F5",
  color: "#171717",
  fontFamily: "Arial, sans-serif",
};

const eyebrow: React.CSSProperties = {
  fontSize: "11px",
  color: "#888",
  letterSpacing: "0.16em",
  marginBottom: "14px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "10px",
  fontSize: "11px",
  letterSpacing: "0.12em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "13px 0",
  border: "none",
  borderBottom: "1px solid #AAA",
  background: "transparent",
  color: "#171717",
  outline: "none",
  fontSize: "16px",
};

const primaryButton: React.CSSProperties = {
  border: "none",
  background: "#171717",
  color: "#FFFFFF",
  padding: "14px 24px",
  fontSize: "11px",
  letterSpacing: "0.1em",
  cursor: "pointer",
};

const smallButton: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#555",
  padding: "5px 0",
  fontSize: "10px",
  letterSpacing: "0.08em",
  cursor: "pointer",
};

const headerButton: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#171717",
  fontSize: "11px",
  letterSpacing: "0.1em",
  cursor: "pointer",
};
