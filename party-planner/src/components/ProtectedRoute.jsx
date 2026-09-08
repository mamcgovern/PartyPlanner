import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../services/firebase";

const ALLOWED_EMAILS = [
    "maddelynnebergan@gmail.com",
    "nbergan13@gmail.com",
];

function ProtectedRoute({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(
            auth,
            async (currentUser) => {
                if (!currentUser) {
                    setUser(null);
                    setLoading(false);
                    return;
                }

                const email = currentUser.email?.toLowerCase();

                if (!ALLOWED_EMAILS.includes(email)) {
                    await signOut(auth);
                    setUser(null);
                } else {
                    setUser(currentUser);
                }

                setLoading(false);
            }
        );

        return unsubscribe;
    }, []);

    if (loading) {
        return (
            <div className="loading-page">
                <p>Loading...</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

export default ProtectedRoute;