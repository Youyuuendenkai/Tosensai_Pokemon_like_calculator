// 技のデータベース（CSVの読み込みに失敗したときの保険用のデフォルトリスト）
let MOVE_DATABASE = [
    { id: 1, name: "たいあたり", power: 60, recoil: 0, desc: "普通の体当たり。追加効果なし", isBase: 1 },
    { id: 2, name: "ひのこ", power: 40, recoil: 0, desc: "相手を火の粉で攻撃する", isBase: 1 },
    { id: 3, name: "かえんほうしゃ", power: 90, recoil: 0, desc: "激しい炎を吹き出す", isBase: 0 },
    { id: 4, name: "でんきショック", power: 40, recoil: 0, desc: "電気を浴びせて攻撃する", isBase: 1 },
    { id: 5, name: "10まんボルト", power: 90, recoil: 0, desc: "強い電撃を浴びせる", isBase: 0 },
    { id: 6, name: "かみなり", power: 120, recoil: 25, desc: "天から雷を落とす。少し反動を受ける", isBase: 0 },
    { id: 7, name: "みずでっぽう", power: 40, recoil: 0, desc: "勢いよく水を吹き出す", isBase: 1 },
    { id: 8, name: "ハイドロポンプ", power: 90, recoil: 0, desc: "大量の水を激しく噴射する", isBase: 0 },
    { id: 9, name: "ギガインパクト", power: 120, recoil: 0, desc: "全身全霊の体当たりをぶちかます", isBase: 0 },
    { id: 10, name: "ウルトラバースト", power: 120, recoil: 50, desc: "凄まじい反動を受ける超大技", isBase: 0 },
    { id: 11, name: "すてみタックル", power: 120, recoil: 33, desc: "命を削って突進する。大きな反動を受ける", isBase: 0 },
    { id: 12, name: "でんこうせっか", power: 40, recoil: 0, desc: "素早く相手に体当たりする", isBase: 1 }
];

// ゲームの現在の状態
let gameState = {
    p1: { currentHp: 150 },
    p2: { currentHp: 150 }
};

// 履歴スタック（Undo用）
let historyStack = [];

// 【起動処理の強化】
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    initializeGame();
}

async function initializeGame() {
    // 最初にCSVファイルから技リストをロードする
    await loadMovesFromCSV();
    initMoveDatabase();
    resetBattle();
}

// ＝★新規追加：外部CSVファイルを非同期で読み込んでパースする
async function loadMovesFromCSV() {
    try {
        const response = await fetch('moves.csv');
        if (!response.ok) {
            throw new Error('CSVファイルのレスポンスエラー');
        }
        const csvText = await response.text();
        MOVE_DATABASE = parseCSV(csvText);
        console.log('moves.csvを正常に読み込み、反映しました。');
    } catch (error) {
        // ローカルでHTMLファイルを直接ダブルクリックして起動した場合、
        // ブラウザの仕様（CORS制限）によりCSV読み込みがブロックされるため、
        // その場合は、上記のデフォルトリストをそのまま使用して、安全に起動させます。
        console.warn('moves.csvの読み込みに失敗しました（ローカルテスト中、またはファイル未配置）。フォールバックリストを使用します。', error);
    }
}

// ＝★新規追加：簡易的なCSVパース処理
function parseCSV(csvText) {
    const lines = csvText.split(/\r?\n/);
    const parsedData = [];
    
    // 2行目（インデックス1）からデータとして処理（1行目のヘッダーはスキップ）
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '') continue;
        
        const columns = line.split(',');
        if (columns.length >= 6) {
            parsedData.push({
                id: parseInt(columns[0]) || 0,
                name: columns[1].trim(),
                power: parseInt(columns[2]) || 0,
                recoil: parseInt(columns[3]) || 0,
                desc: columns[4].trim(),
                isBase: parseInt(columns[5]) || 0
            });
        }
    }
    return parsedData;
}

