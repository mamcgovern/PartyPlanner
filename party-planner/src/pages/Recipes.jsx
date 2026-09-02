import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  addDoc,
  arrayRemove,
  arrayUnion,
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

const categoryOptions = [
  "Appetizer",
  "Main",
  "Side",
  "Dessert",
  "Snack",
  "Cocktail",
  "Punch",
  "Shot",
  "Other",
];

const defaultIngredient = {
  name: "",
  amount: "",
  unit: "",
};

const getDefaultFormData = () => ({
  name: "",
  category: "Appetizer",
  servings: 1,
  ingredients: [
    {
      ...defaultIngredient,
    },
  ],
  instructions: "",
  notes: "",
  sourceUrl: "",
});

function Recipes() {
  const [recipes, setRecipes] =
    useState([]);

  const [partyRecipes, setPartyRecipes] =
    useState([]);

  const [
    checkedIngredients,
    setCheckedIngredients,
  ] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [
    partyRecipesLoading,
    setPartyRecipesLoading,
  ] = useState(true);

  const [activeView, setActiveView] =
    useState("Party");

  const [search, setSearch] =
    useState("");

  const [
    activeCategory,
    setActiveCategory,
  ] = useState("All");

  const [showForm, setShowForm] =
    useState(false);

  const [
    editingRecipeId,
    setEditingRecipeId,
  ] = useState(null);

  const [
    selectedRecipe,
    setSelectedRecipe,
  ] = useState(null);

  const [
    addingRecipe,
    setAddingRecipe,
  ] = useState(null);

  const [
    addingServings,
    setAddingServings,
  ] = useState(1);

  /*
   * -------------------------------
   * LOAD GLOBAL RECIPES
   * -------------------------------
   */

  useEffect(() => {
    const recipesRef =
      collection(db, "recipes");

    const recipesQuery = query(
      recipesRef,
      orderBy("createdAt", "asc"),
    );

    const unsubscribe =
      onSnapshot(
        recipesQuery,
        (snapshot) => {
          const recipeData =
            snapshot.docs.map(
              (recipeDoc) => ({
                id: recipeDoc.id,
                ...recipeDoc.data(),
              }),
            );

          setRecipes(recipeData);
          setLoading(false);
        },
        (error) => {
          console.error(
            "Error loading recipes:",
            error,
          );

          setLoading(false);
        },
      );

    return unsubscribe;
  }, []);

  /*
   * -------------------------------
   * LOAD RECIPES FOR THIS PARTY
   * -------------------------------
   */

  useEffect(() => {
    const partyRecipesRef =
      collection(
        db,
        "parties",
        PARTY_ID,
        "partyRecipes",
      );

    const partyRecipesQuery =
      query(
        partyRecipesRef,
        orderBy("createdAt", "asc"),
      );

    const unsubscribe =
      onSnapshot(
        partyRecipesQuery,
        (snapshot) => {
          const data =
            snapshot.docs.map(
              (recipeDoc) => ({
                id: recipeDoc.id,
                ...recipeDoc.data(),
              }),
            );

          setPartyRecipes(data);

          setPartyRecipesLoading(
            false,
          );
        },
        (error) => {
          console.error(
            "Error loading party recipes:",
            error,
          );

          setPartyRecipesLoading(
            false,
          );
        },
      );

    return unsubscribe;
  }, []);

  /*
   * -------------------------------
   * LOAD CHECKED INGREDIENTS
   * -------------------------------
   */

  useEffect(() => {
    const partyRef = doc(
      db,
      "parties",
      PARTY_ID,
    );

    const unsubscribe =
      onSnapshot(
        partyRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            return;
          }

          const data =
            snapshot.data();

          setCheckedIngredients(
            data.checkedIngredients ??
              [],
          );
        },
      );

    return unsubscribe;
  }, []);

  /*
   * -------------------------------
   * RECIPE FILTERING
   * -------------------------------
   */

  const filteredRecipes =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return recipes.filter(
        (recipe) => {
          const matchesCategory =
            activeCategory === "All" ||
            recipe.category ===
              activeCategory;

          const matchesSearch =
            !normalizedSearch ||
            recipe.name
              ?.toLowerCase()
              .includes(
                normalizedSearch,
              ) ||
            recipe.ingredients?.some(
              (ingredient) =>
                ingredient.name
                  ?.toLowerCase()
                  .includes(
                    normalizedSearch,
                  ),
            );

          return (
            matchesCategory &&
            matchesSearch
          );
        },
      );
    }, [
      recipes,
      search,
      activeCategory,
    ]);

  const categoriesInUse =
    useMemo(() => {
      return [
        ...new Set(
          recipes
            .map(
              (recipe) =>
                recipe.category,
            )
            .filter(Boolean),
        ),
      ];
    }, [recipes]);

  /*
   * -------------------------------
   * CONNECT PARTY RECIPES TO
   * FULL RECIPE DATA
   * -------------------------------
   */

  const activePartyRecipes =
    useMemo(() => {
      return partyRecipes
        .map((partyRecipe) => {
          const recipe =
            recipes.find(
              (item) =>
                item.id ===
                partyRecipe.recipeId,
            );

          if (!recipe) {
            return null;
          }

          return {
            ...partyRecipe,
            recipe,
          };
        })
        .filter(Boolean);
    }, [
      partyRecipes,
      recipes,
    ]);

  /*
   * -------------------------------
   * COMBINE / SCALE INGREDIENTS
   * -------------------------------
   */

  const combinedIngredients =
    useMemo(() => {
      const ingredientMap =
        new Map();

      activePartyRecipes.forEach(
        ({
          recipe,
          servings,
        }) => {
          const baseServings =
            Number(
              recipe.servings,
            ) || 1;

          const desiredServings =
            Number(servings) || 1;

          const scale =
            desiredServings /
            baseServings;

          (
            recipe.ingredients ?? []
          ).forEach(
            (ingredient) => {
              const name =
                ingredient.name?.trim();

              if (!name) {
                return;
              }

              const unit =
                ingredient.unit
                  ?.trim() ?? "";

              const normalizedName =
                name.toLowerCase();

              const normalizedUnit =
                unit.toLowerCase();

              const key =
                `${normalizedName}__${normalizedUnit}`;

              const baseAmount =
                Number(
                  ingredient.amount,
                );

              const scaledAmount =
                Number.isFinite(
                  baseAmount,
                )
                  ? baseAmount *
                    scale
                  : null;

              if (
                ingredientMap.has(
                  key,
                )
              ) {
                const current =
                  ingredientMap.get(
                    key,
                  );

                if (
                  scaledAmount !==
                    null &&
                  current.amount !==
                    null
                ) {
                  current.amount +=
                    scaledAmount;
                }

                if (
                  !current.recipes.includes(
                    recipe.name,
                  )
                ) {
                  current.recipes.push(
                    recipe.name,
                  );
                }
              } else {
                ingredientMap.set(
                  key,
                  {
                    id: key,
                    name,
                    unit,
                    amount:
                      scaledAmount,
                    recipes: [
                      recipe.name,
                    ],
                  },
                );
              }
            },
          );
        },
      );

      return Array.from(
        ingredientMap.values(),
      ).sort((a, b) =>
        a.name.localeCompare(
          b.name,
        ),
      );
    }, [activePartyRecipes]);

  const checkedCount =
    combinedIngredients.filter(
      (ingredient) =>
        checkedIngredients.includes(
          ingredient.id,
        ),
    ).length;

  const ingredientProgress =
    combinedIngredients.length === 0
      ? 0
      : Math.round(
          (checkedCount /
            combinedIngredients.length) *
            100,
        );

  /*
   * -------------------------------
   * RECIPE FORM
   * -------------------------------
   */

  const resetForm = () => {
    setEditingRecipeId(null);

    setFormData(
      getDefaultFormData(),
    );

    setShowForm(false);
  };

  const [formData, setFormData] =
    useState(
      getDefaultFormData(),
    );

  const openAddForm = () => {
    setEditingRecipeId(null);

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

  const handleIngredientChange = (
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

  const removeIngredient = (
    index,
  ) => {
    setFormData(
      (current) => {
        const updated =
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
            updated.length > 0
              ? updated
              : [
                  {
                    ...defaultIngredient,
                  },
                ],
        };
      },
    );
  };

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      const trimmedName =
        formData.name.trim();

      if (!trimmedName) {
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
                  ? ""
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

      const recipeData = {
        name: trimmedName,

        category:
          formData.category,

        servings:
          Number(
            formData.servings,
          ) || 1,

        ingredients:
          cleanedIngredients,

        instructions:
          formData.instructions.trim(),

        notes:
          formData.notes.trim(),

        sourceUrl:
          formData.sourceUrl.trim(),

        updatedAt:
          serverTimestamp(),
      };

      try {
        if (editingRecipeId) {
          await updateDoc(
            doc(
              db,
              "recipes",
              editingRecipeId,
            ),
            recipeData,
          );
        } else {
          await addDoc(
            collection(
              db,
              "recipes",
            ),
            {
              ...recipeData,

              createdAt:
                serverTimestamp(),
            },
          );
        }

        resetForm();
      } catch (error) {
        console.error(
          "Error saving recipe:",
          error,
        );
      }
    };

  const handleEdit = (
    recipe,
  ) => {
    setEditingRecipeId(
      recipe.id,
    );

    setFormData({
      name: recipe.name ?? "",

      category:
        recipe.category ??
        "Appetizer",

      servings:
        recipe.servings ?? 1,

      ingredients:
        recipe.ingredients
          ?.length > 0
          ? recipe.ingredients.map(
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
        recipe.instructions ?? "",

      notes:
        recipe.notes ?? "",

      sourceUrl:
        recipe.sourceUrl ?? "",
    });

    setSelectedRecipe(null);

    setShowForm(true);
  };

  const handleDelete =
    async (recipeId) => {
      try {
        await deleteDoc(
          doc(
            db,
            "recipes",
            recipeId,
          ),
        );

        if (
          selectedRecipe?.id ===
          recipeId
        ) {
          setSelectedRecipe(null);
        }
      } catch (error) {
        console.error(
          "Error deleting recipe:",
          error,
        );
      }
    };

  /*
   * -------------------------------
   * ADD RECIPE TO PARTY
   * -------------------------------
   */

  const openAddToParty = (
    recipe,
  ) => {
    setAddingRecipe(recipe);

    setAddingServings(
      Number(recipe.servings) ||
        1,
    );

    setSelectedRecipe(null);
  };

  const addRecipeToParty =
    async () => {
      if (!addingRecipe) {
        return;
      }

      const servings =
        Math.max(
          0.1,
          Number(
            addingServings,
          ) || 1,
        );

      try {
        const existing =
          partyRecipes.find(
            (item) =>
              item.recipeId ===
              addingRecipe.id,
          );

        if (existing) {
          await updateDoc(
            doc(
              db,
              "parties",
              PARTY_ID,
              "partyRecipes",
              existing.id,
            ),
            {
              servings,

              updatedAt:
                serverTimestamp(),
            },
          );
        } else {
          await addDoc(
            collection(
              db,
              "parties",
              PARTY_ID,
              "partyRecipes",
            ),
            {
              recipeId:
                addingRecipe.id,

              servings,

              createdAt:
                serverTimestamp(),

              updatedAt:
                serverTimestamp(),
            },
          );
        }

        setAddingRecipe(null);
        setAddingServings(1);

        setActiveView("Party");
      } catch (error) {
        console.error(
          "Error adding recipe to party:",
          error,
        );
      }
    };

  const updatePartyServings =
    async (
      partyRecipeId,
      servings,
    ) => {
      const safeServings =
        Math.max(
          0.1,
          Number(servings) || 1,
        );

      try {
        await updateDoc(
          doc(
            db,
            "parties",
            PARTY_ID,
            "partyRecipes",
            partyRecipeId,
          ),
          {
            servings:
              safeServings,

            updatedAt:
              serverTimestamp(),
          },
        );
      } catch (error) {
        console.error(
          "Error updating servings:",
          error,
        );
      }
    };

  const removeRecipeFromParty =
    async (partyRecipeId) => {
      try {
        await deleteDoc(
          doc(
            db,
            "parties",
            PARTY_ID,
            "partyRecipes",
            partyRecipeId,
          ),
        );
      } catch (error) {
        console.error(
          "Error removing recipe from party:",
          error,
        );
      }
    };

  /*
   * -------------------------------
   * INGREDIENT CHECKLIST
   * -------------------------------
   */

  const toggleIngredient =
    async (ingredientId) => {
      const partyRef = doc(
        db,
        "parties",
        PARTY_ID,
      );

      const currentlyChecked =
        checkedIngredients.includes(
          ingredientId,
        );

      try {
        await setDoc(
          partyRef,
          {
            checkedIngredients:
              currentlyChecked
                ? arrayRemove(
                    ingredientId,
                  )
                : arrayUnion(
                    ingredientId,
                  ),
          },
          {
            merge: true,
          },
        );
      } catch (error) {
        console.error(
          "Error updating ingredient:",
          error,
        );
      }
    };

  const clearIngredientChecks =
    async () => {
      try {
        await setDoc(
          doc(
            db,
            "parties",
            PARTY_ID,
          ),
          {
            checkedIngredients: [],
          },
          {
            merge: true,
          },
        );
      } catch (error) {
        console.error(
          "Error clearing ingredient checks:",
          error,
        );
      }
    };

  /*
   * -------------------------------
   * DISPLAY HELPERS
   * -------------------------------
   */

  const formatAmount = (
    amount,
  ) => {
    if (
      amount === null ||
      amount === undefined
    ) {
      return "";
    }

    const rounded =
      Math.round(
        amount * 100,
      ) / 100;

    return rounded;
  };

  const getIngredientPreview = (
    recipe,
  ) => {
    const ingredients =
      recipe.ingredients ?? [];

    if (
      ingredients.length === 0
    ) {
      return "No ingredients added";
    }

    const preview =
      ingredients
        .slice(0, 3)
        .map(
          (ingredient) =>
            ingredient.name,
        )
        .join(", ");

    if (
      ingredients.length > 3
    ) {
      return `${preview} +${
        ingredients.length - 3
      } more`;
    }

    return preview;
  };

  const isRecipeInParty = (
    recipeId,
  ) => {
    return partyRecipes.some(
      (item) =>
        item.recipeId ===
        recipeId,
    );
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="page-eyebrow">
            Menu Planning
          </span>

          <h1>
            Recipes & Groceries
          </h1>

          <p>
            Save reusable recipes,
            choose what you&apos;re making
            for this party, and
            automatically build one
            combined ingredient list.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={openAddForm}
        >
          + Add Recipe
        </button>
      </header>

      {/* TOP VIEW SWITCHER */}

      <div
        className="menu-tabs"
        style={{
          width: "fit-content",
          marginBottom: "22px",
        }}
      >
        <button
          type="button"
          className={
            activeView === "Party"
              ? "menu-tab active"
              : "menu-tab"
          }
          onClick={() =>
            setActiveView("Party")
          }
        >
          This Party
        </button>

        <button
          type="button"
          className={
            activeView ===
            "Ingredients"
              ? "menu-tab active"
              : "menu-tab"
          }
          onClick={() =>
            setActiveView(
              "Ingredients",
            )
          }
        >
          Ingredient List
        </button>

        <button
          type="button"
          className={
            activeView === "Library"
              ? "menu-tab active"
              : "menu-tab"
          }
          onClick={() =>
            setActiveView("Library")
          }
        >
          Recipe Library
        </button>
      </div>

      {/* =========================
          THIS PARTY
      ========================== */}

      {activeView === "Party" && (
        <>
          <section className="recipe-summary-grid">
            <div className="recipe-summary-card featured">
              <span className="card-eyebrow">
                Halloween Party
              </span>

              <strong>
                {
                  activePartyRecipes.length
                }
              </strong>

              <span>
                recipe
                {activePartyRecipes.length ===
                1
                  ? ""
                  : "s"}{" "}
                planned
              </span>
            </div>

            <div className="recipe-summary-card">
              <span>
                Ingredients
              </span>

              <strong>
                {
                  combinedIngredients.length
                }
              </strong>
            </div>

            <div className="recipe-summary-card">
              <span>
                Grocery Progress
              </span>

              <strong>
                {ingredientProgress}%
              </strong>
            </div>
          </section>

          {partyRecipesLoading ? (
            <div className="empty-page-card">
              Loading party recipes...
            </div>
          ) : activePartyRecipes.length ===
            0 ? (
            <div className="empty-page-card">
              <div className="menu-empty-content">
                <strong>
                  No recipes selected
                  yet.
                </strong>

                <span>
                  Choose recipes from
                  your library to build
                  the menu and grocery
                  list for this party.
                </span>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() =>
                    setActiveView(
                      "Library",
                    )
                  }
                >
                  Browse Recipes
                </button>
              </div>
            </div>
          ) : (
            <section className="recipe-grid">
              {activePartyRecipes.map(
                ({
                  id,
                  servings,
                  recipe,
                }) => {
                  const multiplier =
                    Number(servings) /
                    (Number(
                      recipe.servings,
                    ) || 1);

                  return (
                    <article
                      className="recipe-card"
                      key={id}
                      style={{
                        cursor:
                          "default",
                      }}
                    >
                      <div className="recipe-card-top">
                        <span className="recipe-category">
                          {
                            recipe.category
                          }
                        </span>

                        <span className="recipe-servings">
                          Base:{" "}
                          {
                            recipe.servings
                          }
                        </span>
                      </div>

                      <h2>
                        {recipe.name}
                      </h2>

                      <p className="recipe-ingredient-preview">
                        {
                          recipe.ingredients
                            ?.length ??
                          0
                        }{" "}
                        ingredients
                      </p>

                      <div
                        style={{
                          marginTop:
                            "18px",
                          padding:
                            "14px",
                          borderRadius:
                            "12px",
                          background:
                            "var(--surface-soft)",
                        }}
                      >
                        <label
                          style={{
                            display:
                              "flex",
                            flexDirection:
                              "column",
                            gap: "7px",
                            color:
                              "var(--text-soft)",
                            fontSize:
                              ".7rem",
                            fontWeight:
                              "700",
                          }}
                        >
                          Servings planned

                          <input
                            type="number"
                            min="0.1"
                            step="1"
                            value={
                              servings
                            }
                            onChange={(
                              event,
                            ) =>
                              updatePartyServings(
                                id,
                                event
                                  .target
                                  .value,
                              )
                            }
                            style={{
                              padding:
                                "9px 10px",
                              border:
                                "1px solid var(--border)",
                              borderRadius:
                                "8px",
                              outline:
                                "none",
                              background:
                                "white",
                            }}
                          />
                        </label>

                        <div
                          style={{
                            marginTop:
                              "8px",
                            color:
                              "var(--text-soft)",
                            fontSize:
                              ".67rem",
                          }}
                        >
                          Recipe ×{" "}
                          {Math.round(
                            multiplier *
                              100,
                          ) / 100}
                        </div>
                      </div>

                      <div className="recipe-card-footer">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedRecipe(
                              recipe,
                            )
                          }
                        >
                          View Recipe
                        </button>

                        <button
                          type="button"
                          style={{
                            color:
                              "#a84b41",
                          }}
                          onClick={() =>
                            removeRecipeFromParty(
                              id,
                            )
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </article>
                  );
                },
              )}
            </section>
          )}
        </>
      )}

      {/* =========================
          INGREDIENT LIST
      ========================== */}

      {activeView ===
        "Ingredients" && (
        <>
          <section
            className="expected-attendance-card"
            style={{
              marginBottom: "18px",
            }}
          >
            <div>
              <span className="card-eyebrow">
                Grocery List
              </span>

              <h2>
                Party Ingredients
              </h2>

              <p>
                Ingredients from every
                recipe are scaled to your
                planned servings and
                combined automatically.
              </p>
            </div>

            <div
              style={{
                textAlign: "right",
              }}
            >
              <strong
                style={{
                  display: "block",
                  fontFamily:
                    '"Playfair Display", serif',
                  fontSize: "2rem",
                }}
              >
                {checkedCount}/
                {
                  combinedIngredients.length
                }
              </strong>

              <span
                style={{
                  color:
                    "var(--text-soft)",
                  fontSize: ".7rem",
                }}
              >
                gathered
              </span>
            </div>
          </section>

          {combinedIngredients.length >
            0 && (
            <div
              style={{
                display: "flex",
                justifyContent:
                  "flex-end",
                marginBottom: "10px",
              }}
            >
              <button
                type="button"
                className="text-button"
                onClick={
                  clearIngredientChecks
                }
              >
                Reset Checklist
              </button>
            </div>
          )}

          {combinedIngredients.length ===
          0 ? (
            <div className="empty-page-card">
              <div className="menu-empty-content">
                <strong>
                  No ingredients yet.
                </strong>

                <span>
                  Add recipes to this
                  party first and your
                  combined grocery list
                  will appear here.
                </span>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() =>
                    setActiveView(
                      "Library",
                    )
                  }
                >
                  Browse Recipes
                </button>
              </div>
            </div>
          ) : (
            <section className="guest-list-card">
              {combinedIngredients.map(
                (ingredient) => {
                  const checked =
                    checkedIngredients.includes(
                      ingredient.id,
                    );

                  return (
                    <div
                      key={
                        ingredient.id
                      }
                      style={{
                        display:
                          "grid",
                        gridTemplateColumns:
                          "38px minmax(180px, 1.5fr) minmax(120px, .7fr) minmax(180px, 1fr)",
                        gap: "14px",
                        alignItems:
                          "center",
                        padding:
                          "14px 20px",
                        borderBottom:
                          "1px solid #eee8e3",
                        opacity:
                          checked
                            ? 0.58
                            : 1,
                      }}
                    >
                      <button
                        type="button"
                        className={
                          checked
                            ? "shopping-check checked"
                            : "shopping-check"
                        }
                        onClick={() =>
                          toggleIngredient(
                            ingredient.id,
                          )
                        }
                      >
                        {checked
                          ? "✓"
                          : ""}
                      </button>

                      <strong
                        style={{
                          fontSize:
                            ".8rem",
                          textDecoration:
                            checked
                              ? "line-through"
                              : "none",
                        }}
                      >
                        {
                          ingredient.name
                        }
                      </strong>

                      <div
                        style={{
                          color:
                            "var(--orange)",
                          fontWeight:
                            "700",
                          fontSize:
                            ".78rem",
                        }}
                      >
                        {formatAmount(
                          ingredient.amount,
                        )}{" "}
                        {
                          ingredient.unit
                        }
                      </div>

                      <div
                        style={{
                          color:
                            "var(--text-soft)",
                          fontSize:
                            ".65rem",
                        }}
                      >
                        For:{" "}
                        {ingredient.recipes.join(
                          ", ",
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </section>
          )}
        </>
      )}

      {/* =========================
          RECIPE LIBRARY
      ========================== */}

      {activeView === "Library" && (
        <>
          <section className="recipe-summary-grid">
            <div className="recipe-summary-card featured">
              <span className="card-eyebrow">
                Recipe Book
              </span>

              <strong>
                {recipes.length}
              </strong>

              <span>
                saved recipe
                {recipes.length === 1
                  ? ""
                  : "s"}
              </span>
            </div>

            <div className="recipe-summary-card">
              <span>
                Food Recipes
              </span>

              <strong>
                {
                  recipes.filter(
                    (recipe) =>
                      ![
                        "Cocktail",
                        "Punch",
                        "Shot",
                      ].includes(
                        recipe.category,
                      ),
                  ).length
                }
              </strong>
            </div>

            <div className="recipe-summary-card">
              <span>
                Drink Recipes
              </span>

              <strong>
                {
                  recipes.filter(
                    (recipe) =>
                      [
                        "Cocktail",
                        "Punch",
                        "Shot",
                      ].includes(
                        recipe.category,
                      ),
                  ).length
                }
              </strong>
            </div>
          </section>

          <section className="recipe-toolbar">
            <div className="recipe-search">
              <input
                type="search"
                value={search}
                placeholder="Search recipes or ingredients..."
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event.target.value,
                  )
                }
              />
            </div>

            <div className="recipe-category-filters">
              <button
                type="button"
                className={
                  activeCategory ===
                  "All"
                    ? "recipe-filter active"
                    : "recipe-filter"
                }
                onClick={() =>
                  setActiveCategory(
                    "All",
                  )
                }
              >
                All
              </button>

              {categoriesInUse.map(
                (category) => (
                  <button
                    type="button"
                    key={category}
                    className={
                      activeCategory ===
                      category
                        ? "recipe-filter active"
                        : "recipe-filter"
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

          {loading ? (
            <div className="empty-page-card">
              Loading recipes...
            </div>
          ) : filteredRecipes.length ===
            0 ? (
            <div className="empty-page-card">
              <div className="menu-empty-content">
                <strong>
                  {recipes.length ===
                  0
                    ? "Your recipe book is empty."
                    : "No recipes match those filters."}
                </strong>

                {recipes.length ===
                  0 && (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={
                      openAddForm
                    }
                  >
                    + Add First Recipe
                  </button>
                )}
              </div>
            </div>
          ) : (
            <section className="recipe-grid">
              {filteredRecipes.map(
                (recipe) => (
                  <article
                    className="recipe-card"
                    key={recipe.id}
                    onClick={() =>
                      setSelectedRecipe(
                        recipe,
                      )
                    }
                  >
                    <div className="recipe-card-top">
                      <span className="recipe-category">
                        {
                          recipe.category
                        }
                      </span>

                      <span className="recipe-servings">
                        Makes{" "}
                        {
                          recipe.servings
                        }
                      </span>
                    </div>

                    <h2>
                      {recipe.name}
                    </h2>

                    <p className="recipe-ingredient-preview">
                      {getIngredientPreview(
                        recipe,
                      )}
                    </p>

                    {isRecipeInParty(
                      recipe.id,
                    ) && (
                      <div
                        style={{
                          marginTop:
                            "12px",
                          width:
                            "fit-content",
                          padding:
                            "5px 8px",
                          background:
                            "var(--green-light)",
                          color:
                            "#536650",
                          borderRadius:
                            "999px",
                          fontSize:
                            ".62rem",
                          fontWeight:
                            "700",
                        }}
                      >
                        ✓ On Party
                        Menu
                      </div>
                    )}

                    <div className="recipe-card-footer">
                      <span>
                        {
                          recipe.ingredients
                            ?.length ??
                          0
                        }{" "}
                        ingredients
                      </span>

                      <div
                        style={{
                          display:
                            "flex",
                          gap: "4px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={(
                            event,
                          ) => {
                            event.stopPropagation();

                            handleEdit(
                              recipe,
                            );
                          }}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={(
                            event,
                          ) => {
                            event.stopPropagation();

                            openAddToParty(
                              recipe,
                            );
                          }}
                        >
                          {isRecipeInParty(
                            recipe.id,
                          )
                            ? "Update Party"
                            : "+ Party"}
                        </button>
                      </div>
                    </div>
                  </article>
                ),
              )}
            </section>
          )}
        </>
      )}

      {/* =========================
          ADD RECIPE TO PARTY MODAL
      ========================== */}

      {addingRecipe && (
        <div
          className="modal-backdrop"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setAddingRecipe(
                null,
              );
            }
          }}
        >
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <span className="card-eyebrow">
                  Party Menu
                </span>

                <h2>
                  Add{" "}
                  {
                    addingRecipe.name
                  }
                </h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() =>
                  setAddingRecipe(
                    null,
                  )
                }
              >
                ×
              </button>
            </div>

            <div
              style={{
                padding:
                  "18px",
                background:
                  "var(--surface-soft)",
                borderRadius:
                  "14px",
                marginBottom:
                  "20px",
              }}
            >
              <p
                style={{
                  margin:
                    "0 0 14px",
                  color:
                    "var(--text-soft)",
                  fontSize:
                    ".78rem",
                  lineHeight:
                    "1.5",
                }}
              >
                This recipe normally
                makes{" "}
                <strong>
                  {
                    addingRecipe.servings
                  }
                </strong>
                . How many servings do
                you want for this party?
              </p>

              <label
                style={{
                  display: "flex",
                  flexDirection:
                    "column",
                  gap: "7px",
                  fontSize:
                    ".72rem",
                  fontWeight:
                    "700",
                }}
              >
                Planned Servings

                <input
                  type="number"
                  min="0.1"
                  step="1"
                  value={
                    addingServings
                  }
                  onChange={(
                    event,
                  ) =>
                    setAddingServings(
                      event.target
                        .value,
                    )
                  }
                  style={{
                    padding:
                      "11px",
                    border:
                      "1px solid var(--border)",
                    borderRadius:
                      "9px",
                    outline:
                      "none",
                  }}
                />
              </label>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setAddingRecipe(
                    null,
                  )
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={
                  addRecipeToParty
                }
              >
                Add to Party
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================
          RECIPE DETAILS MODAL
      ========================== */}

      {selectedRecipe && (
        <div
          className="modal-backdrop"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedRecipe(
                null,
              );
            }
          }}
        >
          <div className="modal-card recipe-detail-modal">
            <div className="modal-header">
              <div>
                <span className="card-eyebrow">
                  {
                    selectedRecipe.category
                  }
                </span>

                <h2>
                  {
                    selectedRecipe.name
                  }
                </h2>

                <p className="recipe-detail-serving">
                  Makes{" "}
                  {
                    selectedRecipe.servings
                  }
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() =>
                  setSelectedRecipe(
                    null,
                  )
                }
              >
                ×
              </button>
            </div>

            <div className="recipe-detail-section">
              <h3>
                Ingredients
              </h3>

              {selectedRecipe
                .ingredients?.length >
              0 ? (
                <div className="recipe-ingredient-list">
                  {selectedRecipe.ingredients.map(
                    (
                      ingredient,
                      index,
                    ) => (
                      <div
                        className="recipe-ingredient-item"
                        key={`${ingredient.name}-${index}`}
                      >
                        <span>
                          {
                            ingredient.name
                          }
                        </span>

                        <strong>
                          {
                            ingredient.amount
                          }{" "}
                          {
                            ingredient.unit
                          }
                        </strong>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <p className="recipe-empty-text">
                  No ingredients
                  saved.
                </p>
              )}
            </div>

            {selectedRecipe.instructions && (
              <div className="recipe-detail-section">
                <h3>
                  Instructions
                </h3>

                <p className="recipe-instructions">
                  {
                    selectedRecipe.instructions
                  }
                </p>
              </div>
            )}

            {selectedRecipe.notes && (
              <div className="recipe-detail-section">
                <h3>Notes</h3>

                <p className="recipe-instructions">
                  {
                    selectedRecipe.notes
                  }
                </p>
              </div>
            )}

            {selectedRecipe.sourceUrl && (
              <div className="recipe-detail-section">
                <h3>Source</h3>

                <a
                  href={
                    selectedRecipe.sourceUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="recipe-source-link"
                >
                  Open recipe link ↗
                </a>
              </div>
            )}

            <div className="recipe-detail-actions">
              <button
                type="button"
                className="delete-recipe-button"
                onClick={() =>
                  handleDelete(
                    selectedRecipe.id,
                  )
                }
              >
                Delete Recipe
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  handleEdit(
                    selectedRecipe,
                  )
                }
              >
                Edit
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  openAddToParty(
                    selectedRecipe,
                  )
                }
              >
                Add to Party
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================
          ADD / EDIT RECIPE MODAL
      ========================== */}

      {showForm && (
        <div
          className="modal-backdrop"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              resetForm();
            }
          }}
        >
          <div className="modal-card recipe-form-modal">
            <div className="modal-header">
              <div>
                <span className="card-eyebrow">
                  {editingRecipeId
                    ? "Edit Recipe"
                    : "New Recipe"}
                </span>

                <h2>
                  {editingRecipeId
                    ? "Update Recipe"
                    : "Add Recipe"}
                </h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={
                  resetForm
                }
              >
                ×
              </button>
            </div>

            <form
              className="recipe-form"
              onSubmit={
                handleSubmit
              }
            >
              <label>
                Recipe Name

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
                  {categoryOptions.map(
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

              <label>
                Makes / Servings

                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  name="servings"
                  value={
                    formData.servings
                  }
                  onChange={
                    handleChange
                  }
                />
              </label>

              <label>
                Recipe Link

                <input
                  type="url"
                  name="sourceUrl"
                  value={
                    formData.sourceUrl
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="https://..."
                />
              </label>

              <div className="recipe-ingredients-editor full-field">
                <div className="recipe-editor-heading">
                  <div>
                    <span className="card-eyebrow">
                      Ingredients
                    </span>

                    <h3>
                      What do you
                      need?
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
                          value={
                            ingredient.name
                          }
                          placeholder="Ingredient"
                          onChange={(
                            event,
                          ) =>
                            handleIngredientChange(
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
                          value={
                            ingredient.amount
                          }
                          placeholder="Amount"
                          onChange={(
                            event,
                          ) =>
                            handleIngredientChange(
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
                          value={
                            ingredient.unit
                          }
                          placeholder="Unit"
                          onChange={(
                            event,
                          ) =>
                            handleIngredientChange(
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
                  rows="7"
                  placeholder="Add preparation instructions..."
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
                  rows="3"
                  placeholder="Make ahead, substitutions, serving notes..."
                />
              </label>

              <div className="modal-actions full-field">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    resetForm
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  {editingRecipeId
                    ? "Save Changes"
                    : "Save Recipe"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Recipes;