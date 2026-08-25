// 現在のHPを保持するステート
let gameState = {
    p1: { currentHp: 150 },
    p2: { currentHp: 150 }
};

// 起動時に初期化処理を走らせる
window.onload = function() {
    resetBattle();
};

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

    // バーの長さを更新
    bar.style.width = `${Math.max(0, hpPercent)}%`;
    text.textContent = `${Math.max(0, currentHp)} / ${maxHp}`;

    // 残りHP割合によるバーの色の変化 (緑 -> 黄 -> 赤)
    if (hpPercent > 50) {
        bar.style.backgroundColor = '#28a745'; // 緑
    } else if (hpPercent > 20) {
        bar.style.backgroundColor = '#ffc107'; // 黄
    } else {
        bar.style.backgroundColor = '#dc3545'; // 赤
    }
}

/**
 * ダメージ計算ロジック
 * 
 * 調整用の数式:
 * ダメージ = 技威力 * (攻撃 / 180) * ((300 - 防御) / 180) * 1.8
 */
function calculateDamage(power, attack, defense) {
    if (power <= 0) return 0;

    // 計算の実行
    let damage = power * (attack / 180) * ((300 - defense) / 180) * 1.8;

    // 小数点以下の切り捨て
    damage = Math.floor(damage);

    // 【最低ダメージ保証】
    // 防御が非常に高い、または攻撃が非常に低い場合でも、最低1ダメージは通るようにします
    return Math.max(1, damage);
}

// 技の使用
function useMove(attacker, moveIndex) {
    const defender = attacker === 'p1' ? 'p2' : 'p1';

    const attackerName = attacker === 'p1' ? 'プレイヤー1' : 'プレイヤー2';
    const defenderName = defender === 'p1' ? 'プレイヤー1' : 'プレイヤー2';

    const attackerMaxHp = parseInt(document.getElementById(`${attacker}-max-hp`).value) || 150;
    const defenderMaxHp = parseInt(document.getElementById(`${defender}-max-hp`).value) || 150;

    // すでに倒れている場合の判定
    if (gameState[attacker].currentHp <= 0) {
        addLog(`${attackerName}はひんし状態のため、技を使えません。`);
        return;
    }
    if (gameState[defender].currentHp <= 0) {
        addLog(`${defenderName}はすでに倒れています。`);
        return;
    }

    // 各種ステータスの取得
    const attack = parseInt(document.getElementById(`${attacker}-attack`).value) || 10;
    const defense = parseInt(document.getElementById(`${defender}-defense`).value) || 10;
    
    const moveName = document.getElementById(`${attacker}-move-name-${moveIndex}`).value || `わざ${moveIndex + 1}`;
    const movePower = parseInt(document.getElementById(`${attacker}-move-power-${moveIndex}`).value) || 0;

    // ダメージ計算
    const damage = calculateDamage(movePower, attack, defense);

    // HPの減算
    gameState[defender].currentHp -= damage;
    if (gameState[defender].currentHp < 0) {
        gameState[defender].currentHp = 0;
    }

    // 表示の更新
    updateHPDisplay(defender, defenderMaxHp);

    // ログ出力
    addLog(`${attackerName}の「${moveName}」！ ${defenderName}に ${damage} のダメージ！`);

    // ひんし判定
    if (gameState[defender].currentHp <= 0) {
        addLog(`${defenderName}はたおれた！`);
    }
}

// ログにメッセージを追加
function addLog(message) {
    const logContainer = document.getElementById('log-container');
    const newEntry = document.createElement('div');
    newEntry.className = 'log-entry';
    newEntry.textContent = message;
    logContainer.appendChild(newEntry);

    // 常に最新のログが見えるように自動スクロール
    logContainer.scrollTop = logContainer.scrollHeight;
}
