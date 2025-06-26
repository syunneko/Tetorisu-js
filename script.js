// HTML要素の取得
const startButton = document.getElementById('startButton');
const sharedGameTimerDisplay = document.getElementById('sharedGameTimer');
const settingsButton = document.getElementById('settingsButton'); // ★追加
const settingsModal = document.getElementById('settingsModal'); // ★追加
const closeModalButton = document.querySelector('.close-button'); // ★追加
const saveKeysButton = document.getElementById('saveKeysButton'); // ★追加
const resetKeysButton = document.getElementById('resetKeysButton'); // ★追加

// プレイヤー1の要素
const gameCanvas1 = document.getElementById('gameCanvas1');
const ctx1 = gameCanvas1.getContext('2d');
const rotateButton1 = document.getElementById('rotateButton1');
const moveLeftButton1 = document.getElementById('moveLeftButton1');
const moveRightButton1 = document.getElementById('moveRightButton1');
const softDropButton1 = document.getElementById('softDropButton1');
const hardDropButton1 = document.getElementById('hardDropButton1');

// プレイヤー2の要素
const gameCanvas2 = document.getElementById('gameCanvas2');
const ctx2 = gameCanvas2.getContext('2d');
const rotateButton2 = document.getElementById('rotateButton2');
const moveLeftButton2 = document.getElementById('moveLeftButton2');
const moveRightButton2 = document.getElementById('moveRightButton2');
const softDropButton2 = document.getElementById('softDropButton2');
const hardDropButton2 = document.getElementById('hardDropButton2');

// ゲーム定数
const ROWS = 20;
const COLS = 12;

const TETROMINOS = {
    'I': { shape: [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]], color: 'cyan' },
    'J': { shape: [[1,0,0], [1,1,1], [0,0,0]], color: 'blue' },
    'L': { shape: [[0,0,1], [1,1,1], [0,0,0]], color: 'orange' },
    'O': { shape: [[1,1], [1,1]], color: 'yellow' },
    'S': { shape: [[0,1,1], [1,1,0], [0,0,0]], color: 'green' },
    'T': { shape: [[0,1,0], [1,1,1], [0,0,0]], color: 'purple' },
    'Z': { shape: [[1,1,0], [0,1,1], [0,0,0]], color: 'red' }
};

const TETROMINO_WEIGHTS = {
    'I': 1,
    'J': 1,
    'L': 1,
    'O': 1,
    'S': 1,
    'T': 1,
    'Z': 1
};

const INITIAL_FALL_SPEED = 500; // 初期落下速度 (ms)
const SPEED_DECREMENT = 50; // 速度減少量 (ms)
const SPEED_UP_INTERVAL = 20; // 速度を上げる間隔 (秒)

// --- グローバルタイマー変数 ---
let gameStartTime = 0;
let elapsedTime = 0;
let gameTimerInterval = null;

// --- キー設定のデフォルト値と現在の設定 ---
const DEFAULT_KEYS = {
    player1: {
        rotate: 'w',
        moveLeft: 'a',
        moveRight: 'd',
        softDrop: 's',
        hardDrop: 'Shift'
    },
    player2: {
        rotate: 'ArrowUp',
        moveLeft: 'ArrowLeft',
        moveRight: 'ArrowRight',
        softDrop: 'ArrowDown',
        hardDrop: ' ' // Spacebar
    }
};

let currentKeys = {}; // 現在のキー設定を保持するオブジェクト

// --- Playerクラスの定義 ---
class Player {
    constructor(id, canvas, ctx) {
        this.id = id;
        this.canvas = canvas;
        this.ctx = ctx;
        this.board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
        this.currentTetromino = null;
        this.currentX = 0;
        this.currentY = 0;
        this.blockSize = 0;
        this.gameInterval = null;
        this.gameOver = true;
        this.currentFallSpeed = INITIAL_FALL_SPEED;
    }

