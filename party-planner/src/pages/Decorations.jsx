import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../services/firebase";

const PARTY_ID = "halloween-25";

const statuses = [
  "Need to Buy",
  "Purchased",
  "DIY",
  "Ready",
];

const getDefaultFormData = () => ({
  name: "",
  status: "Need to Buy",
  quantity: 1,
  store: "",
  estimatedCost: "",
  shoppingLink: "",
  photoUrl: "",
  inspirationLink: "",
  notes: "",
});

function Decorations() {
  const [
    decorations,
    setDecorations,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    activeFilter,
    setActiveFilter,
  ] = useState("All");

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    editingDecorationId,
    setEditingDecorationId,
  ] = useState(null);

  const [
    formData,
    setFormData,
  ] = useState(
    getDefaultFormData(),
  );

  /*
   * ================================
   * LOAD DECORATIONS
   * ================================
   */

  useEffect(() => {
    const decorationsRef =
      collection(
        db,
        "parties",
        PARTY_ID,
        "decorations",
      );

    const unsubscribe = onSnapshot(
      decorationsRef,
      (snapshot) => {
        const data =
          snapshot.docs.map(
            (decorationDoc) => ({
              id: decorationDoc.id,
              ...decorationDoc.data(),
            }),
          );

        data.sort((a, b) => {
          const aTime =
            a.createdAt?.toMillis?.() ??
            0;

          const bTime =
            b.createdAt?.toMillis?.() ??
            0;

          return aTime - bTime;
        });

        setDecorations(data);
        setLoading(false);
      },
      (error) => {
        console.error(
          "Error loading decorations:",
          error,
        );

        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  /*
   * ================================
   * COUNTS
   * ================================
   */

  const needToBuyCount =
    decorations.filter(
      (item) =>
        item.status ===
        "Need to Buy",
    ).length;

  const purchasedCount =
    decorations.filter(
      (item) =>
        item.status ===
        "Purchased",
    ).length;

  const diyCount =
    decorations.filter(
      (item) =>
        item.status === "DIY",
    ).length;

  const readyCount =
    decorations.filter(
      (item) =>
        item.status === "Ready",
    ).length;

  const estimatedTotal =
    decorations
      .filter(
        (item) =>
          item.status ===
          "Need to Buy",
      )
      .reduce(
        (total, item) =>
          total +
          Number(
            item.estimatedCost ||
              0,
          ),
        0,
      );

  /*
   * ================================
   * FILTER
   * ================================
   */

  const visibleDecorations =
    useMemo(() => {
      if (
        activeFilter ===
        "All"
      ) {
        return decorations;
      }

      return decorations.filter(
        (item) =>
          item.status ===
          activeFilter,
      );
    }, [
      decorations,
      activeFilter,
    ]);

  /*
   * ================================
   * FORM
   * ================================
   */

  const resetForm = () => {
    setEditingDecorationId(
      null,
    );

    setFormData(
      getDefaultFormData(),
    );

    setShowForm(false);
  };

  const openAddForm = () => {
    setEditingDecorationId(
      null,
    );

    setFormData(
      getDefaultFormData(),
    );

    setShowForm(true);
  };

  const handleChange = (
    event,
  ) => {
    const {
      name,
      value,
    } = event.target;

    setFormData(
      (current) => ({
        ...current,
        [name]: value,
      }),
    );
  };

  /*
   * ================================
   * SAVE
   * ================================
   */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (saving) {
        return;
      }

      const name =
        formData.name.trim();

      if (!name) {
        return;
      }

      const decorationData = {
        name,

        status:
          formData.status,

        quantity:
          Number(
            formData.quantity,
          ) || 1,

        store:
          formData.store.trim(),

        estimatedCost:
          formData.estimatedCost ===
          ""
            ? null
            : Number(
                formData.estimatedCost,
              ),

        shoppingLink:
          formData.shoppingLink.trim(),

        photoUrl:
          formData.photoUrl.trim(),

        inspirationLink:
          formData.inspirationLink.trim(),

        notes:
          formData.notes.trim(),

        updatedAt:
          serverTimestamp(),
      };

      try {
        setSaving(true);

        if (
          editingDecorationId
        ) {
          await updateDoc(
            doc(
              db,
              "parties",
              PARTY_ID,
              "decorations",
              editingDecorationId,
            ),
            decorationData,
          );
        } else {
          await addDoc(
            collection(
              db,
              "parties",
              PARTY_ID,
              "decorations",
            ),
            {
              ...decorationData,

              createdAt:
                serverTimestamp(),
            },
          );
        }

        resetForm();
      } catch (error) {
        console.error(
          "Error saving decoration:",
          error,
        );
      } finally {
        setSaving(false);
      }
    };

  /*
   * ================================
   * EDIT
   * ================================
   */

  const handleEdit = (
    item,
  ) => {
    setEditingDecorationId(
      item.id,
    );

    setFormData({
      name:
        item.name ?? "",

      status:
        item.status ??
        "Need to Buy",

      quantity:
        item.quantity ?? 1,

      store:
        item.store ?? "",

      estimatedCost:
        item.estimatedCost ??
        "",

      shoppingLink:
        item.shoppingLink ??
        "",

      photoUrl:
        item.photoUrl ??
        "",

      inspirationLink:
        item.inspirationLink ??
        "",

      notes:
        item.notes ?? "",
    });

    setShowForm(true);
  };

  /*
   * ================================
   * DELETE
   * ================================
   */

  const handleDelete =
    async (item) => {
      const confirmed =
        window.confirm(
          `Delete "${item.name}"?`,
        );

      if (!confirmed) {
        return;
      }

      try {
        await deleteDoc(
          doc(
            db,
            "parties",
            PARTY_ID,
            "decorations",
            item.id,
          ),
        );
      } catch (error) {
        console.error(
          "Error deleting decoration:",
          error,
        );
      }
    };

  /*
   * ================================
   * QUICK STATUS UPDATE
   * ================================
   */

  const updateStatus =
    async (
      item,
      newStatus,
    ) => {
      try {
        await updateDoc(
          doc(
            db,
            "parties",
            PARTY_ID,
            "decorations",
            item.id,
          ),
          {
            status:
              newStatus,

            updatedAt:
              serverTimestamp(),
          },
        );
      } catch (error) {
        console.error(
          "Error updating decoration status:",
          error,
        );
      }
    };

  /*
   * ================================
   * HELPERS
   * ================================
   */

  const getStatusClass = (
    status,
  ) => {
    switch (status) {
      case "Need to Buy":
        return "need-to-buy";

      case "Purchased":
        return "purchased";

      case "DIY":
        return "diy";

      case "Ready":
        return "ready";

      default:
        return "need-to-buy";
    }
  };

  const formatCurrency = (
    value,
  ) => {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: "USD",
      },
    ).format(
      Number(value || 0),
    );
  };

  /*
   * ================================
   * RENDER
   * ================================
   */

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="page-eyebrow">
            Party Styling
          </span>

          <h1>
            Decorations
          </h1>

          <p>
            Keep track of decor you need
            to buy, DIY projects,
            purchases, and everything
            that is ready for party day.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={openAddForm}
        >
          + Add Decoration
        </button>
      </header>

      {/* SUMMARY */}

      <section className="decor-stats-grid">
        <div className="decor-stat-card featured">
          <span className="card-eyebrow">
            Decorations
          </span>

          <strong>
            {decorations.length}
          </strong>

          <small>
            total planned
          </small>
        </div>

        <div className="decor-stat-card">
          <span>
            Need to Buy
          </span>

          <strong>
            {needToBuyCount}
          </strong>

          <small>
            still needed
          </small>
        </div>

        <div className="decor-stat-card">
          <span>
            Purchased
          </span>

          <strong>
            {purchasedCount}
          </strong>

          <small>
            already bought
          </small>
        </div>

        <div className="decor-stat-card">
          <span>
            DIY
          </span>

          <strong>
            {diyCount}
          </strong>

          <small>
            projects to make
          </small>
        </div>

        <div className="decor-stat-card">
          <span>
            Ready
          </span>

          <strong>
            {readyCount}
          </strong>

          <small>
            finished and ready
          </small>
        </div>

        <div className="decor-stat-card">
          <span>
            Estimated Purchases
          </span>

          <strong>
            {formatCurrency(
              estimatedTotal,
            )}
          </strong>

          <small>
            need-to-buy decor
          </small>
        </div>
      </section>

      {/* FILTERS */}

      <section className="decor-toolbar">
        <div className="menu-tabs">
          {[
            "All",
            "Need to Buy",
            "Purchased",
            "DIY",
            "Ready",
          ].map((filter) => (
            <button
              type="button"
              key={filter}
              className={
                activeFilter ===
                filter
                  ? "menu-tab active"
                  : "menu-tab"
              }
              onClick={() =>
                setActiveFilter(
                  filter,
                )
              }
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      {/* CONTENT */}

      {loading ? (
        <div className="empty-page-card">
          Loading decorations...
        </div>
      ) : visibleDecorations.length ===
        0 ? (
        <div className="empty-page-card">
          <div className="decor-empty-content">
            <strong>
              {decorations.length ===
              0
                ? "No decorations planned yet."
                : "Nothing matches this filter."}
            </strong>

            <span>
              {decorations.length ===
              0
                ? "Add your first decor idea to start planning."
                : "Try another decoration filter."}
            </span>

            {decorations.length ===
              0 && (
              <button
                type="button"
                className="primary-button"
                onClick={
                  openAddForm
                }
              >
                + Add Decoration
              </button>
            )}
          </div>
        </div>
      ) : (
        <section className="decor-card-grid">
          {visibleDecorations.map(
            (item) => (
              <article
                className="decor-card"
                key={item.id}
              >
                {item.photoUrl && (
                  <div className="decor-photo-wrap">
                    <img
                      className="decor-photo"
                      src={
                        item.photoUrl
                      }
                      alt={
                        item.name
                      }
                    />
                  </div>
                )}

                <div className="decor-card-content">
                  <div className="decor-card-top">
                    <div>
                      <span className="decor-card-eyebrow">
                        Decoration
                      </span>

                      <h2>
                        {item.name}
                      </h2>
                    </div>

                    <span
                      className={`decor-status ${getStatusClass(
                        item.status,
                      )}`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="decor-details-grid">
                    <div>
                      <span>
                        Quantity
                      </span>

                      <strong>
                        {item.quantity ??
                          1}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Estimated Cost
                      </span>

                      <strong>
                        {item.estimatedCost !==
                          null &&
                        item.estimatedCost !==
                          undefined
                          ? formatCurrency(
                              item.estimatedCost,
                            )
                          : "—"}
                      </strong>
                    </div>
                  </div>

                  {item.store && (
                    <div className="decor-detail-line">
                      <span>
                        Store
                      </span>

                      <strong>
                        {item.store}
                      </strong>
                    </div>
                  )}

                  {item.notes && (
                    <p className="decor-notes">
                      {item.notes}
                    </p>
                  )}

                  <div className="decor-status-control">
                    <label>
                      Status

                      <select
                        value={
                          item.status
                        }
                        onChange={(
                          event,
                        ) =>
                          updateStatus(
                            item,
                            event.target
                              .value,
                          )
                        }
                      >
                        {statuses.map(
                          (
                            status,
                          ) => (
                            <option
                              key={
                                status
                              }
                              value={
                                status
                              }
                            >
                              {status}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  </div>

                  <div className="decor-card-actions">
                    {item.inspirationLink && (
                      <a
                        href={
                          item.inspirationLink
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        Inspiration ↗
                      </a>
                    )}

                    {item.shoppingLink && (
                      <a
                        href={
                          item.shoppingLink
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        Shop ↗
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        handleEdit(
                          item,
                        )
                      }
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="delete-action"
                      onClick={() =>
                        handleDelete(
                          item,
                        )
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ),
          )}
        </section>
      )}

      {/* MODAL */}

      {showForm && (
        <div
          className="modal-backdrop"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
                event.currentTarget &&
              !saving
            ) {
              resetForm();
            }
          }}
        >
          <div className="modal-card decor-form-modal">
            <div className="modal-header">
              <div>
                <span className="card-eyebrow">
                  {editingDecorationId
                    ? "Edit Decoration"
                    : "New Decoration"}
                </span>

                <h2>
                  {editingDecorationId
                    ? "Update Decoration"
                    : "Add Decoration"}
                </h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={
                  resetForm
                }
                disabled={
                  saving
                }
              >
                ×
              </button>
            </div>

            <form
              className="decor-form"
              onSubmit={
                handleSubmit
              }
            >
              <label className="full-field">
                Decoration Name

                <input
                  type="text"
                  name="name"
                  value={
                    formData.name
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Floating Witch Hats"
                  autoFocus
                  required
                />
              </label>

              <label>
                Status

                <select
                  name="status"
                  value={
                    formData.status
                  }
                  onChange={
                    handleChange
                  }
                >
                  {statuses.map(
                    (status) => (
                      <option
                        key={
                          status
                        }
                        value={
                          status
                        }
                      >
                        {status}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                Quantity

                <input
                  type="number"
                  name="quantity"
                  min="1"
                  step="1"
                  value={
                    formData.quantity
                  }
                  onChange={
                    handleChange
                  }
                />
              </label>

              <label>
                Estimated Cost

                <input
                  type="number"
                  name="estimatedCost"
                  min="0"
                  step="0.01"
                  value={
                    formData.estimatedCost
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="0.00"
                />
              </label>

              <label>
                Store

                <input
                  type="text"
                  name="store"
                  value={
                    formData.store
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Amazon, Walmart, Dollar Tree..."
                />
              </label>

              <label className="full-field">
                Shopping Link

                <input
                  type="url"
                  name="shoppingLink"
                  value={
                    formData.shoppingLink
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="https://..."
                />
              </label>

              <label className="full-field">
                Photo Link

                <input
                  type="url"
                  name="photoUrl"
                  value={
                    formData.photoUrl
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="https://example.com/photo.jpg"
                />
              </label>

              {formData.photoUrl && (
                <div className="decor-form-photo-preview full-field">
                  <span className="card-eyebrow">
                    Photo Preview
                  </span>

                  <img
                    src={
                      formData.photoUrl
                    }
                    alt="Decoration preview"
                  />
                </div>
              )}

              <label className="full-field">
                Inspiration Link

                <input
                  type="url"
                  name="inspirationLink"
                  value={
                    formData.inspirationLink
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Pinterest, TikTok, product page..."
                />
              </label>

              <label className="full-field">
                Notes

                <textarea
                  name="notes"
                  value={
                    formData.notes
                  }
                  onChange={
                    handleChange
                  }
                  rows="4"
                  placeholder="Setup instructions, DIY details, supplies needed, etc."
                />
              </label>

              <div className="modal-actions full-field">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    resetForm
                  }
                  disabled={
                    saving
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    saving
                  }
                >
                  {saving
                    ? "Saving..."
                    : editingDecorationId
                      ? "Save Changes"
                      : "Add Decoration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Decorations;