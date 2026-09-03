import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import {
  Link,
} from "react-router-dom";

import {
  db,
} from "../services/firebase";

import "../styles/dashboard.css";

const PARTY_ID =
  "halloween-25";

const PARTY_DATE =
  "2026-10-31";

const AMES_LATITUDE =
  42.0308;

const AMES_LONGITUDE =
  -93.6319;

const WEATHER_HISTORY_YEARS =
  20;

const FORECAST_WINDOW_DAYS =
  14;

/*
 * ================================
 * HELPERS
 * ================================
 */

const normalizeIngredientName = (
  value,
) => {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
};

const getTodayString = () => {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1,
    ).padStart(
      2,
      "0",
    );

  const day =
    String(
      now.getDate(),
    ).padStart(
      2,
      "0",
    );

  return `${year}-${month}-${day}`;
};

const getDaysUntilParty =
  () => {
    const now =
      new Date();

    const partyDate =
      new Date(
        `${PARTY_DATE}T23:59:59`,
      );

    const difference =
      partyDate.getTime() -
      now.getTime();

    if (difference <= 0) {
      return 0;
    }

    return Math.ceil(
      difference /
        (
          1000 *
          60 *
          60 *
          24
        ),
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
    },
  );
};

const getWeatherDescription = (
  code,
) => {
  if (code === 0) {
    return "Clear";
  }

  if (
    [1, 2].includes(
      code,
    )
  ) {
    return "Partly cloudy";
  }

  if (code === 3) {
    return "Cloudy";
  }

  if (
    [45, 48].includes(
      code,
    )
  ) {
    return "Foggy";
  }

  if (
    [
      51,
      53,
      55,
      56,
      57,
    ].includes(
      code,
    )
  ) {
    return "Drizzle";
  }

  if (
    [
      61,
      63,
      65,
      66,
      67,
      80,
      81,
      82,
    ].includes(
      code,
    )
  ) {
    return "Rain";
  }

  if (
    [
      71,
      73,
      75,
      77,
      85,
      86,
    ].includes(
      code,
    )
  ) {
    return "Snow";
  }

  if (
    [
      95,
      96,
      99,
    ].includes(
      code,
    )
  ) {
    return "Thunderstorms";
  }

  return "Variable";
};

const getWeatherIcon = (
  code,
) => {
  if (code === 0) {
    return "☀";
  }

  if (
    [1, 2].includes(
      code,
    )
  ) {
    return "⛅";
  }

  if (code === 3) {
    return "☁";
  }

  if (
    [45, 48].includes(
      code,
    )
  ) {
    return "〰";
  }

  if (
    [
      51,
      53,
      55,
      56,
      57,
      61,
      63,
      65,
      66,
      67,
      80,
      81,
      82,
    ].includes(
      code,
    )
  ) {
    return "☂";
  }

  if (
    [
      71,
      73,
      75,
      77,
      85,
      86,
    ].includes(
      code,
    )
  ) {
    return "❄";
  }

  if (
    [
      95,
      96,
      99,
    ].includes(
      code,
    )
  ) {
    return "⚡";
  }

  return "☁";
};

const average = (
  values,
) => {
  if (
    values.length === 0
  ) {
    return null;
  }

  return (
    values.reduce(
      (
        total,
        value,
      ) =>
        total +
        Number(value),
      0,
    ) /
    values.length
  );
};

/*
 * ================================
 * COMPONENT
 * ================================
 */

