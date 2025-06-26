// script.js - シンプルなテトリスバトルのゲームロジック

// ====================================================
// --- TetrisGameクラス (テトリスゲームのコアロジック) ---
// ====================================================
class TetrisGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.BOARD_WIDTH = 10;
        this.BOARD_HEIGHT = 20;
        this.BLOCK_SIZE = this.canvas.width / this.BOARD_WIDTH;
        this.board = Array(this.BOARD_HEIGHT).fill(0).map(() => Array(this.BOARD_WIDTH).fill(0));
        this.score = 0;
        this.gameOver = false;
        this.isPaused = false;
        this.dropCounter = 0;
        this.dropInterval = 1000; // 初期落下速度 (ms)

        this.colors = [
            null,
            'cyan',     // I
            'blue',     // J
            'orange',   // L
            'yellow',   // O
            'lime',     // S
            'purple',   // T
            'red'       // Z
        ];

        this.tetrominoes = [
            null,
            [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I (1)
            [[0, 0, 2], [2, 2, 2], [0, 0, 0]], // L (2)
            [[3, 0, 0], [3, 3, 3], [0, 0, 0]], // J (3)
            [[4, 4], [4, 4]], // O (4)
            [[0, 5, 5], [5, 5, 0], [0, 0, 0]], // S (5)
            [[6, 6, 0], [0, 6, 6], [0, 0, 0]], // Z (6)
            [[0, 7, 0], [7, 7, 7], [0, 0, 0]]  // T (7)
        ];

        this.player = {
            pos: {x: 0, y: 0},
            matrix: null,
            color: 0,
        };
    }

    init() {
        console.log(`TetrisGame for ${this.canvas.id} initialized.`);
        this.board = Array(this.BOARD_HEIGHT).fill(0).map(() => Array(this.BOARD_WIDTH).fill(0));
        this.score = 0;
        this.gameOver = false;
        this.isPaused = false;
        this.dropCounter = 0;
        this.spawnPiece();
        this.draw();
    }

    spawnPiece() {
        const types = 'ILJOTSZ';
        const typeIndex = Math.floor(Math.random() * types.length);
        const matrix = this.tetrominoes[typeIndex + 1];
        const color = typeIndex + 1;

        this.player.matrix = matrix;
        this.player.color = color;
        this.player.pos.y = 0;
        this.player.pos.x = (this.board[0].length / 2 | 0) - (this.player.matrix[0].length / 2 | 0);

        if (this.collide(this.board, this.player)) {
            this.gameOver = true;
            this.isPaused = true;
            console.log(`Game Over for ${this.canvas.id}!`);
        }
    }

    drop() {
        this.player.pos.y++;
        if (this.collide(this.board, this.player)) {
            this.player.pos.y--;
            this.merge(this.board, this.player);
            this.clearLines();
            this.spawnPiece();
            this.draw();
            return true;
        }
        this.draw();
        return false;
    }

    collide(board, player) {
        const [m, o] = [player.matrix, player.pos];
        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0 &&
                   (board[y + o.y] && board[y + o.y][x + o.x]) !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    merge(board, player) {
        player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    board[y + player.pos.y][x + player.pos.x] = value;
                }
            });
        });
    }

    clearLines() {
        let linesCleared = 0;
        outer: for (let y = this.board.length - 1; y >= 0; --y) {
            for (let x = 0; x < this.board[y].length; ++x) {
                if (this.board[y][x] === 0) {
                    continue outer;
                }
            }
            const row = this.board.splice(y, 1)[0].fill(0);
            this.board.unshift(row);
            linesCleared++;
            y++;
        }
        if (linesCleared > 0) {
            this.score += linesCleared * 100;
        }
    }

    move(dir) {
        if (this.isPaused || this.gameOver) return;
        this.player.pos.x += dir;
        if (this.collide(this.board, this.player)) {
            this.player.pos.x -= dir;
        }
        this.draw();
    }

    rotate() {
        if (this.isPaused || this.gameOver) return;
        const p = this.player.matrix;
        const oldPos = this.player.pos.x;
        let offset = 1;
        this._rotateMatrix(p);
        while (this.collide(this.board, this.player)) {
            this.player.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > p[0].length) {
                this._rotateMatrix(p);
                this.player.pos.x = oldPos;
                return;
            }
        }
        this.draw();
    }

    _rotateMatrix(matrix) {
        for (let y = 0; y < matrix.length; ++y) {
            for (let x = 0; x < y; ++x) {
                [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
            }
        }
        matrix.forEach(row => row.reverse());
    }

    softDrop() {
        if (this.isPaused || this.gameOver) return;
        if (this.drop()) {
            this.dropCounter = 0;
        }
    }

    hardDrop() {
        if (this.isPaused || this.gameOver) return;
        while (!this.drop());
        this.dropCounter = 0;
    }

    update(deltaTime) {
        if (this.isPaused || this.gameOver) return;

        this.dropCounter += deltaTime;
        if (this.dropCounter > this.dropInterval) {
            this.drop();
            this.dropCounter = 0;
        }
        this.draw();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawMatrix(this.board, {x: 0, y: 0});
        if (this.player.matrix) {
            this.drawMatrix(this.player.matrix, this.player.pos, this.player.color);
        }

        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`スコア: ${this.score}`, 10, 20);

        if (this.isPaused && !this.gameOver) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '30px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
        } else if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = 'white';
            this.ctx.font = '30px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('ゲームオーバー', this.canvas.width / 2, this.canvas.height / 2);
        }
    }

    drawMatrix(matrix, offset, fixedColor = 0) {
        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const color = fixedColor === 0 ? this.colors[value] : this.colors[fixedColor];
                    this.ctx.fillStyle = color;
                    this.ctx.fillRect(
                        (x + offset.x) * this.BLOCK_SIZE,
                        (y + offset.y) * this.BLOCK_SIZE,
                        this.BLOCK_SIZE,
                        this.BLOCK_SIZE
                    );
                    this.ctx.strokeStyle = '#333';
                    this.ctx.lineWidth = 1;
                    this.ctx.strokeRect(
                        (x + offset.x) * this.BLOCK_SIZE,
                        (y + offset.y) * this.BLOCK_SIZE,
                        this.BLOCK_SIZE,
                        this.BLOCK_SIZE
                    );
                }
            });
        });
    }

    pause() {
        this.isPaused = !this.isPaused;
        this.draw();
    }

    reset() {
        this.init();
    }
}

