import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";

import { db } from "../services/firebase";

const PARTY_ID = "halloween-25";

function Shopping() {
  const [menuItems, setMenuItems] =
    useState([]);

  const [
    checkedShoppingItems,
    setCheckedShoppingItems,
  ] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [activeTab, setActiveTab] =
    useState("All");

  /*
   * ================================
   * LOAD MENU
   * ================================
   */

  useEffect(() => {
    const menuRef = collection(
      db,
      "parties",
      PARTY_ID,
      "menuItems",
    );

    const menuQuery = query(
      menuRef,
      orderBy("createdAt", "asc"),
    );

    const unsubscribe =
      onSnapshot(
        menuQuery,
        (snapshot) => {
          setMenuItems(
            snapshot.docs.map(
              (itemDoc) => ({
                id: itemDoc.id,
                ...itemDoc.data(),
              }),
            ),
          );

          setLoading(false);
        },
        (error) => {
          console.error(
            "Error loading shopping items:",
            error,
          );

          setLoading(false);
        },
      );

    return unsubscribe;
  }, []);

  /*
   * ================================
   * LOAD CHECKBOX STATE
   * ================================
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

          setCheckedShoppingItems(
            snapshot.data()
              .checkedShoppingItems ??
              [],
          );
        },
      );

    return unsubscribe;
  }, []);

  /*
   * ================================
   * PURCHASED MENU ITEMS
   * ================================
   */

  const purchasedItems =
    useMemo(() => {
      return menuItems
        .filter(
          (item) =>
            item.fulfillmentType ===
            "purchased",
        )
        .map((item) => ({
          id: `purchase__${item.id}`,

          sourceId: item.id,

          type: "Purchased",

          name: item.name,

          amount:
            item.purchaseQuantity ??
            1,

          unit:
            item.purchaseUnit ?? "",

          store:
            item.store ?? "",

          estimatedPrice:
            item.estimatedPrice ??
            null,

          shoppingLink:
            item.shoppingLink ?? "",

          source:
            item.name,
        }));
    }, [menuItems]);

  /*
   * ================================
   * RECIPE INGREDIENTS
   * ================================
   */

  const recipeIngredients =
    useMemo(() => {
      const ingredientMap =
        new Map();

      menuItems
        .filter(
          (item) =>
            item.fulfillmentType ===
            "recipe",
        )
        .forEach((item) => {
          const plannedServings =
            Number(
              item.plannedServings,
            ) || 0;

          const recipeServings =
            Number(
              item.recipeServings,
            ) || 1;

          const scale =
            plannedServings /
            recipeServings;

          (
            item.ingredients ?? []
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

              const key = `${name
                .toLowerCase()}__${unit.toLowerCase()}`;

              const amount =
                Number(
                  ingredient.amount,
                );

              const scaledAmount =
                Number.isFinite(amount)
                  ? amount * scale
                  : null;

              if (
                ingredientMap.has(
                  key,
                )
              ) {
                const existing =
                  ingredientMap.get(
                    key,
                  );

                if (
                  existing.amount !==
                    null &&
                  scaledAmount !==
                    null
                ) {
                  existing.amount +=
                    scaledAmount;
                }

                if (
                  !existing.sources.includes(
                    item.name,
                  )
                ) {
                  existing.sources.push(
                    item.name,
                  );
                }
              } else {
                ingredientMap.set(
                  key,
                  {
                    id: `ingredient__${key}`,

                    type:
                      "Ingredient",

                    name,

                    amount:
                      scaledAmount,

                    unit,

                    sources: [
                      item.name,
                    ],
                  },
                );
              }
            },
          );
        });

      return Array.from(
        ingredientMap.values(),
      ).sort((a, b) =>
        a.name.localeCompare(
          b.name,
        ),
      );
    }, [menuItems]);

  /*
   * ================================
   * TOTAL LIST
   * ================================
   */

  const allItems =
    useMemo(() => {
      return [
        ...purchasedItems,
        ...recipeIngredients,
      ];
    }, [
      purchasedItems,
      recipeIngredients,
    ]);

  const visibleItems =
    useMemo(() => {
      if (
        activeTab === "Purchased"
      ) {
        return purchasedItems;
      }

      if (
        activeTab ===
        "Ingredients"
      ) {
        return recipeIngredients;
      }

      return allItems;
    }, [
      activeTab,
      allItems,
      purchasedItems,
      recipeIngredients,
    ]);

  /*
   * ================================
   * SUMMARY
   * ================================
   */

  const checkedCount =
    allItems.filter((item) =>
      checkedShoppingItems.includes(
        item.id,
      ),
    ).length;

  const remainingCount =
    allItems.length -
    checkedCount;

  const progress =
    allItems.length === 0
      ? 0
      : Math.round(
          (checkedCount /
            allItems.length) *
            100,
        );

  const estimatedPurchasedTotal =
    purchasedItems.reduce(
      (total, item) =>
        total +
        Number(
          item.estimatedPrice || 0,
        ),
      0,
    );

  /*
   * ================================
   * CHECKBOXES
   * ================================
   */

  const toggleItem =
    async (itemId) => {
      const checked =
        checkedShoppingItems.includes(
          itemId,
        );

      try {
        await setDoc(
          doc(
            db,
            "parties",
            PARTY_ID,
          ),
          {
            checkedShoppingItems:
              checked
                ? arrayRemove(itemId)
                : arrayUnion(itemId),
          },
          {
            merge: true,
          },
        );
      } catch (error) {
        console.error(
          "Error updating shopping item:",
          error,
        );
      }
    };

  const clearChecks =
    async () => {
      try {
        await setDoc(
          doc(
            db,
            "parties",
            PARTY_ID,
          ),
          {
            checkedShoppingItems:
              [],
          },
          {
            merge: true,
          },
        );
      } catch (error) {
        console.error(
          "Error resetting shopping list:",
          error,
        );
      }
    };

  /*
   * ================================
   * FORMATTING
   * ================================
   */

  const formatAmount = (
    value,
  ) => {
    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return (
      Math.round(
        Number(value) * 100,
      ) / 100
    );
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
    ).format(Number(value || 0));
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="page-eyebrow">
            Purchasing
          </span>

          <h1>Shopping List</h1>

          <p>
            Automatically generated from
            the food and drinks you&apos;re
            making or purchasing for the
            party.
          </p>
        </div>
      </header>

      <section className="shopping-stats-grid">
        <div className="shopping-stat-card featured">
          <span className="card-eyebrow">
            Shopping Progress
          </span>

          <div className="shopping-progress-number">
            {progress}%
          </div>

          <div className="shopping-page-progress">
            <div
              className="shopping-page-progress-fill"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <span>
            {checkedCount} of{" "}
            {allItems.length} gathered
          </span>
        </div>

        <div className="shopping-stat-card">
          <span>Remaining</span>

          <strong>
            {remainingCount}
          </strong>

          <small>
            things to get
          </small>
        </div>

        <div className="shopping-stat-card">
          <span>
            Recipe Ingredients
          </span>

          <strong>
            {
              recipeIngredients.length
            }
          </strong>

          <small>
            combined ingredients
          </small>
        </div>

        <div className="shopping-stat-card">
          <span>
            Purchased Food
          </span>

          <strong>
            {formatCurrency(
              estimatedPurchasedTotal,
            )}
          </strong>

          <small>
            estimated cost
          </small>
        </div>
      </section>

      <section className="shopping-toolbar">
        <div className="menu-tabs">
          {[
            "All",
            "Purchased",
            "Ingredients",
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
              {tab}
            </button>
          ))}
        </div>

        {checkedCount > 0 && (
          <button
            type="button"
            className="text-button"
            onClick={clearChecks}
          >
            Reset Checklist
          </button>
        )}
      </section>

      {loading ? (
        <div className="empty-page-card">
          Building shopping list...
        </div>
      ) : allItems.length === 0 ? (
        <div className="empty-page-card">
          <div className="menu-empty-content">
            <strong>
              Nothing to shop for yet.
            </strong>

            <span>
              Add food and drinks first.
              Purchased items and recipe
              ingredients will
              automatically appear here.
            </span>
          </div>
        </div>
      ) : (
        <section className="shopping-list-card">
          <div className="shopping-list-header">
            <div />
            <div>Item</div>
            <div>Quantity</div>
            <div>Source</div>
            <div>Store</div>
            <div>Estimate</div>
            <div />
          </div>

          {visibleItems.map(
            (item) => {
              const checked =
                checkedShoppingItems.includes(
                  item.id,
                );

              return (
                <div
                  className={
                    checked
                      ? "shopping-row purchased"
                      : "shopping-row"
                  }
                  key={item.id}
                >
                  <div className="shopping-check-cell">
                    <button
                      type="button"
                      className={
                        checked
                          ? "shopping-check checked"
                          : "shopping-check"
                      }
                      onClick={() =>
                        toggleItem(
                          item.id,
                        )
                      }
                    >
                      {checked
                        ? "✓"
                        : ""}
                    </button>
                  </div>

                  <div className="shopping-item-name">
                    <div className="shopping-item-title-row">
                      <strong>
                        {item.name}
                      </strong>

                      <span className="shopping-category-pill">
                        {item.type ===
                        "Ingredient"
                          ? "Ingredient"
                          : "Purchased"}
                      </span>
                    </div>
                  </div>

                  <div className="shopping-secondary">
                    {formatAmount(
                      item.amount,
                    )}{" "}
                    {item.unit}
                  </div>

                  <div className="shopping-secondary">
                    {item.type ===
                    "Ingredient"
                      ? item.sources.join(
                          ", ",
                        )
                      : item.source}
                  </div>

                  <div className="shopping-secondary">
                    {item.store || "—"}
                  </div>

                  <div className="shopping-price">
                    {item.type ===
                      "Purchased" &&
                    item.estimatedPrice !==
                      null
                      ? formatCurrency(
                          item.estimatedPrice,
                        )
                      : "—"}
                  </div>

                  <div className="shopping-row-actions">
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
                  </div>
                </div>
              );
            },
          )}
        </section>
      )}
    </div>
  );
}

export default Shopping;