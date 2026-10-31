import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, allowedRoles }) {
    const token = localStorage.getItem("token");

    if (!token) {
        return <Navigate to="/" replace />;
    }

    let user = null;
    try {
        user = JSON.parse(localStorage.getItem("user") || "null");
    } catch {
        user = null;
    }

    if (allowedRoles && allowedRoles.length > 0) {
        const userRole = user?.role;

        if (!userRole || !allowedRoles.includes(userRole)) {
            // Redirect unauthorized role to their respective landing page
            if (userRole === "scanner" && !allowedRoles.includes("scanner")) {
                return <Navigate to="/scanner" replace />;
            }
            if (userRole === "admin" && !allowedRoles.includes("admin")) {
                return <Navigate to="/dashboard" replace />;
            }
            // Unknown or invalid role: clear bad auth data to prevent infinite redirect bounce
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            return <Navigate to="/" replace />;
        }
    }

    return children;
}

export default ProtectedRoute;