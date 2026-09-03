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
  updateDoc,
} from "firebase/firestore";

import { db } from "../services/firebase";

const PARTY_ID = "halloween-25";

/*
 * Conversion bases:
 *
 * volume -> teaspoons
 * weight -> ounces
 */

const unitDefinitions = {
  tsp: {
    group: "volume",
    factor: 1,
  },

  tbsp: {
    group: "volume",
    factor: 3,
  },

  cup: {
    group: "volume",
    factor: 48,
  },

  "fl oz": {
    group: "volume",
    factor: 6,
  },

  mL: {
    group: "volume",
    factor: 0.202884,
  },

  L: {
    group: "volume",
    factor: 202.884,
  },

  oz: {
    group: "weight",
    factor: 1,
  },

  lb: {
    group: "weight",
    factor: 16,
  },

  g: {
    group: "weight",
    factor: 0.035274,
  },

  kg: {
    group: "weight",
    factor: 35.274,
  },
};

const normalizeIngredientName = (
  value,
) => {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
};

const getDetailDocumentId = (
  shoppingItemId,
) => {
  return encodeURIComponent(
    shoppingItemId,
  );
};

const roundAmount = (
  value,
) => {
  return (
    Math.round(
      Number(value) * 100,
    ) / 100
  );
};

const chooseVolumeDisplay = (
  teaspoons,
) => {
  if (teaspoons >= 48) {
    return {
      amount:
        teaspoons / 48,
      unit: "cup",
    };
  }

  if (teaspoons >= 6) {
    return {
      amount:
        teaspoons / 6,
      unit: "fl oz",
    };
  }

  if (teaspoons >= 3) {
    return {
      amount:
        teaspoons / 3,
      unit: "tbsp",
    };
  }

  return {
    amount:
      teaspoons,
    unit: "tsp",
  };
};

const chooseWeightDisplay = (
  ounces,
) => {
  if (ounces >= 16) {
    return {
      amount:
        ounces / 16,
      unit: "lb",
    };
  }

  return {
    amount:
      ounces,
    unit: "oz",
  };
};

