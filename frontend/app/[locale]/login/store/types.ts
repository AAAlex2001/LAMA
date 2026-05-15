
export interface TelegramWidgetUser {
  id: number;
  hash: string;
  auth_date: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  [key: string]: unknown;
}

export interface TelegramAccount {
  telegram_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
}

export interface User {
  id: number;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  email?: string;
  email_verified?: boolean;
  telegram_account?: TelegramAccount;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  user?: User;
  registration_completed?: boolean;
}

export interface EmailLoginRequest {
  email: string;
  password: string;
}

export interface BotLoginRequest {
  telegram_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface LoginResult {
  success: boolean;
  message?: string;
  requiresRegistration?: boolean;
}

export interface LoginState {
  loading: boolean;
  error: string | null;
  status: "idle" | "loading" | "success" | "error";
  user: User | null;
  showTelegramWidget: boolean;
  form: {
    email: string;
    password: string;
    showPassword: boolean;
  };
  fieldErrors: {
    email: string | null;
    password: string | null;
  };
}

export type LoginAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_STATUS"; payload: LoginState["status"] }
  | { type: "CLEAR_NOTIFICATIONS" }
  | { type: "SET_EMAIL"; payload: string }
  | { type: "SET_PASSWORD"; payload: string }
  | { type: "TOGGLE_SHOW_PASSWORD" }
  | { type: "SET_FIELD_ERROR"; payload: { field: keyof LoginState["fieldErrors"]; message: string | null } }
  | { type: "CLEAR_FIELD_ERRORS" }
  | { type: "SET_USER"; payload: User | null }
  | { type: "RESET" };

export const initialLoginState: LoginState = {
  loading: false,
  error: null,
  status: "idle",
  user: null,
  showTelegramWidget: true,
  form: {
    email: "",
    password: "",
    showPassword: false,
  },
  fieldErrors: {
    email: null,
    password: null,
  },
};

export function loginReducer(state: LoginState, action: LoginAction): LoginState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_STATUS":
      return { ...state, status: action.payload };
    case "CLEAR_NOTIFICATIONS":
      return { ...state, error: null };
    case "SET_EMAIL":
      return {
        ...state,
        form: { ...state.form, email: action.payload },
        fieldErrors: { ...state.fieldErrors, email: null },
      };
    case "SET_PASSWORD":
      return {
        ...state,
        form: { ...state.form, password: action.payload },
        fieldErrors: { ...state.fieldErrors, password: null },
      };
    case "TOGGLE_SHOW_PASSWORD":
      return { ...state, form: { ...state.form, showPassword: !state.form.showPassword } };
    case "SET_FIELD_ERROR":
      return {
        ...state,
        fieldErrors: { ...state.fieldErrors, [action.payload.field]: action.payload.message },
      };
    case "CLEAR_FIELD_ERRORS":
      return { ...state, fieldErrors: initialLoginState.fieldErrors };
    case "SET_USER":
      return { ...state, user: action.payload };
    case "RESET":
      return initialLoginState;
    default:
      return state;
  }
}
