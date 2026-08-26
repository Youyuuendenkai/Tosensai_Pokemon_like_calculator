// 技のデータベース
const MOVE_DATABASE = [
    { name: "たいあたり", power: 60 },
    { name: "ひのこ", power: 40 },
    { name: "かえんほうしゃ", power: 90 },
    { name: "でんきショック", power: 40 },
    { name: "10まんボルト", power: 90 },
    { name: "かみなり", power: 120 },
    { name: "みずでっぽう", power: 40 },
    { name: "ハイドロポンプ", power: 90 },
    { name: "ギガインパクト", power: 120 },
    { name: "ウルトラバースト", power: 120 },
    { name: "すてみタックル", power: 120 },
    { name: "でんこうせっか", power: 40 }
];

// ゲームの現在の状態
let gameState = {
    p1: { currentHp: 150 },
    p2: { currentHp: 150 }
};

// 履歴スタック（Undo用）
let historyStack = [];

// ＝★【起動処理の強化】ブラウザの種類やテスト環境に依存せず、確実にJSを実行させる
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    initializeGame();
}

function initializeGame() {
    initMoveDatabase();
    resetBattle();
}

// selectタグ群にデータベースの技を注入
function initMoveDatabase() {
    const players = ['p1', 'p2'];
    const slots = [0, 1, 2];
    
    players.forEach(player => {
        slots.forEach(slot => {
            const selectEl = document.getElementById(`${player}-move-name-${slot}`);
            if (!selectEl) return;
            
            selectEl.innerHTML = ''; // クリア
            
            MOVE_DATABASE.forEach(move => {
                const option = document.createElement('option');
                option.value = move.name;
                option.textContent = `${move.name} (威力:${move.power})`;
                selectEl.appendChild(option);
            });
            
            // 各スロットに初期技を設定
            const defaultIndex = (player === 'p1') ? slot : slot + 3;
            selectEl.selectedIndex = defaultIndex % MOVE_DATABASE.length;
            
            // 威力の数値を初期同期
            onSelectMove(player, slot);
        });
    });
}

// 数値の10刻みの増減（最大HPの増加・減少に完璧に対応）
function stepValue(id, delta, min, max) {
    const input = document.getElementById(id);
    if (!input) return;

    let currentValue = parseInt(input.value) || 0;
    let newValue = currentValue + delta;

    if (newValue < min) newValue = min;
    if (newValue > max) newValue = max;

    // 前の最大HPを記録しておく（満タン判定用）
    const prevMaxHp = currentValue;

    input.value = newValue;

    // 最大HP（max-hp）が変更された場合
    if (id.endsWith('max-hp')) {
        const player = id.startsWith('p1') ? 'p1' : 'p2';
        
        // 【親切設計】
        // もし変更前に「HPが満タン（現在HP ＝ 変更前の最大HP）」だったなら、
        // 最大HPを増やしたときも、自動的に新しい最大HP（満タン）に合わせる
        if (gameState[player].currentHp === prevMaxHp) {
            gameState[player].currentHp = newValue;
        } 
        // そうではなく、最大HPを下げたことで現在HPがはみ出してしまったら、新しい最大HPに丸める
        else if (gameState[player].currentHp > newValue) {
            gameState[player].currentHp = newValue;
        }
        
        // 最大HPが増えても減っても、★必ず★表示を更新する
        updateHPDisplay(player, newValue);
    }
}

// 技選択時に威力テキストと計算用hiddenの数値を更新
function onSelectMove(player, moveIndex) {
    const selectEl = document.getElementById(`${player}-move-name-${moveIndex}`);
    const powerInput = document.getElementById(`${player}-move-power-${moveIndex}`);
    const powerDisplay = document.getElementById(`${player}-move-power-display-${moveIndex}`);
    
    if (!selectEl) return;

    const selectedName = selectEl.value;
    const foundMove = MOVE_DATABASE.find(move => move.name === selectedName);

    if (foundMove) {
        if (powerInput) powerInput.value = foundMove.power;
        if (powerDisplay) powerDisplay.textContent = foundMove.power;
    }
}