function Dashboard() {
  const [
    party,
    setParty,
  ] = useState({});

  const [
    guests,
    setGuests,
  ] = useState([]);

  const [
    tasks,
    setTasks,
  ] = useState([]);

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
    weather,
    setWeather,
  ] = useState(null);

  const [
    weatherLoading,
    setWeatherLoading,
  ] = useState(true);

  const [
    weatherError,
    setWeatherError,
  ] = useState("");

  /*
   * ================================
   * PARTY
   * ================================
   */

  useEffect(() => {
    const partyRef =
      doc(
        db,
        "parties",
        PARTY_ID,
      );

    return onSnapshot(
      partyRef,
      (snapshot) => {
        if (
          snapshot.exists()
        ) {
          setParty(
            snapshot.data(),
          );
        }
      },
      (error) => {
        console.error(
          "Error loading party:",
          error,
        );
      },
    );
  }, []);

  /*
   * ================================
   * GUESTS
   * ================================
   */

  useEffect(() => {
    const guestsRef =
      collection(
        db,
        "parties",
        PARTY_ID,
        "guests",
      );

    return onSnapshot(
      guestsRef,
      (snapshot) => {
        setGuests(
          snapshot.docs.map(
            (guestDoc) => ({
              id:
                guestDoc.id,

              ...guestDoc.data(),
            }),
          ),
        );
      },
      (error) => {
        console.error(
          "Error loading guests:",
          error,
        );
      },
    );
  }, []);

  /*
   * ================================
   * TASKS
   * ================================
   */

  useEffect(() => {
    const tasksRef =
      collection(
        db,
        "parties",
        PARTY_ID,
        "tasks",
      );

    return onSnapshot(
      tasksRef,
      (snapshot) => {
        setTasks(
          snapshot.docs.map(
            (taskDoc) => ({
              id:
                taskDoc.id,

              ...taskDoc.data(),
            }),
          ),
        );
      },
      (error) => {
        console.error(
          "Error loading tasks:",
          error,
        );
      },
    );
  }, []);

  /*
   * ================================
   * MENU
   * ================================
   */

  useEffect(() => {
    const menuRef =
      collection(
        db,
        "parties",
        PARTY_ID,
        "menuItems",
      );

    return onSnapshot(
      menuRef,
      (snapshot) => {
        setMenuItems(
          snapshot.docs.map(
            (itemDoc) => ({
              id:
                itemDoc.id,

              ...itemDoc.data(),
            }),
          ),
        );
      },
      (error) => {
        console.error(
          "Error loading menu:",
          error,
        );
      },
    );
  }, []);

  /*
   * ================================
   * DECORATIONS
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

    return onSnapshot(
      decorationsRef,
      (snapshot) => {
        setDecorations(
          snapshot.docs.map(
            (
              decorationDoc,
            ) => ({
              id:
                decorationDoc.id,

              ...decorationDoc.data(),
            }),
          ),
        );
      },
      (error) => {
        console.error(
          "Error loading decorations:",
          error,
        );
      },
    );
  }, []);

  /*
   * ================================
   * SHOPPING DETAILS
   * ================================
   */

  useEffect(() => {
    const detailsRef =
      collection(
        db,
        "parties",
        PARTY_ID,
        "shoppingDetails",
      );

    return onSnapshot(
      detailsRef,
      (snapshot) => {
        const details =
          {};

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
              id:
                detailDoc.id,

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
  }, []);

  /*
   * ================================
   * WEATHER
   * ================================
   */

  useEffect(() => {
    let cancelled =
      false;

    const loadWeather =
      async () => {
        setWeatherLoading(
          true,
        );

        setWeatherError("");

        try {
          const daysAway =
            getDaysUntilParty();

          /*
           * ACTUAL FORECAST
           */

          if (
            daysAway <=
              FORECAST_WINDOW_DAYS &&
            daysAway >= 0
          ) {
            const forecastUrl =
              new URL(
                "https://api.open-meteo.com/v1/forecast",
              );

            forecastUrl.search =
              new URLSearchParams(
                {
                  latitude:
                    AMES_LATITUDE.toString(),

                  longitude:
                    AMES_LONGITUDE.toString(),

                  daily:
                    [
                      "weather_code",
                      "temperature_2m_max",
                      "temperature_2m_min",
                      "precipitation_probability_max",
                      "precipitation_sum",
                    ].join(
                      ",",
                    ),

                  temperature_unit:
                    "fahrenheit",

                  precipitation_unit:
                    "inch",

                  timezone:
                    "America/Chicago",

                  start_date:
                    PARTY_DATE,

                  end_date:
                    PARTY_DATE,
                },
              ).toString();

            const response =
              await fetch(
                forecastUrl,
              );

            if (
              !response.ok
            ) {
              throw new Error(
                "Weather forecast is not available yet.",
              );
            }

            const data =
              await response.json();

            if (
              !data.daily ||
              !data.daily
                .time?.length
            ) {
              throw new Error(
                "Weather forecast is not available yet.",
              );
            }

            if (cancelled) {
              return;
            }

            setWeather({
              mode:
                "forecast",

              label:
                "Party Forecast",

              high:
                Math.round(
                  data.daily
                    .temperature_2m_max[
                    0
                  ],
                ),

              low:
                Math.round(
                  data.daily
                    .temperature_2m_min[
                    0
                  ],
                ),

              precipitationChance:
                Math.round(
                  data.daily
                    .precipitation_probability_max[
                    0
                  ] ?? 0,
                ),

              code:
                data.daily
                  .weather_code[
                  0
                ],

              years:
                null,
            });

            return;
          }

          /*
           * HISTORICAL OUTLOOK
           */

          const partyYear =
            Number(
              PARTY_DATE.slice(
                0,
                4,
              ),
            );

          const endingYear =
            partyYear - 1;

          const startingYear =
            endingYear -
            WEATHER_HISTORY_YEARS +
            1;

          const historyUrl =
            new URL(
              "https://archive-api.open-meteo.com/v1/archive",
            );

          historyUrl.search =
            new URLSearchParams(
              {
                latitude:
                  AMES_LATITUDE.toString(),

                longitude:
                  AMES_LONGITUDE.toString(),

                start_date:
                  `${startingYear}-10-31`,

                end_date:
                  `${endingYear}-10-31`,

                daily:
                  [
                    "weather_code",
                    "temperature_2m_max",
                    "temperature_2m_min",
                    "precipitation_sum",
                  ].join(
                    ",",
                  ),

                temperature_unit:
                  "fahrenheit",

                precipitation_unit:
                  "inch",

                timezone:
                  "America/Chicago",
              },
            ).toString();

          const response =
            await fetch(
              historyUrl,
            );

          if (
            !response.ok
          ) {
            throw new Error(
              "Could not load historical weather.",
            );
          }

          const data =
            await response.json();

          const daily =
            data.daily;

          if (
            !daily ||
            !daily.time
          ) {
            throw new Error(
              "Historical weather data was unavailable.",
            );
          }

          const halloweenIndexes =
            daily.time
              .map(
                (
                  date,
                  index,
                ) => ({
                  date,
                  index,
                }),
              )
              .filter(
                ({ date }) =>
                  date.endsWith(
                    "-10-31",
                  ),
              );

          const highs =
            halloweenIndexes
              .map(
                ({ index }) =>
                  daily
                    .temperature_2m_max[
                    index
                  ],
              )
              .filter(
                (value) =>
                  Number.isFinite(
                    value,
                  ),
              );

          const lows =
            halloweenIndexes
              .map(
                ({ index }) =>
                  daily
                    .temperature_2m_min[
                    index
                  ],
              )
              .filter(
                (value) =>
                  Number.isFinite(
                    value,
                  ),
              );

          const precipitationDays =
            halloweenIndexes.filter(
              ({ index }) =>
                Number(
                  daily
                    .precipitation_sum[
                    index
                  ] ?? 0,
                ) >= 0.01,
            ).length;

          const codes =
            halloweenIndexes
              .map(
                ({ index }) =>
                  daily
                    .weather_code[
                    index
                  ],
              )
              .filter(
                (value) =>
                  value !==
                    null &&
                  value !==
                    undefined,
              );

          const codeCounts =
            {};

          codes.forEach(
            (code) => {
              codeCounts[
                code
              ] =
                (
                  codeCounts[
                    code
                  ] ?? 0
                ) + 1;
            },
          );

          const commonCode =
            Object.entries(
              codeCounts,
            ).sort(
              (
                [, a],
                [, b],
              ) =>
                b - a,
            )[0]?.[0];

          if (cancelled) {
            return;
          }

          setWeather({
            mode:
              "historical",

            label:
              "Historical Outlook",

            high:
              Math.round(
                average(
                  highs,
                ) ?? 0,
              ),

            low:
              Math.round(
                average(
                  lows,
                ) ?? 0,
              ),

            precipitationChance:
              halloweenIndexes.length >
              0
                ? Math.round(
                    (
                      precipitationDays /
                      halloweenIndexes.length
                    ) *
                      100,
                  )
                : 0,

            code:
              Number(
                commonCode ?? 3,
              ),

            years:
              halloweenIndexes.length,

            startYear:
              startingYear,

            endYear:
              endingYear,
          });
        } catch (error) {
          console.error(
            "Error loading weather:",
            error,
          );

          if (!cancelled) {
            setWeatherError(
              error.message ||
                "Weather unavailable.",
            );
          }
        } finally {
          if (!cancelled) {
            setWeatherLoading(
              false,
            );
          }
        }
      };

    loadWeather();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * ================================
   * GUEST STATS
   * ================================
   */

  const guestStats =
    useMemo(() => {
      let invited = 0;
      let attending = 0;
      let maybe = 0;
      let declined = 0;
      let noResponse = 0;

      guests.forEach(
        (guest) => {
          invited += 1;

          switch (
            guest.rsvp
          ) {
            case "Attending":
              attending += 1;
              break;

            case "Maybe":
              maybe += 1;
              break;

            case "Declined":
              declined += 1;
              break;

            default:
              noResponse += 1;
          }

          if (
            guest.plusOne?.trim()
          ) {
            invited += 1;

            switch (
              guest.plusOneRsvp
            ) {
              case "Attending":
                attending += 1;
                break;

              case "Maybe":
                maybe += 1;
                break;

              case "Declined":
                declined += 1;
                break;

              default:
                noResponse += 1;
            }
          }
        },
      );

      return {
        invited,
        attending,
        maybe,
        declined,
        noResponse,
      };
    }, [guests]);

  const expectedAttendance =
    Number(
      party.expectedAttendance ??
        0,
    );

  /*
   * ================================
   * TASKS
   * ================================
   */

  const incompleteTasks =
    useMemo(() => {
      return tasks
        .filter(
          (task) =>
            task.status !==
            "Complete",
        )
        .sort(
          (a, b) => {
            if (
              a.dueDate &&
              b.dueDate
            ) {
              return a.dueDate.localeCompare(
                b.dueDate,
              );
            }

            if (
              a.dueDate
            ) {
              return -1;
            }

            if (
              b.dueDate
            ) {
              return 1;
            }

            return 0;
          },
        );
    }, [tasks]);

  const nextTasks =
    incompleteTasks.slice(
      0,
      4,
    );

  const completeTasks =
    tasks.filter(
      (task) =>
        task.status ===
        "Complete",
    ).length;

  const taskProgress =
    tasks.length === 0
      ? 0
      : Math.round(
          (
            completeTasks /
            tasks.length
          ) *
            100,
        );

  const toggleTaskComplete =
    async (task) => {
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
            status:
              "Complete",

            updatedAt:
              serverTimestamp(),
          },
        );
      } catch (error) {
        console.error(
          "Error completing task:",
          error,
        );
      }
    };

  /*
   * ================================
   * MENU
   * ================================
   */

  const foodCount =
    menuItems.filter(
      (item) =>
        item.type ===
        "Food",
    ).length;

  const drinkCount =
    menuItems.filter(
      (item) =>
        item.type ===
        "Drink",
    ).length;

  const menuPreview =
    menuItems.slice(
      0,
      2,
    );

  /*
   * ================================
   * SHOPPING
   * ================================
   */

  const shoppingItems =
    useMemo(() => {
      const items = [];

      menuItems
        .filter(
          (item) =>
            item.fulfillmentType ===
            "purchased",
        )
        .forEach(
          (item) => {
            items.push({
              id:
                `purchase__${item.id}`,
            });
          },
        );

      const ingredients =
        new Set();

      menuItems
        .filter(
          (item) =>
            item.fulfillmentType ===
            "recipe",
        )
        .forEach(
          (item) => {
            (
              item.ingredients ?? []
            ).forEach(
              (ingredient) => {
                if (
                  ingredient.name?.trim()
                ) {
                  ingredients.add(
                    normalizeIngredientName(
                      ingredient.name,
                    ),
                  );
                }
              },
            );
          },
        );

      ingredients.forEach(
        (ingredient) => {
          items.push({
            id:
              `ingredient__${ingredient}`,
          });
        },
      );

      decorations
        .filter(
          (decoration) =>
            decoration.status ===
            "Need to Buy",
        )
        .forEach(
          (decoration) => {
            items.push({
              id:
                `decoration__${decoration.id}`,
            });
          },
        );

      return items;
    }, [
      menuItems,
      decorations,
    ]);

  const checkedShoppingItems =
    party.checkedShoppingItems ??
    [];

  const shoppingCovered =
    shoppingItems.filter(
      (item) =>
        checkedShoppingItems.includes(
          item.id,
        ) ||
        shoppingDetails[
          item.id
        ]?.alreadyOwned,
    ).length;

  const shoppingRemaining =
    Math.max(
      0,
      shoppingItems.length -
        shoppingCovered,
    );

  const shoppingProgress =
    shoppingItems.length === 0
      ? 0
      : Math.round(
          (
            shoppingCovered /
            shoppingItems.length
          ) *
            100,
        );

  /*
   * ================================
   * DECORATIONS
   * ================================
   */

  const decorationStats =
    useMemo(
      () => ({
        total:
          decorations.length,

        needToBuy:
          decorations.filter(
            (item) =>
              item.status ===
              "Need to Buy",
          ).length,

        purchased:
          decorations.filter(
            (item) =>
              item.status ===
              "Purchased",
          ).length,

        diy:
          decorations.filter(
            (item) =>
              item.status ===
              "DIY",
          ).length,

        ready:
          decorations.filter(
            (item) =>
              item.status ===
              "Ready",
          ).length,
      }),
      [decorations],
    );

  const daysUntilParty =
    getDaysUntilParty();

  /*
   * ================================
   * RENDER
   * ================================
   */

  return (
    <div className="page dashboard-page">
      <header className="page-header dashboard-header">
        <div>
          <span className="page-eyebrow">
            Saturday, October 31
          </span>

          <h1>
            Mattie&apos;s 25th
            Halloween Birthday
          </h1>

          <p>
            Everything you need to
            plan the party, all in
            one place.
          </p>
        </div>

        <Link
          to="/tasks"
          className="primary-button dashboard-add-task"
        >
          + Add Task
        </Link>
      </header>

      {/* ============================
          GUEST STATS
      ============================ */}

      <section className="stats-grid">
        <Link
          to="/guests"
          className="stat-card dashboard-link-card"
        >
          <span className="stat-label">
            Invited
          </span>

          <strong>
            {guestStats.invited}
          </strong>

          <span className="stat-detail">
            total guests
          </span>
        </Link>

        <Link
          to="/guests"
          className="stat-card dashboard-link-card"
        >
          <span className="stat-label">
            Attending
          </span>

          <strong>
            {guestStats.attending}
          </strong>

          <span className="stat-detail">
            confirmed
          </span>
        </Link>

        <Link
          to="/guests"
          className="stat-card dashboard-link-card"
        >
          <span className="stat-label">
            Maybe
          </span>

          <strong>
            {guestStats.maybe}
          </strong>

          <span className="stat-detail">
            undecided
          </span>
        </Link>

        <Link
          to="/guests"
          className="stat-card dashboard-link-card"
        >
          <span className="stat-label">
            Expected
          </span>

          <strong>
            {expectedAttendance}
          </strong>

          <span className="stat-detail">
            planning for
          </span>
        </Link>
      </section>

      <section className="dashboard-grid">
        {/* ==========================
            COUNTDOWN
        ========================== */}

        <div className="dashboard-card countdown-card">
          <div className="card-header">
            <div>
              <span className="card-eyebrow">
                Countdown
              </span>

              <h2>
                Party Time
              </h2>
            </div>
          </div>

          <div className="countdown-number">
            {daysUntilParty}
          </div>

          <span className="countdown-label">
            {daysUntilParty ===
            1
              ? "day to go"
              : "days to go"}
          </span>

          <span className="countdown-date">
            October 31, 2026
          </span>
        </div>

        {/* ==========================
            WEATHER
        ========================== */}

        <div className="dashboard-card weather-card">
          <div className="card-header">
            <div>
              <span className="card-eyebrow">
                Ames, Iowa
              </span>

              <h2>
                Party Weather
              </h2>
            </div>

            {weather && (
              <span className="weather-mode-pill">
                {weather.mode ===
                "forecast"
                  ? "Forecast"
                  : "Outlook"}
              </span>
            )}
          </div>

          {weatherLoading ? (
            <div className="weather-loading">
              Checking the weather...
            </div>
          ) : weatherError ? (
            <div className="weather-error">
              <strong>
                Weather unavailable
              </strong>

              <span>
                {weatherError}
              </span>
            </div>
          ) : weather ? (
            <>
              <div className="weather-main">
                <div className="weather-icon">
                  {getWeatherIcon(
                    weather.code,
                  )}
                </div>

                <div>
                  <strong className="weather-condition">
                    {getWeatherDescription(
                      weather.code,
                    )}
                  </strong>

                  <span>
                    {weather.label}
                  </span>
                </div>
              </div>

              <div className="weather-temp-row">
                <div>
                  <span>
                    High
                  </span>

                  <strong>
                    {weather.high}°
                  </strong>
                </div>

                <div>
                  <span>
                    Low
                  </span>

                  <strong>
                    {weather.low}°
                  </strong>
                </div>

                <div>
                  <span>
                    {weather.mode ===
                    "forecast"
                      ? "Rain"
                      : "Wet Halloweens"}
                  </span>

                  <strong>
                    {
                      weather.precipitationChance
                    }
                    %
                  </strong>
                </div>
              </div>

              <p className="weather-note">
                {weather.mode ===
                "forecast"
                  ? "Actual forecast for October 31. It will continue to update as the party gets closer."
                  : `Based on ${weather.years} past Halloweens in Ames from ${weather.startYear}–${weather.endYear}.`}
              </p>
            </>
          ) : null}
        </div>

        {/* ==========================
            TASKS
        ========================== */}

        <div className="dashboard-card wide-card tasks-dashboard-card">
          <div className="card-header">
            <div>
              <span className="card-eyebrow">
                Coming Up
              </span>

              <h2>
                Next Tasks
              </h2>
            </div>

            <Link
              to="/tasks"
              className="dashboard-card-link"
            >
              View all
            </Link>
          </div>

          {nextTasks.length ===
          0 ? (
            <div className="dashboard-empty">
              <strong>
                You&apos;re caught up!
              </strong>

              <span>
                No incomplete tasks
                right now.
              </span>
            </div>
          ) : (
            <div className="task-preview-list">
              {nextTasks.map(
                (task) => {
                  const overdue =
                    task.dueDate &&
                    task.dueDate <
                      getTodayString();

                  return (
                    <div
                      className="task-preview"
                      key={
                        task.id
                      }
                    >
                      <button
                        type="button"
                        className="task-checkbox"
                        aria-label={`Complete ${task.title}`}
                        onClick={() =>
                          toggleTaskComplete(
                            task,
                          )
                        }
                      />

                      <div className="task-preview-content">
                        <strong>
                          {
                            task.title
                          }
                        </strong>

                        <span
                          className={
                            overdue
                              ? "task-preview-date overdue"
                              : "task-preview-date"
                          }
                        >
                          {task.dueDate
                            ? `${overdue ? "Overdue" : "Due"} ${formatDate(
                                task.dueDate,
                              )}`
                            : "No due date"}
                        </span>
                      </div>

                      <span
                        className={`dashboard-priority ${
                          task.priority?.toLowerCase() ??
                          "medium"
                        }`}
                      >
                        {task.priority ??
                          "Medium"}
                      </span>
                    </div>
                  );
                },
              )}
            </div>
          )}

          <div className="dashboard-progress-footer">
            <div className="dashboard-small-progress">
              <div
                style={{
                  width:
                    `${taskProgress}%`,
                }}
              />
            </div>

            <span>
              {completeTasks} of{" "}
              {tasks.length} complete
            </span>
          </div>
        </div>

        {/* ==========================
            MENU
        ========================== */}

        <Link
          to="/food-drinks"
          className="dashboard-card dashboard-link-card"
        >
          <div className="card-header">
            <div>
              <span className="card-eyebrow">
                Menu
              </span>

              <h2>
                Food & Drinks
              </h2>
            </div>
          </div>

          <div className="dashboard-menu-counts">
            <div>
              <strong>
                {foodCount}
              </strong>

              <span>
                food
              </span>
            </div>

            <div>
              <strong>
                {drinkCount}
              </strong>

              <span>
                drinks
              </span>
            </div>
          </div>

          {menuPreview.length >
            0 && (
            <div className="mini-list">
              {menuPreview.map(
                (item) => (
                  <div
                    className="mini-list-item"
                    key={
                      item.id
                    }
                  >
                    <div>
                      <strong>
                        {
                          item.name
                        }
                      </strong>

                      <span>
                        {
                          item.category
                        }
                      </span>
                    </div>

                    <strong className="mini-value">
                      {item.plannedServings ??
                        0}{" "}
                      servings
                    </strong>
                  </div>
                ),
              )}
            </div>
          )}
        </Link>

        {/* ==========================
            SHOPPING
        ========================== */}

        <Link
          to="/shopping"
          className="dashboard-card dashboard-link-card"
        >
          <div className="card-header">
            <div>
              <span className="card-eyebrow">
                Shopping
              </span>

              <h2>
                Master List
              </h2>
            </div>
          </div>

          <div className="attendance-number">
            {shoppingRemaining}
          </div>

          <p className="muted">
            items remaining
          </p>

          <div className="attendance-bar">
            <div
              className="shopping-progress-fill"
              style={{
                width:
                  `${shoppingProgress}%`,
              }}
            />
          </div>

          <div className="attendance-summary">
            <span>
              {shoppingCovered}{" "}
              covered
            </span>

            <span>
              {shoppingItems.length}{" "}
              total
            </span>
          </div>
        </Link>

        {/* ==========================
            DECORATIONS
        ========================== */}

        <Link
          to="/decorations"
          className="dashboard-card wide-card dashboard-link-card decorations-dashboard-card"
        >
          <div className="card-header">
            <div>
              <span className="card-eyebrow">
                Decorations
              </span>

              <h2>
                Party Setup
              </h2>
            </div>
          </div>

          <div className="decor-dashboard-summary">
            <div>
              <strong>
                {
                  decorationStats.total
                }
              </strong>

              <span>
                total
              </span>
            </div>

            <div>
              <strong>
                {
                  decorationStats.needToBuy
                }
              </strong>

              <span>
                need to buy
              </span>
            </div>

            <div>
              <strong>
                {
                  decorationStats.purchased
                }
              </strong>

              <span>
                purchased
              </span>
            </div>

            <div>
              <strong>
                {
                  decorationStats.diy
                }
              </strong>

              <span>
                DIY
              </span>
            </div>

            <div>
              <strong>
                {
                  decorationStats.ready
                }
              </strong>

              <span>
                ready
              </span>
            </div>
          </div>
        </Link>
      </section>
    </div>
  );
}

export default Dashboard;