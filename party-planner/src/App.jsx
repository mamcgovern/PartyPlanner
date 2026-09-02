import { Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import Guests from "./pages/Guests";
import FoodDrinks from "./pages/FoodDrinks";
import Decorations from "./pages/Decorations";
import Recipes from "./pages/Recipes";
import Tasks from "./pages/Tasks";
import Notes from "./pages/Notes";

function App() {
  return (
    <div className="app">
      <Sidebar />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/guests" element={<Guests />} />

          <Route
            path="/food-drinks"
            element={<FoodDrinks />}
          />

          <Route
            path="/decorations"
            element={<Decorations />}
          />

          <Route
            path="/recipes"
            element={<Recipes />}
          />

          <Route path="/tasks" element={<Tasks />} />
          <Route path="/notes" element={<Notes />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;