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

window.onload = function() {
    initMoveDatabase();
    resetBattle();
};

// データベースの技をdatalistへセット
function initMoveDatabase() {
    const datalist = document.getElementById('move-database');
    datalist.innerHTML = '';
    MOVE_DATABASE.forEach(move => {
        const option = document.createElement('option');
        option.value = move.name;
        option.textContent = `(威力:${move.power})`;
        datalist.appendChild(option);
    });
}

// 技選択時に威力を自動設定
function syncMovePower(player, moveIndex) {
    const nameInput = document.getElementById(`${player}-move-name-${moveIndex}`);
    const powerInput = document.getElementById(`${player}-move-power-${moveIndex}`);
    const selectedName = nameInput.value;
    const foundMove = MOVE_DATABASE.find(move => move.name === selectedName);

    if (foundMove) {
        powerInput.value = foundMove.power;
    }
}

// ＝★新規追加：現在の状態を履歴に保存する
function saveToHistory() {
    // 現在のHPとログ画面の状態を記録してスタックに追加
    historyStack.push({
        p1Hp: gameState.p1.currentHp,
        p2Hp: gameState.p2.currentHp,
        logHTML: document.getElementById('log-container').innerHTML
    });

    // 履歴がたまりすぎないよう直近の30件に制限
    if (historyStack.length > 30) {
        historyStack.shift();
    }

    updateUndoButtonState();
}

// ＝★新規追加：1つ前の状態に戻す (Undo)
function undo() {
    if (historyStack.length === 0) return;

    // 最新の履歴を取り出す
    const prevState = historyStack.pop();

    // HP状態の復元
    gameState.p1.currentHp = prevState.p1Hp;
    gameState.p2.currentHp = prevState.p2Hp;

    const p1MaxHp = parseInt(document.getElementById('p1-max-hp').value) || 150;
    const p2MaxHp = parseInt(document.getElementById('p2-max-hp').value) || 150;

    updateHPDisplay('p1', p1MaxHp);
    updateHPDisplay('p2', p2MaxHp);

    // ログ表示の復元
    document.getElementById('log-container').innerHTML = prevState.logHTML;

    // ログエリアを最下部までスクロール
    const logContainer = document.getElementById('log-container');
    logContainer.scrollTop = logContainer.scrollHeight;

    updateUndoButtonState();
}

// Undoボタンの有効/無効の切り替え
function updateUndoButtonState() {
    const undoBtn = document.getElementById('btn-undo');
    if (undoBtn) {
        undoBtn.disabled = historyStack.length === 0;
    }
}

// バトルのリセット
function resetBattle() {
    // リセットする前の状態も保存しておくことで、間違えてリセットを押しても戻せます
    if (gameState.p1.currentHp !== undefined) {
        saveToHistory();
    }

    const p1MaxHp = parseInt(document.getElementById('p1-max-hp').value) || 150;
    const p2MaxHp = parseInt(document.getElementById('p2-max-hp').value) || 150;

    gameState.p1.currentHp = p1MaxHp;
    gameState.p2.currentHp = p2MaxHp;

    updateHPDisplay('p1', p1MaxHp);
    updateHPDisplay('p2', p2MaxHp);

    const logContainer = document.getElementById('log-container');
    logContainer.innerHTML = '<div class="log-entry">バトルがリセット（開始準備完了）されました。</div>';
    
    // リセット直後はさらに前の履歴を一旦クリアし、初期化する
    historyStack = [];
    updateUndoButtonState();
}

// HP表示の更新
function updateHPDisplay(player, maxHp) {
    const currentHp = gameState[player].currentHp;
    const hpPercent = maxHp > 0 ? (currentHp / maxHp) * 100 : 0;
    
    const bar = document.getElementById(`${player}-hp-bar`);
    const text = document.getElementById(`${player}-hp-text`);

    bar.style.width = `${Math.max(0, hpPercent)}%`;
    text.textContent = `${Math.max(0, currentHp)} / ${maxHp}`;

    if (hpPercent > 50) {
        bar.style.backgroundColor = '#28a745';
    } else if (hpPercent > 20) {
        bar.style.backgroundColor = '#ffc107';
    } else {
        bar.style.backgroundColor = '#dc3545';
    }
}

// ダメージ計算（3～5ターン想定）
function calculateDamage(power, attack, defense) {
    if (power <= 0) return 0;
    let damage = power * (attack / 180) * ((300 - defense) / 180) * 1.2;
    damage = Math.floor(damage);
    return Math.max(1, damage);
}

// 技の使用
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

    // ＝★ダメージ計算して減算する前に、現在の状態を保存する
    saveToHistory();

    const attack = parseInt(document.getElementById(`${attacker}-attack`).value) || 10;
    const defense = parseInt(document.getElementById(`${defender}-defense`).value) || 10;
    
    const moveName = document.getElementById(`${attacker}-move-name-${moveIndex}`).value || `わざ${moveIndex + 1}`;
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

// ログ出力
function addLog(message) {
    const logContainer = document.getElementById('log-container');
    const newEntry = document.createElement('div');
    newEntry.className = 'log-entry';
    newEntry.textContent = message;
    logContainer.appendChild(newEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
}
