export type LoginRequest = {
    login_account: string;
    password: string;
};

export type LoginResponse = {
    access_token: string;
    token_type: string;

    customer_vip_account_id: string;
    customer_id: string;
    login_account: string;

    full_name: string;
    email: string | null;
    mobile_phone: string | null;

    room_type_name: string | null;
    room_no: string | null;

    country_code: string | null;
};

export type CustomerProfile = {
    customer_vip_account_id: string;
    customer_id: string;

    login_account: string;

    full_name: string;

    email: string | null;
    mobile_phone: string | null;

    room_type_name: string | null;
    room_no: string | null;

    country_code: string | null;
};

export type VipMagicLoginResponse = {
  access_token: string;
  token_type: string;
  customer_vip_account_id: string;
  customer_id: string;
  login_account: string;
  full_name: string;
  email: string;
  mobile_phone: string;
  room_type_name: string;
  room_no: string;
  country_code: string;
};