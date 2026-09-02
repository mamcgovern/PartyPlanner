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
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "../services/firebase";

const PARTY_ID = "halloween-25";

const getDetailDocumentId = (
  shoppingItemId,
) => {
  return encodeURIComponent(
    shoppingItemId,
  );
};

function Shopping() {
  const [
    menuItems,
    setMenuItems,
  ] = useState([]);

  const [
    shoppingDetails,
    setShoppingDetails,
  ] = useState({});

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

    const unsubscribe = onSnapshot(
      menuRef,
      (snapshot) => {
        const data =
          snapshot.docs.map(
            (itemDoc) => ({
              id: itemDoc.id,
              ...itemDoc.data(),
            }),
          );

        setMenuItems(data);
        setLoading(false);
      },
      (error) => {
        console.error(
          "Error loading shopping list:",
          error,
        );

        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  /*
   * ================================
   * LOAD SHOPPING DETAILS
   * ================================
   */

  useEffect(() => {
    const detailsRef = collection(
      db,
      "parties",
      PARTY_ID,
      "shoppingDetails",
    );

    const unsubscribe = onSnapshot(
      detailsRef,
      (snapshot) => {
        const details = {};

        snapshot.docs.forEach(
          (detailDoc) => {
            const data =
              detailDoc.data();

            if (!data.shoppingItemId) {
              return;
            }

            details[
              data.shoppingItemId
            ] = {
              id: detailDoc.id,
              ...data,
            };
          },
        );

        setShoppingDetails(
          details,
        );
      },
      (error) => {
        console.error(
          "Error loading shopping details:",
          error,
        );
      },
    );

    return unsubscribe;
  }, []);

  /*
   * ================================
   * LOAD CHECKED STATE
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

        setCheckedShoppingItems(
          snapshot.data()
            .checkedShoppingItems ??
            [],
        );
      },
      (error) => {
        console.error(
          "Error loading shopping status:",
          error,
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

          sourceId:
            item.id,

          type:
            "Purchased",

          name:
            item.name,

          amount:
            item.purchaseQuantity ??
            1,

          unit:
            item.purchaseUnit ?? "",

          source:
            item.name,

          originalStore:
            item.store ?? "",

          originalEstimatedPrice:
            item.estimatedPrice ??
            null,

          shoppingLink:
            item.shoppingLink ?? "",
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
                Number.isFinite(
                  amount,
                )
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

                    shoppingLink:
                      "",
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
   * APPLY SHOPPING DETAILS
   * ================================
   */

  const applyDetails = (
    item,
  ) => {
    const detail =
      shoppingDetails[item.id] ??
      {};

    return {
      ...item,

      store:
        detail.store ??
        item.originalStore ??
        "",

      estimatedPrice:
        detail.estimatedPrice ??
        item.originalEstimatedPrice ??
        null,
    };
  };

  const purchasedItemsWithDetails =
    useMemo(
      () =>
        purchasedItems.map(
          applyDetails,
        ),
      [
        purchasedItems,
        shoppingDetails,
      ],
    );

  const recipeIngredientsWithDetails =
    useMemo(
      () =>
        recipeIngredients.map(
          applyDetails,
        ),
      [
        recipeIngredients,
        shoppingDetails,
      ],
    );

  /*
   * ================================
   * MASTER LIST
   * ================================
   */

  const allItems =
    useMemo(
      () => [
        ...purchasedItemsWithDetails,
        ...recipeIngredientsWithDetails,
      ],
      [
        purchasedItemsWithDetails,
        recipeIngredientsWithDetails,
      ],
    );

  const visibleItems =
    useMemo(() => {
      if (
        activeTab === "Purchased"
      ) {
        return purchasedItemsWithDetails;
      }

      if (
        activeTab ===
        "Ingredients"
      ) {
        return recipeIngredientsWithDetails;
      }

      return allItems;
    }, [
      activeTab,
      allItems,
      purchasedItemsWithDetails,
      recipeIngredientsWithDetails,
    ]);

  /*
   * ================================
   * TOTALS
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

  const estimatedTotal =
    allItems.reduce(
      (total, item) =>
        total +
        Number(
          item.estimatedPrice || 0,
        ),
      0,
    );

  /*
   * ================================
   * CHECKBOX
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
                ? arrayRemove(
                    itemId,
                  )
                : arrayUnion(
                    itemId,
                  ),
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
   * EDIT SHOPPING DETAILS
   * ================================
   */

  const updateShoppingDetail =
    async (
      item,
      field,
      value,
    ) => {
      const existing =
        shoppingDetails[
          item.id
        ];

      const detailId =
        existing?.id ??
        getDetailDocumentId(
          item.id,
        );

      let parsedValue =
        value;

      if (
        field ===
        "estimatedPrice"
      ) {
        parsedValue =
          value === ""
            ? null
            : Number(value);
      }

      try {
        await setDoc(
          doc(
            db,
            "parties",
            PARTY_ID,
            "shoppingDetails",
            detailId,
          ),
          {
            shoppingItemId:
              item.id,

            [field]:
              parsedValue,

            updatedAt:
              serverTimestamp(),
          },
          {
            merge: true,
          },
        );
      } catch (error) {
        console.error(
          "Error updating shopping details:",
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
            Purchasing
          </span>

          <h1>
            Shopping List
          </h1>

          <p>
            Automatically generated
            from your menu. Add the
            store and estimated cost as
            you plan your shopping.
          </p>
        </div>
      </header>

      {/* SUMMARY */}

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
          <span>
            Remaining
          </span>

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
            Estimated Total
          </span>

          <strong>
            {formatCurrency(
              estimatedTotal,
            )}
          </strong>

          <small>
            shopping estimate
          </small>
        </div>
      </section>

      {/* TABS */}

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
                setActiveTab(
                  tab,
                )
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
            onClick={
              clearChecks
            }
          >
            Reset Checklist
          </button>
        )}
      </section>

      {/* LIST */}

      {loading ? (
        <div className="empty-page-card">
          Building shopping list...
        </div>
      ) : allItems.length ===
        0 ? (
        <div className="empty-page-card">
          <div className="menu-empty-content">
            <strong>
              Nothing to shop for yet.
            </strong>

            <span>
              Purchased menu items and
              recipe ingredients will
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
            <div>For</div>
            <div>Store</div>
            <div>Cost</div>
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
                  {/* CHECK */}

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

                  {/* ITEM */}

                  <div className="shopping-item-name">
                    <div className="shopping-item-title-row">
                      <strong>
                        {item.name}
                      </strong>

                      <span className="shopping-category-pill">
                        {item.type}
                      </span>
                    </div>
                  </div>

                  {/* QUANTITY */}

                  <div className="shopping-secondary">
                    {formatAmount(
                      item.amount,
                    )}{" "}
                    {item.unit}
                  </div>

                  {/* SOURCE */}

                  <div className="shopping-secondary">
                    {item.type ===
                    "Ingredient"
                      ? item.sources.join(
                          ", ",
                        )
                      : item.source}
                  </div>

                  {/* STORE */}

                  <div>
                    <input
                      className="shopping-inline-input"
                      type="text"
                      value={
                        item.store ?? ""
                      }
                      placeholder="Store"
                      onChange={(
                        event,
                      ) =>
                        updateShoppingDetail(
                          item,
                          "store",
                          event.target
                            .value,
                        )
                      }
                    />
                  </div>

                  {/* COST */}

                  <div>
                    <div className="shopping-cost-input">
                      <span>
                        $
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          item.estimatedPrice ??
                          ""
                        }
                        placeholder="0.00"
                        onChange={(
                          event,
                        ) =>
                          updateShoppingDetail(
                            item,
                            "estimatedPrice",
                            event.target
                              .value,
                          )
                        }
                      />
                    </div>
                  </div>

                  {/* LINK */}

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