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
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../services/firebase";

const PARTY_ID = "halloween-25";

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
  "Shot",
  "Beer",
  "Wine",
  "Soda",
  "Water",
  "Other",
];

const defaultIngredient = {
  name: "",
  amount: "",
  unit: "",
};

const getDefaultFormData = () => ({
  name: "",
  type: "Food",
  category: "Appetizer",

  fulfillmentType: "recipe",

  plannedServings: 10,

  recipeServings: 10,

  ingredients: [
    {
      ...defaultIngredient,
    },
  ],

  instructions: "",

  purchaseQuantity: 1,
  purchaseUnit: "",
  store: "",
  estimatedPrice: "",
  shoppingLink: "",

  notes: "",
});

const normalizeMenuItem = (item) => {
  const fulfillmentType =
    item.fulfillmentType ??
    (item.ingredients?.length > 0
      ? "recipe"
      : "purchased");

  let plannedServings =
    item.plannedServings;

  if (
    plannedServings === undefined ||
    plannedServings === null
  ) {
    plannedServings =
      item.plannedQuantity ?? 0;
  }

  return {
    ...item,

    fulfillmentType,

    plannedServings,

    recipeServings:
      item.recipeServings ??
      item.servingsPerUnit ??
      1,

    ingredients:
      item.ingredients ?? [],

    instructions:
      item.instructions ?? "",

    purchaseQuantity:
      item.purchaseQuantity ??
      item.plannedQuantity ??
      1,

    purchaseUnit:
      item.purchaseUnit ??
      item.unitName ??
      "",

    store:
      item.store ?? "",

    estimatedPrice:
      item.estimatedPrice ?? null,

    shoppingLink:
      item.shoppingLink ??
      item.link ??
      "",

    notes:
      item.notes ?? "",
  };
};