    // ランダムなテトリミノを生成 (重み付け抽選)
    getRandomTetromino() {
        let weightedTetrominos = [];
        for (const key in TETROMINOS) {
            const weight = TETROMINO_WEIGHTS[key] || 1;
            for (let i = 0; i < weight; i++) {
                weightedTetrominos.push(key);
            }
        }
        const randomKey = weightedTetrominos[Math.floor(Math.random() * weightedTetrominos.length)];
        const tetromino = TETROMINOS[randomKey];
        return {
            shape: tetromino.shape,
            color: tetromino.color,
            name: randomKey
        };
    }

    // ボードを描画
    drawBoard() {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                this.drawBlock(c, r, this.board[r][c]);
            }
        }
    }

    // ブロックを描画
    drawBlock(x, y, colorCode) {
        if (colorCode === 0) {
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(x * this.blockSize, y * this.blockSize, this.blockSize, this.blockSize);
            this.ctx.strokeStyle = '#333';
            this.ctx.strokeRect(x * this.blockSize, y * this.blockSize, this.blockSize, this.blockSize);
        } else {
            this.ctx.fillStyle = colorCode;
            this.ctx.fillRect(x * this.blockSize, y * this.blockSize, this.blockSize, this.blockSize);
            this.ctx.strokeStyle = 'black';
            this.ctx.strokeRect(x * this.blockSize, y * this.blockSize, this.blockSize, this.blockSize);
        }
    }

    // 現在のテトリミノを描画
    drawTetromino() {
        if (!this.currentTetromino) return;
        for (let r = 0; r < this.currentTetromino.shape.length; r++) {
            for (let c = 0; c < this.currentTetromino.shape[r].length; c++) {
                if (this.currentTetromino.shape[r][c]) {
                    this.drawBlock(this.currentX + c, this.currentY + r, this.currentTetromino.color);
                }
            }
        }
    }

    // 移動が有効か判定
    isValidMove(newX, newY, newShape) {
        for (let r = 0; r < newShape.length; r++) {
            for (let c = 0; c < newShape[r].length; c++) {
                if (newShape[r][c]) {
                    const boardX = newX + c;
                    const boardY = newY + r;

                    if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
                        return false;
                    }
                    if (boardY >= 0 && this.board[boardY][boardX] !== 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    // テトリミノをボードに固定
    lockTetromino() {
        for (let r = 0; r < this.currentTetromino.shape.length; r++) {
            for (let c = 0; c < this.currentTetromino.shape[r].length; c++) {
                if (this.currentTetromino.shape[r][c]) {
                    const boardX = this.currentX + c;
                    const boardY = this.currentY + r;
                    
                    if (boardY < 0 || (boardY >= 0 && this.board[boardY][boardX] !== 0)) {
                        this.triggerGameOver();
                        return;
                    }
                    this.board[boardY][boardX] = this.currentTetromino.color;
                }
            }
        }
        this.clearLines();
        this.createNewTetromino();
    }

    // ゲームオーバー処理
    triggerGameOver() {
        this.gameOver = true;
        alert(`Player ${this.id} Game Over!`);
        clearInterval(this.gameInterval);
        // グローバルタイマーは、両プレイヤーがゲームオーバーになるまで停止しない
        if (player1.gameOver && player2.gameOver) {
            clearInterval(gameTimerInterval);
            gameTimerInterval = null;
        }
        if (startButton) {
            startButton.textContent = 'ゲーム開始';
        }
    }

    // ラインを消去
    clearLines() {
        for (let r = ROWS - 1; r >= 0; r--) {
            if (this.board[r].every(cell => cell !== 0)) {
                this.board.splice(r, 1);
                this.board.unshift(Array(COLS).fill(0));
                r++;
            }
        }
    }

    // 新しいテトリミノを生成
    createNewTetromino() {
        this.currentTetromino = this.getRandomTetromino();
        this.currentX = Math.floor(COLS / 2) - Math.floor(this.currentTetromino.shape[0].length / 2);
        this.currentY = -this.currentTetromino.shape.length;

        if (!this.isValidMove(this.currentX, this.currentY + 1, this.currentTetromino.shape)) {
            this.triggerGameOver();
        }
    }

    // テトリミノを回転
    rotateTetromino() {
        const originalShape = this.currentTetromino.shape;
        const newShape = originalShape[0].map((_, index) => originalShape.map(row => row[index]).reverse());
        if (this.isValidMove(this.currentX, this.currentY, newShape)) {
            this.currentTetromino.shape = newShape;
        }
    }

    // ゲーム状態を更新
    updateGame() {
        if (this.gameOver) return;
        if (this.isValidMove(this.currentX, this.currentY + 1, this.currentTetromino.shape)) {
            this.currentY++;
        } else {
            this.lockTetromino();
            if (this.gameOver) return;
        }
        this.drawGame();
    }

    // 全体を再描画
    drawGame() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBoard();
        this.drawTetromino();
    }

    // キャンバスサイズを調整
    resizeCanvas() {
        const parentSection = this.canvas.closest('.player-section');
        if (!parentSection) return;

        const aspectRatio = COLS / ROWS; // 12 / 20 = 0.6

        const targetCanvasWidth = parentSection.clientWidth;
        const targetCanvasHeight = targetCanvasWidth / aspectRatio;

        this.canvas.width = targetCanvasWidth;
        this.canvas.height = targetCanvasHeight;

        this.blockSize = this.canvas.width / COLS;

        if (!this.gameOver) {
            this.drawGame();
        }
    }

    // ゲーム開始
    startGame() {
        this.board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
        this.gameOver = false;
        this.currentFallSpeed = INITIAL_FALL_SPEED;

        this.createNewTetromino();
        this.resizeCanvas();
        this.drawGame();
        clearInterval(this.gameInterval);

        this.gameInterval = setInterval(() => this.updateGame(), this.currentFallSpeed);
    }
}

// --- グローバルタイマー更新関数 ---
function updateSharedTimer() {
    // どちらのプレイヤーもゲームオーバーならタイマーを停止
    if (player1.gameOver && player2.gameOver) {
        clearInterval(gameTimerInterval);
        gameTimerInterval = null;
        return;
    }
    
    // どちらか一方でもゲームが進行中ならタイマーを更新
    if (!player1.gameOver || !player2.gameOver) {
        const now = Date.now();
        const newElapsedTime = Math.floor((now - gameStartTime) / 1000);

        if (newElapsedTime > elapsedTime) {
            elapsedTime = newElapsedTime;
            if (sharedGameTimerDisplay) {
                sharedGameTimerDisplay.textContent = `時間: ${formatTime(elapsedTime)}`;
            }

            // 20秒ごとに落下速度を上げる (両プレイヤーに適用)
            if (elapsedTime > 0 && elapsedTime % SPEED_UP_INTERVAL === 0) {
                player1.currentFallSpeed = Math.max(50, player1.currentFallSpeed - SPEED_DECREMENT);
                clearInterval(player1.gameInterval);
                player1.gameInterval = setInterval(() => player1.updateGame(), player1.currentFallSpeed);
                console.log(`Player 1 Speed increased! New fall speed: ${player1.currentFallSpeed}ms`);

                player2.currentFallSpeed = Math.max(50, player2.currentFallSpeed - SPEED_DECREMENT);
                clearInterval(player2.gameInterval);
                player2.gameInterval = setInterval(() => player2.updateGame(), player2.currentFallSpeed);
                console.log(`Player 2 Speed increased! New fall speed: ${player2.currentFallSpeed}ms`);
            }
        }
    }
}

// グローバルな formatTime 関数
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const pad = (num) => num.toString().padStart(2, '0');
    return `${pad(minutes)}:${pad(remainingSeconds)}`;
}


// --- プレイヤーインスタンスの作成 ---
const player1 = new Player(1, gameCanvas1, ctx1);
const player2 = new Player(2, gameCanvas2, ctx2);

// --- キー設定の読み込みと適用 ---
function loadKeySettings() {
    const savedKeys = localStorage.getItem('tetrisKeySettings');
    if (savedKeys) {
        try {
            currentKeys = JSON.parse(savedKeys);
        } catch (e) {
            console.error("Failed to parse key settings from localStorage:", e);
            currentKeys = JSON.parse(JSON.stringify(DEFAULT_KEYS)); // デフォルトをロード
        }
    } else {
        currentKeys = JSON.parse(JSON.stringify(DEFAULT_KEYS)); // ディープコピーでデフォルトをセット
    }
    updateKeySettingInputs();
}

function saveKeySettings() {
    localStorage.setItem('tetrisKeySettings', JSON.stringify(currentKeys));
    alert('キー設定を保存しました！');
    settingsModal.style.display = 'none'; // 保存後にモーダルを閉じる
}

function resetKeySettings() {
    currentKeys = JSON.parse(JSON.stringify(DEFAULT_KEYS)); // デフォルトに戻す
    updateKeySettingInputs();
    alert('キー設定をデフォルトに戻しました！');
}

// 設定入力フィールドに現在のキーを表示
function updateKeySettingInputs() {
    // プレイヤー1
    document.getElementById('p1-rotate').value = formatKeyName(currentKeys.player1.rotate);
    document.getElementById('p1-left').value = formatKeyName(currentKeys.player1.moveLeft);
    document.getElementById('p1-right').value = formatKeyName(currentKeys.player1.moveRight);
    document.getElementById('p1-soft-drop').value = formatKeyName(currentKeys.player1.softDrop);
    document.getElementById('p1-hard-drop').value = formatKeyName(currentKeys.player1.hardDrop);

    // プレイヤー2
    document.getElementById('p2-rotate').value = formatKeyName(currentKeys.player2.rotate);
    document.getElementById('p2-left').value = formatKeyName(currentKeys.player2.moveLeft);
    document.getElementById('p2-right').value = formatKeyName(currentKeys.player2.moveRight);
    document.getElementById('p2-soft-drop').value = formatKeyName(currentKeys.player2.softDrop);
    document.getElementById('p2-hard-drop').value = formatKeyName(currentKeys.player2.hardDrop);
}

// 表示用にキー名を整形
function formatKeyName(key) {
    if (key === ' ') return 'Space';
    if (key === 'ArrowUp') return '↑';
    if (key === 'ArrowDown') return '↓';
    if (key === 'ArrowLeft') return '←';
    if (key === 'ArrowRight') return '→';
    return key.charAt(0).toUpperCase() + key.slice(1); // 例: 'shift' -> 'Shift'
}

// キー入力フィールドのアクティブ状態を管理
let activeKeyInput = null;

function handleKeyInputFocus(event) {
    activeKeyInput = event.target;
    activeKeyInput.value = '…押してください';
}

function handleKeyInputBlur(event) {
    // 値がセットされていない場合は元の値に戻す
    if (activeKeyInput && activeKeyInput.value === '…押してください') {
        const playerId = activeKeyInput.id.startsWith('p1') ? 'player1' : 'player2';
        const action = activeKeyInput.dataset.action;
        activeKeyInput.value = formatKeyName(currentKeys[playerId][action]);
    }
    activeKeyInput = null;
}

// キーボード操作のイベントリスナー (設定モードとゲームモードを分離)
document.addEventListener('keydown', (e) => {
    // 設定モーダルが開いている場合
    if (settingsModal.style.display === 'flex' && activeKeyInput) {
        e.preventDefault(); // ゲーム操作が実行されないように
        
        const playerId = activeKeyInput.id.startsWith('p1') ? 'player1' : 'player2';
        const action = activeKeyInput.dataset.action;
        const newKey = e.key;

        // 同じキーが別の操作に設定されていないかチェック
        let isKeyUsed = false;
        for (const pId in currentKeys) {
            for (const act in currentKeys[pId]) {
                if (pId === playerId && act === action) continue; // 自分自身はチェックしない
                if (currentKeys[pId][act] === newKey) {
                    isKeyUsed = true;
                    break;
                }
            }
            if (isKeyUsed) break;
        }

        if (isKeyUsed) {
            alert(`「${formatKeyName(newKey)}」はすでに他の操作に設定されています！別のキーを選択してください。`);
            activeKeyInput.value = '…押してください'; // もう一度入力を促す
            // すでに設定されているキー入力フィールドをハイライトするなどのUX改善も可能
        } else {
            currentKeys[playerId][action] = newKey;
            activeKeyInput.value = formatKeyName(newKey);
            activeKeyInput.blur(); // 入力フィールドのフォーカスを外す
        }
        return; // 設定モード中のキーイベントはここで処理を終了
    }

    // ゲームがアクティブな場合のみゲーム操作を処理
    if (!player1.gameOver || !player2.gameOver) {
        // プレイヤー1の操作
        if (!player1.gameOver && player1.currentTetromino) {
            let moved = false;
            switch (e.key) {
                case currentKeys.player1.moveLeft: // 左移動
                    if (player1.isValidMove(player1.currentX - 1, player1.currentY, player1.currentTetromino.shape)) {
                        player1.currentX--; moved = true;
                    } break;
                case currentKeys.player1.moveRight: // 右移動
                    if (player1.isValidMove(player1.currentX + 1, player1.currentY, player1.currentTetromino.shape)) {
                        player1.currentX++; moved = true;
                    } break;
                case currentKeys.player1.softDrop: // ソフトドロップ
                    if (player1.isValidMove(player1.currentX, player1.currentY + 1, player1.currentTetromino.shape)) {
                        player1.currentY++; moved = true;
                    } break;
                case currentKeys.player1.rotate: // 回転
                    player1.rotateTetromino(); moved = true; break;
                case currentKeys.player1.hardDrop: // ハードドロップ
                    e.preventDefault(); // スペースキーのデフォルト動作を防ぐ
                    while (player1.isValidMove(player1.currentX, player1.currentY + 1, player1.currentTetromino.shape)) {
                        player1.currentY++;
                    }
                    player1.lockTetromino(); moved = true;
                    if (player1.gameOver) return;
                    break;
            }
            if (moved) player1.drawGame();
        }

        // プレイヤー2の操作
        if (!player2.gameOver && player2.currentTetromino) {
            let moved = false;
            switch (e.key) {
                case currentKeys.player2.moveLeft: // 左移動
                    if (player2.isValidMove(player2.currentX - 1, player2.currentY, player2.currentTetromino.shape)) {
                        player2.currentX--; moved = true;
                    } break;
                case currentKeys.player2.moveRight: // 右移動
                    if (player2.isValidMove(player2.currentX + 1, player2.currentY, player2.currentTetromino.shape)) {
                        player2.currentX++; moved = true;
                    } break;
                case currentKeys.player2.softDrop: // ソフトドロップ
                    if (player2.isValidMove(player2.currentX, player2.currentY + 1, player2.currentTetromino.shape)) {
                        player2.currentY++; moved = true;
                    } break;
                case currentKeys.player2.rotate: // 回転
                    player2.rotateTetromino(); moved = true; break;
                case currentKeys.player2.hardDrop: // ハードドロップ
                    e.preventDefault(); // スペースキーのデフォルト動作を防ぐ
                    while (player2.isValidMove(player2.currentX, player2.currentY + 1, player2.currentTetromino.shape)) {
                        player2.currentY++;
                    }
                    player2.lockTetromino(); moved = true;
                    if (player2.gameOver) return;
                    break;
            }
            if (moved) player2.drawGame();
        }
    }
});


// --- イベントリスナーの設定 ---

// ゲーム開始ボタン
if (startButton) {
    startButton.addEventListener('click', () => {
        if (player1.gameOver || player2.gameOver || !gameTimerInterval) {
            gameStartTime = Date.now();
            elapsedTime = 0;
            if (sharedGameTimerDisplay) {
                sharedGameTimerDisplay.textContent = `時間: ${formatTime(elapsedTime)}`;
            }

            player1.startGame();
            player2.startGame();
            startButton.textContent = 'ゲーム中...';

            clearInterval(gameTimerInterval);
            gameTimerInterval = setInterval(updateSharedTimer, 1000);
        }
    });
} else {
    console.error("Error: startButton element not found in HTML!");
}

// プレイヤー1のボタン操作 (キー設定と連動)
if (rotateButton1) rotateButton1.addEventListener('click', () => { if (!player1.gameOver) { player1.rotateTetromino(); player1.drawGame(); } });
if (moveLeftButton1) moveLeftButton1.addEventListener('click', () => { if (!player1.gameOver && player1.isValidMove(player1.currentX - 1, player1.currentY, player1.currentTetromino.shape)) { player1.currentX--; player1.drawGame(); } });
if (moveRightButton1) moveRightButton1.addEventListener('click', () => { if (!player1.gameOver && player1.isValidMove(player1.currentX + 1, player1.currentY, player1.currentTetromino.shape)) { player1.currentX++; player1.drawGame(); } });
if (softDropButton1) softDropButton1.addEventListener('click', () => { if (!player1.gameOver && player1.isValidMove(player1.currentX, player1.currentY + 1, player1.currentTetromino.shape)) { player1.currentY++; player1.drawGame(); } });
if (hardDropButton1) hardDropButton1.addEventListener('click', () => {
    if (!player1.gameOver) {
        while (player1.isValidMove(player1.currentX, player1.currentY + 1, player1.currentTetromino.shape)) {
            player1.currentY++;
        }
        player1.lockTetromino();
        if (player1.gameOver) return;
        player1.drawGame();
    }
});

// プレイヤー2のボタン操作 (キー設定と連動)
if (rotateButton2) rotateButton2.addEventListener('click', () => { if (!player2.gameOver) { player2.rotateTetromino(); player2.drawGame(); } });
if (moveLeftButton2) moveLeftButton2.addEventListener('click', () => { if (!player2.gameOver && player2.isValidMove(player2.currentX - 1, player2.currentY, player2.currentTetromino.shape)) { player2.currentX--; player2.drawGame(); } });
if (moveRightButton2) moveRightButton2.addEventListener('click', () => { if (!player2.gameOver && player2.isValidMove(player2.currentX + 1, player2.currentY, player2.currentTetromino.shape)) { player2.currentX++; player2.drawGame(); } });
if (softDropButton2) softDropButton2.addEventListener('click', () => { if (!player2.gameOver && player2.isValidMove(player2.currentX, player2.currentY + 1, player2.currentTetromino.shape)) { player2.currentY++; player2.drawGame(); } });
if (hardDropButton2) hardDropButton2.addEventListener('click', () => {
    if (!player2.gameOver) {
        while (player2.isValidMove(player2.currentX, player2.currentY + 1, player2.currentTetromino.shape)) {
            player2.currentY++;
        }
        player2.lockTetromino();
        if (player2.gameOver) return;
        player2.drawGame();
    }
});

// --- 設定モーダル関連のイベントリスナー ---
if (settingsButton) {
    settingsButton.addEventListener('click', () => {
        settingsModal.style.display = 'flex'; // モーダルを表示
        updateKeySettingInputs(); // 現在のキー設定をロードして表示
    });
}

if (closeModalButton) {
    closeModalButton.addEventListener('click', () => {
        settingsModal.style.display = 'none'; // モーダルを非表示
    });
}

// モーダルの外側をクリックで閉じる
window.addEventListener('click', (event) => {
    if (event.target === settingsModal) {
        settingsModal.style.display = 'none';
    }
});

// キー入力フィールドのイベントリスナーを設定
document.querySelectorAll('.key-input-group input[type="text"]').forEach(input => {
    input.addEventListener('focus', handleKeyInputFocus);
    input.addEventListener('blur', handleKeyInputBlur);
});

// 設定保存ボタン
if (saveKeysButton) {
    saveKeysButton.addEventListener('click', saveKeySettings);
}

// デフォルトに戻すボタン
if (resetKeysButton) {
    resetKeysButton.addEventListener('click', resetKeySettings);
}


// ウィンドウリサイズ時の処理
function handleResize() {
    player1.resizeCanvas();
    player2.resizeCanvas();
}
window.addEventListener('resize', handleResize);

// ページロード時の初期描画とキー設定の読み込み
window.addEventListener('load', () => {
    loadKeySettings(); // ★追加: キー設定をロード
    handleResize();
    player1.drawGame();
    player2.drawGame();
    if (sharedGameTimerDisplay) {
        sharedGameTimerDisplay.textContent = `時間: ${formatTime(0)}`;
    }
});

// 初期ロード時の描画
loadKeySettings(); // ★追加: キー設定をロード
handleResize();
player1.drawGame();
player2.drawGame();
if (sharedGameTimerDisplay) {
    sharedGameTimerDisplay.textContent = `時間: ${formatTime(0)}`;
}