// ====================================================
// グローバルなゲーム状態変数
// ====================================================
let gameRunning = false;
let animationFrameId;
let gameTimerInterval;
let gameTime = 0;
let lastFrameTime = 0; // requestAnimationFrame 用の時刻

let player1Game;
let player2Game;

// ====================================================
// DOM要素の取得
// ====================================================
const startButton = document.getElementById('startButton');
const stopGameButton = document.getElementById('stopGameButton');
const restartButton = document.getElementById('restartButton');
const settingsButton = document.getElementById('settingsButton');
const sharedGameTimerDisplay = document.getElementById('sharedGameTimer');

const settingsModal = document.getElementById('settingsModal');
const closeButton = document.querySelector('.close-button');
const saveKeysButton = document.getElementById('saveKeysButton');
const resetKeysButton = document.getElementById('resetKeysButton');

// ====================================================
// キーボード設定関連の変数とデフォルト値
// ====================================================
const defaultKeyBindings = {
    player1: {
        rotate: 'KeyW',
        moveLeft: 'KeyA',
        moveRight: 'KeyD',
        softDrop: 'KeyS',
        hardDrop: 'ShiftLeft'
    },
    player2: {
        rotate: 'ArrowUp',
        moveLeft: 'ArrowLeft',
        moveRight: 'ArrowRight',
        softDrop: 'ArrowDown',
        hardDrop: 'Space'
    }
};
let currentKeyBindings = JSON.parse(localStorage.getItem('tetrisKeyBindings')) || defaultKeyBindings;
let activeKeyInput = null;

// ====================================================
// ゲームの主要な関数
// ====================================================