// 履歴に保存
function saveToHistory() {
    historyStack.push({
        p1Hp: gameState.p1.currentHp,
        p2Hp: gameState.p2.currentHp,
        logHTML: document.getElementById('log-container').innerHTML
    });

    if (historyStack.length > 30) {
        historyStack.shift();
    }
    updateUndoButtonState();
}

// 1つ戻る (Undo)
function undo() {
    if (historyStack.length === 0) return;

    const prevState = historyStack.pop();

    gameState.p1.currentHp = prevState.p1Hp;
    gameState.p2.currentHp = prevState.p2Hp;

    const p1MaxHp = parseInt(document.getElementById('p1-max-hp').value) || 150;
    const p2MaxHp = parseInt(document.getElementById('p2-max-hp').value) || 150;

    updateHPDisplay('p1', p1MaxHp);
    updateHPDisplay('p2', p2MaxHp);

    document.getElementById('log-container').innerHTML = prevState.logHTML;

    const logContainer = document.getElementById('log-container');
    if (logContainer) logContainer.scrollTop = logContainer.scrollHeight;

    updateUndoButtonState();
}

function updateUndoButtonState() {
    const undoBtn = document.getElementById('btn-undo');
    if (undoBtn) {
        undoBtn.disabled = historyStack.length === 0;
    }
}

// バトルのリセット
function resetBattle() {
    if (gameState.p1.currentHp !== undefined && historyStack.length > 0) {
        saveToHistory();
    }

    const p1MaxHp = parseInt(document.getElementById('p1-max-hp').value) || 150;
    const p2MaxHp = parseInt(document.getElementById('p2-max-hp').value) || 150;

    gameState.p1.currentHp = p1MaxHp;
    gameState.p2.currentHp = p2MaxHp;

    updateHPDisplay('p1', p1MaxHp);
    updateHPDisplay('p2', p2MaxHp);

    const logContainer = document.getElementById('log-container');
    if (logContainer) {
        logContainer.innerHTML = '<div class="log-entry">バトルがリセット（開始準備完了）されました。</div>';
    }
    
    historyStack = [];
    updateUndoButtonState();
}

// HP表示更新
function updateHPDisplay(player, maxHp) {
    const currentHp = gameState[player].currentHp;
    const hpPercent = maxHp > 0 ? (currentHp / maxHp) * 100 : 0;
    
    const bar = document.getElementById(`${player}-hp-bar`);
    const text = document.getElementById(`${player}-hp-text`);

    if (bar) bar.style.width = `${Math.max(0, hpPercent)}%`;
    if (text) text.textContent = `${Math.max(0, currentHp)} / ${maxHp}`;

    if (bar) {
        if (hpPercent > 50) {
            bar.style.backgroundColor = '#28a745';
        } else if (hpPercent > 20) {
            bar.style.backgroundColor = '#ffc107';
        } else {
            bar.style.backgroundColor = '#dc3545';
        }
    }
}

// ダメージ計算（HP×防御の相乗効果を生む割り算式）
function calculateDamage(power, attack, defense) {
    if (power <= 0) return 0;

    // もし防御が0以下ならエラー防止のため1にする
    const safeDefense = defense > 0 ? defense : 1;

    // 【新しい計算式】
    // 威力 * (攻撃 / 防御) * 補正値(0.85)
    let damage = power * (attack / safeDefense) * 0.85;

    // 小数点以下の切り捨て
    damage = Math.floor(damage);

    // 最低1ダメージ保証
    return Math.max(1, damage);
}

