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
  updateDoc,
} from "firebase/firestore";
import { db } from "../services/firebase";

const PARTY_ID = "halloween-25";

const typeOptions = ["Food", "Drink"];

const foodCategories = [
  "Appetizer",
  "Main",
  "Side",
  "Dessert",
  "Snack",
  "Other",
];

const drinkCategories = [
  "Cocktail",
  "Punch",
  "Beer",
  "Wine",
  "Soda",
  "Water",
  "Other",
];

const defaultFormData = {
  name: "",
  type: "Food",
  category: "Appetizer",
  calculationType: "perGuest",
  amountPerGuest: 1,
  servingsPerUnit: 1,
  plannedQuantity: "",
  unitName: "servings",
  notes: "",
};

function FoodDrinks() {
  const [items, setItems] = useState([]);
  const [expectedAttendance, setExpectedAttendance] =
    useState(0);

  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] =
    useState("All");

  const [showForm, setShowForm] =
    useState(false);

  const [editingItemId, setEditingItemId] =
    useState(null);

  const [formData, setFormData] =
    useState(defaultFormData);

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
          snapshot.data().expectedAttendance ?? 0,
        );
      },
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    const itemsRef = collection(
      db,
      "parties",
      PARTY_ID,
      "menuItems",
    );

    const itemsQuery = query(
      itemsRef,
      orderBy("createdAt", "asc"),
    );

    const unsubscribe = onSnapshot(
      itemsQuery,
      (snapshot) => {
        setItems(
          snapshot.docs.map((itemDoc) => ({
            id: itemDoc.id,
            ...itemDoc.data(),
          })),
        );

        setLoading(false);
      },
      (error) => {
        console.error(
          "Error loading menu items:",
          error,
        );

        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  const visibleItems = useMemo(() => {
    if (activeTab === "All") {
      return items;
    }

    return items.filter(
      (item) => item.type === activeTab,
    );
  }, [items, activeTab]);

  const foodItems = items.filter(
    (item) => item.type === "Food",
  );

  const drinkItems = items.filter(
    (item) => item.type === "Drink",
  );

  const calculateRecommendation = (item) => {
    if (
      item.calculationType === "manual"
    ) {
      return Number(
        item.plannedQuantity || 0,
      );
    }

    const amountPerGuest = Number(
      item.amountPerGuest || 0,
    );

    const servingsPerUnit = Number(
      item.servingsPerUnit || 1,
    );

    const totalNeeded =
      expectedAttendance * amountPerGuest;

    return Math.ceil(
      totalNeeded /
        Math.max(servingsPerUnit, 1),
    );
  };

  const getPlannedQuantity = (item) => {
    return Number(
      item.plannedQuantity || 0,
    );
  };

  const getItemStatus = (item) => {
    if (
      item.calculationType === "manual"
    ) {
      return {
        label: "Manual",
        className: "menu-status manual",
      };
    }

    const recommended =
      calculateRecommendation(item);

    const planned =
      getPlannedQuantity(item);

    if (planned === 0) {
      return {
        label: "Not planned",
        className: "menu-status warning",
      };
    }

    if (planned < recommended) {
      return {
        label: "Need more",
        className: "menu-status warning",
      };
    }

    return {
      label: "Enough",
      className: "menu-status good",
    };
  };

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingItemId(null);
    setShowForm(false);
  };

  const openAddForm = () => {
    setEditingItemId(null);
    setFormData(defaultFormData);
    setShowForm(true);
  };

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((current) => {
      const updated = {
        ...current,
        [name]: value,
      };

      if (name === "type") {
        updated.category =
          value === "Food"
            ? "Appetizer"
            : "Cocktail";
      }

      return updated;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedName =
      formData.name.trim();

    if (!trimmedName) {
      return;
    }

    const itemData = {
      ...formData,
      name: trimmedName,

      amountPerGuest: Number(
        formData.amountPerGuest || 0,
      ),

      servingsPerUnit: Number(
        formData.servingsPerUnit || 1,
      ),

      plannedQuantity: Number(
        formData.plannedQuantity || 0,
      ),

      updatedAt: serverTimestamp(),
    };

    try {
      if (editingItemId) {
        await updateDoc(
          doc(
            db,
            "parties",
            PARTY_ID,
            "menuItems",
            editingItemId,
          ),
          itemData,
        );
      } else {
        await addDoc(
          collection(
            db,
            "parties",
            PARTY_ID,
            "menuItems",
          ),
          {
            ...itemData,
            createdAt:
              serverTimestamp(),
          },
        );
      }

      resetForm();
    } catch (error) {
      console.error(
        "Error saving menu item:",
        error,
      );
    }
  };

  const handleEdit = (item) => {
    setEditingItemId(item.id);

    setFormData({
      name: item.name ?? "",
      type: item.type ?? "Food",

      category:
        item.category ??
        (item.type === "Drink"
          ? "Cocktail"
          : "Appetizer"),

      calculationType:
        item.calculationType ??
        "perGuest",

      amountPerGuest:
        item.amountPerGuest ?? 1,

      servingsPerUnit:
        item.servingsPerUnit ?? 1,

      plannedQuantity:
        item.plannedQuantity ?? "",

      unitName:
        item.unitName ?? "servings",

      notes: item.notes ?? "",
    });

    setShowForm(true);
  };

  const handleDelete = async (itemId) => {
    try {
      await deleteDoc(
        doc(
          db,
          "parties",
          PARTY_ID,
          "menuItems",
          itemId,
        ),
      );
    } catch (error) {
      console.error(
        "Error deleting menu item:",
        error,
      );
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="page-eyebrow">
            Menu Planning
          </span>

          <h1>Food & Drinks</h1>

          <p>
            Plan the menu and automatically
            calculate quantities using your
            expected guest count.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={openAddForm}
        >
          + Add Item
        </button>
      </header>

      <section className="menu-overview">
        <div className="menu-overview-main">
          <span className="card-eyebrow">
            Planning For
          </span>

          <strong>
            {expectedAttendance}
          </strong>

          <span>expected guests</span>
        </div>

        <div className="menu-overview-stat">
          <span>Food Items</span>
          <strong>
            {foodItems.length}
          </strong>
        </div>

        <div className="menu-overview-stat">
          <span>Drink Items</span>
          <strong>
            {drinkItems.length}
          </strong>
        </div>

        <div className="menu-overview-stat">
          <span>Total Items</span>
          <strong>{items.length}</strong>
        </div>
      </section>

      <section className="menu-toolbar">
        <div className="menu-tabs">
          {[
            "All",
            "Food",
            "Drink",
          ].map((tab) => (
            <button
              type="button"
              key={tab}
              className={
                activeTab === tab
                  ? "menu-tab active"
                  : "menu-tab"
              }
              onClick={() =>
                setActiveTab(tab)
              }
            >
              {tab === "Drink"
                ? "Drinks"
                : tab}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="empty-page-card">
          Loading menu...
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="empty-page-card">
          <div className="menu-empty-content">
            <strong>
              Nothing planned yet.
            </strong>

            <span>
              Add your first food or drink
              item to start building the
              party menu.
            </span>

            <button
              type="button"
              className="primary-button"
              onClick={openAddForm}
            >
              + Add Item
            </button>
          </div>
        </div>
      ) : (
        <section className="menu-card-grid">
          {visibleItems.map((item) => {
            const recommendation =
              calculateRecommendation(item);

            const planned =
              getPlannedQuantity(item);

            const status =
              getItemStatus(item);

            return (
              <article
                className="menu-item-card"
                key={item.id}
              >
                <div className="menu-item-top">
                  <div>
                    <span className="menu-type">
                      {item.type} ·{" "}
                      {item.category}
                    </span>

                    <h2>{item.name}</h2>
                  </div>

                  <span
                    className={
                      status.className
                    }
                  >
                    {status.label}
                  </span>
                </div>

                {item.calculationType ===
                "perGuest" ? (
                  <div className="menu-calculation">
                    <div>
                      <span>
                        Recommended
                      </span>

                      <strong>
                        {recommendation}
                      </strong>

                      <small>
                        {item.unitName}
                      </small>
                    </div>

                    <div>
                      <span>Planned</span>

                      <strong>
                        {planned}
                      </strong>

                      <small>
                        {item.unitName}
                      </small>
                    </div>
                  </div>
                ) : (
                  <div className="menu-calculation single">
                    <div>
                      <span>
                        Planned Quantity
                      </span>

                      <strong>
                        {planned}
                      </strong>

                      <small>
                        {item.unitName}
                      </small>
                    </div>
                  </div>
                )}

                {item.calculationType ===
                  "perGuest" && (
                  <div className="menu-formula">
                    {item.amountPerGuest}{" "}
                    serving
                    {Number(
                      item.amountPerGuest,
                    ) === 1
                      ? ""
                      : "s"}{" "}
                    per guest
                    {" · "}
                    {item.servingsPerUnit}{" "}
                    serving
                    {Number(
                      item.servingsPerUnit,
                    ) === 1
                      ? ""
                      : "s"}{" "}
                    per {item.unitName.replace(/s$/, "")}
                  </div>
                )}

                {item.notes && (
                  <p className="menu-notes">
                    {item.notes}
                  </p>
                )}

                <div className="menu-card-actions">
                  <button
                    type="button"
                    onClick={() =>
                      handleEdit(item)
                    }
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="delete-action"
                    onClick={() =>
                      handleDelete(item.id)
                    }
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

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
                  {editingItemId
                    ? "Edit Menu Item"
                    : "New Menu Item"}
                </span>

                <h2>
                  {editingItemId
                    ? "Update Item"
                    : "Add Food or Drink"}
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
              className="menu-form"
              onSubmit={handleSubmit}
            >
              <label className="full-field">
                Name
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Pizza, Dirty Shirley, cupcakes..."
                  required
                  autoFocus
                />
              </label>

              <label>
                Type
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                >
                  {typeOptions.map(
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
                Category
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                >
                  {(formData.type ===
                  "Food"
                    ? foodCategories
                    : drinkCategories
                  ).map((option) => (
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
                Quantity Planning
                <select
                  name="calculationType"
                  value={
                    formData.calculationType
                  }
                  onChange={handleChange}
                >
                  <option value="perGuest">
                    Calculate from guest count
                  </option>

                  <option value="manual">
                    Manual quantity
                  </option>
                </select>
              </label>

              {formData.calculationType ===
                "perGuest" && (
                <>
                  <label>
                    Servings Per Guest
                    <input
                      type="number"
                      name="amountPerGuest"
                      min="0"
                      step="0.1"
                      value={
                        formData.amountPerGuest
                      }
                      onChange={handleChange}
                    />
                  </label>

                  <label>
                    Servings Per Unit
                    <input
                      type="number"
                      name="servingsPerUnit"
                      min="0.1"
                      step="0.1"
                      value={
                        formData.servingsPerUnit
                      }
                      onChange={handleChange}
                    />
                  </label>
                </>
              )}

              <label>
                Planned Quantity
                <input
                  type="number"
                  name="plannedQuantity"
                  min="0"
                  step="0.1"
                  value={
                    formData.plannedQuantity
                  }
                  onChange={handleChange}
                  placeholder="0"
                />
              </label>

              <label>
                Unit
                <input
                  type="text"
                  name="unitName"
                  value={formData.unitName}
                  onChange={handleChange}
                  placeholder="pizzas, bottles, cans..."
                />
              </label>

              <label className="full-field">
                Notes
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Flavor choices, where to order it, prep notes, etc."
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
                  {editingItemId
                    ? "Save Changes"
                    : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default FoodDrinks;