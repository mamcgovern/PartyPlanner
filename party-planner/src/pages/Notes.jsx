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

const categories = [
  "General",
  "Ideas",
  "Vendors",
  "Budget",
  "Reminders",
  "Other",
];

const getDefaultFormData = () => ({
  title: "",
  category: "General",
  body: "",
  pinned: false,
});

function Notes() {
  const [
    notes,
    setNotes,
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
    search,
    setSearch,
  ] = useState("");

  const [
    activeCategory,
    setActiveCategory,
  ] = useState("All");

  const [
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    editingNoteId,
    setEditingNoteId,
  ] = useState(null);

  const [
    formData,
    setFormData,
  ] = useState(
    getDefaultFormData(),
  );

  /*
   * ================================
   * LOAD NOTES
   * ================================
   */

  useEffect(() => {
    const notesRef = collection(
      db,
      "parties",
      PARTY_ID,
      "notes",
    );

    const unsubscribe = onSnapshot(
      notesRef,
      (snapshot) => {
        const data =
          snapshot.docs.map(
            (noteDoc) => ({
              id: noteDoc.id,
              ...noteDoc.data(),
            }),
          );

        data.sort((a, b) => {
          if (
            Boolean(a.pinned) !==
            Boolean(b.pinned)
          ) {
            return a.pinned ? -1 : 1;
          }

          const aTime =
            a.updatedAt?.toMillis?.() ??
            a.createdAt?.toMillis?.() ??
            0;

          const bTime =
            b.updatedAt?.toMillis?.() ??
            b.createdAt?.toMillis?.() ??
            0;

          return bTime - aTime;
        });

        setNotes(data);
        setLoading(false);
      },
      (error) => {
        console.error(
          "Error loading notes:",
          error,
        );

        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  /*
   * ================================
   * FILTERED NOTES
   * ================================
   */

  const visibleNotes =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return notes.filter(
        (note) => {
          const matchesCategory =
            activeCategory ===
              "All" ||
            note.category ===
              activeCategory;

          const matchesSearch =
            !normalizedSearch ||
            note.title
              ?.toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            note.body
              ?.toLowerCase()
              .includes(
                normalizedSearch,
              );

          return (
            matchesCategory &&
            matchesSearch
          );
        },
      );
    }, [
      notes,
      search,
      activeCategory,
    ]);

  /*
   * ================================
   * COUNTS
   * ================================
   */

  const pinnedCount =
    notes.filter(
      (note) =>
        note.pinned,
    ).length;

  const ideaCount =
    notes.filter(
      (note) =>
        note.category ===
        "Ideas",
    ).length;

  const reminderCount =
    notes.filter(
      (note) =>
        note.category ===
        "Reminders",
    ).length;

  /*
   * ================================
   * FORM
   * ================================
   */

  const resetForm = () => {
    setEditingNoteId(null);

    setFormData(
      getDefaultFormData(),
    );

    setShowForm(false);
  };

  const openAddForm = () => {
    setEditingNoteId(null);

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
      type,
      checked,
    } = event.target;

    setFormData(
      (current) => ({
        ...current,
        [name]:
          type ===
          "checkbox"
            ? checked
            : value,
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

      const title =
        formData.title.trim();

      const body =
        formData.body.trim();

      if (
        !title &&
        !body
      ) {
        return;
      }

      const noteData = {
        title:
          title ||
          "Untitled Note",

        category:
          formData.category,

        body,

        pinned:
          Boolean(
            formData.pinned,
          ),

        updatedAt:
          serverTimestamp(),
      };

      try {
        setSaving(true);

        if (editingNoteId) {
          await updateDoc(
            doc(
              db,
              "parties",
              PARTY_ID,
              "notes",
              editingNoteId,
            ),
            noteData,
          );
        } else {
          await addDoc(
            collection(
              db,
              "parties",
              PARTY_ID,
              "notes",
            ),
            {
              ...noteData,

              createdAt:
                serverTimestamp(),
            },
          );
        }

        resetForm();
      } catch (error) {
        console.error(
          "Error saving note:",
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
    note,
  ) => {
    setEditingNoteId(
      note.id,
    );

    setFormData({
      title:
        note.title ?? "",

      category:
        note.category ??
        "General",

      body:
        note.body ?? "",

      pinned:
        Boolean(
          note.pinned,
        ),
    });

    setShowForm(true);
  };

  /*
   * ================================
   * DELETE
   * ================================
   */

  const handleDelete =
    async (note) => {
      const confirmed =
        window.confirm(
          `Delete "${note.title}"?`,
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
            "notes",
            note.id,
          ),
        );
      } catch (error) {
        console.error(
          "Error deleting note:",
          error,
        );
      }
    };

  /*
   * ================================
   * PIN
   * ================================
   */

  const togglePin =
    async (note) => {
      try {
        await updateDoc(
          doc(
            db,
            "parties",
            PARTY_ID,
            "notes",
            note.id,
          ),
          {
            pinned:
              !note.pinned,

            updatedAt:
              serverTimestamp(),
          },
        );
      } catch (error) {
        console.error(
          "Error updating pin:",
          error,
        );
      }
    };

  /*
   * ================================
   * DATE
   * ================================
   */

  const formatUpdatedDate = (
    note,
  ) => {
    const timestamp =
      note.updatedAt ??
      note.createdAt;

    const date =
      timestamp?.toDate?.();

    if (!date) {
      return "";
    }

    return date.toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      },
    );
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="page-eyebrow">
            Other
          </span>

          <h1>
            Notes
          </h1>

          <p>
            Keep party ideas,
            reminders, vendor
            information, and anything
            else you do not want to
            forget.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={openAddForm}
        >
          + Add Note
        </button>
      </header>

      {/* SUMMARY */}

      <section className="notes-stats-grid">
        <div className="notes-stat-card featured">
          <span className="card-eyebrow">
            Notes
          </span>

          <strong>
            {notes.length}
          </strong>

          <small>
            saved notes
          </small>
        </div>

        <div className="notes-stat-card">
          <span>
            Pinned
          </span>

          <strong>
            {pinnedCount}
          </strong>

          <small>
            important notes
          </small>
        </div>

        <div className="notes-stat-card">
          <span>
            Ideas
          </span>

          <strong>
            {ideaCount}
          </strong>

          <small>
            party ideas
          </small>
        </div>

        <div className="notes-stat-card">
          <span>
            Reminders
          </span>

          <strong>
            {reminderCount}
          </strong>

          <small>
            things to remember
          </small>
        </div>
      </section>

      {/* TOOLBAR */}

      <section className="notes-toolbar">
        <div className="notes-search">
          <input
            type="search"
            value={search}
            onChange={(
              event,
            ) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Search notes..."
          />
        </div>

        <div className="menu-tabs">
          {[
            "All",
            ...categories,
          ].map(
            (category) => (
              <button
                type="button"
                key={
                  category
                }
                className={
                  activeCategory ===
                  category
                    ? "menu-tab active"
                    : "menu-tab"
                }
                onClick={() =>
                  setActiveCategory(
                    category,
                  )
                }
              >
                {category}
              </button>
            ),
          )}
        </div>
      </section>

      {/* NOTES */}

      {loading ? (
        <div className="empty-page-card">
          Loading notes...
        </div>
      ) : visibleNotes.length ===
        0 ? (
        <div className="empty-page-card">
          <div className="notes-empty-content">
            <strong>
              {notes.length === 0
                ? "No notes yet."
                : "No notes match your search."}
            </strong>

            <span>
              {notes.length === 0
                ? "Add your first note to start keeping party ideas and reminders together."
                : "Try another search or category."}
            </span>

            {notes.length ===
              0 && (
              <button
                type="button"
                className="primary-button"
                onClick={
                  openAddForm
                }
              >
                + Add Note
              </button>
            )}
          </div>
        </div>
      ) : (
        <section className="notes-grid">
          {visibleNotes.map(
            (note) => (
              <article
                className={
                  note.pinned
                    ? "note-card pinned"
                    : "note-card"
                }
                key={note.id}
              >
                <div className="note-card-top">
                  <div>
                    <span className="note-category">
                      {
                        note.category
                      }
                    </span>

                    <h2>
                      {note.title}
                    </h2>
                  </div>

                  <button
                    type="button"
                    className={
                      note.pinned
                        ? "note-pin active"
                        : "note-pin"
                    }
                    onClick={() =>
                      togglePin(
                        note,
                      )
                    }
                    title={
                      note.pinned
                        ? "Unpin note"
                        : "Pin note"
                    }
                  >
                    {note.pinned
                      ? "★"
                      : "☆"}
                  </button>
                </div>

                {note.body && (
                  <p className="note-body">
                    {note.body}
                  </p>
                )}

                <div className="note-card-footer">
                  <span>
                    {formatUpdatedDate(
                      note,
                    )}
                  </span>

                  <div className="note-actions">
                    <button
                      type="button"
                      onClick={() =>
                        handleEdit(
                          note,
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
                          note,
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
          <div className="modal-card notes-form-modal">
            <div className="modal-header">
              <div>
                <span className="card-eyebrow">
                  {editingNoteId
                    ? "Edit Note"
                    : "New Note"}
                </span>

                <h2>
                  {editingNoteId
                    ? "Update Note"
                    : "Add Note"}
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
              className="notes-form"
              onSubmit={
                handleSubmit
              }
            >
              <label className="full-field">
                Title

                <input
                  type="text"
                  name="title"
                  value={
                    formData.title
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Drink table ideas"
                  autoFocus
                />
              </label>

              <label>
                Category

                <select
                  name="category"
                  value={
                    formData.category
                  }
                  onChange={
                    handleChange
                  }
                >
                  {categories.map(
                    (category) => (
                      <option
                        key={
                          category
                        }
                        value={
                          category
                        }
                      >
                        {category}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="notes-pin-field">
                <span>
                  Pin Note
                </span>

                <div className="notes-pin-toggle">
                  <input
                    type="checkbox"
                    name="pinned"
                    checked={
                      formData.pinned
                    }
                    onChange={
                      handleChange
                    }
                  />

                  <span>
                    Keep this note
                    at the top
                  </span>
                </div>
              </label>

              <label className="full-field">
                Note

                <textarea
                  name="body"
                  value={
                    formData.body
                  }
                  onChange={
                    handleChange
                  }
                  rows="9"
                  placeholder="Write your note here..."
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
                    : editingNoteId
                      ? "Save Changes"
                      : "Add Note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Notes;