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

const defaultFormData = {
  name: "",
  category: "Appetizer",
  servings: 1,
  ingredients: [{ ...defaultIngredient }],
  instructions: "",
  notes: "",
  sourceUrl: "",
};

function Recipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] =
    useState("All");

  const [showForm, setShowForm] = useState(false);
  const [editingRecipeId, setEditingRecipeId] =
    useState(null);

  const [selectedRecipe, setSelectedRecipe] =
    useState(null);

  const [formData, setFormData] = useState(
    defaultFormData,
  );

  useEffect(() => {
    const recipesRef = collection(db, "recipes");

    const recipesQuery = query(
      recipesRef,
      orderBy("createdAt", "asc"),
    );

    const unsubscribe = onSnapshot(
      recipesQuery,
      (snapshot) => {
        const recipeData = snapshot.docs.map(
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

  const filteredRecipes = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    return recipes.filter((recipe) => {
      const matchesCategory =
        activeCategory === "All" ||
        recipe.category === activeCategory;

      const matchesSearch =
        !normalizedSearch ||
        recipe.name
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        recipe.ingredients?.some((ingredient) =>
          ingredient.name
            ?.toLowerCase()
            .includes(normalizedSearch),
        );

      return matchesCategory && matchesSearch;
    });
  }, [recipes, search, activeCategory]);

  const categoriesInUse = useMemo(() => {
    return [
      ...new Set(
        recipes
          .map((recipe) => recipe.category)
          .filter(Boolean),
      ),
    ];
  }, [recipes]);

  const resetForm = () => {
    setEditingRecipeId(null);

    setFormData({
      ...defaultFormData,
      ingredients: [{ ...defaultIngredient }],
    });

    setShowForm(false);
  };

  const openAddForm = () => {
    setEditingRecipeId(null);

    setFormData({
      ...defaultFormData,
      ingredients: [{ ...defaultIngredient }],
    });

    setShowForm(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleIngredientChange = (
    index,
    field,
    value,
  ) => {
    setFormData((current) => ({
      ...current,

      ingredients: current.ingredients.map(
        (ingredient, ingredientIndex) =>
          ingredientIndex === index
            ? {
                ...ingredient,
                [field]: value,
              }
            : ingredient,
      ),
    }));
  };

  const addIngredient = () => {
    setFormData((current) => ({
      ...current,

      ingredients: [
        ...current.ingredients,
        { ...defaultIngredient },
      ],
    }));
  };

  const removeIngredient = (index) => {
    setFormData((current) => {
      const updatedIngredients =
        current.ingredients.filter(
          (_, ingredientIndex) =>
            ingredientIndex !== index,
        );

      return {
        ...current,

        ingredients:
          updatedIngredients.length > 0
            ? updatedIngredients
            : [{ ...defaultIngredient }],
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedName = formData.name.trim();

    if (!trimmedName) {
      return;
    }

    const cleanedIngredients =
      formData.ingredients
        .map((ingredient) => ({
          name: ingredient.name.trim(),
          amount: ingredient.amount,
          unit: ingredient.unit.trim(),
        }))
        .filter((ingredient) => ingredient.name);

    const recipeData = {
      name: trimmedName,
      category: formData.category,
      servings: Number(formData.servings) || 1,
      ingredients: cleanedIngredients,
      instructions: formData.instructions.trim(),
      notes: formData.notes.trim(),
      sourceUrl: formData.sourceUrl.trim(),
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingRecipeId) {
        await updateDoc(
          doc(db, "recipes", editingRecipeId),
          recipeData,
        );
      } else {
        await addDoc(
          collection(db, "recipes"),
          {
            ...recipeData,
            createdAt: serverTimestamp(),
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

  const handleEdit = (recipe) => {
    setEditingRecipeId(recipe.id);

    setFormData({
      name: recipe.name ?? "",
      category:
        recipe.category ?? "Appetizer",
      servings: recipe.servings ?? 1,

      ingredients:
        recipe.ingredients?.length > 0
          ? recipe.ingredients.map(
              (ingredient) => ({
                name: ingredient.name ?? "",
                amount:
                  ingredient.amount ?? "",
                unit: ingredient.unit ?? "",
              }),
            )
          : [{ ...defaultIngredient }],

      instructions:
        recipe.instructions ?? "",

      notes: recipe.notes ?? "",

      sourceUrl:
        recipe.sourceUrl ?? "",
    });

    setSelectedRecipe(null);
    setShowForm(true);
  };

  const handleDelete = async (recipeId) => {
    try {
      await deleteDoc(
        doc(db, "recipes", recipeId),
      );

      if (selectedRecipe?.id === recipeId) {
        setSelectedRecipe(null);
      }
    } catch (error) {
      console.error(
        "Error deleting recipe:",
        error,
      );
    }
  };

  const getIngredientPreview = (recipe) => {
    const ingredients =
      recipe.ingredients ?? [];

    if (ingredients.length === 0) {
      return "No ingredients added";
    }

    const preview = ingredients
      .slice(0, 3)
      .map((ingredient) => ingredient.name)
      .join(", ");

    if (ingredients.length > 3) {
      return `${preview} +${
        ingredients.length - 3
      } more`;
    }

    return preview;
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="page-eyebrow">
            Recipe Book
          </span>

          <h1>Recipes</h1>

          <p>
            Save favorite party recipes once,
            then reuse and scale them for future
            events.
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

      <section className="recipe-summary-grid">
        <div className="recipe-summary-card featured">
          <span className="card-eyebrow">
            Recipe Book
          </span>

          <strong>{recipes.length}</strong>

          <span>
            saved recipe
            {recipes.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="recipe-summary-card">
          <span>Food Recipes</span>

          <strong>
            {
              recipes.filter(
                (recipe) =>
                  ![
                    "Cocktail",
                    "Punch",
                    "Shot",
                  ].includes(recipe.category),
              ).length
            }
          </strong>
        </div>

        <div className="recipe-summary-card">
          <span>Drink Recipes</span>

          <strong>
            {
              recipes.filter((recipe) =>
                [
                  "Cocktail",
                  "Punch",
                  "Shot",
                ].includes(recipe.category),
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
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </div>

        <div className="recipe-category-filters">
          <button
            type="button"
            className={
              activeCategory === "All"
                ? "recipe-filter active"
                : "recipe-filter"
            }
            onClick={() =>
              setActiveCategory("All")
            }
          >
            All
          </button>

          {categoriesInUse.map((category) => (
            <button
              type="button"
              key={category}
              className={
                activeCategory === category
                  ? "recipe-filter active"
                  : "recipe-filter"
              }
              onClick={() =>
                setActiveCategory(category)
              }
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="empty-page-card">
          Loading recipes...
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="empty-page-card">
          <div className="menu-empty-content">
            <strong>
              {recipes.length === 0
                ? "Your recipe book is empty."
                : "No recipes match those filters."}
            </strong>

            {recipes.length === 0 && (
              <>
                <span>
                  Save appetizers, desserts,
                  cocktails, punches, shots,
                  and anything else you might
                  want for a party.
                </span>

                <button
                  type="button"
                  className="primary-button"
                  onClick={openAddForm}
                >
                  + Add First Recipe
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <section className="recipe-grid">
          {filteredRecipes.map((recipe) => (
            <article
              className="recipe-card"
              key={recipe.id}
              onClick={() =>
                setSelectedRecipe(recipe)
              }
            >
              <div className="recipe-card-top">
                <span className="recipe-category">
                  {recipe.category}
                </span>

                <span className="recipe-servings">
                  Makes {recipe.servings}
                </span>
              </div>

              <h2>{recipe.name}</h2>

              <p className="recipe-ingredient-preview">
                {getIngredientPreview(recipe)}
              </p>

              {recipe.notes && (
                <p className="recipe-card-notes">
                  {recipe.notes}
                </p>
              )}

              <div className="recipe-card-footer">
                <span>
                  {recipe.ingredients?.length ?? 0}{" "}
                  ingredient
                  {(recipe.ingredients?.length ??
                    0) === 1
                    ? ""
                    : "s"}
                </span>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleEdit(recipe);
                  }}
                >
                  Edit
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {selectedRecipe && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedRecipe(null);
            }
          }}
        >
          <div className="modal-card recipe-detail-modal">
            <div className="modal-header">
              <div>
                <span className="card-eyebrow">
                  {selectedRecipe.category}
                </span>

                <h2>
                  {selectedRecipe.name}
                </h2>

                <p className="recipe-detail-serving">
                  Makes{" "}
                  {selectedRecipe.servings}
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() =>
                  setSelectedRecipe(null)
                }
              >
                ×
              </button>
            </div>

            <div className="recipe-detail-section">
              <h3>Ingredients</h3>

              {selectedRecipe.ingredients
                ?.length > 0 ? (
                <div className="recipe-ingredient-list">
                  {selectedRecipe.ingredients.map(
                    (ingredient, index) => (
                      <div
                        className="recipe-ingredient-item"
                        key={`${ingredient.name}-${index}`}
                      >
                        <span>
                          {ingredient.name}
                        </span>

                        <strong>
                          {ingredient.amount}{" "}
                          {ingredient.unit}
                        </strong>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <p className="recipe-empty-text">
                  No ingredients saved.
                </p>
              )}
            </div>

            {selectedRecipe.instructions && (
              <div className="recipe-detail-section">
                <h3>Instructions</h3>

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
                  {selectedRecipe.notes}
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
                  setSelectedRecipe(null)
                }
              >
                Done
              </button>
            </div>
          </div>
        </div>
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
                onClick={resetForm}
              >
                ×
              </button>
            </div>

            <form
              className="recipe-form"
              onSubmit={handleSubmit}
            >
              <label>
                Recipe Name
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Buffalo Chicken Dip"
                  required
                  autoFocus
                />
              </label>

              <label>
                Category
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                >
                  {categoryOptions.map(
                    (category) => (
                      <option
                        value={category}
                        key={category}
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
                  value={formData.servings}
                  onChange={handleChange}
                />
              </label>

              <label>
                Recipe Link
                <input
                  type="url"
                  name="sourceUrl"
                  value={formData.sourceUrl}
                  onChange={handleChange}
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
                      What do you need?
                    </h3>
                  </div>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={addIngredient}
                  >
                    + Ingredient
                  </button>
                </div>

                <div className="ingredient-editor-list">
                  {formData.ingredients.map(
                    (ingredient, index) => (
                      <div
                        className="ingredient-editor-row"
                        key={index}
                      >
                        <input
                          type="text"
                          value={
                            ingredient.name
                          }
                          placeholder="Ingredient"
                          onChange={(event) =>
                            handleIngredientChange(
                              index,
                              "name",
                              event.target.value,
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
                          onChange={(event) =>
                            handleIngredientChange(
                              index,
                              "amount",
                              event.target.value,
                            )
                          }
                        />

                        <input
                          type="text"
                          value={
                            ingredient.unit
                          }
                          placeholder="Unit"
                          onChange={(event) =>
                            handleIngredientChange(
                              index,
                              "unit",
                              event.target.value,
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
                  onChange={handleChange}
                  rows="7"
                  placeholder="Add the preparation instructions..."
                />
              </label>

              <label className="full-field">
                Notes
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Make the night before, double for large groups, use less spice, etc."
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