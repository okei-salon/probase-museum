/** 認証セッション定数（クライアントへ秘密を載せない） */

export const PBM_SESSION_COOKIE = "pbm_session";

/** セッション有効期間（秒）— 30日 */
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

/**
 * 兄弟共通アクセス用セッション。
 * Museum 内の RED / BLUE WORLD 区分とは独立（認証に WORLD を持たない）。
 */
export type SessionPayload = {
  /** 固定識別子（将来の権限拡張用） */
  role: "member";
  /** Unix epoch 秒 */
  exp: number;
};