function startGame() {
    if (gameRunning) {
        console.log("ゲームは既に実行中です。");
        return;
    }

    console.log("ゲーム開始！");
    gameRunning = true;
    gameTime = 0;
    sharedGameTimerDisplay.textContent = '時間: 00:00';

    player1Game = new TetrisGame('gameCanvas1');
    player2Game = new TetrisGame('gameCanvas2');

    player1Game.init();
    player2Game.init();

    // ゲームループを開始
    lastFrameTime = performance.now(); // 初回の正確な時刻を設定
    animationFrameId = requestAnimationFrame(gameLoop); // ここでループを起動

    startTimer();

    startButton.disabled = true;
    stopGameButton.disabled = false;
    restartButton.disabled = false;
}

function gameLoop(currentTime) {
    if (!gameRunning) { // ゲームが停止している場合はループを終了
        return;
    }

    const deltaTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;

    if (player1Game) {
        player1Game.update(deltaTime);
    }
    if (player2Game) {
        player2Game.update(deltaTime);
    }

    animationFrameId = requestAnimationFrame(gameLoop); // 次のフレームを要求
}

function stopGame() {
    if (!gameRunning) {
        console.log("ゲームは停止していません。");
        return;
    }

    console.log("ゲーム停止！");
    gameRunning = false;

    cancelAnimationFrame(animationFrameId);
    clearInterval(gameTimerInterval);

    if (player1Game) player1Game.isPaused = true;
    if (player2Game) player2Game.isPaused = true;
    if(player1Game) player1Game.draw();
    if(player2Game) player2Game.draw();

    startButton.disabled = false;
    stopGameButton.disabled = true;
    // restartButton は停止後も有効にしておくのが一般的
}

function restartGame() {
    console.log("ゲームをやり直します！");

    stopGame();

    if (player1Game) {
        player1Game.reset();
    } else {
        initializePlayerCanvas('gameCanvas1', 'プレイヤー1');
    }
    if (player2Game) {
        player2Game.reset();
    } else {
        initializePlayerCanvas('gameCanvas2', 'プレイヤー2');
    }

    gameTime = 0;
    sharedGameTimerDisplay.textContent = '時間: 00:00';

    startButton.disabled = false;
    stopGameButton.disabled = true;
    restartButton.disabled = true;
}

function startTimer() {
    if (gameTimerInterval) {
        clearInterval(gameTimerInterval);
    }
    gameTimerInterval = setInterval(() => {
        if (gameRunning) { // ゲーム実行中のみタイマーを進める
            gameTime++;
            const minutes = Math.floor(gameTime / 60).toString().padStart(2, '0');
            const seconds = (gameTime % 60).toString().padStart(2, '0');
            sharedGameTimerDisplay.textContent = `時間: ${minutes}:${seconds}`;
        }
    }, 1000);
}

