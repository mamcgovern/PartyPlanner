import {
    Routes,
    Route,
    Navigate,
} from "react-router-dom";

import Sidebar from "./components/Sidebar";
import ProtectedRoute from "./components/ProtectedRoute";

import Dashboard from "./pages/Dashboard";
import Guests from "./pages/Guests";
import FoodDrinks from "./pages/FoodDrinks";
import Shopping from "./pages/Shopping";
import Decorations from "./pages/Decorations";
import Tasks from "./pages/Tasks";
import Notes from "./pages/Notes";
import Login from "./pages/Login";

import Invite from "./pages/Invite";
import RSVP from "./pages/RSVP";

function AdminLayout() {
    return (
        <ProtectedRoute>
            <div className="app">
                <Sidebar />

                <main className="main-content">
                    <Routes>
                        <Route
                            path="/"
                            element={<Dashboard />}
                        />

                        <Route
                            path="/guests"
                            element={<Guests />}
                        />

                        <Route
                            path="/food-drinks"
                            element={<FoodDrinks />}
                        />

                        <Route
                            path="/shopping"
                            element={<Shopping />}
                        />

                        <Route
                            path="/decorations"
                            element={<Decorations />}
                        />

                        <Route
                            path="/tasks"
                            element={<Tasks />}
                        />

                        <Route
                            path="/notes"
                            element={<Notes />}
                        />
                    </Routes>
                </main>
            </div>
        </ProtectedRoute>
    );
}

function App() {
    return (
        <Routes>
            {/* PUBLIC */}
            <Route
                path="/invite"
                element={<Invite />}
            />

            <Route
                path="/invite/RSVP"
                element={<RSVP />}
            />

            {/* LOGIN */}
            <Route
                path="/login"
                element={<Login />}
            />

            {/* PRIVATE ADMIN */}
            <Route
                path="/*"
                element={<AdminLayout />}
            />

            {/* FALLBACK */}
            <Route
                path="*"
                element={
                    <Navigate
                        to="/invite"
                        replace
                    />
                }
            />
        </Routes>
    );
}

export default App;