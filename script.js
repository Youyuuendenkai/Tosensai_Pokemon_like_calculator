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

// DOMのロードが完全に終わってから初期化を走らせる（エラー防止）
document.addEventListener('DOMContentLoaded', () => {
    initMoveDatabase();
    resetBattle();
});

// HTMLのselectタグ群にデータベースの技を全注入する
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
            
            // 初期状態の威力と同期させる
            onSelectMove(player, slot);
        });
    });
}

// ＝★数値の10刻みの増減（readonlyのtext入力に対応）
function stepValue(id, delta, min, max) {
    const input = document.getElementById(id);
    if (!input) return;

    let currentValue = parseInt(input.value) || 0;
    let newValue = currentValue + delta;

    // 制限範囲内に丸める
    if (newValue < min) newValue = min;
    if (newValue > max) newValue = max;

    input.value = newValue;

    // もし最大HPをバトル中に変更した際、現在のHPが最大HPを超えてしまっていたら安全に丸める
    if (id.endsWith('max-hp')) {
        const player = id.startsWith('p1') ? 'p1' : 'p2';
        if (gameState[player].currentHp > newValue) {
            gameState[player].currentHp = newValue;
            updateHPDisplay(player, newValue);
        }
    }
}

// 技選択（select）が変わったときに威力を自動補完する
function onSelectMove(player, moveIndex) {
    const selectEl = document.getElementById(`${player}-move-name-${moveIndex}`);
    const powerInput = document.getElementById(`${player}-move-power-${moveIndex}`);
    if (!selectEl || !powerInput) return;

    const selectedName = selectEl.value;
    const foundMove = MOVE_DATABASE.find(move => move.name === selectedName);

    if (foundMove) {
        powerInput.value = foundMove.power;
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
    logContainer.scrollTop = logContainer.scrollHeight;

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
    // 初回起動時の未定義状態を避けるための安全ガード
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

// ダメージ計算（3～5ターン想定）
function calculateDamage(power, attack, defense) {
    if (power <= 0) return 0;
    let damage = power * (attack / 180) * ((300 - defense) / 180) * 1.2;
    damage = Math.floor(damage);
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