// 技使用
function useMove(attacker, moveIndex) {
    const defender = attacker === 'p1' ? 'p2' : 'p1';

    const attackerName = attacker === 'p1' ? 'プレイヤー1' : 'プレイヤー2';
    const defenderName = defender === 'p1' ? 'プレイヤー1' : 'プレイヤー2';

    const attackerMaxHp = parseInt(document.getElementById(`${attacker}-max-hp`).value) || 150;
    const defenderMaxHp = parseInt(document.getElementById(`${defender}-max-hp`).value) || 150;

    if (gameState[attacker].currentHp <= 0) {
        addLog(`${attackerName}はひんし状態のため、技を使えません。`);
        return;
    }
    if (gameState[defender].currentHp <= 0) {
        addLog(`${defenderName}はすでに倒れています。`);
        return;
    }

    saveToHistory();

    const attack = parseInt(document.getElementById(`${attacker}-attack`).value) || 10;
    const defense = parseInt(document.getElementById(`${defender}-defense`).value) || 10;
    
    const selectEl = document.getElementById(`${attacker}-move-name-${moveIndex}`);
    const moveName = selectEl ? selectEl.value : `わざ${moveIndex + 1}`;
    const movePower = parseInt(document.getElementById(`${attacker}-move-power-${moveIndex}`).value) || 0;

    const damage = calculateDamage(movePower, attack, defense);

    gameState[defender].currentHp -= damage;
    if (gameState[defender].currentHp < 0) {
        gameState[defender].currentHp = 0;
    }

    updateHPDisplay(defender, defenderMaxHp);

    addLog(`${attackerName}の「${moveName}」！ ${defenderName}に ${damage} のダメージ！`);

    if (gameState[defender].currentHp <= 0) {
        addLog(`${defenderName}はたおれた！`);
    }
}

