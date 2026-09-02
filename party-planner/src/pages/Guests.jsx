import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../services/firebase";

const PARTY_ID = "halloween-25";

const rsvpOptions = [
  "No Response",
  "Attending",
  "Maybe",
  "Declined",
];

function Guests() {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const [expectedAttendance, setExpectedAttendance] =
    useState(10);

  const [showForm, setShowForm] = useState(false);
  const [editingGuestId, setEditingGuestId] =
    useState(null);

  const [formData, setFormData] = useState({
    name: "",
    rsvp: "No Response",
    plusOne: "",
    plusOneRsvp: "No Response",
    foodNotes: "",
    notes: "",
  });

  useEffect(() => {
    const partyRef = doc(db, "parties", PARTY_ID);

    const unsubscribeParty = onSnapshot(
      partyRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();

          setExpectedAttendance(
            data.expectedAttendance ?? 10,
          );
        } else {
          await setDoc(partyRef, {
            name: "Mattie's 25th Halloween Birthday",
            date: "2026-10-31",
            expectedAttendance: 10,
            createdAt: serverTimestamp(),
          });
        }
      },
    );

    return unsubscribeParty;
  }, []);

  useEffect(() => {
    const guestsRef = collection(
      db,
      "parties",
      PARTY_ID,
      "guests",
    );

    const guestsQuery = query(
      guestsRef,
      orderBy("createdAt", "asc"),
    );

    const unsubscribeGuests = onSnapshot(
      guestsQuery,
      (snapshot) => {
        const guestData = snapshot.docs.map(
          (guestDoc) => ({
            id: guestDoc.id,
            ...guestDoc.data(),
          }),
        );

        setGuests(guestData);
        setLoading(false);
      },
      (error) => {
        console.error(
          "Error loading guests:",
          error,
        );

        setLoading(false);
      },
    );

    return unsubscribeGuests;
  }, []);

  const counts = useMemo(() => {
    let invited = 0;
    let attending = 0;
    let maybe = 0;
    let declined = 0;
    let noResponse = 0;

    guests.forEach((guest) => {
      invited += 1;

      if (guest.rsvp === "Attending") {
        attending += 1;
      }

      if (guest.rsvp === "Maybe") {
        maybe += 1;
      }

      if (guest.rsvp === "Declined") {
        declined += 1;
      }

      if (
        !guest.rsvp ||
        guest.rsvp === "No Response"
      ) {
        noResponse += 1;
      }

      if (guest.plusOne?.trim()) {
        invited += 1;

        const plusOneRsvp =
          guest.plusOneRsvp ?? "No Response";

        if (plusOneRsvp === "Attending") {
          attending += 1;
        }

        if (plusOneRsvp === "Maybe") {
          maybe += 1;
        }

        if (plusOneRsvp === "Declined") {
          declined += 1;
        }

        if (plusOneRsvp === "No Response") {
          noResponse += 1;
        }
      }
    });

    return {
      invited,
      attending,
      maybe,
      declined,
      noResponse,
    };
  }, [guests]);

  const filteredGuests = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    return guests.filter((guest) => {
      const name = guest.name ?? "";
      const plusOne = guest.plusOne ?? "";

      const matchesSearch =
        name
          .toLowerCase()
          .includes(normalizedSearch) ||
        plusOne
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesFilter =
        filter === "All" ||
        guest.rsvp === filter ||
        (
          guest.plusOne?.trim() &&
          (guest.plusOneRsvp ??
            "No Response") === filter
        );

      return matchesSearch && matchesFilter;
    });
  }, [guests, search, filter]);

  const resetForm = () => {
    setFormData({
      name: "",
      rsvp: "No Response",
      plusOne: "",
      plusOneRsvp: "No Response",
      foodNotes: "",
      notes: "",
    });

    setEditingGuestId(null);
    setShowForm(false);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedName = formData.name.trim();
    const trimmedPlusOne =
      formData.plusOne.trim();

    if (!trimmedName) {
      return;
    }

    const guestData = {
      ...formData,
      name: trimmedName,
      plusOne: trimmedPlusOne,
      plusOneRsvp: trimmedPlusOne
        ? formData.plusOneRsvp
        : "No Response",
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingGuestId) {
        const guestRef = doc(
          db,
          "parties",
          PARTY_ID,
          "guests",
          editingGuestId,
        );

        await updateDoc(
          guestRef,
          guestData,
        );
      } else {
        const guestsRef = collection(
          db,
          "parties",
          PARTY_ID,
          "guests",
        );

        await addDoc(guestsRef, {
          ...guestData,
          createdAt: serverTimestamp(),
        });
      }

      setShowForm(false);
      setEditingGuestId(null);

      setFormData({
        name: "",
        rsvp: "No Response",
        plusOne: "",
        plusOneRsvp: "No Response",
        foodNotes: "",
        notes: "",
      });
    } catch (error) {
      console.error(
        "Error saving guest:",
        error,
      );
    }
  };

  const handleEdit = (guest) => {
    setEditingGuestId(guest.id);

    setFormData({
      name: guest.name ?? "",
      rsvp: guest.rsvp ?? "No Response",
      plusOne: guest.plusOne ?? "",
      plusOneRsvp:
        guest.plusOneRsvp ?? "No Response",
      foodNotes: guest.foodNotes ?? "",
      notes: guest.notes ?? "",
    });

    setShowForm(true);
  };

  const handleDelete = async (guestId) => {
    try {
      await deleteDoc(
        doc(
          db,
          "parties",
          PARTY_ID,
          "guests",
          guestId,
        ),
      );
    } catch (error) {
      console.error(
        "Error deleting guest:",
        error,
      );
    }
  };

  const handleStatusChange = async (
    guestId,
    status,
  ) => {
    try {
      const guestRef = doc(
        db,
        "parties",
        PARTY_ID,
        "guests",
        guestId,
      );

      await updateDoc(guestRef, {
        rsvp: status,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(
        "Error updating RSVP:",
        error,
      );
    }
  };

  const handlePlusOneStatusChange = async (
    guestId,
    status,
  ) => {
    try {
      const guestRef = doc(
        db,
        "parties",
        PARTY_ID,
        "guests",
        guestId,
      );

      await updateDoc(guestRef, {
        plusOneRsvp: status,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(
        "Error updating plus-one RSVP:",
        error,
      );
    }
  };

  const updateExpectedAttendance = async (
    newValue,
  ) => {
    const safeValue = Math.max(
      0,
      Number(newValue) || 0,
    );

    setExpectedAttendance(safeValue);

    try {
      const partyRef = doc(
        db,
        "parties",
        PARTY_ID,
      );

      await setDoc(
        partyRef,
        {
          expectedAttendance: safeValue,
          updatedAt: serverTimestamp(),
        },
        {
          merge: true,
        },
      );
    } catch (error) {
      console.error(
        "Error updating expected attendance:",
        error,
      );
    }
  };

  const getStatusClass = (status) => {
    return `guest-status guest-status-${(
      status ?? "No Response"
    )
      .toLowerCase()
      .replaceAll(" ", "-")}`;
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="page-eyebrow">
            People
          </span>

          <h1>Guest List</h1>

          <p>
            Track invitations, RSVPs, plus ones,
            dietary notes, and the number of
            people you actually expect to attend.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          + Add Guest
        </button>
      </header>

      <section className="guest-stats-grid">
        <div className="guest-stat-card">
          <span>Invited</span>
          <strong>{counts.invited}</strong>
        </div>

        <div className="guest-stat-card">
          <span>Attending</span>
          <strong>{counts.attending}</strong>
        </div>

        <div className="guest-stat-card">
          <span>Maybe</span>
          <strong>{counts.maybe}</strong>
        </div>

        <div className="guest-stat-card">
          <span>No Response</span>
          <strong>{counts.noResponse}</strong>
        </div>

        <div className="guest-stat-card declined">
          <span>Declined</span>
          <strong>{counts.declined}</strong>
        </div>
      </section>

      <section className="expected-attendance-card">
        <div>
          <span className="card-eyebrow">
            Planning Number
          </span>

          <h2>Expected Attendance</h2>

          <p>
            Food and drink calculations will use
            this number instead of assuming every
            invited guest will attend.
          </p>
        </div>

        <div className="expected-attendance-input">
          <button
            type="button"
            onClick={() =>
              updateExpectedAttendance(
                expectedAttendance - 1,
              )
            }
          >
            −
          </button>

          <input
            type="number"
            min="0"
            value={expectedAttendance}
            onChange={(event) =>
              updateExpectedAttendance(
                event.target.value,
              )
            }
          />

          <button
            type="button"
            onClick={() =>
              updateExpectedAttendance(
                expectedAttendance + 1,
              )
            }
          >
            +
          </button>
        </div>
      </section>

      <section className="guest-toolbar">
        <div className="guest-search">
          <input
            type="search"
            placeholder="Search guests..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </div>

        <div className="guest-filter-row">
          {[
            "All",
            "Attending",
            "Maybe",
            "No Response",
            "Declined",
          ].map((option) => (
            <button
              key={option}
              type="button"
              className={
                filter === option
                  ? "guest-filter active"
                  : "guest-filter"
              }
              onClick={() =>
                setFilter(option)
              }
            >
              {option}
            </button>
          ))}
        </div>
      </section>

      <section className="guest-list-card">
        <div className="guest-list-header">
          <div>Guest</div>
          <div>RSVP</div>
          <div>Plus One</div>
          <div>Food Notes</div>
          <div />
        </div>

        {loading ? (
          <div className="guest-empty-state">
            Loading guests...
          </div>
        ) : filteredGuests.length === 0 ? (
          <div className="guest-empty-state">
            {guests.length === 0
              ? "No guests yet. Add your first guest!"
              : "No guests match your search."}
          </div>
        ) : (
          filteredGuests.map((guest) => (
            <div
              className="guest-row"
              key={guest.id}
            >
              <div className="guest-name-cell">
                <div className="guest-avatar">
                  {(guest.name ?? "?")
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <strong>
                    {guest.name}
                  </strong>

                  {guest.notes && (
                    <span>
                      {guest.notes}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <select
                  className={getStatusClass(
                    guest.rsvp,
                  )}
                  value={
                    guest.rsvp ??
                    "No Response"
                  }
                  onChange={(event) =>
                    handleStatusChange(
                      guest.id,
                      event.target.value,
                    )
                  }
                >
                  {rsvpOptions.map(
                    (option) => (
                      <option
                        key={option}
                        value={option}
                      >
                        {option}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                {guest.plusOne ? (
                  <div className="plus-one-cell">
                    <strong>
                      {guest.plusOne}
                    </strong>

                    <select
                      className={getStatusClass(
                        guest.plusOneRsvp ??
                          "No Response",
                      )}
                      value={
                        guest.plusOneRsvp ??
                        "No Response"
                      }
                      onChange={(event) =>
                        handlePlusOneStatusChange(
                          guest.id,
                          event.target.value,
                        )
                      }
                    >
                      {rsvpOptions.map(
                        (option) => (
                          <option
                            key={option}
                            value={option}
                          >
                            {option}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                ) : (
                  <span className="guest-secondary-text">
                    —
                  </span>
                )}
              </div>

              <div className="guest-secondary-text">
                {guest.foodNotes || "—"}
              </div>

              <div className="guest-actions">
                <button
                  type="button"
                  onClick={() =>
                    handleEdit(guest)
                  }
                >
                  Edit
                </button>

                <button
                  type="button"
                  className="delete-action"
                  onClick={() =>
                    handleDelete(guest.id)
                  }
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <div className="guest-list-footer">
        Showing {filteredGuests.length} of{" "}
        {guests.length} guest entries
      </div>

      {showForm && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              resetForm();
            }
          }}
        >
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <span className="card-eyebrow">
                  {editingGuestId
                    ? "Edit Guest"
                    : "New Guest"}
                </span>

                <h2>
                  {editingGuestId
                    ? "Update Guest"
                    : "Add Guest"}
                </h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={resetForm}
              >
                ×
              </button>
            </div>

            <form
              className="guest-form"
              onSubmit={handleSubmit}
            >
              <label>
                Guest Name
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Guest name"
                  autoFocus
                  required
                />
              </label>

              <label>
                RSVP Status
                <select
                  name="rsvp"
                  value={formData.rsvp}
                  onChange={handleChange}
                >
                  {rsvpOptions.map(
                    (option) => (
                      <option
                        value={option}
                        key={option}
                      >
                        {option}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                Plus One
                <input
                  type="text"
                  name="plusOne"
                  value={formData.plusOne}
                  onChange={handleChange}
                  placeholder="Optional"
                />
              </label>

              {formData.plusOne.trim() && (
                <label>
                  Plus One RSVP
                  <select
                    name="plusOneRsvp"
                    value={
                      formData.plusOneRsvp
                    }
                    onChange={handleChange}
                  >
                    {rsvpOptions.map(
                      (option) => (
                        <option
                          value={option}
                          key={option}
                        >
                          {option}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              )}

              <label>
                Food / Dietary Notes
                <input
                  type="text"
                  name="foodNotes"
                  value={formData.foodNotes}
                  onChange={handleChange}
                  placeholder="Vegetarian, allergy, etc."
                />
              </label>

              <label className="full-field">
                Notes
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Anything else you want to remember..."
                  rows="4"
                />
              </label>

              <div className="modal-actions full-field">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={resetForm}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  {editingGuestId
                    ? "Save Changes"
                    : "Add Guest"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Guests;