function Shopping() {
  const [
    menuItems,
    setMenuItems,
  ] = useState([]);

  const [
    decorations,
    setDecorations,
  ] = useState([]);

  const [
    shoppingDetails,
    setShoppingDetails,
  ] = useState({});

  const [
    checkedShoppingItems,
    setCheckedShoppingItems,
  ] = useState([]);

  const [
    menuLoading,
    setMenuLoading,
  ] = useState(true);

  const [
    decorationsLoading,
    setDecorationsLoading,
  ] = useState(true);

  const [
    activeTab,
    setActiveTab,
  ] = useState("All");

  const loading =
    menuLoading ||
    decorationsLoading;

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
        setMenuItems(
          snapshot.docs.map(
            (itemDoc) => ({
              id: itemDoc.id,
              ...itemDoc.data(),
            }),
          ),
        );

        setMenuLoading(false);
      },
      (error) => {
        console.error(
          "Error loading shopping list:",
          error,
        );

        setMenuLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  /*
   * ================================
   * LOAD DECORATIONS
   * ================================
   */

  useEffect(() => {
    const decorationsRef =
      collection(
        db,
        "parties",
        PARTY_ID,
        "decorations",
      );

    const unsubscribe = onSnapshot(
      decorationsRef,
      (snapshot) => {
        setDecorations(
          snapshot.docs.map(
            (decorationDoc) => ({
              id:
                decorationDoc.id,

              ...decorationDoc.data(),
            }),
          ),
        );

        setDecorationsLoading(
          false,
        );
      },
      (error) => {
        console.error(
          "Error loading decorations for shopping:",
          error,
        );

        setDecorationsLoading(
          false,
        );
      },
    );

    return unsubscribe;
  }, []);

  /*
   * ================================
   * SHOPPING DETAILS
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

            if (
              !data.shoppingItemId
            ) {
              return;
            }

            details[
              data.shoppingItemId
            ] = {
              id: detailDoc.id,

              ...data,

              alreadyOwned:
                data.alreadyOwned ??
                false,
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
   * CHECKED STATE
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
   * PURCHASED FOOD / DRINK ITEMS
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
          id:
            `purchase__${item.id}`,

          sourceId:
            item.id,

          type:
            "Purchased",

          name:
            item.name,

          displayQuantity:
            `${
              item.purchaseQuantity ??
              1
            } ${
              item.purchaseUnit ?? ""
            }`.trim(),

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
   * COMBINE RECIPE INGREDIENTS
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
              const displayName =
                ingredient.name?.trim();

              if (!displayName) {
                return;
              }

              const normalizedName =
                normalizeIngredientName(
                  displayName,
                );

              const amount =
                Number(
                  ingredient.amount,
                );

              const scaledAmount =
                Number.isFinite(amount)
                  ? amount * scale
                  : null;

              const unit =
                ingredient.unit ?? "";

              if (
                !ingredientMap.has(
                  normalizedName,
                )
              ) {
                ingredientMap.set(
                  normalizedName,
                  {
                    id:
                      `ingredient__${normalizedName}`,

                    type:
                      "Ingredient",

                    name:
                      displayName,

                    sources: [],

                    convertibleGroups: {
                      volume: 0,
                      weight: 0,
                    },

                    standaloneUnits:
                      {},
                  },
                );
              }

              const entry =
                ingredientMap.get(
                  normalizedName,
                );

              if (
                !entry.sources.includes(
                  item.name,
                )
              ) {
                entry.sources.push(
                  item.name,
                );
              }

              if (
                scaledAmount ===
                null
              ) {
                return;
              }

              const definition =
                unitDefinitions[
                  unit
                ];

              if (definition) {
                entry.convertibleGroups[
                  definition.group
                ] +=
                  scaledAmount *
                  definition.factor;

                return;
              }

              const standaloneKey =
                unit ||
                "unspecified";

              entry.standaloneUnits[
                standaloneKey
              ] =
                (
                  entry
                    .standaloneUnits[
                    standaloneKey
                  ] ?? 0
                ) +
                scaledAmount;
            },
          );
        });

      return Array.from(
        ingredientMap.values(),
      )
        .map((entry) => {
          const parts = [];

          const volumeTotal =
            entry
              .convertibleGroups
              .volume;

          const weightTotal =
            entry
              .convertibleGroups
              .weight;

          if (volumeTotal > 0) {
            const volume =
              chooseVolumeDisplay(
                volumeTotal,
              );

            parts.push(
              `${roundAmount(
                volume.amount,
              )} ${volume.unit}`,
            );
          }

          if (weightTotal > 0) {
            const weight =
              chooseWeightDisplay(
                weightTotal,
              );

            parts.push(
              `${roundAmount(
                weight.amount,
              )} ${weight.unit}`,
            );
          }

          Object.entries(
            entry.standaloneUnits,
          ).forEach(
            ([unit, amount]) => {
              parts.push(
                `${roundAmount(
                  amount,
                )}${
                  unit ===
                  "unspecified"
                    ? ""
                    : ` ${unit}`
                }`,
              );
            },
          );

          return {
            id:
              entry.id,

            type:
              entry.type,

            name:
              entry.name,

            sources:
              entry.sources,

            displayQuantity:
              parts.join(" + "),

            shoppingLink:
              "",
          };
        })
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
          ),
        );
    }, [menuItems]);

  /*
   * ================================
   * DECORATION SHOPPING ITEMS
   * ================================
   */

  const decorationItems =
    useMemo(() => {
      return decorations
        .filter(
          (item) =>
            item.status ===
            "Need to Buy",
        )
        .map((item) => ({
          id:
            `decoration__${item.id}`,

          sourceId:
            item.id,

          type:
            "Decoration",

          name:
            item.name,

          displayQuantity:
            `${item.quantity ?? 1}`,

          source:
            "Decorations",

          originalStore:
            item.store ?? "",

          originalEstimatedPrice:
            item.estimatedCost ??
            null,

          shoppingLink:
            item.shoppingLink ?? "",

          photoUrl:
            item.photoUrl ?? "",
        }))
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
          ),
        );
    }, [decorations]);

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

      alreadyOwned:
        detail.alreadyOwned ??
        false,
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

  const decorationItemsWithDetails =
    useMemo(
      () =>
        decorationItems.map(
          applyDetails,
        ),
      [
        decorationItems,
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
        ...decorationItemsWithDetails,
      ],
      [
        purchasedItemsWithDetails,
        recipeIngredientsWithDetails,
        decorationItemsWithDetails,
      ],
    );

  const visibleItems =
    useMemo(() => {
      if (
        activeTab ===
        "Purchased"
      ) {
        return purchasedItemsWithDetails;
      }

      if (
        activeTab ===
        "Ingredients"
      ) {
        return recipeIngredientsWithDetails;
      }

      if (
        activeTab ===
        "Decorations"
      ) {
        return decorationItemsWithDetails;
      }

      if (
        activeTab ===
        "Owned"
      ) {
        return allItems.filter(
          (item) =>
            item.alreadyOwned,
        );
      }

      return allItems;
    }, [
      activeTab,
      allItems,
      purchasedItemsWithDetails,
      recipeIngredientsWithDetails,
      decorationItemsWithDetails,
    ]);

  /*
   * ================================
   * TOTALS
   * ================================
   */

  const purchasedCount =
    allItems.filter(
      (item) =>
        checkedShoppingItems.includes(
          item.id,
        ),
    ).length;

  const ownedCount =
    allItems.filter(
      (item) =>
        item.alreadyOwned,
    ).length;

  const completedCount =
    allItems.filter(
      (item) =>
        checkedShoppingItems.includes(
          item.id,
        ) ||
        item.alreadyOwned,
    ).length;

  const remainingCount =
    allItems.length -
    completedCount;

  const progress =
    allItems.length === 0
      ? 0
      : Math.round(
          (completedCount /
            allItems.length) *
            100,
        );

  const estimatedTotal =
    allItems
      .filter(
        (item) =>
          !item.alreadyOwned &&
          !checkedShoppingItems.includes(
            item.id,
          ),
      )
      .reduce(
        (total, item) =>
          total +
          Number(
            item.estimatedPrice || 0,
          ),
        0,
      );

  /*
   * ================================
   * SHOPPING DETAILS
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
   * MARK DECORATION PURCHASED
   * ================================
   */

  const markDecorationPurchased =
    async (item) => {
      if (
        item.type !==
          "Decoration" ||
        !item.sourceId
      ) {
        return;
      }

      try {
        await updateDoc(
          doc(
            db,
            "parties",
            PARTY_ID,
            "decorations",
            item.sourceId,
          ),
          {
            status:
              "Purchased",

            updatedAt:
              serverTimestamp(),
          },
        );
      } catch (error) {
        console.error(
          "Error marking decoration as purchased:",
          error,
        );

        throw error;
      }
    };

  /*
   * ================================
   * PURCHASE / GATHER CHECKBOX
   * ================================
   */

  const toggleItem =
    async (item) => {
      const checked =
        checkedShoppingItems.includes(
          item.id,
        );

      try {
        /*
         * Decorations use the
         * Decorations collection as
         * their source of truth.
         *
         * Checking one here changes
         * its decoration status to
         * Purchased, which causes it
         * to disappear from this list.
         */

        if (
          item.type ===
          "Decoration"
        ) {
          if (!checked) {
            await markDecorationPurchased(
              item,
            );
          }

          return;
        }

        /*
         * If marking the item as
         * purchased, remove Already
         * Owned first so one item does
         * not have both statuses.
         */

        if (
          !checked &&
          item.alreadyOwned
        ) {
          await updateShoppingDetail(
            item,
            "alreadyOwned",
            false,
          );
        }

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
                    item.id,
                  )
                : arrayUnion(
                    item.id,
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
   * ALREADY OWNED
   * ================================
   */

  const toggleAlreadyOwned =
    async (item) => {
      const nextOwned =
        !item.alreadyOwned;

      try {
        /*
         * If marking Already Owned,
         * remove the purchased/gathered
         * check so there is only one
         * completion status.
         */

        if (
          nextOwned &&
          checkedShoppingItems.includes(
            item.id,
          )
        ) {
          await setDoc(
            doc(
              db,
              "parties",
              PARTY_ID,
            ),
            {
              checkedShoppingItems:
                arrayRemove(
                  item.id,
                ),
            },
            {
              merge: true,
            },
          );
        }

        await updateShoppingDetail(
          item,
          "alreadyOwned",
          nextOwned,
        );
      } catch (error) {
        console.error(
          "Error updating owned status:",
          error,
        );
      }
    };

  /*
   * ================================
   * FORMATTING
   * ================================
   */

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
            Automatically generated from
            your menu and decorations.
            Mark things as purchased or
            already owned so you know
            exactly what is left to get.
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
                width:
                  `${progress}%`,
              }}
            />
          </div>

          <span>
            {completedCount} of{" "}
            {allItems.length} covered
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
            things still needed
          </small>
        </div>

        <div className="shopping-stat-card">
          <span>
            Already Owned
          </span>

          <strong>
            {ownedCount}
          </strong>

          <small>
            already at home
          </small>
        </div>

        <div className="shopping-stat-card">
          <span>
            Estimated Remaining
          </span>

          <strong>
            {formatCurrency(
              estimatedTotal,
            )}
          </strong>

          <small>
            excluding owned and
            purchased items
          </small>
        </div>
      </section>

      {/* TOOLBAR */}

      <section className="shopping-toolbar">
        <div className="menu-tabs">
          {[
            "All",
            "Purchased",
            "Ingredients",
            "Decorations",
            "Owned",
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

        {purchasedCount > 0 && (
          <button
            type="button"
            className="text-button"
            onClick={
              clearChecks
            }
          >
            Reset Purchased
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
              Purchased menu items,
              recipe ingredients, and
              decorations marked Need to
              Buy will automatically
              appear here.
            </span>
          </div>
        </div>
      ) : visibleItems.length ===
        0 ? (
        <div className="empty-page-card">
          <div className="menu-empty-content">
            <strong>
              Nothing here yet.
            </strong>

            <span>
              No shopping items match
              this filter.
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
            <div>Status</div>
          </div>

          {visibleItems.map(
            (item) => {
              const checked =
                checkedShoppingItems.includes(
                  item.id,
                );

              let rowClass =
                "shopping-row";

              if (checked) {
                rowClass +=
                  " purchased";
              }

              if (
                item.alreadyOwned
              ) {
                rowClass +=
                  " already-owned";
              }

              return (
                <div
                  className={
                    rowClass
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
                          item,
                        )
                      }
                      aria-label={
                        item.type ===
                        "Decoration"
                          ? "Mark decoration as purchased"
                          : checked
                            ? "Mark as not purchased"
                            : "Mark as purchased"
                      }
                      title={
                        item.type ===
                        "Decoration"
                          ? "Mark purchased"
                          : checked
                            ? "Purchased"
                            : "Mark purchased"
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

                      {item.alreadyOwned && (
                        <span className="shopping-owned-pill">
                          Owned
                        </span>
                      )}
                    </div>
                  </div>

                  {/* QUANTITY */}

                  <div className="shopping-secondary">
                    {
                      item.displayQuantity
                    }
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
                      disabled={
                        item.alreadyOwned
                      }
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
                    <div
                      className={
                        item.alreadyOwned
                          ? "shopping-cost-input disabled"
                          : "shopping-cost-input"
                      }
                    >
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
                        disabled={
                          item.alreadyOwned
                        }
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

                  {/* STATUS / ACTIONS */}

                  <div className="shopping-row-actions">
                    <button
                      type="button"
                      className={
                        item.alreadyOwned
                          ? "shopping-owned-button active"
                          : "shopping-owned-button"
                      }
                      onClick={() =>
                        toggleAlreadyOwned(
                          item,
                        )
                      }
                    >
                      {item.alreadyOwned
                        ? "Owned"
                        : "Mark Owned"}
                    </button>

                    {item.shoppingLink &&
                      !item.alreadyOwned && (
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