// 技のデータベース（CSVの読み込みに失敗したときの保険用のデフォルトリスト）
let MOVE_DATABASE = [
    { id: 1, name: "わざ1", power: 40, recoil: 0, desc: "", isBase: 1 },
    { id: 2, name: "わざ2", power: 40, recoil: 0, desc: "", isBase: 0 },
    { id: 3, name: "わざ3", power: 60, recoil: 0, desc: "", isBase: 1 },
    { id: 4, name: "わざ4", power: 80, recoil: 0, desc: "", isBase: 1 },
    { id: 5, name: "わざ5", power: 90, recoil: 0, desc: "", isBase: 1 },
    { id: 6, name: "わざ6", power: 100, recoil: 25, desc: "少し反動を受ける。", isBase: 0 },
    { id: 7, name: "わざ7", power: 120, recoil: 0, desc: "当たりづらい。", isBase: 0 },
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
    await loadMovesFromCSV();
    initMoveDatabase();
    resetBattle();
}

// 外部CSVファイルを非同期で読み込んでパースする
async function loadMovesFromCSV() {
    try {
        const response = await fetch('moves.csv');
        if (!response.ok) {
            throw new Error('CSVファイルのレスポンスエラー');
        }
        const csvText = await response.text();
        MOVE_DATABASE = parseCSV(csvText);
        console.log('moves.csvを正常に読み込み、反映しました。', MOVE_DATABASE);
    } catch (error) {
        // ローカル（file://）環境など、fetch制限に引っかかった場合は自動的に上記の保険用リストで動かします
        console.warn('moves.csvの読み込みに失敗しました（ローカルテスト中、またはファイル未配置）。フォールバックリストを使用します。', error);
    }
}