// ====================================================
// 初期描画関数 (ゲーム開始前やリセット時に使用)
// ====================================================
function initializePlayerCanvas(canvasId, playerName) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${playerName} 準備OK`, canvas.width / 2, canvas.height / 2);
}

// ====================================================
// イベントリスナーの設定
// ====================================================

startButton.addEventListener('click', startGame);
stopGameButton.addEventListener('click', stopGame);
restartButton.addEventListener('click', restartGame);

settingsButton.addEventListener('click', () => {
    loadKeyBindingsToModal();
    settingsModal.style.display = 'flex';
});
closeButton.addEventListener('click', () => {
    settingsModal.style.display = 'none';
});
window.addEventListener('click', (event) => {
    if (event.target == settingsModal) {
        settingsModal.style.display = 'none';
    }
});

document.querySelectorAll('.key-input-group input[type="text"]').forEach(input => {
    input.addEventListener('click', (e) => {
        activeKeyInput = e.target;
        activeKeyInput.value = '入力待ち...';
        activeKeyInput.focus();
    });
});

window.addEventListener('keydown', (e) => {
    if (activeKeyInput && !e.repeat) {
        const playerId = activeKeyInput.id.startsWith('p1') ? 'player1' : 'player2';
        const action = activeKeyInput.dataset.action;
        const newKey = e.code;

        let isConflict = false;
        for (const p in currentKeyBindings) {
            for (const act in currentKeyBindings[p]) {
                if (currentKeyBindings[p][act] === newKey && !(p === playerId && act === action)) {
                    isConflict = true;
                    break;
                }
            }
            if (isConflict) break;
        }

        if (isConflict) {
            alert('このキーは既に別のアクションに割り当てられています。');
            activeKeyInput.value = getKeyDisplayName(currentKeyBindings[playerId][action] || '');
        } else {
            currentKeyBindings[playerId][action] = newKey;
            activeKeyInput.value = getKeyDisplayName(newKey);
        }
        activeKeyInput.blur();
        activeKeyInput = null;
    }
});

function getKeyDisplayName(keyCode) {
    if (keyCode.startsWith('Key')) {
        return keyCode.slice(3);
    } else if (keyCode.startsWith('Arrow')) {
        return keyCode.slice(5);
    } else if (keyCode === 'Space') {
        return 'スペース';
    } else if (keyCode === 'ShiftLeft' || keyCode === 'ShiftRight') {
        return 'Shift';
    }
    return keyCode;
}

saveKeysButton.addEventListener('click', () => {
    localStorage.setItem('tetrisKeyBindings', JSON.stringify(currentKeyBindings));
    alert('キーボード設定を保存しました！');
    settingsModal.style.display = 'none';
});

resetKeysButton.addEventListener('click', () => {
    currentKeyBindings = JSON.parse(JSON.stringify(defaultKeyBindings));
    localStorage.removeItem('tetrisKeyBindings');
    loadKeyBindingsToModal();
    alert('キーボード設定をデフォルトに戻しました！');
});

function loadKeyBindingsToModal() {
    for (const player in currentKeyBindings) {
        const playerIdPrefix = player === 'player1' ? 'p1' : 'p2';
        for (const action in currentKeyBindings[player]) {
            let inputIdAction = action;
            if (action === 'softDrop') inputIdAction = 'soft-drop';
            if (action === 'hardDrop') inputIdAction = 'hard-drop';

            const inputElement = document.getElementById(`${playerIdPrefix}-${inputIdAction}`);
            if (inputElement) {
                inputElement.value = getKeyDisplayName(currentKeyBindings[player][action]);
            }
        }
    }
}

window.addEventListener('keydown', (e) => {
    if (!gameRunning || activeKeyInput || e.repeat) {
        return;
    }

    if (e.code === currentKeyBindings.player1.rotate) {
        if (player1Game) player1Game.rotate();
    } else if (e.code === currentKeyBindings.player1.moveLeft) {
        if (player1Game) player1Game.move(-1);
    } else if (e.code === currentKeyBindings.player1.moveRight) {
        if (player1Game) player1Game.move(1);
    } else if (e.code === currentKeyBindings.player1.softDrop) {
        if (player1Game) player1Game.softDrop();
    } else if (e.code === currentKeyBindings.player1.hardDrop) {
        if (player1Game) player1Game.hardDrop();
    }

    else if (e.code === currentKeyBindings.player2.rotate) {
        if (player2Game) player2Game.rotate();
    } else if (e.code === currentKeyBindings.player2.moveLeft) {
        if (player2Game) player2Game.move(-1);
    } else if (e.code === currentKeyBindings.player2.moveRight) {
        if (player2Game) player2Game.move(1);
    } else if (e.code === currentKeyBindings.player2.softDrop) {
        if (player2Game) player2Game.softDrop();
    } else if (e.code === currentKeyBindings.player2.hardDrop) {
        if (player2Game) player2Game.hardDrop();
    }
});

// ====================================================
// 初期化処理
// ====================================================
document.addEventListener('DOMContentLoaded', () => {
    startButton.disabled = false;
    stopGameButton.disabled = true;
    restartButton.disabled = true;

    initializePlayerCanvas('gameCanvas1', 'プレイヤー1');
    initializePlayerCanvas('gameCanvas2', 'プレイヤー2');

    loadKeyBindingsToModal();
});