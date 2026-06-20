import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../apis/authApi";

function LoginPage() {
  const navigate = useNavigate();

  const [loginAccount, setLoginAccount] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setErrorMessage("");

    try {
      const result = await login({
        login_account: loginAccount,
        password,
      });

      localStorage.setItem(
        "customer_access_token",
        result.access_token
      );

      localStorage.setItem(
        "customer_profile",
        JSON.stringify({
          customer_vip_account_id: result.customer_vip_account_id,
          customer_id: result.customer_id,
          login_account: result.login_account,
          full_name: result.full_name,
          email: result.email,
          mobile_phone: result.mobile_phone,
          room_type_name: result.room_type_name,
          room_no: result.room_no,
        })
      );

      navigate("/assistant");
    } catch (error) {
      console.error(error);
      setErrorMessage("登入失敗，請確認帳號密碼");
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo">V</div>

        <h1>RESORT VIP</h1>
        <p>尊榮旅客服務入口</p>

        <label>
          VIP帳號
          <input
            type="text"
            value={loginAccount}
            onChange={(event) =>
              setLoginAccount(event.target.value)
            }
            placeholder="請輸入 VIP 帳號"
          />
        </label>

        <label>
          密碼
          <input
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder="請輸入密碼"
          />
        </label>

        {errorMessage && (
          <div className="login-error">
            {errorMessage}
          </div>
        )}

        <button type="submit">
          登入 VIP 系統
        </button>

        <span className="login-hint">
          請使用入住時提供的 VIP 帳號與密碼
        </span>
      </form>
    </div>
  );
}

export default LoginPage;