// フィードバック/満足度を Supabase feedback テーブルへ保存。
// 閲覧は service role(管理者)のみ。投稿はログインユーザーが自分の名前で。

import { supabase } from "./supabase";

/** 満足度評価(★1-5)＋任意コメントを送る */
export async function submitRating(
  userId: string,
  stars: number,
  message: string,
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("feedback").insert({
    user_id: userId,
    type: "rating",
    stars,
    message: message.trim() || null,
  });
  return !error;
}

/** 種類つきフィードバック(要望/不具合等)＋本文を送る */
export async function submitFeedback(
  userId: string,
  kind: string,
  message: string,
): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("feedback").insert({
    user_id: userId,
    type: "feedback",
    kind,
    message: message.trim(),
  });
  return !error;
}
