// 起動の膜。サーバーで HTML に焼くので、JS が届く前の最初の1枚目から出る(白い板 → アプリ の継ぎ目を作らない)。
// 動きは CSS だけ(globals.css の「起動」)。退くタイミングだけ、head の LAUNCH_SCRIPT が決める。
//
// 流れ(初回): 鞄が組み上がる → 今週の7つの点が並ぶ → 金のチェックが引かれる、と同時に名前が出る
//           → 準備ができたら、マークの位置から丸く開いて本編へ(一覧の行はそこから浮き上がる)。
// 同じタブで開き直した時は、組み上がった姿から短く退く。視差効果を減らす設定では、最後の姿を置いて淡く消す。

const WORD = ["就", "活", "H", "u", "b"];
// 今週の7つの点(真ん中=今日だけ大きい)。アプリ上部の週の帯と同じ並び
const CELLS = [0, 1, 2, 3, 4, 5, 6];

export function LaunchScreen() {
  return (
    <div id="launch" className="launch" aria-hidden>
      <div className="launch-inner">
        <svg className="launch-mark" viewBox="0 0 96 96" width="96" height="96">
          <rect className="lm-tile" x="0" y="0" width="96" height="96" rx="26" />
          <path
            className="lm-handle"
            d="M36 30 v-4.5 a6.5 6.5 0 0 1 6.5 -6.5 h11 a6.5 6.5 0 0 1 6.5 6.5 v4.5"
          />
          <rect className="lm-body" x="17" y="29" width="62" height="46" rx="10" />
          <rect className="lm-band" x="17" y="40" width="62" height="3.5" rx="1.75" />
          <g className="lm-cells">
            {CELLS.map((i) => (
              <circle
                key={i}
                className="lm-cell"
                cx={27 + i * 7}
                cy={56}
                r={i === 3 ? 3.6 : 2.4}
                style={{ ["--i" as string]: i }}
              />
            ))}
          </g>
          <path className="lm-check" d="M57 63 l7.5 7.5 l15 -18" pathLength={1} />
        </svg>
        {/* 字送りは tracking を使わず、1字ずつ左右に同じ余白(末尾の後ろに空きを作らない=中心がずれない) */}
        <div className="launch-word">
          {WORD.map((c, i) => (
            <span key={i} style={{ ["--i" as string]: i }}>
              {c}
            </span>
          ))}
        </div>
        <div className="launch-tag">就活の「次にやること」が、毎朝ひと目で。</div>
      </div>
    </div>
  );
}

/**
 * head に置く起動の台本(描画より前に走る)。
 *  - テーマを先に当てる(最初の1枚目から選んだ色で出す)
 *  - 初回/開き直し/視差効果を減らす を決めて html[data-launch] に書く
 *  - window.__launchReady() が呼ばれ、最短の時間を過ぎたら退く。6秒で必ず退く(JSが止まっても CSS が8秒で消す)
 */
export const LAUNCH_SCRIPT = `(function(){try{
var d=document.documentElement;
if(location.pathname!=='/')return;
try{var t=localStorage.getItem('shukatsu-dashboard:theme');if(t)d.dataset.theme=t;}catch(e){}
var rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
var seen=null;try{seen=sessionStorage.getItem('shukatsu-dashboard:launched');sessionStorage.setItem('shukatsu-dashboard:launched','1');}catch(e){}
var mode=rm?'still':(seen?'short':'full');
d.dataset.launch=mode;
var t0=Date.now(),min=mode==='full'?1150:250,ready=false,done=false;
function exit(){if(done)return;done=true;
var el=document.getElementById('launch');
d.removeAttribute('data-launch');
try{window.dispatchEvent(new Event('launch:reveal'));}catch(e){}
if(!el)return;
el.classList.add(rm?'is-fading':'is-exiting');
setTimeout(function(){el.style.display='none';try{window.dispatchEvent(new Event('launch:done'));}catch(e){}},rm?240:620);}
window.__launchReady=function(){if(ready)return;ready=true;setTimeout(exit,Math.max(0,min-(Date.now()-t0)));};
setTimeout(function(){window.__launchReady();},6000);
}catch(e){}})();`;

/** 本編(またはログイン画面)の準備ができたら呼ぶ。何度呼んでもよい */
export function launchReady() {
  try {
    const w = window as unknown as { __launchReady?: () => void };
    if (w.__launchReady) {
      w.__launchReady();
    } else {
      // 台本が走っていない(別のページからアプリ内で移ってきた等)なら、膜はすぐ隠す。
      // React が持つ要素なので外さずに隠す
      const el = document.getElementById("launch");
      if (el) el.style.display = "none";
    }
  } catch {
    // ignore
  }
}

/** 起動の膜がまだ出ているか(一覧の浮き上がりを、膜が開くまで待たせる用) */
export function isLaunching(): boolean {
  try {
    return document.documentElement.hasAttribute("data-launch");
  } catch {
    return false;
  }
}
