// ==========================================
// 技のデータベース（ここに技を追加できます）
// ==========================================
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

// 現在のHPを保持するステート
let gameState = {
    p1: { currentHp: 150 },
    p2: { currentHp: 150 }
};

// 起動時に初期化処理を走らせる
window.onload = function() {
    initMoveDatabase();
    resetBattle();
};

// HTMLのdatalistにデータベースの技を動的に追加する
function initMoveDatabase() {
    const datalist = document.getElementById('move-database');
    datalist.innerHTML = ''; // 一度クリア
    
    MOVE_DATABASE.forEach(move => {
        const option = document.createElement('option');
        option.value = move.name;
        // 選択肢の横に威力を小さく表示する補助テキスト
        option.textContent = `(威力:${move.power})`;
        datalist.appendChild(option);
    });
}

// 技名が選択・入力されたら、自動で威力を同期する
function syncMovePower(player, moveIndex) {
    const nameInput = document.getElementById(`${player}-move-name-${moveIndex}`);
    const powerInput = document.getElementById(`${player}-move-power-${moveIndex}`);
    
    const selectedName = nameInput.value;

    // データベースから、入力された技名に完全一致するものを探す
    const foundMove = MOVE_DATABASE.find(move => move.name === selectedName);

    if (foundMove) {
        // 一致する技があれば、威力を自動で書き換える
        powerInput.value = foundMove.power;
    }
}

// バトルのリセット（HP全回復）
function resetBattle() {
    const p1MaxHp = parseInt(document.getElementById('p1-max-hp').value) || 150;
    const p2MaxHp = parseInt(document.getElementById('p2-max-hp').value) || 150;

    gameState.p1.currentHp = p1MaxHp;
    gameState.p2.currentHp = p2MaxHp;

    updateHPDisplay('p1', p1MaxHp);
    updateHPDisplay('p2', p2MaxHp);

    const logContainer = document.getElementById('log-container');
    logContainer.innerHTML = '<div class="log-entry">バトルがリセットされました。</div>';
}

// HP表示とバーの更新
function updateHPDisplay(player, maxHp) {
    const currentHp = gameState[player].currentHp;
    const hpPercent = maxHp > 0 ? (currentHp / maxHp) * 100 : 0;
    
    const bar = document.getElementById(`${player}-hp-bar`);
    const text = document.getElementById(`${player}-hp-text`);

    bar.style.width = `${Math.max(0, hpPercent)}%`;
    text.textContent = `${Math.max(0, currentHp)} / ${maxHp}`;

    if (hpPercent > 50) {
        bar.style.backgroundColor = '#28a745'; // 緑
    } else if (hpPercent > 20) {
        bar.style.backgroundColor = '#ffc107'; // 黄
    } else {
        bar.style.backgroundColor = '#dc3545'; // 赤
    }
}

// ダメージ計算
function calculateDamage(power, attack, defense) {
    if (power <= 0) return 0;

    // 3～5ターン決着の調整式
    let damage = power * (attack / 180) * ((300 - defense) / 180) * 1.2;
    damage = Math.floor(damage);

    return Math.max(1, damage); // 最低1ダメージ保証
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

// ログ追加
function addLog(message) {
    const logContainer = document.getElementById('log-container');
    const newEntry = document.createElement('div');
    newEntry.className = 'log-entry';
    newEntry.textContent = message;
    logContainer.appendChild(newEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
}
