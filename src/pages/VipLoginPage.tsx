import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { vipMagicLogin } from "../apis/authApi";

function VipLoginPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get("token");
        // console.log("vip-login token:", token);

        if (!token) {
            navigate("/login", { replace: true });
            return;
        }

        const login = async () => {
            try {
                const data = await vipMagicLogin(token);
                
                localStorage.setItem("customer_access_token", data.access_token);

                localStorage.setItem(
                    "customer_profile",
                    JSON.stringify({
                        customer_vip_account_id: data.customer_vip_account_id,
                        customer_id: data.customer_id,
                        login_account: data.login_account,
                        full_name: data.full_name,
                        email: data.email,
                        mobile_phone: data.mobile_phone,
                        room_type_name: data.room_type_name,
                        room_no: data.room_no,
                    })
                );

                navigate("/assistant", { replace: true });
            } catch (error) {
                console.error("VIP magic login failed:", error);
                navigate("/login", { replace: true });
            }
        };

        login();
    }, [searchParams, navigate]);

    return <div>登入中，請稍候...</div>;
}

export default VipLoginPage;