// ログ
function addLog(message) {
    const logContainer = document.getElementById('log-container');
    if (!logContainer) return;
    const newEntry = document.createElement('div');
    newEntry.className = 'log-entry';
    newEntry.textContent = message;
    logContainer.appendChild(newEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

// ==========================================
// ※ MOVE_DATABASE や gameState などの変数定義、
// および stepValue, undo などの既存関数はそのまま残してください
// ==========================================

// ＝★新規追加：ダメージ時に巨大HPバーとカウントダウンを再生する関数
function triggerDamageAnimation(defender, startHp, endHp, maxHp, callback) {
    const overlay = document.getElementById('battle-modal');
    const bar = document.getElementById('modal-hp-bar');
    const text = document.getElementById('modal-hp-text');
    const title = document.getElementById('modal-player-name');
    
    const defenderName = defender === 'p1' ? 'プレイヤー1' : 'プレイヤー2';
    title.textContent = defenderName;
    
    // アニメーション前の「初期状態」をモーダルにセット
    const startPercent = (startHp / maxHp) * 100;
    bar.style.transition = 'none'; // 一旦アニメーション（transition）を切る
    bar.style.width = `${startPercent}%`;
    setModalHPBarColor(startPercent);
    text.textContent = `${startHp} / ${maxHp}`;
    
    // モーダルを表示
    overlay.classList.add('active');
    
    // ブラウザが「初期状態」を描画し終えるまでわずかに（150ms）待ってから再生開始
    setTimeout(() => {
        // transition（アニメーション）を復活させ、減少後の割合にする
        bar.style.transition = 'width 1.5s cubic-bezier(0.1, 0.8, 0.25, 1), background-color 1.5s ease';
        const endPercent = (endHp / maxHp) * 100;
        bar.style.width = `${endPercent}%`;
        setModalHPBarColor(endPercent);
        
        // 【HP数値のじわじわ減少カウントダウン】
        const damageAmount = startHp - endHp;
        if (damageAmount <= 0) {
            // ダメージがない場合は即座にcallbackを呼んで閉じる
            setTimeout(() => {
                overlay.classList.remove('active');
                if (callback) callback();
            }, 800);
            return;
        }

        let currentTempHp = startHp;
        const animationDuration = 1500; // 1.5秒かけて減らす
        // ダメージ量に応じて、カウントダウンの1引くごとの秒数を自動で調整
        const stepTime = Math.max(10, Math.floor(animationDuration / damageAmount)); 
        
        const timer = setInterval(() => {
            if (currentTempHp > endHp) {
                currentTempHp--;
                text.textContent = `${currentTempHp} / ${maxHp}`;
            } else {
                clearInterval(timer); // カウントダウン完了
                
                // 完全に減りきった状態で0.8秒だけハラハラさせてから、ポップアップを閉じる
                setTimeout(() => {
                    overlay.classList.remove('active');
                    // 閉じるのとほぼ同時に、裏のメイン画面のHPやログを更新する（コールバック実行）
                    if (callback) callback();
                }, 800);
            }
        }, stepTime);
        
    }, 150);
}

// 演出モーダル用のHPバー色変化
function setModalHPBarColor(percent) {
    const bar = document.getElementById('modal-hp-bar');
    if (!bar) return;
    if (percent > 50) {
        bar.style.backgroundColor = '#28a745'; // 緑
    } else if (percent > 20) {
        bar.style.backgroundColor = '#ffc107'; // 黄
    } else {
        bar.style.backgroundColor = '#dc3545'; // 赤
    }
}

// ＝★大幅修正：演出アニメーションに連動させた「技の使用」関数
function useMove(attacker, moveIndex) {
    const defender = attacker === 'p1' ? 'p2' : 'p1';

    const attackerName = attacker === 'p1' ? 'プレイヤー1' : 'プレイヤー2';
    const defenderName = defender === 'p1' ? 'プレイヤー1' : 'プレイヤー2';

    const attackerMaxHp = parseInt(document.getElementById(`${attacker}-max-hp`).value) || 150;
    const defenderMaxHp = parseInt(document.getElementById(`${defender}-max-hp`).value) || 150;

    if (gameState[attacker].currentHp <= 0) {
        addLog(`${attackerName}はひんし状態のため、技を使えません。`);
        return;
    }
    if (gameState[defender].currentHp <= 0) {
        addLog(`${defenderName}はすでに倒れています。`);
        return;
    }

    // 1. 計算前の「現在のHP（開始時のHP）」を保存
    const startHp = gameState[defender].currentHp;

    // 各種ステータスの取得
    const attack = parseInt(document.getElementById(`${attacker}-attack`).value) || 10;
    const defense = parseInt(document.getElementById(`${defender}-defense`).value) || 10;
    
    const selectEl = document.getElementById(`${attacker}-move-name-${moveIndex}`);
    const moveName = selectEl ? selectEl.value : `わざ${moveIndex + 1}`;
    const movePower = parseInt(document.getElementById(`${attacker}-move-power-${moveIndex}`).value) || 0;

    // ダメージ計算
    const damage = calculateDamage(movePower, attack, defense);

    // 2. 計算後の「終了時のHP」を計算（マイナスにならないようガード）
    const endHp = Math.max(0, startHp - damage);

    // 3. アニメーション前の状態（開始前のHP）で履歴に保存（やり直し対応のため）
    saveToHistory();

    // 4. 【演出開始】
    triggerDamageAnimation(defender, startHp, endHp, defenderMaxHp, () => {
        // ＝★以下はアニメーション演出が完全に終了して、画面が戻った後に実行されます
        
        // ステート（現在HP）の確定反映
        gameState[defender].currentHp = endHp;

        // メイン画面のHPバーと文字を更新
        updateHPDisplay(defender, defenderMaxHp);

        // バトルログの書き出し
        addLog(`${attackerName}の「${moveName}」！ ${defenderName}に ${damage} のダメージ！`);

        // ひんし判定
        if (gameState[defender].currentHp <= 0) {
            addLog(`${defenderName}はたおれた！`);
        }
    });
}
