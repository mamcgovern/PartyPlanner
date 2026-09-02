const stats = [
  {
    label: "Invited",
    value: 20,
    detail: "total guests",
  },
  {
    label: "Attending",
    value: 6,
    detail: "confirmed",
  },
  {
    label: "Maybe",
    value: 2,
    detail: "undecided",
  },
  {
    label: "No Response",
    value: 12,
    detail: "waiting",
  },
];

const tasks = [
  {
    id: 1,
    title: "Finalize party menu",
    due: "September 20",
  },
  {
    id: 2,
    title: "Order decorations",
    due: "October 1",
  },
  {
    id: 3,
    title: "Buy nonperishable drinks",
    due: "October 17",
  },
  {
    id: 4,
    title: "Final grocery run",
    due: "October 30",
  },
];

const food = [
  {
    name: "Pizza",
    quantity: "4 pizzas",
    status: "Enough for 10 guests",
  },
  {
    name: "Buffalo Chicken Dip",
    quantity: "1 batch",
    status: "Serves 12",
  },
  {
    name: "Cupcakes",
    quantity: "18",
    status: "Planned",
  },
];

const drinks = [
  {
    name: "Dirty Shirleys",
    quantity: "16",
  },
  {
    name: "Apple Cider Punch",
    quantity: "16",
  },
  {
    name: "Beer",
    quantity: "24 cans",
  },
];

function Dashboard() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="page-eyebrow">Saturday, October 31</span>
          <h1>Mattie&apos;s 25th Halloween Birthday</h1>
          <p>
            Everything you need to plan the party, all in one place.
          </p>
        </div>

        <button className="primary-button">
          + Add Task
        </button>
      </header>

      <section className="stats-grid">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <span className="stat-label">
              {stat.label}
            </span>

            <strong>{stat.value}</strong>

            <span className="stat-detail">
              {stat.detail}
            </span>
          </div>
        ))}
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-card countdown-card">
          <div className="card-header">
            <div>
              <span className="card-eyebrow">
                Countdown
              </span>
              <h2>Party Time</h2>
            </div>
          </div>

          <div className="countdown-number">
            61
          </div>

          <span className="countdown-label">
            days to go
          </span>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <span className="card-eyebrow">
                Attendance
              </span>
              <h2>Guest Planning</h2>
            </div>

            <button className="text-button">
              Edit
            </button>
          </div>

          <div className="attendance-number">
            10
          </div>

          <p className="muted">
            Expected guests
          </p>

          <div className="attendance-bar">
            <div
              className="attendance-bar-fill"
              style={{ width: "50%" }}
            />
          </div>

          <div className="attendance-summary">
            <span>6 confirmed</span>
            <span>20 invited</span>
          </div>
        </div>

        <div className="dashboard-card wide-card">
          <div className="card-header">
            <div>
              <span className="card-eyebrow">
                Coming Up
              </span>
              <h2>Next Tasks</h2>
            </div>

            <button className="text-button">
              View all
            </button>
          </div>

          <div className="task-preview-list">
            {tasks.map((task) => (
              <div
                className="task-preview"
                key={task.id}
              >
                <button
                  className="task-checkbox"
                  aria-label={`Complete ${task.title}`}
                />

                <div>
                  <strong>{task.title}</strong>
                  <span>Due {task.due}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <span className="card-eyebrow">
                Menu
              </span>
              <h2>Food</h2>
            </div>

            <button className="text-button">
              Plan
            </button>
          </div>

          <div className="mini-list">
            {food.map((item) => (
              <div
                className="mini-list-item"
                key={item.name}
              >
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.status}</span>
                </div>

                <strong className="mini-value">
                  {item.quantity}
                </strong>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <span className="card-eyebrow">
                Bar
              </span>
              <h2>Drinks</h2>
            </div>

            <button className="text-button">
              Plan
            </button>
          </div>

          <div className="mini-list">
            {drinks.map((item) => (
              <div
                className="mini-list-item"
                key={item.name}
              >
                <strong>{item.name}</strong>

                <strong className="mini-value">
                  {item.quantity}
                </strong>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card wide-card">
          <div className="card-header">
            <div>
              <span className="card-eyebrow">
                Shopping
              </span>
              <h2>Purchase Progress</h2>
            </div>

            <button className="text-button">
              View list
            </button>
          </div>

          <div className="shopping-summary">
            <div>
              <strong>18</strong>
              <span>purchased</span>
            </div>

            <div>
              <strong>13</strong>
              <span>remaining</span>
            </div>

            <div>
              <strong>$184</strong>
              <span>spent</span>
            </div>
          </div>

          <div className="shopping-progress">
            <div
              className="shopping-progress-fill"
              style={{ width: "58%" }}
            />
          </div>

          <p className="muted">
            18 of 31 items purchased
          </p>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;