// CSVパース（Excel保存時のBOM文字化け対策を追加）
function parseCSV(csvText) {
    // ＝★Excelなどで保存された際に付与される「BOM」というゴミデータを安全に削除する
    if (csvText.startsWith('\uFEFF')) {
        csvText = csvText.slice(1);
    }

    const lines = csvText.split(/\r?\n/);
    const parsedData = [];
    
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
    const startMoves = baseMoves.length >= 3 ? baseMoves : MOVE_DATABASE;

    players.forEach(player => {
        slots.forEach(slot => {
            const selectEl = document.getElementById(`${player}-move-name-${slot}`);
            if (!selectEl) return;
            
            selectEl.innerHTML = ''; // クリア
            
            MOVE_DATABASE.forEach(move => {
                const option = document.createElement('option');
                
                // ＝★ value（裏の値）は「星なし」の素の技名にしておくことで、プログラムが壊れないようにします
                option.value = move.name; 
                
                // ＝★【要望】基本技フラグが1なら、表示（テキスト）の先頭に「⭐ 」を付与する
                const isBaseMark = move.isBase === 1 ? '⭐ ' : '';
                
                // ＝★【要望】反動と説明は選択後の別画面に出るためドロップダウンからは削除。威力はソートに使うため残す。
                option.textContent = `${isBaseMark}${move.name} (威力:${move.power})`;
                selectEl.appendChild(option);
            });
            
            // 各スロットに「基本技フラグ(isBase)」の技をデフォルト設定
            const defaultIndex = (player === 'p1') ? slot : slot + 1;
            const initialMove = startMoves[defaultIndex % startMoves.length];
            
            if (initialMove) {
                selectEl.value = initialMove.name;
            }
            
            // 威力・反動・備考を同期
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

// 技選択時に、威力・反動ダメージ・備考欄テキストを全て同期させる
function onSelectMove(player, moveIndex) {
    const selectEl = document.getElementById(`${player}-move-name-${moveIndex}`);
    const powerInput = document.getElementById(`${player}-move-power-${moveIndex}`);
    const powerDisplay = document.getElementById(`${player}-move-power-display-${moveIndex}`);
    
    const recoilInput = document.getElementById(`${player}-move-recoil-${moveIndex}`);
    const recoilDisplay = document.getElementById(`${player}-move-recoil-display-${moveIndex}`);
    const recoilArea = document.getElementById(`${player}-move-recoil-display-area-${moveIndex}`);
    const descDisplay = document.getElementById(`${player}-move-desc-${moveIndex}`);
    
    if (!selectEl) return;

    const selectedName = selectEl.value;
    const foundMove = MOVE_DATABASE.find(move => move.name === selectedName);

    if (foundMove) {
        if (powerInput) powerInput.value = foundMove.power;
        if (powerDisplay) powerDisplay.textContent = foundMove.power;
        
        if (recoilInput) recoilInput.value = foundMove.recoil;
        if (recoilDisplay) recoilDisplay.textContent = foundMove.recoil;
        if (recoilArea) {
            recoilArea.style.display = foundMove.recoil > 0 ? 'inline' : 'none';
        }
        
        // ＝★【要望】備考（技の説明）が空、または「なし」などの場合は表示部自体を非表示にし、「説明がありません」などのダミーテキストも出さない
        if (descDisplay) {
            const description = foundMove.desc ? foundMove.desc.trim() : '';
            if (description !== '' && description !== 'なし') {
                descDisplay.textContent = description;
                descDisplay.style.display = 'block'; // 表示
            } else {
                descDisplay.style.display = 'none';  // 非表示（青い縦棒も消えます）
            }
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

    let damage = power * (attack / safeDefense) * 0.85;
    damage = Math.floor(damage);

    return Math.max(1, damage);
}

// ＝★大幅更新：反動アニメーションを完全連動させた技使用処理
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

    // 計算前のHP状態
    const startHp = gameState[defender].currentHp;
    const attackerStartHp = gameState[attacker].currentHp;

    // ステータスの取得
    const attack = parseInt(document.getElementById(`${attacker}-attack`).value) || 10;
    const defense = parseInt(document.getElementById(`${defender}-defense`).value) || 10;
    
    const selectEl = document.getElementById(`${attacker}-move-name-${moveIndex}`);
    const moveName = selectEl ? selectEl.value : `わざ${moveIndex + 1}`;
    const movePower = parseInt(document.getElementById(`${attacker}-move-power-${moveIndex}`).value) || 0;

    // 1. ダメージ計算
    const damage = calculateDamage(movePower, attack, defense);
    const endHp = Math.max(0, startHp - damage);

    // 2. ＝★【計算式変更】：反動ダメージを「与ダメージ比例」から「自分の最大HPに対する割合」に変更
    const recoilPercent = parseInt(document.getElementById(`${attacker}-move-recoil-${moveIndex}`).value) || 0;
    let recoilDamage = 0;
    if (recoilPercent > 0) {
        recoilDamage = Math.max(1, Math.floor(attackerMaxHp * (recoilPercent / 100)));
    }
    const attackerEndHp = Math.max(0, attackerStartHp - recoilDamage);

    // 3. アニメーション前のお互いのHPとログ状態を完全にUndo用に記録
    saveToHistory();

    // 4. 【演出第1弾】：相手への攻撃ダメージ
    triggerDamageAnimation(defender, startHp, endHp, defenderMaxHp, () => {
        // 相手のHPステート確定・反映
        gameState[defender].currentHp = endHp;
        updateHPDisplay(defender, defenderMaxHp);

        addLog(`${attackerName}の「${moveName}」！ ${defenderName}に ${damage} のダメージ！`);

        // 5. ＝★【演出第2弾】：反動ダメージがあった場合は攻撃側のHPを減らすアニメーションを連動
        if (recoilDamage > 0 && attackerStartHp > 0) {
            // モーダルが閉じた後に、少しの間隔（150ms）をあけて自分の反動ポップアップを起動
            setTimeout(() => {
                triggerDamageAnimation(attacker, attackerStartHp, attackerEndHp, attackerMaxHp, () => {
                    // 自分のHP確定・反映
                    gameState[attacker].currentHp = attackerEndHp;
                    updateHPDisplay(attacker, attackerMaxHp);

                    addLog(`${attackerName}は反動で ${recoilDamage} のダメージを受けた！`);

                    // 自分のひんし判定
                    if (attackerEndHp <= 0) {
                        addLog(`${attackerName}は反動でたおれた！`);
                    }

                    // 相手のひんし判定
                    if (gameState[defender].currentHp <= 0) {
                        addLog(`${defenderName}はたおれた！`);
                    }
                }, "反動をうけている..."); // ★ポップアップのメッセージを変更
            }, 150);
        } else {
            // 反動がなければそのまま相手のひんし判定をして終了
            if (gameState[defender].currentHp <= 0) {
                addLog(`${defenderName}はたおれた！`);
            }
        }
    }, "ダメージをうけている...");
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


// ダメージ演出用モーダル（ヒントメッセージを第6引数でカスタマイズできるように拡張）
function triggerDamageAnimation(defender, startHp, endHp, maxHp, callback, hintMessage = "ダメージをうけている...") {
    const overlay = document.getElementById('battle-modal');
    const bar = document.getElementById('modal-hp-bar');
    const text = document.getElementById('modal-hp-text');
    const title = document.getElementById('modal-player-name');
    const hint = document.getElementById('modal-hint'); // ← ヒントメッセージ要素の取得
    
    const defenderName = defender === 'p1' ? 'プレイヤー1' : 'プレイヤー2';
    title.textContent = defenderName;
    if (hint) hint.textContent = hintMessage; // ← 「反動をうけている...」などに書き換え
    
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
