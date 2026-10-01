// 起動の膜。サーバーで HTML に焼くので、JS が届く前の最初の1枚目から出る(白い板 → アプリ の継ぎ目を作らない)。
// 動きは CSS だけ(globals.css の「起動」)。退くタイミングだけ、head の LAUNCH_SCRIPT が決める。
//
// 流れ(初回): 鞄が組み上がる → 今週の7つの点が並ぶ → 金のチェックが引かれる、と同時に名前が出る
//           → 準備ができたら、マークの位置から丸く開いて本編へ(一覧の行はそこから浮き上がる)。
// 同じタブで開き直した時は、組み上がった姿から短く退く。視差効果を減らす設定では、最後の姿を置いて淡く消す。

import { BrandMark } from "@/components/brand-mark";

const WORD = ["就", "活", "H", "u", "b"];

export function LaunchScreen() {
  return (
    <div id="launch" className="launch" aria-hidden>
      <div className="launch-inner">
        <BrandMark />
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
 *  - テーマと文字サイズを先に当てる(最初の1枚目から選んだ色・大きさで出す。途中で縮まない)
 *    ⚠ 文字サイズの既定 0.9 と範囲 0.9〜1.25 は lib/constants.ts の FONT_SCALE_* と同じ値。片方だけ変えない
 *  - 初回/開き直し/視差効果を減らす を決めて html[data-launch] に書く
 *  - window.__launchReady() が呼ばれ、最短の時間を過ぎたら退く。6秒で必ず退く(JSが止まっても CSS が8秒で消す)
 */
export const LAUNCH_SCRIPT = `(function(){try{
var d=document.documentElement;
if(location.pathname!=='/')return;
try{var t=localStorage.getItem('shukatsu-dashboard:theme');if(t)d.dataset.theme=t;}catch(e){}
try{var ff=localStorage.getItem('shukatsu-dashboard:font');if(!ff||ff==='zenKaku')d.style.setProperty('--app-font','"Zen Kaku Gothic New", sans-serif');}catch(e){}
try{var fs=parseFloat(localStorage.getItem('shukatsu-dashboard:fontscale'));if(!(fs>=0.9&&fs<=1.25))fs=0.9;if(fs!==1)d.style.zoom=String(fs);d.style.setProperty('--app-zoom',String(fs));}catch(e){}
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
