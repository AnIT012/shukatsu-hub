import type { Metadata } from "next";
import { Landing } from "./landing";

export const metadata: Metadata = {
  title: "就活Hub — 就活の「次にやること」が毎朝ひと目で",
  description:
    "本選考もインターンも、ESもWebテストも面接も。いま動くべきことだけが前に出る就活管理アプリ。12色のテーマ・プッシュ通知・努力が見える進捗ページ。登録不要で試せる。",
};

export default function Page() {
  return <Landing />;
}
