import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../apis/authApi";

function LoginPage() {
  const navigate = useNavigate();

  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setErrorMessage("");

    try {
      const result = await login({
        account,
        password,
      });

      localStorage.setItem("vip_token", result.token);
      localStorage.setItem("vip_user", JSON.stringify(result.user));

      navigate("/assistant");
    } catch {
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
          帳號
          <input
            type="text"
            value={account}
            onChange={(event) => setAccount(event.target.value)}
            placeholder="請輸入帳號"
          />
        </label>

        <label>
          密碼
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="請輸入密碼"
          />
        </label>

        {errorMessage && <div className="login-error">{errorMessage}</div>}

        <button type="submit">登入 VIP 系統</button>

        <span className="login-hint">Mock 模式下可任意輸入帳號密碼</span>
      </form>
    </div>
  );
}

export default LoginPage;