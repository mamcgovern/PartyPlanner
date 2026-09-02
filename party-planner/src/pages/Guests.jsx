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

const getDefaultFormData = () => ({
    name: "",
    rsvp: "No Response",

    plusOne: "",
    plusOneRsvp: "No Response",

    foodNotes: "",
    notes: "",
});

function Guests() {
    const [guests, setGuests] =
        useState([]);

    const [
        expectedAttendance,
        setExpectedAttendance,
    ] = useState(10);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [search, setSearch] =
        useState("");

    const [activeFilter, setActiveFilter] =
        useState("All");

    const [showForm, setShowForm] =
        useState(false);

    const [
        editingGuestId,
        setEditingGuestId,
    ] = useState(null);

    const [formData, setFormData] =
        useState(
            getDefaultFormData(),
        );

    /*
     * ================================
     * LOAD PARTY SETTINGS
     * ================================
     */

    useEffect(() => {
        const partyRef = doc(
            db,
            "parties",
            PARTY_ID,
        );

        const unsubscribe = onSnapshot(
            partyRef,
            (snapshot) => {
                if (!snapshot.exists()) {
                    return;
                }

                setExpectedAttendance(
                    snapshot.data()
                        .expectedAttendance ?? 10,
                );
            },
            (error) => {
                console.error(
                    "Error loading party:",
                    error,
                );
            },
        );

        return unsubscribe;
    }, []);

    /*
     * ================================
     * LOAD GUESTS
     * ================================
     */

    useEffect(() => {
        const guestsRef = collection(
            db,
            "parties",
            PARTY_ID,
            "guests",
        );

        const unsubscribe = onSnapshot(
            guestsRef,
            (snapshot) => {
                const guestData =
                    snapshot.docs.map(
                        (guestDoc) => ({
                            id: guestDoc.id,
                            ...guestDoc.data(),
                        }),
                    );

                guestData.sort((a, b) => {
                    const aTime =
                        a.createdAt?.toMillis?.() ??
                        0;

                    const bTime =
                        b.createdAt?.toMillis?.() ??
                        0;

                    return aTime - bTime;
                });

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

        return unsubscribe;
    }, []);

    /*
     * ================================
     * TOTALS
     * ================================
     */

    const invitedCount =
        useMemo(() => {
            return guests.reduce(
                (total, guest) => {
                    const hasPlusOne =
                        Boolean(
                            guest.plusOne?.trim(),
                        );

                    return (
                        total +
                        1 +
                        (hasPlusOne ? 1 : 0)
                    );
                },
                0,
            );
        }, [guests]);

    const attendingCount =
        useMemo(() => {
            return guests.reduce(
                (total, guest) => {
                    let count = 0;

                    if (
                        guest.rsvp ===
                        "Attending"
                    ) {
                        count += 1;
                    }

                    if (
                        guest.plusOne?.trim() &&
                        guest.plusOneRsvp ===
                        "Attending"
                    ) {
                        count += 1;
                    }

                    return total + count;
                },
                0,
            );
        }, [guests]);

    const maybeCount =
        useMemo(() => {
            return guests.reduce(
                (total, guest) => {
                    let count = 0;

                    if (
                        guest.rsvp === "Maybe"
                    ) {
                        count += 1;
                    }

                    if (
                        guest.plusOne?.trim() &&
                        guest.plusOneRsvp ===
                        "Maybe"
                    ) {
                        count += 1;
                    }

                    return total + count;
                },
                0,
            );
        }, [guests]);

    const declinedCount =
        useMemo(() => {
            return guests.reduce(
                (total, guest) => {
                    let count = 0;

                    if (
                        guest.rsvp ===
                        "Declined"
                    ) {
                        count += 1;
                    }

                    if (
                        guest.plusOne?.trim() &&
                        guest.plusOneRsvp ===
                        "Declined"
                    ) {
                        count += 1;
                    }

                    return total + count;
                },
                0,
            );
        }, [guests]);

    const noResponseCount =
        useMemo(() => {
            return guests.reduce(
                (total, guest) => {
                    let count = 0;

                    if (
                        !guest.rsvp ||
                        guest.rsvp ===
                        "No Response"
                    ) {
                        count += 1;
                    }

                    if (
                        guest.plusOne?.trim() &&
                        (
                            !guest.plusOneRsvp ||
                            guest.plusOneRsvp ===
                            "No Response"
                        )
                    ) {
                        count += 1;
                    }

                    return total + count;
                },
                0,
            );
        }, [guests]);

    /*
     * ================================
     * FILTERED GUESTS
     * ================================
     */

    const filteredGuests =
        useMemo(() => {
            const normalizedSearch =
                search
                    .trim()
                    .toLowerCase();

            return guests.filter(
                (guest) => {
                    const guestName =
                        guest.name
                            ?.toLowerCase() ?? "";

                    const plusOneName =
                        guest.plusOne
                            ?.toLowerCase() ?? "";

                    const matchesSearch =
                        !normalizedSearch ||
                        guestName.includes(
                            normalizedSearch,
                        ) ||
                        plusOneName.includes(
                            normalizedSearch,
                        );

                    let matchesFilter = true;

                    if (
                        activeFilter !== "All"
                    ) {
                        const guestMatches =
                            guest.rsvp ===
                            activeFilter;

                        const plusOneMatches =
                            Boolean(
                                guest.plusOne?.trim(),
                            ) &&
                            guest.plusOneRsvp ===
                            activeFilter;

                        matchesFilter =
                            guestMatches ||
                            plusOneMatches;
                    }

                    return (
                        matchesSearch &&
                        matchesFilter
                    );
                },
            );
        }, [
            guests,
            search,
            activeFilter,
        ]);

    /*
     * ================================
     * FORM
     * ================================
     */

    const resetForm = () => {
        setEditingGuestId(null);

        setFormData(
            getDefaultFormData(),
        );

        setShowForm(false);
    };

    const openAddForm = () => {
        setEditingGuestId(null);

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
     * SAVE GUEST
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

            const plusOne =
                formData.plusOne.trim();

            const guestData = {
                name,

                rsvp:
                    formData.rsvp,

                plusOne,

                plusOneRsvp:
                    plusOne
                        ? formData.plusOneRsvp
                        : "No Response",

                foodNotes:
                    formData.foodNotes.trim(),

                notes:
                    formData.notes.trim(),

                updatedAt:
                    serverTimestamp(),
            };

            try {
                setSaving(true);

                if (editingGuestId) {
                    await updateDoc(
                        doc(
                            db,
                            "parties",
                            PARTY_ID,
                            "guests",
                            editingGuestId,
                        ),
                        guestData,
                    );
                } else {
                    await addDoc(
                        collection(
                            db,
                            "parties",
                            PARTY_ID,
                            "guests",
                        ),
                        {
                            ...guestData,

                            createdAt:
                                serverTimestamp(),
                        },
                    );
                }

                /*
                 * CLOSE THE MODAL ONLY
                 * AFTER FIRESTORE SAVES
                 * SUCCESSFULLY.
                 */

                setShowForm(false);

                setEditingGuestId(null);

                setFormData(
                    getDefaultFormData(),
                );
            } catch (error) {
                console.error(
                    "Error saving guest:",
                    error,
                );
            } finally {
                setSaving(false);
            }
        };

    /*
     * ================================
     * EDIT GUEST
     * ================================
     */

    const handleEdit = (
        guest,
    ) => {
        setEditingGuestId(
            guest.id,
        );

        setFormData({
            name:
                guest.name ?? "",

            rsvp:
                guest.rsvp ??
                "No Response",

            plusOne:
                guest.plusOne ?? "",

            plusOneRsvp:
                guest.plusOneRsvp ??
                "No Response",

            foodNotes:
                guest.foodNotes ?? "",

            notes:
                guest.notes ?? "",
        });

        setShowForm(true);
    };

    /*
     * ================================
     * DELETE GUEST
     * ================================
     */

    const handleDelete =
        async (guestId) => {
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

    /*
     * ================================
     * DIRECT RSVP UPDATE
     * ================================
     */

    const updateGuestRsvp =
        async (
            guestId,
            rsvp,
        ) => {
            try {
                await updateDoc(
                    doc(
                        db,
                        "parties",
                        PARTY_ID,
                        "guests",
                        guestId,
                    ),
                    {
                        rsvp,

                        updatedAt:
                            serverTimestamp(),
                    },
                );
            } catch (error) {
                console.error(
                    "Error updating RSVP:",
                    error,
                );
            }
        };

    const updatePlusOneRsvp =
        async (
            guestId,
            plusOneRsvp,
        ) => {
            try {
                await updateDoc(
                    doc(
                        db,
                        "parties",
                        PARTY_ID,
                        "guests",
                        guestId,
                    ),
                    {
                        plusOneRsvp,

                        updatedAt:
                            serverTimestamp(),
                    },
                );
            } catch (error) {
                console.error(
                    "Error updating plus-one RSVP:",
                    error,
                );
            }
        };

    /*
     * ================================
     * EXPECTED ATTENDANCE
     * ================================
     */

    const handleExpectedAttendance =
        async (event) => {
            const value =
                Math.max(
                    0,
                    Number(
                        event.target.value,
                    ) || 0,
                );

            setExpectedAttendance(value);

            try {
                await setDoc(
                    doc(
                        db,
                        "parties",
                        PARTY_ID,
                    ),
                    {
                        expectedAttendance:
                            value,

                        updatedAt:
                            serverTimestamp(),
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

    /*
     * ================================
     * RSVP CLASS
     * ================================
     */

    const getStatusClass = (
        status,
    ) => {
        switch (status) {
            case "Attending":
                return "guest-status attending";

            case "Maybe":
                return "guest-status maybe";

            case "Declined":
                return "guest-status declined";

            default:
                return "guest-status no-response";
        }
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
                        People
                    </span>

                    <h1>Guests</h1>

                    <p>
                        Keep track of invitations,
                        RSVPs, plus ones, food notes,
                        and who you&apos;re expecting
                        at the party.
                    </p>
                </div>

                <button
                    type="button"
                    className="primary-button"
                    onClick={openAddForm}
                >
                    + Add Guest
                </button>
            </header>

            {/* =========================
          SUMMARY
      ========================== */}

            <section className="guest-stats-grid">
                <div className="guest-stat-card">
                    <span>
                        Invited
                    </span>

                    <strong>
                        {invitedCount}
                    </strong>

                    <small>
                        including plus ones
                    </small>
                </div>

                <div className="guest-stat-card">
                    <span>
                        Attending
                    </span>

                    <strong>
                        {attendingCount}
                    </strong>

                    <small>
                        confirmed
                    </small>
                </div>

                <div className="guest-stat-card">
                    <span>Maybe</span>

                    <strong>
                        {maybeCount}
                    </strong>

                    <small>
                        undecided
                    </small>
                </div>

                <div className="guest-stat-card">
                    <span>
                        No Response
                    </span>

                    <strong>
                        {noResponseCount}
                    </strong>

                    <small>
                        awaiting RSVP
                    </small>
                </div>

                <div className="guest-stat-card">
                    <span>
                        Declined
                    </span>

                    <strong>
                        {declinedCount}
                    </strong>

                    <small>
                        not attending
                    </small>
                </div>
            </section>

            {/* =========================
          EXPECTED ATTENDANCE
      ========================== */}

            <section className="expected-attendance-card">
                <div>
                    <span className="card-eyebrow">
                        Planning Number
                    </span>

                    <h2>
                        Expected Attendance
                    </h2>

                    <p>
                        Use this number for food and
                        drink planning even while
                        RSVPs are still coming in.
                    </p>
                </div>

                <div className="expected-attendance-input">
                    <input
                        type="number"
                        min="0"
                        value={
                            expectedAttendance
                        }
                        onChange={
                            handleExpectedAttendance
                        }
                    />

                    <span>guests</span>
                </div>
            </section>

            {/* =========================
          SEARCH / FILTER
      ========================== */}

            <section className="guest-toolbar">
                <div className="guest-search">
                    <input
                        type="search"
                        value={search}
                        placeholder="Search guests..."
                        onChange={(
                            event,
                        ) =>
                            setSearch(
                                event.target.value,
                            )
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
                    ].map((filter) => (
                        <button
                            type="button"
                            key={filter}
                            className={
                                activeFilter ===
                                    filter
                                    ? "guest-filter active"
                                    : "guest-filter"
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

            {/* =========================
          GUEST LIST
      ========================== */}

            {loading ? (
                <div className="empty-page-card">
                    Loading guests...
                </div>
            ) : filteredGuests.length ===
                0 ? (
                <div className="empty-page-card">
                    <div className="menu-empty-content">
                        <strong>
                            {guests.length === 0
                                ? "No guests added yet."
                                : "No guests match those filters."}
                        </strong>

                        {guests.length === 0 && (
                            <>
                                <span>
                                    Start adding everyone
                                    you invited to the
                                    party.
                                </span>

                                <button
                                    type="button"
                                    className="primary-button"
                                    onClick={
                                        openAddForm
                                    }
                                >
                                    + Add First Guest
                                </button>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                <section className="guest-list-card">
                    <div className="guest-list-header">
                        <div>Guest</div>
                        <div>RSVP</div>
                        <div>Plus One</div>
                        <div>Food Notes</div>
                        <div />
                    </div>

                    {filteredGuests.map(
                        (guest) => (
                            <div
                                className="guest-row"
                                key={guest.id}
                            >
                                {/* MAIN GUEST */}

                                <div className="guest-name-cell">
                                    <div className="guest-avatar">
                                        {guest.name
                                            ?.charAt(0)
                                            .toUpperCase()}
                                    </div>

                                    <div>
                                        <strong>
                                            {guest.name}
                                        </strong>

                                        {guest.notes && (
                                            <span className="guest-secondary-text">
                                                {guest.notes}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* MAIN RSVP */}

                                <div>
                                    <select
                                        className={getStatusClass(
                                            guest.rsvp ??
                                            "No Response",
                                        )}
                                        value={
                                            guest.rsvp ??
                                            "No Response"
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            updateGuestRsvp(
                                                guest.id,
                                                event.target
                                                    .value,
                                            )
                                        }
                                    >
                                        {rsvpOptions.map(
                                            (option) => (
                                                <option
                                                    value={
                                                        option
                                                    }
                                                    key={
                                                        option
                                                    }
                                                >
                                                    {option}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </div>

                                {/* PLUS ONE */}

                                <div className="plus-one-cell">
                                    {guest.plusOne ? (
                                        <>
                                            <strong>
                                                {
                                                    guest.plusOne
                                                }
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
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updatePlusOneRsvp(
                                                        guest.id,
                                                        event.target
                                                            .value,
                                                    )
                                                }
                                            >
                                                {rsvpOptions.map(
                                                    (option) => (
                                                        <option
                                                            value={
                                                                option
                                                            }
                                                            key={
                                                                option
                                                            }
                                                        >
                                                            {
                                                                option
                                                            }
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </>
                                    ) : (
                                        <span className="guest-secondary-text">
                                            —
                                        </span>
                                    )}
                                </div>

                                {/* FOOD NOTES */}

                                <div className="guest-secondary-text">
                                    {guest.foodNotes ||
                                        "—"}
                                </div>

                                {/* ACTIONS */}

                                <div className="guest-actions">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleEdit(
                                                guest,
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
                                                guest.id,
                                            )
                                        }
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ),
                    )}

                    <div className="guest-list-footer">
                        Showing{" "}
                        {filteredGuests.length} of{" "}
                        {guests.length} guest
                        {guests.length === 1
                            ? ""
                            : " records"}
                    </div>
                </section>
            )}

            {/* =========================
          ADD / EDIT MODAL
      ========================== */}

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
                    <div className="modal-card guest-form-modal">
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
                                onClick={
                                    resetForm
                                }
                                disabled={saving}
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
                                    required
                                    autoFocus
                                />
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

                            <label>
                                Guest RSVP

                                <select
                                    name="rsvp"
                                    value={formData.rsvp}
                                    onChange={handleChange}
                                >
                                    {rsvpOptions.map((option) => (
                                        <option
                                            value={option}
                                            key={option}
                                        >
                                            {option}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                Plus One RSVP

                                <select
                                    name="plusOneRsvp"
                                    value={formData.plusOneRsvp}
                                    onChange={handleChange}
                                    disabled={!formData.plusOne.trim()}
                                >
                                    {rsvpOptions.map((option) => (
                                        <option
                                            value={option}
                                            key={option}
                                        >
                                            {option}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="full-field">
                                Food / Dietary Notes

                                <textarea
                                    name="foodNotes"
                                    value={formData.foodNotes}
                                    onChange={handleChange}
                                    rows="3"
                                    placeholder="Allergies, vegetarian, dietary needs..."
                                />
                            </label>

                            <label className="full-field">
                                Notes

                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    rows="3"
                                    placeholder="Anything else you want to remember..."
                                />
                            </label>

                            <div className="modal-actions full-field">
                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={resetForm}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="primary-button"
                                    disabled={saving}
                                >
                                    {saving
                                        ? "Saving..."
                                        : editingGuestId
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