// selectタグ群にデータベースの技を注入
function initMoveDatabase() {
    const players = ['p1', 'p2'];
    const slots = [0, 1, 2];
    
    // 「基本技フラグ」が 1 の技だけを抽出
    const baseMoves = MOVE_DATABASE.filter(move => move.isBase === 1);
    // もし基本技に設定された技が足りない場合は、全体から割り当てる
    const startMoves = baseMoves.length >= 3 ? baseMoves : MOVE_DATABASE;

    players.forEach(player => {
        slots.forEach(slot => {
            const selectEl = document.getElementById(`${player}-move-name-${slot}`);
            if (!selectEl) return;
            
            selectEl.innerHTML = ''; // クリア
            
            MOVE_DATABASE.forEach(move => {
                const option = document.createElement('option');
                option.value = move.name;
                // ドロップダウンを展開したときにも説明や反動が見えるように、オプションテキストをリッチ化
                const recoilText = move.recoil > 0 ? ` / 反動:${move.recoil}%` : '';
                option.textContent = `${move.name} (威力:${move.power}${recoilText}) — ${move.desc}`;
                selectEl.appendChild(option);
            });
            
            // 各スロットに「基本技フラグ(isBase)」の技をデフォルト設定
            const defaultIndex = (player === 'p1') ? slot : slot + 1;
            const initialMove = startMoves[defaultIndex % startMoves.length];
            
            if (initialMove) {
                selectEl.value = initialMove.name;
            }
            
            // 威力・反動・備考を初期同期
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

    const prevMaxHp = currentValue;
    input.value = newValue;

    if (id.endsWith('max-hp')) {
        const player = id.startsWith('p1') ? 'p1' : 'p2';
        
        if (gameState[player].currentHp === prevMaxHp) {
            gameState[player].currentHp = newValue;
        } 
        else if (gameState[player].currentHp > newValue) {
            gameState[player].currentHp = newValue;
        }
        
        updateHPDisplay(player, newValue);
    }
}

// ＝★大幅更新：技選択時に、威力・反動ダメージ・備考欄テキストを全て同期させる
function onSelectMove(player, moveIndex) {
    const selectEl = document.getElementById(`${player}-move-name-${moveIndex}`);
    const powerInput = document.getElementById(`${player}-move-power-${moveIndex}`);
    const powerDisplay = document.getElementById(`${player}-move-power-display-${moveIndex}`);
    
    // 反動と説明（備考）用の要素
    const recoilInput = document.getElementById(`${player}-move-recoil-${moveIndex}`);
    const recoilDisplay = document.getElementById(`${player}-move-recoil-display-${moveIndex}`);
    const recoilArea = document.getElementById(`${player}-move-recoil-display-area-${moveIndex}`);
    const descDisplay = document.getElementById(`${player}-move-desc-${moveIndex}`);
    
    if (!selectEl) return;

    const selectedName = selectEl.value;
    const foundMove = MOVE_DATABASE.find(move => move.name === selectedName);

    if (foundMove) {
        // 威力を同期
        if (powerInput) powerInput.value = foundMove.power;
        if (powerDisplay) powerDisplay.textContent = foundMove.power;
        
        // 反動を同期
        if (recoilInput) recoilInput.value = foundMove.recoil;
        if (recoilDisplay) recoilDisplay.textContent = foundMove.recoil;
        if (recoilArea) {
            // 反動ダメージが0%より大きいときだけ、横に「/ 反動: ◯%」を表示する
            recoilArea.style.display = foundMove.recoil > 0 ? 'inline' : 'none';
        }
        
        // 備考（技の説明）を同期
        if (descDisplay) {
            descDisplay.textContent = foundMove.desc || '（説明はありません）';
        }
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

    const safeDefense = defense > 0 ? defense : 1;

    // 【新しい計算式】
    // 威力 * (攻撃 / 防御) * 補正値(0.85)
    let damage = power * (attack / safeDefense) * 0.85;
    damage = Math.floor(damage);

    return Math.max(1, damage);
}

// ＝★大幅更新：反動ダメージのロジックを追加した技使用処理
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

    // 1. 計算前の現在のHPを保存
    const startHp = gameState[defender].currentHp;

    // 各種ステータスの取得
    const attack = parseInt(document.getElementById(`${attacker}-attack`).value) || 10;
    const defense = parseInt(document.getElementById(`${defender}-defense`).value) || 10;
    
    const selectEl = document.getElementById(`${attacker}-move-name-${moveIndex}`);
    const moveName = selectEl ? selectEl.value : `わざ${moveIndex + 1}`;
    const movePower = parseInt(document.getElementById(`${attacker}-move-power-${moveIndex}`).value) || 0;

    // ダメージ計算
    const damage = calculateDamage(movePower, attack, defense);

    // 2. 相手の減少後のHP
    const endHp = Math.max(0, startHp - damage);

    // 3. アニメーション前の状態（お互いのHPとログ）をUndo履歴に保存
    saveToHistory();

    // 4. 【演出開始】
    triggerDamageAnimation(defender, startHp, endHp, defenderMaxHp, () => {
        // ステート（現在HP）の確定反映と、メイン画面バーの更新
        gameState[defender].currentHp = endHp;
        updateHPDisplay(defender, defenderMaxHp);

        // ダメージのログ書き出し
        addLog(`${attackerName}の「${moveName}」！ ${defenderName}に ${damage} のダメージ！`);

        // ＝★【反動ダメージ処理の追加】
        // 攻撃側の「反動ダメージ」を同期したhiddenから取得（例：33 なら 33%）
        const recoilPercent = parseInt(document.getElementById(`${attacker}-move-recoil-${moveIndex}`).value) || 0;
        
        // 反動があり、かつ攻撃者がまだ倒れていない場合
        if (recoilPercent > 0 && gameState[attacker].currentHp > 0) {
            // 与えたダメージに対する割合で、反動ダメージを計算（最低1ダメージ）
            const recoilDamage = Math.max(1, Math.floor(damage * (recoilPercent / 100)));
            const attackerStartHp = gameState[attacker].currentHp;
            const attackerEndHp = Math.max(0, attackerStartHp - recoilDamage);

            // 攻撃者のHPを減少させて、画面表示を更新
            gameState[attacker].currentHp = attackerEndHp;
            updateHPDisplay(attacker, attackerMaxHp);

            addLog(`${attackerName}は反動で ${recoilDamage} のダメージを受けた！`);

            if (attackerEndHp <= 0) {
                addLog(`${attackerName}は反動でたおれた！`);
            }
        }

        // ひんし判定
        if (gameState[defender].currentHp <= 0) {
            addLog(`${defenderName}はたおれた！`);
        }
    });
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


// ダメージ演出用モーダル
function triggerDamageAnimation(defender, startHp, endHp, maxHp, callback) {
    const overlay = document.getElementById('battle-modal');
    const bar = document.getElementById('modal-hp-bar');
    const text = document.getElementById('modal-hp-text');
    const title = document.getElementById('modal-player-name');
    
    const defenderName = defender === 'p1' ? 'プレイヤー1' : 'プレイヤー2';
    title.textContent = defenderName;
    
    const startPercent = (startHp / maxHp) * 100;
    bar.style.transition = 'none';
    bar.style.width = `${startPercent}%`;
    setModalHPBarColor(startPercent);
    text.textContent = `${startHp} / ${maxHp}`;
    
    overlay.classList.add('active');
    
    setTimeout(() => {
        bar.style.transition = 'width 1.5s cubic-bezier(0.1, 0.8, 0.25, 1), background-color 1.5s ease';
        const endPercent = (endHp / maxHp) * 100;
        bar.style.width = `${endPercent}%`;
        setModalHPBarColor(endPercent);
        
        const damageAmount = startHp - endHp;
        if (damageAmount <= 0) {
            setTimeout(() => {
                overlay.classList.remove('active');
                if (callback) callback();
            }, 800);
            return;
        }

        let currentTempHp = startHp;
        const animationDuration = 1500;
        const stepTime = Math.max(10, Math.floor(animationDuration / damageAmount)); 
        
        const timer = setInterval(() => {
            if (currentTempHp > endHp) {
                currentTempHp--;
                text.textContent = `${currentTempHp} / ${maxHp}`;
            } else {
                clearInterval(timer);
                
                setTimeout(() => {
                    overlay.classList.remove('active');
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
        bar.style.backgroundColor = '#28a745';
    } else if (percent > 20) {
        bar.style.backgroundColor = '#ffc107';
    } else {
        bar.style.backgroundColor = '#dc3545';
    }
}