function FoodDrinks() {
  const [items, setItems] = useState([]);

  const [
    expectedAttendance,
    setExpectedAttendance,
  ] = useState(0);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [loadError, setLoadError] =
    useState("");

  const [activeTab, setActiveTab] =
    useState("All");

  const [showForm, setShowForm] =
    useState(false);

  const [
    editingItemId,
    setEditingItemId,
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
            .expectedAttendance ?? 0,
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
   * LOAD MENU ITEMS
   * ================================
   */

  useEffect(() => {
    const menuRef = collection(
      db,
      "parties",
      PARTY_ID,
      "menuItems",
    );

    let unsubscribe = null;
    let cancelled = false;

    const sortItems = (data) => {
      return [...data].sort((a, b) => {
        const aTime =
          a.createdAt?.toMillis?.() ?? 0;

        const bTime =
          b.createdAt?.toMillis?.() ?? 0;

        return aTime - bTime;
      });
    };

    const loadMenu = async () => {
      try {
        const snapshot =
          await getDocs(menuRef);

        if (cancelled) {
          return;
        }

        const data =
          snapshot.docs.map(
            (itemDoc) =>
              normalizeMenuItem({
                id: itemDoc.id,
                ...itemDoc.data(),
              }),
          );

        setItems(sortItems(data));
        setLoadError("");
      } catch (error) {
        console.error(
          "Error initially loading menu:",
          error,
        );

        if (!cancelled) {
          setLoadError(
            error.message ||
              "Could not load the menu.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }

      if (cancelled) {
        return;
      }

      unsubscribe = onSnapshot(
        menuRef,
        (snapshot) => {
          if (cancelled) {
            return;
          }

          const data =
            snapshot.docs.map(
              (itemDoc) =>
                normalizeMenuItem({
                  id: itemDoc.id,
                  ...itemDoc.data(),
                }),
            );

          setItems(sortItems(data));
          setLoadError("");
        },
        (error) => {
          console.error(
            "Error listening to menu:",
            error,
          );

          if (!cancelled) {
            setLoadError(
              error.message ||
                "Could not keep the menu updated.",
            );
          }
        },
      );
    };

    loadMenu();

    return () => {
      cancelled = true;

      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  /*
   * ================================
   * FILTERS / COUNTS
   * ================================
   */

  const visibleItems =
    useMemo(() => {
      if (activeTab === "All") {
        return items;
      }

      return items.filter(
        (item) =>
          item.type === activeTab,
      );
    }, [items, activeTab]);

  const foodCount =
    items.filter(
      (item) =>
        item.type === "Food",
    ).length;

  const drinkCount =
    items.filter(
      (item) =>
        item.type === "Drink",
    ).length;

  const recipeCount =
    items.filter(
      (item) =>
        item.fulfillmentType ===
        "recipe",
    ).length;

  const purchasedCount =
    items.filter(
      (item) =>
        item.fulfillmentType ===
        "purchased",
    ).length;

  /*
   * ================================
   * FORM
   * ================================
   */

  const resetForm = () => {
    setEditingItemId(null);

    setFormData(
      getDefaultFormData(),
    );

    setShowForm(false);
  };

  const openAddForm = () => {
    const defaults =
      getDefaultFormData();

    defaults.plannedServings =
      expectedAttendance || 10;

    defaults.recipeServings =
      expectedAttendance || 10;

    setEditingItemId(null);
    setFormData(defaults);
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
      (current) => {
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
      },
    );
  };

  const setFulfillmentType = (
    fulfillmentType,
  ) => {
    setFormData(
      (current) => ({
        ...current,
        fulfillmentType,
      }),
    );
  };

  /*
   * ================================
   * INGREDIENT EDITING
   * ================================
   */

  const addIngredient = () => {
    setFormData(
      (current) => ({
        ...current,

        ingredients: [
          ...current.ingredients,
          {
            ...defaultIngredient,
          },
        ],
      }),
    );
  };

  const updateIngredient = (
    index,
    field,
    value,
  ) => {
    setFormData(
      (current) => ({
        ...current,

        ingredients:
          current.ingredients.map(
            (
              ingredient,
              ingredientIndex,
            ) =>
              ingredientIndex ===
              index
                ? {
                    ...ingredient,
                    [field]: value,
                  }
                : ingredient,
          ),
      }),
    );
  };

  const removeIngredient = (
    index,
  ) => {
    setFormData(
      (current) => {
        const updatedIngredients =
          current.ingredients.filter(
            (
              _,
              ingredientIndex,
            ) =>
              ingredientIndex !==
              index,
          );

        return {
          ...current,

          ingredients:
            updatedIngredients.length >
            0
              ? updatedIngredients
              : [
                  {
                    ...defaultIngredient,
                  },
                ],
        };
      },
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

      const cleanedIngredients =
        formData.ingredients
          .map(
            (ingredient) => ({
              name:
                ingredient.name.trim(),

              amount:
                ingredient.amount ===
                ""
                  ? null
                  : Number(
                      ingredient.amount,
                    ),

              unit:
                ingredient.unit.trim(),
            }),
          )
          .filter(
            (ingredient) =>
              ingredient.name,
          );

      const itemData = {
        name,

        type:
          formData.type,

        category:
          formData.category,

        fulfillmentType:
          formData.fulfillmentType,

        plannedServings:
          Number(
            formData.plannedServings,
          ) || 0,

        notes:
          formData.notes.trim(),

        updatedAt:
          serverTimestamp(),
      };

      if (
        formData.fulfillmentType ===
        "recipe"
      ) {
        itemData.recipeServings =
          Number(
            formData.recipeServings,
          ) || 1;

        itemData.ingredients =
          cleanedIngredients;

        itemData.instructions =
          formData.instructions.trim();

        itemData.purchaseQuantity =
          null;

        itemData.purchaseUnit = "";
        itemData.store = "";
        itemData.estimatedPrice =
          null;
        itemData.shoppingLink = "";
      } else {
        itemData.recipeServings =
          null;

        itemData.ingredients = [];

        itemData.instructions = "";

        itemData.purchaseQuantity =
          Number(
            formData.purchaseQuantity,
          ) || 1;

        itemData.purchaseUnit =
          formData.purchaseUnit.trim();

        itemData.store =
          formData.store.trim();

        itemData.estimatedPrice =
          formData.estimatedPrice ===
          ""
            ? null
            : Number(
                formData.estimatedPrice,
              );

        itemData.shoppingLink =
          formData.shoppingLink.trim();
      }

      try {
        setSaving(true);

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

        /*
         * Explicitly close the modal
         * after a successful save.
         */
        setShowForm(false);
        setEditingItemId(null);

        setFormData(
          getDefaultFormData(),
        );
      } catch (error) {
        console.error(
          "Error saving menu item:",
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
    originalItem,
  ) => {
    const item =
      normalizeMenuItem(
        originalItem,
      );

    setEditingItemId(item.id);

    setFormData({
      name:
        item.name ?? "",

      type:
        item.type ?? "Food",

      category:
        item.category ??
        (item.type === "Drink"
          ? "Cocktail"
          : "Appetizer"),

      fulfillmentType:
        item.fulfillmentType ??
        "recipe",

      plannedServings:
        item.plannedServings ?? 0,

      recipeServings:
        item.recipeServings ?? 1,

      ingredients:
        item.ingredients?.length > 0
          ? item.ingredients.map(
              (ingredient) => ({
                name:
                  ingredient.name ??
                  "",

                amount:
                  ingredient.amount ??
                  "",

                unit:
                  ingredient.unit ??
                  "",
              }),
            )
          : [
              {
                ...defaultIngredient,
              },
            ],

      instructions:
        item.instructions ?? "",

      purchaseQuantity:
        item.purchaseQuantity ?? 1,

      purchaseUnit:
        item.purchaseUnit ?? "",

      store:
        item.store ?? "",

      estimatedPrice:
        item.estimatedPrice ?? "",

      shoppingLink:
        item.shoppingLink ?? "",

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
    async (itemId) => {
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

  /*
   * ================================
   * RECIPE SCALING
   * ================================
   */

  const getRecipeScale = (
    item,
  ) => {
    const recipeServings =
      Number(
        item.recipeServings,
      ) || 1;

    const plannedServings =
      Number(
        item.plannedServings,
      ) || 0;

    return (
      plannedServings /
      recipeServings
    );
  };

  const formatAmount = (
    value,
  ) => {
    const number =
      Number(value);

    if (
      !Number.isFinite(number)
    ) {
      return value;
    }

    return (
      Math.round(
        number * 100,
      ) / 100
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
            Menu Planning
          </span>

          <h1>
            Food & Drinks
          </h1>

          <p>
            Plan everything you&apos;re
            serving, whether you&apos;re
            making it yourself or
            purchasing it ready-made.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={openAddForm}
        >
          + Add Food or Drink
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

          <span>
            expected guests
          </span>
        </div>

        <div className="menu-overview-stat">
          <span>Food</span>

          <strong>
            {foodCount}
          </strong>
        </div>

        <div className="menu-overview-stat">
          <span>Drinks</span>

          <strong>
            {drinkCount}
          </strong>
        </div>

        <div className="menu-overview-stat">
          <span>
            Homemade / Purchased
          </span>

          <strong>
            {recipeCount} /{" "}
            {purchasedCount}
          </strong>
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

      {loadError && (
        <div className="menu-error-banner">
          <strong>
            There was a problem loading
            the menu.
          </strong>

          <span>
            {loadError}
          </span>
        </div>
      )}

      {loading ? (
        <div className="empty-page-card">
          Loading menu...
        </div>
      ) : visibleItems.length ===
        0 ? (
        <div className="empty-page-card">
          <div className="menu-empty-content">
            <strong>
              Nothing on the menu yet.
            </strong>

            <span>
              Add food, drinks,
              appetizers, desserts, or
              anything else you plan to
              serve.
            </span>

            <button
              type="button"
              className="primary-button"
              onClick={openAddForm}
            >
              + Add First Item
            </button>
          </div>
        </div>
      ) : (
        <section className="menu-card-grid">
          {visibleItems.map(
            (item) => {
              const isRecipe =
                item.fulfillmentType ===
                "recipe";

              const scale =
                isRecipe
                  ? getRecipeScale(item)
                  : 1;

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

                      <h2>
                        {item.name}
                      </h2>
                    </div>

                    <span
                      className={
                        isRecipe
                          ? "menu-status good"
                          : "menu-status manual"
                      }
                    >
                      {isRecipe
                        ? "Recipe"
                        : "Purchased"}
                    </span>
                  </div>

                  <div className="menu-calculation">
                    <div>
                      <span>
                        Planned
                      </span>

                      <strong>
                        {
                          item.plannedServings
                        }
                      </strong>

                      <small>
                        servings
                      </small>
                    </div>

                    <div>
                      <span>
                        {isRecipe
                          ? "Recipe Makes"
                          : "Buy"}
                      </span>

                      <strong>
                        {isRecipe
                          ? item.recipeServings
                          : item.purchaseQuantity}
                      </strong>

                      <small>
                        {isRecipe
                          ? `× ${formatAmount(
                              scale,
                            )}`
                          : item.purchaseUnit ||
                            "items"}
                      </small>
                    </div>
                  </div>

                  {isRecipe &&
                    item.ingredients
                      ?.length > 0 && (
                      <div className="menu-ingredient-preview">
                        <div className="menu-ingredient-preview-header">
                          Ingredients
                        </div>

                        <div className="menu-ingredient-preview-list">
                          {item.ingredients
                            .slice(0, 4)
                            .map(
                              (
                                ingredient,
                                index,
                              ) => (
                                <div
                                  className="menu-ingredient-preview-row"
                                  key={`${ingredient.name}-${index}`}
                                >
                                  <span>
                                    {
                                      ingredient.name
                                    }
                                  </span>

                                  <strong>
                                    {ingredient.amount !==
                                      null &&
                                    ingredient.amount !==
                                      undefined
                                      ? formatAmount(
                                          Number(
                                            ingredient.amount,
                                          ) *
                                            scale,
                                        )
                                      : ""}{" "}
                                    {
                                      ingredient.unit
                                    }
                                  </strong>
                                </div>
                              ),
                            )}

                          {item.ingredients
                            .length >
                            4 && (
                            <span className="menu-ingredient-more">
                              +
                              {item
                                .ingredients
                                .length -
                                4}{" "}
                              more ingredients
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                  {!isRecipe && (
                    <div className="menu-formula">
                      {item.store && (
                        <span>
                          Buy from{" "}
                          {item.store}
                        </span>
                      )}

                      {item.estimatedPrice !==
                        null &&
                        item.estimatedPrice !==
                          undefined && (
                          <span>
                            {" · "}
                            Estimated $
                            {Number(
                              item.estimatedPrice,
                            ).toFixed(2)}
                          </span>
                        )}
                    </div>
                  )}

                  {item.notes && (
                    <p className="menu-notes">
                      {item.notes}
                    </p>
                  )}

                  <div className="menu-card-actions">
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
                        handleEdit(item)
                      }
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="delete-action"
                      onClick={() =>
                        handleDelete(
                          item.id,
                        )
                      }
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            },
          )}
        </section>
      )}

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
          <div className="modal-card food-drink-modal">
            <div className="modal-header">
              <div>
                <span className="card-eyebrow">
                  {editingItemId
                    ? "Edit Menu Item"
                    : "New Menu Item"}
                </span>

                <h2>
                  {editingItemId
                    ? "Update Food or Drink"
                    : "Add Food or Drink"}
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
              className="menu-form"
              onSubmit={
                handleSubmit
              }
            >
              <label className="full-field">
                Name

                <input
                  type="text"
                  name="name"
                  value={
                    formData.name
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Buffalo Chicken Dip"
                  required
                  autoFocus
                />
              </label>

              <label>
                Type

                <select
                  name="type"
                  value={
                    formData.type
                  }
                  onChange={
                    handleChange
                  }
                >
                  <option value="Food">
                    Food
                  </option>

                  <option value="Drink">
                    Drink
                  </option>
                </select>
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
                  {(formData.type ===
                  "Food"
                    ? foodCategories
                    : drinkCategories
                  ).map(
                    (category) => (
                      <option
                        value={
                          category
                        }
                        key={
                          category
                        }
                      >
                        {category}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <div className="fulfillment-section">
                <span className="card-eyebrow">
                  How are you getting
                  this?
                </span>

                <div className="fulfillment-options">
                  <button
                    type="button"
                    className={
                      formData.fulfillmentType ===
                      "recipe"
                        ? "fulfillment-option recipe active"
                        : "fulfillment-option recipe"
                    }
                    onClick={() =>
                      setFulfillmentType(
                        "recipe",
                      )
                    }
                  >
                    <strong>
                      Recipe / Homemade
                    </strong>

                    <span>
                      Add ingredients and
                      preparation
                      instructions.
                    </span>
                  </button>

                  <button
                    type="button"
                    className={
                      formData.fulfillmentType ===
                      "purchased"
                        ? "fulfillment-option purchased active"
                        : "fulfillment-option purchased"
                    }
                    onClick={() =>
                      setFulfillmentType(
                        "purchased",
                      )
                    }
                  >
                    <strong>
                      Purchased
                    </strong>

                    <span>
                      Add the quantity,
                      store, price, and
                      shopping link.
                    </span>
                  </button>
                </div>
              </div>

              <label className="full-field">
                Planned Servings

                <input
                  type="number"
                  name="plannedServings"
                  min="0"
                  step="1"
                  value={
                    formData.plannedServings
                  }
                  onChange={
                    handleChange
                  }
                />
              </label>

              {formData.fulfillmentType ===
              "recipe" ? (
                <>
                  <label className="full-field">
                    Recipe Makes

                    <input
                      type="number"
                      name="recipeServings"
                      min="0.1"
                      step="0.1"
                      value={
                        formData.recipeServings
                      }
                      onChange={
                        handleChange
                      }
                    />
                  </label>

                  <div className="recipe-editor">
                    <div className="recipe-editor-header">
                      <div>
                        <span className="card-eyebrow">
                          Recipe
                        </span>

                        <h3>
                          Ingredients
                        </h3>
                      </div>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={
                          addIngredient
                        }
                      >
                        + Ingredient
                      </button>
                    </div>

                    <div className="ingredient-editor-list">
                      {formData.ingredients.map(
                        (
                          ingredient,
                          index,
                        ) => (
                          <div
                            className="ingredient-editor-row"
                            key={
                              index
                            }
                          >
                            <input
                              type="text"
                              placeholder="Ingredient"
                              value={
                                ingredient.name
                              }
                              onChange={(
                                event,
                              ) =>
                                updateIngredient(
                                  index,
                                  "name",
                                  event
                                    .target
                                    .value,
                                )
                              }
                            />

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Amount"
                              value={
                                ingredient.amount
                              }
                              onChange={(
                                event,
                              ) =>
                                updateIngredient(
                                  index,
                                  "amount",
                                  event
                                    .target
                                    .value,
                                )
                              }
                            />

                            <input
                              type="text"
                              placeholder="Unit"
                              value={
                                ingredient.unit
                              }
                              onChange={(
                                event,
                              ) =>
                                updateIngredient(
                                  index,
                                  "unit",
                                  event
                                    .target
                                    .value,
                                )
                              }
                            />

                            <button
                              type="button"
                              className="ingredient-remove"
                              onClick={() =>
                                removeIngredient(
                                  index,
                                )
                              }
                              aria-label="Remove ingredient"
                            >
                              ×
                            </button>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  <label className="full-field">
                    Instructions

                    <textarea
                      name="instructions"
                      value={
                        formData.instructions
                      }
                      onChange={
                        handleChange
                      }
                      rows="6"
                      placeholder="How do you make it?"
                    />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    Quantity to Buy

                    <input
                      type="number"
                      name="purchaseQuantity"
                      min="0"
                      step="0.1"
                      value={
                        formData.purchaseQuantity
                      }
                      onChange={
                        handleChange
                      }
                    />
                  </label>

                  <label>
                    Unit

                    <input
                      type="text"
                      name="purchaseUnit"
                      value={
                        formData.purchaseUnit
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="pizzas, bags, bottles..."
                    />
                  </label>

                  <label>
                    Store / Vendor

                    <input
                      type="text"
                      name="store"
                      value={
                        formData.store
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Walmart, Pizza Ranch..."
                    />
                  </label>

                  <label>
                    Estimated Cost

                    <input
                      type="number"
                      name="estimatedPrice"
                      min="0"
                      step="0.01"
                      value={
                        formData.estimatedPrice
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="0.00"
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
                </>
              )}

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
                  rows="3"
                  placeholder="Flavors, prep notes, serving ideas, etc."
                />
              </label>

              <div className="modal-actions full-field">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    resetForm
                  }
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
                    : editingItemId
                      ? "Save Changes"
                      : "Add to Menu"}
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