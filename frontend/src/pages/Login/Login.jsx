import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import "./Login.css";
import { toast } from "react-hot-toast";
import Card from "../../components/ui/Card/Card";
import Input from "../../components/ui/Input/Input";
import Button from "../../components/ui/Button/Button";

import { loginUser } from "../../services/authApi";

// 24 EBMS Accounts arranged in strict alphabetical order (A-Z)
const DUAL_ROLE_USERNAMES = [
    "latchipathula_gopalakrishna_saketh",
    "gopisetti_pushpa_latha_naga_lakshmi_devi",
    "sathvik_namburi",
    "veeravilli_rohith"
];

const EBMS_MEMBERS = [
    { name: "Appana Naga Vinay", username: "appana_naga_vinay" },
    { name: "Atla Divya Sree", username: "atla_divya_sree" },
    { name: "Baddireddy Hari Charan", username: "baddireddy_hari_charan" },
    { name: "Bandi Saravan Rahul", username: "bandi_saravan_rahul" },
    { name: "Bandreddi Siva Shankar", username: "bandreddi_siva_shankar" },
    { name: "Charishma Ganta", username: "charishma_ganta" },
    { name: "Chavali Krishna Kumari", username: "chavali_krishna_kumari" },
    { name: "Chintha Abhinav Reddy", username: "chintha_abhinav_reddy" },
    { name: "Gopisetti Pushpa Latha Naga Lakshmi Devi (Admin / Scanner)", username: "gopisetti_pushpa_latha_naga_lakshmi_devi" },
    { name: "Karri Sri Vishnu Vardhan Reddy", username: "karri_sri_vishnu_vardhan_reddy" },
    { name: "Kolli Sai Sanjana", username: "kolli_sai_sanjana" },
    { name: "Konchada Ayush", username: "konchada_ayush" },
    { name: "Latchipathula Gopalakrishna Saketh (Admin / Scanner)", username: "latchipathula_gopalakrishna_saketh" },
    { name: "M Pravallika", username: "m_pravallika" },
    { name: "Mani Vivek Kumar Palani", username: "mani_vivek_kumar_palani" },
    { name: "Mohamud Suhaibuddin", username: "mohamud_suhaibuddin" },
    { name: "Namburi Veera Venkata Karthikeya", username: "namburi_veera_venkata_karthikeya" },
    { name: "Narendra Papanaboina", username: "narendra_papanaboina" },
    { name: "Sathvik Namburi (Admin / Scanner)", username: "sathvik_namburi" },
    { name: "Shaik Yasin Begum", username: "shaik_yasin_begum" },
    { name: "Tirumani Hema Chandra Koteswar", username: "tirumani_hema_chandra_koteswar" },
    { name: "Veera Kota Sai Venkata Ganesh Sumanth", username: "veera_kota_sai_venkata_ganesh_sumanth" },
    { name: "Veeravilli Rohith (Admin / Scanner)", username: "veeravilli_rohith" },
    { name: "Vidadasu Tulasi Suryakala", username: "vidadasu_tulasi_suryakala" }
];

function Login() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        username: "",
        password: "",
    });
    const [selectedRole, setSelectedRole] = useState("admin");
    const [loading, setLoading] = useState(false);

    const isDualRole = DUAL_ROLE_USERNAMES.includes(formData.username);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        if (name === "username") {
            if (DUAL_ROLE_USERNAMES.includes(value)) {
                setSelectedRole("admin");
            } else {
                setSelectedRole("scanner");
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        if (!formData.username) {
            toast.error("Please select your name from the dropdown.");
            return;
        }

        if (!formData.password) {
            toast.error("Please enter your password.");
            return;
        }

        try {
            setLoading(true);

            const cleanUsername = formData.username.trim();
            const cleanPassword = formData.password.trim();
            const roleToSend = isDualRole ? selectedRole : "scanner";

            const response = await loginUser({
                email: cleanUsername,
                username: cleanUsername,
                password: cleanPassword,
                role: roleToSend
            });

            localStorage.setItem("token", response.token);
            localStorage.setItem("user", JSON.stringify(response.user));
            toast.success(`Logged in as ${response.user.role === "admin" ? "Admin" : "Scanner"}.`);

            if (response.user?.role === "scanner") {
                navigate("/scanner");
            } else {
                navigate("/dashboard");
            }
        } catch (error) {
            console.error("Login error:", error);
            const msg =
                error.response?.data?.message ||
                (error.code === "ERR_NETWORK"
                    ? "Network error: Unable to reach backend server. Please check your connection."
                    : error.message) ||
                "Invalid username or password.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem("token");

        if (token) {
            try {
                const user = JSON.parse(localStorage.getItem("user") || "null");
                if (user?.role === "scanner") {
                    navigate("/scanner");
                } else {
                    navigate("/dashboard");
                }
            } catch {
                navigate("/dashboard");
            }
        }
    }, [navigate]);

    return (
        <div className="login-page">
            <Card>
                <div style={{ textAlign: "center", marginBottom: "20px" }}>
                    <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", margin: "0 0 6px" }}>EBM Portal Login</h1>
                    <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>Select your name and enter your password.</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                    <div className="input-group">
                        <label htmlFor="ebm-select">Select EBM Account</label>
                        <select
                            id="ebm-select"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            style={{
                                width: "100%",
                                minHeight: "44px",
                                padding: "10px 14px",
                                border: "1px solid #d1d5db",
                                borderRadius: "8px",
                                fontSize: "15px",
                                color: formData.username ? "#111827" : "#6b7280",
                                backgroundColor: "#ffffff",
                                boxSizing: "border-box",
                                cursor: "pointer",
                                outline: "none"
                            }}
                        >
                            <option value="" disabled>-- Select Your Name --</option>
                            {EBMS_MEMBERS.map((member) => (
                                <option key={member.username} value={member.username} style={{ color: "#111827" }}>
                                    {member.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {isDualRole && (
                        <div className="role-selection-box">
                            <label className="role-selection-label">Choose Access Mode</label>
                            <div className="role-toggle-group">
                                <button
                                    type="button"
                                    className={`role-toggle-card ${selectedRole === "admin" ? "active admin-active" : ""}`}
                                    onClick={() => setSelectedRole("admin")}
                                >
                                    <div className="role-card-header">
                                        <span className="role-icon">👑</span>
                                        <span className="role-title">Admin</span>
                                    </div>
                                    <span className="role-desc">Dashboard & Full Control</span>
                                </button>
                                <button
                                    type="button"
                                    className={`role-toggle-card ${selectedRole === "scanner" ? "active scanner-active" : ""}`}
                                    onClick={() => setSelectedRole("scanner")}
                                >
                                    <div className="role-card-header">
                                        <span className="role-icon">📷</span>
                                        <span className="role-title">Scanner</span>
                                    </div>
                                    <span className="role-desc">QR Ticket Check-in</span>
                                </button>
                            </div>
                            <p className="role-helper-text">
                                {selectedRole === "admin"
                                    ? "👑 Admin mode: Access dashboard, events, certificate automations, and scanner."
                                    : "📷 Scanner mode: Fast QR ticket scanning and attendance check-in."}
                            </p>
                        </div>
                    )}

                    <Input
                        label="Password"
                        type="password"
                        name="password"
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />

                    <Button
                        type="submit"
                        disabled={loading}
                    >
                        {loading
                            ? "Signing in..."
                            : isDualRole
                                ? `Sign In as ${selectedRole === "admin" ? "Admin" : "Scanner"}`
                                : "Sign In to Portal"}
                    </Button>
                </form>
            </Card>
        </div>
    );
}

export default Login;
