import { useState } from "react";

import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
} from "firebase/auth";

import { useNavigate } from "react-router-dom";

import { auth } from "../services/firebase";

function Login() {
    const navigate = useNavigate();

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleGoogleSignIn = async () => {
        setError("");
        setLoading(true);

        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);

            const allowedEmails = [
                "maddelynnebergan@gmail.com",
                "nbergan13@gmail.com",
            ];

            const email = result.user.email?.toLowerCase();

            if (!allowedEmails.includes(email)) {
                await signOut(auth);
                setError("This Google account is not authorized to access this app.");
                return;
            }

            navigate("/");
        } catch (error) {
            console.error("Google login error:", error);
            setError("Unable to sign in with Google. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <span className="page-eyebrow">
                    Halloween Party
                </span>

                <h1>
                    Party Planner
                </h1>

                <p>
                    Sign in to manage your party.
                </p>

                {error && (
                    <p className="login-error">
                        {error}
                    </p>
                )}

                <button
                    type="button"
                    className="primary-button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                >
                    {loading
                        ? "Signing in..."
                        : "Sign in with Google"}
                </button>
            </div>
        </div>
    );
}

export default Login;