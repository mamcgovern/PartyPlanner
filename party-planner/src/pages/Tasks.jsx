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
  "Not Started",
  "In Progress",
  "Complete",
];

const priorities = [
  "Low",
  "Medium",
  "High",
];

const getDefaultFormData = () => ({
  title: "",
  dueDate: "",
  status: "Not Started",
  priority: "Medium",
  notes: "",
});

function Tasks() {
  const [
    tasks,
    setTasks,
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
    editingTaskId,
    setEditingTaskId,
  ] = useState(null);

  const [
    formData,
    setFormData,
  ] = useState(
    getDefaultFormData(),
  );

  /*
   * ================================
   * LOAD TASKS
   * ================================
   */

  useEffect(() => {
    const tasksRef = collection(
      db,
      "parties",
      PARTY_ID,
      "tasks",
    );

    const unsubscribe = onSnapshot(
      tasksRef,
      (snapshot) => {
        const data =
          snapshot.docs.map(
            (taskDoc) => ({
              id: taskDoc.id,
              ...taskDoc.data(),
            }),
          );

        data.sort((a, b) => {
          /*
           * Completed tasks go last.
           */

          if (
            a.status === "Complete" &&
            b.status !== "Complete"
          ) {
            return 1;
          }

          if (
            a.status !== "Complete" &&
            b.status === "Complete"
          ) {
            return -1;
          }

          /*
           * Tasks with due dates come
           * before tasks without one.
           */

          if (
            a.dueDate &&
            !b.dueDate
          ) {
            return -1;
          }

          if (
            !a.dueDate &&
            b.dueDate
          ) {
            return 1;
          }

          /*
           * Earliest due date first.
           */

          if (
            a.dueDate &&
            b.dueDate
          ) {
            return a.dueDate.localeCompare(
              b.dueDate,
            );
          }

          const aTime =
            a.createdAt?.toMillis?.() ??
            0;

          const bTime =
            b.createdAt?.toMillis?.() ??
            0;

          return aTime - bTime;
        });

        setTasks(data);
        setLoading(false);
      },
      (error) => {
        console.error(
          "Error loading tasks:",
          error,
        );

        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  /*
   * ================================
   * HELPERS
   * ================================
   */

  const getTodayString = () => {
    const now = new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() + 1,
      ).padStart(2, "0");

    const day =
      String(
        now.getDate(),
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const isOverdue = (
    task,
  ) => {
    if (
      !task.dueDate ||
      task.status === "Complete"
    ) {
      return false;
    }

    return (
      task.dueDate <
      getTodayString()
    );
  };

  const isDueSoon = (
    task,
  ) => {
    if (
      !task.dueDate ||
      task.status === "Complete"
    ) {
      return false;
    }

    const today =
      new Date(
        `${getTodayString()}T12:00:00`,
      );

    const due =
      new Date(
        `${task.dueDate}T12:00:00`,
      );

    const difference =
      Math.ceil(
        (due - today) /
          (1000 *
            60 *
            60 *
            24),
      );

    return (
      difference >= 0 &&
      difference <= 7
    );
  };

  const formatDate = (
    dateString,
  ) => {
    if (!dateString) {
      return "No due date";
    }

    const date =
      new Date(
        `${dateString}T12:00:00`,
      );

    return date.toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      },
    );
  };

  const getStatusClass = (
    status,
  ) => {
    switch (status) {
      case "In Progress":
        return "in-progress";

      case "Complete":
        return "complete";

      default:
        return "not-started";
    }
  };

  const getPriorityClass = (
    priority,
  ) => {
    return (
      priority
        ?.toLowerCase()
        .replace(/\s+/g, "-") ??
      "medium"
    );
  };

  /*
   * ================================
   * COUNTS
   * ================================
   */

  const completedCount =
    tasks.filter(
      (task) =>
        task.status ===
        "Complete",
    ).length;

  const inProgressCount =
    tasks.filter(
      (task) =>
        task.status ===
        "In Progress",
    ).length;

  const overdueCount =
    tasks.filter(
      isOverdue,
    ).length;

  const highPriorityCount =
    tasks.filter(
      (task) =>
        task.priority ===
          "High" &&
        task.status !==
          "Complete",
    ).length;

  const progress =
    tasks.length === 0
      ? 0
      : Math.round(
          (completedCount /
            tasks.length) *
            100,
        );

  /*
   * ================================
   * FILTER
   * ================================
   */

  const visibleTasks =
    useMemo(() => {
      if (
        activeFilter === "All"
      ) {
        return tasks;
      }

      if (
        activeFilter ===
        "Overdue"
      ) {
        return tasks.filter(
          isOverdue,
        );
      }

      if (
        activeFilter ===
        "Due Soon"
      ) {
        return tasks.filter(
          isDueSoon,
        );
      }

      return tasks.filter(
        (task) =>
          task.status ===
          activeFilter,
      );
    }, [
      tasks,
      activeFilter,
    ]);

  /*
   * ================================
   * FORM
   * ================================
   */

  const resetForm = () => {
    setEditingTaskId(null);

    setFormData(
      getDefaultFormData(),
    );

    setShowForm(false);
  };

  const openAddForm = () => {
    setEditingTaskId(null);

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

      const title =
        formData.title.trim();

      if (!title) {
        return;
      }

      const taskData = {
        title,

        dueDate:
          formData.dueDate,

        status:
          formData.status,

        priority:
          formData.priority,

        notes:
          formData.notes.trim(),

        updatedAt:
          serverTimestamp(),
      };

      try {
        setSaving(true);

        if (editingTaskId) {
          await updateDoc(
            doc(
              db,
              "parties",
              PARTY_ID,
              "tasks",
              editingTaskId,
            ),
            taskData,
          );
        } else {
          await addDoc(
            collection(
              db,
              "parties",
              PARTY_ID,
              "tasks",
            ),
            {
              ...taskData,

              createdAt:
                serverTimestamp(),
            },
          );
        }

        resetForm();
      } catch (error) {
        console.error(
          "Error saving task:",
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
    task,
  ) => {
    setEditingTaskId(
      task.id,
    );

    setFormData({
      title:
        task.title ?? "",

      dueDate:
        task.dueDate ?? "",

      status:
        task.status ??
        "Not Started",

      priority:
        task.priority ??
        "Medium",

      notes:
        task.notes ?? "",
    });

    setShowForm(true);
  };

  /*
   * ================================
   * DELETE
   * ================================
   */

  const handleDelete =
    async (task) => {
      const confirmed =
        window.confirm(
          `Delete "${task.title}"?`,
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
            "tasks",
            task.id,
          ),
        );
      } catch (error) {
        console.error(
          "Error deleting task:",
          error,
        );
      }
    };

  /*
   * ================================
   * QUICK STATUS
   * ================================
   */

  const updateStatus =
    async (
      task,
      status,
    ) => {
      try {
        await updateDoc(
          doc(
            db,
            "parties",
            PARTY_ID,
            "tasks",
            task.id,
          ),
          {
            status,

            updatedAt:
              serverTimestamp(),
          },
        );
      } catch (error) {
        console.error(
          "Error updating task:",
          error,
        );
      }
    };

  const toggleComplete =
    async (task) => {
      const nextStatus =
        task.status ===
        "Complete"
          ? "Not Started"
          : "Complete";

      await updateStatus(
        task,
        nextStatus,
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
            Planning
          </span>

          <h1>
            Tasks
          </h1>

          <p>
            Keep track of everything
            that needs to happen before
            party day.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={openAddForm}
        >
          + Add Task
        </button>
      </header>

      {/* SUMMARY */}

      <section className="task-stats-grid">
        <div className="task-stat-card featured">
          <span className="card-eyebrow">
            Planning Progress
          </span>

          <div className="task-progress-number">
            {progress}%
          </div>

          <div className="task-progress">
            <div
              className="task-progress-fill"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <small>
            {completedCount} of{" "}
            {tasks.length} complete
          </small>
        </div>

        <div className="task-stat-card">
          <span>
            In Progress
          </span>

          <strong>
            {inProgressCount}
          </strong>

          <small>
            being worked on
          </small>
        </div>

        <div className="task-stat-card">
          <span>
            High Priority
          </span>

          <strong>
            {highPriorityCount}
          </strong>

          <small>
            unfinished
          </small>
        </div>

        <div
          className={
            overdueCount > 0
              ? "task-stat-card warning"
              : "task-stat-card"
          }
        >
          <span>
            Overdue
          </span>

          <strong>
            {overdueCount}
          </strong>

          <small>
            past due
          </small>
        </div>
      </section>

      {/* FILTERS */}

      <section className="task-toolbar">
        <div className="menu-tabs">
          {[
            "All",
            "Not Started",
            "In Progress",
            "Due Soon",
            "Overdue",
            "Complete",
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

      {/* TASK LIST */}

      {loading ? (
        <div className="empty-page-card">
          Loading tasks...
        </div>
      ) : visibleTasks.length ===
        0 ? (
        <div className="empty-page-card">
          <div className="task-empty-content">
            <strong>
              {tasks.length === 0
                ? "No tasks yet."
                : "Nothing matches this filter."}
            </strong>

            <span>
              {tasks.length === 0
                ? "Add your first planning task to get started."
                : "Try another task filter."}
            </span>

            {tasks.length ===
              0 && (
              <button
                type="button"
                className="primary-button"
                onClick={
                  openAddForm
                }
              >
                + Add Task
              </button>
            )}
          </div>
        </div>
      ) : (
        <section className="task-list-card">
          <div className="task-list-header">
            <div />
            <div>Task</div>
            <div>Due</div>
            <div>Priority</div>
            <div>Status</div>
            <div />
          </div>

          {visibleTasks.map(
            (task) => {
              const overdue =
                isOverdue(task);

              const dueSoon =
                isDueSoon(task);

              return (
                <div
                  className={
                    task.status ===
                    "Complete"
                      ? "task-row complete"
                      : overdue
                        ? "task-row overdue"
                        : "task-row"
                  }
                  key={task.id}
                >
                  {/* CHECK */}

                  <div className="task-check-cell">
                    <button
                      type="button"
                      className={
                        task.status ===
                        "Complete"
                          ? "task-check checked"
                          : "task-check"
                      }
                      onClick={() =>
                        toggleComplete(
                          task,
                        )
                      }
                    >
                      {task.status ===
                      "Complete"
                        ? "✓"
                        : ""}
                    </button>
                  </div>

                  {/* TASK */}

                  <div className="task-name-cell">
                    <strong>
                      {task.title}
                    </strong>

                    {task.notes && (
                      <span>
                        {task.notes}
                      </span>
                    )}
                  </div>

                  {/* DUE */}

                  <div className="task-date-cell">
                    <span
                      className={
                        overdue
                          ? "task-date overdue"
                          : dueSoon
                            ? "task-date soon"
                            : "task-date"
                      }
                    >
                      {formatDate(
                        task.dueDate,
                      )}
                    </span>
                  </div>

                  {/* PRIORITY */}

                  <div>
                    <span
                      className={`task-priority ${getPriorityClass(
                        task.priority,
                      )}`}
                    >
                      {
                        task.priority
                      }
                    </span>
                  </div>

                  {/* STATUS */}

                  <div>
                    <select
                      className={`task-status ${getStatusClass(
                        task.status,
                      )}`}
                      value={
                        task.status
                      }
                      onChange={(
                        event,
                      ) =>
                        updateStatus(
                          task,
                          event.target
                            .value,
                        )
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
                  </div>

                  {/* ACTIONS */}

                  <div className="task-actions">
                    <button
                      type="button"
                      onClick={() =>
                        handleEdit(
                          task,
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
                          task,
                        )
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            },
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
          <div className="modal-card task-form-modal">
            <div className="modal-header">
              <div>
                <span className="card-eyebrow">
                  {editingTaskId
                    ? "Edit Task"
                    : "New Task"}
                </span>

                <h2>
                  {editingTaskId
                    ? "Update Task"
                    : "Add Task"}
                </h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={resetForm}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form
              className="task-form"
              onSubmit={
                handleSubmit
              }
            >
              <label className="full-field">
                Task

                <input
                  type="text"
                  name="title"
                  value={
                    formData.title
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Order party supplies"
                  required
                  autoFocus
                />
              </label>

              <label>
                Due Date

                <input
                  type="date"
                  name="dueDate"
                  value={
                    formData.dueDate
                  }
                  onChange={
                    handleChange
                  }
                />
              </label>

              <label>
                Priority

                <select
                  name="priority"
                  value={
                    formData.priority
                  }
                  onChange={
                    handleChange
                  }
                >
                  {priorities.map(
                    (priority) => (
                      <option
                        key={
                          priority
                        }
                        value={
                          priority
                        }
                      >
                        {priority}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="full-field">
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
                        key={status}
                        value={status}
                      >
                        {status}
                      </option>
                    ),
                  )}
                </select>
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
                  placeholder="Any extra details about this task..."
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
                    : editingTaskId
                      ? "Save Changes"
                      : "Add Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tasks;