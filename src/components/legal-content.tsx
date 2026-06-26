// プライバシーポリシー・利用規約の本文（静的）。
// legal-dialog から表示。制作者「AnIT」/ 連絡先 GitHub Issues。

const CONTACT_URL =
  "https://github.com/annonymousIT/shukatsu-dashboard/issues";
const UPDATED = "2026年6月20日";

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export function PrivacyPolicyBody() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">最終更新日: {UPDATED}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        就活Hub（以下「本アプリ」）は、個人開発者「AnIT」が提供する就職活動の進捗管理ツールです。
        本ポリシーは、本アプリにおけるユーザー情報の取り扱いを定めたものです。
      </p>

      {/* 「ESを見られている」という誤解を防ぐための明示ブロック */}
      <div className="rounded-xl border border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.06)] p-3.5 text-sm leading-relaxed">
        <p className="font-semibold text-foreground">🔒 あなたのデータについて（大切なこと）</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted-foreground">
          <li>
            入力したES・企業名・選考状況は
            <span className="font-medium text-foreground">「あなた専用」</span>
            のデータです。ログイン中の本人だけがアクセスでき、
            <span className="font-medium text-foreground">
              他の利用者が閲覧することはできません
            </span>
            （データベースのアクセス制御＝RLSで技術的に保護）。
          </li>
          <li>
            <span className="font-medium text-foreground">
              開発者があなたのESや選考内容を閲覧することはありません。
            </span>
            本アプリには特定個人のデータを覗くための機能がなく、RLSで分離されています。広告や第三者提供にも一切利用しません。
          </li>
          <li>
            企業ごとに保存できる
            <span className="font-medium text-foreground">ログインID・会員番号</span>
            も同様にあなた専用で、
            <span className="font-medium text-foreground">パスワードは保存しません</span>
            （一覧では「••••」で隠して表示することもできます）。
          </li>
          <li>
            このページの「保存される情報」は
            <span className="font-medium text-foreground">
              「あなたが入力・保存する情報」
            </span>
            という意味で、開発者が収集・監視するという意味ではありません。
          </li>
          <li>
            さらに安心したい場合は、ログインせず
            <span className="font-medium text-foreground">「登録不要で試す」</span>
            を選べば、データは
            <span className="font-medium text-foreground">あなたの端末の中だけ</span>
            に保存され、どこにも送信されないので、
            <span className="font-medium text-foreground">開発者を含め誰も閲覧できません</span>
            。
          </li>
        </ul>
      </div>

      <Block title="1. アプリに保存される情報（あなたが入力した情報）">
        <p className="mb-1.5">
          以下は、あなた自身がアプリに入力・保存する情報です。開発者が勝手に収集・閲覧するという意味ではありません。
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>クラウド同期を利用する場合のメールアドレス（ログイン認証のため）</li>
          <li>
            あなたが入力した就職活動の情報（企業名・選考ステップ・締切・ES設問と回答・メモ、
            任意のログインID・会員番号 等）。これらは「あなた専用」として保存され、本人だけが
            アクセスできます（
            <span className="font-medium text-foreground">パスワードは保存しません</span>）
          </li>
          <li>
            サービスの維持・改善のための利用状況（アクセス日時・更新日時など。
            入力内容そのものではありません）
          </li>
        </ul>
      </Block>

      <Block title="2. 保存先と方法">
        ログインせずに使う場合、データは利用者の端末内（ブラウザのローカルストレージ）にのみ保存されます。
        クラウド同期を利用する場合は、認証・データベース基盤である Supabase に保存され、通信は暗号化（HTTPS）されます。
      </Block>

      <Block title="3. 利用目的とデータの分離">
        保存された情報は、あなたの進捗管理機能を提供するためだけに使われます。
        入力したデータは RLS（行レベルセキュリティ）でユーザーごとに分離されており、
        他の利用者から閲覧することはできません。本アプリには特定個人のES・選考内容を
        一覧・閲覧するための機能はなく、開発者がこれらの中身を覗くことはありません。
        アクセス日時・利用頻度などは、サービスの維持・改善のために統計的に把握する場合がありますが、
        個人を特定する広告目的の解析や、第三者への提供は一切行いません。
      </Block>

      <Block title="4. 第三者サービス">
        本アプリはインフラとして Supabase（認証・データ保存）および Vercel（ホスティング）を利用します。
        これら稼働に必要な範囲を超えて、利用者の情報を第三者へ提供することはありません。
      </Block>

      <Block title="5. データの管理・削除">
        メニューの「エクスポート（JSON）」でいつでもバックアップできます。各企業・各データは画面上で削除でき、
        全データの削除も可能です。アカウントごとの削除を希望する場合は、下記の連絡先までご連絡ください。
      </Block>

      <Block title="6. Cookie・ローカルストレージ・アクセス解析">
        ログイン状態の保持、テーマ設定、初回ガイドの表示判定のためにローカルストレージを使用します。
        また、アクセス状況の把握に Vercel Analytics（Cookie を使わない匿名のアクセス解析）を利用します。
        個人を特定する情報の取得や、広告目的のトラッキングは行いません。
      </Block>

      <Block title="7. 制作者・お問い合わせ">
        制作者: AnIT
        <br />
        お問い合わせ:{" "}
        <a
          href={CONTACT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline underline-offset-2"
        >
          GitHub Issues
        </a>
      </Block>

      <Block title="8. 改定">
        本ポリシーは、必要に応じて予告なく改定する場合があります。重要な変更がある場合はアプリ上でお知らせします。
      </Block>
    </div>
  );
}

export function TermsOfServiceBody() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">最終更新日: {UPDATED}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        本利用規約（以下「本規約」）は、就活Hub（以下「本アプリ」）の利用条件を定めるものです。
        本アプリを利用した時点で、本規約に同意したものとみなします。
      </p>

      <Block title="1. 本サービスについて">
        本アプリは、就職活動の進捗管理を補助する個人開発の無償ツールです。
      </Block>

      <Block title="2. 利用者の責任（重要）">
        選考の締切・日程・会場などの最終確認は、必ず各企業の公式情報で行ってください。
        本アプリに登録された情報の誤り・見落としにより生じた不利益について、制作者は責任を負いません。
      </Block>

      <Block title="3. データの取り扱い">
        本アプリは現状有姿で提供され、データの保存・可用性・消失しないことを保証しません。
        重要なデータは、各自でエクスポート（バックアップ）してください。
      </Block>

      <Block title="4. 禁止事項">
        <ul className="list-disc space-y-1 pl-5">
          <li>法令または公序良俗に反する行為</li>
          <li>本アプリの運営を妨害する行為、不正アクセス、なりすまし</li>
          <li>本アプリやその基盤への過度な負荷・リバースエンジニアリング等による妨害</li>
        </ul>
      </Block>

      <Block title="5. 免責">
        本アプリの利用または利用できなかったことにより生じたいかなる損害についても、
        制作者は一切の責任を負いません。
      </Block>

      <Block title="6. 規約の変更">
        本規約は、必要に応じて予告なく変更される場合があります。
      </Block>

      <Block title="7. 準拠法">
        本規約は日本法に準拠し、解釈されるものとします。
      </Block>

      <Block title="8. お問い合わせ">
        <a
          href={CONTACT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline underline-offset-2"
        >
          GitHub Issues
        </a>
      </Block>
    </div>
  );
}
